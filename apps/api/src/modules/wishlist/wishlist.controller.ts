import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
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
import type { AuthenticatedRequestUser } from '../../common/auth/authenticated-user';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import {
  AddToWishlistDto,
  WishlistCheckResponseDto,
  WishlistResponseDto,
} from './dto/wishlist.dto';
import { WishlistService } from './wishlist.service';

@ApiTags('wishlist')
@ApiBearerAuth()
@Controller('wishlist')
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  @Get()
  @RequirePermissions('WISHLIST_READ_OWN')
  @ApiOperation({ summary: 'Lấy danh sách sản phẩm yêu thích' })
  @ApiOkResponse({ type: WishlistResponseDto })
  async getWishlist(
    @CurrentUser() user: AuthenticatedRequestUser,
  ): Promise<WishlistResponseDto> {
    const items = await this.wishlistService.getWishlist(user.id);
    return { items, total: items.length };
  }

  @Post()
  @RequirePermissions('WISHLIST_WRITE_OWN')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Thêm sản phẩm vào danh sách yêu thích' })
  async addToWishlist(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Body() dto: AddToWishlistDto,
  ): Promise<{ message: string }> {
    await this.wishlistService.addToWishlist(user.id, dto.productId);
    return { message: 'Product added to wishlist' };
  }

  @Delete(':productId')
  @RequirePermissions('WISHLIST_WRITE_OWN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Xóa sản phẩm khỏi danh sách yêu thích' })
  @ApiParam({ name: 'productId', description: 'Product UUID to remove' })
  async removeFromWishlist(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param('productId', new ParseUUIDPipe()) productId: string,
  ): Promise<{ message: string }> {
    await this.wishlistService.removeFromWishlist(user.id, productId);
    return { message: 'Product removed from wishlist' };
  }

  @Get('check/:productId')
  @RequirePermissions('WISHLIST_READ_OWN')
  @ApiOperation({ summary: 'Kiểm tra sản phẩm có trong danh sách yêu thích' })
  @ApiParam({ name: 'productId', description: 'Product UUID to check' })
  @ApiOkResponse({ type: WishlistCheckResponseDto })
  async checkInWishlist(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param('productId', new ParseUUIDPipe()) productId: string,
  ): Promise<WishlistCheckResponseDto> {
    const inWishlist = await this.wishlistService.isInWishlist(
      user.id,
      productId,
    );
    return { inWishlist };
  }
}
