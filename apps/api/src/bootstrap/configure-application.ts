import {
  HttpStatus,
  INestApplication,
  RequestMethod,
  ValidationPipe,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { ValidationError } from 'class-validator';
import cookieParserPackage from 'cookie-parser';
import type { RequestHandler } from 'express';
import { json, urlencoded } from 'express';
import { ApiException, type ApiErrorDetail } from '../common/errors/api-error';
import { ApiExceptionFilter } from '../common/errors/api-exception.filter';
import { requestIdMiddleware } from '../common/http/request-id';

const createCookieParser =
  cookieParserPackage as unknown as () => RequestHandler;

function buildValidationDetails(errors: ValidationError[]): ApiErrorDetail[] {
  const details: ApiErrorDetail[] = [];
  const visit = (error: ValidationError, parentPath: string): void => {
    const path = parentPath
      ? `${parentPath}.${error.property}`
      : error.property;
    if (error.constraints) {
      for (const message of Object.values(error.constraints)) {
        details.push({ field: path, message });
      }
    }
    for (const child of error.children ?? []) {
      visit(child, path);
    }
  };
  for (const error of errors) {
    visit(error, '');
  }
  return details;
}

function securityHeaders(isProduction: boolean): RequestHandler {
  return (_request, response, next) => {
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('X-Frame-Options', 'DENY');
    response.setHeader('Referrer-Policy', 'no-referrer');
    response.setHeader(
      'Permissions-Policy',
      'camera=(), microphone=(), geolocation=()',
    );
    response.setHeader('Cross-Origin-Resource-Policy', 'same-site');
    if (isProduction) {
      response.setHeader(
        'Strict-Transport-Security',
        'max-age=31536000; includeSubDomains',
      );
    }
    next();
  };
}

export function configureApplication(app: INestApplication): void {
  const configService = app.get(ConfigService);
  const webOrigin = configService.getOrThrow<string>('WEB_ORIGIN');
  const isProduction = configService.get<string>('NODE_ENV') === 'production';

  app.setGlobalPrefix('api/v1', {
    exclude: [
      { path: '/', method: RequestMethod.GET },
      { path: 'health/live', method: RequestMethod.GET },
      { path: 'health/ready', method: RequestMethod.GET },
    ],
  });
  app.use(requestIdMiddleware);
  app.use(securityHeaders(isProduction));
  app.use(createCookieParser());
  // SEC-WEB-07 (Day 21): giới hạn kích thước body tường minh (chống oversized-body/DoS).
  const bodyLimit = '256kb';
  app.use(json({ limit: bodyLimit }));
  app.use(urlencoded({ extended: true, limit: bodyLimit }));
  const corsOptions: CorsOptions = {
    origin: (origin, callback) => {
      callback(null, !origin || origin === webOrigin);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
  };
  app.enableCors(corsOptions);
  app.useGlobalPipes(
    new ValidationPipe({
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
      whitelist: true,
      exceptionFactory: (errors: ValidationError[]) =>
        new ApiException(
          HttpStatus.BAD_REQUEST,
          'VALIDATION_ERROR',
          'Dữ liệu gửi lên không hợp lệ',
          buildValidationDetails(errors),
        ),
    }),
  );
  app.useGlobalFilters(new ApiExceptionFilter());

  if (!isProduction) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Kids Fashion API')
      .setDescription('API cho hệ thống Kids Fashion E-commerce')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    SwaggerModule.setup('api/docs', app, () =>
      SwaggerModule.createDocument(app, swaggerConfig),
    );
  }
}
