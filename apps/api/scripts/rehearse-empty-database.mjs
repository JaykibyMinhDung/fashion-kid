import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { config } from 'dotenv';
import pg from 'pg';

const { Client } = pg;
const apiDirectory = fileURLToPath(new URL('..', import.meta.url));
config({ path: join(apiDirectory, '.env'), quiet: true });

const baseConnectionString = process.env.DATABASE_URL;
if (!baseConnectionString) {
  throw new Error('DATABASE_URL is required for empty database rehearsal');
}

const baseUrl = new URL(baseConnectionString);
if (!['postgres:', 'postgresql:'].includes(baseUrl.protocol)) {
  throw new Error('DATABASE_URL must use PostgreSQL');
}

const baseDatabase = decodeURIComponent(baseUrl.pathname.replace(/^\//, ''));
const rehearsalDatabase = `kids_fashion_f0_${process.pid}_${Date.now()}`;
if (
  !/^kids_fashion_f0_\d+_\d+$/.test(rehearsalDatabase) ||
  rehearsalDatabase === baseDatabase
) {
  throw new Error('Unsafe rehearsal database target');
}

const rehearsalUrl = new URL(baseUrl);
rehearsalUrl.pathname = `/${rehearsalDatabase}`;
rehearsalUrl.searchParams.set('schema', 'public');

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
      DATABASE_URL: rehearsalUrl.toString(),
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
  await adminClient.query(`CREATE DATABASE "${rehearsalDatabase}"`);
  databaseCreated = true;
  console.log(`Created isolated rehearsal database: ${rehearsalDatabase}`);

  runScript('db:migrate:deploy');
  runScript('db:seed');
  runScript('db:seed');
  runScript('test:db:direct');
  console.log('Empty database rehearsal completed successfully.');
} finally {
  if (databaseCreated) {
    await adminClient.query(
      'SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()',
      [rehearsalDatabase],
    );
    await adminClient.query(`DROP DATABASE "${rehearsalDatabase}"`);
    console.log(`Removed rehearsal database: ${rehearsalDatabase}`);
  }
  await adminClient.end().catch(() => undefined);
}
