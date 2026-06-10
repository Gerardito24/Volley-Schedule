#!/usr/bin/env node
"use strict";

/**
 * Smoke-test the public/admin surface split against running dev servers.
 * Prereq: start two dev instances (see docs/DEPLOY_SPLIT.md).
 *
 *   Terminal 1: NEXT_PUBLIC_APP_SURFACE=public NEXT_PUBLIC_ADMIN_APP_URL=http://localhost:3001 npm run dev
 *   Terminal 2: NEXT_PUBLIC_APP_SURFACE=admin npm run dev -- -p 3001
 */

const publicBase = process.env.PUBLIC_BASE || "http://localhost:3000";
const adminBase = process.env.ADMIN_BASE || "http://localhost:3001";

async function check(label, url, expectStatus) {
  const res = await fetch(url, { redirect: "manual" });
  const ok = res.status === expectStatus;
  console.log(`${ok ? "OK" : "FAIL"} ${label}: ${url} → ${res.status} (expected ${expectStatus})`);
  return ok;
}

async function main() {
  const checks = [
    ["public home", `${publicBase}/`, 200],
    ["public blocks /admin", `${publicBase}/admin`, 404],
    ["public blocks /api/admin", `${publicBase}/api/admin/db`, 404],
    ["admin root redirect", `${adminBase}/`, [307, 308]],
    ["admin login", `${adminBase}/admin/login`, 200],
    ["admin profiles (redirect/login)", `${adminBase}/admin/profiles`, [307, 308, 200]],
  ];

  let failed = 0;
  for (const [label, url, expected] of checks) {
    const res = await fetch(url, { redirect: "manual" });
    const expectedList = Array.isArray(expected) ? expected : [expected];
    const ok = expectedList.includes(res.status);
    console.log(`${ok ? "OK" : "FAIL"} ${label}: ${url} → ${res.status}`);
    if (!ok) failed++;
  }

  if (failed > 0) {
    console.error(`\n${failed} check(s) failed. Is the split dev setup running?`);
    process.exit(1);
  }
  console.log("\nSplit smoke test passed.");
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
