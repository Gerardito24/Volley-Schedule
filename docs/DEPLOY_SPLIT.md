# Deploy split: website público + admin app

Este repo puede desplegarse como dos proyectos Vercel apuntando al mismo código y a la misma base PostgreSQL de Railway.

## Proyecto 1: Website público

- Dominio recomendado: el dominio principal del torneo.
- Variables:
  - `DATABASE_URL` o `DATABASE_URL_POOLED`
  - `NEXT_PUBLIC_APP_SURFACE=public`
- Rutas públicas usadas:
  - `/`
  - `/tournaments`
  - `/tournaments/[slug]`
  - `/tournaments/[slug]/register`
  - `/itinerarios`

## Proyecto 2: Admin app

- Dominio recomendado: `admin.<dominio>` o subdominio separado.
- Variables:
  - `DATABASE_URL` o `DATABASE_URL_POOLED`
  - `ADMIN_SESSION_SECRET`
  - `NEXT_PUBLIC_APP_SURFACE=admin`
- Rutas admin:
  - `/admin`
  - `/admin/login`
  - `/admin/tournaments`
  - `/admin/tournaments/[slug]`
  - `/admin/tournaments/[slug]/schedule`
  - `/admin/db-migration` (temporal; quitar cuando termine la migración)

## Railway PostgreSQL

1. Crear PostgreSQL en Railway.
2. Copiar el connection string.
3. Agregarlo como `DATABASE_URL`.
4. Si usas pooler, preferir `DATABASE_URL_POOLED` para Vercel.
5. Ejecutar migración inicial:

```bash
npx drizzle-kit migrate
```

## Nota de migración

La primera fase usa tablas `JSONB-first`, alineadas al modelo actual de la app. Esto permite compartir datos entre navegadores sin rediseñar inmediatamente categorías, matches y rosters en muchas tablas relacionales.
