'use client';

import { useState } from 'react';
import { Check } from 'lucide-react';
import { THEMES, THEME_CATEGORIES, getTheme } from '@/lib/themes';

export default function ThemePicker({
  value,
  onChange,
  celebrantName,
  eventTitle,
}: {
  value: string;
  onChange: (themeId: string) => void;
  /** Shown in the live preview panel so it reflects this event, not a placeholder. */
  celebrantName?: string;
  eventTitle?: string;
}) {
  // Open the picker on the selected theme's own category, so editing an
  // existing event doesn't land on "Bautizo" by default when the event is
  // actually themed for a "Boda".
  const [activeCategory, setActiveCategory] = useState(() => getTheme(value).category);

  const themesInCategory = THEMES.filter((theme) => theme.category === activeCategory);
  const selectedTheme = getTheme(value);
  const previewName = celebrantName?.trim() || 'Nombre del Celebrante';
  const previewTitle = eventTitle?.trim() || 'Título del Evento';

  return (
    <div className="theme-picker-layout">
      <div>
        <div className="theme-picker-categories">
          {THEME_CATEGORIES.map((category) => (
            <button
              key={category}
              type="button"
              className={`theme-picker-category-btn ${activeCategory === category ? 'active' : ''}`}
              onClick={() => setActiveCategory(category)}
            >
              {category}
            </button>
          ))}
        </div>

        <div className="theme-picker-grid">
          {themesInCategory.map((theme) => {
            const selected = theme.id === value;
            return (
              <button
                key={theme.id}
                type="button"
                className={`theme-picker-card ${selected ? 'selected' : ''}`}
                onClick={() => onChange(theme.id)}
                title={theme.name}
              >
                <div className="theme-picker-swatches">
                  <span className="theme-picker-swatch" style={{ background: theme.palette.primary }} />
                  <span className="theme-picker-swatch" style={{ background: theme.palette.accent }} />
                  <span className="theme-picker-swatch" style={{ background: theme.palette.primaryLight }} />
                  {selected && (
                    <span className="theme-picker-check">
                      <Check size={12} />
                    </span>
                  )}
                </div>
                <span className="theme-picker-name">{theme.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="theme-preview-panel">
        <div className="theme-preview-label">Vista Previa</div>
        <div className="theme-preview-browser">
          <div className="theme-preview-browser-bar">
            <span className="theme-preview-dot" style={{ background: '#ef4444' }} />
            <span className="theme-preview-dot" style={{ background: '#f59e0b' }} />
            <span className="theme-preview-dot" style={{ background: '#10b981' }} />
          </div>
          <div className="theme-preview-hero" style={{ background: selectedTheme.palette.primaryLight }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={selectedTheme.palette.primary} strokeWidth="1.5" aria-hidden="true">
              <path d="M12 21c-4-2.5-8-6-8-11a5 5 0 0 1 9-3 5 5 0 0 1 9 3c0 5-4 8.5-8 11z"></path>
            </svg>
            <div className="theme-preview-name" style={{ color: selectedTheme.palette.primary }}>
              {previewName}
            </div>
            <div className="theme-preview-subtitle">{previewTitle}</div>
            <span className="theme-preview-btn" style={{ background: selectedTheme.palette.primary }}>
              Confirmar Asistencia
            </span>
          </div>
        </div>
        <p className="theme-preview-hint">
          Así se vería la portada de tu invitación pública con el tema &ldquo;{selectedTheme.name}&rdquo;.
        </p>
      </div>
    </div>
  );
}
