"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useMergedTournaments } from "@/hooks/use-merged-tournaments";
import { mergeAdminRegistrations } from "@/lib/merge-registrations";
import { registrationRows as seedRows } from "@/lib/mock-data";
import { readStoredRegistrations } from "@/lib/local-registrations";
import {
  getActiveLiveTournaments,
  localDateString,
} from "@/lib/tournament-active-window";
import { Card, Button } from "@/components/admin/ui";

const modules = [
  {
    href: "/admin/tournaments",
    title: "Torneos",
    description: "Crear, editar categorías e itinerarios.",
  },
  {
    href: "/admin/torneos-activos",
    title: "Torneos activos",
    description: "Marcadores en vivo durante el evento.",
  },
  {
    href: "/admin/registrations",
    title: "Inscripciones",
    description: "Vista global, export CSV e importación.",
  },
  {
    href: "/admin/equipos",
    title: "Equipos",
    description: "Clubes, contactos y rosters guardados.",
  },
  {
    href: "/admin/profiles",
    title: "Perfiles",
    description: "Operadores con acceso al portal.",
  },
];

export function AdminDashboard() {
  const tournaments = useMergedTournaments();
  const today = localDateString(new Date());

  const stats = useMemo(() => {
    const regs =
      typeof window === "undefined"
        ? seedRows
        : mergeAdminRegistrations(seedRows, readStoredRegistrations());
    const openCount = tournaments.filter((t) => t.status === "open").length;
    const pendingPayment = regs.filter((r) => r.status === "pending_payment").length;
    const activeToday = getActiveLiveTournaments(tournaments, today).length;
    return { openCount, pendingPayment, activeToday };
  }, [tournaments, today]);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-zinc-900">Portal de Administrador</h2>
        <p className="mt-1 text-sm text-zinc-600">
          Gestiona torneos, inscripciones, equipos e itinerarios. El sitio público comparte los mismos datos.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="!p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Torneos abiertos</p>
          <p className="mt-2 text-3xl font-bold tabular-nums text-sky-700">{stats.openCount}</p>
        </Card>
        <Card className="!p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Pagos pendientes</p>
          <p className="mt-2 text-3xl font-bold tabular-nums text-amber-700">{stats.pendingPayment}</p>
        </Card>
        <Card className="!p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Activos hoy</p>
          <p className="mt-2 text-3xl font-bold tabular-nums text-emerald-700">{stats.activeToday}</p>
        </Card>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Módulos</h3>
        <Link href="/admin/tournaments/new">
          <Button>Crear torneo</Button>
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {modules.map((m) => (
          <Link
            key={m.href}
            href={m.href}
            className="group flex flex-col rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:border-sky-300 hover:shadow-md"
          >
            <h4 className="text-lg font-semibold text-zinc-900 group-hover:text-sky-700">{m.title}</h4>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-zinc-600">{m.description}</p>
            <span className="mt-4 text-sm font-medium text-sky-600">Abrir →</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
