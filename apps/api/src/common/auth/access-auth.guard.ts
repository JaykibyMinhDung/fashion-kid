import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { invalidSessionError } from '../../modules/auth/auth.errors';
import { AuthRepository } from '../../modules/auth/repositories/auth.repository';
import { AccessTokenService } from '../security/access-token.service';
import type { AuthenticatedRequestUser } from './authenticated-user';
import { IS_PUBLIC_KEY } from './public.decorator';

type RequestWithUser = Request & { user?: AuthenticatedRequestUser };

function extractBearerToken(request: Request): string | null {
  const authorization = request.header('authorization');
  if (!authorization || authorization.length > 4_096) {
    return null;
  }
  const match = /^Bearer ([^\s]+)$/i.exec(authorization);
  return match?.[1] ?? null;
}

@Injectable()
export class AccessAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly accessTokenService: AccessTokenService,
    private readonly repository: AuthRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic === true) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const token = extractBearerToken(request);
    if (!token) {
      throw invalidSessionError();
    }

    const claims = await this.accessTokenService.verify(token);
    if (!claims) {
      throw invalidSessionError();
    }

    const user = await this.repository.findUserById(claims.sub);
    if (!user || user.status !== 'ACTIVE' || user.authVersion !== claims.ver) {
      throw invalidSessionError();
    }

    request.user = { id: user.id, role: user.role };
    return true;
  }
}
