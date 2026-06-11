# Volley-Schedule — cierre de sesión (ruben.md)

Documento de mano para retomar sin perder contexto. **No sustituye** el README del repo; resume estado real y últimos commits.

## Repo y remoto

- **Ruta local (esta copia):** `C:\Dev\volleyschedule-registrations`
- **GitHub:** `https://github.com/Gerardito24/Volley-Schedule`
- **Rama:** `main` (push a `origin/main`)

## HEAD reciente (`git log`)

| Commit     | Descripción breve |
| ---------- | ----------------- |
| *(pendiente push)* | **feat(v2):** VolleyHub PR — app nuevo en `v2/` (website + admin local, JSON store, seed demo). |
| `551443f`  | **feat(ux):** rediseño Portal de Administrador + web pública (app original en raíz). |
| `17a149e`  | fix(admin): mensaje de error detallado si falla DB. |
| `ae39bf9`  | docs: visión de producto y contexto Portal de Administrador. |
| `cc6a8ea`  | fix(admin): elimina bucle login↔admin; redirect `/` → `/admin/login` en surface admin. |

---

## VolleyHub PR — app nuevo en `v2/` (jun 2026)

**Rediseño desde cero** del website público + Portal de Administrador. Mismo workflow de negocio, arquitectura nueva. **No reemplaza** el app de producción en la raíz del repo (Vercel + Postgres); es un **demo local** para iterar diseño y flujos.

### Arranque rápido

```powershell
cd "C:\Dev\volleyschedule-registrations\v2"
npm install                 # solo la primera vez
Copy-Item .env.example .env.local   # y edita DATABASE_URL (Postgres)
npm run dev                 # http://localhost:3001
```

| URL | Qué es |
|-----|--------|
| http://localhost:3001 | Website público (VolleyHub PR) |
| http://localhost:3001/admin | Portal de Administrador |
| http://localhost:3001/admin/login | Login admin |

**Credenciales demo:** usuario `admin` · contraseña `volley2026`

**Verificación:** `cd v2 && npm run build` (debe pasar).

### Arquitectura (a diferencia del app original)

```
Público + Admin  →  API routes (Next.js)  →  Postgres (tablas vh_*)
                                              ↑ crea tablas + seed al primer arranque
```

- **Una sola fuente de verdad:** **Postgres**. Cada colección es una tabla `vh_<nombre>` con `(id text, data jsonb)`: `vh_tournaments`, `vh_registrations`, `vh_clubs`, `vh_rosters`, `vh_admins`.
- Cliente en `v2/src/lib/db.ts` (postgres.js, igual driver que el app original); acceso a datos en `v2/src/lib/store.ts`.
- Prefijo `vh_` para poder **reusar el mismo Postgres** del app de producción sin chocar con sus tablas.
- **Sin** localStorage para datos de negocio (solo borrador de inscripción en el navegador).
- **Sin** split Vercel (`NEXT_PUBLIC_APP_SURFACE`); todo en un host, puerto **3001**.
- Config: copiar `v2/.env.example` → `v2/.env.local` y poner `DATABASE_URL`. Para reset demo: `TRUNCATE` (o borrar) las tablas `vh_*` y reiniciar — v2 vuelve a sembrar.
- **No requiere migración manual:** las tablas se crean solas en la primera petición.

### Datos demo incluidos (seed)

| Torneo | Slug | Estado | Notas |
|--------|------|--------|-------|
| Copa Isla Invitacional | `copa-isla-invitacional-2026` | cerrado | **EN VIVO hoy** — bracket 8 equipos publicado, cuartos con resultados |
| Copa 30 Summer | `copa-30-summer-2026` | abierto | 3 categorías, inscripciones de ejemplo |
| Premier 5C | `premier-5c-2026` | abierto | Bayamón, 12U y 18U mixto |

8 clubes de pueblos de PR (Caribe VC, Vaqueros, Gigantes, Mets, Criollas, Leonas, Indias, Grises) con rosters completos para probar **reutilizar datos** al inscribir.

### Rutas públicas (`v2/src/app/(public)/`)

| Ruta | Función |
|------|---------|
| `/` | Home: hero, banner EN VIVO, grid de torneos |
| `/torneos` | Lista de torneos |
| `/torneos/[slug]` | Detalle: categorías, tarifas, itinerario o empty state |
| `/torneos/[slug]/inscribir` | Inscripción 3 pasos + reutilizar clubes previos + borrador autosave |
| `/itinerarios` | Torneos con itinerario publicado y marcadores |

### Rutas admin (`v2/src/app/admin/`)

| Ruta | Función |
|------|---------|
| `/admin/login` | Login (cookie firmada) |
| `/admin` | Dashboard: métricas + accesos a módulos |
| `/admin/torneos` | Lista con búsqueda/filtro |
| `/admin/torneos/nuevo` | Wizard 4 pasos (datos → divisiones/categorías → tarifas → resumen) |
| `/admin/torneos/[slug]?tab=` | Detalle: resumen \| configuracion \| categorias \| inscripciones \| itinerario |
| `/admin/torneos/[slug]/itinerario` | Creador de bracket: equipos elegibles, single elim o pools+bracket, horarios/canchas, publicar, anotar resultados |
| `/admin/inscripciones` | Tabla global con filtros y cambio de status |
| `/admin/inscripciones/[id]` | Detalle editable |
| `/admin/equipos` | Clubes con búsqueda |
| `/admin/equipos/[clubSlug]` | Perfil + equipos |
| `/admin/equipos/[clubSlug]/roster/[rosterId]` | Editor de roster |
| `/admin/torneos-activos` | Torneos en vivo con link al creador de itinerario |

