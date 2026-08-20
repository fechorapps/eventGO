'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Trash2, Plus, Save, Clock, Church, Wine, ShoppingCart, Camera, Gift, ChevronLeft, ChevronRight, Check, Loader2 } from 'lucide-react';
import DateField from '@/components/DateField';
import ThemePicker from '@/components/admin/ThemePicker';
import { DEFAULT_THEME_ID } from '@/lib/themes';
import type { Event, TempItineraryInput, TempRegistryInput } from '@/types/admin';

type EventFormProps = { mode: 'create' } | { mode: 'edit'; eventId: number };

const STEPS = [
  'Datos Principales',
  'Apariencia',
  'Familiares',
  'Ubicaciones del Evento',
  'Mesa de Regalos y Plazos',
  'Vestimenta e Itinerario',
  'Galería de Fotos',
  'Fondos Parametrizados',
];

export default function EventForm(props: EventFormProps) {
  const router = useRouter();
  const isEdit = props.mode === 'edit';
  // Known immediately from the URL in edit mode — no need to wait for the
  // fetch below to resolve. Drives the slug-lock and heading text exactly
  // like the old eventFormId state did.
  const eventFormId = props.mode === 'edit' ? props.eventId : null;

  const [initLoading, setInitLoading] = useState(isEdit);
  const [notFound, setNotFound] = useState(false);
  const [step, setStep] = useState(0);
  const [slugStatus, setSlugStatus] = useState<'idle' | 'checking' | 'ready'>('idle');

  const [formSlug, setFormSlug] = useState('');
  const [formTitle, setFormTitle] = useState('Bautizo');
  const [formCelebrantName, setFormCelebrantName] = useState('');
  const [formSubtitle, setFormSubtitle] = useState('Nuestra Promesa de Amor');
  const [formQuote, setFormQuote] = useState('');
  const [formTheme, setFormTheme] = useState(DEFAULT_THEME_ID);
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

  const slugify = (value: string): string =>
    value
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '') // strip accents
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

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
    setFormTheme(DEFAULT_THEME_ID);

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
    setFormTheme(event.theme || DEFAULT_THEME_ID);
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

  // Create mode only — edit mode's slug is already set (from the fetched
  // event) and stays immutable, matching the field's old disabled state.
  // Derives a slug from the title (falling back to the celebrant's name),
  // then silently walks -2/-3/... until check-slug reports it's free, so
  // the organizer never has to think about the URL identifier at all.
  useEffect(() => {
    if (eventFormId) return;

    const base = slugify(formTitle || formCelebrantName);
    if (!base) {
      setFormSlug('');
      setSlugStatus('idle');
      return;
    }

    let cancelled = false;
    setSlugStatus('checking');

    const timer = setTimeout(async () => {
      let candidate = base;
      for (let suffix = 2; suffix <= 50 && !cancelled; suffix++) {
        try {
          const res = await fetch(`/api/admin/events/check-slug?slug=${encodeURIComponent(candidate)}`);
          if (res.status === 401) {
            router.refresh();
            return;
          }
          const data = await res.json();
          if (data.available) break;
        } catch (e) {
          console.error(e);
          break; // network hiccup — submit-time uniqueness check is the safety net
        }
        candidate = `${base}-${suffix}`;
      }
      if (!cancelled) {
        setFormSlug(candidate);
        setSlugStatus('ready');
      }
    }, 500);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formTitle, formCelebrantName, eventFormId]);

  // Per-step gate for "Siguiente" — a subset of handleSaveEvent's full
  // validation, scoped to what that particular step can actually get
  // wrong. handleSaveEvent's own checks stay the authoritative safety
  // net at submit time (unchanged below), so this only needs to catch
  // the common "forgot a required field" case early.
  function validateStep(n: number): string | null {
    switch (n) {
      case 0:
        if (!formCelebrantName.trim() || !formTitle.trim() || !formSlug.trim() || !formDate) {
          return 'Completa el celebrante, título, identificador URL y fecha del evento.';
        }
        if (!/^[a-z0-9-]+$/.test(formSlug.trim().toLowerCase())) {
          return 'El identificador URL (slug) solo puede contener letras minúsculas, números y guiones (ej. bautizo-gael).';
        }
        return null;
      case 3:
        if (formChurchMapsUrl && !isValidUrl(formChurchMapsUrl)) {
          return 'Verifica el enlace de la ubicación de la Ceremonia (debe ser una URL válida, ej: https://...).';
        }
        if (!formLocationsAreSame && formHallMapsUrl && !isValidUrl(formHallMapsUrl)) {
          return 'Verifica el enlace de la ubicación de la Recepción (debe ser una URL válida, ej: https://...).';
        }
        return null;
      case 4: {
        const clabe = formGiftBankClabe.replace(/\D/g, '');
        if (clabe && clabe.length !== 18) {
          return 'La CLABE interbancaria debe tener 18 dígitos.';
        }
        return null;
      }
      case 7:
        if (formHeroBackgroundUrl && !isValidUrl(formHeroBackgroundUrl)) {
          return 'Verifica la foto de fondo principal.';
        }
        if (formDetailsBackgroundUrl && !isValidUrl(formDetailsBackgroundUrl)) {
          return 'Verifica la foto de fondo para detalles.';
        }
        if (formRsvpBackgroundUrl && !isValidUrl(formRsvpBackgroundUrl)) {
          return 'Verifica la foto de fondo para RSVP.';
        }
        return null;
      default:
        return null;
    }
  }

  const goNext = () => {
    const error = validateStep(step);
    if (error) {
      setFormError(error);
      return;
    }
    setFormError('');
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const goBack = () => {
    setFormError('');
    setStep((s) => Math.max(s - 1, 0));
  };

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
      theme: formTheme,
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
        <h2 style={{ color: '#0f172a', fontFamily: 'var(--font-sans)', letterSpacing: 'normal' }}>Evento no encontrado</h2>
        <Link href="/admin" className="wiz-btn-outline" style={{ marginTop: '1rem', display: 'inline-flex' }}>Volver a Eventos</Link>
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
      <div className="wiz-head">
        <div className="wiz-eyebrow">{eventFormId ? 'Configuración de Evento' : 'Registrar Nuevo Evento'}</div>
        <div className="wiz-step-label">Paso {step + 1} de {STEPS.length}</div>
        <h2 className="wiz-title">{STEPS[step]}</h2>
        <div className="wiz-progress">
          {STEPS.map((label, i) => (
            <div key={label} className={`wiz-seg ${i <= step ? 'filled' : ''}`} />
          ))}
        </div>
      </div>

      <form onSubmit={handleSaveEvent}>

        {/* --- PASO 1: DATOS PRINCIPALES --- */}
        {step === 0 && (
          <div className="wiz-card">
            <div className="wiz-field-grid">
              <div className="wiz-field-group">
                <label className="wiz-field-label" htmlFor="form-celebrant">Nombre del Celebrante *</label>
                <input
                  id="form-celebrant"
                  type="text"
                  className="wiz-field-input"
                  placeholder="Ej: Mateo Alexander"
                  value={formCelebrantName}
                  onChange={(e) => setFormCelebrantName(e.target.value)}
                  required
                />
              </div>

              <div className="wiz-field-group">
                <label className="wiz-field-label" htmlFor="form-title">Título del Evento *</label>
                <input
                  id="form-title"
                  type="text"
                  className="wiz-field-input"
                  placeholder="Ej: Mi Bautizo, Boda, XV Años"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  required
                />
              </div>

              <div className="wiz-field-group">
                <label className="wiz-field-label">Identificador URL</label>
                {eventFormId ? (
                  <span className="wiz-field-hint">
                    Enlace público: <strong>/e/{formSlug}</strong> (no se puede modificar)
                  </span>
                ) : slugStatus === 'checking' ? (
                  <span className="wiz-slug-status">
                    <Loader2 size={12} className="wiz-spin" />
                    Generando identificador…
                  </span>
                ) : formSlug ? (
                  <span className="wiz-slug-status ready">
                    Enlace generado automáticamente: <strong>/e/{formSlug}</strong>
                    <span className="wiz-slug-available">
                      <Check size={11} />
                      Disponible
                    </span>
                  </span>
                ) : (
                  <span className="wiz-field-hint">Se generará a partir del título del evento.</span>
                )}
              </div>

              <div className="wiz-field-group full">
                <label className="wiz-field-label" htmlFor="form-date">Fecha y Hora del Evento *</label>
                <DateField
                  id="form-date"
                  withTime
                  value={formDate}
                  onChange={setFormDate}
                  required
                  alwaysOpen
                  accentColor="#0f172a"
                  popoverStyle={{
                    border: '1px solid #e2e8f0',
                    background: '#ffffff',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)',
                    maxWidth: '360px',
                  }}
                />
              </div>

              <div className="wiz-field-group">
                <label className="wiz-field-label" htmlFor="form-subtitle">Subtítulo o Lema Hero</label>
                <input
                  id="form-subtitle"
                  type="text"
                  className="wiz-field-input"
                  placeholder="Ej: Nuestra Promesa de Amor o Bienvenidos"
                  value={formSubtitle}
                  onChange={(e) => setFormSubtitle(e.target.value)}
                />
              </div>

              <div className="wiz-field-group">
                <label className="wiz-field-label" htmlFor="form-rsvp-phone">Teléfono de WhatsApp para Confirmaciones</label>
                <div className="wiz-phone-wrap">
                  <span className="wiz-phone-chip">MX</span>
                  <input
                    id="form-rsvp-phone"
                    type="tel"
                    inputMode="tel"
                    className="wiz-field-input wiz-phone-input"
                    placeholder="Ej: +52 1 (55) 1234-5678"
                    value={formRsvpPhone}
                    onChange={(e) => setFormRsvpPhone(formatWhatsAppPhone(e.target.value))}
                  />
                </div>
                <span className="wiz-field-hint">
                  Número de WhatsApp al cual los invitados enviarán su comprobante automático.
                </span>
              </div>
            </div>

            <div className="wiz-field-group" style={{ marginBottom: 0 }}>
              <label className="wiz-field-label" htmlFor="form-quote">Frase de Bienvenida / Cita</label>
              <textarea
                id="form-quote"
                className="wiz-field-textarea"
                placeholder="Escribe una linda frase que se mostrará en la cabecera de la invitación..."
                value={formQuote}
                onChange={(e) => setFormQuote(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* --- PASO 2: APARIENCIA --- */}
        {step === 1 && (
          <div className="wiz-card">
            <p className="wiz-card-hint">
              Elige la paleta de la invitación pública. No afecta este panel de administración.
            </p>
            <ThemePicker value={formTheme} onChange={setFormTheme} />
          </div>
        )}

        {/* --- PASO 3: FAMILIARES --- */}
        {step === 2 && (
          <div className="wiz-card">
            <div className="wiz-field-grid" style={{ marginBottom: 0 }}>
              <div className="wiz-field-group" style={{ marginBottom: 0 }}>
                <label className="wiz-field-label" htmlFor="form-parents">Nombres de los Padres (separados por comas)</label>
                <input
                  id="form-parents"
                  type="text"
                  className="wiz-field-input"
                  placeholder="Ej: Sofía Mendoza Pérez, Alejandro Ruiz Domínguez"
                  value={formParents}
                  onChange={(e) => setFormParents(e.target.value)}
                />
                <span className="wiz-field-hint">
                  Aparecerán listados bajo la sección &ldquo;Mis Padres&rdquo;.
                </span>
              </div>

              <div className="wiz-field-group" style={{ marginBottom: 0 }}>
                <label className="wiz-field-label" htmlFor="form-godparents">Nombres de los Padrinos (separados por comas)</label>
                <input
                  id="form-godparents"
                  type="text"
                  className="wiz-field-input"
                  placeholder="Ej: María Ruiz Domínguez, Carlos Mendoza Pérez"
                  value={formGodparents}
                  onChange={(e) => setFormGodparents(e.target.value)}
                />
                <span className="wiz-field-hint">
                  Aparecerán listados bajo la sección &ldquo;Mis Padrinos&rdquo;.
                </span>
              </div>
            </div>
          </div>
        )}

        {/* --- PASO 4: UBICACIONES --- */}
        {step === 3 && (
          <div className="wiz-card">
            <fieldset style={{ border: 0, padding: 0, margin: '0 0 1.25rem' }}>
              <legend className="wiz-field-label" style={{ marginBottom: '0.65rem' }}>¿Dónde serán la ceremonia y la recepción?</legend>
              <div className="wiz-radio-row">
                <label className="wiz-radio-label">
                  <input
                    type="radio"
                    name="event-locations"
                    checked={formLocationsAreSame}
                    onChange={() => setFormLocationsAreSame(true)}
                    style={{ accentColor: '#0f172a', cursor: 'pointer' }}
                  />
                  En el mismo lugar
                </label>
                <label className="wiz-radio-label">
                  <input
                    type="radio"
                    name="event-locations"
                    checked={!formLocationsAreSame}
                    onChange={() => setFormLocationsAreSame(false)}
                    style={{ accentColor: '#0f172a', cursor: 'pointer' }}
                  />
                  En lugares diferentes
                </label>
              </div>
            </fieldset>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(280px, 100%), 1fr))', gap: '2rem' }}>

              {/* Iglesia */}
              <div className="wiz-subcard">
                <h4 className="wiz-subcard-title"><Church size={15} />{formLocationsAreSame ? 'Ceremonia y recepción' : 'Ceremonia / Iglesia'}</h4>
                {formLocationsAreSame && (
                  <p className="wiz-subcard-hint">
                    Esta ubicación se mostrará una sola vez en la invitación.
                  </p>
                )}
                <div className="wiz-field-group">
                  <label className="wiz-field-label" htmlFor="church-name">{formLocationsAreSame ? 'Nombre del lugar' : 'Nombre del Templo / Iglesia'}</label>
                  <input id="church-name" type="text" className="wiz-field-input" placeholder={formLocationsAreSame ? 'Ej: Salón Jardín de las Luces' : 'Ej: Parroquia de San Francisco'} value={formChurchName} onChange={(e) => setFormChurchName(e.target.value)} />
                </div>
                <div className="wiz-field-group">
                  <label className="wiz-field-label" htmlFor="church-time">{formLocationsAreSame ? 'Hora de la ceremonia' : 'Hora específica'}</label>
                  <input id="church-time" type="text" className="wiz-field-input" placeholder="Ej: 12:00 PM" value={formChurchTime} onChange={(e) => setFormChurchTime(e.target.value)} />
                </div>
                {formLocationsAreSame && (
                  <div className="wiz-field-group">
                    <label className="wiz-field-label" htmlFor="shared-hall-time">Hora de la recepción (opcional)</label>
                    <input id="shared-hall-time" type="text" className="wiz-field-input" placeholder="Ej: 2:00 PM" value={formHallTime} onChange={(e) => setFormHallTime(e.target.value)} />
                  </div>
                )}
                <div className="wiz-field-group">
                  <label className="wiz-field-label" htmlFor="church-address">Dirección completa</label>
                  <input id="church-address" type="text" className="wiz-field-input" placeholder="Calle, Número, Colonia, CP" value={formChurchAddress} onChange={(e) => setFormChurchAddress(e.target.value)} />
                </div>
                <div className="wiz-field-group" style={{ marginBottom: 0 }}>
                  <label className="wiz-field-label" htmlFor="church-maps">Enlace de Google Maps / Waze</label>
                  <input
                    id="church-maps"
                    type="text"
                    className={`wiz-field-input ${formChurchMapsUrl && !isValidUrl(formChurchMapsUrl) ? 'error' : ''}`}
                    placeholder="https://maps.google.com/..."
                    value={formChurchMapsUrl}
                    onChange={(e) => setFormChurchMapsUrl(e.target.value)}
                    onBlur={(e) => setFormChurchMapsUrl(ensureHttp(e.target.value))}
                  />
                  {formChurchMapsUrl && !isValidUrl(formChurchMapsUrl) && (
                    <span className="wiz-field-error-text">Formato de enlace incorrecto (debe incluir http:// o https://)</span>
                  )}
                </div>
              </div>

              {/* Salón */}
              {!formLocationsAreSame && <div className="wiz-subcard">
                <h4 className="wiz-subcard-title"><Wine size={15} />Recepción / Salón</h4>
                <div className="wiz-field-group">
                  <label className="wiz-field-label" htmlFor="hall-name">Nombre del Salón o Jardín</label>
                  <input id="hall-name" type="text" className="wiz-field-input" placeholder="Ej: Jardín de las Luces" value={formHallName} onChange={(e) => setFormHallName(e.target.value)} />
                </div>
                <div className="wiz-field-group">
                  <label className="wiz-field-label" htmlFor="hall-time">Hora específica</label>
                  <input id="hall-time" type="text" className="wiz-field-input" placeholder="Ej: 2:00 PM" value={formHallTime} onChange={(e) => setFormHallTime(e.target.value)} />
                </div>
                <div className="wiz-field-group">
                  <label className="wiz-field-label" htmlFor="hall-address">Dirección completa</label>
                  <input id="hall-address" type="text" className="wiz-field-input" placeholder="Calle, Número, Colonia, CP" value={formHallAddress} onChange={(e) => setFormHallAddress(e.target.value)} />
                </div>
                <div className="wiz-field-group" style={{ marginBottom: 0 }}>
                  <label className="wiz-field-label" htmlFor="hall-maps">Enlace de Google Maps / Waze</label>
                  <input
                    id="hall-maps"
                    type="text"
                    className={`wiz-field-input ${formHallMapsUrl && !isValidUrl(formHallMapsUrl) ? 'error' : ''}`}
                    placeholder="https://maps.google.com/..."
                    value={formHallMapsUrl}
                    onChange={(e) => setFormHallMapsUrl(e.target.value)}
                    onBlur={(e) => setFormHallMapsUrl(ensureHttp(e.target.value))}
                  />
                  {formHallMapsUrl && !isValidUrl(formHallMapsUrl) && (
                    <span className="wiz-field-error-text">Formato de enlace incorrecto (debe incluir http:// o https://)</span>
                  )}
                </div>
              </div>}
            </div>
          </div>
        )}

        {/* --- PASO 5: MESA DE REGALOS Y PLAZOS --- */}
        {step === 4 && (
          <div className="wiz-card">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(280px, 100%), 1fr))', gap: '2rem' }}>
              {/* Mesa de Regalos */}
              <div className="wiz-subcard">
                <h4 className="wiz-subcard-title"><Gift size={15} />Detalles de Regalos</h4>

                <div className="wiz-checkbox-row" style={{ marginBottom: '1.25rem' }}>
                  <input
                    id="gift-envelope"
                    type="checkbox"
                    checked={formGiftEnvelope}
                    onChange={(e) => setFormGiftEnvelope(e.target.checked)}
                    style={{ width: '16px', height: '16px', accentColor: '#0f172a', cursor: 'pointer' }}
                  />
                  <label htmlFor="gift-envelope" style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0f172a', cursor: 'pointer' }}>
                    Habilitar Lluvia de Sobres (efectivo)
                  </label>
                </div>

                <div className="wiz-field-group">
                  <label className="wiz-field-label" htmlFor="bank-name">Banco</label>
                  <input
                    id="bank-name"
                    type="text"
                    className="wiz-field-input"
                    placeholder="BBVA"
                    value={formGiftBankName}
                    onChange={(e) => setFormGiftBankName(e.target.value)}
                  />
                </div>

                <div className="wiz-field-group">
                  <label className="wiz-field-label" htmlFor="bank-owner">Nombre del titular</label>
                  <input
                    id="bank-owner"
                    type="text"
                    className="wiz-field-input"
                    placeholder="María Fernanda López"
                    value={formGiftBankOwner}
                    onChange={(e) => setFormGiftBankOwner(e.target.value)}
                  />
                </div>

                <div className="wiz-field-group">
                  <label className="wiz-field-label" htmlFor="bank-clabe">CLABE Interbancaria</label>
                  <input
                    id="bank-clabe"
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    maxLength={23}
                    className="wiz-field-input"
                    placeholder="000 000 000 000 000 000"
                    value={formGiftBankClabe}
                    onChange={(e) => setFormGiftBankClabe(formatClabe(e.target.value))}
                  />
                  <span className="wiz-field-hint">
                    Captura los 18 dígitos de tu CLABE.
                  </span>
                </div>

                {/* Catálogo de Mesa de Regalo (México) */}
                <div style={{ marginTop: '1.5rem', borderTop: '1px solid #e2e8f0', paddingTop: '1.5rem' }}>
                  <h5 style={{ color: '#0f172a', fontSize: '0.9rem', marginBottom: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}><ShoppingCart size={14} />Catálogo de Mesa de Regalo (Liverpool, Sears, Amazon, etc.)</h5>

                  {/* Registry items list */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
                    {giftRegistries.length === 0 ? (
                      <p style={{ fontStyle: 'italic', color: 'var(--text-muted)', fontSize: '0.8rem' }}>No has agregado una mesa de regalo.</p>
                    ) : (
                      giftRegistries.map((reg, idx) => (
                        <div key={idx} className="wiz-item-card">
                          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexGrow: 1 }}>
                            <span className="wiz-store-badge" style={{ background: reg.storeName === 'Liverpool' ? '#e01e5a' : reg.storeName === 'Sears' ? '#0055a4' : reg.storeName === 'Amazon México' ? '#232f3e' : reg.storeName === 'El Palacio de Hierro' ? '#000000' : '#0f172a' }}>
                              {reg.storeName}
                            </span>
                            <span style={{ fontSize: '0.8rem', color: '#0f172a' }}>
                              {reg.registryNumber ? `#${reg.registryNumber}` : ''}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setGiftRegistries(giftRegistries.filter((_, i) => i !== idx))}
                            className="wiz-remove-btn"
                            title="Eliminar"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Add registry builder */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', background: '#ffffff', padding: '0.8rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(140px, 100%), 1fr))', gap: '0.5rem' }}>
                      <select
                        className="wiz-field-select"
                        value={tempStoreName}
                        onChange={(e) => setTempStoreName(e.target.value)}
                        style={{ height: '38px', fontSize: '0.8rem' }}
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
                        className="wiz-field-input"
                        placeholder="Cód. Evento (ej: 508123)"
                        value={tempRegistryNumber}
                        onChange={(e) => setTempRegistryNumber(e.target.value)}
                        style={{ height: '38px', fontSize: '0.8rem' }}
                      />
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <input
                        type="text"
                        className={`wiz-field-input ${tempRegistryUrl && !isValidUrl(tempRegistryUrl) ? 'error' : ''}`}
                        placeholder="Enlace URL (ej: https://...)"
                        value={tempRegistryUrl}
                        onChange={(e) => setTempRegistryUrl(e.target.value)}
                        onBlur={(e) => setTempRegistryUrl(ensureHttp(e.target.value))}
                        style={{ height: '38px', fontSize: '0.8rem', flexGrow: 1 }}
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
                        className="wiz-btn-outline-sm"
                        disabled={tempRegistryUrl !== '' && !isValidUrl(tempRegistryUrl)}
                      >
                        <Plus size={14} />
                        Agregar
                      </button>
                    </div>
                    {tempRegistryUrl && !isValidUrl(tempRegistryUrl) && (
                      <span className="wiz-field-error-text">Formato de enlace incorrecto (debe incluir http:// o https://)</span>
                    )}
                  </div>

                </div>

              </div>

              {/* Plazo de Confirmación */}
              <div className="wiz-subcard" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <h4 className="wiz-subcard-title"><Clock size={15} />Límite de Confirmación</h4>

                <div className="wiz-field-group" style={{ marginBottom: 0 }}>
                  <label className="wiz-field-label" htmlFor="form-deadline">Fecha límite para Confirmar Asistencia</label>
                  <DateField
                    id="form-deadline"
                    value={formRsvpDeadline}
                    onChange={setFormRsvpDeadline}
                  />
                  <span className="wiz-field-hint" style={{ marginTop: '6px', display: 'block' }}>
                    Esta fecha se mostrará en el formulario de confirmación público para apresurar a los invitados.
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- PASO 6: VESTIMENTA E ITINERARIO --- */}
        {step === 5 && (
          <div className="wiz-card">
            <div className="wiz-field-group">
              <div className="wiz-checkbox-row" style={{ marginBottom: formDressCodeEnabled ? '0.7rem' : 0 }}>
                <input
                  id="dress-code-enabled"
                  type="checkbox"
                  checked={formDressCodeEnabled}
                  onChange={(e) => setFormDressCodeEnabled(e.target.checked)}
                  style={{ width: '16px', height: '16px', accentColor: '#0f172a', cursor: 'pointer' }}
                />
                <label htmlFor="dress-code-enabled" className="wiz-field-label" style={{ marginBottom: 0, cursor: 'pointer' }}>
                  Mostrar código de vestimenta
                </label>
              </div>
              {formDressCodeEnabled && (
                <input
                  id="form-dresscode"
                  type="text"
                  className="wiz-field-input"
                  placeholder="Ej: Formal (No blanco para invitados) o Semiformal"
                  value={formDressCode}
                  onChange={(e) => setFormDressCode(e.target.value)}
                />
              )}
            </div>

            {/* Itinerary Builder */}
            <div className="wiz-field-group" style={{ marginBottom: 0 }}>
              <label className="wiz-field-label">Itinerario / Cronograma</label>

              {/* List of steps */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', margin: '0.5rem 0 1.2rem' }}>
                {itineraryItems.length === 0 ? (
                  <p style={{ fontStyle: 'italic', color: 'var(--text-muted)', fontSize: '0.85rem' }}>No has agregado ningún paso al itinerario.</p>
                ) : (
                  itineraryItems.map((item, idx) => (
                    <div key={idx} className="wiz-item-card">
                      <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flexGrow: 1 }}>
                        <span style={{ fontWeight: 600, color: '#0f172a', minWidth: '85px' }}>{item.time}</span>
                        <span style={{ color: '#334155' }}>{item.activity}</span>
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
                          className="wiz-btn-outline-sm"
                          style={{ padding: '0.3rem 0.5rem', height: 'auto' }}
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
                          className="wiz-btn-outline-sm"
                          style={{ padding: '0.3rem 0.5rem', height: 'auto' }}
                          disabled={idx === itineraryItems.length - 1}
                          title="Bajar"
                        >
                          ▼
                        </button>
                        <button
                          type="button"
                          onClick={() => setItineraryItems(itineraryItems.filter((_, i) => i !== idx))}
                          className="wiz-remove-btn"
                          title="Eliminar paso"
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
                  className="wiz-field-input"
                  placeholder="Hora (ej: 12:00 PM)"
                  value={newItineraryTime}
                  onChange={(e) => setNewItineraryTime(e.target.value)}
                />
                <input
                  type="text"
                  className="wiz-field-input"
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
                  className="wiz-btn-outline"
                >
                  <Plus size={16} />
                  Agregar Paso
                </button>
              </div>
            </div>
          </div>
        )}

        {/* --- PASO 7: GALERÍA DE FOTOS --- */}
        {step === 6 && (
          <div className="wiz-card">
            <div className="wiz-field-group" style={{ marginBottom: 0 }}>
              <label className="wiz-field-label">Selecciona o sube fotos para tu evento</label>

              {/* File upload input */}
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap', margin: '0.5rem 0 1.5rem' }}>
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
                  className="wiz-btn-outline"
                  style={{ cursor: 'pointer' }}
                >
                  <Camera size={15} />{photoUploading ? 'Subiendo imágenes...' : 'Subir Fotos del Evento'}
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
                    <div key={idx} className="wiz-thumb">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt={`Foto ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <button
                        type="button"
                        onClick={() => setUploadedPhotos((photos) => photos.filter((_, photoIndex) => photoIndex !== idx))}
                        aria-label={`Eliminar foto ${idx + 1}`}
                        title="Eliminar foto"
                        className="wiz-thumb-remove"
                      >
                        <Trash2 size={14} aria-hidden="true" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* --- PASO 8: FONDOS PARAMETRIZADOS --- */}
        {step === 7 && (
          <div className="wiz-card">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
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
                <div key={backgroundField.key} className="wiz-subcard" style={{ padding: '1rem' }}>
                  <div style={{ marginBottom: '0.75rem' }}>
                    <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: '0.3rem' }}>{backgroundField.title}</div>
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
                    className="wiz-btn-outline"
                    style={{ cursor: 'pointer', marginBottom: '0.9rem' }}
                  >
                    {backgroundUploadingTarget === backgroundField.key ? 'Subiendo...' : 'Subir fondo'}
                  </label>

                  {backgroundField.value ? (
                    <div>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={backgroundField.value} alt={backgroundField.title} style={{ width: '100%', aspectRatio: '4 / 3', objectFit: 'cover', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '0.75rem' }} />
                      <button
                        type="button"
                        onClick={() => backgroundField.setValue('')}
                        className="wiz-btn-outline"
                        style={{ width: '100%' }}
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
          </div>
        )}

        {/* Error Message */}
        {formError && (
          <p className="wiz-error">
            {formError}
          </p>
        )}

        {/* Wizard Navigation */}
        <div className="wiz-footer">
          {step === 0 ? (
            <button
              type="button"
              onClick={() => router.push('/admin')}
              className="wiz-btn-outline"
              disabled={formLoading}
            >
              Cancelar
            </button>
          ) : (
            <button
              type="button"
              onClick={goBack}
              className="wiz-btn-outline"
              disabled={formLoading}
            >
              <ChevronLeft size={16} />
              Atrás
            </button>
          )}

          {step < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={goNext}
              className="wiz-btn-primary"
            >
              Siguiente
              <ChevronRight size={16} />
            </button>
          ) : (
            <button
              type="submit"
              className="wiz-btn-primary"
              disabled={formLoading}
            >
              <Save size={16} />
              {formLoading ? 'Guardando...' : 'Guardar Evento'}
            </button>
          )}
        </div>

      </form>

    </div>
  );
}
