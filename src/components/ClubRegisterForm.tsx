"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CLUB_REGISTRY_SLUG,
  getTournamentBySlug,
  type CategoryGender,
  type CategoryMock,
  type CoachEntry,
  type PlayerEntry,
  type RegistrationRowMock,
  type TournamentMock,
  categoryGenderLabel,
  formatRegistrationDivisionLabel,
} from "@/lib/mock-data";
import { appendStoredRegistration } from "@/lib/local-registrations";
import { upsertClubProfile } from "@/lib/local-club-profiles";
import { createStubRosterFromRegistration } from "@/lib/local-team-rosters";
import {
  downloadRegistrationPdf,
  registrationPdfFilename,
  registrationPdfToBase64,
} from "@/lib/registrationPdf";
import { applyClubProfileToFormDraft } from "@/lib/registration-reuse";
import type { ClubProfile } from "@/lib/club-profile-types";
import { slugify } from "@/lib/slugify";
import {
  CoachSection,
  Field,
  SectionTitle,
  SignaturePad,
  registrationInputCls as inputCls,
} from "@/components/registration/RegistrationFormPrimitives";

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

function buildDivisionLabel(
  tournament: TournamentMock,
  category: CategoryMock,
  subdivisionId: string | null,
): string {
  return formatRegistrationDivisionLabel(tournament, category, subdivisionId);
}

