'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Trash2, Plus, Save, Clock, Church, Wine, ShoppingCart, Camera, Gift } from 'lucide-react';
import DateField from '@/components/DateField';
import type { Event, TempItineraryInput, TempRegistryInput } from '@/types/admin';

type EventFormProps = { mode: 'create' } | { mode: 'edit'; eventId: number };

export default function EventForm(props: EventFormProps) {
  const router = useRouter();
  const isEdit = props.mode === 'edit';
  // Known immediately from the URL in edit mode — no need to wait for the
  // fetch below to resolve. Drives the slug-lock and heading text exactly
  // like the old eventFormId state did.
  const eventFormId = props.mode === 'edit' ? props.eventId : null;

  const [initLoading, setInitLoading] = useState(isEdit);
  const [notFound, setNotFound] = useState(false);

  const [formSlug, setFormSlug] = useState('');
  const [formTitle, setFormTitle] = useState('Bautizo');
  const [formCelebrantName, setFormCelebrantName] = useState('');
  const [formSubtitle, setFormSubtitle] = useState('Nuestra Promesa de Amor');
  const [formQuote, setFormQuote] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formHeroBackgroundUrl, setFormHeroBackgroundUrl] = useState('');
  const [formDetailsBackgroundUrl, setFormDetailsBackgroundUrl] = useState('');
  const [formRsvpBackgroundUrl, setFormRsvpBackgroundUrl] = useState('');
  const [formParents, setFormParents] = useState('');
  const [formGodparents, setFormGodparents] = useState('');

  const [formChurchName, setFormChurchName] = useState('');
  const [formChurchTime, setFormChurchTime] = useState('');
  const [formChurchAddress, setFormChurchAddress] = useState('');
  const [formChurchMapsUrl, setFormChurchMapsUrl] = useState('');

  const [formHallName, setFormHallName] = useState('');
  const [formHallTime, setFormHallTime] = useState('');
  const [formHallAddress, setFormHallAddress] = useState('');
  const [formHallMapsUrl, setFormHallMapsUrl] = useState('');
  const [formLocationsAreSame, setFormLocationsAreSame] = useState(true);

  const [formDressCode, setFormDressCode] = useState('');
  const [formDressCodeEnabled, setFormDressCodeEnabled] = useState(false);

  const [itineraryItems, setItineraryItems] = useState<TempItineraryInput[]>([]);
  const [newItineraryTime, setNewItineraryTime] = useState('');
  const [newItineraryActivity, setNewItineraryActivity] = useState('');

  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>([]);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [backgroundUploadingTarget, setBackgroundUploadingTarget] = useState<'hero' | 'details' | 'rsvp' | null>(null);

  const [giftRegistries, setGiftRegistries] = useState<TempRegistryInput[]>([]);
  const [tempStoreName, setTempStoreName] = useState('Liverpool');
  const [tempRegistryNumber, setTempRegistryNumber] = useState('');
  const [tempRegistryUrl, setTempRegistryUrl] = useState('');

  const [formGiftEnvelope, setFormGiftEnvelope] = useState(true);
  const [formGiftBankName, setFormGiftBankName] = useState('');
  const [formGiftBankOwner, setFormGiftBankOwner] = useState('');
  const [formGiftBankClabe, setFormGiftBankClabe] = useState('');

  const [formRsvpPhone, setFormRsvpPhone] = useState(formatWhatsAppPhone('5215512345678'));
  const [formRsvpDeadline, setFormRsvpDeadline] = useState('');
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  function formatMexicanPhone(value: string) {
    const numbers = value.replace(/\D/g, '');
    const truncated = numbers.slice(0, 10);
    if (truncated.length <= 2) {
      return truncated;
    } else if (truncated.length <= 6) {
      return `(${truncated.slice(0, 2)}) ${truncated.slice(2)}`;
    } else {
      return `(${truncated.slice(0, 2)}) ${truncated.slice(2, 6)}-${truncated.slice(6)}`;
    }
  }

  function formatWhatsAppPhone(value: string) {
    const digits = value.replace(/\D/g, '').slice(0, 13);
    const hasMexicoCountryCode = digits.startsWith('52') && digits.length > 10;
    const countryCode = hasMexicoCountryCode ? digits.slice(0, digits.startsWith('521') ? 3 : 2) : '';
    const localNumber = hasMexicoCountryCode ? digits.slice(countryCode.length) : digits;
    const formattedLocalNumber = formatMexicanPhone(localNumber);

    if (!countryCode) return formattedLocalNumber;
    return `+${countryCode} ${formattedLocalNumber}`.trim();
  }

  const formatClabe = (value: string) =>
    (value.replace(/\D/g, '').slice(0, 18).match(/.{1,3}/g) || []).join(' ');

  // URL Auto-Prefix & Validation Helpers
  const ensureHttp = (url: string): string => {
    if (!url) return '';
    const trimmed = url.trim();
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return trimmed;
    }
    return `https://${trimmed}`;
  };

  const isValidUrl = (url: string): boolean => {
    if (!url) return true;
    // Las fotos cargadas por este administrador se sirven desde /public/uploads.
    // Son rutas internas válidas, aunque no sean URL absolutas.
    if (/^\/uploads\/[a-zA-Z0-9._-]+$/.test(url.trim())) return true;
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch (_) {
      return false;
    }
  };

  // Las fotos de celular pesan 2-10MB y el proxy rechaza cuerpos grandes;
  // además la galería no necesita más de 1920px. Se redimensionan y
  // recomprimen en el navegador antes de subirlas.
  const compressImage = async (file: File): Promise<File> => {
    if (!file.type.startsWith('image/') || file.type === 'image/gif' || file.size < 900 * 1024) {
      return file;
    }
    try {
      const bitmap = await createImageBitmap(file);
      const MAX_DIM = 1920;
      const scale = Math.min(1, MAX_DIM / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(bitmap.width * scale);
      canvas.height = Math.round(bitmap.height * scale);
      canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/jpeg', 0.82)
      );
      if (!blob || blob.size >= file.size) return file;
      return new File([blob], getSafeUploadFileName(file.name, '.jpg'), { type: 'image/jpeg' });
    } catch {
      return file;
    }
  };

  const getSafeUploadFileName = (name: string, fallbackExt = '.jpg') => {
    const lowerName = name.toLowerCase().replace(/\\/g, '/').split('/').pop() || 'upload';
    const lastDot = lowerName.lastIndexOf('.');
    const stemRaw = lastDot > 0 ? lowerName.slice(0, lastDot) : lowerName;
    const extRaw = lastDot > 0 ? lowerName.slice(lastDot) : '';
    const stem = stemRaw
      .replace(/[^a-z0-9_-]+/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '') || 'upload';
    const safeExt = /^\.[a-z0-9]+$/.test(extRaw) ? extRaw : fallbackExt;
    return `${stem}${safeExt}`;
  };

  const uploadFiles = async (files: File[]) => {
    const newUrls: string[] = [];

    for (const file of files) {
      const toSend = await compressImage(file);
      const formData = new FormData();
      formData.append('file', toSend);

      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const reason = res.status === 413 ? 'la imagen es demasiado grande' : `error ${res.status}`;
        throw new Error(`Error al subir la imagen ${file.name}: ${reason}`);
      }

      const data = await res.json();
      if (data.url) {
        newUrls.push(data.url);
      }
    }

    return newUrls;
  };

  // Seeds the same hardcoded Spanish demo defaults the old
  // handleOpenCreateEvent click handler did. Runs from a mount effect
  // (not a lazy useState initializer) because the defaults derive from
  // new Date() — this component now genuinely SSRs, and a lazy initializer
  // would compute the date on the server and again on the client, risking
  // a hydration mismatch across an hour/timezone boundary. A mount effect
  // runs client-only and sidesteps that entirely.
  function applyCreateDefaults() {
    setFormSlug('');
    setFormTitle('Bautizo');
    setFormCelebrantName('');
    setFormSubtitle('Nuestra Promesa de Amor');
    setFormQuote('Señor, toma mi pequeña vida en tus manos, guíame con tu amor y enséñame a caminar bajo tu luz divina.');

    const futureDate = new Date();
    futureDate.setMonth(futureDate.getMonth() + 3);
    futureDate.setMinutes(0);
    futureDate.setSeconds(0);
    setFormDate(futureDate.toISOString().slice(0, 16));
    setFormHeroBackgroundUrl('');
    setFormDetailsBackgroundUrl('');
    setFormRsvpBackgroundUrl('');

    setFormParents('Sofía Mendoza Pérez, Alejandro Ruiz Domínguez');
    setFormGodparents('María Ruiz Domínguez, Carlos Mendoza Pérez');

    setFormChurchName('Parroquia de San Francisco de Asís');
    setFormChurchTime('12:00 PM');
    setFormChurchAddress('Av. Universidad 1500, Col. Del Valle, Benito Juárez, CDMX');
    setFormChurchMapsUrl('https://maps.google.com/?q=Parroquia+de+San+Francisco+de+Asis+Av+Universidad+1500');

    setFormHallName('Salón de Eventos "El Jardín de las Luces"');
    setFormHallTime('2:00 PM');
    setFormHallAddress('Camino Real a Toluca 45, Col. Lomas de Vista Hermosa, CDMX');
    setFormHallMapsUrl('https://maps.google.com/?q=Salon+de+Eventos+El+Jardin+de+las+Luces+CDMX');
    setFormLocationsAreSame(true);

    setFormDressCode('');
    setFormDressCodeEnabled(false);

    setItineraryItems([
      { time: '12:00 PM', activity: 'Ceremonia Religiosa' },
      { time: '01:30 PM', activity: 'Sesión de Fotos' },
      { time: '02:00 PM', activity: 'Recepción y Cóctel' },
      { time: '03:00 PM', activity: 'Comida de Celebración' },
      { time: '05:00 PM', activity: 'Pastel y Brindis' },
    ]);
    setNewItineraryTime('');
    setNewItineraryActivity('');

    setUploadedPhotos([]);
    setPhotoUploading(false);

    setGiftRegistries([
      { storeName: 'Liverpool', registryNumber: '50812345', url: 'https://mesaderegalos.liverpool.com.mx/' }
    ]);
    setTempStoreName('Liverpool');
    setTempRegistryNumber('');
    setTempRegistryUrl('');

    setFormGiftEnvelope(true);
    setFormGiftBankName('BBVA');
    setFormGiftBankOwner('María Fernanda López');
    setFormGiftBankClabe(formatClabe('012180001234567890'));

    setFormRsvpPhone(formatWhatsAppPhone('5215512345678'));

    const deadlineDate = new Date(futureDate);
    deadlineDate.setDate(deadlineDate.getDate() - 14);
    setFormRsvpDeadline(deadlineDate.toISOString().slice(0, 10));

    setFormError('');
  }

  function applyEventToForm(event: Event) {
    setFormSlug(event.slug);
    setFormTitle(event.title);
    setFormCelebrantName(event.celebrantName);
    setFormSubtitle(event.subtitle || '');
    setFormQuote(event.quote || '');
    setFormHeroBackgroundUrl(event.heroBackgroundUrl || '');
    setFormDetailsBackgroundUrl(event.detailsBackgroundUrl || '');
    setFormRsvpBackgroundUrl(event.rsvpBackgroundUrl || '');

    const localDate = new Date(event.date);
    const offset = localDate.getTimezoneOffset();
    const adjustedDate = new Date(localDate.getTime() - offset * 60 * 1000);
    setFormDate(adjustedDate.toISOString().slice(0, 16));

    setFormParents(event.parents || '');
    setFormGodparents(event.godparents || '');

    setFormChurchName(event.churchName || '');
    setFormChurchTime(event.churchTime || '');
    setFormChurchAddress(event.churchAddress || '');
    setFormChurchMapsUrl(event.churchMapsUrl || '');

    setFormHallName(event.hallName || '');
    setFormHallTime(event.hallTime || '');
    setFormHallAddress(event.hallAddress || '');
    setFormHallMapsUrl(event.hallMapsUrl || '');
    setFormLocationsAreSame(event.locationsAreSame);

    setFormDressCode(event.dressCode || '');
    setFormDressCodeEnabled(Boolean(event.dressCode));

    setItineraryItems(
      event.itinerary ? event.itinerary.map(item => ({
        time: item.time,
        activity: item.activity,
      })) : []
    );
    setNewItineraryTime('');
    setNewItineraryActivity('');

    setUploadedPhotos(
      event.photos ? event.photos.map(p => p.url) : []
    );
    setPhotoUploading(false);

    setGiftRegistries(
      event.giftRegistries ? event.giftRegistries.map(r => ({
        storeName: r.storeName,
        registryNumber: r.registryNumber || '',
        url: r.url || '',
      })) : []
    );
    setTempStoreName('Liverpool');
    setTempRegistryNumber('');
    setTempRegistryUrl('');

    setFormGiftEnvelope(event.giftEnvelope);
    setFormGiftBankName(event.giftBankName || '');
    setFormGiftBankOwner(event.giftBankOwner || '');
    setFormGiftBankClabe(formatClabe(event.giftBankClabe || ''));

    setFormRsvpPhone(formatWhatsAppPhone(event.rsvpPhone || ''));

    if (event.rsvpDeadline) {
      setFormRsvpDeadline(new Date(event.rsvpDeadline).toISOString().slice(0, 10));
    } else {
      setFormRsvpDeadline('');
    }

    setFormError('');
  }

  useEffect(() => {
    if (props.mode === 'create') {
      applyCreateDefaults();
      return;
    }

    let cancelled = false;
    (async () => {
      setInitLoading(true);
      try {
        const response = await fetch(`/api/admin/events?id=${props.eventId}`);
        if (response.status === 401) {
          router.refresh();
          return;
        }
        if (response.status === 404) {
          if (!cancelled) setNotFound(true);
          return;
        }
        if (response.ok) {
          const data = await response.json();
          if (!cancelled) applyEventToForm(data.event);
        }
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setInitLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // Mount-only: this component gets a fresh instance per navigation
    // (Next.js remounts on route param change), so mode/eventId don't
    // change across this instance's lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formSlug.trim() || !formTitle.trim() || !formCelebrantName.trim() || !formDate) {
      setFormError('Los campos indicados con asterisco (*) son obligatorios.');
      return;
    }

    const slugRegex = /^[a-z0-9-]+$/;
    if (!slugRegex.test(formSlug.trim().toLowerCase())) {
      setFormError('El identificador URL (slug) solo puede contener letras minúsculas, números y guiones (ej. bautizo-gael).');
      return;
    }

    // Verify all URLs are valid before saving
    if (formChurchMapsUrl && !isValidUrl(formChurchMapsUrl)) {
      setFormError('Por favor verifica el enlace de la ubicación de la Iglesia (debe ser una URL válida, ej: https://...).');
      return;
    }
    if (!formLocationsAreSame && formHallMapsUrl && !isValidUrl(formHallMapsUrl)) {
      setFormError('Por favor verifica el enlace de la ubicación de la Recepción (debe ser una URL válida, ej: https://...).');
      return;
    }
    if (formHeroBackgroundUrl && !isValidUrl(formHeroBackgroundUrl)) {
      setFormError('Por favor verifica la foto de fondo principal.');
      return;
    }
    if (formDetailsBackgroundUrl && !isValidUrl(formDetailsBackgroundUrl)) {
      setFormError('Por favor verifica la foto de fondo para detalles.');
      return;
    }
    if (formRsvpBackgroundUrl && !isValidUrl(formRsvpBackgroundUrl)) {
      setFormError('Por favor verifica la foto de fondo para RSVP.');
      return;
    }
    const giftBankClabe = formGiftBankClabe.replace(/\D/g, '');
    if (giftBankClabe && giftBankClabe.length !== 18) {
      setFormError('La CLABE interbancaria debe tener 18 dígitos.');
      return;
    }

    setFormLoading(true);
    setFormError('');

    const payload = {
      id: eventFormId,
      slug: formSlug.trim().toLowerCase(),
      title: formTitle.trim(),
      celebrantName: formCelebrantName.trim(),
      subtitle: formSubtitle.trim() || null,
      quote: formQuote.trim() || null,
      date: new Date(formDate).toISOString(),
      heroBackgroundUrl: formHeroBackgroundUrl.trim() || null,
      detailsBackgroundUrl: formDetailsBackgroundUrl.trim() || null,
      rsvpBackgroundUrl: formRsvpBackgroundUrl.trim() || null,
      parents: formParents.trim() || null,
      godparents: formGodparents.trim() || null,
      churchName: formChurchName.trim() || null,
      churchTime: formChurchTime.trim() || null,
      churchAddress: formChurchAddress.trim() || null,
      churchMapsUrl: formChurchMapsUrl.trim() || null,
      hallName: (formLocationsAreSame ? formChurchName : formHallName).trim() || null,
      hallTime: formHallTime.trim() || null,
      hallAddress: (formLocationsAreSame ? formChurchAddress : formHallAddress).trim() || null,
      hallMapsUrl: (formLocationsAreSame ? formChurchMapsUrl : formHallMapsUrl).trim() || null,
      locationsAreSame: formLocationsAreSame,
      dressCode: formDressCodeEnabled ? formDressCode.trim() || null : null,
      itinerary: itineraryItems,
      photos: uploadedPhotos,
      giftRegistries: giftRegistries,
      giftEnvelope: formGiftEnvelope,
      giftBankName: formGiftBankName.trim() || null,
      giftBankOwner: formGiftBankOwner.trim() || null,
      giftBankClabe: giftBankClabe || null,
      rsvpPhone: formRsvpPhone.replace(/\D/g, '') || null,
      rsvpDeadline: formRsvpDeadline ? new Date(formRsvpDeadline).toISOString() : null,
    };

    try {
      const url = '/api/admin/events';
      const method = eventFormId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        router.push('/admin');
      } else {
        setFormError(data.error || 'Error al guardar el evento.');
      }
    } catch (err) {
      console.error(err);
      setFormError('Error de conexión.');
    } finally {
      setFormLoading(false);
    }
  };

  if (isEdit && notFound) {
    return (
      <div className="admin-container" style={{ textAlign: 'center', padding: '4rem 1rem' }}>
        <h2 style={{ color: 'var(--gold-dark)' }}>Evento no encontrado</h2>
        <Link href="/admin" className="btn-outline" style={{ marginTop: '1rem', display: 'inline-flex' }}>Volver a Eventos</Link>
      </div>
    );
  }

  if (isEdit && initLoading) {
    return (
      <div className="admin-container" style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-muted)' }}>
        <p>Cargando evento...</p>
      </div>
    );
  }

  return (
    <div className="admin-container">
      {/* VIEW: CREATE OR EDIT EVENT PARAMETERS FORM */}
        <section className="section-card" style={{ padding: '2.5rem clamp(1rem, 5vw, 3rem)', textAlign: 'left', borderRadius: '16px' }}>
          <h2 style={{ fontSize: '1.8rem', color: 'var(--gold-dark)', borderBottom: '1px solid rgba(212,175,55,0.15)', paddingBottom: '0.8rem', marginBottom: '2rem' }}>
            {eventFormId ? 'Configuración de Evento' : 'Registrar Nuevo Evento'}
          </h2>

          <form onSubmit={handleSaveEvent}>
            
            {/* --- SECCIÓN 1: DATOS BÁSICOS --- */}
            <h3 style={{ fontSize: '1.2rem', color: 'var(--gold-dark)', marginBottom: '1.2rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              1. Datos Principales del Evento
            </h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
              <div className="rsvp-form-group">
                <label className="rsvp-label" htmlFor="form-celebrant">Nombre del Celebrante *</label>
                <input
                  id="form-celebrant"
                  type="text"
                  className="rsvp-input"
                  placeholder="Ej: Mateo Alexander"
                  value={formCelebrantName}
                  onChange={(e) => setFormCelebrantName(e.target.value)}
                  required
                />
              </div>

              <div className="rsvp-form-group">
                <label className="rsvp-label" htmlFor="form-title">Título del Evento *</label>
                <input
                  id="form-title"
                  type="text"
                  className="rsvp-input"
                  placeholder="Ej: Mi Bautizo, Boda, XV Años"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  required
                />
              </div>

              <div className="rsvp-form-group">
                <label className="rsvp-label" htmlFor="form-slug">Identificador URL (Slug) *</label>
                <input
                  id="form-slug"
                  type="text"
                  className="rsvp-input"
                  placeholder="Ej: bautizo-gael (minúsculas y guiones)"
                  value={formSlug}
                  onChange={(e) => setFormSlug(e.target.value)}
                  required
                  disabled={!!eventFormId}
                />
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginTop: '4px' }}>
                  El enlace público de la invitación será: <strong>/e/{formSlug || 'identificador'}</strong>
                </span>
              </div>

              <div className="rsvp-form-group">
                <label className="rsvp-label" htmlFor="form-date">Fecha y Hora del Evento *</label>
                <DateField
                  id="form-date"
                  withTime
                  value={formDate}
                  onChange={setFormDate}
                  required
                />
              </div>

              <div className="rsvp-form-group">
                <label className="rsvp-label" htmlFor="form-subtitle">Subtítulo o Lema Hero</label>
                <input
                  id="form-subtitle"
                  type="text"
                  className="rsvp-input"
                  placeholder="Ej: Nuestra Promesa de Amor o Bienvenidos"
                  value={formSubtitle}
                  onChange={(e) => setFormSubtitle(e.target.value)}
                />
              </div>

              <div className="rsvp-form-group">
                <label className="rsvp-label" htmlFor="form-rsvp-phone">Teléfono de WhatsApp para Confirmaciones</label>
                <input
                  id="form-rsvp-phone"
                  type="tel"
                  inputMode="tel"
                  className="rsvp-input"
                  placeholder="Ej: +52 1 (55) 1234-5678"
                  value={formRsvpPhone}
                  onChange={(e) => setFormRsvpPhone(formatWhatsAppPhone(e.target.value))}
                />
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginTop: '4px' }}>
                  Número de WhatsApp al cual los invitados enviarán su comprobante automático.
                </span>
              </div>
            </div>

            <div className="rsvp-form-group" style={{ marginBottom: '2.5rem' }}>
              <label className="rsvp-label" htmlFor="form-quote">Frase de Bienvenida / Cita</label>
              <textarea
                id="form-quote"
                className="rsvp-input"
                placeholder="Escribe una linda frase que se mostrará en la cabecera de la invitación..."
                value={formQuote}
                onChange={(e) => setFormQuote(e.target.value)}
                style={{ minHeight: '60px', resize: 'vertical' }}
              />
            </div>

            {/* --- SECCIÓN 2: PADRES Y PADRINOS --- */}
            <h3 style={{ fontSize: '1.2rem', color: 'var(--gold-dark)', marginBottom: '1.2rem', textTransform: 'uppercase', letterSpacing: '0.05em', borderTop: '1px dashed rgba(212,175,55,0.15)', paddingTop: '1.5rem' }}>
              2. Familiares (Padres y Padrinos)
            </h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
              <div className="rsvp-form-group">
                <label className="rsvp-label" htmlFor="form-parents">Nombres de los Padres (separados por comas)</label>
                <input
                  id="form-parents"
                  type="text"
                  className="rsvp-input"
                  placeholder="Ej: Sofía Mendoza Pérez, Alejandro Ruiz Domínguez"
                  value={formParents}
                  onChange={(e) => setFormParents(e.target.value)}
                />
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginTop: '4px' }}>
                  Aparecerán listados bajo la sección &ldquo;Mis Padres&rdquo;.
                </span>
              </div>

              <div className="rsvp-form-group">
                <label className="rsvp-label" htmlFor="form-godparents">Nombres de los Padrinos (separados por comas)</label>
                <input
                  id="form-godparents"
                  type="text"
                  className="rsvp-input"
                  placeholder="Ej: María Ruiz Domínguez, Carlos Mendoza Pérez"
                  value={formGodparents}
                  onChange={(e) => setFormGodparents(e.target.value)}
                />
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginTop: '4px' }}>
                  Aparecerán listados bajo la sección &ldquo;Mis Padrinos&rdquo;.
                </span>
              </div>
            </div>

            {/* --- SECCIÓN 3: UBICACIONES --- */}
            <h3 style={{ fontSize: '1.2rem', color: 'var(--gold-dark)', marginBottom: '1.2rem', textTransform: 'uppercase', letterSpacing: '0.05em', borderTop: '1px dashed rgba(212,175,55,0.15)', paddingTop: '1.5rem' }}>
              3. Ubicaciones del Evento
            </h3>

            <fieldset style={{ border: 0, padding: 0, margin: '0 0 1.25rem' }}>
              <legend className="rsvp-label" style={{ marginBottom: '0.65rem' }}>¿Dónde serán la ceremonia y la recepción?</legend>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem 1.5rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-dark)' }}>
                  <input
                    type="radio"
                    name="event-locations"
                    checked={formLocationsAreSame}
                    onChange={() => setFormLocationsAreSame(true)}
                    style={{ accentColor: '#D4AF37', cursor: 'pointer' }}
                  />
                  En el mismo lugar
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-dark)' }}>
                  <input
                    type="radio"
                    name="event-locations"
                    checked={!formLocationsAreSame}
                    onChange={() => setFormLocationsAreSame(false)}
                    style={{ accentColor: '#D4AF37', cursor: 'pointer' }}
                  />
                  En lugares diferentes
                </label>
              </div>
            </fieldset>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(280px, 100%), 1fr))', gap: '2rem', marginBottom: '2.5rem' }}>
              
              {/* Iglesia */}
              <div style={{ background: 'rgba(212,175,55,0.02)', border: '1px solid rgba(212,175,55,0.1)', padding: '1.5rem', borderRadius: '12px' }}>
                <h4 style={{ color: 'var(--gold-dark)', fontSize: '1rem', marginBottom: '1rem' }}><Church size={15} style={{ verticalAlign: '-2px', marginRight: '6px', display: 'inline-block' }} />{formLocationsAreSame ? 'Ceremonia y recepción' : 'Ceremonia / Iglesia'}</h4>
                {formLocationsAreSame && (
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '-0.5rem 0 1rem' }}>
                    Esta ubicación se mostrará una sola vez en la invitación.
                  </p>
                )}
                <div className="rsvp-form-group">
                  <label className="rsvp-label" htmlFor="church-name">{formLocationsAreSame ? 'Nombre del lugar' : 'Nombre del Templo / Iglesia'}</label>
                  <input id="church-name" type="text" className="rsvp-input" placeholder={formLocationsAreSame ? 'Ej: Salón Jardín de las Luces' : 'Ej: Parroquia de San Francisco'} value={formChurchName} onChange={(e) => setFormChurchName(e.target.value)} />
                </div>
                <div className="rsvp-form-group">
                  <label className="rsvp-label" htmlFor="church-time">{formLocationsAreSame ? 'Hora de la ceremonia' : 'Hora específica'}</label>
                  <input id="church-time" type="text" className="rsvp-input" placeholder="Ej: 12:00 PM" value={formChurchTime} onChange={(e) => setFormChurchTime(e.target.value)} />
                </div>
                {formLocationsAreSame && (
                  <div className="rsvp-form-group">
                    <label className="rsvp-label" htmlFor="shared-hall-time">Hora de la recepción (opcional)</label>
                    <input id="shared-hall-time" type="text" className="rsvp-input" placeholder="Ej: 2:00 PM" value={formHallTime} onChange={(e) => setFormHallTime(e.target.value)} />
                  </div>
                )}
                <div className="rsvp-form-group">
                  <label className="rsvp-label" htmlFor="church-address">Dirección completa</label>
                  <input id="church-address" type="text" className="rsvp-input" placeholder="Calle, Número, Colonia, CP" value={formChurchAddress} onChange={(e) => setFormChurchAddress(e.target.value)} />
                </div>
                <div className="rsvp-form-group" style={{ marginBottom: 0 }}>
                  <label className="rsvp-label" htmlFor="church-maps">Enlace de Google Maps / Waze</label>
                  <input 
                    id="church-maps" 
                    type="text" 
                    className="rsvp-input" 
                    placeholder="https://maps.google.com/..." 
                    value={formChurchMapsUrl} 
                    onChange={(e) => setFormChurchMapsUrl(e.target.value)} 
                    onBlur={(e) => setFormChurchMapsUrl(ensureHttp(e.target.value))}
                    style={{ borderColor: formChurchMapsUrl && !isValidUrl(formChurchMapsUrl) ? '#ff4d4d' : 'rgba(212, 175, 55, 0.2)' }}
                  />
                  {formChurchMapsUrl && !isValidUrl(formChurchMapsUrl) && (
                    <span style={{ fontSize: '0.65rem', color: '#ff4d4d', display: 'block', marginTop: '4px' }}>Formato de enlace incorrecto (debe incluir http:// o https://)</span>
                  )}
                </div>
              </div>

              {/* Salón */}
              {!formLocationsAreSame && <div style={{ background: 'rgba(212,175,55,0.02)', border: '1px solid rgba(212,175,55,0.1)', padding: '1.5rem', borderRadius: '12px' }}>
                <h4 style={{ color: 'var(--gold-dark)', fontSize: '1rem', marginBottom: '1rem' }}><Wine size={15} style={{ verticalAlign: '-2px', marginRight: '6px', display: 'inline-block' }} />Recepción / Salón</h4>
                <div className="rsvp-form-group">
                  <label className="rsvp-label" htmlFor="hall-name">Nombre del Salón o Jardín</label>
                  <input id="hall-name" type="text" className="rsvp-input" placeholder="Ej: Jardín de las Luces" value={formHallName} onChange={(e) => setFormHallName(e.target.value)} />
                </div>
                <div className="rsvp-form-group">
                  <label className="rsvp-label" htmlFor="hall-time">Hora específica</label>
                  <input id="hall-time" type="text" className="rsvp-input" placeholder="Ej: 2:00 PM" value={formHallTime} onChange={(e) => setFormHallTime(e.target.value)} />
                </div>
                <div className="rsvp-form-group">
                  <label className="rsvp-label" htmlFor="hall-address">Dirección completa</label>
                  <input id="hall-address" type="text" className="rsvp-input" placeholder="Calle, Número, Colonia, CP" value={formHallAddress} onChange={(e) => setFormHallAddress(e.target.value)} />
                </div>
                <div className="rsvp-form-group" style={{ marginBottom: 0 }}>
                  <label className="rsvp-label" htmlFor="hall-maps">Enlace de Google Maps / Waze</label>
                  <input 
                    id="hall-maps" 
                    type="text" 
                    className="rsvp-input" 
                    placeholder="https://maps.google.com/..." 
                    value={formHallMapsUrl} 
                    onChange={(e) => setFormHallMapsUrl(e.target.value)} 
                    onBlur={(e) => setFormHallMapsUrl(ensureHttp(e.target.value))}
                    style={{ borderColor: formHallMapsUrl && !isValidUrl(formHallMapsUrl) ? '#ff4d4d' : 'rgba(212, 175, 55, 0.2)' }}
                  />
                  {formHallMapsUrl && !isValidUrl(formHallMapsUrl) && (
                    <span style={{ fontSize: '0.65rem', color: '#ff4d4d', display: 'block', marginTop: '4px' }}>Formato de enlace incorrecto (debe incluir http:// o https://)</span>
                  )}
                </div>
              </div>}
            </div>

            {/* --- SECCIÓN 4: REGALOS Y CONFIRMACIÓN --- */}
            <h3 style={{ fontSize: '1.2rem', color: 'var(--gold-dark)', marginBottom: '1.2rem', textTransform: 'uppercase', letterSpacing: '0.05em', borderTop: '1px dashed rgba(212,175,55,0.15)', paddingTop: '1.5rem' }}>
              4. Mesa de Regalos y Plazos
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(280px, 100%), 1fr))', gap: '2rem', marginBottom: '2.5rem' }}>
              {/* Mesa de Regalos */}
              <div style={{ background: 'rgba(212,175,55,0.02)', border: '1px solid rgba(212,175,55,0.1)', padding: '1.5rem', borderRadius: '12px' }}>
                <h4 style={{ color: 'var(--gold-dark)', fontSize: '1rem', marginBottom: '1rem' }}><Gift size={15} style={{ verticalAlign: '-2px', marginRight: '6px', display: 'inline-block' }} />Detalles de Regalos</h4>
                
                <div className="rsvp-form-group" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    id="gift-envelope"
                    type="checkbox"
                    checked={formGiftEnvelope}
                    onChange={(e) => setFormGiftEnvelope(e.target.checked)}
                    style={{ width: '16px', height: '16px', accentColor: '#D4AF37', cursor: 'pointer' }}
                  />
                  <label htmlFor="gift-envelope" style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-dark)', cursor: 'pointer' }}>
                    Habilitar Lluvia de Sobres (efectivo)
                  </label>
                </div>

                <div className="rsvp-form-group" style={{ marginBottom: 0 }}>
                  <label className="rsvp-label" htmlFor="bank-name">Banco</label>
                  <input
                    id="bank-name"
                    type="text"
                    className="rsvp-input"
                    placeholder="BBVA"
                    value={formGiftBankName}
                    onChange={(e) => setFormGiftBankName(e.target.value)}
                  />
                </div>

                <div className="rsvp-form-group" style={{ marginBottom: 0 }}>
                  <label className="rsvp-label" htmlFor="bank-owner">Nombre del titular</label>
                  <input
                    id="bank-owner"
                    type="text"
                    className="rsvp-input"
                    placeholder="María Fernanda López"
                    value={formGiftBankOwner}
                    onChange={(e) => setFormGiftBankOwner(e.target.value)}
                  />
                </div>

                <div className="rsvp-form-group" style={{ marginBottom: 0 }}>
                  <label className="rsvp-label" htmlFor="bank-clabe">CLABE Interbancaria</label>
                  <input
                    id="bank-clabe"
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    maxLength={23}
                    className="rsvp-input"
                    placeholder="000 000 000 000 000 000"
                    value={formGiftBankClabe}
                    onChange={(e) => setFormGiftBankClabe(formatClabe(e.target.value))}
                  />
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginTop: '4px' }}>
                    Captura los 18 dígitos de tu CLABE.
                  </span>
                </div>

                {/* Catálogo de Mesa de Regalo (México) */}
                <div style={{ marginTop: '1.5rem', borderTop: '1px dashed rgba(212,175,55,0.15)', paddingTop: '1.5rem' }}>
                  <h5 style={{ color: 'var(--gold-dark)', fontSize: '0.9rem', marginBottom: '0.8rem', fontWeight: 600 }}><ShoppingCart size={14} style={{ verticalAlign: '-2px', marginRight: '6px', display: 'inline-block' }} />Catálogo de Mesa de Regalo (Liverpool, Sears, Amazon, etc.)</h5>
                  
                  {/* Registry items list */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '1rem' }}>
                    {giftRegistries.length === 0 ? (
                      <p style={{ fontStyle: 'italic', color: 'var(--text-muted)', fontSize: '0.8rem' }}>No has agregado una mesa de regalo.</p>
                    ) : (
                      giftRegistries.map((reg, idx) => (
                        <div key={idx} className="guest-item-card" style={{ padding: '0.5rem 0.8rem', marginBottom: 0 }}>
                          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexGrow: 1 }}>
                            <span style={{ fontSize: '0.65rem', padding: '0.2rem 0.5rem', background: reg.storeName === 'Liverpool' ? '#e01e5a' : reg.storeName === 'Sears' ? '#0055a4' : reg.storeName === 'Amazon México' ? '#232f3e' : reg.storeName === 'El Palacio de Hierro' ? '#000000' : 'var(--gold-dark)', color: '#FFF', borderRadius: '4px', fontWeight: 'bold' }}>
                              {reg.storeName}
                            </span>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-dark)' }}>
                              {reg.registryNumber ? `#${reg.registryNumber}` : ''}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setGiftRegistries(giftRegistries.filter((_, i) => i !== idx))}
                            className="btn-remove-guest"
                            title="Eliminar"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Add registry builder */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', background: 'rgba(212,175,55,0.02)', padding: '0.8rem', borderRadius: '8px', border: '1px solid rgba(212,175,55,0.05)' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(140px, 100%), 1fr))', gap: '0.5rem' }}>
                      <select
                        className="guest-builder-select"
                        value={tempStoreName}
                        onChange={(e) => setTempStoreName(e.target.value)}
                        style={{ padding: '0.6rem', fontSize: '0.8rem', minHeight: 'auto' }}
                      >
                        <option value="Liverpool">Liverpool</option>
                        <option value="Sears">Sears</option>
                        <option value="Amazon México">Amazon México</option>
                        <option value="El Palacio de Hierro">El Palacio de Hierro</option>
                        <option value="Mercado Libre">Mercado Libre</option>
                        <option value="Otro">Otro / Personalizado</option>
                      </select>
                      
                      <input
                        type="text"
                        className="rsvp-input"
                        placeholder="Cód. Evento (ej: 508123)"
                        value={tempRegistryNumber}
                        onChange={(e) => setTempRegistryNumber(e.target.value)}
                        style={{ padding: '0.6rem', fontSize: '0.8rem' }}
                      />
                    </div>
                    
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <input
                        type="text"
                        className="rsvp-input"
                        placeholder="Enlace URL (ej: https://...)"
                        value={tempRegistryUrl}
                        onChange={(e) => setTempRegistryUrl(e.target.value)}
                        onBlur={(e) => setTempRegistryUrl(ensureHttp(e.target.value))}
                        style={{ 
                          padding: '0.6rem', 
                          fontSize: '0.8rem', 
                          flexGrow: 1,
                          borderColor: tempRegistryUrl && !isValidUrl(tempRegistryUrl) ? '#ff4d4d' : 'rgba(212, 175, 55, 0.2)'
                        }}
                      />
                      
                      <button
                        type="button"
                        onClick={() => {
                          if (!tempStoreName) return;
                          setGiftRegistries([
                            ...giftRegistries,
                            { storeName: tempStoreName, registryNumber: tempRegistryNumber.trim(), url: tempRegistryUrl.trim() }
                          ]);
                          setTempRegistryNumber('');
                          setTempRegistryUrl('');
                        }}
                        className="btn-outline"
                        style={{ padding: '0.5rem 0.8rem', fontSize: '0.8rem', borderRadius: '6px', height: 'auto', minWidth: 'auto' }}
                        disabled={tempRegistryUrl !== '' && !isValidUrl(tempRegistryUrl)}
                      >
                        <Plus size={14} />
                        Agregar
                      </button>
                    </div>
                    {tempRegistryUrl && !isValidUrl(tempRegistryUrl) && (
                      <span style={{ fontSize: '0.65rem', color: '#ff4d4d', display: 'block' }}>Formato de enlace incorrecto (debe incluir http:// o https://)</span>
                    )}
                  </div>

                </div>

              </div>

              {/* Plazo de Confirmación */}
              <div style={{ background: 'rgba(212,175,55,0.02)', border: '1px solid rgba(212,175,55,0.1)', padding: '1.5rem', borderRadius: '12px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <h4 style={{ color: 'var(--gold-dark)', fontSize: '1rem', marginBottom: '1rem' }}><Clock size={15} style={{ verticalAlign: '-2px', marginRight: '6px', display: 'inline-block' }} />Límite de Confirmación</h4>
                
                <div className="rsvp-form-group" style={{ marginBottom: 0 }}>
                  <label className="rsvp-label" htmlFor="form-deadline">Fecha límite para Confirmar Asistencia</label>
                  <DateField
                    id="form-deadline"
                    value={formRsvpDeadline}
                    onChange={setFormRsvpDeadline}
                  />
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginTop: '6px' }}>
                    Esta fecha se mostrará en el formulario de confirmación público para apresurar a los invitados.
                  </span>
                </div>
              </div>
            </div>

            {/* --- SECCIÓN 5: VESTIMENTA E ITINERARIO --- */}
            <h3 style={{ fontSize: '1.2rem', color: 'var(--gold-dark)', marginBottom: '1.2rem', textTransform: 'uppercase', letterSpacing: '0.05em', borderTop: '1px dashed rgba(212,175,55,0.15)', paddingTop: '1.5rem' }}>
              5. Código de Vestimenta e Itinerario
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
              <div className="rsvp-form-group">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: formDressCodeEnabled ? '0.7rem' : 0 }}>
                  <input
                    id="dress-code-enabled"
                    type="checkbox"
                    checked={formDressCodeEnabled}
                    onChange={(e) => setFormDressCodeEnabled(e.target.checked)}
                    style={{ width: '16px', height: '16px', accentColor: '#D4AF37', cursor: 'pointer' }}
                  />
                  <label htmlFor="dress-code-enabled" className="rsvp-label" style={{ marginBottom: 0, cursor: 'pointer' }}>
                    Mostrar código de vestimenta
                  </label>
                </div>
                {formDressCodeEnabled && (
                  <input
                    id="form-dresscode"
                    type="text"
                    className="rsvp-input"
                    placeholder="Ej: Formal (No blanco para invitados) o Semiformal"
                    value={formDressCode}
                    onChange={(e) => setFormDressCode(e.target.value)}
                  />
                )}
              </div>

              {/* Itinerary Builder */}
              <div className="rsvp-form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="rsvp-label">Itinerario / Cronograma (UX interactiva)</label>
                
                {/* List of steps */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.2rem' }}>
                  {itineraryItems.length === 0 ? (
                    <p style={{ fontStyle: 'italic', color: 'var(--text-muted)', fontSize: '0.85rem' }}>No has agregado ningún paso al itinerario.</p>
                  ) : (
                    itineraryItems.map((item, idx) => (
                      <div key={idx} className="guest-item-card" style={{ padding: '0.6rem 1rem', marginBottom: 0 }}>
                        <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flexGrow: 1 }}>
                          <span style={{ fontWeight: 600, color: 'var(--gold-dark)', minWidth: '85px' }}>{item.time}</span>
                          <span style={{ color: 'var(--text-dark)' }}>{item.activity}</span>
                        </div>
                        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                          <button
                            type="button"
                            onClick={() => {
                              if (idx === 0) return;
                              const updated = [...itineraryItems];
                              const temp = updated[idx];
                              updated[idx] = updated[idx - 1];
                              updated[idx - 1] = temp;
                              setItineraryItems(updated);
                            }}
                            className="btn-outline"
                            style={{ padding: '0.3rem 0.6rem', fontSize: '0.7rem', borderRadius: '4px', height: 'auto', minWidth: 'auto', color: idx === 0 ? '#ccc' : 'var(--gold-dark)', borderColor: idx === 0 ? '#eee' : 'var(--gold-medium)', cursor: idx === 0 ? 'not-allowed' : 'pointer' }}
                            disabled={idx === 0}
                            title="Subir"
                          >
                            ▲
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (idx === itineraryItems.length - 1) return;
                              const updated = [...itineraryItems];
                              const temp = updated[idx];
                              updated[idx] = updated[idx + 1];
                              updated[idx + 1] = temp;
                              setItineraryItems(updated);
                            }}
                            className="btn-outline"
                            style={{ padding: '0.3rem 0.6rem', fontSize: '0.7rem', borderRadius: '4px', height: 'auto', minWidth: 'auto', color: idx === itineraryItems.length - 1 ? '#ccc' : 'var(--gold-dark)', borderColor: idx === itineraryItems.length - 1 ? '#eee' : 'var(--gold-medium)', cursor: idx === itineraryItems.length - 1 ? 'not-allowed' : 'pointer' }}
                            disabled={idx === itineraryItems.length - 1}
                            title="Bajar"
                          >
                            ▼
                          </button>
                          <button
                            type="button"
                            onClick={() => setItineraryItems(itineraryItems.filter((_, i) => i !== idx))}
                            className="btn-remove-guest"
                            title="Eliminar paso"
                            style={{ marginLeft: '5px' }}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Form to add a new hito */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(200px, 100%), 1fr))', gap: '0.8rem', alignItems: 'center' }}>
                  <input
                    type="text"
                    className="rsvp-input"
                    placeholder="Hora (ej: 12:00 PM)"
                    value={newItineraryTime}
                    onChange={(e) => setNewItineraryTime(e.target.value)}
                  />
                  <input
                    type="text"
                    className="rsvp-input"
                    placeholder="Actividad (ej: Ceremonia Religiosa)"
                    value={newItineraryActivity}
                    onChange={(e) => setNewItineraryActivity(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!newItineraryTime.trim() || !newItineraryActivity.trim()) return;
                      setItineraryItems([
                        ...itineraryItems,
                        { time: newItineraryTime.trim(), activity: newItineraryActivity.trim() }
                      ]);
                      setNewItineraryTime('');
                      setNewItineraryActivity('');
                    }}
                    className="btn-outline"
                    style={{ padding: '0.9rem 1.2rem', borderRadius: '8px' }}
                  >
                    <Plus size={16} />
                    Agregar Paso
                  </button>
                </div>
              </div>
            </div>

            {/* --- SECCIÓN 6: GALERÍA DE FOTOS --- */}
            <h3 style={{ fontSize: '1.2rem', color: 'var(--gold-dark)', marginBottom: '1.2rem', textTransform: 'uppercase', letterSpacing: '0.05em', borderTop: '1px dashed rgba(212,175,55,0.15)', paddingTop: '1.5rem' }}>
              6. Galería de Fotos (Se mezclan en scroll)
            </h3>

            <div className="rsvp-form-group" style={{ marginBottom: '2.5rem' }}>
              <label className="rsvp-label">Selecciona o sube fotos para tu evento</label>
              
              {/* File upload input */}
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1.5rem' }}>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={async (e) => {
                    if (!e.target.files) return;
                    setPhotoUploading(true);
                    try {
                      const newUrls = await uploadFiles(Array.from(e.target.files));
                      setUploadedPhotos([...uploadedPhotos, ...newUrls]);
                    } catch (err) {
                      console.error(err);
                      alert('No fue posible subir una o más fotos del evento.');
                    } finally {
                      setPhotoUploading(false);
                      e.target.value = '';
                    }
                  }}
                  style={{ display: 'none' }}
                  id="photo-file-input"
                />
                <label
                  htmlFor="photo-file-input"
                  className="btn-outline"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '0.8rem 1.5rem' }}
                >
                  <Camera size={15} style={{ verticalAlign: '-2px', marginRight: '6px', display: 'inline-block' }} />{photoUploading ? 'Subiendo imágenes...' : 'Subir Fotos del Evento'}
                </label>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Sube imágenes (.jpg, .png) que se mostrarán flotando y animadas en la galería al hacer scroll.
                </span>
              </div>

              {/* Uploaded thumbnails grid */}
              {uploadedPhotos.length === 0 ? (
                <p style={{ fontStyle: 'italic', color: 'var(--text-muted)', fontSize: '0.85rem' }}>No se han subido fotos para este evento aún.</p>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '1rem' }}>
                  {uploadedPhotos.map((url, idx) => (
                    <div key={idx} style={{ position: 'relative', width: '120px', height: '120px', borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(212,175,55,0.2)', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt={`Foto ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <button
                        type="button"
                        onClick={() => setUploadedPhotos((photos) => photos.filter((_, photoIndex) => photoIndex !== idx))}
                        aria-label={`Eliminar foto ${idx + 1}`}
                        title="Eliminar foto"
                        style={{
                          position: 'absolute',
                          top: '6px',
                          right: '6px',
                          width: '28px',
                          height: '28px',
                          border: 0,
                          borderRadius: '50%',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          color: '#fff',
                          background: 'rgba(178, 34, 34, 0.92)',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.24)',
                        }}
                      >
                        <Trash2 size={14} aria-hidden="true" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <h3 style={{ fontSize: '1.2rem', color: 'var(--gold-dark)', marginBottom: '1.2rem', textTransform: 'uppercase', letterSpacing: '0.05em', borderTop: '1px dashed rgba(212,175,55,0.15)', paddingTop: '1.5rem' }}>
              7. Fondos Parametrizados
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '2.5rem' }}>
              {[
                {
                  key: 'hero',
                  title: 'Hero principal',
                  description: 'Fondo de la portada inicial del evento.',
                  value: formHeroBackgroundUrl,
                  setValue: setFormHeroBackgroundUrl,
                },
                {
                  key: 'details',
                  title: 'Detalles del evento',
                  description: 'Fondo para la sección de fecha, ubicación e itinerario.',
                  value: formDetailsBackgroundUrl,
                  setValue: setFormDetailsBackgroundUrl,
                },
                {
                  key: 'rsvp',
                  title: 'Confirmación RSVP',
                  description: 'Fondo para la sección donde la familia confirma asistencia.',
                  value: formRsvpBackgroundUrl,
                  setValue: setFormRsvpBackgroundUrl,
                },
              ].map((backgroundField) => (
                <div key={backgroundField.key} style={{ background: 'rgba(212,175,55,0.02)', border: '1px solid rgba(212,175,55,0.1)', padding: '1rem', borderRadius: '12px' }}>
                  <div style={{ marginBottom: '0.75rem' }}>
                    <div style={{ fontWeight: 700, color: 'var(--gold-dark)', marginBottom: '0.3rem' }}>{backgroundField.title}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>{backgroundField.description}</div>
                  </div>

                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      if (!e.target.files?.length) return;
                      setBackgroundUploadingTarget(backgroundField.key as 'hero' | 'details' | 'rsvp');
                      try {
                        const urls = await uploadFiles(Array.from(e.target.files));
                        if (urls[0]) {
                          backgroundField.setValue(urls[0]);
                        }
                      } catch (err) {
                        console.error(err);
                        alert('No fue posible subir la foto de fondo.');
                      } finally {
                        setBackgroundUploadingTarget(null);
                        e.target.value = '';
                      }
                    }}
                    style={{ display: 'none' }}
                    id={`background-upload-${backgroundField.key}`}
                  />

                  <label
                    htmlFor={`background-upload-${backgroundField.key}`}
                    className="btn-outline"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '0.7rem 1rem', marginBottom: '0.9rem' }}
                  >
                    {backgroundUploadingTarget === backgroundField.key ? 'Subiendo...' : 'Subir fondo'}
                  </label>

                  {backgroundField.value ? (
                    <div>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={backgroundField.value} alt={backgroundField.title} style={{ width: '100%', aspectRatio: '4 / 3', objectFit: 'cover', borderRadius: '10px', border: '1px solid rgba(212,175,55,0.15)', marginBottom: '0.75rem' }} />
                      <button
                        type="button"
                        onClick={() => backgroundField.setValue('')}
                        className="btn-outline"
                        style={{ padding: '0.55rem 0.8rem', width: '100%' }}
                      >
                        Quitar fondo
                      </button>
                    </div>
                  ) : (
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                      No hay imagen asignada.
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Error Message */}
            {formError && (
              <p style={{ color: '#B22222', fontSize: '0.9rem', marginBottom: '1.5rem', fontWeight: 500 }}>
                {formError}
              </p>
            )}

            {/* Save Controls */}
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', borderTop: '1px solid rgba(212,175,55,0.15)', paddingTop: '1.5rem' }}>
              <button
                type="button"
                onClick={() => router.push('/admin')}
                className="btn-outline"
                disabled={formLoading}
              >
                Cancelar
              </button>

              <button
                type="submit"
                className="btn-gold"
                disabled={formLoading}
              >
                <Save size={16} />
                {formLoading ? 'Guardando...' : 'Guardar Configuración de Evento'}
              </button>
            </div>

          </form>
        </section>

    </div>
  );
}
