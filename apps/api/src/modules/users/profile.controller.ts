import { Body, Controller, Get, Patch } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { RequirePermissions } from '../../authorization/require-permissions.decorator';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import type { AuthenticatedRequestUser } from '../../common/auth/authenticated-user';
import { ProfileResponseDto, UpdateProfileRequestDto } from './dto/profile.dto';
import { ProfileService } from './profile.service';

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
}
