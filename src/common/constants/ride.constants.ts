/** Matches SQL ENUM on `rides.payment_type` */
export enum RidePaymentType {
    CASH = 'cash',
    CARD = 'card',
}

/** Matches SQL ENUM on `rides.payment_status` */
export enum RidePaymentStatus {
    PENDING = 'pending',
    PAID = 'paid',
    FAILED = 'failed',
}

/** Matches SQL ENUM on `rides.status` */
export enum RideStatus {
    PENDING = 'pending',
    ACCEPTED = 'accepted',
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
