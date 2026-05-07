/** Matches SQL ENUM on `rides.payment_type` */
export enum RidePaymentType {
    CASH = 'cash',
    CARD = 'card',
    WALLET = 'wallet',
}

/** Matches SQL ENUM on `rides.payment_status` */
export enum RidePaymentStatus {
    PENDING = 'pending',
    PAID = 'paid',
    FAILED = 'failed',
}

/** Matches SQL ENUM on `rides.status` */
export enum RideStatus {
    /** Legacy/DB default (kept for backward compatibility) */
    PENDING = 'pending',
    /** User booked; matching in progress */
    SEARCHING = 'searching',
    /** Scheduled for future start time (no driver yet) */
    SCHEDULED = 'scheduled',
    ACCEPTED = 'accepted',
    ARRIVED = 'arrived',
    IN_PROGRESS = 'in_progress',
    /** Legacy value (kept for backward compatibility) */
    ONGOING = 'ongoing',
    COMPLETED = 'completed',
    CANCELLED = 'cancelled',
}

/** Matches SQL ENUM on `rides.cancelled_by` */
export enum RideCancelledBy {
    USER = 'user',
    DRIVER = 'driver',
    ADMIN = 'admin',
}
