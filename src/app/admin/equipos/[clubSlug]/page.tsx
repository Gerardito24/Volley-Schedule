"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { readStoredRegistrations, LOCAL_REGISTRATIONS_KEY } from "@/lib/local-registrations";
import { readStoredRosters, upsertStoredRoster, LOCAL_ROSTERS_KEY } from "@/lib/local-team-rosters";
import type { TeamRoster } from "@/lib/team-roster-types";
import {
  getClubProfile,
  upsertClubProfile,
  LOCAL_CLUB_PROFILES_KEY,
} from "@/lib/local-club-profiles";
import type { ClubProfile } from "@/lib/club-profile-types";
import { mergeAdminRegistrations } from "@/lib/merge-registrations";
import { registrationRows as seedRows } from "@/lib/mock-data";
import { slugify } from "@/lib/slugify";

// ----- shared data helpers -------------------------------------------------

function loadRostersForSlug(clubSlug: string): {
  rosters: TeamRoster[];
  defaultName: string;
} {
  const allRegs = mergeAdminRegistrations(seedRows, readStoredRegistrations());
  const allRosters = readStoredRosters();

  const clubRegs = allRegs.filter(
    (r) => slugify(r.clubName || r.teamName) === clubSlug,
  );
  const defaultName = clubRegs[0]?.clubName ?? clubRegs[0]?.teamName ?? clubSlug;

  const result: TeamRoster[] = [];
  for (const reg of clubRegs) {
    const existing = allRosters.find((r) => r.registrationId === reg.id);
    if (existing) {
      result.push({ ...existing, coachName: existing.coachName ?? "", coachPhone: existing.coachPhone ?? "" });
    } else {
      result.push({
        id: `placeholder-${reg.id}`,
        registrationId: reg.id,
        clubName: reg.clubName || reg.teamName,
        teamName: reg.teamName,
        tournamentSlug: reg.tournamentSlug,
        tournamentName: reg.tournamentName,
        categoryId: reg.categoryId,
        divisionLabel: reg.divisionLabel,
        coachName: "",
        coachPhone: "",
        players: [],
        createdAt: reg.registeredAt,
        updatedAt: reg.registeredAt,
      });
    }
  }

  for (const r of allRosters) {
    if (
      slugify(r.clubName) === clubSlug &&
      !result.find((x) => x.registrationId === r.registrationId)
    ) {
      result.push({ ...r, coachName: r.coachName ?? "", coachPhone: r.coachPhone ?? "" });
    }
  }

  return {
    defaultName,
    rosters: result.sort((a, b) =>
      a.divisionLabel.localeCompare(b.divisionLabel, "es"),
    ),
  };
}

// ----- contact draft row type -----------------------------------------------

type ContactDraft = { coachName: string; coachPhone: string };

// ----- main inner component -------------------------------------------------

