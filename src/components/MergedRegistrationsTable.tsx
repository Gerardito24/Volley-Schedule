"use client";

import { useEffect, useMemo, useState } from "react";
import { RegistrationTable } from "@/components/RegistrationTable";
import {
  LOCAL_REGISTRATIONS_KEY,
  readStoredRegistrations,
} from "@/lib/local-registrations";
import { mergeAdminRegistrations } from "@/lib/merge-registrations";
import { registrationRows as seedRegistrationRows } from "@/lib/mock-data";

export function MergedRegistrationsTable({
  tournamentSlug,
  hideTournamentColumn,
}: {
  tournamentSlug?: string;
  hideTournamentColumn?: boolean;
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
    return merged;
  }, [tournamentSlug, revision]);

  return (
    <RegistrationTable
      rows={rows}
      hideTournamentColumn={hideTournamentColumn}
      allowLocalStatusEdit
    />
  );
}
