import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import {
  generateVerificationCode,
  maskPhone,
  normalizeWhatsAppPhone,
} from '@/lib/rsvp-verification';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const rsvpId = Number(body?.rsvpId);

    if (!Number.isInteger(rsvpId) || rsvpId <= 0) {
      return NextResponse.json({ error: 'Identificador de confirmación inválido.' }, { status: 400 });
    }

    const existingRsvp = await prisma.rsvp.findUnique({
      where: { id: rsvpId },
      include: {
        event: {
          select: {
            rsvpPhone: true,
          },
        },
      },
    });

    if (!existingRsvp) {
      return NextResponse.json({ error: 'Confirmación no encontrada.' }, { status: 404 });
    }

    const verificationCode = generateVerificationCode();

    await prisma.rsvp.update({
      where: { id: rsvpId },
      data: { verificationCode },
    });

    const familyPhone = normalizeWhatsAppPhone(existingRsvp.contactPhone);
    const hostPhone = normalizeWhatsAppPhone(existingRsvp.event.rsvpPhone);

    if (familyPhone) {
      const message = `Tu código de confirmación de eventGO para la Familia ${existingRsvp.familyName} es: ${verificationCode}`;
      return NextResponse.json({
        success: true,
        whatsappUrl: `https://wa.me/${familyPhone}?text=${encodeURIComponent(message)}`,
        maskedPhone: maskPhone(existingRsvp.contactPhone),
        deliveryTarget: 'family',
      });
    }

    if (hostPhone) {
      const message = `¡Hola! Solicito mi código de verificación de asistencia para la Familia ${existingRsvp.familyName}.`;
      return NextResponse.json({
        success: true,
        whatsappUrl: `https://wa.me/${hostPhone}?text=${encodeURIComponent(message)}`,
        maskedPhone: '',
        deliveryTarget: 'host',
      });
    }

    return NextResponse.json({
      success: true,
      whatsappUrl: '',
      maskedPhone: '',
      deliveryTarget: 'manual',
    });
  } catch (error) {
    console.error('Error requesting RSVP verification code:', error);
    return NextResponse.json({ error: 'No fue posible generar el código de verificación.' }, { status: 500 });
  }
}
