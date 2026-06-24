import { Injectable, NotFoundException } from '@nestjs/common';
import { RidePaymentType } from 'src/common/constants/ride.constants';
import {
    formatTripId,
    resolveRideDisplayStatus,
    resolveRideDisplayStatusLabel,
} from 'src/common/utils/ride-display-status.util';
import { RideRepository } from 'src/shared/repositories/ride.repository';
import { UserRepository } from 'src/shared/repositories/user.repository';
import { CommissionRateRepository } from 'src/shared/repositories/commission-rate.repository';
import { AdminBookingListQueryDto } from '../dto/admin-booking-list-query.dto';
import { formatPaymentMethodLabel, mapPopulatedUser } from '../utils/admin-format.util';

@Injectable()
export class AdminBookingsService {
    constructor(
        private readonly rideRepository: RideRepository,
        private readonly userRepository: UserRepository,
        private readonly commissionRateRepository: CommissionRateRepository,
    ) {}

    async list(query: AdminBookingListQueryDto) {
        const page = query.page ?? 1;
        const limit = query.limit ?? 10;

        let userIds: any[] | undefined;
        let driverIds: any[] | undefined;
        if (query.search?.trim()) {
            const ids = await this.userRepository.searchIdsByNameOrEmail(query.search);
            userIds = ids;
            driverIds = ids;
        }

        const raw = await this.rideRepository.paginateAdmin(page, limit, {
            search: query.search,
            status: query.status,
            fromDate: query.fromDate,
            toDate: query.toDate,
            userIds,
            driverIds,
        });

        return {
            ...raw,
            data: raw.data.map((ride) => this.toListRow(ride)),
        };
    }

    async getById(id: string) {
        const ride = await this.rideRepository.findById(id, {
            populate: [
                { path: 'userId', select: 'firstName lastName email phone countryCode avatar' },
                { path: 'driverId', select: 'firstName lastName email phone countryCode avatar' },
            ],
        });
        if (!ride) {
            throw new NotFoundException('Booking not found');
        }

        const rideId = String((ride as any)._id);
        const user = mapPopulatedUser((ride as any).userId);
        let driver = mapPopulatedUser((ride as any).driverId);
        let driverRating = { averageRating: 0, totalTrips: 0 };

        if (driver?.id) {
            const [stats, totalTrips] = await Promise.all([
                this.rideRepository.aggregateDriverRatingSummary(driver.id),
                this.rideRepository.countDriverCompletedTrips(driver.id),
            ]);
            driverRating = { averageRating: stats.averageRating, totalTrips };
        }

        const latestCommission = await this.commissionRateRepository.getLatest();
        const commissionPercentage = latestCommission?.percentage ?? 18;
        const commissionAmount =
            ride.status === 'completed'
                ? Math.round(ride.totalAmount * (commissionPercentage / 100) * 100) / 100
                : 0;

        const displayStatus = resolveRideDisplayStatus(ride.status, ride.cancelledBy);
        const start = new Date(ride.startTime);

        return {
            id: rideId,
            tripId: formatTripId(rideId),
            status: ride.status,
            displayStatus,
            displayStatusLabel: resolveRideDisplayStatusLabel(displayStatus),
            user: user
                ? {
                      ...user,
                      rating: ride.ratingByUser ?? null,
                      review: ride.reviewByUser ?? null,
                  }
                : null,
            driver: driver
                ? {
                      ...driver,
                      totalTrips: driverRating.totalTrips,
                      rating: driverRating.averageRating,
                      commissionPercentage,
                      commissionAmount,
                      earning:
                          ride.status === 'completed'
                              ? Math.round((ride.totalAmount - commissionAmount) * 100) / 100
                              : null,
                  }
                : null,
            trip: {
                pickupAddress: ride.pickupAddress,
                dropoffAddress: ride.dropAddress,
                pickup: { lat: ride.pickupLat, lng: ride.pickupLng },
                dropoff: { lat: ride.dropLat, lng: ride.dropLng },
                time: start.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false }),
                date: start.toLocaleDateString('en-GB'),
                startTime: ride.startTime,
                endTime: ride.endTime ?? null,
                distanceKm: ride.distanceKm ?? null,
                rideType: ride.rideType,
                notes: ride.notes ?? null,
            },
            payment: {
                baseFare: ride.baseFare,
                distanceFare: ride.distanceFare,
                timeFare: ride.timeFare,
                discount: ride.discount,
                tax: ride.tax,
                totalAmount: ride.totalAmount,
                currency: 'USD',
                paymentType: ride.paymentType,
                paymentMethod: formatPaymentMethodLabel(ride.paymentType),
                paymentStatus: ride.paymentStatus,
                cashCollectedAmount: ride.cashCollectedAmount ?? null,
                waitingCharges: ride.timeFare ?? 0,
                amountPaidViaWallet: ride.paymentType === RidePaymentType.WALLET ? ride.totalAmount : 0,
                amountPaidViaCash:
                    ride.paymentType === RidePaymentType.CASH
                        ? (ride.cashCollectedAmount ?? ride.totalAmount)
                        : 0,
            },
            ratingByDriver: ride.ratingByDriver ?? null,
            cancelReason: ride.cancelReason ?? null,
            cancelledBy: ride.cancelledBy ?? null,
            createdAt: (ride as any).createdAt,
            updatedAt: (ride as any).updatedAt,
        };
    }

    private toListRow(ride: any) {
        const rideId = String(ride._id);
        const user = mapPopulatedUser(ride.userId);
        const driver = mapPopulatedUser(ride.driverId);
        const displayStatus = resolveRideDisplayStatus(ride.status, ride.cancelledBy);

        return {
            id: rideId,
            tripId: formatTripId(rideId),
            userName: user?.name || '—',
            driverName: driver?.name || 'Assign soon',
            status: ride.status,
            displayStatus,
            displayStatusLabel: resolveRideDisplayStatusLabel(displayStatus),
            totalAmount: ride.totalAmount,
            startTime: ride.startTime,
            createdAt: ride.createdAt,
        };
    }
}
