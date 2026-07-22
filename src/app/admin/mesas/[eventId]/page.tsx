import React from 'react';
import SeatingPlanner from '@/components/SeatingPlanner';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

export default function MesasPage({ params }: { params: { eventId: string } }) {
  const eventId = parseInt(params.eventId, 10);

  return (
    <div className="admin-container" style={{ minHeight: '100vh', padding: '2rem 1.5rem', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <span className="guest-type-tag">Acomodo de Mesas</span>
          <h2 style={{ fontSize: '1.8rem', color: 'var(--gold-dark)', margin: 0 }}>
            Organización del Evento #{eventId}
          </h2>
        </div>
        <Link href="/admin" className="btn-outline" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '0.6rem 1.2rem', textDecoration: 'none' }}>
          <ChevronLeft size={16} />
          Volver a Administración
        </Link>
      </div>

      <div className="section-card" style={{ padding: '2rem', borderRadius: '16px', background: '#fff' }}>
        <SeatingPlanner eventId={eventId} />
      </div>
    </div>
  );
}
