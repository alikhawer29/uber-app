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
import { ListUserRidesQueryDto } from '../dto/list-user-rides-query.dto';
import { RideQuoteQueryDto } from '../dto/ride-quote-query.dto';
import { ValidatePromoDto } from '../dto/validate-promo.dto';
import { ValidateScheduleDto } from '../dto/validate-schedule.dto';

const SCHEDULE_BUFFER_MS = 60_000;

@Injectable()
export class UserRideService {
    constructor(
        private readonly configService: ConfigService,
        private readonly fareRepository: FareRepository,
        private readonly vehicleTypeRepository: VehicleTypeRepository,
        private readonly rideRepository: RideRepository,
        private readonly promoCodeRepository: PromoCodeRepository,
        private readonly userPromotionRepository: UserPromotionRepository,
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

    async listMyRides(userId: string, query: ListUserRidesQueryDto) {
        const page = query.page ?? 1;
        const limit = query.limit ?? 10;
        return this.rideRepository.findByUserId(userId, page, limit, query.status);
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