### API (`v2/src/app/api/`)

| Método | Ruta | Auth | Uso |
|--------|------|------|-----|
| POST | `/api/auth/login` | — | Sesión admin |
| POST | `/api/auth/logout` | cookie | Cerrar sesión |
| GET | `/api/auth/me` | cookie | Operador actual |
| GET/POST | `/api/tournaments` | POST admin | Listar / crear torneo |
| GET/PATCH/DELETE | `/api/tournaments/[slug]` | PATCH/DELETE admin | Detalle / editar / borrar |
| POST | `/api/registrations` | — | Inscripción pública |
| PATCH | `/api/registrations/[id]` | admin | Cambiar status / editar |
| GET | `/api/reuse?q=&exclude=` | — | Buscar clubes para reutilizar |
| PATCH | `/api/clubs/[slug]` | admin | Perfil de club |
| PATCH | `/api/rosters/[id]` | admin | Editor de roster |

### Código clave (`v2/src/lib/`)

| Archivo | Rol |
|---------|-----|
| `types.ts` | Modelo de datos + helpers (tarifas, labels, fechas) |
| `store.ts` | Lectura/escritura JSON + seed al primer arranque |
| `seed.ts` | Datos demo (torneos, clubes, admin) |
| `auth.ts` | Cookie de sesión admin |
| `schedule-engine.ts` | Brackets, pools, asignación de horarios, resolución de ganadores |

### Flujo end-to-end recomendado (demo)

1. Admin → **Copa 30 Summer** → tab **Itinerario** → generar bracket con inscripciones pagadas/aprobadas → **Publicar**.
2. Público → **Copa 30 Summer** → **Inscribir** → buscar "Caribe" en reutilizar datos → completar categoría y firma.
3. Admin → **Inscripciones** → cambiar status a **Pagado** o **Aprobado**.
4. Público → **Itinerarios** → ver partidos; admin → **Copa Isla** → anotar marcadores en vivo.

### Fuera de alcance en v2 (por diseño)

Import CSV, PDF por email, registro de club `/equipo`, migración Postgres, split de deploys Vercel.

### Documentación adicional

- Detalle técnico: [`v2/README.md`](v2/README.md)

---

## App original (raíz del repo) — producción

El app en la **raíz** (`npm run dev` puerto 3000) sigue siendo el de **producción** con Postgres (Railway) y split Vercel.

### Split Vercel — público + admin

| Proyecto | Obligatorias | No poner |
|----------|--------------|----------|
| **Público** | `NEXT_PUBLIC_APP_SURFACE=public`, `DATABASE_URL_POOLED`, `NEXT_PUBLIC_ADMIN_APP_URL` | `ADMIN_SESSION_SECRET` |
| **Admin** | `NEXT_PUBLIC_APP_SURFACE=admin`, `DATABASE_URL_POOLED`, `ADMIN_SESSION_SECRET` | — |

**Admin producción:** `https://volley-schedule-admin.vercel.app`

### UX redesign (jun 2026) — implementado en app original

- Portal de Administrador: design system, sidebar, breadcrumbs, dashboard, wizard torneos, tabs, filtros.
- Web pública: inscripción por pasos, reutilizar datos, borrador autosave, itinerarios con empty states.
- Verificación: `npm run build` + `npm test` (74 tests) en la **raíz**.

---

## Arranque local — resumen

```powershell
# App original (producción local, puerto 3000)
cd "C:\Dev\volleyschedule-registrations"
npm install
npm run dev

# VolleyHub PR — demo nuevo (puerto 3001)
cd "C:\Dev\volleyschedule-registrations\v2"
npm install
npm run dev
```

Simular split del app original (dos terminales):

```powershell
# Público (3000)
$env:NEXT_PUBLIC_APP_SURFACE="public"; $env:NEXT_PUBLIC_ADMIN_APP_URL="http://localhost:3001"; npm run dev

# Admin (3001)
cd v2   # o el admin original en raíz con surface=admin
$env:NEXT_PUBLIC_APP_SURFACE="admin"; npm run dev -- -p 3001
```

---

## Próximos pasos (si retomas)

### VolleyV2 (`v2/`)

1. Poner `DATABASE_URL` en `v2/.env.local` y probar flujos en http://localhost:3001 (siembra sola al primer arranque).
2. Deploy a Vercel: definir `DATABASE_URL` (y/o `DATABASE_URL_POOLED`) en el proyecto; no requiere paso de migración.
3. Decidir si v2 reemplaza al app original como producción o si se siguen migrando ideas pieza por pieza.

### App original (producción)

1. Completar **setup IT maestro** en `/admin/setup` si `needsSetup: true`.
2. Rotar contraseña Postgres si se expuso en chat; actualizar `DATABASE_URL` en Vercel.
3. Redeploy ambos proyectos Vercel tras commits de UX (`551443f`).

---

## Cómo seguir en otra PC

```powershell
git clone https://github.com/Gerardito24/Volley-Schedule.git
cd Volley-Schedule
git pull origin main
npm install          # app original
cd v2 && npm install # VolleyHub PR
npm run dev          # desde v2 → puerto 3001
```

---

*Actualizado jun 2026 — incluye VolleyHub PR (`v2/`) y estado del app original.*
