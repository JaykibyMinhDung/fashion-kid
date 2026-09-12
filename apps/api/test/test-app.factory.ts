import { INestApplication, Type } from '@nestjs/common';
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
  const app = testingModule.createNestApplication();
  configureApplication(app);
  await app.init();
  return app;
}
