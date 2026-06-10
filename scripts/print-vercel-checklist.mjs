#!/usr/bin/env node
"use strict";

/**
 * Prints the Vercel env checklist for both split deploy projects.
 * Run after copying env vars from Vercel into .env.local (or export in shell).
 */

console.log(`
=== Checklist: proyecto PÚBLICO (Vercel) ===
  NEXT_PUBLIC_APP_SURFACE=public
  DATABASE_URL or DATABASE_URL_POOLED  (Railway connection string)
  NEXT_PUBLIC_ADMIN_APP_URL            (admin URL, no trailing slash)
  DO NOT set ADMIN_SESSION_SECRET

=== Checklist: proyecto ADMIN (Vercel) ===
  NEXT_PUBLIC_APP_SURFACE=admin
  DATABASE_URL or DATABASE_URL_POOLED  (same Railway DB as public)
  ADMIN_SESSION_SECRET                 (long random string, admin only)

=== After changing env vars ===
  Redeploy BOTH projects (NEXT_PUBLIC_* are baked at build time).

=== Validate locally (copy env from each Vercel project) ===
  npm run check:deploy-env public
  npm run check:deploy-env admin

=== Validate live deploys ===
  PUBLIC_BASE=https://... ADMIN_BASE=https://... npm run verify:deploy-urls

=== Database (once) ===
  npm run db:migrate   (with DATABASE_URL pointing to Railway)
`);

process.exit(0);
