import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyAdmin } from '@/lib/auth';

// Live "is this slug free" check used by the Crear/Editar Evento wizard
// to auto-dedupe a title-derived slug before the organizer ever sees it.
// Same uniqueness rule already enforced in POST/PUT (src/app/api/admin/events/route.ts),
// just exposed as a cheap read for the client to poll while typing.
export async function GET(request: Request) {
  try {
    const isAdmin = await verifyAdmin();
    if (!isAdmin) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug')?.trim().toLowerCase() || '';

    if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
      return NextResponse.json({ available: false });
    }

    const existing = await prisma.event.findUnique({ where: { slug }, select: { id: true } });
    return NextResponse.json({ available: !existing });
  } catch (error) {
    console.error('Error checking slug availability:', error);
    return NextResponse.json({ error: 'Error al verificar el identificador' }, { status: 500 });
  }
}
