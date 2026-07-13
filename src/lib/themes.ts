// Catálogo de temas de la invitación: 6 categorías × 10 temas.
// Cada tema define la paleta (variables CSS del sitio) y el motivo del hero.
// Regla: palette.primary debe dar contraste >=4.5:1 sobre el fondo crema
// (#FDFAF6) — lo valida scripts/check-theme-contrast.mjs.

import type { MotifId } from '@/components/motifs';

export interface EventTheme {
  id: string;
  category: string;
  name: string;
  motif: MotifId;
  palette: {
    primary: string;      // --color-primary y --gold-dark (títulos, botones)
    primaryDark: string;  // --color-primary-dark (hover)
    primaryLight: string; // --color-primary-light
    accent: string;       // --gold-medium (detalles metálicos/decorativos)
  };
}

export const DEFAULT_THEME_ID = 'bautizo-olivos-serenos';

export const THEME_CATEGORIES = [
  'Bautizo',
  'Boda',
  'XV Años',
  'Cumpleaños',
  'Baby Shower',
  'Graduación',
] as const;

const t = (
  id: string,
  category: string,
  name: string,
  motif: MotifId,
  primary: string,
  primaryDark: string,
  primaryLight: string,
  accent: string
): EventTheme => ({ id, category, name, motif, palette: { primary, primaryDark, primaryLight, accent } });

