import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { RideRepository } from 'src/shared/repositories/ride.repository';
import { RideMessageRepository } from 'src/shared/repositories/ride-message.repository';
import { RideMessageSenderType } from 'src/shared/schemas/ride-message.schema';
import { RideGateway } from 'src/modules/ride/gateways/ride.gateway';

@Injectable()
export class RideChatService {
    constructor(
        private readonly rideRepository: RideRepository,
        private readonly rideMessageRepository: RideMessageRepository,
        private readonly rideGateway: RideGateway,
    ) { }

    async listMessagesForUser(userId: string, rideId: string) {
        const ride = await this.rideRepository.findOwnedByUser(rideId, userId);
        if (!ride) throw new NotFoundException({ code: 'RIDE_NOT_FOUND', message: 'Ride not found' });
        const messages = await this.rideMessageRepository.listByRide(rideId);
        return { success: true, data: messages };
    }

    async sendMessageFromUser(userId: string, rideId: string, message: string) {
        const ride = await this.rideRepository.findOwnedByUser(rideId, userId);
        if (!ride) throw new NotFoundException({ code: 'RIDE_NOT_FOUND', message: 'Ride not found' });
        const clean = message.trim();
        if (!clean) throw new BadRequestException({ code: 'VALIDATION_ERROR', message: 'Message cannot be empty' });

        const msg = await this.rideMessageRepository.create({
            rideId: new Types.ObjectId(rideId),
            senderId: new Types.ObjectId(userId),
            senderType: RideMessageSenderType.USER,
            message: clean,
        } as any);

        this.rideGateway.emitNewMessageToRideParties(String((ride as any).userId), (ride as any).driverId ? String((ride as any).driverId) : null, {
            rideId,
            messageId: String((msg as any)._id),
            senderId: userId,
            senderType: 'user',
            message: clean,
            createdAt: (msg as any).createdAt,
        });

        return {
            success: true,
            data: { messageId: String((msg as any)._id), message: clean, createdAt: (msg as any).createdAt },
        };
    }
}

