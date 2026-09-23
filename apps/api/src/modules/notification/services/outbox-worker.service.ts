import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import type { MailProvider } from '../domain/mail-provider.interface';
import { MAIL_PROVIDER } from '../domain/mail-provider.interface';
import { MailTemplateService } from './mail-template.service';
import { OutboxService } from './outbox.service';

@Injectable()
export class OutboxWorkerService {
  private readonly logger = new Logger(OutboxWorkerService.name);
  private readonly batchSize: number;
  private processing = false;

  constructor(
    private readonly outboxService: OutboxService,
    private readonly templateService: MailTemplateService,
    @Inject(MAIL_PROVIDER) private readonly mailProvider: MailProvider,
    configService: ConfigService,
  ) {
    this.batchSize = configService.get<number>('MAIL_WORKER_BATCH', 20);
  }

  @Cron(CronExpression.EVERY_10_SECONDS)
  async processOutbox(): Promise<void> {
    if (this.processing) return;
    this.processing = true;

    try {
      const records = await this.outboxService.claimPending(this.batchSize);
      if (records.length === 0) return;

      this.logger.log(`Processing ${records.length} outbox record(s)`);

      for (const record of records) {
        try {
          const { subject, html, text } = await this.templateService.render(
            record.template,
            record.payload,
          );
          await this.mailProvider.send({
            to: record.toEmail,
            subject,
            html,
            text,
          });
          await this.outboxService.markSent(record.id);
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          await this.outboxService.markFailed(
            record.id,
            errorMessage,
            record.attempts,
            record.maxAttempts,
          );
        }
      }
    } catch (error) {
      this.logger.error(
        'Outbox worker batch error',
        error instanceof Error ? error.stack : error,
      );
    } finally {
      this.processing = false;
    }
  }
}
