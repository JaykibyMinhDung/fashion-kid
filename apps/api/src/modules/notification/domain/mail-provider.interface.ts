export interface MailSendResult {
  messageId: string;
  accepted: string[];
}

export interface MailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export const MAIL_PROVIDER = Symbol('MAIL_PROVIDER');

export interface MailProvider {
  send(message: MailMessage): Promise<MailSendResult>;
}
