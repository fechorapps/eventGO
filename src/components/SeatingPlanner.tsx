'use client';

/*
 * DIRECTION CONTRACT (impeccable surface round, seed 339b7a84)
 * THESIS: one side at a time, then the whole room — the guided stepper the
 *   organizer chose over a free-form room, so the seating task is never more
 *   than one decision at once, without ever forbidding a mixed table.
 * OWN-WORLD: inherited from /admin's now-unified slate/near-black system
 *   (bg-white cards, #e2e8f0 borders, #0f172a primary text) — not the boutique
 *   gold/serif this component used before. Mamá #B5546F / Papá #33567D stay
 *   fixed, a confirmed brand commitment.
 * STORY: the organizer opens Mamá's step, seats her families, moves to Papá,
 *   then lands on Revisión — every table, both sides, at a glance — to catch
 *   overflow and finish mixed-table adjustments free-form.
 * FIRST VIEWPORT: summary bar, then a three-segment stepper (Mamá · Papá ·
 *   Revisión) carrying live seated/total counts per segment; below it, the
 *   active step's unassigned tray and table grid, filtered to that side.
 * FORM: surface-scope structural roll, dealt indices 4/1/7; index 4 ("Lista
 *   de Mesas") led. The user chose index 7, "Asistente Paso a Paso", over
 *   the dealt lead.
 * FINISH: unreviewed and undocumented is unfinished; this build ends with
 *   the finish review, the verdict, and DESIGN.md.
 */

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
  FileDown,
  Download,
  ChevronDown,
  Circle,
  Square,
  RectangleHorizontal,
  Table2,
  Disc3,
  Music2,
  CakeSlice,
  Martini,
  GlassWater,
  Armchair,
  DoorOpen,
  Bath,
  Gamepad2,
  ChefHat,
  Tent,
  RotateCw,
  Copy,
  Gift,
  Group,
  Ungroup,
  ZoomIn,
  ZoomOut,
  type LucideIcon,
} from 'lucide-react';

type Side = 'MAMA' | 'PAPA';
type TableSide = Side | 'UNASSIGNED';

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
  side: TableSide;
  position: number;
}

interface SeatingPlannerProps {
  eventId: number;
  eventName?: string;
}

type TableShape = 'round' | 'square' | 'rectangle' | 'imperial';
const TABLE_SHAPES: TableShape[] = ['round', 'square', 'rectangle', 'imperial'];
type FloorItemKind = TableShape | 'dancefloor' | 'dj' | 'band' | 'desserts' | 'mixology' | 'bar' | 'stage' | 'lounge' | 'giftTable' | 'entrance' | 'bathroom' | 'playArea' | 'bouncyCastle' | 'kitchen';
interface FloorItem {
  id: string;
  kind: FloorItemKind;
  label: string;
  x: number;
  y: number;
  tableId?: number;
  scale?: number;
  rotation?: number;
  groupId?: string;
}
interface FloorPlanSnapshot {
  items: FloorItem[];
  settings: FloorSettings;
  defaultScales: Partial<Record<FloorItemKind, number>>;
}
type FloorOrientation = 'horizontal' | 'vertical';
interface FloorSettings {
  orientation: FloorOrientation;
  width: number;
  height: number;
}

const DEFAULT_FLOOR_SETTINGS: FloorSettings = { orientation: 'horizontal', width: 20, height: 12 };

const FLOOR_ITEM_LABEL: Record<FloorItemKind, string> = {
  round: 'Mesa redonda', square: 'Mesa cuadrada', rectangle: 'Mesa rectangular', imperial: 'Mesa imperial',
  dancefloor: 'Pista de baile', dj: 'Cabina DJ', band: 'Grupo musical', desserts: 'Barra de postres',
  mixology: 'Barra de mixología', bar: 'Barra de bebidas', stage: 'Escenario', lounge: 'Sala lounge', giftTable: 'Mesa de regalos', entrance: 'Entrada',
  bathroom: 'Baño', playArea: 'Área de juegos', bouncyCastle: 'Brincolín', kitchen: 'Cocina',
};
const TABLE_SHAPE_PLURAL: Record<TableShape, string> = {
  round: 'mesas redondas', square: 'mesas cuadradas', rectangle: 'mesas rectangulares', imperial: 'mesas imperiales',
};
const TABLE_SEAT_PRESETS = [4, 6, 8, 10, 12, 14, 16];
const FLOOR_ITEM_CATALOG: FloorItemKind[] = ['round', 'square', 'rectangle', 'imperial', 'dancefloor', 'dj', 'band', 'desserts', 'mixology', 'bar', 'stage', 'lounge', 'giftTable', 'entrance', 'bathroom', 'playArea', 'bouncyCastle', 'kitchen'];
const FLOOR_ITEM_ICON: Record<FloorItemKind, LucideIcon> = {
  round: Circle,
  square: Square,
  rectangle: RectangleHorizontal,
  imperial: Table2,
  dancefloor: Disc3,
  dj: Disc3,
  band: Music2,
  desserts: CakeSlice,
  mixology: Martini,
  bar: GlassWater,
  stage: Armchair,
  lounge: Armchair,
  giftTable: Gift,
  entrance: DoorOpen,
  bathroom: Bath,
  playArea: Gamepad2,
  bouncyCastle: Tent,
  kitchen: ChefHat,
};
const isTableShape = (kind: FloorItemKind): kind is TableShape => TABLE_SHAPES.includes(kind as TableShape);

const SIDE_LABEL: Record<Side, string> = { MAMA: 'Mamá', PAPA: 'Papá' };
const SIDE_COLOR: Record<Side, string> = { MAMA: '#B5546F', PAPA: '#33567D' };
const TABLE_SIDE_LABEL: Record<TableSide, string> = { ...SIDE_LABEL, UNASSIGNED: 'Mesa general' };
const TABLE_SIDE_COLOR: Record<TableSide, string> = { ...SIDE_COLOR, UNASSIGNED: '#527795' };
const OVER_COLOR = '#B22222';

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]!);
}

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

