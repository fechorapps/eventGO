import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyAdmin } from '@/lib/auth';
import { ensureUniqueRsvpSlug } from '@/lib/rsvp-slug';

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

    // Auto-reparación: familias creadas antes de que se generara el slug quedan
    // con slug null y su liga personalizada (/e/...?f=) viaja vacía, por lo que
    // no precarga a nadie. Les asignamos un slug la primera vez que el panel las
    // lista, para que el botón de compartir por WhatsApp funcione.
    for (const rsvp of rsvpsData) {
      if (!rsvp.slug) {
        const slug = await ensureUniqueRsvpSlug(prisma.rsvp, rsvp.familyName);
        await prisma.rsvp.update({ where: { id: rsvp.id }, data: { slug } });
        rsvp.slug = slug;
      }
    }

    // Map database properties to front-end camelCase structure
    const rsvps = rsvpsData.map((rsvp) => ({
      id: rsvp.id,
      slug: rsvp.slug || '',
      familyName: rsvp.familyName,
      invitedBy: rsvp.invitedBy || '',
      invitationSent: rsvp.invitationSent,
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

export async function PATCH(request: Request) {
  try {
    const isAdmin = await verifyAdmin();
    if (!isAdmin) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();

    // Check if we are updating a single guest's confirmation status
    if (body?.guestId !== undefined) {
      const guestId = Number(body.guestId);
      if (!Number.isInteger(guestId) || guestId <= 0) {
        return NextResponse.json({ error: 'ID de invitado inválido' }, { status: 400 });
      }

      const confirmed = body.confirmed === null ? null : Boolean(body.confirmed);

      const guest = await prisma.guest.update({
        where: { id: guestId },
        data: { confirmed },
      });

      return NextResponse.json({
        success: true,
        guest: {
          id: guest.id,
          confirmed: guest.confirmed,
        },
      });
    }

    // Default: update RSVP invitationSent status
    const id = Number(body?.id);
    const invitationSent = body?.invitationSent;

    if (!Number.isInteger(id) || id <= 0 || typeof invitationSent !== 'boolean') {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
    }

    const rsvp = await prisma.rsvp.update({
      where: { id },
      data: { invitationSent },
    });

    return NextResponse.json({
      success: true,
      rsvp: {
        id: rsvp.id,
        invitationSent: rsvp.invitationSent,
      },
    });
  } catch (error: any) {
    console.error('Error updating RSVP or guest status:', error);
    return NextResponse.json({ error: 'Error al actualizar la confirmación' }, { status: 500 });
  }
}
