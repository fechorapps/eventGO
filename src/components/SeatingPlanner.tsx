'use client';

import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
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
import {
  Users,
  Plus,
  Trash2,
  RefreshCw,
  Baby,
  Pencil,
  X,
  AlertTriangle,
  GripVertical,
  CheckCircle2,
} from 'lucide-react';

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
const OVER_COLOR = '#B22222';

function headcount(f: Family) {
  return f.guests.length;
}
function confirmedCount(f: Family) {
  return f.guests.filter((g) => g.confirmed === true).length;
}

// ---------- Family card (draggable, used in tray + drag overlay) ----------
function FamilyCard({ family, overlay = false }: { family: Family; overlay?: boolean }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `fam-${family.id}`,
    data: { rsvpId: family.id, side: family.side, size: headcount(family) },
    disabled: overlay,
  });

  const kids = family.guests.filter((g) => g.isChild).length;
  const sideColor = family.side ? SIDE_COLOR[family.side] : '#9aa0a6';

  return (
    <div
      ref={overlay ? undefined : setNodeRef}
      {...(overlay ? {} : listeners)}
      {...(overlay ? {} : attributes)}
      className={`seat-family-card${overlay ? ' is-overlay' : ''}`}
      style={{ opacity: isDragging ? 0.35 : 1 }}
    >
      <GripVertical size={14} className="seat-grip" aria-hidden />
      <span className="seat-side-dot" style={{ background: sideColor }} aria-hidden />
      <div className="seat-family-info">
        <span className="seat-family-name">{family.familyName}</span>
        <span className="seat-family-meta">
          {family.side ? `Lado ${SIDE_LABEL[family.side]}` : 'Sin lado'}
          {kids > 0 && (
            <span className="seat-kids-chip">
              {' · '}
              <Baby size={11} aria-hidden /> {kids}
            </span>
          )}
          {` · ${confirmedCount(family)} conf.`}
        </span>
      </div>
      <span className="seat-count-badge" title={`${headcount(family)} integrantes`}>
        <Users size={11} aria-hidden /> {headcount(family)}
      </span>
    </div>
  );
}

// ---------- Compact chip for a family already seated at a table ----------
function SeatedChip({ family, color }: { family: Family; color: string }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `fam-${family.id}`,
    data: { rsvpId: family.id, side: family.side, size: headcount(family) },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className="seat-chip"
      style={{
        opacity: isDragging ? 0.35 : 1,
        background: `${color}12`,
        borderColor: `${color}33`,
      }}
      title={`${family.familyName} · ${headcount(family)} integrantes`}
    >
      <span className="seat-chip-name">{family.familyName}</span>
      <span className="seat-chip-count" style={{ color }}>{headcount(family)}</span>
    </div>
  );
}

// ---------- Round table seen from above ----------
// `guests` trae los nombres en orden de asiento; el punto i es la persona i.
function TableViz({
  seats,
  guests,
  color,
  isOver,
}: {
  seats: number;
  guests: string[];
  color: string;
  isOver: boolean;
}) {
  const size = 120;
  const c = size / 2;
  const ringR = 50;
  const totalDots = Math.max(seats, guests.length);
  const dotR = totalDots > 14 ? 4 : 5;
  const topR = 34;
  const occupied = guests.length;
  const over = occupied > seats;

  const dots = [];
  for (let i = 0; i < totalDots; i++) {
    const ang = ((-90 + (i * 360) / totalDots) * Math.PI) / 180;
    const cx = c + ringR * Math.cos(ang);
    const cy = c + ringR * Math.sin(ang);
    const filled = i < occupied;
    const overflowSeat = i >= seats;
    dots.push(
      <circle
        key={i}
        className="seat-dot"
        cx={cx}
        cy={cy}
        r={dotR}
        fill={filled ? (overflowSeat ? OVER_COLOR : color) : '#fff'}
        stroke={filled ? 'none' : 'rgba(0,0,0,0.22)'}
        strokeWidth={filled ? 0 : 1.4}
      >
        <title>{filled ? guests[i] : 'Asiento libre'}</title>
      </circle>
    );
  }

  return (
    <svg
      className="seat-table-viz"
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={`${occupied} de ${seats} asientos ocupados`}
    >
      {dots}
      <circle
        cx={c}
        cy={c}
        r={topR}
        fill={isOver ? `${color}1f` : occupied === 0 ? 'rgba(0,0,0,0.02)' : `${color}0d`}
        stroke={over ? OVER_COLOR : `${color}${occupied === 0 ? '40' : '66'}`}
        strokeWidth={1.6}
        strokeDasharray={occupied === 0 ? '4 4' : undefined}
      />
      <text
        x={c}
        y={c + 1}
        textAnchor="middle"
        fontSize="24"
        fontWeight="600"
        fill={over ? OVER_COLOR : occupied === 0 ? 'rgba(0,0,0,0.35)' : color}
      >
        {occupied}
      </text>
      <text x={c} y={c + 17} textAnchor="middle" fontSize="10" fill="rgba(0,0,0,0.45)">
        de {seats}
      </text>
    </svg>
  );
}

