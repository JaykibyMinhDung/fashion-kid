import type { EmailOutboxStatus } from '../../../generated/prisma/client';
import type { PrismaTransactionClient } from '../../../database/prisma/prisma.types';
import type { OutboxCommand } from '../domain/mail.types';

export interface OutboxRecord {
  id: string;
  dedupeKey: string;
  toEmail: string;
  template: string;
  payload: Record<string, unknown>;
  status: EmailOutboxStatus;
  attempts: number;
  maxAttempts: number;
  nextAttemptAt: Date;
  lastError: string | null;
  sentAt: Date | null;
  createdAt: Date;
}

export abstract class OutboxRepository {
  abstract enqueue(
    tx: PrismaTransactionClient,
    command: OutboxCommand,
  ): Promise<void>;

  abstract claimPending(batchSize: number): Promise<OutboxRecord[]>;

  abstract markSent(id: string, sentAt: Date): Promise<void>;

  abstract markFailed(
    id: string,
    error: string,
    nextAttemptAt: Date,
  ): Promise<void>;

  abstract markPermanentlyFailed(id: string, error: string): Promise<void>;

  abstract findMany(options: {
    status?: EmailOutboxStatus;
    page: number;
    limit: number;
  }): Promise<{ data: OutboxRecord[]; total: number }>;
}
