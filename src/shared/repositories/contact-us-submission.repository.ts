import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model } from 'mongoose';
import { BaseRepository } from './base.repository';
import {
    ContactUsSubmission,
    ContactUsSubmissionDocument,
    ContactUsSenderRole,
} from '../schemas/contact-us-submission.schema';

@Injectable()
export class ContactUsSubmissionRepository extends BaseRepository<ContactUsSubmissionDocument> {
    constructor(
        @InjectModel(ContactUsSubmission.name)
        model: Model<ContactUsSubmissionDocument>,
    ) {
        super(model);
    }

    async paginateAdmin(
        page: number,
        limit: number,
        options?: {
            search?: string;
            senderRole?: ContactUsSenderRole;
            fromDate?: string;
            toDate?: string;
        },
    ) {
        const conditions: FilterQuery<ContactUsSubmissionDocument> = {};

        if (options?.senderRole) {
            conditions.senderRole = options.senderRole;
        }

        if (options?.fromDate || options?.toDate) {
            conditions.createdAt = {};
            if (options.fromDate) {
                (conditions.createdAt as any).$gte = new Date(options.fromDate);
            }
            if (options.toDate) {
                const end = new Date(options.toDate);
                end.setHours(23, 59, 59, 999);
                (conditions.createdAt as any).$lte = end;
            }
        }

        const search = options?.search?.trim();
        if (search) {
            const rx = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
            conditions.$or = [
                { firstName: rx },
                { lastName: rx },
                { email: rx },
                { message: rx },
            ];
        }

        return this.paginate(page, limit, conditions, {
            sort: { createdAt: -1 },
        });
    }
}
