import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
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
import {
  AdminBrandResponseDto,
  AdminCategoryResponseDto,
  AdminColorResponseDto,
  AdminSizeResponseDto,
  CreateAdminBrandRequestDto,
  CreateAdminCategoryRequestDto,
  CreateAdminColorRequestDto,
  CreateAdminSizeRequestDto,
  ListAdminMasterQueryDto,
  UpdateAdminBrandRequestDto,
  UpdateAdminCategoryRequestDto,
  UpdateAdminColorRequestDto,
  UpdateAdminMasterStatusRequestDto,
  UpdateAdminSizeRequestDto,
} from './dto/admin-master.dto';
import { AdminMasterService } from './admin-master.service';

@ApiTags('admin-catalog-master')
@ApiBearerAuth()
@Controller('admin/catalog')
@RequirePermissions('CATALOG_MANAGE')
export class AdminMasterController {
  constructor(private readonly service: AdminMasterService) {}

  @Get('categories')
  @ApiOperation({ summary: 'List catalog categories for administration' })
  @ApiOkResponse({ type: AdminCategoryResponseDto, isArray: true })
  listCategories(@Query() query: ListAdminMasterQueryDto) {
    return this.service.listCategories(query);
  }

  @Post('categories')
  @ApiOperation({ summary: 'Create a catalog category' })
  @ApiCreatedResponse({ type: AdminCategoryResponseDto })
  createCategory(@Body() input: CreateAdminCategoryRequestDto) {
    return this.service.createCategory(input);
  }

  @Patch('categories/:id')
  @ApiOperation({ summary: 'Update a catalog category' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: AdminCategoryResponseDto })
  updateCategory(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() input: UpdateAdminCategoryRequestDto,
  ) {
    return this.service.updateCategory(id, input);
  }

  @Patch('categories/:id/status')
  @ApiOperation({ summary: 'Enable or disable a catalog category' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: AdminCategoryResponseDto })
  setCategoryStatus(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() input: UpdateAdminMasterStatusRequestDto,
  ) {
    return this.service.setCategoryStatus(id, input);
  }

  @Get('brands')
  @ApiOperation({ summary: 'List catalog brands for administration' })
  @ApiOkResponse({ type: AdminBrandResponseDto, isArray: true })
  listBrands(@Query() query: ListAdminMasterQueryDto) {
    return this.service.listBrands(query);
  }
  @Post('brands')
  @ApiOperation({ summary: 'Create a catalog brand' })
  @ApiCreatedResponse({ type: AdminBrandResponseDto })
  createBrand(@Body() input: CreateAdminBrandRequestDto) {
    return this.service.createBrand(input);
  }
  @Patch('brands/:id')
  @ApiOperation({ summary: 'Update a catalog brand' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: AdminBrandResponseDto })
  updateBrand(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() input: UpdateAdminBrandRequestDto,
  ) {
    return this.service.updateBrand(id, input);
  }
  @Patch('brands/:id/status')
  @ApiOperation({ summary: 'Enable or disable a catalog brand' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: AdminBrandResponseDto })
  setBrandStatus(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() input: UpdateAdminMasterStatusRequestDto,
  ) {
    return this.service.setBrandStatus(id, input);
  }

  @Get('sizes')
  @ApiOperation({ summary: 'List catalog sizes for administration' })
  @ApiOkResponse({ type: AdminSizeResponseDto, isArray: true })
  listSizes(@Query() query: ListAdminMasterQueryDto) {
    return this.service.listSizes(query);
  }
  @Post('sizes')
  @ApiOperation({ summary: 'Create a catalog size' })
  @ApiCreatedResponse({ type: AdminSizeResponseDto })
  createSize(@Body() input: CreateAdminSizeRequestDto) {
    return this.service.createSize(input);
  }
  @Patch('sizes/:id')
  @ApiOperation({ summary: 'Update a catalog size' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: AdminSizeResponseDto })
  updateSize(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() input: UpdateAdminSizeRequestDto,
  ) {
    return this.service.updateSize(id, input);
  }
  @Patch('sizes/:id/status')
  @ApiOperation({ summary: 'Enable or disable a catalog size' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: AdminSizeResponseDto })
  setSizeStatus(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() input: UpdateAdminMasterStatusRequestDto,
  ) {
    return this.service.setSizeStatus(id, input);
  }

  @Get('colors')
  @ApiOperation({ summary: 'List catalog colors for administration' })
  @ApiOkResponse({ type: AdminColorResponseDto, isArray: true })
  listColors(@Query() query: ListAdminMasterQueryDto) {
    return this.service.listColors(query);
  }
  @Post('colors')
  @ApiOperation({ summary: 'Create a catalog color' })
  @ApiCreatedResponse({ type: AdminColorResponseDto })
  createColor(@Body() input: CreateAdminColorRequestDto) {
    return this.service.createColor(input);
  }
  @Patch('colors/:id')
  @ApiOperation({ summary: 'Update a catalog color' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: AdminColorResponseDto })
  updateColor(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() input: UpdateAdminColorRequestDto,
  ) {
    return this.service.updateColor(id, input);
  }
  @Patch('colors/:id/status')
  @ApiOperation({ summary: 'Enable or disable a catalog color' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: AdminColorResponseDto })
  setColorStatus(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() input: UpdateAdminMasterStatusRequestDto,
  ) {
    return this.service.setColorStatus(id, input);
  }
}
