import { HttpStatus, Injectable } from '@nestjs/common';
import type { Prisma } from '../../../generated/prisma/client';
import {
  EntityStatus,
  ProductStatus,
  VariantStatus,
} from '../../../generated/prisma/client';
import { PrismaService } from '../../../database/prisma/prisma.service';
import type {
  CatalogBrandResponseDto,
  CatalogCategoryResponseDto,
  CatalogImageResponseDto,
  CatalogProductCardResponseDto,
  CatalogProductDetailResponseDto,
  CatalogVariantResponseDto,
  ListProductsQueryDto,
  ProductSort,
} from '../dto/catalog.dto';
import { ApiException } from '../../../common/errors/api-error';

const MAX_DATABASE_BIGINT = 9_223_372_036_854_775_807n;

const SELLABLE_VARIANT_WHERE = {
  status: VariantStatus.ACTIVE,
  size: { status: EntityStatus.ACTIVE },
  color: { status: EntityStatus.ACTIVE },
  weightGrams: { gt: 0 },
  lengthCm: { gt: 0 },
  widthCm: { gt: 0 },
  heightCm: { gt: 0 },
} satisfies Prisma.ProductVariantWhereInput;

const PUBLIC_PRODUCT_INCLUDE = {
  category: { select: { id: true, name: true, slug: true, parentId: true } },
  brand: { select: { id: true, name: true, slug: true, logoUrl: true } },
  images: {
    orderBy: [
      { isPrimary: 'desc' as const },
      { sortOrder: 'asc' as const },
      { id: 'asc' as const },
    ],
  },
  variants: {
    where: SELLABLE_VARIANT_WHERE,
    orderBy: [{ price: 'asc' as const }, { sku: 'asc' as const }],
    include: {
      size: { select: { id: true, code: true, name: true, sortOrder: true } },
      color: { select: { id: true, code: true, name: true, hexCode: true } },
    },
  },
} satisfies Prisma.ProductInclude;

type PublicProductRow = Prisma.ProductGetPayload<{
  include: typeof PUBLIC_PRODUCT_INCLUDE;
}>;

type PublicCategoryRow = Prisma.CategoryGetPayload<{
  select: { id: true; name: true; slug: true; parentId: true };
}>;
type PublicBrandRow = Prisma.BrandGetPayload<{
  select: { id: true; name: true; slug: true; logoUrl: true };
}>;
type PublicSizeRow = Prisma.SizeGetPayload<{
  select: { id: true; code: true; name: true; sortOrder: true };
}>;
type PublicColorRow = Prisma.ColorGetPayload<{
  select: { id: true; code: true; name: true; hexCode: true };
}>;

export type CatalogListResult = {
  items: CatalogProductCardResponseDto[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

function parsePrice(value: string | undefined): bigint | undefined {
  if (value === undefined) return undefined;
  const parsed = BigInt(value);
  if (parsed > MAX_DATABASE_BIGINT) {
    throw new ApiException(
      HttpStatus.BAD_REQUEST,
      'VALIDATION_ERROR',
      'Khoảng giá không hợp lệ',
    );
  }
  return parsed;
}

type ProductSortKey = {
  id: string;
  name: string;
  createdAt: Date;
  variants: { price: bigint }[];
};

// BE-1: sort trên "khóa" nhẹ (id/name/createdAt/min sellable price) thay vì toàn bộ graph.
function sortRows<T extends ProductSortKey>(rows: T[], sort: ProductSort): T[] {
  return [...rows].sort((left, right) => {
    if (sort === 'price_asc' || sort === 'price_desc') {
      const leftPrice = left.variants[0]?.price ?? 0n;
      const rightPrice = right.variants[0]?.price ?? 0n;
      const priceResult =
        leftPrice < rightPrice ? -1 : leftPrice > rightPrice ? 1 : 0;
      if (priceResult !== 0) {
        return sort === 'price_asc' ? priceResult : -priceResult;
      }
    } else if (sort === 'name_asc') {
      const nameResult = left.name.localeCompare(right.name, 'vi');
      if (nameResult !== 0) return nameResult;
    } else {
      const dateResult = right.createdAt.getTime() - left.createdAt.getTime();
      if (dateResult !== 0) return dateResult;
    }
    return left.id.localeCompare(right.id);
  });
}

function publicBrand(
  row: PublicBrandRow | null,
): CatalogBrandResponseDto | null {
  return row
    ? { id: row.id, name: row.name, slug: row.slug, logoUrl: row.logoUrl }
    : null;
}

function publicCategory(row: PublicCategoryRow): CatalogCategoryResponseDto {
  return { id: row.id, name: row.name, slug: row.slug, parentId: row.parentId };
}

function publicImage(
  row: PublicProductRow['images'][number],
): CatalogImageResponseDto {
  return {
    id: row.id,
    url: row.url,
    altText: row.altText,
    sortOrder: row.sortOrder,
    isPrimary: row.isPrimary,
  };
}

function publicVariant(
  row: PublicProductRow['variants'][number],
): CatalogVariantResponseDto {
  return {
    id: row.id,
    sku: row.sku,
    price: row.price.toString(10),
    status: row.status,
    size: row.size,
    color: row.color,
  };
}

function toCard(row: PublicProductRow): CatalogProductCardResponseDto {
  const prices = row.variants.map((variant) => variant.price);
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    gender: row.gender,
    ageGroup: row.ageGroup,
    category: publicCategory(row.category),
    brand: publicBrand(row.brand),
    primaryImage: row.images[0] ? publicImage(row.images[0]) : null,
    minPrice: (prices[0] ?? 0n).toString(10),
    maxPrice: (prices[prices.length - 1] ?? 0n).toString(10),
  };
}

function toDetail(row: PublicProductRow): CatalogProductDetailResponseDto {
  return {
    ...toCard(row),
    description: row.description,
    images: row.images.map(publicImage),
    variants: row.variants.map(publicVariant),
  };
}

function productWhere(
  query: Partial<ListProductsQueryDto>,
): Prisma.ProductWhereInput {
  const minPrice = parsePrice(query.minPrice);
  const maxPrice = parsePrice(query.maxPrice);
  if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
    throw new ApiException(
      HttpStatus.BAD_REQUEST,
      'VALIDATION_ERROR',
      'Khoảng giá không hợp lệ',
    );
  }
  const variantWhere: Prisma.ProductVariantWhereInput = {
    ...SELLABLE_VARIANT_WHERE,
    ...(query.size || query.color
      ? {
          ...(query.size
            ? { size: { ...SELLABLE_VARIANT_WHERE.size, code: query.size } }
            : {}),
          ...(query.color
            ? { color: { ...SELLABLE_VARIANT_WHERE.color, code: query.color } }
            : {}),
        }
      : {}),
    ...(minPrice !== undefined || maxPrice !== undefined
      ? {
          price: {
            ...(minPrice !== undefined ? { gte: minPrice } : {}),
            ...(maxPrice !== undefined ? { lte: maxPrice } : {}),
          },
        }
      : {}),
  };

  const and: Prisma.ProductWhereInput[] = [
    { OR: [{ brand: null }, { brand: { status: EntityStatus.ACTIVE } }] },
  ];
  if (query.q) {
    and.push({
      OR: [
        { name: { contains: query.q, mode: 'insensitive' } },
        { slug: { contains: query.q, mode: 'insensitive' } },
      ],
    });
  }

  return {
    status: ProductStatus.ACTIVE,
    category: {
      status: EntityStatus.ACTIVE,
      ...(query.category ? { slug: query.category } : {}),
    },
    AND: and,
    ...(query.brand
      ? { brand: { slug: query.brand, status: EntityStatus.ACTIVE } }
      : {}),
    ...(query.gender ? { gender: query.gender } : {}),
    ...(query.ageGroup ? { ageGroup: query.ageGroup } : {}),
    images: { some: { isPrimary: true } },
    variants: { some: variantWhere },
  };
}

