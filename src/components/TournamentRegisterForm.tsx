"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  type CategoryMock,
  type CoachEntry,
  type PlayerEntry,
  type RegistrationRowMock,
  type TournamentMock,
  displayCategoryName,
  formatRegistrationDivisionLabel,
} from "@/lib/mock-data";
import { appendStoredRegistration, readStoredRegistrations } from "@/lib/local-registrations";
import { readClubProfiles } from "@/lib/local-club-profiles";
import { createStubRosterFromRegistration } from "@/lib/local-team-rosters";
import { downloadRegistrationPdf } from "@/lib/registrationPdf";
import { effectiveCategoryFeeCents } from "@/lib/tournament-pricing";
import {
  type MergedTeam,
  buildMergedTeamList,
  mergedTeamRecencyMs,
  applyRegistrationToFormDraft,
  applyClubProfileToFormDraft,
} from "@/lib/registration-reuse";
import type { ClubProfile } from "@/lib/club-profile-types";
import {
  CoachSection,
  Field,
  SectionTitle,
  SignaturePad,
  registrationInputCls as inputCls,
} from "@/components/registration/RegistrationFormPrimitives";

export type RegisterTournamentPayload = Pick<
  TournamentMock,
  | "slug"
  | "name"
  | "registrationDeadlineOn"
  | "categories"
  | "registrationFeeCents"
  | "divisions"
>;

type FormStep = "equipo" | "roster" | "confirmacion";

type StoredDraft = {
  step: FormStep;
  categoryId: string;
  subdivisionId: string;
  teamName: string;
  clubName: string;
  clubAffiliationNumber: string;
  repName: string;
  repEmail: string;
  repPhone: string;
  coach: CoachEntry;
  hasAssistant: boolean;
  assistant: CoachEntry;
  players: PlayerEntry[];
  comments: string;
  feeUsdInput: string;
};

const FORM_STEPS: { id: FormStep; label: string }[] = [
  { id: "equipo", label: "Equipo" },
  { id: "roster", label: "Roster" },
  { id: "confirmacion", label: "Confirmación" },
];

function draftStorageKey(slug: string) {
  return `vs-registration-draft-${slug}`;
}

/* ─── helpers ─── */

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

function emptyPlayer(): PlayerEntry {
  return {
    id: crypto.randomUUID(),
    name: "",
    jerseyNumber: "",
    affiliationNumber: "",
    birthDate: "",
  };
}

function emptyCoach(): CoachEntry {
  return {
    name: "",
    affiliationNumber: "",
    nivel: "",
    phone: "",
    email: "",
    photoDataUrl: null,
  };
}

