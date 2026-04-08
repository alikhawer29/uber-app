import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { SavedPlaceRepository } from 'src/shared/repositories/saved-place.repository';
import { CreateSavedPlaceDto } from '../dto/create-saved-place.dto';
import { UpdateSavedPlaceDto } from '../dto/update-saved-place.dto';

@Injectable()
export class UserSavedPlaceService {
    constructor(private readonly savedPlaceRepository: SavedPlaceRepository) {}

    async list(userId: string, search?: string) {
        return this.savedPlaceRepository.listForUser(userId, search);
    }

    async getById(userId: string, placeId: string) {
        const doc = await this.savedPlaceRepository.findOwnedByUser(placeId, userId);
        if (!doc || !doc.isActive) {
            throw new NotFoundException('Saved place not found');
        }
        return doc;
    }

    async create(userId: string, dto: CreateSavedPlaceDto) {
        const payload = {
            userId: new Types.ObjectId(userId),
            name: dto.name.trim(),
            formattedAddress: dto.formattedAddress.trim(),
            googlePlaceId: dto.googlePlaceId?.trim() || undefined,
            latitude: dto.latitude,
            longitude: dto.longitude,
            sortOrder: dto.sortOrder ?? 0,
            isActive: true,
        };
        try {
            return await this.savedPlaceRepository.create(payload as any);
        } catch (err: any) {
            if (err?.code === 11000) {
                throw new ConflictException('This Google place is already saved');
            }
            throw err;
        }
    }

    async update(userId: string, placeId: string, dto: UpdateSavedPlaceDto) {
        const doc = await this.savedPlaceRepository.findOwnedByUser(placeId, userId);
        if (!doc) {
            throw new NotFoundException('Saved place not found');
        }
        const update: Record<string, unknown> = {};
        if (dto.name !== undefined) update.name = dto.name.trim();
        if (dto.formattedAddress !== undefined) update.formattedAddress = dto.formattedAddress.trim();
        if (dto.googlePlaceId !== undefined) {
            update.googlePlaceId = dto.googlePlaceId.trim() || undefined;
        }
        if (dto.latitude !== undefined) update.latitude = dto.latitude;
        if (dto.longitude !== undefined) update.longitude = dto.longitude;
        if (dto.sortOrder !== undefined) update.sortOrder = dto.sortOrder;
        if (Object.keys(update).length === 0) {
            return doc;
        }
        try {
            const updated = await this.savedPlaceRepository.update(placeId, update as any);
            if (!updated) {
                throw new NotFoundException('Saved place not found');
            }
            return updated;
        } catch (err: any) {
            if (err?.code === 11000) {
                throw new ConflictException('This Google place is already saved');
            }
            throw err;
        }
    }

    async remove(userId: string, placeId: string) {
        const doc = await this.savedPlaceRepository.findOwnedByUser(placeId, userId);
        if (!doc) {
            throw new NotFoundException('Saved place not found');
        }
        const updated = await this.savedPlaceRepository.update(placeId, { isActive: false } as any);
        if (!updated) {
            throw new NotFoundException('Saved place not found');
        }
        return { message: 'Saved place removed' };
    }
}
