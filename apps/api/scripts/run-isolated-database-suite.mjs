import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { config } from 'dotenv';
import pg from 'pg';

const ALLOWED_SUITES = new Set(['test:e2e:direct', 'test:db:direct']);
const suite = process.argv[2];
if (!ALLOWED_SUITES.has(suite)) {
  throw new Error(`Unsupported isolated database suite: ${suite ?? '(missing)'}`);
}

const { Client } = pg;
const apiDirectory = fileURLToPath(new URL('..', import.meta.url));
config({ path: join(apiDirectory, '.env'), quiet: true });

const baseConnectionString = process.env.DATABASE_URL;
if (!baseConnectionString) {
  throw new Error('DATABASE_URL is required for isolated database tests');
}

const baseUrl = new URL(baseConnectionString);
if (!['postgres:', 'postgresql:'].includes(baseUrl.protocol)) {
  throw new Error('DATABASE_URL must use PostgreSQL');
}

const baseDatabase = decodeURIComponent(baseUrl.pathname.replace(/^\//, ''));
const isolatedDatabase = `kids_fashion_test_${process.pid}_${Date.now()}`;
if (
  !/^kids_fashion_test_\d+_\d+$/.test(isolatedDatabase) ||
  isolatedDatabase === baseDatabase
) {
  throw new Error('Unsafe isolated database target');
}

const isolatedUrl = new URL(baseUrl);
isolatedUrl.pathname = `/${isolatedDatabase}`;
isolatedUrl.searchParams.set('schema', 'public');

const adminClient = new Client({ connectionString: baseConnectionString });
const pnpmExecutable = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
const pnpmCli = process.env.npm_execpath;

function runScript(script) {
  const command = pnpmCli ? process.execPath : pnpmExecutable;
  const args = pnpmCli ? [pnpmCli, 'run', script] : ['run', script];
  const result = spawnSync(command, args, {
    cwd: apiDirectory,
    env: {
      ...process.env,
      DATABASE_URL: isolatedUrl.toString(),
      NODE_ENV: 'test',
    },
    shell: !pnpmCli && process.platform === 'win32',
    stdio: 'inherit',
  });

  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(`${script} failed with exit code ${result.status ?? 1}`);
  }
}

let databaseCreated = false;
try {
  await adminClient.connect();
  await adminClient.query(`CREATE DATABASE "${isolatedDatabase}"`);
  databaseCreated = true;
  console.log(`Created isolated test database: ${isolatedDatabase}`);

  runScript('db:migrate:deploy');
  runScript('db:seed');
  runScript(suite);
} finally {
  if (databaseCreated) {
    await adminClient.query(
      'SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()',
      [isolatedDatabase],
    );
    await adminClient.query(`DROP DATABASE "${isolatedDatabase}"`);
    console.log(`Removed isolated test database: ${isolatedDatabase}`);
  }
  await adminClient.end().catch(() => undefined);
}
