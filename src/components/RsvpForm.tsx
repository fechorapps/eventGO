'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Send, Users, Phone, MessageSquare } from 'lucide-react';

interface GuestInput {
  name: string;
  isChild: boolean;
  confirmed: boolean;
}

interface RsvpGuest {
  id?: number;
  name: string;
  isChild: boolean;
  confirmed: boolean;
}

interface SelectedRsvp {
  id: number;
  familyName: string;
  invitedBy?: string | null;
  contactPhone?: string | null;
  comments?: string | null;
  guests: RsvpGuest[];
}

interface RsvpFormProps {
  eventId: number;
  slug: string;
  rsvpPhone?: string | null;
  preloadedRsvp?: SelectedRsvp | null;
}

export default function RsvpForm({ eventId, slug, rsvpPhone, preloadedRsvp }: RsvpFormProps) {
  const activeRsvp = preloadedRsvp || null;

  const [familyName] = useState(preloadedRsvp?.familyName || '');
  const [invitedBy, setInvitedBy] = useState(preloadedRsvp?.invitedBy || '');
  const [contactPhone, setContactPhone] = useState(preloadedRsvp?.contactPhone || '');
  const [comments, setComments] = useState(preloadedRsvp?.comments || '');
  const [guests, setGuests] = useState<GuestInput[]>(
    preloadedRsvp?.guests
      ? preloadedRsvp.guests.map((guest) => ({
          name: guest.name,
          isChild: guest.isChild,
          confirmed: guest.confirmed,
        }))
      : []
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [animatingIndex, setAnimatingIndex] = useState<number | null>(null);
  const hasMountedRef = useRef(false);
  const saveTimerRef = useRef<number | null>(null);

  const hostPhoneRaw = rsvpPhone || '521234567890';
  const hostPhoneDigits = hostPhoneRaw.replace(/\D/g, '');
  const hostPhone = hostPhoneDigits.length === 10 ? `52${hostPhoneDigits}` : hostPhoneDigits;

  const formatMexicanPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    const truncated = numbers.slice(0, 10);

    if (truncated.length <= 2) {
      return truncated;
    }

    if (truncated.length <= 6) {
      return `(${truncated.slice(0, 2)}) ${truncated.slice(2)}`;
    }

    return `(${truncated.slice(0, 2)}) ${truncated.slice(2, 6)}-${truncated.slice(6)}`;
  };

  const handleSetGuestConfirmed = (index: number, isConfirmed: boolean) => {
    const updated = [...guests];
    updated[index].confirmed = isConfirmed;
    setGuests(updated);

    setAnimatingIndex(index);
    setTimeout(() => {
      setAnimatingIndex(null);
    }, 450);
  };

  const buildWhatsAppLink = () => {
    const confirmedList = guests
      .filter((guest) => guest.confirmed)
      .map((guest) => `• ${guest.name} (${guest.isChild ? 'Niño' : 'Adulto'})`)
      .join('\n');

    const declinedList = guests
      .filter((guest) => !guest.confirmed)
      .map((guest) => `• ${guest.name} (${guest.isChild ? 'Niño' : 'Adulto'})`)
      .join('\n');

    let text = '¡Hola! Confirmamos nuestra asistencia al Bautizo ✨\n\n';
    text += `*Familia:* ${familyName}\n`;
    if (invitedBy) {
      text += `*Invitados por:* ${invitedBy === 'papa' ? 'Papá' : 'Mamá'}\n`;
    }

    if (confirmedList) {
      text += `*Confirmados:* \n${confirmedList}\n`;
    }

    if (declinedList) {
      text += `*No asistirán:* \n${declinedList}\n`;
    }

    if (comments.trim()) {
      text += `\n*Dedicatoria:* "${comments.trim()}"`;
    }

    return `https://wa.me/${hostPhone}?text=${encodeURIComponent(text)}`;
  };

  useEffect(() => {
    if (!activeRsvp) return;

    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }

    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = window.setTimeout(() => {
      void saveRsvp();
    }, 500);

    return () => {
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current);
      }
    };
  }, [activeRsvp, guests, invitedBy, contactPhone, comments]);

  const saveRsvp = async () => {
    if (!familyName.trim()) {
      setError('No se encontró una familia válida en esta liga.');
      return;
    }

    if (guests.length === 0) {
      setError('No hay invitados disponibles para esta familia.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const response = await fetch('/api/rsvp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventId,
          slug,
          familyName: familyName.trim(),
          invitedBy: invitedBy.trim(),
          contactPhone: contactPhone.trim(),
          comments: comments.trim(),
          guests,
          rsvpId: activeRsvp?.id || null,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.error || 'Ocurrió un error al guardar tu confirmación.');
        return;
      }
    } catch (submitError) {
      console.error(submitError);
      setError('Error de conexión. Inténtalo de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  if (!activeRsvp) {
    return (
      <div className="rsvp-form-container">
        <div style={{ background: 'rgba(212,175,55,0.03)', border: '1px solid rgba(212,175,55,0.15)', borderRadius: '12px', padding: '2rem 1.5rem', textAlign: 'center', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'center', color: 'var(--gold-medium)', marginBottom: '1rem' }}>
            <Users size={32} />
          </div>
          <h4 className="serif-italic" style={{ fontSize: '1.4rem', color: 'var(--gold-dark)', margin: '0 0 0.5rem 0' }}>
            Acceso por Invitación
          </h4>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
            Esta confirmación solo se puede abrir desde la liga personalizada enviada a tu familia.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rsvp-form-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(212,175,55,0.05)', border: '1px solid var(--gold-medium)', borderRadius: '8px', padding: '0.8rem 1.2rem', marginBottom: '1.5rem' }}>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-dark)' }}>
          ✨ Pase precargado: <strong>{familyName}</strong>
          <span style={{ marginLeft: '0.75rem', color: 'var(--text-muted)' }}>
            {saving ? 'Guardando…' : 'Se guarda automáticamente'}
          </span>
        </div>
      </div>

      <form
        className="rsvp-form"
        onSubmit={(e) => {
          e.preventDefault();
        }}
      >
        <div className="rsvp-form-group">
          <label className="rsvp-label" htmlFor="family-name">
            <Users size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
            Nombre de la Familia o Invitado Principal
          </label>
          <input
            id="family-name"
            type="text"
            className="rsvp-input"
            value={familyName}
            disabled
            required
          />
        </div>

        <div className="rsvp-form-group">
          <label className="rsvp-label" htmlFor="invited-by">
            <Users size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
            Invitados por
          </label>
          <select
            id="invited-by"
            className="rsvp-input"
            value={invitedBy}
            onChange={(e) => setInvitedBy(e.target.value)}
            disabled={saving}
            required
          >
            <option value="" disabled>
              Selecciona una opción
            </option>
            <option value="papa">Papá</option>
            <option value="mama">Mamá</option>
          </select>
        </div>

        <div className="rsvp-form-group">
          <label className="rsvp-label" htmlFor="contact-phone">
            <Phone size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
            Teléfono de Contacto
          </label>
          <input
            id="contact-phone"
            type="tel"
            className="rsvp-input"
            placeholder="Ej: (55) 1234-5678"
            value={contactPhone}
            onChange={(e) => setContactPhone(formatMexicanPhone(e.target.value))}
            disabled={saving}
          />
        </div>

        <div className="rsvp-form-group" style={{ marginBottom: '2rem' }}>
          <label className="rsvp-label">
            Miembros de la familia y confirmación
          </label>

          {guests.map((guest, idx) => (
            <div
              key={idx}
              className={`guest-item-card ${animatingIndex === idx ? 'pulse-animate' : ''}`}
              style={{
                border: guest.confirmed
                  ? '1px solid rgba(56, 87, 35, 0.35)'
                  : '1px solid rgba(198, 89, 17, 0.35)',
                boxShadow: guest.confirmed
                  ? '0 2px 8px rgba(56, 87, 35, 0.05)'
                  : '0 2px 8px rgba(198, 89, 17, 0.05)',
                transition: 'all 0.4s ease',
              }}
            >
              <div className="guest-info">
                <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                  <span className="guest-name-text">{guest.name}</span>
                  <span className={`selection-indicator ${guest.confirmed ? 'select-yes-badge' : 'select-no-badge'}`}>
                    {guest.confirmed ? '✓ Asiste' : '✗ No Asiste'}
                  </span>
                </div>
                <span className="guest-type-tag" style={{ cursor: 'default' }}>
                  {guest.isChild ? '👶 Niño' : '👨 Adulto'}
                </span>
              </div>
              <div className="guest-controls">
                <div className="guest-rsvp-toggle">
                  <button
                    type="button"
                    onClick={() => handleSetGuestConfirmed(idx, true)}
                    className={`toggle-btn toggle-yes ${guest.confirmed ? 'active' : ''}`}
                    disabled={saving}
                  >
                    Asistirá
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetGuestConfirmed(idx, false)}
                    className={`toggle-btn toggle-no ${!guest.confirmed ? 'active' : ''}`}
                    disabled={saving}
                  >
                    No asistirá
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="rsvp-form-group">
          <label className="rsvp-label" htmlFor="comments">
            <MessageSquare size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
            Dedicatoria o Mensaje especial (Opcional)
          </label>
          <textarea
            id="comments"
            className="rsvp-input rsvp-textarea"
            placeholder="Puedes dejar un lindo mensaje para el bebé o alguna nota de alimentación/aclaración."
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            disabled={saving}
          />
        </div>

        {error && (
          <div style={{ color: '#B22222', fontSize: '0.9rem', marginBottom: '1.5rem', fontWeight: 500 }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'center', marginTop: '2rem' }}>
          <a
            href={buildWhatsAppLink()}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-gold"
            style={{ width: '100%', maxWidth: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', textDecoration: 'none' }}
          >
            <Send size={18} />
            Enviar pase por WhatsApp
          </a>
        </div>
      </form>
    </div>
  );
}
