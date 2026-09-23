import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import {
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  PaymentTxStatus,
  PaymentTxType,
  Prisma,
} from '../../../generated/prisma/client';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { ApiException } from '../../../common/errors/api-error';
import { PaymentProvider } from '../domain/payment-provider.interface';
import {
  IpnSuccess,
  IpnFailChecksum,
  IpnOrderNotFound,
  IpnInvalidAmount,
  IpnOrderAlreadyConfirmed,
  IpnUnknownError,
  type IpnResponse,
} from '../providers/vnpay/vnpay.mapper';
import {
  CreateVnpayUrlResponseDto,
  PaymentDetailResponseDto,
  VnPayReturnResponseDto,
} from '../dto/payment.dto';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentProvider: PaymentProvider,
  ) {}

  /**
   * Generates a signed VNPay payment URL for an ONLINE payment attempt.
   * Enforces ownership, order status PENDING, and records PAYMENT_ATTEMPT.
   */
  async createVnpayUrl(
    paymentId: string,
    userId: string,
    ipAddress: string,
  ): Promise<CreateVnpayUrlResponseDto> {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            userId: true,
            status: true,
          },
        },
      },
    });

    if (!payment) {
      throw new ApiException(
        HttpStatus.NOT_FOUND,
        'NOT_FOUND',
        'Không tìm thấy thông tin thanh toán',
      );
    }

    if (payment.order.userId !== userId) {
      throw new ApiException(
        HttpStatus.FORBIDDEN,
        'FORBIDDEN',
        'Bạn không có quyền thao tác trên thanh toán của đơn hàng này',
      );
    }

    if (payment.method !== PaymentMethod.ONLINE) {
      throw new ApiException(
        HttpStatus.BAD_REQUEST,
        'PAYMENT_INVALID_STATE',
        'Phương thức thanh toán của đơn hàng không phải trực tuyến',
      );
    }

    if (payment.status === PaymentStatus.PAID) {
      throw new ApiException(
        HttpStatus.BAD_REQUEST,
        'VNPAY_PAYMENT_ALREADY_COMPLETED',
        'Đơn hàng đã được thanh toán thành công',
      );
    }

    if (payment.order.status !== OrderStatus.PENDING) {
      throw new ApiException(
        HttpStatus.BAD_REQUEST,
        'PAYMENT_INVALID_STATE',
        'Trạng thái đơn hàng không hợp lệ để tạo liên kết thanh toán',
      );
    }

    // Unique attempt reference per payment try
    const suffix = `${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const txnRef = `PAY-${payment.order.orderNumber}-${suffix}`;

    // Record PAYMENT_ATTEMPT transaction
    await this.prisma.paymentTransaction.create({
      data: {
        paymentId: payment.id,
        type: PaymentTxType.PAYMENT_ATTEMPT,
        status: PaymentTxStatus.PENDING,
        amount: payment.amount,
        attemptRef: txnRef,
      },
    });

    try {
      const result = await this.paymentProvider.createPaymentUrl({
        paymentId: payment.id,
        orderId: payment.order.id,
        orderNumber: payment.order.orderNumber,
        amount: payment.amount,
        currency: payment.currency,
        ipAddress,
        attemptRef: txnRef,
      });

      return {
        paymentId: payment.id,
        orderId: payment.order.id,
        paymentUrl: result.paymentUrl,
        txnRef: result.txnRef,
        expiresAt: result.expiresAt.toISOString(),
        nextAction: 'REDIRECT_TO_PAYMENT',
      };
    } catch (error) {
      if (error instanceof ApiException) {
        throw error;
      }
      this.logger.error(
        `Failed to create VNPay payment URL for payment ${paymentId}`,
        error,
      );
      throw new ApiException(
        HttpStatus.INTERNAL_SERVER_ERROR,
        'PAYMENT_URL_CREATE_FAILED',
        'Không thể tạo liên kết thanh toán VNPay lúc này. Vui lòng thử lại.',
      );
    }
  }

  /**
   * Retrieves safe payment details by orderId (for owner or authorized staff).
   */
  async getByOrder(
    orderId: string,
    userId: string,
    roleCode?: string,
  ): Promise<PaymentDetailResponseDto> {
    const payment = await this.prisma.payment.findUnique({
      where: { orderId },
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            userId: true,
            status: true,
          },
        },
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!payment) {
      throw new ApiException(
        HttpStatus.NOT_FOUND,
        'NOT_FOUND',
        'Không tìm thấy thông tin thanh toán cho đơn hàng này',
      );
    }

    const isStaff =
      roleCode === 'ADMIN' ||
      roleCode === 'SALES_STAFF' ||
      roleCode === 'WAREHOUSE_STAFF';

    if (payment.order.userId !== userId && !isStaff) {
      throw new ApiException(
        HttpStatus.FORBIDDEN,
        'FORBIDDEN',
        'Bạn không có quyền xem thông tin thanh toán của đơn hàng này',
      );
    }

    const canRetry =
      payment.method === PaymentMethod.ONLINE &&
      (payment.status === PaymentStatus.PENDING ||
        payment.status === PaymentStatus.FAILED) &&
      payment.order.status === OrderStatus.PENDING;

    const latestTx = payment.transactions[0];

    return {
      id: payment.id,
      orderId: payment.orderId,
      orderNumber: payment.order.orderNumber,
      method: payment.method,
      status: payment.status,
      amount: payment.amount.toString(),
      currency: payment.currency,
      provider: payment.provider,
      paidAt: payment.paidAt ? payment.paidAt.toISOString() : null,
      failedAt: payment.failedAt ? payment.failedAt.toISOString() : null,
      canRetry,
      latestAttempt: latestTx
        ? {
            attemptRef: latestTx.attemptRef ?? '',
            status: latestTx.status,
            createdAt: latestTx.createdAt.toISOString(),
          }
        : null,
    };
  }

  /**
   * Return URL Handler — UX Only.
   * Verifies the checksum and returns sanitized display details.
   * NEVER sets Payment to PAID here!
   */
  async handleReturn(
    queryParams: Record<string, string | string[] | undefined>,
  ): Promise<VnPayReturnResponseDto> {
    const verification = await this.paymentProvider.verifyCallback({
      params: queryParams,
    });

    if (!verification.isValid) {
      return {
        isValid: false,
        isSuccess: false,
        orderId: '',
        orderNumber: '',
        paymentId: '',
        amount: '0',
        responseCode: verification.responseCode,
        responseMessage: 'Chữ ký kiểm tra không hợp lệ từ VNPay',
        paymentStatus: PaymentStatus.PENDING,
      };
    }

    const attemptTx = await this.prisma.paymentTransaction.findUnique({
      where: { attemptRef: verification.txnRef },
      include: {
        payment: {
          include: {
            order: true,
          },
        },
      },
    });

    if (!attemptTx || !attemptTx.payment) {
      return {
        isValid: true,
        isSuccess: false,
        orderId: '',
        orderNumber: '',
        paymentId: '',
        amount: '0',
        responseCode: verification.responseCode,
        responseMessage: 'Không tìm thấy thông tin đơn hàng tương ứng',
        paymentStatus: PaymentStatus.PENDING,
      };
    }

    const payment = attemptTx.payment;

    return {
      isValid: true,
      isSuccess: verification.isSuccess,
      orderId: payment.order.id,
      orderNumber: payment.order.orderNumber,
      paymentId: payment.id,
      amount: payment.amount.toString(),
      responseCode: verification.responseCode,
      responseMessage:
        verification.responseMessage || 'Xác nhận thông tin thành công',
      paymentStatus: payment.status,
    };
  }

  /**
   * IPN Webhook Handler — Authoritative Source of Truth.
   * Follows strict A–K execution flow:
   * A: Parse params
   * B: Verify checksum FIRST (0 DB queries if invalid)
   * C & D: Resolve attempt by txnRef & validate references
   * E: Exact integer BigInt amount match (vnp_Amount == amount * 100)
   * F: Ensure providerTransactionId not bound to another payment
   * G & H & I: Lock payment row, apply monotonic/idempotent transition, write audit transaction
   * J & K: Commit & return VNPay RspCode/Message
   */
  async handleIpn(
    queryParams: Record<string, string | string[] | undefined>,
  ): Promise<IpnResponse> {
    // Step A & B: Checksum verification FIRST before any DB work
    const verification = await this.paymentProvider.verifyIpn({
      params: queryParams,
    });

    if (!verification.isValid) {
      this.logger.warn(`[IPN] Checksum verification failed for VNPay callback`);
      return IpnFailChecksum;
    }

    // Step C & D: Resolve attempt by txnRef & validate payment/order
    const txnRef = verification.txnRef;
    if (!txnRef) {
      return IpnOrderNotFound;
    }

    const attemptTx = await this.prisma.paymentTransaction.findUnique({
      where: { attemptRef: txnRef },
      include: {
        payment: {
          include: {
            order: true,
          },
        },
      },
    });

    if (!attemptTx || !attemptTx.payment) {
      this.logger.warn(`[IPN] Payment attempt not found for txnRef: ${txnRef}`);
      return IpnOrderNotFound;
    }

    const payment = attemptTx.payment;

    // Step E: Exact integer BigInt amount match
    const rawAmount = Array.isArray(queryParams['vnp_Amount'])
      ? queryParams['vnp_Amount'][0]
      : queryParams['vnp_Amount'];

    if (
      !rawAmount ||
      !/^\d+$/.test(rawAmount) ||
      BigInt(rawAmount) !== payment.amount * 100n
    ) {
      this.logger.warn(
        `[IPN] Amount mismatch on payment ${payment.id}. Expected: ${payment.amount * 100n}, Received: ${rawAmount}`,
      );
      return IpnInvalidAmount;
    }

    // Step F: Validate provider transaction number not bound to another payment
    const providerTransactionId = verification.providerTransactionId;
    if (providerTransactionId) {
      const boundToOther = await this.prisma.payment.findFirst({
        where: {
          providerTransactionId,
          id: { not: payment.id },
        },
      });

      if (boundToOther) {
        this.logger.error(
          `[IPN] Provider transaction ${providerTransactionId} already bound to other payment ${boundToOther.id}`,
        );
        return IpnOrderAlreadyConfirmed;
      }
    }

    // Step G, H, I, J: In DB transaction with FOR UPDATE lock
    try {
      return await this.prisma.$transaction(
        async (tx) => {
          // Lock the Payment row
          await tx.$queryRaw`SELECT id FROM payments WHERE id = ${payment.id}::uuid FOR UPDATE`;

          const lockedPayment = await tx.payment.findUniqueOrThrow({
            where: { id: payment.id },
          });

          // Case 1: Already PAID
          if (lockedPayment.status === PaymentStatus.PAID) {
            if (
              providerTransactionId &&
              lockedPayment.providerTransactionId === providerTransactionId
            ) {
              // Duplicate IPN - Idempotent success
              return IpnOrderAlreadyConfirmed;
            }

            // Conflict: Already PAID with different provider transaction
            this.logger.error(
              `[IPN] VNPAY_TRANSACTION_CONFLICT on payment ${payment.id}. Existing providerTx: ${lockedPayment.providerTransactionId}, Incoming: ${providerTransactionId}`,
            );
            return IpnOrderAlreadyConfirmed;
          }

          // Case 2: Unsuccessful callback (vnp_ResponseCode !== '00')
          if (!verification.isSuccess) {
            // Append failure transaction
            await tx.paymentTransaction.create({
              data: {
                paymentId: payment.id,
                type: PaymentTxType.ONLINE_PAYMENT_FAILED,
                status: PaymentTxStatus.FAILED,
                amount: payment.amount,
                attemptRef: `${txnRef}-FAILED-${Date.now()}`,
                providerTransactionId: providerTransactionId || null,
                responseCode: verification.responseCode || null,
                responseMessage:
                  verification.responseMessage || 'Thanh toán thất bại',
                metadata: (verification.rawParams ??
                  {}) as Prisma.InputJsonValue,
              },
            });

            // If still pending, set failedAt timestamp
            if (lockedPayment.status === PaymentStatus.PENDING) {
              await tx.payment.update({
                where: { id: payment.id },
                data: {
                  failedAt: new Date(),
                  provider: 'VNPAY',
                },
              });
            }

            return IpnSuccess;
          }

          // Case 3: Successful payment
          await tx.payment.update({
            where: { id: payment.id },
            data: {
              status: PaymentStatus.PAID,
              paidAt: new Date(),
              provider: 'VNPAY',
              providerTransactionId: providerTransactionId || null,
            },
          });

          await tx.paymentTransaction.create({
            data: {
              paymentId: payment.id,
              type: PaymentTxType.ONLINE_PAYMENT_SUCCESS,
              status: PaymentTxStatus.SUCCESS,
              amount: payment.amount,
              attemptRef: `${txnRef}-SUCCESS`,
              providerTransactionId: providerTransactionId || null,
              responseCode: verification.responseCode || '00',
              responseMessage:
                verification.responseMessage || 'Giao dịch thành công',
              metadata: (verification.rawParams ?? {}) as Prisma.InputJsonValue,
            },
          });

          if (payment.order.status === OrderStatus.PENDING) {
            await tx.order.update({
              where: { id: payment.order.id },
              data: {
                status: OrderStatus.CONFIRMED,
                confirmedAt: new Date(),
              },
            });

            await tx.orderStatusHistory.create({
              data: {
                orderId: payment.order.id,
                fromStatus: OrderStatus.PENDING,
                toStatus: OrderStatus.CONFIRMED,
                note: `Thanh toán trực tuyến VNPay thành công (Mã GD: ${providerTransactionId || txnRef})`,
              },
            });
          }

          this.logger.log(
            `[IPN] Payment ${payment.id} transitioned to PAID via VNPay txn ${providerTransactionId}`,
          );

          return IpnSuccess;
        },
        { timeout: 15000 },
      );
    } catch (error) {
      this.logger.error(
        `[IPN] Database transaction failed during IPN processing for payment ${payment.id}`,
        error,
      );
      return IpnUnknownError;
    }
  }
}
