'use client';

import { useState } from 'react';
import { Check } from 'lucide-react';
import { THEMES, THEME_CATEGORIES, getTheme } from '@/lib/themes';

export default function ThemePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (themeId: string) => void;
}) {
  // Open the picker on the selected theme's own category, so editing an
  // existing event doesn't land on "Bautizo" by default when the event is
  // actually themed for a "Boda".
  const [activeCategory, setActiveCategory] = useState(() => getTheme(value).category);

  const themesInCategory = THEMES.filter((theme) => theme.category === activeCategory);

  return (
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
  );
}
