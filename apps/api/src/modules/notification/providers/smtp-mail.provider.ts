import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, type Transporter } from 'nodemailer';
import type {
  MailMessage,
  MailProvider,
  MailSendResult,
} from '../domain/mail-provider.interface';

@Injectable()
export class SmtpMailProvider implements MailProvider {
  private readonly logger = new Logger(SmtpMailProvider.name);
  private readonly transporter: Transporter;
  private readonly from: string;

  constructor(private readonly configService: ConfigService) {
    this.from = this.configService.getOrThrow<string>('MAIL_FROM');
    this.transporter = createTransport({
      host: this.configService.getOrThrow<string>('MAIL_HOST'),
      port: this.configService.getOrThrow<number>('MAIL_PORT'),
      secure: this.configService.get<boolean>('MAIL_SECURE', false),
      ...(this.configService.get('MAIL_USER')
        ? {
            auth: {
              user: this.configService.getOrThrow<string>('MAIL_USER'),
              pass: this.configService.getOrThrow<string>('MAIL_PASSWORD'),
            },
          }
        : {}),
    });
  }

  async send(message: MailMessage): Promise<MailSendResult> {
    const info = await this.transporter.sendMail({
      from: this.from,
      to: message.to,
      subject: message.subject,
      html: message.html,
      text: message.text,
    });
    this.logger.log(`Email sent to=${message.to} messageId=${info.messageId}`);
    return {
      messageId: info.messageId,
      accepted: info.accepted ?? [],
    };
  }
}
