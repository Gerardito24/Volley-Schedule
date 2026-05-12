export type RosterPlayer = {
  id: string;
  fullName: string;
  jerseyNumber?: string;
  position?: string;
};

export type TeamRoster = {
  id: string;
  /** Links back to the RegistrationRowMock that spawned this roster. */
  registrationId: string;
  clubName: string;
  teamName: string;
  tournamentSlug: string;
  tournamentName: string;
  categoryId: string;
  divisionLabel: string;
  coachName: string;
  coachPhone: string;
  players: RosterPlayer[];
  createdAt: string;
  updatedAt: string;
};
