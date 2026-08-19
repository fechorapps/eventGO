// Valida que el color primary de cada tema tenga contraste >=4.5:1 (WCAG AA)
// sobre el fondo crema del sitio. Uso: node scripts/check-theme-contrast.mjs
import { readFileSync } from 'node:fs';

const BG = '#FDFAF6';
const src = readFileSync(new URL('../src/lib/themes.ts', import.meta.url), 'utf8');

// t('id', 'Cat', 'Nombre', 'motivo', '#primary', ...)
const entries = [...src.matchAll(/t\('([^']+)',\s*'[^']+',\s*'[^']+',\s*'[^']+',\s*'(#[0-9A-Fa-f]{6})'/g)];

const lum = (hex) => {
  const c = [1, 3, 5].map((i) => {
    const v = parseInt(hex.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const contrast = (a, b) => {
  const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
};

let fails = 0;
for (const [, id, primary] of entries) {
  const ratio = contrast(primary, BG);
  if (ratio < 4.5) {
    console.error(`FALLA ${id}: ${primary} → ${ratio.toFixed(2)}:1 (<4.5)`);
    fails++;
  }
}
console.log(`${entries.length - fails}/${entries.length} OK`);
if (fails > 0 || entries.length === 0) process.exit(1);
