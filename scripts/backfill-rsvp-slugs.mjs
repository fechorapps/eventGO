import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { randomUUID } from 'crypto';

const connectionString = process.env.DATABASE_URL || 'postgres://postgres:password123@localhost:5448/eventgo';

function slugify(value) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

function generateRsvpSlug(familyName) {
  const base = slugify(familyName) || 'familia';
  const suffix = randomUUID().replace(/-/g, '').slice(0, 8);
  return `${base}-${suffix}`;
}

const pool = new Pool({ connectionString });
const prisma = new PrismaClient({
  adapter: new PrismaPg(pool),
});

try {
  const rsvps = await prisma.rsvp.findMany({
    where: {
      slug: null,
    },
    select: {
      id: true,
      familyName: true,
    },
  });

  for (const rsvp of rsvps) {
    await prisma.rsvp.update({
      where: { id: rsvp.id },
      data: { slug: generateRsvpSlug(rsvp.familyName) },
    });
  }

  console.log(`Backfilled ${rsvps.length} RSVP slug(s).`);
} finally {
  await prisma.$disconnect();
  await pool.end();
}
