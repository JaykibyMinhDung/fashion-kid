import { Injectable, Logger } from '@nestjs/common';
import { Prisma, EmailOutboxStatus } from '../../../generated/prisma/client';
import { PrismaService } from '../../../database/prisma/prisma.service';
import type { PrismaTransactionClient } from '../../../database/prisma/prisma.types';
import type { OutboxCommand } from '../domain/mail.types';
import { OutboxRepository, type OutboxRecord } from './outbox.repository';

@Injectable()
export class PrismaOutboxRepository extends OutboxRepository {
  private readonly logger = new Logger(PrismaOutboxRepository.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async enqueue(
    tx: PrismaTransactionClient,
    command: OutboxCommand,
  ): Promise<void> {
    try {
      await tx.emailOutbox.create({
        data: {
          dedupeKey: command.dedupeKey,
          toEmail: command.toEmail,
          template: command.template,
          payload: command.payload as Prisma.InputJsonValue,
          status: EmailOutboxStatus.PENDING,
          nextAttemptAt: new Date(),
        },
      });
    } catch (error) {
      // Idempotent: ignore unique constraint violation (P2002)
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        this.logger.debug(`Outbox dedupe hit: ${command.dedupeKey}`);
        return;
      }
      throw error;
    }
  }

  async claimPending(batchSize: number): Promise<OutboxRecord[]> {
    const rows = await this.prisma.$queryRaw<OutboxRecord[]>`
      UPDATE email_outbox SET attempts = attempts + 1
      WHERE id IN (
        SELECT id FROM email_outbox
        WHERE status = 'PENDING' AND next_attempt_at <= now()
        ORDER BY created_at
        FOR UPDATE SKIP LOCKED
        LIMIT ${batchSize}
      )
      RETURNING
        id,
        dedupe_key AS "dedupeKey",
        to_email AS "toEmail",
        template,
        payload,
        status,
        attempts,
        max_attempts AS "maxAttempts",
        next_attempt_at AS "nextAttemptAt",
        last_error AS "lastError",
        sent_at AS "sentAt",
        created_at AS "createdAt"
    `;
    return rows;
  }

  async markSent(id: string, sentAt: Date): Promise<void> {
    await this.prisma.emailOutbox.update({
      where: { id },
      data: {
        status: EmailOutboxStatus.SENT,
        sentAt,
      },
    });
  }

  async markFailed(
    id: string,
    error: string,
    nextAttemptAt: Date,
  ): Promise<void> {
    await this.prisma.emailOutbox.update({
      where: { id },
      data: {
        lastError: error.slice(0, 500),
        nextAttemptAt,
      },
    });
  }

  async markPermanentlyFailed(id: string, error: string): Promise<void> {
    await this.prisma.emailOutbox.update({
      where: { id },
      data: {
        status: EmailOutboxStatus.FAILED,
        lastError: error.slice(0, 500),
      },
    });
  }

  async findMany(options: {
    status?: EmailOutboxStatus;
    page: number;
    limit: number;
  }): Promise<{ data: OutboxRecord[]; total: number }> {
    const where: Prisma.EmailOutboxWhereInput = options.status
      ? { status: options.status }
      : {};

    const [data, total] = await Promise.all([
      this.prisma.emailOutbox.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (options.page - 1) * options.limit,
        take: options.limit,
      }),
      this.prisma.emailOutbox.count({ where }),
    ]);

    return {
      data: data.map((row) => ({
        id: row.id,
        dedupeKey: row.dedupeKey,
        toEmail: row.toEmail,
        template: row.template,
        payload: row.payload as Record<string, unknown>,
        status: row.status,
        attempts: row.attempts,
        maxAttempts: row.maxAttempts,
        nextAttemptAt: row.nextAttemptAt,
        lastError: row.lastError,
        sentAt: row.sentAt,
        createdAt: row.createdAt,
      })),
      total,
    };
  }
}
