import { ArgumentsHost, BadRequestException, HttpStatus } from '@nestjs/common';
import type { Request, Response } from 'express';
import { ApiException } from './api-error';
import { ApiExceptionFilter } from './api-exception.filter';

function createHost() {
  const json = jest.fn();
  const status = jest.fn(() => ({ json })) as unknown as Response['status'];
  const response = { status } as unknown as Response;
  const request = { requestId: 'test-request-id' } as Request & {
    requestId: string;
  };
  const host = {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response,
    }),
  } as ArgumentsHost;

  return { host, json, status };
}

describe('ApiExceptionFilter', () => {
  const filter = new ApiExceptionFilter();

  it('preserves explicit domain status, code and public message', () => {
    const { host, json, status } = createHost();

    filter.catch(
      new ApiException(
        HttpStatus.CONFLICT,
        'REGISTRATION_FAILED',
        'Không thể tạo tài khoản',
      ),
      host,
    );

    expect(status).toHaveBeenCalledWith(409);
    expect(json).toHaveBeenCalledWith({
      statusCode: 409,
      code: 'REGISTRATION_FAILED',
      message: 'Không thể tạo tài khoản',
      requestId: 'test-request-id',
    });
  });

  it('maps framework validation errors without returning field values', () => {
    const { host, json, status } = createHost();

    filter.catch(
      new BadRequestException(['password must be longer than 15 characters']),
      host,
    );

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      message: 'Dữ liệu gửi lên không hợp lệ',
      requestId: 'test-request-id',
    });
  });

  it('maps unknown errors to a generic response without stack or message', () => {
    const { host, json, status } = createHost();
    const error = new Error('postgresql://secret-user:secret-password@host/db');

    filter.catch(error, host);

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({
      statusCode: 500,
      code: 'INTERNAL_ERROR',
      message: 'Đã xảy ra lỗi nội bộ',
      requestId: 'test-request-id',
    });
    expect(JSON.stringify(json.mock.calls)).not.toContain(error.message);
    expect(JSON.stringify(json.mock.calls)).not.toContain(error.stack);
  });
});
