import type { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';

export const REQUEST_ID_HEADER = 'x-request-id';

export type RequestWithId = Request & { requestId?: string };

function isValidRequestId(value: string): boolean {
  return /^[A-Za-z0-9._:-]{1,100}$/.test(value);
}

export function getRequestId(request: Request): string | undefined {
  return (request as RequestWithId).requestId;
}

export function requestIdMiddleware(
  request: RequestWithId,
  response: Response,
  next: NextFunction,
): void {
  const incoming = request.header(REQUEST_ID_HEADER);
  const requestId =
    incoming && isValidRequestId(incoming) ? incoming : randomUUID();
  request.requestId = requestId;
  response.setHeader(REQUEST_ID_HEADER, requestId);
  next();
}
