# Calendario premium en el admin — Plan de Implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar los dos inputs de fecha nativos del panel de admin por un calendario `@daypicker/react` estilizado con Tailwind acorde a la estética sage/champagne del sitio.

**Architecture:** Un client component reutilizable `DateField` (botón + popover con DayPicker) que consume y emite los mismos strings que los estados actuales (`YYYY-MM-DDTHH:mm` / `YYYY-MM-DD`), de modo que la lógica de guardado no cambia. Tailwind v4 se activa importando solo `theme` y `utilities` (sin preflight) para no alterar el CSS existente.

**Tech Stack:** Next.js 16.2.10 (App Router), Tailwind CSS v4 (ya en deps, aún no importado), `@daypicker/react` v10, lucide-react (ya instalado).

## Global Constraints

- El spec vive en `docs/superpowers/specs/2026-07-11-admin-date-picker-design.md`.
- NO importar `tailwindcss/preflight.css` — el reset global rompería el diseño actual.
- Formatos de valor exactos: `YYYY-MM-DDTHH:mm` (con hora) y `YYYY-MM-DD` (sin hora); `""` = vacío. `src/app/admin/page.tsx:649` hace `new Date(formDate).toISOString()` — el string debe seguir siendo parseable por `new Date()`.
- El proyecto no tiene framework de tests (scripts: dev/build/lint). La verificación es `npm run build` + QA en navegador (dev server en puerto 8485) + revisión del valor en la base de datos.
- Textos de UI en español: placeholder "Seleccionar fecha", etiqueta "Hora", botón "Listo".
- Paquete: `@daypicker/react` (nombre nuevo de react-day-picker v10). Locale desde `@daypicker/react/locale`, NO desde `date-fns/locale`.

---

### Task 1: Activar utilidades de Tailwind e instalar @daypicker/react

**Files:**
- Modify: `src/app/globals.css:1` (encabezado del archivo)
- Modify: `package.json` (vía npm install)

**Interfaces:**
- Produces: clases utilitarias de Tailwind disponibles en toda la app (en `@layer utilities`, por lo que pierden ante el CSS existente sin layer — no hay riesgo de que pisen estilos actuales); paquete `@daypicker/react` instalado.

- [ ] **Step 1: Instalar la dependencia**

```bash
npm install @daypicker/react
```

Esperado: termina sin errores, agrega `"@daypicker/react": "^10..."` a package.json.

- [ ] **Step 2: Importar Tailwind sin preflight en globals.css**

En `src/app/globals.css`, ANTES de la línea 1 actual (`@import url('https://fonts.googleapis.com...`), insertar:

```css
@layer theme, base, components, utilities;
@import "tailwindcss/theme.css" layer(theme);
@import "tailwindcss/utilities.css" layer(utilities);
```

(Los `@import` deben quedar todos al inicio del archivo; el de Google Fonts queda después de estos tres.)

- [ ] **Step 3: Verificar que el build pasa y el CSS existente no cambió**

```bash
npm run build
```

Esperado: build exitoso. Luego arrancar `npm run dev` y abrir `http://localhost:8485/admin` en el navegador: la página de login debe verse idéntica a antes (misma tipografía, colores, sin resets visibles).

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json src/app/globals.css
git commit -m "feat: activar utilidades de Tailwind v4 (sin preflight) e instalar @daypicker/react"
```

---

### Task 2: Componente DateField

**Files:**
- Create: `src/components/DateField.tsx`

**Interfaces:**
- Consumes: Tailwind utilities y `@daypicker/react` de Task 1; clase CSS existente `.rsvp-input` (globals.css:583).
- Produces: `export default function DateField(props: { id: string; value: string; onChange: (value: string) => void; withTime?: boolean; required?: boolean }): JSX.Element`

- [ ] **Step 1: Crear el componente completo**

```tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { DayPicker } from '@daypicker/react';
import { es } from '@daypicker/react/locale';
import '@daypicker/react/style.css';
import { CalendarDays } from 'lucide-react';

interface DateFieldProps {
  id: string;
  /** '' | 'YYYY-MM-DD' | 'YYYY-MM-DDTHH:mm' — mismo formato que emite */
  value: string;
  onChange: (value: string) => void;
  withTime?: boolean;
  required?: boolean;
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Parseo manual para evitar corrimientos de zona horaria con new Date(string). */
function parseValue(value: string): { date: Date | undefined; time: string } {
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?$/);
  if (!m) return { date: undefined, time: '12:00' };
  const [, y, mo, d, h, mi] = m;
  return {
    date: new Date(Number(y), Number(mo) - 1, Number(d)),
    time: h ? `${h}:${mi}` : '12:00',
  };
}

function buildValue(date: Date, time: string, withTime: boolean): string {
  const base = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  return withTime ? `${base}T${time}` : base;
}

