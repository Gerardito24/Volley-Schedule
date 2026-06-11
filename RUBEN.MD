# Volley-Schedule — cierre de sesión (ruben.md)

Documento de mano para retomar sin perder contexto. **No sustituye** el README del repo; resume estado real y últimos commits.

## Repo y remoto

- **Ruta local (esta copia):** `C:\Dev\volleyschedule-registrations`
- **GitHub:** `https://github.com/Gerardito24/Volley-Schedule`
- **Rama:** `main` (push a `origin/main`)

## HEAD reciente (`git log`)

| Commit     | Descripción breve |
| ---------- | ----------------- |
| `cc6a8ea`  | **fix(admin):** elimina bucle de carga login↔admin; errores claros si falla DB/sesión; redirect `/` → `/admin/login` en surface admin; scripts `verify:deploy-urls` / `print:vercel-checklist`. |
| `a94874d`  | fix(deploy): force Next.js framework on Vercel |
| `80ffbc5`  | **Split Vercel público/admin:** `NEXT_PUBLIC_APP_SURFACE` en middleware (`public` → 404 en `/admin` y `/api/admin`), helper `src/lib/app-surface.ts`, endpoint `/api/public/db-status`, enlaces públicos al admin solo con `NEXT_PUBLIC_ADMIN_APP_URL`, docs `DEPLOY_SPLIT.md` / `.env.example`. |
| `f08660d`  | fix(admin): persistir sesión admin en localStorage |
| `c179bcb`  | Admin itinerario: bracket workspace, details, edición por diálogo y doble toque |
| `bdbd8b1`  | Admin: página dedicada de itinerario con bracket y canchas |
| `19cac6e`  | iOS/macOS: safe areas, `min-h-dvh`, header público responsive, CTAs ~44px, admin drawer `<lg` + overlay |

## Split Vercel — público + admin (referencia)

Implementación alineada al plan *Split Vercel Public/Admin*:

1. **`src/lib/app-surface.ts`** — `getAppSurface()` (`public` \| `admin` \| `all` en dev), `getPublicAdminHref()`, `buildAdminHref()`.
2. **`src/middleware.ts`** — Con `NEXT_PUBLIC_APP_SURFACE=public`, responde **404** a `/admin/*` y `/api/admin/*`. En `admin`/dev local, mantiene redirect a login cuando hay DB.
3. **`src/app/api/public/db-status/route.ts`** — El sitio público ya no llama a `/api/admin/db` para saber si hay Postgres.
4. **UI pública** — `SiteHeader`, footer en `(public)/layout.tsx` y enlace en `/equipo`: en surface `public` solo muestran enlace al admin si existe `NEXT_PUBLIC_ADMIN_APP_URL`.
5. **Docs** — `docs/DEPLOY_SPLIT.md` (guía de dos proyectos Vercel), `.env.example`, `docs/DEPLOYMENT.md`.

### Variables por proyecto Vercel

| Proyecto | Obligatorias | No poner |
|----------|--------------|----------|
| **Público** | `NEXT_PUBLIC_APP_SURFACE=public`, `DATABASE_URL_POOLED`, `NEXT_PUBLIC_ADMIN_APP_URL=https://admin.tudominio.com` | `ADMIN_SESSION_SECRET` |
| **Admin** | `NEXT_PUBLIC_APP_SURFACE=admin`, `DATABASE_URL_POOLED`, `ADMIN_SESSION_SECRET` | — |

Misma Postgres (Railway) en ambos. Migraciones: `npm run db:migrate` (una vez; no automático en Vercel).

**Deploy admin en producción (jun 2026):** `https://volley-schedule-admin.vercel.app` — Postgres Railway (`yamabiko.proxy.rlwy.net`). Migraciones aplicadas; pendiente setup IT maestro en `/admin/setup` si `needsSetup: true`.

## Producto — visión y contexto (para mejoras UX)

La app sirve a **organizadores** que manejan inscripciones y schedule de torneos de voleibol. Hay **dos superficies** (mismo repo, dos deploys Vercel):

| Superficie | Nombre de trabajo | Quién la usa |
|------------|-------------------|--------------|
| **Admin** | **Portal de Administrador** (antes “Plataforma organizador” en sidebar) | Organizador / staff |
| **Público** | Website de registro | Clubes, jugadores, público |

### Portal de Administrador — qué hace hoy (funciones a conservar)

El organizador usa este portal para:

1. **Torneos** — crear, editar, añadir categorías/divisiones.
2. **Schedule** — montar brackets, itinerarios, canchas y horarios por torneo.
3. **Inscripciones** — gestionar inscripciones **por torneo** (vista global y por evento).
4. **Equipos** — guardar datos de equipos/clubes para reutilizar información entre torneos.

