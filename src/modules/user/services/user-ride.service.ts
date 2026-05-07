import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Types } from 'mongoose';
import { RidePaymentStatus, RidePaymentType, RideStatus } from 'src/common/constants/ride.constants';
import {
    estimateDurationMinutes,
    haversineDistanceKm,
    roundMoney,
} from 'src/common/utils/geo-pricing.utils';
import { FareRepository } from 'src/shared/repositories/fare.repository';
import { PromoCodeRepository } from 'src/shared/repositories/promo-code.repository';
import { UserPromotionRepository } from 'src/shared/repositories/user-promotion.repository';
import { RideRepository } from 'src/shared/repositories/ride.repository';
import { VehicleTypeRepository } from 'src/shared/repositories/vehicle-type.repository';
import { FareDocument } from 'src/shared/schemas/fare.schema';
import { PromoDiscountType } from 'src/shared/schemas/promo-code.schema';
import { VehicleTypeDocument } from 'src/shared/schemas/vehicle-type.schema';
import { CreateRideDto } from '../dto/create-ride.dto';
import { EstimateRideDto } from '../dto/estimate-ride.dto';
import { BookRideDto } from '../dto/book-ride.dto';
import { ScheduleRideDto } from '../dto/schedule-ride.dto';
import { CancelRideDto, CancelReason } from '../dto/cancel-ride.dto';
import { RideReviewDto } from '../dto/ride-review.dto';
import { ListUserRidesQueryDto } from '../dto/list-user-rides-query.dto';
import { RideQuoteQueryDto } from '../dto/ride-quote-query.dto';
import { ValidatePromoDto } from '../dto/validate-promo.dto';
import { ValidateScheduleDto } from '../dto/validate-schedule.dto';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { RideEvents } from '../events/ride.events';
import { RideComplaintRepository } from 'src/shared/repositories/ride-complaint.repository';
import { RideComplaintDto } from '../dto/ride-complaint.dto';
import { resolveScheduledAtFromPayload } from '../utils/resolve-scheduled-at.util';

const SCHEDULE_BUFFER_MS = 60_000;
const SCHEDULE_MIN_MS = 15 * 60_000;
const SCHEDULE_MAX_MS = 7 * 24 * 60 * 60_000;

@Injectable()
export class UserRideService {
    constructor(
        private readonly configService: ConfigService,
        private readonly fareRepository: FareRepository,
        private readonly vehicleTypeRepository: VehicleTypeRepository,
        private readonly rideRepository: RideRepository,
        private readonly promoCodeRepository: PromoCodeRepository,
        private readonly userPromotionRepository: UserPromotionRepository,
        private readonly eventEmitter: EventEmitter2,
        private readonly rideComplaintRepository: RideComplaintRepository,
    ) {}

    async quote(query: RideQuoteQueryDto) {
        const distanceKm = roundMoney(
            haversineDistanceKm(query.pickupLat, query.pickupLng, query.dropLat, query.dropLng),
        );
        const avgSpeed = this.configService.get<number>('ride.avgSpeedKmh') ?? 30;
        const timeFareFactor = this.configService.get<number>('ride.timeFareFactor') ?? 0.35;
        const taxRate = this.configService.get<number>('ride.taxRate') ?? 0;
        const estimatedDuration = estimateDurationMinutes(distanceKm, avgSpeed);

        const fares = await this.fareRepository.findAllActiveWithVehicleType();
        const options: Array<Record<string, unknown>> = [];

        for (const fare of fares) {
            const vt = fare.vehicleTypeId as unknown as VehicleTypeDocument | undefined;
            if (!vt || !vt.isActive) continue;

            const priced = this.applyMinimumFare(
                this.computeFareComponents(distanceKm, estimatedDuration, fare, timeFareFactor),
                fare.minimumFare,
            );
            const preTax = roundMoney(priced.baseFare + priced.distanceFare + priced.timeFare);
            const tax = roundMoney(preTax * taxRate);
            const totalAmount = roundMoney(preTax + tax);

            let estimatedTripStartLabel: string | undefined;
            if (query.scheduledStart) {
                const d = new Date(query.scheduledStart);
                if (!Number.isNaN(d.getTime())) {
                    estimatedTripStartLabel = d.toLocaleString(undefined, {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                    });
                }
            }

            options.push({
                vehicleTypeId: String(vt._id),
                rideType: vt.name,
                facilities: vt.facilities,
                image: vt.image ?? null,
                seatingAndFareSummary: vt.facilities,
                baseFare: priced.baseFare,
                distanceFare: priced.distanceFare,
                timeFare: priced.timeFare,
                discount: 0,
                tax,
                totalAmount,
                distanceKm,
                estimatedDurationMinutes: estimatedDuration,
                estimatedTripStartLabel,
            });
        }

        options.sort(
            (a, b) => (a.totalAmount as number) - (b.totalAmount as number),
        );

        return {
            distanceKm,
            estimatedDurationMinutes: estimatedDuration,
            options,
        };
    }

