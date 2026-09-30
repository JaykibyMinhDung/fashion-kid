import { HttpStatus } from '@nestjs/common';
import { GhnAddressMapper } from './ghn-address.mapper';
import { GhnClient } from './ghn-client';
import { GhnDistrict, GhnProvince, GhnWard } from './ghn.types';

describe('GhnAddressMapper (UT-MAP-01..06)', () => {
  let mapper: GhnAddressMapper;
  let mockGhnClient: jest.Mocked<Partial<GhnClient>>;

  const mockProvinces: GhnProvince[] = [
    {
      ProvinceID: 201,
      ProvinceName: 'Hà Nội',
      Code: '01',
      NameExtension: ['HN', 'Thành phố Hà Nội'],
    },
    {
      ProvinceID: 2002,
      ProvinceName: 'Hà Nội 02',
      Code: '04',
      NameExtension: ['Hà Nội 02', 'Hà Nội', 'TP Hà Nội'],
    },
    {
      ProvinceID: 202,
      ProvinceName: 'Hồ Chí Minh',
      Code: '79',
      NameExtension: ['HCM', 'TP. Hồ Chí Minh', 'TP HCM'],
    },
  ];

  const mockDistrictsHanoi: GhnDistrict[] = [
    {
      DistrictID: 1482,
      ProvinceID: 201,
      DistrictName: 'Quận Bắc Từ Liêm',
      Code: '019',
      GovernmentCode: '019',
      NameExtension: ['Bắc Từ Liêm'],
    },
    {
      DistrictID: 1485,
      ProvinceID: 201,
      DistrictName: 'Quận Cầu Giấy',
      Code: '005',
      GovernmentCode: '005',
      NameExtension: ['Cầu Giấy'],
    },
  ];

  const mockWardsBacTuLiem: GhnWard[] = [
    {
      WardCode: '11001',
      DistrictID: 1482,
      WardName: 'Phường Cổ Nhuế 1',
      GovernmentCode: '00604',
      NameExtension: ['Cổ Nhuế 1'],
    },
    {
      WardCode: '11002',
      DistrictID: 1482,
      WardName: 'Phường Cổ Nhuế 2',
      GovernmentCode: '00607',
      NameExtension: ['Cổ Nhuế 2'],
    },
    {
      WardCode: '99001',
      DistrictID: 1482,
      WardName: 'Phường 1',
      GovernmentCode: '09901',
    },
  ];

  const mockWardsCauGiay: GhnWard[] = [
    {
      WardCode: '11050',
      DistrictID: 1485,
      WardName: 'Phường Dịch Vọng',
      GovernmentCode: '00501',
      NameExtension: ['Dịch Vọng'],
    },
    {
      WardCode: '99002',
      DistrictID: 1485,
      WardName: 'Phường 1',
      GovernmentCode: '09902',
    },
  ];

  beforeEach(() => {
    mockGhnClient = {
      getProvinces: jest.fn().mockResolvedValue(mockProvinces),
      getDistricts: jest.fn().mockImplementation((provinceId: number) => {
        if (provinceId === 201) return Promise.resolve(mockDistrictsHanoi);
        return Promise.resolve([]);
      }),
      getWards: jest.fn().mockImplementation((districtId: number) => {
        if (districtId === 1482) return Promise.resolve(mockWardsBacTuLiem);
        if (districtId === 1485) return Promise.resolve(mockWardsCauGiay);
        return Promise.resolve([]);
      }),
    };

    mapper = new GhnAddressMapper(mockGhnClient as GhnClient);
  });

  // UT-MAP-01: exact province/ward mapping
  it('UT-MAP-01: should map exact province and ward code', async () => {
    const result = await mapper.resolveAddress({
      addressLine: 'Số 10 Phạm Văn Đồng',
      provinceCode: '01',
      provinceName: 'Hà Nội',
      wardCode: '11001',
      wardName: 'Phường Cổ Nhuế 1',
    });

    expect(result).toEqual({
      provinceId: 201,
      provinceName: 'Hà Nội',
      districtId: 1482,
      districtName: 'Quận Bắc Từ Liêm',
      wardCode: '11001',
      wardName: 'Phường Cổ Nhuế 1',
    });
  });

  // UT-MAP-02: normalized accented/unaccented name
  it('UT-MAP-02: should map normalized unaccented name without prefixes', async () => {
    const result = await mapper.resolveAddress({
      addressLine: '244 Hoang Quoc Viet, Bac Tu Liem',
      provinceCode: '',
      provinceName: 'Thanh pho Ha Noi',
      wardCode: '',
      wardName: 'Co Nhue 1',
    });

    expect(result.provinceId).toBe(201);
    expect(result.districtId).toBe(1482);
    expect(result.wardCode).toBe('11001');
  });

  // UT-MAP-02b: prioritize exact primary ProvinceName over alias extension (e.g. GHN sandbox Hà Nội 02)
  it('UT-MAP-02b: should prioritize exact primary ProvinceName when conflicting NameExtension exists in sandbox', async () => {
    const result = await mapper.resolveAddress({
      addressLine: '244 Hoàng Quốc Việt, Bắc Từ Liêm',
      provinceCode: '',
      provinceName: 'Hà Nội',
      wardCode: '',
      wardName: 'Cổ Nhuế 1',
    });

    expect(result.provinceId).toBe(201); // Hà Nội (201), NOT Hà Nội 02 (2002)
    expect(result.provinceName).toBe('Hà Nội');
  });

  // UT-MAP-03: ambiguous candidate -> fail
  it('UT-MAP-03: should throw GHN_ADDRESS_MAPPING_FAILED when ward name is ambiguous across districts without hint', async () => {
    await expect(
      mapper.resolveAddress({
        addressLine: 'Số 5 đường ABC', // no district hint in addressLine
        provinceCode: '01',
        provinceName: 'Hà Nội',
        wardCode: '',
        wardName: 'Phường 1', // exists in both Bac Tu Liem and Cau Giay
      }),
    ).rejects.toThrow(
      expect.objectContaining({
        status: HttpStatus.BAD_REQUEST,
        code: 'GHN_ADDRESS_MAPPING_FAILED',
      }),
    );
  });

  // UT-MAP-04: no candidate -> fail
  it('UT-MAP-04: should throw GHN_ADDRESS_MAPPING_FAILED when ward does not exist', async () => {
    await expect(
      mapper.resolveAddress({
        addressLine: 'Số 5 đường ABC',
        provinceCode: '01',
        provinceName: 'Hà Nội',
        wardCode: '999999',
        wardName: 'Phường Không Tồn Tại',
      }),
    ).rejects.toThrow(
      expect.objectContaining({
        status: HttpStatus.BAD_REQUEST,
        code: 'GHN_ADDRESS_MAPPING_FAILED',
      }),
    );
  });

  // UT-MAP-05: cached mapping hit avoids provider lookup
  it('UT-MAP-05: cached mapping hit avoids redundant provider lookups', async () => {
    const addr = {
      addressLine: 'Số 10 Phạm Văn Đồng',
      provinceCode: '01',
      provinceName: 'Hà Nội',
      wardCode: '11001',
      wardName: 'Phường Cổ Nhuế 1',
    };

    const first = await mapper.resolveAddress(addr);
    expect(first.wardCode).toBe('11001');
    expect(mockGhnClient.getProvinces).toHaveBeenCalledTimes(1);

    // Second call with same address should hit cache
    const second = await mapper.resolveAddress(addr);
    expect(second.wardCode).toBe('11001');
    expect(mockGhnClient.getProvinces).toHaveBeenCalledTimes(1); // Not called again!
  });

  // UT-MAP-06: invalid canonical input reject before API call
  it('UT-MAP-06: should reject invalid canonical input before calling GHN client', async () => {
    await expect(
      mapper.resolveAddress({
        addressLine: 'Số 10 Phạm Văn Đồng',
        provinceCode: '',
        provinceName: '',
        wardCode: '',
        wardName: '',
      }),
    ).rejects.toThrow(
      expect.objectContaining({
        status: HttpStatus.BAD_REQUEST,
        code: 'GHN_ADDRESS_MAPPING_FAILED',
      }),
    );

    expect(mockGhnClient.getProvinces).not.toHaveBeenCalled();
    expect(mockGhnClient.getDistricts).not.toHaveBeenCalled();
  });
});
