import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { RequirePermissions } from '../../authorization/require-permissions.decorator';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import type { AuthenticatedRequestUser } from '../../common/auth/authenticated-user';
import {
  AdminProductDetailResponseDto,
  AdminProductImageDeleteResponseDto,
  AdminProductImageResponseDto,
  AdminProductListResponseDto,
  AdminVariantResponseDto,
  CreateAdminProductImageRequestDto,
  CreateAdminProductRequestDto,
  CreateAdminVariantRequestDto,
  ListAdminProductsQueryDto,
  UpdateAdminProductImageRequestDto,
  UpdateAdminProductRequestDto,
  UpdateAdminVariantRequestDto,
  UpdateAdminVariantStatusRequestDto,
} from './dto/admin-product.dto';
import {
  AdminProductStatusResponseDto,
  UpdateAdminProductStatusRequestDto,
} from './dto/admin-catalog.dto';
import { AdminCatalogService } from './admin-catalog.service';
import { AdminProductService } from './admin-product.service';

@ApiTags('admin-catalog-products')
@ApiBearerAuth()
@Controller('admin/catalog')
@RequirePermissions('CATALOG_MANAGE')
export class AdminProductController {
  constructor(
    private readonly service: AdminProductService,
    private readonly catalogService: AdminCatalogService,
  ) {}

  @Get('products')
  @ApiOperation({ summary: 'List products for catalog administration' })
  @ApiOkResponse({ type: AdminProductListResponseDto })
  listProducts(@Query() query: ListAdminProductsQueryDto) {
    return this.service.listProducts(query);
  }

  @Get('products/:id')
  @ApiOperation({ summary: 'Get an admin product with variants and images' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: AdminProductDetailResponseDto })
  getProduct(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.service.getProduct(id);
  }

  @Post('products')
  @ApiOperation({ summary: 'Create a catalog product' })
  @ApiCreatedResponse({ type: AdminProductDetailResponseDto })
  createProduct(
    @CurrentUser() actor: AuthenticatedRequestUser,
    @Body() input: CreateAdminProductRequestDto,
  ) {
    return this.service.createProduct(actor.id, input);
  }

  @Patch('products/:id')
  @ApiOperation({
    summary: 'Update catalog product fields (status is immutable here)',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: AdminProductDetailResponseDto })
  updateProduct(
    @CurrentUser() actor: AuthenticatedRequestUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() input: UpdateAdminProductRequestDto,
  ) {
    return this.service.updateProduct(actor.id, id, input);
  }

  @Patch('products/:id/status')
  @ApiOperation({ summary: 'Activate or disable a catalog product' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: AdminProductStatusResponseDto })
  updateProductStatus(
    @CurrentUser() actor: AuthenticatedRequestUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() input: UpdateAdminProductStatusRequestDto,
  ) {
    return this.catalogService.updateProductStatus(actor.id, id, input);
  }

  @Post('products/:productId/variants')
  @ApiOperation({ summary: 'Create a product variant' })
  @ApiParam({ name: 'productId', format: 'uuid' })
  @ApiCreatedResponse({ type: AdminVariantResponseDto })
  createVariant(
    @CurrentUser() actor: AuthenticatedRequestUser,
    @Param('productId', new ParseUUIDPipe()) productId: string,
    @Body() input: CreateAdminVariantRequestDto,
  ) {
    return this.service.createVariant(actor.id, productId, input);
  }

  @Patch('variants/:id')
  @ApiOperation({ summary: 'Update variant fields; SKU is immutable' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: AdminVariantResponseDto })
  updateVariant(
    @CurrentUser() actor: AuthenticatedRequestUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() input: UpdateAdminVariantRequestDto,
  ) {
    return this.service.updateVariant(actor.id, id, input);
  }

  @Patch('variants/:id/status')
  @ApiOperation({ summary: 'Activate or disable a product variant' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: AdminVariantResponseDto })
  updateVariantStatus(
    @CurrentUser() actor: AuthenticatedRequestUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() input: UpdateAdminVariantStatusRequestDto,
  ) {
    return this.service.updateVariantStatus(actor.id, id, input);
  }

  @Post('products/:productId/images')
  @ApiOperation({ summary: 'Create a product image' })
  @ApiParam({ name: 'productId', format: 'uuid' })
  @ApiCreatedResponse({ type: AdminProductImageResponseDto })
  createImage(
    @CurrentUser() actor: AuthenticatedRequestUser,
    @Param('productId', new ParseUUIDPipe()) productId: string,
    @Body() input: CreateAdminProductImageRequestDto,
  ) {
    return this.service.createImage(actor.id, productId, input);
  }

  @Patch('images/:id')
  @ApiOperation({ summary: 'Update a product image and primary flag' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: AdminProductImageResponseDto })
  updateImage(
    @CurrentUser() actor: AuthenticatedRequestUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() input: UpdateAdminProductImageRequestDto,
  ) {
    return this.service.updateImage(actor.id, id, input);
  }

  @Delete('images/:id')
  @ApiOperation({ summary: 'Delete a product image' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: AdminProductImageDeleteResponseDto })
  deleteImage(
    @CurrentUser() actor: AuthenticatedRequestUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.service.deleteImage(actor.id, id);
  }
}
