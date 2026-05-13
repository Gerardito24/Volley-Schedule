/**
 * Torneo "activo" en lista: desde el día calendario anterior a `tournamentStartsOn` (fecha `YYYY-MM-DD`).
 */
export function isInActiveTournamentWindow(tournamentStartsOn: string): boolean {
  const t = tournamentStartsOn.trim();
  const parts = t.split("-").map((x) => Number(x));
  if (parts.length < 3 || parts.some((n) => !Number.isFinite(n))) return false;
  const [y, mo, d] = parts as [number, number, number];
  const start = new Date(y, mo - 1, d);
  const threshold = new Date(start);
  threshold.setDate(threshold.getDate() - 1);
  threshold.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today.getTime() >= threshold.getTime();
}
