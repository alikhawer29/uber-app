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
import { WalletRepository } from "src/shared/repositories/wallet.repository";
import { roundMoney } from "src/common/utils/geo-pricing.utils";
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
    private readonly walletRepository: WalletRepository,
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

      for (const loc of candidates) {
        const riderId = String((loc as any).riderId);
        this.logger.log(`🔎 Checking rider: ${riderId}`);

        const rider = await this.userRepository.findById(riderId);
        if (!rider) {
          this.logger.warn(`⚠️ Rider not found`);
          continue;
        }
        if (rider.role !== UserRole.RIDER) {
          this.logger.warn(`⚠️ Wrong role: ${rider.role}`);
          continue;
        }
        if (rider.status !== UserStatus.ACTIVE) {
          this.logger.warn(`⚠️ Not active: ${rider.status}`);
          continue;
        }

        const wallet = await this.walletRepository.getOrCreate(riderId, "USD");
        const balance = roundMoney((wallet as any)?.balance ?? 0);
        if (balance < 0) {
          this.logger.warn(`⚠️ Rider has wallet dues: ${balance}`);
          continue;
        }

        this.logger.log(`✅ Rider passed all checks`);

        const existing = await this.rideRequestRepository.findOne({
          rideId: (ride as any)._id,
          riderId: (loc as any).riderId,
        } as any);
        if (existing) {
          this.logger.warn(`⚠️ Duplicate request, skipping`);
          continue;
        } // ← naya log

        await this.rideRequestRepository.create({
          rideId: (ride as any)._id,
          riderId: (loc as any).riderId,
          status: RideRequestStatus.PENDING,
        } as any);

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

        void this.rideNotificationService.notifyNewRideRequest(
          riderId,
          String((ride as any)._id),
          ride.pickupAddress,
          ride.totalAmount,
        );

        return;
      }

      this.logger.warn("⚠️ No eligible candidates found");
    } catch (e) {
      this.logger.error("❌ Matching failed", e as any);
    }
  }
}
