import { Injectable, NotFoundException } from '@nestjs/common';
import Handlebars from 'handlebars';

export interface RenderedMail {
  subject: string;
  html: string;
  text: string;
}

interface TemplateDefinition {
  subject: (payload: Record<string, unknown>) => string;
  html: HandlebarsTemplateDelegate;
  text: HandlebarsTemplateDelegate;
}

const LAYOUT_HTML = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333333; margin: 0; padding: 0; background-color: #f4f6f8; }
    .container { max-width: 600px; margin: 20px auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
    .header { background: #4f46e5; padding: 24px; text-align: center; color: #ffffff; }
    .header h1 { margin: 0; font-size: 22px; font-weight: 700; letter-spacing: 0.5px; }
    .content { padding: 32px 24px; }
    .footer { background: #f9fafb; padding: 20px 24px; text-align: center; font-size: 13px; color: #6b7280; border-top: 1px solid #e5e7eb; }
    .btn { display: inline-block; background-color: #4f46e5; color: #ffffff !important; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
    .otp-box { background: #f3f4f6; border: 2px dashed #4f46e5; border-radius: 8px; padding: 16px; text-align: center; font-size: 32px; font-weight: 700; letter-spacing: 6px; color: #4f46e5; margin: 20px 0; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th { background: #f9fafb; text-align: left; padding: 10px; font-size: 13px; border-bottom: 2px solid #e5e7eb; }
    td { padding: 10px; font-size: 14px; border-bottom: 1px solid #e5e7eb; }
    .text-right { text-align: right; }
    .total-row { font-weight: 700; font-size: 15px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>MẦM NHỎ — THỜI TRANG TRẺ EM</h1>
    </div>
    <div class="content">
      {{{body}}}
    </div>
    <div class="footer">
      <p>Cửa hàng Thời trang Trẻ em Mầm Nhỏ | Hotline: 1900 xxxx</p>
      <p>Email này được gửi tự động, vui lòng không trả lời trực tiếp.</p>
    </div>
  </div>
</body>
</html>`;

const INVOICE_ISSUED_BODY = `
<h2>Hoá đơn bán hàng / Biên nhận</h2>
<p>Xin chào <strong>{{customerName}}</strong>,</p>
<p>Cảm ơn bạn đã đặt hàng tại Mầm Nhỏ! Đơn hàng <strong>#{{orderNumber}}</strong> của bạn đã được ghi nhận và xuất hoá đơn bán hàng điện tử số <strong>{{invoiceNumber}}</strong> vào ngày {{issuedAt}}.</p>

<table>
  <thead>
    <tr>
      <th>Sản phẩm</th>
      <th class="text-right">SL</th>
      <th class="text-right">Đơn giá</th>
      <th class="text-right">Thành tiền</th>
    </tr>
  </thead>
  <tbody>
    {{#each items}}
    <tr>
      <td>{{this.productName}} ({{this.colorName}}, {{this.sizeName}})</td>
      <td class="text-right">{{this.quantity}}</td>
      <td class="text-right">{{this.unitPriceFormatted}} đ</td>
      <td class="text-right">{{this.lineTotalFormatted}} đ</td>
    </tr>
    {{/each}}
    <tr>
      <td colspan="3">Cộng tiền hàng</td>
      <td class="text-right">{{itemsSubtotalFormatted}} đ</td>
    </tr>
    {{#if discountAmountFormatted}}
    <tr>
      <td colspan="3">Giảm giá voucher</td>
      <td class="text-right">-{{discountAmountFormatted}} đ</td>
    </tr>
    {{/if}}
    <tr>
      <td colspan="3">Phí vận chuyển</td>
      <td class="text-right">{{shippingFeeFormatted}} đ</td>
    </tr>
    <tr>
      <td colspan="3">Thuế GTGT (VAT 8%)</td>
      <td class="text-right">{{taxAmountFormatted}} đ</td>
    </tr>
    <tr class="total-row">
      <td colspan="3">Tổng thanh toán (đã gồm VAT)</td>
      <td class="text-right" style="color: #4f46e5;">{{totalAmountFormatted}} đ</td>
    </tr>
  </tbody>
</table>

<p style="text-align: center;">
  <a href="{{{invoiceUrl}}}" class="btn" target="_blank">Xem và in hoá đơn trực tuyến</a>
</p>
`;

const PASSWORD_RESET_BODY = `
<h2>Yêu cầu đặt lại mật khẩu</h2>
<p>Xin chào <strong>{{customerName}}</strong>,</p>
<p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản Mầm Nhỏ của bạn. Bạn có thể sử dụng mã OTP 6 chữ số bên dưới hoặc bấm trực tiếp vào liên kết:</p>

<div class="otp-box">{{otp}}</div>
<p style="text-align: center; color: #6b7280; font-size: 13px;">Mã OTP có hiệu lực trong 10 phút và tối đa 5 lần thử.</p>

<p style="text-align: center;">
  <a href="{{{resetUrl}}}" class="btn" target="_blank">Đặt lại mật khẩu trực tiếp</a>
</p>
<p style="color: #6b7280; font-size: 13px;">Liên kết đặt lại mật khẩu có hiệu lực trong 30 phút. Nếu bạn không gửi yêu cầu này, vui lòng bỏ qua email và tài khoản của bạn vẫn an toàn.</p>
`;

const EMAIL_VERIFICATION_BODY = `
<h2>Xác nhận địa chỉ email</h2>
<p>Xin chào <strong>{{customerName}}</strong>,</p>
<p>Cảm ơn bạn đã đăng ký tài khoản tại Cửa hàng Thời trang Trẻ em Mầm Nhỏ. Vui lòng bấm vào nút bên dưới để hoàn tất việc xác thực email của bạn:</p>

<p style="text-align: center;">
  <a href="{{{verificationUrl}}}" class="btn" target="_blank">Xác nhận email của tôi</a>
</p>
<p style="color: #6b7280; font-size: 13px;">Liên kết xác thực có hiệu lực trong 24 giờ. Sau khi xác thực, bạn có thể đăng nhập và trải nghiệm mua sắm dễ dàng.</p>
`;

const ORDER_CONFIRMED_BODY = `
<h2>Đơn hàng đã được xác nhận</h2>
<p>Xin chào <strong>{{customerName}}</strong>,</p>
<p>Đơn hàng <strong>#{{orderNumber}}</strong> của bạn đã được nhân viên bán hàng xác nhận thành công và đang chuyển sang bộ phận kho để chuẩn bị hàng.</p>
<p style="text-align: center;">
  <a href="{{{orderUrl}}}" class="btn" target="_blank">Chi tiết đơn hàng</a>
</p>
`;

const ORDER_PACKING_BODY = `
<h2>Đơn hàng đang được đóng gói</h2>
<p>Xin chào <strong>{{customerName}}</strong>,</p>
<p>Đơn hàng <strong>#{{orderNumber}}</strong> của bạn đang được nhân viên kho kiểm tra kỹ lưỡng và đóng gói cẩn thận.</p>
<p style="text-align: center;">
  <a href="{{{orderUrl}}}" class="btn" target="_blank">Xem tiến độ đơn hàng</a>
</p>
`;

const ORDER_SHIPPING_BODY = `
<h2>Đơn hàng đang được vận chuyển</h2>
<p>Xin chào <strong>{{customerName}}</strong>,</p>
<p>Đơn hàng <strong>#{{orderNumber}}</strong> đã được xuất kho và bàn giao cho đơn vị vận chuyển <strong>{{shippingProvider}}</strong>.</p>
{{#if trackingCode}}
<p>Mã vận đơn tra cứu: <strong>{{trackingCode}}</strong></p>
{{/if}}
<p style="text-align: center;">
  <a href="{{{orderUrl}}}" class="btn" target="_blank">Theo dõi lộ trình giao hàng</a>
</p>
`;

const ORDER_DELIVERED_BODY = `
<h2>Đơn hàng đã giao thành công</h2>
<p>Xin chào <strong>{{customerName}}</strong>,</p>
<p>Đơn hàng <strong>#{{orderNumber}}</strong> đã được giao thành công tới bạn. Chúc bé và gia đình có những trải nghiệm tuyệt vời cùng sản phẩm từ Mầm Nhỏ!</p>
<p style="text-align: center;">
  <a href="{{{orderUrl}}}" class="btn" target="_blank">Đánh giá sản phẩm</a>
</p>
`;

const ORDER_CANCELLED_BODY = `
<h2>Thông báo huỷ đơn hàng</h2>
<p>Xin chào <strong>{{customerName}}</strong>,</p>
<p>Đơn hàng <strong>#{{orderNumber}}</strong> đã được huỷ với lý do: <em>{{reason}}</em>.</p>
<p>Mọi khoản thanh toán hoặc dữ liệu tồn kho liên quan đã được xử lý hoàn tất. Nếu cần hỗ trợ thêm, vui lòng liên hệ hotline 1900 xxxx.</p>
`;

@Injectable()
export class MailTemplateService {
  private readonly layoutTemplate: HandlebarsTemplateDelegate;
  private readonly templates = new Map<string, TemplateDefinition>();

  constructor() {
    this.layoutTemplate = Handlebars.compile(LAYOUT_HTML);

    this.registerTemplate(
      'invoice-issued',
      (p) =>
        `[Mầm Nhỏ] Hoá đơn bán hàng cho đơn hàng #${p.orderNumber as string}`,
      INVOICE_ISSUED_BODY,
      (p) =>
        `Xin chào ${p.customerName as string}, đơn hàng #${p.orderNumber as string} đã được xuất hoá đơn #${p.invoiceNumber as string}. Tổng thanh toán: ${p.totalAmountFormatted as string} đ. Xem chi tiết tại: ${p.invoiceUrl as string}`,
    );

    this.registerTemplate(
      'password-reset',
      () => '[Mầm Nhỏ] Yêu cầu đặt lại mật khẩu tài khoản',
      PASSWORD_RESET_BODY,
      (p) =>
        `Xin chào ${p.customerName as string}, mã OTP đặt lại mật khẩu của bạn là: ${p.otp as string} (hiệu lực 10 phút). Hoặc bấm vào liên kết sau: ${p.resetUrl as string}`,
    );

    this.registerTemplate(
      'email-verification',
      () => '[Mầm Nhỏ] Xác nhận địa chỉ email tài khoản',
      EMAIL_VERIFICATION_BODY,
      (p) =>
        `Xin chào ${p.customerName as string}, vui lòng xác nhận địa chỉ email của bạn bằng cách bấm vào liên kết: ${p.verificationUrl as string} (hiệu lực 24 giờ).`,
    );

    this.registerTemplate(
      'order-confirmed',
      (p) => `[Mầm Nhỏ] Đơn hàng #${p.orderNumber as string} đã được xác nhận`,
      ORDER_CONFIRMED_BODY,
      (p) =>
        `Xin chào ${p.customerName as string}, đơn hàng #${p.orderNumber as string} đã được xác nhận thành công. Xem tại: ${p.orderUrl as string}`,
    );

    this.registerTemplate(
      'order-packing',
      (p) =>
        `[Mầm Nhỏ] Đơn hàng #${p.orderNumber as string} đang được đóng gói`,
      ORDER_PACKING_BODY,
      (p) =>
        `Xin chào ${p.customerName as string}, đơn hàng #${p.orderNumber as string} đang được đóng gói tại kho.`,
    );

    this.registerTemplate(
      'order-shipping',
      (p) => `[Mầm Nhỏ] Đơn hàng #${p.orderNumber as string} đang được giao`,
      ORDER_SHIPPING_BODY,
      (p) =>
        `Xin chào ${p.customerName as string}, đơn hàng #${p.orderNumber as string} đang trên đường giao bởi ${(p.shippingProvider as string) || 'đơn vị vận chuyển'}. Mã vận đơn: ${(p.trackingCode as string) || 'N/A'}.`,
    );

    this.registerTemplate(
      'order-delivered',
      (p) =>
        `[Mầm Nhỏ] Đơn hàng #${p.orderNumber as string} đã giao thành công`,
      ORDER_DELIVERED_BODY,
      (p) =>
        `Xin chào ${p.customerName as string}, đơn hàng #${p.orderNumber as string} đã được giao thành công.`,
    );

    this.registerTemplate(
      'order-cancelled',
      (p) => `[Mầm Nhỏ] Đơn hàng #${p.orderNumber as string} đã bị huỷ`,
      ORDER_CANCELLED_BODY,
      (p) =>
        `Xin chào ${p.customerName as string}, đơn hàng #${p.orderNumber as string} đã bị huỷ. Lý do: ${(p.reason as string) || 'Theo yêu cầu'}.`,
    );
  }

  private registerTemplate(
    name: string,
    subjectFn: (p: Record<string, unknown>) => string,
    bodyHtml: string,
    textFn: (p: Record<string, unknown>) => string,
  ): void {
    const compiledBody = Handlebars.compile(bodyHtml);
    this.templates.set(name, {
      subject: subjectFn,
      html: (payload: Record<string, unknown>) =>
        this.layoutTemplate({ body: compiledBody(payload) }),
      text: (payload: Record<string, unknown>) => textFn(payload),
    });
  }

  // eslint-disable-next-line @typescript-eslint/require-await -- giữ Promise interface, có thể async hoá sau
  async render(
    templateName: string,
    payload: Record<string, unknown>,
  ): Promise<RenderedMail> {
    const def = this.templates.get(templateName);
    if (!def) {
      throw new NotFoundException(
        `Email template '${templateName}' không tồn tại trong hệ thống`,
      );
    }

    return {
      subject: def.subject(payload),
      html: def.html(payload),
      text: def.text(payload),
    };
  }
}
