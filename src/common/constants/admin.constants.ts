export enum RevenueGraphPeriod {
    MONTHLY = 'monthly',
    SIX_MONTHS = '6months',
    YEARLY = 'yearly',
}

export enum ReportStatus {
    PENDING = 'pending',
    RESOLVED = 'resolved',
}

/** Filter values for admin booking list (maps to ride status + cancelledBy). */
export enum AdminBookingStatusFilter {
    COMPLETED = 'completed',
    ACTIVE = 'active',
    CANCELLED_BY_USER = 'cancelled_by_user',
    CANCELLED_BY_DRIVER = 'cancelled_by_driver',
    CANCELLED_BY_ADMIN = 'cancelled_by_admin',
    CANCELLED = 'cancelled',
    SEARCHING = 'searching',
    SCHEDULED = 'scheduled',
}
