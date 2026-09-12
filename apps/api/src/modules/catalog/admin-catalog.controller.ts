import { Body, Controller, Param, ParseUUIDPipe, Patch } from '@nestjs/common';
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
  AdminProductStatusResponseDto,
  UpdateAdminProductStatusRequestDto,
} from './dto/admin-catalog.dto';
import { AdminCatalogService } from './admin-catalog.service';

@ApiTags('admin-catalog')
@ApiBearerAuth()
@Controller('admin/products')
export class AdminCatalogController {
  constructor(private readonly service: AdminCatalogService) {}

  @Patch(':id/status')
  @RequirePermissions('CATALOG_MANAGE')
  @ApiOperation({ summary: 'Activate or disable a catalog product' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: AdminProductStatusResponseDto })
  updateProductStatus(
    @CurrentUser() actor: AuthenticatedRequestUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: UpdateAdminProductStatusRequestDto,
  ): Promise<AdminProductStatusResponseDto> {
    return this.service.updateProductStatus(actor.id, id, body);
  }
}
