import { HttpStatus, Injectable } from '@nestjs/common';
import { ApiException } from '../../common/errors/api-error';
import {
  canonicalizePhone,
  normalizeFullName,
} from '../../common/security/identity-normalization';
import { invalidSessionError } from '../auth/auth.errors';
import {
  PrismaProfileRepository,
  type ProfileRecord,
  type UpdateProfileData,
} from './repositories/prisma-profile.repository';

export type UpdateProfileCommand = {
  fullName?: string;
  phone?: string | null;
  avatarUrl?: string | null;
};

function profileValidationError(): ApiException {
  return new ApiException(
    HttpStatus.BAD_REQUEST,
    'VALIDATION_ERROR',
    'Dữ liệu hồ sơ không hợp lệ',
  );
}

function normalizeAvatarUrl(value: string | null): string | null {
  if (value === null || value.trim().length === 0) {
    return null;
  }
  const trimmed = value.trim();
  if (trimmed.length > 2_048) {
    throw profileValidationError();
  }

  try {
    const url = new URL(trimmed);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      throw profileValidationError();
    }
  } catch (error) {
    if (error instanceof ApiException) {
      throw error;
    }
    throw profileValidationError();
  }
  return trimmed;
}

function prepareUpdate(command: UpdateProfileCommand): UpdateProfileData {
  const data: UpdateProfileData = {};

  if (command.fullName !== undefined) {
    const fullName = normalizeFullName(command.fullName);
    const length = [...fullName].length;
    if (length < 2 || length > 150) {
      throw profileValidationError();
    }
    data.fullName = fullName;
  }

  if (command.phone !== undefined) {
    const phone =
      command.phone === null ? null : canonicalizePhone(command.phone);
    if (phone !== null && !/^\+?[0-9]{8,15}$/.test(phone)) {
      throw profileValidationError();
    }
    data.phone = phone;
  }

  if (command.avatarUrl !== undefined) {
    data.avatarUrl = normalizeAvatarUrl(command.avatarUrl);
  }

  return data;
}

@Injectable()
export class ProfileService {
  constructor(private readonly repository: PrismaProfileRepository) {}

  async getOwnProfile(userId: string): Promise<ProfileRecord> {
    const profile = await this.repository.findByUserId(userId);
    if (!profile || profile.status !== 'ACTIVE') {
      throw invalidSessionError();
    }
    return profile;
  }

  async updateOwnProfile(
    userId: string,
    command: UpdateProfileCommand,
  ): Promise<ProfileRecord> {
    const data = prepareUpdate(command);
    if (Object.keys(data).length === 0) {
      return this.getOwnProfile(userId);
    }

    const profile = await this.repository.updateByUserId(userId, data);
    if (!profile || profile.status !== 'ACTIVE') {
      throw invalidSessionError();
    }
    return profile;
  }
}
