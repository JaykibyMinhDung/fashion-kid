import { Controller, Get, HttpCode, HttpStatus, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../../common/auth/public.decorator';
import { PaymentService } from '../services/payment.service';
import { VnPayIpnResponseDto } from '../dto/payment.dto';

@ApiTags('payment-webhooks')
@Controller('webhooks/payments')
export class PaymentWebhookController {
  constructor(private readonly paymentService: PaymentService) {}

  @Get('vnpay/ipn')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'VNPay IPN callback (Nguồn sự thật thẩm quyền cập nhật thanh toán trực tuyến)',
  })
  @ApiOkResponse({ type: VnPayIpnResponseDto })
  async handleVnPayIpn(
    @Query() query: Record<string, string | string[] | undefined>,
  ): Promise<VnPayIpnResponseDto> {
    return this.paymentService.handleIpn(query);
  }
}
