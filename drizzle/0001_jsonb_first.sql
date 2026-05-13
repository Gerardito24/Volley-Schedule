CREATE TYPE "admin_role" AS ENUM ('it_master', 'administrator');
CREATE TYPE "app_tournament_status" AS ENUM ('draft', 'open', 'closed');
CREATE TYPE "app_registration_status" AS ENUM (
  'draft',
  'pending_payment',
  'paid',
  'under_review',
  'approved',
  'rejected',
  'waitlisted'
);

CREATE TABLE IF NOT EXISTS "admin_users" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "username" text NOT NULL UNIQUE,
  "email" text,
  "display_name" text NOT NULL,
  "position" text NOT NULL DEFAULT 'Admin',
  "password_hash" text NOT NULL,
  "role" "admin_role" NOT NULL DEFAULT 'administrator',
  "payload" jsonb NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "tournaments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "slug" text NOT NULL UNIQUE,
  "name" text NOT NULL,
  "status" "app_tournament_status" NOT NULL DEFAULT 'draft',
  "starts_on" timestamp,
  "ends_on" timestamp,
  "is_public" boolean NOT NULL DEFAULT true,
  "payload" jsonb NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "registrations" (
  "id" text PRIMARY KEY NOT NULL,
  "tournament_slug" text NOT NULL,
  "status" "app_registration_status" NOT NULL DEFAULT 'draft',
  "registered_at" timestamptz,
  "updated_at" timestamptz,
  "club_name" text NOT NULL,
  "team_name" text NOT NULL,
  "category_id" text NOT NULL,
  "subdivision_id" text,
  "fee_cents" integer NOT NULL DEFAULT 0,
  "payload" jsonb NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "saved_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "team_rosters" (
  "registration_id" text PRIMARY KEY NOT NULL,
  "id" text NOT NULL,
  "club_slug" text NOT NULL,
  "tournament_slug" text NOT NULL,
  "category_id" text NOT NULL,
  "payload" jsonb NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "club_profiles" (
  "club_slug" text PRIMARY KEY NOT NULL,
  "display_name" text NOT NULL,
  "payload" jsonb NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "import_batches" (
  "id" text PRIMARY KEY NOT NULL,
  "kind" text NOT NULL DEFAULT 'registrations',
  "file_name" text NOT NULL,
  "payload" jsonb NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "admin_audit_log" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "admin_user_id" uuid REFERENCES "admin_users"("id"),
  "action" text NOT NULL,
  "entity_type" text NOT NULL,
  "entity_id" text,
  "payload" jsonb,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_tournaments_status" ON "tournaments" ("status");
CREATE INDEX IF NOT EXISTS "idx_tournaments_is_public" ON "tournaments" ("is_public");
CREATE INDEX IF NOT EXISTS "idx_registrations_tournament_slug" ON "registrations" ("tournament_slug");
CREATE INDEX IF NOT EXISTS "idx_registrations_app_status" ON "registrations" ("status");
CREATE INDEX IF NOT EXISTS "idx_registrations_category" ON "registrations" ("category_id");
