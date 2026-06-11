# Volley-Schedule — cierre de sesión (ruben.md)

Documento de mano para retomar sin perder contexto. **No sustituye** el README del repo; resume estado real y últimos commits.

## Repo y remoto

- **Ruta local (esta copia):** `C:\Dev\volleyschedule-registrations`
- **GitHub:** `https://github.com/Gerardito24/Volley-Schedule`
- **Rama:** `main` (push a `origin/main`)

## ⚡ Estado actual (jun 2026)

**`v2/` (VolleyHub PR) ES la app de producción.** Los dos proyectos de Vercel apuntan a `v2/` (Root Directory = `v2`). El app original en la raíz del repo quedó **retirado** — se conserva solo como referencia de código.

| Proyecto Vercel | URL | Superficie |
|---|---|---|
| `volley-schedule-rb` | volley-schedule-rb.vercel.app | **Público** (website) |
| `volley-schedule-admin` | volley-schedule-admin.vercel.app | **Admin** (portal) |

Ambos usan el **mismo Postgres de Railway** (tablas con prefijo `vh_`, se crean y siembran solas al primer arranque).

## HEAD reciente (`git log`)

| Commit | Descripción breve |
| ------ | ----------------- |
| `231a552` | Export CSV/imprimir inscripciones + menús ⋯ de borrado (torneo/inscripción/club/roster) |
| `9b66660` | Roster completo: coach, apoderado y jugadoras con afiliación y nacimiento |
| `26dc510` | Anotación de partidos **por sets** (25-20 · 23-25 · 15-12) |
| `4f6a916` | Estado de inscripción dividido: **aprobación** + **pago** independientes |
| `da241ee` | Upgrade portal admin: equipos por club→categoría, siembra ordenable, bracket visual, agenda general, dashboard operativo |
| `ce1422c` | Gestión de administradores con IT master protegido |
| `8db31a2` | Separación público/admin vía `APP_SURFACE` |
| `eaeeae7` | Sistema de cuentas de clientes (registro público) |
| `aa04459` | Fix build Turbopack en Vercel (stubs del app raíz) |
| `e62bb2e` | Store portado de JSON a Postgres (tablas `vh_*`) |

---

## Variables de entorno en Vercel (CRÍTICO)

| Variable | Proyecto público | Proyecto admin | Notas |
|---|---|---|---|
| `DATABASE_URL` | ✅ | ✅ | URL **pública** de Railway (`yamabiko.proxy.rlwy.net:56265`), NO la interna |
| `CLIENT_SESSION_SECRET` | ✅ | ✅ | Firma cookies de clientes; generar con `openssl rand -hex 32` |
| `APP_SURFACE` | `public` | `admin` | Candado: público no sirve `/admin` y viceversa. Sin definir = todo accesible (dev) |

Tras cambiar variables: **Redeploy** manual (Deployments → ⋯ → Redeploy).

### Pendientes de seguridad

1. **Rotar la contraseña de Postgres en Railway** (se compartió en chat) y actualizar `DATABASE_URL` en ambos proyectos Vercel.
2. Cambiar las credenciales del IT master sembrado (`admin` / `volley2026`): entrar al admin → **Administradores** → Editar tu perfil.
3. Verificar que `CLIENT_SESSION_SECRET` y `APP_SURFACE` estén puestos en ambos proyectos.

---

## VolleyHub PR (`v2/`) — funcionalidad

### Modelo de datos (Postgres, tablas `vh_*`)

Cada colección es `(id text PRIMARY KEY, data jsonb)`: `vh_tournaments`, `vh_registrations`, `vh_clubs`, `vh_rosters`, `vh_admins`, `vh_clients`. Cliente en `v2/src/lib/db.ts` (postgres.js); acceso en `v2/src/lib/store.ts`. Reset demo: `TRUNCATE` las tablas `vh_*` y reiniciar — vuelve a sembrar.

