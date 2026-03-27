export enum UserRole {
    ADMIN = 'admin',
    USER = 'user',
    SUB_ADMIN = 'sub_admin',
}

export enum UserStatus {
    ACTIVE = 'active',
    INACTIVE = 'inactive',
    SUSPENDED = 'suspended',
}

export enum Permission {
    USER_PROFILE_READ = 'user:profile:read',
    USER_PROFILE_UPDATE = 'user:profile:update',
    USER_PASSWORD_UPDATE = 'user:password:update',
    ADMIN_ACCESS = 'admin:access',
    USER_MANAGE = 'user:manage',
    // Sub-admin module permissions
    DASHBOARD_ACCESS = 'dashboard:access',
    USER_MANAGEMENT = 'user:management',
    BOOKING_MANAGEMENT = 'booking:management',
    SUBSCRIPTION_MANAGEMENT = 'subscription:management',
    PAYMENT_MANAGEMENT = 'payment:management',
    AVAILABILITY_MANAGEMENT = 'availability:management',
    PRICING_MANAGEMENT = 'pricing:management',
    TUTORIAL_MANAGEMENT = 'tutorial:management',
    QUERY_MANAGEMENT = 'query:management',
    SUB_ADMIN_MANAGEMENT = 'sub_admin:management',
}

export const RolePermissions = {
    [UserRole.ADMIN]: Object.values(Permission),
    [UserRole.USER]: [
        Permission.USER_PROFILE_READ,
        Permission.USER_PROFILE_UPDATE,
        Permission.USER_PASSWORD_UPDATE,
    ],
};