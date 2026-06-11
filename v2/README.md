# VolleyHub PR (v2)

Rediseño desde cero del website público y el Portal de Administrador de torneos de voleibol. Los datos viven en **Postgres** (tablas `vh_*`), que v2 crea y siembra con datos demo la primera vez que arranca.

## Cómo correrlo

```bash
cd v2
npm install
cp .env.example .env.local   # y edita DATABASE_URL
npm run dev
```

Necesitas una base de datos Postgres. Pon la cadena de conexión en `DATABASE_URL`
(o `DATABASE_URL_POOLED`) dentro de `.env.local`. Al primer arranque v2 crea sus
tablas `vh_*` y las siembra con los datos demo.

- Website público: http://localhost:3001
- Portal de Administrador: http://localhost:3001/admin
  - Usuario demo: `admin` · Contraseña: `volley2026`

## Qué incluye

**Público:** home con torneo "EN VIVO", lista y detalle de torneos con categorías y tarifas, itinerarios publicados con marcadores, e inscripción en 3 pasos (Equipo → Roster → Confirmación) con búsqueda de datos guardados de clubes anteriores y borrador automático.

**Admin:** login con sesión por cookie, dashboard con métricas, torneos (wizard de 4 pasos, detalle con tabs), inscripciones con filtros y cambio de estado, equipos/clubes con editor de roster, creador de itinerario por categoría (eliminación sencilla o pools + bracket, asignación automática de horarios y canchas, publicar/despublicar) y anotación de resultados en vivo.

## Arquitectura

- Next.js 16 (App Router) + TypeScript + Tailwind 4, puerto 3001.
- Una sola fuente de verdad: **Postgres**. Cada colección es una tabla `vh_<nombre>` con columnas `(id text, data jsonb)`. El cliente está en `src/lib/db.ts` (postgres.js) y el acceso a datos en `src/lib/store.ts`, consumidos por las API routes (`src/app/api/`).
- El prefijo `vh_` permite reusar el mismo Postgres del app de producción (raíz) sin chocar con sus tablas.
- Las tablas y los datos demo se crean automáticamente al primer arranque (no localStorage para datos de negocio; solo el borrador de inscripción vive en el navegador).
- Lógica de brackets en `src/lib/schedule-engine.ts` (pura, compartida entre admin y público).
- Para reiniciar los datos demo: borra las tablas `vh_*` (o `TRUNCATE`) y reinicia; v2 vuelve a sembrar.

## Deploy en Vercel

- Define `DATABASE_URL` (y/o `DATABASE_URL_POOLED`) en Project Settings → Environment Variables.
- No requiere paso de migración: las tablas `vh_*` se crean solas en la primera petición.
