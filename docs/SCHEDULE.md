# Itinerario y brackets (MVP)

Los torneos pueden incluir un objeto `schedule` (ver [`src/lib/schedule-types.ts`](../src/lib/schedule-types.ts)) persistido junto al torneo en **localStorage** (y en el futuro en Supabase).

## Plantillas soportadas

### `single_elim`

- **Parámetros:** número de equipos `teamCount` (≥ 2).
- **Comportamiento:** bracket de eliminación simple; tamaño de bracket = siguiente potencia de 2; huecos sobrantes son **BYE** con orden de cabezas de serie estándar (`bracketSeedLines`).

### `pools_round_robin` + `pools_to_bracket` (conjunto)

- **Parámetros:**
  - `teamCount` — total de equipos.
  - `poolCount` — número de pools (≥ 2); los seeds se reparten en round-robin (`seed 1 → pool A`, `seed 2 → pool B`, …).
  - `advancePerPool` — cuántos clasificados por pool entran al bracket (≥ 1).
- **Fase 1:** en cada pool, **todos contra todos** una vez (única ronda).
- **Fase 2:** bracket eliminatorio; los lados de la primera ronda son referencias `poolStanding` (`poolId` + `place` 1..N). El orden de entrada al bracket es: *1º pool A, 2º pool A, 1º pool B, 2º pool B, …*.

## Seeds desde inscripciones (admin)

- En **Itinerario y brackets**, la lista previa se arma con inscripciones mergeadas (seed + [`local-registrations`](../src/lib/local-registrations.ts)) del torneo, filtradas por categoría y opcionalmente por subdivisión.
- Solo entran equipos con estado **`paid`** o **`approved`**.
- El orden inicial es **`registeredAt`** ascendente (primero inscrito = seed 1). El organizador puede **subir/bajar** filas antes de **Generar partidos**; hay sección opcional para equipos **manuales** y un botón para **refrescar** desde inscripciones (revierte orden manual).
- Las inscripciones nuevas desde `/tournaments/[slug]/register` empiezan como `pending_payment`; el panel de admin puede cambiar el estado en la tabla (**Cambiar (local)**) para marcar pagado/aprobado en este navegador.

## Publicación

- `TournamentScheduleMock.published === true` y datos en `categorySchedules` hace visible el bloque **Itinerario publicado** en la página pública del torneo (el cliente combina seed + localStorage).

## Auto-itinerario y canchas (admin)

- Las canchas físicas salen de las **sedes del torneo** (`venues[].courtCount` ≥ 1). La utilidad [`flattenTournamentCourts`](../src/lib/tournament-courts.ts) arma una lista global (`v0-c1`, …) con etiquetas tipo `Sede · Cancha 1`. Si ninguna sede tiene cantidad definida, el panel muestra un aviso y no permite generar con recurso compartido.
- En **Itinerario y brackets**, cada categoría marca **qué canchas puede usar** (checkboxes). Al pulsar **Generar partidos** se exigen fecha/hora del primer partido, duración por juego y al menos una cancha marcada. La asignación usa [`assignSlotsGreedyShared`](../src/lib/schedule-auto-assign.ts): voraz sobre el subconjunto elegido y teniendo en cuenta **ocupación previa** de otras categorías (`buildOccupancyFromSchedules`). Cada partido guarda `courtId` (estable) y `courtLabel` (legible). Si no cabe el calendario o choca con otras categorías en las mismas canchas, se muestra error y **no** se guarda.
- En `schedulingMeta` se guardan `durationMinutes`, `courtCount` (igual al número de canchas marcadas) y `allowedCourtIds` (ids globales). Al **editar** hora o cancha, [`findGlobalAssignmentConflict`](../src/lib/schedule-auto-assign.ts) valida solapes entre **todas** las categorías, usando la duración de cada una para el intervalo `[inicio, inicio + duración)`.
- **Datos legacy** (solo `Cancha N` sin sede): al resolver ocupación o conflictos, `Cancha k` se mapea a la **k-ésima** cancha global del torneo. Si el número excede las canchas definidas hoy, ese partido no aporta bloques de ocupación hasta regenerar el itinerario.

## Referencias en partidos

Cada bando de un partido (`MatchSideRef`) puede ser:

- `seed` — índice 1-based en la lista ordenada de equipos de la categoría.
- `winner` / `loser` — referencia a otro `matchId`.
- `poolStanding` — clasificado de una pool (`place` = 1 es primero).
- `bye` — pase libre.
