import { RideCancelledBy, RideStatus } from '../constants/ride.constants';

/** View-only status for listings (not stored in DB). */
export type RideDisplayStatus =
    | RideStatus
    | 'customer_cancelled'
    | 'rider_cancelled'
    | 'admin_cancelled';

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
