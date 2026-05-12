# Volley-Schedule — cierre de sesión (ruben.md)

Documento de mano para retomar sin perder contexto. **No sustituye** el README del repo; resume estado real y últimos commits.

## Repo y remoto

- **Ruta local (esta copia):** `C:\Users\Admin\OneDrive\Desktop\ZD - Copy\Volley-Schedule`
- **GitHub:** `https://github.com/Gerardito24/Volley-Schedule`
- **Rama:** `main` (alineada con `origin/main` al cerrar esta sesión)

## HEAD reciente (`git log`)

| Commit     | Descripción breve |
| ---------- | ----------------- |
| `19cac6e`  | iOS/macOS: safe areas, `min-h-dvh`, header público responsive, CTAs ~44px, admin drawer `<lg` + overlay |
| `9cb9802`  | Admin: perfiles operador, login, setup, `AdminShell`, store + Vitest |
| `7c4ea2f`  | Logo custom en header (`/volleyschedule-logo.png`) |

## Plan móvil iOS / macOS (referencia)

El plan en Cursor (`ios_mobile_ux_polish_67953e17`) quedó **implementado** en `19cac6e`. Resumen técnico:

1. **`src/app/layout.tsx`** — `export const viewport` (`viewportFit: 'cover'`), `themeColor`, `icons.apple` al logo.
2. **`src/app/globals.css`** — utilidades `pt-safe` / `pb-safe` / `pl-safe` / `pr-safe`; `body` con fuente del tema.
3. **Público** — `(public)/layout.tsx` (`min-h-dvh`, footer con `pb` + safe-area); `SiteHeader.tsx` (notch, pills compactas en XS, botón admin 44×44).
4. **CTAs** — `TournamentCard`, home `(public)/page.tsx`, itinerarios, detalle torneo, `TournamentRegisterForm` (pie + checkboxes + panel reutilizar).
5. **Admin** — `AdminShell` (`menuOpen`, overlay, cierre al cambiar ruta); `AdminSidebar` (`menuOpen`, fixed + translate en móvil, `lg:relative`); `AdminTopBar` (hamburguesa `<lg`).

## Arranque local

```powershell
cd "C:\Users\Admin\OneDrive\Desktop\ZD - Copy\Volley-Schedule"
npm install   # si falta node_modules
npm run dev   # frontend Next en el puerto por defecto (5173 no aplica; Next usa 3000)
```

Backend: este proyecto es **Next.js full-stack de demo** con datos mock/localStorage según módulos; no hay servidor Express separado en este repo.

## Verificación rápida antes de presentar

- `npm test` y `npm run build` pasaron tras `19cac6e`.
- En **iPhone**: refrescar el bookmark tras deploy de **Vercel**; probar `/`, `/tournaments`, `/itinerarios`, inscripción, `/admin` con menú hamburguesa.
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
