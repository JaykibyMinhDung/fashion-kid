import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserStatus } from '../../../generated/prisma/client';
import { ROLE_CODES, type RoleCode } from '../../auth/auth.types';

export const ADMIN_USER_SORT_VALUES = [
  'createdAt:asc',
  'createdAt:desc',
  'fullName:asc',
  'fullName:desc',
  'email:asc',
  'email:desc',
  'lastLoginAt:asc',
  'lastLoginAt:desc',
] as const;

export type AdminUserSort = (typeof ADMIN_USER_SORT_VALUES)[number];

function trimString({ value }: { value: unknown }): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

export class ListAdminUsersQueryDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;

  @ApiPropertyOptional({
    maxLength: 100,
    description: 'Tìm theo email, họ tên hoặc số điện thoại',
  })
  @Transform(trimString)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;

  @ApiPropertyOptional({ enum: ROLE_CODES })
  @IsOptional()
  @IsIn(ROLE_CODES)
  role?: RoleCode;

  @ApiPropertyOptional({ enum: UserStatus })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @ApiPropertyOptional({
    enum: ADMIN_USER_SORT_VALUES,
    default: 'createdAt:desc',
  })
  @IsOptional()
  @IsIn(ADMIN_USER_SORT_VALUES)
  sort: AdminUserSort = 'createdAt:desc';
}

export class UpdateAdminUserStatusRequestDto {
  @ApiProperty({ enum: UserStatus })
  @IsEnum(UserStatus)
  status!: UserStatus;
}

export class UpdateAdminUserRoleRequestDto {
  @ApiProperty({ enum: ROLE_CODES })
  @IsIn(ROLE_CODES)
  role!: RoleCode;
}

export class AdminUserResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'email' })
  email!: string;

  @ApiProperty()
  fullName!: string;

  @ApiPropertyOptional({ nullable: true })
  phone!: string | null;

  @ApiPropertyOptional({ nullable: true, format: 'uri' })
  avatarUrl!: string | null;

  @ApiProperty({ enum: ROLE_CODES })
  role!: RoleCode;

  @ApiProperty({ enum: UserStatus })
  status!: UserStatus;

  @ApiPropertyOptional({ nullable: true, format: 'date-time' })
  lastLoginAt!: Date | null;

  @ApiProperty({ format: 'date-time' })
  createdAt!: Date;
}

export class AdminUserListResponseDto {
  @ApiProperty({ type: AdminUserResponseDto, isArray: true })
  items!: AdminUserResponseDto[];

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  total!: number;

  @ApiProperty()
  totalPages!: number;
}
