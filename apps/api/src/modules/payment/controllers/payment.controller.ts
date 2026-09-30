import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { CurrentUser } from '../../../common/auth/current-user.decorator';
import type { AuthenticatedRequestUser } from '../../../common/auth/authenticated-user';
import { Public } from '../../../common/auth/public.decorator';
import { PaymentService } from '../services/payment.service';
import {
  CreateVnpayUrlResponseDto,
  PaymentDetailResponseDto,
  VnPayReturnResponseDto,
} from '../dto/payment.dto';

function extractClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    const firstIp = forwarded.split(',')[0]?.trim();
    if (firstIp) return firstIp;
  } else if (Array.isArray(forwarded) && forwarded[0]) {
    return forwarded[0].trim();
  }
  const remote = req.socket?.remoteAddress;
  if (remote) {
    if (remote === '::1' || remote === '::ffff:127.0.0.1') return '127.0.0.1';
    return remote;
  }
  return '127.0.0.1';
}

@ApiTags('payments')
@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post(':id/vnpay/create-url')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Tạo URL thanh toán VNPay cho đơn hàng trực tuyến',
  })
  @ApiOkResponse({ type: CreateVnpayUrlResponseDto })
  async createVnpayUrl(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedRequestUser,
    @Req() req: Request,
  ): Promise<CreateVnpayUrlResponseDto> {
    const clientIp = extractClientIp(req);
    return this.paymentService.createVnpayUrl(id, user.id, clientIp);
  }

  @Get('order/:orderId')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Lấy thông tin trạng thái thanh toán theo orderId',
  })
  @ApiOkResponse({ type: PaymentDetailResponseDto })
  async getByOrder(
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @CurrentUser() user: AuthenticatedRequestUser,
  ): Promise<PaymentDetailResponseDto> {
    return this.paymentService.getByOrder(orderId, user.id, user.role);
  }

  @Get('vnpay/return')
  @Public()
  @ApiOperation({
    summary: 'Tiếp nhận chuyển hướng từ VNPay (UX-only, không set PAID)',
  })
  @ApiOkResponse({ type: VnPayReturnResponseDto })
  async handleReturn(
    @Query() query: Record<string, string | string[] | undefined>,
  ): Promise<VnPayReturnResponseDto> {
    return this.paymentService.handleReturn(query);
  }
}
