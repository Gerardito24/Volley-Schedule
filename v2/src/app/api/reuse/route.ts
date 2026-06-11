import { NextResponse } from "next/server";
import { getClubs, getRegistrations, getTournaments } from "@/lib/store";
import { getSessionClient } from "@/lib/client-auth";

export interface ReuseEntry {
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
    coach: unknown;
    assistant: unknown;
    players: { name: string; jerseyNumber: string; birthDate: string; affiliationNumber?: string }[];
  } | null;
}

export async function GET(request: Request) {
  // Solo clientes autenticados pueden ver sus datos anteriores
  const client = await getSessionClient();
  if (!client) {
    return NextResponse.json({ entries: [], requiresLogin: true });
  }

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim().toLowerCase();
  const exclude = searchParams.get("exclude") ?? "";

  const [clubs, registrations, tournaments] = await Promise.all([
    getClubs(),
    getRegistrations(),
    getTournaments(),
  ]);
  const tournamentNames = new Map(tournaments.map((t) => [t.slug, t.name]));

  // Solo inscripciones de este cliente
  const clientRegs = registrations.filter(
    (r) => r.clientId === client.id && r.tournamentSlug !== exclude,
  );

  // Clubes que este cliente ha inscrito
  const clientClubSlugs = new Set(clientRegs.map((r) => r.clubSlug));
  const clientClubs = clubs.filter((c) => clientClubSlugs.has(c.clubSlug));

  const entries: ReuseEntry[] = clientClubs.map((club) => {
    const past = clientRegs
      .filter((r) => r.clubSlug === club.clubSlug)
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

  return NextResponse.json({ entries: filtered, requiresLogin: false });
}
