import { createHash, randomUUID } from "crypto";
import type {
  AdminUser,
  ApprovalStatus,
  ClubProfile,
  Coach,
  PaymentStatus,
  Player,
  Registration,
  RegistrationStatus,
  TeamRoster,
  Tournament,
} from "./types";
import { slugify } from "./types";
import { autoAssignSchedule, generateSingleElim } from "./schedule-engine";

export function hashPassword(password: string): string {
  return createHash("sha256").update(password).digest("hex");
}

/** Traduce el estado del modelo viejo a las dos dimensiones del nuevo. */
function normalizeRegistrationStatus(legacy: RegistrationStatus): {
  approval: ApprovalStatus;
  paymentStatus: PaymentStatus;
} {
  const approval: ApprovalStatus =
    legacy === "approved"
      ? "approved"
      : legacy === "rejected"
        ? "rejected"
        : legacy === "waitlisted"
          ? "waitlisted"
          : "pending";
  const paymentStatus: PaymentStatus =
    legacy === "paid" || legacy === "approved" ? "paid" : "unpaid";
  return { approval, paymentStatus };
}

function isoDate(daysFromNow: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().slice(0, 10);
}

const FIRST_NAMES = [
  "Valeria", "Camila", "Sofía", "Isabela", "Mía", "Gabriela", "Alondra", "Paola",
  "Adriana", "Natalia", "Andrea", "Lucía", "Diego", "Sebastián", "Yadiel", "Luis",
  "Carlos", "José", "Kevin", "Adrián",
];
const LAST_NAMES = [
  "Rivera", "Torres", "Santiago", "Rodríguez", "Vázquez", "Colón", "Ortiz",
  "Martínez", "Pérez", "Cruz", "Reyes", "Figueroa", "Díaz", "Morales",
];

function makePlayers(count: number, clubIndex: number): Player[] {
  const players: Player[] = [];
  for (let i = 0; i < count; i++) {
    const fn = FIRST_NAMES[(clubIndex * 3 + i * 5) % FIRST_NAMES.length];
    const ln = LAST_NAMES[(clubIndex * 7 + i * 3) % LAST_NAMES.length];
    players.push({
      id: randomUUID(),
      name: `${fn} ${ln}`,
      jerseyNumber: String(i + 1 + (clubIndex % 3)),
      birthDate: `201${3 + (i % 2)}-0${(i % 9) + 1}-1${i % 9}`,
      affiliationNumber: `FPV-${1000 + clubIndex * 20 + i}`,
    });
  }
  return players;
}

interface ClubSeedDef {
  name: string;
  pueblo: string;
  contact: string;
  coach: string;
}

const CLUB_DEFS: ClubSeedDef[] = [
  { name: "Caribe VC", pueblo: "San Juan", contact: "María Rivera", coach: "Pedro Sánchez" },
  { name: "Vaqueros Volleyball", pueblo: "Bayamón", contact: "Luis Ortiz", coach: "Ana Colón" },
  { name: "Gigantes Juvenil", pueblo: "Carolina", contact: "Carmen Díaz", coach: "Rafael Cruz" },
  { name: "Mets Academy", pueblo: "Guaynabo", contact: "Jorge Pérez", coach: "Wanda Torres" },
  { name: "Criollas Volley Club", pueblo: "Caguas", contact: "Nilda Reyes", coach: "Iván Morales" },
  { name: "Leonas del Sur", pueblo: "Ponce", contact: "Rosa Figueroa", coach: "Héctor Vázquez" },
  { name: "Indias VC", pueblo: "Mayagüez", contact: "Elba Santiago", coach: "Mónica Ramos" },
  { name: "Grises Oriental", pueblo: "Humacao", contact: "Tomás Rodríguez", coach: "Lourdes Nieves" },
];

function makeCoach(def: ClubSeedDef, index: number): Coach {
  return {
    name: def.coach,
    phone: `787-555-0${100 + index}`,
    email: `${slugify(def.coach)}@${slugify(def.name)}.pr`,
    affiliationNumber: `FPV-C0${100 + index}`,
    level: index % 2 === 0 ? "Nacional I" : "Regional",
  };
}

export interface SeedData {
  tournaments: Tournament[];
  registrations: Registration[];
  clubs: ClubProfile[];
  rosters: TeamRoster[];
  admins: AdminUser[];
}

