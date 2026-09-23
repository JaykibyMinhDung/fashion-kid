import { Test, TestingModule } from '@nestjs/testing';
import type { Request, Response } from 'express';
import { createWorkbook } from '../export/excel-workbook.builder';
import { ReportingExportService } from '../export/reporting-export.service';
import { ReportingExportController } from './reporting-export.controller';

describe('ReportingExportController', () => {
  let controller: ReportingExportController;
  let exportService: jest.Mocked<Partial<ReportingExportService>>;

  const mockUser = {
    id: 'user-admin-1',
    email: 'admin@jaykiby.vn',
    role: 'ADMIN' as const,
  };

  const mockReq = {
    ip: '127.0.0.1',
    headers: { 'x-request-id': 'req-test-123' },
  } as unknown as Request;

  let mockRes: {
    setHeader: jest.Mock;
    write: jest.Mock;
    end: jest.Mock;
  };

  beforeEach(async () => {
    const workbook = createWorkbook('Test');
    workbook.addWorksheet('Sheet1');

    mockRes = {
      setHeader: jest.fn(),
      write: jest.fn(
        (_chunk: unknown, callback?: (err?: Error | null) => void) => {
          if (callback) callback();
          return true;
        },
      ),
      end: jest.fn(),
    };

    exportService = {
      exportSummary: jest.fn().mockResolvedValue({
        workbook,
        filename: 'bao-cao-tong-quan_2026-09-01_2026-09-16.xlsx',
      }),
      exportRevenue: jest.fn().mockResolvedValue({
        workbook,
        filename: 'bao-cao-doanh-thu_2026-09-01_2026-09-16.xlsx',
      }),
      exportConsolidatedWorkbook: jest.fn().mockResolvedValue({
        workbook,
        filename: 'bao-cao-tong-hop_2026-09-01_2026-09-16.xlsx',
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReportingExportController],
      providers: [{ provide: ReportingExportService, useValue: exportService }],
    }).compile();

    controller = module.get<ReportingExportController>(
      ReportingExportController,
    );
  });

  it('should export summary with proper streaming headers', async () => {
    await controller.exportSummary(
      { from: '2026-09-01', to: '2026-09-16' },
      mockUser,
      mockReq,
      mockRes as unknown as Response,
    );

    expect(exportService.exportSummary).toHaveBeenCalledWith(
      { from: '2026-09-01', to: '2026-09-16' },
      {
        actorId: 'user-admin-1',
        ipAddress: '127.0.0.1',
        requestId: 'req-test-123',
      },
    );

    expect(mockRes.setHeader).toHaveBeenCalledWith(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    expect(mockRes.setHeader).toHaveBeenCalledWith(
      'Content-Disposition',
      'attachment; filename="bao-cao-tong-quan_2026-09-01_2026-09-16.xlsx"',
    );
    expect(mockRes.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-store');
    expect(mockRes.end).toHaveBeenCalled();
  });

  it('should export consolidated workbook with proper headers', async () => {
    await controller.exportConsolidatedWorkbook(
      { from: '2026-09-01', to: '2026-09-16', granularity: 'day' },
      mockUser,
      mockReq,
      mockRes as unknown as Response,
    );

    expect(exportService.exportConsolidatedWorkbook).toHaveBeenCalledWith(
      { from: '2026-09-01', to: '2026-09-16', granularity: 'day' },
      {
        actorId: 'user-admin-1',
        ipAddress: '127.0.0.1',
        requestId: 'req-test-123',
      },
    );

    expect(mockRes.setHeader).toHaveBeenCalledWith(
      'Content-Disposition',
      'attachment; filename="bao-cao-tong-hop_2026-09-01_2026-09-16.xlsx"',
    );
    expect(mockRes.end).toHaveBeenCalled();
  });
});
