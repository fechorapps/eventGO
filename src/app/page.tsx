import { redirect } from 'next/navigation';
import { connection } from 'next/server';
import { prisma } from '@/lib/db';

export default async function Home() {
  // Wait for a real request: without this, Next prerenders this page at build
  // time and the Prisma query fails (no database exists during the image build).
  await connection();

  // Find the first event registered to redirect there by default.
  // If there are no events yet, redirect to the admin panel to create one.
  const firstEvent = await prisma.event.findFirst({
    orderBy: { createdAt: 'asc' },
  });

  if (firstEvent) {
    redirect(`/e/${firstEvent.slug}`);
  } else {
    redirect('/admin');
  }
}
