import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL || 'postgres://postgres:password123@localhost:5448/eventgo';

const pool = new Pool({ connectionString });
const prisma = new PrismaClient({
  adapter: new PrismaPg(pool),
});

try {
  const rsvp = await prisma.rsvp.findFirst({
    select: {
      id: true,
      slug: true,
      familyName: true,
      event: {
        select: {
          slug: true,
        },
      },
    },
  });

  console.log(JSON.stringify(rsvp));
} finally {
  await prisma.$disconnect();
  await pool.end();
}
