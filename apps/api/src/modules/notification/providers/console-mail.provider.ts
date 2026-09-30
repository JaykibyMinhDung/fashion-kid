import { Injectable, Logger } from '@nestjs/common';
import type {
  MailMessage,
  MailProvider,
  MailSendResult,
} from '../domain/mail-provider.interface';

@Injectable()
export class ConsoleMailProvider implements MailProvider {
  private readonly logger = new Logger(ConsoleMailProvider.name);

  send(message: MailMessage): Promise<MailSendResult> {
    const messageId = `console-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    this.logger.log(
      `[ConsoleMailProvider] to=${message.to} subject="${message.subject}" messageId=${messageId}`,
    );
    return Promise.resolve({
      messageId,
      accepted: [message.to],
    });
  }
}
