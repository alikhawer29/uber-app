export enum PaymentType {
    SUBSCRIPTION = 'subscription',
    BOOKING = 'booking',
    ONE_TIME = 'one_time',
}

export enum PaymentStatus {
    PENDING = 'pending',
    SUCCEEDED = 'succeeded',
    FAILED = 'failed',
    REFUNDED = 'refunded',
    CANCELED = 'canceled',
}
