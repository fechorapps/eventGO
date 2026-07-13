'use client';

import { useEffect, useMemo, useState } from 'react';

interface InvitationNavProps {
  showItinerary: boolean;
  showFamily: boolean;
  showPhotos: boolean;
}

interface NavItem {
  id: string;
  label: string;
  className?: string;
}

export default function InvitationNav({ showItinerary, showFamily, showPhotos }: InvitationNavProps) {
  const items = useMemo<NavItem[]>(() => [
    { id: 'ceremony', label: 'Ubicación' },
    ...(showItinerary ? [{ id: 'itinerary', label: 'Itinerario' }] : []),
    ...(showFamily ? [{ id: 'family', label: 'Familia' }] : []),
    ...(showPhotos ? [{ id: 'photos', label: 'Fotos' }] : []),
    { id: 'gifts', label: 'Regalos' },
    { id: 'rsvp', label: 'Confirmar', className: 'nav-btn-rsvp' },
  ], [showFamily, showItinerary, showPhotos]);
  const [activeSection, setActiveSection] = useState('ceremony');

  useEffect(() => {
    const updateActiveSection = () => {
      const activationLine = window.innerHeight * 0.38;
      let nextActiveSection = items[0]?.id || '';

      for (const item of items) {
        const section = document.getElementById(item.id);
        if (section && section.getBoundingClientRect().top <= activationLine) {
          nextActiveSection = item.id;
        }
      }

      setActiveSection(nextActiveSection);
    };

    updateActiveSection();
    window.addEventListener('scroll', updateActiveSection, { passive: true });
    window.addEventListener('resize', updateActiveSection);

    return () => {
      window.removeEventListener('scroll', updateActiveSection);
      window.removeEventListener('resize', updateActiveSection);
    };
  }, [items]);

  return (
    <nav className="invitation-nav" aria-label="Secciones de la invitación">
      {items.map((item) => (
        <a
          key={item.id}
          href={`#${item.id}`}
          className={item.className}
          aria-current={activeSection === item.id ? 'page' : undefined}
          onClick={() => setActiveSection(item.id)}
        >
          {item.label}
        </a>
      ))}
    </nav>
  );
}
