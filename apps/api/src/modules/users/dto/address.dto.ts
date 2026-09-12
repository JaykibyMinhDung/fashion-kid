import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { PartialType } from '@nestjs/swagger';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { canonicalizePhone } from '../../../common/security/identity-normalization';

function trimString({ value }: { value: unknown }): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

function compactPhone({ value }: { value: unknown }): unknown {
  return typeof value === 'string' ? canonicalizePhone(value) : value;
}

function trimNullableString({ value }: { value: unknown }): unknown {
  if (value === null) {
    return null;
  }
  if (typeof value !== 'string') {
    return value;
  }
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

export class CreateAddressRequestDto {
  @ApiProperty({ maxLength: 150, example: 'Nguyễn Minh Anh' })
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  receiverName!: string;

  @ApiProperty({ maxLength: 20, example: '+84901234567' })
  @Transform(compactPhone)
  @IsString()
  @MaxLength(20)
  @Matches(/^\+?[0-9]{8,15}$/)
  phone!: string;

  @ApiProperty({ maxLength: 255, example: '12 Nguyễn Trãi' })
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  addressLine!: string;

  @ApiProperty({ maxLength: 50, example: '00001' })
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  wardCode!: string;

  @ApiProperty({ maxLength: 120, example: 'Phường Hàng Trống' })
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  wardName!: string;

  @ApiProperty({ maxLength: 50, example: '01' })
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  provinceCode!: string;

  @ApiProperty({ maxLength: 120, example: 'Hà Nội' })
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  provinceName!: string;

  @ApiPropertyOptional({ nullable: true, maxLength: 255 })
  @Transform(trimNullableString)
  @IsOptional()
  @IsString()
  @MaxLength(255)
  note?: string | null;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class UpdateAddressRequestDto extends PartialType(
  CreateAddressRequestDto,
) {}

export class AddressResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  receiverName!: string;

  @ApiProperty()
  phone!: string;

  @ApiProperty()
  addressLine!: string;

  @ApiProperty()
  wardCode!: string;

  @ApiProperty()
  wardName!: string;

  @ApiProperty()
  provinceCode!: string;

  @ApiProperty()
  provinceName!: string;

  @ApiPropertyOptional({ nullable: true })
  note!: string | null;

  @ApiProperty()
  isDefault!: boolean;

  @ApiProperty({ format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: Date;
}
