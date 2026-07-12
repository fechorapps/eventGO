'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { Lock, LogOut, Download, Trash2, Search, Users, UserCheck, Baby, RefreshCw, Plus, Save, X, Edit, ChevronLeft, Calendar, MapPin, Gift, Phone, Info, Send, Link2, Church, Wine, ShoppingCart, Clock, Camera } from 'lucide-react';
import Link from 'next/link';
import DateField from '@/components/DateField';

interface Guest {
  id: number;
  name: string;
  isChild: boolean;
  confirmed: boolean;
}

interface RSVP {
  id: number;
  slug: string;
  familyName: string;
  contactPhone: string;
  comments: string;
  createdAt: string;
  guests: Guest[];
}

interface EventItineraryItem {
  id: number;
  time: string;
  activity: string;
}

interface EventPhoto {
  id: number;
  url: string;
}

interface EventGiftRegistry {
  id: number;
  storeName: string;
  registryNumber: string | null;
  url: string | null;
}

interface Event {
  id: number;
  slug: string;
  title: string;
  celebrantName: string;
  subtitle: string | null;
  quote: string | null;
  date: string;
  heroBackgroundUrl: string | null;
  detailsBackgroundUrl: string | null;
  rsvpBackgroundUrl: string | null;
  parents: string | null;
  godparents: string | null;
  churchName: string | null;
  churchTime: string | null;
  churchAddress: string | null;
  churchMapsUrl: string | null;
  hallName: string | null;
  hallTime: string | null;
  hallAddress: string | null;
  hallMapsUrl: string | null;
  dressCode: string | null;
  itinerary: EventItineraryItem[];
  photos: EventPhoto[];
  giftRegistries: EventGiftRegistry[];
  giftEnvelope: boolean;
  giftBankName: string | null;
  giftBankOwner: string | null;
  giftBankAccount: string | null;
  giftBankClabe: string | null;
  rsvpPhone: string | null;
  rsvpDeadline: string | null;
}

interface GuestInput {
  name: string;
  isChild: boolean;
  confirmed: boolean;
}

interface TempItineraryInput {
  time: string;
  activity: string;
}

interface TempRegistryInput {
  storeName: string;
  registryNumber: string;
  url: string;
}

