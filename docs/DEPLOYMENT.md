# Deploy: Vercel y/o Railway (Volley-Schedule)

Esta app es **un solo proyecto Next.js** en la raíz del repo. Puede desplegarse como un solo sitio o como **dos proyectos Vercel** (público + admin); ver [DEPLOY_SPLIT.md](DEPLOY_SPLIT.md).

Con PostgreSQL configurado, torneos e inscripciones se comparten entre navegadores. Sin DB, el fallback usa **localStorage** por origen (no se comparte entre dominios distintos).

Elige **una URL canónica** para usuarios finales (recomendado: Vercel). Desplegar en Vercel y Railway a la vez da dos orígenes distintos: el `localStorage` no se comparte entre dominios.

---

## Vercel (recomendado)

### Prerrequisitos

1. Cuenta en [Vercel](https://vercel.com/).
2. Repo en GitHub con este código (por ejemplo `Gerardito24/Volley-Schedule`).

### Pasos

1. En Vercel: **Add New Project** → **Import** el repositorio.
2. **Root Directory**: dejar la raíz del repo (no hay monorepo en este proyecto).
3. **Framework Preset**: Next.js (autodetectado).
4. **Build Command**: `npm run build` (por defecto).
5. **Install Command**: `npm install` o `npm ci` (por defecto).
6. **Node**: 20.x (alineado con `engines` en `package.json`).

### Variables de entorno

| Variable | Cuándo usarla |
|----------|----------------|
| `NEXT_PUBLIC_APP_SURFACE` | `public` o `admin` en cada proyecto Vercel del split. Ver [DEPLOY_SPLIT.md](DEPLOY_SPLIT.md). |
| `DATABASE_URL` / `DATABASE_URL_POOLED` | PostgreSQL compartido (Railway u otro). |
| `ADMIN_SESSION_SECRET` | Solo en el proyecto **admin**. |
| `NEXT_PUBLIC_ADMIN_APP_URL` | En el proyecto **público**: URL del admin en otro dominio. |
| `RESEND_*` | Envío de PDF en `/equipo`. |

Para el split público/admin completo, sigue [DEPLOY_SPLIT.md](DEPLOY_SPLIT.md).

### Dominio y CI

- **Settings → Domains**: añade tu dominio; Vercel indica el CNAME (p. ej. `cname.vercel-dns.com`).
- Conecta la rama `main` para **Production Deploys** en cada push.

### Checklist post-deploy

- [ ] `/` carga sin error.
- [ ] `/tournaments`, `/equipo`, `/tournaments/[slug]` funcionan.
- [ ] Proyecto **público**: `/admin` responde 404; enlaces al panel apuntan a `NEXT_PUBLIC_ADMIN_APP_URL` si está definida.
- [ ] Proyecto **admin**: `/admin/login` y subrutas cargan con `ADMIN_SESSION_SECRET` configurado.

---

## Railway (alternativa u otro entorno)

Misma app Next servida con `next start` tras `next build`.

### Pasos

1. En [Railway](https://railway.app): **New Project** → **Deploy from GitHub** → mismo repo.
2. Railway (Nixpacks) detecta Node. El repo incluye [`nixpacks.toml`](../nixpacks.toml): instala con `npm install` (no `npm ci`) para evitar fallos si `package-lock.json` va un commit desfasado respecto a `package.json`; igual conviene mantener el lock actualizado en local (`npm install`) y hacer commit. En **Settings** del servicio verifica **Start**: `npm run start` (Next usa `PORT` que Railway inyecta).
3. **Generate Domain** (o dominio custom) en la pestaña **Networking**.

### Nota

No hay backend separado en este repo: Railway no sustituye una API; solo hospeda el mismo Next que en Vercel.

---

## Archivos de referencia en el repo

- [`.env.example`](../.env.example) — variables públicas documentadas.
- [`nixpacks.toml`](../nixpacks.toml) — ayuda a Railway/Nixpacks con Node 20 y build.
