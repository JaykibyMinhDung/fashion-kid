export type InvoiceStatus = 'ISSUED' | 'VOID';

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  ISSUED: 'Đã phát hành',
  VOID: 'Đã huỷ',
};

export const INVOICE_STATUS_CLASSES: Record<InvoiceStatus, string> = {
  ISSUED: 'bg-emerald-100 text-emerald-900 border-emerald-200',
  VOID: 'bg-rose-100 text-rose-900 border-rose-200',
};

export interface InvoiceSeller {
  name: string;
  taxCode: string;
  address: string;
  hotline: string;
  email: string;
}

export interface InvoiceBuyer {
  receiverName: string;
  phone: string;
  addressLine: string;
  wardName: string;
  provinceName: string;
}

export interface InvoiceItem {
  id: string;
  variantId: string;
  productName: string;
  sku: string;
  colorName: string;
  sizeName: string;
  unitPrice: string;
  quantity: number;
  lineTotal: string;
}

export interface InvoiceDetail {
  id: string;
  orderId: string;
  orderNumber: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  issuedAt: string;
  voidedAt?: string | null;
  currency: string;
  netAmount: string;
  taxRateBps: number;
  taxRatePercent: number;
  taxAmount: string;
  grossAmount: string;
  itemsSubtotal: string;
  discountAmount: string;
  shippingFee: string;
  seller: InvoiceSeller;
  buyer: InvoiceBuyer;
  items: InvoiceItem[];
}

export interface InvoiceListItem {
  id: string;
  invoiceNumber: string;
  orderId: string;
  orderNumber: string;
  status: InvoiceStatus;
  issuedAt: string;
  voidedAt?: string | null;
  currency: string;
  netAmount: string;
  taxRateBps: number;
  taxAmount: string;
  grossAmount: string;
  receiverName: string;
  receiverPhone: string;
}

export interface InvoicePaginatedResponse {
  items: InvoiceListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AdminInvoiceQueryParams {
  page?: number;
  limit?: number;
  status?: InvoiceStatus;
  orderNumber?: string;
  from?: string;
  to?: string;
}
