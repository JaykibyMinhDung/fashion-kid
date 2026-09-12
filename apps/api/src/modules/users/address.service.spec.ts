import type { PrismaAddressRepository } from './repositories/prisma-address.repository';
import {
  AddressOwnerUnavailableError,
  CannotUnsetDefaultAddressRepositoryError,
} from './repositories/prisma-address.repository';
import { AddressService } from './address.service';

const ADDRESS = {
  id: 'da589718-edc1-4400-ae4a-3ab7f319ad82',
  receiverName: 'Customer Example',
  phone: '+84901234567',
  addressLine: '12 Nguyễn Trãi',
  wardCode: '00001',
  wardName: 'Phường Hàng Trống',
  provinceCode: '01',
  provinceName: 'Hà Nội',
  note: null,
  isDefault: true,
  createdAt: new Date('2026-09-01T10:00:00.000Z'),
  updatedAt: new Date('2026-09-01T10:00:00.000Z'),
};

describe('AddressService', () => {
  let repository: jest.Mocked<PrismaAddressRepository>;
  let listByUserId: jest.MockedFunction<
    PrismaAddressRepository['listByUserId']
  >;
  let createForUser: jest.MockedFunction<
    PrismaAddressRepository['createForUser']
  >;
  let updateForUser: jest.MockedFunction<
    PrismaAddressRepository['updateForUser']
  >;
  let setDefaultForUser: jest.MockedFunction<
    PrismaAddressRepository['setDefaultForUser']
  >;
  let deleteForUser: jest.MockedFunction<
    PrismaAddressRepository['deleteForUser']
  >;
  let service: AddressService;

  beforeEach(() => {
    listByUserId = jest.fn();
    createForUser = jest.fn();
    updateForUser = jest.fn();
    setDefaultForUser = jest.fn();
    deleteForUser = jest.fn();
    repository = {
      listByUserId,
      createForUser,
      updateForUser,
      setDefaultForUser,
      deleteForUser,
    } as unknown as jest.Mocked<PrismaAddressRepository>;
    service = new AddressService(repository);
  });

  it('lists addresses only through the current user scope', async () => {
    listByUserId.mockResolvedValue([ADDRESS]);

    await expect(service.listOwn('user-id')).resolves.toEqual([ADDRESS]);
    expect(listByUserId).toHaveBeenCalledWith('user-id');
  });

  it('normalizes all create fields before repository mutation', async () => {
    createForUser.mockResolvedValue(ADDRESS);

    await service.createOwn('user-id', {
      receiverName: '  Customer Example  ',
      phone: ' 00 84 901-234-567 ',
      addressLine: '  12 Nguyễn Trãi  ',
      wardCode: ' 00001 ',
      wardName: ' Phường Hàng Trống ',
      provinceCode: ' 01 ',
      provinceName: ' Hà Nội ',
      note: '  Gọi trước khi giao  ',
      isDefault: true,
    });

    expect(createForUser).toHaveBeenCalledWith('user-id', {
      receiverName: 'Customer Example',
      phone: '+84901234567',
      addressLine: '12 Nguyễn Trãi',
      wardCode: '00001',
      wardName: 'Phường Hàng Trống',
      provinceCode: '01',
      provinceName: 'Hà Nội',
      note: 'Gọi trước khi giao',
      isDefault: true,
    });
  });

  it('normalizes only supplied update fields and supports clearing note', async () => {
    updateForUser.mockResolvedValue({
      ...ADDRESS,
      phone: '+84987654321',
      note: null,
    });

    await service.updateOwn('user-id', ADDRESS.id, {
      phone: '00 84 987-654-321',
      note: '',
    });

    expect(updateForUser).toHaveBeenCalledWith('user-id', ADDRESS.id, {
      phone: '+84987654321',
      note: null,
    });
  });

  it.each([
    {
      command: { ...ADDRESS, receiverName: ' ' },
      caseName: 'blank receiver name',
    },
    {
      command: { ...ADDRESS, phone: 'not-a-phone' },
      caseName: 'invalid phone',
    },
    {
      command: { ...ADDRESS, wardCode: '' },
      caseName: 'missing canonical ward code',
    },
  ])('rejects $caseName before create mutation', async ({ command }) => {
    await expect(service.createOwn('user-id', command)).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
    });
    expect(createForUser).not.toHaveBeenCalled();
  });

  it('returns 404 for a cross-user or missing mutation target', async () => {
    updateForUser.mockResolvedValue(null);
    setDefaultForUser.mockResolvedValue(null);
    deleteForUser.mockResolvedValue(false);

    await expect(
      service.updateOwn('user-id', ADDRESS.id, {}),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    await expect(
      service.setOwnDefault('user-id', ADDRESS.id),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    await expect(
      service.deleteOwn('user-id', ADDRESS.id),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('maps a concurrently disabled owner to an invalid session', async () => {
    createForUser.mockRejectedValue(new AddressOwnerUnavailableError());

    await expect(service.createOwn('user-id', ADDRESS)).rejects.toMatchObject({
      code: 'INVALID_SESSION',
    });
  });

  it('prevents directly unsetting the current default', async () => {
    updateForUser.mockRejectedValue(
      new CannotUnsetDefaultAddressRepositoryError(),
    );

    await expect(
      service.updateOwn('user-id', ADDRESS.id, { isDefault: false }),
    ).rejects.toMatchObject({ status: 409 });
  });
});
