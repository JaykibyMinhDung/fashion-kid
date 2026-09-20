export type MailTemplate =
  | 'invoice-issued'
  | 'password-reset'
  | 'email-verification'
  | 'order-confirmed'
  | 'order-packing'
  | 'order-shipping'
  | 'order-delivered'
  | 'order-cancelled';

export interface OutboxCommand {
  dedupeKey: string;
  toEmail: string;
  template: MailTemplate;
  payload: Record<string, unknown>;
}
