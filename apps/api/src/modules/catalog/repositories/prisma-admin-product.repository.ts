import { Injectable } from '@nestjs/common';
import type { Prisma, VariantStatus } from '../../../generated/prisma/client';
import {
  EntityStatus,
  ProductStatus as ProductStatusEnum,
  VariantStatus as VariantStatusEnum,
} from '../../../generated/prisma/client';
import { PrismaService } from '../../../database/prisma/prisma.service';
import type { PrismaTransactionClient } from '../../../database/prisma/prisma.types';
import type {
  AdminProductDetailResponseDto,
  AdminProductImageDeleteResponseDto,
  AdminProductImageResponseDto,
  AdminProductListResponseDto,
  AdminProductSummaryResponseDto,
  AdminVariantResponseDto,
  CreateAdminProductImageRequestDto,
  CreateAdminProductRequestDto,
  CreateAdminVariantRequestDto,
  ListAdminProductsQueryDto,
  UpdateAdminProductImageRequestDto,
  UpdateAdminProductRequestDto,
  UpdateAdminVariantRequestDto,
} from '../dto/admin-product.dto';

export type AdminProductConflictReason =
  | 'UNIQUE'
  | 'INVALID_REFERENCE'
  | 'ACTIVATION_BLOCKED'
  | 'PRIMARY_IMAGE_REQUIRED'
  | 'STATUS_UNCHANGED'
  | 'INVALID_PRICE';

export class AdminProductNotFoundError extends Error {}
export class AdminProductConflictError extends Error {
  constructor(
    readonly reason: AdminProductConflictReason,
    readonly detail = '',
  ) {
    super(reason);
  }
}

const PRODUCT_SUMMARY_SELECT = {
  id: true,
  categoryId: true,
  brandId: true,
  name: true,
  slug: true,
  description: true,
  gender: true,
  ageGroup: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  category: { select: { name: true } },
  brand: { select: { name: true } },
  images: { select: { id: true } },
  variants: { select: { status: true } },
} satisfies Prisma.ProductSelect;

const PRODUCT_DETAIL_INCLUDE = {
  category: { select: { name: true } },
  brand: { select: { name: true } },
  images: {
    orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }, { id: 'asc' }],
  },
  variants: {
    orderBy: [{ sku: 'asc' }, { id: 'asc' }],
    include: {
      size: { select: { id: true, code: true, name: true, sortOrder: true } },
      color: { select: { id: true, code: true, name: true, hexCode: true } },
    },
  },
} satisfies Prisma.ProductInclude;

const VARIANT_INCLUDE = {
  size: {
    select: { id: true, code: true, name: true, sortOrder: true, status: true },
  },
  color: {
    select: { id: true, code: true, name: true, hexCode: true, status: true },
  },
} satisfies Prisma.ProductVariantInclude;

type ProductSummaryRow = Prisma.ProductGetPayload<{
  select: typeof PRODUCT_SUMMARY_SELECT;
}>;
type ProductDetailRow = Prisma.ProductGetPayload<{
  include: typeof PRODUCT_DETAIL_INCLUDE;
}>;
type VariantRow = Prisma.ProductVariantGetPayload<{
  include: typeof VARIANT_INCLUDE;
}>;

const MAX_DB_BIGINT = 9_223_372_036_854_775_807n;

function jsonObject(value: object): Prisma.InputJsonObject {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined),
  );
}

function isPrismaCode(error: unknown, code: string): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === code
  );
}

function parsePrice(value: string): bigint {
  try {
    const parsed = BigInt(value);
    if (parsed < 0n || parsed > MAX_DB_BIGINT) throw new Error('range');
    return parsed;
  } catch {
    throw new AdminProductConflictError(
      'INVALID_PRICE',
      'Giá vượt giới hạn lưu trữ',
    );
  }
}

