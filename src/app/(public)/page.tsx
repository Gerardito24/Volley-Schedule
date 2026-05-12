import Link from "next/link";

export default function Home() {
  return (
    <main className="flex w-full flex-1 flex-col gap-10 py-12">
      <section className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 md:p-12">
        <p className="text-sm font-medium uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
          Website público (preview)
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 md:text-4xl">
          Registro unificado de torneos
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-zinc-600 dark:text-zinc-300">
          Un solo lugar para que los equipos se inscriban, paguen y sigan el estado de su
          solicitud. Los itinerarios y la marca siguen en el sitio principal.
        </p>
        <div className="mt-8 flex flex-wrap gap-4">
          <Link
            href="/tournaments"
            className="rounded-full bg-emerald-600 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            Ver torneos abiertos
          </Link>
          <a
            href="https://www.volleyschedule.com/"
            className="rounded-full border border-zinc-300 px-6 py-3 text-sm font-semibold text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-100 dark:hover:bg-zinc-800"
            target="_blank"
            rel="noopener noreferrer"
          >
            Itinerarios en volleyschedule.com
          </a>
        </div>
      </section>
      <section className="grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Para equipos
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            Crear perfil de club, elegir división, completar pago (Stripe o referencia de
            transferencia en iteraciones futuras) y subir documentos.
          </p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Para organizadores
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            El panel de administración es aparte: gestión de torneos, inscripciones y
            exportaciones.
          </p>
          <Link
            href="/admin"
            className="mt-4 inline-block text-sm font-medium text-emerald-700 underline-offset-4 hover:underline dark:text-emerald-400"
          >
            Ir al panel organizador
          </Link>
        </div>
      </section>
    </main>
  );
}
