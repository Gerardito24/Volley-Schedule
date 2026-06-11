import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import {
  getClub,
  getTournament,
  saveClub,
  saveRegistration,
  saveRoster,
} from "@/lib/store";
import type { Coach, Player, Registration, Representative } from "@/lib/types";
import { effectiveFeeCents, slugify } from "@/lib/types";

interface SubmitBody {
  tournamentSlug: string;
  categoryId: string;
  clubName: string;
  pueblo?: string;
  teamName?: string;
  representative: Representative;
  coach: Coach;
  assistant?: Coach | null;
  players: Omit<Player, "id">[];
  comments?: string;
  signatureName: string;
  termsAccepted: boolean;
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as SubmitBody | null;
  if (!body) return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });

  const tournament = await getTournament(body.tournamentSlug);
  if (!tournament) return NextResponse.json({ error: "Torneo no existe" }, { status: 404 });
  if (tournament.status !== "open") {
    return NextResponse.json({ error: "Las inscripciones están cerradas" }, { status: 400 });
  }
  const category = tournament.categories.find((c) => c.id === body.categoryId);
  if (!category) return NextResponse.json({ error: "Categoría inválida" }, { status: 400 });

  if (!body.clubName?.trim() || !body.representative?.name || !body.coach?.name) {
    return NextResponse.json({ error: "Faltan datos requeridos" }, { status: 400 });
  }
  const validPlayers = (body.players ?? []).filter((p) => p.name?.trim());
  if (validPlayers.length === 0) {
    return NextResponse.json({ error: "Incluye al menos una jugadora" }, { status: 400 });
  }
  if (!body.termsAccepted || !body.signatureName?.trim()) {
    return NextResponse.json({ error: "Falta la firma o aceptar los términos" }, { status: 400 });
  }

  const clubSlug = slugify(body.clubName);
  const now = new Date().toISOString();

  const players: Player[] = validPlayers.map((p) => ({ ...p, id: randomUUID() }));
  const registration: Registration = {
    id: `reg-${randomUUID()}`,
    tournamentSlug: tournament.slug,
    categoryId: category.id,
    clubSlug,
    clubName: body.clubName.trim(),
    teamName: body.teamName?.trim() || body.clubName.trim(),
    representative: body.representative,
    coach: body.coach,
    assistant: body.assistant ?? null,
    players,
    comments: body.comments ?? "",
    signatureName: body.signatureName.trim(),
    termsAccepted: true,
    status: "pending_payment",
    feeCents: effectiveFeeCents(tournament, category),
    registeredAt: now,
    updatedAt: now,
  };
  await saveRegistration(registration);

  // Perfil de club: crear o refrescar contacto
  const existingClub = await getClub(clubSlug);
  await saveClub({
    clubSlug,
    displayName: registration.clubName,
    pueblo: body.pueblo?.trim() || existingClub?.pueblo || "",
    phone: body.representative.phone || existingClub?.phone,
    contactName: body.representative.name,
    contactEmail: body.representative.email,
    updatedAt: now,
  });

  // Roster guardado para reutilización futura
  await saveRoster({
    id: `roster-${randomUUID()}`,
    registrationId: registration.id,
    clubSlug,
    clubName: registration.clubName,
    teamName: registration.teamName,
    tournamentSlug: tournament.slug,
    categoryId: category.id,
    coachName: registration.coach.name,
    coachPhone: registration.coach.phone,
    players: players.map((p) => ({ id: p.id, name: p.name, jerseyNumber: p.jerseyNumber })),
    updatedAt: now,
  });

  return NextResponse.json({ registration }, { status: 201 });
}
