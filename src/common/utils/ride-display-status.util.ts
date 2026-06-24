import { AdminBookingStatusFilter } from '../constants/admin.constants';
import { RideCancelledBy, RideStatus } from '../constants/ride.constants';
import { FilterQuery } from 'mongoose';
import { RideDocument } from 'src/shared/schemas/ride.schema';

/** View-only status for listings (not stored in DB). */
export type RideDisplayStatus =
    | RideStatus
    | 'customer_cancelled'
    | 'rider_cancelled'
    | 'admin_cancelled';

const ACTIVE_STATUSES = [
    RideStatus.PENDING,
    RideStatus.SEARCHING,
    RideStatus.SCHEDULED,
    RideStatus.ACCEPTED,
    RideStatus.ARRIVED,
    RideStatus.IN_PROGRESS,
    RideStatus.ONGOING,
];

export function resolveRideDisplayStatus(
    status: string,
    cancelledBy?: string | null,
): RideDisplayStatus {
    if (status !== RideStatus.CANCELLED) {
        return status as RideDisplayStatus;
    }
    switch (cancelledBy) {
        case RideCancelledBy.USER:
            return 'customer_cancelled';
        case RideCancelledBy.DRIVER:
            return 'rider_cancelled';
        case RideCancelledBy.ADMIN:
            return 'admin_cancelled';
        default:
            return RideStatus.CANCELLED;
    }
}

export function resolveRideDisplayStatusLabel(displayStatus: RideDisplayStatus): string {
    switch (displayStatus) {
        case RideStatus.COMPLETED:
            return 'Completed';
        case 'customer_cancelled':
            return 'Cancelled By User';
        case 'rider_cancelled':
            return 'Cancelled By Driver';
        case 'admin_cancelled':
            return 'Cancelled By Admin';
        case RideStatus.CANCELLED:
            return 'Cancelled';
        default:
            if (ACTIVE_STATUSES.includes(displayStatus as RideStatus)) {
                return 'Active';
            }
            return String(displayStatus);
    }
}

export function formatTripId(rideId: string): string {
    const suffix = rideId.replace(/[^a-fA-F0-9]/g, '').slice(-6).toUpperCase();
    return `TR_${suffix || '000000'}`;
}

export function buildAdminBookingStatusFilter(
    filter?: AdminBookingStatusFilter,
): FilterQuery<RideDocument> | null {
    if (!filter) return null;

    switch (filter) {
        case AdminBookingStatusFilter.COMPLETED:
            return { status: RideStatus.COMPLETED };
        case AdminBookingStatusFilter.ACTIVE:
            return { status: { $in: ACTIVE_STATUSES } };
        case AdminBookingStatusFilter.CANCELLED_BY_USER:
            return { status: RideStatus.CANCELLED, cancelledBy: RideCancelledBy.USER };
        case AdminBookingStatusFilter.CANCELLED_BY_DRIVER:
            return { status: RideStatus.CANCELLED, cancelledBy: RideCancelledBy.DRIVER };
        case AdminBookingStatusFilter.CANCELLED_BY_ADMIN:
            return { status: RideStatus.CANCELLED, cancelledBy: RideCancelledBy.ADMIN };
        case AdminBookingStatusFilter.CANCELLED:
            return { status: RideStatus.CANCELLED };
        case AdminBookingStatusFilter.SEARCHING:
            return { status: RideStatus.SEARCHING };
        case AdminBookingStatusFilter.SCHEDULED:
            return { status: RideStatus.SCHEDULED };
        default:
            return null;
    }
}
