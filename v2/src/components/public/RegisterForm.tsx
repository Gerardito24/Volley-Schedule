"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { Tournament } from "@/lib/types";
import { COACH_LEVELS, categoryLabel, effectiveFeeCents, formatUsd } from "@/lib/types";

// ---------------------------------------------------------------------------
// Tipos del formulario
// ---------------------------------------------------------------------------

interface CoachForm {
  name: string;
  phone: string;
  email: string;
  affiliationNumber: string;
  level: string;
}

interface PlayerRow {
  name: string;
  jerseyNumber: string;
  birthDate: string;
  affiliationNumber: string;
}

interface FormState {
  clubName: string;
  pueblo: string;
  teamName: string;
  categoryId: string;
  repName: string;
  repEmail: string;
  repPhone: string;
  coach: CoachForm;
  hasAssistant: boolean;
  assistant: CoachForm;
  players: PlayerRow[];
  comments: string;
}

interface ReuseCoach {
  name?: string;
  phone?: string;
  email?: string;
  affiliationNumber?: string;
  level?: string;
}

interface ReuseEntry {
  clubSlug: string;
  clubName: string;
  pueblo: string;
  contactName: string;
  contactEmail: string;
  phone?: string;
  lastRegistration: {
    id: string;
    tournamentName: string;
    teamName: string;
    coachName: string;
    representative: { name: string; email: string; phone: string };
    coach: ReuseCoach | null;
    assistant: ReuseCoach | null;
    players: {
      name: string;
      jerseyNumber: string;
      birthDate: string;
      affiliationNumber?: string;
    }[];
  } | null;
}

