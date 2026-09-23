import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import {
  Invoice,
  InvoiceStatus,
  Order,
  OrderItem,
  User,
} from '../../../generated/prisma/client';
import { ApiException } from '../../../common/errors/api-error';
import type { PrismaTransactionClient } from '../../../database/prisma/prisma.types';
import type { BuyerSnapshot, SellerSnapshot } from '../domain/billing.types';
import { extractVat } from '../domain/vat.calculator';
import { AdminInvoiceQueryDto } from '../dto/admin-invoice-query.dto';
import {
  InvoiceDetailResponseDto,
  InvoiceItemDto,
  InvoiceListItemDto,
  InvoicePaginatedResponseDto,
} from '../dto/invoice.dto';
import {
  InvoiceRepository,
  type InvoiceWithOrder,
} from '../repositories/invoice.repository';
import { InvoiceNumberService } from './invoice-number.service';
import { TaxConfigService } from './tax-config.service';

export function mapInvoiceToDetailDto(
  invoice: InvoiceWithOrder,
): InvoiceDetailResponseDto {
  const seller = (invoice.sellerSnapshot as unknown as SellerSnapshot) ?? {
    name: 'Cửa hàng Thời trang Trẻ em Jaykiby',
    address: '',
    taxCode: '',
    phone: '',
  };

  const buyer = (invoice.buyerSnapshot as unknown as BuyerSnapshot) ?? {
    receiverName: invoice.order.receiverName,
    receiverPhone: invoice.order.receiverPhone,
    addressLine: invoice.order.shippingAddressLine,
    wardName: invoice.order.shippingWardName,
    provinceName: invoice.order.shippingProvinceName,
    customerEmail: invoice.order.user?.email ?? null,
  };

  const items: InvoiceItemDto[] = (invoice.order.items || []).map(
    (item: OrderItem) => ({
      id: item.id,
      variantId: item.variantId,
      productName: item.productName,
      sku: item.sku,
      colorName: item.colorName,
      sizeName: item.sizeName,
      unitPrice: item.unitPrice.toString(),
      quantity: item.quantity,
      lineTotal: item.lineTotal.toString(),
    }),
  );

  return {
    id: invoice.id,
    orderId: invoice.orderId,
    orderNumber: invoice.order.orderNumber,
    invoiceNumber: invoice.invoiceNumber,
    status: invoice.status,
    issuedAt: invoice.issuedAt.toISOString(),
    voidedAt: invoice.voidedAt ? invoice.voidedAt.toISOString() : null,
    currency: invoice.currency,
    netAmount: invoice.netAmount.toString(),
    taxRateBps: invoice.taxRateBps,
    taxRatePercent: invoice.taxRateBps / 100,
    taxAmount: invoice.taxAmount.toString(),
    grossAmount: invoice.grossAmount.toString(),
    itemsSubtotal: invoice.order.itemsSubtotal.toString(),
    discountAmount: invoice.order.discountAmount.toString(),
    shippingFee: invoice.order.shippingFee.toString(),
    seller,
    buyer,
    items,
  };
}

export function mapInvoiceToListItemDto(
  invoice: InvoiceWithOrder,
): InvoiceListItemDto {
  return {
    id: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    orderId: invoice.orderId,
    orderNumber: invoice.order.orderNumber,
    status: invoice.status,
    issuedAt: invoice.issuedAt.toISOString(),
    voidedAt: invoice.voidedAt ? invoice.voidedAt.toISOString() : null,
    currency: invoice.currency,
    netAmount: invoice.netAmount.toString(),
    taxRateBps: invoice.taxRateBps,
    taxAmount: invoice.taxAmount.toString(),
    grossAmount: invoice.grossAmount.toString(),
    receiverName: invoice.order.receiverName,
    receiverPhone: invoice.order.receiverPhone,
  };
}

@Injectable()
export class InvoiceService {
  private readonly logger = new Logger(InvoiceService.name);

  constructor(
    private readonly invoiceRepository: InvoiceRepository,
    private readonly invoiceNumberService: InvoiceNumberService,
    private readonly taxConfigService: TaxConfigService,
  ) {}

