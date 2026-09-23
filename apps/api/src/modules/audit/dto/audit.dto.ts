import { Transform, Type } from 'class-transformer';
import {
  IsISO8601,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

function trimString({ value }: { value: unknown }): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

export class ListAuditLogsQueryDto {
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

  @ApiPropertyOptional({ format: 'uuid' })
  @Transform(trimString)
  @IsOptional()
  @IsUUID()
  actorId?: string;

  @ApiPropertyOptional({ maxLength: 100 })
  @Transform(trimString)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  entityType?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @Transform(trimString)
  @IsOptional()
  @IsUUID()
  entityId?: string;

  @ApiPropertyOptional({ maxLength: 100 })
  @Transform(trimString)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  action?: string;

  @ApiPropertyOptional({
    format: 'date-time',
    description: 'Lọc từ thời điểm (gte)',
  })
  @IsOptional()
  @IsISO8601()
  from?: string;

  @ApiPropertyOptional({
    format: 'date-time',
    description: 'Lọc đến thời điểm (lt) — khoảng [from, to)',
  })
  @IsOptional()
  @IsISO8601()
  to?: string;
}

export class AuditLogActorResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  fullName!: string;

  @ApiProperty()
  email!: string;
}

export class AuditLogResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  action!: string;

  @ApiProperty()
  entityType!: string;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  entityId!: string | null;

  @ApiPropertyOptional({ type: AuditLogActorResponseDto, nullable: true })
  actor!: AuditLogActorResponseDto | null;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Giá trị trước thay đổi (đã redact secret)',
  })
  oldValues!: Record<string, unknown> | null;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Giá trị sau thay đổi (đã redact secret)',
  })
  newValues!: Record<string, unknown> | null;

  @ApiPropertyOptional({ nullable: true })
  metadata!: Record<string, unknown> | null;

  @ApiPropertyOptional({ nullable: true })
  ipAddress!: string | null;

  @ApiPropertyOptional({ nullable: true })
  requestId!: string | null;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;
}

export class AuditLogListResponseDto {
  @ApiProperty({ type: AuditLogResponseDto, isArray: true })
  items!: AuditLogResponseDto[];

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  total!: number;

  @ApiProperty()
  totalPages!: number;
}
