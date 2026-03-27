import { Injectable, CanActivate, ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { UserRole } from '../constants/user.constants';

@Injectable()
export class RolesGuard implements CanActivate {
    constructor(private reflector: Reflector) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        // Check if route is public
        const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        if (isPublic) {
            return true;
        }

        const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        const requiredPermissions = this.reflector.getAllAndOverride(PERMISSIONS_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        // If no roles or permissions are required, allow access (but user must be authenticated by JWT guard)
        if (!requiredRoles && !requiredPermissions) {
            return true;
        }

        const request = context.switchToHttp().getRequest();
        const { user } = request;

        // If user is not set, JWT authentication must have failed
        // Since APP_GUARD runs after useGlobalGuards, JWT guard should have run first
        // If user is not set, it means JWT guard failed to authenticate
        // We should throw UnauthorizedException to match JWT guard behavior
        if (!user) {
            // Check if Authorization header exists
            const authHeader = request.headers?.authorization;
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                throw new UnauthorizedException('Authentication token required');
            }
            // Token exists but user is not set - JWT guard should have thrown an error
            // But if we reach here, we'll throw UnauthorizedException
            throw new UnauthorizedException('Invalid or expired token');
        }

        // Normalize role to string for comparison
        const userRole = String(user.role);
        const isAdmin = userRole === UserRole.ADMIN || userRole === 'admin';
        // Allow ADMIN to access all admin endpoints
        if (isAdmin) {
            return true;
        }

        // Check if user has required role
        if (requiredRoles) {
            const hasRole = requiredRoles.some((role) => {
                const roleStr = String(role);
                return userRole === roleStr || userRole === role;
            });
            if (!hasRole) {
                throw new ForbiddenException('Insufficient permissions');
            }
        }

        // Sub-admin permission checks were removed with admin feature cleanup.
        if (requiredPermissions && requiredPermissions.length > 0) {
            throw new ForbiddenException('Insufficient permissions');
        }

        return true;
    }
}