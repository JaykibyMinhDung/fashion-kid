import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../src/generated/prisma/client';

type ColumnRow = {
  columnName: string;
  isNullable: 'YES' | 'NO';
};

type IndexRow = {
  indexName: string;
  indexDefinition: string;
};

describe('Auth database schema', () => {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is required for auth schema tests');
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });

  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('has required refresh-session family and persistence columns', async () => {
    const columns = await prisma.$queryRaw<ColumnRow[]>`
      SELECT
        column_name AS "columnName",
        is_nullable AS "isNullable"
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'refresh_tokens'
        AND column_name IN ('family_id', 'is_persistent')
      ORDER BY column_name
    `;

    expect(columns).toEqual([
      { columnName: 'family_id', isNullable: 'NO' },
      { columnName: 'is_persistent', isNullable: 'NO' },
    ]);
  });

  it('has indexes for family and user revocation queries', async () => {
    const indexes = await prisma.$queryRaw<IndexRow[]>`
      SELECT
        indexname AS "indexName",
        indexdef AS "indexDefinition"
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND tablename = 'refresh_tokens'
        AND indexname IN (
          'refresh_tokens_family_id_revoked_at_idx',
          'refresh_tokens_user_id_revoked_at_idx'
        )
      ORDER BY indexname
    `;

    expect(indexes.map((index) => index.indexName)).toEqual([
      'refresh_tokens_family_id_revoked_at_idx',
      'refresh_tokens_user_id_revoked_at_idx',
    ]);
    expect(
      indexes.every((index) => index.indexDefinition.includes('revoked_at')),
    ).toBe(true);
  });

  it('enforces canonical lowercase trimmed email at the database boundary', async () => {
    const constraints = await prisma.$queryRaw<Array<{ name: string }>>`
      SELECT conname AS "name"
      FROM pg_constraint
      WHERE conrelid = 'users'::regclass
        AND contype = 'c'
        AND conname = 'users_email_canonical_check'
    `;

    expect(constraints).toEqual([{ name: 'users_email_canonical_check' }]);
  });

  it('stores a non-negative auth version with a zero default', async () => {
    const columns = await prisma.$queryRaw<
      Array<{
        columnName: string;
        isNullable: 'YES' | 'NO';
        columnDefault: string | null;
      }>
    >`
      SELECT
        column_name AS "columnName",
        is_nullable AS "isNullable",
        column_default AS "columnDefault"
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'users'
        AND column_name = 'auth_version'
    `;
    const constraints = await prisma.$queryRaw<Array<{ name: string }>>`
      SELECT conname AS "name"
      FROM pg_constraint
      WHERE conrelid = 'users'::regclass
        AND contype = 'c'
        AND conname = 'users_auth_version_nonnegative_check'
    `;

    expect(columns).toEqual([
      { columnName: 'auth_version', isNullable: 'NO', columnDefault: '0' },
    ]);
    expect(constraints).toEqual([
      { name: 'users_auth_version_nonnegative_check' },
    ]);
  });
});
