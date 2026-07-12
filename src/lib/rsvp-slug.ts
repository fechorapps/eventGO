import { randomUUID } from 'crypto';
import type { PrismaClient } from '@prisma/client';

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

// El slug de un RSVP es único (@unique) y es lo que arma la liga personalizada
// /e/<evento>?f=<slug>. Genera uno libre de colisiones antes de persistir.
export async function ensureUniqueRsvpSlug(
  client: Pick<PrismaClient['rsvp'], 'findUnique'> | PrismaClient['rsvp'],
  familyName: string
): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const slug = generateRsvpSlug(familyName);
    const existing = await client.findUnique({ where: { slug } });
    if (!existing) return slug;
  }
  // Colisión repetida es casi imposible; como último recurso usamos entropía completa.
  return `${slugify(familyName) || 'familia'}-${randomUUID().replace(/-/g, '')}`;
}
