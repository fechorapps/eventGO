import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyAdmin } from '@/lib/auth';
import { generateRsvpSlug } from '@/lib/rsvp-slug';

export async function GET(request: Request) {
  try {
    const isAdmin = await verifyAdmin();
    if (!isAdmin) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const eventIdParam = searchParams.get('eventId');

    const where: any = {};
    if (eventIdParam) {
      where.eventId = parseInt(eventIdParam, 10);
    }

    // Retrieve RSVPs with nested guests using Prisma, filtered optionally by eventId
    const rsvpsData = await prisma.rsvp.findMany({
      where,
      include: {
        guests: {
          orderBy: {
            id: 'asc',
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const missingSlugRsvps = rsvpsData.filter((rsvp) => !rsvp.slug);
    if (missingSlugRsvps.length > 0) {
      await prisma.$transaction(
        missingSlugRsvps.map((rsvp) =>
          prisma.rsvp.update({
            where: { id: rsvp.id },
            data: { slug: generateRsvpSlug(rsvp.familyName) },
          })
        )
      );
      rsvpsData.splice(0, rsvpsData.length, ...(await prisma.rsvp.findMany({
        where,
        include: {
          guests: {
            orderBy: {
              id: 'asc',
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      })));
    }

    // Map database properties to front-end camelCase structure
    const rsvps = rsvpsData.map((rsvp) => ({
      id: rsvp.id,
      slug: rsvp.slug || '',
      familyName: rsvp.familyName,
      contactPhone: rsvp.contactPhone || '',
      comments: rsvp.comments || '',
      createdAt: rsvp.createdAt.toISOString(),
      guests: rsvp.guests.map((g) => ({
        id: g.id,
        name: g.name,
        isChild: g.isChild,
        confirmed: g.confirmed,
      })),
    }));

    return NextResponse.json({ rsvps });
  } catch (error: any) {
    console.error('Error fetching RSVPs with Prisma:', error);
    return NextResponse.json({ error: 'Error al obtener la lista de confirmaciones' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const isAdmin = await verifyAdmin();
    if (!isAdmin) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
    }

    await prisma.rsvp.delete({
      where: {
        id: parseInt(id, 10),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting RSVP with Prisma:', error);
    return NextResponse.json({ error: 'Error al eliminar la confirmación' }, { status: 500 });
  }
}
