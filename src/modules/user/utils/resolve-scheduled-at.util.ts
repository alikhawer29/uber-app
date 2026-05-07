import { BadRequestException } from '@nestjs/common';

export type ScheduledAtPayload = {
    scheduledAt?: string;
    scheduledAtDate?: string;
    scheduledAtTime?: string;
};

/**
 * Resolves optional schedule from ISO `scheduledAt` or paired `scheduledAtDate` + `scheduledAtTime`.
 * Returns `null` when none provided (Book Now). `scheduledAt` ISO wins if present.
 */
export function resolveScheduledAtFromPayload(payload: ScheduledAtPayload): Date | null {
    const iso = payload.scheduledAt?.trim();
    if (iso) {
        const d = new Date(iso);
        if (Number.isNaN(d.getTime())) {
            throw new BadRequestException({ code: 'VALIDATION_ERROR', message: 'scheduledAt is invalid' });
        }
        return d;
    }

    const datePart = payload.scheduledAtDate?.trim();
    const timePart = payload.scheduledAtTime?.trim();
    if (!datePart && !timePart) {
        return null;
    }
    if (!datePart || !timePart) {
        throw new BadRequestException({
            code: 'VALIDATION_ERROR',
            message: 'scheduledAtDate and scheduledAtTime must both be sent together',
        });
    }

    const timeNorm = timePart.length === 5 ? `${timePart}:00` : timePart;
    const combinedLocal = `${datePart}T${timeNorm}`;
    const d = new Date(combinedLocal);
    if (Number.isNaN(d.getTime())) {
        throw new BadRequestException({
            code: 'VALIDATION_ERROR',
            message: 'scheduledAtDate and scheduledAtTime form an invalid datetime',
        });
    }
    return d;
}
