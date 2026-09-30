'use client';

import { ArrowLeft, CheckCircle2, FileText, Printer, XCircle } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { InvoiceDetail } from '../contracts';
import { INVOICE_STATUS_CLASSES, INVOICE_STATUS_LABELS } from '../contracts';

function formatVnd(value: string | number | bigint): string {
  const n = typeof value === 'bigint' ? Number(value) : Number(value);
  if (Number.isNaN(n)) return '0 ₫';
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(n);
}

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

interface InvoiceViewProps {
  invoice: InvoiceDetail;
  backHref: string;
  backLabel?: string;
}

export function InvoiceView({
  invoice,
  backHref,
  backLabel = 'Quay lại đơn hàng',
}: InvoiceViewProps) {
  const isVoid = invoice.status === 'VOID';

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Top action toolbar - hidden when printing */}
      <div className="flex flex-wrap items-center justify-between gap-4 print:hidden">
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          {backLabel}
        </Link>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            className="gap-2"
            onClick={() => window.print()}
          >
            <Printer className="h-4 w-4" />
            In biên nhận
          </Button>
        </div>
      </div>

      {/* Main Printable Document Card */}
      <Card className="border border-border bg-card p-6 sm:p-10 shadow-sm print:border-none print:p-0 print:shadow-none">
        {/* Document Header */}
        <div className="border-b border-border pb-6">
          <div className="flex flex-col sm:flex-row justify-between gap-6">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-black tracking-tight text-foreground">
                  {invoice.seller.name}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted">
                Mã số thuế: <strong className="text-foreground">{invoice.seller.taxCode}</strong>
              </p>
              <p className="text-xs text-muted">Địa chỉ: {invoice.seller.address}</p>
              <p className="text-xs text-muted">
                Hotline: {invoice.seller.hotline} · Email: {invoice.seller.email}
              </p>
            </div>

            <div className="text-left sm:text-right">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${INVOICE_STATUS_CLASSES[invoice.status]}`}
              >
                {isVoid ? (
                  <XCircle className="h-3.5 w-3.5" />
                ) : (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                )}
                {INVOICE_STATUS_LABELS[invoice.status]}
              </span>
              <p className="mt-2 text-xs text-muted">
                Số biên nhận:
              </p>
              <p className="font-mono text-base font-bold text-foreground">
                {invoice.invoiceNumber}
              </p>
              <p className="text-xs text-muted">
                Mã đơn hàng: <strong className="font-mono text-foreground">{invoice.orderNumber}</strong>
              </p>
              <p className="text-xs text-muted">
                Ngày phát hành: {formatDate(invoice.issuedAt)}
              </p>
              {isVoid && invoice.voidedAt && (
                <p className="text-xs text-rose-600 font-medium">
                  Huỷ lúc: {formatDate(invoice.voidedAt)}
                </p>
              )}
            </div>
          </div>

          <div className="mt-6 text-center">
            <h1 className="text-xl sm:text-2xl font-black uppercase tracking-wide text-foreground">
              BIÊN NHẬN BÁN HÀNG
            </h1>
            <p className="text-xs text-muted italic">
              (Giá niêm yết đã bao gồm thuế GTGT {invoice.taxRatePercent}%)
            </p>
          </div>
        </div>

        {/* Customer / Buyer Information */}
        <div className="border-b border-border py-6">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted mb-2">
            Thông tin người mua hàng
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-muted">Họ tên:</span>{' '}
              <strong className="text-foreground">{invoice.buyer.receiverName}</strong>
            </div>
            <div>
              <span className="text-muted">Số điện thoại:</span>{' '}
              <strong className="text-foreground">{invoice.buyer.phone}</strong>
            </div>
            <div className="sm:col-span-2">
              <span className="text-muted">Địa chỉ nhận hàng:</span>{' '}
              <span className="text-foreground">
                {invoice.buyer.addressLine}, {invoice.buyer.wardName},{' '}
                {invoice.buyer.provinceName}
              </span>
            </div>
          </div>
        </div>

        {/* Line Items Table */}
        <div className="py-6 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase text-muted">
                <th className="py-2.5 px-2 text-center w-12">STT</th>
                <th className="py-2.5 px-2">Tên sản phẩm</th>
                <th className="py-2.5 px-2 text-center">Quy cách</th>
                <th className="py-2.5 px-2 text-center w-16">SL</th>
                <th className="py-2.5 px-2 text-right">Đơn giá</th>
                <th className="py-2.5 px-2 text-right">Thành tiền</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {invoice.items.map((item, index) => (
                <tr key={item.id} className="text-foreground">
                  <td className="py-3 px-2 text-center text-xs text-muted">{index + 1}</td>
                  <td className="py-3 px-2">
                    <div className="font-semibold">{item.productName}</div>
                    <div className="text-xs text-muted">SKU: {item.sku}</div>
                  </td>
                  <td className="py-3 px-2 text-center text-xs text-muted">
                    {item.colorName} / {item.sizeName}
                  </td>
                  <td className="py-3 px-2 text-center font-medium">{item.quantity}</td>
                  <td className="py-3 px-2 text-right text-muted">{formatVnd(item.unitPrice)}</td>
                  <td className="py-3 px-2 text-right font-semibold">{formatVnd(item.lineTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Financial Calculation Breakdown */}
        <div className="border-t border-border pt-6">
          <div className="ml-auto max-w-sm space-y-2 text-sm">
            <div className="flex justify-between text-muted">
              <span>Tạm tính tiền hàng:</span>
              <span className="font-medium text-foreground">{formatVnd(invoice.itemsSubtotal)}</span>
            </div>
            {invoice.discountAmount !== '0' && (
              <div className="flex justify-between text-emerald-600">
                <span>Chiết khấu / Giảm giá:</span>
                <span className="font-medium">-{formatVnd(invoice.discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between text-muted">
              <span>Cước phí vận chuyển:</span>
              <span className="font-medium text-foreground">{formatVnd(invoice.shippingFee)}</span>
            </div>

            <div className="flex justify-between border-t border-border pt-2 text-base font-bold text-foreground">
              <span>Tổng thanh toán:</span>
              <span className="text-brand font-mono text-lg">{formatVnd(invoice.grossAmount)}</span>
            </div>

            {/* Tax Separation Invariant Display */}
            <div className="rounded-lg bg-surface-soft p-3 space-y-1 text-xs border border-border/60">
              <div className="font-semibold text-foreground flex items-center gap-1">
                <FileText className="h-3.5 w-3.5 text-muted" />
                Bóc tách Thuế GTGT ({invoice.taxRatePercent}%):
              </div>
              <div className="flex justify-between text-muted">
                <span>• Tiền hàng trước thuế (Net):</span>
                <span className="font-mono text-foreground">{formatVnd(invoice.netAmount)}</span>
              </div>
              <div className="flex justify-between text-muted">
                <span>• Tiền thuế GTGT ({invoice.taxRatePercent}%):</span>
                <span className="font-mono font-semibold text-foreground">{formatVnd(invoice.taxAmount)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer / Signatures & Regulatory Note */}
        <div className="mt-10 border-t border-border pt-8 text-xs text-muted">
          <div className="grid grid-cols-2 gap-8 text-center pb-12">
            <div>
              <p className="font-bold uppercase text-foreground">Người mua hàng</p>
              <p className="italic text-muted text-[11px]">(Ký, ghi rõ họ tên)</p>
            </div>
            <div>
              <p className="font-bold uppercase text-foreground">Người bán hàng</p>
              <p className="italic text-muted text-[11px]">(Ký, đóng dấu nếu có)</p>
            </div>
          </div>

          <div className="border-t border-dashed border-border pt-4 text-center text-[11px] text-muted space-y-1">
            <p>
              Cảm ơn quý khách đã mua sắm tại <strong>{invoice.seller.name}</strong>!
            </p>
            <p>
              Biên nhận bán hàng kiêm phiếu giao nhận hàng hoá nội bộ. Giá thanh toán đã bao gồm thuế GTGT theo Nghị định 123/2020/NĐ-CP và Nghị định 72/2024/NĐ-CP.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