export default function AdminPage() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null); // null checking
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Application Modes: 'list', 'rsvp', 'form'
  const [viewMode, setViewMode] = useState<'list' | 'rsvp' | 'form'>('list');

  // Events list states
  const [events, setEvents] = useState<Event[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);

  // Selected event for RSVP guest list
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [rsvps, setRsvps] = useState<RSVP[]>([]);
  const [rsvpsLoading, setRsvpsLoading] = useState(false);
  const [rsvpSearchTerm, setRsvpSearchTerm] = useState('');

  // Reusable Mexican Phone Formatter Helper
  const formatMexicanPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    const truncated = numbers.slice(0, 10);
    if (truncated.length <= 2) {
      return truncated;
    } else if (truncated.length <= 6) {
      return `(${truncated.slice(0, 2)}) ${truncated.slice(2)}`;
    } else {
      return `(${truncated.slice(0, 2)}) ${truncated.slice(2, 6)}-${truncated.slice(6)}`;
    }
  };

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
      return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' });
    } catch {
      return file;
    }
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
  
  // RSVP add form states
  const [showAddRsvpForm, setShowAddRsvpForm] = useState(false);
  const [newFamilyName, setNewFamilyName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [newComments, setNewComments] = useState('');
  const [newGuestsList, setNewGuestsList] = useState<GuestInput[]>([]);
  const [tempGuestName, setTempGuestName] = useState('');
  const [tempGuestType, setTempGuestType] = useState<'adult' | 'child'>('adult');
  // Removed tempGuestConfirmed since manual additions default to pending (false)
  const [rsvpActionLoadingId, setRsvpActionLoadingId] = useState<number | null>(null);
  const [rsvpAddError, setRsvpAddError] = useState('');
  const [rsvpAddLoading, setRsvpAddLoading] = useState(false);

  // Event Edit / Create form states
  const [eventFormId, setEventFormId] = useState<number | null>(null); // null means creating
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

  const [formDressCode, setFormDressCode] = useState('');
  
  // Interactive Itinerary list state
  const [itineraryItems, setItineraryItems] = useState<TempItineraryInput[]>([]);
  const [newItineraryTime, setNewItineraryTime] = useState('');
  const [newItineraryActivity, setNewItineraryActivity] = useState('');

  // Photos gallery list state
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>([]);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [backgroundUploadingTarget, setBackgroundUploadingTarget] = useState<'hero' | 'details' | 'rsvp' | null>(null);

  // Gift registries (Mexico) catalog state
  const [giftRegistries, setGiftRegistries] = useState<TempRegistryInput[]>([]);
  const [tempStoreName, setTempStoreName] = useState('Liverpool');
  const [tempRegistryNumber, setTempRegistryNumber] = useState('');
  const [tempRegistryUrl, setTempRegistryUrl] = useState('');
  
  const [formGiftEnvelope, setFormGiftEnvelope] = useState(true);
  const [formGiftBankName, setFormGiftBankName] = useState('');
  const [formGiftBankOwner, setFormGiftBankOwner] = useState('');
  const [formGiftBankAccount, setFormGiftBankAccount] = useState('');
  const [formGiftBankClabe, setFormGiftBankClabe] = useState('');
  
  const [formRsvpPhone, setFormRsvpPhone] = useState('5215512345678');
  const [formRsvpDeadline, setFormRsvpDeadline] = useState('');
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  // Verify session on mount
  const checkSession = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/events');
      if (response.ok) {
        setIsLoggedIn(true);
        fetchEvents();
      } else {
        setIsLoggedIn(false);
      }
    } catch (e) {
      console.error(e);
      setIsLoggedIn(false);
    }
  }, []);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

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

  const fetchRsvps = async (eventId: number) => {
    setRsvpsLoading(true);
    try {
      const response = await fetch(`/api/admin/rsvps?eventId=${eventId}`);
      if (response.ok) {
        const data = await response.json();
        setRsvps(data.rsvps || []);
      }
    } catch (e) {
      console.error('Error fetching RSVPs:', e);
    } finally {
      setRsvpsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError('');

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });

      if (response.ok) {
        setIsLoggedIn(true);
        fetchEvents();
      } else {
        const data = await response.json();
        setLoginError(data.error || 'Contraseña incorrecta');
      }
    } catch (e) {
      console.error(e);
      setLoginError('Error de servidor. Inténtalo de nuevo.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
      setIsLoggedIn(false);
      setEvents([]);
      setSelectedEvent(null);
      setViewMode('list');
    } catch (e) {
      console.error(e);
    }
  };

  // Manage Event Deletion
  const handleDeleteEvent = async (eventId: number, title: string, celebrant: string) => {
    if (!window.confirm(`¿Estás seguro de que deseas eliminar por completo el evento "${title} - ${celebrant}"? Se borrarán todas las asistencias asociadas de forma permanente.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/events?id=${eventId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setEvents(events.filter(e => e.id !== eventId));
      } else {
        alert('Error al intentar eliminar el evento.');
      }
    } catch (e) {
      console.error(e);
      alert('Error de conexión');
    }
  };

  // Manage RSVP Deletion
  const handleDeleteRsvp = async (rsvpId: number, familyName: string) => {
    if (!window.confirm(`¿Estás seguro de que deseas eliminar la confirmación de la familia "${familyName}"?`)) {
      return;
    }

    setRsvpActionLoadingId(rsvpId);
    try {
      const response = await fetch(`/api/admin/rsvps?id=${rsvpId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setRsvps(rsvps.filter(r => r.id !== rsvpId));
      } else {
        alert('Error al intentar eliminar la confirmación');
      }
    } catch (e) {
      console.error(e);
      alert('Error de conexión');
    } finally {
      setRsvpActionLoadingId(null);
    }
  };

  // RSVP Form Builder Handlers
  const handleAddTempGuest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tempGuestName.trim()) return;

    if (newGuestsList.some(g => g.name.toLowerCase() === tempGuestName.trim().toLowerCase())) {
      setRsvpAddError('Este integrante ya fue agregado a la lista temporal.');
      return;
    }

    setRsvpAddError('');
    setNewGuestsList([
      ...newGuestsList,
      {
        name: tempGuestName.trim(),
        isChild: tempGuestType === 'child',
        confirmed: false, // Pre-registered manual guests default to pending (false)
      },
    ]);
    setTempGuestName('');
  };

  const handleRemoveTempGuest = (idx: number) => {
    setNewGuestsList(newGuestsList.filter((_, i) => i !== idx));
  };

  const handleSaveRsvpManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvent) return;

    if (!newFamilyName.trim()) {
      setRsvpAddError('El nombre de la familia es requerido.');
      return;
    }

    if (newGuestsList.length === 0) {
      setRsvpAddError('Agrega al menos un miembro a la familia.');
      return;
    }

    setRsvpAddLoading(true);
    setRsvpAddError('');

    try {
      const response = await fetch('/api/rsvp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventId: selectedEvent.id,
          familyName: newFamilyName.trim(),
          contactPhone: newContactPhone.trim(),
          comments: newComments.trim(),
          guests: newGuestsList,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setNewFamilyName('');
        setNewContactPhone('');
        setNewComments('');
        setNewGuestsList([]);
        setShowAddRsvpForm(false);
        fetchRsvps(selectedEvent.id);
      } else {
        setRsvpAddError(data.error || 'Ocurrió un error al guardar el registro.');
      }
    } catch (err) {
      console.error(err);
      setRsvpAddError('Error de conexión.');
    } finally {
      setRsvpAddLoading(false);
    }
  };

  // Event Form Navigation & Loading
  const handleOpenCreateEvent = () => {
    setEventFormId(null);
    setFormSlug('');
    setFormTitle('Bautizo');
    setFormCelebrantName('');
    setFormSubtitle('Nuestra Promesa de Amor');
    setFormQuote('Señor, toma mi pequeña vida en tus manos, guíame con tu amor y enséñame a caminar bajo tu luz divina.');
    
    // Set default date to 3 months from now
    const futureDate = new Date();
    futureDate.setMonth(futureDate.getMonth() + 3);
    futureDate.setMinutes(0);
    futureDate.setSeconds(0);
    setFormDate(futureDate.toISOString().slice(0, 16)); // Format: YYYY-MM-DDTHH:MM
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
    
    setFormDressCode('Formal (De preferencia colores claros o beige)');
    
    // Default interactive itinerary
    setItineraryItems([
      { time: '12:00 PM', activity: 'Ceremonia Religiosa' },
      { time: '01:30 PM', activity: 'Sesión de Fotos' },
      { time: '02:00 PM', activity: 'Recepción y Cóctel' },
      { time: '03:00 PM', activity: 'Comida de Celebración' },
      { time: '05:00 PM', activity: 'Pastel y Brindis' },
    ]);
    setNewItineraryTime('');
    setNewItineraryActivity('');

    // Clear photos
    setUploadedPhotos([]);
    setPhotoUploading(false);

    // Default gift registries catalog (Mexico)
    setGiftRegistries([
      { storeName: 'Liverpool', registryNumber: '50812345', url: 'https://mesaderegalos.liverpool.com.mx/' }
    ]);
    setTempStoreName('Liverpool');
    setTempRegistryNumber('');
    setTempRegistryUrl('');
    
    setFormGiftEnvelope(true);
    setFormGiftBankName('BBVA');
    setFormGiftBankOwner('Sofía Mendoza Pérez');
    setFormGiftBankAccount('0123 4567 8901 2345');
    setFormGiftBankClabe('0121 8000 1234 5678 90');
    
    setFormRsvpPhone('5215512345678');
    
    // Set RSVP deadline 2 weeks before the event
    const deadlineDate = new Date(futureDate);
    deadlineDate.setDate(deadlineDate.getDate() - 14);
    setFormRsvpDeadline(deadlineDate.toISOString().slice(0, 10)); // Format: YYYY-MM-DD

    setFormError('');
    setViewMode('form');
  };

  const handleOpenEditEvent = (event: Event) => {
    setEventFormId(event.id);
    setFormSlug(event.slug);
    setFormTitle(event.title);
    setFormCelebrantName(event.celebrantName);
    setFormSubtitle(event.subtitle || '');
    setFormQuote(event.quote || '');
    setFormHeroBackgroundUrl(event.heroBackgroundUrl || '');
    setFormDetailsBackgroundUrl(event.detailsBackgroundUrl || '');
    setFormRsvpBackgroundUrl(event.rsvpBackgroundUrl || '');
    
    // Parse Date to local ISO string (YYYY-MM-DDTHH:MM)
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

    setFormDressCode(event.dressCode || '');
    
    // Load itinerary items from relation
    setItineraryItems(
      event.itinerary ? event.itinerary.map(item => ({
        time: item.time,
        activity: item.activity,
      })) : []
    );
    setNewItineraryTime('');
    setNewItineraryActivity('');

    // Load photo urls
    setUploadedPhotos(
      event.photos ? event.photos.map(p => p.url) : []
    );
    setPhotoUploading(false);

    // Load gift registries
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
    setFormGiftBankAccount(event.giftBankAccount || '');
    setFormGiftBankClabe(event.giftBankClabe || '');
    
    setFormRsvpPhone(event.rsvpPhone || '');
    
    if (event.rsvpDeadline) {
      setFormRsvpDeadline(new Date(event.rsvpDeadline).toISOString().slice(0, 10));
    } else {
      setFormRsvpDeadline('');
    }

    setFormError('');
    setViewMode('form');
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
    if (formHallMapsUrl && !isValidUrl(formHallMapsUrl)) {
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
      hallName: formHallName.trim() || null,
      hallTime: formHallTime.trim() || null,
      hallAddress: formHallAddress.trim() || null,
      hallMapsUrl: formHallMapsUrl.trim() || null,
      dressCode: formDressCode.trim() || null,
      itinerary: itineraryItems,     // Structured array
      photos: uploadedPhotos,          // Structured array of urls
      giftRegistries: giftRegistries,  // Structured array of stores
      giftEnvelope: formGiftEnvelope,
      giftBankName: formGiftBankName.trim() || null,
      giftBankOwner: formGiftBankOwner.trim() || null,
      giftBankAccount: formGiftBankAccount.trim() || null,
      giftBankClabe: formGiftBankClabe.trim() || null,
      rsvpPhone: formRsvpPhone.trim() || null,
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
        setViewMode('list');
        fetchEvents();
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

  const handleOpenRsvpList = (event: Event) => {
    setSelectedEvent(event);
    fetchRsvps(event.id);
    setViewMode('rsvp');
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (rsvps.length === 0 || !selectedEvent) return;

    const headers = ['Familia', 'Telefono de Contacto', 'Nombre de Invitado', 'Tipo', 'Asistirá', 'Mensaje/Comentarios', 'Fecha Confirmación'];
    
    const rows = rsvps.flatMap(rsvp => 
      rsvp.guests.map(guest => [
        rsvp.familyName,
        rsvp.contactPhone || 'N/A',
        guest.name,
        guest.isChild ? 'Niño' : 'Adulto',
        guest.confirmed ? 'Sí' : 'Pendiente',
        rsvp.comments || '',
        new Date(rsvp.createdAt).toLocaleString('es-MX')
      ])
    );

    const csvContent = '\uFEFF' + [
      headers.join(','),
      ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `confirmados_${selectedEvent.slug}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Stats for Selected Event RSVPs
  const totalFamilies = rsvps.length;
  let totalGuests = 0;
  let totalConfirmed = 0;
  let totalAdultsConfirmed = 0;
  let totalChildrenConfirmed = 0;

  rsvps.forEach(rsvp => {
    rsvp.guests.forEach(guest => {
      totalGuests++;
      if (guest.confirmed) {
        totalConfirmed++;
        if (guest.isChild) {
          totalChildrenConfirmed++;
        } else {
          totalAdultsConfirmed++;
        }
      }
    });
  });

  const filteredRsvps = rsvps.filter(rsvp => {
    const searchLower = rsvpSearchTerm.toLowerCase();
    const familyMatch = rsvp.familyName.toLowerCase().includes(searchLower);
    const phoneMatch = (rsvp.contactPhone || '').toLowerCase().includes(searchLower);
    const guestMatch = rsvp.guests.some(g => g.name.toLowerCase().includes(searchLower));
    return familyMatch || phoneMatch || guestMatch;
  });

  // Login Screen
  if (isLoggedIn === null) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '90vh' }}>
        <RefreshCw className="location-icon" size={32} style={{ animation: 'spin 2s linear infinite' }} />
        <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>Cargando panel...</p>
        <style jsx global>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '85vh' }}>
        <div className="section-card login-card">
          <div className="location-icon">
            <Lock size={36} />
          </div>
          <span className="section-subtitle" style={{ marginBottom: '0.5rem' }}>Administración</span>
          <h2 className="section-title" style={{ fontSize: '1.8rem', marginBottom: '1.5rem' }}>Panel de Control</h2>
          
          <form onSubmit={handleLogin} style={{ textAlign: 'left', marginTop: '1rem' }}>
            <div className="rsvp-form-group">
              <label className="rsvp-label" htmlFor="admin-pwd">Contraseña de Acceso</label>
              <input
                id="admin-pwd"
                type="password"
                className="rsvp-input"
                placeholder="Escribe la contraseña..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loginLoading}
              />
            </div>

            {loginError && (
              <p style={{ color: '#B22222', fontSize: '0.85rem', marginBottom: '1rem', fontWeight: 500 }}>
                {loginError}
              </p>
            )}

            <button
              type="submit"
              className="btn-gold"
              style={{ width: '100%' }}
              disabled={loginLoading}
            >
              {loginLoading ? 'Ingresando...' : 'Iniciar Sesión'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-container">
      {/* HEADER */}
      <header className="admin-header">
        <div>
          <span className="section-subtitle" style={{ textAlign: 'left', marginBottom: '0.2rem', display: 'block' }}>Gestor de Invitaciones</span>
          <h1 style={{ fontSize: '2.2rem', color: 'var(--gold-dark)' }}>eventGO Admin</h1>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          {viewMode !== 'list' && (
            <button onClick={() => setViewMode('list')} className="btn-outline">
              <ChevronLeft size={16} />
              Volver a Eventos
            </button>
          )}
          <button onClick={handleLogout} className="btn-outline" style={{ color: '#C65911', borderColor: 'rgba(198, 89, 17, 0.3)' }}>
            <LogOut size={16} />
            Salir
          </button>
        </div>
      </header>

      {/* VIEW: EVENTS LIST */}
      {viewMode === 'list' && (
        <section>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.8rem', color: 'var(--gold-dark)', margin: 0 }}>Tus Eventos</h2>
            <button onClick={handleOpenCreateEvent} className="btn-gold">
              <Plus size={16} />
              Crear Nuevo Evento
            </button>
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
              <button onClick={handleOpenCreateEvent} className="btn-gold">
                Crear Mi Primer Evento
              </button>
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
                        <button onClick={() => handleOpenRsvpList(event)} className="btn-gold" style={{ flexGrow: 1, padding: '0.6rem', fontSize: '0.75rem' }}>
                          <Users size={14} />
                          Ver Invitados
                        </button>
                        
                        <button onClick={() => handleOpenEditEvent(event)} className="btn-outline" style={{ padding: '0.6rem', fontSize: '0.75rem' }}>
                          <Edit size={14} />
                          Editar
                        </button>

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
      )}

      {/* VIEW: EVENT GUEST LIST / RSVPS */}
      {viewMode === 'rsvp' && selectedEvent && (
        <section>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <div>
              <span className="guest-type-tag">Invitados Confirmados</span>
              <h2 style={{ fontSize: '1.8rem', color: 'var(--gold-dark)', marginTop: '0.2rem', margin: 0 }}>
                {selectedEvent.celebrantName} - {selectedEvent.title}
              </h2>
            </div>
            <button onClick={() => setViewMode('list')} className="btn-outline">
              <ChevronLeft size={16} />
              Volver a Eventos
            </button>
          </div>

          {/* Stats Cards */}
          <div className="stats-grid" style={{ marginBottom: '2rem' }}>
            <div className="stat-card">
              <div className="stat-value">{totalFamilies}</div>
              <div className="stat-label">Familias Registradas</div>
              <Users size={18} style={{ color: 'var(--gold-medium)', marginTop: '8px' }} />
            </div>
            <div className="stat-card">
              <div className="stat-value">{totalConfirmed}</div>
              <div className="stat-label">Asistentes Confirmados</div>
              <UserCheck size={18} style={{ color: '#33567D', marginTop: '8px' }} />
            </div>
            <div className="stat-card">
              <div className="stat-value">{totalAdultsConfirmed}</div>
              <div className="stat-label">Adultos</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>Confirmados</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{totalChildrenConfirmed}</div>
              <div className="stat-label">Niños</div>
              <Baby size={18} style={{ color: '#1F4E79', marginTop: '8px' }} />
            </div>
          </div>

          {/* Collapsible Manual Registration Form */}
          {showAddRsvpForm && (
            <div className="section-card" style={{ padding: '2rem 2.5rem', textAlign: 'left', borderRadius: '12px', marginBottom: '2.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid rgba(212,175,55,0.15)', paddingBottom: '0.8rem' }}>
                <h3 style={{ fontSize: '1.5rem', color: 'var(--gold-dark)', margin: 0 }}>Registrar Nueva Familia / Invitado</h3>
                <button onClick={() => {
                  setShowAddRsvpForm(false);
                  setNewFamilyName('');
                  setNewContactPhone('');
                  setNewComments('');
                  setNewGuestsList([]);
                }} className="btn-remove-guest" style={{ color: 'var(--text-muted)' }}>
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSaveRsvpManual}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(280px, 100%), 1fr))', gap: '1.5rem' }}>
                  <div className="rsvp-form-group">
                    <label className="rsvp-label" htmlFor="manual-family-name">Nombre de la Familia</label>
                    <input
                      id="manual-family-name"
                      type="text"
                      className="rsvp-input"
                      placeholder="Ej: Familia López Rojas"
                      value={newFamilyName}
                      onChange={(e) => setNewFamilyName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="rsvp-form-group">
                    <label className="rsvp-label" htmlFor="manual-contact-phone">Teléfono de Contacto</label>
                    <input
                      id="manual-contact-phone"
                      type="tel"
                      className="rsvp-input"
                      placeholder="Ej: (55) 1234-5678"
                      value={newContactPhone}
                      onChange={(e) => setNewContactPhone(formatMexicanPhone(e.target.value))}
                    />
                  </div>
                </div>

                <div className="rsvp-form-group" style={{ marginTop: '1rem' }}>
                  <label className="rsvp-label">Integrantes</label>
                  
                  {newGuestsList.map((g, idx) => (
                    <div key={idx} className="guest-item-card" style={{ padding: '0.8rem 1rem', marginBottom: '0.5rem' }}>
                      <div>
                        <span style={{ fontWeight: 600, marginRight: '10px' }}>{g.name}</span>
                        <span className="guest-type-tag">{g.isChild ? '👶 Niño' : '👨 Adulto'}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <span className={`status-badge ${g.confirmed ? 'status-confirmed' : 'status-pending'}`}>
                          {g.confirmed ? 'Asistirá' : 'Pendiente'}
                        </span>
                        <button type="button" onClick={() => handleRemoveTempGuest(idx)} className="btn-remove-guest">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  ))}

                  <div className="guest-builder-row" style={{ marginTop: '1rem' }}>
                    <input
                      type="text"
                      className="rsvp-input"
                      placeholder="Nombre completo..."
                      value={tempGuestName}
                      onChange={(e) => setTempGuestName(e.target.value)}
                    />
                    <select
                      className="guest-builder-select"
                      value={tempGuestType}
                      onChange={(e) => setTempGuestType(e.target.value as 'adult' | 'child')}
                    >
                      <option value="adult">👨 Adulto</option>
                      <option value="child">👶 Niño</option>
                    </select>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>

                      <button
                        type="button"
                        onClick={handleAddTempGuest}
                        className="btn-outline"
                        style={{ padding: '0.9rem 1.2rem', borderRadius: '8px' }}
                      >
                        <Plus size={16} />
                        Agregar
                      </button>
                    </div>
                  </div>
                </div>

                <div className="rsvp-form-group">
                  <label className="rsvp-label" htmlFor="manual-comments">Comentarios o Notas</label>
                  <textarea
                    id="manual-comments"
                    className="rsvp-input"
                    placeholder="Comentarios adicionales"
                    value={newComments}
                    onChange={(e) => setNewComments(e.target.value)}
                    style={{ minHeight: '60px', resize: 'vertical' }}
                  />
                </div>

                {rsvpAddError && (
                  <p style={{ color: '#B22222', fontSize: '0.9rem', marginBottom: '1.5rem', fontWeight: 500 }}>
                    {rsvpAddError}
                  </p>
                )}

                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '2rem' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddRsvpForm(false);
                      setNewGuestsList([]);
                      setNewFamilyName('');
                      setNewContactPhone('');
                      setNewComments('');
                    }}
                    className="btn-outline"
                  >
                    Cancelar
                  </button>
                  
                  <button
                    type="submit"
                    onClick={handleSaveRsvpManual}
                    className="btn-gold"
                    disabled={rsvpAddLoading}
                  >
                    <Save size={16} />
                    {rsvpAddLoading ? 'Guardando...' : 'Guardar Familia'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Guest management controls */}
          <div className="section-card" style={{ padding: '2rem', textAlign: 'left', borderRadius: '12px' }}>
            <div className="dashboard-controls" style={{ marginBottom: '1.5rem' }}>
              <div className="search-wrapper">
                <Search className="search-icon" size={16} />
                <input
                  type="text"
                  className="rsvp-input search-input"
                  placeholder="Buscar familia, invitado o teléfono..."
                  value={rsvpSearchTerm}
                  onChange={(e) => setRsvpSearchTerm(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap' }}>
                <button onClick={() => setShowAddRsvpForm(true)} className="btn-gold">
                  <Plus size={16} />
                  Agregar Familia
                </button>
                <button onClick={() => fetchRsvps(selectedEvent.id)} className="btn-outline" disabled={rsvpsLoading}>
                  Actualizar
                </button>
                <button onClick={handleExportCSV} className="btn-outline" disabled={rsvps.length === 0}>
                  <Download size={16} />
                  Exportar CSV
                </button>
              </div>
            </div>

            {rsvpsLoading && rsvps.length === 0 ? (
              <p style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)' }}>Cargando datos...</p>
            ) : filteredRsvps.length === 0 ? (
              <p style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)' }}>
                {rsvps.length === 0 ? 'Aún no hay confirmaciones registradas para este evento.' : 'No se encontraron resultados.'}
              </p>
            ) : (
              <div className="table-responsive" style={{ marginBottom: 0 }}>
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th style={{ width: '22%' }}>Familia / Invitado</th>
                      <th style={{ width: '15%' }}>Teléfono</th>
                      <th style={{ width: '33%' }}>Integrantes de la Familia</th>
                      <th style={{ width: '20%' }}>Mensaje / Comentarios</th>
                      <th style={{ width: '10%', textAlign: 'center' }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRsvps.map((rsvp) => (
                      <tr key={rsvp.id}>
                        <td style={{ verticalAlign: 'middle' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(212,175,55,0.1)', color: 'var(--gold-dark)', flexShrink: 0 }}>
                              <Users size={15} />
                            </div>
                            <div>
                              <div style={{ fontWeight: 700, color: 'var(--text-dark)', fontSize: '0.95rem' }}>{rsvp.familyName}</div>
                              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                                📅 {new Date(rsvp.createdAt).toLocaleDateString('es-MX')} {new Date(rsvp.createdAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td style={{ verticalAlign: 'middle' }}>
                          {rsvp.contactPhone ? (
                            <a 
                              href={`https://wa.me/${rsvp.contactPhone.replace(/\D/g, '')}`} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              style={{ 
                                display: 'inline-flex', 
                                alignItems: 'center', 
                                gap: '6px', 
                                padding: '0.35rem 0.75rem', 
                                background: 'rgba(37, 211, 102, 0.05)', 
                                border: '1px solid rgba(37, 211, 102, 0.2)', 
                                borderRadius: '15px', 
                                color: '#25D366', 
                                textDecoration: 'none', 
                                fontSize: '0.8rem',
                                fontWeight: 600,
                                transition: 'all 0.25s ease'
                              }}
                              title="Chatear por WhatsApp"
                            >
                              <Phone size={12} />
                              {rsvp.contactPhone}
                            </a>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontStyle: 'italic' }}>No registrado</span>
                          )}
                        </td>
                        <td style={{ verticalAlign: 'middle' }}>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                            {rsvp.guests.map((guest) => (
                              <div 
                                key={guest.id} 
                                style={{ 
                                  display: 'inline-flex', 
                                  alignItems: 'center', 
                                  gap: '6px', 
                                  background: 'rgba(212,175,55,0.04)', 
                                  border: '1px solid rgba(212,175,55,0.15)', 
                                  borderRadius: '20px', 
                                  padding: '0.35rem 0.7rem', 
                                  fontSize: '0.8rem' 
                                }}
                              >
                                <span>{guest.isChild ? '👶' : '👨'}</span>
                                <span style={{ fontWeight: 500, color: guest.confirmed ? 'var(--text-dark)' : 'var(--text-muted)' }}>
                                  {guest.name}
                                </span>
                                <span className={`status-badge ${guest.confirmed ? 'status-confirmed' : 'status-pending'}`} style={{ fontSize: '0.6rem', padding: '2px 6px', borderRadius: '10px', textTransform: 'none', fontWeight: 600 }}>
                                  {guest.confirmed ? 'Asistirá' : 'Pendiente'}
                                </span>
                              </div>
                            ))}
                          </div>
                        </td>
                        <td style={{ fontSize: '0.85rem', verticalAlign: 'middle' }}>
                          {rsvp.comments ? (
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', background: 'rgba(212,175,55,0.02)', padding: '0.5rem 0.8rem', borderLeft: '3px solid var(--gold-medium)', borderRadius: '0 8px 8px 0' }}>
                              <span style={{ fontStyle: 'italic', color: 'var(--text-dark)' }}>
                                "{rsvp.comments}"
                              </span>
                            </div>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Sin comentarios.</span>
                          )}
                        </td>
                        <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                          {(() => {
                            const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/e/${selectedEvent.slug}?f=${rsvp.slug}`;
                            const text = `¡Hola! Te invitamos cordialmente a celebrar con nosotros: *${selectedEvent.title} de ${selectedEvent.celebrantName}* ✨.\n\nPor favor, confirma tu asistencia y la de tus familiares ingresando al siguiente enlace:\n\n${url}`;
                            const cleanPhone = rsvp.contactPhone ? rsvp.contactPhone.replace(/\D/g, '') : '';
                            const formattedPhone = cleanPhone.length === 10 ? `52${cleanPhone}` : cleanPhone;
                            const waLink = formattedPhone 
                              ? `https://wa.me/${formattedPhone}?text=${encodeURIComponent(text)}`
                              : `https://wa.me/?text=${encodeURIComponent(text)}`;
                            
                            return (
                              <a
                                href={waLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn-outline"
                                style={{ 
                                  padding: '0.4rem', 
                                  marginRight: '0.5rem', 
                                  color: '#25D366', 
                                  borderColor: 'rgba(37, 211, 102, 0.3)',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  verticalAlign: 'middle',
                                  minWidth: 'auto',
                                  height: 'auto'
                                }}
                                title="Enviar por WhatsApp"
                              >
                                <Send size={15} />
                              </a>
                            );
                          })()}
                          <button
                            onClick={() => handleDeleteRsvp(rsvp.id, rsvp.familyName)}
                            className="btn-delete"
                            disabled={rsvpActionLoadingId === rsvp.id}
                            title="Eliminar confirmación"
                            style={{ verticalAlign: 'middle' }}
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      )}

      {/* VIEW: CREATE OR EDIT EVENT PARAMETERS FORM */}
      {viewMode === 'form' && (
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
                  className="rsvp-input"
                  placeholder="Ej: 5215512345678 (con código de país)"
                  value={formRsvpPhone}
                  onChange={(e) => setFormRsvpPhone(e.target.value)}
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

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(280px, 100%), 1fr))', gap: '2rem', marginBottom: '2.5rem' }}>
              
              {/* Iglesia */}
              <div style={{ background: 'rgba(212,175,55,0.02)', border: '1px solid rgba(212,175,55,0.1)', padding: '1.5rem', borderRadius: '12px' }}>
                <h4 style={{ color: 'var(--gold-dark)', fontSize: '1rem', marginBottom: '1rem' }}><Church size={15} style={{ verticalAlign: '-2px', marginRight: '6px', display: 'inline-block' }} />Ceremonia / Iglesia</h4>
                <div className="rsvp-form-group">
                  <label className="rsvp-label" htmlFor="church-name">Nombre del Templo / Iglesia</label>
                  <input id="church-name" type="text" className="rsvp-input" placeholder="Ej: Parroquia de San Francisco" value={formChurchName} onChange={(e) => setFormChurchName(e.target.value)} />
                </div>
                <div className="rsvp-form-group">
                  <label className="rsvp-label" htmlFor="church-time">Hora específica</label>
                  <input id="church-time" type="text" className="rsvp-input" placeholder="Ej: 12:00 PM" value={formChurchTime} onChange={(e) => setFormChurchTime(e.target.value)} />
                </div>
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
              <div style={{ background: 'rgba(212,175,55,0.02)', border: '1px solid rgba(212,175,55,0.1)', padding: '1.5rem', borderRadius: '12px' }}>
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
              </div>
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

                <div className="rsvp-form-group">
                  <label className="rsvp-label" htmlFor="bank-name">Nombre del Banco</label>
                  <input id="bank-name" type="text" className="rsvp-input" placeholder="Ej: BBVA" value={formGiftBankName} onChange={(e) => setFormGiftBankName(e.target.value)} />
                </div>
                <div className="rsvp-form-group">
                  <label className="rsvp-label" htmlFor="bank-owner">Titular de la Cuenta</label>
                  <input id="bank-owner" type="text" className="rsvp-input" placeholder="Ej: Sofía Mendoza" value={formGiftBankOwner} onChange={(e) => setFormGiftBankOwner(e.target.value)} />
                </div>
                <div className="rsvp-form-group">
                  <label className="rsvp-label" htmlFor="bank-account">Número de Cuenta</label>
                  <input id="bank-account" type="text" className="rsvp-input" placeholder="Ej: 0123 4567 89..." value={formGiftBankAccount} onChange={(e) => setFormGiftBankAccount(e.target.value)} />
                </div>
                <div className="rsvp-form-group" style={{ marginBottom: 0 }}>
                  <label className="rsvp-label" htmlFor="bank-clabe">CLABE Interbancaria</label>
                  <input id="bank-clabe" type="text" className="rsvp-input" placeholder="18 dígitos..." value={formGiftBankClabe} onChange={(e) => setFormGiftBankClabe(e.target.value)} />
                </div>

                {/* Catálogo de Mesas de Regalo en Tiendas (México) */}
                <div style={{ marginTop: '1.5rem', borderTop: '1px dashed rgba(212,175,55,0.15)', paddingTop: '1.5rem' }}>
                  <h5 style={{ color: 'var(--gold-dark)', fontSize: '0.9rem', marginBottom: '0.8rem', fontWeight: 600 }}><ShoppingCart size={14} style={{ verticalAlign: '-2px', marginRight: '6px', display: 'inline-block' }} />Catálogo de Tiendas (Liverpool, Amazon, etc.)</h5>
                  
                  {/* Registry items list */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '1rem' }}>
                    {giftRegistries.length === 0 ? (
                      <p style={{ fontStyle: 'italic', color: 'var(--text-muted)', fontSize: '0.8rem' }}>No has agregado mesas de regalos en tiendas.</p>
                    ) : (
                      giftRegistries.map((reg, idx) => (
                        <div key={idx} className="guest-item-card" style={{ padding: '0.5rem 0.8rem', marginBottom: 0 }}>
                          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexGrow: 1 }}>
                            <span style={{ fontSize: '0.65rem', padding: '0.2rem 0.5rem', background: reg.storeName === 'Liverpool' ? '#e01e5a' : reg.storeName === 'Amazon México' ? '#232f3e' : reg.storeName === 'El Palacio de Hierro' ? '#000000' : 'var(--gold-dark)', color: '#FFF', borderRadius: '4px', fontWeight: 'bold' }}>
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
                <label className="rsvp-label" htmlFor="form-dresscode">Código de Vestimenta</label>
                <input
                  id="form-dresscode"
                  type="text"
                  className="rsvp-input"
                  placeholder="Ej: Formal (No blanco para invitados) o Semiformal"
                  value={formDressCode}
                  onChange={(e) => setFormDressCode(e.target.value)}
                />
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
                onClick={() => setViewMode('list')}
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
      )}
    </div>
  );
}