export const THEMES: EventTheme[] = [
  // ===== Bautizo =====
  t('bautizo-olivos-serenos', 'Bautizo', 'Olivos Serenos', 'cruz-olivos', '#55708C', '#394E63', '#E9EEF3', '#C2A478'),
  t('bautizo-cielo-de-paz', 'Bautizo', 'Cielo de Paz', 'paloma', '#4A7A96', '#33566B', '#E7F0F5', '#C2A478'),
  t('bautizo-luz-sagrada', 'Bautizo', 'Luz Sagrada', 'cruz-olivos', '#8A6D3B', '#6B532B', '#F5EFE3', '#C9A96A'),
  t('bautizo-agua-bendita', 'Bautizo', 'Agua Bendita', 'concha', '#3E7C7B', '#2C5958', '#E5F1F1', '#C2A478'),
  t('bautizo-rosa-inocencia', 'Bautizo', 'Rosa Inocencia', 'paloma', '#A45D6E', '#7E4553', '#F7EBEE', '#C9A96A'),
  t('bautizo-salvia-antigua', 'Bautizo', 'Salvia Antigua', 'cruz-olivos', '#5A6B54', '#3E4B3A', '#EBECE8', '#C2A478'),
  t('bautizo-lavanda-suave', 'Bautizo', 'Lavanda Suave', 'paloma', '#71678F', '#524A6B', '#EEECF4', '#C2A478'),
  t('bautizo-perla-del-alba', 'Bautizo', 'Perla del Alba', 'concha', '#6E7580', '#4F555E', '#EDEFF1', '#C9A96A'),
  t('bautizo-miel-de-angel', 'Bautizo', 'Miel de Ángel', 'cruz-olivos', '#96652A', '#734D1F', '#F7EFE2', '#D3B078'),
  t('bautizo-azul-profundo', 'Bautizo', 'Azul Profundo', 'paloma', '#2C4A6E', '#1E3450', '#E6ECF3', '#C2A478'),

  // ===== Boda =====
  t('boda-salvia-y-oro', 'Boda', 'Salvia y Oro', 'anillos', '#5A6B54', '#3E4B3A', '#EBECE8', '#C2A478'),
  t('boda-burdeos-eterno', 'Boda', 'Burdeos Eterno', 'rosa', '#7C2D3E', '#5A202D', '#F5E8EB', '#C9A96A'),
  t('boda-champagne-real', 'Boda', 'Champagne Real', 'copas', '#8A6D3B', '#6B532B', '#F5EFE3', '#D3B078'),
  t('boda-azul-medianoche', 'Boda', 'Azul Medianoche', 'anillos', '#2C4A6E', '#1E3450', '#E6ECF3', '#C2A478'),
  t('boda-rosa-antiguo', 'Boda', 'Rosa Antiguo', 'rosa', '#A45D6E', '#7E4553', '#F7EBEE', '#C9A96A'),
  t('boda-esmeralda', 'Boda', 'Esmeralda', 'copas', '#20604F', '#16453A', '#E3EFEB', '#C2A478'),
  t('boda-terracota', 'Boda', 'Terracota', 'rosa', '#A2543A', '#7C402C', '#F7ECE7', '#C9A96A'),
  t('boda-gris-perla', 'Boda', 'Gris Perla', 'anillos', '#6E7580', '#4F555E', '#EDEFF1', '#B8BEC7'),
  t('boda-lavanda-provenzal', 'Boda', 'Lavanda Provenzal', 'copas', '#71678F', '#524A6B', '#EEECF4', '#C2A478'),
  t('boda-carbon-y-oro', 'Boda', 'Carbón y Oro', 'anillos', '#44484F', '#2E3136', '#EAEBED', '#C9A96A'),

  // ===== XV Años =====
  t('xv-rosa-cuarzo', 'XV Años', 'Rosa Cuarzo', 'corona', '#B04A62', '#873849', '#F9EAEE', '#D3A9B4'),
  t('xv-lila-mariposa', 'XV Años', 'Lila Mariposa', 'mariposas', '#71678F', '#524A6B', '#EEECF4', '#C2A478'),
  t('xv-oro-rosa', 'XV Años', 'Oro Rosa', 'corona', '#A66957', '#7E4F41', '#F8EDE9', '#D9AE9E'),
  t('xv-azul-princesa', 'XV Años', 'Azul Princesa', 'corona', '#3E6493', '#2C486B', '#E8EDF4', '#C2A478'),
  t('xv-fucsia-vibrante', 'XV Años', 'Fucsia Vibrante', 'mariposas', '#A32E68', '#7A224E', '#F8E7F0', '#C9A96A'),
  t('xv-menta-floral', 'XV Años', 'Menta Floral', 'flor', '#3E7C6B', '#2C594C', '#E5F1ED', '#C2A478'),
  t('xv-durazno', 'XV Años', 'Durazno', 'flor', '#B05A3C', '#84432D', '#F9ECE7', '#D3A98F'),
  t('xv-violeta-real', 'XV Años', 'Violeta Real', 'corona', '#6B4A96', '#4E366E', '#EDE8F4', '#C2A478'),
  t('xv-celeste-sueno', 'XV Años', 'Celeste Sueño', 'mariposas', '#41718F', '#2F5268', '#E7EFF4', '#C2A478'),
  t('xv-vino-elegante', 'XV Años', 'Vino Elegante', 'flor', '#7C2D3E', '#5A202D', '#F5E8EB', '#C9A96A'),

  // ===== Cumpleaños =====
  t('cumple-coral-fiesta', 'Cumpleaños', 'Coral Fiesta', 'globos', '#B04A3C', '#84372D', '#F9EAE7', '#C9A96A'),
  t('cumple-turquesa-alegre', 'Cumpleaños', 'Turquesa Alegre', 'confeti', '#2C7A78', '#1F5A58', '#E4F1F1', '#C2A478'),
  t('cumple-sol-radiante', 'Cumpleaños', 'Sol Radiante', 'pastel', '#96652A', '#734D1F', '#F7EFE2', '#D3B078'),
  t('cumple-azul-celebracion', 'Cumpleaños', 'Azul Celebración', 'globos', '#3E6493', '#2C486B', '#E8EDF4', '#C2A478'),
  t('cumple-verde-lima', 'Cumpleaños', 'Verde Lima', 'confeti', '#5F7A2E', '#465A22', '#EDF2E4', '#C9A96A'),
  t('cumple-rosa-chicle', 'Cumpleaños', 'Rosa Chicle', 'pastel', '#B04A62', '#873849', '#F9EAEE', '#D3A9B4'),
  t('cumple-naranja-citrico', 'Cumpleaños', 'Naranja Cítrico', 'globos', '#A2543A', '#7C402C', '#F7ECE7', '#C9A96A'),
  t('cumple-morado-festivo', 'Cumpleaños', 'Morado Festivo', 'confeti', '#6B4A96', '#4E366E', '#EDE8F4', '#C2A478'),
  t('cumple-rojo-cereza', 'Cumpleaños', 'Rojo Cereza', 'pastel', '#9E2F38', '#762329', '#F8E8E9', '#C9A96A'),
  t('cumple-multicolor-sobrio', 'Cumpleaños', 'Multicolor Sobrio', 'globos', '#6E6A62', '#4F4C46', '#EFEEEB', '#C2A478'),

  // ===== Baby Shower =====
  t('baby-nube-de-algodon', 'Baby Shower', 'Nube de Algodón', 'nube-luna', '#4A7A96', '#33566B', '#E7F0F5', '#C2A478'),
  t('baby-menta-bebe', 'Baby Shower', 'Menta Bebé', 'osito', '#3E7C6B', '#2C594C', '#E5F1ED', '#C2A478'),
  t('baby-rosita', 'Baby Shower', 'Rosita', 'piecitos', '#A45D6E', '#7E4553', '#F7EBEE', '#D3A9B4'),
  t('baby-amarillo-patito', 'Baby Shower', 'Amarillo Patito', 'osito', '#8A6D3B', '#6B532B', '#F5EFE3', '#D3B078'),
  t('baby-lavanda-dulce', 'Baby Shower', 'Lavanda Dulce', 'nube-luna', '#71678F', '#524A6B', '#EEECF4', '#C2A478'),
  t('baby-gris-nube', 'Baby Shower', 'Gris Nube', 'piecitos', '#6E7580', '#4F555E', '#EDEFF1', '#B8BEC7'),
  t('baby-durazno-tierno', 'Baby Shower', 'Durazno Tierno', 'osito', '#B05A3C', '#84432D', '#F9ECE7', '#D3A98F'),
  t('baby-aqua-marina', 'Baby Shower', 'Aqua Marina', 'nube-luna', '#3E7C7B', '#2C5958', '#E5F1F1', '#C2A478'),
  t('baby-beige-arena', 'Baby Shower', 'Beige Arena', 'piecitos', '#8A7355', '#68563F', '#F4F0E9', '#C9A96A'),
  t('baby-azul-cuna', 'Baby Shower', 'Azul Cuna', 'osito', '#55708C', '#394E63', '#E9EEF3', '#C2A478'),

  // ===== Graduación =====
  t('grad-noche-estelar', 'Graduación', 'Noche Estelar', 'estrellas', '#2C4A6E', '#1E3450', '#E6ECF3', '#C2A478'),
  t('grad-oro-academico', 'Graduación', 'Oro Académico', 'birrete', '#8A6D3B', '#6B532B', '#F5EFE3', '#D3B078'),
  t('grad-vino-de-gala', 'Graduación', 'Vino de Gala', 'laurel', '#7C2D3E', '#5A202D', '#F5E8EB', '#C9A96A'),
  t('grad-esmeralda-formal', 'Graduación', 'Esmeralda Formal', 'birrete', '#20604F', '#16453A', '#E3EFEB', '#C2A478'),
  t('grad-carbon-elegante', 'Graduación', 'Carbón Elegante', 'estrellas', '#44484F', '#2E3136', '#EAEBED', '#C9A96A'),
  t('grad-azul-doctoral', 'Graduación', 'Azul Doctoral', 'birrete', '#3E6493', '#2C486B', '#E8EDF4', '#C2A478'),
  t('grad-purpura-honor', 'Graduación', 'Púrpura Honor', 'laurel', '#6B4A96', '#4E366E', '#EDE8F4', '#C2A478'),
  t('grad-plata-luna', 'Graduación', 'Plata Luna', 'estrellas', '#6E7580', '#4F555E', '#EDEFF1', '#B8BEC7'),
  t('grad-terracota-otono', 'Graduación', 'Terracota Otoño', 'laurel', '#A2543A', '#7C402C', '#F7ECE7', '#C9A96A'),
  t('grad-verde-oliva', 'Graduación', 'Verde Oliva', 'birrete', '#5F7A2E', '#465A22', '#EDF2E4', '#C9A96A'),
];

const themesById = new Map(THEMES.map((theme) => [theme.id, theme]));

export function getTheme(id: string | null | undefined): EventTheme {
  return (id && themesById.get(id)) || themesById.get(DEFAULT_THEME_ID)!;
}
