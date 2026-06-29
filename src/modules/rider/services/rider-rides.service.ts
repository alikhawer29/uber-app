import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { RidePaymentStatus, RidePaymentType, RideStatus } from 'src/common/constants/ride.constants';
import { roundMoney } from 'src/common/utils/geo-pricing.utils';
import { EndRideDto } from '../dto/end-ride.dto';
import { RiderLocationRepository } from 'src/shared/repositories/rider-location.repository';
import { RiderVehicleRepository } from 'src/shared/repositories/rider-vehicle.repository';
import { RideRequestRepository } from 'src/shared/repositories/ride-request.repository';
import { RideRepository } from 'src/shared/repositories/ride.repository';
import { RideRequestStatus } from 'src/shared/schemas/ride-request.schema';
import { RideGateway } from 'src/modules/ride/gateways/ride.gateway';
import { RidePaymentCaptureService } from 'src/modules/ride/services/ride-payment-capture.service';
import { RideMessageRepository } from 'src/shared/repositories/ride-message.repository';
import { RideMessageSenderType } from 'src/shared/schemas/ride-message.schema';
import { RideNotificationService } from 'src/modules/ride/services/ride-notification.service';
import { UserRepository } from 'src/shared/repositories/user.repository';
import { resolveRideDisplayStatus } from 'src/common/utils/ride-display-status.util';
import { RideCancelledBy } from 'src/common/constants/ride.constants';

@Injectable()
export class RiderRidesService {
    constructor(
        private readonly rideRepository: RideRepository,
        private readonly rideRequestRepository: RideRequestRepository,
        private readonly riderLocationRepository: RiderLocationRepository,
        private readonly riderVehicleRepository: RiderVehicleRepository,
        private readonly rideGateway: RideGateway,
        private readonly rideMessageRepository: RideMessageRepository,
        private readonly ridePaymentCapture: RidePaymentCaptureService,
        private readonly rideNotificationService: RideNotificationService,
        private readonly userRepository: UserRepository,
    ) { }

    async acceptRide(riderId: string, rideId: string) {
        const req = await this.rideRequestRepository.findPendingForRider(rideId, riderId);
        if (!req) {
            throw new BadRequestException({ code: 'UNAUTHORIZED', message: 'This ride was not assigned to you' });
        }

        const ride = await this.rideRepository.findById(rideId);
        if (!ride || ride.status !== RideStatus.SEARCHING) {
            throw new BadRequestException({ code: 'RIDE_NO_LONGER_AVAILABLE', message: 'Ride was cancelled or assigned to another rider' });
        }

        const riderVehicle = await this.riderVehicleRepository.findLatestApprovedByUserIdWithVehicleType(riderId);

        // Mark accepted
        await this.rideRequestRepository.setStatus(String((req as any)._id), RideRequestStatus.ACCEPTED);
        await this.rideRepository.update(rideId, {
            status: RideStatus.ACCEPTED,
            driverId: new Types.ObjectId(riderId),
            vehicleId: riderVehicle?._id ?? null,
        } as any);

        // Cancel other pending requests for this ride
        await this.rideRequestRepository.cancelAllForRide(rideId);

        const rider = await this.userRepository.findById(riderId);
        const riderName = rider
            ? `${(rider.firstName || '').trim()} ${(rider.lastName || '').trim()}`.trim() || 'Driver'
            : 'Driver';

        this.rideGateway.emitRideStatusToUser(String((ride as any).userId), {
            rideId,
            status: RideStatus.ACCEPTED,
            riderName,
            estimatedArrival: 3,
        });
        void this.rideNotificationService.notifyRideAccepted(
            String((ride as any).userId),
            rideId,
            riderName,
        );

        return {
            success: true,
            data: {
                rideId,
                status: RideStatus.ACCEPTED,
                passengerName: 'Passenger',
                pickupAddress: ride.pickupAddress,
                dropOffAddress: ride.dropAddress,
                fare: ride.totalAmount,
            },
        };
    }

    async rejectRide(riderId: string, rideId: string, reason: string) {
        const trimmed = reason?.trim();
        if (!trimmed || trimmed.length < 5) {
            throw new BadRequestException({
                code: 'REASON_REQUIRED',
                message: 'A reason is required when rejecting a ride request',
            });
        }
        const req = await this.rideRequestRepository.findPendingForRider(rideId, riderId);
        if (!req) {
            throw new BadRequestException({ code: 'UNAUTHORIZED', message: 'This ride was not assigned to you' });
        }
        await this.rideRequestRepository.setStatus(String((req as any)._id), RideRequestStatus.REJECTED, trimmed);
        return { success: true, message: 'Ride request declined' };
    }

