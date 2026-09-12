import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ROLE_CODES } from '../auth.types';
import type { RoleCode } from '../auth.types';

export class PublicUserResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'email' })
  email!: string;

  @ApiProperty()
  fullName!: string;

  @ApiPropertyOptional({ nullable: true })
  phone!: string | null;

  @ApiPropertyOptional({ nullable: true })
  avatarUrl!: string | null;

  @ApiProperty({ enum: ROLE_CODES })
  role!: RoleCode;
}

export class AuthSessionResponseDto {
  @ApiProperty()
  accessToken!: string;

  @ApiProperty({ example: 'Bearer' })
  tokenType!: 'Bearer';

  @ApiProperty({ example: 900 })
  expiresIn!: number;

  @ApiProperty({ type: PublicUserResponseDto })
  user!: PublicUserResponseDto;
}
