import { Transform } from 'class-transformer';
import { IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CouponType } from '../../../generated/prisma/client';

function normalizeCode({ value }: { value: unknown }): unknown {
  return typeof value === 'string' ? value.trim().toUpperCase() : value;
}

export class ValidateCouponRequestDto {
  @ApiProperty({
    maxLength: 50,
    description: 'Mã coupon (tự chuẩn hoá trim + uppercase)',
  })
  @Transform(normalizeCode)
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  code!: string;
}

export class CouponValidationResponseDto {
  @ApiProperty()
  code!: string;

  @ApiPropertyOptional({ enum: CouponType, nullable: true })
  type!: CouponType | null;

  @ApiProperty({ description: 'Số tiền giảm (VND, decimal string)' })
  discountAmount!: string;

  @ApiProperty({ description: 'Tạm tính giỏ hàng (VND, decimal string)' })
  itemsSubtotal!: string;

  @ApiProperty()
  eligible!: boolean;

  @ApiPropertyOptional({
    nullable: true,
    description:
      'Lý do không hợp lệ: NOT_FOUND | DISABLED | NOT_STARTED | EXPIRED | MIN_ORDER_NOT_MET | USAGE_LIMIT_REACHED | USER_LIMIT_REACHED',
  })
  reasonCode!: string | null;

  @ApiPropertyOptional({ format: 'date-time', nullable: true })
  expiresAt!: string | null;
}