    async markArrived(riderId: string, rideId: string) {
        const ride = await this.rideRepository.findById(rideId);
        if (!ride || String((ride as any).driverId || '') !== riderId) {
            throw new BadRequestException({ code: 'UNAUTHORIZED', message: 'This ride was not assigned to you' });
        }
        if (ride.status !== RideStatus.ACCEPTED) {
            throw new BadRequestException({ code: 'INVALID_RIDE_STATUS', message: 'Ride must be in accepted status to mark as arrived' });
        }
        await this.rideRepository.update(rideId, { status: RideStatus.ARRIVED } as any);
        this.rideGateway.emitRideStatusToUser(String((ride as any).userId), { rideId, status: RideStatus.ARRIVED });
        void this.rideNotificationService.notifyRideArrived(String((ride as any).userId), rideId);
        return { success: true, data: { status: RideStatus.ARRIVED, arrivedAt: new Date().toISOString() } };
    }

    async startRide(riderId: string, rideId: string) {
        const ride = await this.rideRepository.findById(rideId);
        if (!ride || String((ride as any).driverId || '') !== riderId) {
            throw new BadRequestException({ code: 'UNAUTHORIZED', message: 'This ride was not assigned to you' });
        }
        if (ride.status !== RideStatus.ARRIVED) {
            throw new BadRequestException({ code: 'INVALID_RIDE_STATUS', message: 'Ride must be in arrived status to start' });
        }
        await this.rideRepository.update(rideId, { status: RideStatus.IN_PROGRESS } as any);
        this.rideGateway.emitRideStatusToUser(String((ride as any).userId), { rideId, status: RideStatus.IN_PROGRESS });
        void this.rideNotificationService.notifyRideStarted(String((ride as any).userId), rideId);
        return { success: true, data: { status: RideStatus.IN_PROGRESS, startedAt: new Date().toISOString() } };
    }

    async endRide(riderId: string, rideId: string, dto: EndRideDto) {
        let ride = await this.rideRepository.findById(rideId);
        if (!ride || String((ride as any).driverId || '') !== riderId) {
            throw new BadRequestException({ code: 'UNAUTHORIZED', message: 'This ride was not assigned to you' });
        }

        if (ride.status === RideStatus.COMPLETED) {
            const cash = (ride as any).cashCollectedAmount;
            const earning =
                ride.paymentType === RidePaymentType.CASH && cash != null ? roundMoney(cash) : ride.totalAmount;
            return {
                success: true,
                data: {
                    status: RideStatus.COMPLETED,
                    finalFare: ride.totalAmount,
                    waitingCharges: 0,
                    totalEarning: earning,
                    cashCollectedAmount:
                        ride.paymentType === RidePaymentType.CASH ? (cash != null ? roundMoney(cash) : null) : null,
                    completedAt: ((ride as any).endTime || new Date()).toISOString(),
                    alreadyCompleted: true,
                },
            };
        }

        if (ride.status !== RideStatus.IN_PROGRESS) {
            throw new BadRequestException({ code: 'INVALID_RIDE_STATUS', message: 'Ride must be in in_progress status to end' });
        }

        if (ride.paymentType === RidePaymentType.CASH) {
            if (dto.cashCollectedAmount === undefined || dto.cashCollectedAmount === null) {
                throw new BadRequestException({
                    code: 'CASH_AMOUNT_REQUIRED',
                    message: 'cashCollectedAmount is required when the ride is paid in cash',
                });
            }
        }

        const capture = await this.ridePaymentCapture.captureForRideCompletion(ride as any);
        const credit = await this.ridePaymentCapture.creditRiderForCompletedRide(
            rideId,
            riderId,
            dto.cashCollectedAmount,
        );

        const cashStored =
            ride.paymentType === RidePaymentType.CASH && dto.cashCollectedAmount != null
                ? roundMoney(dto.cashCollectedAmount)
                : null;

        await this.rideRepository.update(rideId, {
            status: RideStatus.COMPLETED,
            endTime: new Date(),
            paymentStatus: RidePaymentStatus.PAID,
            ...(capture?.stripePaymentIntentId ? { stripePaymentIntentId: capture.stripePaymentIntentId } : {}),
            ...(cashStored != null ? { cashCollectedAmount: cashStored } : {}),
            riderEarningCredited: true,
        } as any);

        ride = (await this.rideRepository.findById(rideId)) || ride;

        this.rideGateway.emitRideStatusToUser(String((ride as any).userId), {
            rideId,
            status: RideStatus.COMPLETED,
            finalFare: ride.totalAmount,
            completedAt: new Date().toISOString(),
        });
        void this.rideNotificationService.notifyRideCompleted(
            String((ride as any).userId),
            riderId,
            rideId,
        );
        return {
            success: true,
            data: {
                status: RideStatus.COMPLETED,
                finalFare: ride.totalAmount,
                waitingCharges: 0,
                totalEarning: credit.creditedAmount,
                cashCollectedAmount: cashStored,
                completedAt: new Date().toISOString(),
            },
        };
    }

