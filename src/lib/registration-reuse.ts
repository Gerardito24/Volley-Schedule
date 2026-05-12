import {
  CLUB_REGISTRY_SLUG,
  type RegistrationRowMock,
  type PlayerEntry,
  type CoachEntry,
} from "@/lib/mock-data";
import type { ClubProfile } from "@/lib/club-profile-types";

/** Unified club row for the reuse panel (profiles + past registrations). */
export type MergedTeam = {
  clubName: string;
  pueblo: string;
  coachName: string;
  ageLabel: string;
  sourceProfile?: ClubProfile;
  sourceRegistration?: RegistrationRowMock;
};

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

function normClub(s: string): string {
  return s.trim().toLowerCase();
}

/** Extracts the first age token like `14U` / `16U` from a division label. */
export function extractAgeLabel(divisionLabel: string): string {
  const m = divisionLabel.match(/\b\d+[Uu]\b/);
  return m ? m[0].toUpperCase() : "";
}

export function mergedTeamRecencyMs(t: MergedTeam): number {
  const iso =
    t.sourceRegistration?.registeredAt ?? t.sourceProfile?.updatedAt ?? "";
  const d = Date.parse(iso);
  return Number.isFinite(d) ? d : 0;
}

/**
 * Builds reuse rows: one `MergedTeam` per past registration (other tournaments), with
 * `pueblo` / `sourceProfile` from a matching club profile when `normClub(clubName)` matches.
 * Profiles with no past registration for that club become a single profile-only row.
 */
export function buildMergedTeamList(
  registrations: RegistrationRowMock[],
  profiles: ClubProfile[],
  currentTournamentSlug: string,
): MergedTeam[] {
  const profileByClub = new Map<string, ClubProfile>();
  for (const p of profiles) {
    const key = normClub(p.displayName);
    if (!key || profileByClub.has(key)) continue;
    profileByClub.set(key, p);
  }

  const regs = registrations
    .filter((r) => r.tournamentSlug !== currentTournamentSlug)
    .filter((r) => r.tournamentSlug !== CLUB_REGISTRY_SLUG)
    .sort((a, b) => b.registeredAt.localeCompare(a.registeredAt));

  const clubsWithRegistration = new Set<string>();
  const rows: MergedTeam[] = [];

  for (const r of regs) {
    const key = normClub(r.clubName);
    if (!key) continue;
    clubsWithRegistration.add(key);
    const prof = profileByClub.get(key);
    const pueblo = (prof?.pueblo ?? "").trim();
    const coachN = r.coach?.name?.trim() ?? "";
    const age = extractAgeLabel(r.divisionLabel);
    rows.push({
      clubName: r.clubName.trim(),
      pueblo,
      coachName: coachN,
      ageLabel: age,
      sourceProfile: prof,
      sourceRegistration: r,
    });
  }

  for (const p of profileByClub.values()) {
    const key = normClub(p.displayName);
    if (!key || clubsWithRegistration.has(key)) continue;
    rows.push({
      clubName: p.displayName.trim(),
      pueblo: (p.pueblo ?? "").trim(),
      coachName: "",
      ageLabel: "",
      sourceProfile: p,
      sourceRegistration: undefined,
    });
  }

  rows.sort((a, b) => {
    const aHas = a.pueblo.length > 0;
    const bHas = b.pueblo.length > 0;
    if (aHas !== bHas) return aHas ? -1 : 1;
    if (aHas && bHas) {
      const pc = a.pueblo.localeCompare(b.pueblo, "es", { sensitivity: "base" });
      if (pc !== 0) return pc;
    }
    const cc = a.clubName.localeCompare(b.clubName, "es", { sensitivity: "base" });
    if (cc !== 0) return cc;
    return mergedTeamRecencyMs(b) - mergedTeamRecencyMs(a);
  });
  return rows;
}

/** Distinct non-empty pueblo values from merged teams, sorted. */
export function distinctPueblosFromTeams(teams: MergedTeam[]): string[] {
  const set = new Set<string>();
  for (const t of teams) {
    const p = t.pueblo.trim();
    if (p) set.add(p);
  }
  return [...set].sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));
}

/**
 * Applies pueblo + optional club/edad/coach filters.
 * When no pueblo is selected, sorts by recency and limits to 5 unless `showAllWhenNoPueblo`.
 */
export function filterMergedTeamsForDisplay(
  teams: MergedTeam[],
  puebloSelected: string,
  filterClub: string,
  filterEdad: string,
  filterCoach: string,
  showAllWhenNoPueblo: boolean,
): MergedTeam[] {
  let out = [...teams];
  const ps = puebloSelected.trim().toLowerCase();
  if (ps) {
    out = out.filter((t) => t.pueblo.trim().toLowerCase() === ps);
  }

  const fc = filterClub.trim().toLowerCase();
  const fe = filterEdad.trim().toLowerCase();
  const fco = filterCoach.trim().toLowerCase();
  if (fc) out = out.filter((t) => t.clubName.toLowerCase().includes(fc));
  if (fe) out = out.filter((t) => t.ageLabel.toLowerCase().includes(fe));
  if (fco) out = out.filter((t) => t.coachName.toLowerCase().includes(fco));

  if (!puebloSelected.trim()) {
    out.sort((a, b) => mergedTeamRecencyMs(b) - mergedTeamRecencyMs(a));
    if (!showAllWhenNoPueblo) {
      out = out.slice(0, 5);
    }
  }
  return out;
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
    .filter((r) => r.tournamentSlug !== CLUB_REGISTRY_SLUG)
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
