import React from 'react';
import SeatingPlanner from '@/components/SeatingPlanner';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

export default async function MesasPage({ params }: { params: Promise<{ eventId: string }> }) {
  const resolvedParams = await params;
  const eventId = parseInt(resolvedParams.eventId, 10);

  if (isNaN(eventId)) {
    return (
      <div className="admin-container seating-admin-page seating-admin-page-error">
        <h2 style={{ color: '#0f172a', fontFamily: 'var(--font-sans)' }}>Error: ID de evento inválido</h2>
        <Link href="/admin" className="btn-outline" style={{ marginTop: '1rem', display: 'inline-flex' }}>Volver</Link>
      </div>
    );
  }

  return (
    <div className="admin-container seating-admin-container seating-admin-page">
      <div className="seating-admin-page-header">
        <h2>
          Acomodo de mesas — Evento #{eventId}
        </h2>
        <Link href={`/admin/eventos/${eventId}`} className="btn-outline seating-admin-page-back-link">
          <ChevronLeft size={16} />
          Volver a Invitados
        </Link>
      </div>

      <div className="section-card seating-admin-page-card">
        <SeatingPlanner eventId={eventId} />
      </div>
    </div>
  );
}
