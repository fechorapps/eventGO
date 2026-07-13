import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { generateRsvpSlug } from '@/lib/rsvp-slug';

interface RsvpGuestPayload {
  name: string;
  isChild?: boolean;
  confirmed?: boolean;
}

interface RsvpRequestBody {
  eventId?: number;
  slug?: string;
  familyName?: string;
  invitedBy?: string;
  invitationSent?: boolean;
  contactPhone?: string;
  comments?: string;
  guests?: RsvpGuestPayload[];
  rsvpId?: number;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RsvpRequestBody;
    const { eventId, slug, familyName, invitedBy, invitationSent, contactPhone, comments, guests, rsvpId } = body;

    if ((!eventId && !slug) || !familyName || !guests || !Array.isArray(guests) || guests.length === 0) {
      return NextResponse.json(
        { error: 'El ID de evento, nombre de la familia y lista de invitados son requeridos.' },
        { status: 400 }
      );
    }

    let targetEventId = eventId;
    if (!targetEventId && slug) {
      const event = await prisma.event.findUnique({
        where: { slug },
      });
      if (!event) {
        return NextResponse.json({ error: 'Evento no encontrado.' }, { status: 404 });
      }
      targetEventId = event.id;
    }

    if (!targetEventId) {
      return NextResponse.json({ error: 'ID de evento no válido.' }, { status: 400 });
    }

    // Verify the target event exists
    const eventExists = await prisma.event.findUnique({
      where: { id: targetEventId },
    });
    if (!eventExists) {
      return NextResponse.json({ error: 'Evento no encontrado en el sistema.' }, { status: 404 });
    }

    // Check if we are updating an existing RSVP (pre-registered or previously registered)
    if (rsvpId) {
      const existingRsvp = await prisma.rsvp.findUnique({
        where: { id: rsvpId },
      });

      if (existingRsvp) {
        const slug = existingRsvp.slug || generateRsvpSlug(familyName.trim());
        await prisma.$transaction([
          // 1. Delete existing guests for this RSVP to avoid duplicates
          prisma.guest.deleteMany({
            where: { rsvpId },
          }),
          // 2. Update the RSVP parent details
          prisma.rsvp.update({
            where: { id: rsvpId },
            data: {
              familyName: familyName.trim(),
              slug,
              invitedBy: invitedBy?.trim() || null,
              invitationSent: invitationSent === true,
              contactPhone: contactPhone?.trim() || null,
              comments: comments?.trim() || null,
            },
          }),
          // 3. Re-create the guests list with final confirmation statuses
          prisma.guest.createMany({
            data: guests.map((guest) => ({
              rsvpId,
              name: guest.name,
              isChild: guest.isChild || false,
              confirmed: guest.confirmed === true,
            })),
          }),
        ]);

        return NextResponse.json({ success: true, rsvpId });
      }
    }

    // Create a new RSVP entry if no rsvpId is provided
    const randomCode = Math.floor(1000 + Math.random() * 9000).toString(); // Generate random 4-digit verification code
    const rsvp = await prisma.rsvp.create({
      data: {
        eventId: targetEventId,
        slug: generateRsvpSlug(familyName.trim()),
        familyName: familyName.trim(),
        invitedBy: invitedBy?.trim() || null,
        invitationSent: invitationSent === true,
        contactPhone: contactPhone?.trim() || null,
        comments: comments?.trim() || null,
        verificationCode: randomCode,
        guests: {
          create: guests.map((guest) => ({
            name: guest.name,
            isChild: guest.isChild || false,
            confirmed: guest.confirmed !== false,
          })),
        },
      },
    });

    return NextResponse.json({ success: true, rsvpId: rsvp.id });
  } catch (error) {
    console.error('Error saving RSVP with Prisma:', error);
    return NextResponse.json({ error: 'Error al guardar la confirmación.' }, { status: 500 });
  }
}
