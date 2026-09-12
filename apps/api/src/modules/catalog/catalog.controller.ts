import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { Public } from '../../common/auth/public.decorator';
import {
  CatalogBrandResponseDto,
  CatalogCategoryResponseDto,
  CatalogColorResponseDto,
  CatalogProductDetailResponseDto,
  CatalogProductListResponseDto,
  CatalogSizeResponseDto,
  ListProductsQueryDto,
} from './dto/catalog.dto';
import { CatalogService } from './catalog.service';

@ApiTags('catalog')
@Controller()
@Public()
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get('products')
  @ApiOperation({ summary: 'List public sellable products' })
  @ApiOkResponse({ type: CatalogProductListResponseDto })
  listProducts(
    @Query() query: ListProductsQueryDto,
  ): Promise<CatalogProductListResponseDto> {
    return this.catalogService.listProducts(query);
  }

  @Get('products/:slug')
  @ApiOperation({ summary: 'Read a public product by slug' })
  @ApiParam({ name: 'slug' })
  @ApiOkResponse({ type: CatalogProductDetailResponseDto })
  getProductBySlug(
    @Param('slug') slug: string,
  ): Promise<CatalogProductDetailResponseDto> {
    return this.catalogService.getProductBySlug(slug);
  }

  @Get('categories')
  @ApiOperation({ summary: 'List active catalog categories' })
  @ApiOkResponse({ type: CatalogCategoryResponseDto, isArray: true })
  listCategories(): Promise<CatalogCategoryResponseDto[]> {
    return this.catalogService.listCategories();
  }

  @Get('brands')
  @ApiOperation({ summary: 'List active catalog brands' })
  @ApiOkResponse({ type: CatalogBrandResponseDto, isArray: true })
  listBrands(): Promise<CatalogBrandResponseDto[]> {
    return this.catalogService.listBrands();
  }

  @Get('sizes')
  @ApiOperation({ summary: 'List active catalog sizes' })
  @ApiOkResponse({ type: CatalogSizeResponseDto, isArray: true })
  listSizes(): Promise<CatalogSizeResponseDto[]> {
    return this.catalogService.listSizes();
  }

  @Get('colors')
  @ApiOperation({ summary: 'List active catalog colors' })
  @ApiOkResponse({ type: CatalogColorResponseDto, isArray: true })
  listColors(): Promise<CatalogColorResponseDto[]> {
    return this.catalogService.listColors();
  }
}