@Injectable()
export class PrismaCatalogRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listProducts(query: ListProductsQueryDto): Promise<CatalogListResult> {
    const where = productWhere(query);
    const skip = (query.page - 1) * query.limit;

    // BE-1: phân trang id-first. Chỉ nạp khóa sắp xếp nhẹ cho toàn bộ tập lọc,
    // rồi nạp graph sản phẩm đầy đủ CHỈ cho đúng trang hiện tại.
    const [total, keyRows] = await this.prisma.$transaction([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        select: {
          id: true,
          name: true,
          createdAt: true,
          variants: {
            where: SELLABLE_VARIANT_WHERE,
            orderBy: [{ price: 'asc' as const }, { sku: 'asc' as const }],
            take: 1,
            select: { price: true },
          },
        },
      }),
    ]);

    const orderedIds = sortRows(keyRows, query.sort)
      .slice(skip, skip + query.limit)
      .map((row) => row.id);

    const pageRows =
      orderedIds.length === 0
        ? []
        : await this.prisma.product.findMany({
            where: { id: { in: orderedIds } },
            include: PUBLIC_PRODUCT_INCLUDE,
          });
    const byId = new Map(pageRows.map((row) => [row.id, row]));
    const items = orderedIds
      .map((id) => byId.get(id))
      .filter((row): row is PublicProductRow => row !== undefined)
      .map(toCard);

    return {
      items,
      page: query.page,
      limit: query.limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / query.limit),
    };
  }

  async findPublicProductBySlug(
    slug: string,
  ): Promise<CatalogProductDetailResponseDto | null> {
    const row = await this.prisma.product.findFirst({
      where: {
        slug,
        ...productWhere({}),
      },
      include: PUBLIC_PRODUCT_INCLUDE,
    });
    return row ? toDetail(row) : null;
  }

  listCategories(): Promise<PublicCategoryRow[]> {
    return this.prisma.category.findMany({
      where: { status: EntityStatus.ACTIVE },
      select: { id: true, name: true, slug: true, parentId: true },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
    });
  }

  listBrands(): Promise<PublicBrandRow[]> {
    return this.prisma.brand.findMany({
      where: { status: EntityStatus.ACTIVE },
      select: { id: true, name: true, slug: true, logoUrl: true },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
    });
  }

  listSizes(): Promise<PublicSizeRow[]> {
    return this.prisma.size.findMany({
      where: { status: EntityStatus.ACTIVE },
      select: { id: true, code: true, name: true, sortOrder: true },
      orderBy: [{ sortOrder: 'asc' }, { code: 'asc' }],
    });
  }

  listColors(): Promise<PublicColorRow[]> {
    return this.prisma.color.findMany({
      where: { status: EntityStatus.ACTIVE },
      select: { id: true, code: true, name: true, hexCode: true },
      orderBy: [{ name: 'asc' }, { code: 'asc' }],
    });
  }
}
