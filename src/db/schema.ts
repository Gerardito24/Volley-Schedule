import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import type { AdminOperator } from "@/lib/admin-operator-types";
import type { ClubProfile } from "@/lib/club-profile-types";
import type { ImportBatch } from "@/lib/local-import-batches";
import type { RegistrationRowMock, TournamentMock } from "@/lib/mock-data";
import type { TeamRoster } from "@/lib/team-roster-types";

export const adminRoleEnum = pgEnum("admin_role", [
  "it_master",
  "administrator",
]);

export const tournamentStatusEnum = pgEnum("app_tournament_status", [
  "draft",
  "open",
  "closed",
]);

export const registrationStatusEnum = pgEnum("app_registration_status", [
  "draft",
  "pending_payment",
  "paid",
  "under_review",
  "approved",
  "rejected",
  "waitlisted",
]);

export const adminUsers = pgTable("admin_users", {
  id: uuid("id").primaryKey().defaultRandom(),
  username: text("username").notNull().unique(),
  email: text("email"),
  displayName: text("display_name").notNull(),
  position: text("position").notNull().default("Admin"),
  passwordHash: text("password_hash").notNull(),
  role: adminRoleEnum("role").notNull().default("administrator"),
  payload: jsonb("payload").$type<AdminOperator>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const tournaments = pgTable(
  "tournaments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    status: tournamentStatusEnum("status").notNull().default("draft"),
    startsOn: timestamp("starts_on", { withTimezone: false }),
    endsOn: timestamp("ends_on", { withTimezone: false }),
    isPublic: boolean("is_public").notNull().default(true),
    payload: jsonb("payload").$type<TournamentMock>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    statusIdx: index("idx_tournaments_status").on(table.status),
    publicIdx: index("idx_tournaments_is_public").on(table.isPublic),
  }),
);

export const registrations = pgTable(
  "registrations",
  {
    id: text("id").primaryKey(),
    tournamentSlug: text("tournament_slug").notNull(),
    status: registrationStatusEnum("status").notNull().default("draft"),
    registeredAt: timestamp("registered_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true }),
    clubName: text("club_name").notNull(),
    teamName: text("team_name").notNull(),
    categoryId: text("category_id").notNull(),
    subdivisionId: text("subdivision_id"),
    feeCents: integer("fee_cents").notNull().default(0),
    payload: jsonb("payload").$type<RegistrationRowMock>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    savedAt: timestamp("saved_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tournamentIdx: index("idx_registrations_tournament_slug").on(table.tournamentSlug),
    statusIdx: index("idx_registrations_app_status").on(table.status),
    categoryIdx: index("idx_registrations_category").on(table.categoryId),
  }),
);

export const teamRosters = pgTable("team_rosters", {
  registrationId: text("registration_id").primaryKey(),
  id: text("id").notNull(),
  clubSlug: text("club_slug").notNull(),
  tournamentSlug: text("tournament_slug").notNull(),
  categoryId: text("category_id").notNull(),
  payload: jsonb("payload").$type<TeamRoster>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const clubProfiles = pgTable("club_profiles", {
  clubSlug: text("club_slug").primaryKey(),
  displayName: text("display_name").notNull(),
  payload: jsonb("payload").$type<ClubProfile>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const importBatches = pgTable("import_batches", {
  id: text("id").primaryKey(),
  kind: text("kind").notNull().default("registrations"),
  fileName: text("file_name").notNull(),
  payload: jsonb("payload").$type<ImportBatch>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const adminAuditLog = pgTable("admin_audit_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  adminUserId: uuid("admin_user_id").references(() => adminUsers.id),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id"),
  payload: jsonb("payload").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
