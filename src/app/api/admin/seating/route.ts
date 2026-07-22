import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyAdmin } from '@/lib/auth';

const SIDES = ['MAMA', 'PAPA'] as const;
type Side = (typeof SIDES)[number];

function isSide(value: unknown): value is Side {
  return typeof value === 'string' && (SIDES as readonly string[]).includes(value);
}

// PATCH /api/admin/seating
//   { rsvpId, side }                -> etiqueta el lado de la familia (MAMA/PAPA/null)
//   { rsvpId, tableId }             -> asigna la familia a una mesa (null = quitar)
// Al asignar a una mesa se valida capacidad (<= asientos) y se ajusta el lado
// de la familia al de la mesa automáticamente.
export async function PATCH(request: Request) {
  try {
    if (!(await verifyAdmin())) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const rsvpId = Number(body?.rsvpId);
    if (!Number.isInteger(rsvpId) || rsvpId <= 0) {
      return NextResponse.json({ error: 'ID de familia inválido' }, { status: 400 });
    }

    const rsvp = await prisma.rsvp.findUnique({
      where: { id: rsvpId },
      include: { _count: { select: { guests: true } } },
    });
    if (!rsvp) {
      return NextResponse.json({ error: 'Familia no encontrada' }, { status: 404 });
    }

    // --- Solo cambio de lado (sin tocar mesa) ---
    if (body?.tableId === undefined && body?.side !== undefined) {
      const side = body.side === null ? null : body.side;
      if (side !== null && !isSide(side)) {
        return NextResponse.json({ error: 'Lado inválido' }, { status: 400 });
      }

      // Si cambia de lado y estaba en una mesa del lado contrario, se suelta.
      const data: { side: Side | null; tableId?: number | null } = { side };
      if (rsvp.tableId) {
        const table = await prisma.eventTable.findUnique({ where: { id: rsvp.tableId } });
        if (table && table.side !== side) data.tableId = null;
      }

      const updated = await prisma.rsvp.update({ where: { id: rsvpId }, data });
      return NextResponse.json({ success: true, rsvp: { id: updated.id, side: updated.side, tableId: updated.tableId } });
    }

    // --- Asignación / desasignación de mesa ---
    if (body?.tableId !== undefined) {
      // Quitar de la mesa.
      if (body.tableId === null) {
        const updated = await prisma.rsvp.update({ where: { id: rsvpId }, data: { tableId: null } });
        return NextResponse.json({ success: true, rsvp: { id: updated.id, side: updated.side, tableId: updated.tableId } });
      }

      const tableId = Number(body.tableId);
      if (!Number.isInteger(tableId) || tableId <= 0) {
        return NextResponse.json({ error: 'ID de mesa inválido' }, { status: 400 });
      }

      const table = await prisma.eventTable.findUnique({ where: { id: tableId } });
      if (!table) {
        return NextResponse.json({ error: 'Mesa no encontrada' }, { status: 404 });
      }
      if (table.eventId !== rsvp.eventId) {
        return NextResponse.json({ error: 'La mesa pertenece a otro evento.' }, { status: 400 });
      }

      // Capacidad: suma de integrantes de las familias ya en la mesa (excluyendo
      // a esta) + los de esta familia no debe exceder los asientos.
      const others = await prisma.rsvp.findMany({
        where: { tableId, id: { not: rsvpId } },
        include: { _count: { select: { guests: true } } },
      });
      const occupied = others.reduce((sum, r) => sum + r._count.guests, 0);
      const familySize = rsvp._count.guests;

      if (occupied + familySize > table.seats) {
        const free = Math.max(0, table.seats - occupied);
        return NextResponse.json(
          {
            error: `No caben. "${table.name}" tiene ${free} lugar(es) libre(s) y esta familia son ${familySize}.`,
            code: 'CAPACITY',
          },
          { status: 409 }
        );
      }

      // Asignar: el lado de la familia se ajusta al de la mesa.
      const updated = await prisma.rsvp.update({
        where: { id: rsvpId },
        data: { tableId, side: table.side },
      });
      return NextResponse.json({ success: true, rsvp: { id: updated.id, side: updated.side, tableId: updated.tableId } });
    }

    return NextResponse.json({ error: 'Nada que actualizar' }, { status: 400 });
  } catch (error) {
    console.error('Error updating seating:', error);
    return NextResponse.json({ error: 'Error al actualizar el acomodo' }, { status: 500 });
  }
}
