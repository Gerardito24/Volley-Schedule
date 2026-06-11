"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { card, inputClass } from "./ui";

export interface ClubCard {
  clubSlug: string;
  displayName: string;
  pueblo: string;
  contactName: string;
  contactEmail: string;
  teamsCount: number;
  registrationsCount: number;
  categories: string[];
}

export default function ClubsGrid({ clubs }: { clubs: ClubCard[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return clubs;
    return clubs.filter(
      (c) =>
        c.displayName.toLowerCase().includes(q) ||
        c.pueblo.toLowerCase().includes(q) ||
        c.categories.some((cat) => cat.toLowerCase().includes(q)),
    );
  }, [clubs, query]);

  return (
    <div className="space-y-4">
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscar por nombre o pueblo…"
        className={`${inputClass} sm:max-w-xs`}
      />

      {filtered.length === 0 ? (
        <div className={`${card} p-10 text-center`}>
          <p className="font-medium text-zinc-900">No hay equipos que coincidan</p>
          <p className="mt-1 text-sm text-zinc-500">Intenta con otro nombre o pueblo.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => (
            <Link
              key={c.clubSlug}
              href={`/admin/equipos/${c.clubSlug}`}
              className={`${card} group p-5 transition-colors hover:border-indigo-300`}
            >
              <p className="font-medium text-zinc-900 group-hover:text-indigo-600">
                {c.displayName}
              </p>
              <p className="text-sm text-zinc-500">{c.pueblo}</p>
              <p className="mt-2 text-xs text-zinc-500">
                {c.contactName} · {c.contactEmail}
              </p>
              {c.categories.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {c.categories.slice(0, 4).map((cat) => (
                    <span
                      key={cat}
                      className="rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700"
                    >
                      {cat}
                    </span>
                  ))}
                  {c.categories.length > 4 && (
                    <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-500">
                      +{c.categories.length - 4}
                    </span>
                  )}
                </div>
              )}
              <p className="mt-3 text-xs text-zinc-500">
                <span className="font-medium text-zinc-900">{c.teamsCount}</span> equipos
                {" · "}
                <span className="font-medium text-zinc-900">{c.registrationsCount}</span>{" "}
                inscripciones
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
