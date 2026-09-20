import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Workbook } from 'exceljs';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AccessTokenService } from '../src/common/security/access-token.service';
import { PrismaService } from '../src/database/prisma/prisma.service';
import { UserStatus } from '../src/generated/prisma/client';
import { createTestApplication } from './test-app.factory';

function parseBinary(
  res: request.Response,
  callback: (err: Error | null, body: Buffer) => void,
) {
  const chunks: Buffer[] = [];
  res.on('data', (chunk: Buffer) => {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  });
  res.on('end', () => {
    callback(null, Buffer.concat(chunks));
  });
}

describe('Reporting Export Module (e2e) - Day 31', () => {
  let app: INestApplication;
  let server: App;
  let prisma: PrismaService;

  let customerToken: string;
  let adminToken: string;

  let customerId: string;
  let adminId: string;

  const suffix = randomUUID().slice(0, 8);

  beforeAll(async () => {
    app = await createTestApplication();
    server = app.getHttpServer<App>();
    prisma = app.get(PrismaService);

    const [customerRole, adminRole] = await Promise.all([
      prisma.role.findUniqueOrThrow({ where: { code: 'CUSTOMER' } }),
      prisma.role.findUniqueOrThrow({ where: { code: 'ADMIN' } }),
    ]);

    const accessTokens = app.get(AccessTokenService);

    // 1. Create Customer
    customerId = randomUUID();
    await prisma.user.create({
      data: {
        id: customerId,
        email: `export-cust-${suffix}@example.com`,
        passwordHash: 'dummyhash',
        fullName: 'Khách hàng Export Test',
        roleId: customerRole.id,
        status: UserStatus.ACTIVE,
      },
    });

    // 2. Create Admin
    adminId = randomUUID();
    await prisma.user.create({
      data: {
        id: adminId,
        email: `export-admin-${suffix}@example.com`,
        passwordHash: 'dummyhash',
        fullName: 'Quản trị viên Export Test',
        roleId: adminRole.id,
        status: UserStatus.ACTIVE,
      },
    });

    [customerToken, adminToken] = await Promise.all([
      accessTokens.sign(customerId, 'CUSTOMER'),
      accessTokens.sign(adminId, 'ADMIN'),
    ]);
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.user.deleteMany({
        where: { id: { in: [customerId, adminId].filter((id): id is string => Boolean(id)) } },
      });
    }
    if (app) {
      await app.close();
    }
  });

  it('TC-EXP-01: Guest receives 401 UNAUTHORIZED when exporting workbook', async () => {
    const response = await request(server).get(
      '/api/v1/reporting/export/workbook',
    );
    expect(response.status).toBe(401);
  });

  it('TC-EXP-02: Customer receives 403 FORBIDDEN (missing REPORT_READ)', async () => {
    const response = await request(server)
      .get('/api/v1/reporting/export/workbook')
      .set('Authorization', `Bearer ${customerToken}`);

    expect(response.status).toBe(403);
  });

  it('TC-EXP-03: Admin can export consolidated workbook with all 9 sheets and valid XLSX format', async () => {
    const response = await request(server)
      .get('/api/v1/reporting/export/workbook?from=2026-09-01&to=2026-09-16&granularity=day')
      .set('Authorization', `Bearer ${adminToken}`)
      .buffer(true)
      .parse(parseBinary);

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    expect(response.headers['content-disposition']).toContain(
      'attachment; filename="bao-cao-tong-hop_',
    );

    const buffer = response.body as Buffer;
    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.length).toBeGreaterThan(1000);

    // Verify with exceljs by loading the buffer
    const workbook = new Workbook();
    await workbook.xlsx.load(buffer);

    expect(workbook.worksheets.length).toBe(9);
    const sheetNames = workbook.worksheets.map((s) => s.name);
    expect(sheetNames).toEqual([
      'TongQuan',
      'DoanhThu',
      'DonHang',
      'TopSanPham',
      'TonKho',
      'Coupon',
      'DanhGia',
      'ThanhToan',
      'ThueGTGT',
    ]);

    // Verify PII absence: No personal email or phone number in any cell
    workbook.eachSheet((sheet) => {
      sheet.eachRow((row) => {
        row.eachCell((cell) => {
          const val = String(cell.value ?? '');
          expect(val).not.toContain('@example.com');
          expect(val).not.toMatch(/09\d{8}/);
        });
      });
    });

    // Check ThueGTGT sheet header
    const taxSheet = workbook.getWorksheet('ThueGTGT');
    expect(taxSheet).toBeDefined();
    expect(taxSheet?.getCell('A1').value).toContain('BÁO CÁO THUẾ GIÁ TRỊ GIA TĂNG');
  });

  it('TC-EXP-04: Admin can export individual revenue series report', async () => {
    const response = await request(server)
      .get('/api/v1/reporting/revenue/export?from=2026-09-01&to=2026-09-16&granularity=day')
      .set('Authorization', `Bearer ${adminToken}`)
      .buffer(true)
      .parse(parseBinary);

    expect(response.status).toBe(200);
    expect(response.headers['content-disposition']).toContain(
      'attachment; filename="bao-cao-doanh-thu_',
    );

    const workbook = new Workbook();
    await workbook.xlsx.load(response.body as Buffer);
    expect(workbook.worksheets.length).toBe(1);
    expect(workbook.getWorksheet('DoanhThu')).toBeDefined();
  });

  it('TC-EXP-05: Audit log is recorded for reporting export', async () => {
    const auditLog = await prisma.auditLog.findFirst({
      where: {
        actorId: adminId,
        action: 'REPORT_EXPORTED',
      },
      orderBy: { createdAt: 'desc' },
    });

    expect(auditLog).toBeDefined();
    expect(auditLog?.entityType).toBe('ReportingExport');
    expect(auditLog?.metadata).toBeDefined();
  });
});
