import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';

export default async function Home() {
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
