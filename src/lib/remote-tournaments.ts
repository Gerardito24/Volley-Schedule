import type { TournamentMock } from "@/lib/mock-data";
import { fetchAdminJson, fetchJson, isRemoteDbEnabled } from "@/lib/remote-data";

type TournamentsResponse = { ok: boolean; tournaments: TournamentMock[] };
type TournamentResponse = { ok: boolean; tournament: TournamentMock };

export async function readRemoteTournaments(): Promise<TournamentMock[] | null> {
  if (!(await isRemoteDbEnabled())) return null;
  const data = await fetchJson<TournamentsResponse>("/api/public/tournaments", {
    cache: "no-store",
  });
  return data.tournaments;
}

export async function upsertRemoteTournament(
  tournament: TournamentMock,
): Promise<TournamentMock | null> {
  if (!(await isRemoteDbEnabled())) return null;
  const data = await fetchAdminJson<TournamentResponse>("/api/admin/tournaments", {
    method: "POST",
    body: JSON.stringify(tournament),
  });
  return data.tournament;
}
