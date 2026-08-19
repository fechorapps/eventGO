import Link from 'next/link';
import EventForm from '@/components/admin/EventForm';

export default async function EditEventPage({ params }: { params: Promise<{ eventId: string }> }) {
  const resolvedParams = await params;
  const eventId = parseInt(resolvedParams.eventId, 10);

  if (isNaN(eventId)) {
    return (
      <div className="admin-container" style={{ minHeight: '100vh', padding: '2rem', textAlign: 'center' }}>
        <h2 style={{ color: '#0f172a', fontFamily: 'var(--font-sans)' }}>Error: ID de evento inválido</h2>
        <Link href="/admin" className="btn-outline" style={{ marginTop: '1rem', display: 'inline-flex' }}>Volver</Link>
      </div>
    );
  }

  return <EventForm mode="edit" eventId={eventId} />;
}
