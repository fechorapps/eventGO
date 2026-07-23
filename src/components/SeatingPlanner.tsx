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

function FamilyCard({ family, overlay = false, onClick }: { family: Family; overlay?: boolean; onClick?: () => void }) {
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
      style={{ opacity: isDragging ? 0.35 : 1, cursor: overlay ? 'default' : 'pointer' }}
      onClick={onClick}
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
function SeatedChip({ family, color, onClick }: { family: Family; color: string; onClick?: () => void }) {
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
        cursor: 'pointer'
      }}
      title={`${family.familyName} · ${headcount(family)} integrantes`}
      onClick={onClick}
    >
      <span className="seat-chip-name">{family.familyName}</span>
      <span className="seat-chip-count" style={{ color }}>{headcount(family)}</span>
    </div>
  );
}

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
  const [hoverInfo, setHoverInfo] = useState<{name: string, isFree: boolean, top: string, left: string} | null>(null);

  const size = 260; // Ampliado para dar espacio a los nombres
  const c = size / 2;
  const ringR = 60; // Radio del anillo de asientos
  const totalDots = Math.max(seats, guests.length);
  const dotR = totalDots > 14 ? 5 : 7;
  const topR = 40;
  const occupied = guests.length;
  const over = occupied > seats;

  const dots = [];
  for (let i = 0; i < totalDots; i++) {
    const ang = ((-90 + (i * 360) / totalDots) * Math.PI) / 180;
    const cx = c + ringR * Math.cos(ang);
    const cy = c + ringR * Math.sin(ang);
    const filled = i < occupied;
    const overflowSeat = i >= seats;
    
    // Calcular posición y anclaje del texto según el ángulo
    const textR = ringR + dotR + 6;
    const tx = c + textR * Math.cos(ang);
    const ty = c + textR * Math.sin(ang);
    
    let anchor: "start" | "middle" | "end" = "middle";
    let baseline: "hanging" | "middle" | "baseline" = "middle";
    if (Math.cos(ang) > 0.1) anchor = "start";
    else if (Math.cos(ang) < -0.1) anchor = "end";
    
    if (Math.sin(ang) > 0.1) baseline = "hanging";
    else if (Math.sin(ang) < -0.1) baseline = "baseline";

    dots.push(
      <g key={i}>
        <circle
          className="seat-dot"
          cx={cx}
          cy={cy}
          r={dotR}
          fill={filled ? (overflowSeat ? OVER_COLOR : color) : '#fff'}
          stroke={filled ? 'none' : 'rgba(0,0,0,0.22)'}
          strokeWidth={filled ? 0 : 1.4}
          onMouseEnter={() => setHoverInfo({ name: filled ? guests[i] : 'Asiento libre', isFree: !filled, left: `${(cx / size) * 100}%`, top: `${(cy / size) * 100}%` })}
          onMouseLeave={() => setHoverInfo(null)}
          style={{ cursor: 'pointer', transition: 'r 0.2s, fill 0.2s' }}
        />
        {filled && (
          <text
            x={tx}
            y={ty}
            fill="#555"
            fontSize="10"
            fontWeight="500"
            textAnchor={anchor}
            alignmentBaseline={baseline}
            pointerEvents="none"
          >
            {guests[i].split(' ')[0]} {/* Mostrar solo el primer nombre para no saturar */}
          </text>
        )}
      </g>
    );
  }

  return (
    <div className="relative w-full max-w-[280px] mx-auto">
      <svg
        className="seat-table-viz"
        style={{ width: '100%', height: 'auto', display: 'block' }}
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
      
      {/* Tooltip moderno flotante */}
      {hoverInfo && (
        <div
          className="absolute z-50 pointer-events-none -translate-x-1/2 -translate-y-[130%] bg-gray-900 text-white text-xs px-3 py-1.5 rounded shadow-lg whitespace-nowrap opacity-100 transition-opacity animate-in fade-in zoom-in-95 duration-200"
          style={{ left: hoverInfo.left, top: hoverInfo.top }}
        >
          {hoverInfo.name}
          {/* Triángulo inferior del tooltip */}
          <div className="absolute left-1/2 bottom-0 -translate-x-1/2 translate-y-full w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[5px] border-t-gray-900"></div>
        </div>
      )}
    </div>
  );
}

