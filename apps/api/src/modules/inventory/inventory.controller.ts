import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { RequirePermissions } from '../../authorization/require-permissions.decorator';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import type { AuthenticatedRequestUser } from '../../common/auth/authenticated-user';
import {
  AdjustInventoryRequestDto,
  CreateInventoryImportRequestDto,
  InventoryHistoryResponseDto,
  InventoryItemResponseDto,
  InventoryListResponseDto,
  InventoryMutationResponseDto,
  ListInventoryHistoryQueryDto,
  ListInventoryQueryDto,
} from './dto/inventory.dto';
import { InventoryService } from './inventory.service';

@ApiTags('admin-inventory')
@ApiBearerAuth()
@Controller('admin/inventory')
export class InventoryController {
  constructor(private readonly service: InventoryService) {}

  @Get()
  @RequirePermissions('INVENTORY_READ')
  @ApiOperation({ summary: 'List inventory by Product Variant' })
  @ApiOkResponse({ type: InventoryListResponseDto })
  list(
    @Query() query: ListInventoryQueryDto,
  ): Promise<InventoryListResponseDto> {
    return this.service.list(query);
  }

  @Get('history')
  @RequirePermissions('INVENTORY_READ')
  @ApiOperation({ summary: 'List inventory transactions across the warehouse' })
  @ApiOkResponse({ type: InventoryHistoryResponseDto })
  historyAll(
    @Query() query: ListInventoryHistoryQueryDto,
  ): Promise<InventoryHistoryResponseDto> {
    return this.service.history(query.variantId, query);
  }

  @Get(':variantId/history')
  @RequirePermissions('INVENTORY_READ')
  @ApiOperation({ summary: 'List append-only inventory transactions' })
  @ApiParam({ name: 'variantId', format: 'uuid' })
  @ApiOkResponse({ type: InventoryHistoryResponseDto })
  history(
    @Param('variantId', new ParseUUIDPipe()) variantId: string,
    @Query() query: ListInventoryHistoryQueryDto,
  ): Promise<InventoryHistoryResponseDto> {
    return this.service.history(variantId, query);
  }

  @Get(':variantId')
  @RequirePermissions('INVENTORY_READ')
  @ApiOperation({ summary: 'Read inventory for a Product Variant' })
  @ApiParam({ name: 'variantId', format: 'uuid' })
  @ApiOkResponse({ type: InventoryItemResponseDto })
  get(
    @Param('variantId', new ParseUUIDPipe()) variantId: string,
    @Query('warehouseCode') warehouseCode?: string,
  ): Promise<InventoryItemResponseDto> {
    return this.service.get(variantId, warehouseCode);
  }

  @Post('import')
  @RequirePermissions('INVENTORY_IMPORT')
  @ApiOperation({ summary: 'Import stock and append an IMPORT transaction' })
  @ApiCreatedResponse({ type: InventoryMutationResponseDto })
  import(
    @CurrentUser() actor: AuthenticatedRequestUser,
    @Body() input: CreateInventoryImportRequestDto,
  ): Promise<InventoryMutationResponseDto> {
    return this.service.import(actor.id, input);
  }

  @Post(':variantId/adjust')
  @RequirePermissions('INVENTORY_ADJUST')
  @ApiOperation({ summary: 'Adjust inventory to a target onHand value' })
  @ApiParam({ name: 'variantId', format: 'uuid' })
  @ApiCreatedResponse({ type: InventoryMutationResponseDto })
  adjust(
    @CurrentUser() actor: AuthenticatedRequestUser,
    @Param('variantId', new ParseUUIDPipe()) variantId: string,
    @Body() input: AdjustInventoryRequestDto,
  ): Promise<InventoryMutationResponseDto> {
    return this.service.adjust(actor.id, variantId, input);
  }
}
