import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyAdmin } from '@/lib/auth';

const SIDES = ['MAMA', 'PAPA'] as const;
type Side = (typeof SIDES)[number];

function isSide(value: unknown): value is Side {
  return typeof value === 'string' && (SIDES as readonly string[]).includes(value);
}

// PATCH /api/admin/seating
// { rsvpId, tableId } assigns every member of a family.
// { guestId, tableId } assigns only one guest.
export async function PATCH(request: Request) {
  try {
    if (!(await verifyAdmin())) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    const body = await request.json();
    const guestId = Number(body?.guestId);

    if (Number.isInteger(guestId) && guestId > 0) {
      const guest = await prisma.guest.findUnique({ where: { id: guestId }, include: { rsvp: true } });
      if (!guest) return NextResponse.json({ error: 'Invitado no encontrado' }, { status: 404 });
      if (body?.tableId === undefined) return NextResponse.json({ error: 'Mesa requerida' }, { status: 400 });
      let tableId: number | null = null;
      let side = guest.rsvp.side;
      if (body.tableId !== null) {
        tableId = Number(body.tableId);
        if (!Number.isInteger(tableId) || tableId <= 0) return NextResponse.json({ error: 'ID de mesa inválido' }, { status: 400 });
        const table = await prisma.eventTable.findUnique({ where: { id: tableId } });
        if (!table || table.eventId !== guest.rsvp.eventId) return NextResponse.json({ error: 'Mesa no encontrada para este evento' }, { status: 404 });
        const occupied = await prisma.guest.count({ where: { tableId, id: { not: guestId } } });
        if (occupied >= table.seats) return NextResponse.json({ error: `No caben. \"${table.name}\" no tiene lugares libres.`, code: 'CAPACITY' }, { status: 409 });
        side = table.side;
      }
      const result = await prisma.$transaction(async (tx) => {
        const nextGuest = await tx.guest.update({ where: { id: guestId }, data: { tableId } });
        const familyGuests = await tx.guest.findMany({ where: { rsvpId: guest.rsvpId }, select: { tableId: true } });
        const assigned = [...new Set(familyGuests.map((item) => item.tableId))];
        const summaryTableId = assigned.length === 1 ? assigned[0] : null;
        const rsvp = await tx.rsvp.update({ where: { id: guest.rsvpId }, data: { tableId: summaryTableId, ...(side ? { side } : {}) } });
        return { nextGuest, rsvp };
      });
      return NextResponse.json({ success: true, guest: { id: result.nextGuest.id, tableId: result.nextGuest.tableId }, rsvp: { id: result.rsvp.id, tableId: result.rsvp.tableId, side: result.rsvp.side } });
    }

    const rsvpId = Number(body?.rsvpId);
    if (!Number.isInteger(rsvpId) || rsvpId <= 0) return NextResponse.json({ error: 'ID de familia inválido' }, { status: 400 });
    const rsvp = await prisma.rsvp.findUnique({ where: { id: rsvpId }, include: { _count: { select: { guests: true } } } });
    if (!rsvp) return NextResponse.json({ error: 'Familia no encontrada' }, { status: 404 });

    if (body?.tableId === undefined && body?.side !== undefined) {
      const side = body.side === null ? null : body.side;
      if (side !== null && !isSide(side)) return NextResponse.json({ error: 'Lado inválido' }, { status: 400 });
      await prisma.rsvp.update({ where: { id: rsvpId }, data: { side } });
      return NextResponse.json({ success: true });
    }
    if (body?.tableId === undefined) return NextResponse.json({ error: 'Nada que actualizar' }, { status: 400 });

    let tableId: number | null = null;
    let side = rsvp.side;
    if (body.tableId !== null) {
      tableId = Number(body.tableId);
      if (!Number.isInteger(tableId) || tableId <= 0) return NextResponse.json({ error: 'ID de mesa inválido' }, { status: 400 });
      const table = await prisma.eventTable.findUnique({ where: { id: tableId } });
      if (!table || table.eventId !== rsvp.eventId) return NextResponse.json({ error: 'Mesa no encontrada para este evento' }, { status: 404 });
      const occupied = await prisma.guest.count({ where: { tableId, rsvpId: { not: rsvpId } } });
      if (occupied + rsvp._count.guests > table.seats) return NextResponse.json({ error: `No caben. \"${table.name}\" tiene ${Math.max(0, table.seats - occupied)} lugar(es) libre(s) y esta familia son ${rsvp._count.guests}.`, code: 'CAPACITY' }, { status: 409 });
      side = table.side;
    }
    const updated = await prisma.$transaction(async (tx) => {
      await tx.guest.updateMany({ where: { rsvpId }, data: { tableId } });
      return tx.rsvp.update({ where: { id: rsvpId }, data: { tableId, ...(side ? { side } : {}) } });
    });
    return NextResponse.json({ success: true, rsvp: { id: updated.id, tableId: updated.tableId, side: updated.side } });
  } catch (error) {
    console.error('Error updating seating:', error);
    return NextResponse.json({ error: 'Error al actualizar el acomodo' }, { status: 500 });
  }
}
