import { HttpStatus, Injectable } from '@nestjs/common';
import { ApiException } from '../../common/errors/api-error';
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
  UpdateAdminMasterStatusRequestDto,
  UpdateAdminSizeRequestDto,
} from './dto/admin-master.dto';
import {
  AdminMasterConflictError,
  AdminMasterNotFoundError,
  PrismaAdminMasterRepository,
} from './repositories/prisma-admin-master.repository';

function notFoundError(): ApiException {
  return new ApiException(
    HttpStatus.NOT_FOUND,
    'NOT_FOUND',
    'Không tìm thấy dữ liệu Catalog',
  );
}

function conflictError(
  reason: AdminMasterConflictError['reason'],
): ApiException {
  const messages = {
    UNIQUE: 'Mã hoặc slug Catalog đã tồn tại',
    INVALID_PARENT: 'Danh mục cha không tồn tại',
    SELF_PARENT: 'Danh mục không thể là cha của chính nó',
  } as const;
  return new ApiException(
    HttpStatus.CONFLICT,
    'CATALOG_MASTER_CONFLICT',
    messages[reason],
  );
}

@Injectable()
export class AdminMasterService {
  constructor(private readonly repository: PrismaAdminMasterRepository) {}

  async listCategories(
    query: ListAdminMasterQueryDto,
  ): Promise<AdminCategoryResponseDto[]> {
    return this.repository.listCategories(query);
  }
  async listBrands(
    query: ListAdminMasterQueryDto,
  ): Promise<AdminBrandResponseDto[]> {
    return this.repository.listBrands(query);
  }
  async listSizes(
    query: ListAdminMasterQueryDto,
  ): Promise<AdminSizeResponseDto[]> {
    return this.repository.listSizes(query);
  }
  async listColors(
    query: ListAdminMasterQueryDto,
  ): Promise<AdminColorResponseDto[]> {
    return this.repository.listColors(query);
  }

  async createCategory(
    input: CreateAdminCategoryRequestDto,
  ): Promise<AdminCategoryResponseDto> {
    return this.run(() => this.repository.createCategory(input));
  }
  async updateCategory(
    id: string,
    input: UpdateAdminCategoryRequestDto,
  ): Promise<AdminCategoryResponseDto> {
    return this.run(() => this.repository.updateCategory(id, input));
  }
  async createBrand(
    input: CreateAdminBrandRequestDto,
  ): Promise<AdminBrandResponseDto> {
    return this.run(() => this.repository.createBrand(input));
  }
  async updateBrand(
    id: string,
    input: UpdateAdminBrandRequestDto,
  ): Promise<AdminBrandResponseDto> {
    return this.run(() => this.repository.updateBrand(id, input));
  }
  async createSize(
    input: CreateAdminSizeRequestDto,
  ): Promise<AdminSizeResponseDto> {
    return this.run(() => this.repository.createSize(input));
  }
  async updateSize(
    id: string,
    input: UpdateAdminSizeRequestDto,
  ): Promise<AdminSizeResponseDto> {
    return this.run(() => this.repository.updateSize(id, input));
  }
  async createColor(
    input: CreateAdminColorRequestDto,
  ): Promise<AdminColorResponseDto> {
    return this.run(() => this.repository.createColor(input));
  }
  async updateColor(
    id: string,
    input: UpdateAdminColorRequestDto,
  ): Promise<AdminColorResponseDto> {
    return this.run(() => this.repository.updateColor(id, input));
  }

  async setCategoryStatus(
    id: string,
    input: UpdateAdminMasterStatusRequestDto,
  ): Promise<AdminCategoryResponseDto> {
    return this.run(() => this.repository.setCategoryStatus(id, input.status));
  }
  async setBrandStatus(
    id: string,
    input: UpdateAdminMasterStatusRequestDto,
  ): Promise<AdminBrandResponseDto> {
    return this.run(() => this.repository.setBrandStatus(id, input.status));
  }
  async setSizeStatus(
    id: string,
    input: UpdateAdminMasterStatusRequestDto,
  ): Promise<AdminSizeResponseDto> {
    return this.run(() => this.repository.setSizeStatus(id, input.status));
  }
  async setColorStatus(
    id: string,
    input: UpdateAdminMasterStatusRequestDto,
  ): Promise<AdminColorResponseDto> {
    return this.run(() => this.repository.setColorStatus(id, input.status));
  }

  private async run<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (error instanceof AdminMasterNotFoundError) throw notFoundError();
      if (error instanceof AdminMasterConflictError)
        throw conflictError(error.reason);
      throw error;
    }
  }
}
