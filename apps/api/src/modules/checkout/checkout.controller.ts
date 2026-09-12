import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { RequirePermissions } from '../../authorization/require-permissions.decorator';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import type { AuthenticatedRequestUser } from '../../common/auth/authenticated-user';
import {
  CheckoutOrderResponseDto,
  CreateOrderCheckoutRequestDto,
} from './dto/checkout.dto';
import { CheckoutService } from './services/checkout.service';

@ApiTags('checkout')
@ApiBearerAuth()
@Controller('checkout')
export class CheckoutController {
  constructor(private readonly checkoutService: CheckoutService) {}

  @Post('orders')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('ORDER_CREATE')
  @ApiOperation({ summary: 'Checkout COD order atomically' })
  @ApiCreatedResponse({ type: CheckoutOrderResponseDto })
  checkout(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Body() body: CreateOrderCheckoutRequestDto,
  ): Promise<CheckoutOrderResponseDto> {
    return this.checkoutService.checkoutCod(user.id, body);
  }
}