    async estimate(dto: EstimateRideDto) {
        const distance = roundMoney(
            haversineDistanceKm(
                dto.pickupLatitude,
                dto.pickupLongitude,
                dto.dropOffLatitude,
                dto.dropOffLongitude,
            ),
        );
        const avgSpeed = this.configService.get<number>('ride.avgSpeedKmh') ?? 30;
        const timeFareFactor = this.configService.get<number>('ride.timeFareFactor') ?? 0.35;
        const estimatedDuration = estimateDurationMinutes(distance, avgSpeed);

        const scheduled = resolveScheduledAtFromPayload(dto);

        const fares = await this.fareRepository.findAllActiveWithVehicleType();
        const estimates: Array<Record<string, unknown>> = [];

        for (const fare of fares) {
            const vt = fare.vehicleTypeId as unknown as VehicleTypeDocument | undefined;
            if (!vt || !vt.isActive) continue;

            const priced = this.applyMinimumFare(
                this.computeFareComponents(distance, estimatedDuration, fare, timeFareFactor),
                fare.minimumFare,
            );
            const basePrice = roundMoney(priced.baseFare + priced.distanceFare + priced.timeFare);

            estimates.push({
                vehicleTypeId: String(vt._id),
                vehicleTypeName: vt.name,
                basePrice,
                discountedPrice: basePrice,
                facilities: vt.facilities,
                image: vt.image ?? null,
            });
        }

        const data: Record<string, unknown> = {
            distance,
            duration: estimatedDuration,
            estimates,
        };
        if (scheduled) {
            data.scheduledAt = scheduled.toISOString();
            data.estimatedTripStartLabel = scheduled.toLocaleString(undefined, {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
            });
        }

        return {
            success: true,
            data,
        };
    }

    validateSchedule(dto: ValidateScheduleDto) {
        const start = new Date(dto.startTime);
        if (Number.isNaN(start.getTime())) {
            return {
                valid: false,
                message: 'Invalid date or time.',
            };
        }

        const now = Date.now();
        const isScheduled = dto.isScheduled !== false;

        if (isScheduled && start.getTime() < now + SCHEDULE_BUFFER_MS) {
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);
            if (start < todayStart) {
                return {
                    valid: false,
                    code: 'DATE',
                    message: 'Select a Date either for today or the future.',
                };
            }
            return {
                valid: false,
                code: 'TIME',
                message: 'Select a Time for the Future.',
            };
        }

