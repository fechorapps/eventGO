'use client';

import { useEffect, useRef, useState } from 'react';
import { DayPicker } from '@daypicker/react';
import { es } from '@daypicker/react/locale';
import '@daypicker/react/style.css';
import { CalendarDays } from 'lucide-react';

interface DateFieldProps {
  id: string;
  /** '' | 'YYYY-MM-DD' | 'YYYY-MM-DDTHH:mm' — mismo formato que emite */
  value: string;
  onChange: (value: string) => void;
  withTime?: boolean;
  required?: boolean;
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Parseo manual para evitar corrimientos de zona horaria con new Date(string). */
function parseValue(value: string): { date: Date | undefined; time: string } {
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?$/);
  if (!m) return { date: undefined, time: '12:00' };
  const [, y, mo, d, h, mi] = m;
  return {
    date: new Date(Number(y), Number(mo) - 1, Number(d)),
    time: h ? `${h}:${mi}` : '12:00',
  };
}

function buildValue(date: Date, time: string, withTime: boolean): string {
  const base = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  return withTime ? `${base}T${time}` : base;
}

export default function DateField({
  id,
  value,
  onChange,
  withTime = false,
  required = false,
}: DateFieldProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { date: selected, time } = parseValue(value);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  let label = '';
  if (selected) {
    const shown = new Date(selected);
    if (withTime) {
      const [h, mi] = time.split(':').map(Number);
      shown.setHours(h, mi);
    }
    label = new Intl.DateTimeFormat('es-MX', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      ...(withTime ? { hour: 'numeric', minute: '2-digit', hour12: true } : {}),
    }).format(shown);
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        id={id}
        onClick={() => setOpen((o) => !o)}
        className="rsvp-input flex cursor-pointer items-center justify-between gap-2 text-left"
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span className={label ? '' : 'text-[var(--text-muted)] opacity-70'}>
          {label || 'Seleccionar fecha'}
        </span>
        <CalendarDays size={16} className="shrink-0 text-[var(--gold-medium)]" />
      </button>

      {required && (
        <input
          type="text"
          value={value}
          onChange={() => {}}
          required
          tabIndex={-1}
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-px w-full opacity-0"
        />
      )}

      {open && (
        <div
          className="absolute left-0 top-full z-50 mt-2 rounded-[var(--radius-lg)] border border-[rgba(194,164,120,0.35)] bg-[var(--bg-secondary)] p-3 shadow-[var(--shadow-medium)]"
          style={{ '--rdp-accent-color': 'var(--color-primary)' } as React.CSSProperties}
        >
          <DayPicker
            mode="single"
            locale={es}
            captionLayout="dropdown"
            selected={selected}
            defaultMonth={selected}
            onSelect={(day) => {
              if (!day) return;
              onChange(buildValue(day, time, withTime));
              if (!withTime) setOpen(false);
            }}
          />
          {withTime && (
            <div className="mt-2 flex items-center justify-between gap-3 border-t border-[rgba(194,164,120,0.25)] pt-3">
              <label className="text-xs font-semibold uppercase tracking-wider text-[var(--gold-dark)]">
                Hora
              </label>
              <input
                type="time"
                value={time}
                disabled={!selected}
                onChange={(e) => {
                  if (selected && e.target.value) {
                    onChange(buildValue(selected, e.target.value, true));
                  }
                }}
                className="rounded border border-[rgba(194,164,120,0.35)] bg-transparent px-2 py-1 text-sm text-[var(--text-dark)]"
              />
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="cursor-pointer rounded bg-[var(--color-primary)] px-3 py-1 text-sm text-white"
              >
                Listo
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
