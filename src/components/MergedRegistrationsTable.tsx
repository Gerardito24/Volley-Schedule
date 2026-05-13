"use client";

import { useEffect, useMemo, useState } from "react";
import { RegistrationTable } from "@/components/RegistrationTable";
import {
  LOCAL_REGISTRATIONS_KEY,
  readStoredRegistrations,
} from "@/lib/local-registrations";
import { mergeAdminRegistrations } from "@/lib/merge-registrations";
import { registrationMatchesAdminCategory } from "@/lib/registration-category-match";
import {
  registrationRows as seedRegistrationRows,
  tournaments as seedTournaments,
  type TournamentMock,
} from "@/lib/mock-data";

export function MergedRegistrationsTable({
  tournamentSlug,
  categoryId,
  tournament,
  hideTournamentColumn,
  registrationTools = true,
}: {
  tournamentSlug?: string;
  /** Si se pasa, solo filas de esa categoría (`categoryId` en mock). */
  categoryId?: string;
  /** Torneo mergeado (admin); con `categoryId` permite alinear ids seed vs localStorage. */
  tournament?: TournamentMock;
  hideTournamentColumn?: boolean;
  /** Hoja de inscripción, PDF por fila, doble clic en celdas (solo admin). */
  registrationTools?: boolean;
}) {
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const bump = () => setRevision((x) => x + 1);
    window.addEventListener("volleyschedule-registrations-changed", bump);
    const onStorage = (e: StorageEvent) => {
      if (e.key === LOCAL_REGISTRATIONS_KEY) bump();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("volleyschedule-registrations-changed", bump);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const rows = useMemo(() => {
    let merged = mergeAdminRegistrations(
      seedRegistrationRows,
      readStoredRegistrations(),
    );
    if (tournamentSlug) {
      merged = merged.filter((r) => r.tournamentSlug === tournamentSlug);
    }
    if (categoryId) {
      const seedTour =
        tournamentSlug && tournament
          ? seedTournaments.find((t) => t.slug === tournamentSlug)
          : undefined;
      if (tournament) {
        merged = merged.filter((r) =>
          registrationMatchesAdminCategory(r, tournament, categoryId, seedTour),
        );
      } else {
        merged = merged.filter((r) => r.categoryId === categoryId);
      }
    }
    return merged;
  }, [tournamentSlug, categoryId, tournament, revision]);

  return (
    <RegistrationTable
      rows={rows}
      hideTournamentColumn={hideTournamentColumn}
      allowLocalStatusEdit
      registrationTools={registrationTools}
    />
  );
}
