# VolleyHub PR (v2)

Rediseño desde cero del website público y el Portal de Administrador de torneos de voleibol. Demo 100% local: los datos viven en archivos JSON dentro de `data/` (se generan solos con datos demo la primera vez).

## Cómo correrlo

```bash
cd v2
npm install
npm run dev
```

- Website público: http://localhost:3001
- Portal de Administrador: http://localhost:3001/admin
  - Usuario demo: `admin` · Contraseña: `volley2026`

## Qué incluye

**Público:** home con torneo "EN VIVO", lista y detalle de torneos con categorías y tarifas, itinerarios publicados con marcadores, e inscripción en 3 pasos (Equipo → Roster → Confirmación) con búsqueda de datos guardados de clubes anteriores y borrador automático.

**Admin:** login con sesión por cookie, dashboard con métricas, torneos (wizard de 4 pasos, detalle con tabs), inscripciones con filtros y cambio de estado, equipos/clubes con editor de roster, creador de itinerario por categoría (eliminación sencilla o pools + bracket, asignación automática de horarios y canchas, publicar/despublicar) y anotación de resultados en vivo.

## Arquitectura

- Next.js 16 (App Router) + TypeScript + Tailwind 4, puerto 3001.
- Una sola fuente de verdad: `data/*.json` leídos/escritos por API routes (`src/app/api/`). Sin base de datos ni localStorage para datos de negocio.
- Lógica de brackets en `src/lib/schedule-engine.ts` (pura, compartida entre admin y público).
- Para reiniciar los datos demo: detén el servidor y borra la carpeta `data/`.
