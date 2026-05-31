# Volley-Schedule — cierre de sesión (ruben.md)

Documento de mano para retomar sin perder contexto. **No sustituye** el README del repo; resume estado real y últimos commits.

## Repo y remoto

- **Ruta local (esta copia):** `C:\Users\Admin\OneDrive\Desktop\IdeasI\volleyschedule-registrations`
- **GitHub:** `https://github.com/Gerardito24/Volley-Schedule`
- **Rama:** `main` (push a `origin/main`)

## HEAD reciente (`git log`)

| Commit     | Descripción breve |
| ---------- | ----------------- |
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

## Itinerario admin — workspace “solo bracket” (referencia)

Implementación en `c179bcb` / commits previos:

1. **`TournamentSchedulePanel.tsx`** — Modo `workspace`: configuración colapsable; bracket con scroll; ocupación por cancha en `<details>`; `MatchScheduleEditDialog`; doble clic / doble toque.
2. **`ScheduleBracketView.tsx`**, **`ScheduleCourtsOverview.tsx`**, **`MatchScheduleEditDialog.tsx`**, **`use-double-tap.ts`**.

## Plan móvil iOS / macOS (referencia)

Implementado en `19cac6e`: safe areas, header responsive, CTAs 44px, admin drawer móvil.

## Arranque local

```powershell
cd "C:\Users\Admin\OneDrive\Desktop\IdeasI\volleyschedule-registrations"
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

1. Crear **dos proyectos Vercel** conectados al mismo repo (ver `docs/DEPLOY_SPLIT.md`).
2. Asignar dominios: principal + `admin.<dominio>`.
3. Configurar env vars en cada proyecto (tabla arriba).
4. Probar en dispositivo real post-deploy.
5. Opcional: PWA, rate limit en `/api/club-registration/send-pdf`.

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
