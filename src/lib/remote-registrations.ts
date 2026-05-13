import type { RegistrationRowMock } from "@/lib/mock-data";
import { fetchAdminJson, isRemoteDbEnabled } from "@/lib/remote-data";

type RegistrationsResponse = { ok: boolean; registrations: RegistrationRowMock[] };
type RegistrationResponse = { ok: boolean; registration: RegistrationRowMock };

export async function readRemoteRegistrations(): Promise<RegistrationRowMock[] | null> {
  if (!(await isRemoteDbEnabled())) return null;
  const data = await fetchAdminJson<RegistrationsResponse>("/api/admin/registrations", {
    cache: "no-store",
  });
  return data.registrations;
}

export async function upsertRemoteRegistration(
  registration: RegistrationRowMock,
): Promise<RegistrationRowMock | null> {
  if (!(await isRemoteDbEnabled())) return null;
  const data = await fetchAdminJson<RegistrationResponse>("/api/admin/registrations", {
    method: "POST",
    body: JSON.stringify(registration),
  });
  return data.registration;
}
