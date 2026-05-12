# VolleySchedule — registro de torneos

Aplicación web (Next.js) para **centralizar inscripciones** que hoy se dispersan en múltiples formularios Cognito desde [volleyschedule.com](https://www.volleyschedule.com/).

## Documentación del plan

| Documento | Contenido |
|-----------|-------------|
| [docs/GIT.md](docs/GIT.md) | Cómo guardar cambios en Git (incluidos los `.md`), commit y push |
| [docs/SCHEDULE.md](docs/SCHEDULE.md) | Itinerario, brackets, auto-asignación de canchas y validación |
| [docs/DISCOVERY.md](docs/DISCOVERY.md) | Checklist con el cliente, campos inferidos, cobro y roster |
| [docs/STACK.md](docs/STACK.md) | Next.js, Supabase, Stripe, hosting |
| [docs/DATA_MODEL.md](docs/DATA_MODEL.md) | Entidades MVP y diagrama |
| [docs/WIREFRAMES.md](docs/WIREFRAMES.md) | Layout equipos vs admin |
| [docs/VOLLEYSCHEDULE_INTEGRATION.md](docs/VOLLEYSCHEDULE_INTEGRATION.md) | Subdominio y sustitución de enlaces Cognito |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Deploy en **Vercel** y/o **Railway**, variables y checklist |

## Esquema base de datos

SQL inicial para Supabase (opcional / futuro): [supabase/migrations/001_initial_schema.sql](supabase/migrations/001_initial_schema.sql).

## Desarrollo local

```bash
git clone <tu-repo>
cd Volley-Schedule
npm install
npm run dev
```

Opcional: copiar [`.env.example`](.env.example) a `.env.local` si usas `NEXT_PUBLIC_ADMIN_APP_URL` u otras variables públicas.

## Rutas MVP (mock)

Sitio público (preview) bajo [`src/app/(public)/`](src/app/%28public%29/layout.tsx); panel organizador en `src/app/admin/` sin barra del website.

- `/` — landing
- `/tournaments` — lista de torneos
- `/tournaments/[slug]` — detalle
- `/tournaments/[slug]/register` — placeholder del flujo de inscripción
- `/admin` — inicio del panel (accesos a módulos)
- `/admin/tournaments` — lista admin (mock + torneos en localStorage)
- `/admin/tournaments/new` — crear torneo (guarda en localStorage)
- `/admin/tournaments/[slug]` — panel del torneo (categorías + inscripciones filtradas)
- `/admin/registrations` — tabla global + export CSV (datos mock)

## Siguientes pasos técnicos

1. Proyecto Supabase + políticas RLS.
2. Auth (magic link o email/password) y perfiles `organizer` / `team_manager`.
3. Stripe Checkout y webhook para actualizar `registrations.status`.
