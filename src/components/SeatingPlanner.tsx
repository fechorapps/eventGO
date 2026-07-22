'use client';

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  closestCenter,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import { Users, Plus, Trash2, RefreshCw, Baby, Pencil, X, AlertTriangle } from 'lucide-react';

type Side = 'MAMA' | 'PAPA';

interface Guest {
  id: number;
  name: string;
  isChild: boolean;
  confirmed: boolean | null;
}

interface Family {
  id: number;
  familyName: string;
  side: Side | null;
  tableId: number | null;
  guests: Guest[];
}

interface TableRow {
  id: number;
  name: string;
  seats: number;
  side: Side;
  position: number;
}

interface SeatingPlannerProps {
  eventId: number;
  eventName?: string;
}

const SIDE_LABEL: Record<Side, string> = { MAMA: 'Mamá', PAPA: 'Papá' };
const SIDE_COLOR: Record<Side, string> = { MAMA: '#B5546F', PAPA: '#33567D' };

function headcount(f: Family) {
  return f.guests.length;
}
function confirmedCount(f: Family) {
  return f.guests.filter((g) => g.confirmed === true).length;
}

// ---------- Family card (draggable) ----------
function FamilyCard({ family, compact = false }: { family: Family; compact?: boolean }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `fam-${family.id}`,
    data: { rsvpId: family.id, side: family.side, size: headcount(family) },
  });

  const kids = family.guests.filter((g) => g.isChild).length;
  const sideColor = family.side ? SIDE_COLOR[family.side] : '#9aa0a6';

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className="seat-family-card"
      style={{
        opacity: isDragging ? 0.4 : 1,
        borderLeft: `4px solid ${sideColor}`,
        padding: compact ? '0.4rem 0.6rem' : '0.6rem 0.75rem',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
        <span className="seat-family-name">{family.familyName}</span>
        <span className="seat-count-badge" title="Integrantes">
          <Users size={12} /> {headcount(family)}
        </span>
      </div>
      {!compact && (
        <div className="seat-family-meta">
          {family.side && (
            <span className="seat-side-chip" style={{ background: `${sideColor}22`, color: sideColor }}>
              {SIDE_LABEL[family.side]}
            </span>
          )}
          {kids > 0 && (
            <span className="seat-kids-chip">
              <Baby size={11} /> {kids}
            </span>
          )}
          <span className="seat-confirmed-chip">{confirmedCount(family)} conf.</span>
        </div>
      )}
    </div>
  );
}

// ---------- Table (droppable) ----------
function TableCard({
  table,
  families,
  onDelete,
  onRename,
}: {
  table: TableRow;
  families: Family[];
  onDelete: (id: number) => void;
  onRename: (id: number, name: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `table-${table.id}`, data: { tableId: table.id, side: table.side } });
  const occupied = families.reduce((s, f) => s + headcount(f), 0);
  const over = occupied > table.seats;
  const color = SIDE_COLOR[table.side];

  return (
    <div
      ref={setNodeRef}
      className="seat-table-card"
      style={{
        borderColor: isOver ? color : 'rgba(0,0,0,0.08)',
        boxShadow: isOver ? `0 0 0 2px ${color}55` : undefined,
        background: isOver ? `${color}0d` : '#fff',
      }}
    >
      <div className="seat-table-head">
        <button
          type="button"
          className="seat-table-name"
          onClick={() => {
            const name = window.prompt('Nombre de la mesa:', table.name);
            if (name && name.trim() && name.trim() !== table.name) onRename(table.id, name.trim());
          }}
          title="Renombrar mesa"
        >
          {table.name} <Pencil size={11} style={{ opacity: 0.5 }} />
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            className="seat-occupancy"
            style={{ background: over ? '#fdeaea' : `${color}18`, color: over ? '#B22222' : color }}
          >
            {over && <AlertTriangle size={12} />}
            {occupied} / {table.seats}
          </span>
          <button type="button" className="seat-icon-btn" onClick={() => onDelete(table.id)} title="Eliminar mesa">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <div className="seat-table-body">
        {families.length === 0 ? (
          <div className="seat-empty-drop">Arrastra familias aquí</div>
        ) : (
          families.map((f) => <FamilyCard key={f.id} family={f} compact />)
        )}
      </div>
    </div>
  );
}

