'use client';

import { useEffect, useState } from 'react';
import { Plus, Info, Calendar, MapPin, Users, Edit, Trash2, Link2 } from 'lucide-react';
import Link from 'next/link';
import type { Event } from '@/types/admin';

export default function AdminPage() {
  const [events, setEvents] = useState<Event[]>([]);
  // Starts true: this route now genuinely server-renders on first paint, so
  // a `false` default would flash "No tienes ningún evento registrado"
  // before the fetch resolves.
  const [eventsLoading, setEventsLoading] = useState(true);

  const fetchEvents = async () => {
    setEventsLoading(true);
    try {
      const response = await fetch('/api/admin/events');
      if (response.ok) {
        const data = await response.json();
        setEvents(data.events || []);
      }
    } catch (e) {
      console.error('Error fetching events:', e);
    } finally {
      setEventsLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const handleDeleteEvent = async (eventId: number, title: string, celebrant: string) => {
    if (!window.confirm(`¿Estás seguro de que deseas eliminar por completo el evento "${title} - ${celebrant}"? Se borrarán todas las asistencias asociadas de forma permanente.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/events?id=${eventId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setEvents(current => current.filter(e => e.id !== eventId));
      } else {
        alert('Error al intentar eliminar el evento.');
      }
    } catch (e) {
      console.error(e);
      alert('Error de conexión');
    }
  };

  return (
    <div className="admin-container">
      <header className="admin-header">
        <div>
          <span className="section-subtitle" style={{ textAlign: 'left', marginBottom: '0.2rem', display: 'block' }}>Gestor de Invitaciones</span>
          <h1 style={{ fontSize: '2.2rem', color: 'var(--gold-dark)' }}>eventGO Admin</h1>
        </div>
      </header>

      <section>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.8rem', color: 'var(--gold-dark)', margin: 0 }}>Tus Eventos</h2>
          <Link href="/admin/eventos/nuevo" className="btn-gold">
            <Plus size={16} />
            Crear Nuevo Evento
          </Link>
        </div>

        {eventsLoading ? (
          <p style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)' }}>Cargando eventos...</p>
        ) : events.length === 0 ? (
          <div className="section-card" style={{ padding: '4rem 2rem' }}>
            <Info size={36} style={{ color: 'var(--gold-medium)', marginBottom: '1rem', display: 'inline-block' }} />
            <h3>No tienes ningún evento registrado</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', marginTop: '0.5rem' }}>
              Crea tu primera invitación parametrizable haciendo clic en el botón de abajo.
            </p>
            <Link href="/admin/eventos/nuevo" className="btn-gold">
              Crear Mi Primer Evento
            </Link>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.5rem' }}>
            {events.map((event) => {
              const dateFormatted = new Date(event.date).toLocaleDateString('es-MX', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              });

              return (
                <div key={event.id} className="section-card" style={{ padding: '2rem', textAlign: 'left', marginBottom: 0, display: 'flex', flexDirection: 'column', height: '100%' }}>
                  <div style={{ marginBottom: '1.5rem', flexGrow: 1 }}>
                    <span className="guest-type-tag" style={{ fontSize: '0.65rem' }}>{event.title}</span>
                    <h3 style={{ fontSize: '1.6rem', color: 'var(--gold-dark)', marginTop: '0.2rem', marginBottom: '0.5rem' }}>
                      {event.celebrantName}
                    </h3>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                      <Calendar size={14} />
                      <span>{dateFormatted}</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      <MapPin size={14} />
                      <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                        {event.churchName || event.hallName || 'Sin ubicación registrada'}
                      </span>
                    </div>
                  </div>

                  <div style={{ borderTop: '1px solid rgba(212,175,55,0.1)', paddingTop: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <Link href={`/admin/eventos/${event.id}`} className="btn-gold" style={{ flexGrow: 1, padding: '0.6rem', fontSize: '0.75rem' }}>
                        <Users size={14} />
                        Ver Invitados
                      </Link>

                      <Link href={`/admin/eventos/${event.id}/editar`} className="btn-outline" style={{ padding: '0.6rem', fontSize: '0.75rem' }}>
                        <Edit size={14} />
                        Editar
                      </Link>

                      <button onClick={() => handleDeleteEvent(event.id, event.title, event.celebrantName)} className="btn-delete" style={{ padding: '0.6rem' }} title="Eliminar Evento">
                        <Trash2 size={14} />
                      </button>
                    </div>

                    <a
                      href={`/e/${event.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-outline"
                      style={{ width: '100%', padding: '0.5rem', fontSize: '0.75rem', textTransform: 'none' }}
                    >
                      <Link2 size={13} style={{ verticalAlign: '-2px', marginRight: '6px', display: 'inline-block' }} />Ver Enlace Público (/e/{event.slug})
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