**Inscripción — dos dimensiones de estado (independientes):**
- `approval`: `pending | approved | rejected | waitlisted` — ¿puede jugar?
- `paymentStatus`: `unpaid | paid` (+ `paidAt`) — ¿pagó?
- Filas viejas con `status` combinado se migran **al leer** (`normalizeRegistration`); no hay script de migración.
- Elegible para bracket: aprobado, o pagado mientras está en revisión (`isBracketEligible`).

**Resultados por sets:** `MatchResult { home, away, sets: [{home, away}], recordedAt }` — sets ganados se derivan del detalle.

**Roster completo:** coach (nombre/tel/afiliación), apoderado (nombre/tel/afiliación), jugadoras (nombre, camisa, nacimiento, afiliación). Rosters viejos se rellenan desde la inscripción original al abrirlos.

### Cuentas de clientes (público)

- Registro/login propio: `/cuenta/registro`, `/cuenta/login`, dashboard `/cuenta` ("Mis inscripciones").
- Cookie `volleyv2_client` (30 días, HMAC con `CLIENT_SESSION_SECRET`); contraseñas con `crypto.scrypt`.
- Las inscripciones llevan `clientId` opcional; **reutilizar datos** al inscribir requiere login y muestra solo los equipos del cliente (privado).
- Admin → **Clientes**: lista de cuentas + detalle con sus inscripciones.

### Portal de Administrador

| Ruta | Función |
|------|---------|
| `/admin/login` | Login (sin pista de credenciales en producción) |
| `/admin` | Dashboard operativo: banner EN VIVO, cola "requieren acción", recaudado/por cobrar, inscripciones recientes |
| `/admin/torneos` | Tabla con ⋯ (abrir, itinerario, **eliminar** con cascada) |
| `/admin/torneos/nuevo` | Wizard 4 pasos |
| `/admin/torneos/[slug]?tab=` | resumen \| configuracion \| categorias \| inscripciones \| itinerario |
| `/admin/torneos/[slug]/itinerario` | Creador: siembra ordenable (↑↓), single elim o pools+bracket, vista **Bracket** visual, **Agenda general** cronológica con detección de conflictos de cancha, anotación **por sets**, publicar |
| `/admin/inscripciones` | Filtros por aprobación y pago, cambio inline, **⬇ Excel** (CSV), **🖨 Imprimir/PDF**, eliminar |
| `/admin/inscripciones/[id]` | Detalle + **constancia imprimible** + editor (aprobación/pago/tarifa) |
| `/admin/equipos` | Clubes con chips de categorías; búsqueda por nombre/pueblo/categoría |
| `/admin/equipos/[clubSlug]` | Equipos **agrupados por categoría** + eliminar club |
| `/admin/equipos/[clubSlug]/roster/[id]` | Editor completo (coach/apoderado/jugadoras) + eliminar equipo |
| `/admin/clientes` y `/admin/clientes/[id]` | Cuentas de clientes y sus inscripciones |
| `/admin/administradores` | Crear/editar/eliminar operadores. **IT master**: solo se edita a sí mismo, no es eliminable |
| `/admin/torneos-activos` | Torneos en vivo → anotar resultados |

### API principal (`v2/src/app/api/`)

| Método | Ruta | Auth | Uso |
|--------|------|------|-----|
| POST | `/api/auth/login` `/logout` | — / cookie | Sesión admin (`volleyv2_admin`) |
| POST/PATCH/DELETE | `/api/admin/operators[/[id]]` | admin | Gestión de administradores |
| POST | `/api/client/auth/register` `/login` `/logout` `/me` | — | Cuentas de clientes |
| GET/POST | `/api/tournaments` · GET/PATCH/DELETE `/[slug]` | escritura admin | DELETE = cascada (inscripciones+rosters) |
| POST | `/api/registrations` | — | Inscripción pública (asocia `clientId` si hay sesión) |
| PATCH/DELETE | `/api/registrations/[id]` | admin | Editar (estampa `paidAt`) / borrar con roster |
| GET | `/api/reuse?q=&exclude=` | cliente | Solo equipos del cliente; `requiresLogin:true` sin sesión |
| PATCH/DELETE | `/api/clubs/[slug]` | admin | Perfil / borrar club+rosters (inscripciones se conservan) |
| PATCH/DELETE | `/api/rosters/[id]` | admin | Editor / borrar roster |

