#!/usr/bin/env node
"use strict";

/**
 * Validates environment variables for Vercel split deploys.
 * Usage:
 *   node scripts/check-deploy-env.mjs public
 *   node scripts/check-deploy-env.mjs admin
 */

const surface = (process.argv[2] || "").trim().toLowerCase();

if (surface !== "public" && surface !== "admin") {
  console.error("Usage: node scripts/check-deploy-env.mjs <public|admin>");
  process.exit(1);
}

const has = (key) => Boolean(process.env[key]?.trim());

const errors = [];
const warnings = [];

if (surface === "public") {
  if (!has("NEXT_PUBLIC_APP_SURFACE") || process.env.NEXT_PUBLIC_APP_SURFACE !== "public") {
    errors.push("NEXT_PUBLIC_APP_SURFACE must be 'public'");
  }
  if (!has("DATABASE_URL") && !has("DATABASE_URL_POOLED")) {
    warnings.push("DATABASE_URL or DATABASE_URL_POOLED recommended for shared tournaments data");
  }
  if (!has("NEXT_PUBLIC_ADMIN_APP_URL")) {
    warnings.push("NEXT_PUBLIC_ADMIN_APP_URL recommended so public site links to admin subdomain");
  }
  if (has("ADMIN_SESSION_SECRET")) {
    errors.push("ADMIN_SESSION_SECRET must NOT be set on the public project");
  }
} else {
  if (!has("NEXT_PUBLIC_APP_SURFACE") || process.env.NEXT_PUBLIC_APP_SURFACE !== "admin") {
    errors.push("NEXT_PUBLIC_APP_SURFACE must be 'admin'");
  }
  if (!has("DATABASE_URL") && !has("DATABASE_URL_POOLED")) {
    errors.push("DATABASE_URL or DATABASE_URL_POOLED is required on the admin project");
  }
  if (!has("ADMIN_SESSION_SECRET")) {
    errors.push("ADMIN_SESSION_SECRET is required on the admin project");
  }
}

console.log(`Checking Vercel env for surface: ${surface}`);
for (const w of warnings) console.log(`WARN: ${w}`);
for (const e of errors) console.error(`ERROR: ${e}`);

if (errors.length > 0) {
  console.error(`\n${errors.length} error(s). Fix env vars in Vercel → Settings → Environment Variables.`);
  process.exit(1);
}

console.log("\nOK — required variables look correct for this surface.");
if (surface === "admin") {
  console.log("Next: run `npm run db:migrate` once, then open /admin/setup on the admin domain.");
}
