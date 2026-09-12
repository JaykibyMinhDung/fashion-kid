import {
  CanActivate,
  ExecutionContext,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { ApiException } from '../errors/api-error';

@Injectable()
export class AuthOriginGuard implements CanActivate {
  private readonly allowedOrigin: string;

  constructor(configService: ConfigService) {
    this.allowedOrigin = configService.getOrThrow<string>('WEB_ORIGIN');
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const origin = request.header('origin');

    // Non-browser clients may omit Origin. Browsers attach it to cross-origin
    // Auth requests, including simple form POSTs which CORS alone cannot block.
    if (!origin || origin === this.allowedOrigin) {
      return true;
    }

    throw new ApiException(
      HttpStatus.FORBIDDEN,
      'FORBIDDEN',
      'Nguồn yêu cầu không được phép',
    );
  }
}