// ---------- Table card (droppable) ----------
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
  const { setNodeRef, isOver } = useDroppable({
    id: `table-${table.id}`,
    data: { tableId: table.id, side: table.side },
  });
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(table.name);
  const inputRef = useRef<HTMLInputElement>(null);

  const seatNames = families.flatMap((f) => f.guests.map((g) => g.name));
  const occupied = seatNames.length;
  const over = occupied > table.seats;
  const color = SIDE_COLOR[table.side];

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  function commitRename() {
    setEditing(false);
    const name = draft.trim();
    if (name && name !== table.name) onRename(table.id, name);
    else setDraft(table.name);
  }

  return (
    <div
      ref={setNodeRef}
      className={`seat-table-card${isOver ? ' is-over' : ''}`}
      style={{ boxShadow: isOver ? `0 0 0 2px ${color}66, 0 8px 20px rgba(0,0,0,0.08)` : undefined }}
    >
      <button
        type="button"
        className="seat-table-delete"
        onClick={() => onDelete(table.id)}
        title="Eliminar mesa"
        aria-label={`Eliminar ${table.name}`}
      >
        <Trash2 size={14} />
      </button>

      <TableViz seats={table.seats} guests={seatNames} color={color} isOver={isOver} />

      {editing ? (
        <input
          ref={inputRef}
          className="seat-table-name-input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitRename}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitRename();
            if (e.key === 'Escape') {
              setDraft(table.name);
              setEditing(false);
            }
          }}
          maxLength={40}
        />
      ) : (
        <button
          type="button"
          className="seat-table-name"
          onClick={() => setEditing(true)}
          title="Renombrar mesa"
        >
          {table.name} <Pencil size={11} aria-hidden style={{ opacity: 0.45 }} />
        </button>
      )}

      {over && (
        <span className="seat-over-chip">
          <AlertTriangle size={11} aria-hidden /> {occupied - table.seats} sobrecupo
        </span>
      )}

      {families.length === 0 ? (
        <span className="seat-empty-hint">Arrastra familias aquí</span>
      ) : (
        <div className="seat-table-chips">
          {families.map((f) => (
            <SeatedChip key={f.id} family={f} color={color} />
          ))}
        </div>
      )}
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
        <Users size={15} aria-hidden /> Familias sin asignar
        <span className="seat-tray-count">{families.length}</span>
      </div>
      {families.length === 0 ? (
        <p className="seat-tray-empty">
          <CheckCircle2 size={15} aria-hidden /> Todas las familias están asignadas
        </p>
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

// ---------- Side section ----------
function SideSection({
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
  const totalSeated = tables.reduce(
    (s, t) => s + (familiesByTable.get(t.id)?.reduce((a, f) => a + headcount(f), 0) || 0),
    0
  );
  const totalSeats = tables.reduce((s, t) => s + t.seats, 0);

  return (
    <section className="seat-side-column" style={{ background: `${color}08` }}>
      <div className="seat-side-header">
        <span className="seat-side-title" style={{ color }}>
          <span className="seat-side-dot" style={{ background: color }} aria-hidden />
          Lado {SIDE_LABEL[side]}
        </span>
        <span className="seat-side-total">
          {tables.length} {tables.length === 1 ? 'mesa' : 'mesas'} · {totalSeated}/{totalSeats} asientos
        </span>
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
        <button
          type="button"
          className="seat-add-table"
          style={{ color, borderColor: `${color}55` }}
          onClick={() => onAddTable(side)}
        >
          <Plus size={18} aria-hidden />
          <span>Agregar mesa</span>
        </button>
      </div>
    </section>
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
  const pct = totalGuests > 0 ? Math.round((seatedGuests / totalGuests) * 100) : 0;

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
          <div className="seat-summary-info">
            <strong>{eventName || 'Acomodo de mesas'}</strong>
            <span className="seat-summary-sub">
              {families.length} familias · {seatedGuests}/{totalGuests} personas sentadas ({pct}%) · {tables.length}{' '}
              {tables.length === 1 ? 'mesa' : 'mesas'}
            </span>
            <div
              className="seat-progress"
              role="progressbar"
              aria-valuenow={pct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Personas sentadas"
            >
              <div className="seat-progress-fill" style={{ width: `${pct}%` }} />
            </div>
          </div>
          <button type="button" className="btn-outline" onClick={load} style={{ padding: '0.4rem 0.9rem' }}>
            <RefreshCw size={14} aria-hidden /> Actualizar
          </button>
        </div>

        {error && (
          <div className="seat-error">
            <AlertTriangle size={15} aria-hidden /> {error}
            <button
              type="button"
              onClick={() => setError('')}
              className="seat-icon-btn"
              style={{ marginLeft: 'auto' }}
              aria-label="Cerrar error"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Unassigned tray */}
        <UnassignedTray families={unassigned} />

        {/* Sides */}
        <div className="seat-sides">
          <SideSection
            side="MAMA"
            tables={tablesBySide.MAMA}
            familiesByTable={familiesByTable}
            onAddTable={addTable}
            onDeleteTable={deleteTable}
            onRenameTable={renameTable}
          />
          <SideSection
            side="PAPA"
            tables={tablesBySide.PAPA}
            familiesByTable={familiesByTable}
            onAddTable={addTable}
            onDeleteTable={deleteTable}
            onRenameTable={renameTable}
          />
        </div>
      </div>

      <DragOverlay>{activeFamily ? <FamilyCard family={activeFamily} overlay /> : null}</DragOverlay>
    </DndContext>
  );
}
