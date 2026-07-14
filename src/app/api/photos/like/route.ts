import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

interface LikeRequestBody {
  eventId?: number;
  photoUrl?: string;
  clientId?: string;
  liked?: boolean;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as LikeRequestBody;
    const eventId = Number(body.eventId);
    const photoUrl = body.photoUrl?.trim();
    const clientId = body.clientId?.trim();
    const liked = body.liked === true;

    if (!Number.isInteger(eventId) || eventId <= 0 || !photoUrl || !clientId) {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
    }

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true },
    });
    if (!event) {
      return NextResponse.json({ error: 'Evento no encontrado' }, { status: 404 });
    }

    if (liked) {
      await prisma.photoLike.upsert({
        where: {
          eventId_photoUrl_clientId: {
            eventId,
            photoUrl,
            clientId,
          },
        },
        create: {
          eventId,
          photoUrl,
          clientId,
        },
        update: {},
      });
    } else {
      await prisma.photoLike.deleteMany({
        where: {
          eventId,
          photoUrl,
          clientId,
        },
      });
    }

    const count = await prisma.photoLike.count({
      where: {
        eventId,
        photoUrl,
      },
    });

    return NextResponse.json({
      success: true,
      liked,
      count,
    });
  } catch (error) {
    console.error('Error updating photo like:', error);
    return NextResponse.json({ error: 'Error al actualizar el me gusta' }, { status: 500 });
  }
}
