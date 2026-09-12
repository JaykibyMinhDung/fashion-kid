import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { RequirePermissions } from '../../authorization/require-permissions.decorator';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import type { AuthenticatedRequestUser } from '../../common/auth/authenticated-user';
import {
  AddCartItemRequestDto,
  CartResponseDto,
  UpdateCartItemRequestDto,
} from './dto/cart.dto';
import { CartService } from './cart.service';

@ApiTags('cart')
@ApiBearerAuth()
@Controller('cart')
export class CartController {
  constructor(private readonly service: CartService) {}

  @Get()
  @RequirePermissions('CART_READ_OWN')
  @ApiOperation({ summary: 'Read the authenticated customer cart' })
  @ApiOkResponse({ type: CartResponseDto })
  getCart(
    @CurrentUser() user: AuthenticatedRequestUser,
  ): Promise<CartResponseDto> {
    return this.service.getCart(user.id);
  }

  @Post('items')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('CART_WRITE_OWN')
  @ApiOperation({ summary: 'Add or atomically re-add a Product Variant' })
  @ApiOkResponse({ type: CartResponseDto })
  addItem(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Body() input: AddCartItemRequestDto,
  ): Promise<CartResponseDto> {
    return this.service.addItem(user.id, input);
  }

  @Patch('items/:cartItemId')
  @RequirePermissions('CART_WRITE_OWN')
  @ApiOperation({ summary: 'Update an owned CartItem quantity' })
  @ApiParam({ name: 'cartItemId', format: 'uuid' })
  @ApiOkResponse({ type: CartResponseDto })
  updateItem(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param('cartItemId', new ParseUUIDPipe()) cartItemId: string,
    @Body() input: UpdateCartItemRequestDto,
  ): Promise<CartResponseDto> {
    return this.service.updateItem(user.id, cartItemId, input);
  }

  @Delete('items/:cartItemId')
  @RequirePermissions('CART_WRITE_OWN')
  @ApiOperation({ summary: 'Remove an owned CartItem' })
  @ApiParam({ name: 'cartItemId', format: 'uuid' })
  @ApiOkResponse({ type: CartResponseDto })
  removeItem(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param('cartItemId', new ParseUUIDPipe()) cartItemId: string,
  ): Promise<CartResponseDto> {
    return this.service.removeItem(user.id, cartItemId);
  }

  @Delete()
  @RequirePermissions('CART_WRITE_OWN')
  @ApiOperation({
    summary: 'Clear CartItems while keeping the persistent Cart',
  })
  @ApiOkResponse({ type: CartResponseDto })
  clearCart(
    @CurrentUser() user: AuthenticatedRequestUser,
  ): Promise<CartResponseDto> {
    return this.service.clearCart(user.id);
  }
}
