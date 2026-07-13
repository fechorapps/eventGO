import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyAdmin } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const slug = searchParams.get('slug');

    // Public access for single event info by slug, including relation fields
    if (slug) {
      const event = await prisma.event.findUnique({
        where: { slug },
        include: {
          itinerary: {
            orderBy: { id: 'asc' },
          },
          photos: {
            orderBy: { id: 'asc' },
          },
          giftRegistries: {
            orderBy: { id: 'asc' },
          },
        },
      });
      if (!event) {
        return NextResponse.json({ error: 'Evento no encontrado' }, { status: 404 });
      }
      return NextResponse.json({ event });
    }

    // Verify admin session for other operations
    const isAdmin = await verifyAdmin();
    if (!isAdmin) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    if (id) {
      const event = await prisma.event.findUnique({
        where: { id: parseInt(id, 10) },
        include: {
          itinerary: {
            orderBy: { id: 'asc' },
          },
          photos: {
            orderBy: { id: 'asc' },
          },
          giftRegistries: {
            orderBy: { id: 'asc' },
          },
        },
      });
      if (!event) {
        return NextResponse.json({ error: 'Evento no encontrado' }, { status: 404 });
      }
      return NextResponse.json({ event });
    }

    const events = await prisma.event.findMany({
      include: {
        itinerary: {
          orderBy: { id: 'asc' },
        },
        photos: {
          orderBy: { id: 'asc' },
        },
        giftRegistries: {
          orderBy: { id: 'asc' },
        },
      },
      orderBy: { date: 'asc' },
    });
    return NextResponse.json({ events });
  } catch (error) {
    console.error('Error fetching events:', error);
    return NextResponse.json({ error: 'Error al obtener eventos' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const isAdmin = await verifyAdmin();
    if (!isAdmin) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const {
      slug,
      title,
      celebrantName,
      subtitle,
      quote,
      date,
      heroBackgroundUrl,
      detailsBackgroundUrl,
      rsvpBackgroundUrl,
      parents,
      godparents,
      churchName,
      churchTime,
      churchAddress,
      churchMapsUrl,
      hallName,
      hallTime,
      hallAddress,
      hallMapsUrl,
      locationsAreSame,
      dressCode,
      itinerary,       // Expecting array of { time: string, activity: string }
      photos,          // Expecting array of strings (urls)
      giftRegistries,  // Expecting array of { storeName: string, registryNumber: string, url: string }
      giftEnvelope,
      giftBankName,
      giftBankOwner,
      giftBankAccount,
      giftBankClabe,
      rsvpPhone,
      rsvpDeadline,
    } = body;

    if (!slug || !title || !celebrantName || !date) {
      return NextResponse.json({ error: 'Slug, título, nombre del celebrante y fecha son requeridos' }, { status: 400 });
    }

    // Check slug uniqueness
    const existing = await prisma.event.findUnique({ where: { slug: slug.trim().toLowerCase() } });
    if (existing) {
      return NextResponse.json({ error: 'El identificador URL (slug) ya está en uso. Elige uno diferente.' }, { status: 400 });
    }

    const event = await prisma.event.create({
      data: {
        slug: slug.trim().toLowerCase(),
        title: title.trim(),
        celebrantName: celebrantName.trim(),
        subtitle: subtitle?.trim() || 'Mi Bautizo',
        quote: quote?.trim() || null,
        date: new Date(date),
        heroBackgroundUrl: heroBackgroundUrl?.trim() || null,
        detailsBackgroundUrl: detailsBackgroundUrl?.trim() || null,
        rsvpBackgroundUrl: rsvpBackgroundUrl?.trim() || null,
        parents: parents?.trim() || null,
        godparents: godparents?.trim() || null,
        churchName: churchName?.trim() || null,
        churchTime: churchTime?.trim() || null,
        churchAddress: churchAddress?.trim() || null,
        churchMapsUrl: churchMapsUrl?.trim() || null,
        hallName: hallName?.trim() || null,
        hallTime: hallTime?.trim() || null,
        hallAddress: hallAddress?.trim() || null,
        hallMapsUrl: hallMapsUrl?.trim() || null,
        locationsAreSame: locationsAreSame === true,
        dressCode: dressCode?.trim() || null,
        giftEnvelope: giftEnvelope !== false,
        giftBankName: giftBankName?.trim() || null,
        giftBankOwner: giftBankOwner?.trim() || null,
        giftBankAccount: giftBankAccount?.trim() || null,
        giftBankClabe: giftBankClabe?.trim() || null,
        rsvpPhone: rsvpPhone?.trim() || null,
        rsvpDeadline: rsvpDeadline ? new Date(rsvpDeadline) : null,
        itinerary: itinerary && Array.isArray(itinerary) ? {
          create: itinerary.map((item: any) => ({
            time: item.time.trim(),
            activity: item.activity.trim(),
          })),
        } : undefined,
        photos: photos && Array.isArray(photos) ? {
          create: photos.map((url: string) => ({ url })),
        } : undefined,
        giftRegistries: giftRegistries && Array.isArray(giftRegistries) ? {
          create: giftRegistries.map((registry: any) => ({
            storeName: registry.storeName.trim(),
            registryNumber: registry.registryNumber?.trim() || null,
            url: registry.url?.trim() || null,
          })),
        } : undefined,
      },
      include: {
        itinerary: true,
        photos: true,
        giftRegistries: true,
      },
    });

    return NextResponse.json({ success: true, event });
  } catch (error) {
    console.error('Error creating event:', error);
    return NextResponse.json({ error: 'Error al crear el evento' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const isAdmin = await verifyAdmin();
    if (!isAdmin) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const {
      id,
      slug,
      title,
      celebrantName,
      subtitle,
      quote,
      date,
      heroBackgroundUrl,
      detailsBackgroundUrl,
      rsvpBackgroundUrl,
      parents,
      godparents,
      churchName,
      churchTime,
      churchAddress,
      churchMapsUrl,
      hallName,
      hallTime,
      hallAddress,
      hallMapsUrl,
      locationsAreSame,
      dressCode,
      itinerary,       // Expecting array of { time: string, activity: string }
      photos,          // Expecting array of strings (urls)
      giftRegistries,  // Expecting array of { storeName: string, registryNumber: string, url: string }
      giftEnvelope,
      giftBankName,
      giftBankOwner,
      giftBankAccount,
      giftBankClabe,
      rsvpPhone,
      rsvpDeadline,
    } = body;

    if (!id || !slug || !title || !celebrantName || !date) {
      return NextResponse.json({ error: 'ID, slug, título, nombre del celebrante y fecha son requeridos' }, { status: 400 });
    }

    // Check slug uniqueness
    const existing = await prisma.event.findFirst({
      where: {
        slug: slug.trim().toLowerCase(),
        NOT: { id: parseInt(id, 10) },
      },
    });
    if (existing) {
      return NextResponse.json({ error: 'El identificador URL (slug) ya está en uso por otro evento.' }, { status: 400 });
    }

    const eventIdNum = parseInt(id, 10);

    // Delete existing itinerary items
    await prisma.itineraryItem.deleteMany({
      where: { eventId: eventIdNum },
    });

    // Delete existing photos
    await prisma.eventPhoto.deleteMany({
      where: { eventId: eventIdNum },
    });

    // Delete existing gift registries
    await prisma.giftRegistry.deleteMany({
      where: { eventId: eventIdNum },
    });

    const event = await prisma.event.update({
      where: { id: eventIdNum },
      data: {
        slug: slug.trim().toLowerCase(),
        title: title.trim(),
        celebrantName: celebrantName.trim(),
        subtitle: subtitle?.trim() || 'Mi Bautizo',
        quote: quote?.trim() || null,
        date: new Date(date),
        heroBackgroundUrl: heroBackgroundUrl?.trim() || null,
        detailsBackgroundUrl: detailsBackgroundUrl?.trim() || null,
        rsvpBackgroundUrl: rsvpBackgroundUrl?.trim() || null,
        parents: parents?.trim() || null,
        godparents: godparents?.trim() || null,
        churchName: churchName?.trim() || null,
        churchTime: churchTime?.trim() || null,
        churchAddress: churchAddress?.trim() || null,
        churchMapsUrl: churchMapsUrl?.trim() || null,
        hallName: hallName?.trim() || null,
        hallTime: hallTime?.trim() || null,
        hallAddress: hallAddress?.trim() || null,
        hallMapsUrl: hallMapsUrl?.trim() || null,
        locationsAreSame: locationsAreSame === true,
        dressCode: dressCode?.trim() || null,
        giftEnvelope: giftEnvelope !== false,
        giftBankName: giftBankName?.trim() || null,
        giftBankOwner: giftBankOwner?.trim() || null,
        giftBankAccount: giftBankAccount?.trim() || null,
        giftBankClabe: giftBankClabe?.trim() || null,
        rsvpPhone: rsvpPhone?.trim() || null,
        rsvpDeadline: rsvpDeadline ? new Date(rsvpDeadline) : null,
        itinerary: itinerary && Array.isArray(itinerary) ? {
          create: itinerary.map((item: any) => ({
            time: item.time.trim(),
            activity: item.activity.trim(),
          })),
        } : undefined,
        photos: photos && Array.isArray(photos) ? {
          create: photos.map((url: string) => ({ url })),
        } : undefined,
        giftRegistries: giftRegistries && Array.isArray(giftRegistries) ? {
          create: giftRegistries.map((registry: any) => ({
            storeName: registry.storeName.trim(),
            registryNumber: registry.registryNumber?.trim() || null,
            url: registry.url?.trim() || null,
          })),
        } : undefined,
      },
      include: {
        itinerary: true,
        photos: true,
        giftRegistries: true,
      },
    });

    return NextResponse.json({ success: true, event });
  } catch (error) {
    console.error('Error updating event:', error);
    return NextResponse.json({ error: 'Error al actualizar el evento' }, { status: 500 });
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

    await prisma.event.delete({
      where: { id: parseInt(id, 10) },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting event:', error);
    return NextResponse.json({ error: 'Error al eliminar el evento' }, { status: 500 });
  }
}
