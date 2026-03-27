import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ObjectIdUtils } from '../utils/object-id.utils';

export interface Response<T> {
    success: boolean;
    data: T;
    message?: string;
    timestamp: string;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, Response<T>> {
    intercept(context: ExecutionContext, next: CallHandler): Observable<Response<T>> {
        const now = new Date();

        return next.handle().pipe(
            map(data => {
                // Convert ObjectIds to strings in the response data
                const processedData = ObjectIdUtils.convertObjectIdsToStrings(data);

                return {
                    success: true,
                    data: processedData,
                    message: processedData?.message || undefined,
                    timestamp: now.toISOString(),
                };
            }),
        );
    }
}