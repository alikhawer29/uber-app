import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, from } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import multer from 'multer';

const multipartNone = multer().none();

/**
 * Parses `multipart/form-data` text fields into `req.body` (multer.none()).
 * Skips when Content-Type is not multipart so JSON and urlencoded bodies keep working.
 */
@Injectable()
export class MultipartFormFieldsInterceptor implements NestInterceptor {
    intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
        const req = context.switchToHttp().getRequest();
        const res = context.switchToHttp().getResponse();
        const ct = (req.headers['content-type'] as string | undefined) ?? '';

        if (!ct.toLowerCase().includes('multipart/form-data')) {
            return next.handle();
        }

        return from(
            new Promise<void>((resolve, reject) => {
                multipartNone(req, res, (err: unknown) => {
                    if (err) reject(err);
                    else resolve();
                });
            }),
        ).pipe(switchMap(() => next.handle()));
    }
}
