import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyAdmin } from '@/lib/auth';

const SIDES = ['MAMA', 'PAPA'] as const;
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

// POST /api/admin/tables { eventId, side, name? } -> crea una mesa (siempre de 12 asientos)
export async function POST(request: Request) {
  try {
    if (!(await verifyAdmin())) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const eventId = Number(body?.eventId);
    const side = body?.side;

    if (!Number.isInteger(eventId) || eventId <= 0) {
      return NextResponse.json({ error: 'eventId inválido' }, { status: 400 });
    }
    if (!isSide(side)) {
      return NextResponse.json({ error: 'El lado debe ser MAMA o PAPA.' }, { status: 400 });
    }

    // Regla del evento: todas las mesas son de 12 asientos.
    const seats = 12;

    // Nombre y posición automáticos según cuántas mesas del mismo lado existen.
    const countSameSide = await prisma.eventTable.count({ where: { eventId, side } });
    const name =
      typeof body?.name === 'string' && body.name.trim()
        ? body.name.trim()
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

// PUT /api/admin/tables { id, name?, side?, position? } -> actualiza una mesa
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

    const data: { name?: string; side?: Side; position?: number } = {};
    if (typeof body?.name === 'string' && body.name.trim()) data.name = body.name.trim();
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
    }

    const table = await prisma.eventTable.update({ where: { id }, data });
    return NextResponse.json({ table });
  } catch (error) {
    console.error('Error updating table:', error);
    return NextResponse.json({ error: 'Error al actualizar la mesa' }, { status: 500 });
  }
}

// DELETE /api/admin/tables?id=1 -> borra la mesa (las familias quedan sin asignar)
export async function DELETE(request: Request) {
  try {
    if (!(await verifyAdmin())) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = parseInt(searchParams.get('id') || '', 10);
    if (!Number.isInteger(id)) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
    }

    await prisma.eventTable.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting table:', error);
    return NextResponse.json({ error: 'Error al eliminar la mesa' }, { status: 500 });
  }
}
