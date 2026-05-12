import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const local: Record<string, string> = {};
const sess: Record<string, string> = {};

function installBrowserMocks() {
  vi.stubGlobal(
    "window",
    {
      localStorage: {
        getItem: (k: string) => local[k] ?? null,
        setItem: (k: string, v: string) => {
          local[k] = v;
        },
        removeItem: (k: string) => {
          delete local[k];
        },
      },
      sessionStorage: {
        getItem: (k: string) => sess[k] ?? null,
        setItem: (k: string, v: string) => {
          sess[k] = v;
        },
        removeItem: (k: string) => {
          delete sess[k];
        },
      },
      dispatchEvent: vi.fn(),
    } as unknown as Window & typeof globalThis,
  );
}

beforeEach(() => {
  Object.keys(local).forEach((k) => delete local[k]);
  Object.keys(sess).forEach((k) => delete sess[k]);
  installBrowserMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("admin-operators-store", () => {
  it("createItMaster once and rejects second", async () => {
    const { createItMaster, hasItMasterProfile, readOperators } = await import(
      "@/lib/admin-operators-store"
    );
    const {
      IT_MASTER_PROFILE_ID,
      IT_MASTER_DISPLAY_NAME,
      IT_MASTER_POSITION,
    } = await import("@/lib/admin-operator-types");

    const a = createItMaster("gera", "secret12");
    expect(a.ok).toBe(true);
    expect(hasItMasterProfile()).toBe(true);
    const list = readOperators();
    expect(list).toHaveLength(1);
    expect(list[0]!.id).toBe(IT_MASTER_PROFILE_ID);
    expect(list[0]!.displayName).toBe(IT_MASTER_DISPLAY_NAME);
    expect(list[0]!.position).toBe(IT_MASTER_POSITION);
    expect(list[0]!.role).toBe("it_master");

    const b = createItMaster("other", "secret12");
    expect(b.ok).toBe(false);
  });

  it("tryLogin succeeds with correct password", async () => {
    const { createItMaster, tryLogin } = await import("@/lib/admin-operators-store");
    createItMaster("u1", "pass1234");
    const op = tryLogin("u1", "pass1234");
    expect(op).not.toBeNull();
    expect(op!.username).toBe("u1");
    expect(tryLogin("u1", "wrong")).toBeNull();
  });

  it("administrator cannot delete IT master", async () => {
    const {
      createItMaster,
      addAdministrator,
      deleteOperator,
      readOperators,
    } = await import("@/lib/admin-operators-store");
    createItMaster("it", "pass1234");
    const it = readOperators().find((o) => o.role === "it_master")!;
    addAdministrator(it, "Admin", "Dueño", "admin1", "pass1234");
    const admin = readOperators().find((o) => o.role === "administrator")!;
    const del = deleteOperator(admin, it.id);
    expect(del.ok).toBe(false);
  });

  it("IT master can delete self", async () => {
    const { createItMaster, deleteOperator, readOperators, hasItMasterProfile } =
      await import("@/lib/admin-operators-store");
    createItMaster("it", "pass1234");
    const it = readOperators()[0]!;
    const del = deleteOperator(it, it.id);
    expect(del.ok).toBe(true);
    expect(hasItMasterProfile()).toBe(false);
  });

  it("administrator can delete another administrator", async () => {
    const {
      createItMaster,
      addAdministrator,
      deleteOperator,
      readOperators,
    } = await import("@/lib/admin-operators-store");
    createItMaster("it", "pass1234");
    const it = readOperators().find((o) => o.role === "it_master")!;
    addAdministrator(it, "A1", "X", "a1", "pass1234");
    addAdministrator(it, "A2", "Y", "a2", "pass1234");
    const admins = readOperators().filter((o) => o.role === "administrator");
    expect(admins).toHaveLength(2);
    const admin1 = readOperators().find((o) => o.username === "a1")!;
    const admin2 = readOperators().find((o) => o.username === "a2")!;
    const del = deleteOperator(admin1, admin2.id);
    expect(del.ok).toBe(true);
    expect(readOperators().filter((o) => o.role === "administrator")).toHaveLength(1);
  });
});
