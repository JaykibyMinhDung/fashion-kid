import { Injectable } from '@nestjs/common';
import {
  canonicalizePhone,
  normalizeFullName,
} from '../../common/security/identity-normalization';
import { invalidSessionError } from '../auth/auth.errors';
import {
  addressNotFoundError,
  addressValidationError,
  cannotUnsetDefaultAddressError,
} from './address.errors';
import {
  AddressOwnerUnavailableError,
  CannotUnsetDefaultAddressRepositoryError,
  type AddressRecord,
  type CreateAddressData,
  PrismaAddressRepository,
  type UpdateAddressData,
} from './repositories/prisma-address.repository';

export type CreateAddressCommand = CreateAddressData;
export type UpdateAddressCommand = UpdateAddressData;

function requiredText(value: string, maximum: number): string {
  const normalized = normalizeFullName(value);
  const length = [...normalized].length;
  if (length === 0 || length > maximum) {
    throw addressValidationError();
  }
  return normalized;
}

function normalizedPhone(value: string): string {
  const phone = canonicalizePhone(value);
  if (!phone || !/^\+?[0-9]{8,15}$/.test(phone)) {
    throw addressValidationError();
  }
  return phone;
}

function optionalNote(
  value: string | null | undefined,
): string | null | undefined {
  if (value === undefined || value === null) {
    return value;
  }
  const note = value.trim();
  if (note.length > 255) {
    throw addressValidationError();
  }
  return note.length === 0 ? null : note;
}

function prepareCreate(command: CreateAddressCommand): CreateAddressData {
  return {
    receiverName: requiredText(command.receiverName, 150),
    phone: normalizedPhone(command.phone),
    addressLine: requiredText(command.addressLine, 255),
    wardCode: requiredText(command.wardCode, 50),
    wardName: requiredText(command.wardName, 120),
    provinceCode: requiredText(command.provinceCode, 50),
    provinceName: requiredText(command.provinceName, 120),
    note: optionalNote(command.note),
    isDefault: command.isDefault,
  };
}

function prepareUpdate(command: UpdateAddressCommand): UpdateAddressData {
  const data: UpdateAddressData = {};
  if (command.receiverName !== undefined) {
    data.receiverName = requiredText(command.receiverName, 150);
  }
  if (command.phone !== undefined) {
    data.phone = normalizedPhone(command.phone);
  }
  if (command.addressLine !== undefined) {
    data.addressLine = requiredText(command.addressLine, 255);
  }
  if (command.wardCode !== undefined) {
    data.wardCode = requiredText(command.wardCode, 50);
  }
  if (command.wardName !== undefined) {
    data.wardName = requiredText(command.wardName, 120);
  }
  if (command.provinceCode !== undefined) {
    data.provinceCode = requiredText(command.provinceCode, 50);
  }
  if (command.provinceName !== undefined) {
    data.provinceName = requiredText(command.provinceName, 120);
  }
  if (command.note !== undefined) {
    data.note = optionalNote(command.note);
  }
  if (command.isDefault !== undefined) {
    data.isDefault = command.isDefault;
  }
  return data;
}

@Injectable()
export class AddressService {
  constructor(private readonly repository: PrismaAddressRepository) {}

  listOwn(userId: string): Promise<AddressRecord[]> {
    return this.repository.listByUserId(userId);
  }

  findOwnById(
    userId: string,
    addressId: string,
  ): Promise<AddressRecord | null> {
    return this.repository.findByIdAndUserId(addressId, userId);
  }

  async createOwn(
    userId: string,
    command: CreateAddressCommand,
  ): Promise<AddressRecord> {
    return this.mapRepositoryErrors(() =>
      this.repository.createForUser(userId, prepareCreate(command)),
    );
  }

  async updateOwn(
    userId: string,
    addressId: string,
    command: UpdateAddressCommand,
  ): Promise<AddressRecord> {
    const address = await this.mapRepositoryErrors(() =>
      this.repository.updateForUser(userId, addressId, prepareUpdate(command)),
    );
    if (!address) {
      throw addressNotFoundError();
    }
    return address;
  }

  async setOwnDefault(
    userId: string,
    addressId: string,
  ): Promise<AddressRecord> {
    const address = await this.mapRepositoryErrors(() =>
      this.repository.setDefaultForUser(userId, addressId),
    );
    if (!address) {
      throw addressNotFoundError();
    }
    return address;
  }

  async deleteOwn(userId: string, addressId: string): Promise<void> {
    const deleted = await this.mapRepositoryErrors(() =>
      this.repository.deleteForUser(userId, addressId),
    );
    if (!deleted) {
      throw addressNotFoundError();
    }
  }

  private async mapRepositoryErrors<T>(
    operation: () => Promise<T>,
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (error instanceof AddressOwnerUnavailableError) {
        throw invalidSessionError();
      }
      if (error instanceof CannotUnsetDefaultAddressRepositoryError) {
        throw cannotUnsetDefaultAddressError();
      }
      throw error;
    }
  }
}