// ---------- Table card (droppable) ----------
function TableCard({
  table,
  families,
  onDelete,
  onRename,
  onSelectTable,
  onSelectFamily,
}: {
  table: TableRow;
  families: Family[];
  onDelete: (id: number) => void;
  onRename: (id: number, name: string) => void;
  onSelectTable: (t: TableRow) => void;
  onSelectFamily: (f: Family) => void;
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

      <div onClick={() => onSelectTable(table)} style={{ cursor: 'pointer' }} title="Ver lista de invitados">
        <TableViz seats={table.seats} guests={seatNames} color={color} isOver={isOver} />
      </div>

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
            <SeatedChip key={f.id} family={f} color={color} onClick={() => onSelectFamily(f)} />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------- Unassigned tray (droppable) ----------
// Debe ser su propio componente para que useDroppable quede DENTRO del
// <DndContext> y registre correctamente la zona de "sin asignar".
function UnassignedTray({ families, onSelectFamily }: { families: Family[]; onSelectFamily: (f: Family) => void }) {
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
            <FamilyCard key={f.id} family={f} onClick={() => onSelectFamily(f)} />
          ))}
        </div>
      )}
    </div>
  );
}

function SideSection({
  side,
  tables,
  familiesByTable,
  onAddTable,
  onDeleteTable,
  onRenameTable,
  onSelectTable,
  onSelectFamily,
}: {
  side: Side;
  tables: TableRow[];
  familiesByTable: Map<number, Family[]>;
  onAddTable: (side: Side) => void;
  onDeleteTable: (id: number) => void;
  onRenameTable: (id: number, name: string) => void;
  onSelectTable: (t: TableRow) => void;
  onSelectFamily: (f: Family) => void;
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
            onSelectTable={onSelectTable}
            onSelectFamily={onSelectFamily}
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

  // Estados para modales en móvil
  const [mobileFamilySelect, setMobileFamilySelect] = useState<Family | null>(null);
  const [mobileTableSelect, setMobileTableSelect] = useState<TableRow | null>(null);

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
        <UnassignedTray families={unassigned} onSelectFamily={setMobileFamilySelect} />

        {/* Sides */}
        <div className="seat-sides">
          <SideSection
            side="MAMA"
            tables={tablesBySide.MAMA}
            familiesByTable={familiesByTable}
            onAddTable={addTable}
            onDeleteTable={deleteTable}
            onRenameTable={renameTable}
            onSelectTable={setMobileTableSelect}
            onSelectFamily={setMobileFamilySelect}
          />
          <SideSection
            side="PAPA"
            tables={tablesBySide.PAPA}
            familiesByTable={familiesByTable}
            onAddTable={addTable}
            onDeleteTable={deleteTable}
            onRenameTable={renameTable}
            onSelectTable={setMobileTableSelect}
            onSelectFamily={setMobileFamilySelect}
          />
        </div>
      </div>

      {/* MODAL: Mover familia (Bottom Sheet) */}
      {mobileFamilySelect && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 transition-opacity sm:items-center animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom-8">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-[1.3rem] text-gold-dark font-serif font-medium">Asignar mesa</h3>
              <button onClick={() => setMobileFamilySelect(null)} className="p-2 -mr-2 text-gray-400 hover:text-gray-600"><X size={22} /></button>
            </div>
            <p className="text-sm text-gray-500 mb-6">Selecciona el destino para mover a la <strong>{mobileFamilySelect.familyName}</strong> ({headcount(mobileFamilySelect)} pax).</p>
            
            <div className="flex flex-col gap-3">
              <button 
                onClick={() => { assign(mobileFamilySelect.id, null); setMobileFamilySelect(null); }}
                className="w-full text-left p-4 rounded-xl border border-gray-200 hover:border-gold-medium transition-colors flex items-center justify-between bg-gray-50"
              >
                <span className="font-medium text-gray-700">Sin asignar (Remover de la mesa)</span>
                {mobileFamilySelect.tableId == null && <CheckCircle2 size={20} className="text-gold-dark" />}
              </button>
              
              {tables.map(t => {
                const currentOcc = (familiesByTable.get(t.id) || []).reduce((sum, f) => sum + headcount(f), 0);
                const isCurrent = mobileFamilySelect.tableId === t.id;
                return (
                  <button 
                    key={t.id}
                    onClick={() => { assign(mobileFamilySelect.id, t.id); setMobileFamilySelect(null); }}
                    className="w-full text-left p-4 rounded-xl border border-gray-200 hover:border-gold-medium hover:bg-gold-medium/5 transition-colors flex items-center justify-between"
                  >
                    <div>
                      <div className="font-semibold text-gray-800 text-[1.05rem] mb-1">{t.name}</div>
                      <div className="text-[0.75rem] uppercase tracking-widest text-gray-500">
                        Lado {SIDE_LABEL[t.side]} • {currentOcc}/{t.seats} ocupados
                      </div>
                    </div>
                    {isCurrent && <CheckCircle2 size={20} className="text-gold-dark" />}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Ver lista de invitados de la mesa (Bottom Sheet) */}
      {mobileTableSelect && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 transition-opacity sm:items-center animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom-8">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-[1.5rem] text-gold-dark font-serif font-medium leading-none mb-2">{mobileTableSelect.name}</h3>
                <span className="text-[0.75rem] uppercase tracking-widest text-gray-500 bg-gray-100 px-2 py-1 rounded">Lado {SIDE_LABEL[mobileTableSelect.side]}</span>
              </div>
              <button onClick={() => setMobileTableSelect(null)} className="p-2 -mr-2 -mt-2 text-gray-400 hover:text-gray-600"><X size={24} /></button>
            </div>
            
            <div>
              <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3 border-b border-gray-100 pb-2">Invitados sentados aquí</h4>
              <div className="flex flex-col gap-3">
                {(!familiesByTable.get(mobileTableSelect.id) || familiesByTable.get(mobileTableSelect.id)!.length === 0) && (
                  <p className="text-gray-400 text-sm italic text-center py-6">Esta mesa está vacía.</p>
                )}
                {familiesByTable.get(mobileTableSelect.id)?.map(fam => (
                  <div key={fam.id} className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm flex justify-between items-center gap-4">
                    <div className="flex-1">
                      <div className="font-semibold text-gray-800 text-[1rem] mb-2">{fam.familyName}</div>
                      <div className="text-[0.85rem] text-gray-600 flex flex-col gap-1.5 pl-3 border-l-[3px] border-gold-medium/40">
                        {fam.guests.map(g => (
                          <span key={g.id} className="flex items-center gap-2">
                            {g.name} 
                            {g.isChild && <span className="bg-blue-50 text-blue-600 text-[0.6rem] uppercase px-1.5 py-0.5 rounded-full font-bold">Niño</span>}
                          </span>
                        ))}
                      </div>
                    </div>
                    <button 
                      onClick={() => { setMobileTableSelect(null); setMobileFamilySelect(fam); }}
                      className="shrink-0 text-gold-dark bg-gold-medium/10 p-3 rounded-full hover:bg-gold-medium/20 transition-colors"
                      title="Mover de mesa"
                    >
                      <RefreshCw size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <DragOverlay>{activeFamily ? <FamilyCard family={activeFamily} overlay /> : null}</DragOverlay>
    </DndContext>
  );
}
