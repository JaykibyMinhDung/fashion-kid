import { HttpStatus, Injectable } from '@nestjs/common';
import { ApiException } from '../../common/errors/api-error';
import type {
  AdminProductStatusResponseDto,
  UpdateAdminProductStatusRequestDto,
} from './dto/admin-catalog.dto';
import {
  AdminCatalogConflictError,
  AdminCatalogNotFoundError,
  PrismaAdminCatalogRepository,
} from './repositories/prisma-admin-catalog.repository';

function notFoundError(): ApiException {
  return new ApiException(
    HttpStatus.NOT_FOUND,
    'NOT_FOUND',
    'Không tìm thấy sản phẩm',
  );
}

function conflictError(error: AdminCatalogConflictError): ApiException {
  return new ApiException(HttpStatus.CONFLICT, error.code, error.message);
}

@Injectable()
export class AdminCatalogService {
  constructor(private readonly repository: PrismaAdminCatalogRepository) {}

  async updateProductStatus(
    actorId: string,
    productId: string,
    body: UpdateAdminProductStatusRequestDto,
  ): Promise<AdminProductStatusResponseDto> {
    try {
      return await this.repository.updateProductStatus(
        actorId,
        productId,
        body.status,
      );
    } catch (error) {
      if (error instanceof AdminCatalogNotFoundError) throw notFoundError();
      if (error instanceof AdminCatalogConflictError)
        throw conflictError(error);
      throw error;
    }
  }
}
