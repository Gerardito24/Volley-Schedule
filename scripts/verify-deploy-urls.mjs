#!/usr/bin/env node
"use strict";

/**
 * Smoke-test live Vercel deploys for the public/admin split.
 *
 * Usage:
 *   PUBLIC_BASE=https://tu-sitio.vercel.app ADMIN_BASE=https://tu-admin.vercel.app node scripts/verify-deploy-urls.mjs
 */

const publicBase = (process.env.PUBLIC_BASE || "").replace(/\/$/, "");
const adminBase = (process.env.ADMIN_BASE || "").replace(/\/$/, "");

if (!publicBase || !adminBase) {
  console.error(
    "Usage: PUBLIC_BASE=https://public.example.com ADMIN_BASE=https://admin.example.com node scripts/verify-deploy-urls.mjs",
  );
  process.exit(1);
}

async function check(label, url, expectStatuses) {
  const res = await fetch(url, { redirect: "manual" });
  const expected = Array.isArray(expectStatuses) ? expectStatuses : [expectStatuses];
  const ok = expected.includes(res.status);
  console.log(`${ok ? "OK" : "FAIL"} ${label}: ${url} → ${res.status} (expected ${expected.join("|")})`);
  return ok;
}

async function checkJson(label, url, predicate) {
  try {
    const res = await fetch(url, { redirect: "manual" });
    const text = await res.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = null;
    }
    const ok = res.ok && predicate(data);
    console.log(`${ok ? "OK" : "FAIL"} ${label}: ${url} → ${res.status}`);
    if (!ok && data) console.log("  body:", JSON.stringify(data));
    return ok;
  } catch (e) {
    console.log(`FAIL ${label}: ${url} → ${e.message || e}`);
    return false;
  }
}

async function main() {
  console.log(`Public: ${publicBase}`);
  console.log(`Admin:  ${adminBase}\n`);

  const checks = [
    () => check("public home", `${publicBase}/`, 200),
    () => check("public blocks /admin", `${publicBase}/admin`, 404),
    () => check("public blocks /api/admin/db", `${publicBase}/api/admin/db`, 404),
    () => check("admin root redirects to login", `${adminBase}/`, [307, 308]),
    () => check("admin login page", `${adminBase}/admin/login`, 200),
    () =>
      checkJson("admin db-status", `${adminBase}/api/public/db-status`, (d) =>
        Boolean(d && d.configured === true),
      ),
    () =>
      checkJson("admin /api/admin/db", `${adminBase}/api/admin/db`, (d) =>
        Boolean(d && d.configured === true && typeof d.needsSetup === "boolean"),
      ),
  ];

  let failed = 0;
  for (const fn of checks) {
    if (!(await fn())) failed++;
  }

  if (failed > 0) {
    console.error(`\n${failed} check(s) failed. Review Vercel env vars (see docs/DEPLOY_SPLIT.md).`);
    process.exit(1);
  }

  console.log("\nDeploy smoke test passed.");
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
