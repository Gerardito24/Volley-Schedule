import { buildMatchOrderIndex, formatMatchSide } from "@/lib/schedule-display";
import type {
  CategoryScheduleMock,
  ScheduleAssignmentMock,
  ScheduleMatchMock,
} from "@/lib/schedule-types";

export type ScheduleMatchView = {
  categoryId: string;
  categoryLabel: string;
  phaseId: string;
  phaseTitle: string;
  phaseIdx: number;
  matchId: string;
  round: number;
  orderInRound: number;
  home: string;
  away: string;
  label: string;
  assignment: ScheduleAssignmentMock;
};

export function phaseTitleForTemplate(templateId: string): string {
  if (templateId === "pools_round_robin") return "Round robin (pools)";
  if (templateId === "pools_to_bracket") return "Bracket eliminatorio";
  if (templateId === "single_elim") return "Eliminación simple";
  return templateId;
}

export function buildScheduleMatchViews(
  cs: CategoryScheduleMock,
  categoryLabel: string,
): ScheduleMatchView[] {
  const allMatches: ScheduleMatchMock[] = cs.phases.flatMap((p) => p.matches);
  const matchIndexById = buildMatchOrderIndex(allMatches);
  const rows: ScheduleMatchView[] = [];

  cs.phases.forEach((ph, phaseIdx) => {
    const phaseTitle = phaseTitleForTemplate(ph.templateId);
    for (const m of ph.matches) {
      const home = formatMatchSide(m.home, cs.teamLabels, matchIndexById);
      const away = formatMatchSide(m.away, cs.teamLabels, matchIndexById);
      rows.push({
        categoryId: cs.categoryId,
        categoryLabel,
        phaseId: ph.id,
        phaseTitle,
        phaseIdx,
        matchId: m.id,
        round: m.round,
        orderInRound: m.orderInRound,
        home,
        away,
        label: `${home} vs ${away}`,
        assignment: cs.assignments[m.id] ?? {},
      });
    }
  });

  rows.sort((a, b) => {
    if (a.phaseIdx !== b.phaseIdx) return a.phaseIdx - b.phaseIdx;
    if (a.round !== b.round) return a.round - b.round;
    return a.orderInRound - b.orderInRound;
  });
  return rows;
}

export function formatScheduleDateTime(value?: string): string {
  if (!value) return "Horario por definir";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("es-PR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}
