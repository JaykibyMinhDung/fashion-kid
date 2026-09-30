import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AccessTokenService } from '../../common/security/access-token.service';
import { PasswordHasher } from '../../common/security/password-hasher';
import { PasswordPolicy } from '../../common/security/password-policy';
import { RefreshTokenService } from '../../common/security/refresh-token.service';
import { SessionCookieService } from '../../common/security/session-cookie.service';
import { AccessAuthGuard } from '../../common/auth/access-auth.guard';
import { AuthOriginGuard } from '../../common/auth/auth-origin.guard';
import { PermissionsGuard } from '../../authorization/permissions.guard';
import { NotificationModule } from '../notification/notification.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthRepository } from './repositories/auth.repository';
import { PrismaAuthRepository } from './repositories/prisma-auth.repository';
import { PasswordResetService } from './services/password-reset.service';
import { EmailVerificationService } from './services/email-verification.service';

@Module({
  imports: [JwtModule.register({}), NotificationModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    PasswordResetService,
    EmailVerificationService,
    AccessTokenService,
    PasswordHasher,
    PasswordPolicy,
    RefreshTokenService,
    SessionCookieService,
    AccessAuthGuard,
    AuthOriginGuard,
    PermissionsGuard,
    { provide: AuthRepository, useClass: PrismaAuthRepository },
  ],
  exports: [
    AuthService,
    PasswordResetService,
    EmailVerificationService,
    AccessTokenService,
    AuthRepository,
    AccessAuthGuard,
    AuthOriginGuard,
    PermissionsGuard,
    RefreshTokenService,
    SessionCookieService,
  ],
})
export class AuthModule {}
