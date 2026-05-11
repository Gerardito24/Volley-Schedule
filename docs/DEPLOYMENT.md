# Deploy de staging (primer entorno)

## Prerrequisitos

1. Cuenta en [Vercel](https://vercel.com/).
2. Proyecto en Supabase (opcional para UI mock): crear proyecto y ejecutar `supabase/migrations/001_initial_schema.sql` en el SQL Editor.
3. Repositorio Git (GitHub/GitLab/Bitbucket) con este código.

## Pasos Vercel

1. **Import project** → seleccionar el repo que contiene `volleyschedule-registrations/` (o subir esta carpeta como raíz del repo).
2. **Root Directory**: si el repo es solo esta app, dejar vacío; si es monorepo, apuntar a `volleyschedule-registrations`.
3. **Framework**: Next.js (auto-detectado).
4. **Environment Variables** (staging):

   | Variable | Descripción |
   |----------|-------------|
   | `NEXT_PUBLIC_SITE_URL` | URL del deploy, ej. `https://volleyschedule-registrations-xxx.vercel.app` |
   | `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon key |
   | `SUPABASE_SERVICE_ROLE_KEY` | solo server/webhooks; no exponer al cliente |

   Variables de Stripe cuando exista checkout: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`.

5. Deploy → cada push a la rama configurada genera **Preview**; producción puede ser `main`.

## Dominio personalizado (staging)

- En Vercel: **Settings → Domains** → agregar `registro.volleyschedule.com`.
- En DNS del proveedor del dominio: registro **CNAME** `registro` → `cname.vercel-dns.com` (valor exacto lo muestra Vercel).

## Checklist post-deploy

- [ ] Home carga y enlaza a `/tournaments`.
- [ ] Ruta `/tournaments/[slug]` resuelve para slugs mock.
- [ ] `/admin/registrations` muestra tabla mock y export CSV funciona en el navegador.
