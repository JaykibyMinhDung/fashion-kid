import {
  CanActivate,
  ExecutionContext,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { AuthenticatedRequestUser } from '../common/auth/authenticated-user';
import { IS_PUBLIC_KEY } from '../common/auth/public.decorator';
import { ApiException } from '../common/errors/api-error';
import { invalidSessionError } from '../modules/auth/auth.errors';
import { getRequestId } from '../common/http/request-id';
import type { Permission } from './permission';
import { PERMISSIONS_KEY } from './require-permissions.decorator';
import { roleHasPermissions } from './role-permissions';

type RequestWithUser = Request & { user?: AuthenticatedRequestUser };

@Injectable()
export class PermissionsGuard implements CanActivate {
  private readonly logger = new Logger(PermissionsGuard.name);

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const targets = [context.getHandler(), context.getClass()];
    if (
      this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, targets) === true
    ) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    if (!request.user) {
      throw invalidSessionError();
    }

    const required = this.reflector.getAllAndOverride<Permission[]>(
      PERMISSIONS_KEY,
      targets,
    );
    if (required === undefined) {
      return true;
    }
    if (!roleHasPermissions(request.user.role, required)) {
      this.logger.warn({
        event: 'authorization_denied',
        requestId: getRequestId(request),
        userId: request.user.id,
        role: request.user.role,
        method: request.method,
        route: request.path,
        requiredPermissions: required,
      });
      throw new ApiException(
        HttpStatus.FORBIDDEN,
        'FORBIDDEN',
        'Bạn không có quyền thực hiện thao tác này',
      );
    }

    return true;
  }
}
