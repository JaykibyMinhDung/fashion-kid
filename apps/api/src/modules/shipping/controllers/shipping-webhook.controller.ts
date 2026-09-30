import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'node:crypto';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../../common/auth/public.decorator';
import { ApiException } from '../../../common/errors/api-error';
import { GhnWebhookPayloadDto } from '../dto/shipping.dto';
import { ShipmentService } from '../services/shipment.service';

/**
 * So sánh token theo thời gian hằng định (chống timing attack).
 * Trả về false nếu độ dài khác nhau hoặc giá trị không khớp.
 */
function tokensMatch(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) {
    return false;
  }
  return timingSafeEqual(a, b);
}

@ApiTags('shipping-webhooks')
@Public()
@Controller('webhooks/shipping')
export class ShippingWebhookController {
  private readonly logger = new Logger(ShippingWebhookController.name);

  constructor(
    private readonly shipmentService: ShipmentService,
    private readonly configService: ConfigService,
  ) {}

  @Post('ghn')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Nhận thông báo trạng thái giao hàng từ GHN qua Webhook',
  })
  async handleGhnWebhook(
    @Headers('x-ghn-token') ghnToken: string | undefined,
    @Body() payload: GhnWebhookPayloadDto,
  ): Promise<{ received: boolean; status?: string; ignored?: boolean }> {
    const isProduction =
      this.configService.get<string>('NODE_ENV') === 'production';
    const secret = this.configService.get<string>('GHN_WEBHOOK_SECRET');

    // SEC-08-01 (Day 21): webhook này mutate trạng thái đơn (→ DELIVERED) nên
    // BẮT BUỘC xác thực ở production. Fail-closed: thiếu secret ở production =>
    // từ chối, không để endpoint mở toang cho kẻ giả mạo đánh dấu đơn đã giao.
    if (isProduction && !secret) {
      this.logger.error(
        'GHN webhook rejected: GHN_WEBHOOK_SECRET chưa được cấu hình ở môi trường production',
      );
      throw new ApiException(
        HttpStatus.UNAUTHORIZED,
        'WEBHOOK_UNAUTHORIZED',
        'Webhook GHN chưa được cấu hình xác thực',
      );
    }

    if (
      secret &&
      (typeof ghnToken !== 'string' || !tokensMatch(ghnToken, secret))
    ) {
      this.logger.warn('GHN webhook rejected: invalid or missing token');
      throw new ApiException(
        HttpStatus.UNAUTHORIZED,
        'WEBHOOK_UNAUTHORIZED',
        'Token xác thực webhook GHN không hợp lệ',
      );
    }

    return this.shipmentService.handleWebhook(payload);
  }
}
