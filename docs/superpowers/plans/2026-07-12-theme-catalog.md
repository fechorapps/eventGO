# Catálogo de temas — Plan de Implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 60 temas (6 categorías × 10) seleccionables por evento desde el admin; cada tema define paleta y motivo SVG del hero de la invitación.

**Architecture:** Registro de datos puro en `src/lib/themes.ts`, motivos SVG en `src/components/motifs.tsx`, columna `Event.theme`, variables CSS inyectadas inline en la página pública, selector visual en el admin. Spec: `docs/superpowers/specs/2026-07-12-theme-catalog-design.md`.

**Tech Stack:** Next 16 App Router, Prisma 7, CSS variables existentes, React server/client components.

## Global Constraints

- Ids de tema estables `<categoria>-<slug>`; default `bautizo-olivos-serenos` (equivale al diseño actual).
- Todo `palette.primary` con contraste ≥4.5:1 sobre `#FDFAF6` (valida `scripts/check-theme-contrast.mjs`).
- Motivos SVG estilo línea elegante, viewBox uniforme 140×96, colores desde la paleta (props), sin verde/azul hardcodeado salvo tonos naturales de hojas.
- `getTheme(id)` SIEMPRE devuelve un tema (fallback al default) — una invitación jamás rompe por tema inválido.
- El admin en sí no cambia de tema; solo la invitación pública.

---

### Task 1: Registro de temas + validación de contraste

**Files:**
- Create: `src/lib/themes.ts` (interfaz `EventTheme`, `THEMES` con los 60 temas del spec, `DEFAULT_THEME_ID`, `getTheme`, `THEME_CATEGORIES`)
- Create: `scripts/check-theme-contrast.mjs` (WCAG relative luminance; falla con exit 1 si algún primary <4.5:1 sobre #FDFAF6)

**Interfaces:**
- Produces: `getTheme(id: string | null | undefined): EventTheme`; `THEMES: EventTheme[]`; `THEME_CATEGORIES: string[]`; `EventTheme = { id, category, name, motif, palette: { primary, primaryDark, primaryLight, accent } }`

- [ ] Step 1: escribir themes.ts con las 60 entradas (paletas por categoría del spec, hex definitivos)
- [ ] Step 2: escribir el validador y correr `node scripts/check-theme-contrast.mjs` → "60/60 OK"
- [ ] Step 3: `npm run build` OK → commit "feat: registro de 60 temas con validación de contraste"

### Task 2: Motivos SVG

**Files:**
- Create: `src/components/motifs.tsx`

**Interfaces:**
- Consumes: nada.
- Produces: `Motif({ motif, accent, foliage }: { motif: MotifId; accent: string; foliage?: string })` — renderiza el SVG del motivo; `type MotifId` = 'cruz-olivos' | 'paloma' | 'concha' | 'anillos' | 'rosa' | 'copas' | 'corona' | 'mariposas' | 'flor' | 'globos' | 'pastel' | 'confeti' | 'nube-luna' | 'osito' | 'piecitos' | 'birrete' | 'estrellas' | 'laurel'.

- [ ] Step 1: portar la cruz+olivos actual como 'cruz-olivos' (accent parametrizado)
- [ ] Step 2: autoría de los 17 motivos restantes, línea minimalista, mismo viewBox
- [ ] Step 3: `npm run build` OK → commit "feat: 18 motivos SVG para los temas"

### Task 3: Columna theme + API

**Files:**
- Modify: `prisma/schema.prisma` (Event.theme String @default("bautizo-olivos-serenos"))
- Create: migración `add_event_theme` con `prisma migrate diff` (mismo método que la migración anterior)
- Modify: `src/app/api/admin/events/route.ts` (aceptar/persistir `theme` en POST y PUT, validado con getTheme)

- [ ] Step 1: schema + migración + `prisma migrate resolve --applied` en DB local si aplica... NO: la columna es nueva, aplicar con `prisma migrate deploy` local
- [ ] Step 2: API: incluir theme en create/update (default si falta)
- [ ] Step 3: build + commit "feat: campo theme por evento"

### Task 4: Aplicar tema en la invitación pública

**Files:**
- Modify: `src/app/e/[slug]/page.tsx` — `const theme = getTheme(event.theme)`; wrapper con variables (`--color-primary`, `--color-primary-dark`, `--color-primary-light`, `--gold-dark`, `--gold-medium`) y `<Motif motif={theme.motif} …/>` en el hero (reemplaza el SVG fijo)

- [ ] Step 1: integrar + borrar el SVG hardcodeado
- [ ] Step 2: build + QA navegador con 2-3 temas cambiados a mano en DB local
- [ ] Step 3: commit "feat: la invitación aplica el tema del evento"

### Task 5: Selector de tema en el admin

**Files:**
- Create: `src/components/ThemePicker.tsx` (client; chips de categoría + grid de tarjetas: miniatura del motivo con la paleta, 3 swatches, nombre; props `{ value, onChange }`)
- Modify: `src/app/admin/page.tsx` (estado `formTheme`, sección "Tema de la invitación", incluir en payload de guardado y en la carga al editar)

- [ ] Step 1: ThemePicker
- [ ] Step 2: integración en el formulario (crear + editar + reset)
- [ ] Step 3: build + QA navegador: elegir tema de cada categoría, guardar, verificar `/e/slug`
- [ ] Step 4: commit "feat: catálogo de temas en el admin"

### Task 6: Deploy y verificación

- [ ] Step 1: push + tag v0.4.0, vigilar workflow
- [ ] Step 2: verificar en producción que el evento real sigue idéntico (tema default) y que el catálogo aparece en el admin
