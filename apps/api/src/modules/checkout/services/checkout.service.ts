import {
  ConflictException,
  HttpStatus,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  EntityStatus,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  PaymentTxStatus,
  PaymentTxType,
  Prisma,
  ProductStatus,
  ShippingQuoteSource,
  VariantStatus,
} from '../../../generated/prisma/client';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { ApiException } from '../../../common/errors/api-error';
import {
  InsufficientInventoryError,
  InventoryRepository,
  ReserveInventoryLine,
} from '../../inventory/repositories/inventory.repository';
import { ShippingService } from '../../shipping/services/shipping.service';
import {
  evaluateCoupon,
  type CouponReasonCode,
} from '../../promotion/domain/coupon.calculator';
import {
  CheckoutOrderResponseDto,
  CreateOrderCheckoutRequestDto,
} from '../dto/checkout.dto';
import { OrderCounterService } from './order-counter.service';
import { InvoiceService } from '../../billing/services/invoice.service';
import { TaxConfigService } from '../../billing/services/tax-config.service';
import { extractVat } from '../../billing/domain/vat.calculator';
import { OutboxService } from '../../notification/services/outbox.service';
import { ConfigService } from '@nestjs/config';

const MAIN_WAREHOUSE_CODE = 'MAIN_WAREHOUSE';

