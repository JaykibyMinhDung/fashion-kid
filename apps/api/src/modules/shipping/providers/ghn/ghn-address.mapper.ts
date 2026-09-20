import { HttpStatus, Injectable } from '@nestjs/common';
import { ApiException } from '../../../../common/errors/api-error';
import { ShippingAddressInput } from '../../domain/shipping-provider.interface';
import { GhnClient } from './ghn-client';
import { GhnDistrict, GhnProvince, GhnWard } from './ghn.types';

export type GhnResolvedAddress = {
  provinceId: number;
  provinceName: string;
  districtId: number;
  districtName: string;
  wardCode: string;
  wardName: string;
};

type CacheEntry<T> = {
  data: T;
  expiresAt: number;
};

export function normalizeVietnamese(str: string): string {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .replace(
      /\b(thanh pho|tinh|tp|quan|huyen|thi xa|tx|phuong|xa|thi tran|tt)\b/g,
      ' ',
    )
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

@Injectable()
export class GhnAddressMapper {
  private readonly defaultTtlMs = 60 * 60 * 1000; // 1 hour

  private provincesCache: CacheEntry<GhnProvince[]> | null = null;
  private districtsCache = new Map<number, CacheEntry<GhnDistrict[]>>();
  private wardsCache = new Map<number, CacheEntry<GhnWard[]>>();
  private resolvedAddressCache = new Map<
    string,
    CacheEntry<GhnResolvedAddress>
  >();

  constructor(private readonly ghnClient: GhnClient) {}

  clearCache(): void {
    this.provincesCache = null;
    this.districtsCache.clear();
    this.wardsCache.clear();
    this.resolvedAddressCache.clear();
  }

  async resolveAddress(
    address: ShippingAddressInput,
  ): Promise<GhnResolvedAddress> {
    // UT-MAP-06: invalid canonical input reject before API call
    if (
      (!address.provinceCode?.trim() && !address.provinceName?.trim()) ||
      (!address.wardCode?.trim() && !address.wardName?.trim())
    ) {
      throw new ApiException(
        HttpStatus.BAD_REQUEST,
        'GHN_ADDRESS_MAPPING_FAILED',
        'Địa chỉ thiếu thông tin tỉnh/thành hoặc phường/xã',
      );
    }

    const cacheKey = [
      address.provinceCode?.trim().toLowerCase() ?? '',
      address.provinceName?.trim().toLowerCase() ?? '',
      address.wardCode?.trim().toLowerCase() ?? '',
      address.wardName?.trim().toLowerCase() ?? '',
      address.addressLine?.trim().toLowerCase() ?? '',
    ].join('|');

    // UT-MAP-05: cached mapping hit avoids provider lookup
    const cachedResolved = this.resolvedAddressCache.get(cacheKey);
    if (cachedResolved && cachedResolved.expiresAt > Date.now()) {
      return cachedResolved.data;
    }

    // Step 1: Find Province
    const province = await this.matchProvince(address);

    // Step 2: Fetch Districts
    const districts = await this.getDistricts(province.ProvinceID);

    // Step 3: Match District & Ward
    const { district, ward } = await this.matchDistrictAndWard(
      province,
      districts,
      address,
    );

    const result: GhnResolvedAddress = {
      provinceId: province.ProvinceID,
      provinceName: province.ProvinceName,
      districtId: district.DistrictID,
      districtName: district.DistrictName,
      wardCode: ward.WardCode,
      wardName: ward.WardName,
    };

    this.resolvedAddressCache.set(cacheKey, {
      data: result,
      expiresAt: Date.now() + this.defaultTtlMs,
    });

    return result;
  }

  private async getProvinces(): Promise<GhnProvince[]> {
    if (this.provincesCache && this.provincesCache.expiresAt > Date.now()) {
      return this.provincesCache.data;
    }
    const data = await this.ghnClient.getProvinces();
    this.provincesCache = {
      data,
      expiresAt: Date.now() + this.defaultTtlMs,
    };
    return data;
  }

  private async getDistricts(provinceId: number): Promise<GhnDistrict[]> {
    const cached = this.districtsCache.get(provinceId);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }
    const data = await this.ghnClient.getDistricts(provinceId);
    this.districtsCache.set(provinceId, {
      data,
      expiresAt: Date.now() + this.defaultTtlMs,
    });
    return data;
  }

  private async getWards(districtId: number): Promise<GhnWard[]> {
    const cached = this.wardsCache.get(districtId);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }
    const data = await this.ghnClient.getWards(districtId);
    this.wardsCache.set(districtId, {
      data,
      expiresAt: Date.now() + this.defaultTtlMs,
    });
    return data;
  }

  private async matchProvince(
    address: ShippingAddressInput,
  ): Promise<GhnProvince> {
    const provinces = await this.getProvinces();
    const rawCode = address.provinceCode?.trim();
    const rawName = address.provinceName?.trim();
    const normName = normalizeVietnamese(rawName || '');

    // 1. Exact match by Code or ProvinceID
    if (rawCode) {
      const byCode = provinces.filter(
        (p) =>
          p.Code?.toLowerCase() === rawCode.toLowerCase() ||
          p.ProvinceID.toString() === rawCode,
      );
      if (byCode.length === 1) return byCode[0];
      if (byCode.length > 1) {
        throw new ApiException(
          HttpStatus.BAD_REQUEST,
          'GHN_ADDRESS_MAPPING_FAILED',
          `Nhiều hơn 1 tỉnh/thành phố khớp với mã '${rawCode}'`,
        );
      }
    }

    // 2. Match by normalized name
    if (normName) {
      // 2a. Priority 1: Exact match on primary ProvinceName
      const exactPrimaryMatches = provinces.filter(
        (p) => normalizeVietnamese(p.ProvinceName) === normName,
      );
      if (exactPrimaryMatches.length === 1) {
        return exactPrimaryMatches[0];
      }
      if (exactPrimaryMatches.length > 1) {
        throw new ApiException(
          HttpStatus.BAD_REQUEST,
          'GHN_ADDRESS_MAPPING_FAILED',
          `Nhiều hơn 1 tỉnh/thành phố khớp với tên '${rawName}'`,
        );
      }

      // 2b. Priority 2: Match by NameExtension aliases
      const extensionMatches = provinces.filter((p) =>
        p.NameExtension?.some((ext) => normalizeVietnamese(ext) === normName),
      );
      if (extensionMatches.length === 1) {
        return extensionMatches[0];
      }
      if (extensionMatches.length > 1) {
        throw new ApiException(
          HttpStatus.BAD_REQUEST,
          'GHN_ADDRESS_MAPPING_FAILED',
          `Nhiều hơn 1 tỉnh/thành phố khớp với tên '${rawName}'`,
        );
      }
    }

    throw new ApiException(
      HttpStatus.BAD_REQUEST,
      'GHN_ADDRESS_MAPPING_FAILED',
      `Không tìm thấy tỉnh/thành phố tương ứng với '${rawName || rawCode}'`,
    );
  }

  private async matchDistrictAndWard(
    province: GhnProvince,
    districts: GhnDistrict[],
    address: ShippingAddressInput,
  ): Promise<{ district: GhnDistrict; ward: GhnWard }> {
    const rawWardCode = address.wardCode?.trim();
    const rawWardName = address.wardName?.trim();
    const normWardName = normalizeVietnamese(rawWardName || '');
    const normAddressLine = normalizeVietnamese(address.addressLine || '');

    // Check if addressLine explicitly identifies a district
    let candidateDistricts = districts;
    if (normAddressLine) {
      const explicitDistricts = districts.filter((d) => {
        const dNorm = normalizeVietnamese(d.DistrictName);
        if (dNorm && normAddressLine.includes(dNorm)) return true;
        if (
          d.NameExtension?.some((ext) => {
            const extNorm = normalizeVietnamese(ext);
            return extNorm && normAddressLine.includes(extNorm);
          })
        ) {
          return true;
        }
        return false;
      });

      if (explicitDistricts.length === 1) {
        candidateDistricts = explicitDistricts;
      }
    }

    // Fetch wards for candidate districts
    const candidates: Array<{ district: GhnDistrict; ward: GhnWard }> = [];

    await Promise.all(
      candidateDistricts.map(async (d) => {
        const wards = await this.getWards(d.DistrictID);
        for (const w of wards) {
          let matched = false;

          // Match by WardCode or GovernmentCode
          if (
            rawWardCode &&
            (w.WardCode.toLowerCase() === rawWardCode.toLowerCase() ||
              w.GovernmentCode?.toLowerCase() === rawWardCode.toLowerCase())
          ) {
            matched = true;
          }

          // Match by normalized WardName
          if (!matched && normWardName) {
            const wNorm = normalizeVietnamese(w.WardName);
            if (wNorm === normWardName) {
              matched = true;
            } else if (
              w.NameExtension?.some(
                (ext) => normalizeVietnamese(ext) === normWardName,
              )
            ) {
              matched = true;
            }
          }

          if (matched) {
            candidates.push({ district: d, ward: w });
          }
        }
      }),
    );

    // UT-MAP-03: ambiguous candidate -> check primary WardName before failing
    if (candidates.length > 1) {
      const primaryCandidates = candidates.filter(
        (c) => normalizeVietnamese(c.ward.WardName) === normWardName,
      );
      if (primaryCandidates.length === 1) {
        return primaryCandidates[0];
      }

      throw new ApiException(
        HttpStatus.BAD_REQUEST,
        'GHN_ADDRESS_MAPPING_FAILED',
        `Không thể xác định duy nhất phường/xã '${rawWardName || rawWardCode}' trong tỉnh '${province.ProvinceName}' do có ${candidates.length} kết quả trùng lặp`,
      );
    }

    // UT-MAP-04: no candidate -> fail
    if (candidates.length === 0) {
      throw new ApiException(
        HttpStatus.BAD_REQUEST,
        'GHN_ADDRESS_MAPPING_FAILED',
        `Không tìm thấy phường/xã '${rawWardName || rawWardCode}' tương ứng tại '${province.ProvinceName}'`,
      );
    }

    return candidates[0];
  }
}
