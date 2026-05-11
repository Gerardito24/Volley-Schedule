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

- Al pulsar **Generar partidos**, el panel exige **fecha y hora del primer partido** (dentro del calendario del torneo), **duración por juego** (`H:mm` / `HH:mm` o minutos enteros) y **número de canchas**. Se generan las fases como hasta ahora y luego se rellenan `assignments[].startsAt` y `courtLabel` (`Cancha 1` … `Cancha N`) con una asignación voraz por la cancha libre antes ([`src/lib/schedule-auto-assign.ts`](../src/lib/schedule-auto-assign.ts)). Si no caben todos los partidos antes del fin del último día del torneo, se muestra error y **no** se guarda.
- En la categoría se guarda `schedulingMeta` opcional (`durationMinutes`, `courtCount`) para saber la duración usada al **editar** hora o cancha en la tabla: si dos partidos comparten la misma cancha y sus intervalos `[inicio, inicio + duración)` se solapan, el cambio se rechaza con mensaje de conflicto.

## Referencias en partidos

Cada bando de un partido (`MatchSideRef`) puede ser:

- `seed` — índice 1-based en la lista ordenada de equipos de la categoría.
- `winner` / `loser` — referencia a otro `matchId`.
- `poolStanding` — clasificado de una pool (`place` = 1 es primero).
- `bye` — pase libre.