interface DraftPayload {
  form: FormState;
  step: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const emptyCoach = (): CoachForm => ({
  name: "",
  phone: "",
  email: "",
  affiliationNumber: "",
  level: "",
});

const emptyPlayer = (): PlayerRow => ({
  name: "",
  jerseyNumber: "",
  birthDate: "",
  affiliationNumber: "",
});

const emptyForm = (): FormState => ({
  clubName: "",
  pueblo: "",
  teamName: "",
  categoryId: "",
  repName: "",
  repEmail: "",
  repPhone: "",
  coach: emptyCoach(),
  hasAssistant: false,
  assistant: emptyCoach(),
  players: Array.from({ length: 6 }, emptyPlayer),
  comments: "",
});

function coachFrom(data: ReuseCoach | null | undefined): CoachForm {
  return {
    name: data?.name ?? "",
    phone: data?.phone ?? "",
    email: data?.email ?? "",
    affiliationNumber: data?.affiliationNumber ?? "",
    level: data?.level ?? "",
  };
}

function isCompletePlayer(p: PlayerRow): boolean {
  return p.name.trim() !== "" && p.jerseyNumber.trim() !== "" && p.birthDate !== "";
}

const EMAIL_RE = /\S+@\S+\.\S+/;

const INPUT =
  "w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 outline-none transition focus:border-amber-400";
const LABEL = "mb-1.5 block text-sm font-medium text-zinc-300";
const ERROR_TEXT = "mt-1 text-xs text-red-400";
const BTN_PRIMARY =
  "inline-flex items-center justify-center rounded-xl bg-amber-400 px-6 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50";
const BTN_GHOST =
  "inline-flex items-center justify-center rounded-xl border border-zinc-700 px-6 py-2.5 text-sm font-semibold text-zinc-200 transition hover:border-amber-400 hover:text-amber-400";

const STEPS = ["Equipo", "Roster", "Confirmación"];

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

export default function RegisterForm({ tournament }: { tournament: Tournament }) {
  const draftKey = `vh-draft-${tournament.slug}`;

  const [form, setForm] = useState<FormState>(emptyForm);
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Firma y términos — nunca se guardan en el borrador
  const [signature, setSignature] = useState("");
  const [terms, setTerms] = useState({ insurance: false, fpv: false, rules: false });

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Borrador
  const [pendingDraft, setPendingDraft] = useState<DraftPayload | null>(null);
  const [draftResolved, setDraftResolved] = useState(false);

  // Reutilización de datos
  const [reuseQuery, setReuseQuery] = useState("");
  const [reuseEntries, setReuseEntries] = useState<ReuseEntry[]>([]);
  const [reuseLoading, setReuseLoading] = useState(false);
  const [reuseRequiresLogin, setReuseRequiresLogin] = useState(false);
  const [reuseChip, setReuseChip] = useState<string | null>(null);
  const reuseRequestId = useRef(0);

  const selectedCategory = tournament.categories.find((c) => c.id === form.categoryId) ?? null;

  // --- Borrador: cargar al montar -----------------------------------------
  useEffect(() => {
    try {
      const raw = localStorage.getItem(draftKey);
      if (raw) {
        const parsed = JSON.parse(raw) as DraftPayload;
        if (parsed && parsed.form) {
          setPendingDraft(parsed);
          return;
        }
      }
    } catch {
      // borrador corrupto: lo ignoramos
    }
    setDraftResolved(true);
  }, [draftKey]);

  // --- Borrador: autoguardado (400ms) --------------------------------------
  useEffect(() => {
    if (!draftResolved || submitted) return;
    const t = setTimeout(() => {
      try {
        localStorage.setItem(draftKey, JSON.stringify({ form, step } satisfies DraftPayload));
      } catch {
        // almacenamiento lleno o bloqueado: ignorar
      }
    }, 400);
    return () => clearTimeout(t);
  }, [form, step, draftResolved, submitted, draftKey]);

  // --- Reutilización: buscar al montar y al escribir (300ms) ----------------
  useEffect(() => {
    const id = ++reuseRequestId.current;
    setReuseLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/reuse?q=${encodeURIComponent(reuseQuery)}&exclude=${encodeURIComponent(tournament.slug)}`,
        );
        const data = (await res.json()) as { entries?: ReuseEntry[]; requiresLogin?: boolean };
        if (reuseRequestId.current === id) {
          setReuseRequiresLogin(data.requiresLogin ?? false);
          setReuseEntries(data.entries ?? []);
        }
      } catch {
        if (reuseRequestId.current === id) setReuseEntries([]);
      } finally {
        if (reuseRequestId.current === id) setReuseLoading(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [reuseQuery, tournament.slug]);

  function applyReuse(entry: ReuseEntry) {
    const last = entry.lastRegistration;
    setForm((f) => ({
      ...f,
      clubName: entry.clubName,
      pueblo: entry.pueblo,
      teamName: last?.teamName ?? "",
      repName: last?.representative.name ?? entry.contactName,
      repEmail: last?.representative.email ?? entry.contactEmail,
      repPhone: last?.representative.phone ?? entry.phone ?? "",
      coach: coachFrom(last?.coach),
      hasAssistant: Boolean(last?.assistant),
      assistant: coachFrom(last?.assistant),
      players:
        last && last.players.length > 0
          ? last.players.map((p) => ({
              name: p.name,
              jerseyNumber: p.jerseyNumber ?? "",
              birthDate: p.birthDate ?? "",
              affiliationNumber: p.affiliationNumber ?? "",
            }))
          : f.players,
    }));
    setReuseChip(`Datos de ${entry.clubName} cargados — revisa y completa`);
    setErrors({});
  }

  // --- Validación -----------------------------------------------------------
  function validateStep(target: number): Record<string, string> {
    const e: Record<string, string> = {};
    if (target === 0) {
      if (!form.clubName.trim()) e.clubName = "El nombre del club es requerido.";
      if (!form.categoryId) e.categoryId = "Selecciona una categoría.";
      if (!form.repName.trim()) e.repName = "El nombre del apoderado es requerido.";
      if (!form.repEmail.trim()) e.repEmail = "El email es requerido.";
      else if (!EMAIL_RE.test(form.repEmail.trim())) e.repEmail = "Escribe un email válido.";
      if (!form.repPhone.trim()) e.repPhone = "El teléfono es requerido.";
    }
    if (target === 1) {
      if (!form.coach.name.trim()) e.coachName = "El nombre del coach es requerido.";
      if (!form.coach.phone.trim()) e.coachPhone = "El teléfono del coach es requerido.";
      if (!form.players.some(isCompletePlayer)) {
        e.players =
          "Completa al menos una jugadora o jugador (nombre, número de camiseta y fecha de nacimiento).";
      }
    }
    if (target === 2) {
      if (!terms.insurance || !terms.fpv || !terms.rules) {
        e.terms = "Debes aceptar las tres condiciones para continuar.";
      }
      if (!signature.trim()) e.signature = "Escribe tu nombre completo como firma.";
    }
    return e;
  }

  function goNext() {
    const e = validateStep(step);
    setErrors(e);
    if (Object.keys(e).length === 0) {
      setStep((s) => Math.min(s + 1, 2));
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function goBack() {
    setErrors({});
    setStep((s) => Math.max(s - 1, 0));
  }

  // --- Envío ------------------------------------------------------------------
  async function submit() {
    const e = validateStep(2);
    setErrors(e);
    if (Object.keys(e).length > 0) return;

    setSubmitting(true);
    setApiError(null);

    const cleanCoach = (c: CoachForm) => ({
      name: c.name.trim(),
      phone: c.phone.trim(),
      email: c.email.trim() || undefined,
      affiliationNumber: c.affiliationNumber.trim() || undefined,
      level: c.level || undefined,
    });

    const body = {
      tournamentSlug: tournament.slug,
      categoryId: form.categoryId,
      clubName: form.clubName.trim(),
      pueblo: form.pueblo.trim() || undefined,
      teamName: form.teamName.trim() || undefined,
      representative: {
        name: form.repName.trim(),
        email: form.repEmail.trim(),
        phone: form.repPhone.trim(),
      },
      coach: cleanCoach(form.coach),
      assistant:
        form.hasAssistant && form.assistant.name.trim() ? cleanCoach(form.assistant) : null,
      players: form.players
        .filter((p) => p.name.trim())
        .map((p) => ({
          name: p.name.trim(),
          jerseyNumber: p.jerseyNumber.trim(),
          birthDate: p.birthDate,
          affiliationNumber: p.affiliationNumber.trim() || undefined,
        })),
      comments: form.comments.trim() || undefined,
      signatureName: signature.trim(),
      termsAccepted: true,
    };

    try {
      const res = await fetch("/api/registrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        try {
          localStorage.removeItem(draftKey);
        } catch {
          // ignorar
        }
        setSubmitted(true);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        setApiError(data?.error ?? "No pudimos procesar la inscripción. Intenta de nuevo.");
      }
    } catch {
      setApiError("Error de conexión. Verifica tu internet e intenta de nuevo.");
    } finally {
      setSubmitting(false);
    }
  }

  // --- Mutadores de estado ------------------------------------------------------
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const setCoach = (key: keyof CoachForm, value: string) =>
    setForm((f) => ({ ...f, coach: { ...f.coach, [key]: value } }));

  const setAssistant = (key: keyof CoachForm, value: string) =>
    setForm((f) => ({ ...f, assistant: { ...f.assistant, [key]: value } }));

  const setPlayer = (index: number, key: keyof PlayerRow, value: string) =>
    setForm((f) => ({
      ...f,
      players: f.players.map((p, i) => (i === index ? { ...p, [key]: value } : p)),
    }));

  const addPlayer = () => setForm((f) => ({ ...f, players: [...f.players, emptyPlayer()] }));

  const removePlayer = (index: number) =>
    setForm((f) =>
      f.players.length <= 1 ? f : { ...f, players: f.players.filter((_, i) => i !== index) },
    );

  const completePlayers = useMemo(
    () => form.players.filter(isCompletePlayer).length,
    [form.players],
  );

  // --- Pantalla de éxito --------------------------------------------------------
  if (submitted) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-10 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-400/15">
          <svg viewBox="0 0 24 24" className="h-8 w-8 stroke-amber-400" fill="none" strokeWidth="2.5">
            <path d="m5 13 4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h2 className="mt-5 text-3xl font-extrabold tracking-tight text-zinc-100">
          ¡Inscripción recibida!
        </h2>
        <p className="mx-auto mt-3 max-w-md text-zinc-400">
          Tu equipo quedó registrado con estado{" "}
          <span className="font-semibold text-amber-400">Pago pendiente</span>. La organización del
          torneo se comunicará contigo con las instrucciones de pago. Una vez confirmado el pago,
          tu equipo quedará oficializado en la categoría.
        </p>
        <Link href={`/torneos/${tournament.slug}`} className={`${BTN_PRIMARY} mt-8`}>
          Volver al torneo
        </Link>
      </div>
    );
  }

  // --- Banner de borrador ---------------------------------------------------------
  if (pendingDraft && !draftResolved) {
    return (
      <div className="rounded-2xl border border-amber-400/40 bg-zinc-900 p-8">
        <h2 className="text-xl font-bold tracking-tight text-zinc-100">
          Tienes un borrador guardado
        </h2>
        <p className="mt-2 text-sm text-zinc-400">
          Empezaste una inscripción para este torneo y la guardamos automáticamente. ¿Quieres
          continuar donde la dejaste?
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            className={BTN_PRIMARY}
            onClick={() => {
              setForm({ ...emptyForm(), ...pendingDraft.form });
              setStep(Math.min(Math.max(pendingDraft.step ?? 0, 0), 2));
              setPendingDraft(null);
              setDraftResolved(true);
            }}
          >
            Continuar borrador
          </button>
          <button
            type="button"
            className={BTN_GHOST}
            onClick={() => {
              try {
                localStorage.removeItem(draftKey);
              } catch {
                // ignorar
              }
              setPendingDraft(null);
              setDraftResolved(true);
            }}
          >
            Empezar de nuevo
          </button>
        </div>
      </div>
    );
  }

  // --- Formulario -------------------------------------------------------------------
  return (
    <div className="space-y-8">
      {/* Indicador de pasos */}
      <ol className="flex items-center gap-2">
        {STEPS.map((label, i) => {
          const isActive = i === step;
          const isDone = i < step;
          return (
            <li key={label} className="flex flex-1 items-center gap-2">
              <button
                type="button"
                disabled={i >= step}
                onClick={() => {
                  if (i < step) {
                    setErrors({});
                    setStep(i);
                  }
                }}
                className={`flex w-full items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition ${
                  isActive
                    ? "border-amber-400 bg-amber-400/10"
                    : isDone
                      ? "border-zinc-700 bg-zinc-900 hover:border-amber-400/60"
                      : "border-zinc-800 bg-zinc-900/50"
                } ${i < step ? "cursor-pointer" : "cursor-default"}`}
              >
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    isActive
                      ? "bg-amber-400 text-zinc-950"
                      : isDone
                        ? "bg-zinc-700 text-zinc-100"
                        : "bg-zinc-800 text-zinc-500"
                  }`}
                >
                  {isDone ? "✓" : i + 1}
                </span>
                <span
                  className={`hidden text-sm font-semibold sm:block ${
                    isActive ? "text-amber-400" : isDone ? "text-zinc-300" : "text-zinc-500"
                  }`}
                >
                  {label}
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      {/* Chip de confirmación de datos reutilizados */}
      {reuseChip && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-400/40 bg-amber-400/10 px-4 py-2.5 text-sm text-amber-300">
          <span>{reuseChip}</span>
          <button
            type="button"
            aria-label="Cerrar"
            className="shrink-0 text-amber-400 transition hover:text-amber-200"
            onClick={() => setReuseChip(null)}
          >
            ✕
          </button>
        </div>
      )}

      {/* PASO 1 — Equipo */}
      {step === 0 && (
        <div className="space-y-8">
          {/* Panel de reutilización */}
          <section className="rounded-2xl border border-amber-400/30 bg-zinc-900 p-5">
            <h2 className="text-base font-bold text-zinc-100">
              ¿Ya inscribiste un equipo antes?
            </h2>
            <p className="mt-1 text-sm text-zinc-400">
              Carga los datos de tu última inscripción para no escribir todo de nuevo.
            </p>

            {reuseRequiresLogin ? (
              <div className="mt-4 rounded-xl border border-zinc-700 bg-zinc-950/60 px-4 py-4 text-sm text-zinc-300">
                <p className="mb-3">
                  Inicia sesión para ver tus equipos anteriores de forma privada y segura.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href="/cuenta/login"
                    className="inline-flex items-center rounded-lg bg-amber-400 px-4 py-2 text-xs font-semibold text-zinc-950 transition hover:bg-amber-300"
                  >
                    Iniciar sesión
                  </Link>
                  <Link
                    href="/cuenta/registro"
                    className="inline-flex items-center rounded-lg border border-zinc-600 px-4 py-2 text-xs font-semibold text-zinc-300 transition hover:border-amber-400 hover:text-amber-400"
                  >
                    Crear cuenta
                  </Link>
                </div>
              </div>
            ) : (
              <>
                <input
                  type="search"
                  value={reuseQuery}
                  onChange={(e) => setReuseQuery(e.target.value)}
                  placeholder="Busca por club, pueblo o coach…"
                  className={`${INPUT} mt-4`}
                />
                <div className="mt-3 max-h-64 space-y-2 overflow-y-auto thin-scroll">
                  {reuseLoading ? (
                    <p className="px-1 py-2 text-sm text-zinc-500">Buscando…</p>
                  ) : reuseEntries.length === 0 ? (
                    <p className="px-1 py-2 text-sm text-zinc-500">
                      No encontramos inscripciones anteriores.
                    </p>
                  ) : (
                    reuseEntries.map((entry) => (
                      <div
                        key={entry.clubSlug}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 py-3"
                      >
                        <div className="min-w-0">
                          <p className="font-semibold text-zinc-100">
                            {entry.clubName}
                            {entry.pueblo && (
                              <span className="ml-2 text-sm font-normal text-zinc-500">
                                {entry.pueblo}
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-zinc-500">
                            {entry.contactName}
                            {entry.lastRegistration &&
                              ` · Última inscripción: ${entry.lastRegistration.tournamentName}`}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => applyReuse(entry)}
                          className="shrink-0 rounded-lg border border-amber-400/50 px-3 py-1.5 text-xs font-semibold text-amber-400 transition hover:bg-amber-400 hover:text-zinc-950"
                        >
                          Usar estos datos
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </section>

          <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
            <h2 className="mb-5 text-lg font-bold tracking-tight text-zinc-100">
              Datos del equipo
            </h2>
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="clubName" className={LABEL}>
                  Nombre del club <span className="text-amber-400">*</span>
                </label>
                <input
                  id="clubName"
                  className={INPUT}
                  value={form.clubName}
                  onChange={(e) => set("clubName", e.target.value)}
                />
                {errors.clubName && <p className={ERROR_TEXT}>{errors.clubName}</p>}
              </div>
              <div>
                <label htmlFor="pueblo" className={LABEL}>
                  Pueblo
                </label>
                <input
                  id="pueblo"
                  className={INPUT}
                  value={form.pueblo}
                  onChange={(e) => set("pueblo", e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="teamName" className={LABEL}>
                  Nombre del equipo
                </label>
                <input
                  id="teamName"
                  className={INPUT}
                  placeholder="Si lo dejas vacío usamos el nombre del club"
                  value={form.teamName}
                  onChange={(e) => set("teamName", e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="categoryId" className={LABEL}>
                  Categoría <span className="text-amber-400">*</span>
                </label>
                <select
                  id="categoryId"
                  className={INPUT}
                  value={form.categoryId}
                  onChange={(e) => set("categoryId", e.target.value)}
                >
                  <option value="">Selecciona una categoría…</option>
                  {tournament.categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {categoryLabel(tournament, c)} — {formatUsd(effectiveFeeCents(tournament, c))}
                    </option>
                  ))}
                </select>
                {selectedCategory && (
                  <p className="mt-1 text-xs text-zinc-500">
                    Tarifa:{" "}
                    <span className="font-semibold text-amber-400">
                      {formatUsd(effectiveFeeCents(tournament, selectedCategory))}
                    </span>{" "}
                    por equipo
                  </p>
                )}
                {errors.categoryId && <p className={ERROR_TEXT}>{errors.categoryId}</p>}
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
            <h2 className="mb-1 text-lg font-bold tracking-tight text-zinc-100">Apoderado/a</h2>
            <p className="mb-5 text-sm text-zinc-500">
              Persona de contacto responsable del equipo.
            </p>
            <div className="grid gap-5 sm:grid-cols-3">
              <div>
                <label htmlFor="repName" className={LABEL}>
                  Nombre <span className="text-amber-400">*</span>
                </label>
                <input
                  id="repName"
                  className={INPUT}
                  value={form.repName}
                  onChange={(e) => set("repName", e.target.value)}
                />
                {errors.repName && <p className={ERROR_TEXT}>{errors.repName}</p>}
              </div>
              <div>
                <label htmlFor="repEmail" className={LABEL}>
                  Email <span className="text-amber-400">*</span>
                </label>
                <input
                  id="repEmail"
                  type="email"
                  className={INPUT}
                  value={form.repEmail}
                  onChange={(e) => set("repEmail", e.target.value)}
                />
                {errors.repEmail && <p className={ERROR_TEXT}>{errors.repEmail}</p>}
              </div>
              <div>
                <label htmlFor="repPhone" className={LABEL}>
                  Teléfono <span className="text-amber-400">*</span>
                </label>
                <input
                  id="repPhone"
                  type="tel"
                  className={INPUT}
                  placeholder="787-555-0123"
                  value={form.repPhone}
                  onChange={(e) => set("repPhone", e.target.value)}
                />
                {errors.repPhone && <p className={ERROR_TEXT}>{errors.repPhone}</p>}
              </div>
            </div>
          </section>

          <div className="flex justify-end">
            <button type="button" className={BTN_PRIMARY} onClick={goNext}>
              Continuar
            </button>
          </div>
        </div>
      )}

      {/* PASO 2 — Roster */}
      {step === 1 && (
        <div className="space-y-8">
          <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
            <h2 className="mb-5 text-lg font-bold tracking-tight text-zinc-100">Coach</h2>
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="coachName" className={LABEL}>
                  Nombre <span className="text-amber-400">*</span>
                </label>
                <input
                  id="coachName"
                  className={INPUT}
                  value={form.coach.name}
                  onChange={(e) => setCoach("name", e.target.value)}
                />
                {errors.coachName && <p className={ERROR_TEXT}>{errors.coachName}</p>}
              </div>
              <div>
                <label htmlFor="coachPhone" className={LABEL}>
                  Teléfono <span className="text-amber-400">*</span>
                </label>
                <input
                  id="coachPhone"
                  type="tel"
                  className={INPUT}
                  value={form.coach.phone}
                  onChange={(e) => setCoach("phone", e.target.value)}
                />
                {errors.coachPhone && <p className={ERROR_TEXT}>{errors.coachPhone}</p>}
              </div>
              <div>
                <label htmlFor="coachEmail" className={LABEL}>
                  Email
                </label>
                <input
                  id="coachEmail"
                  type="email"
                  className={INPUT}
                  value={form.coach.email}
                  onChange={(e) => setCoach("email", e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label htmlFor="coachAff" className={LABEL}>
                    Núm. afiliación
                  </label>
                  <input
                    id="coachAff"
                    className={INPUT}
                    value={form.coach.affiliationNumber}
                    onChange={(e) => setCoach("affiliationNumber", e.target.value)}
                  />
                </div>
                <div>
                  <label htmlFor="coachLevel" className={LABEL}>
                    Nivel
                  </label>
                  <select
                    id="coachLevel"
                    className={INPUT}
                    value={form.coach.level}
                    onChange={(e) => setCoach("level", e.target.value)}
                  >
                    <option value="">—</option>
                    {COACH_LEVELS.map((level) => (
                      <option key={level} value={level}>
                        {level}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="mt-6 border-t border-zinc-800 pt-5">
              <label className="flex cursor-pointer items-center gap-3 text-sm font-medium text-zinc-300">
                <input
                  type="checkbox"
                  checked={form.hasAssistant}
                  onChange={(e) => set("hasAssistant", e.target.checked)}
                  className="h-4 w-4 accent-amber-400"
                />
                Añadir asistente
              </label>

              {form.hasAssistant && (
                <div className="mt-5 grid gap-5 sm:grid-cols-2">
                  <div>
                    <label htmlFor="asstName" className={LABEL}>
                      Nombre
                    </label>
                    <input
                      id="asstName"
                      className={INPUT}
                      value={form.assistant.name}
                      onChange={(e) => setAssistant("name", e.target.value)}
                    />
                  </div>
                  <div>
                    <label htmlFor="asstPhone" className={LABEL}>
                      Teléfono
                    </label>
                    <input
                      id="asstPhone"
                      type="tel"
                      className={INPUT}
                      value={form.assistant.phone}
                      onChange={(e) => setAssistant("phone", e.target.value)}
                    />
                  </div>
                  <div>
                    <label htmlFor="asstEmail" className={LABEL}>
                      Email
                    </label>
                    <input
                      id="asstEmail"
                      type="email"
                      className={INPUT}
                      value={form.assistant.email}
                      onChange={(e) => setAssistant("email", e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-5">
                    <div>
                      <label htmlFor="asstAff" className={LABEL}>
                        Núm. afiliación
                      </label>
                      <input
                        id="asstAff"
                        className={INPUT}
                        value={form.assistant.affiliationNumber}
                        onChange={(e) => setAssistant("affiliationNumber", e.target.value)}
                      />
                    </div>
                    <div>
                      <label htmlFor="asstLevel" className={LABEL}>
                        Nivel
                      </label>
                      <select
                        id="asstLevel"
                        className={INPUT}
                        value={form.assistant.level}
                        onChange={(e) => setAssistant("level", e.target.value)}
                      >
                        <option value="">—</option>
                        {COACH_LEVELS.map((level) => (
                          <option key={level} value={level}>
                            {level}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-bold tracking-tight text-zinc-100">Jugadoras/es</h2>
              <span className="text-sm text-zinc-500">
                {completePlayers} {completePlayers === 1 ? "completa" : "completas"} de{" "}
                {form.players.length}
              </span>
            </div>

            <div className="overflow-x-auto thin-scroll">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wider text-zinc-500">
                    <th className="pb-2 pr-3 font-semibold">Nombre</th>
                    <th className="w-28 pb-2 pr-3 font-semibold">
                      Camiseta <span className="text-amber-400">*</span>
                    </th>
                    <th className="w-44 pb-2 pr-3 font-semibold">
                      Nacimiento <span className="text-amber-400">*</span>
                    </th>
                    <th className="w-36 pb-2 pr-3 font-semibold">Núm. afiliación</th>
                    <th className="w-10 pb-2" />
                  </tr>
                </thead>
                <tbody>
                  {form.players.map((p, i) => (
                    <tr key={i}>
                      <td className="py-1.5 pr-3">
                        <input
                          aria-label={`Nombre jugadora ${i + 1}`}
                          className={INPUT}
                          value={p.name}
                          onChange={(e) => setPlayer(i, "name", e.target.value)}
                        />
                      </td>
                      <td className="py-1.5 pr-3">
                        <input
                          aria-label={`Número de camiseta ${i + 1}`}
                          className={INPUT}
                          value={p.jerseyNumber}
                          onChange={(e) => setPlayer(i, "jerseyNumber", e.target.value)}
                        />
                      </td>
                      <td className="py-1.5 pr-3">
                        <input
                          aria-label={`Fecha de nacimiento ${i + 1}`}
                          type="date"
                          className={`${INPUT} [color-scheme:dark]`}
                          value={p.birthDate}
                          onChange={(e) => setPlayer(i, "birthDate", e.target.value)}
                        />
                      </td>
                      <td className="py-1.5 pr-3">
                        <input
                          aria-label={`Número de afiliación ${i + 1}`}
                          className={INPUT}
                          value={p.affiliationNumber}
                          onChange={(e) => setPlayer(i, "affiliationNumber", e.target.value)}
                        />
                      </td>
                      <td className="py-1.5">
                        <button
                          type="button"
                          aria-label={`Quitar fila ${i + 1}`}
                          disabled={form.players.length <= 1}
                          onClick={() => removePlayer(i)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-red-500/10 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-30"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button
              type="button"
              onClick={addPlayer}
              className="mt-4 rounded-lg border border-dashed border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-400 transition hover:border-amber-400 hover:text-amber-400"
            >
              + Añadir jugadora/jugador
            </button>
            {errors.players && <p className={ERROR_TEXT}>{errors.players}</p>}
          </section>

          <div className="flex justify-between">
            <button type="button" className={BTN_GHOST} onClick={goBack}>
              Atrás
            </button>
            <button type="button" className={BTN_PRIMARY} onClick={goNext}>
              Continuar
            </button>
          </div>
        </div>
      )}

      {/* PASO 3 — Confirmación */}
      {step === 2 && (
        <div className="space-y-8">
          <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
            <h2 className="mb-5 text-lg font-bold tracking-tight text-zinc-100">
              Resumen de la inscripción
            </h2>
            <dl className="grid gap-x-8 gap-y-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Club
                </dt>
                <dd className="mt-0.5 font-semibold text-zinc-100">
                  {form.clubName || "—"}
                  {form.pueblo && (
                    <span className="font-normal text-zinc-400"> · {form.pueblo}</span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Equipo
                </dt>
                <dd className="mt-0.5 font-semibold text-zinc-100">
                  {form.teamName.trim() || form.clubName || "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Categoría
                </dt>
                <dd className="mt-0.5 font-semibold text-zinc-100">
                  {selectedCategory ? categoryLabel(tournament, selectedCategory) : "—"}
                  {selectedCategory && (
                    <span className="ml-2 font-bold text-amber-400">
                      {formatUsd(effectiveFeeCents(tournament, selectedCategory))}
                    </span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Coach
                </dt>
                <dd className="mt-0.5 font-semibold text-zinc-100">
                  {form.coach.name || "—"}
                  {form.hasAssistant && form.assistant.name.trim() && (
                    <span className="font-normal text-zinc-400">
                      {" "}
                      · Asistente: {form.assistant.name}
                    </span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Roster
                </dt>
                <dd className="mt-0.5 font-semibold text-zinc-100">
                  {form.players.filter((p) => p.name.trim()).length} jugadoras/es
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Apoderado/a
                </dt>
                <dd className="mt-0.5 font-semibold text-zinc-100">
                  {form.repName || "—"}
                  <span className="font-normal text-zinc-400"> · {form.repEmail}</span>
                </dd>
              </div>
            </dl>
          </section>

          <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
            <label htmlFor="comments" className={LABEL}>
              Comentarios para la organización
            </label>
            <textarea
              id="comments"
              rows={3}
              className={INPUT}
              placeholder="Restricciones de horario, peticiones especiales…"
              value={form.comments}
              onChange={(e) => set("comments", e.target.value)}
            />
          </section>

          <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
            <h2 className="mb-4 text-lg font-bold tracking-tight text-zinc-100">
              Términos y firma
            </h2>
            <div className="space-y-3">
              <label className="flex cursor-pointer items-start gap-3 text-sm text-zinc-300">
                <input
                  type="checkbox"
                  checked={terms.insurance}
                  onChange={(e) => setTerms((t) => ({ ...t, insurance: e.target.checked }))}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-amber-400"
                />
                Certifico que cada participante cuenta con seguro médico y relevo de
                responsabilidad a la organización del torneo por lesiones o accidentes.
              </label>
              <label className="flex cursor-pointer items-start gap-3 text-sm text-zinc-300">
                <input
                  type="checkbox"
                  checked={terms.fpv}
                  onChange={(e) => setTerms((t) => ({ ...t, fpv: e.target.checked }))}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-amber-400"
                />
                Confirmo que el equipo y su cuerpo técnico cumplen con los requisitos de
                afiliación de la Federación Puertorriqueña de Voleibol (FPV).
              </label>
              <label className="flex cursor-pointer items-start gap-3 text-sm text-zinc-300">
                <input
                  type="checkbox"
                  checked={terms.rules}
                  onChange={(e) => setTerms((t) => ({ ...t, rules: e.target.checked }))}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-amber-400"
                />
                Acepto el reglamento del torneo y los requisitos de uniformes establecidos por la
                organización.
              </label>
            </div>
            {errors.terms && <p className={ERROR_TEXT}>{errors.terms}</p>}

            <div className="mt-6">
              <label htmlFor="signature" className={LABEL}>
                Firma (nombre completo) <span className="text-amber-400">*</span>
              </label>
              <input
                id="signature"
                className={INPUT}
                placeholder="Escribe tu nombre completo"
                value={signature}
                onChange={(e) => setSignature(e.target.value)}
              />
              <div className="mt-3 border-b border-zinc-600 pb-1">
                <p className="min-h-9 font-serif text-2xl italic text-zinc-200">
                  {signature || "\u00A0"}
                </p>
              </div>
              <p className="mt-1 text-xs text-zinc-500">Firma del apoderado/a o representante.</p>
              {errors.signature && <p className={ERROR_TEXT}>{errors.signature}</p>}
            </div>
          </section>

          {apiError && (
            <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {apiError}
            </div>
          )}

          <div className="flex justify-between">
            <button type="button" className={BTN_GHOST} onClick={goBack}>
              Atrás
            </button>
            <button type="button" className={BTN_PRIMARY} onClick={submit} disabled={submitting}>
              {submitting ? "Enviando…" : "Enviar inscripción"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
