import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { RequirePermissions } from '../../authorization/require-permissions.decorator';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import type { AuthenticatedRequestUser } from '../../common/auth/authenticated-user';
import {
  CalculateShippingQuoteRequestDto,
  ShippingQuoteResponseDto,
} from './dto/shipping.dto';
import { ShippingService } from './services/shipping.service';

@ApiTags('shipping')
@ApiBearerAuth()
@Controller('shipping')
export class ShippingController {
  constructor(private readonly service: ShippingService) {}

  @Post('quote')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('ORDER_CREATE')
  @ApiOperation({ summary: 'Calculate shipping quote for customer address' })
  @ApiOkResponse({ type: ShippingQuoteResponseDto })
  calculateQuote(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Body() body: CalculateShippingQuoteRequestDto,
  ): Promise<ShippingQuoteResponseDto> {
    return this.service.calculateQuoteForUserAddress(user.id, body.addressId);
  }
}