export default function DateField({
  id,
  value,
  onChange,
  withTime = false,
  required = false,
}: DateFieldProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { date: selected, time } = parseValue(value);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  let label = '';
  if (selected) {
    const shown = new Date(selected);
    if (withTime) {
      const [h, mi] = time.split(':').map(Number);
      shown.setHours(h, mi);
    }
    label = new Intl.DateTimeFormat('es-MX', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      ...(withTime ? { hour: 'numeric', minute: '2-digit', hour12: true } : {}),
    }).format(shown);
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        id={id}
        onClick={() => setOpen((o) => !o)}
        className="rsvp-input flex cursor-pointer items-center justify-between gap-2 text-left"
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span className={label ? '' : 'text-[var(--text-muted)] opacity-70'}>
          {label || 'Seleccionar fecha'}
        </span>
        <CalendarDays size={16} className="shrink-0 text-[var(--gold-medium)]" />
      </button>

      {required && (
        <input
          type="text"
          value={value}
          onChange={() => {}}
          required
          tabIndex={-1}
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-px w-full opacity-0"
        />
      )}

      {open && (
        <div
          className="absolute left-0 top-full z-50 mt-2 rounded-[var(--radius-lg)] border border-[rgba(194,164,120,0.35)] bg-[var(--bg-secondary)] p-3 shadow-[var(--shadow-medium)]"
          style={{ '--rdp-accent-color': 'var(--color-primary)' } as React.CSSProperties}
        >
          <DayPicker
            mode="single"
            locale={es}
            captionLayout="dropdown"
            selected={selected}
            defaultMonth={selected}
            onSelect={(day) => {
              if (!day) return;
              onChange(buildValue(day, time, withTime));
              if (!withTime) setOpen(false);
            }}
          />
          {withTime && (
            <div className="mt-2 flex items-center justify-between gap-3 border-t border-[rgba(194,164,120,0.25)] pt-3">
              <label className="text-xs font-semibold uppercase tracking-wider text-[var(--gold-dark)]">
                Hora
              </label>
              <input
                type="time"
                value={time}
                disabled={!selected}
                onChange={(e) => {
                  if (selected && e.target.value) {
                    onChange(buildValue(selected, e.target.value, true));
                  }
                }}
                className="rounded border border-[rgba(194,164,120,0.35)] bg-transparent px-2 py-1 text-sm text-[var(--text-dark)]"
              />
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="cursor-pointer rounded bg-[var(--color-primary)] px-3 py-1 text-sm text-white"
              >
                Listo
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verificar que compila**

```bash
npm run build
```

Esperado: build exitoso (el componente aún no se usa; solo debe compilar sin errores de tipos).

- [ ] **Step 3: Commit**

```bash
git add src/components/DateField.tsx
git commit -m "feat: componente DateField con calendario @daypicker/react"
```

---

### Task 3: Integrar DateField en el formulario del admin

**Files:**
- Modify: `src/app/admin/page.tsx:3` (imports), `:1371-1381` (campo form-date), `:1680-1689` (campo form-deadline)

**Interfaces:**
- Consumes: `DateField` de Task 2 (`import DateField from '@/components/DateField'`); estados existentes `formDate`/`setFormDate` (línea 189) y `formRsvpDeadline`/`setFormRsvpDeadline` (línea 231).

- [ ] **Step 1: Agregar el import**

Junto a los imports existentes al inicio de `src/app/admin/page.tsx`:

```tsx
import DateField from '@/components/DateField';
```

- [ ] **Step 2: Reemplazar el input de Fecha y Hora del Evento (~línea 1373)**

Reemplazar:

```tsx
                <input
                  id="form-date"
                  type="datetime-local"
                  className="rsvp-input"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  required
                />
```

por:

```tsx
                <DateField
                  id="form-date"
                  withTime
                  value={formDate}
                  onChange={setFormDate}
                  required
                />
```

- [ ] **Step 3: Reemplazar el input de Fecha límite (~línea 1682)**

Reemplazar:

```tsx
                  <input
                    id="form-deadline"
                    type="date"
                    className="rsvp-input"
                    value={formRsvpDeadline}
                    onChange={(e) => setFormRsvpDeadline(e.target.value)}
                  />
```

por:

```tsx
                  <DateField
                    id="form-deadline"
                    value={formRsvpDeadline}
                    onChange={setFormRsvpDeadline}
                  />
```

- [ ] **Step 4: Build**

```bash
npm run build
```

Esperado: build exitoso.

- [ ] **Step 5: QA en navegador (dev server + base local)**

```bash
npm run dev
```

Con el navegador (o Playwright MCP) en `http://localhost:8485/admin`:

1. Iniciar sesión (ADMIN_PASSWORD del `.env` local).
2. Crear/editar evento: clic en "Fecha y Hora del Evento" → se abre el calendario en español; elegir un día y una hora; el botón muestra p. ej. "14 de febrero de 2027, 6:00 p.m."; "Listo" cierra el popover.
3. Clic en "Fecha límite para Confirmar Asistencia" → elegir un día cierra el popover directo y muestra la fecha en español.
4. Probar cierre con clic-fuera y con Escape.
5. Guardar el evento y verificar en la base local que las fechas quedaron correctas:

```bash
docker exec eventgo_db psql -U postgres -d eventgo -c "SELECT date, rsvp_deadline FROM events ORDER BY id DESC LIMIT 1;"
```

Esperado: `date` y `rsvp_deadline` con los valores elegidos (en UTC).

- [ ] **Step 6: Commit**

```bash
git add src/app/admin/page.tsx
git commit -m "feat: usar DateField en fecha del evento y fecha limite del admin"
```

---

### Task 4: Desplegar a producción

**Files:** ninguno (solo git/CI).

- [ ] **Step 1: Push y tag**

```bash
git push origin main
git tag v0.2.0
git push origin v0.2.0
```

- [ ] **Step 2: Vigilar el workflow**

```bash
gh run watch --exit-status <run-id-del-Deploy>
```

Esperado: build-and-push y deploy en verde.

- [ ] **Step 3: Verificar en producción**

Abrir `https://gael-negrete-gonzalez.com/admin`, iniciar sesión y confirmar que el calendario funciona igual que en local.
