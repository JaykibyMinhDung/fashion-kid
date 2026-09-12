import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { ApiErrorCode, ApiErrorResponse, ApiException } from './api-error';
import { getRequestId } from '../http/request-id';

type PublicHttpError = { code: ApiErrorCode; message: string };

function mapHttpError(statusCode: number): PublicHttpError {
  switch (statusCode) {
    case 400:
      return {
        code: 'VALIDATION_ERROR',
        message: 'Dữ liệu gửi lên không hợp lệ',
      };
    case 401:
      return {
        code: 'INVALID_SESSION',
        message: 'Phiên đăng nhập không hợp lệ',
      };
    case 403:
      return {
        code: 'FORBIDDEN',
        message: 'Bạn không có quyền thực hiện thao tác này',
      };
    case 404:
      return {
        code: 'NOT_FOUND',
        message: 'Không tìm thấy tài nguyên',
      };
    case 429:
      return {
        code: 'RATE_LIMITED',
        message: 'Bạn đã gửi quá nhiều yêu cầu, vui lòng thử lại sau',
      };
    default:
      return {
        code: 'HTTP_ERROR',
        message: 'Yêu cầu không thể được xử lý',
      };
  }
}

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const body = this.toResponse(exception, getRequestId(request));
    response.status(body.statusCode).json(body);
  }

  private toResponse(exception: unknown, requestId?: string): ApiErrorResponse {
    if (exception instanceof ApiException) {
      return {
        statusCode: exception.getStatus(),
        code: exception.code,
        message: exception.publicMessage,
        ...(requestId ? { requestId } : {}),
      };
    }

    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      const mapped = mapHttpError(statusCode);
      return {
        statusCode,
        ...mapped,
        ...(requestId ? { requestId } : {}),
      };
    }

    const errorName =
      exception instanceof Error ? exception.name : 'NonErrorException';
    this.logger.error(
      `Unhandled API exception type: ${errorName}; requestId=${requestId ?? 'unavailable'}`,
    );
    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      code: 'INTERNAL_ERROR',
      message: 'Đã xảy ra lỗi nội bộ',
      ...(requestId ? { requestId } : {}),
    };
  }
}
