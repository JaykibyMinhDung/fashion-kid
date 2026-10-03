import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Public } from '../../../common/auth/public.decorator';
import { GhnClient } from '../providers/ghn/ghn-client';

export type MasterDataProvince = {
  id: number;
  name: string;
  code: string;
};

export type MasterDataDistrict = {
  id: number;
  name: string;
  code: string;
  provinceId: number;
};

export type MasterDataWard = {
  code: string;
  name: string;
  districtId: number;
};

@ApiTags('shipping-master-data')
@Controller('shipping/master-data')
export class ShippingMasterDataController {
  private readonly logger = new Logger(ShippingMasterDataController.name);

  // In-memory cache with 2-hour TTL
  private provincesCache: { data: MasterDataProvince[]; expiresAt: number } | null = null;
  private districtsCache = new Map<number, { data: MasterDataDistrict[]; expiresAt: number }>();
  private wardsCache = new Map<number, { data: MasterDataWard[]; expiresAt: number }>();

  constructor(private readonly ghnClient: GhnClient) {}

  @Get('provinces')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Lấy danh sách tỉnh/thành phố từ GHN' })
  async getProvinces(): Promise<MasterDataProvince[]> {
    if (this.provincesCache && this.provincesCache.expiresAt > Date.now()) {
      return this.provincesCache.data;
    }

    try {
      const list = await this.ghnClient.getProvinces();
      const mapped = list
        .filter((p) => p.ProvinceID && p.ProvinceName && !p.ProvinceName.toLowerCase().includes('test'))
        .map((p) => ({
          id: p.ProvinceID,
          name: p.ProvinceName,
          code: p.Code || String(p.ProvinceID),
        }))
        .sort((a, b) => a.name.localeCompare(b.name, 'vi'));

      this.provincesCache = {
        data: mapped,
        expiresAt: Date.now() + 2 * 60 * 60 * 1000,
      };
      return mapped;
    } catch (error) {
      this.logger.error('Failed to load provinces from GHN, returning fallback', error);
      return [
        { id: 201, name: 'Hà Nội', code: '01' },
        { id: 202, name: 'Hồ Chí Minh', code: '79' },
        { id: 203, name: 'Đà Nẵng', code: '48' },
        { id: 204, name: 'Hải Phòng', code: '31' },
        { id: 205, name: 'Cần Thơ', code: '92' },
      ];
    }
  }

  @Get('districts')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Lấy danh sách quận/huyện theo tỉnh/thành' })
  @ApiQuery({ name: 'provinceId', type: Number, required: true })
  async getDistricts(@Query('provinceId') provinceIdStr: string): Promise<MasterDataDistrict[]> {
    const provinceId = parseInt(provinceIdStr, 10);
    if (!provinceId || isNaN(provinceId)) return [];

    const cached = this.districtsCache.get(provinceId);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }

    try {
      const list = await this.ghnClient.getDistricts(provinceId);
      const mapped = list
        .filter((d) => d.DistrictID && d.DistrictName)
        .map((d) => ({
          id: d.DistrictID,
          name: d.DistrictName,
          code: d.Code || String(d.DistrictID),
          provinceId,
        }))
        .sort((a, b) => a.name.localeCompare(b.name, 'vi'));

      this.districtsCache.set(provinceId, {
        data: mapped,
        expiresAt: Date.now() + 2 * 60 * 60 * 1000,
      });
      return mapped;
    } catch (error) {
      this.logger.error(`Failed to load districts for provinceId=${provinceId}`, error);
      return [];
    }
  }

  @Get('wards')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Lấy danh sách phường/xã theo quận/huyện' })
  @ApiQuery({ name: 'districtId', type: Number, required: true })
  async getWards(@Query('districtId') districtIdStr: string): Promise<MasterDataWard[]> {
    const districtId = parseInt(districtIdStr, 10);
    if (!districtId || isNaN(districtId)) return [];

    const cached = this.wardsCache.get(districtId);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }

    try {
      const list = await this.ghnClient.getWards(districtId);
      const mapped = list
        .filter((w) => w.WardCode && w.WardName)
        .map((w) => ({
          code: w.WardCode,
          name: w.WardName,
          districtId,
        }))
        .sort((a, b) => a.name.localeCompare(b.name, 'vi'));

      this.wardsCache.set(districtId, {
        data: mapped,
        expiresAt: Date.now() + 2 * 60 * 60 * 1000,
      });
      return mapped;
    } catch (error) {
      this.logger.error(`Failed to load wards for districtId=${districtId}`, error);
      return [];
    }
  }
}
