import { Injectable, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { ReportStatus } from 'src/common/constants/admin.constants';
import { RidePaymentType } from 'src/common/constants/ride.constants';
import {
    formatTripId,
    resolveRideDisplayStatus,
    resolveRideDisplayStatusLabel,
} from 'src/common/utils/ride-display-status.util';
import { RideComplaintRepository } from 'src/shared/repositories/ride-complaint.repository';
import { RideRepository } from 'src/shared/repositories/ride.repository';
import { UserRepository } from 'src/shared/repositories/user.repository';
import { AdminReportListQueryDto } from '../dto/admin-report-list-query.dto';
import { formatPaymentMethodLabel, mapPopulatedUser } from '../utils/admin-format.util';

@Injectable()
export class AdminReportsService {
    constructor(
        private readonly rideComplaintRepository: RideComplaintRepository,
        private readonly rideRepository: RideRepository,
        private readonly userRepository: UserRepository,
    ) {}

    async list(query: AdminReportListQueryDto) {
        const page = query.page ?? 1;
        const limit = query.limit ?? 10;

        let userIds: Types.ObjectId[] | undefined;
        let rideIds: Types.ObjectId[] | undefined;
        if (query.search?.trim()) {
            userIds = await this.userRepository.searchIdsByNameOrEmail(query.search);
            const trimmed = query.search.trim();
            if (Types.ObjectId.isValid(trimmed)) {
                rideIds = [new Types.ObjectId(trimmed)];
            }
        }

        const raw = await this.rideComplaintRepository.paginateAdmin(page, limit, {
            search: query.search,
            status: query.status,
            fromDate: query.fromDate,
            toDate: query.toDate,
            userIds,
            rideIds,
        });

        return {
            ...raw,
            data: raw.data.map((doc, index) => this.toListRow(doc, (page - 1) * limit + index + 1)),
        };
    }

    async getById(id: string) {
        const complaint = await this.rideComplaintRepository.findById(id, {
            populate: [{ path: 'userId', select: 'firstName lastName email phone countryCode avatar' }],
        });
        if (!complaint) {
            throw new NotFoundException('Report not found');
        }

        const o = complaint as any;
        const rideId = o.rideId?.toString?.() ?? String(o.rideId);
        const ride = rideId
            ? await this.rideRepository.findById(rideId, {
                  populate: [
                      { path: 'userId', select: 'firstName lastName email phone countryCode avatar' },
                      { path: 'driverId', select: 'firstName lastName email phone countryCode avatar' },
                  ],
              })
            : null;

        let driver = ride ? mapPopulatedUser((ride as any).driverId) : null;
        let driverRating = { averageRating: 0, totalTrips: 0 };
        if (driver?.id) {
            const [stats, totalTrips] = await Promise.all([
                this.rideRepository.aggregateDriverRatingSummary(driver.id),
                this.rideRepository.countDriverCompletedTrips(driver.id),
            ]);
            driverRating = { averageRating: stats.averageRating, totalTrips };
        }

        const user = mapPopulatedUser(o.userId ?? (ride as any)?.userId);
        const displayStatus = ride
            ? resolveRideDisplayStatus((ride as any).status, (ride as any).cancelledBy)
            : null;
        const start = (ride as any)?.startTime ? new Date((ride as any).startTime) : null;

        return {
            id: String(o._id),
            status: o.status ?? ReportStatus.PENDING,
            message: o.message,
            resolvedAt: o.resolvedAt ?? null,
            user,
            driver: driver
                ? {
                      ...driver,
                      totalTrips: driverRating.totalTrips,
                      rating: driverRating.averageRating,
                  }
                : null,
            trip: ride
                ? {
                      id: rideId,
                      tripId: rideId ? formatTripId(rideId) : null,
                      status: (ride as any).status,
                      displayStatus,
                      displayStatusLabel: displayStatus
                          ? resolveRideDisplayStatusLabel(displayStatus)
                          : null,
                      pickupAddress: (ride as any).pickupAddress,
                      dropoffAddress: (ride as any).dropAddress,
                      pickup: { lat: (ride as any).pickupLat, lng: (ride as any).pickupLng },
                      dropoff: { lat: (ride as any).dropLat, lng: (ride as any).dropLng },
                      time: start
                          ? start.toLocaleTimeString('en-GB', {
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: false,
                            })
                          : null,
                      date: start ? start.toLocaleDateString('en-GB') : null,
                      rating: (ride as any).ratingByUser ?? null,
                      review: (ride as any).reviewByUser ?? null,
                      totalAmount: (ride as any).totalAmount,
                      paymentMethod: formatPaymentMethodLabel((ride as any).paymentType),
                      amountPaidViaWallet:
                          (ride as any).paymentType === RidePaymentType.WALLET
                              ? (ride as any).totalAmount
                              : 0,
                      amountPaidViaCash:
                          (ride as any).paymentType === RidePaymentType.CASH
                              ? ((ride as any).cashCollectedAmount ?? (ride as any).totalAmount)
                              : 0,
                  }
                : null,
            createdAt: o.createdAt,
            updatedAt: o.updatedAt,
        };
    }

    async resolve(id: string, adminId: string) {
        const complaint = await this.rideComplaintRepository.findById(id);
        if (!complaint) {
            throw new NotFoundException('Report not found');
        }
        const updated = await this.rideComplaintRepository.update(id, {
            status: ReportStatus.RESOLVED,
            resolvedAt: new Date(),
            resolvedByAdminId: adminId,
        } as any);
        return {
            message: 'Report marked as resolved',
            id,
            status: updated?.status ?? ReportStatus.RESOLVED,
            resolvedAt: (updated as any)?.resolvedAt ?? new Date(),
        };
    }

    private toListRow(doc: any, serialNo: number) {
        const o = doc.toObject ? doc.toObject() : { ...doc };
        const user = mapPopulatedUser(o.userId);
        const ride = o.rideId && typeof o.rideId === 'object' ? o.rideId : null;
        const rideId = ride?._id?.toString?.() ?? o.rideId?.toString?.() ?? null;

        return {
            serialNo,
            id: String(o._id),
            userName: user?.name ?? '—',
            email: user?.email ?? null,
            rideId,
            tripId: rideId ? formatTripId(rideId) : null,
            messagePreview: o.message?.length > 80 ? `${o.message.slice(0, 80)}…` : o.message,
            status: o.status ?? ReportStatus.PENDING,
            date: o.createdAt,
            createdAt: o.createdAt,
        };
    }
}
