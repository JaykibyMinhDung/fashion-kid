import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../../generated/prisma/client';
import { EntityStatus } from '../../../generated/prisma/client';
import { PrismaService } from '../../../database/prisma/prisma.service';
import type {
  AdminBrandResponseDto,
  AdminCategoryResponseDto,
  AdminColorResponseDto,
  AdminSizeResponseDto,
  CreateAdminBrandRequestDto,
  CreateAdminCategoryRequestDto,
  CreateAdminColorRequestDto,
  CreateAdminSizeRequestDto,
  ListAdminMasterQueryDto,
  UpdateAdminBrandRequestDto,
  UpdateAdminCategoryRequestDto,
  UpdateAdminColorRequestDto,
  UpdateAdminSizeRequestDto,
} from '../dto/admin-master.dto';

export class AdminMasterNotFoundError extends Error {}
export class AdminMasterConflictError extends Error {
  constructor(readonly reason: 'UNIQUE' | 'INVALID_PARENT' | 'SELF_PARENT') {
    super(reason);
  }
}

const CATEGORY_SELECT = {
  id: true,
  parentId: true,
  name: true,
  slug: true,
  description: true,
  status: true,
} satisfies Prisma.CategorySelect;
const BRAND_SELECT = {
  id: true,
  name: true,
  slug: true,
  description: true,
  logoUrl: true,
  status: true,
} satisfies Prisma.BrandSelect;
const SIZE_SELECT = {
  id: true,
  code: true,
  name: true,
  sortOrder: true,
  status: true,
} satisfies Prisma.SizeSelect;
const COLOR_SELECT = {
  id: true,
  code: true,
  name: true,
  hexCode: true,
  status: true,
} satisfies Prisma.ColorSelect;

type CategoryRow = Prisma.CategoryGetPayload<{
  select: typeof CATEGORY_SELECT;
}>;
type BrandRow = Prisma.BrandGetPayload<{ select: typeof BRAND_SELECT }>;
type SizeRow = Prisma.SizeGetPayload<{ select: typeof SIZE_SELECT }>;
type ColorRow = Prisma.ColorGetPayload<{ select: typeof COLOR_SELECT }>;

function uniqueConflict(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === 'P2002'
  );
}

function categoryResponse(row: CategoryRow): AdminCategoryResponseDto {
  return row;
}
function brandResponse(row: BrandRow): AdminBrandResponseDto {
  return row;
}
function sizeResponse(row: SizeRow): AdminSizeResponseDto {
  return row;
}
function colorResponse(row: ColorRow): AdminColorResponseDto {
  return row;
}

@Injectable()
export class PrismaAdminMasterRepository {
  constructor(private readonly prisma: PrismaService) {}

