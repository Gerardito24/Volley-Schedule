"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { clearSession, getCurrentOperator } from "@/lib/admin-operators-store";
import type { AdminOperator } from "@/lib/admin-operator-types";
import { resolveAdminPageMeta } from "@/lib/admin-nav";
import { Button } from "@/components/admin/ui";

function IconMenu({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
    </svg>
  );
}

type Props = {
  onMenuClick?: () => void;
};

export function AdminTopBar({ onMenuClick }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const pageMeta = resolveAdminPageMeta(pathname);
  const [op, setOp] = useState<AdminOperator | null>(() =>
    typeof window !== "undefined" ? getCurrentOperator() : null,
  );

  useEffect(() => {
    function syncLocal() {
      setOp(getCurrentOperator());
    }
    syncLocal();
    window.addEventListener("volleyschedule-admin-session-changed", syncLocal);
    window.addEventListener("volleyschedule-admin-operators-changed", syncLocal);
    return () => {
      window.removeEventListener("volleyschedule-admin-session-changed", syncLocal);
      window.removeEventListener("volleyschedule-admin-operators-changed", syncLocal);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function syncRemote() {
      const dbRes = await fetch("/api/admin/db", { cache: "no-store" });
      const dbJson = (await dbRes.json().catch(() => ({}))) as { configured?: boolean };
      if (!dbJson.configured || cancelled) return;

      const meRes = await fetch("/api/admin/auth/me", {
        cache: "no-store",
        credentials: "include",
      });
      const me = (await meRes.json().catch(() => ({}))) as {
        operator?: Pick<AdminOperator, "id" | "displayName" | "position" | "username" | "role"> | null;
      };
      if (cancelled || !me.operator) return;

      const o = me.operator;
      setOp({
        id: o.id,
        displayName: o.displayName,
        position: o.position,
        username: o.username,
        passwordHash: "",
        role: o.role,
        createdAt: "",
      });
    }

    void syncRemote();
    return () => {
      cancelled = true;
    };
  }, []);

  async function logout() {
    const dbRes = await fetch("/api/admin/db", { cache: "no-store" });
    const dbJson = (await dbRes.json().catch(() => ({}))) as { configured?: boolean };
    if (dbJson.configured) {
      await fetch("/api/admin/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    }
    clearSession();
    router.replace("/admin/login");
  }

  const barPad =
    "pl-[max(1rem,env(safe-area-inset-left,0px))] pr-[max(1rem,env(safe-area-inset-right,0px))] pt-[max(0.25rem,env(safe-area-inset-top,0px))]";

  const roleLabel = op?.role === "it_master" ? "IT maestro" : op ? "Administrador" : null;

  return (
    <header
      className={`flex min-h-14 shrink-0 flex-col gap-2 border-b border-zinc-200 bg-white py-2 sm:flex-row sm:items-center sm:justify-between ${barPad}`}
    >
      <div className="flex min-w-0 flex-1 items-start gap-2 sm:items-center">
        {onMenuClick ? (
          <button
            type="button"
            onClick={onMenuClick}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-zinc-200 text-zinc-700 hover:bg-zinc-50 lg:hidden"
            aria-label="Abrir menú de navegación"
          >
            <IconMenu className="h-6 w-6" />
          </button>
        ) : null}
        <div className="min-w-0">
          <nav aria-label="Ruta" className="mb-0.5 flex flex-wrap items-center gap-1 text-[11px] text-zinc-500">
            {pageMeta.breadcrumbs.map((crumb, i) => (
              <span key={`${crumb.label}-${i}`} className="flex items-center gap-1">
                {i > 0 ? <span aria-hidden>/</span> : null}
                {crumb.href ? (
                  <Link href={crumb.href} className="hover:text-sky-700">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-zinc-600">{crumb.label}</span>
                )}
              </span>
            ))}
          </nav>
          <h1 className="truncate text-sm font-semibold text-zinc-900 sm:text-base">{pageMeta.title}</h1>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2 self-end sm:self-auto">
        {op ? (
          <p className="hidden text-xs text-zinc-500 sm:block">
            <span className="font-medium text-zinc-800">{op.username}</span>
            {roleLabel ? ` · ${roleLabel}` : null}
          </p>
        ) : null}
        <Button variant="secondary" className="min-h-[36px] px-3 py-1.5 text-xs" onClick={() => void logout()}>
          Salir
        </Button>
      </div>
    </header>
  );
}
