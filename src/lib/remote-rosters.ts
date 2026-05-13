import type { TeamRoster } from "@/lib/team-roster-types";
import { fetchAdminJson, isRemoteDbEnabled } from "@/lib/remote-data";

type RostersResponse = { ok: boolean; rosters: TeamRoster[] };
type RosterResponse = { ok: boolean; roster: TeamRoster };

export async function readRemoteRosters(): Promise<TeamRoster[] | null> {
  if (!(await isRemoteDbEnabled())) return null;
  const data = await fetchAdminJson<RostersResponse>("/api/admin/rosters", {
    cache: "no-store",
  });
  return data.rosters;
}

export async function upsertRemoteRoster(roster: TeamRoster): Promise<TeamRoster | null> {
  if (!(await isRemoteDbEnabled())) return null;
  const data = await fetchAdminJson<RosterResponse>("/api/admin/rosters", {
    method: "POST",
    body: JSON.stringify(roster),
  });
  return data.roster;
}
