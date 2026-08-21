import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyAdmin } from '@/lib/auth';

const SIDES = ['MAMA', 'PAPA', 'UNASSIGNED'] as const;
type Side = (typeof SIDES)[number];

function isSide(value: unknown): value is Side {
  return typeof value === 'string' && (SIDES as readonly string[]).includes(value);
}

// GET /api/admin/tables?eventId=1 -> lista de mesas del evento
export async function GET(request: Request) {
  try {
    if (!(await verifyAdmin())) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const eventId = parseInt(searchParams.get('eventId') || '', 10);
    if (!Number.isInteger(eventId)) {
      return NextResponse.json({ error: 'eventId requerido' }, { status: 400 });
    }

    const tables = await prisma.eventTable.findMany({
      where: { eventId },
      orderBy: [{ side: 'asc' }, { position: 'asc' }, { id: 'asc' }],
    });

    return NextResponse.json({ tables });
  } catch (error) {
    console.error('Error listing tables:', error);
    return NextResponse.json({ error: 'Error al obtener las mesas' }, { status: 500 });
  }
}

// POST /api/admin/tables { eventId, side, seats?, name? } -> crea una mesa
export async function POST(request: Request) {
  try {
    if (!(await verifyAdmin())) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const eventId = Number(body?.eventId);
    const side = body?.side ?? 'UNASSIGNED';

    if (!Number.isInteger(eventId) || eventId <= 0) {
      return NextResponse.json({ error: 'eventId inválido' }, { status: 400 });
    }
    if (!isSide(side)) {
      return NextResponse.json({ error: 'El lado debe ser MAMA, PAPA o UNASSIGNED.' }, { status: 400 });
    }

    const seats = body?.seats === undefined ? 12 : Number(body.seats);
    if (!Number.isInteger(seats) || seats < 1 || seats > 30) {
      return NextResponse.json({ error: 'La capacidad debe ser un número entre 1 y 30.' }, { status: 400 });
    }

    // Nombre y posición automáticos según cuántas mesas del mismo lado existen.
    const countSameSide = await prisma.eventTable.count({ where: { eventId, side } });
    const name =
      typeof body?.name === 'string' && body.name.trim()
        ? body.name.trim()
        : side === 'UNASSIGNED'
          ? `Mesa ${countSameSide + 1}`
          : `Mesa ${side === 'MAMA' ? 'Mamá' : 'Papá'} ${countSameSide + 1}`;

    const table = await prisma.eventTable.create({
      data: { eventId, side, name, seats, position: countSameSide },
    });

    return NextResponse.json({ table }, { status: 201 });
  } catch (error) {
    console.error('Error creating table:', error);
    return NextResponse.json({ error: 'Error al crear la mesa' }, { status: 500 });
  }
}

// PUT /api/admin/tables { id, name?, seats?, side?, position? } -> actualiza una mesa
export async function PUT(request: Request) {
  try {
    if (!(await verifyAdmin())) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const id = Number(body?.id);
    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json({ error: 'ID de mesa inválido' }, { status: 400 });
    }

    const data: { name?: string; seats?: number; side?: Side; position?: number } = {};
    if (typeof body?.name === 'string' && body.name.trim()) data.name = body.name.trim();
    if (body?.seats !== undefined) {
      const seats = Number(body.seats);
      if (!Number.isInteger(seats) || seats < 1 || seats > 30) {
        return NextResponse.json({ error: 'La capacidad debe ser un número entre 1 y 30.' }, { status: 400 });
      }
      data.seats = seats;
    }
    if (body?.side !== undefined) {
      if (!isSide(body.side)) {
        return NextResponse.json({ error: 'Lado inválido' }, { status: 400 });
      }
      data.side = body.side;
    }
    if (body?.position !== undefined && Number.isInteger(Number(body.position))) {
      data.position = Number(body.position);
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'Nada que actualizar' }, { status: 400 });
    }

    // Si la mesa cambia de lado, las familias asignadas de otro lado se sueltan
    // para no dejar mezclas inconsistentes.
    if (data.side) {
      await prisma.rsvp.updateMany({
        where: { tableId: id, side: { not: data.side } },
        data: { tableId: null },
      });
      await prisma.guest.updateMany({ where: { tableId: id }, data: { tableId: null } });
    }

    const table = await prisma.eventTable.update({ where: { id }, data });
    return NextResponse.json({ table });
  } catch (error) {
    console.error('Error updating table:', error);
    return NextResponse.json({ error: 'Error al actualizar la mesa' }, { status: 500 });
  }
}

// DELETE /api/admin/tables?id=1 -> borra una mesa; ?eventId=1&reset=true vacía todo el acomodo
export async function DELETE(request: Request) {
  try {
    if (!(await verifyAdmin())) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    if (searchParams.get('reset') === 'true') {
      const eventId = parseInt(searchParams.get('eventId') || '', 10);
      if (!Number.isInteger(eventId) || eventId <= 0) {
        return NextResponse.json({ error: 'eventId requerido' }, { status: 400 });
      }

      const result = await prisma.$transaction(async (tx) => {
        // La base compartida con la nueva API puede tener asignaciones por
        // asiento. Se eliminan antes que las mesas para respetar su FK
        // restrictiva; la instalación legacy todavía no crea esta tabla.
        const [seatAssignmentsTable] = await tx.$queryRaw<Array<{ exists: boolean }>>`
          SELECT to_regclass('public.seat_assignments') IS NOT NULL AS exists
        `;
        if (seatAssignmentsTable?.exists) {
          await tx.$executeRaw`
            DELETE FROM "seat_assignments"
            WHERE "table_id" IN (SELECT "id" FROM "tables" WHERE "event_id" = ${eventId})
          `;
        }
        const unassigned = await tx.rsvp.updateMany({
          where: { eventId, tableId: { not: null } },
          data: { tableId: null },
        });
        await tx.guest.updateMany({
          where: { rsvp: { eventId }, tableId: { not: null } },
          data: { tableId: null },
        });
        const deleted = await tx.eventTable.deleteMany({ where: { eventId } });
        return { unassigned: unassigned.count, deleted: deleted.count };
      });

      return NextResponse.json({ success: true, ...result });
    }

    const id = parseInt(searchParams.get('id') || '', 10);
    if (!Number.isInteger(id)) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
    }

    const table = await prisma.eventTable.findUnique({ where: { id }, select: { id: true } });
    if (!table) {
      return NextResponse.json({ error: 'La mesa ya no existe. Actualiza el acomodo.' }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      const [seatAssignmentsTable] = await tx.$queryRaw<Array<{ exists: boolean }>>`
        SELECT to_regclass('public.seat_assignments') IS NOT NULL AS exists
      `;
      if (seatAssignmentsTable?.exists) {
        await tx.$executeRaw`DELETE FROM "seat_assignments" WHERE "table_id" = ${id}`;
      }
      // No dependemos de que una instalación antigua tenga ON DELETE SET NULL.
      await tx.rsvp.updateMany({ where: { tableId: id }, data: { tableId: null } });
      await tx.guest.updateMany({ where: { tableId: id }, data: { tableId: null } });
      await tx.eventTable.delete({ where: { id } });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting table:', error);
    return NextResponse.json({ error: 'Error al eliminar la mesa' }, { status: 500 });
  }
}
