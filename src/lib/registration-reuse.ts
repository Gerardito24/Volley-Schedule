import type { RegistrationRowMock, PlayerEntry, CoachEntry } from "@/lib/mock-data";
import type { ClubProfile } from "@/lib/club-profile-types";

/* ─── Types ─── */

/** The subset of form state that can be pre-filled from a previous source. */
export type RegistrationDraft = {
  teamName: string;
  clubName: string;
  clubAffiliationNumber: string;
  repName: string;
  repEmail: string;
  repPhone: string;
  coach: CoachEntry;
  hasAssistant: boolean;
  assistant: CoachEntry | null;
  players: PlayerEntry[];
  comments: string;
};

/** Partial draft when the source only has club-level data (ClubProfile). */
export type ClubProfileDraft = Pick<
  RegistrationDraft,
  "clubName" | "repName" | "repEmail" | "repPhone"
>;

/* ─── Helpers ─── */

function haystack(r: RegistrationRowMock): string {
  return [
    r.teamName,
    r.clubName,
    r.divisionLabel,
    r.tournamentName,
    r.coach?.name ?? "",
  ]
    .join(" ")
    .toLowerCase();
}

function haystackProfile(p: ClubProfile): string {
  return [p.displayName, p.contactName, p.contactEmail, p.pueblo, p.clubSlug]
    .join(" ")
    .toLowerCase();
}

function emptyCoach(): CoachEntry {
  return { name: "", affiliationNumber: "", nivel: "", phone: "", email: "", photoDataUrl: null };
}

/* ─── Public API ─── */

/**
 * Returns registrations from other tournaments, sorted newest-first,
 * optionally filtered by a free-text query.
 */
export function filterRegistrationsForReuse(
  rows: RegistrationRowMock[],
  currentTournamentSlug: string,
  query: string,
): RegistrationRowMock[] {
  const q = query.trim().toLowerCase();
  return rows
    .filter((r) => r.tournamentSlug !== currentTournamentSlug)
    .filter((r) => !q || haystack(r).includes(q))
    .sort((a, b) => b.registeredAt.localeCompare(a.registeredAt));
}

/**
 * Returns club profiles, sorted by displayName,
 * optionally filtered by a free-text query.
 */
export function filterClubProfilesForReuse(
  profiles: ClubProfile[],
  query: string,
): ClubProfile[] {
  const q = query.trim().toLowerCase();
  return profiles
    .filter((p) => !q || haystackProfile(p).includes(q))
    .sort((a, b) => a.displayName.localeCompare(b.displayName));
}

/**
 * Builds a full-form draft from a previous RegistrationRowMock.
 * Does NOT include category, fee, signature, or terms.
 */
export function applyRegistrationToFormDraft(row: RegistrationRowMock): RegistrationDraft {
  return {
    teamName: row.teamName ?? "",
    clubName: row.clubName ?? "",
    clubAffiliationNumber: row.clubAffiliationNumber ?? "",
    repName: row.representative?.name ?? "",
    repEmail: row.representative?.email ?? "",
    repPhone: row.representative?.phone ?? "",
    coach: row.coach
      ? { ...row.coach }
      : emptyCoach(),
    hasAssistant: row.hasAssistant ?? false,
    assistant: row.assistant ? { ...row.assistant } : null,
    players: (row.players ?? []).map((p) => ({ ...p, id: crypto.randomUUID() })),
    comments: row.comments ?? "",
  };
}

/**
 * Builds a partial draft from a ClubProfile (club name + representative only).
 * Does NOT touch coach, roster, or affiliation number.
 */
export function applyClubProfileToFormDraft(profile: ClubProfile): ClubProfileDraft {
  return {
    clubName: profile.displayName,
    repName: profile.contactName,
    repEmail: profile.contactEmail,
    repPhone: profile.clubPhone,
  };
}
