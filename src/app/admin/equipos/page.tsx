"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { readStoredRegistrations } from "@/lib/local-registrations";
import { readStoredRosters, LOCAL_ROSTERS_KEY } from "@/lib/local-team-rosters";
import { readClubProfiles, LOCAL_CLUB_PROFILES_KEY } from "@/lib/local-club-profiles";
import { mergeAdminRegistrations } from "@/lib/merge-registrations";
import { registrationRows as seedRows } from "@/lib/mock-data";
import { slugify } from "@/lib/slugify";
import { LOCAL_REGISTRATIONS_KEY } from "@/lib/local-registrations";

type ClubSummary = {
  clubName: string;
  clubSlug: string;
  teamCount: number;
  registrationIds: string[];
  pueblo: string;
  owner: string;
};

function buildClubSummaries(): ClubSummary[] {
  const regs = mergeAdminRegistrations(seedRows, readStoredRegistrations());
  const rosters = readStoredRosters();
  const profiles = readClubProfiles();

  const map = new Map<string, ClubSummary>();

  const add = (clubName: string, registrationId: string) => {
    const slug = slugify(clubName);
    const key = slug;
    if (!map.has(key)) {
      const profile = profiles.find((p) => p.clubSlug === slug);
      map.set(key, {
        clubName: profile?.displayName || clubName,
        clubSlug: slug,
        teamCount: 0,
        registrationIds: [],
        pueblo: profile?.pueblo ?? "",
        owner: profile?.contactName ?? "",
      });
    }
    const entry = map.get(key)!;
    if (!entry.registrationIds.includes(registrationId)) {
      entry.registrationIds.push(registrationId);
      entry.teamCount += 1;
    }
  };

  for (const r of regs) {
    add(r.clubName || r.teamName, r.id);
  }

  // rosters without a matching registration (orphan)
  for (const roster of rosters) {
    if (!regs.find((r) => r.id === roster.registrationId)) {
      add(roster.clubName, roster.id);
    }
  }

  return [...map.values()]
    .map((c) => {
      const prof = profiles.find((p) => p.clubSlug === c.clubSlug);
      return {
        ...c,
        clubName: prof?.displayName?.trim() || c.clubName,
        pueblo: prof?.pueblo ?? "",
        owner: prof?.contactName ?? "",
      };
    })
    .sort((a, b) => a.clubName.localeCompare(b.clubName, "es"));
}

export default function AdminEquiposPage() {
  const router = useRouter();
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

  const clubs = useMemo(() => buildClubSummaries(), [revision]);

  return (
    <main className="flex flex-1 flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Equipos
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Clubes organizados por inscripciones. Al registrar un equipo se crea
          automáticamente un roster por categoría.
        </p>
      </div>

      {clubs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-6 py-12 text-center dark:border-zinc-700 dark:bg-zinc-900/40">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Todavía no hay clubes. Cuando un equipo se inscriba en un torneo
            aparecerá aquí.
          </p>
          <Link
            href="/tournaments"
            className="mt-4 inline-block text-sm font-medium text-emerald-700 hover:underline dark:text-emerald-400"
          >
            Ver torneos →
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
          <table className="min-w-full divide-y divide-zinc-200 text-sm dark:divide-zinc-800">
            <thead className="bg-zinc-50 dark:bg-zinc-900/50">
              <tr>
                <th className="px-5 py-3 text-left font-medium text-zinc-700 dark:text-zinc-300">
                  Club
                </th>
                <th className="px-5 py-3 text-left font-medium text-zinc-700 dark:text-zinc-300">
                  Pueblo
                </th>
                <th className="px-5 py-3 text-left font-medium text-zinc-700 dark:text-zinc-300">
                  Dueño
                </th>
                <th className="px-5 py-3 text-left font-medium text-zinc-700 dark:text-zinc-300">
                  Equipos / inscripciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 bg-white dark:divide-zinc-800 dark:bg-zinc-950">
              {clubs.map((c) => (
                <tr
                  key={c.clubSlug}
                  onClick={() => router.push(`/admin/equipos/${encodeURIComponent(c.clubSlug)}`)}
                  className="cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
                >
                  <td className="px-5 py-4 font-medium text-zinc-900 dark:text-zinc-100">
                    {c.clubName}
                  </td>
                  <td className="px-5 py-4 text-zinc-600 dark:text-zinc-400">
                    {c.pueblo || ""}
                  </td>
                  <td className="px-5 py-4 text-zinc-600 dark:text-zinc-400">
                    {c.owner || ""}
                  </td>
                  <td className="px-5 py-4 text-zinc-600 dark:text-zinc-400">
                    {c.teamCount} {c.teamCount === 1 ? "equipo" : "equipos"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
