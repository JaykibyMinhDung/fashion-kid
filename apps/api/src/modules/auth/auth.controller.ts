import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import type { AuthenticatedRequestUser } from '../../common/auth/authenticated-user';
import { AuthOriginGuard } from '../../common/auth/auth-origin.guard';
import { Public } from '../../common/auth/public.decorator';
import { getRequestId } from '../../common/http/request-id';
import { SessionCookieService } from '../../common/security/session-cookie.service';
import { AuthService } from './auth.service';
import {
  ChangePasswordRequestDto,
  LoginRequestDto,
  RegisterRequestDto,
} from './dto/auth-request.dto';
import {
  AuthSessionResponseDto,
  PublicUserResponseDto,
} from './dto/auth-response.dto';

function requestContext(request: Request) {
  const requestId = getRequestId(request);
  const userAgent = request.header('user-agent');
  return {
    ipAddress: request.ip,
    ...(requestId ? { requestId } : {}),
    ...(userAgent ? { userAgent } : {}),
  };
}

function readCookie(request: Request, name: string): string | undefined {
  const cookies: unknown = request.cookies;
  if (!cookies || typeof cookies !== 'object') {
    return undefined;
  }
  const value = (cookies as Record<string, unknown>)[name];
  return typeof value === 'string' ? value : undefined;
}

@ApiTags('auth')
@Controller('auth')
@SkipThrottle()
@UseGuards(AuthOriginGuard)
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly cookieService: SessionCookieService,
  ) {}

  @Post('register')
  @Public()
  @SkipThrottle({ default: false })
  @Throttle({ default: { limit: 3, ttl: 3_600_000 } })
  @ApiCreatedResponse({ type: AuthSessionResponseDto })
  async register(
    @Body() body: RegisterRequestDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthSessionResponseDto> {
    const result = await this.authService.register({
      ...body,
      context: requestContext(request),
    });
    this.setRefreshCookie(response, result.refreshSession);
    return result.session;
  }

  @Post('login')
  @Public()
  @SkipThrottle({ default: false })
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: AuthSessionResponseDto })
  async login(
    @Body() body: LoginRequestDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthSessionResponseDto> {
    const result = await this.authService.login({
      ...body,
      context: requestContext(request),
    });
    this.setRefreshCookie(response, result.refreshSession);
    return result.session;
  }

  @Post('refresh')
  @Public()
  @SkipThrottle({ default: false })
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: AuthSessionResponseDto })
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthSessionResponseDto> {
    try {
      const result = await this.authService.refresh(
        readCookie(request, this.cookieService.name),
        requestContext(request),
      );
      this.setRefreshCookie(response, result.refreshSession);
      return result.session;
    } catch (error) {
      this.clearRefreshCookie(response);
      throw error;
    }
  }

  @Post('logout')
  @Public()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    try {
      await this.authService.logout(
        readCookie(request, this.cookieService.name),
        requestContext(request),
      );
    } finally {
      this.clearRefreshCookie(response);
    }
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOkResponse({ type: PublicUserResponseDto })
  me(@CurrentUser() user: AuthenticatedRequestUser) {
    return this.authService.me(user.id);
  }

  @Post('change-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiNoContentResponse()
  async changePassword(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Body() body: ChangePasswordRequestDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    await this.authService.changePassword(
      user.id,
      body.currentPassword,
      body.newPassword,
      requestContext(request),
    );
    this.clearRefreshCookie(response);
  }

  private setRefreshCookie(
    response: Response,
    refreshSession: {
      token: string;
      expiresAt: Date;
      isPersistent: boolean;
    },
  ): void {
    response.cookie(
      this.cookieService.name,
      refreshSession.token,
      this.cookieService.createOptions(
        refreshSession.isPersistent,
        refreshSession.expiresAt,
      ),
    );
  }

  private clearRefreshCookie(response: Response): void {
    response.clearCookie(
      this.cookieService.name,
      this.cookieService.createClearOptions(),
    );
  }
}