// ---------- Unassigned tray (droppable) ----------
// Debe ser su propio componente para que useDroppable quede DENTRO del
// <DndContext> y registre correctamente la zona de "sin asignar".
function UnassignedTray({ families }: { families: Family[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: 'unassigned' });
  return (
    <div
      ref={setNodeRef}
      className="seat-tray"
      style={{
        background: isOver ? 'rgba(212,175,55,0.08)' : undefined,
        borderColor: isOver ? 'var(--gold-medium)' : undefined,
      }}
    >
      <div className="seat-tray-title">
        <Users size={15} /> Familias sin asignar
        <span className="seat-tray-count">{families.length}</span>
      </div>
      {families.length === 0 ? (
        <p className="seat-tray-empty">Todas las familias están asignadas 🎉</p>
      ) : (
        <div className="seat-tray-list">
          {families.map((f) => (
            <FamilyCard key={f.id} family={f} />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------- Side column ----------
function SideColumn({
  side,
  tables,
  familiesByTable,
  onAddTable,
  onDeleteTable,
  onRenameTable,
}: {
  side: Side;
  tables: TableRow[];
  familiesByTable: Map<number, Family[]>;
  onAddTable: (side: Side) => void;
  onDeleteTable: (id: number) => void;
  onRenameTable: (id: number, name: string) => void;
}) {
  const color = SIDE_COLOR[side];
  const totalSeated = tables.reduce((s, t) => s + (familiesByTable.get(t.id)?.reduce((a, f) => a + headcount(f), 0) || 0), 0);

  return (
    <div className="seat-side-column">
      <div className="seat-side-header" style={{ borderColor: color }}>
        <span style={{ color, fontWeight: 700 }}>Lado {SIDE_LABEL[side]}</span>
        <span className="seat-side-total">{tables.length} mesa(s) · {totalSeated} pers.</span>
      </div>

      <div className="seat-side-tables">
        {tables.map((t) => (
          <TableCard
            key={t.id}
            table={t}
            families={familiesByTable.get(t.id) || []}
            onDelete={onDeleteTable}
            onRename={onRenameTable}
          />
        ))}
      </div>

      <button type="button" className="seat-add-table" style={{ color, borderColor: `${color}55` }} onClick={() => onAddTable(side)}>
        <Plus size={15} /> Agregar mesa {SIDE_LABEL[side]}
      </button>
    </div>
  );
}

export default function SeatingPlanner({ eventId, eventName }: SeatingPlannerProps) {
  const [families, setFamilies] = useState<Family[]>([]);
  const [tables, setTables] = useState<TableRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeId, setActiveId] = useState<number | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } })
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [rRes, tRes] = await Promise.all([
        fetch(`/api/admin/rsvps?eventId=${eventId}`),
        fetch(`/api/admin/tables?eventId=${eventId}`),
      ]);
      if (!rRes.ok || !tRes.ok) throw new Error('No se pudieron cargar los datos.');
      const rData = await rRes.json();
      const tData = await tRes.json();
      setFamilies(rData.rsvps || []);
      setTables(tData.tables || []);
    } catch (e) {
      console.error(e);
      setError('Error al cargar el acomodo de mesas.');
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    load();
  }, [load]);

  const unassigned = useMemo(() => families.filter((f) => f.tableId == null), [families]);
  const familiesByTable = useMemo(() => {
    const map = new Map<number, Family[]>();
    for (const f of families) {
      if (f.tableId != null) {
        const arr = map.get(f.tableId) || [];
        arr.push(f);
        map.set(f.tableId, arr);
      }
    }
    return map;
  }, [families]);

  const tablesBySide = useMemo(() => {
    const mama = tables.filter((t) => t.side === 'MAMA');
    const papa = tables.filter((t) => t.side === 'PAPA');
    return { MAMA: mama, PAPA: papa };
  }, [tables]);

  const totalGuests = useMemo(() => families.reduce((s, f) => s + headcount(f), 0), [families]);
  const seatedGuests = useMemo(
    () => families.filter((f) => f.tableId != null).reduce((s, f) => s + headcount(f), 0),
    [families]
  );

  // --- API helpers ---
  async function assign(rsvpId: number, tableId: number | null) {
    const res = await fetch('/api/admin/seating', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rsvpId, tableId }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'No se pudo asignar la familia.');
    }
    setFamilies((prev) =>
      prev.map((f) => (f.id === rsvpId ? { ...f, tableId: data.rsvp.tableId, side: data.rsvp.side } : f))
    );
  }

  async function addTable(side: Side) {
    try {
      const res = await fetch('/api/admin/tables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, side }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setTables((prev) => [...prev, data.table]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo crear la mesa.');
    }
  }

  async function deleteTable(id: number) {
    if (!window.confirm('¿Eliminar esta mesa? Las familias asignadas quedarán sin asignar.')) return;
    try {
      const res = await fetch(`/api/admin/tables?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).error);
      setTables((prev) => prev.filter((t) => t.id !== id));
      setFamilies((prev) => prev.map((f) => (f.tableId === id ? { ...f, tableId: null } : f)));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo eliminar la mesa.');
    }
  }

  async function renameTable(id: number, name: string) {
    try {
      const res = await fetch('/api/admin/tables', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, name }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setTables((prev) => prev.map((t) => (t.id === id ? { ...t, name } : t)));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo renombrar.');
    }
  }

  function onDragStart(e: DragStartEvent) {
    const id = Number(String(e.active.id).replace('fam-', ''));
    setActiveId(Number.isFinite(id) ? id : null);
  }

  async function onDragEnd(e: DragEndEvent) {
    setActiveId(null);
    setError('');
    const { active, over } = e;
    if (!over) return;

    const rsvpId = Number(String(active.id).replace('fam-', ''));
    const family = families.find((f) => f.id === rsvpId);
    if (!family) return;

    const overId = String(over.id);

    try {
      if (overId === 'unassigned') {
        if (family.tableId != null) await assign(rsvpId, null);
        return;
      }
      if (overId.startsWith('table-')) {
        const tableId = Number(overId.replace('table-', ''));
        if (family.tableId === tableId) return;
        const table = tables.find((t) => t.id === tableId);
        if (!table) return;

        // Aviso si la familia estaba etiquetada del otro lado.
        if (family.side && family.side !== table.side) {
          const ok = window.confirm(
            `"${family.familyName}" está en lado ${SIDE_LABEL[family.side]}. Se moverá al lado ${SIDE_LABEL[table.side]}. ¿Continuar?`
          );
          if (!ok) return;
        }
        await assign(rsvpId, tableId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al mover la familia.');
    }
  }

  const activeFamily = activeId != null ? families.find((f) => f.id === activeId) || null : null;

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)' }}>
        <RefreshCw size={28} style={{ animation: 'spin 1.5s linear infinite' }} />
        <p style={{ marginTop: '0.8rem' }}>Cargando acomodo de mesas...</p>
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={onDragStart} onDragEnd={onDragEnd}>
      <div className="seat-planner">
        {/* Summary */}
        <div className="seat-summary">
          <div>
            <strong>{eventName || 'Acomodo de mesas'}</strong>
            <span className="seat-summary-sub">
              {families.length} familias · {seatedGuests}/{totalGuests} personas sentadas · {tables.length} mesas
            </span>
          </div>
          <button type="button" className="btn-outline" onClick={load} style={{ padding: '0.4rem 0.9rem' }}>
            <RefreshCw size={14} /> Actualizar
          </button>
        </div>

        {error && (
          <div className="seat-error">
            <AlertTriangle size={15} /> {error}
            <button type="button" onClick={() => setError('')} className="seat-icon-btn" style={{ marginLeft: 'auto' }}>
              <X size={14} />
            </button>
          </div>
        )}

        {/* Unassigned tray */}
        <UnassignedTray families={unassigned} />

        {/* Sides */}
        <div className="seat-sides">
          <SideColumn
            side="MAMA"
            tables={tablesBySide.MAMA}
            familiesByTable={familiesByTable}
            onAddTable={addTable}
            onDeleteTable={deleteTable}
            onRenameTable={renameTable}
          />
          <SideColumn
            side="PAPA"
            tables={tablesBySide.PAPA}
            familiesByTable={familiesByTable}
            onAddTable={addTable}
            onDeleteTable={deleteTable}
            onRenameTable={renameTable}
          />
        </div>
      </div>

      <DragOverlay>{activeFamily ? <FamilyCard family={activeFamily} /> : null}</DragOverlay>
    </DndContext>
  );
}
