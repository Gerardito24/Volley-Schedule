import type { CategorySchedule, Match, Tournament } from "@/lib/types";
import { categoryLabel, formatSetScores } from "@/lib/types";
import {
  categoryChampion,
  computePoolStandings,
  playableMatches,
  resolveSide,
} from "@/lib/schedule-engine";

function timeLabel(iso?: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("es-PR", { hour: "numeric", minute: "2-digit" });
}

function teamName(cs: CategorySchedule, seed: number): string {
  return cs.teams.find((t) => t.seed === seed)?.label ?? `Equipo ${seed + 1}`;
}

function MatchRow({ cs, match }: { cs: CategorySchedule; match: Match }) {
  const home = resolveSide(cs, match.home);
  const away = resolveSide(cs, match.away);
  const result = match.result ?? null;
  const homeWins = result != null && result.home > result.away;
  const awayWins = result != null && result.away > result.home;

  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 sm:flex-nowrap">
      <div className="flex w-32 shrink-0 flex-col text-xs text-zinc-500">
        <span className="font-semibold text-zinc-300">{timeLabel(match.startsAt)}</span>
        <span>{match.court ?? "Cancha por definir"}</span>
      </div>
      <div className="min-w-0 flex-1 text-sm">
        <span
          className={
            homeWins
              ? "font-bold text-zinc-100"
              : home.decided
                ? "text-zinc-200"
                : "italic text-zinc-500"
          }
        >
          {home.label}
        </span>
        <span className="mx-2 text-zinc-600">vs</span>
        <span
          className={
            awayWins
              ? "font-bold text-zinc-100"
              : away.decided
                ? "text-zinc-200"
                : "italic text-zinc-500"
          }
        >
          {away.label}
        </span>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-0.5">
        {result ? (
          <>
            <span className="rounded-lg bg-zinc-800 px-2.5 py-1 text-sm font-bold tabular-nums text-zinc-100">
              <span className={homeWins ? "text-amber-400" : undefined}>{result.home}</span>
              <span className="mx-1 text-zinc-500">–</span>
              <span className={awayWins ? "text-amber-400" : undefined}>{result.away}</span>
            </span>
            {formatSetScores(result) ? (
              <span className="text-[11px] tabular-nums text-zinc-500">
                {formatSetScores(result)}
              </span>
            ) : null}
          </>
        ) : (
          <span className="rounded-full border border-zinc-700 px-2.5 py-1 text-xs font-medium text-zinc-400">
            Por jugar
          </span>
        )}
      </div>
    </li>
  );
}

function PoolStandings({ cs }: { cs: CategorySchedule }) {
  if (cs.pools.length === 0) return null;
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {cs.pools.map((pool) => {
        const { standings } = computePoolStandings(cs, pool.id);
        return (
          <div key={pool.id} className="overflow-x-auto thin-scroll rounded-xl border border-zinc-800">
            <table className="w-full min-w-[280px] text-sm">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900/60 text-left text-xs uppercase tracking-wider text-zinc-500">
                  <th className="px-3 py-2 font-semibold">{pool.label}</th>
                  <th className="w-10 px-2 py-2 text-center font-semibold">G</th>
                  <th className="w-10 px-2 py-2 text-center font-semibold">P</th>
                  <th className="w-12 px-2 py-2 text-center font-semibold">Dif</th>
                </tr>
              </thead>
              <tbody>
                {standings.map((s) => (
                  <tr key={s.seed} className="border-b border-zinc-800/60 last:border-0">
                    <td className="px-3 py-2 text-zinc-200">{teamName(cs, s.seed)}</td>
                    <td className="px-2 py-2 text-center tabular-nums text-zinc-300">{s.wins}</td>
                    <td className="px-2 py-2 text-center tabular-nums text-zinc-300">{s.losses}</td>
                    <td className="px-2 py-2 text-center tabular-nums text-zinc-400">
                      {s.pointDiff > 0 ? `+${s.pointDiff}` : s.pointDiff}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}

function CategoryBlock({ tournament, cs }: { tournament: Tournament; cs: CategorySchedule }) {
  const category = tournament.categories.find((c) => c.id === cs.categoryId);
  const label = category ? categoryLabel(tournament, category) : cs.categoryId;
  const champion = categoryChampion(cs);

  const matches = playableMatches(cs);
  // Agrupar por fase preservando el orden de primera aparición (los partidos de
  // pools vienen intercalados entre pools por el orden global).
  const groups = new Map<string, Match[]>();
  for (const m of matches) {
    const arr = groups.get(m.phaseLabel);
    if (arr) arr.push(m);
    else groups.set(m.phaseLabel, [m]);
  }
  const phases = [...groups.entries()].map(([label, ms]) => ({ label, matches: ms }));

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <h3 className="text-xl font-bold tracking-tight text-zinc-100">{label}</h3>
        {champion && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/15 px-3 py-1 text-sm font-semibold text-amber-400">
            <svg viewBox="0 0 20 20" className="h-4 w-4 fill-amber-400" aria-hidden="true">
              <path d="M3 3h14v2a4 4 0 0 1-3.2 3.92A4.5 4.5 0 0 1 11 11.97V14h3v2H6v-2h3v-2.03A4.5 4.5 0 0 1 6.2 8.92 4 4 0 0 1 3 5V3Z" />
            </svg>
            Campeón: {champion}
          </span>
        )}
      </div>

      <PoolStandings cs={cs} />

      {phases.map((phase) => (
        <div key={phase.label} className="rounded-2xl border border-zinc-800 bg-zinc-900">
          <h4 className="border-b border-zinc-800 px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-zinc-400">
            {phase.label}
          </h4>
          <ul className="divide-y divide-zinc-800/60">
            {phase.matches.map((m) => (
              <MatchRow key={m.id} cs={cs} match={m} />
            ))}
          </ul>
        </div>
      ))}

      {matches.length === 0 && (
        <p className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 text-sm text-zinc-400">
          Esta categoría aún no tiene partidos programados.
        </p>
      )}
    </section>
  );
}

export default function ScheduleView({
  tournament,
  categories,
}: {
  tournament: Tournament;
  categories: CategorySchedule[];
}) {
  return (
    <div className="space-y-10">
      {categories.map((cs) => (
        <CategoryBlock key={cs.categoryId} tournament={tournament} cs={cs} />
      ))}
    </div>
  );
}
