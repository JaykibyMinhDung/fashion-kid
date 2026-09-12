import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { RequirePermissions } from '../../authorization/require-permissions.decorator';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import type { AuthenticatedRequestUser } from '../../common/auth/authenticated-user';
import {
  AdminUserListResponseDto,
  AdminUserResponseDto,
  ListAdminUsersQueryDto,
  UpdateAdminUserRoleRequestDto,
  UpdateAdminUserStatusRequestDto,
} from './dto/admin-user.dto';
import { AdminUserService } from './admin-user.service';

@ApiTags('admin-users')
@ApiBearerAuth()
@Controller('admin/users')
export class AdminUserController {
  constructor(private readonly adminUserService: AdminUserService) {}

  @Get()
  @RequirePermissions('USER_READ_ALL')
  @ApiOperation({ summary: 'List users for administration' })
  @ApiOkResponse({ type: AdminUserListResponseDto })
  list(
    @Query() query: ListAdminUsersQueryDto,
  ): Promise<AdminUserListResponseDto> {
    return this.adminUserService.list(query);
  }

  @Get(':id')
  @RequirePermissions('USER_READ_ALL')
  @ApiOperation({ summary: 'Read a safe user administration projection' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: AdminUserResponseDto })
  getById(
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<AdminUserResponseDto> {
    return this.adminUserService.getById(id);
  }

  @Patch(':id/status')
  @RequirePermissions('USER_MANAGE_STATUS')
  @ApiOperation({ summary: 'Enable or disable a user account' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: AdminUserResponseDto })
  updateStatus(
    @CurrentUser() actor: AuthenticatedRequestUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: UpdateAdminUserStatusRequestDto,
  ): Promise<AdminUserResponseDto> {
    return this.adminUserService.updateStatus(actor.id, id, body);
  }

  @Patch(':id/role')
  @RequirePermissions('USER_MANAGE_ROLE')
  @ApiOperation({ summary: 'Change a user role' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: AdminUserResponseDto })
  updateRole(
    @CurrentUser() actor: AuthenticatedRequestUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: UpdateAdminUserRoleRequestDto,
  ): Promise<AdminUserResponseDto> {
    return this.adminUserService.updateRole(actor.id, id, body);
  }
}
