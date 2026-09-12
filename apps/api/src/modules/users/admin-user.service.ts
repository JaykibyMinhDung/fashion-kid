import { HttpStatus, Injectable } from '@nestjs/common';
import { ApiException } from '../../common/errors/api-error';
import type { ApiErrorCode } from '../../common/errors/api-error';
import {
  AdminUserConflictError,
  AdminUserInvalidRoleError,
  AdminUserNotFoundError,
  PrismaAdminUserRepository,
} from './repositories/prisma-admin-user.repository';
import type {
  AdminUserListResponseDto,
  AdminUserResponseDto,
  ListAdminUsersQueryDto,
  UpdateAdminUserRoleRequestDto,
  UpdateAdminUserStatusRequestDto,
} from './dto/admin-user.dto';

const CONFLICT_MESSAGES: Record<string, string> = {
  CANNOT_DISABLE_SELF: 'Không thể tự vô hiệu hóa tài khoản của chính bạn',
  CANNOT_MODIFY_SELF_ROLE: 'Không thể tự thay đổi vai trò của chính bạn',
  LAST_ADMIN_PROTECTION:
    'Không thể vô hiệu hóa hoặc hạ vai trò quản trị viên cuối cùng',
  USER_ALREADY_ACTIVE: 'Người dùng đã ở trạng thái đang hoạt động',
  USER_ALREADY_DISABLED: 'Người dùng đã bị vô hiệu hóa',
  ROLE_UNCHANGED: 'Vai trò mới trùng với vai trò hiện tại',
};

function notFoundError(): ApiException {
  return new ApiException(
    HttpStatus.NOT_FOUND,
    'USER_NOT_FOUND',
    'Không tìm thấy người dùng',
  );
}

function invalidRoleError(): ApiException {
  return new ApiException(
    HttpStatus.BAD_REQUEST,
    'INVALID_ROLE',
    'Vai trò người dùng không hợp lệ',
  );
}

function conflictError(reason: keyof typeof CONFLICT_MESSAGES): ApiException {
  return new ApiException(
    HttpStatus.CONFLICT,
    reason as ApiErrorCode,
    CONFLICT_MESSAGES[reason] ??
      'Trạng thái người dùng không cho phép thao tác này',
  );
}

@Injectable()
export class AdminUserService {
  constructor(private readonly repository: PrismaAdminUserRepository) {}

  list(query: ListAdminUsersQueryDto): Promise<AdminUserListResponseDto> {
    return this.repository.list(query);
  }

  async getById(userId: string): Promise<AdminUserResponseDto> {
    const user = await this.repository.findById(userId);
    if (!user) {
      throw notFoundError();
    }
    return user;
  }

  async updateStatus(
    actorId: string,
    userId: string,
    body: UpdateAdminUserStatusRequestDto,
  ): Promise<AdminUserResponseDto> {
    try {
      return await this.repository.updateStatus(actorId, userId, body.status);
    } catch (error) {
      this.rethrowMapped(error);
    }
  }

  async updateRole(
    actorId: string,
    userId: string,
    body: UpdateAdminUserRoleRequestDto,
  ): Promise<AdminUserResponseDto> {
    try {
      return await this.repository.updateRole(actorId, userId, body.role);
    } catch (error) {
      this.rethrowMapped(error);
    }
  }

  private rethrowMapped(error: unknown): never {
    if (error instanceof AdminUserNotFoundError) {
      throw notFoundError();
    }
    if (error instanceof AdminUserInvalidRoleError) {
      throw invalidRoleError();
    }
    if (error instanceof AdminUserConflictError) {
      throw conflictError(error.reason);
    }
    throw error;
  }
}
