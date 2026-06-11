"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { hasItMasterProfile, readSession } from "@/lib/admin-operators-store";

type AuthSnapshot = {
  envDbConfigured: boolean;
  needsSetup: boolean;
  loggedIn: boolean;
  loadError: string | null;
};

const PUBLIC_SHELL_PATHS = new Set(["/admin/setup", "/admin/login"]);
const BYPASS_PATHS = new Set(["/admin/db-migration"]);

export function AdminShell({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  const router = useRouter();
  const authSnapshotRef = useRef<AuthSnapshot | null>(null);
  const initialCheckDone = useRef(false);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (BYPASS_PATHS.has(pathname)) {
      setReady(true);
      return;
    }

    let cancelled = false;

    async function runRemoteDbFlow(): Promise<AuthSnapshot> {
      const dbRes = await fetch("/api/admin/db", { cache: "no-store" });
      if (!dbRes.ok) {
        const errJson = (await dbRes.json().catch(() => ({}))) as { message?: string };
        return {
          envDbConfigured: true,
          needsSetup: false,
          loggedIn: false,
          loadError:
            typeof errJson.message === "string"
              ? errJson.message
              : "No se pudo conectar a la base de datos. Contacta al administrador del sistema.",
        };
      }

      const dbJson = (await dbRes.json().catch(() => ({}))) as {
        configured?: boolean;
        needsSetup?: boolean;
      };
      const needsSetup = Boolean(dbJson.needsSetup);

      if (needsSetup) {
        return { envDbConfigured: true, needsSetup: true, loggedIn: false, loadError: null };
      }

      const meRes = await fetch("/api/admin/auth/me", {
        cache: "no-store",
        credentials: "include",
      });
      const me = (await meRes.json().catch(() => ({}))) as {
        operator?: { id: string } | null;
        message?: string;
      };

      if (!meRes.ok) {
        const message =
          typeof me.message === "string"
            ? me.message
            : "Error de sesión del servidor. Revisa la configuración del portal.";
        return { envDbConfigured: true, needsSetup: false, loggedIn: false, loadError: message };
      }

      return {
        envDbConfigured: true,
        needsSetup: false,
        loggedIn: Boolean(me?.operator),
        loadError: null,
      };
    }

    async function runLocalFlow(): Promise<AuthSnapshot> {
      const hasMaster = hasItMasterProfile();
      if (!hasMaster) {
        return { envDbConfigured: false, needsSetup: true, loggedIn: false, loadError: null };
      }
      const session = readSession();
      return {
        envDbConfigured: false,
        needsSetup: false,
        loggedIn: Boolean(session),
        loadError: null,
      };
    }

    async function evaluateAuth(): Promise<AuthSnapshot> {
      const statusRes = await fetch("/api/public/db-status", { cache: "no-store" });
      const statusJson = (await statusRes.json().catch(() => ({}))) as { configured?: boolean };
      const envDbConfigured = statusRes.ok && Boolean(statusJson.configured);
      if (envDbConfigured) return runRemoteDbFlow();
      return runLocalFlow();
    }

    function applySnapshot(snapshot: AuthSnapshot, path: string) {
      authSnapshotRef.current = snapshot;
      setLoadError(snapshot.loadError);

      if (snapshot.loadError) {
        if (PUBLIC_SHELL_PATHS.has(path)) {
          setReady(true);
          return;
        }
        setReady(true);
        return;
      }

      if (snapshot.needsSetup) {
        if (path !== "/admin/setup" && path !== "/admin/db-migration") {
          router.replace("/admin/setup");
          return;
        }
        setReady(true);
        return;
      }

      if (path === "/admin/setup") {
        router.replace("/admin/login");
        return;
      }

      if (!snapshot.loggedIn) {
        if (path !== "/admin/login") {
          router.replace("/admin/login");
          return;
        }
        setReady(true);
        return;
      }

      if (path === "/admin/login") {
        router.replace("/admin");
        return;
      }

      setReady(true);
    }

    const cached = authSnapshotRef.current;
    const canUseCache =
      initialCheckDone.current &&
      cached &&
      !cached.loadError &&
      !cached.needsSetup &&
      cached.loggedIn &&
      !PUBLIC_SHELL_PATHS.has(pathname);

    if (canUseCache) {
      setReady(true);
      void evaluateAuth().then((snapshot) => {
        if (cancelled) return;
        if (
          snapshot.loadError ||
          snapshot.needsSetup ||
          !snapshot.loggedIn
        ) {
          authSnapshotRef.current = snapshot;
          applySnapshot(snapshot, pathname);
        } else {
          authSnapshotRef.current = snapshot;
        }
      });
      return () => {
        cancelled = true;
      };
    }

    if (!initialCheckDone.current) {
      setReady(false);
    }

    void evaluateAuth().then((snapshot) => {
      if (cancelled) return;
      initialCheckDone.current = true;
      applySnapshot(snapshot, pathname);
    });

    return () => {
      cancelled = true;
    };
  }, [pathname, router]);

  const isPublicShell = PUBLIC_SHELL_PATHS.has(pathname);

  if (!ready) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-zinc-100 text-sm text-zinc-600">
        Cargando…
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-zinc-100 px-4">
        <div className="max-w-md rounded-2xl border border-red-200 bg-white p-6 shadow-sm">
          <h1 className="text-lg font-semibold text-zinc-900">Error de configuración</h1>
          <p className="mt-2 text-sm text-red-800">{loadError}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-4 rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (isPublicShell) {
    return (
      <div className="min-h-dvh bg-zinc-100 px-[max(1rem,env(safe-area-inset-left,0px))] pr-[max(1rem,env(safe-area-inset-right,0px))] pb-[max(1rem,env(safe-area-inset-bottom,0px))] pt-[max(1rem,env(safe-area-inset-top,0px))] text-zinc-900">
        {children}
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-1 bg-zinc-100 text-zinc-900">
      {menuOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          aria-label="Cerrar menú de navegación"
          onClick={() => setMenuOpen(false)}
        />
      ) : null}
      <AdminSidebar menuOpen={menuOpen} />
      <div className="flex min-h-dvh min-w-0 flex-1 flex-col">
        <AdminTopBar onMenuClick={() => setMenuOpen(true)} />
        <div className="flex-1 overflow-auto p-4 pb-[max(1.5rem,env(safe-area-inset-bottom,0px))] sm:p-6 lg:p-8">
          {children}
        </div>
      </div>
    </div>
  );
}
