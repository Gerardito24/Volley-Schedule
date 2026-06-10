CREATE UNIQUE INDEX IF NOT EXISTS "admin_users_one_it_master_idx"
  ON "admin_users" ("role")
  WHERE "role" = 'it_master';
