import type { ClubProfile } from "@/lib/club-profile-types";
import { fetchAdminJson, isRemoteDbEnabled } from "@/lib/remote-data";

type ProfilesResponse = { ok: boolean; profiles: ClubProfile[] };
type ProfileResponse = { ok: boolean; profile: ClubProfile };

export async function readRemoteClubProfiles(): Promise<ClubProfile[] | null> {
  if (!(await isRemoteDbEnabled())) return null;
  const data = await fetchAdminJson<ProfilesResponse>("/api/admin/club-profiles", {
    cache: "no-store",
  });
  return data.profiles;
}

export async function upsertRemoteClubProfile(
  profile: ClubProfile,
): Promise<ClubProfile | null> {
  if (!(await isRemoteDbEnabled())) return null;
  const data = await fetchAdminJson<ProfileResponse>("/api/admin/club-profiles", {
    method: "POST",
    body: JSON.stringify(profile),
  });
  return data.profile;
}
