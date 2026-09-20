import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma/prisma.module';
import { PaymentController } from './controllers/payment.controller';
import { PaymentWebhookController } from './controllers/payment-webhook.controller';
import { PaymentProvider } from './domain/payment-provider.interface';
import { PaymentService } from './services/payment.service';
import {
  VNPAY_CLIENT,
  vnpayClientProvider,
} from './providers/vnpay/vnpay.client';
import { VnPayPaymentAdapter } from './providers/vnpay/vnpay-payment.adapter';
import { CodPaymentProvider } from './providers/cod/cod-payment.provider';

@Module({
  imports: [PrismaModule],
  controllers: [PaymentController, PaymentWebhookController],
  providers: [
    PaymentService,
    vnpayClientProvider,
    VnPayPaymentAdapter,
    CodPaymentProvider,
    { provide: PaymentProvider, useExisting: VnPayPaymentAdapter },
  ],
  exports: [
    PaymentService,
    PaymentProvider,
    VNPAY_CLIENT,
    VnPayPaymentAdapter,
    CodPaymentProvider,
  ],
})
export class PaymentModule {}
