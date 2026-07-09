import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const rsvpId = Number(body?.rsvpId);
    const code = String(body?.code ?? '').trim();

    if (!Number.isInteger(rsvpId) || rsvpId <= 0 || !/^\d{4}$/.test(code)) {
      return NextResponse.json({ error: 'Datos de verificación inválidos.' }, { status: 400 });
    }

    const rsvp = await prisma.rsvp.findUnique({
      where: { id: rsvpId },
      select: { verificationCode: true },
    });

    if (!rsvp) {
      return NextResponse.json({ error: 'Confirmación no encontrada.' }, { status: 404 });
    }

    if (rsvp.verificationCode !== code) {
      return NextResponse.json({ error: 'Código de verificación incorrecto.' }, { status: 401 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error verifying RSVP code:', error);
    return NextResponse.json({ error: 'No fue posible validar el código.' }, { status: 500 });
  }
}
