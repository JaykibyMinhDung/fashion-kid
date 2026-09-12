import { HttpStatus, Injectable } from '@nestjs/common';
import { ApiException } from '../../common/errors/api-error';
import type {
  CatalogBrandResponseDto,
  CatalogCategoryResponseDto,
  CatalogColorResponseDto,
  CatalogProductDetailResponseDto,
  CatalogProductListResponseDto,
  CatalogSizeResponseDto,
  ListProductsQueryDto,
} from './dto/catalog.dto';
import { PrismaCatalogRepository } from './repositories/prisma-catalog.repository';

function productNotFound(): ApiException {
  return new ApiException(
    HttpStatus.NOT_FOUND,
    'NOT_FOUND',
    'Không tìm thấy sản phẩm',
  );
}

@Injectable()
export class CatalogService {
  constructor(private readonly repository: PrismaCatalogRepository) {}

  listProducts(
    query: ListProductsQueryDto,
  ): Promise<CatalogProductListResponseDto> {
    return this.repository.listProducts(query);
  }

  async getProductBySlug(
    slug: string,
  ): Promise<CatalogProductDetailResponseDto> {
    const product = await this.repository.findPublicProductBySlug(slug);
    if (!product) throw productNotFound();
    return product;
  }

  async listCategories(): Promise<CatalogCategoryResponseDto[]> {
    return (await this.repository.listCategories()).map(
      ({ id, name, slug, parentId }) => ({
        id,
        name,
        slug,
        parentId,
      }),
    );
  }

  async listBrands(): Promise<CatalogBrandResponseDto[]> {
    return (await this.repository.listBrands()).map(
      ({ id, name, slug, logoUrl }) => ({
        id,
        name,
        slug,
        logoUrl,
      }),
    );
  }

  async listSizes(): Promise<CatalogSizeResponseDto[]> {
    return this.repository.listSizes();
  }

  async listColors(): Promise<CatalogColorResponseDto[]> {
    return this.repository.listColors();
  }
}
