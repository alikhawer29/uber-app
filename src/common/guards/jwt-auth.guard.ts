import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
    constructor(private reflector: Reflector) {
        super();
    }

    canActivate(context: ExecutionContext) {
        const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        if (isPublic) {
            return true;
        }

        const result = super.canActivate(context);
        
        // If result is a Promise, ensure it's handled properly
        if (result instanceof Promise) {
            return result.catch((error) => {
                // Re-throw authentication errors
                throw error || new UnauthorizedException('Invalid token');
            });
        }
        
        return result;
    }

    handleRequest(err, user, info) {
        if (err || !user) {
            // Provide more specific error messages
            if (info?.name === 'TokenExpiredError') {
                throw new UnauthorizedException('Token has expired');
            } else if (info?.name === 'JsonWebTokenError') {
                throw new UnauthorizedException('Invalid token format');
            } else if (info?.name === 'NotBeforeError') {
                throw new UnauthorizedException('Token not active yet');
            }
            
            const errorMessage = info?.message || err?.message || 'Invalid token';
            throw err || new UnauthorizedException(errorMessage);
        }
        return user;
    }
}