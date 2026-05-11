# Stack técnico (MVP)

Decisión para **Velocidad + un solo codebase** para sitio de equipos y panel de organizadores.

## Elegido

| Capa | Elección | Motivo |
|------|-----------|--------|
| Framework | **Next.js** (App Router) + TypeScript | SSR/SEO para páginas públicas de torneo, API routes para webhooks de pago |
| Auth + DB + Storage | **Supabase** | Auth (email/magic link), Postgres, buckets para waivers/rosters, RLS por rol |
| Hosting app | **Vercel** (staging + prod) | Integración nativa con Next.js; preview deployments por PR |
| Pagos | **Stripe** (Checkout + webhooks) | API estable, tarjetas; en PR muchos usuarios también usan transfer/ATH — ver alternativas |
| Email transaccional | **Resend** o **SendGrid** | Confirmaciones de inscripción y recordatorios (configurar después del MVP de datos) |

## Pagos en Puerto Rico

- **Stripe**: funciona bien para tarjetas internacionales y billing online; verificar cuenta Stripe según país de operación del negocio y necesidad de **IVU / factura**.
- **ATH Móvil / transferencias**: si el volumen es mayormente local, el MVP puede incluir estado **“marcado como pagado (pendiente verificación)”** para transferencias y conciliación manual en el admin.
- **PayPal**: opción si ya lo usan; integración similar vía webhooks.

**Recomendación MVP**: Stripe Checkout para el camino feliz + estado `pending_payment` con **referencia de transferencia** opcional para no bloquear clubs que no usan tarjeta.

## Estructura del monorepo

Por ahora un solo paquete npm en `volleyschedule-registrations/`:

- `src/app/(public)/...` — vistas equipos
- `src/app/(admin)/...` — rutas protegidas para organizadores (middleware + Supabase session)
- `supabase/migrations/` — esquema Postgres versionado

## Variables de entorno

Ver `.env.example` en la raíz del proyecto.