    async setAvailability(riderId: string, isOnline: boolean) {
        const loc = await this.riderLocationRepository.setIsOnline(riderId, isOnline);
        if (!loc) {
            throw new BadRequestException({
                code: 'LOCATION_REQUIRED',
                message:
                    'Share your location at least once (POST /rider/location) before changing online status.',
            });
        }
        return { success: true, data: { isOnline: loc.isOnline } };
    }

    async cancelRide(riderId: string, rideId: string) {
        const ride = await this.rideRepository.findById(rideId);
        if (!ride || String((ride as any).driverId || '') !== riderId) {
            throw new BadRequestException({ code: 'UNAUTHORIZED', message: 'This ride was not assigned to you' });
        }
        if (![RideStatus.ACCEPTED, RideStatus.ARRIVED].includes(ride.status as any)) {
            throw new BadRequestException({ code: 'INVALID_RIDE_STATUS', message: 'Cannot cancel a ride that is already in progress or completed' });
        }
        await this.rideRepository.update(rideId, {
            status: RideStatus.CANCELLED,
            cancelledBy: RideCancelledBy.DRIVER,
            cancelReason: null,
        } as any);
        this.rideGateway.emitRideStatusToUser(String((ride as any).userId), { rideId, status: RideStatus.CANCELLED });
        void this.rideNotificationService.notifyRideCancelledByDriver(
            String((ride as any).userId),
            riderId,
            rideId,
        );
        return { success: true, message: 'Ride cancelled' };
    }

    async updateLocation(riderId: string, dto: { latitude: number; longitude: number; heading?: number; speed?: number; isOnline: boolean }) {
        await this.riderLocationRepository.upsertLocation({ riderId, ...dto });
        return { success: true };
    }

    async getActiveRide(riderId: string) {
        const ride = await this.rideRepository.findOne({
            driverId: new Types.ObjectId(riderId),
            status: { $in: [RideStatus.ACCEPTED, RideStatus.ARRIVED, RideStatus.IN_PROGRESS] },
        } as any);
        if (!ride) throw new NotFoundException({ code: 'NO_ACTIVE_RIDE', message: 'No active ride found for this rider' });
        const enrichedRide = await this.enrichRideForRiderResponse(ride);
        return {
            success: true,
            data: { rideId: String((ride as any)._id), status: ride.status, ride: enrichedRide },
        };
    }

    async getRideDetails(riderId: string, rideId: string) {
        const ride = await this.rideRepository.findById(rideId);
        if (!ride) {
            throw new NotFoundException({ code: 'RIDE_NOT_FOUND', message: 'Ride not found' });
        }
        await this.assertRiderCanAccessRide(riderId, ride);
        const enrichedRide = await this.enrichRideForRiderResponse(ride);
        return {
            success: true,
            data: { rideId: String((ride as any)._id), ride: enrichedRide },
        };
    }

    private async assertRiderCanAccessRide(riderId: string, ride: any) {
        const assignedDriverId = this.extractId(ride?.driverId);
        if (assignedDriverId === riderId) {
            return;
        }
        const request = await this.rideRequestRepository.findOne({
            rideId: new Types.ObjectId(String(ride._id)),
            riderId: new Types.ObjectId(riderId),
        } as any);
        if (!request) {
            throw new ForbiddenException({
                code: 'UNAUTHORIZED',
                message: 'You are not assigned to this ride',
            });
        }
    }

    private async enrichRideForRiderResponse(ride: any) {
        const rideData = typeof ride?.toObject === 'function' ? ride.toObject() : { ...ride };
        const passengerId = this.extractId(rideData.userId);
        const vehicleId = this.extractId(rideData.vehicleId);
        const driverId = this.extractId(rideData.driverId);

        const [passenger, vehicle] = await Promise.all([
            passengerId ? this.userRepository.findById(passengerId) : Promise.resolve(null),
            vehicleId
                ? this.riderVehicleRepository.findByIdWithRelations(vehicleId)
                : driverId
                  ? this.riderVehicleRepository.findLatestApprovedByUserIdWithVehicleType(driverId)
                  : Promise.resolve(null),
        ]);

        return {
            ...rideData,
            rideId: String(rideData._id ?? rideData.id),
            displayStatus: resolveRideDisplayStatus(rideData.status, rideData.cancelledBy),
            userId: passengerId,
            driverId,
            vehicleId: vehicleId ?? this.extractId(vehicle?._id) ?? null,
            vehicleTypeId: this.extractId(rideData.vehicleTypeId),
            passengerName: this.buildFullName(passenger),
            passenger: this.mapPassenger(passenger),
            vehicle: this.mapVehicle(vehicle),
            dropOffAddress: rideData.dropAddress ?? rideData.dropOffAddress ?? null,
        };
    }