### Código clave (`v2/src/lib/`)

| Archivo | Rol |
|---------|-----|
| `types.ts` | Modelo + `normalizeRegistration`, `isBracketEligible`, `formatSetScores`, labels |
| `store.ts` | Postgres CRUD + seed + deletes en cascada |
| `seed.ts` | Datos demo (3 torneos, 8 clubes, resultados por sets) |
| `auth.ts` / `client-auth.ts` | Sesión admin / sesión cliente |
| `admin-operators.ts` | Reglas IT master / administradores |
| `schedule-engine.ts` | Brackets, pools, horarios, resolución de ganadores |
| `../middleware.ts` | Candado `APP_SURFACE` (public/admin/all) |

### Notas de build (Vercel + Turbopack)

- Turbopack escanea el repo completo desde `.git` → existen **stubs** en `v2/src/lib/` (`app-surface.ts`, `admin-session-constants.ts`) para que el middleware del app raíz compile. **No borrarlos.**
- El root `tsconfig.json` excluye `v2/`; v2 tiene su propio middleware.
- Verificación: `cd v2 && npm run build` (debe pasar limpio).

---

## Arranque local

```powershell
cd "C:\Dev\volleyschedule-registrations\v2"
npm install                          # solo la primera vez
Copy-Item .env.example .env.local    # editar DATABASE_URL (+ CLIENT_SESSION_SECRET)
npm run dev                          # http://localhost:3001
```

| URL | Qué es |
|-----|--------|
| http://localhost:3001 | Website público |
| http://localhost:3001/admin | Portal de Administrador |

**Credenciales demo (solo si la DB está recién sembrada):** `admin` / `volley2026`. En producción cámbialas en **Administradores**.

Sin `APP_SURFACE` definido en local se sirve todo (público + admin) en el mismo puerto.

---

## Flujo end-to-end (smoke test)

1. Público → crear cuenta en `/cuenta/registro` → inscribir equipo en un torneo abierto (apoderado con afiliación, jugadoras completas).
2. Admin → **Inscripciones** → aprobar y marcar **Pagado** (un click) → ver en dashboard cómo baja "por cobrar".
3. Admin → torneo → **Itinerario** → ordenar siembra → generar → revisar **Agenda general** (sin conflictos) → **Publicar**.
4. Anotar un partido **por sets** → ver bracket avanzar → público ve el marcador y los sets en `/itinerarios`.
5. **⬇ Excel** y **🖨 Imprimir/PDF** desde Inscripciones; constancia desde el detalle.

---

## Próximos pasos (ideas pendientes)

- Imprimir el itinerario/bracket completo de un torneo (hoy solo inscripciones).
- Emails de confirmación a clubes (inscripción recibida / aprobada / pago).
- Editar datos del equipo desde la inscripción (hoy inscripción y roster se editan por separado).
- Drag-and-drop en la agenda general; filtros por categoría.
- Retirar el proyecto Vercel sobrante si se decide servir todo desde uno.

---

## Cómo seguir en otra PC

```powershell
git clone https://github.com/Gerardito24/Volley-Schedule.git
cd Volley-Schedule\v2
npm install
# .env.local con DATABASE_URL y CLIENT_SESSION_SECRET
npm run dev   # puerto 3001
```

---

*Actualizado 11 jun 2026 — v2 es producción (cuentas de clientes, aprobación+pago, sets, roster completo, export/borrado, administradores).*
