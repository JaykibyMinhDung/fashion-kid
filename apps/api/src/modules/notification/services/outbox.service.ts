import { Injectable, Logger } from '@nestjs/common';
import type { PrismaTransactionClient } from '../../../database/prisma/prisma.types';
import type { OutboxCommand } from '../domain/mail.types';
import {
  OutboxRepository,
  type OutboxRecord,
} from '../repositories/outbox.repository';

@Injectable()
export class OutboxService {
  private readonly logger = new Logger(OutboxService.name);

  constructor(private readonly outboxRepository: OutboxRepository) {}

  async enqueue(
    tx: PrismaTransactionClient,
    command: OutboxCommand,
  ): Promise<void> {
    await this.outboxRepository.enqueue(tx, command);
    this.logger.debug(
      `Outbox enqueued: ${command.dedupeKey} -> ${command.toEmail}`,
    );
  }

  async claimPending(batchSize: number): Promise<OutboxRecord[]> {
    return this.outboxRepository.claimPending(batchSize);
  }

  async markSent(id: string): Promise<void> {
    await this.outboxRepository.markSent(id, new Date());
  }

  async markFailed(
    id: string,
    error: string,
    attempts: number,
    maxAttempts: number,
  ): Promise<void> {
    if (attempts >= maxAttempts) {
      this.logger.warn(
        `Outbox permanently failed id=${id} after ${attempts} attempts: ${error}`,
      );
      await this.outboxRepository.markPermanentlyFailed(id, error);
      return;
    }

    // Exponential backoff: min(2^attempts * 30s, 30 minutes)
    const backoffMs = Math.min(Math.pow(2, attempts) * 30_000, 30 * 60_000);
    const nextAttemptAt = new Date(Date.now() + backoffMs);
    this.logger.debug(
      `Outbox retry id=${id} attempt=${attempts} nextAt=${nextAttemptAt.toISOString()}`,
    );
    await this.outboxRepository.markFailed(id, error, nextAttemptAt);
  }
}
