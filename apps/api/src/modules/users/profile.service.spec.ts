import type { PrismaProfileRepository } from './repositories/prisma-profile.repository';
import { ProfileService } from './profile.service';

const PROFILE = {
  id: '7c41d61f-dd03-4455-a89f-d3b2cad9c310',
  email: 'customer@example.com',
  fullName: 'Customer Example',
  phone: '+84901234567',
  avatarUrl: null,
  role: 'CUSTOMER' as const,
  status: 'ACTIVE' as const,
  lastLoginAt: new Date('2026-09-02T10:00:00.000Z'),
  createdAt: new Date('2026-09-01T10:00:00.000Z'),
};

describe('ProfileService', () => {
  let repository: jest.Mocked<PrismaProfileRepository>;
  let findByUserId: jest.MockedFunction<
    PrismaProfileRepository['findByUserId']
  >;
  let updateByUserId: jest.MockedFunction<
    PrismaProfileRepository['updateByUserId']
  >;
  let service: ProfileService;

  beforeEach(() => {
    findByUserId = jest.fn();
    updateByUserId = jest.fn();
    repository = {
      findByUserId,
      updateByUserId,
    } as unknown as jest.Mocked<PrismaProfileRepository>;
    service = new ProfileService(repository);
  });

  it('returns the allow-listed ACTIVE profile', async () => {
    repository.findByUserId.mockResolvedValue(PROFILE);

    await expect(service.getOwnProfile(PROFILE.id)).resolves.toEqual(PROFILE);
    expect(findByUserId).toHaveBeenCalledWith(PROFILE.id);
  });

  it('normalizes editable fields before persisting them', async () => {
    const updated = {
      ...PROFILE,
      fullName: 'Updated Customer',
      phone: '+84987654321',
      avatarUrl: 'https://cdn.example.com/avatar.png',
    };
    repository.updateByUserId.mockResolvedValue(updated);

    await expect(
      service.updateOwnProfile(PROFILE.id, {
        fullName: '  Updated Customer  ',
        phone: ' 00 84 987-654-321 ',
        avatarUrl: ' https://cdn.example.com/avatar.png ',
      }),
    ).resolves.toEqual(updated);
    expect(updateByUserId).toHaveBeenCalledWith(PROFILE.id, {
      fullName: 'Updated Customer',
      phone: '+84987654321',
      avatarUrl: 'https://cdn.example.com/avatar.png',
    });
  });

  it('supports explicitly clearing nullable fields', async () => {
    repository.updateByUserId.mockResolvedValue({
      ...PROFILE,
      phone: null,
      avatarUrl: null,
    });

    await service.updateOwnProfile(PROFILE.id, {
      phone: null,
      avatarUrl: '',
    });

    expect(updateByUserId).toHaveBeenCalledWith(PROFILE.id, {
      phone: null,
      avatarUrl: null,
    });
  });

  it.each([
    { command: { fullName: ' ' }, caseName: 'invalid full name' },
    { command: { phone: 'not-a-phone' }, caseName: 'invalid phone' },
    {
      command: { avatarUrl: 'ftp://example.com/avatar.png' },
      caseName: 'invalid avatar URL',
    },
  ])('rejects $caseName before repository mutation', async ({ command }) => {
    await expect(
      service.updateOwnProfile(PROFILE.id, command),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
    expect(updateByUserId).not.toHaveBeenCalled();
  });

  it('treats a missing or disabled current profile as an invalid session', async () => {
    repository.findByUserId.mockResolvedValueOnce(null).mockResolvedValueOnce({
      ...PROFILE,
      status: 'DISABLED',
    });

    await expect(service.getOwnProfile(PROFILE.id)).rejects.toMatchObject({
      code: 'INVALID_SESSION',
    });
    await expect(service.getOwnProfile(PROFILE.id)).rejects.toMatchObject({
      code: 'INVALID_SESSION',
    });
  });

  it('returns the current profile for an empty patch without writing', async () => {
    repository.findByUserId.mockResolvedValue(PROFILE);

    await expect(service.updateOwnProfile(PROFILE.id, {})).resolves.toEqual(
      PROFILE,
    );
    expect(updateByUserId).not.toHaveBeenCalled();
  });
});
