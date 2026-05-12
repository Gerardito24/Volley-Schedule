import Link from "next/link";

const modules = [
  {
    href: "/admin/tournaments",
    title: "Torneos",
    description: "Lista, creación y panel por torneo (divisiones e inscripciones).",
    badge: null as string | null,
  },
  {
    href: "/admin/registrations",
    title: "Inscripciones",
    description: "Vista global de todas las inscripciones y export CSV.",
    badge: null,
  },
  {
    href: "/admin/profiles",
    title: "Perfiles",
    description: "Operadores: IT maestro y administradores con acceso al panel.",
    badge: null,
  },
];

export default function AdminHomePage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Inicio</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Selecciona el módulo que deseas utilizar. El acceso al panel requiere perfil IT configurado e inicio de
          sesión.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {modules.map((m) => (
          <Link
            key={m.href}
            href={m.href}
            className="group relative flex flex-col rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:border-sky-300 hover:shadow-md"
          >
            {m.badge ? (
              <span className="absolute right-4 top-4 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800">
                {m.badge}
              </span>
            ) : null}
            <h2 className="text-lg font-semibold text-zinc-900 group-hover:text-sky-700">
              {m.title}
            </h2>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-zinc-600">{m.description}</p>
            <span className="mt-4 text-sm font-medium text-sky-600">Abrir →</span>
          </Link>
        ))}
      </div>

      <p className="text-xs text-zinc-500">
        La inscripción de equipos será en el website público. Aquí gestionas operación y datos
        locales hasta conectar Supabase.
      </p>
    </div>
  );
}