Rutas admin actuales (referencia): `/admin`, `/admin/tournaments`, `/admin/torneos-activos`, `/admin/registrations`, `/admin/profiles`, `/admin/equipos`.

### Website público — pareja del admin

- Ver torneos **disponibles** y **activos**.
- **Inscribirse** a torneos.

Flujo crítico de negocio: al inscribirse, conviene **reutilizar roster/datos del equipo** ya guardados para que el cliente no vuelva a teclear todo en cada torneo. Eso conecta admin (equipos guardados) ↔ público (inscripción rápida).

### Trabajo pendiente — mejora UX/UI (sin cambiar funciones)

**Regla:** mismo comportamiento y capacidades; se puede reorganizar pantallas, copy, navegación y flujos visuales.

**Enfoque acordado:** el usuario describe el uso real del app; con esa descripción se mejora la experiencia módulo a módulo.

**Orden sugerido cuando retomemos:**

1. Renombrar branding admin → **Portal de Administrador** (`AdminSidebar`, login, setup, metadata).
2. Portal de Administrador — home, torneos, inscripciones, equipos, perfiles (según descripción detallada del usuario).
3. Website público — torneos, inscripción, reutilización de roster (segunda fase).

## UX redesign (jun 2026) — implementado

Plan *Rediseño Portal y Web* aplicado en código:

- **Portal de Administrador:** branding, design system (`src/components/admin/ui/`), sidebar por secciones (Operación / Administración), top bar con breadcrumbs, auth cache sin flash entre rutas, dashboard con métricas.
- **Torneos admin:** wizard 4 pasos al crear, tabs en detalle (`?tab=`), búsqueda/filtros en lista, botón lápiz en categorías.
- **Inscripciones:** filtros por torneo/estado, chips de estado, botón Editar visible.
- **Equipos:** búsqueda, guardado unificado en detalle de club.
- **Web público:** `/tournaments` usa datos merged, inscripción por pasos, reutilizar datos como primer paso, borrador automático, skeletons/empty states en itinerarios.

Verificación: `npm run build` + `npm test` (74 tests).

## Itinerario admin — workspace “solo bracket” (referencia)

Implementación en `c179bcb` / commits previos:

1. **`TournamentSchedulePanel.tsx`** — Modo `workspace`: configuración colapsable; bracket con scroll; ocupación por cancha en `<details>`; `MatchScheduleEditDialog`; doble clic / doble toque.
2. **`ScheduleBracketView.tsx`**, **`ScheduleCourtsOverview.tsx`**, **`MatchScheduleEditDialog.tsx`**, **`use-double-tap.ts`**.

## Plan móvil iOS / macOS (referencia)

Implementado en `19cac6e`: safe areas, header responsive, CTAs 44px, admin drawer móvil.

## Arranque local

```powershell
cd "C:\Dev\volleyschedule-registrations"
npm install   # si falta node_modules
npm run dev   # Next.js en el puerto por defecto (3000)
```

Sin `NEXT_PUBLIC_APP_SURFACE`, en local sirve **público + admin** en el mismo host.

Simular split:

```powershell
# Público (puerto 3000)
$env:NEXT_PUBLIC_APP_SURFACE="public"; $env:NEXT_PUBLIC_ADMIN_APP_URL="http://localhost:3001"; npm run dev

# Admin (puerto 3001, otra terminal)
$env:NEXT_PUBLIC_APP_SURFACE="admin"; npm run dev -- -p 3001
```

## Verificación rápida antes de presentar

- `npm run build` y `npm test` deben pasar.
- **Proyecto público (Vercel):** `/` OK; `/admin` → **404**; enlaces al panel apuntan a `NEXT_PUBLIC_ADMIN_APP_URL`.
- **Proyecto admin (Vercel):** `/admin/login` OK con `ADMIN_SESSION_SECRET`.
- En **iPhone**: probar `/`, `/tournaments`, `/itinerarios`, inscripción; itinerario admin con doble toque.

## Próximos pasos (si retomas)

1. ~~Crear **dos proyectos Vercel**~~ — hecho (`volley-schedule-admin` + público).
2. ~~Migraciones Railway~~ — hecho (`npm run db:migrate` contra Postgres Railway).
3. Completar **setup IT maestro** en `/admin/setup` si aún no hay operadores en DB.
4. ~~**Mejora UX Portal de Administrador**~~ — implementado (jun 2026); ver sección *UX redesign*.
5. Rotar contraseña Postgres si se expuso en chat; actualizar `DATABASE_URL` en ambos Vercel.
6. Opcional: PWA, rate limit en `/api/club-registration/send-pdf`.

## Cómo seguir en otra PC

```powershell
git clone https://github.com/Gerardito24/Volley-Schedule.git
cd Volley-Schedule
git pull origin main
npm install
npm run dev
```

---

*Generado para cerrar sesión; actualizar este archivo cuando cambie algo relevante.*
