import {
    BadRequestException,
    ConflictException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { FareRepository } from 'src/shared/repositories/fare.repository';
import { VehicleTypeRepository } from 'src/shared/repositories/vehicle-type.repository';
import { CreateFareDto } from '../dto/create-fare.dto';
import { UpdateFareDto } from '../dto/update-fare.dto';
import { AdminListQueryDto } from '../dto/list-query.dto';

@Injectable()
export class AdminFareService {
    constructor(
        private readonly fareRepository: FareRepository,
        private readonly vehicleTypeRepository: VehicleTypeRepository,
    ) {}

    async list(query: AdminListQueryDto) {
        const page = query.page ?? 1;
        const limit = query.limit ?? 10;
        const search = query.search?.trim();
        let vehicleTypeIds: Types.ObjectId[] | undefined;
        if (search) {
            vehicleTypeIds = await this.vehicleTypeRepository.findActiveIdsMatchingSearch(search);
        }
        return this.fareRepository.paginateWithVehicleType(page, limit, vehicleTypeIds);
    }

    async getById(id: string) {
        const doc = await this.fareRepository.findByIdWithVehicleType(id);
        if (!doc || !doc.isActive) {
            throw new NotFoundException('Fare not found');
        }
        return doc;
    }

    async getByVehicleTypeId(vehicleTypeId: string) {
        if (!Types.ObjectId.isValid(vehicleTypeId)) {
            throw new BadRequestException('Invalid vehicle type id');
        }
        const vt = await this.vehicleTypeRepository.findById(vehicleTypeId);
        if (!vt || !vt.isActive) {
            throw new NotFoundException('Vehicle type not found');
        }
        const fare = await this.fareRepository.findByVehicleTypeId(vehicleTypeId);
        if (!fare || !fare.isActive) {
            throw new NotFoundException('Fare not found for this vehicle type');
        }
        return this.fareRepository.findByIdWithVehicleType(String(fare._id));
    }

    async create(dto: CreateFareDto) {
        const vt = await this.vehicleTypeRepository.findById(dto.vehicleTypeId);
        if (!vt || !vt.isActive) {
            throw new BadRequestException('Vehicle type not found or inactive');
        }
        const existing = await this.fareRepository.findByVehicleTypeId(dto.vehicleTypeId);
        if (existing) {
            throw new ConflictException('A fare already exists for this vehicle type');
        }
        try {
            const created = await this.fareRepository.create({
                vehicleTypeId: new Types.ObjectId(dto.vehicleTypeId),
                baseFare: dto.baseFare,
                costPerKm: dto.costPerKm,
                waitingFeePerMin: dto.waitingFeePerMin,
                minimumFare: dto.minimumFare,
                isActive: true,
            } as any);
            return this.fareRepository.findByIdWithVehicleType(String(created._id));
        } catch (err: any) {
            if (err?.code === 11000) {
                throw new ConflictException('A fare already exists for this vehicle type');
            }
            throw err;
        }
    }

    async update(id: string, dto: UpdateFareDto) {
        const doc = await this.resolveFareForUpdate(id, dto.vehicleTypeId);
        if (!doc) {
            throw new NotFoundException('Fare not found');
        }
        const fareId = String(doc._id);
        const payload: Record<string, number> = {};
        if (dto.baseFare !== undefined) payload.baseFare = dto.baseFare;
        if (dto.costPerKm !== undefined) payload.costPerKm = dto.costPerKm;
        if (dto.waitingFeePerMin !== undefined) payload.waitingFeePerMin = dto.waitingFeePerMin;
        if (dto.minimumFare !== undefined) payload.minimumFare = dto.minimumFare;
        if (Object.keys(payload).length === 0) {
            return this.fareRepository.findByIdWithVehicleType(fareId);
        }
        const updated = await this.fareRepository.update(fareId, payload as any);
        if (!updated) {
            throw new NotFoundException('Fare not found');
        }
        return this.fareRepository.findByIdWithVehicleType(fareId);
    }

    /** Path may be fare `_id` or vehicle type id; form may also send `vehicleTypeId`. */
    private async resolveFareForUpdate(id: string, vehicleTypeId?: string) {
        const byFareId = await this.fareRepository.findById(id);
        if (byFareId) {
            return byFareId;
        }
        const byPathVehicleType = await this.fareRepository.findByVehicleTypeId(id);
        if (byPathVehicleType) {
            return byPathVehicleType;
        }
        if (vehicleTypeId) {
            return this.fareRepository.findByVehicleTypeId(vehicleTypeId);
        }
        return null;
    }

    async remove(id: string) {
        const doc = await this.fareRepository.findById(id);
        if (!doc) {
            throw new NotFoundException('Fare not found');
        }
        const updated = await this.fareRepository.update(id, { isActive: false } as any);
        if (!updated) {
            throw new NotFoundException('Fare not found');
        }
        return { message: 'Fare deactivated' };
    }
}
