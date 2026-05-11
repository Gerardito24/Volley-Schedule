import { RegistrationTable } from "@/components/RegistrationTable";
import { registrationRows } from "@/lib/mock-data";

export default function AdminRegistrationsPage() {
  return (
    <main className="flex flex-1 flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Inscripciones
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Panel para organizadores. En producción: restringir por rol{" "}
          <code className="rounded bg-zinc-200 px-1 dark:bg-zinc-800">organizer</code> vía
          Supabase y middleware.
        </p>
      </div>
      <RegistrationTable rows={registrationRows} />
    </main>
  );
}
