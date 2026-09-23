import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AccessTokenService } from '../src/common/security/access-token.service';
import { PrismaService } from '../src/database/prisma/prisma.service';
import {
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  PaymentTxStatus,
  PaymentTxType,
  UserStatus,
} from '../src/generated/prisma/client';
import {
  buildPaymentUrlSearchParams,
  calculateSecureHash,
  HashAlgorithm,
} from 'vnpay';
import { createTestApplication } from './test-app.factory';

function bodyOf<T>(response: { body: unknown }): T {
  return response.body as T;
}

function signParams(
  params: Record<string, string | number>,
  secret: string,
): string {
  const searchParams = buildPaymentUrlSearchParams(params);
  return calculateSecureHash({
    secureSecret: secret,
    data: searchParams.toString(),
    hashAlgorithm: HashAlgorithm.SHA512,
  });
}

describe('Payment & VNPay Integration API (e2e)', () => {
  let app: INestApplication;
  let server: App;
  let prisma: PrismaService;

  let customerToken: string;
  let otherCustomerToken: string;
  let adminToken: string;

  let customerId: string;

  let onlineOrderId: string;
  let onlineOrderNumber: string;
  let onlinePaymentId: string;

  let codPaymentId: string;

  const testHashSecret =
    process.env.VNPAY_HASH_SECRET || 'TEST_VNPAY_HASH_SECRET_KEY';
  const suffix = randomUUID().slice(0, 8);

  beforeAll(async () => {
    app = await createTestApplication();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    server = app.getHttpServer<App>();
    prisma = app.get(PrismaService);

    const [customerRole, adminRole] = await Promise.all([
      prisma.role.findUniqueOrThrow({ where: { code: 'CUSTOMER' } }),
      prisma.role.findUniqueOrThrow({ where: { code: 'ADMIN' } }),
    ]);

    // Create users
    const customer = await prisma.user.create({
      data: {
        roleId: customerRole.id,
        email: `pay-cust-${suffix}@mam-nho.local`,
        passwordHash: 'e2e-hash',
        fullName: 'Payment Customer',
        status: UserStatus.ACTIVE,
      },
    });
    customerId = customer.id;

    const otherCustomer = await prisma.user.create({
      data: {
        roleId: customerRole.id,
        email: `pay-other-${suffix}@mam-nho.local`,
        passwordHash: 'e2e-hash',
        fullName: 'Payment Other Customer',
        status: UserStatus.ACTIVE,
      },
    });

    const admin = await prisma.user.create({
      data: {
        roleId: adminRole.id,
        email: `pay-admin-${suffix}@mam-nho.local`,
        passwordHash: 'e2e-hash',
        fullName: 'Payment Admin',
        status: UserStatus.ACTIVE,
      },
    });

    const accessTokens = app.get(AccessTokenService);
    [customerToken, otherCustomerToken, adminToken] = await Promise.all([
      accessTokens.sign(customer.id, 'CUSTOMER'),
      accessTokens.sign(otherCustomer.id, 'CUSTOMER'),
      accessTokens.sign(admin.id, 'ADMIN'),
    ]);

    // Seed ONLINE Order & Payment
    onlineOrderNumber = `ORD-ONL-${suffix}`;
    const onlineOrder = await prisma.order.create({
      data: {
        orderNumber: onlineOrderNumber,
        userId: customerId,
        status: OrderStatus.PENDING,
        itemsSubtotal: 200_000n,
        shippingFee: 30_000n,
        totalAmount: 230_000n,
        paymentMethod: PaymentMethod.ONLINE,
        receiverName: 'Payment Customer',
        receiverPhone: '+84912345678',
        shippingAddressLine: '123 Le Loi',
        shippingWardCode: '00001',
        shippingWardName: 'Ward 1',
        shippingProvinceCode: '01',
        shippingProvinceName: 'Hanoi',
        payment: {
          create: {
            method: PaymentMethod.ONLINE,
            provider: 'VNPAY',
            status: PaymentStatus.PENDING,
            amount: 230_000n,
            currency: 'VND',
            transactions: {
              create: {
                type: PaymentTxType.PAYMENT_CREATED,
                status: PaymentTxStatus.PENDING,
                amount: 230_000n,
                attemptRef: `INIT-${onlineOrderNumber}`,
              },
            },
          },
        },
      },
      include: { payment: true },
    });
    onlineOrderId = onlineOrder.id;
    onlinePaymentId = onlineOrder.payment!.id;

    // Seed COD Order & Payment
    const codOrder = await prisma.order.create({
      data: {
        orderNumber: `ORD-COD-${suffix}`,
        userId: customerId,
        status: OrderStatus.PENDING,
        itemsSubtotal: 100_000n,
        shippingFee: 30_000n,
        totalAmount: 130_000n,
        paymentMethod: PaymentMethod.COD,
        receiverName: 'Payment Customer',
        receiverPhone: '+84912345678',
        shippingAddressLine: '123 Le Loi',
        shippingWardCode: '00001',
        shippingWardName: 'Ward 1',
        shippingProvinceCode: '01',
        shippingProvinceName: 'Hanoi',
        payment: {
          create: {
            method: PaymentMethod.COD,
            provider: 'COD',
            status: PaymentStatus.PENDING,
            amount: 130_000n,
            currency: 'VND',
            transactions: {
              create: {
                type: PaymentTxType.PAYMENT_CREATED,
                status: PaymentTxStatus.PENDING,
                amount: 130_000n,
                attemptRef: `INIT-COD-${suffix}`,
              },
            },
          },
        },
      },
      include: { payment: true },
    });
    codPaymentId = codOrder.payment!.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/v1/payments/:id/vnpay/create-url', () => {
    it('returns 401 when request has no auth token', async () => {
      await request(server)
        .post(`/api/v1/payments/${onlinePaymentId}/vnpay/create-url`)
        .expect(401);
    });

    it('returns 403 when another customer tries to create URL (IDOR prevention)', async () => {
      await request(server)
        .post(`/api/v1/payments/${onlinePaymentId}/vnpay/create-url`)
        .set('Authorization', `Bearer ${otherCustomerToken}`)
        .expect(403);
    });

    it('returns 400 when attempting to create VNPay URL for a COD payment', async () => {
      await request(server)
        .post(`/api/v1/payments/${codPaymentId}/vnpay/create-url`)
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(400);
    });

    it('successfully creates signed URL and records PAYMENT_ATTEMPT for ONLINE payment', async () => {
      const res = await request(server)
        .post(`/api/v1/payments/${onlinePaymentId}/vnpay/create-url`)
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      const body = bodyOf<{
        paymentId: string;
        orderId: string;
        paymentUrl: string;
        txnRef: string;
        nextAction: string;
      }>(res);

      expect(body.paymentId).toBe(onlinePaymentId);
      expect(body.orderId).toBe(onlineOrderId);
      expect(body.nextAction).toBe('REDIRECT_TO_PAYMENT');
      expect(body.paymentUrl).toContain('vnp_Amount=23000000'); // 230,000 * 100
      expect(body.paymentUrl).toContain('vnp_SecureHash=');
      expect(body.txnRef).toContain(onlineOrderNumber);

      // Verify PAYMENT_ATTEMPT was persisted in database
      const attempt = await prisma.paymentTransaction.findUnique({
        where: { attemptRef: body.txnRef },
      });
      expect(attempt).not.toBeNull();
      expect(attempt?.type).toBe(PaymentTxType.PAYMENT_ATTEMPT);
      expect(attempt?.status).toBe(PaymentTxStatus.PENDING);
      expect(attempt?.amount).toBe(230_000n);
    });
  });

  describe('GET /api/v1/payments/order/:orderId', () => {
    it('returns 401 without auth', async () => {
      await request(server)
        .get(`/api/v1/payments/order/${onlineOrderId}`)
        .expect(401);
    });

    it('returns 403 when non-owner non-staff accesses payment details', async () => {
      await request(server)
        .get(`/api/v1/payments/order/${onlineOrderId}`)
        .set('Authorization', `Bearer ${otherCustomerToken}`)
        .expect(403);
    });

    it('returns safe payment details to the order owner with canRetry: true', async () => {
      const res = await request(server)
        .get(`/api/v1/payments/order/${onlineOrderId}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      const body = bodyOf<{
        id: string;
        orderId: string;
        status: string;
        amount: string;
        canRetry: boolean;
      }>(res);

      expect(body.id).toBe(onlinePaymentId);
      expect(body.orderId).toBe(onlineOrderId);
      expect(body.status).toBe(PaymentStatus.PENDING);
      expect(body.amount).toBe('230000');
      expect(body.canRetry).toBe(true);
    });

    it('allows Admin to view payment details', async () => {
      const res = await request(server)
        .get(`/api/v1/payments/order/${onlineOrderId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const body = bodyOf<{ id: string }>(res);
      expect(body.id).toBe(onlinePaymentId);
    });
  });

  describe('GET /api/v1/payments/vnpay/return (UX-only)', () => {
    it('returns isValid: false when signature is forged', async () => {
      const res = await request(server)
        .get('/api/v1/payments/vnpay/return')
        .query({
          vnp_Amount: '23000000',
          vnp_TxnRef: 'ANY-REF',
          vnp_SecureHash: 'invalid_signature_hash',
        })
        .expect(200);

      const body = bodyOf<{ isValid: boolean; isSuccess: boolean }>(res);
      expect(body.isValid).toBe(false);
      expect(body.isSuccess).toBe(false);
    });

    it('verifies signature for display without updating payment to PAID', async () => {
      // Create another attempt to test return
      const createRes = await request(server)
        .post(`/api/v1/payments/${onlinePaymentId}/vnpay/create-url`)
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      const txnRef = bodyOf<{ txnRef: string }>(createRes).txnRef;

      const returnParams: Record<string, string> = {
        vnp_Amount: '23000000',
        vnp_BankCode: 'NCB',
        vnp_OrderInfo: 'Thanh toan don hang',
        vnp_ResponseCode: '00',
        vnp_TransactionNo: '14000001',
        vnp_TransactionStatus: '00',
        vnp_TxnRef: txnRef,
      };

      const hash = signParams(returnParams, testHashSecret);

      const res = await request(server)
        .get('/api/v1/payments/vnpay/return')
        .query({
          ...returnParams,
          vnp_SecureHash: hash,
        })
        .expect(200);

      const body = bodyOf<{
        isValid: boolean;
        isSuccess: boolean;
        orderId: string;
      }>(res);
      expect(body.isValid).toBe(true);
      expect(body.isSuccess).toBe(true);
      expect(body.orderId).toBe(onlineOrderId);

      // Verify payment in DB was NOT modified to PAID by the return endpoint!
      const payment = await prisma.payment.findUniqueOrThrow({
        where: { id: onlinePaymentId },
      });
      expect(payment.status).toBe(PaymentStatus.PENDING);
    });
  });

  describe('GET /api/v1/webhooks/payments/vnpay/ipn (Authoritative)', () => {
    it('returns RspCode 97 (Invalid Checksum) when signature fails before touching DB', async () => {
      const res = await request(server)
        .get('/api/v1/webhooks/payments/vnpay/ipn')
        .query({
          vnp_Amount: '23000000',
          vnp_TxnRef: 'ANY-REF',
          vnp_SecureHash: 'forged_hash',
        })
        .expect(200);

      expect(res.body).toEqual({
        RspCode: '97',
        Message: 'Fail checksum',
      });
    });

    it('returns RspCode 01 (Order not found) when txnRef is unknown', async () => {
      const params: Record<string, string> = {
        vnp_Amount: '23000000',
        vnp_ResponseCode: '00',
        vnp_TransactionStatus: '00',
        vnp_TxnRef: 'UNKNOWN-TXN-REF',
      };
      const hash = signParams(params, testHashSecret);

      const res = await request(server)
        .get('/api/v1/webhooks/payments/vnpay/ipn')
        .query({ ...params, vnp_SecureHash: hash })
        .expect(200);

      expect(res.body).toEqual({
        RspCode: '01',
        Message: 'Order not found',
      });
    });

    it('returns RspCode 04 (Invalid amount) when callback amount does not match', async () => {
      const createRes = await request(server)
        .post(`/api/v1/payments/${onlinePaymentId}/vnpay/create-url`)
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      const txnRef = bodyOf<{ txnRef: string }>(createRes).txnRef;

      const params: Record<string, string> = {
        vnp_Amount: '10000000', // Expected 23000000
        vnp_ResponseCode: '00',
        vnp_TransactionStatus: '00',
        vnp_TxnRef: txnRef,
      };
      const hash = signParams(params, testHashSecret);

      const res = await request(server)
        .get('/api/v1/webhooks/payments/vnpay/ipn')
        .query({ ...params, vnp_SecureHash: hash })
        .expect(200);

      expect(res.body).toEqual({
        RspCode: '04',
        Message: 'Invalid amount',
      });
    });

    it('authoritatively transitions Payment to PAID on valid IPN and records ONLINE_PAYMENT_SUCCESS', async () => {
      const createRes = await request(server)
        .post(`/api/v1/payments/${onlinePaymentId}/vnpay/create-url`)
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      const txnRef = bodyOf<{ txnRef: string }>(createRes).txnRef;
      const providerTxnId = `VNPAY-TRANS-${Date.now()}`;

      const params: Record<string, string> = {
        vnp_Amount: '23000000',
        vnp_BankCode: 'NCB',
        vnp_OrderInfo: 'Thanh toan don hang',
        vnp_ResponseCode: '00',
        vnp_TransactionNo: providerTxnId,
        vnp_TransactionStatus: '00',
        vnp_TxnRef: txnRef,
      };
      const hash = signParams(params, testHashSecret);

      const res = await request(server)
        .get('/api/v1/webhooks/payments/vnpay/ipn')
        .query({ ...params, vnp_SecureHash: hash })
        .expect(200);

      expect(res.body).toEqual({
        RspCode: '00',
        Message: 'Confirm Success',
      });

      // Verify Payment updated to PAID in DB
      const updatedPayment = await prisma.payment.findUniqueOrThrow({
        where: { id: onlinePaymentId },
      });
      expect(updatedPayment.status).toBe(PaymentStatus.PAID);
      expect(updatedPayment.paidAt).not.toBeNull();
      expect(updatedPayment.providerTransactionId).toBe(providerTxnId);

      // Verify Order updated to CONFIRMED in DB
      const updatedOrder = await prisma.order.findUniqueOrThrow({
        where: { id: onlineOrderId },
      });
      expect(updatedOrder.status).toBe(OrderStatus.CONFIRMED);
      expect(updatedOrder.confirmedAt).not.toBeNull();

      // Verify ONLINE_PAYMENT_SUCCESS transaction
      const successTx = await prisma.paymentTransaction.findFirst({
        where: {
          paymentId: onlinePaymentId,
          type: PaymentTxType.ONLINE_PAYMENT_SUCCESS,
        },
      });
      expect(successTx).not.toBeNull();
      expect(successTx?.status).toBe(PaymentTxStatus.SUCCESS);
      expect(successTx?.providerTransactionId).toBe(providerTxnId);

      // --- TEST IDEMPOTENCY: send the identical IPN again ---
      const duplicateRes = await request(server)
        .get('/api/v1/webhooks/payments/vnpay/ipn')
        .query({ ...params, vnp_SecureHash: hash })
        .expect(200);

      expect(duplicateRes.body).toEqual({
        RspCode: '02',
        Message: 'Order already confirmed',
      });

      // Verify no duplicate ONLINE_PAYMENT_SUCCESS transaction was created
      const successTxCount = await prisma.paymentTransaction.count({
        where: {
          paymentId: onlinePaymentId,
          type: PaymentTxType.ONLINE_PAYMENT_SUCCESS,
        },
      });
      expect(successTxCount).toBe(1);

      // --- TEST MONOTONICITY: an out-of-order failure callback cannot downgrade PAID ---
      const failParams: Record<string, string> = {
        vnp_Amount: '23000000',
        vnp_ResponseCode: '24', // Cancelled by customer
        vnp_TransactionNo: `${providerTxnId}-LATE`,
        vnp_TxnRef: txnRef,
      };
      const failHash = signParams(failParams, testHashSecret);

      const failRes = await request(server)
        .get('/api/v1/webhooks/payments/vnpay/ipn')
        .query({ ...failParams, vnp_SecureHash: failHash })
        .expect(200);

      const failBody = bodyOf<{ RspCode: string }>(failRes);
      expect(failBody.RspCode).toBe('02'); // Already confirmed

      // Verify still PAID
      const stillPaid = await prisma.payment.findUniqueOrThrow({
        where: { id: onlinePaymentId },
      });
      expect(stillPaid.status).toBe(PaymentStatus.PAID);
    });
  });
});
