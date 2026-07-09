import { randomUUID } from 'crypto';

function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

export function generateRsvpSlug(familyName: string) {
  const base = slugify(familyName) || 'familia';
  const suffix = randomUUID().replace(/-/g, '').slice(0, 8);
  return `${base}-${suffix}`;
}
