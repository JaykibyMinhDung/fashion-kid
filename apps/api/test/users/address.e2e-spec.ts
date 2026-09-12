import 'dotenv/config';
import { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AccessTokenService } from '../../src/common/security/access-token.service';
import { PrismaService } from '../../src/database/prisma/prisma.service';
import { createTestApplication } from '../test-app.factory';

type AddressPayload = {
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

describe('Address API (e2e)', () => {
  let app: INestApplication;
  let server: App;
  let prisma: PrismaService;
  let ownerId: string;
  let otherId: string;
  let ownerToken: string;
  let salesToken: string;
  const runId = randomUUID();
  const emails = {
    owner: `address-owner-${runId}@address.test`,
    other: `address-other-${runId}@address.test`,
    sales: `address-sales-${runId}@address.test`,
  };

  const payload = (suffix: string): AddressPayload => ({
    receiverName: `Người nhận ${suffix}`,
    phone: '+84901234567',
    addressLine: `${suffix} Nguyễn Trãi`,
    wardCode: `WARD-${suffix}`,
    wardName: `Phường ${suffix}`,
    provinceCode: `PROVINCE-${suffix}`,
    provinceName: `Tỉnh ${suffix}`,
  });

  beforeAll(async () => {
    app = await createTestApplication();
    // Nest exposes the platform server as `any`; Supertest narrows it to App.
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    server = app.getHttpServer<App>();
    prisma = app.get(PrismaService);
    const [customerRole, salesRole] = await Promise.all([
      prisma.role.findUniqueOrThrow({ where: { code: 'CUSTOMER' } }),
      prisma.role.findUniqueOrThrow({ where: { code: 'SALES_STAFF' } }),
    ]);
    const [owner, other, sales] = await Promise.all([
      prisma.user.create({
        data: {
          roleId: customerRole.id,
          email: emails.owner,
          passwordHash: 'address-owner-password-hash',
          fullName: 'Address Owner',
        },
      }),
      prisma.user.create({
        data: {
          roleId: customerRole.id,
          email: emails.other,
          passwordHash: 'address-other-password-hash',
          fullName: 'Address Other',
        },
      }),
      prisma.user.create({
        data: {
          roleId: salesRole.id,
          email: emails.sales,
          passwordHash: 'address-sales-password-hash',
          fullName: 'Address Sales',
        },
      }),
    ]);
    ownerId = owner.id;
    otherId = other.id;
    const accessTokens = app.get(AccessTokenService);
    [ownerToken, salesToken] = await Promise.all([
      accessTokens.sign(owner.id, 'CUSTOMER'),
      accessTokens.sign(sales.id, 'SALES_STAFF'),
    ]);
  });

  beforeEach(async () => {
    await prisma.address.deleteMany({
      where: { userId: { in: [ownerId, otherId] } },
    });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { email: { in: Object.values(emails) } },
    });
    await app.close();
  });

  it('enforces authentication and address capabilities', async () => {
    await request(server).get('/api/v1/me/addresses').expect(401);
    await request(server)
      .get('/api/v1/me/addresses')
      .set('Authorization', `Bearer ${salesToken}`)
      .expect(403);
    await request(server)
      .get('/api/v1/me/addresses')
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200, []);
  });

  it('auto-defaults the first address and atomically swaps an explicit default', async () => {
    const first = await request(server)
      .post('/api/v1/me/addresses')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send(payload('A'))
      .expect(201);
    const second = await request(server)
      .post('/api/v1/me/addresses')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ ...payload('B'), isDefault: false })
      .expect(201);
    const third = await request(server)
      .post('/api/v1/me/addresses')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ ...payload('C'), isDefault: true })
      .expect(201);

    expect(first.body).toEqual(
      expect.objectContaining({
        isDefault: true,
        receiverName: 'Người nhận A',
      }),
    );
    expect(first.body).not.toHaveProperty('userId');
    expect(second.body).toEqual(expect.objectContaining({ isDefault: false }));
    expect(third.body).toEqual(expect.objectContaining({ isDefault: true }));

    const list = await request(server)
      .get('/api/v1/me/addresses')
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);
    const addresses = list.body as Array<{
      id: string;
      isDefault: boolean;
    }>;
    expect(addresses).toHaveLength(3);
    expect(addresses[0]?.id).toBe((third.body as { id: string }).id);
    expect(addresses.filter((address) => address.isDefault)).toHaveLength(1);
  });

  it('rejects invalid canonical fields and mass assignment', async () => {
    await request(server)
      .post('/api/v1/me/addresses')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ ...payload('A'), wardCode: '' })
      .expect(400);
    await request(server)
      .post('/api/v1/me/addresses')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ ...payload('B'), phone: 'invalid-phone' })
      .expect(400);
    await request(server)
      .post('/api/v1/me/addresses')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ ...payload('C'), userId: otherId })
      .expect(400);

    await expect(
      prisma.address.count({ where: { userId: ownerId } }),
    ).resolves.toBe(0);
  });

  it('updates only an owned address and prevents direct default removal', async () => {
    const created = await prisma.address.create({
      data: { userId: ownerId, ...payload('A'), isDefault: true },
    });

    const updated = await request(server)
      .patch(`/api/v1/me/addresses/${created.id}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        receiverName: '  Người nhận đã sửa  ',
        phone: '00 84 987-654-321',
        note: '  Gọi trước khi giao  ',
      })
      .expect(200);

    expect(updated.body).toEqual(
      expect.objectContaining({
        receiverName: 'Người nhận đã sửa',
        phone: '+84987654321',
        note: 'Gọi trước khi giao',
        isDefault: true,
      }),
    );
    await request(server)
      .patch(`/api/v1/me/addresses/${created.id}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ isDefault: false })
      .expect(409);
  });

  it('returns 404 for every cross-user address mutation without changing it', async () => {
    const foreign = await prisma.address.create({
      data: { userId: otherId, ...payload('FOREIGN'), isDefault: true },
    });

    await request(server)
      .patch(`/api/v1/me/addresses/${foreign.id}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ receiverName: 'Attacker' })
      .expect(404);
    await request(server)
      .patch(`/api/v1/me/addresses/${foreign.id}/default`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(404);
    await request(server)
      .delete(`/api/v1/me/addresses/${foreign.id}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(404);

    await expect(
      prisma.address.findUniqueOrThrow({ where: { id: foreign.id } }),
    ).resolves.toEqual(
      expect.objectContaining({
        receiverName: 'Người nhận FOREIGN',
        isDefault: true,
      }),
    );
  });

  it('reassigns default on delete and permits an empty final list', async () => {
    const first = await prisma.address.create({
      data: { userId: ownerId, ...payload('A'), isDefault: true },
    });
    const second = await prisma.address.create({
      data: { userId: ownerId, ...payload('B'), isDefault: false },
    });

    await request(server)
      .delete(`/api/v1/me/addresses/${first.id}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(204);
    await expect(
      prisma.address.findUniqueOrThrow({ where: { id: second.id } }),
    ).resolves.toEqual(expect.objectContaining({ isDefault: true }));

    await request(server)
      .delete(`/api/v1/me/addresses/${second.id}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(204);
    await expect(
      prisma.address.count({ where: { userId: ownerId } }),
    ).resolves.toBe(0);
  });

  it('serializes concurrent first-create and set-default operations per user', async () => {
    const createResponses = await Promise.all([
      request(server)
        .post('/api/v1/me/addresses')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(payload('A')),
      request(server)
        .post('/api/v1/me/addresses')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(payload('B')),
    ]);
    expect(createResponses.map((response) => response.status)).toEqual([
      201, 201,
    ]);
    let addresses = await prisma.address.findMany({
      where: { userId: ownerId },
    });
    expect(addresses.filter((address) => address.isDefault)).toHaveLength(1);

    const [first, second] = addresses;
    expect(first).toBeDefined();
    expect(second).toBeDefined();
    const defaultResponses = await Promise.all([
      request(server)
        .patch(`/api/v1/me/addresses/${first.id}/default`)
        .set('Authorization', `Bearer ${ownerToken}`),
      request(server)
        .patch(`/api/v1/me/addresses/${second.id}/default`)
        .set('Authorization', `Bearer ${ownerToken}`),
    ]);
    expect(defaultResponses.map((response) => response.status)).toEqual([
      200, 200,
    ]);
    addresses = await prisma.address.findMany({ where: { userId: ownerId } });
    expect(addresses.filter((address) => address.isDefault)).toHaveLength(1);
  });

  it('documents all five address operations under the versioned API', async () => {
    const response = await request(server).get('/api/docs-json').expect(200);
    const document = response.body as { paths?: Record<string, unknown> };

    expect(document.paths).toHaveProperty('/api/v1/me/addresses');
    expect(document.paths).toHaveProperty('/api/v1/me/addresses/{id}');
    expect(document.paths).toHaveProperty('/api/v1/me/addresses/{id}/default');
  });
});
