# Deploy: Vercel y/o Railway (Volley-Schedule)

Esta app es **un solo proyecto Next.js** en la raíz del repo. Los datos actuales viven en **localStorage** del navegador (no hace falta base de datos en el servidor para el MVP).

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

### Variables de entorno (opcionales)

| Variable | Cuándo usarla |
|----------|----------------|
| `NEXT_PUBLIC_ADMIN_APP_URL` | Solo si el panel admin debe abrirse en **otro dominio**. Si se omite, el icono de perfil en el header usa `/admin` en el mismo sitio. |

No es necesario configurar Supabase/Stripe para el flujo actual mock + localStorage.

### Dominio y CI

- **Settings → Domains**: añade tu dominio; Vercel indica el CNAME (p. ej. `cname.vercel-dns.com`).
- Conecta la rama `main` para **Production Deploys** en cada push.

### Checklist post-deploy

- [ ] `/` carga sin error.
- [ ] `/tournaments`, `/equipo`, `/tournaments/[slug]` funcionan.
- [ ] `/admin` y subrutas cargan en el mismo origen (o en la URL de `NEXT_PUBLIC_ADMIN_APP_URL` si la definiste).

---

## Railway (alternativa u otro entorno)

Misma app Next servida con `next start` tras `next build`.

### Pasos

1. En [Railway](https://railway.app): **New Project** → **Deploy from GitHub** → mismo repo.
2. Railway (Nixpacks) detecta Node. En **Settings** del servicio verifica:
   - **Build**: debe ejecutar `npm install` (o `npm ci`) y luego `npm run build`.
   - **Start**: `npm run start` (Next escucha el puerto en `PORT` que Railway inyecta).
3. **Generate Domain** (o dominio custom) en la pestaña **Networking**.
4. Opcional: el repo incluye [`nixpacks.toml`](../nixpacks.toml) en la raíz para fijar Node 20 y la fase de build.

### Nota

No hay backend separado en este repo: Railway no sustituye una API; solo hospeda el mismo Next que en Vercel.

---

## Archivos de referencia en el repo

- [`.env.example`](../.env.example) — variables públicas documentadas.
- [`nixpacks.toml`](../nixpacks.toml) — ayuda a Railway/Nixpacks con Node 20 y build.
