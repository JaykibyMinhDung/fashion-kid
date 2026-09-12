import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { RequirePermissions } from '../../authorization/require-permissions.decorator';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import type { AuthenticatedRequestUser } from '../../common/auth/authenticated-user';
import { AddressService } from './address.service';
import {
  AddressResponseDto,
  CreateAddressRequestDto,
  UpdateAddressRequestDto,
} from './dto/address.dto';

@ApiTags('addresses')
@ApiBearerAuth()
@Controller('me/addresses')
export class AddressController {
  constructor(private readonly addressService: AddressService) {}

  @Get()
  @RequirePermissions('ADDRESS_READ_OWN')
  @ApiOperation({ summary: 'List the authenticated customer addresses' })
  @ApiOkResponse({ type: AddressResponseDto, isArray: true })
  listOwn(
    @CurrentUser() user: AuthenticatedRequestUser,
  ): Promise<AddressResponseDto[]> {
    return this.addressService.listOwn(user.id);
  }

  @Post()
  @RequirePermissions('ADDRESS_WRITE_OWN')
  @ApiOperation({ summary: 'Create an address for the authenticated customer' })
  @ApiCreatedResponse({ type: AddressResponseDto })
  createOwn(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Body() body: CreateAddressRequestDto,
  ): Promise<AddressResponseDto> {
    return this.addressService.createOwn(user.id, body);
  }

  @Patch(':id/default')
  @RequirePermissions('ADDRESS_WRITE_OWN')
  @ApiOperation({ summary: 'Set an owned address as default atomically' })
  @ApiOkResponse({ type: AddressResponseDto })
  setOwnDefault(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param('id', ParseUUIDPipe) addressId: string,
  ): Promise<AddressResponseDto> {
    return this.addressService.setOwnDefault(user.id, addressId);
  }

  @Patch(':id')
  @RequirePermissions('ADDRESS_WRITE_OWN')
  @ApiOperation({ summary: 'Update editable fields of an owned address' })
  @ApiOkResponse({ type: AddressResponseDto })
  updateOwn(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param('id', ParseUUIDPipe) addressId: string,
    @Body() body: UpdateAddressRequestDto,
  ): Promise<AddressResponseDto> {
    return this.addressService.updateOwn(user.id, addressId, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions('ADDRESS_WRITE_OWN')
  @ApiOperation({ summary: 'Delete an owned address' })
  @ApiNoContentResponse()
  async deleteOwn(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param('id', ParseUUIDPipe) addressId: string,
  ): Promise<void> {
    await this.addressService.deleteOwn(user.id, addressId);
  }
}
