import { Module } from '@nestjs/common';
import { CatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';
import { PrismaCatalogRepository } from './repositories/prisma-catalog.repository';
import { AdminCatalogController } from './admin-catalog.controller';
import { AdminCatalogService } from './admin-catalog.service';
import { PrismaAdminCatalogRepository } from './repositories/prisma-admin-catalog.repository';
import { AdminMasterController } from './admin-master.controller';
import { AdminMasterService } from './admin-master.service';
import { PrismaAdminMasterRepository } from './repositories/prisma-admin-master.repository';
import { AdminProductController } from './admin-product.controller';
import { AdminProductService } from './admin-product.service';
import { PrismaAdminProductRepository } from './repositories/prisma-admin-product.repository';

@Module({
  controllers: [
    CatalogController,
    AdminCatalogController,
    AdminMasterController,
    AdminProductController,
  ],
  providers: [
    CatalogService,
    PrismaCatalogRepository,
    AdminCatalogService,
    PrismaAdminCatalogRepository,
    AdminMasterService,
    PrismaAdminMasterRepository,
    AdminProductService,
    PrismaAdminProductRepository,
  ],
  exports: [CatalogService],
})
export class CatalogModule {}
