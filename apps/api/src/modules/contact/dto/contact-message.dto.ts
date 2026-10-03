import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
} from 'class-validator';
import { canonicalizeEmail } from '../../../common/security/identity-normalization';
import { CONTACT_TOPIC_VALUES, type ContactTopic } from '../contact.constants';

function trimString({ value }: { value: unknown }): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

/** Email để trống = không có email (khách không bắt buộc nhập). */
function optionalEmail({ value }: { value: unknown }): unknown {
  if (typeof value !== 'string') {
    return value;
  }
  const trimmed = value.trim();
  return trimmed === '' ? undefined : canonicalizeEmail(trimmed);
}

function compactPhone({ value }: { value: unknown }): unknown {
  if (typeof value !== 'string') {
    return value;
  }
  const compact = value.trim().replace(/[\s().-]/g, '');
  return compact.startsWith('00') ? `+${compact.slice(2)}` : compact;
}

export class ContactMessageDto {
  @ApiProperty({ example: 'Nguyễn Thu Trang', minLength: 2, maxLength: 100 })
  @Transform(trimString)
  @IsString()
  @Length(2, 100)
  fullName!: string;

  @ApiProperty({ example: '0988123456' })
  @Transform(compactPhone)
  @IsString()
  @Matches(/^\+?[0-9]{8,15}$/, { message: 'Số điện thoại không hợp lệ' })
  phone!: string;

  @ApiPropertyOptional({ example: 'meyeube@gmail.com' })
  @Transform(optionalEmail)
  @IsOptional()
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email?: string;

  @ApiProperty({ enum: CONTACT_TOPIC_VALUES, example: 'tu-van-size' })
  @IsIn(CONTACT_TOPIC_VALUES)
  topic!: ContactTopic;

  @ApiProperty({ minLength: 5, maxLength: 2000 })
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @Length(5, 2000)
  message!: string;
}

export class ContactSubmissionResponseDto {
  @ApiProperty({ example: 'LH-260925-K3QX7A' })
  ticketId!: string;

  @ApiProperty({ example: '2026-09-25T09:30:00.000Z' })
  receivedAt!: string;
}
