import { Module } from '@nestjs/common';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';
import { AuditRepository } from './repositories/audit.repository';
import { PrismaAuditRepository } from './repositories/prisma-audit.repository';

@Module({
  controllers: [AuditController],
  providers: [
    AuditService,
    PrismaAuditRepository,
    { provide: AuditRepository, useExisting: PrismaAuditRepository },
  ],
  exports: [AuditService],
})
export class AuditModule {}