    private mapPassenger(passenger: any) {
        if (!passenger) return null;
        return {
            userId: this.extractId(passenger._id) ?? this.extractId(passenger.id),
            firstName: passenger.firstName ?? null,
            lastName: passenger.lastName ?? null,
            fullName: this.buildFullName(passenger),
            email: passenger.email ?? null,
            phone: passenger.phone ?? null,
            countryCode: passenger.countryCode ?? null,
            avatar: passenger.avatar ?? null,
        };
    }

    private mapVehicle(vehicle: any) {
        if (!vehicle) return null;
        const vehicleType =
            vehicle.vehicleTypeId && typeof vehicle.vehicleTypeId === 'object' ? vehicle.vehicleTypeId : null;
        return {
            vehicleId: this.extractId(vehicle._id),
            brandName: vehicle.brandName ?? null,
            vehicleName: vehicle.vehicleName ?? null,
            vehicleColor: vehicle.vehicleColor ?? null,
            licensePlateNumber: vehicle.licensePlateNumber ?? null,
            approvalStatus: vehicle.approvalStatus ?? null,
            vehicleImageUrls: vehicle.vehicleImageUrls ?? [],
            vehicleType: vehicleType
                ? {
                      vehicleTypeId: this.extractId(vehicleType._id) ?? this.extractId(vehicleType.id),
                      name: vehicleType.name ?? null,
                      facilities: vehicleType.facilities ?? [],
                      image: vehicleType.image ?? null,
                  }
                : null,
        };
    }

    private buildFullName(user: any): string | null {
        if (!user) return null;
        const fullName = [user.firstName, user.lastName]
            .map((part) => (typeof part === 'string' ? part.trim() : ''))
            .filter(Boolean)
            .join(' ')
            .trim();
        return fullName || null;
    }

    private extractId(value: any): string | null {
        if (!value) return null;
        if (typeof value === 'string') return value;
        if (typeof value === 'object' && value._id) return String(value._id);
        if (typeof value === 'object' && value.id) return String(value.id);
        return String(value);
    }

    async history(riderId: string, page: number, limit: number, status: 'completed' | 'cancelled' | 'all') {
        const conditions: any = { driverId: new Types.ObjectId(riderId) };
        if (status === 'completed') conditions.status = RideStatus.COMPLETED;
        if (status === 'cancelled') conditions.status = RideStatus.CANCELLED;
        const result = await this.rideRepository.paginate(page, limit, conditions, { sort: { createdAt: -1 } });
        const rides = result.data.map((r: any) => {
            const plain = typeof r?.toObject === 'function' ? r.toObject() : { ...r };
            return {
                ...plain,
                displayStatus: resolveRideDisplayStatus(plain.status, plain.cancelledBy),
            };
        });
        return {
            success: true,
            data: {
                rides,
                pagination: {
                    total: result.total,
                    page: result.page,
                    limit: result.limit,
                    totalPages: result.totalPages,
                },
            },
        };
    }

    async listMessages(riderId: string, rideId: string) {
        const ride = await this.rideRepository.findById(rideId);
        if (!ride) throw new NotFoundException({ code: 'RIDE_NOT_FOUND', message: 'Ride not found' });
        if (String((ride as any).driverId || '') !== riderId) {
            throw new BadRequestException({ code: 'UNAUTHORIZED', message: 'You are not a party to this ride' });
        }
        const messages = await this.rideMessageRepository.listByRide(rideId);
        return { success: true, data: messages };
    }

    async sendMessage(riderId: string, rideId: string, message: string) {
        const ride = await this.rideRepository.findById(rideId);
        if (!ride) throw new NotFoundException({ code: 'RIDE_NOT_FOUND', message: 'Ride not found' });
        if (String((ride as any).driverId || '') !== riderId) {
            throw new BadRequestException({ code: 'UNAUTHORIZED', message: 'You are not a party to this ride' });
        }
        const clean = message.trim();
        if (!clean) throw new BadRequestException({ code: 'VALIDATION_ERROR', message: 'Message cannot be empty' });

        const msg = await this.rideMessageRepository.create({
            rideId: new Types.ObjectId(rideId),
            senderId: new Types.ObjectId(riderId),
            senderType: RideMessageSenderType.RIDER,
            message: clean,
        } as any);

        this.rideGateway.emitNewMessageToRideParties(String((ride as any).userId), riderId, {
            rideId,
            messageId: String((msg as any)._id),
            senderId: riderId,
            senderType: 'rider',
            message: clean,
            createdAt: (msg as any).createdAt,
        });

        return { success: true, data: { messageId: String((msg as any)._id), message: clean, createdAt: (msg as any).createdAt } };
    }
}

