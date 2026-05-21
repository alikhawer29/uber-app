import { Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { ContactUsSubmissionRepository } from '../../../shared/repositories/contact-us-submission.repository';
import {
    ContactUsSenderRole,
} from '../../../shared/schemas/contact-us-submission.schema';
import { CreateContactUsDto } from '../dto/create-contact-us.dto';
import { NotificationService } from 'src/modules/notification/services/notification.service';

@Injectable()
export class ContactUsService {
    constructor(
        private readonly contactUsSubmissionRepository: ContactUsSubmissionRepository,
        private readonly notificationService: NotificationService,
    ) {}

    async submit(userId: string, senderRole: ContactUsSenderRole, dto: CreateContactUsDto) {
        await this.contactUsSubmissionRepository.create({
            firstName: dto.firstName.trim(),
            lastName: dto.lastName.trim(),
            email: dto.email.trim().toLowerCase(),
            message: dto.message.trim(),
            senderRole,
            userId: new Types.ObjectId(userId),
        });

        void this.notificationService.notifyContactFormSubmission({
            name: `${dto.firstName.trim()} ${dto.lastName.trim()}`.trim(),
            email: dto.email.trim().toLowerCase(),
            subject: `Contact (${senderRole})`,
            message: dto.message.trim(),
        });

        return { message: 'Your message has been sent successfully' };
    }
}
