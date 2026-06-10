import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/server/admin-users-repo", () => ({
  hasDbItMaster: vi.fn(),
  isAdminUsernameTaken: vi.fn(),
  upsertDbAdminUser: vi.fn(),
}));

import { hasDbItMaster, isAdminUsernameTaken, upsertDbAdminUser } from "@/server/admin-users-repo";
import { createItMasterInDb } from "@/server/create-it-master-db";

describe("createItMasterInDb", () => {
  beforeEach(() => {
    vi.mocked(hasDbItMaster).mockReset();
    vi.mocked(isAdminUsernameTaken).mockReset();
    vi.mocked(upsertDbAdminUser).mockReset();
  });

  it("rejects when IT master already exists", async () => {
    vi.mocked(hasDbItMaster).mockResolvedValue(true);
    const r = await createItMasterInDb("user", "secret12");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toContain("ya existe");
  });

  it("rejects short password", async () => {
    vi.mocked(hasDbItMaster).mockResolvedValue(false);
    const r = await createItMasterInDb("user", "abc");
    expect(r.ok).toBe(false);
  });

  it("creates IT master with fixed name and role", async () => {
    vi.mocked(hasDbItMaster).mockResolvedValue(false);
    vi.mocked(isAdminUsernameTaken).mockResolvedValue(false);
    vi.mocked(upsertDbAdminUser).mockImplementation(async (op) => op);

    const r = await createItMasterInDb("gera", "secret12", "org@example.com");
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.operator.role).toBe("it_master");
      expect(r.operator.id).toBe("it-master");
      expect(r.operator.displayName).toBe("Gerardo Gonzalez");
      expect(r.operator.organizerEmail).toBe("org@example.com");
    }
  });
});
