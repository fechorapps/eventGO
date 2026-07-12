# Catálogo de temas de diseño por categoría de evento

**Fecha:** 2026-07-12
**Estado:** Aprobado

## Objetivo

Que el usuario del admin escoja el tema visual de cada evento desde un catálogo
de 60 temas: 6 categorías de evento × 10 temas cada una. Cada tema define la
paleta de colores y el motivo decorativo del hero de la invitación pública.

## Alcance

- **Varía por tema:** paleta (acentos, botones, títulos) y motivo SVG del hero.
- **NO varía:** fondo crema, tipografía (Cormorant/Montserrat), estructura y
  layout de la invitación, el panel de admin (siempre usa el tema default).

## Categorías y temas

Cada categoría tiene 3-4 motivos SVG que se combinan con 10 paletas. Los ids
son `<categoria>-<slug>` estables.

### Bautizo (motivos: cruz-olivos, paloma, concha)
1. Olivos Serenos — azul polvo (el actual, tema default global)
2. Cielo de Paz — celeste claro + paloma
3. Luz Sagrada — marfil/dorado clásico + cruz-olivos
4. Agua Bendita — aqua suave + concha
5. Rosa Inocencia — rosa empolvado + paloma
6. Salvia Antigua — verde salvia + cruz-olivos
7. Lavanda Suave — lila grisáceo + paloma
8. Perla del Alba — gris perla + concha
9. Miel de Ángel — ámbar suave + cruz-olivos
10. Azul Profundo — azul marino + paloma

### Boda (motivos: anillos, rosa, copas)
1. Salvia y Oro — verde salvia + anillos
2. Burdeos Eterno — vino + rosa
3. Champagne Real — beige dorado + copas
4. Azul Medianoche — marino + anillos
5. Rosa Antiguo — palo de rosa + rosa
6. Esmeralda — verde profundo + copas
7. Terracota — arcilla + rosa
8. Gris Perla — plata + anillos
9. Lavanda Provenzal — lila + copas
10. Carbón y Oro — gris oscuro + anillos

### XV Años (motivos: corona, mariposas, flor)
1. Rosa Cuarzo — rosa + corona
2. Lila Mariposa — lavanda + mariposas
3. Oro Rosa — rose gold + corona
4. Azul Princesa — azul medio + corona
5. Fucsia Vibrante — magenta profundo + mariposas
6. Menta Floral — verde menta + flor
7. Durazno — coral suave + flor
8. Violeta Real — púrpura + corona
9. Celeste Sueño — celeste + mariposas
10. Vino Elegante — borgoña + flor

### Cumpleaños (motivos: globos, pastel, confeti)
1. Coral Fiesta — coral + globos
2. Turquesa Alegre — teal + confeti
3. Sol Radiante — mostaza/ámbar + pastel
4. Azul Celebración — azul medio + globos
5. Verde Lima — oliva claro + confeti
6. Rosa Chicle — rosa fuerte + pastel
7. Naranja Cítrico — naranja quemado + globos
8. Morado Festivo — púrpura + confeti
9. Rojo Cereza — carmín + pastel
10. Multicolor Sobrio — gris cálido + globos

### Baby Shower (motivos: nube-luna, osito, piecitos)
1. Nube de Algodón — celeste + nube-luna
2. Menta Bebé — verde menta + osito
3. Rosita — rosa bebé + piecitos
4. Amarillo Patito — amarillo suave + osito
5. Lavanda Dulce — lila pastel + nube-luna
6. Gris Nube — gris suave + piecitos
7. Durazno Tierno — melocotón + osito
8. Aqua Marina — aqua + nube-luna
9. Beige Arena — arena + piecitos
10. Azul Cuna — azul empolvado + osito

### Graduación / Gala (motivos: birrete, estrellas, laurel)
1. Noche Estelar — marino + estrellas
2. Oro Académico — dorado + birrete
3. Vino de Gala — borgoña + laurel
4. Esmeralda Formal — verde oscuro + birrete
5. Carbón Elegante — gris carbón + estrellas
6. Azul Doctoral — azul profundo + birrete
7. Púrpura Honor — púrpura + laurel
8. Plata Luna — plata/gris + estrellas
9. Terracota Otoño — arcilla + laurel
10. Verde Oliva — oliva + birrete

## Arquitectura

### `src/lib/themes.ts` — registro de temas (datos puros)

```ts
export interface EventTheme {
  id: string;              // 'bautizo-olivos-serenos'
  category: string;        // 'Bautizo'
  name: string;            // 'Olivos Serenos'
  motif: MotifId;          // 'cruz-olivos' | 'paloma' | ...
  palette: {
    primary: string;       // --color-primary y --gold-dark
    primaryDark: string;   // --color-primary-dark
    primaryLight: string;  // --color-primary-light
    accent: string;        // --gold-medium (tono metálico/acento)
  };
}
export const THEMES: EventTheme[];
export const DEFAULT_THEME_ID = 'bautizo-olivos-serenos';
export function getTheme(id: string | null): EventTheme; // fallback al default
```

Regla de contraste: todo `primary` debe dar ≥4.5:1 sobre el fondo crema
(#FDFAF6) porque colorea títulos y botones con texto blanco.

### `src/components/motifs.tsx` — los ~19 motivos SVG

Un componente por motivo, línea elegante estilo del actual (cruz+olivos),
que recibe el acento por CSS (`currentColor` / variables) para heredar la
paleta del tema. Tamaño uniforme (~150×100 viewBox).

### Aplicación en la invitación (`src/app/e/[slug]/page.tsx`)

- `getTheme(event.theme)` y un `<div style={{ '--color-primary': ..., ... }}>`
  que envuelve todo el contenido de la página (las variables CSS se heredan,
  el CSS existente no cambia).
- El hero renderiza el motivo del tema en lugar de la cruz fija.
- La cruz+olivos actual se convierte en el motivo `cruz-olivos`.

### Base de datos

- `Event.theme String @default("bautizo-olivos-serenos")` + migración.
- Id desconocido/nulo → tema default (getTheme hace fallback, nunca rompe).

### Admin — selector de tema (`src/components/ThemePicker.tssx` → .tsx)

- Nueva sección "Tema de la invitación" en el formulario del evento.
- Chips de categoría (Bautizo | Boda | XV Años | Cumpleaños | Baby Shower |
  Graduación) y grid responsivo con las 10 tarjetas de la categoría activa.
- Cada tarjeta: motivo en miniatura pintado con la paleta + 3 círculos de
  muestra de color + nombre. La seleccionada lleva borde `--color-primary`.
- Se guarda junto con el resto del formulario (campo `theme` en el POST/PUT
  existente de eventos).

## Manejo de errores

- Tema inexistente en DB (ej. se renombra un id) → fallback silencioso al
  default; nunca una invitación rota.
- Eventos existentes: la migración les pone el default, que es exactamente
  el diseño actual — cero cambio visible.

## Verificación

1. `npm run build` sin errores.
2. Navegador: en el admin cambiar el tema del evento de prueba por uno de
   cada categoría, guardar, y verificar en `/e/<slug>` paleta y motivo.
3. Contraste: script rápido que valide 4.5:1 de cada `primary` sobre crema.
4. Deploy y verificación en producción con el evento real (debe seguir
   viéndose idéntico: tema default).
