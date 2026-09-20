import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Patch,
  Post,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { RequirePermissions } from '../../authorization/require-permissions.decorator';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import type { AuthenticatedRequestUser } from '../../common/auth/authenticated-user';
import { ApiException } from '../../common/errors/api-error';
import { ProfileResponseDto, UpdateProfileRequestDto } from './dto/profile.dto';
import { ProfileService } from './profile.service';
import {
  avatarStorage,
  avatarFileFilter,
  AVATAR_MAX_SIZE,
} from './avatar-upload.config';

@ApiTags('profile')
@ApiBearerAuth()
@Controller('me')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get()
  @RequirePermissions('PROFILE_READ_OWN')
  @ApiOperation({ summary: 'Read the authenticated user profile' })
  @ApiOkResponse({ type: ProfileResponseDto })
  getOwnProfile(
    @CurrentUser() user: AuthenticatedRequestUser,
  ): Promise<ProfileResponseDto> {
    return this.profileService.getOwnProfile(user.id);
  }

  @Patch()
  @RequirePermissions('PROFILE_UPDATE_OWN')
  @ApiOperation({ summary: 'Update editable authenticated user fields' })
  @ApiOkResponse({ type: ProfileResponseDto })
  updateOwnProfile(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Body() body: UpdateProfileRequestDto,
  ): Promise<ProfileResponseDto> {
    return this.profileService.updateOwnProfile(user.id, body);
  }

  @Post('avatar')
  @RequirePermissions('PROFILE_UPDATE_OWN')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: avatarStorage,
      fileFilter: avatarFileFilter,
      limits: { fileSize: AVATAR_MAX_SIZE },
    }),
  )
  @ApiOperation({ summary: 'Upload avatar image' })
  @ApiConsumes('multipart/form-data')
  @ApiOkResponse({ type: ProfileResponseDto })
  async uploadAvatar(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Req() req: Request,
    @UploadedFile() file: Express.Multer.File | undefined,
  ): Promise<ProfileResponseDto> {
    if (!file) {
      throw new ApiException(
        HttpStatus.BAD_REQUEST,
        'VALIDATION_ERROR',
        'Vui lòng chọn file ảnh để tải lên',
      );
    }

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const avatarUrl = `${baseUrl}/uploads/avatars/${file.filename}`;

    return this.profileService.updateOwnProfile(user.id, { avatarUrl });
  }
}
