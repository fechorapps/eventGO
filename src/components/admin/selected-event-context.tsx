'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';

interface SelectedEventContextValue {
  slug: string | null;
  setSlug: (slug: string | null) => void;
}

const SelectedEventContext = createContext<SelectedEventContextValue | null>(null);

export function SelectedEventProvider({ children }: { children: ReactNode }) {
  const [slug, setSlug] = useState<string | null>(null);
  return (
    <SelectedEventContext.Provider value={{ slug, setSlug }}>
      {children}
    </SelectedEventContext.Provider>
  );
}

export function useSelectedEventSlug() {
  const ctx = useContext(SelectedEventContext);
  if (!ctx) throw new Error('useSelectedEventSlug must be used within SelectedEventProvider');
  return ctx;
}
