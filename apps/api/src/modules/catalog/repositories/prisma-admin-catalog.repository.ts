import { Injectable } from '@nestjs/common';
import type { Prisma, ProductStatus } from '../../../generated/prisma/client';
import {
  EntityStatus,
  ProductStatus as ProductStatusEnum,
  VariantStatus,
} from '../../../generated/prisma/client';
import { PrismaService } from '../../../database/prisma/prisma.service';
import type { PrismaTransactionClient } from '../../../database/prisma/prisma.types';
import type { AdminProductStatusResponseDto } from '../dto/admin-catalog.dto';

export type AdminCatalogConflictCode =
  'CATALOG_ACTIVATION_BLOCKED' | 'PRODUCT_STATUS_UNCHANGED';

export class AdminCatalogNotFoundError extends Error {}
export class AdminCatalogConflictError extends Error {
  constructor(
    readonly code: AdminCatalogConflictCode,
    readonly message: string,
  ) {
    super(code);
  }
}

type ActivationRow = {
  id: string;
  name: string;
  slug: string;
  status: ProductStatus;
  category: { status: EntityStatus };
  brand: { status: EntityStatus } | null;
  images: Array<{ isPrimary: boolean }>;
  variants: Array<{
    status: VariantStatus;
    price: bigint;
    weightGrams: number | null;
    lengthCm: number | null;
    widthCm: number | null;
    heightCm: number | null;
    size: { status: EntityStatus };
    color: { status: EntityStatus };
  }>;
};

const ACTIVATION_INCLUDE = {
  category: { select: { status: true } },
  brand: { select: { status: true } },
  images: { select: { isPrimary: true } },
  variants: {
    include: {
      size: { select: { status: true } },
      color: { select: { status: true } },
    },
  },
} satisfies Prisma.ProductInclude;

function activationFailure(message: string): AdminCatalogConflictError {
  return new AdminCatalogConflictError('CATALOG_ACTIVATION_BLOCKED', message);
}

function validateActivation(row: ActivationRow): void {
  if (!row.name.trim() || !row.slug.trim()) {
    throw activationFailure('Sản phẩm phải có tên và slug hợp lệ');
  }
  if (row.category.status !== EntityStatus.ACTIVE) {
    throw activationFailure('Danh mục sản phẩm chưa hoạt động');
  }
  if (row.brand && row.brand.status !== EntityStatus.ACTIVE) {
    throw activationFailure('Thương hiệu sản phẩm chưa hoạt động');
  }

  const activeVariants = row.variants.filter(
    (variant) => variant.status === VariantStatus.ACTIVE,
  );
  if (activeVariants.length === 0) {
    throw activationFailure('Sản phẩm phải có ít nhất một variant ACTIVE');
  }
  if (row.images.filter((image) => image.isPrimary).length !== 1) {
    throw activationFailure('Sản phẩm phải có đúng một ảnh primary');
  }
  for (const variant of activeVariants) {
    if (
      variant.price < 0n ||
      variant.weightGrams === null ||
      variant.weightGrams <= 0 ||
      variant.lengthCm === null ||
      variant.lengthCm <= 0 ||
      variant.widthCm === null ||
      variant.widthCm <= 0 ||
      variant.heightCm === null ||
      variant.heightCm <= 0
    ) {
      throw activationFailure(
        'Variant ACTIVE phải có giá và kích thước vận chuyển dương',
      );
    }
    if (variant.size.status !== EntityStatus.ACTIVE) {
      throw activationFailure('Size của variant ACTIVE chưa hoạt động');
    }
    if (variant.color.status !== EntityStatus.ACTIVE) {
      throw activationFailure('Color của variant ACTIVE chưa hoạt động');
    }
  }
}

@Injectable()
export class PrismaAdminCatalogRepository {
  constructor(private readonly prisma: PrismaService) {}

  async updateProductStatus(
    actorId: string,
    productId: string,
    status: ProductStatus,
  ): Promise<AdminProductStatusResponseDto> {
    return this.prisma.$transaction(async (transaction) => {
      await this.lockProduct(transaction, productId);
      const current = await transaction.product.findUnique({
        where: { id: productId },
        include: ACTIVATION_INCLUDE,
      });
      if (!current) throw new AdminCatalogNotFoundError();
      if (current.status === status) {
        throw new AdminCatalogConflictError(
          'PRODUCT_STATUS_UNCHANGED',
          status === ProductStatusEnum.ACTIVE
            ? 'Sản phẩm đã ACTIVE'
            : 'Sản phẩm đã DISABLED',
        );
      }
      if (status === ProductStatusEnum.ACTIVE) {
        validateActivation(current);
      }

      const updated = await transaction.product.update({
        where: { id: productId },
        data: { status },
        select: { id: true, status: true },
      });
      await transaction.auditLog.create({
        data: {
          actorId,
          action:
            status === ProductStatusEnum.ACTIVE
              ? 'PRODUCT_ACTIVATED'
              : 'PRODUCT_DISABLED',
          entityType: 'PRODUCT',
          entityId: productId,
          oldValues: { status: current.status },
          newValues: { status },
        },
      });
      return updated;
    });
  }

  private async lockProduct(
    transaction: PrismaTransactionClient,
    productId: string,
  ): Promise<void> {
    const rows = await transaction.$queryRaw<Array<{ id: string }>>`
      SELECT "id"
      FROM "products"
      WHERE "id" = ${productId}::uuid
      FOR UPDATE
    `;
    if (!rows[0]) throw new AdminCatalogNotFoundError();
  }
}
