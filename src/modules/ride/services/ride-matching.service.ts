import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { RideEvents } from "src/modules/user/events/ride.events";
import { RiderLocationRepository } from "src/shared/repositories/rider-location.repository";
import { RideRepository } from "src/shared/repositories/ride.repository";
import { RideRequestRepository } from "src/shared/repositories/ride-request.repository";
import { RideRequestStatus } from "src/shared/schemas/ride-request.schema";
import { RideStatus } from "src/common/constants/ride.constants";
import { RideGateway } from "../gateways/ride.gateway";
import { UserRepository } from "src/shared/repositories/user.repository";
import { UserRole, UserStatus } from "src/common/constants/user.constants";
import { RideNotificationService } from "./ride-notification.service";

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
  ) {}

  @OnEvent(RideEvents.REQUEST_MATCHING)
  async handleMatchingRequested(payload: { rideId: string; userId: string }) {
    try {
      this.logger.log(`🔍 Matching started for ride: ${payload.rideId}`);

      const ride = await this.rideRepository.findById(payload.rideId);
      if (!ride) {
        this.logger.error("❌ Ride not found");
        return;
      }
      if (ride.status !== RideStatus.SEARCHING) {
        this.logger.error(`❌ Wrong status: ${ride.status}`);
        return;
      }

      this.logger.log(
        `📍 Pickup: lat=${ride.pickupLat}, lng=${ride.pickupLng}`,
      );

      const candidates =
        await this.riderLocationRepository.findOnlineRidersWithinKm({
          latitude: ride.pickupLat,
          longitude: ride.pickupLng,
          radiusKm: 5,
        });

      this.logger.log(`👥 Candidates found: ${candidates.length}`);
      this.logger.log(`👥 Candidates raw: ${JSON.stringify(candidates)}`); // ← exact data dekho

      for (const loc of candidates) {
        const riderId = String((loc as any).riderId);
        this.logger.log(`🔎 Checking rider: ${riderId}`);

        const rider = await this.userRepository.findById(riderId);
        if (!rider) {
          this.logger.warn(`⚠️ Rider ${riderId} not found in users`);
          continue;
        }
        if (rider.role !== UserRole.RIDER) {
          this.logger.warn(`⚠️ Wrong role: ${rider.role}`);
          continue;
        }
        if (rider.status !== UserStatus.ACTIVE) {
          this.logger.warn(`⚠️ Rider not active: ${rider.status}`);
          continue;
        }

        // Socket room check
        const room = `rider_${riderId}`;
        const socketsInRoom =
          this.rideGateway.server.sockets.adapter.rooms.get(room);
        this.logger.log(
          `🔌 Room ${room} has ${socketsInRoom?.size ?? 0} connected sockets`,
        );

        this.rideGateway.emitRideRequestToRider(riderId, {
          rideId: String((ride as any)._id),
          passengerName: "Passenger",
          pickupAddress: ride.pickupAddress,
          dropOffAddress: ride.dropAddress,
          fare: ride.totalAmount,
          distance: ride.distanceKm,
          timeout: 30,
        });

        this.logger.log(`✅ ride_request emitted to rider_${riderId}`);
        return;
      }

      this.logger.warn(
        "⚠️ No eligible candidates found — no ride_request sent",
      );
    } catch (e) {
      this.logger.error("❌ Matching failed", e as any);
    }
  }
}