  /**
   * Phát hành hoá đơn cho đơn hàng trong transaction.
   * Hoạt động idempotent: nếu đơn hàng đã có hoá đơn thì trả về hoá đơn đã có.
   */
  async issueForOrder(
    tx: PrismaTransactionClient,
    order: Order & { user?: User | null },
  ): Promise<Invoice> {
    // 1. Kiểm tra nếu hoá đơn đã tồn tại (idempotency)
    const existing = await tx.invoice.findUnique({
      where: { orderId: order.id },
    });
    if (existing) {
      return existing;
    }

    // 2. Thuế suất: ưu tiên thuế suất đã snapshot trên order, nếu chưa thì lấy default
    const rateBps =
      order.taxRateBps ?? this.taxConfigService.getDefaultTaxRateBps();

    // 3. Bóc tách VAT
    const { net, vat } = extractVat(order.totalAmount, rateBps);

    // 4. Nếu Order chưa được snapshot thuế thì snapshot bổ sung
    if (
      order.taxRateBps == null ||
      order.taxAmount == null ||
      order.netAmount == null
    ) {
      await tx.order.update({
        where: { id: order.id },
        data: {
          taxRateBps: rateBps,
          taxAmount: vat,
          netAmount: net,
        },
      });
    }

    // 5. Cấp số hoá đơn tuần tự theo tháng
    const invoiceNumber = await this.invoiceNumberService.generateInvoiceNumber(
      tx,
      order.createdAt,
    );

    // 6. Chuẩn bị snapshots
    const sellerSnapshot = this.taxConfigService.getSellerSnapshot();
    const buyerSnapshot: BuyerSnapshot = {
      receiverName: order.receiverName,
      receiverPhone: order.receiverPhone,
      addressLine: order.shippingAddressLine,
      wardName: order.shippingWardName,
      wardCode: order.shippingWardCode,
      provinceName: order.shippingProvinceName,
      provinceCode: order.shippingProvinceCode,
      customerEmail: order.user?.email ?? null,
    };

    // 7. Tạo bản ghi Invoice
    const invoice = await this.invoiceRepository.create(
      {
        orderId: order.id,
        invoiceNumber,
        status: InvoiceStatus.ISSUED,
        issuedAt: new Date(),
        currency: order.currency || 'VND',
        netAmount: net,
        taxRateBps: rateBps,
        taxAmount: vat,
        grossAmount: order.totalAmount,
        sellerSnapshot: sellerSnapshot as unknown as Record<string, unknown>,
        buyerSnapshot: buyerSnapshot as unknown as Record<string, unknown>,
      },
      tx,
    );

    this.logger.log(
      `Issued invoice ${invoiceNumber} for order ${order.orderNumber} (Gross: ${order.totalAmount}, Net: ${net}, VAT: ${vat})`,
    );

    return invoice;
  }

  /**
   * Huỷ (void) hoá đơn khi đơn hàng bị huỷ.
   * Append-only: không xoá bản ghi mà chỉ chuyển status sang VOID và lưu voidedAt.
   */
  async voidForOrder(
    tx: PrismaTransactionClient,
    orderId: string,
    voidedAt: Date = new Date(),
  ): Promise<Invoice | null> {
    const existing = await tx.invoice.findUnique({
      where: { orderId },
    });

    if (!existing) {
      return null;
    }

    if (existing.status === InvoiceStatus.VOID) {
      return existing;
    }

    const voided = await tx.invoice.update({
      where: { id: existing.id },
      data: {
        status: InvoiceStatus.VOID,
        voidedAt,
      },
    });

    this.logger.log(
      `Voided invoice ${voided.invoiceNumber} for order ${orderId}`,
    );
    return voided;
  }

  /**
   * Lấy chi tiết hoá đơn cho khách hàng sở hữu đơn hàng.
   * Chống IDOR: nếu không phải chủ sở hữu hoặc không tìm thấy -> trả về 404.
   */
  async getForOwner(
    orderId: string,
    userId: string,
  ): Promise<InvoiceDetailResponseDto> {
    const invoice = await this.invoiceRepository.findByOrderId(orderId);

    if (!invoice || invoice.order.userId !== userId) {
      throw new ApiException(
        HttpStatus.NOT_FOUND,
        'INVOICE_NOT_FOUND',
        'Không tìm thấy hoá đơn hoặc bạn không có quyền truy cập',
      );
    }

    return mapInvoiceToDetailDto(invoice);
  }

  /**
   * Lấy chi tiết hoá đơn cho quản trị viên (theo ID hoặc theo số hoá đơn).
   */
  async getAdmin(idOrNumber: string): Promise<InvoiceDetailResponseDto> {
    let invoice = await this.invoiceRepository.findById(idOrNumber);
    if (!invoice) {
      invoice = await this.invoiceRepository.findByInvoiceNumber(idOrNumber);
    }

    if (!invoice) {
      throw new ApiException(
        HttpStatus.NOT_FOUND,
        'INVOICE_NOT_FOUND',
        'Không tìm thấy hoá đơn yêu cầu',
      );
    }

    return mapInvoiceToDetailDto(invoice);
  }

  /**
   * Lấy danh sách hoá đơn cho quản trị viên (có phân trang và lọc).
   */
  async listAdmin(
    query: AdminInvoiceQueryDto,
  ): Promise<InvoicePaginatedResponseDto> {
    let from: Date | undefined;
    let to: Date | undefined;

    if (query.from) {
      from = new Date(`${query.from}T00:00:00.000Z`);
    }
    if (query.to) {
      // Add 1 day to make 'to' boundary inclusive for the date
      const toDate = new Date(`${query.to}T00:00:00.000Z`);
      to = new Date(toDate.getTime() + 24 * 60 * 60 * 1000);
    }

    const result = await this.invoiceRepository.findManyAdmin({
      page: query.page || 1,
      limit: query.limit || 20,
      status: query.status,
      from,
      to,
      search: query.search,
    });

    return {
      items: result.items.map(mapInvoiceToListItemDto),
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    };
  }
}
