import type { PrismaAdminUserRepository } from './repositories/prisma-admin-user.repository';
import {
  AdminUserConflictError,
  AdminUserInvalidRoleError,
  AdminUserNotFoundError,
} from './repositories/prisma-admin-user.repository';
import { AdminUserService } from './admin-user.service';
import { ListAdminUsersQueryDto } from './dto/admin-user.dto';

const USER = {
  id: '7c41d61f-dd03-4455-a89f-d3b2cad9c310',
  email: 'customer@example.com',
  fullName: 'Customer Example',
  phone: '+84901234567',
  avatarUrl: null,
  role: 'CUSTOMER' as const,
  status: 'ACTIVE' as const,
  lastLoginAt: null,
  createdAt: new Date('2026-09-01T10:00:00.000Z'),
};

describe('AdminUserService', () => {
  let repository: jest.Mocked<PrismaAdminUserRepository>;
  let list: jest.MockedFunction<PrismaAdminUserRepository['list']>;
  let service: AdminUserService;

  beforeEach(() => {
    list = jest.fn();
    repository = {
      list,
      findById: jest.fn(),
      updateStatus: jest.fn(),
      updateRole: jest.fn(),
    } as unknown as jest.Mocked<PrismaAdminUserRepository>;
    service = new AdminUserService(repository);
  });

  it('passes the allow-listed list query to the repository', async () => {
    const query = new ListAdminUsersQueryDto();
    query.q = '  customer@example.com  ';
    list.mockResolvedValue({
      items: [USER],
      page: 1,
      limit: 20,
      total: 1,
      totalPages: 1,
    });

    await expect(service.list(query)).resolves.toEqual(
      expect.objectContaining({ items: [USER] }),
    );
    expect(list).toHaveBeenCalledWith(query);
  });

  it('maps missing users to a 404 API error', async () => {
    repository.findById.mockResolvedValue(null);

    await expect(service.getById(USER.id)).rejects.toMatchObject({
      status: 404,
      code: 'USER_NOT_FOUND',
    });
  });

  it.each([
    ['CANNOT_DISABLE_SELF', 'updateStatus'],
    ['LAST_ADMIN_PROTECTION', 'updateStatus'],
    ['ROLE_UNCHANGED', 'updateRole'],
  ] as const)(
    'maps %s to a 409 business conflict',
    async (reason, operation) => {
      const error = new AdminUserConflictError(reason);
      if (operation === 'updateStatus') {
        repository.updateStatus.mockRejectedValue(error);
        await expect(
          service.updateStatus(USER.id, USER.id, { status: 'DISABLED' }),
        ).rejects.toMatchObject({ status: 409, code: reason });
      } else {
        repository.updateRole.mockRejectedValue(error);
        await expect(
          service.updateRole(USER.id, USER.id, { role: 'ADMIN' }),
        ).rejects.toMatchObject({ status: 409, code: reason });
      }
    },
  );

  it('maps missing and invalid role targets without swallowing unknown errors', async () => {
    repository.updateRole.mockRejectedValueOnce(new AdminUserNotFoundError());
    await expect(
      service.updateRole(USER.id, 'missing', { role: 'ADMIN' }),
    ).rejects.toMatchObject({ status: 404 });

    repository.updateRole.mockRejectedValueOnce(
      new AdminUserInvalidRoleError(),
    );
    await expect(
      service.updateRole(USER.id, USER.id, { role: 'ADMIN' }),
    ).rejects.toMatchObject({ status: 400, code: 'INVALID_ROLE' });

    repository.updateRole.mockRejectedValueOnce(new Error('database down'));
    await expect(
      service.updateRole(USER.id, USER.id, { role: 'ADMIN' }),
    ).rejects.toThrow('database down');
  });
});
