const KEY = "volleyschedule-active-tournaments-done-v1";

export const ACTIVE_TOURNAMENTS_DONE_EVENT = "volleyschedule-active-tournaments-done-changed";

function readRaw(): Record<string, true> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return {};
    const o = JSON.parse(raw) as unknown;
    if (!o || typeof o !== "object") return {};
    const out: Record<string, true> = {};
    for (const [k, v] of Object.entries(o as Record<string, unknown>)) {
      if (v === true && typeof k === "string" && k.length > 0) out[k] = true;
    }
    return out;
  } catch {
    return {};
  }
}

export function isActiveTournamentMarkedDone(slug: string): boolean {
  return !!readRaw()[slug];
}

export function markActiveTournamentDone(slug: string): void {
  if (typeof window === "undefined") return;
  const next = { ...readRaw(), [slug]: true as const };
  window.localStorage.setItem(KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent(ACTIVE_TOURNAMENTS_DONE_EVENT));
}
