import { Injectable, NotFoundException } from '@nestjs/common';
import { ContactUsSubmissionRepository } from '../../../shared/repositories/contact-us-submission.repository';
import { AdminContactUsListQueryDto } from '../dto/admin-contact-us-list-query.dto';

function toSubmissionRow(doc: any) {
    const o = doc.toObject ? doc.toObject() : { ...doc };
    const id = o._id?.toString?.() ?? String(o._id);
    delete o._id;
    delete o.__v;
    if (o.userId && typeof o.userId === 'object' && o.userId.toString) {
        o.userId = o.userId.toString();
    }
    return {
        id,
        ...o,
    };
}

@Injectable()
export class AdminContactUsService {
    constructor(private readonly contactUsSubmissionRepository: ContactUsSubmissionRepository) {}

    async list(query: AdminContactUsListQueryDto) {
        const page = query.page ?? 1;
        const limit = query.limit ?? 10;
        const raw = await this.contactUsSubmissionRepository.paginateAdmin(page, limit, {
            search: query.search,
            senderRole: query.senderRole,
        });
        return {
            ...raw,
            data: raw.data.map((d) => toSubmissionRow(d)),
        };
    }

    async getById(id: string) {
        const doc = await this.contactUsSubmissionRepository.findById(id);
        if (!doc) {
            throw new NotFoundException('Contact submission not found');
        }
        return toSubmissionRow(doc);
    }
}
