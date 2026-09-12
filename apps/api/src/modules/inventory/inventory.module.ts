import { Module } from '@nestjs/common';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { InventoryRepository } from './repositories/inventory.repository';
import { PrismaInventoryRepository } from './repositories/prisma-inventory.repository';

@Module({
  controllers: [InventoryController],
  providers: [
    InventoryService,
    PrismaInventoryRepository,
    { provide: InventoryRepository, useExisting: PrismaInventoryRepository },
  ],
  exports: [InventoryRepository, InventoryService],
})
export class InventoryModule {}
