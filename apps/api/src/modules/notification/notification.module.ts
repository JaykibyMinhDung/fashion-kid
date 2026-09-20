import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { MAIL_PROVIDER } from './domain/mail-provider.interface';
import { ConsoleMailProvider } from './providers/console-mail.provider';
import { SmtpMailProvider } from './providers/smtp-mail.provider';
import { OutboxRepository } from './repositories/outbox.repository';
import { PrismaOutboxRepository } from './repositories/prisma-outbox.repository';
import { MailTemplateService } from './services/mail-template.service';
import { OutboxService } from './services/outbox.service';
import { OutboxWorkerService } from './services/outbox-worker.service';
import { AdminOutboxController } from './controllers/admin-outbox.controller';

@Module({
  imports: [ScheduleModule.forRoot()],
  controllers: [AdminOutboxController],
  providers: [
    OutboxService,
    OutboxWorkerService,
    MailTemplateService,
    {
      provide: OutboxRepository,
      useClass: PrismaOutboxRepository,
    },
    {
      provide: MAIL_PROVIDER,
      useFactory: (configService: ConfigService) => {
        const driver = configService.get<string>('MAIL_DRIVER', 'smtp');
        if (driver === 'console') {
          return new ConsoleMailProvider();
        }
        return new SmtpMailProvider(configService);
      },
      inject: [ConfigService],
    },
  ],
  exports: [OutboxService, MailTemplateService, OutboxRepository],
})
export class NotificationModule {}
