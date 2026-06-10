# Deploy split: website público + admin app

Este repo se despliega como **dos proyectos Vercel** apuntando al mismo código y a la misma base PostgreSQL (p. ej. Railway).

La variable `NEXT_PUBLIC_APP_SURFACE` activa el middleware en [`src/middleware.ts`](../src/middleware.ts):

- **`public`**: responde **404** a `/admin/*` y `/api/admin/*`.
- **`admin`** o sin definir (dev local): sirve el panel; con DB configurada, protege `/admin/*` con sesión.

---

## Proyecto 1: Website público

| Setting | Valor |
|---------|-------|
| Dominio | dominio principal (p. ej. `registro.tudominio.com`) |
| Root Directory | raíz del repo |
| Build Command | `npm run build` |
| Node | 20.x |

### Variables de entorno

| Variable | Requerida | Notas |
|----------|-----------|-------|
| `NEXT_PUBLIC_APP_SURFACE` | **Sí** | `public` |
| `DATABASE_URL` o `DATABASE_URL_POOLED` | Recomendada | Misma DB que el admin |
| `NEXT_PUBLIC_ADMIN_APP_URL` | Recomendada | URL base del admin **sin barra final** (p. ej. `https://admin.tudominio.com`). Sin esto, no hay enlaces visibles al panel desde el sitio público. |
| `RESEND_API_KEY`, `RESEND_FROM` | Si usas `/equipo` | Envío de PDF tras registro |
| `ORGANIZER_BCC` | Opcional | Copia oculta al organizador |

**No** configures `ADMIN_SESSION_SECRET` en este proyecto.

### Rutas activas

- `/`, `/tournaments`, `/tournaments/[slug]`, `/tournaments/[slug]/register`
- `/itinerarios`, `/equipo`
- `/api/public/*`, `/api/club-registration/*`

### Bloqueadas en este deploy

- `/admin/*` → 404
- `/api/admin/*` → 404

---

## Proyecto 2: Admin app

| Setting | Valor |
|---------|-------|
| Dominio | subdominio admin (p. ej. `admin.tudominio.com`) |
| Root Directory | raíz del repo |
| Build Command | `npm run build` |
| Node | 20.x |

### Variables de entorno

| Variable | Requerida | Notas |
|----------|-----------|-------|
| `NEXT_PUBLIC_APP_SURFACE` | **Sí** | `admin` |
| `DATABASE_URL` o `DATABASE_URL_POOLED` | **Sí** | Misma DB que el público |
| `ADMIN_SESSION_SECRET` | **Sí** | Secreto largo y aleatorio (solo en este proyecto) |
| `RESEND_*`, `ORGANIZER_BCC` | Opcional | Si el admin envía correos |

### Primera configuración del IT maestro (Postgres vacía)

1. Abre `https://admin.tudominio.com/admin/setup` — crea el perfil IT maestro en la base de datos.
2. Alternativa: importar desde localStorage en `/admin/db-migration` si ya tenías operadores en el navegador.

API: `GET/POST /api/admin/setup` (solo cuando no hay operadores en la DB).

### Rutas admin

- `/admin`, `/admin/login`, `/admin/setup`
- `/admin/tournaments`, `/admin/registrations`, `/admin/profiles`, `/admin/equipos`
- `/admin/tournaments/[slug]/schedule`
- `/admin/db-migration` (temporal; quitar cuando termine la migración)

---

## Comprobar variables localmente

Copia las variables de cada proyecto Vercel a `.env.local` y ejecuta:

```bash
npm run check:deploy-env public
npm run check:deploy-env admin
```

---

## Desarrollo local

Sin `NEXT_PUBLIC_APP_SURFACE` (o cualquier valor distinto de `public`/`admin`), la app sirve **ambas superficies** en `localhost:3000`:

- `/` y rutas públicas
- `/admin` con protección de sesión cuando hay DB

Para probar el split:

```bash
# Terminal 1 — simular deploy público
NEXT_PUBLIC_APP_SURFACE=public NEXT_PUBLIC_ADMIN_APP_URL=http://localhost:3001 npm run dev

# Terminal 2 — simular deploy admin (otro puerto)
NEXT_PUBLIC_APP_SURFACE=admin npm run dev -- -p 3001
```

---

## Railway PostgreSQL

1. Crear PostgreSQL en Railway.
2. Copiar el connection string.
3. Agregarlo como `DATABASE_URL` en **ambos** proyectos Vercel.
4. Preferir `DATABASE_URL_POOLED` en Vercel si usas pooler.
5. Ejecutar migración inicial (una vez):

```bash
npm run db:migrate
```

Las migraciones en Railway pueden ejecutarse vía `releaseCommand` en `railway.toml`; Vercel no las corre automáticamente.

---

## Nota de migración

La primera fase usa tablas `JSONB-first`, alineadas al modelo actual de la app. Esto permite compartir datos entre navegadores sin rediseñar inmediatamente categorías, matches y rosters en muchas tablas relacionales.
