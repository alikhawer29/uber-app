import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { RideEvents } from 'src/modules/user/events/ride.events';
import { RiderLocationRepository } from 'src/shared/repositories/rider-location.repository';
import { RideRepository } from 'src/shared/repositories/ride.repository';
import { RideRequestRepository } from 'src/shared/repositories/ride-request.repository';
import { RideRequestStatus } from 'src/shared/schemas/ride-request.schema';
import { RideStatus } from 'src/common/constants/ride.constants';
import { RideGateway } from '../gateways/ride.gateway';
import { UserRepository } from 'src/shared/repositories/user.repository';
import { UserRole, UserStatus } from 'src/common/constants/user.constants';
import { RideNotificationService } from './ride-notification.service';

@Injectable()
export class RideMatchingService {
    private readonly logger = new Logger(RideMatchingService.name);

    constructor(
        private readonly rideRepository: RideRepository,
        private readonly riderLocationRepository: RiderLocationRepository,
        private readonly rideRequestRepository: RideRequestRepository,
        private readonly userRepository: UserRepository,
        private readonly rideGateway: RideGateway,
        private readonly rideNotificationService: RideNotificationService,
    ) { }

    @OnEvent(RideEvents.REQUEST_MATCHING)
    async handleMatchingRequested(payload: { rideId: string; userId: string }) {
        try {
            const ride = await this.rideRepository.findById(payload.rideId);
            if (!ride) return;
            if (ride.status !== RideStatus.SEARCHING) return;

            // Find online riders in 5km radius
            const candidates = await this.riderLocationRepository.findOnlineRidersWithinKm({
                latitude: ride.pickupLat,
                longitude: ride.pickupLng,
                radiusKm: 5,
            });

            for (const loc of candidates) {
                const riderId = String((loc as any).riderId);
                const rider = await this.userRepository.findById(riderId);
                if (!rider) continue;
                if (rider.role !== UserRole.RIDER) continue;
                if (rider.status !== UserStatus.ACTIVE) continue;

                // Create ride request (ignore duplicates)
                const existing = await this.rideRequestRepository.findOne({
                    rideId: (ride as any)._id,
                    riderId: (loc as any).riderId,
                } as any);
                if (existing) continue;

                await this.rideRequestRepository.create({
                    rideId: (ride as any)._id,
                    riderId: (loc as any).riderId,
                    status: RideRequestStatus.PENDING,
                } as any);

                this.rideGateway.emitRideRequestToRider(riderId, {
                    rideId: String((ride as any)._id),
                    passengerName: 'Passenger',
                    pickupAddress: ride.pickupAddress,
                    dropOffAddress: ride.dropAddress,
                    fare: ride.totalAmount,
                    distance: ride.distanceKm,
                    timeout: 30,
                });
                void this.rideNotificationService.notifyNewRideRequest(
                    riderId,
                    String((ride as any)._id),
                    ride.pickupAddress,
                    ride.totalAmount,
                );

                // For now: send to first eligible rider only
                return;
            }

            // No candidates found: keep searching; client can poll /user/rides/active
        } catch (e) {
            this.logger.error('Matching failed', e as any);
        }
    }
}

