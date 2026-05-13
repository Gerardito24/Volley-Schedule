# Volley-Schedule — cierre de sesión (ruben.md)

Documento de mano para retomar sin perder contexto. **No sustituye** el README del repo; resume estado real y últimos commits.

## Repo y remoto

- **Ruta local (esta copia):** `C:\Users\Admin\OneDrive\Desktop\IdeasI\volleyschedule-registrations`
- **GitHub:** `https://github.com/Gerardito24/Volley-Schedule`
- **Rama:** `main` (push a `origin/main` tras este cierre)

## HEAD reciente (`git log`)

| Commit     | Descripción breve |
| ---------- | ----------------- |
| * | Admin itinerario (workspace): configuración en `<details>` (abierta si no hay partidos), solo bracket con scroll, ocupación por cancha en segundo `<details>`, edición hora/cancha con doble clic / doble toque + botón Editar + `MatchScheduleEditDialog`, `patchAssignment` con categoría objetivo desde overview global; hook `use-double-tap`. Incluye API Drizzle/Railway y migración admin acumulados en el mismo commit. *(SHA: `git log -1 --oneline`.)* |
| `bdbd8b1`  | Admin: página dedicada de itinerario con bracket y canchas |
| `19cac6e`  | iOS/macOS: safe areas, `min-h-dvh`, header público responsive, CTAs ~44px, admin drawer `<lg` + overlay |
| `9cb9802`  | Admin: perfiles operador, login, setup, `AdminShell`, store + Vitest |
| `7c4ea2f`  | Logo custom en header (`/volleyschedule-logo.png`) |

## Itinerario admin — workspace “solo bracket” (referencia)

Implementación alineada al plan *Itinerario admin — solo bracket, scroll y doble toque*:

1. **`TournamentSchedulePanel.tsx`** — Modo `workspace`: sin grid aside ni pestañas; configuración colapsable (`configOpen` + `useEffect` según `flatRows.length`); bloque resultado con `ScheduleBracketView` compacto en contenedor `max-h-[min(70vh,720px)] overflow-auto`; segundo `<details>` “Ocupación por cancha” con `ScheduleCourtsOverview` y `onMatchRequestEdit`; diálogo `MatchScheduleEditDialog`; tabla editable solo si `!workspace`. Eliminado `WorkspaceCard` al quitar el aside.
2. **`ScheduleBracketView.tsx`** — `compact`, `onRequestEditMatch`, doble clic + `useDoubleTap` + botón Editar en tarjeta.
3. **`ScheduleCourtsOverview.tsx`** — `onMatchRequestEdit(matchId, categoryId)`; doble clic / doble toque + Editar; tipo `courtId` nullable alineado a `resolveCourtIdFromAssignment`.
4. **`MatchScheduleEditDialog.tsx`** — Modal datetime-local + cancha; `onSave` → misma validación que la tabla vía `patchAssignment`.
5. **`src/hooks/use-double-tap.ts`** — Dos `touchend` en ventana corta; umbral de movimiento para no disparar al hacer scroll.

## Plan móvil iOS / macOS (referencia)

El plan en Cursor (`ios_mobile_ux_polish_67953e17`) quedó **implementado** en `19cac6e`. Resumen técnico:

1. **`src/app/layout.tsx`** — `export const viewport` (`viewportFit: 'cover'`), `themeColor`, `icons.apple` al logo.
2. **`src/app/globals.css`** — utilidades `pt-safe` / `pb-safe` / `pl-safe` / `pr-safe`; `body` con fuente del tema.
3. **Público** — `(public)/layout.tsx` (`min-h-dvh`, footer con `pb` + safe-area); `SiteHeader.tsx` (notch, pills compactas en XS, botón admin 44×44).
4. **CTAs** — `TournamentCard`, home `(public)/page.tsx`, itinerarios, detalle torneo, `TournamentRegisterForm` (pie + checkboxes + panel reutilizar).
5. **Admin** — `AdminShell` (`menuOpen`, overlay, cierre al cambiar ruta); `AdminSidebar` (`menuOpen`, fixed + translate en móvil, `lg:relative`); `AdminTopBar` (hamburguesa `<lg`).

## Arranque local

```powershell
cd "C:\Users\Admin\OneDrive\Desktop\IdeasI\volleyschedule-registrations"
npm install   # si falta node_modules
npm run dev   # Next.js en el puerto por defecto (3000)
```

Backend: este proyecto es **Next.js full-stack de demo** con datos mock/localStorage según módulos; no hay servidor Express separado en este repo.

## Verificación rápida antes de presentar

- `npm run build` debe pasar tras cambios de admin/itinerario.
- En **iPhone**: refrescar el bookmark tras deploy de **Vercel**; probar `/`, `/tournaments`, `/itinerarios`, inscripción, `/admin` con menú hamburguesa; en **itinerario admin** probar doble toque en tarjetas del bracket y en lista por cancha.
- Variable opcional: `NEXT_PUBLIC_ADMIN_APP_URL` si el admin vive en otro dominio.

## Próximos pasos (si retomas)

- Probar en dispositivo real post-deploy.
- Opcional: PWA completa (manifest + service worker) si quieres “instalar” más allá del bookmark.
- Export / persistencia real de inscripciones si deja de ser solo mock.

## Cómo seguir en otra PC

```powershell
git clone https://github.com/Gerardito24/Volley-Schedule.git
cd Volley-Schedule
git pull origin main
npm install
npm run dev
```

---

*Generado para cerrar sesión; actualizar este archivo cuando cambie algo relevante.*
