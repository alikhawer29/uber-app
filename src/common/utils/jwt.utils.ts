// src/shared/utils/jwt.utils.ts
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class JwtUtils {
    constructor(private readonly jwtService: JwtService) { }

    extractUserIdFromToken(authHeader: string): string | null {
        if (!authHeader) return null;

        try {
            const token = authHeader.replace('Bearer ', '');
            const decoded = this.jwtService.decode(token) as any;
            return decoded?.sub || decoded?.userId || null;
        } catch (error) {
            return null;
        }
    }

    verifyToken(token: string): any {
        try {
            return this.jwtService.verify(token);
        } catch (error) {
            return null;
        }
    }
}