function summaryResponse(
  row: ProductSummaryRow,
): AdminProductSummaryResponseDto {
  return {
    id: row.id,
    categoryId: row.categoryId,
    categoryName: row.category.name,
    brandId: row.brandId,
    brandName: row.brand?.name ?? null,
    name: row.name,
    slug: row.slug,
    description: row.description,
    gender: row.gender,
    ageGroup: row.ageGroup,
    status: row.status,
    imageCount: row.images.length,
    variantCount: row.variants.length,
    activeVariantCount: row.variants.filter(
      (variant) => variant.status === VariantStatusEnum.ACTIVE,
    ).length,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function imageResponse(row: {
  id: string;
  productId: string;
  url: string;
  altText: string | null;
  sortOrder: number;
  isPrimary: boolean;
}): AdminProductImageResponseDto {
  return row;
}

function variantResponse(row: VariantRow): AdminVariantResponseDto {
  return {
    id: row.id,
    productId: row.productId,
    sizeId: row.sizeId,
    colorId: row.colorId,
    sku: row.sku,
    price: row.price.toString(),
    weightGrams: row.weightGrams,
    lengthCm: row.lengthCm,
    widthCm: row.widthCm,
    heightCm: row.heightCm,
    status: row.status,
    size: {
      id: row.size.id,
      code: row.size.code,
      name: row.size.name,
      sortOrder: row.size.sortOrder,
    },
    color: {
      id: row.color.id,
      code: row.color.code,
      name: row.color.name,
      hexCode: row.color.hexCode,
    },
  };
}

function detailResponse(row: ProductDetailRow): AdminProductDetailResponseDto {
  return {
    id: row.id,
    categoryId: row.categoryId,
    categoryName: row.category.name,
    brandId: row.brandId,
    brandName: row.brand?.name ?? null,
    name: row.name,
    slug: row.slug,
    description: row.description,
    gender: row.gender,
    ageGroup: row.ageGroup,
    status: row.status,
    imageCount: row.images.length,
    variantCount: row.variants.length,
    activeVariantCount: row.variants.filter(
      (variant) => variant.status === VariantStatusEnum.ACTIVE,
    ).length,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    images: row.images.map(imageResponse),
    variants: row.variants.map(variantResponse),
  };
}

function orderByFor(
  sort: ListAdminProductsQueryDto['sort'],
): Prisma.ProductOrderByWithRelationInput {
  switch (sort) {
    case 'createdAt:asc':
      return { createdAt: 'asc' };
    case 'name:asc':
      return { name: 'asc' };
    case 'name:desc':
      return { name: 'desc' };
    case 'status:asc':
      return { status: 'asc' };
    case 'status:desc':
      return { status: 'desc' };
    default:
      return { createdAt: 'desc' };
  }
}

@Injectable()
export class PrismaAdminProductRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listProducts(
    query: ListAdminProductsQueryDto,
  ): Promise<AdminProductListResponseDto> {
    const where: Prisma.ProductWhereInput = {
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(query.brandId ? { brandId: query.brandId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.q
        ? {
            OR: [
              { name: { contains: query.q, mode: 'insensitive' } },
              { slug: { contains: query.q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const skip = (query.page - 1) * query.limit;
    const [rows, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        select: PRODUCT_SUMMARY_SELECT,
        orderBy: [orderByFor(query.sort), { id: 'asc' }],
        skip,
        take: query.limit,
      }),
      this.prisma.product.count({ where }),
    ]);
    return {
      items: rows.map(summaryResponse),
      page: query.page,
      limit: query.limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / query.limit),
    };
  }

  async getProduct(id: string): Promise<AdminProductDetailResponseDto> {
    const row = await this.prisma.product.findUnique({
      where: { id },
      include: PRODUCT_DETAIL_INCLUDE,
    });
    if (!row) throw new AdminProductNotFoundError();
    return detailResponse(row);
  }

  async createProduct(
    actorId: string,
    input: CreateAdminProductRequestDto,
  ): Promise<AdminProductDetailResponseDto> {
    await this.assertReferences(input.categoryId, input.brandId);
    try {
      const row = await this.prisma.product.create({
        data: {
          categoryId: input.categoryId,
          brandId: input.brandId ?? null,
          name: input.name,
          slug: input.slug,
          description: input.description ?? null,
          gender: input.gender ?? null,
          ageGroup: input.ageGroup ?? null,
          status: ProductStatusEnum.DISABLED,
        },
        include: PRODUCT_DETAIL_INCLUDE,
      });
      await this.prisma.auditLog.create({
        data: {
          actorId,
          action: 'PRODUCT_CREATED',
          entityType: 'PRODUCT',
          entityId: row.id,
          newValues: { slug: row.slug, status: row.status },
        },
      });
      return detailResponse(row);
    } catch (error) {
      if (isPrismaCode(error, 'P2002'))
        throw new AdminProductConflictError(
          'UNIQUE',
          'Slug sản phẩm đã tồn tại',
        );
      if (isPrismaCode(error, 'P2003'))
        throw new AdminProductConflictError('INVALID_REFERENCE');
      throw error;
    }
  }

  async updateProduct(
    actorId: string,
    id: string,
    input: UpdateAdminProductRequestDto,
  ): Promise<AdminProductDetailResponseDto> {
    await this.assertProduct(id);
    await this.assertReferences(input.categoryId, input.brandId);
    try {
      const row = await this.prisma.product.update({
        where: { id },
        data: {
          ...(input.categoryId !== undefined
            ? { categoryId: input.categoryId }
            : {}),
          ...(input.brandId !== undefined ? { brandId: input.brandId } : {}),
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.slug !== undefined ? { slug: input.slug } : {}),
          ...(input.description !== undefined
            ? { description: input.description }
            : {}),
          ...(input.gender !== undefined ? { gender: input.gender } : {}),
          ...(input.ageGroup !== undefined ? { ageGroup: input.ageGroup } : {}),
        },
        include: PRODUCT_DETAIL_INCLUDE,
      });
      await this.prisma.auditLog.create({
        data: {
          actorId,
          action: 'PRODUCT_UPDATED',
          entityType: 'PRODUCT',
          entityId: id,
          newValues: jsonObject(input),
        },
      });
      return detailResponse(row);
    } catch (error) {
      if (isPrismaCode(error, 'P2002'))
        throw new AdminProductConflictError(
          'UNIQUE',
          'Slug sản phẩm đã tồn tại',
        );
      if (isPrismaCode(error, 'P2003'))
        throw new AdminProductConflictError('INVALID_REFERENCE');
      throw error;
    }
  }

  async createVariant(
    actorId: string,
    productId: string,
    input: CreateAdminVariantRequestDto,
  ): Promise<AdminVariantResponseDto> {
    await this.assertProduct(productId);
    const price = parsePrice(input.price);
    await this.assertVariantReferences(input.sizeId, input.colorId);
    try {
      const row = await this.prisma.productVariant.create({
        data: {
          productId,
          sizeId: input.sizeId,
          colorId: input.colorId,
          sku: input.sku,
          price,
          weightGrams: input.weightGrams ?? null,
          lengthCm: input.lengthCm ?? null,
          widthCm: input.widthCm ?? null,
          heightCm: input.heightCm ?? null,
          status: VariantStatusEnum.DISABLED,
        },
        include: VARIANT_INCLUDE,
      });
      await this.prisma.auditLog.create({
        data: {
          actorId,
          action: 'VARIANT_CREATED',
          entityType: 'PRODUCT_VARIANT',
          entityId: row.id,
          newValues: { sku: row.sku, status: row.status },
        },
      });
      return variantResponse(row);
    } catch (error) {
      if (isPrismaCode(error, 'P2002'))
        throw new AdminProductConflictError(
          'UNIQUE',
          'SKU hoặc tổ hợp size/color đã tồn tại',
        );
      if (isPrismaCode(error, 'P2003'))
        throw new AdminProductConflictError('INVALID_REFERENCE');
      throw error;
    }
  }

  async updateVariant(
    actorId: string,
    id: string,
    input: UpdateAdminVariantRequestDto,
  ): Promise<AdminVariantResponseDto> {
    return this.prisma.$transaction(async (transaction) => {
      await this.lockVariant(transaction, id);
      const current = await transaction.productVariant.findUnique({
        where: { id },
        include: VARIANT_INCLUDE,
      });
      if (!current) throw new AdminProductNotFoundError();
      await this.assertVariantReferencesInTransaction(
        transaction,
        input.sizeId,
        input.colorId,
      );
      try {
        const row = await transaction.productVariant.update({
          where: { id },
          data: {
            ...(input.sizeId !== undefined ? { sizeId: input.sizeId } : {}),
            ...(input.colorId !== undefined ? { colorId: input.colorId } : {}),
            ...(input.price !== undefined
              ? { price: parsePrice(input.price) }
              : {}),
            ...(input.weightGrams !== undefined
              ? { weightGrams: input.weightGrams }
              : {}),
            ...(input.lengthCm !== undefined
              ? { lengthCm: input.lengthCm }
              : {}),
            ...(input.widthCm !== undefined ? { widthCm: input.widthCm } : {}),
            ...(input.heightCm !== undefined
              ? { heightCm: input.heightCm }
              : {}),
          },
          include: VARIANT_INCLUDE,
        });
        if (row.status === VariantStatusEnum.ACTIVE) {
          this.validateVariantActivation(row);
        }
        await transaction.auditLog.create({
          data: {
            actorId,
            action: 'VARIANT_UPDATED',
            entityType: 'PRODUCT_VARIANT',
            entityId: id,
            newValues: jsonObject(input),
          },
        });
        return variantResponse(row);
      } catch (error) {
        if (isPrismaCode(error, 'P2002'))
          throw new AdminProductConflictError(
            'UNIQUE',
            'Tổ hợp size/color đã tồn tại',
          );
        if (isPrismaCode(error, 'P2003'))
          throw new AdminProductConflictError('INVALID_REFERENCE');
        throw error;
      }
    });
  }

  async updateVariantStatus(
    actorId: string,
    id: string,
    status: VariantStatus,
  ): Promise<AdminVariantResponseDto> {
    return this.prisma.$transaction(async (transaction) => {
      const current = await this.getVariantForStatus(transaction, id);
      if (!current) throw new AdminProductNotFoundError();
      if (current.status === status)
        throw new AdminProductConflictError(
          'STATUS_UNCHANGED',
          status === VariantStatusEnum.ACTIVE
            ? 'Variant đã ACTIVE'
            : 'Variant đã DISABLED',
        );
      if (status === VariantStatusEnum.ACTIVE)
        this.validateVariantActivation(current);
      const updated = await transaction.productVariant.update({
        where: { id },
        data: { status },
        include: VARIANT_INCLUDE,
      });
      await transaction.auditLog.create({
        data: {
          actorId,
          action:
            status === VariantStatusEnum.ACTIVE
              ? 'VARIANT_ACTIVATED'
              : 'VARIANT_DISABLED',
          entityType: 'PRODUCT_VARIANT',
          entityId: id,
          oldValues: { status: current.status },
          newValues: { status },
        },
      });
      return variantResponse(updated);
    });
  }

  async createImage(
    actorId: string,
    productId: string,
    input: CreateAdminProductImageRequestDto,
  ): Promise<AdminProductImageResponseDto> {
    return this.prisma.$transaction(async (transaction) => {
      await this.lockProduct(transaction, productId);
      if (input.isPrimary) {
        await transaction.productImage.updateMany({
          where: { productId },
          data: { isPrimary: false },
        });
      }
      const row = await transaction.productImage.create({
        data: {
          productId,
          url: input.url,
          altText: input.altText ?? null,
          sortOrder: input.sortOrder ?? 0,
          isPrimary: input.isPrimary ?? false,
        },
      });
      await transaction.auditLog.create({
        data: {
          actorId,
          action: 'PRODUCT_IMAGE_CREATED',
          entityType: 'PRODUCT_IMAGE',
          entityId: row.id,
          newValues: { productId, isPrimary: row.isPrimary },
        },
      });
      return imageResponse(row);
    });
  }

  async updateImage(
    actorId: string,
    id: string,
    input: UpdateAdminProductImageRequestDto,
  ): Promise<AdminProductImageResponseDto> {
    return this.prisma.$transaction(async (transaction) => {
      const initial = await transaction.productImage.findUnique({
        where: { id },
        select: { productId: true },
      });
      if (!initial) throw new AdminProductNotFoundError();
      await this.lockProduct(transaction, initial.productId);
      const current = await transaction.productImage.findUnique({
        where: { id },
      });
      if (!current) throw new AdminProductNotFoundError();
      if (input.isPrimary === true) {
        await transaction.productImage.updateMany({
          where: { productId: current.productId, id: { not: id } },
          data: { isPrimary: false },
        });
      } else if (input.isPrimary === false && current.isPrimary) {
        await transaction.productImage.update({
          where: { id },
          data: { isPrimary: false },
        });
        const replacement = await transaction.productImage.findFirst({
          where: { productId: current.productId, id: { not: id } },
          orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
          select: { id: true },
        });
        if (!replacement) {
          const product = await transaction.product.findUnique({
            where: { id: current.productId },
            select: { status: true },
          });
          if (product?.status === ProductStatusEnum.ACTIVE)
            throw new AdminProductConflictError(
              'PRIMARY_IMAGE_REQUIRED',
              'Sản phẩm ACTIVE phải có ảnh primary',
            );
        } else {
          await transaction.productImage.update({
            where: { id: replacement.id },
            data: { isPrimary: true },
          });
        }
      }
      const row = await transaction.productImage.update({
        where: { id },
        data: {
          ...(input.url !== undefined ? { url: input.url } : {}),
          ...(input.altText !== undefined ? { altText: input.altText } : {}),
          ...(input.sortOrder !== undefined
            ? { sortOrder: input.sortOrder }
            : {}),
          ...(input.isPrimary !== undefined
            ? { isPrimary: input.isPrimary }
            : {}),
        },
      });
      await transaction.auditLog.create({
        data: {
          actorId,
          action: 'PRODUCT_IMAGE_UPDATED',
          entityType: 'PRODUCT_IMAGE',
          entityId: id,
          newValues: jsonObject(input),
        },
      });
      return imageResponse(row);
    });
  }

  async deleteImage(
    actorId: string,
    id: string,
  ): Promise<AdminProductImageDeleteResponseDto> {
    return this.prisma.$transaction(async (transaction) => {
      const initial = await transaction.productImage.findUnique({
        where: { id },
        select: { productId: true },
      });
      if (!initial) throw new AdminProductNotFoundError();
      await this.lockProduct(transaction, initial.productId);
      const current = await transaction.productImage.findUnique({
        where: { id },
      });
      if (!current) throw new AdminProductNotFoundError();
      if (current.isPrimary) {
        await transaction.productImage.update({
          where: { id },
          data: { isPrimary: false },
        });
        const replacement = await transaction.productImage.findFirst({
          where: { productId: current.productId, id: { not: id } },
          orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
          select: { id: true },
        });
        if (!replacement) {
          const product = await transaction.product.findUnique({
            where: { id: current.productId },
            select: { status: true },
          });
          if (product?.status === ProductStatusEnum.ACTIVE)
            throw new AdminProductConflictError(
              'PRIMARY_IMAGE_REQUIRED',
              'Sản phẩm ACTIVE phải có ảnh primary',
            );
        } else {
          await transaction.productImage.update({
            where: { id: replacement.id },
            data: { isPrimary: true },
          });
        }
      }
      await transaction.productImage.delete({ where: { id } });
      await transaction.auditLog.create({
        data: {
          actorId,
          action: 'PRODUCT_IMAGE_DELETED',
          entityType: 'PRODUCT_IMAGE',
          entityId: id,
          oldValues: {
            productId: current.productId,
            isPrimary: current.isPrimary,
          },
        },
      });
      return { id, deleted: true };
    });
  }

  private async assertProduct(id: string): Promise<void> {
    const row = await this.prisma.product.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!row) throw new AdminProductNotFoundError();
  }

  private async assertReferences(
    categoryId?: string,
    brandId?: string | null,
  ): Promise<void> {
    if (categoryId !== undefined) {
      const category = await this.prisma.category.findUnique({
        where: { id: categoryId },
        select: { id: true },
      });
      if (!category)
        throw new AdminProductConflictError(
          'INVALID_REFERENCE',
          'Danh mục không tồn tại',
        );
    }
    if (brandId !== undefined && brandId !== null) {
      const brand = await this.prisma.brand.findUnique({
        where: { id: brandId },
        select: { id: true },
      });
      if (!brand)
        throw new AdminProductConflictError(
          'INVALID_REFERENCE',
          'Thương hiệu không tồn tại',
        );
    }
  }

  private async assertVariantReferences(
    sizeId?: string,
    colorId?: string,
  ): Promise<void> {
    if (sizeId !== undefined) {
      const size = await this.prisma.size.findUnique({
        where: { id: sizeId },
        select: { id: true },
      });
      if (!size)
        throw new AdminProductConflictError(
          'INVALID_REFERENCE',
          'Size không tồn tại',
        );
    }
    if (colorId !== undefined) {
      const color = await this.prisma.color.findUnique({
        where: { id: colorId },
        select: { id: true },
      });
      if (!color)
        throw new AdminProductConflictError(
          'INVALID_REFERENCE',
          'Color không tồn tại',
        );
    }
  }

  private async assertVariantReferencesInTransaction(
    transaction: PrismaTransactionClient,
    sizeId?: string,
    colorId?: string,
  ): Promise<void> {
    if (sizeId !== undefined) {
      const size = await transaction.size.findUnique({
        where: { id: sizeId },
        select: { id: true },
      });
      if (!size)
        throw new AdminProductConflictError(
          'INVALID_REFERENCE',
          'Size không tồn tại',
        );
    }
    if (colorId !== undefined) {
      const color = await transaction.color.findUnique({
        where: { id: colorId },
        select: { id: true },
      });
      if (!color)
        throw new AdminProductConflictError(
          'INVALID_REFERENCE',
          'Color không tồn tại',
        );
    }
  }

  private async lockProduct(
    transaction: PrismaTransactionClient,
    productId: string,
  ): Promise<void> {
    const rows = await transaction.$queryRaw<Array<{ id: string }>>`
      SELECT "id" FROM "products" WHERE "id" = ${productId}::uuid FOR UPDATE
    `;
    if (!rows[0]) throw new AdminProductNotFoundError();
  }

  private async lockVariant(
    transaction: PrismaTransactionClient,
    variantId: string,
  ): Promise<void> {
    const rows = await transaction.$queryRaw<Array<{ id: string }>>`
      SELECT "id"
      FROM "product_variants"
      WHERE "id" = ${variantId}::uuid
      FOR UPDATE
    `;
    if (!rows[0]) throw new AdminProductNotFoundError();
  }

  private async getVariantForStatus(
    transaction: PrismaTransactionClient,
    id: string,
  ): Promise<{
    id: string;
    status: VariantStatus;
    price: bigint;
    weightGrams: number | null;
    lengthCm: number | null;
    widthCm: number | null;
    heightCm: number | null;
    size: { status: EntityStatus };
    color: { status: EntityStatus };
  } | null> {
    const rows = await transaction.$queryRaw<Array<{ id: string }>>`
      SELECT "id" FROM "product_variants" WHERE "id" = ${id}::uuid FOR UPDATE
    `;
    if (!rows[0]) return null;
    return transaction.productVariant.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        price: true,
        weightGrams: true,
        lengthCm: true,
        widthCm: true,
        heightCm: true,
        size: { select: { status: true } },
        color: { select: { status: true } },
      },
    });
  }

  private validateVariantActivation(row: {
    price: bigint;
    weightGrams: number | null;
    lengthCm: number | null;
    widthCm: number | null;
    heightCm: number | null;
    size: { status: EntityStatus };
    color: { status: EntityStatus };
  }): void {
    if (
      row.price < 0n ||
      row.weightGrams === null ||
      row.weightGrams <= 0 ||
      row.lengthCm === null ||
      row.lengthCm <= 0 ||
      row.widthCm === null ||
      row.widthCm <= 0 ||
      row.heightCm === null ||
      row.heightCm <= 0
    ) {
      throw new AdminProductConflictError(
        'ACTIVATION_BLOCKED',
        'Variant ACTIVE phải có giá và kích thước vận chuyển dương',
      );
    }
    if (row.size.status !== EntityStatus.ACTIVE)
      throw new AdminProductConflictError(
        'ACTIVATION_BLOCKED',
        'Size của variant chưa hoạt động',
      );
    if (row.color.status !== EntityStatus.ACTIVE)
      throw new AdminProductConflictError(
        'ACTIVATION_BLOCKED',
        'Color của variant chưa hoạt động',
      );
  }
}
