import { INestApplication, Type } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { configureApplication } from '../src/bootstrap/configure-application';

export async function createTestApplication(
  controllers: Type<unknown>[] = [],
): Promise<INestApplication> {
  const testingModule = await Test.createTestingModule({
    imports: [AppModule],
    controllers,
  }).compile();
  // Giống main.ts: tắt parser mặc định, configureApplication tự đăng ký parser có giới hạn.
  const app = testingModule.createNestApplication<NestExpressApplication>({
    bodyParser: false,
  });
  configureApplication(app);
  await app.init();
  return app;
}