  listCategories(query: ListAdminMasterQueryDto): Promise<CategoryRow[]> {
    return this.prisma.category.findMany({
      where: {
        ...(query.status ? { status: query.status } : {}),
        ...(query.q
          ? {
              OR: [
                { name: { contains: query.q, mode: 'insensitive' } },
                { slug: { contains: query.q, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      select: CATEGORY_SELECT,
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
    });
  }

  listBrands(query: ListAdminMasterQueryDto): Promise<BrandRow[]> {
    return this.prisma.brand.findMany({
      where: {
        ...(query.status ? { status: query.status } : {}),
        ...(query.q
          ? {
              OR: [
                { name: { contains: query.q, mode: 'insensitive' } },
                { slug: { contains: query.q, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      select: BRAND_SELECT,
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
    });
  }

  listSizes(query: ListAdminMasterQueryDto): Promise<SizeRow[]> {
    return this.prisma.size.findMany({
      where: {
        ...(query.status ? { status: query.status } : {}),
        ...(query.q
          ? {
              OR: [
                { name: { contains: query.q, mode: 'insensitive' } },
                { code: { contains: query.q, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      select: SIZE_SELECT,
      orderBy: [{ sortOrder: 'asc' }, { code: 'asc' }, { id: 'asc' }],
    });
  }

  listColors(query: ListAdminMasterQueryDto): Promise<ColorRow[]> {
    return this.prisma.color.findMany({
      where: {
        ...(query.status ? { status: query.status } : {}),
        ...(query.q
          ? {
              OR: [
                { name: { contains: query.q, mode: 'insensitive' } },
                { code: { contains: query.q, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      select: COLOR_SELECT,
      orderBy: [{ name: 'asc' }, { code: 'asc' }, { id: 'asc' }],
    });
  }

  async createCategory(
    input: CreateAdminCategoryRequestDto,
  ): Promise<AdminCategoryResponseDto> {
    await this.assertParent(input.parentId);
    try {
      return categoryResponse(
        await this.prisma.category.create({
          data: {
            name: input.name,
            slug: input.slug,
            description: input.description ?? null,
            parentId: input.parentId ?? null,
            status: input.status ?? EntityStatus.DISABLED,
          },
          select: CATEGORY_SELECT,
        }),
      );
    } catch (error) {
      if (uniqueConflict(error)) throw new AdminMasterConflictError('UNIQUE');
      throw error;
    }
  }

  async updateCategory(
    id: string,
    input: UpdateAdminCategoryRequestDto,
  ): Promise<AdminCategoryResponseDto> {
    if (input.parentId === id)
      throw new AdminMasterConflictError('SELF_PARENT');
    await this.assertExists('category', id);
    await this.assertParent(input.parentId);
    try {
      return categoryResponse(
        await this.prisma.category.update({
          where: { id },
          data: {
            ...(input.name !== undefined ? { name: input.name } : {}),
            ...(input.slug !== undefined ? { slug: input.slug } : {}),
            ...(input.description !== undefined
              ? { description: input.description }
              : {}),
            ...(input.parentId !== undefined
              ? { parentId: input.parentId }
              : {}),
          },
          select: CATEGORY_SELECT,
        }),
      );
    } catch (error) {
      if (uniqueConflict(error)) throw new AdminMasterConflictError('UNIQUE');
      throw error;
    }
  }

  async createBrand(
    input: CreateAdminBrandRequestDto,
  ): Promise<AdminBrandResponseDto> {
    try {
      return brandResponse(
        await this.prisma.brand.create({
          data: {
            name: input.name,
            slug: input.slug,
            description: input.description ?? null,
            logoUrl: input.logoUrl ?? null,
            status: input.status ?? EntityStatus.DISABLED,
          },
          select: BRAND_SELECT,
        }),
      );
    } catch (error) {
      if (uniqueConflict(error)) throw new AdminMasterConflictError('UNIQUE');
      throw error;
    }
  }

  async updateBrand(
    id: string,
    input: UpdateAdminBrandRequestDto,
  ): Promise<AdminBrandResponseDto> {
    await this.assertExists('brand', id);
    try {
      return brandResponse(
        await this.prisma.brand.update({
          where: { id },
          data: {
            ...(input.name !== undefined ? { name: input.name } : {}),
            ...(input.slug !== undefined ? { slug: input.slug } : {}),
            ...(input.description !== undefined
              ? { description: input.description }
              : {}),
            ...(input.logoUrl !== undefined ? { logoUrl: input.logoUrl } : {}),
          },
          select: BRAND_SELECT,
        }),
      );
    } catch (error) {
      if (uniqueConflict(error)) throw new AdminMasterConflictError('UNIQUE');
      throw error;
    }
  }

  async createSize(
    input: CreateAdminSizeRequestDto,
  ): Promise<AdminSizeResponseDto> {
    try {
      return sizeResponse(
        await this.prisma.size.create({
          data: {
            code: input.code,
            name: input.name,
            sortOrder: input.sortOrder ?? 0,
            status: input.status ?? EntityStatus.DISABLED,
          },
          select: SIZE_SELECT,
        }),
      );
    } catch (error) {
      if (uniqueConflict(error)) throw new AdminMasterConflictError('UNIQUE');
      throw error;
    }
  }

  async updateSize(
    id: string,
    input: UpdateAdminSizeRequestDto,
  ): Promise<AdminSizeResponseDto> {
    await this.assertExists('size', id);
    try {
      return sizeResponse(
        await this.prisma.size.update({
          where: { id },
          data: {
            ...(input.code !== undefined ? { code: input.code } : {}),
            ...(input.name !== undefined ? { name: input.name } : {}),
            ...(input.sortOrder !== undefined
              ? { sortOrder: input.sortOrder }
              : {}),
          },
          select: SIZE_SELECT,
        }),
      );
    } catch (error) {
      if (uniqueConflict(error)) throw new AdminMasterConflictError('UNIQUE');
      throw error;
    }
  }

  async createColor(
    input: CreateAdminColorRequestDto,
  ): Promise<AdminColorResponseDto> {
    try {
      return colorResponse(
        await this.prisma.color.create({
          data: {
            code: input.code,
            name: input.name,
            hexCode: input.hexCode ?? null,
            status: input.status ?? EntityStatus.DISABLED,
          },
          select: COLOR_SELECT,
        }),
      );
    } catch (error) {
      if (uniqueConflict(error)) throw new AdminMasterConflictError('UNIQUE');
      throw error;
    }
  }

  async updateColor(
    id: string,
    input: UpdateAdminColorRequestDto,
  ): Promise<AdminColorResponseDto> {
    await this.assertExists('color', id);
    try {
      return colorResponse(
        await this.prisma.color.update({
          where: { id },
          data: {
            ...(input.code !== undefined ? { code: input.code } : {}),
            ...(input.name !== undefined ? { name: input.name } : {}),
            ...(input.hexCode !== undefined ? { hexCode: input.hexCode } : {}),
          },
          select: COLOR_SELECT,
        }),
      );
    } catch (error) {
      if (uniqueConflict(error)) throw new AdminMasterConflictError('UNIQUE');
      throw error;
    }
  }

  async setCategoryStatus(
    id: string,
    status: EntityStatus,
  ): Promise<AdminCategoryResponseDto> {
    await this.assertExists('category', id);
    return categoryResponse(
      await this.prisma.category.update({
        where: { id },
        data: { status },
        select: CATEGORY_SELECT,
      }),
    );
  }
  async setBrandStatus(
    id: string,
    status: EntityStatus,
  ): Promise<AdminBrandResponseDto> {
    await this.assertExists('brand', id);
    return brandResponse(
      await this.prisma.brand.update({
        where: { id },
        data: { status },
        select: BRAND_SELECT,
      }),
    );
  }
  async setSizeStatus(
    id: string,
    status: EntityStatus,
  ): Promise<AdminSizeResponseDto> {
    await this.assertExists('size', id);
    return sizeResponse(
      await this.prisma.size.update({
        where: { id },
        data: { status },
        select: SIZE_SELECT,
      }),
    );
  }
  async setColorStatus(
    id: string,
    status: EntityStatus,
  ): Promise<AdminColorResponseDto> {
    await this.assertExists('color', id);
    return colorResponse(
      await this.prisma.color.update({
        where: { id },
        data: { status },
        select: COLOR_SELECT,
      }),
    );
  }

  private async assertParent(
    parentId: string | null | undefined,
  ): Promise<void> {
    if (parentId === undefined || parentId === null) return;
    const parent = await this.prisma.category.findUnique({
      where: { id: parentId },
      select: { id: true },
    });
    if (!parent) throw new AdminMasterConflictError('INVALID_PARENT');
  }

  private async assertExists(
    model: 'category' | 'brand' | 'size' | 'color',
    id: string,
  ): Promise<void> {
    const row =
      model === 'category'
        ? await this.prisma.category.findUnique({
            where: { id },
            select: { id: true },
          })
        : model === 'brand'
          ? await this.prisma.brand.findUnique({
              where: { id },
              select: { id: true },
            })
          : model === 'size'
            ? await this.prisma.size.findUnique({
                where: { id },
                select: { id: true },
              })
            : await this.prisma.color.findUnique({
                where: { id },
                select: { id: true },
              });
    if (!row) throw new AdminMasterNotFoundError();
  }
}
