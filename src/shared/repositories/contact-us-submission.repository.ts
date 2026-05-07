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
        },
    ) {
        const conditions: FilterQuery<ContactUsSubmissionDocument> = {};

        if (options?.senderRole) {
            conditions.senderRole = options.senderRole;
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