function filterTeamsByQuery(teams: MergedTeam[], query: string): MergedTeam[] {
  const q = query.trim().toLowerCase();
  let out = [...teams];
  if (q) {
    out = out.filter((t) =>
      [t.clubName, t.pueblo, t.coachName, t.ageLabel]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }
  return out.sort((a, b) => mergedTeamRecencyMs(b) - mergedTeamRecencyMs(a));
}

function StepIndicator({ current }: { current: FormStep }) {
  const currentIdx = FORM_STEPS.findIndex((s) => s.id === current);

  return (
    <nav aria-label="Pasos del registro" className="mb-8">
      <ol className="flex items-center gap-2 sm:gap-3">
        {FORM_STEPS.map((s, i) => {
          const done = i < currentIdx;
          const active = s.id === current;
          return (
            <li key={s.id} className="flex min-w-0 flex-1 items-center gap-2">
              <div className="flex min-w-0 flex-1 flex-col items-center gap-1 sm:flex-row sm:gap-2">
                <span
                  className={[
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                    active
                      ? "bg-emerald-600 text-white"
                      : done
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300"
                        : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400",
                  ].join(" ")}
                  aria-current={active ? "step" : undefined}
                >
                  {done ? "✓" : i + 1}
                </span>
                <span
                  className={[
                    "truncate text-center text-xs font-semibold sm:text-left sm:text-sm",
                    active
                      ? "text-zinc-900 dark:text-zinc-50"
                      : "text-zinc-500 dark:text-zinc-400",
                  ].join(" ")}
                >
                  {s.label}
                </span>
              </div>
              {i < FORM_STEPS.length - 1 ? (
                <div
                  className={[
                    "hidden h-px flex-1 sm:block",
                    done ? "bg-emerald-300 dark:bg-emerald-700" : "bg-zinc-200 dark:bg-zinc-700",
                  ].join(" ")}
                  aria-hidden
                />
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/* ─── Main form ─── */

export function TournamentRegisterForm({
  tournament,
}: {
  tournament: RegisterTournamentPayload;
}) {
  const [step, setStep] = useState<FormStep>("equipo");

  // Section A
  const [categoryId, setCategoryId] = useState(tournament.categories[0]?.id ?? "");
  const [subdivisionId, setSubdivisionId] = useState<string | "">("");
  const [teamName, setTeamName] = useState("");
  const [clubName, setClubName] = useState("");
  const [clubAffiliationNumber, setClubAffiliationNumber] = useState("");

  // Section B — representative
  const [repName, setRepName] = useState("");
  const [repEmail, setRepEmail] = useState("");
  const [repPhone, setRepPhone] = useState("");

  // Section C — coach
  const [coach, setCoach] = useState<CoachEntry>(emptyCoach);

  // Section D/E — assistant
  const [hasAssistant, setHasAssistant] = useState(false);
  const [assistant, setAssistant] = useState<CoachEntry>(emptyCoach);

  // Section F — roster
  const [players, setPlayers] = useState<PlayerEntry[]>(() =>
    Array.from({ length: 6 }, emptyPlayer),
  );

  // Section G — comments
  const [comments, setComments] = useState("");

  // Section H — terms
  const [terms, setTerms] = useState([false, false, false]);

  // Section I — signature
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);

  // Fee
  const [feeUsdInput, setFeeUsdInput] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [lastCreated, setLastCreated] = useState<RegistrationRowMock | null>(null);

  // Reuse panel — text search across all teams
  const [reuseSearchQuery, setReuseSearchQuery] = useState("");
  const [reuseMsg, setReuseMsg] = useState<string | null>(null);

  const [allRegistrations, setAllRegistrations] = useState<RegistrationRowMock[]>([]);
  const [allProfiles, setAllProfiles] = useState<ClubProfile[]>([]);

  const draftRestored = useRef(false);
  const skipNextDraftSave = useRef(false);
  const restoredDraftFee = useRef<string | null>(null);

  useEffect(() => {
    setAllRegistrations(readStoredRegistrations());
    setAllProfiles(readClubProfiles());
  }, []);

  useEffect(() => {
    if (draftRestored.current) return;
    draftRestored.current = true;
    try {
      const raw = localStorage.getItem(draftStorageKey(tournament.slug));
      if (!raw) return;
      const draft = JSON.parse(raw) as StoredDraft;
      skipNextDraftSave.current = true;
      if (draft.step) setStep(draft.step);
      if (draft.categoryId) setCategoryId(draft.categoryId);
      setSubdivisionId(draft.subdivisionId ?? "");
      setTeamName(draft.teamName ?? "");
      setClubName(draft.clubName ?? "");
      setClubAffiliationNumber(draft.clubAffiliationNumber ?? "");
      setRepName(draft.repName ?? "");
      setRepEmail(draft.repEmail ?? "");
      setRepPhone(draft.repPhone ?? "");
      if (draft.coach) setCoach(draft.coach);
      setHasAssistant(draft.hasAssistant ?? false);
      if (draft.assistant) setAssistant(draft.assistant);
      if (draft.players?.length) setPlayers(draft.players);
      setComments(draft.comments ?? "");
      restoredDraftFee.current = draft.feeUsdInput ?? null;
      if (draft.feeUsdInput) setFeeUsdInput(draft.feeUsdInput);
    } catch {
      /* ignore corrupt draft */
    }
  }, [tournament.slug]);

  useEffect(() => {
    if (done) return;
    if (skipNextDraftSave.current) {
      skipNextDraftSave.current = false;
      return;
    }
    const timer = window.setTimeout(() => {
      const draft: StoredDraft = {
        step,
        categoryId,
        subdivisionId,
        teamName,
        clubName,
        clubAffiliationNumber,
        repName,
        repEmail,
        repPhone,
        coach,
        hasAssistant,
        assistant,
        players,
        comments,
        feeUsdInput,
      };
      try {
        localStorage.setItem(draftStorageKey(tournament.slug), JSON.stringify(draft));
      } catch {
        /* quota exceeded */
      }
    }, 400);
    return () => window.clearTimeout(timer);
  }, [
    step,
    categoryId,
    subdivisionId,
    teamName,
    clubName,
    clubAffiliationNumber,
    repName,
    repEmail,
    repPhone,
    coach,
    hasAssistant,
    assistant,
    players,
    comments,
    feeUsdInput,
    done,
    tournament.slug,
  ]);

  const mergedTeams = useMemo(
    () => buildMergedTeamList(allRegistrations, allProfiles, tournament.slug),
    [allRegistrations, allProfiles, tournament.slug],
  );

  const filteredReuseTeams = useMemo(
    () => filterTeamsByQuery(mergedTeams, reuseSearchQuery),
    [mergedTeams, reuseSearchQuery],
  );

  const category = useMemo(
    () => tournament.categories.find((c) => c.id === categoryId),
    [tournament.categories, categoryId],
  );

  const feeCents = useMemo(() => {
    if (!category) return null;
    return effectiveCategoryFeeCents(category, tournament as unknown as TournamentMock);
  }, [category, tournament]);

  useEffect(() => {
    if (!category) { setFeeUsdInput(""); return; }
    if (restoredDraftFee.current != null) {
      setFeeUsdInput(restoredDraftFee.current);
      restoredDraftFee.current = null;
      return;
    }
    const suggested = effectiveCategoryFeeCents(category, tournament as unknown as TournamentMock);
    setFeeUsdInput(suggested != null ? centsToInput(suggested) : "");
  }, [category, categoryId, tournament]);

  function updatePlayer<K extends keyof PlayerEntry>(
    idx: number,
    key: K,
    val: PlayerEntry[K],
  ) {
    setPlayers((prev) => prev.map((p, i) => (i === idx ? { ...p, [key]: val } : p)));
  }

  function addPlayer() {
    setPlayers((prev) => [...prev, emptyPlayer()]);
  }

  function removePlayer(idx: number) {
    setPlayers((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((_, i) => i !== idx);
    });
  }

  function toggleTerm(i: number) {
    setTerms((prev) => prev.map((v, idx) => (idx === i ? !v : v)));
  }

  function clearDraftStorage() {
    try {
      localStorage.removeItem(draftStorageKey(tournament.slug));
    } catch {
      /* ignore */
    }
  }

  function resetForm() {
    setStep("equipo");
    setCategoryId(tournament.categories[0]?.id ?? "");
    setSubdivisionId("");
    setTeamName("");
    setClubName("");
    setClubAffiliationNumber("");
    setRepName("");
    setRepEmail("");
    setRepPhone("");
    setCoach(emptyCoach());
    setHasAssistant(false);
    setAssistant(emptyCoach());
    setPlayers(Array.from({ length: 6 }, emptyPlayer));
    setComments("");
    setTerms([false, false, false]);
    setSignatureDataUrl(null);
    setFeeUsdInput("");
    setReuseSearchQuery("");
    setReuseMsg(null);
    setError(null);
  }

  function applyReuseDraft(row: RegistrationRowMock) {
    const d = applyRegistrationToFormDraft(row);
    setTeamName(d.teamName);
    setClubName(d.clubName);
    setClubAffiliationNumber(d.clubAffiliationNumber);
    setRepName(d.repName);
    setRepEmail(d.repEmail);
    setRepPhone(d.repPhone);
    setCoach(d.coach);
    setHasAssistant(d.hasAssistant);
    setAssistant(d.assistant ?? emptyCoach());
    setPlayers(d.players.length > 0 ? d.players : Array.from({ length: 6 }, emptyPlayer));
    setComments(d.comments);
    setTerms([false, false, false]);
    setSignatureDataUrl(null);
    setReuseMsg("Datos cargados. Elige la categoría de este torneo y completa la firma.");
  }

  function applyReuseProfile(profile: ClubProfile) {
    const d = applyClubProfileToFormDraft(profile);
    setClubName(d.clubName);
    setRepName(d.repName);
    setRepEmail(d.repEmail);
    setRepPhone(d.repPhone);
    setTerms([false, false, false]);
    setSignatureDataUrl(null);
    setReuseMsg("Perfil cargado. Completa afiliación, coach, jugadores y firma.");
  }

  function applyMergedTeam(team: MergedTeam) {
    if (team.sourceRegistration) {
      applyReuseDraft(team.sourceRegistration);
    } else if (team.sourceProfile) {
      applyReuseProfile(team.sourceProfile);
    }
  }

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);

      if (!category) { setError("Elige una categoría."); return; }
      const subs = category.subdivisions;
      if (subs.length > 0 && !subdivisionId) { setError("Elige una subdivisión."); return; }
      if (!clubName.trim()) { setError("Indica el nombre del club."); return; }
      if (!clubAffiliationNumber.trim()) { setError("Indica el número de afiliación del club."); return; }
      if (!repName.trim()) { setError("Indica el nombre del apoderado/a."); return; }
      if (!repEmail.trim()) { setError("Indica el email del apoderado/a."); return; }
      if (!repPhone.trim()) { setError("Indica el teléfono del apoderado/a."); return; }
      if (!coach.name.trim()) { setError("Indica el nombre del entrenador/a."); return; }
      if (!coach.affiliationNumber.trim()) { setError("Indica el número de afiliación del entrenador/a."); return; }
      if (!coach.nivel) { setError("Indica el nivel del entrenador/a."); return; }
      if (!coach.phone.trim()) { setError("Indica el teléfono del entrenador/a."); return; }

      const filledPlayers = players.filter((p) => p.name.trim() && p.jerseyNumber.trim() && p.birthDate);
      if (filledPlayers.length === 0) {
        setError("Añade al menos un jugador/a con nombre, número de camisa y fecha de nacimiento.");
        return;
      }

      if (!terms.every(Boolean)) { setError("Debes aceptar todos los términos y condiciones."); return; }
      if (!signatureDataUrl) { setError("Por favor firma en el espacio de firma."); return; }

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
        teamName: teamName.trim() || clubName.trim(),
        clubName: clubName.trim(),
        status: "pending_payment",
        updatedAt: now.slice(0, 10),
        feeCents: fee,
        registeredAt: now,
        categoryId: category.id,
        subdivisionId: subId,
        clubAffiliationNumber: clubAffiliationNumber.trim(),
        representative: { name: repName.trim(), email: repEmail.trim(), phone: repPhone.trim() },
        coach,
        hasAssistant,
        assistant: hasAssistant ? assistant : null,
        players: filledPlayers,
        comments: comments.trim() || undefined,
        signatureDataUrl,
        termsAccepted: true,
      };

      appendStoredRegistration(row);
      createStubRosterFromRegistration(row);
      clearDraftStorage();
      setLastCreated(row);
      setDone(true);
    },
    [
      category, subdivisionId, clubName, clubAffiliationNumber, teamName,
      repName, repEmail, repPhone, coach, hasAssistant, assistant,
      players, terms, signatureDataUrl, feeUsdInput, feeCents, comments, tournament,
    ],
  );

  /* ── Success ── */
  if (done) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-8 dark:border-emerald-900 dark:bg-emerald-950/40">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-600 text-white">
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
              <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <p className="text-base font-bold text-emerald-900 dark:text-emerald-100">Inscripción completada</p>
            <p className="text-sm text-emerald-700 dark:text-emerald-300">Estado: pago pendiente.</p>
          </div>
        </div>
        {lastCreated ? (
          <div className="mt-5 rounded-xl border border-emerald-300/60 bg-white/80 p-4 dark:border-emerald-800 dark:bg-zinc-950/60">
            <p className="text-sm font-semibold text-emerald-950 dark:text-emerald-100">Descarga la hoja de inscripción en PDF</p>
            <button
              type="button"
              onClick={() => downloadRegistrationPdf(lastCreated)}
              className="mt-3 rounded-full bg-emerald-700 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
            >
              Exportar PDF
            </button>
          </div>
        ) : null}
        <button
          type="button"
          onClick={() => { setDone(false); setLastCreated(null); resetForm(); }}
          className="mt-4 text-sm font-medium text-emerald-800 underline dark:text-emerald-200"
        >
          Inscribir otro equipo
        </button>
      </div>
    );
  }

  /* ── Reuse panel (step 1 — always visible) ── */
  const reusePanel = (
    <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50/50 dark:border-emerald-800/60 dark:bg-emerald-950/20">
      <div className="border-b border-emerald-200/80 px-5 py-4 dark:border-emerald-800/60">
        <div className="flex items-center gap-2">
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5 text-emerald-600 dark:text-emerald-400">
            <path d="M10 3a1 1 0 0 1 1 1v5h5a1 1 0 1 1 0 2h-5v5a1 1 0 1 1-2 0v-5H4a1 1 0 1 1 0-2h5V4a1 1 0 0 1 1-1Z" />
          </svg>
          <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-50">
            Reutilizar datos guardados
          </h2>
        </div>
        <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
          Busca por club, pueblo, edad o coach. Los datos se cargan en el formulario — elige la categoría de este torneo antes de enviar.
        </p>
      </div>

      <div className="space-y-4 px-5 py-4">
        <Field label="Buscar equipo">
          <input
            type="search"
            placeholder="Club, pueblo, edad (14U), coach…"
            value={reuseSearchQuery}
            onChange={(e) => setReuseSearchQuery(e.target.value)}
            className={inputCls}
          />
        </Field>

        {mergedTeams.length === 0 ? (
          <div className="space-y-2 py-2">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              No hay equipos guardados en este dispositivo. Crea un perfil en Equipo o completa una inscripción en otro torneo.
            </p>
            <a
              href="/equipo"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-medium text-emerald-700 hover:underline dark:text-emerald-400"
            >
              Ir a Equipo →
            </a>
          </div>
        ) : filteredReuseTeams.length === 0 ? (
          <p className="text-sm text-zinc-500 py-2">
            No hay equipos que coincidan con la búsqueda.
          </p>
        ) : (
          <ul className="max-h-72 space-y-2 overflow-y-auto">
            {filteredReuseTeams.map((team) => (
              <li
                key={`${team.clubName}-${team.pueblo}-${team.sourceRegistration?.id ?? team.sourceProfile?.clubSlug ?? ""}`}
                className="flex items-start justify-between gap-3 rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-zinc-900 dark:text-zinc-100">
                    {team.clubName}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                    {team.pueblo ? <span>{team.pueblo}</span> : <span className="italic">Sin pueblo en perfil</span>}
                    {team.ageLabel ? (
                      <span className="rounded-full bg-zinc-100 px-2 py-0.5 font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                        {team.ageLabel}
                      </span>
                    ) : null}
                  </div>
                  {team.coachName ? (
                    <p className="mt-1 text-xs text-zinc-500">Coach: {team.coachName}</p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => applyMergedTeam(team)}
                  className="shrink-0 rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                >
                  Usar
                </button>
              </li>
            ))}
          </ul>
        )}

        <a
          href="/equipo"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block text-xs font-medium text-emerald-700 hover:underline dark:text-emerald-400"
        >
          Editar perfiles en Equipo →
        </a>
      </div>
    </div>
  );

  const navFooter = (prev?: FormStep, next?: FormStep | "submit") => (
    <div className="flex flex-wrap items-center gap-3 border-t border-zinc-200 pt-6 pb-[max(0.5rem,env(safe-area-inset-bottom,0px))] dark:border-zinc-700">
      {prev ? (
        <button
          type="button"
          onClick={() => setStep(prev)}
          className="min-h-[44px] rounded-full border border-zinc-300 px-6 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          ‹ Anterior
        </button>
      ) : null}
      {next === "submit" ? (
        <button
          type="submit"
          className="min-h-[44px] rounded-full bg-zinc-800 px-8 py-2.5 text-sm font-bold text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
        >
          Completar
        </button>
      ) : next ? (
        <button
          type="button"
          onClick={() => setStep(next)}
          className="min-h-[44px] rounded-full bg-zinc-800 px-8 py-2.5 text-sm font-bold text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
        >
          Siguiente ›
        </button>
      ) : null}
    </div>
  );

  /* ── Step: Equipo ── */
  if (step === "equipo") {
    return (
      <div className="space-y-8">
        <StepIndicator current="equipo" />

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
            {error}
          </div>
        ) : null}

        {reuseMsg ? (
          <div className="flex items-start justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
            <span>{reuseMsg}</span>
            <button type="button" onClick={() => setReuseMsg(null)} className="shrink-0 text-emerald-600 hover:text-emerald-900 dark:text-emerald-400">✕</button>
          </div>
        ) : null}

        {reusePanel}

        <section className="space-y-5">
          <SectionTitle>Información del Equipo</SectionTitle>
          <p className="text-xs text-zinc-500 italic">
            *Divisiones que no cumplan con el mínimo de equipos podrían consolidarse con la próxima división de la categoría.
          </p>
          <p className="text-xs text-zinc-500">
            Fecha límite de inscripción:{" "}
            <strong className="text-zinc-800 dark:text-zinc-200">{tournament.registrationDeadlineOn}</strong>
          </p>

          <Field label="Nombre del Equipo">
            <input
              className={inputCls}
              placeholder="Nombre del Equipo (Opcional)"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nombre del Club" required>
              <input
                className={inputCls}
                placeholder="Nombre del Club"
                value={clubName}
                onChange={(e) => setClubName(e.target.value)}
              />
              <p className="mt-1 text-xs text-zinc-400">
                Seleccione la opción del sistema; de no aparecer escriba el nombre de su club.
              </p>
            </Field>
            <Field label="Número de Afiliación del Club" required>
              <input
                className={inputCls}
                placeholder="Número de Afiliación"
                value={clubAffiliationNumber}
                onChange={(e) => setClubAffiliationNumber(e.target.value)}
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Categoría y División" required>
              <select
                className={inputCls}
                value={categoryId}
                onChange={(e) => { setCategoryId(e.target.value); setSubdivisionId(""); }}
              >
                {tournament.categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {displayCategoryName(c, tournament.divisions)}
                  </option>
                ))}
              </select>
            </Field>

            {category && category.subdivisions.length > 0 ? (
              <Field label="Subdivisión" required>
                <select
                  className={inputCls}
                  value={subdivisionId}
                  onChange={(e) => setSubdivisionId(e.target.value)}
                >
                  <option value="">— Elegir —</option>
                  {category.subdivisions.map((s) => (
                    <option key={s.id} value={s.id}>{s.label}</option>
                  ))}
                </select>
              </Field>
            ) : null}
          </div>

          <Field
            label="Tarifa de inscripción (USD)"
            hint={`Límite de inscripción: ${tournament.registrationDeadlineOn}`}
          >
            <input
              className={inputCls}
              inputMode="decimal"
              placeholder={feeCents != null ? `Sugerida: $${centsToInput(feeCents)}` : "—"}
              value={feeUsdInput}
              onChange={(e) => setFeeUsdInput(e.target.value)}
            />
          </Field>
        </section>

        <section className="space-y-5">
          <SectionTitle>Apoderada/o</SectionTitle>
          <Field label="Nombre Completo" required>
            <input className={inputCls} placeholder="Nombre Completo" value={repName} onChange={(e) => setRepName(e.target.value)} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Email Representante del Equipo" required>
              <input type="email" className={inputCls} placeholder="Email Representante del Equipo" value={repEmail} onChange={(e) => setRepEmail(e.target.value)} />
            </Field>
            <Field label="Teléfono" required>
              <input type="tel" className={inputCls} placeholder="787-555-0100" value={repPhone} onChange={(e) => setRepPhone(e.target.value)} />
            </Field>
          </div>
        </section>

        {navFooter(undefined, "roster")}
      </div>
    );
  }

  /* ── Step: Roster ── */
  if (step === "roster") {
    return (
      <div className="space-y-8">
        <StepIndicator current="roster" />

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
            {error}
          </div>
        ) : null}

        <section className="space-y-5">
          <CoachSection
            title="Entrenador"
            subtitle="Todo entrenador y asistente debe estar afiliado a la Federación Puertorriqueña de Voleibol o debe poseer licencia del DRD vigente a la fecha de la celebración del evento."
            value={coach}
            onChange={setCoach}
            required
          />
        </section>

        <section>
          <label className="flex cursor-pointer items-center gap-3 text-sm font-semibold text-zinc-800 dark:text-zinc-200">
            <input
              type="checkbox"
              checked={hasAssistant}
              onChange={(e) => setHasAssistant(e.target.checked)}
              className="h-4 w-4 rounded border-zinc-400 text-emerald-600 focus:ring-emerald-500"
            />
            ¿El entrenador tendrá un asistente?
          </label>
        </section>

        {hasAssistant ? (
          <section className="space-y-5">
            <CoachSection
              title="Asistente (Opcional)"
              value={assistant}
              onChange={setAssistant}
              required={false}
            />
          </section>
        ) : null}

        <section className="space-y-4">
          <SectionTitle>Roster de Jugadores/as</SectionTitle>
          <p className="text-xs text-zinc-500">
            Si no tienes la afiliación de FPV aún disponible puedes dejarlo en blanco y llenarlo posteriormente.
          </p>

          <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-700">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="bg-zinc-50 dark:bg-zinc-800">
                <tr>
                  <th className="w-8 px-3 py-2" />
                  <th className="px-3 py-2 text-left font-semibold text-zinc-700 dark:text-zinc-300">Nombre Completo</th>
                  <th className="w-28 px-3 py-2 text-left font-semibold text-zinc-700 dark:text-zinc-300">
                    N.Camisa <span className="text-red-500">*</span>
                  </th>
                  <th className="w-36 px-3 py-2 text-left font-semibold text-zinc-700 dark:text-zinc-300">Afiliación</th>
                  <th className="w-40 px-3 py-2 text-left font-semibold text-zinc-700 dark:text-zinc-300">
                    Fecha Nacimiento <span className="text-red-500">*</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {players.map((p, i) => (
                  <tr key={p.id} className="bg-white dark:bg-zinc-900">
                    <td className="px-3 py-1.5 text-center">
                      <button
                        type="button"
                        onClick={() => removePlayer(i)}
                        disabled={players.length <= 1}
                        className="text-zinc-400 hover:text-red-500 disabled:opacity-20"
                        aria-label="Quitar jugador"
                      >
                        ✕
                      </button>
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        className={inputCls}
                        placeholder="Nombre Completo"
                        value={p.name}
                        onChange={(e) => updatePlayer(i, "name", e.target.value)}
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        className={inputCls}
                        placeholder="#"
                        value={p.jerseyNumber}
                        onChange={(e) => updatePlayer(i, "jerseyNumber", e.target.value)}
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        className={inputCls}
                        placeholder="FPV-XXXX"
                        value={p.affiliationNumber}
                        onChange={(e) => updatePlayer(i, "affiliationNumber", e.target.value)}
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        type="date"
                        className={inputCls}
                        value={p.birthDate}
                        onChange={(e) => updatePlayer(i, "birthDate", e.target.value)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            type="button"
            onClick={addPlayer}
            className="inline-flex items-center gap-1.5 rounded-full border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            + Añadir Jugador/a
          </button>
        </section>

        {navFooter("equipo", "confirmacion")}
      </div>
    );
  }

  /* ── Step: Confirmación ── */
  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <StepIndicator current="confirmacion" />

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </div>
      ) : null}

      <section className="space-y-3">
        <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Comentarios o Consideraciones</p>
        <textarea
          rows={4}
          className={`${inputCls} resize-y`}
          placeholder="Comentarios o consideraciones..."
          value={comments}
          onChange={(e) => setComments(e.target.value)}
        />
        <p className="text-xs text-zinc-400 italic">
          *Tomaremos en cuenta cualquier recomendación o consideración. No obstante, aunque la evaluaremos no podemos garantizar la misma.
        </p>
      </section>

      <section className="space-y-4">
        <SectionTitle>Aceptación Términos y Condiciones</SectionTitle>
        {[
          "Certificamos los jugadores tienen con el club una póliza de cubierta en caso de accidente. Relevamos y consideramos totalmente libre de responsabilidad al organizador, auspiciadores, club, directiva, dirigentes, oficiales y al Municipio de cualquier gasto y/o costos causados por algún daño o accidente ocurrido durante o posterior al evento.",
          "Certificamos que nuestro club, jugadoras/es, entrenador y asistente (si aplica) están afiliados de manera vigente a la Federación Puertorriqueña de Voleibol. Entendemos que de no estarlo nuestra participación en el evento se podría ver afectada sin derecho a devolución de dinero.",
          "Acepto el equipo incluyendo nuestros padres son responsables de cumplir con el reglamento, esto incluye reglas de juego, el no utilizar artefactos como cornetas y utilización formal de uniforme.",
        ].map((text, i) => (
          <label
            key={i}
            className="flex cursor-pointer items-start gap-3 text-sm text-zinc-700 dark:text-zinc-300"
          >
            <input
              type="checkbox"
              checked={terms[i]}
              onChange={() => toggleTerm(i)}
              className="mt-0.5 h-5 w-5 min-h-[20px] min-w-[20px] shrink-0 rounded border-zinc-400 text-emerald-600 focus:ring-emerald-500"
            />
            <span>{text}</span>
          </label>
        ))}
      </section>

      <section className="space-y-3">
        <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
          Firma <span className="text-red-500">*</span>
        </p>
        <SignaturePad onChange={setSignatureDataUrl} />
      </section>

      {navFooter("roster", "submit")}
    </form>
  );
}
