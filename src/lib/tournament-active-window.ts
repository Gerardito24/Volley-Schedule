import type { TournamentMock } from "@/lib/mock-data";

/**
 * Returns the local YYYY-MM-DD string for a Date, without timezone conversion.
 * This matches how tournament dates are stored (plain calendar dates).
 */
export function localDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Returns the YYYY-MM-DD string for one calendar day before the given date string.
 */
export function dayBefore(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() - 1);
  return localDateString(dt);
}

/**
 * True when `today` falls in the highlight window:
 *   day before tournamentStartsOn  ≤  today  ≤  tournamentEndsOn
 *
 * Date strings are YYYY-MM-DD (lexicographic compare works correctly).
 */
export function isTournamentInLiveHighlightWindow(
  t: TournamentMock,
  today: string,
): boolean {
  const windowStart = dayBefore(t.tournamentStartsOn);
  return today >= windowStart && today <= t.tournamentEndsOn;
}

/**
 * Among a list of tournaments, returns those that are in the live window AND
 * have a published schedule with at least one category that has match rows.
 */
export function getActiveLiveTournaments(
  tournaments: TournamentMock[],
  today: string,
): TournamentMock[] {
  return tournaments
    .filter((t) => {
      if (!isTournamentInLiveHighlightWindow(t, today)) return false;
      const sched = t.schedule;
      if (!sched?.published) return false;
      return sched.categorySchedules.some((cs) =>
        cs.phases.some((ph) => ph.matches.length > 0),
      );
    })
    .sort((a, b) => a.tournamentStartsOn.localeCompare(b.tournamentStartsOn));
}
