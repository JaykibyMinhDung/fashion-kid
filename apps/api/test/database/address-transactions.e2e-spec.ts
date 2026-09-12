import 'dotenv/config';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../src/database/prisma/prisma.service';
import {
  AddressOwnerUnavailableError,
  PrismaAddressRepository,
} from '../../src/modules/users/repositories/prisma-address.repository';

describe('Address transaction invariants (database)', () => {
  const prisma = new PrismaService(new ConfigService(process.env));
  const repository = new PrismaAddressRepository(prisma);
  const email = `address-db-${randomUUID()}@address.test`;
  let userId: string;

  const data = (suffix: string) => ({
    receiverName: `Người nhận ${suffix}`,
    phone: '+84901234567',
    addressLine: `${suffix} Nguyễn Trãi`,
    wardCode: `WARD-${suffix}`,
    wardName: `Phường ${suffix}`,
    provinceCode: `PROVINCE-${suffix}`,
    provinceName: `Tỉnh ${suffix}`,
  });

  beforeAll(async () => {
    await prisma.$connect();
    const customerRole = await prisma.role.findUniqueOrThrow({
      where: { code: 'CUSTOMER' },
    });
    const user = await prisma.user.create({
      data: {
        roleId: customerRole.id,
        email,
        passwordHash: 'address-db-password-hash',
        fullName: 'Address DB User',
      },
    });
    userId = user.id;
  });

  beforeEach(async () => {
    await prisma.user.update({
      where: { id: userId },
      data: { status: 'ACTIVE' },
    });
    await prisma.address.deleteMany({ where: { userId } });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email } });
    await prisma.$disconnect();
  });

  it('serializes concurrent first-address creation behind the owner row lock', async () => {
    await Promise.all([
      repository.createForUser(userId, data('A')),
      repository.createForUser(userId, data('B')),
    ]);

    const addresses = await prisma.address.findMany({ where: { userId } });
    expect(addresses).toHaveLength(2);
    expect(addresses.filter((address) => address.isDefault)).toHaveLength(1);
  });

  it('serializes concurrent default swaps and keeps the partial index valid', async () => {
    const first = await repository.createForUser(userId, data('A'));
    const second = await repository.createForUser(userId, data('B'));
    const third = await repository.createForUser(userId, data('C'));

    await Promise.all([
      repository.setDefaultForUser(userId, second.id),
      repository.setDefaultForUser(userId, third.id),
    ]);

    const addresses = await prisma.address.findMany({ where: { userId } });
    expect(addresses).toHaveLength(3);
    expect(addresses.filter((address) => address.isDefault)).toHaveLength(1);
    expect(addresses.some((address) => address.id === first.id)).toBe(true);
  });

  it('assigns a replacement in the same transaction when deleting default', async () => {
    const first = await repository.createForUser(userId, data('A'));
    await repository.createForUser(userId, data('B'));

    await expect(repository.deleteForUser(userId, first.id)).resolves.toBe(
      true,
    );

    const addresses = await prisma.address.findMany({ where: { userId } });
    expect(addresses).toHaveLength(1);
    expect(addresses[0]?.isDefault).toBe(true);
  });

  it('rejects mutation after the owner is disabled', async () => {
    await prisma.user.update({
      where: { id: userId },
      data: { status: 'DISABLED' },
    });

    await expect(
      repository.createForUser(userId, data('A')),
    ).rejects.toBeInstanceOf(AddressOwnerUnavailableError);
  });
});
