import { notFound } from "next/navigation";
import { getScorerLink, getTournament } from "@/lib/store";
import { verifyScorerSession } from "@/lib/scorer-auth";
import ScorerGate from "@/components/scorer/ScorerGate";
import ScorerApp from "@/components/scorer/ScorerApp";

export const dynamic = "force-dynamic";

export default async function ScorerPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const link = await getScorerLink(token);
  if (!link) notFound();

  const authed = await verifyScorerSession(token);

  if (!authed) {
    return <ScorerGate token={token} operatorName={link.name} />;
  }

  const tournament = await getTournament(link.tournamentSlug);
  if (!tournament) notFound();

  return (
    <ScorerApp
      token={token}
      operatorName={link.name}
      tournament={tournament}
    />
  );
}
