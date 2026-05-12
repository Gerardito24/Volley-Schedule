"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { clearSession, getCurrentOperator } from "@/lib/admin-operators-store";
import type { AdminOperator } from "@/lib/admin-operator-types";

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
  const router = useRouter();
  const [op, setOp] = useState<AdminOperator | null>(() =>
    typeof window !== "undefined" ? getCurrentOperator() : null,
  );

  useEffect(() => {
    function sync() {
      setOp(getCurrentOperator());
    }
    sync();
    window.addEventListener("volleyschedule-admin-session-changed", sync);
    window.addEventListener("volleyschedule-admin-operators-changed", sync);
    return () => {
      window.removeEventListener("volleyschedule-admin-session-changed", sync);
      window.removeEventListener("volleyschedule-admin-operators-changed", sync);
    };
  }, []);

  function logout() {
    clearSession();
    router.replace("/admin/login");
  }

  const barPad =
    "pl-[max(1rem,env(safe-area-inset-left,0px))] pr-[max(1rem,env(safe-area-inset-right,0px))] pt-[max(0.25rem,env(safe-area-inset-top,0px))]";

  if (!op) {
    return (
      <header
        className={`flex h-14 shrink-0 items-center justify-end border-b border-zinc-200 bg-white ${barPad}`}
      >
        <span className="text-xs text-zinc-400">—</span>
      </header>
    );
  }

  const roleLabel = op.role === "it_master" ? "IT maestro" : "Administrador";

  return (
    <header
      className={`flex min-h-14 shrink-0 items-center justify-between gap-2 border-b border-zinc-200 bg-white py-2 ${barPad}`}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2">
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
        <p className="min-w-0 truncate text-xs text-zinc-500">
          Sesión activa · <span className="font-medium text-zinc-800">{op.username}</span> · {roleLabel}
        </p>
      </div>
      <button
        type="button"
        onClick={logout}
        className="shrink-0 rounded-lg border border-zinc-300 px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 min-h-[44px] lg:min-h-0 lg:py-1.5"
      >
        Salir
      </button>
    </header>
  );
}
