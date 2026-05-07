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
                let processedData = ObjectIdUtils.convertObjectIdsToStrings(data);

                // Controllers/services often return `{ success: true, data: T }`. The interceptor also
                // wraps in `{ success, data }`, which produced double nesting. Unwrap one level when it
                // matches that envelope (success === true and `data` present).
                if (
                    processedData &&
                    typeof processedData === 'object' &&
                    !Array.isArray(processedData) &&
                    (processedData as { success?: boolean }).success === true &&
                    Object.prototype.hasOwnProperty.call(processedData, 'data')
                ) {
                    processedData = (processedData as { data: unknown }).data as typeof processedData;
                }

                // Avoid duplicating `message`: handlers often return `{ message: '…' }`; that already
                // appears under `data`, so the envelope should not repeat it.
                const msg =
                    processedData &&
                    typeof processedData === 'object' &&
                    !Array.isArray(processedData) &&
                    typeof (processedData as { message?: unknown }).message === 'string'
                        ? undefined
                        : (processedData as { message?: string } | null | undefined)?.message;

                return {
                    success: true,
                    data: processedData,
                    message: msg || undefined,
                    timestamp: now.toISOString(),
                };
            }),
        );
    }
}