import type { NextFunction, Request, Response } from 'express';
import {
  getRequestId,
  REQUEST_ID_HEADER,
  requestIdMiddleware,
  type RequestWithId,
} from './request-id';

function runMiddleware(incoming?: string) {
  const request = {
    header: jest.fn((name: string) =>
      name === REQUEST_ID_HEADER ? incoming : undefined,
    ),
  } as unknown as RequestWithId;
  const setHeader = jest.fn();
  const response = { setHeader } as unknown as Response;
  const next = jest.fn() as NextFunction;

  requestIdMiddleware(request, response, next);
  return { next, request, setHeader };
}

describe('requestIdMiddleware', () => {
  it('preserves a bounded safe caller request id', () => {
    const { next, request, setHeader } = runMiddleware('web:request-123');

    expect(getRequestId(request as Request)).toBe('web:request-123');
    expect(setHeader).toHaveBeenCalledWith(
      REQUEST_ID_HEADER,
      'web:request-123',
    );
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('replaces missing or unsafe input with a server id', () => {
    for (const incoming of [undefined, 'contains spaces', 'x'.repeat(101)]) {
      const { request, setHeader } = runMiddleware(incoming);
      const requestId = getRequestId(request as Request);

      expect(requestId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      );
      expect(setHeader).toHaveBeenCalledWith(REQUEST_ID_HEADER, requestId);
    }
  });
});
