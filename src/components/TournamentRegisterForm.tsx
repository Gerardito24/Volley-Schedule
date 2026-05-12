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
  distinctPueblosFromTeams,
  filterMergedTeamsForDisplay,
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

/* ─── Main form ─── */

export function TournamentRegisterForm({
  tournament,
}: {
  tournament: RegisterTournamentPayload;
}) {
  const [step, setStep] = useState<1 | 2>(1);

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

  // Reuse panel state (cascading pueblo + filters)
  const [reuseOpen, setReuseOpen] = useState(false);
  const [reusePuebloSelected, setReusePuebloSelected] = useState("");
  const [reusePuebloInput, setReusePuebloInput] = useState("");
  const [reusePuebloDropdownOpen, setReusePuebloDropdownOpen] = useState(false);
  const [reuseFilterClub, setReuseFilterClub] = useState("");
  const [reuseFilterEdad, setReuseFilterEdad] = useState("");
  const [reuseFilterCoach, setReuseFilterCoach] = useState("");
  const [reuseMsg, setReuseMsg] = useState<string | null>(null);
  const puebloDropdownBlurTimer = useRef<number | null>(null);

  function clearPuebloBlurTimer() {
    if (puebloDropdownBlurTimer.current != null) {
      window.clearTimeout(puebloDropdownBlurTimer.current);
      puebloDropdownBlurTimer.current = null;
    }
  }

  useEffect(() => () => clearPuebloBlurTimer(), []);
  const [allRegistrations, setAllRegistrations] = useState<RegistrationRowMock[]>([]);
  const [allProfiles, setAllProfiles] = useState<ClubProfile[]>([]);

  // Load reuse sources when entering step 2
  useEffect(() => {
    if (step !== 2) return;
    setAllRegistrations(readStoredRegistrations());
    setAllProfiles(readClubProfiles());
  }, [step]);

  const mergedTeams = useMemo(
    () => buildMergedTeamList(allRegistrations, allProfiles, tournament.slug),
    [allRegistrations, allProfiles, tournament.slug],
  );

  const puebloDropdownOptions = useMemo(() => {
    const all = distinctPueblosFromTeams(mergedTeams);
    const q = reusePuebloInput.trim().toLowerCase();
    if (!q) return all;
    return all.filter((p) => p.toLowerCase().includes(q));
  }, [mergedTeams, reusePuebloInput]);

  const filteredReuseTeams = useMemo(() => {
    if (!reusePuebloSelected.trim()) return [];
    return filterMergedTeamsForDisplay(
      mergedTeams,
      reusePuebloSelected,
      reuseFilterClub,
      reuseFilterEdad,
      reuseFilterCoach,
      false,
    );
  }, [
    mergedTeams,
    reusePuebloSelected,
    reuseFilterClub,
    reuseFilterEdad,
    reuseFilterCoach,
  ]);

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
    // Reset fields that must be fresh per torneo
    setTerms([false, false, false]);
    setSignatureDataUrl(null);
    setReuseOpen(false);
    setReuseMsg("Datos cargados. Elige la categoría de este torneo y completa la firma.");
  }

  function applyReuseProfile(profile: ClubProfile) {
    const d = applyClubProfileToFormDraft(profile);
    setClubName(d.clubName);
    setRepName(d.repName);
    setRepEmail(d.repEmail);
    setRepPhone(d.repPhone);
    // Reset firma/términos but leave roster/coach intact
    setTerms([false, false, false]);
    setSignatureDataUrl(null);
    setReuseOpen(false);
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
        // Extended fields
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
          onClick={() => { setDone(false); setLastCreated(null); setStep(1); }}
          className="mt-4 text-sm font-medium text-emerald-800 underline dark:text-emerald-200"
        >
          Inscribir otro equipo
        </button>
      </div>
    );
  }

  /* ── Step 1: Información del torneo ── */
  if (step === 1) {
    return (
      <div className="space-y-6">
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 space-y-6">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
            ¿Qué necesitarás para completar el registro?
          </h2>

          <div className="space-y-4 text-sm text-zinc-700 dark:text-zinc-300">
            <div>
              <p className="font-semibold text-zinc-900 dark:text-zinc-100">1. Información de Participantes</p>
              <ul className="mt-1 list-disc pl-5 space-y-1 text-zinc-600 dark:text-zinc-400">
                <li>Nombre Completo del Jugador/a, Fecha de Nacimiento y Número de Camisa de cada participante.</li>
              </ul>
            </div>
            <div>
              <p className="font-semibold text-zinc-900 dark:text-zinc-100">2. Afiliaciones FPV</p>
              <ul className="mt-1 list-disc pl-5 space-y-1 text-zinc-600 dark:text-zinc-400">
                <li>Para el registro es necesario que tengas a la mano el número de afiliación del club, participantes y entrenadores.</li>
              </ul>
            </div>
            <div>
              <p className="font-semibold text-zinc-900 dark:text-zinc-100">3. Categoría y división</p>
              <ul className="mt-1 list-disc pl-5 space-y-1 text-zinc-600 dark:text-zinc-400">
                <li>Conoce la categoría y división de las categorías disponibles en este torneo.</li>
              </ul>
            </div>
            <div>
              <p className="font-semibold text-zinc-900 dark:text-zinc-100">4. Registro</p>
              <ul className="mt-1 list-disc pl-5 space-y-1 text-zinc-600 dark:text-zinc-400">
                <li>Todos los equipos participantes tienen que hacer el registro en línea.</li>
                <li><strong>NO SE ACEPTARÁN EQUIPOS QUE NO COMPLETEN EL REGISTRO.</strong></li>
                <li>Una vez registrado el equipo puede realizar cambios en el roster hasta una semana antes del evento.</li>
                <li><strong>FAVOR DE NO DUPLICAR LOS REGISTROS.</strong></li>
              </ul>
            </div>
            <div>
              <p className="font-semibold text-zinc-900 dark:text-zinc-100">5. Fecha límite de inscripción</p>
              <ul className="mt-1 list-disc pl-5 space-y-1 text-zinc-600 dark:text-zinc-400">
                <li>
                  La fecha límite de pago y registro es el{" "}
                  <strong className="text-zinc-900 dark:text-zinc-100">
                    {tournament.registrationDeadlineOn}
                  </strong>
                  . Luego de esa fecha conlleva una penalidad de $50.00.{" "}
                  <strong>SIN DISTINCIÓN DE EQUIPO.</strong>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setStep(2)}
          className="flex items-center gap-2 rounded-full bg-zinc-800 px-8 py-3 text-sm font-bold text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
        >
          Continuar <span aria-hidden>›</span>
        </button>
      </div>
    );
  }

  /* ── Step 2: Full form ── */
  return (
    <form onSubmit={handleSubmit} className="space-y-10">
      {/* Error banner */}
      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </div>
      ) : null}

      {/* Reuse success message */}
      {reuseMsg ? (
        <div className="flex items-start justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
          <span>{reuseMsg}</span>
          <button type="button" onClick={() => setReuseMsg(null)} className="shrink-0 text-emerald-600 hover:text-emerald-900 dark:text-emerald-400">✕</button>
        </div>
      ) : null}

      {/* ── Reuse panel (pueblo + filtros en cascada) ── */}
      <div className="rounded-2xl border border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900/50">
        <button
          type="button"
          onClick={() => setReuseOpen((o) => !o)}
          className="flex w-full items-center justify-between px-5 py-4 text-left"
        >
          <div className="flex items-center gap-2">
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-emerald-600 dark:text-emerald-400">
              <path d="M10 3a1 1 0 0 1 1 1v5h5a1 1 0 1 1 0 2h-5v5a1 1 0 1 1-2 0v-5H4a1 1 0 1 1 0-2h5V4a1 1 0 0 1 1-1Z" />
            </svg>
            <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
              Reutilizar datos guardados
            </span>
          </div>
          <svg
            viewBox="0 0 20 20"
            fill="currentColor"
            className={`h-4 w-4 text-zinc-400 transition-transform ${reuseOpen ? "rotate-180" : ""}`}
          >
            <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
          </svg>
        </button>

        {reuseOpen ? (
          <div className="border-t border-zinc-200 px-5 pb-5 pt-4 space-y-4 dark:border-zinc-700">
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Elige un pueblo para ver equipos guardados que coincidan. Puedes acotar con club, edad o coach. Un mismo club puede tener varias filas (distinta edición o división).
            </p>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {/* Pueblo combobox */}
              <div className="relative sm:col-span-2 lg:col-span-1">
                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                  Pueblo
                </label>
                <div className="mt-1 flex gap-1">
                  <input
                    type="text"
                    placeholder="Escribir o elegir…"
                    value={reusePuebloInput}
                    onChange={(e) => {
                      clearPuebloBlurTimer();
                      setReusePuebloInput(e.target.value);
                      setReusePuebloDropdownOpen(true);
                      if (
                        reusePuebloSelected &&
                        e.target.value.trim().toLowerCase() !== reusePuebloSelected.trim().toLowerCase()
                      ) {
                        setReusePuebloSelected("");
                      }
                    }}
                    onFocus={() => {
                      clearPuebloBlurTimer();
                      if (!reusePuebloSelected.trim()) {
                        setReusePuebloDropdownOpen(true);
                      }
                    }}
                    onBlur={() => {
                      clearPuebloBlurTimer();
                      puebloDropdownBlurTimer.current = window.setTimeout(() => {
                        setReusePuebloDropdownOpen(false);
                        puebloDropdownBlurTimer.current = null;
                      }, 120);
                    }}
                    className="min-w-0 flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
                  />
                  {reusePuebloSelected ? (
                    <button
                      type="button"
                      title="Quitar pueblo"
                      onClick={() => {
                        clearPuebloBlurTimer();
                        setReusePuebloSelected("");
                        setReusePuebloInput("");
                        setReusePuebloDropdownOpen(false);
                      }}
                      className="shrink-0 rounded-lg border border-zinc-300 px-2 text-sm text-zinc-500 hover:bg-zinc-100 dark:border-zinc-600 dark:hover:bg-zinc-800"
                    >
                      ×
                    </button>
                  ) : null}
                </div>
                {reusePuebloDropdownOpen && puebloDropdownOptions.length > 0 ? (
                  <ul className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-zinc-200 bg-white py-1 text-sm shadow-lg dark:border-zinc-700 dark:bg-zinc-950">
                    {puebloDropdownOptions.map((p) => (
                      <li key={p}>
                        <button
                          type="button"
                          className="w-full px-3 py-2 text-left hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            clearPuebloBlurTimer();
                            setReusePuebloSelected(p);
                            setReusePuebloInput(p);
                            setReusePuebloDropdownOpen(false);
                          }}
                        >
                          {p}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                  Club (opcional)
                </label>
                <input
                  type="text"
                  placeholder="Nombre del club"
                  value={reuseFilterClub}
                  onChange={(e) => setReuseFilterClub(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                  Edad (opcional)
                </label>
                <input
                  type="text"
                  placeholder="ej. 14U"
                  value={reuseFilterEdad}
                  onChange={(e) => setReuseFilterEdad(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                  Coach (opcional)
                </label>
                <input
                  type="text"
                  placeholder="Nombre del coach"
                  value={reuseFilterCoach}
                  onChange={(e) => setReuseFilterCoach(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
                />
              </div>
            </div>

            {!reusePuebloSelected.trim() && mergedTeams.length > 0 ? (
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Selecciona un pueblo arriba para listar equipos guardados que coincidan.
              </p>
            ) : null}

            {mergedTeams.length === 0 ? (
              <div className="space-y-2 py-2">
                <p className="text-sm text-zinc-400">
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
            ) : !reusePuebloSelected.trim() ? null : filteredReuseTeams.length === 0 ? (
              <p className="text-sm text-zinc-400 py-2">
                No hay equipos que coincidan con los filtros.
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
        ) : null}
      </div>

      {/* ── A: Información del Equipo ── */}
      <section className="space-y-5">
        <SectionTitle>Información del Equipo</SectionTitle>
        <p className="text-xs text-zinc-500 italic">
          *Divisiones que no cumplan con el mínimo de equipos podrían consolidarse con la próxima división de la categoría.
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

      {/* ── B: Apoderada/o ── */}
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

      {/* ── C: Entrenador ── */}
      <section className="space-y-5">
        <CoachSection
          title="Entrenador"
          subtitle="Todo entrenador y asistente debe estar afiliado a la Federación Puertorriqueña de Voleibol o debe poseer licencia del DRD vigente a la fecha de la celebración del evento."
          value={coach}
          onChange={setCoach}
          required
        />
      </section>

      {/* ── D: ¿Tendrá asistente? ── */}
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

      {/* ── E: Asistente (conditional) ── */}
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

      {/* ── F: Roster ── */}
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

      {/* ── G: Comentarios ── */}
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

      {/* ── H: Términos y Condiciones ── */}
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
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-zinc-400 text-emerald-600 focus:ring-emerald-500"
            />
            <span>{text}</span>
          </label>
        ))}
      </section>

      {/* ── I: Firma ── */}
      <section className="space-y-3">
        <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
          Firma <span className="text-red-500">*</span>
        </p>
        <SignaturePad onChange={setSignatureDataUrl} />
      </section>

      {/* ── Footer buttons ── */}
      <div className="flex items-center gap-3 border-t border-zinc-200 pt-6 dark:border-zinc-700">
        <button
          type="button"
          onClick={() => setStep(1)}
          className="rounded-full border border-zinc-300 px-6 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          ‹ Regresar
        </button>
        <button
          type="submit"
          className="rounded-full bg-zinc-800 px-8 py-2.5 text-sm font-bold text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
        >
          Completar
        </button>
      </div>
    </form>
  );
}
