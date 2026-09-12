import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../../database/prisma/prisma.service';
import type { PrismaTransactionClient } from '../../../database/prisma/prisma.types';

const ADDRESS_SELECT = {
  id: true,
  receiverName: true,
  phone: true,
  addressLine: true,
  wardCode: true,
  wardName: true,
  provinceCode: true,
  provinceName: true,
  note: true,
  isDefault: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.AddressSelect;

export type AddressRecord = Prisma.AddressGetPayload<{
  select: typeof ADDRESS_SELECT;
}>;

export type CreateAddressData = {
  receiverName: string;
  phone: string;
  addressLine: string;
  wardCode: string;
  wardName: string;
  provinceCode: string;
  provinceName: string;
  note?: string | null;
  isDefault?: boolean;
};

export type UpdateAddressData = Partial<CreateAddressData>;

type LockedUserRow = { id: string };

export class AddressOwnerUnavailableError extends Error {}
export class CannotUnsetDefaultAddressRepositoryError extends Error {}

@Injectable()
export class PrismaAddressRepository {
  constructor(private readonly prisma: PrismaService) {}

  listByUserId(userId: string): Promise<AddressRecord[]> {
    return this.prisma.address.findMany({
      where: { userId, user: { status: 'ACTIVE' } },
      orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }, { id: 'desc' }],
      select: ADDRESS_SELECT,
    });
  }

  findByIdAndUserId(
    addressId: string,
    userId: string,
  ): Promise<AddressRecord | null> {
    return this.prisma.address.findFirst({
      where: { id: addressId, userId, user: { status: 'ACTIVE' } },
      select: ADDRESS_SELECT,
    });
  }

  createForUser(
    userId: string,
    data: CreateAddressData,
  ): Promise<AddressRecord> {
    return this.prisma.$transaction(async (transaction) => {
      await this.lockActiveOwner(transaction, userId);
      const existing = await transaction.address.findFirst({
        where: { userId },
        select: { id: true },
      });
      const { isDefault, ...fields } = data;
      const shouldBeDefault = !existing || isDefault === true;
      if (shouldBeDefault && existing) {
        await transaction.address.updateMany({
          where: { userId, isDefault: true },
          data: { isDefault: false },
        });
      }

      return transaction.address.create({
        data: { ...fields, userId, isDefault: shouldBeDefault },
        select: ADDRESS_SELECT,
      });
    });
  }

  updateForUser(
    userId: string,
    addressId: string,
    data: UpdateAddressData,
  ): Promise<AddressRecord | null> {
    return this.prisma.$transaction(async (transaction) => {
      await this.lockActiveOwner(transaction, userId);
      const current = await transaction.address.findFirst({
        where: { id: addressId, userId },
        select: ADDRESS_SELECT,
      });
      if (!current) {
        return null;
      }
      if (data.isDefault === false && current.isDefault) {
        throw new CannotUnsetDefaultAddressRepositoryError();
      }

      const { isDefault, ...fields } = data;
      if (Object.keys(fields).length > 0) {
        await transaction.address.update({
          where: { id: addressId },
          data: fields,
        });
      }
      if (isDefault === true) {
        await this.swapDefault(transaction, userId, addressId);
      }

      return transaction.address.findUniqueOrThrow({
        where: { id: addressId },
        select: ADDRESS_SELECT,
      });
    });
  }

  setDefaultForUser(
    userId: string,
    addressId: string,
  ): Promise<AddressRecord | null> {
    return this.prisma.$transaction(async (transaction) => {
      await this.lockActiveOwner(transaction, userId);
      const target = await transaction.address.findFirst({
        where: { id: addressId, userId },
        select: { id: true },
      });
      if (!target) {
        return null;
      }

      await this.swapDefault(transaction, userId, addressId);
      return transaction.address.findUniqueOrThrow({
        where: { id: addressId },
        select: ADDRESS_SELECT,
      });
    });
  }

  deleteForUser(userId: string, addressId: string): Promise<boolean> {
    return this.prisma.$transaction(async (transaction) => {
      await this.lockActiveOwner(transaction, userId);
      const target = await transaction.address.findFirst({
        where: { id: addressId, userId },
        select: { id: true, isDefault: true },
      });
      if (!target) {
        return false;
      }

      await transaction.address.delete({ where: { id: addressId } });
      if (target.isDefault) {
        const replacement = await transaction.address.findFirst({
          where: { userId },
          orderBy: [
            { updatedAt: 'desc' },
            { createdAt: 'desc' },
            { id: 'desc' },
          ],
          select: { id: true },
        });
        if (replacement) {
          await transaction.address.update({
            where: { id: replacement.id },
            data: { isDefault: true },
          });
        }
      }
      return true;
    });
  }

  private async lockActiveOwner(
    transaction: PrismaTransactionClient,
    userId: string,
  ): Promise<void> {
    const rows = await transaction.$queryRaw<LockedUserRow[]>`
      SELECT "id"
      FROM "users"
      WHERE "id" = ${userId}::uuid AND "status" = 'ACTIVE'
      FOR UPDATE
    `;
    if (!rows[0]) {
      throw new AddressOwnerUnavailableError();
    }
  }

  private async swapDefault(
    transaction: PrismaTransactionClient,
    userId: string,
    addressId: string,
  ): Promise<void> {
    await transaction.address.updateMany({
      where: { userId, isDefault: true, id: { not: addressId } },
      data: { isDefault: false },
    });
    await transaction.address.update({
      where: { id: addressId },
      data: { isDefault: true },
    });
  }
}
