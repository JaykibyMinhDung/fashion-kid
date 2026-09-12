import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export function serializeBigInts(value: unknown): unknown {
  if (typeof value === 'bigint') {
    return value.toString(10);
  }

  if (Array.isArray(value)) {
    return value.map(serializeBigInts);
  }

  if (
    value === null ||
    typeof value !== 'object' ||
    value instanceof Date ||
    Buffer.isBuffer(value)
  ) {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, child]) => [key, serializeBigInts(child)]),
  );
}

@Injectable()
export class BigIntSerializationInterceptor implements NestInterceptor {
  intercept(
    _context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    return next.handle().pipe(map(serializeBigInts));
  }
}
