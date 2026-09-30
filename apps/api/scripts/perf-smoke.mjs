/**
 * Perf smoke (Day 22) — đo p50/p95 latency các endpoint critical.
 * KHÔNG phụ thuộc dependency (dùng global fetch của Node 24).
 *
 * Chạy (sau khi backend đang chạy + đã seed perf):
 *   BASE_URL=http://localhost:8080 node scripts/perf-smoke.mjs
 *
 * Endpoint cần auth: lấy access token (đăng nhập qua Swagger/curl) rồi:
 *   ADMIN_TOKEN=eyJ... STAFF_TOKEN=eyJ... node scripts/perf-smoke.mjs
 * (thiếu token thì bỏ qua endpoint tương ứng)
 *
 * Tham số: N (số request/endpoint, mặc định 200), C (concurrency, mặc định 20).
 */
const BASE_URL = (process.env.BASE_URL ?? 'http://localhost:8080').replace(
  /\/$/,
  '',
);
const N = Number.parseInt(process.env.N ?? '200', 10);
const C = Number.parseInt(process.env.C ?? '20', 10);
const ADMIN_TOKEN = process.env.ADMIN_TOKEN;
const STAFF_TOKEN = process.env.STAFF_TOKEN;

/** @type {{name:string,url:string,token?:string}[]} */
const targets = [
  { name: 'product list (public)', url: '/api/v1/products?page=1&limit=20' },
  {
    name: 'product detail (public)',
    url: '/api/v1/products/perf-product-1',
  },
  {
    name: 'product list + filter+sort',
    url: '/api/v1/products?page=1&limit=20&sort=price_asc',
  },
];
if (ADMIN_TOKEN) {
  targets.push({
    name: 'reporting revenue 30d (admin)',
    url: `/api/v1/reporting/revenue?granularity=day`,
    token: ADMIN_TOKEN,
  });
  targets.push({
    name: 'reporting summary (admin)',
    url: '/api/v1/reporting/summary',
    token: ADMIN_TOKEN,
  });
}
if (STAFF_TOKEN) {
  targets.push({
    name: 'operational order queue (staff)',
    url: '/api/v1/operational/orders?page=1&limit=20',
    token: STAFF_TOKEN,
  });
}

function percentile(sortedMs, p) {
  if (sortedMs.length === 0) return 0;
  const idx = Math.min(
    sortedMs.length - 1,
    Math.ceil((p / 100) * sortedMs.length) - 1,
  );
  return sortedMs[Math.max(0, idx)];
}

async function sampleOne(url, token) {
  const start = performance.now();
  let ok = false;
  let status = 0;
  try {
    const res = await fetch(`${BASE_URL}${url}`, {
      headers: token ? { authorization: `Bearer ${token}` } : {},
    });
    status = res.status;
    ok = res.ok;
    await res.arrayBuffer(); // drain body để đo trọn vòng
  } catch {
    ok = false;
  }
  return { ms: performance.now() - start, ok, status };
}

async function runTarget(target) {
  const latencies = [];
  let errors = 0;
  let queue = N;
  async function worker() {
    while (queue > 0) {
      queue -= 1;
      const r = await sampleOne(target.url, target.token);
      latencies.push(r.ms);
      if (!r.ok) errors += 1;
    }
  }
  const wallStart = performance.now();
  await Promise.all(Array.from({ length: C }, () => worker()));
  const wallMs = performance.now() - wallStart;
  latencies.sort((a, b) => a - b);
  return {
    name: target.name,
    n: latencies.length,
    errors,
    p50: Math.round(percentile(latencies, 50)),
    p95: Math.round(percentile(latencies, 95)),
    max: Math.round(latencies[latencies.length - 1] ?? 0),
    rps: Math.round((latencies.length / wallMs) * 1000),
  };
}

async function main() {
  console.log(`Perf smoke → ${BASE_URL} (N=${N}, C=${C})\n`);
  console.log(
    'endpoint'.padEnd(38),
    'n'.padStart(5),
    'err'.padStart(4),
    'p50'.padStart(6),
    'p95'.padStart(6),
    'max'.padStart(6),
    'rps'.padStart(6),
  );
  console.log('-'.repeat(78));
  for (const t of targets) {
    // warm-up nhẹ để tránh cold-start làm lệch p95
    await sampleOne(t.url, t.token);
    const r = await runTarget(t);
    console.log(
      r.name.padEnd(38),
      String(r.n).padStart(5),
      String(r.errors).padStart(4),
      `${r.p50}ms`.padStart(6),
      `${r.p95}ms`.padStart(6),
      `${r.max}ms`.padStart(6),
      String(r.rps).padStart(6),
    );
  }
  console.log(
    '\nGhi chú: p95 mục tiêu — product list/detail ≤500ms, reporting 30d ≤1500ms, order queue ≤700ms.',
  );
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
