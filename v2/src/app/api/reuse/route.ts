import { NextResponse } from "next/server";
import { getClubs, getRegistrations, getTournaments } from "@/lib/store";

export interface ReuseEntry {
  clubSlug: string;
  clubName: string;
  pueblo: string;
  contactName: string;
  contactEmail: string;
  phone?: string;
  /** Última inscripción del club (la más reciente) con datos completos para precargar */
  lastRegistration: {
    id: string;
    tournamentName: string;
    teamName: string;
    coachName: string;
    representative: { name: string; email: string; phone: string };
    coach: unknown;
    assistant: unknown;
    players: { name: string; jerseyNumber: string; birthDate: string; affiliationNumber?: string }[];
  } | null;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim().toLowerCase();
  const exclude = searchParams.get("exclude") ?? "";

  const [clubs, registrations, tournaments] = await Promise.all([
    getClubs(),
    getRegistrations(),
    getTournaments(),
  ]);
  const tournamentNames = new Map(tournaments.map((t) => [t.slug, t.name]));

  const entries: ReuseEntry[] = clubs.map((club) => {
    const past = registrations
      .filter((r) => r.clubSlug === club.clubSlug && r.tournamentSlug !== exclude)
      .sort((a, b) => b.registeredAt.localeCompare(a.registeredAt));
    const last = past[0];
    return {
      clubSlug: club.clubSlug,
      clubName: club.displayName,
      pueblo: club.pueblo,
      contactName: club.contactName,
      contactEmail: club.contactEmail,
      phone: club.phone,
      lastRegistration: last
        ? {
            id: last.id,
            tournamentName: tournamentNames.get(last.tournamentSlug) ?? last.tournamentSlug,
            teamName: last.teamName,
            coachName: last.coach.name,
            representative: last.representative,
            coach: last.coach,
            assistant: last.assistant ?? null,
            players: last.players.map((p) => ({
              name: p.name,
              jerseyNumber: p.jerseyNumber,
              birthDate: p.birthDate,
              affiliationNumber: p.affiliationNumber,
            })),
          }
        : null,
    };
  });

  const filtered = q
    ? entries.filter((e) =>
        [e.clubName, e.pueblo, e.contactName, e.lastRegistration?.coachName ?? ""]
          .join(" ")
          .toLowerCase()
          .includes(q),
      )
    : entries;

  return NextResponse.json({ entries: filtered });
}
