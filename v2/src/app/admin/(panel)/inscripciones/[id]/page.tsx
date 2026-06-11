import Link from "next/link";
import { notFound } from "next/navigation";
import { getRegistration, getRosterByRegistration, getTournament } from "@/lib/store";
import {
  APPROVAL_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  categoryLabel,
  formatDateEs,
  formatUsd,
} from "@/lib/types";
import { ApprovalStatusChip, PaymentStatusChip } from "@/components/admin/StatusChip";
import RegistrationEditor from "@/components/admin/RegistrationEditor";
import PrintRegistrationButton from "@/components/admin/PrintRegistrationButton";
import { card } from "@/components/admin/ui";
import type { Coach } from "@/lib/types";

function contactLine(c: Coach): string {
  return [c.name, c.phone, c.email, c.affiliationNumber].filter(Boolean).join(" · ");
}

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

function CoachBlock({ title, coach }: { title: string; coach: Coach }) {
  return (
    <div>
      <dt className="text-xs font-medium text-zinc-500">{title}</dt>
      <dd className="mt-0.5 text-zinc-900">
        {coach.name}
        <span className="block text-xs text-zinc-500">
          {[coach.phone, coach.email, coach.level, coach.affiliationNumber]
            .filter(Boolean)
            .join(" · ")}
        </span>
      </dd>
    </div>
  );
}

export default async function RegistrationDetailPage({ params }: PageProps) {
  const { id } = await params;
  const registration = await getRegistration(id);
  if (!registration) notFound();

  const [tournament, roster] = await Promise.all([
    getTournament(registration.tournamentSlug),
    getRosterByRegistration(registration.id),
  ]);
  const category = tournament?.categories.find((c) => c.id === registration.categoryId);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/inscripciones"
          className="text-sm font-medium text-zinc-500 hover:text-indigo-600"
        >
          ← Inscripciones
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold text-zinc-900">{registration.teamName}</h1>
          <ApprovalStatusChip status={registration.approval} />
          <PaymentStatusChip status={registration.paymentStatus} />
          <div className="ml-auto">
            <PrintRegistrationButton
              data={{
                teamName: registration.teamName,
                clubName: registration.clubName,
                tournamentName: tournament?.name ?? registration.tournamentSlug,
                categoryLabel:
                  tournament && category ? categoryLabel(tournament, category) : "—",
                registeredAt: formatDateEs(registration.registeredAt.slice(0, 10)),
                fee: formatUsd(registration.feeCents),
                approvalLabel: APPROVAL_STATUS_LABELS[registration.approval],
                paymentLabel: PAYMENT_STATUS_LABELS[registration.paymentStatus],
                repLine: [
                  registration.representative.name,
                  registration.representative.phone,
                  registration.representative.email,
                  registration.representative.affiliationNumber,
                ]
                  .filter(Boolean)
                  .join(" · "),
                coachLine: contactLine(registration.coach),
                assistantLine: registration.assistant
                  ? contactLine(registration.assistant)
                  : undefined,
                signatureName: registration.signatureName,
                comments: registration.comments || undefined,
                players: registration.players.map((p) => ({
                  jerseyNumber: p.jerseyNumber || "—",
                  name: p.name,
                  birthDate: formatDateEs(p.birthDate),
                  affiliationNumber: p.affiliationNumber || "—",
                })),
              }}
            />
          </div>
        </div>
        <p className="mt-1 text-sm text-zinc-500">
          {registration.clubName} · {tournament?.name ?? registration.tournamentSlug}
        </p>
      </div>

      <div className={`${card} p-6`}>
        <h2 className="text-lg font-semibold text-zinc-900">Detalle de la inscripción</h2>
        <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium text-zinc-500">Club</dt>
            <dd className="mt-0.5 text-zinc-900">{registration.clubName}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-zinc-500">Categoría</dt>
            <dd className="mt-0.5 text-zinc-900">
              {tournament && category ? categoryLabel(tournament, category) : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-zinc-500">Fecha de inscripción</dt>
            <dd className="mt-0.5 text-zinc-900">
              {formatDateEs(registration.registeredAt.slice(0, 10))}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-zinc-500">Tarifa</dt>
            <dd className="mt-0.5 text-zinc-900">{formatUsd(registration.feeCents)}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-zinc-500">Apoderado</dt>
            <dd className="mt-0.5 text-zinc-900">
              {registration.representative.name}
              <span className="block text-xs text-zinc-500">
                {[
                  registration.representative.email,
                  registration.representative.phone,
                  registration.representative.affiliationNumber,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            </dd>
          </div>
          <CoachBlock title="Coach" coach={registration.coach} />
          {registration.assistant && (
            <CoachBlock title="Coach asistente" coach={registration.assistant} />
          )}
          <div>
            <dt className="text-xs font-medium text-zinc-500">Firmado por</dt>
            <dd className="mt-0.5 text-zinc-900">
              {registration.signatureName}
              <span className="block text-xs text-zinc-500">
                {registration.termsAccepted ? "Términos aceptados" : "Términos sin aceptar"}
              </span>
            </dd>
          </div>
          {registration.comments && (
            <div className="sm:col-span-2">
              <dt className="text-xs font-medium text-zinc-500">Comentarios</dt>
              <dd className="mt-0.5 text-zinc-900">{registration.comments}</dd>
            </div>
          )}
        </dl>

        {roster && (
          <div className="mt-5 border-t border-zinc-100 pt-5">
            <Link
              href={`/admin/equipos/${roster.clubSlug}/roster/${roster.id}`}
              className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
            >
              Editar roster guardado de este equipo →
            </Link>
          </div>
        )}
      </div>

      <div className={`${card} p-6`}>
        <h2 className="text-lg font-semibold text-zinc-900">
          Jugadoras/es ({registration.players.length})
        </h2>
        {registration.players.length === 0 ? (
          <p className="mt-3 rounded-lg border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-400">
            Esta inscripción no incluye jugadoras/es.
          </p>
        ) : (
          <div className="thin-scroll mt-3 overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-xs uppercase tracking-wider text-zinc-500">
                  <th className="py-2 pr-3 font-medium">#</th>
                  <th className="py-2 pr-3 font-medium">Nombre</th>
                  <th className="py-2 pr-3 font-medium">Nacimiento</th>
                  <th className="py-2 font-medium">Afiliación</th>
                </tr>
              </thead>
              <tbody>
                {registration.players.map((p) => (
                  <tr key={p.id} className="border-b border-zinc-100 last:border-0">
                    <td className="py-2.5 pr-3 text-zinc-500">{p.jerseyNumber || "—"}</td>
                    <td className="py-2.5 pr-3 font-medium text-zinc-900">{p.name}</td>
                    <td className="py-2.5 pr-3 text-zinc-500">{formatDateEs(p.birthDate)}</td>
                    <td className="py-2.5 text-zinc-500">{p.affiliationNumber || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <RegistrationEditor
        registrationId={registration.id}
        initialApproval={registration.approval}
        initialPaymentStatus={registration.paymentStatus}
        initialTeamName={registration.teamName}
        initialFeeCents={registration.feeCents}
        initialComments={registration.comments ?? ""}
      />
    </div>
  );
}