function TableViz({
  seats,
  guests,
  color,
  isOver,
  shape = 'round',
}: {
  seats: number;
  guests: string[];
  color: string;
  isOver: boolean;
  shape?: TableShape;
}) {
  const [hoverInfo, setHoverInfo] = useState<{name: string, isFree: boolean, top: string, left: string} | null>(null);

  const size = 220;
  const c = size / 2;
  const totalDots = Math.max(seats, guests.length);
  const dotR = totalDots > 14 ? 4.5 : 6;
  const occupied = guests.length;
  const over = occupied > seats;
  const tableSize = shape === 'round'
    ? { width: 80, height: 80, radius: 40 }
    : shape === 'imperial'
      ? { width: 142, height: 56, radius: 8 }
      : shape === 'rectangle'
        ? { width: 118, height: 62, radius: 12 }
        : { width: 86, height: 86, radius: 4 };

  const seatPosition = (index: number) => {
    if (shape === 'round') {
      const angle = ((-90 + (index * 360) / totalDots) * Math.PI) / 180;
      const ringRadius = 62;
      return { x: c + ringRadius * Math.cos(angle), y: c + ringRadius * Math.sin(angle) };
    }

    const margin = dotR + 7;
    const top = c - tableSize.height / 2 - margin;
    const right = c + tableSize.width / 2 + margin;
    const bottom = c + tableSize.height / 2 + margin;
    const left = c - tableSize.width / 2 - margin;
    const perimeter = 2 * (tableSize.width + tableSize.height);
    let distance = ((index + 0.5) * perimeter) / totalDots;

    if (distance < tableSize.width) return { x: left + distance, y: top };
    distance -= tableSize.width;
    if (distance < tableSize.height) return { x: right, y: top + distance };
    distance -= tableSize.height;
    if (distance < tableSize.width) return { x: right - distance, y: bottom };
    distance -= tableSize.width;
    return { x: left, y: bottom - distance };
  };

  const dots = [];
  for (let i = 0; i < totalDots; i++) {
    const { x, y } = seatPosition(i);
    const filled = i < occupied;
    const overflowSeat = i >= seats;

    dots.push(
      <circle
        key={i}
        className="seat-dot"
        cx={x}
        cy={y}
        r={dotR}
        fill={filled ? (overflowSeat ? OVER_COLOR : color) : '#fff'}
        stroke={filled ? 'none' : 'rgba(0,0,0,0.22)'}
        strokeWidth={filled ? 0 : 1.4}
        onMouseEnter={() => setHoverInfo({ name: filled ? guests[i] : 'Asiento libre', isFree: !filled, left: `${(x / size) * 100}%`, top: `${(y / size) * 100}%` })}
        onMouseLeave={() => setHoverInfo(null)}
        style={{ cursor: 'pointer', transition: 'r 0.2s, fill 0.2s' }}
      />
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
        {shape === 'round' ? (
          <circle cx={c} cy={c} r={tableSize.radius} fill={isOver ? `${color}1f` : occupied === 0 ? 'rgba(0,0,0,0.02)' : `${color}0d`} stroke={over ? OVER_COLOR : `${color}${occupied === 0 ? '40' : '66'}`} strokeWidth={1.6} strokeDasharray={occupied === 0 ? '4 4' : undefined} />
        ) : (
          <rect x={c - tableSize.width / 2} y={c - tableSize.height / 2} width={tableSize.width} height={tableSize.height} rx={tableSize.radius} fill={isOver ? `${color}1f` : occupied === 0 ? 'rgba(0,0,0,0.02)' : `${color}0d`} stroke={over ? OVER_COLOR : `${color}${occupied === 0 ? '40' : '66'}`} strokeWidth={1.6} strokeDasharray={occupied === 0 ? '4 4' : undefined} />
        )}
        <text
          x={c}
          y={c + 2}
          textAnchor="middle"
          fontSize="24"
          fontWeight="600"
          fill={over ? OVER_COLOR : occupied === 0 ? 'rgba(0,0,0,0.35)' : color}
        >
          {occupied}
        </text>
        <text x={c} y={c + 18} textAnchor="middle" fontSize="10" fill="rgba(0,0,0,0.45)">
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
  shape,
}: {
  table: TableRow;
  families: Family[];
  onDelete: (id: number) => void;
  onRename: (id: number, name: string) => void;
  onSelectTable: (t: TableRow) => void;
  onSelectFamily: (f: Family) => void;
  shape?: TableShape;
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
  const color = TABLE_SIDE_COLOR[table.side];

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
        <TableViz seats={table.seats} guests={seatNames} color={color} isOver={isOver} shape={shape} />
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
        background: isOver ? '#f1f5f9' : undefined,
        borderColor: isOver ? '#0f172a' : undefined,
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
  onAddTable: (side?: TableSide) => void;
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
          onClick={() => onAddTable()}
        >
          <Plus size={18} aria-hidden />
          <span>Agregar mesa</span>
        </button>
      </div>
    </section>
  );
}

// ---------- Revisión: todas las mesas de ambos lados, sin dividir en columnas ----------
function AllTablesGrid({
  tables,
  familiesByTable,
  eventId,
  onAddTable,
  onDeleteTable,
  onRenameTable,
  onSelectTable,
  onSelectFamily,
  onRequestClearSeating,
  resetRevision,
  editable = true,
}: {
  tables: TableRow[];
  familiesByTable: Map<number, Family[]>;
  eventId: number;
  onAddTable: (side?: TableSide, seats?: number) => Promise<TableRow | null>;
  onDeleteTable: (id: number) => void;
  onRenameTable: (id: number, name: string) => void;
  onSelectTable: (t: TableRow) => void;
  onSelectFamily: (f: Family) => void;
  onRequestClearSeating: () => void;
  resetRevision: number;
  editable?: boolean;
}) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [items, setItems] = useState<FloorItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [selectedShape, setSelectedShape] = useState<TableShape>('round');
  const [floorSettings, setFloorSettings] = useState<FloorSettings>(DEFAULT_FLOOR_SETTINGS);
  const [canvasMenu, setCanvasMenu] = useState<{ x: number; y: number } | null>(null);
  const [copiedItem, setCopiedItem] = useState<FloorItem | null>(null);
  const [tableBatchRequest, setTableBatchRequest] = useState<{ kind: TableShape; position?: { x: number; y: number } } | null>(null);
  const [tableCountDraft, setTableCountDraft] = useState(1);
  const [tableSeatsDraft, setTableSeatsDraft] = useState(12);
  const [addingTables, setAddingTables] = useState(false);
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [selectionBox, setSelectionBox] = useState<{ startX: number; startY: number; x: number; y: number } | null>(null);
  const floorSettingsRef = useRef<FloorSettings>(DEFAULT_FLOOR_SETTINGS);
  const dragRef = useRef<{ itemIds: string[]; originX: number; originY: number; positions: Record<string, { x: number; y: number }> } | null>(null);
  const itemResizeRef = useRef<{ id: string; kind: FloorItemKind; startX: number; startY: number; scale: number } | null>(null);
  const defaultScaleRef = useRef<Partial<Record<FloorItemKind, number>>>({});
  const undoHistoryRef = useRef<FloorPlanSnapshot[]>([]);
  const resizeRef = useRef<{ startX: number; startY: number; width: number; height: number } | null>(null);
  const addingTablesRef = useRef(false);
  const marqueeRef = useRef<{ startX: number; startY: number } | null>(null);
  const storageKey = `eventgo:floorplan:${eventId}`;
  const estimatedRoomCapacity = Math.max(1, Math.floor((floorSettings.width * floorSettings.height * .65) / 1.2));
  const recommendedSeats = TABLE_SEAT_PRESETS.reduce((closest, seats) => Math.abs(seats - estimatedRoomCapacity / tableCountDraft) < Math.abs(closest - estimatedRoomCapacity / tableCountDraft) ? seats : closest, 12);

  const persist = useCallback((next: FloorItem[], settings = floorSettingsRef.current) => {
    setItems(next);
    setFloorSettings(settings);
    floorSettingsRef.current = settings;
    window.localStorage.setItem(storageKey, JSON.stringify({ version: 3, items: next, settings, defaultScales: defaultScaleRef.current }));
  }, [storageKey]);

  const rememberLayout = useCallback(() => {
    undoHistoryRef.current = [
      ...undoHistoryRef.current.slice(-29),
      { items, settings: floorSettingsRef.current, defaultScales: { ...defaultScaleRef.current } },
    ];
  }, [items]);

  const undoLastLayoutChange = useCallback(() => {
    const previous = undoHistoryRef.current.pop();
    if (!previous) return;
    defaultScaleRef.current = previous.defaultScales;
    persist(previous.items, previous.settings);
  }, [persist]);

  useEffect(() => {
    if (addingTablesRef.current) return;
    const saved = window.localStorage.getItem(storageKey);
    const parsed = saved ? JSON.parse(saved) as FloorItem[] | { items?: FloorItem[]; settings?: FloorSettings; defaultScales?: Partial<Record<FloorItemKind, number>> } : [];
    const savedItems = Array.isArray(parsed) ? parsed : parsed.items ?? [];
    const savedSettings = Array.isArray(parsed) ? DEFAULT_FLOOR_SETTINGS : { ...DEFAULT_FLOOR_SETTINGS, ...parsed.settings };
    defaultScaleRef.current = Array.isArray(parsed) ? {} : parsed.defaultScales ?? {};
    const knownTableIds = new Set(tables.map((table) => table.id));
    const withoutDeletedTables = savedItems.filter((item) => item.tableId == null || knownTableIds.has(item.tableId));
    const tableItems = tables.map((table, index) => {
      const existing = withoutDeletedTables.find((item) => item.tableId === table.id);
      return existing ?? { id: `table-${table.id}`, kind: 'round' as TableShape, label: table.name, tableId: table.id, x: 18 + (index % 4) * 21, y: 30 + Math.floor(index / 4) * 24 };
    });
    const next = [...withoutDeletedTables.filter((item) => item.tableId == null), ...tableItems];
    setItems(next);
    setFloorSettings(savedSettings);
    floorSettingsRef.current = savedSettings;
    window.localStorage.setItem(storageKey, JSON.stringify({ version: 3, items: next, settings: savedSettings, defaultScales: defaultScaleRef.current }));
    setHydrated(true);
  }, [storageKey, tables]);

  useEffect(() => {
    if (resetRevision > 0) persist([], DEFAULT_FLOOR_SETTINGS);
  }, [persist, resetRevision]);

  const updateFloorSettings = (patch: Partial<FloorSettings>) => {
    const next = { ...floorSettingsRef.current, ...patch };
    persist(items, next);
  };

  const setOrientation = (orientation: FloorOrientation) => {
    const current = floorSettingsRef.current;
    const needsSwap = (orientation === 'horizontal' && current.height > current.width) || (orientation === 'vertical' && current.width > current.height);
    updateFloorSettings(needsSwap ? { orientation, width: current.height, height: current.width } : { orientation });
  };

  const startRoomResize = (event: React.PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    rememberLayout();
    const { width, height } = floorSettingsRef.current;
    resizeRef.current = { startX: event.clientX, startY: event.clientY, width, height };
  };

  const resizeRoom = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const resizing = resizeRef.current;
    if (!resizing) return;
    const width = Math.min(100, Math.max(4, resizing.width + Math.round((event.clientX - resizing.startX) / 24)));
    const height = Math.min(100, Math.max(4, resizing.height + Math.round((event.clientY - resizing.startY) / 24)));
    if (width !== floorSettingsRef.current.width || height !== floorSettingsRef.current.height) {
      updateFloorSettings({ width, height });
    }
  }, [items, persist]);

  const stopRoomResize = () => {
    resizeRef.current = null;
  };

  const startItemResize = (event: React.PointerEvent<HTMLButtonElement>, item: FloorItem) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    rememberLayout();
    itemResizeRef.current = { id: item.id, kind: item.kind, startX: event.clientX, startY: event.clientY, scale: item.scale ?? 1 };
  };

  const resizeItem = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const resizing = itemResizeRef.current;
    if (!resizing) return;
    const distance = Math.max(event.clientX - resizing.startX, event.clientY - resizing.startY);
    const scale = Math.min(2.5, Math.max(.45, Math.round((resizing.scale + distance / 180) * 100) / 100));
    const current = items.find((item) => item.id === resizing.id);
    if (!current || current.scale === scale) return;
    defaultScaleRef.current = { ...defaultScaleRef.current, [resizing.kind]: scale };
    persist(items.map((item) => item.id === resizing.id ? { ...item, scale } : item));
  }, [items, persist]);

  const stopItemResize = () => {
    itemResizeRef.current = null;
  };

  const rotateItem = (item: FloorItem) => {
    rememberLayout();
    const rotation = ((item.rotation ?? 0) + 90) % 360;
    persist(items.map((current) => current.id === item.id ? { ...current, rotation } : current));
  };

  const moveItem = useCallback((event: React.PointerEvent<HTMLButtonElement>, itemId: string) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    const bounds = canvasRef.current?.getBoundingClientRect();
    if (!bounds) return;
    const baseSelection = selectedItemIds.has(itemId) ? selectedItemIds : new Set([itemId]);
    if (!selectedItemIds.has(itemId)) setSelectedItemIds(baseSelection);
    const groupIds = new Set(items.filter((item) => baseSelection.has(item.id) && item.groupId).map((item) => item.groupId));
    const itemIds = items.filter((item) => baseSelection.has(item.id) || (item.groupId != null && groupIds.has(item.groupId))).map((item) => item.id);
    rememberLayout();
    dragRef.current = {
      itemIds,
      originX: ((event.clientX - bounds.left) / bounds.width) * 100,
      originY: ((event.clientY - bounds.top) / bounds.height) * 100,
      positions: Object.fromEntries(items.filter((item) => itemIds.includes(item.id)).map((item) => [item.id, { x: item.x, y: item.y }])),
    };
  }, [items, rememberLayout, selectedItemIds]);

  const onCanvasMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const dragging = dragRef.current;
    const bounds = canvasRef.current?.getBoundingClientRect();
    if (!dragging || !bounds) return;
    const deltaX = ((event.clientX - bounds.left) / bounds.width) * 100 - dragging.originX;
    const deltaY = ((event.clientY - bounds.top) / bounds.height) * 100 - dragging.originY;
    persist(items.map((item) => {
      const original = dragging.positions[item.id];
      return original ? { ...item, x: Math.min(100, Math.max(0, original.x + deltaX)), y: Math.min(100, Math.max(0, original.y + deltaY)) } : item;
    }));
  }, [items, persist]);

  const getCanvasPoint = (event: React.PointerEvent<HTMLDivElement>) => {
    const bounds = canvasRef.current?.getBoundingClientRect();
    if (!bounds) return null;
    return {
      x: Math.min(100, Math.max(0, ((event.clientX - bounds.left) / bounds.width) * 100)),
      y: Math.min(100, Math.max(0, ((event.clientY - bounds.top) / bounds.height) * 100)),
    };
  };

  const startMarqueeSelection = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!editable || event.button !== 0 || event.target !== event.currentTarget) return;
    const point = getCanvasPoint(event);
    if (!point) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    marqueeRef.current = { startX: point.x, startY: point.y };
    setSelectionBox({ startX: point.x, startY: point.y, x: point.x, y: point.y });
  };

  const resizeMarqueeSelection = (event: React.PointerEvent<HTMLDivElement>) => {
    const marquee = marqueeRef.current;
    const point = marquee ? getCanvasPoint(event) : null;
    if (!marquee || !point) return;
    setSelectionBox({ ...marquee, x: point.x, y: point.y });
  };

  const finishMarqueeSelection = (event: React.PointerEvent<HTMLDivElement>) => {
    const marquee = marqueeRef.current;
    const point = marquee ? getCanvasPoint(event) : null;
    marqueeRef.current = null;
    setSelectionBox(null);
    if (!marquee || !point) return;
    const left = Math.min(marquee.startX, point.x);
    const right = Math.max(marquee.startX, point.x);
    const top = Math.min(marquee.startY, point.y);
    const bottom = Math.max(marquee.startY, point.y);
    if (right - left < 1 && bottom - top < 1) {
      setSelectedItemIds(new Set());
      return;
    }
    const hits = items.filter((item) => item.x >= left && item.x <= right && item.y >= top && item.y <= bottom).map((item) => item.id);
    setSelectedItemIds((current) => event.shiftKey || event.ctrlKey || event.metaKey ? new Set([...current, ...hits]) : new Set(hits));
  };

  const selectItem = (event: React.PointerEvent<HTMLDivElement>, itemId: string) => {
    if (!editable || event.button !== 0 || (event.target instanceof Element && event.target.closest('button, input, a'))) return;
    const toggle = event.shiftKey || event.ctrlKey || event.metaKey;
    setSelectedItemIds((current) => {
      if (!toggle) return new Set([itemId]);
      const next = new Set(current);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };

  const groupSelectedItems = () => {
    if (selectedItemIds.size < 2) return;
    rememberLayout();
    const groupId = crypto.randomUUID();
    persist(items.map((item) => selectedItemIds.has(item.id) ? { ...item, groupId } : item));
  };

  const ungroupSelectedItems = () => {
    const groupIds = new Set(items.filter((item) => selectedItemIds.has(item.id) && item.groupId).map((item) => item.groupId));
    if (!groupIds.size) return;
    rememberLayout();
    persist(items.map((item) => item.groupId && groupIds.has(item.groupId) ? { ...item, groupId: undefined } : item));
  };

  const resizeSelectedItems = (factor: number) => {
    if (!selectedItemIds.size) return;
    rememberLayout();
    const scales = { ...defaultScaleRef.current };
    const next = items.map((item) => {
      if (!selectedItemIds.has(item.id)) return item;
      const scale = Math.min(2.5, Math.max(.45, Math.round(((item.scale ?? 1) * factor) * 100) / 100));
      scales[item.kind] = scale;
      return { ...item, scale };
    });
    defaultScaleRef.current = scales;
    persist(next);
  };

  const selectedGroupCount = new Set(items.filter((item) => selectedItemIds.has(item.id) && item.groupId).map((item) => item.groupId)).size;

  const addElement = async (kind: FloorItemKind, position = { x: 50, y: 54 }, appearance?: Pick<FloorItem, 'scale' | 'rotation'>) => {
    if (isTableShape(kind)) {
      const table = await onAddTable();
      if (!table) return;
      persist([...items, { id: `table-${table.id}`, kind, label: table.name, tableId: table.id, scale: appearance?.scale ?? defaultScaleRef.current[kind] ?? 1, rotation: appearance?.rotation, ...position }]);
      return;
    }
    rememberLayout();
    persist([...items, { id: `${kind}-${crypto.randomUUID()}`, kind, label: FLOOR_ITEM_LABEL[kind], scale: appearance?.scale ?? defaultScaleRef.current[kind] ?? 1, rotation: appearance?.rotation, ...position }]);
  };

  const requestTableBatch = (kind: TableShape, position?: { x: number; y: number }) => {
    setSelectedShape(kind);
    setTableCountDraft(1);
    setTableSeatsDraft(12);
    setTableBatchRequest({ kind, position });
  };

  const addTableBatch = async () => {
    if (!tableBatchRequest || addingTables) return;
    const count = Math.min(30, Math.max(1, Math.trunc(tableCountDraft) || 1));
    const { kind, position } = tableBatchRequest;
    const base = position ?? { x: 25, y: 25 };
    const additions: FloorItem[] = [];
    addingTablesRef.current = true;
    setAddingTables(true);
    try {
      for (let index = 0; index < count; index += 1) {
        const table = await onAddTable('UNASSIGNED', tableSeatsDraft);
        if (!table) break;
        const column = index % 3;
        const row = Math.floor(index / 3);
        additions.push({
          id: `table-${table.id}`,
          kind,
          label: table.name,
          tableId: table.id,
          scale: defaultScaleRef.current[kind] ?? 1,
          x: Math.min(96, Math.max(4, base.x + (column - 1) * 16)),
          y: Math.min(96, Math.max(4, base.y + row * 18)),
        });
      }
      if (additions.length) persist([...items, ...additions]);
      setTableBatchRequest(null);
    } finally {
      addingTablesRef.current = false;
      setAddingTables(false);
    }
  };

  const copyElement = (item: FloorItem) => {
    setCopiedItem({ ...item });
  };

  const pasteCopiedElement = async (position?: { x: number; y: number }) => {
    if (!copiedItem) return;
    if (position) setCanvasMenu(null);
    const offsetPosition = {
      x: copiedItem.x >= 90 ? Math.max(0, copiedItem.x - 10) : Math.min(100, copiedItem.x + 10),
      y: copiedItem.y >= 90 ? Math.max(0, copiedItem.y - 10) : Math.min(100, copiedItem.y + 10),
    };
    await addElement(
      copiedItem.kind,
      position ?? offsetPosition,
      { scale: copiedItem.scale, rotation: copiedItem.rotation },
    );
  };

  const openCanvasMenu = (event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (event.target !== event.currentTarget || !editable) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    setCanvasMenu({
      x: Math.min(96, Math.max(4, ((event.clientX - bounds.left) / bounds.width) * 100)),
      y: Math.min(94, Math.max(4, ((event.clientY - bounds.top) / bounds.height) * 100)),
    });
  };

  const addFromCanvasMenu = async (kind: FloorItemKind) => {
    const position = canvasMenu;
    setCanvasMenu(null);
    if (!position) return;
    if (isTableShape(kind)) {
      requestTableBatch(kind, position);
      return;
    }
    await addElement(kind, position);
  };

  const removeElement = (item: FloorItem) => {
    if (item.tableId != null) {
      onDeleteTable(item.tableId);
      return;
    }
    rememberLayout();
    persist(items.filter((current) => current.id !== item.id));
  };

  useEffect(() => {
    if (!editable) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.shiftKey || event.key.toLowerCase() !== 'z') return;
      const target = event.target as HTMLElement | null;
      if (target?.matches('input, textarea, [contenteditable="true"]')) return;
      event.preventDefault();
      undoLastLayoutChange();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [editable, undoLastLayoutChange]);

  useEffect(() => {
    if (!canvasMenu) return;
    const closeOnLeftClick = (event: PointerEvent) => {
      if (event.button !== 0) return;
      const target = event.target;
      if (target instanceof Element && target.closest('.seat-floorplan-context-menu')) return;
      setCanvasMenu(null);
    };
    window.addEventListener('pointerdown', closeOnLeftClick);
    return () => window.removeEventListener('pointerdown', closeOnLeftClick);
  }, [canvasMenu]);

  useEffect(() => {
    if (!editable) return;
    const pasteOnShortcut = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== 'v' || !copiedItem) return;
      const target = event.target as HTMLElement | null;
      if (target?.matches('input, textarea, [contenteditable="true"]')) return;
      event.preventDefault();
      void pasteCopiedElement();
    };
    window.addEventListener('keydown', pasteOnShortcut);
    return () => window.removeEventListener('keydown', pasteOnShortcut);
  }, [copiedItem, editable, pasteCopiedElement]);

  return (
    <section className="seat-floorplan" aria-label="Plano visual del salón">
      <header className="seat-floorplan-header">
        <div>
          <span className="seat-floorplan-eyebrow">Vista del salón</span>
          <h2>Plano de recepción</h2>
        </div>
        <p>Arrastra, gira y cambia el tamaño de cada objeto. Clic derecho en un espacio vacío para agregar otro.</p>
      </header>
      <div className="seat-floorplan-editor">
        {editable && <aside className="seat-floorplan-palette" aria-label="Elementos del salón">
          <strong>Agregar al salón</strong>
          <span>Dimensiones aproximadas</span>
          <div className="seat-floorplan-orientation" role="group" aria-label="Orientación del salón">
            <button type="button" className={floorSettings.orientation === 'horizontal' ? 'is-selected' : undefined} onClick={() => setOrientation('horizontal')}>Horizontal</button>
            <button type="button" className={floorSettings.orientation === 'vertical' ? 'is-selected' : undefined} onClick={() => setOrientation('vertical')}>Vertical</button>
          </div>
          <div className="seat-floorplan-dimensions">
            <label>Ancho <input type="number" min="4" max="100" value={floorSettings.width} onChange={(event) => updateFloorSettings({ width: Math.min(100, Math.max(4, Number(event.target.value) || 4)) })} /> <small>m</small></label>
            <label>Alto <input type="number" min="4" max="100" value={floorSettings.height} onChange={(event) => updateFloorSettings({ height: Math.min(100, Math.max(4, Number(event.target.value) || 4)) })} /> <small>m</small></label>
          </div>
          <button type="button" className="seat-floorplan-paste" disabled={!copiedItem} title={copiedItem ? `Pegar copia de ${copiedItem.label}` : 'Primero copia un elemento del plano'} onClick={() => void pasteCopiedElement()}>
            <Plus size={16} aria-hidden /> {copiedItem ? `Pegar ${copiedItem.label}` : 'Pegar elemento'}
          </button>
          {copiedItem && <p className="seat-floorplan-copy-status" aria-live="polite">Copia lista: {copiedItem.label}. También puedes hacer clic derecho y pegarla donde quieras.</p>}
          <span>Selección</span>
          <p className="seat-floorplan-copy-status">Arrastra en un espacio vacío para seleccionar varios con el mouse. Shift, Ctrl o ⌘ + clic también funciona.</p>
          <button type="button" className="seat-floorplan-paste" disabled={selectedItemIds.size < 2} onClick={groupSelectedItems}>
            <Group size={16} aria-hidden /> Agrupar {selectedItemIds.size > 1 ? `(${selectedItemIds.size})` : ''}
          </button>
          <button type="button" className="seat-floorplan-paste" disabled={!selectedGroupCount} onClick={ungroupSelectedItems}>
            <Ungroup size={16} aria-hidden /> Desagrupar
          </button>
          <button type="button" className="seat-floorplan-paste" disabled={!selectedItemIds.size} onClick={() => resizeSelectedItems(1.1)}>
            <ZoomIn size={16} aria-hidden /> Más grande
          </button>
          <button type="button" className="seat-floorplan-paste" disabled={!selectedItemIds.size} onClick={() => resizeSelectedItems(1 / 1.1)}>
            <ZoomOut size={16} aria-hidden /> Más chico
          </button>
          <button type="button" className="seat-floorplan-reset" onClick={onRequestClearSeating}>Vaciar acomodo</button>
          <span>Mesas</span>
          <div className="seat-floorplan-palette-grid">
            {TABLE_SHAPES.map((kind) => (
              <button key={kind} type="button" className={selectedShape === kind ? 'is-selected' : undefined} onClick={() => requestTableBatch(kind)}>
                {React.createElement(FLOOR_ITEM_ICON[kind], { size: 17, strokeWidth: 1.8, 'aria-hidden': true })}
                <span>{FLOOR_ITEM_LABEL[kind]}</span>
              </button>
            ))}
          </div>
          <span>Servicio y ambiente</span>
          <div className="seat-floorplan-palette-grid">
            {FLOOR_ITEM_CATALOG.slice(4).map((kind) => (
              <button key={kind} type="button" onClick={() => addElement(kind)}>
                {React.createElement(FLOOR_ITEM_ICON[kind], { size: 17, strokeWidth: 1.8, 'aria-hidden': true })}
                <span>{FLOOR_ITEM_LABEL[kind]}</span>
              </button>
            ))}
          </div>
        </aside>}
        <div ref={canvasRef} className={`seat-floorplan-room seat-floorplan-dynamic-room is-${floorSettings.orientation}`} style={{ aspectRatio: `${floorSettings.width} / ${floorSettings.height}` }} onContextMenu={openCanvasMenu} onPointerDown={editable ? startMarqueeSelection : undefined} onPointerMove={editable ? (event) => { resizeRoom(event); resizeItem(event); onCanvasMove(event); resizeMarqueeSelection(event); } : undefined} onPointerUp={(event) => { finishMarqueeSelection(event); dragRef.current = null; stopRoomResize(); stopItemResize(); }} onPointerCancel={() => { marqueeRef.current = null; setSelectionBox(null); dragRef.current = null; stopRoomResize(); stopItemResize(); }}>
          {!hydrated && <span className="seat-floorplan-loading">Preparando plano…</span>}
          {editable && <button
            type="button"
            className="seat-floorplan-resize"
            aria-label="Cambiar ancho y alto del salón"
            title="Arrastra para cambiar el tamaño del salón"
            onPointerDown={startRoomResize}
            onKeyDown={(event) => {
              const change = event.key === 'ArrowRight' ? { width: floorSettings.width + 1 } : event.key === 'ArrowLeft' ? { width: floorSettings.width - 1 } : event.key === 'ArrowDown' ? { height: floorSettings.height + 1 } : event.key === 'ArrowUp' ? { height: floorSettings.height - 1 } : null;
              if (!change) return;
              event.preventDefault();
              updateFloorSettings({
                width: Math.min(100, Math.max(4, change.width ?? floorSettings.width)),
                height: Math.min(100, Math.max(4, change.height ?? floorSettings.height)),
              });
            }}
          ><span aria-hidden>↘</span></button>}
          {canvasMenu && (
            <div className="seat-floorplan-context-menu" role="menu" aria-label="Agregar elemento al salón" style={{ left: `${canvasMenu.x}%`, top: `${canvasMenu.y}%` }} onClick={(event) => event.stopPropagation()}>
              <strong>Agregar aquí</strong>
              <div>
                {copiedItem && (
                  <button type="button" role="menuitem" className="seat-floorplan-paste-here" onClick={() => void pasteCopiedElement(canvasMenu)}>
                    <Copy size={15} aria-hidden />
                    <span>Pegar copia aquí</span>
                  </button>
                )}
                {FLOOR_ITEM_CATALOG.map((kind) => (
                  <button key={kind} type="button" role="menuitem" onClick={() => addFromCanvasMenu(kind)}>
                    {React.createElement(FLOOR_ITEM_ICON[kind], { size: 15, 'aria-hidden': true })}
                    <span>{FLOOR_ITEM_LABEL[kind]}</span>
                  </button>
                ))}
              </div>
              <button type="button" className="seat-floorplan-context-cancel" onClick={() => setCanvasMenu(null)}>Cancelar</button>
            </div>
          )}
          {selectionBox && <span className="seat-floorplan-selection-box" aria-hidden style={{ left: `${Math.min(selectionBox.startX, selectionBox.x)}%`, top: `${Math.min(selectionBox.startY, selectionBox.y)}%`, width: `${Math.abs(selectionBox.x - selectionBox.startX)}%`, height: `${Math.abs(selectionBox.y - selectionBox.startY)}%` }} />}
          {items.map((item) => {
            const table = item.tableId != null ? tables.find((current) => current.id === item.tableId) : undefined;
            return (
              <div key={item.id} className={`seat-floor-item seat-floor-item-${item.kind}${selectedItemIds.has(item.id) ? ' is-selected' : ''}${item.groupId ? ' is-grouped' : ''}`} onPointerDown={(event) => selectItem(event, item.id)} style={{ left: `${item.x}%`, top: `${item.y}%`, '--floor-item-scale': item.scale ?? 1, '--floor-item-rotation': `${item.rotation ?? 0}deg`, '--floor-item-offset-x': item.x === 0 ? '0%' : item.x === 100 ? '-100%' : '-50%', '--floor-item-offset-y': item.y === 0 ? '0%' : item.y === 100 ? '-100%' : '-50%' } as React.CSSProperties}>
                {editable && <button type="button" className="seat-floor-item-drag" aria-label={`Mover ${item.label}`} onPointerDown={(event) => moveItem(event, item.id)}><GripVertical size={14} aria-hidden /></button>}
                {editable && <button type="button" className="seat-floor-item-copy" aria-label={`Copiar ${item.label}`} title="Copiar elemento" onClick={() => copyElement(item)}><Copy size={13} aria-hidden /></button>}
                {editable && <button type="button" className="seat-floor-item-rotate" aria-label={`Girar ${item.label} 90 grados`} title="Girar 90 grados" onClick={() => rotateItem(item)}><RotateCw size={14} aria-hidden /></button>}
                {editable && <button type="button" className="seat-floor-item-resize" aria-label={`Cambiar tamaño de ${item.label}`} title="Arrastra para cambiar tamaño; se usará en nuevos elementos del mismo tipo" onPointerDown={(event) => startItemResize(event, item)}>↘</button>}
                {table ? (
                  <TableCard table={table} families={familiesByTable.get(table.id) || []} shape={item.kind as TableShape} onDelete={onDeleteTable} onRename={onRenameTable} onSelectTable={onSelectTable} onSelectFamily={onSelectFamily} />
                ) : item.kind === 'entrance' ? (
                  <div className="seat-floor-door" aria-label="Entrada">
                    {editable && <button type="button" className="seat-floor-item-remove" aria-label="Eliminar entrada" onClick={() => removeElement(item)}>×</button>}
                    <span className="seat-floor-door-arc" aria-hidden />
                    <span className="seat-floor-door-leaf" aria-hidden />
                    <strong>Entrada</strong>
                  </div>
                ) : (
                  <div className="seat-floor-object">
                    {editable && <button type="button" className="seat-floor-item-remove" aria-label={`Eliminar ${item.label}`} onClick={() => removeElement(item)}>×</button>}
                    {React.createElement(FLOOR_ITEM_ICON[item.kind], { size: 23, strokeWidth: 1.8, 'aria-hidden': true })}
                    <strong>{item.label}</strong>
                    <small>{item.kind === 'dj' ? 'Sonido y cabina' : item.kind === 'band' ? 'Música en vivo' : item.kind === 'stage' ? 'Ceremonia y discursos' : item.kind === 'lounge' ? 'Zona de descanso' : item.kind === 'giftTable' ? 'Sobres y obsequios' : item.kind === 'kitchen' ? 'Servicio de alimentos' : item.kind === 'playArea' || item.kind === 'bouncyCastle' ? 'Zona infantil' : 'Elemento del salón'}</small>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      {tableBatchRequest && (
        <div className="seat-table-batch-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !addingTables) setTableBatchRequest(null); }}>
          <section className="seat-table-batch-dialog" role="dialog" aria-modal="true" aria-labelledby="table-batch-title">
            <span>Agregar mesas</span>
            <h3 id="table-batch-title">¿Cuántas {TABLE_SHAPE_PLURAL[tableBatchRequest.kind]} deseas agregar?</h3>
            <p>Se crearán como mesas generales y quedarán distribuidas en el plano para que puedas acomodarlas después.</p>
            <label htmlFor="table-batch-count">Cantidad</label>
            <input id="table-batch-count" type="number" min="1" max="30" autoFocus value={tableCountDraft} onChange={(event) => setTableCountDraft(Math.min(30, Math.max(1, Number(event.target.value) || 1)))} />
            <label>Capacidad por mesa</label>
            <p className="seat-table-batch-hint">Con {floorSettings.width} × {floorSettings.height} m, el salón estima hasta {estimatedRoomCapacity} personas. Recomendado: {recommendedSeats} asientos por mesa.</p>
            <select value={tableSeatsDraft} aria-label="Capacidad predefinida por mesa" onChange={(event) => setTableSeatsDraft(Number(event.target.value))}>
              {TABLE_SEAT_PRESETS.map((seats) => (
                <option key={seats} value={seats}>{seats} asientos{seats === recommendedSeats ? ' — recomendado para este salón' : ''}</option>
              ))}
            </select>
            <div>
              <button type="button" disabled={addingTables} onClick={() => setTableBatchRequest(null)}>Cancelar</button>
              <button type="button" disabled={addingTables} onClick={() => void addTableBatch()}>{addingTables ? 'Agregando…' : `Agregar ${tableCountDraft} mesa${tableCountDraft === 1 ? '' : 's'}`}</button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}

type Step = 'LAYOUT' | 'ASSIGN' | 'REVIEW';
const STEP_ORDER: Step[] = ['LAYOUT', 'ASSIGN', 'REVIEW'];
const STEP_LABEL: Record<Step, string> = { LAYOUT: 'Diseñar salón', ASSIGN: 'Asignar invitados', REVIEW: 'Revisar y exportar' };

function Stepper({
  active,
  onChange,
  seatedCount,
  capacity,
  tableCount,
}: {
  active: Step;
  onChange: (s: Step) => void;
  seatedCount: number;
  capacity: number;
  tableCount: number;
}) {
  const detail: Record<Step, string> = {
    LAYOUT: `${tableCount} ${tableCount === 1 ? 'mesa' : 'mesas'}`,
    ASSIGN: `${seatedCount}/${capacity} sentados`,
    REVIEW: `${seatedCount}/${capacity} listos`,
  };
  return (
    <div className="seat-stepper" role="tablist" aria-label="Pasos del acomodo">
      {STEP_ORDER.map((step) => {
        const isActive = step === active;
        const color = step === 'LAYOUT' ? '#33567D' : step === 'ASSIGN' ? '#B5546F' : '#0f172a';
        return (
          <button
            key={step}
            type="button"
            role="tab"
            aria-selected={isActive}
            className={`seat-step${isActive ? ' is-active' : ''}`}
            style={isActive ? { borderColor: color, color } : undefined}
            onClick={() => onChange(step)}
          >
            <span className="seat-side-dot" style={{ background: color }} aria-hidden />
            <span className="seat-step-label">{STEP_LABEL[step]}</span>
            <span className="seat-step-count">{detail[step]}</span>
          </button>
        );
      })}
    </div>
  );
}

function ConfirmationDialog({
  title,
  description,
  confirmLabel,
  onCancel,
  onConfirm,
}: {
  title: string;
  description: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/55 p-4 sm:items-center"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <section
        className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="seating-confirmation-title"
        aria-describedby="seating-confirmation-description"
        onKeyDown={(event) => {
          if (event.key === 'Escape') onCancel();
        }}
      >
        <div className="mb-5 flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-700" aria-hidden>
            <AlertTriangle size={20} />
          </span>
          <div>
            <h2 id="seating-confirmation-title" className="text-lg font-semibold text-slate-950">{title}</h2>
            <p id="seating-confirmation-description" className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
          </div>
        </div>
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50" onClick={onCancel}>Cancelar</button>
          <button type="button" autoFocus className="rounded-xl bg-red-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-800" onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </section>
    </div>
  );
}

export default function SeatingPlanner({ eventId, eventName }: SeatingPlannerProps) {
  const [families, setFamilies] = useState<Family[]>([]);
  const [tables, setTables] = useState<TableRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeId, setActiveId] = useState<number | null>(null);
  const [step, setStep] = useState<Step>('LAYOUT');
  const [assignmentSide, setAssignmentSide] = useState<Side>('MAMA');
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  // Estados para modales en móvil
  const [mobileFamilySelect, setMobileFamilySelect] = useState<Family | null>(null);
  const [mobileTableSelect, setMobileTableSelect] = useState<TableRow | null>(null);
  const [seatDraft, setSeatDraft] = useState<number | null>(null);
  const [confirmation, setConfirmation] = useState<{ kind: 'clear' } | { kind: 'table'; tableId: number } | null>(null);
  const [layoutResetRevision, setLayoutResetRevision] = useState(0);

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

  useEffect(() => {
    setSeatDraft(mobileTableSelect?.seats ?? null);
  }, [mobileTableSelect?.id, mobileTableSelect?.seats]);

  useEffect(() => {
    if (!exportMenuOpen) return;

    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!exportMenuRef.current?.contains(event.target as Node)) {
        setExportMenuOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setExportMenuOpen(false);
    };

    document.addEventListener('mousedown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [exportMenuOpen]);

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

  const totalGuests = useMemo(() => families.reduce((s, f) => s + headcount(f), 0), [families]);
  const seatedGuests = useMemo(
    () => families.filter((f) => f.tableId != null).reduce((s, f) => s + headcount(f), 0),
    [families]
  );

  const totalSeats = useMemo(() => tables.reduce((sum, table) => sum + table.seats, 0), [tables]);

  const unassignedForAssignment = useMemo(
    () => unassigned.filter((family) => family.side == null || family.side === assignmentSide),
    [unassigned, assignmentSide]
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

  async function addTable(side: TableSide = 'UNASSIGNED', seats = 12) {
    try {
      const res = await fetch('/api/admin/tables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, side, seats }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setTables((prev) => [...prev, data.table]);
      return data.table as TableRow;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo crear la mesa.');
      return null;
    }
  }

  async function deleteTable(id: number) {
    try {
      const res = await fetch(`/api/admin/tables?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).error);
      setTables((prev) => prev.filter((t) => t.id !== id));
      setFamilies((prev) => prev.map((f) => (f.tableId === id ? { ...f, tableId: null } : f)));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo eliminar la mesa.');
    }
  }

  async function clearSeating() {
    try {
      const res = await fetch(`/api/admin/tables?eventId=${eventId}&reset=true`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setTables([]);
      setFamilies((previous) => previous.map((family) => ({ ...family, tableId: null })));
      setMobileTableSelect(null);
      setMobileFamilySelect(null);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo vaciar el acomodo.');
      return false;
    }
  }

  const confirmPendingAction = async () => {
    const pending = confirmation;
    setConfirmation(null);
    if (!pending) return;
    if (pending.kind === 'clear') {
      if (await clearSeating()) setLayoutResetRevision((revision) => revision + 1);
      return;
    }
    await deleteTable(pending.tableId);
  };

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

  function previewTableSeats(id: number, seats: number) {
    if (!Number.isInteger(seats) || seats < 1 || seats > 30) return;
    setSeatDraft(seats);
    setTables((previous) => previous.map((table) => table.id === id ? { ...table, seats } : table));
    setMobileTableSelect((previous) => previous?.id === id ? { ...previous, seats } : previous);
  }

  async function saveTableSeats(id: number, seats: number) {
    try {
      const res = await fetch('/api/admin/tables', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, seats }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setTables((previous) => previous.map((table) => table.id === id ? data.table : table));
      setMobileTableSelect((previous) => previous?.id === id ? data.table : previous);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo actualizar la capacidad.');
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

        // Mezclar familias de ambos lados en una misma mesa es normal y
        // aceptado — no se advierte ni se bloquea, solo se asigna.
        await assign(rsvpId, tableId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al mover la familia.');
    }
  }

  const activeFamily = activeId != null ? families.find((f) => f.id === activeId) || null : null;
  const pct = totalGuests > 0 ? Math.round((seatedGuests / totalGuests) * 100) : 0;

  const exportHostessPdf = () => {
    const tableById = new Map(tables.map((table) => [table.id, table]));
    const rows = families
      .flatMap((family) => family.guests.filter((guest) => guest.confirmed !== false).map((guest) => ({ guest, family, table: family.tableId ? tableById.get(family.tableId) : undefined })))
      .sort((a, b) => a.guest.name.localeCompare(b.guest.name, 'es-MX', { sensitivity: 'base' }))
      .map(({ guest, family, table }) => `<tr class="${table ? '' : 'unassigned'}"><td>${escapeHtml(guest.name)}${guest.isChild ? ' <span>Niño</span>' : ''}</td><td>${escapeHtml(family.familyName)}</td><td>${table ? `Mesa ${table.position} · ${escapeHtml(table.name)}` : 'SIN MESA'}</td></tr>`)
      .join('');
    const printable = window.open('', '_blank');
    if (!printable) { setError('El navegador bloqueó la ventana de impresión. Permite ventanas emergentes e inténtalo de nuevo.'); return; }
    printable.opener = null;
    printable.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Acomodo de salón · ${escapeHtml(eventName || 'Evento')}</title><style>
      @page{size:A4;margin:14mm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#172033;margin:0;background:#fff}.header{border-bottom:3px solid #33567D;padding-bottom:12px;margin-bottom:16px}.eyebrow{font-size:10px;letter-spacing:1.5px;font-weight:700;color:#B5546F}.header h1{font-family:Georgia,serif;font-size:27px;margin:4px 0}.meta{font-size:12px;color:#526074}.summary{display:flex;gap:10px;margin:14px 0 18px}.metric{border:1px solid #d9e0ea;border-radius:8px;padding:9px 12px;min-width:110px}.metric b{display:block;font-size:18px}.metric span{font-size:10px;text-transform:uppercase;color:#687386}table{width:100%;border-collapse:collapse}th{background:#33567D;color:#fff;text-align:left;padding:9px 10px;font-size:10px;letter-spacing:.7px;text-transform:uppercase}td{border-bottom:1px solid #e2e8f0;padding:9px 10px;font-size:12px}td:first-child{font-weight:700}td span{margin-left:5px;padding:2px 5px;background:#e7f3ff;color:#33567D;border-radius:8px;font-size:9px;font-weight:700}.unassigned td{background:#fff5f5;color:#9f1d1d}.footer{margin-top:18px;border-top:1px solid #d9e0ea;padding-top:8px;font-size:10px;color:#687386}</style></head><body>
      <header class="header"><span class="eyebrow">GUÍA OPERATIVA · HOSTESS DE SALÓN</span><h1>${escapeHtml(eventName || 'Acomodo del salón')}</h1><div class="meta">Generado el ${new Intl.DateTimeFormat('es-MX', { dateStyle: 'long', timeStyle: 'short' }).format(new Date())}</div></header>
      <div class="summary"><div class="metric"><b>${tables.length}</b><span>Mesas</span></div><div class="metric"><b>${seatedGuests}/${totalGuests}</b><span>Personas sentadas</span></div><div class="metric"><b>${pct}%</b><span>Ocupación</span></div></div><main><table><thead><tr><th>Invitado</th><th>Familia</th><th>Mesa asignada</th></tr></thead><tbody>${rows}</tbody></table></main><footer class="footer">Listado alfabético para recepción. Las filas en rojo requieren asignación antes de recibir al invitado.</footer>
      <script>window.onload=()=>{window.print();};</script></body></html>`);
    printable.document.close();
  };

  const downloadGuestList = () => {
    const tableById = new Map(tables.map((table) => [table.id, table]));
    const quoteCsv = (value: string | number) => `"${String(value).replaceAll('"', '""')}"`;
    const rows = families
      .flatMap((family) => family.guests.map((guest) => ({ guest, family, table: family.tableId ? tableById.get(family.tableId) : undefined })))
      .sort((a, b) => a.guest.name.localeCompare(b.guest.name, 'es-MX', { sensitivity: 'base' }))
      .map(({ guest, family, table }) => [
        guest.name,
        family.familyName,
        guest.isChild ? 'Niño' : 'Adulto',
        guest.confirmed === true ? 'Confirmado' : guest.confirmed === false ? 'No asiste' : 'Pendiente',
        table ? table.position : '',
        table?.name ?? 'Sin mesa',
        family.side ? SIDE_LABEL[family.side] : 'Sin lado',
      ].map(quoteCsv).join(','));
    const csv = ['Nombre,Familia,Tipo,RSVP,Número de mesa,Mesa,Lado', ...rows].join('\r\n');
    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `lista-invitados-${(eventName || 'evento').toLowerCase().replace(/[^a-z0-9]+/gi, '-')}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

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
            <strong>{eventName || 'Resumen del salón'}</strong>
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
          <div className="seat-summary-actions">
            <div className="seat-export-menu" ref={exportMenuRef}>
              <button
                type="button"
                className="seat-export-trigger"
                onClick={() => setExportMenuOpen((open) => !open)}
                aria-haspopup="menu"
                aria-expanded={exportMenuOpen}
              >
                <FileDown size={15} aria-hidden />
                Exportar
                <ChevronDown size={15} aria-hidden className={exportMenuOpen ? 'is-open' : undefined} />
              </button>
              {exportMenuOpen && (
                <div className="seat-export-popover" role="menu" aria-label="Opciones de exportación">
                  <button
                    type="button"
                    className="seat-export-option"
                    role="menuitem"
                    onClick={() => {
                      setExportMenuOpen(false);
                      exportHostessPdf();
                    }}
                  >
                    <FileDown size={17} aria-hidden />
                    <span><strong>PDF para hostess</strong><small>Lista alfabética con mesa asignada</small></span>
                  </button>
                  <button
                    type="button"
                    className="seat-export-option"
                    role="menuitem"
                    onClick={() => {
                      setExportMenuOpen(false);
                      downloadGuestList();
                    }}
                  >
                    <Download size={17} aria-hidden />
                    <span><strong>Exportar a CSV</strong><small>Lista completa para Excel</small></span>
                  </button>
                </div>
              )}
            </div>
          </div>
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

        <Stepper active={step} onChange={setStep} seatedCount={seatedGuests} capacity={totalSeats} tableCount={tables.length} />

        <div key={step} className="seat-step-content animate-in fade-in slide-in-from-right-2 duration-200">
          {step === 'LAYOUT' && (
            <AllTablesGrid
              tables={tables}
              familiesByTable={familiesByTable}
              eventId={eventId}
              onAddTable={addTable}
              onDeleteTable={(tableId) => setConfirmation({ kind: 'table', tableId })}
              onRenameTable={renameTable}
              onSelectTable={setMobileTableSelect}
              onSelectFamily={setMobileFamilySelect}
              onRequestClearSeating={() => setConfirmation({ kind: 'clear' })}
              resetRevision={layoutResetRevision}
            />
          )}

          {step === 'ASSIGN' && (
            <>
              <div className="seat-assignment-side-picker" role="group" aria-label="Familias y mesas por lado">
                {(['MAMA', 'PAPA'] as Side[]).map((side) => (
                  <button key={side} type="button" className={assignmentSide === side ? 'is-active' : undefined} style={assignmentSide === side ? { borderColor: SIDE_COLOR[side], color: SIDE_COLOR[side] } : undefined} onClick={() => setAssignmentSide(side)}>
                    <span className="seat-side-dot" style={{ background: SIDE_COLOR[side] }} aria-hidden /> Lado {SIDE_LABEL[side]}
                  </button>
                ))}
              </div>
              <UnassignedTray families={unassignedForAssignment} onSelectFamily={setMobileFamilySelect} />
              <SideSection
                side={assignmentSide}
                tables={tables}
                familiesByTable={familiesByTable}
                onAddTable={addTable}
                onDeleteTable={(tableId) => setConfirmation({ kind: 'table', tableId })}
                onRenameTable={renameTable}
                onSelectTable={setMobileTableSelect}
                onSelectFamily={setMobileFamilySelect}
              />
            </>
          )}

          {step === 'REVIEW' && (
            <AllTablesGrid
              tables={tables}
              familiesByTable={familiesByTable}
              eventId={eventId}
              editable={false}
              onAddTable={addTable}
              onDeleteTable={(tableId) => setConfirmation({ kind: 'table', tableId })}
              onRenameTable={renameTable}
              onSelectTable={setMobileTableSelect}
              onSelectFamily={setMobileFamilySelect}
              onRequestClearSeating={() => setConfirmation({ kind: 'clear' })}
              resetRevision={layoutResetRevision}
            />
          )}
        </div>
      </div>

      {/* MODAL: Mover familia (Bottom Sheet) */}
      {mobileFamilySelect && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 transition-opacity sm:items-center animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom-8">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-[1.3rem] text-slate-900 font-semibold">Asignar mesa</h3>
              <button onClick={() => setMobileFamilySelect(null)} className="p-2 -mr-2 text-gray-400 hover:text-gray-600"><X size={22} /></button>
            </div>
            <p className="text-sm text-gray-500 mb-6">Selecciona el destino para mover a la <strong>{mobileFamilySelect.familyName}</strong> ({headcount(mobileFamilySelect)} pax).</p>
            
            <div className="flex flex-col gap-3">
              <button 
                onClick={() => { assign(mobileFamilySelect.id, null); setMobileFamilySelect(null); }}
                className="w-full text-left p-4 rounded-xl border border-gray-200 hover:border-slate-400 transition-colors flex items-center justify-between bg-gray-50"
              >
                <span className="font-medium text-gray-700">Sin asignar (Remover de la mesa)</span>
                {mobileFamilySelect.tableId == null && <CheckCircle2 size={20} className="text-slate-900" />}
              </button>
              
              {tables.map(t => {
                const currentOcc = (familiesByTable.get(t.id) || []).reduce((sum, f) => sum + headcount(f), 0);
                const isCurrent = mobileFamilySelect.tableId === t.id;
                return (
                  <button 
                    key={t.id}
                    onClick={() => { assign(mobileFamilySelect.id, t.id); setMobileFamilySelect(null); }}
                    className="w-full text-left p-4 rounded-xl border border-gray-200 hover:border-slate-400 hover:bg-slate-50 transition-colors flex items-center justify-between"
                  >
                    <div>
                      <div className="font-semibold text-gray-800 text-[1.05rem] mb-1">{t.name}</div>
                      <div className="text-[0.75rem] uppercase tracking-widest text-gray-500">
                        {TABLE_SIDE_LABEL[t.side]} • {currentOcc}/{t.seats} ocupados
                      </div>
                    </div>
                    {isCurrent && <CheckCircle2 size={20} className="text-slate-900" />}
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
                <h3 className="text-[1.5rem] text-slate-900 font-semibold leading-none mb-2">{mobileTableSelect.name}</h3>
                <span className="text-[0.75rem] uppercase tracking-widest text-gray-500 bg-gray-100 px-2 py-1 rounded">{TABLE_SIDE_LABEL[mobileTableSelect.side]}</span>
              </div>
              <button onClick={() => setMobileTableSelect(null)} className="p-2 -mr-2 -mt-2 text-gray-400 hover:text-gray-600"><X size={24} /></button>
            </div>

            {seatDraft != null && (
              <section className="seat-capacity-editor" aria-label="Capacidad de la mesa">
                <div className="seat-capacity-editor-heading">
                  <div>
                    <span>Capacidad de mesa</span>
                    <small>Los cambios se reflejan al instante</small>
                  </div>
                  <output>{seatDraft} <small>asientos</small></output>
                </div>
                <input
                  type="range"
                  min="1"
                  max="30"
                  value={seatDraft}
                  aria-label="Total de asientos"
                  onChange={(event) => previewTableSeats(mobileTableSelect.id, Number(event.target.value))}
                  onPointerUp={() => saveTableSeats(mobileTableSelect.id, seatDraft)}
                  onKeyUp={() => saveTableSeats(mobileTableSelect.id, seatDraft)}
                />
                <div className="seat-capacity-editor-input">
                  <label htmlFor={`table-seats-${mobileTableSelect.id}`}>Total de asientos</label>
                  <input
                    id={`table-seats-${mobileTableSelect.id}`}
                    type="number"
                    min="1"
                    max="30"
                    value={seatDraft}
                    onChange={(event) => previewTableSeats(mobileTableSelect.id, Number(event.target.value))}
                    onBlur={() => saveTableSeats(mobileTableSelect.id, seatDraft)}
                  />
                </div>
                <p>{(familiesByTable.get(mobileTableSelect.id) || []).reduce((sum, family) => sum + headcount(family), 0)} ocupados · {Math.max(0, seatDraft - (familiesByTable.get(mobileTableSelect.id) || []).reduce((sum, family) => sum + headcount(family), 0))} disponibles</p>
              </section>
            )}
            
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
                      <div className="text-[0.85rem] text-gray-600 flex flex-col gap-1.5">
                        {fam.guests.map(g => (
                          <span key={g.id} className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-300 shrink-0" aria-hidden />
                            {g.name}
                            {g.isChild && <span className="bg-blue-50 text-blue-600 text-[0.6rem] uppercase px-1.5 py-0.5 rounded-full font-bold">👶 Niño</span>}
                          </span>
                        ))}
                      </div>
                    </div>
                    <button 
                      onClick={() => { setMobileTableSelect(null); setMobileFamilySelect(fam); }}
                      className="shrink-0 text-slate-900 bg-slate-100 p-3 rounded-full hover:bg-slate-200 transition-colors"
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

      {confirmation && (
        <ConfirmationDialog
          title={confirmation.kind === 'clear' ? '¿Vaciar todo el acomodo?' : '¿Eliminar esta mesa?'}
          description={confirmation.kind === 'clear'
            ? 'Se eliminarán todas las mesas, elementos del salón y asignaciones de familias. Los RSVP e invitados no se borrarán.'
            : 'Las familias asignadas a esta mesa quedarán sin asignar.'}
          confirmLabel={confirmation.kind === 'clear' ? 'Vaciar acomodo' : 'Eliminar mesa'}
          onCancel={() => setConfirmation(null)}
          onConfirm={confirmPendingAction}
        />
      )}

      <DragOverlay>{activeFamily ? <FamilyCard family={activeFamily} overlay /> : null}</DragOverlay>
    </DndContext>
  );
}
