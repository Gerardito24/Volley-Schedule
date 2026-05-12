import type { ClubProfile } from "@/lib/club-profile-types";

export const LOCAL_CLUB_PROFILES_KEY = "volleyschedule-club-profiles-v1";

function notify(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("volleyschedule-club-profiles-changed"));
}

export function readClubProfiles(): ClubProfile[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LOCAL_CLUB_PROFILES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isClubProfile) as ClubProfile[];
  } catch {
    return [];
  }
}

export function getClubProfile(clubSlug: string): ClubProfile | null {
  return readClubProfiles().find((p) => p.clubSlug === clubSlug) ?? null;
}

export function upsertClubProfile(profile: ClubProfile): void {
  const existing = readClubProfiles();
  const idx = existing.findIndex((p) => p.clubSlug === profile.clubSlug);
  const next = [...existing];
  if (idx >= 0) next[idx] = profile;
  else next.push(profile);
  window.localStorage.setItem(LOCAL_CLUB_PROFILES_KEY, JSON.stringify(next));
  notify();
}

function isClubProfile(v: unknown): boolean {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.clubSlug === "string" &&
    typeof o.displayName === "string" &&
    typeof o.pueblo === "string" &&
    typeof o.clubPhone === "string" &&
    typeof o.contactName === "string" &&
    typeof o.contactEmail === "string" &&
    typeof o.updatedAt === "string"
  );
}
