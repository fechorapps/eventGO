import React from 'react';
import SeatingPlanner from '@/components/SeatingPlanner';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

export default async function MesasPage({ params }: { params: Promise<{ eventId: string }> }) {
  const resolvedParams = await params;
  const eventId = parseInt(resolvedParams.eventId, 10);

  if (isNaN(eventId)) {
    return (
      <div className="admin-container" style={{ minHeight: '100vh', padding: '2rem', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--gold-dark)' }}>Error: ID de evento inválido</h2>
        <Link href="/admin" className="btn-outline" style={{ marginTop: '1rem', display: 'inline-flex' }}>Volver</Link>
      </div>
    );
  }

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
