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
  Req,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { Request } from 'express';

import { RequirePermissions } from '../../../authorization/require-permissions.decorator';
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
  async getWishlist(@Req() req: Request): Promise<WishlistResponseDto> {
    const userId = (req as any).user.sub;
    const items = await this.wishlistService.getWishlist(userId);
    return { items, total: items.length };
  }

  @Post()
  @RequirePermissions('WISHLIST_WRITE_OWN')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Thêm sản phẩm vào danh sách yêu thích' })
  async addToWishlist(
    @Req() req: Request,
    @Body() dto: AddToWishlistDto,
  ): Promise<{ message: string }> {
    const userId = (req as any).user.sub;
    await this.wishlistService.addToWishlist(userId, dto.productId);
    return { message: 'Product added to wishlist' };
  }

  @Delete(':productId')
  @RequirePermissions('WISHLIST_WRITE_OWN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Xóa sản phẩm khỏi danh sách yêu thích' })
  @ApiParam({ name: 'productId', description: 'Product UUID to remove' })
  async removeFromWishlist(
    @Req() req: Request,
    @Param('productId', new ParseUUIDPipe()) productId: string,
  ): Promise<{ message: string }> {
    const userId = (req as any).user.sub;
    await this.wishlistService.removeFromWishlist(userId, productId);
    return { message: 'Product removed from wishlist' };
  }

  @Get('check/:productId')
  @RequirePermissions('WISHLIST_READ_OWN')
  @ApiOperation({ summary: 'Kiểm tra sản phẩm có trong danh sách yêu thích' })
  @ApiParam({ name: 'productId', description: 'Product UUID to check' })
  @ApiOkResponse({ type: WishlistCheckResponseDto })
  async checkInWishlist(
    @Req() req: Request,
    @Param('productId', new ParseUUIDPipe()) productId: string,
  ): Promise<WishlistCheckResponseDto> {
    const userId = (req as any).user.sub;
    const inWishlist = await this.wishlistService.isInWishlist(userId, productId);
    return { inWishlist };
  }
}