@Injectable()
export class CheckoutService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orderCounterService: OrderCounterService,
    private readonly shippingService: ShippingService,
    private readonly inventoryRepository: InventoryRepository,
    private readonly invoiceService: InvoiceService,
    private readonly taxConfigService: TaxConfigService,
    private readonly outboxService: OutboxService,
    private readonly configService: ConfigService,
  ) {}

  async checkoutCod(
    userId: string,
    dto: CreateOrderCheckoutRequestDto,
  ): Promise<CheckoutOrderResponseDto> {
    try {
      return await this.prisma.$transaction(
        async (tx) => {
          // 1. Verify and load user's cart header
          const cartHeader = await tx.cart.findUnique({
            where: { userId },
            select: { id: true },
          });
          if (!cartHeader) {
            throw new UnprocessableEntityException('Giỏ hàng không tồn tại');
          }

          // Lock cart FOR UPDATE to serialize concurrent checkout and cart mutations
          await tx.$queryRaw`SELECT id FROM carts WHERE id = ${cartHeader.id}::uuid FOR UPDATE`;

          // 2. Query cart items inside the locked transaction
          const cart = await tx.cart.findUnique({
            where: { id: cartHeader.id },
            include: {
              items: {
                include: {
                  variant: {
                    include: {
                      product: {
                        include: {
                          category: true,
                          brand: true,
                          images: true,
                        },
                      },
                      color: true,
                      size: true,
                    },
                  },
                },
              },
            },
          });

          if (!cart || cart.items.length === 0) {
            throw new UnprocessableEntityException('Giỏ hàng đang trống');
          }

          // 3. Verify address ownership (own-only, IDOR prevention)
          const address = await tx.address.findFirst({
            where: {
              id: dto.addressId,
              userId,
              user: { status: 'ACTIVE' },
            },
          });
          if (!address) {
            throw new NotFoundException('Địa chỉ nhận hàng không tồn tại');
          }

          // 4. Validate all items sellability
          for (const item of cart.items) {
            const variant = item.variant;
            const isSellable =
              variant.status === VariantStatus.ACTIVE &&
              variant.product.status === ProductStatus.ACTIVE &&
              variant.product.category.status === EntityStatus.ACTIVE &&
              (variant.product.brand === null ||
                variant.product.brand.status === EntityStatus.ACTIVE) &&
              variant.size.status === EntityStatus.ACTIVE &&
              variant.color.status === EntityStatus.ACTIVE &&
              (variant.weightGrams ?? 0) > 0 &&
              (variant.lengthCm ?? 0) > 0 &&
              (variant.widthCm ?? 0) > 0 &&
              (variant.heightCm ?? 0) > 0;

            if (!isSellable) {
              throw new UnprocessableEntityException(
                `Sản phẩm ${variant.sku} hiện không khả dụng để đặt hàng`,
              );
            }
          }

          // 5. Calculate items subtotal and total weight
          let itemsSubtotal = 0n;
          let totalWeightGrams = 0;
          for (const item of cart.items) {
            const lineTotal = item.variant.price * BigInt(item.quantity);
            itemsSubtotal += lineTotal;
            totalWeightGrams += (item.variant.weightGrams ?? 0) * item.quantity;
          }

          // 5b. Validate & lock coupon (Day 11 §10, §12).
          // Lock the coupon row FOR UPDATE and hold it until CouponUsage insert
          // so usage limits are race-safe within this transaction.
          let discountAmount = 0n;
          let appliedCoupon: { id: string; code: string } | null = null;
          if (dto.couponCode) {
            const coupon = await tx.coupon.findUnique({
              where: { code: dto.couponCode },
            });
            if (!coupon) {
              throw new ApiException(
                HttpStatus.NOT_FOUND,
                'COUPON_NOT_FOUND',
                'Mã giảm giá không tồn tại',
              );
            }
            await tx.$queryRaw`SELECT id FROM coupons WHERE id = ${coupon.id}::uuid FOR UPDATE`;
            const [globalUsageCount, userUsageCount] = await Promise.all([
              tx.couponUsage.count({ where: { couponId: coupon.id } }),
              tx.couponUsage.count({ where: { couponId: coupon.id, userId } }),
            ]);
            const evaluation = evaluateCoupon(coupon, {
              itemsSubtotal,
              now: new Date(),
              globalUsageCount,
              userUsageCount,
            });
            if (!evaluation.eligible) {
              throw this.couponError(evaluation.reasonCode);
            }
            discountAmount = evaluation.discountAmount;
            appliedCoupon = { id: coupon.id, code: coupon.code };
          }

          // 6. Accept only a signed, unexpired quote for this exact cart/address.
          const shippingParams = {
            toAddress: {
              addressLine: address.addressLine,
              wardCode: address.wardCode,
              wardName: address.wardName,
              provinceCode: address.provinceCode,
              provinceName: address.provinceName,
            },
            items: cart.items.map((i) => ({
              variantId: i.variantId,
              quantity: i.quantity,
              unitPrice: i.variant.price.toString(),
              weightGrams: i.variant.weightGrams ?? undefined,
              lengthCm: i.variant.lengthCm ?? undefined,
              widthCm: i.variant.widthCm ?? undefined,
              heightCm: i.variant.heightCm ?? undefined,
            })),
            totalWeightGrams,
          };
          const shippingQuote = this.shippingService.acceptQuoteFingerprint(
            userId,
            dto.addressId,
            shippingParams,
            dto.quoteFingerprint,
          );

          const shippingFee = shippingQuote.fee;
          const totalAmount = itemsSubtotal + shippingFee - discountAmount;
          const taxRateBps = this.taxConfigService.getDefaultTaxRateBps();
          const { net: netAmount, vat: taxAmount } = extractVat(
            totalAmount,
            taxRateBps,
          );

          // 7. Resolve active warehouse for inventory reservation
          const warehouse = await tx.warehouse.findFirst({
            where: { code: MAIN_WAREHOUSE_CODE, status: EntityStatus.ACTIVE },
            select: { id: true },
          });
          const activeWarehouse =
            warehouse ??
            (await tx.warehouse.findFirst({
              where: { status: EntityStatus.ACTIVE },
              select: { id: true },
            }));
          if (!activeWarehouse) {
            throw new UnprocessableEntityException(
              'Không tìm thấy kho hàng hợp lệ để xuất hàng',
            );
          }

          // 8. Monotonic order number allocation
          const orderNumber =
            await this.orderCounterService.generateOrderNumber(tx);

          // 9. Reserve inventory (locks variants in ASC order, checks onHand - reserved >= qty, writes RESERVE ledger)
          const reserveLines: ReserveInventoryLine[] = cart.items.map(
            (item) => ({
              warehouseId: activeWarehouse.id,
              variantId: item.variantId,
              quantity: item.quantity,
            }),
          );

          // We generate orderId first to link in inventory transaction referenceId
          const orderId = crypto.randomUUID();

          await this.inventoryRepository.reserveMany(tx, {
            lines: reserveLines,
            referenceType: 'ORDER',
            referenceId: orderId,
            actorId: userId,
            note: `Reserve for order ${orderNumber}`,
          });

          // 10. Persist Order, OrderItems, OrderStatusHistory, Payment, PaymentTransaction
          const order = await tx.order.create({
            data: {
              id: orderId,
              orderNumber,
              userId,
              status: OrderStatus.PENDING,
              itemsSubtotal,
              discountAmount,
              shippingFee,
              totalAmount,
              taxRateBps,
              taxAmount,
              netAmount,
              currency: 'VND',
              paymentMethod:
                dto.paymentMethod === 'ONLINE'
                  ? PaymentMethod.ONLINE
                  : PaymentMethod.COD,
              shippingProvider: shippingQuote.provider ?? 'STANDARD_FALLBACK',
              shippingServiceCode: shippingQuote.serviceCode ?? 'STANDARD',
              shippingServiceName:
                shippingQuote.serviceName ?? 'Giao hàng tiêu chuẩn',
              shippingQuoteSource:
                shippingQuote.source === 'PROVIDER'
                  ? ShippingQuoteSource.PROVIDER
                  : ShippingQuoteSource.FALLBACK,
              shippingQuoteMetadata: shippingQuote.metadata
                ? (shippingQuote.metadata as Prisma.InputJsonValue)
                : Prisma.DbNull,
              receiverName: address.receiverName,
              receiverPhone: address.phone,
              shippingAddressLine: address.addressLine,
              shippingWardCode: address.wardCode,
              shippingWardName: address.wardName,
              shippingProvinceCode: address.provinceCode,
              shippingProvinceName: address.provinceName,
              customerNote: dto.customerNote ?? null,
              items: {
                create: cart.items.map((item) => ({
                  variantId: item.variant.id,
                  productName: item.variant.product.name,
                  sku: item.variant.sku,
                  colorName: item.variant.color.name,
                  sizeName: item.variant.size.name,
                  unitPrice: item.variant.price,
                  quantity: item.quantity,
                  lineTotal: item.variant.price * BigInt(item.quantity),
                })),
              },
              statusHistories: {
                create: {
                  fromStatus: null,
                  toStatus: OrderStatus.PENDING,
                  changedBy: userId,
                  note:
                    dto.paymentMethod === 'ONLINE'
                      ? 'Đặt hàng thành công với hình thức thanh toán trực tuyến (VNPay)'
                      : 'Đặt hàng thành công với hình thức COD',
                },
              },
              payment: {
                create: {
                  method:
                    dto.paymentMethod === 'ONLINE'
                      ? PaymentMethod.ONLINE
                      : PaymentMethod.COD,
                  status: PaymentStatus.PENDING,
                  provider: dto.paymentMethod === 'ONLINE' ? 'VNPAY' : 'COD',
                  amount: totalAmount,
                  currency: 'VND',
                  transactions: {
                    create: {
                      type: PaymentTxType.PAYMENT_CREATED,
                      status: PaymentTxStatus.PENDING,
                      amount: totalAmount,
                      attemptRef:
                        dto.paymentMethod === 'ONLINE'
                          ? `${orderId}-ONLINE-INIT`
                          : `${orderId}-COD-INIT`,
                    },
                  },
                },
              },
            },
            include: {
              items: true,
              payment: true,
              user: true,
            },
          });

          // 10b. Consume coupon usage in the same transaction (Day 11 §10).
          if (appliedCoupon) {
            await tx.couponUsage.create({
              data: {
                couponId: appliedCoupon.id,
                userId,
                orderId,
                couponCodeSnapshot: appliedCoupon.code,
                discountAmount,
              },
            });
          }

          // 10c. Issue internal sales invoice / receipt within the same transaction (Day 29)
          const invoice = await this.invoiceService.issueForOrder(tx, order);

          // 10d. Enqueue invoice email into outbox (Day 30 - Outbox Pattern)
          const appPublicUrl = this.configService.get<string>(
            'APP_PUBLIC_URL',
            'http://localhost:3000',
          );
          const customerEmail =
            order.user?.email ??
            (
              await tx.user.findUnique({
                where: { id: userId },
                select: { email: true },
              })
            )?.email;

          if (customerEmail) {
            await this.outboxService.enqueue(tx, {
              dedupeKey: `INVOICE_ISSUED:${invoice.id}`,
              toEmail: customerEmail,
              template: 'invoice-issued',
              payload: {
                invoiceId: invoice.id,
                invoiceNumber: invoice.invoiceNumber,
                orderId: order.id,
                orderNumber: order.orderNumber,
                customerName: order.receiverName,
                issuedAt: invoice.issuedAt.toLocaleDateString('vi-VN'),
                items: cart.items.map((i) => ({
                  productName: i.variant.product.name,
                  colorName: i.variant.color.name,
                  sizeName: i.variant.size.name,
                  quantity: i.quantity,
                  unitPriceFormatted: Number(i.variant.price).toLocaleString(
                    'vi-VN',
                  ),
                  lineTotalFormatted: Number(
                    i.variant.price * BigInt(i.quantity),
                  ).toLocaleString('vi-VN'),
                })),
                itemsSubtotalFormatted: Number(
                  order.itemsSubtotal,
                ).toLocaleString('vi-VN'),
                discountAmountFormatted:
                  order.discountAmount > 0n
                    ? Number(order.discountAmount).toLocaleString('vi-VN')
                    : null,
                shippingFeeFormatted: Number(order.shippingFee).toLocaleString(
                  'vi-VN',
                ),
                taxAmountFormatted: Number(
                  order.taxAmount ?? 0n,
                ).toLocaleString('vi-VN'),
                totalAmountFormatted: Number(order.totalAmount).toLocaleString(
                  'vi-VN',
                ),
                invoiceUrl: `${appPublicUrl}/account/orders/${order.id}/invoice`,
              },
            });
          }

          // 11. Clear Cart items upon successful checkout commit
          await tx.cartItem.deleteMany({
            where: { cartId: cart.id },
          });
          await tx.cart.update({
            where: { id: cart.id },
            data: { updatedAt: new Date() },
          });

          // Construct standardized response with decimal string money representations
          return {
            id: order.id,
            orderNumber: order.orderNumber,
            status: order.status,
            currency: order.currency,
            itemsSubtotal: order.itemsSubtotal.toString(),
            discountAmount: order.discountAmount.toString(),
            shippingFee: order.shippingFee.toString(),
            totalAmount: order.totalAmount.toString(),
            taxRateBps: order.taxRateBps,
            taxAmount: order.taxAmount ? order.taxAmount.toString() : null,
            netAmount: order.netAmount ? order.netAmount.toString() : null,
            customerNote: order.customerNote,
            items: order.items.map((item) => ({
              id: item.id,
              variantId: item.variantId,
              productName: item.productName,
              sku: item.sku,
              colorName: item.colorName,
              sizeName: item.sizeName,
              unitPrice: item.unitPrice.toString(),
              quantity: item.quantity,
              lineTotal: item.lineTotal.toString(),
            })),
            payment: {
              id: order.payment!.id,
              method: order.payment!.method,
              status: order.payment!.status,
              amount: order.payment!.amount.toString(),
              currency: order.payment!.currency,
            },
            shipping: {
              receiverName: order.receiverName,
              receiverPhone: order.receiverPhone,
              shippingAddressLine: order.shippingAddressLine,
              shippingWardCode: order.shippingWardCode,
              shippingWardName: order.shippingWardName,
              shippingProvinceCode: order.shippingProvinceCode,
              shippingProvinceName: order.shippingProvinceName,
              shippingProvider: order.shippingProvider,
              shippingServiceCode: order.shippingServiceCode,
              shippingServiceName: order.shippingServiceName,
              shippingQuoteSource: order.shippingQuoteSource,
              shippingFee: order.shippingFee.toString(),
            },
            createdAt: order.createdAt.toISOString(),
            updatedAt: order.updatedAt.toISOString(),
          };
        },
        { maxWait: 5_000, timeout: 20_000 },
      );
    } catch (error) {
      if (error instanceof InsufficientInventoryError) {
        throw new ConflictException(
          'Sản phẩm trong giỏ đã hết hàng hoặc không đủ số lượng tồn kho khả dụng',
        );
      }
      throw error;
    }
  }

  private couponError(reason: CouponReasonCode): ApiException {
    switch (reason) {
      case 'DISABLED':
        return new ApiException(
          HttpStatus.BAD_REQUEST,
          'COUPON_DISABLED',
          'Mã giảm giá đã bị vô hiệu hoá',
        );
      case 'NOT_STARTED':
        return new ApiException(
          HttpStatus.BAD_REQUEST,
          'COUPON_NOT_STARTED',
          'Mã giảm giá chưa đến thời gian áp dụng',
        );
      case 'EXPIRED':
        return new ApiException(
          HttpStatus.BAD_REQUEST,
          'COUPON_EXPIRED',
          'Mã giảm giá đã hết hạn',
        );
      case 'MIN_ORDER_NOT_MET':
        return new ApiException(
          HttpStatus.BAD_REQUEST,
          'COUPON_MIN_ORDER_NOT_MET',
          'Đơn hàng chưa đạt giá trị tối thiểu để áp mã',
        );
      case 'USAGE_LIMIT_REACHED':
        return new ApiException(
          HttpStatus.CONFLICT,
          'COUPON_USAGE_LIMIT_REACHED',
          'Mã giảm giá đã hết lượt sử dụng',
        );
      case 'USER_LIMIT_REACHED':
        return new ApiException(
          HttpStatus.CONFLICT,
          'COUPON_USER_LIMIT_REACHED',
          'Bạn đã dùng hết lượt cho mã giảm giá này',
        );
      case 'NOT_FOUND':
      default:
        return new ApiException(
          HttpStatus.BAD_REQUEST,
          'COUPON_INVALID',
          'Mã giảm giá không hợp lệ',
        );
    }
  }
}
