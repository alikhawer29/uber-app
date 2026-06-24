import { Injectable, NotFoundException } from '@nestjs/common';
import { ContactUsSubmissionRepository } from 'src/shared/repositories/contact-us-submission.repository';
import { AdminQueryListQueryDto } from '../dto/admin-query-list-query.dto';

function toQueryRow(doc: any, serialNo: number) {
    const o = doc.toObject ? doc.toObject() : { ...doc };
    const id = o._id?.toString?.() ?? String(o._id);
    delete o._id;
    delete o.__v;
    const userId = o.userId?.toString?.() ?? (o.userId ? String(o.userId) : null);
    return {
        serialNo,
        id,
        userName: `${o.firstName ?? ''} ${o.lastName ?? ''}`.trim(),
        firstName: o.firstName,
        lastName: o.lastName,
        email: o.email,
        type: o.senderRole,
        message: o.message,
        userId,
        date: o.createdAt,
        createdAt: o.createdAt,
    };
}

@Injectable()
export class AdminQueriesService {
    constructor(private readonly contactUsSubmissionRepository: ContactUsSubmissionRepository) {}

    async list(query: AdminQueryListQueryDto) {
        const page = query.page ?? 1;
        const limit = query.limit ?? 10;
        const raw = await this.contactUsSubmissionRepository.paginateAdmin(page, limit, {
            search: query.search,
            senderRole: query.type,
            fromDate: query.fromDate,
            toDate: query.toDate,
        });
        return {
            ...raw,
            data: raw.data.map((d, index) => toQueryRow(d, (page - 1) * limit + index + 1)),
        };
    }

    async getById(id: string) {
        const doc = await this.contactUsSubmissionRepository.findById(id);
        if (!doc) {
            throw new NotFoundException('Query not found');
        }
        const o = (doc as any).toObject ? (doc as any).toObject() : { ...doc };
        return {
            id: String(o._id),
            name: `${o.firstName ?? ''} ${o.lastName ?? ''}`.trim(),
            firstName: o.firstName,
            lastName: o.lastName,
            email: o.email,
            type: o.senderRole,
            userId: o.userId?.toString?.() ?? null,
            message: o.message,
            createdAt: o.createdAt,
        };
    }

    async delete(id: string) {
        const deleted = await this.contactUsSubmissionRepository.delete(id);
        if (!deleted) {
            throw new NotFoundException('Query not found');
        }
        return { message: 'Query deleted successfully' };
    }
}
