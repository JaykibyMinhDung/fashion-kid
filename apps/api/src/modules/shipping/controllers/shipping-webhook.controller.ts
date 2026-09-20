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
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../../common/auth/public.decorator';
import { ApiException } from '../../../common/errors/api-error';
import { GhnWebhookPayloadDto } from '../dto/shipping.dto';
import { ShipmentService } from '../services/shipment.service';

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
    const secret = this.configService.get<string>('GHN_WEBHOOK_SECRET');
    if (secret && ghnToken !== secret) {
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
