# Wireframes (MVP)

Referencias de layout para **equipos** (público) y **organizadores** (admin).

Las rutas públicas viven bajo el route group `src/app/(public)/` ([`layout.tsx`](../src/app/%28public%29/layout.tsx)): comparten [`SiteHeader`](../src/components/SiteHeader.tsx). Las rutas **`/admin/**` no** muestran ese header (solo el layout del panel).

## 1. Sitio equipos

### 1.1 Home `/`

- Hero: nombre del producto + CTA “Ver torneos abiertos”.
- Enlace secundario al sitio de itinerarios [volleyschedule.com](https://www.volleyschedule.com/).

### 1.2 Lista de torneos `/tournaments`

- Tarjetas: nombre, fechas, ubicación, estado (abierto/cerrado).
- Botón **Inscribirse** solo si `status === open`.

### 1.3 Detalle + inicio de inscripción `/tournaments/[slug]`

- Resumen del torneo + **categorías** con tarifa efectiva, cupos y subdivisiones opcionales.
- CTA **Continuar inscripción** → `/tournaments/[slug]/register` (requiere sesión en implementación futura).

### 1.4 Flujo inscripción `/tournaments/[slug]/register` (mock)

Pasos sugeridos (wizard posterior):

1. Elegir categoría (y subdivisión si aplica).
2. Datos del equipo / contacto (prellenados desde perfil).
3. Pago (Stripe) o referencia de transferencia.
4. Confirmación + estado.

**Wireframe ASCII — lista**

```
+--------------------------------------------------+
| Logo    VolleySchedule Registro    [ Entrar ]    |
+--------------------------------------------------+
|  Torneos abiertos                               |
|  +-------------+  +-------------+              |
|  | Copa Summer |  | Premier 5C   |              |
|  | May 10-12   |  | Jun 1-3      |              |
|  | [Inscribir] |  | [Cerrado]    |              |
|  +-------------+  +-------------+              |
+--------------------------------------------------+
```

## 2. Panel organizador

Shell en [`src/app/admin/layout.tsx`](../src/app/admin/layout.tsx): **sidebar** oscuro ([`AdminSidebar`](../src/components/admin/AdminSidebar.tsx)) + **barra superior** ([`AdminTopBar`](../src/components/admin/AdminTopBar.tsx)) + área principal clara. Navegación: **Inicio** (`/admin`), **Torneos**, **Inscripciones**.

[`/admin`](../src/app/admin/page.tsx) muestra tarjetas de módulos (similar a un home de dashboard).

### 2.1 Lista de torneos `/admin/tournaments`

- Tarjetas con nombre, fechas (torneo + límite inscripción), ubicación, estado, categorías, tarifa mínima efectiva.
- Enlace **Crear torneo** → `/admin/tournaments/new`.
- Cada tarjeta abre el panel del torneo → `/admin/tournaments/[slug]`.
- Torneos demo vienen de mock; los creados en UI se guardan en **localStorage** del navegador y se fusionan en la lista.

### 2.2 Crear torneo `/admin/tournaments/new`

- Formulario: fechas (límite inscripción, rango torneo), imagen promo, costos base/público, **categorías** con tarifa opcional (hereda base), cupo, subdivisiones opcionales.
- Tras guardar, redirección al detalle del torneo recién creado.

### 2.3 Detalle del torneo `/admin/tournaments/[slug]`

- Resumen (nombre, fechas, ubicación, estado, descripción, slug).
- Lista de categorías con tarifa efectiva, cupo y subdivisiones.
- **Inscripciones** filtradas a ese torneo (`RegistrationTable` sin columna torneo).

### 2.4 Todas las inscripciones `/admin/registrations`

- Tabla global: torneo, categoría/división (label mock), equipo, estado, monto, fecha.
- Filtros: pendientes en una siguiente iteración.
- Acciones: export **CSV** (datos mock en MVP UI).

**Wireframe ASCII — tabla global**

```
+------------------------------------------------------------------+
| Admin    VolleySchedule                         [ Export CSV ]   |
+------------------------------------------------------------------+
| Filtros: [ Torneo v ] [ Estado v ] [ Buscar............... ]     |
+------------------------------------------------------------------+
| Torneo      Division   Equipo        Estado      Actualizado    |
| Copa Sum    16U M      Las Piedras   pending_pay   2026-05-01   |
| Copa Sum    16U M      Metro VB      approved      2026-05-02   |
+------------------------------------------------------------------+
```

## 3. Componentes compartidos

- `SiteHeader`: solo en layout público; enlaces ejemplo **Torneos (equipos)** | **Panel organizador** (`/admin`). Auth pendiente.
- `TournamentCard`, `RegistrationTable`: implementación inicial en React con datos mock.