function ClubDetailInner() {
  const params = useParams();
  const rawSlug = params.clubSlug;
  const clubSlug =
    typeof rawSlug === "string"
      ? decodeURIComponent(rawSlug)
      : Array.isArray(rawSlug)
        ? decodeURIComponent(rawSlug[0] ?? "")
        : "";

  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const bump = () => setRevision((x) => x + 1);
    window.addEventListener("volleyschedule-registrations-changed", bump);
    window.addEventListener("volleyschedule-rosters-changed", bump);
    window.addEventListener("volleyschedule-club-profiles-changed", bump);
    const onStorage = (e: StorageEvent) => {
      if (
        e.key === LOCAL_REGISTRATIONS_KEY ||
        e.key === LOCAL_ROSTERS_KEY ||
        e.key === LOCAL_CLUB_PROFILES_KEY
      )
        bump();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("volleyschedule-registrations-changed", bump);
      window.removeEventListener("volleyschedule-rosters-changed", bump);
      window.removeEventListener("volleyschedule-club-profiles-changed", bump);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const { defaultName, rosters } = useMemo(
    () => loadRostersForSlug(clubSlug),
    [clubSlug, revision],
  );

  // ---------- club profile form state ---------------------------------------

  const [profileDraft, setProfileDraft] = useState<Omit<ClubProfile, "clubSlug" | "updatedAt">>({
    displayName: "",
    pueblo: "",
    clubPhone: "",
    contactName: "",
    contactEmail: "",
  });
  const [profileSaved, setProfileSaved] = useState(false);

  useEffect(() => {
    const stored = getClubProfile(clubSlug);
    setProfileDraft({
      displayName: stored?.displayName || defaultName,
      pueblo: stored?.pueblo || "",
      clubPhone: stored?.clubPhone || "",
      contactName: stored?.contactName || "",
      contactEmail: stored?.contactEmail || "",
    });
  }, [clubSlug, defaultName]);

  const handleSaveProfile = useCallback(() => {
    upsertClubProfile({
      clubSlug,
      displayName: profileDraft.displayName || defaultName,
      pueblo: profileDraft.pueblo,
      clubPhone: profileDraft.clubPhone,
      contactName: profileDraft.contactName,
      contactEmail: profileDraft.contactEmail,
      updatedAt: new Date().toISOString(),
    });
    setProfileSaved(true);
    window.setTimeout(() => setProfileSaved(false), 1800);
  }, [clubSlug, profileDraft, defaultName]);

  // ---------- team contacts table draft state --------------------------------

  const [contactDrafts, setContactDrafts] = useState<Record<string, ContactDraft>>({});
  const [contactSaved, setContactSaved] = useState(false);

  useEffect(() => {
    const map: Record<string, ContactDraft> = {};
    for (const r of rosters) {
      map[r.registrationId] = {
        coachName: r.coachName,
        coachPhone: r.coachPhone,
      };
    }
    setContactDrafts(map);
  }, [rosters]);

  const setContact = useCallback(
    (registrationId: string, field: keyof ContactDraft, value: string) => {
      setContactDrafts((prev) => ({
        ...prev,
        [registrationId]: { ...prev[registrationId], [field]: value },
      }));
    },
    [],
  );

  const handleSaveContacts = useCallback(() => {
    for (const roster of rosters) {
      const draft = contactDrafts[roster.registrationId];
      if (!draft) continue;
      const isPlaceholder = roster.id.startsWith("placeholder-");
      upsertStoredRoster({
        ...roster,
        id: isPlaceholder ? `roster-${crypto.randomUUID()}` : roster.id,
        coachName: draft.coachName,
        coachPhone: draft.coachPhone,
        updatedAt: new Date().toISOString(),
      });
    }
    setContactSaved(true);
    window.setTimeout(() => setContactSaved(false), 1800);
  }, [rosters, contactDrafts]);

  // ---------- empty state ---------------------------------------------------

  if (rosters.length === 0) {
    return (
      <main className="flex flex-1 flex-col gap-4">
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          Club no encontrado
        </h2>
        <Link
          href="/admin/equipos"
          className="text-sm font-medium text-emerald-700 hover:underline dark:text-emerald-400"
        >
          ← Volver a equipos
        </Link>
      </main>
    );
  }

  const displayTitle = profileDraft.displayName || defaultName;

  return (
    <main className="flex flex-1 flex-col gap-8">
      {/* breadcrumb */}
      <nav className="flex flex-wrap items-center gap-2 text-sm">
        <Link href="/admin/equipos" className="font-medium text-emerald-700 hover:underline dark:text-emerald-400">
          ← Equipos
        </Link>
        <span className="text-zinc-400">/</span>
        <span className="text-zinc-500">{displayTitle}</span>
      </nav>

      {/* ── Club profile card ─────────────────────────────────────────── */}
      <section className="rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="border-b border-zinc-100 px-6 py-4 dark:border-zinc-800">
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
            Datos del club
          </h1>
          <p className="mt-0.5 text-xs text-zinc-500">
            Información de contacto del club. El slug de URL no cambia al editar el nombre.
          </p>
        </div>

        <div className="grid gap-4 p-6 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="font-medium text-zinc-700 dark:text-zinc-300">Nombre del club</span>
            <input
              value={profileDraft.displayName}
              onChange={(e) => setProfileDraft((d) => ({ ...d, displayName: e.target.value }))}
              placeholder={defaultName}
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
            />
          </label>

          <label className="block text-sm">
            <span className="font-medium text-zinc-700 dark:text-zinc-300">Pueblo / ciudad</span>
            <input
              value={profileDraft.pueblo}
              onChange={(e) => setProfileDraft((d) => ({ ...d, pueblo: e.target.value }))}
              placeholder="Ej. Bayamón"
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
            />
          </label>

          <label className="block text-sm">
            <span className="font-medium text-zinc-700 dark:text-zinc-300">Teléfono del club</span>
            <input
              value={profileDraft.clubPhone}
              onChange={(e) => setProfileDraft((d) => ({ ...d, clubPhone: e.target.value }))}
              placeholder="787-000-0000"
              inputMode="tel"
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
            />
          </label>

          <label className="block text-sm">
            <span className="font-medium text-zinc-700 dark:text-zinc-300">Dueño / persona encargada</span>
            <input
              value={profileDraft.contactName}
              onChange={(e) => setProfileDraft((d) => ({ ...d, contactName: e.target.value }))}
              placeholder="Nombre completo"
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
            />
          </label>

          <label className="block text-sm sm:col-span-2">
            <span className="font-medium text-zinc-700 dark:text-zinc-300">Email</span>
            <input
              value={profileDraft.contactEmail}
              onChange={(e) => setProfileDraft((d) => ({ ...d, contactEmail: e.target.value }))}
              placeholder="contacto@club.com"
              type="email"
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
            />
          </label>
        </div>

        <div className="flex items-center gap-3 border-t border-zinc-100 px-6 py-4 dark:border-zinc-800">
          <button
            type="button"
            onClick={handleSaveProfile}
            className="rounded-full bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            Guardar datos del club
          </button>
          {profileSaved ? (
            <span className="text-sm text-emerald-600 dark:text-emerald-400">Guardado.</span>
          ) : null}
        </div>
      </section>

      {/* ── Teams table ──────────────────────────────────────────────── */}
      <section>
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Equipos ({rosters.length})
          </h2>
          <p className="text-xs text-zinc-500">
            Editá coach y teléfono aquí. Para ver o editar el roster de jugadores, abrí la página del equipo.
          </p>
        </div>

        <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
          <table className="min-w-full text-sm">
            <thead className="bg-zinc-50 dark:bg-zinc-900/50">
              <tr>
                <th className="px-5 py-3 text-left font-medium text-zinc-700 dark:text-zinc-300">
                  Equipo / Categoría
                </th>
                <th className="px-5 py-3 text-left font-medium text-zinc-700 dark:text-zinc-300">
                  Coach
                </th>
                <th className="px-5 py-3 text-left font-medium text-zinc-700 dark:text-zinc-300">
                  Teléfono
                </th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 bg-white dark:divide-zinc-800 dark:bg-zinc-950">
              {rosters.map((r) => {
                const draft = contactDrafts[r.registrationId] ?? {
                  coachName: r.coachName,
                  coachPhone: r.coachPhone,
                };
                return (
                  <tr key={r.id} className="hover:bg-zinc-50/60 dark:hover:bg-zinc-900/30">
                    <td className="px-5 py-3">
                      <p className="font-medium text-zinc-900 dark:text-zinc-100">
                        {r.teamName}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {r.divisionLabel}
                        {r.tournamentName ? ` · ${r.tournamentName}` : ""}
                      </p>
                    </td>
                    <td className="px-5 py-3">
                      <input
                        value={draft.coachName}
                        onChange={(e) =>
                          setContact(r.registrationId, "coachName", e.target.value)
                        }
                        placeholder="Nombre del coach"
                        className="w-full min-w-[9rem] rounded border border-zinc-200 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                      />
                    </td>
                    <td className="px-5 py-3">
                      <input
                        value={draft.coachPhone}
                        onChange={(e) =>
                          setContact(r.registrationId, "coachPhone", e.target.value)
                        }
                        placeholder="787-000-0000"
                        inputMode="tel"
                        className="w-36 rounded border border-zinc-200 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                      />
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-right">
                      <Link
                        href={`/admin/equipos/${encodeURIComponent(clubSlug)}/roster/${encodeURIComponent(r.registrationId)}`}
                        className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-900 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
                      >
                        Ver roster →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-3 flex items-center gap-3">
          <button
            type="button"
            onClick={handleSaveContacts}
            className="rounded-full bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            Guardar contactos
          </button>
          {contactSaved ? (
            <span className="text-sm text-emerald-600 dark:text-emerald-400">Guardado.</span>
          ) : null}
        </div>
      </section>
    </main>
  );
}

export default function ClubDetailPage() {
  return (
    <Suspense
      fallback={
        <main className="flex flex-1 flex-col gap-4">
          <p className="text-sm text-zinc-500">Cargando…</p>
        </main>
      }
    >
      <ClubDetailInner />
    </Suspense>
  );
}
