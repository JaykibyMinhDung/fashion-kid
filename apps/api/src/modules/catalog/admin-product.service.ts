import { HttpStatus, Injectable } from '@nestjs/common';
import { ApiException } from '../../common/errors/api-error';
import type {
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
  AdminProductConflictError,
  AdminProductNotFoundError,
  PrismaAdminProductRepository,
} from './repositories/prisma-admin-product.repository';

function notFoundError(): ApiException {
  return new ApiException(
    HttpStatus.NOT_FOUND,
    'NOT_FOUND',
    'Không tìm thấy dữ liệu sản phẩm',
  );
}

function conflictError(error: AdminProductConflictError): ApiException {
  if (error.reason === 'INVALID_PRICE') {
    return new ApiException(
      HttpStatus.BAD_REQUEST,
      'VALIDATION_ERROR',
      error.detail || 'Giá không hợp lệ',
    );
  }
  const code =
    error.reason === 'ACTIVATION_BLOCKED' ||
    error.reason === 'PRIMARY_IMAGE_REQUIRED'
      ? 'CATALOG_ACTIVATION_BLOCKED'
      : error.reason === 'STATUS_UNCHANGED'
        ? 'VARIANT_STATUS_UNCHANGED'
        : 'CATALOG_MASTER_CONFLICT';
  const messages: Record<AdminProductConflictError['reason'], string> = {
    UNIQUE: error.detail || 'Slug, SKU hoặc tổ hợp size/color đã tồn tại',
    INVALID_REFERENCE: error.detail || 'Tham chiếu Catalog không tồn tại',
    ACTIVATION_BLOCKED:
      error.detail || 'Dữ liệu variant chưa đủ điều kiện ACTIVE',
    PRIMARY_IMAGE_REQUIRED:
      error.detail || 'Sản phẩm ACTIVE phải có ảnh primary',
    STATUS_UNCHANGED: error.detail || 'Trạng thái variant không thay đổi',
    INVALID_PRICE: error.detail || 'Giá không hợp lệ',
  };
  return new ApiException(HttpStatus.CONFLICT, code, messages[error.reason]);
}

@Injectable()
export class AdminProductService {
  constructor(private readonly repository: PrismaAdminProductRepository) {}

  listProducts(
    query: ListAdminProductsQueryDto,
  ): Promise<AdminProductListResponseDto> {
    return this.repository.listProducts(query);
  }

  getProduct(id: string): Promise<AdminProductDetailResponseDto> {
    return this.run(() => this.repository.getProduct(id));
  }

  createProduct(
    actorId: string,
    input: CreateAdminProductRequestDto,
  ): Promise<AdminProductDetailResponseDto> {
    return this.run(() => this.repository.createProduct(actorId, input));
  }

  updateProduct(
    actorId: string,
    id: string,
    input: UpdateAdminProductRequestDto,
  ): Promise<AdminProductDetailResponseDto> {
    return this.run(() => this.repository.updateProduct(actorId, id, input));
  }

  createVariant(
    actorId: string,
    productId: string,
    input: CreateAdminVariantRequestDto,
  ): Promise<AdminVariantResponseDto> {
    return this.run(() =>
      this.repository.createVariant(actorId, productId, input),
    );
  }

  updateVariant(
    actorId: string,
    id: string,
    input: UpdateAdminVariantRequestDto,
  ): Promise<AdminVariantResponseDto> {
    return this.run(() => this.repository.updateVariant(actorId, id, input));
  }

  updateVariantStatus(
    actorId: string,
    id: string,
    input: UpdateAdminVariantStatusRequestDto,
  ): Promise<AdminVariantResponseDto> {
    return this.run(() =>
      this.repository.updateVariantStatus(actorId, id, input.status),
    );
  }

  createImage(
    actorId: string,
    productId: string,
    input: CreateAdminProductImageRequestDto,
  ): Promise<AdminProductImageResponseDto> {
    return this.run(() =>
      this.repository.createImage(actorId, productId, input),
    );
  }

  updateImage(
    actorId: string,
    id: string,
    input: UpdateAdminProductImageRequestDto,
  ): Promise<AdminProductImageResponseDto> {
    return this.run(() => this.repository.updateImage(actorId, id, input));
  }

  deleteImage(
    actorId: string,
    id: string,
  ): Promise<AdminProductImageDeleteResponseDto> {
    return this.run(() => this.repository.deleteImage(actorId, id));
  }

  private async run<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (error instanceof AdminProductNotFoundError) throw notFoundError();
      if (error instanceof AdminProductConflictError)
        throw conflictError(error);
      throw error;
    }
  }
}
