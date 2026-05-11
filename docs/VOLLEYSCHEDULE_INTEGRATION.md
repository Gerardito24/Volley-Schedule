# Integración con volleyschedule.com

El sitio actual sigue siendo la **vitrina** (itinerarios, marca, enlaces por ciudad). La nueva app concentra **inscripciones, pagos y estado**.

## Opciones de enlace

| Opción | URL ejemplo | Pros | Contras |
|--------|-------------|------|---------|
| Subdominio | `https://registro.volleyschedule.com` | Claro para usuarios, cookies aisladas | Requiere DNS CNAME al hosting (Vercel) |
| Path en mismo dominio | Solo si Wix permite proxy externo (limitado) | Una marca | Wix no hospeda Next.js fácilmente |
| Dominio corto nuevo | `https://inscribete.ejemplo.com` | Rápido si DNS del dominio principal es complejo | Menos reconocimiento de marca |

**Recomendación**: subdominio `registro.volleyschedule.com` → proyecto Vercel del repo `volleyschedule-registrations`.

## Cambios en el menú del sitio actual

Por cada ítem **REGISTRO …** que hoy apunta a Cognito:

1. Crear el torneo en la nueva app con el mismo **nombre visible** y un `slug` estable (ej. `copa-30-summer-2026`).
2. Sustituir el enlace Cognito por:
   `https://registro.volleyschedule.com/tournaments/{slug}`
3. Opcional: parámetro UTM para analítica: `?utm_source=volleyschedule&utm_medium=menu`.

## Redirecciones legacy

Mantener durante 1–2 temporadas:

- Lista de Cognito URL → nueva URL (301 si el CMS lo permite; si no, texto “Actualizamos el registro” en la página vieja).

## SEO

- Páginas públicas `/tournaments/[slug]` deben tener `title` y `description` por torneo (Next.js `metadata`).

## Seguridad

- No incrustar iframes de Cognito para nuevos torneos; un solo flujo reduce fraude y errores de datos.