export function buildSeedData(): SeedData {
  const now = new Date().toISOString();

  const clubs: ClubProfile[] = CLUB_DEFS.map((def, i) => ({
    clubSlug: slugify(def.name),
    displayName: def.name,
    pueblo: def.pueblo,
    phone: `787-555-0${200 + i}`,
    contactName: def.contact,
    contactEmail: `${slugify(def.contact)}@${slugify(def.name)}.pr`,
    updatedAt: now,
  }));

  const registrations: Registration[] = [];
  const rosters: TeamRoster[] = [];

  function addRegistration(opts: {
    tournamentSlug: string;
    categoryId: string;
    clubIndex: number;
    teamName?: string;
    status: RegistrationStatus;
    feeCents: number;
    daysAgo: number;
  }): Registration {
    const def = CLUB_DEFS[opts.clubIndex];
    const club = clubs[opts.clubIndex];
    const registeredAt = new Date(Date.now() - opts.daysAgo * 86_400_000).toISOString();
    const players = makePlayers(8, opts.clubIndex);
    const reg: Registration = {
      id: `reg-${randomUUID()}`,
      tournamentSlug: opts.tournamentSlug,
      categoryId: opts.categoryId,
      clubSlug: club.clubSlug,
      clubName: club.displayName,
      teamName: opts.teamName ?? club.displayName,
      representative: {
        name: club.contactName,
        email: club.contactEmail,
        phone: club.phone ?? "",
      },
      coach: makeCoach(def, opts.clubIndex),
      assistant: null,
      players,
      comments: "",
      signatureName: club.contactName,
      termsAccepted: true,
      ...normalizeRegistrationStatus(opts.status),
      feeCents: opts.feeCents,
      registeredAt,
      updatedAt: registeredAt,
    };
    registrations.push(reg);
    rosters.push({
      id: `roster-${randomUUID()}`,
      registrationId: reg.id,
      clubSlug: club.clubSlug,
      clubName: club.displayName,
      teamName: reg.teamName,
      tournamentSlug: opts.tournamentSlug,
      categoryId: opts.categoryId,
      coachName: reg.coach.name,
      coachPhone: reg.coach.phone,
      players: players.map((p) => ({
        id: p.id,
        name: p.name,
        jerseyNumber: p.jerseyNumber,
      })),
      updatedAt: registeredAt,
    });
    return reg;
  }

  // -------------------------------------------------------------------------
  // Copa Isla Invitacional — EN VIVO hoy, bracket publicado con resultados
  // -------------------------------------------------------------------------
  const copaIsla: Tournament = {
    slug: "copa-isla-invitacional-2026",
    name: "Copa Isla Invitacional",
    description:
      "Invitacional de un fin de semana con los mejores clubes juveniles de la isla. Eliminación sencilla, categoría 13U mixto.",
    venues: [
      { id: "v-arena-caguas", label: "Arena Caguas", courtCount: 2 },
    ],
    registrationDeadlineOn: isoDate(-3),
    startsOn: isoDate(0),
    endsOn: isoDate(1),
    baseFeeCents: 15000,
    publicEntryFeeCents: 500,
    status: "closed",
    divisions: [{ id: "div-isla", label: "Invitacional" }],
    categories: [
      {
        id: "cat-isla-13u",
        ageLabel: "13U",
        divisionId: "div-isla",
        gender: "mixto",
        feeCents: null,
        maxTeams: 8,
      },
    ],
    schedule: null,
    createdAt: now,
    updatedAt: now,
  };

  const islaRegs = CLUB_DEFS.map((_, i) =>
    addRegistration({
      tournamentSlug: copaIsla.slug,
      categoryId: "cat-isla-13u",
      clubIndex: i,
      status: "paid",
      feeCents: 15000,
      daysAgo: 20 - i,
    }),
  );

  // Bracket de 8 equipos con cuartos jugados
  const { pools, matches } = generateSingleElim(8);
  const startAt = new Date();
  startAt.setHours(9, 0, 0, 0);
  const settings = {
    template: "single_elim" as const,
    startAt: startAt.toISOString(),
    durationMinutes: 60,
    courts: ["Cancha 1", "Cancha 2"],
  };
  const assigned = autoAssignSchedule(matches, settings);
  const quarterScores: [number, number][] = [
    [2, 0],
    [2, 1],
    [0, 2],
    [2, 1],
  ];
  assigned
    .filter((m) => m.round === 1)
    .forEach((m, i) => {
      const [home, away] = quarterScores[i % quarterScores.length];
      m.result = { home, away, recordedAt: now };
    });
  copaIsla.schedule = {
    published: true,
    categories: [
      {
        categoryId: "cat-isla-13u",
        teams: islaRegs.map((reg, i) => ({
          seed: i,
          label: reg.teamName,
          registrationId: reg.id,
        })),
        pools,
        matches: assigned,
        settings,
      },
    ],
  };

  // -------------------------------------------------------------------------
  // Copa 30 Summer — inscripciones abiertas
  // -------------------------------------------------------------------------
  const copa30: Tournament = {
    slug: "copa-30-summer-2026",
    name: "Copa 30 Summer",
    description:
      "Tercera edición de la Copa 30 Summer. Tres días de voleibol juvenil con divisiones Open y Recreativo. Premiación para campeones y sub-campeones por categoría.",
    venues: [
      { id: "v-clemente", label: "Coliseo Roberto Clemente", courtCount: 3 },
      { id: "v-sj-anexo", label: "Cancha Anexa San Juan", courtCount: 1 },
    ],
    registrationDeadlineOn: isoDate(3),
    startsOn: isoDate(4),
    endsOn: isoDate(6),
    baseFeeCents: 25000,
    publicEntryFeeCents: 600,
    status: "open",
    divisions: [
      { id: "div-open", label: "Open" },
      { id: "div-rec", label: "Recreativo" },
    ],
    categories: [
      {
        id: "cat-c30-14u-f",
        ageLabel: "14U",
        divisionId: "div-open",
        gender: "femenino",
        feeCents: 25000,
        maxTeams: 12,
      },
      {
        id: "cat-c30-16u-m",
        ageLabel: "16U",
        divisionId: "div-open",
        gender: "masculino",
        feeCents: 27500,
        maxTeams: 12,
      },
      {
        id: "cat-c30-rec",
        ageLabel: "Adulto",
        divisionId: "div-rec",
        gender: "mixto",
        feeCents: 30000,
        maxTeams: 8,
        customLabel: "Open Recreativo Mixto",
      },
    ],
    schedule: null,
    createdAt: now,
    updatedAt: now,
  };

  addRegistration({
    tournamentSlug: copa30.slug,
    categoryId: "cat-c30-14u-f",
    clubIndex: 0,
    teamName: "Caribe 14U Roja",
    status: "approved",
    feeCents: 25000,
    daysAgo: 9,
  });
  addRegistration({
    tournamentSlug: copa30.slug,
    categoryId: "cat-c30-14u-f",
    clubIndex: 1,
    status: "paid",
    feeCents: 25000,
    daysAgo: 7,
  });
  addRegistration({
    tournamentSlug: copa30.slug,
    categoryId: "cat-c30-16u-m",
    clubIndex: 2,
    status: "pending_payment",
    feeCents: 27500,
    daysAgo: 2,
  });
  addRegistration({
    tournamentSlug: copa30.slug,
    categoryId: "cat-c30-rec",
    clubIndex: 4,
    teamName: "Criollas Máster",
    status: "under_review",
    feeCents: 30000,
    daysAgo: 1,
  });

  // -------------------------------------------------------------------------
  // Premier 5C — inscripciones abiertas (julio)
  // -------------------------------------------------------------------------
  const premier5c: Tournament = {
    slug: "premier-5c-2026",
    name: "Premier 5C",
    description:
      "Torneo Premier del verano en Bayamón. Categorías 12U y 18U mixto. Cupos limitados por categoría.",
    venues: [{ id: "v-ruben", label: "Coliseo Rubén Rodríguez", courtCount: 4 }],
    registrationDeadlineOn: isoDate(20),
    startsOn: isoDate(23),
    endsOn: isoDate(25),
    baseFeeCents: 20000,
    publicEntryFeeCents: null,
    status: "open",
    divisions: [{ id: "div-premier", label: "Premier" }],
    categories: [
      {
        id: "cat-p5c-12u",
        ageLabel: "12U",
        divisionId: "div-premier",
        gender: "mixto",
        feeCents: 20000,
        maxTeams: 10,
      },
      {
        id: "cat-p5c-18u",
        ageLabel: "18U",
        divisionId: "div-premier",
        gender: "mixto",
        feeCents: 29000,
        maxTeams: 10,
      },
    ],
    schedule: null,
    createdAt: now,
    updatedAt: now,
  };

  addRegistration({
    tournamentSlug: premier5c.slug,
    categoryId: "cat-p5c-12u",
    clubIndex: 5,
    status: "paid",
    feeCents: 20000,
    daysAgo: 4,
  });
  addRegistration({
    tournamentSlug: premier5c.slug,
    categoryId: "cat-p5c-18u",
    clubIndex: 6,
    teamName: "Indias 18U Élite",
    status: "pending_payment",
    feeCents: 29000,
    daysAgo: 1,
  });

  const admins: AdminUser[] = [
    {
      id: "admin-it-master",
      username: "admin",
      displayName: "Gerardo González",
      position: "IT",
      passwordHash: hashPassword("volley2026"),
      role: "it_master",
      createdAt: now,
    },
  ];

  return {
    tournaments: [copaIsla, copa30, premier5c],
    registrations,
    clubs,
    rosters,
    admins,
  };
}
