# Descubrimiento: VolleySchedule → app de inscripciones

Este documento sirve para **cerrar con el cliente** lo que hoy hacen en Cognito Forms y cómo cobran. Los campos inferidos son **propuesta** hasta validarlos contra un export real de Cognito.

## Contexto actual

- Sitio público: [volleyschedule.com](https://www.volleyschedule.com/) (itinerarios + enlaces “REGISTRO”).
- Cada torneo enlaza a un **formulario distinto** en Cognito Forms (`cognitoforms.com/VOLLEYSCHEDULE1/...`).
- Implicación: datos fragmentados, revisión manual y poca trazabilidad unificada por equipo.

## Checklist de entrevista con el organizador

1. **Export de muestra**: pedir CSV/Excel del último torneo desde Cognito (sin datos sensibles si prefieren; pueden anonimizar nombres).
2. **Campos obligatorios**: lista exacta y cuáles son condicionales (por categoría).
3. **Cobro**: ¿ACH, ATH Móvil, efectivo en sitio, PayPal, Stripe? ¿Anticipo vs pago completo? ¿Multiples categorías en una sola orden?
4. **Aprobación**: ¿quién marca roster “aprobado”? ¿Hay revisión legal del waiver?
5. **Cupos**: ¿límite por división? ¿lista de espera manual hoy?
6. **Comunicación**: ¿solo email o también WhatsApp para recordatorios?
7. **Idioma**: ¿formularios solo ES o ES/EN?
8. **Multi-evento**: ¿un mismo club puede inscribir varios equipos en el mismo torneo?

## Campos típicos inferidos (validar contra Cognito)

| Área | Ejemplos de campo |
|------|-------------------|
| Club / equipo | Nombre del club, nombre del equipo, ciudad, logo (opcional) |
| Contacto | Nombre del coach/manager, teléfono, email |
| Torneo | Torneo elegido (hoy implícito por URL del form), división/categoría |
| Jugadores | Lista (nombre, fecha nacimiento, # camiseta) o archivo CSV/PDF |
| Legal | Waiver firmado, política de reembolso aceptada |
| Pago | Monto, método, referencia de transferencia (si aplica) |

## Flujo de cobro (documentar el “as-is”)

Registrar aquí lo que el cliente confirme:

- **Método principal**:
- **Plazos / anticipos**:
- **Conciliación** (quién cruza banco vs lista de inscritos):
- **Recibo / factura** (¿necesitan número fiscal en PR?):

## Aprobación de roster (documentar el “as-is”)

- **Responsable**:
- **Criterios** (edad, documentos, duplicados):
- **Herramientas hoy** (email, WhatsApp, hoja de cálculo):

## Entregables tras la reunión

1. Lista final de campos MVP alineada al export de Cognito.
2. Decisión de pasarela de pago y reglas de reembolso en texto plano.
3. Matriz de roles (organizador vs staff vs equipo).
