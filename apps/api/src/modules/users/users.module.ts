import { Module } from '@nestjs/common';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';
import { PrismaProfileRepository } from './repositories/prisma-profile.repository';
import { AddressController } from './address.controller';
import { AddressService } from './address.service';
import { PrismaAddressRepository } from './repositories/prisma-address.repository';
import { AdminUserController } from './admin-user.controller';
import { AdminUserService } from './admin-user.service';
import { PrismaAdminUserRepository } from './repositories/prisma-admin-user.repository';

@Module({
  controllers: [ProfileController, AddressController, AdminUserController],
  providers: [
    ProfileService,
    PrismaProfileRepository,
    AddressService,
    PrismaAddressRepository,
    AdminUserService,
    PrismaAdminUserRepository,
  ],
  exports: [
    ProfileService,
    AddressService,
    AdminUserService,
    PrismaAddressRepository,
  ],
})
export class UsersModule {}