        return { valid: true };
    }

    async validatePromo(dto: ValidatePromoDto) {
        const promo = await this.promoCodeRepository.findActiveByCode(dto.code);
        if (!promo) {
            return {
                valid: false,
                message: 'Invalid or expired promo code.',
            };
        }

        const subtotal = dto.subtotal ?? 0;
        if (subtotal < promo.minOrderAmount) {
            return {
                valid: false,
                message: `Minimum order amount for this code is ${promo.minOrderAmount}.`,
            };
        }

        const discountAmount = this.computePromoDiscount(promo.discountType, promo.value, subtotal);
        return {
            valid: true,
            code: promo.code,
            discountType: promo.discountType,
            discountAmount: roundMoney(discountAmount),
        };
    }

    async createRide(userId: string, dto: CreateRideDto) {
        const start = new Date(dto.startTime);
        if (Number.isNaN(start.getTime())) {
            throw new BadRequestException('Invalid start time');
        }

        const now = Date.now();
        if (dto.isScheduled) {
            if (start.getTime() < now + SCHEDULE_BUFFER_MS) {
                const todayStart = new Date();
                todayStart.setHours(0, 0, 0, 0);
                if (start < todayStart) {
                    throw new BadRequestException({
                        code: 'DATE',
                        message: 'Select a Date either for today or the future.',
                    });
                }
                throw new BadRequestException({
                    code: 'TIME',
                    message: 'Select a Time for the Future.',
                });
            }
        } else {
            const pastLimit = now - 10 * 60 * 1000;
            const futureLimit = now + 60 * 60 * 1000;
            if (start.getTime() < pastLimit || start.getTime() > futureLimit) {
                throw new BadRequestException(
                    'For an immediate ride, use the current time or a value close to now.',
                );
            }
        }

        if (!Types.ObjectId.isValid(dto.vehicleTypeId)) {
            throw new BadRequestException('Invalid vehicle type');
        }

        const vt = await this.vehicleTypeRepository.findById(dto.vehicleTypeId);
        if (!vt?.isActive) {
            throw new NotFoundException('Vehicle type not found');
        }

        const fare = await this.fareRepository.findByVehicleTypeId(dto.vehicleTypeId);
        if (!fare?.isActive) {
            throw new BadRequestException('Pricing is not available for this vehicle type');
        }

        const distanceKm = roundMoney(
            haversineDistanceKm(dto.pickupLat, dto.pickupLng, dto.dropLat, dto.dropLng),
        );
        const avgSpeed = this.configService.get<number>('ride.avgSpeedKmh') ?? 30;
        const timeFareFactor = this.configService.get<number>('ride.timeFareFactor') ?? 0.35;
        const taxRate = this.configService.get<number>('ride.taxRate') ?? 0;
        const estimatedDuration = estimateDurationMinutes(distanceKm, avgSpeed);

        const priced = this.applyMinimumFare(
            this.computeFareComponents(distanceKm, estimatedDuration, fare, timeFareFactor),
            fare.minimumFare,
        );
        let baseFare = priced.baseFare;
        let distanceFare = priced.distanceFare;
        let timeFare = priced.timeFare;
        let preDiscount = roundMoney(baseFare + distanceFare + timeFare);

        let discount = 0;
        let appliedPromoId: string | null = null;
        if (dto.promoCode?.trim()) {
            const promo = await this.promoCodeRepository.findActiveByCode(dto.promoCode);
            if (!promo) {
                throw new BadRequestException('Invalid or expired promo code');
            }
            if (preDiscount < promo.minOrderAmount) {
                throw new BadRequestException(
                    `Minimum order amount for this promo is ${promo.minOrderAmount}`,
                );
            }
            discount = roundMoney(
                this.computePromoDiscount(promo.discountType, promo.value, preDiscount),
            );
            discount = Math.min(discount, preDiscount);
            appliedPromoId = String(promo._id);
        }

        const taxable = Math.max(0, preDiscount - discount);
        const tax = roundMoney(taxable * taxRate);
        const totalAmount = roundMoney(taxable + tax);

        const otpCode = String(Math.floor(100000 + Math.random() * 900000));

        const ride = await this.rideRepository.create({
            userId: new Types.ObjectId(userId),
            pickupAddress: dto.pickupAddress.trim(),
            pickupLat: dto.pickupLat,
            pickupLng: dto.pickupLng,
            dropAddress: dto.dropAddress.trim(),
            dropLat: dto.dropLat,
            dropLng: dto.dropLng,
            startTime: start,
            distanceKm,
            estimatedDuration,
            rideType: vt.name,
            baseFare,
            distanceFare,
            timeFare,
            discount,
            tax,
            totalAmount,
            paymentType: dto.paymentType as RidePaymentType,
            paymentStatus: RidePaymentStatus.PENDING,
            status: RideStatus.PENDING,
            isScheduled: dto.isScheduled,
            otpCode,
            vehicleTypeId: new Types.ObjectId(dto.vehicleTypeId),
        } as any);

        if (appliedPromoId && discount > 0) {
            await this.promoCodeRepository.update(appliedPromoId, {
                $inc: { usedCount: 1 },
            } as any);
            await this.userPromotionRepository.markUsedIfExists(userId, appliedPromoId);
        }

        return ride;
    }

    /**
     * Book Now (no schedule fields) or Schedule Later (`scheduledAt` or `scheduledAtDate` + `scheduledAtTime`).
     */
    async bookRide(userId: string, dto: BookRideDto) {
        if (dto.paymentMethod === RidePaymentType.CARD && !dto.cardId) {
            throw new BadRequestException({ code: 'CARD_NOT_FOUND', message: 'cardId is required for card payments' });
        }

        const scheduled = resolveScheduledAtFromPayload(dto);
        if (scheduled) {
            return this.bookScheduled(userId, dto, scheduled);
        }

        const ride = await this.createRide(userId, {
            pickupAddress: dto.pickupAddress,
            pickupLat: dto.pickupLatitude,
            pickupLng: dto.pickupLongitude,
            dropAddress: dto.dropOffAddress,
            dropLat: dto.dropOffLatitude,
            dropLng: dto.dropOffLongitude,
            startTime: new Date().toISOString(),
            isScheduled: false,
            vehicleTypeId: dto.vehicleTypeId,
            paymentType: dto.paymentMethod,
            promoCode: dto.promoCode,
        });

        const updated = await this.rideRepository.update(String((ride as any)._id), {
            status: RideStatus.SEARCHING,
            notes: dto.notes ?? null,
            cardId: dto.cardId ? new Types.ObjectId(dto.cardId) : null,
        } as any);

        this.eventEmitter.emit(RideEvents.REQUEST_MATCHING, {
            rideId: String((updated as any)?._id ?? (ride as any)._id),
            userId,
        });

        return {
            success: true,
            data: {
                rideId: String((updated as any)?._id ?? (ride as any)._id),
                status: RideStatus.SEARCHING,
                fare: roundMoney((updated as any).baseFare + (updated as any).distanceFare + (updated as any).timeFare + (updated as any).tax),
                discountedFare: (updated as any).totalAmount,
                pickupAddress: (updated as any).pickupAddress,
                dropOffAddress: (updated as any).dropAddress,
                vehicleType: (updated as any).rideType,
                paymentMethod: (updated as any).paymentType,
                scheduledAt: null,
                createdAt: (updated as any).createdAt,
            },
        };
    }

    private async bookScheduled(userId: string, dto: BookRideDto, scheduled: Date) {
        const now = Date.now();
        if (scheduled.getTime() < now + SCHEDULE_MIN_MS) {
            throw new BadRequestException({
                code: 'INVALID_SCHEDULE_TIME',
                message: 'scheduledAt must be at least 15 minutes in the future',
            });
        }
        if (scheduled.getTime() > now + SCHEDULE_MAX_MS) {
            throw new BadRequestException({
                code: 'SCHEDULE_TOO_FAR',
                message: 'Cannot schedule more than 7 days in advance',
            });
        }

        const ride = await this.createRide(userId, {
            pickupAddress: dto.pickupAddress,
            pickupLat: dto.pickupLatitude,
            pickupLng: dto.pickupLongitude,
            dropAddress: dto.dropOffAddress,
            dropLat: dto.dropOffLatitude,
            dropLng: dto.dropOffLongitude,
            startTime: scheduled.toISOString(),
            isScheduled: true,
            vehicleTypeId: dto.vehicleTypeId,
            paymentType: dto.paymentMethod,
            promoCode: dto.promoCode,
        });

        const updated = await this.rideRepository.update(String((ride as any)._id), {
            status: RideStatus.SCHEDULED,
            notes: dto.notes ?? null,
            cardId: dto.cardId ? new Types.ObjectId(dto.cardId) : null,
        } as any);

        this.eventEmitter.emit(RideEvents.STATUS_UPDATED, {
            rideId: String((updated as any)?._id ?? (ride as any)._id),
            status: RideStatus.SCHEDULED,
            userId,
        });

        return {
            success: true,
            data: {
                rideId: String((updated as any)?._id ?? (ride as any)._id),
                status: RideStatus.SCHEDULED,
                scheduledAt: scheduled.toISOString(),
                fare: (updated as any).totalAmount,
                vehicleType: (updated as any).rideType,
            },
        };
    }

    /** @deprecated Same as `bookRide` — use POST /user/rides/book with schedule fields */
    async schedule(userId: string, dto: ScheduleRideDto) {
        return this.bookRide(userId, dto);
    }

    async getActiveRide(userId: string) {
        const ride = await this.rideRepository.findActiveForUser(userId);
        if (!ride) {
            throw new NotFoundException({ code: 'NO_ACTIVE_RIDE', message: 'User has no active ride at this time' });
        }
        return { success: true, data: { rideId: String((ride as any)._id), status: ride.status, ride } };
    }

    async getRideDetails(userId: string, rideId: string) {
        const ride = await this.rideRepository.findOwnedByUser(rideId, userId);
        if (!ride) throw new NotFoundException({ code: 'RIDE_NOT_FOUND', message: 'Ride not found' });
        return { success: true, data: { rideId: String((ride as any)._id), ride } };
    }

    async cancelRide(userId: string, rideId: string, dto: CancelRideDto) {
        const ride = await this.rideRepository.findOwnedByUser(rideId, userId);
        if (!ride) throw new NotFoundException({ code: 'RIDE_NOT_FOUND', message: 'No ride found with this ID' });

        const cancellableStatuses = [
            RideStatus.SEARCHING,
            RideStatus.ACCEPTED,
            RideStatus.ARRIVED,
            RideStatus.SCHEDULED,
            RideStatus.PENDING,
        ];
        if (!cancellableStatuses.includes(ride.status as any)) {
            throw new BadRequestException({ code: 'RIDE_NOT_CANCELLABLE', message: 'Ride is in a status that cannot be cancelled' });
        }

        if (dto.reason === CancelReason.OTHER && !dto.reasonNote?.trim()) {
            throw new BadRequestException({ code: 'VALIDATION_ERROR', message: 'reasonNote is required when reason = other' });
        }

        // Fee rules placeholder: apply 1% if already accepted (as spec)
        const fareBeforeDiscount = roundMoney(ride.baseFare + ride.distanceFare + ride.timeFare + ride.tax);
        const cancellationFeeApplied = ride.status === RideStatus.ACCEPTED;
        const cancellationFee = cancellationFeeApplied ? roundMoney(fareBeforeDiscount * 0.01) : 0;

        await this.rideRepository.update(String((ride as any)._id), {
            status: RideStatus.CANCELLED,
            cancelledBy: 'user',
            cancelReason: dto.reason === CancelReason.OTHER ? `${dto.reason}:${dto.reasonNote?.trim()}` : dto.reason,
        } as any);

        return {
            success: true,
            message: 'Ride cancelled successfully',
            data: {
                cancellationFeeApplied,
                cancellationFee,
                walletDeducted: cancellationFeeApplied ? cancellationFee : 0,
            },
        };
    }

    async submitReview(userId: string, rideId: string, dto: RideReviewDto) {
        const ride = await this.rideRepository.findOwnedByUser(rideId, userId);
        if (!ride) throw new NotFoundException({ code: 'RIDE_NOT_FOUND', message: 'Ride not found' });

        if (ride.status !== RideStatus.COMPLETED) {
            throw new BadRequestException({ code: 'RIDE_NOT_COMPLETED', message: 'Can only review completed rides' });
        }
        if (ride.ratingByUser != null) {
            throw new BadRequestException({ code: 'ALREADY_REVIEWED', message: 'A review has already been submitted for this ride' });
        }

        await this.rideRepository.update(String((ride as any)._id), {
            ratingByUser: dto.rating,
            reviewByUser: dto.review?.trim() || null,
        } as any);

        return { success: true, message: 'Review submitted successfully' };
    }

    async submitComplaint(userId: string, rideId: string, dto: RideComplaintDto) {
        const ride = await this.rideRepository.findOwnedByUser(rideId, userId);
        if (!ride) throw new NotFoundException({ code: 'RIDE_NOT_FOUND', message: 'Ride not found' });

        const exists = await this.rideComplaintRepository.existsForRideAndUser(rideId, userId);
        if (exists) {
            throw new BadRequestException({ code: 'COMPLAINT_ALREADY_SUBMITTED', message: 'A complaint was already submitted for this ride' });
        }

        await this.rideComplaintRepository.create({
            rideId: new Types.ObjectId(rideId),
            userId: new Types.ObjectId(userId),
            message: dto.message.trim(),
        } as any);

        return { success: true, message: 'Complaint submitted successfully', data: { complaintId: 'created' } };
    }

    async listMyRides(userId: string, query: ListUserRidesQueryDto) {
        const page = query.page ?? 1;
        const limit = query.limit ?? 10;
        const result = await this.rideRepository.findByUserId(userId, page, limit, query.status);
        return {
            success: true,
            data: {
                rides: result.data.map((r) => ({
                    rideId: String((r as any)._id),
                    status: r.status,
                    riderName: null,
                    fare: r.totalAmount,
                    discountedFare: r.totalAmount,
                    date: r.startTime ? new Date(r.startTime).toISOString() : null,
                    mapSnapshot: null,
                    pickupAddress: r.pickupAddress,
                    dropOffAddress: r.dropAddress,
                })),
                pagination: {
                    total: result.total,
                    page: result.page,
                    limit: result.limit,
                    totalPages: result.totalPages,
                },
            },
        };
    }

    private computeFareComponents(
        distanceKm: number,
        estimatedDuration: number,
        fare: FareDocument,
        timeFareFactor: number,
    ) {
        const baseFare = fare.baseFare;
        const distanceFare = roundMoney(distanceKm * fare.costPerKm);
        const timeFare = roundMoney(estimatedDuration * fare.waitingFeePerMin * timeFareFactor);
        return { baseFare, distanceFare, timeFare };
    }

    /** Ensures base + distance + time meets operator minimum (shortfall added to base fare). */
    private applyMinimumFare(
        breakdown: { baseFare: number; distanceFare: number; timeFare: number },
        minimumFare: number,
    ) {
        let { baseFare, distanceFare, timeFare } = breakdown;
        let sum = roundMoney(baseFare + distanceFare + timeFare);
        if (sum < minimumFare) {
            baseFare = roundMoney(baseFare + (minimumFare - sum));
            sum = minimumFare;
        }
        return {
            baseFare,
            distanceFare,
            timeFare,
        };
    }

    private computePromoDiscount(
        type: PromoDiscountType,
        value: number,
        subtotal: number,
    ): number {
        if (type === PromoDiscountType.PERCENT) {
            return Math.min(subtotal, (subtotal * Math.min(100, Math.max(0, value))) / 100);
        }
        return Math.min(subtotal, Math.max(0, value));
    }
}
