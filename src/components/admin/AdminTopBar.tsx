"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { clearSession, getCurrentOperator } from "@/lib/admin-operators-store";
import type { AdminOperator } from "@/lib/admin-operator-types";

export function AdminTopBar() {
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

  if (!op) {
    return (
      <header className="flex h-14 shrink-0 items-center justify-end border-b border-zinc-200 bg-white px-6">
        <span className="text-xs text-zinc-400">—</span>
      </header>
    );
  }

  const roleLabel = op.role === "it_master" ? "IT maestro" : "Administrador";

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-zinc-200 bg-white px-6">
      <p className="text-xs text-zinc-500">
        Sesión activa · <span className="font-medium text-zinc-800">{op.username}</span> · {roleLabel}
      </p>
      <button
        type="button"
        onClick={logout}
        className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
      >
        Salir
      </button>
    </header>
  );
}
