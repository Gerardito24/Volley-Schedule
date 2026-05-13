"use client";

import { useCallback, useEffect, useState } from "react";
import { tournaments as seedTournaments } from "@/lib/mock-data";
import type { TournamentMock } from "@/lib/mock-data";
import { mergeAdminTournaments } from "@/lib/merge-tournaments";
import {
  readStoredTournaments,
  VOLLEYSCHEDULE_TOURNAMENTS_STORED_CHANGED,
} from "@/lib/local-tournaments";
import { isRemoteDbEnabled } from "@/lib/remote-data";
import { readRemoteTournaments } from "@/lib/remote-tournaments";

export async function computeMergedTournaments(): Promise<TournamentMock[]> {
  if (await isRemoteDbEnabled()) {
    const remote = await readRemoteTournaments();
    return mergeAdminTournaments(seedTournaments, remote ?? []);
  }
  return mergeAdminTournaments(seedTournaments, readStoredTournaments());
}

export function useMergedTournaments(): TournamentMock[] {
  const [merged, setMerged] = useState<TournamentMock[]>(() =>
    mergeAdminTournaments(
      seedTournaments,
      typeof window === "undefined" ? [] : readStoredTournaments(),
    ),
  );

  const refresh = useCallback(async () => {
    setMerged(await computeMergedTournaments());
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const onStored = () => {
      void refresh();
    };
    window.addEventListener(VOLLEYSCHEDULE_TOURNAMENTS_STORED_CHANGED, onStored);
    return () =>
      window.removeEventListener(VOLLEYSCHEDULE_TOURNAMENTS_STORED_CHANGED, onStored);
  }, [refresh]);

  return merged;
}
