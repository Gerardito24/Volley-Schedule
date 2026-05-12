"use client";

import { useEffect, useMemo, useState } from "react";
import {
  type CategoryMock,
  type RegistrationRowMock,
  type TournamentMock,
  formatRegistrationDivisionLabel,
} from "@/lib/mock-data";
import { appendStoredRegistration } from "@/lib/local-registrations";
import { createStubRosterFromRegistration } from "@/lib/local-team-rosters";
import { downloadRegistrationPdf } from "@/lib/registrationPdf";
import { effectiveCategoryFeeCents } from "@/lib/tournament-pricing";

export type RegisterTournamentPayload = Pick<
  TournamentMock,
  | "slug"
  | "name"
  | "registrationDeadlineOn"
  | "categories"
  | "registrationFeeCents"
  | "divisions"
>;

function dollarsToCents(s: string): number | null {
  const t = s.trim().replace(",", ".");
  if (!t) return null;
  const n = Number.parseFloat(t);
  if (Number.isNaN(n) || n < 0) return null;
  return Math.round(n * 100);
}

function centsToInput(c: number): string {
  return (c / 100).toFixed(2);
}

function buildDivisionLabel(
  tournament: TournamentMock,
  category: CategoryMock,
  subdivisionId: string | null,
): string {
  return formatRegistrationDivisionLabel(tournament, category, subdivisionId);
}

export function TournamentRegisterForm({
  tournament,
}: {
  tournament: RegisterTournamentPayload;
}) {
  const [categoryId, setCategoryId] = useState(
    tournament.categories[0]?.id ?? "",
  );
  const [subdivisionId, setSubdivisionId] = useState<string | "">("");
  const [clubName, setClubName] = useState("");
  const [teamName, setTeamName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [lastCreated, setLastCreated] = useState<RegistrationRowMock | null>(
    null,
  );
  const [feeUsdInput, setFeeUsdInput] = useState("");

  const category = useMemo(
    () => tournament.categories.find((c) => c.id === categoryId),
    [tournament.categories, categoryId],
  );

  const feeCents = useMemo(() => {
    if (!category) return null;
    return effectiveCategoryFeeCents(
      category,
      tournament as unknown as TournamentMock,
    );
  }, [category, tournament]);

  useEffect(() => {
    if (!category) {
      setFeeUsdInput("");
      return;
    }
    const suggested = effectiveCategoryFeeCents(
      category,
      tournament as unknown as TournamentMock,
    );
    setFeeUsdInput(suggested != null ? centsToInput(suggested) : "");
  }, [category, categoryId, subdivisionId, tournament]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!category) {
      setError("Elige una categoría.");
      return;
    }
    const subs = category.subdivisions;
    if (subs.length > 0 && !subdivisionId) {
      setError("Elige una subdivisión.");
      return;
    }
    if (!clubName.trim()) {
      setError("Indica el nombre del club.");
      return;
    }
    if (!teamName.trim()) {
      setError("Indica el nombre del equipo.");
      return;
    }

    const parsedFee = dollarsToCents(feeUsdInput);
    if (feeUsdInput.trim() && parsedFee === null) {
      setError("Tarifa inválida (ej. 250 o 250.50).");
      return;
    }
    const fee = parsedFee ?? feeCents ?? 0;

    const now = new Date().toISOString();
    const subId = subs.length > 0 ? (subdivisionId as string) : null;
    const divisionLabel = buildDivisionLabel(
      tournament as TournamentMock,
      category,
      subId,
    );

    const row: RegistrationRowMock = {
      id: `local-reg-${crypto.randomUUID()}`,
      tournamentSlug: tournament.slug,
      tournamentName: tournament.name,
      divisionLabel,
      teamName: teamName.trim(),
      clubName: clubName.trim(),
      status: "pending_payment",
      updatedAt: now.slice(0, 10),
      feeCents: fee,
      registeredAt: now,
      categoryId: category.id,
      subdivisionId: subId,
    };

    appendStoredRegistration(row);
    createStubRosterFromRegistration(row);
    setLastCreated(row);

    setDone(true);
    setClubName("");
    setTeamName("");
  }

  if (done) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100">
        <p className="font-semibold">Inscripción guardada en este navegador.</p>
        <p className="mt-2 text-emerald-800 dark:text-emerald-200">
          Estado: pago pendiente. Cuando el organizador marque la inscripción como{" "}
          <strong>pagada</strong> o <strong>aprobada</strong>, el equipo podrá
          entrar automáticamente en la lista de seeds del itinerario.
        </p>
        {lastCreated ? (
          <div className="mt-4 rounded-lg border border-emerald-300/60 bg-white/80 p-4 dark:border-emerald-800 dark:bg-zinc-950/60">
            <p className="font-medium text-emerald-950 dark:text-emerald-100">
              Descargá la hoja de inscripción en PDF
            </p>
            <button
              type="button"
              onClick={() => downloadRegistrationPdf(lastCreated)}
              className="mt-3 rounded-full border border-emerald-700 bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
            >
              Exportar PDF
            </button>
          </div>
        ) : null}
        <button
          type="button"
          onClick={() => {
            setDone(false);
            setLastCreated(null);
          }}
          className="mt-4 text-sm font-medium text-emerald-800 underline dark:text-emerald-200"
        >
          Inscribir otro equipo
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900"
    >
      {error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </p>
      ) : null}

      <div>
        <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Categoría
        </label>
        <select
          value={categoryId}
          onChange={(e) => {
            setCategoryId(e.target.value);
            setSubdivisionId("");
          }}
          className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
        >
          {tournament.categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      {category && category.subdivisions.length > 0 ? (
        <div>
          <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Subdivisión
          </label>
          <select
            required
            value={subdivisionId}
            onChange={(e) => setSubdivisionId(e.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
          >
            <option value="">— Elegir —</option>
            {category.subdivisions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <div>
        <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Nombre del club
        </label>
        <input
          value={clubName}
          onChange={(e) => setClubName(e.target.value)}
          className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
          placeholder="Ej. Metro VB"
        />
        <p className="mt-1 text-xs text-zinc-400">Organización o club al que pertenece el equipo.</p>
      </div>

      <div>
        <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Nombre del equipo
        </label>
        <input
          value={teamName}
          onChange={(e) => setTeamName(e.target.value)}
          className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
          placeholder="Ej. Metro VB 14U"
        />
        <p className="mt-1 text-xs text-zinc-400">Nombre específico del equipo que compite en esta categoría.</p>
      </div>

      <div>
        <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Tarifa de inscripción (USD)
        </label>
        <input
          value={feeUsdInput}
          onChange={(e) => setFeeUsdInput(e.target.value)}
          inputMode="decimal"
          placeholder={
            feeCents != null
              ? `Sugerida: ${new Intl.NumberFormat("es-PR", {
                  style: "currency",
                  currency: "USD",
                }).format(feeCents / 100)}`
              : "—"
          }
          className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
        />
        <p className="mt-1 text-xs text-zinc-500">
          Podés cambiar el monto antes de enviar. Se actualiza al elegir otra
          categoría o subdivisión. · Límite inscripciones:{" "}
          {tournament.registrationDeadlineOn}
        </p>
      </div>

      <button
        type="submit"
        className="rounded-full bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
      >
        Enviar inscripción (demo)
      </button>
    </form>
  );
}
