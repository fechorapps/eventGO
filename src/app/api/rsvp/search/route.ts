import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const eventIdStr = searchParams.get('eventId');
    const q = searchParams.get('q');

    if (!eventIdStr || !q || q.trim().length < 2) {
      return NextResponse.json({ rsvps: [] });
    }

    const eventId = parseInt(eventIdStr, 10);
    if (isNaN(eventId)) {
      return NextResponse.json({ error: 'ID de evento inválido.' }, { status: 400 });
    }

    // Search for RSVPs by family name or guest names
    const rsvpsData = await prisma.rsvp.findMany({
      where: {
        eventId,
        OR: [
          { familyName: { contains: q.trim(), mode: 'insensitive' } },
          { guests: { some: { name: { contains: q.trim(), mode: 'insensitive' } } } }
        ]
      },
      include: {
        guests: {
          orderBy: { id: 'asc' }
        }
      },
      take: 6
    });

    const rsvps = rsvpsData.map((rsvp) => ({
      id: rsvp.id,
      familyName: rsvp.familyName,
      contactPhone: rsvp.contactPhone,
      comments: rsvp.comments,
      guests: rsvp.guests.map((guest) => ({
        id: guest.id,
        name: guest.name,
        isChild: guest.isChild,
        confirmed: guest.confirmed,
      })),
    }));

    return NextResponse.json({ rsvps });
  } catch (error) {
    console.error('Error searching RSVPs:', error);
    return NextResponse.json({ error: 'Error al buscar confirmaciones.' }, { status: 500 });
  }
}
