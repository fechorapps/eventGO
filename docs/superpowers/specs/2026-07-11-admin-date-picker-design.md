# Calendario premium en el panel de admin

**Fecha:** 2026-07-11
**Estado:** Aprobado

## Objetivo

Reemplazar los dos selectores de fecha nativos del navegador en el panel de
administración por un calendario con estética premium acorde al diseño
dorado/oscuro del admin, usando `react-day-picker` estilizado con Tailwind CSS.

## Alcance

Solo los dos campos del formulario de eventos en `src/app/admin/page.tsx`:

1. **Fecha y Hora del Evento** (`form-date`, hoy `<input type="datetime-local">`)
2. **Fecha límite para Confirmar Asistencia** (`form-deadline`, hoy `<input type="date">`)

Fuera de alcance: la página pública de la invitación y cualquier otro campo.

## Diseño

### Componente: `src/components/DateField.tsx`

Client component único y reutilizable.

**Props:**

- `id: string` — id del botón (los `<label htmlFor>` existentes siguen funcionando)
- `value: string` — `YYYY-MM-DDTHH:mm` (con hora) o `YYYY-MM-DD` (sin hora); `""` = vacío
- `onChange(value: string): void` — emite el mismo formato que recibe
- `withTime?: boolean` — muestra selector de hora bajo el calendario (default `false`)
- `required?: boolean`

**Comportamiento:**

- Botón con la misma apariencia que `.rsvp-input`; muestra la fecha formateada
  en español ("14 de febrero de 2027, 6:00 PM") o el placeholder
  "Seleccionar fecha".
- Clic abre un popover con `<DayPicker>` (react-day-picker v9): navegación por
  meses, dropdown de año, locale español.
- En modo `withTime`, bajo el calendario hay un `<input type="time">` estilizado;
  elegir día no cierra el popover (se cierra con clic fuera, Escape o botón "Listo").
  En modo fecha, elegir un día cierra el popover.
- Popover propio: `useRef` + listener de clic-fuera y tecla Escape. Sin
  dependencias adicionales de posicionamiento.

**Contrato de datos sin cambios:** el componente consume y produce los mismos
strings que los estados actuales (`formDate`, `formRsvpDeadline`), por lo que el
guardado, la validación y la API no se tocan.

### Estética

Clases Tailwind referenciando las variables CSS existentes del admin
(`var(--gold-dark)`, fondos oscuros, bordes suaves): día seleccionado en dorado,
hover sutil, tipografía consistente con el resto del panel.

### Dependencias

- `@daypicker/react` (^10, nombre nuevo de react-day-picker) — incluye locale
  español (re-export de date-fns).

## Manejo de errores

- `value` vacío o no parseable → se muestra el placeholder y el calendario abre
  en el mes actual.
- `required` se preserva: el botón lleva un `<input>` oculto que participa en la
  validación nativa del formulario.

## Verificación

1. `npm run build` sin errores.
2. Prueba visual en el navegador: crear y editar un evento, seleccionar fecha y
   hora, verificar formato mostrado en español.
3. Confirmar que el valor guardado llega a la base de datos igual que antes.
