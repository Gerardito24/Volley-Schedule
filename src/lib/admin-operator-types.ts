export type AdminOperatorRole = "it_master" | "administrator";

/** Stored operator (password never in clear text in storage). */
export type AdminOperator = {
  id: string;
  displayName: string;
  position: string;
  username: string;
  passwordHash: string;
  role: AdminOperatorRole;
  createdAt: string;
  /** Correo del organizador (p. ej. Gmail): copia BCC en constancias si `ORGANIZER_BCC` en el servidor coincide. */
  organizerEmail?: string;
};

export type AdminOperatorPublic = Omit<AdminOperator, "passwordHash">;

export const IT_MASTER_PROFILE_ID = "it-master";
export const IT_MASTER_DISPLAY_NAME = "Gerardo Gonzalez";
export const IT_MASTER_POSITION = "IT";

export const LOCAL_ADMIN_OPERATORS_KEY = "volleyschedule-admin-operators-v1";
export const SESSION_ADMIN_KEY = "volleyschedule-admin-session-v1";

export type AdminSession = {
  profileId: string;
};