/** Nombre de equipo guardado: edad · género · (coach o apoderado si el coach es el mismo y no se repitió). */
function buildClubTeamDisplayName(
  ageLabel: string,
  gender: CategoryGender,
  coachName: string,
  repName: string,
): string {
  const namePart = coachName.trim() || repName.trim();
  const parts = [ageLabel.trim(), categoryGenderLabel(gender), namePart].filter(Boolean);
  return parts.join(" · ");
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function ClubRegisterForm({ initialProfile }: { initialProfile?: ClubProfile | null }) {
  const fullTournament = useMemo(() => getTournamentBySlug(CLUB_REGISTRY_SLUG), []);

  const category = fullTournament?.categories[0];
  const categoryId = category?.id ?? "";

  const [step, setStep] = useState<1 | 2 | 3>(1);

  const [pueblo, setPueblo] = useState("");
  const [teamAgeLabel, setTeamAgeLabel] = useState("");
  const [teamGender, setTeamGender] = useState<CategoryGender>("mixto");
  const [clubName, setClubName] = useState("");
  const [clubAffiliationNumber, setClubAffiliationNumber] = useState("");

  const [repName, setRepName] = useState("");
  const [repEmail, setRepEmail] = useState("");
  const [repPhone, setRepPhone] = useState("");

  const [coach, setCoach] = useState<CoachEntry>(emptyCoach);
  const [hasAssistant, setHasAssistant] = useState(false);
  const [assistant, setAssistant] = useState<CoachEntry>(emptyCoach);

  const [players, setPlayers] = useState<PlayerEntry[]>(() => Array.from({ length: 6 }, emptyPlayer));

  const [comments, setComments] = useState("");
  const [terms, setTerms] = useState([false, false, false]);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [lastCreated, setLastCreated] = useState<RegistrationRowMock | null>(null);
  const [deliveryEmail, setDeliveryEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [emailSendError, setEmailSendError] = useState<string | null>(null);

  useEffect(() => {
    if (!initialProfile) return;
    const d = applyClubProfileToFormDraft(initialProfile);
    setClubName(d.clubName);
    setPueblo(initialProfile.pueblo ?? "");
    setRepName(d.repName);
    setRepEmail(d.repEmail);
    setRepPhone(d.repPhone);
    setTerms([false, false, false]);
    setSignatureDataUrl(null);
  }, [initialProfile]);

  const autoTeamNamePreview = useMemo(
    () => buildClubTeamDisplayName(teamAgeLabel, teamGender, coach.name, repName),
    [teamAgeLabel, teamGender, coach.name, repName],
  );

  function updatePlayer<K extends keyof PlayerEntry>(idx: number, key: K, val: PlayerEntry[K]) {
    setPlayers((prev) => prev.map((pl, i) => (i === idx ? { ...pl, [key]: val } : pl)));
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

  const validateFormAndGoToEmailStep = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      if (!fullTournament || !category) {
        setError("No se pudo cargar el registro interno. Recarga la página.");
        return;
      }

      if (!clubName.trim()) {
        setError("Indica el nombre del club.");
        return;
      }
      if (!clubAffiliationNumber.trim()) {
        setError("Indica el número de afiliación del club.");
        return;
      }
      if (!pueblo.trim()) {
        setError("Indica el municipio / pueblo del club.");
        return;
      }
      if (!teamAgeLabel.trim()) {
        setError("Indica la edad o categoría del equipo (ej. 14U).");
        return;
      }
      if (!repName.trim()) {
        setError("Indica el nombre del apoderado/a.");
        return;
      }
      if (!repPhone.trim()) {
        setError("Indica el teléfono del apoderado/a.");
        return;
      }

      // Nombre visible del equipo: coach o apoderado si comparten rol; el registro guarda coach.name con fallback.
      const coachNameResolved = coach.name.trim() || repName.trim();
      if (!coachNameResolved) {
        setError("Indica el nombre del entrenador/a, o completa antes el apoderado/a.");
        return;
      }

      if (!coach.affiliationNumber.trim()) {
        setError("Indica el número de afiliación del entrenador/a.");
        return;
      }
      if (!coach.nivel) {
        setError("Indica el nivel del entrenador/a.");
        return;
      }
      if (!coach.phone.trim()) {
        setError("Indica el teléfono del entrenador/a.");
        return;
      }

      const filledPlayers = players.filter((pl) => pl.name.trim() && pl.jerseyNumber.trim() && pl.birthDate);
      if (filledPlayers.length === 0) {
        setError("Añade al menos un jugador/a con nombre, número de camisa y fecha de nacimiento.");
        return;
      }

      if (!terms.every(Boolean)) {
        setError("Debes aceptar todos los términos y condiciones.");
        return;
      }
      if (!signatureDataUrl) {
        setError("Por favor firma en el espacio de firma.");
        return;
      }

      setDeliveryEmail(repEmail.trim());
      setStep(3);
    },
    [
      fullTournament,
      category,
      clubName,
      pueblo,
      clubAffiliationNumber,
      teamAgeLabel,
      repName,
      repPhone,
      repEmail,
      coach,
      players,
      terms,
      signatureDataUrl,
    ],
  );

  const handleFinalSave = useCallback(async () => {
    setError(null);
    if (!fullTournament || !category) {
      setError("No se pudo cargar el registro interno. Recarga la página.");
      return;
    }

    const email = deliveryEmail.trim();
    if (!isValidEmail(email)) {
      setError("Indica un correo electrónico válido para enviar la constancia en PDF.");
      return;
    }

    const coachNameResolved = coach.name.trim() || repName.trim();
    const coachForRow: CoachEntry = {
      ...coach,
      name: coachNameResolved,
    };

    const teamNameStored = buildClubTeamDisplayName(teamAgeLabel, teamGender, coachForRow.name, repName);

    const clubSlug = slugify(clubName.trim());
    const now = new Date().toISOString();
    const divisionLabel = buildDivisionLabel(fullTournament, category, null);

    const filledPlayers = players.filter((pl) => pl.name.trim() && pl.jerseyNumber.trim() && pl.birthDate);

    const row: RegistrationRowMock = {
      id: `local-reg-${crypto.randomUUID()}`,
      tournamentSlug: fullTournament.slug,
      tournamentName: fullTournament.name,
      divisionLabel,
      teamName: teamNameStored,
      clubName: clubName.trim(),
      status: "approved",
      updatedAt: now.slice(0, 10),
      feeCents: 0,
      registeredAt: now,
      categoryId,
      subdivisionId: null,
      clubAffiliationNumber: clubAffiliationNumber.trim(),
      representative: { name: repName.trim(), email, phone: repPhone.trim() },
      coach: coachForRow,
      hasAssistant,
      assistant: hasAssistant ? assistant : null,
      players: filledPlayers,
      comments: comments.trim() || undefined,
      signatureDataUrl,
      termsAccepted: true,
    };

    setSaving(true);
    setEmailSendError(null);

    upsertClubProfile({
      clubSlug,
      displayName: clubName.trim(),
      pueblo: pueblo.trim(),
      clubPhone: repPhone.trim(),
      contactName: repName.trim(),
      contactEmail: email,
      updatedAt: now,
    });

    appendStoredRegistration(row);
    createStubRosterFromRegistration(row);

    try {
      const res = await fetch("/api/club-registration/send-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: email,
          pdfBase64: registrationPdfToBase64(row),
          filename: registrationPdfFilename(row),
        }),
      });
      const payload: unknown = await res.json().catch(() => ({}));
      const errMsg =
        typeof payload === "object" &&
        payload !== null &&
        "error" in payload &&
        typeof (payload as { error: unknown }).error === "string"
          ? (payload as { error: string }).error
          : null;
      if (!res.ok) {
        setEmailSendError(errMsg ?? "No se pudo enviar el correo. Puedes descargar el PDF abajo.");
      }
    } catch {
      setEmailSendError(
        "No se pudo contactar al servidor para enviar el correo. Puedes descargar el PDF abajo.",
      );
    }

    setLastCreated(row);
    setDone(true);
    setSaving(false);
  }, [
    fullTournament,
    category,
    categoryId,
    clubName,
    pueblo,
    clubAffiliationNumber,
    teamAgeLabel,
    teamGender,
    repName,
    repPhone,
    deliveryEmail,
    coach,
    hasAssistant,
    assistant,
    players,
    comments,
    signatureDataUrl,
  ]);

  if (!fullTournament || !category) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
        Falta el torneo interno de registro de club en los datos. Contacta al administrador del sitio.
      </div>
    );
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-8 dark:border-emerald-900 dark:bg-emerald-950/40">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-600 text-white">
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
              <path
                fillRule="evenodd"
                d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div>
            <p className="text-base font-bold text-emerald-900 dark:text-emerald-100">Registro de club guardado</p>
            <p className="text-sm text-emerald-700 dark:text-emerald-300">
              El club aparece en Administración → Equipos y podrás reutilizar estos datos en futuras inscripciones a
              torneo.
            </p>
            {emailSendError ? (
              <p className="mt-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-100">
                {emailSendError}
              </p>
            ) : (
              <p className="mt-3 text-sm text-emerald-700 dark:text-emerald-300">
                Te enviamos la constancia en PDF al correo que indicaste.
              </p>
            )}
          </div>
        </div>
        {lastCreated ? (
          <div className="mt-5 rounded-xl border border-emerald-300/60 bg-white/80 p-4 dark:border-emerald-800 dark:bg-zinc-950/60">
            <p className="text-sm font-semibold text-emerald-950 dark:text-emerald-100">Descargar PDF de respaldo</p>
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
          onClick={() => {
            setDone(false);
            setLastCreated(null);
            setStep(1);
            setSignatureDataUrl(null);
            setTerms([false, false, false]);
            setTeamAgeLabel("");
            setTeamGender("mixto");
            setDeliveryEmail("");
            setEmailSendError(null);
            setSaving(false);
          }}
          className="mt-4 text-sm font-medium text-emerald-800 underline dark:text-emerald-200"
        >
          Registrar otro club
        </button>
      </div>
    );
  }

  if (step === 1) {
    return (
      <div className="space-y-6">
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 space-y-6">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">¿Qué necesitarás para completar el registro?</h2>

          <div className="space-y-4 text-sm text-zinc-700 dark:text-zinc-300">
            <div>
              <p className="font-semibold text-zinc-900 dark:text-zinc-100">1. Información del club y del equipo</p>
              <ul className="mt-1 list-disc pl-5 space-y-1 text-zinc-600 dark:text-zinc-400">
                <li>Nombre del club, municipio/pueblo, número de afiliación del club y datos del representante.</li>
                <li>
                  Edad o categoría del equipo (ej. 14U), género (femenino / masculino / mixto) y nombre del entrenador/a.
                  El nombre del equipo en el sistema se arma automáticamente a partir de esos datos.
                </li>
              </ul>
            </div>
            <div>
              <p className="font-semibold text-zinc-900 dark:text-zinc-100">2. Afiliaciones FPV</p>
              <ul className="mt-1 list-disc pl-5 space-y-1 text-zinc-600 dark:text-zinc-400">
                <li>Número de afiliación del club, del entrenador y de cada jugador/a que registres ahora.</li>
              </ul>
            </div>
            <div>
              <p className="font-semibold text-zinc-900 dark:text-zinc-100">3. Roster</p>
              <ul className="mt-1 list-disc pl-5 space-y-1 text-zinc-600 dark:text-zinc-400">
                <li>Nombre completo, número de camisa y fecha de nacimiento de cada jugador/a.</li>
              </ul>
            </div>
            <div>
              <p className="font-semibold text-zinc-900 dark:text-zinc-100">4. Firma y términos</p>
              <ul className="mt-1 list-disc pl-5 space-y-1 text-zinc-600 dark:text-zinc-400">
                <li>Firma del representante y aceptación de los términos (mismo texto que en inscripción a torneo).</li>
                <li>No hay pago en línea en este flujo: la tarifa queda en $0 como registro de perfil.</li>
              </ul>
            </div>
            <div>
              <p className="font-semibold text-zinc-900 dark:text-zinc-100">5. Correo para la constancia</p>
              <ul className="mt-1 list-disc pl-5 space-y-1 text-zinc-600 dark:text-zinc-400">
                <li>
                  Al terminar el formulario indicarás un correo; al pulsar &quot;Guardar registro&quot; se guarda el club
                  y se envía el PDF a ese correo (si el servidor está configurado).
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

  if (step === 3) {
    return (
      <div className="space-y-6">
        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
            {error}
          </div>
        ) : null}

        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 space-y-5">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">Correo para la constancia</h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Aquí se guarda el registro del club en la aplicación y se envía la constancia en PDF. Usa un correo al que
            tengas acceso; si el envío falla, podrás descargar el PDF en la pantalla de confirmación.
          </p>
          <Field label="Correo electrónico" required hint="Se usa como contacto del registro y destino del PDF">
            <input
              type="email"
              className={inputCls}
              placeholder="tu@correo.com"
              value={deliveryEmail}
              onChange={(e) => setDeliveryEmail(e.target.value)}
              autoComplete="email"
            />
          </Field>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Solo usamos este correo para la constancia y el contacto del registro en este sitio (demo local). No
            compartimos datos con terceros desde este flujo.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setError(null);
              setStep(2);
            }}
            disabled={saving}
            className="rounded-full border border-zinc-300 px-6 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            ‹ Volver al formulario
          </button>
          <button
            type="button"
            onClick={() => void handleFinalSave()}
            disabled={saving}
            className="rounded-full bg-zinc-800 px-8 py-2.5 text-sm font-bold text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
          >
            {saving ? "Guardando…" : "Guardar registro"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={validateFormAndGoToEmailStep} className="space-y-10">
      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </div>
      ) : null}

      <section className="space-y-5">
        <SectionTitle>Información del Equipo</SectionTitle>
        <p className="text-xs text-zinc-500 italic">
          Registro de club — sin selección de categoría de torneo. Los datos se guardan para reutilizar en inscripciones
          futuras.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Edad / categoría del equipo" required hint="Ej. 14U, 16U, Open">
            <input
              className={inputCls}
              placeholder="Ej. 14U"
              value={teamAgeLabel}
              onChange={(e) => setTeamAgeLabel(e.target.value)}
            />
          </Field>
          <Field label="Género del equipo" required>
            <select
              className={inputCls}
              value={teamGender}
              onChange={(e) => setTeamGender(e.target.value as CategoryGender)}
            >
              {(["femenino", "masculino", "mixto"] as const).map((g) => (
                <option key={g} value={g}>
                  {categoryGenderLabel(g)}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <p className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-200">
          <span className="font-semibold text-zinc-900 dark:text-zinc-50">Nombre del equipo (automático):</span>{" "}
          <span className="font-medium">{autoTeamNamePreview || "—"}</span>
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nombre del Club" required>
            <input
              className={inputCls}
              placeholder="Nombre del Club"
              value={clubName}
              onChange={(e) => setClubName(e.target.value)}
            />
          </Field>
          <Field label="Municipio / Pueblo" required>
            <input
              className={inputCls}
              placeholder="Ej. San Juan"
              value={pueblo}
              onChange={(e) => setPueblo(e.target.value)}
            />
          </Field>
        </div>

        <Field label="Número de Afiliación del Club" required>
          <input
            className={inputCls}
            placeholder="Número de Afiliación"
            value={clubAffiliationNumber}
            onChange={(e) => setClubAffiliationNumber(e.target.value)}
          />
        </Field>
      </section>

      <section className="space-y-5">
        <SectionTitle>Apoderada/o</SectionTitle>
        <Field label="Nombre Completo" required>
          <input className={inputCls} placeholder="Nombre Completo" value={repName} onChange={(e) => setRepName(e.target.value)} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Email del representante (opcional)"
            hint="Si lo dejas en blanco, indica el correo en el paso siguiente. Puedes prellenar aquí para copiarlo al paso final."
          >
            <input
              type="email"
              className={inputCls}
              placeholder="Email (opcional aquí)"
              value={repEmail}
              onChange={(e) => setRepEmail(e.target.value)}
            />
          </Field>
          <Field label="Teléfono" required>
            <input type="tel" className={inputCls} placeholder="787-555-0100" value={repPhone} onChange={(e) => setRepPhone(e.target.value)} />
          </Field>
        </div>
      </section>

      <section className="space-y-3">
        <CoachSection
          title="Entrenador"
          subtitle="Todo entrenador y asistente debe estar afiliado a la Federación Puertorriqueña de Voleibol o debe poseer licencia del DRD vigente a la fecha de la celebración del evento."
          value={coach}
          onChange={setCoach}
          required
        />
        {repName.trim() ? (
          <button
            type="button"
            onClick={() => setCoach((c) => ({ ...c, name: repName.trim() }))}
            className="text-xs font-medium text-emerald-700 underline hover:text-emerald-900 dark:text-emerald-400 dark:hover:text-emerald-200"
          >
            Usar nombre del apoderado/a como entrenador/a
          </button>
        ) : null}
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
          <CoachSection title="Asistente (Opcional)" value={assistant} onChange={setAssistant} required={false} />
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
              {players.map((pl, i) => (
                <tr key={pl.id} className="bg-white dark:bg-zinc-900">
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
                      value={pl.name}
                      onChange={(e) => updatePlayer(i, "name", e.target.value)}
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      className={inputCls}
                      placeholder="#"
                      value={pl.jerseyNumber}
                      onChange={(e) => updatePlayer(i, "jerseyNumber", e.target.value)}
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      className={inputCls}
                      placeholder="FPV-XXXX"
                      value={pl.affiliationNumber}
                      onChange={(e) => updatePlayer(i, "affiliationNumber", e.target.value)}
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      type="date"
                      className={inputCls}
                      value={pl.birthDate}
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
          *Tomaremos en cuenta cualquier recomendación o consideración. No obstante, aunque la evaluaremos no podemos
          garantizar la misma.
        </p>
      </section>

      <section className="space-y-4">
        <SectionTitle>Aceptación Términos y Condiciones</SectionTitle>
        {[
          "Certificamos los jugadores tienen con el club una póliza de cubierta en caso de accidente. Relevamos y consideramos totalmente libre de responsabilidad al organizador, auspiciadores, club, directiva, dirigentes, oficiales y al Municipio de cualquier gasto y/o costos causados por algún daño o accidente ocurrido durante o posterior al evento.",
          "Certificamos que nuestro club, jugadoras/es, entrenador y asistente (si aplica) están afiliados de manera vigente a la Federación Puertorriqueña de Voleibol. Entendemos que de no estarlo nuestra participación en el evento se podría ver afectada sin derecho a devolución de dinero.",
          "Acepto el equipo incluyendo nuestros padres son responsables de cumplir con el reglamento, esto incluye reglas de juego, el no utilizar artefactos como cornetas y utilización formal de uniforme.",
        ].map((text, i) => (
          <label key={`club-term-${i}`} className="flex cursor-pointer items-start gap-3 text-sm text-zinc-700 dark:text-zinc-300">
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

      <section className="space-y-3">
        <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
          Firma <span className="text-red-500">*</span>
        </p>
        <SignaturePad onChange={setSignatureDataUrl} />
      </section>

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
          Continuar: correo y guardar
        </button>
      </div>
    </form>
  );
}
