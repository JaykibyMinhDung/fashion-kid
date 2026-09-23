import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { InvoiceDetail } from '../contracts';
import { InvoiceView } from './invoice-view';

const MOCK_INVOICE: InvoiceDetail = {
  id: 'inv-1',
  orderId: 'order-1',
  orderNumber: 'ORD-20260916-000001',
  invoiceNumber: 'INV-202609-000001',
  status: 'ISSUED',
  issuedAt: '2026-09-16T10:00:00Z',
  voidedAt: null,
  currency: 'VND',
  netAmount: '1000000',
  taxRateBps: 800,
  taxRatePercent: 8,
  taxAmount: '80000',
  grossAmount: '1080000',
  itemsSubtotal: '1080000',
  discountAmount: '0',
  shippingFee: '0',
  seller: {
    name: 'Cửa hàng Thời trang Trẻ em Jaykiby',
    taxCode: '0101234567',
    address: '123 Đường Cầu Giấy, P. Dịch Vọng, Q. Cầu Giấy, Hà Nội',
    hotline: '1900 6868',
    email: 'support@jaykiby.vn',
  },
  buyer: {
    receiverName: 'Nguyễn Văn Test',
    phone: '0901234567',
    addressLine: '456 Phố Huế',
    wardName: 'Phường Hàng Bài',
    provinceName: 'Hà Nội',
  },
  items: [
    {
      id: 'item-1',
      variantId: 'var-1',
      productName: 'Áo Thun Trẻ Em Cotton Premium',
      sku: 'AT-KID-COTTON-01',
      colorName: 'Xanh dương',
      sizeName: 'Size 4',
      unitPrice: '1080000',
      quantity: 1,
      lineTotal: '1080000',
    },
  ],
};

describe('InvoiceView Component', () => {
  it('renders seller and buyer details correctly', () => {
    render(
      <InvoiceView
        invoice={MOCK_INVOICE}
        backHref="/account/orders/order-1"
      />,
    );

    expect(
      screen.getAllByText('Cửa hàng Thời trang Trẻ em Jaykiby').length,
    ).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('0101234567')).toBeInTheDocument();
    expect(screen.getByText('Nguyễn Văn Test')).toBeInTheDocument();
    expect(screen.getByText('0901234567')).toBeInTheDocument();
  });

  it('renders invoice numbers, tax breakdown and status badge', () => {
    render(
      <InvoiceView
        invoice={MOCK_INVOICE}
        backHref="/account/orders/order-1"
      />,
    );

    expect(screen.getByText('INV-202609-000001')).toBeInTheDocument();
    expect(screen.getByText('ORD-20260916-000001')).toBeInTheDocument();
    expect(screen.getByText('Đã phát hành')).toBeInTheDocument();

    // Check item rendering
    expect(
      screen.getByText('Áo Thun Trẻ Em Cotton Premium'),
    ).toBeInTheDocument();
    expect(screen.getByText('SKU: AT-KID-COTTON-01')).toBeInTheDocument();

    // Check tax separation invariant text
    expect(
      screen.getByText('Bóc tách Thuế GTGT (8%):'),
    ).toBeInTheDocument();
  });

  it('renders VOID status correctly when invoice is voided', () => {
    const voidedInvoice: InvoiceDetail = {
      ...MOCK_INVOICE,
      status: 'VOID',
      voidedAt: '2026-09-16T11:00:00Z',
    };

    render(
      <InvoiceView
        invoice={voidedInvoice}
        backHref="/account/orders/order-1"
      />,
    );

    expect(screen.getByText('Đã huỷ')).toBeInTheDocument();
  });
});
