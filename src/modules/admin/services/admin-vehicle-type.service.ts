import {
    BadRequestException,
    ConflictException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import { VehicleTypeRepository } from 'src/shared/repositories/vehicle-type.repository';
import { CreateVehicleTypeDto } from '../dto/create-vehicle-type.dto';
import { UpdateVehicleTypeDto } from '../dto/update-vehicle-type.dto';
import { AdminListQueryDto } from '../dto/list-query.dto';

@Injectable()
export class AdminVehicleTypeService {
    constructor(private readonly vehicleTypeRepository: VehicleTypeRepository) {}

    async list(query: AdminListQueryDto) {
        const page = query.page ?? 1;
        const limit = query.limit ?? 10;
        return this.vehicleTypeRepository.paginateActive(page, limit, query.search);
    }

    async getById(id: string) {
        const doc = await this.vehicleTypeRepository.findById(id);
        if (!doc || !doc.isActive) {
            throw new NotFoundException('Vehicle type not found');
        }
        return doc;
    }

    async create(dto: CreateVehicleTypeDto, image?: Express.Multer.File) {
        const existing = await this.vehicleTypeRepository.findByName(dto.name.trim());
        if (existing) {
            throw new ConflictException('A vehicle type with this name already exists');
        }
        try {
            return await this.vehicleTypeRepository.create({
                name: dto.name.trim(),
                facilities: dto.facilities.trim(),
                sortOrder: dto.sortOrder ?? 0,
                image: image ? `/uploads/${image.filename}` : undefined,
                isActive: true,
            });
        } catch (err: any) {
            if (err?.code === 11000) {
                throw new ConflictException('A vehicle type with this name already exists');
            }
            throw err;
        }
    }

    async update(id: string, dto: UpdateVehicleTypeDto, image?: Express.Multer.File) {
        const doc = await this.vehicleTypeRepository.findById(id);
        if (!doc) {
            throw new NotFoundException('Vehicle type not found');
        }
        if (dto.name !== undefined && dto.name.trim() !== doc.name) {
            const taken = await this.vehicleTypeRepository.findByName(dto.name.trim());
            if (taken && String(taken._id) !== id) {
                throw new ConflictException('A vehicle type with this name already exists');
            }
        }
        const payload: Record<string, unknown> = {};
        if (dto.name !== undefined) payload.name = dto.name.trim();
        if (dto.facilities !== undefined) payload.facilities = dto.facilities.trim();
        if (dto.sortOrder !== undefined) payload.sortOrder = dto.sortOrder;
        if (image) {
            await this.removeImageFileFromDisk(doc.image);
            payload.image = `/uploads/${image.filename}`;
        }
        try {
            const updated = await this.vehicleTypeRepository.update(id, payload as any);
            if (!updated) {
                throw new NotFoundException('Vehicle type not found');
            }
            return updated;
        } catch (err: any) {
            if (err?.code === 11000) {
                throw new ConflictException('A vehicle type with this name already exists');
            }
            throw err;
        }
    }

    async remove(id: string) {
        const doc = await this.vehicleTypeRepository.findById(id);
        if (!doc) {
            throw new NotFoundException('Vehicle type not found');
        }
        const updated = await this.vehicleTypeRepository.update(id, { isActive: false } as any);
        if (!updated) {
            throw new NotFoundException('Vehicle type not found');
        }
        return { message: 'Vehicle type deactivated' };
    }

    private async removeImageFileFromDisk(imageUrl?: string) {
        if (!imageUrl?.startsWith('/uploads/')) return;
        const filename = imageUrl.replace(/^\/uploads\//, '');
        if (!filename || filename.includes('..')) return;
        const full = path.join(process.cwd(), 'uploads', filename);
        try {
            await fs.unlink(full);
        } catch {
            /* ignore missing file */
        }
    }
}
