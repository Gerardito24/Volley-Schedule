import type { RegistrationStatus, TournamentStatus } from "@/lib/types";
import { REGISTRATION_STATUS_LABELS, TOURNAMENT_STATUS_LABELS } from "@/lib/types";

const REGISTRATION_STYLES: Record<RegistrationStatus, string> = {
  pending_payment: "bg-amber-100 text-amber-800 border-amber-200",
  paid: "bg-sky-100 text-sky-800 border-sky-200",
  under_review: "bg-violet-100 text-violet-800 border-violet-200",
  approved: "bg-emerald-100 text-emerald-800 border-emerald-200",
  rejected: "bg-red-100 text-red-800 border-red-200",
  waitlisted: "bg-zinc-100 text-zinc-600 border-zinc-200",
};

const TOURNAMENT_STYLES: Record<TournamentStatus, string> = {
  draft: "bg-zinc-100 text-zinc-600 border-zinc-200",
  open: "bg-emerald-100 text-emerald-800 border-emerald-200",
  closed: "bg-red-100 text-red-800 border-red-200",
};

const chipBase =
  "inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium";

export function RegistrationStatusChip({ status }: { status: RegistrationStatus }) {
  return (
    <span className={`${chipBase} ${REGISTRATION_STYLES[status]}`}>
      {REGISTRATION_STATUS_LABELS[status]}
    </span>
  );
}

export function TournamentStatusChip({ status }: { status: TournamentStatus }) {
  return (
    <span className={`${chipBase} ${TOURNAMENT_STYLES[status]}`}>
      {TOURNAMENT_STATUS_LABELS[status]}
    </span>
  );
}
