import { NotFoundException } from '@nestjs/common';
import { MailTemplateService } from './mail-template.service';

describe('MailTemplateService', () => {
  let service: MailTemplateService;

  beforeEach(() => {
    service = new MailTemplateService();
  });

  it('should render invoice-issued template', async () => {
    const result = await service.render('invoice-issued', {
      customerName: 'Nguyễn Văn A',
      orderNumber: 'ORD-20260916-0001',
      invoiceNumber: 'HD-202609-0001',
      issuedAt: '16/09/2026',
      items: [
        {
          productName: 'Áo thun bé trai',
          colorName: 'Xanh',
          sizeName: 'Size 4',
          quantity: 2,
          unitPriceFormatted: '150.000',
          lineTotalFormatted: '300.000',
        },
      ],
      itemsSubtotalFormatted: '300.000',
      shippingFeeFormatted: '30.000',
      taxAmountFormatted: '24.444',
      totalAmountFormatted: '330.000',
      invoiceUrl: 'http://localhost:3000/account/orders/123/invoice',
    });

    expect(result.subject).toContain('ORD-20260916-0001');
    expect(result.html).toContain('HD-202609-0001');
    expect(result.html).toContain('Áo thun bé trai');
    expect(result.html).toContain('330.000 đ');
    expect(result.text).toContain('ORD-20260916-0001');
  });

  it('should render password-reset template', async () => {
    const result = await service.render('password-reset', {
      customerName: 'Trần Thị B',
      otp: '654321',
      resetUrl: 'http://localhost:3000/auth/reset-password?token=secret123',
    });

    expect(result.subject).toContain('đặt lại mật khẩu');
    expect(result.html).toContain('654321');
    expect(result.html).toContain(
      'http://localhost:3000/auth/reset-password?token=secret123',
    );
    expect(result.text).toContain('654321');
  });

  it('should render email-verification template', async () => {
    const result = await service.render('email-verification', {
      customerName: 'Lê Văn C',
      verificationUrl: 'http://localhost:3000/auth/verify-email?token=verif123',
    });

    expect(result.subject).toContain('Xác nhận địa chỉ email');
    expect(result.html).toContain(
      'http://localhost:3000/auth/verify-email?token=verif123',
    );
    expect(result.text).toContain('Lê Văn C');
  });

  it('should render order status transition templates', async () => {
    const confirmed = await service.render('order-confirmed', {
      customerName: 'Khách hàng',
      orderNumber: 'ORD-001',
      orderUrl: 'http://localhost:3000/account/orders/1',
    });
    expect(confirmed.subject).toContain('ORD-001');

    const shipping = await service.render('order-shipping', {
      customerName: 'Khách hàng',
      orderNumber: 'ORD-001',
      shippingProvider: 'Giao Hàng Nhanh',
      trackingCode: 'GHN123456',
      orderUrl: 'http://localhost:3000/account/orders/1',
    });
    expect(shipping.html).toContain('GHN123456');

    const cancelled = await service.render('order-cancelled', {
      customerName: 'Khách hàng',
      orderNumber: 'ORD-001',
      reason: 'Khách đổi ý',
    });
    expect(cancelled.html).toContain('Khách đổi ý');
  });

  it('should throw NotFoundException for unknown template', async () => {
    await expect(service.render('unknown-template', {})).rejects.toThrow(
      NotFoundException,
    );
  });
  it('should render contact-message for the shop inbox with escaped user input', async () => {
    const result = await service.render('contact-message', {
      ticketId: 'LH-260925-K3QX7A',
      fullName: 'Chị Trang\r\nBcc: attacker@evil.test',
      phone: '0988123456',
      email: null,
      topic: 'doi-tra-hang',
      topicLabel: 'Đổi trả hàng',
      message: '<script>alert(1)</script>\nDòng 2',
      receivedAt: '09:30:00 25/9/2026',
    });

    expect(result.subject).toContain('LH-260925-K3QX7A');
    expect(result.subject).not.toMatch(/[\r\n]/);
    expect(result.html).toContain('Khách không để lại email');
    expect(result.html).toContain('&lt;script&gt;');
    expect(result.html).not.toContain('<script>');
    expect(result.text).toContain('0988123456');
  });

  it('should render contact-received confirmation for the customer', async () => {
    const result = await service.render('contact-received', {
      ticketId: 'LH-260925-K3QX7A',
      fullName: 'Nguyễn Thu Trang',
      topicLabel: 'Tư vấn chọn size',
      message: 'Bé 3 tuổi mặc size nào?',
    });

    expect(result.subject).toContain('LH-260925-K3QX7A');
    expect(result.html).toContain('Nguyễn Thu Trang');
    expect(result.html).toContain('Bé 3 tuổi mặc size nào?');
    expect(result.html).toContain('1900 6868');
    expect(result.text).toContain('24 giờ');
  });
});
