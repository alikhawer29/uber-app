import { Model, Document, FilterQuery, UpdateQuery } from 'mongoose';

export abstract class BaseRepository<T extends Document> {
    constructor(protected readonly model: Model<T>) { }

    // Add this method to validate ObjectId
    protected isValidObjectId(id: string): boolean {
        return /^[0-9a-fA-F]{24}$/.test(id);
    }

    async findAll(): Promise<T[]> {
        const results = await this.model.find().exec();
        return results;
    }

    async findById(
        id: string,
        options?: {
            populate?: Array<string | { path: string; select?: string }>;
        }
    ): Promise<T | null> {
        if (!this.isValidObjectId(id)) {
            return null;
        }

        let query = this.model.findById(id);

        // Apply populate if provided
        if (options?.populate) {
            options.populate.forEach((pop) => {
                query = query.populate(pop as any);
            });
        }

        return query.exec();
    }

    async findOne(conditions: FilterQuery<T>): Promise<T | null> {
        return this.model.findOne(conditions).exec();
    }

    async create(data: Partial<T>): Promise<T> {
        const created = new this.model(data);
        return created.save();
    }

    async update(id: string, data: UpdateQuery<T>): Promise<T | null> {
        if (!this.isValidObjectId(id)) {
            return null;
        }
        return this.model.findByIdAndUpdate(id, data, { new: true }).exec();
    }

    async delete(id: string): Promise<boolean> {
        if (!this.isValidObjectId(id)) {
            return false;
        }
        const result = await this.model.findByIdAndDelete(id).exec();
        return result !== null;
    }

    async count(conditions: FilterQuery<T> = {}): Promise<number> {
        return this.model.countDocuments(conditions).exec();
    }

    async paginate(
        page: number = 1,
        limit: number = 10,
        conditions: FilterQuery<T> = {},
        options?: {
            sort?: any;
            select?: string;
            populate?: Array<string | { path: string; select?: string }>;
        }
    ): Promise<{
        data: T[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
    }> {
        const skip = (page - 1) * limit;

        // Extract options with defaults
        const sort = options?.sort || { createdAt: -1 };
        const select = options?.select || '';

        // Build query
        let query = this.model
            .find(conditions)
            .select(select)
            .sort(sort)
            .skip(skip)
            .limit(limit);

        // Apply populate if provided
        if (options?.populate) {
            options.populate.forEach((pop) => {
                query = query.populate(pop as any);
            });
        }

        const [data, total] = await Promise.all([
            query.exec(),
            this.model.countDocuments(conditions).exec(),
        ]);

        const totalPages = Math.ceil(total / limit);
        const hasNext = page < totalPages;
        const hasPrev = page > 1;

        return {
            data,
            total,
            page,
            limit,
            totalPages,
            hasNext,
            hasPrev,
        };
    }
}