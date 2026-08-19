'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Download,
  Trash2,
  Search,
  Users,
  UserCheck,
  Baby,
  RefreshCw,
  Plus,
  Save,
  X,
  Edit,
  ChevronLeft,
  MapPin,
  Phone,
  Info,
  Send,
  Clock,
  UserX,
  Utensils,
  MessageSquare,
  Check,
  Mail,
} from 'lucide-react';
import Pagination from '@/components/Pagination';
import { paginateData } from '@/types/pagination';
import {
  MEAL_ADULT,
  MEAL_CHILD,
  MEAL_EMOJI,
  MEAL_SHORT_LABEL,
  isMealMismatch,
  normalizeMealType,
} from '@/lib/meal';
import type { MealType } from '@/lib/meal';
import { useSelectedEventSlug } from '@/components/admin/selected-event-context';
import type { RSVP, RSVPFilter, RSVPInvitedByFilter, GuestInput } from '@/types/admin';

interface EventSummary {
  id: number;
  slug: string;
  title: string;
  celebrantName: string;
}

export default function EventRsvps({ eventId }: { eventId: number }) {
  const router = useRouter();

  const [event, setEvent] = useState<EventSummary | null>(null);
  const [eventLoading, setEventLoading] = useState(true);
  const [eventNotFound, setEventNotFound] = useState(false);

  const [rsvps, setRsvps] = useState<RSVP[]>([]);
  // Starts true: this route now genuinely server-renders on first paint, so
  // a `false` default would flash an empty guest table before the fetch
  // resolves.
  const [rsvpsLoading, setRsvpsLoading] = useState(true);
  const [rsvpSearchTerm, setRsvpSearchTerm] = useState('');
  const [rsvpStatusFilter, setRsvpStatusFilter] = useState<RSVPFilter>('all');
  const [rsvpInvitedByFilter, setRsvpInvitedByFilter] = useState<RSVPInvitedByFilter>('all');
  const [rsvpInvitationFilter, setRsvpInvitationFilter] = useState<'all' | 'sent' | 'pending'>('all');

  const [showAddRsvpForm, setShowAddRsvpForm] = useState(false);
  const [editingRsvpId, setEditingRsvpId] = useState<number | null>(null);
  const [newFamilyName, setNewFamilyName] = useState('');
  // Matches handleOpenRsvpList's old on-entry resets for these two fields.
  const [newInvitedBy, setNewInvitedBy] = useState('');
  const [newInvitationSent, setNewInvitationSent] = useState(false);
  const [newContactPhone, setNewContactPhone] = useState('');
  const [newComments, setNewComments] = useState('');
  const [newGuestsList, setNewGuestsList] = useState<GuestInput[]>([]);
  const [tempGuestName, setTempGuestName] = useState('');
  const [tempGuestType, setTempGuestType] = useState<'adult' | 'child'>('adult');
  const [tempGuestMeal, setTempGuestMeal] = useState<MealType>(MEAL_ADULT);

  const [rsvpActionLoadingId, setRsvpActionLoadingId] = useState<number | null>(null);
  const [guestMealLoadingId, setGuestMealLoadingId] = useState<number | null>(null);
  const [rsvpAddError, setRsvpAddError] = useState('');
  const [rsvpAddLoading, setRsvpAddLoading] = useState(false);

  const [rsvpPageIndex, setRsvpPageIndex] = useState(1);
  const [rsvpPageSize, setRsvpPageSize] = useState(10);

  const [activeKpiModal, setActiveKpiModal] = useState<'families' | 'all_confirmed' | 'adults_confirmed' | 'children_confirmed' | 'declined' | 'adult_meals' | 'child_meals' | null>(null);
  const [kpiModalSearch, setKpiModalSearch] = useState('');
  const [kpiModalPageIndex, setKpiModalPageIndex] = useState(1);
  const [kpiModalPageSize, setKpiModalPageSize] = useState(10);

  const { setSlug: setSelectedEventSlugInHeader } = useSelectedEventSlug();

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

  const formatInvitedByLabel = (value: string) => {
    if (value === 'papa') return 'Papá';
    if (value === 'mama') return 'Mamá';
    if (value === 'bebes') return 'Bebés';
    return 'Sin definir';
  };

  const resetRsvpForm = () => {
    setShowAddRsvpForm(false);
    setEditingRsvpId(null);
    setNewFamilyName('');
    setNewInvitedBy('');
    setNewInvitationSent(false);
    setNewContactPhone('');
    setNewComments('');
    setNewGuestsList([]);
    setTempGuestName('');
    setTempGuestType('adult');
    setTempGuestMeal(MEAL_ADULT);
    setRsvpAddError('');
  };

  const getFamilyRsvpStatus = (rsvp: RSVP) => {
    const totalGuests = rsvp.guests.length;

    if (totalGuests === 0) {
      return { key: 'pending' as const, label: 'Pendiente', className: 'status-pending', summary: '0 registrados' };
    }

    const confirmedCount = rsvp.guests.filter((guest) => guest.confirmed === true).length;
    const declinedCount = rsvp.guests.filter((guest) => guest.confirmed === false).length;

    if (confirmedCount === totalGuests) {
      return { key: 'confirmed' as const, label: 'Confirmada', className: 'status-confirmed', summary: `${confirmedCount}/${totalGuests} confirmados` };
    }

    if (confirmedCount > 0) {
      return { key: 'confirmed' as const, label: 'Parcial', className: 'status-partial', summary: `${confirmedCount}/${totalGuests} asisten` };
    }

    if (declinedCount === totalGuests) {
      return { key: 'declined' as const, label: 'No asiste', className: 'status-declined', summary: 'Baja completa' };
    }

    return { key: 'pending' as const, label: 'Pendiente', className: 'status-pending', summary: `${totalGuests} pendientes` };
  };

  const fetchEvent = useCallback(async () => {
    setEventLoading(true);
    try {
      const response = await fetch(`/api/admin/events?id=${eventId}`);
      if (response.status === 401) {
        router.refresh();
        return;
      }
      if (response.status === 404) {
        setEventNotFound(true);
        return;
      }
      if (response.ok) {
        const data = await response.json();
        setEvent(data.event);
      }
    } catch (e) {
      console.error('Error fetching event:', e);
    } finally {
      setEventLoading(false);
    }
  }, [eventId, router]);

  const fetchRsvps = useCallback(async () => {
    setRsvpsLoading(true);
    try {
      const response = await fetch(`/api/admin/rsvps?eventId=${eventId}`);
      if (response.status === 401) {
        router.refresh();
        return;
      }
      if (response.ok) {
        const data = await response.json();
        setRsvps(data.rsvps || []);
      }
    } catch (e) {
      console.error('Error fetching RSVPs:', e);
    } finally {
      setRsvpsLoading(false);
    }
  }, [eventId, router]);

  useEffect(() => {
    fetchEvent();
  }, [fetchEvent]);

  useEffect(() => {
    void fetchRsvps();
    const intervalId = window.setInterval(() => {
      void fetchRsvps();
    }, 5000);

    return () => window.clearInterval(intervalId);
  }, [fetchRsvps]);

  // Header's "Ver invitación" link follows whichever event is open. Cleared
  // on unmount so navigating back to /admin doesn't leave it pointed at
  // this event indefinitely (SelectedEventProvider lives in the layout and
  // doesn't remount across /admin/* navigations).
  useEffect(() => {
    if (!event) return;
    setSelectedEventSlugInHeader(event.slug);
    return () => setSelectedEventSlugInHeader(null);
  }, [event, setSelectedEventSlugInHeader]);

  // Con los formularios en modal hace falta cerrarlos con Escape y evitar que
  // la página de atrás siga haciendo scroll mientras están abiertos.
  useEffect(() => {
    const anyModalOpen = showAddRsvpForm || activeKpiModal !== null;
    if (!anyModalOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (showAddRsvpForm) {
        resetRsvpForm();
      } else {
        setActiveKpiModal(null);
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [showAddRsvpForm, activeKpiModal]);

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
        setRsvps(current => current.filter(r => r.id !== rsvpId));
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

  const handleEditRsvp = (rsvp: RSVP) => {
    setEditingRsvpId(rsvp.id);
    setNewFamilyName(rsvp.familyName);
    setNewInvitedBy(rsvp.invitedBy);
    setNewInvitationSent(rsvp.invitationSent);
    setNewContactPhone(rsvp.contactPhone);
    setNewComments(rsvp.comments);
    setNewGuestsList(
      rsvp.guests.map((guest) => ({
        name: guest.name,
        isChild: guest.isChild,
        mealType: normalizeMealType(guest.mealType, guest.isChild),
        confirmed: guest.confirmed,
      }))
    );
    setTempGuestName('');
    setTempGuestType('adult');
    setTempGuestMeal(MEAL_ADULT);
    setRsvpAddError('');
    setShowAddRsvpForm(true);
  };

  const handleToggleInvitationSent = async (rsvp: RSVP) => {
    try {
      setRsvpActionLoadingId(rsvp.id);
      const response = await fetch('/api/admin/rsvps', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: rsvp.id,
          invitationSent: !rsvp.invitationSent,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'No fue posible actualizar la invitación.');
      }

      setRsvps((current) =>
        current.map((item) =>
          item.id === rsvp.id ? { ...item, invitationSent: data.rsvp?.invitationSent ?? !rsvp.invitationSent } : item
        )
      );
    } catch (error) {
      console.error(error);
      alert('No se pudo actualizar el estado de la invitación.');
    } finally {
      setRsvpActionLoadingId(null);
    }
  };

  const handleToggleGuestConfirmed = async (rsvpId: number, guestId: number, currentConfirmed: boolean | null) => {
    let nextConfirmed: boolean | null = null;
    if (currentConfirmed === null) {
      nextConfirmed = true;
    } else if (currentConfirmed === true) {
      nextConfirmed = false;
    } else {
      nextConfirmed = null;
    }

    try {
      const response = await fetch('/api/admin/rsvps', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          guestId,
          confirmed: nextConfirmed,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'No fue posible actualizar el estado del invitado.');
      }

      setRsvps((currentRsvps) =>
        currentRsvps.map((rsvp) => {
          if (rsvp.id === rsvpId) {
            return {
              ...rsvp,
              guests: rsvp.guests.map((g) =>
                g.id === guestId ? { ...g, confirmed: data.guest.confirmed } : g
              ),
            };
          }
          return rsvp;
        })
      );
    } catch (error) {
      console.error(error);
      alert('No se pudo actualizar el estado del invitado.');
    }
  };

  // El platillo se cambia sin abrir el formulario: es el dato que la cocina
  // ajusta a último momento (adultos que piden platillo de niño y viceversa).
  const handleToggleGuestMeal = async (rsvpId: number, guestId: number, currentMeal: MealType) => {
    const nextMeal: MealType = currentMeal === MEAL_CHILD ? MEAL_ADULT : MEAL_CHILD;

    try {
      setGuestMealLoadingId(guestId);
      const response = await fetch('/api/admin/rsvps', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          guestId,
          mealType: nextMeal,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'No fue posible actualizar el platillo del invitado.');
      }

      setRsvps((currentRsvps) =>
        currentRsvps.map((rsvp) => {
          if (rsvp.id === rsvpId) {
            return {
              ...rsvp,
              guests: rsvp.guests.map((g) =>
                g.id === guestId ? { ...g, mealType: normalizeMealType(data.guest.mealType, g.isChild) } : g
              ),
            };
          }
          return rsvp;
        })
      );
    } catch (error) {
      console.error(error);
      alert('No se pudo actualizar el platillo del invitado.');
    } finally {
      setGuestMealLoadingId(null);
    }
  };

  // RSVP Form Builder Handlers
  const handleUpdateGuest = (idx: number, updates: Partial<GuestInput>) => {
    setNewGuestsList((prev) => {
      const next = [...prev];
      const current = next[idx];
      const merged = { ...current, ...updates };
      if (updates.isChild !== undefined && updates.mealType === undefined) {
        merged.mealType = updates.isChild ? MEAL_CHILD : MEAL_ADULT;
      }
      next[idx] = merged;
      return next;
    });
  };

  const handleAddTempGuest = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!tempGuestName.trim()) {
      setRsvpAddError('Escribe el nombre del integrante para agregarlo.');
      return;
    }

    if (newGuestsList.some((g) => g.name.toLowerCase() === tempGuestName.trim().toLowerCase())) {
      setRsvpAddError('Este integrante ya fue agregado a la lista.');
      return;
    }

    setRsvpAddError('');
    setNewGuestsList((prev) => [
      ...prev,
      {
        name: tempGuestName.trim(),
        isChild: tempGuestType === 'child',
        mealType: tempGuestMeal,
        confirmed: null, // Pre-registered manual guests default to pending (null)
      },
    ]);
    setTempGuestName('');
  };

  const handleRemoveTempGuest = (idx: number) => {
    setNewGuestsList(newGuestsList.filter((_, i) => i !== idx));
  };

  const handleSaveRsvpManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!event) return;

    if (!newFamilyName.trim()) {
      setRsvpAddError('El nombre de la familia es requerido.');
      return;
    }

    if (!newInvitedBy.trim()) {
      setRsvpAddError('Selecciona el lado de la invitación (Papá, Mamá o Bebés).');
      return;
    }

    if (newGuestsList.length === 0) {
      setRsvpAddError('Agrega al menos un integrante a la familia.');
      return;
    }

    if (newGuestsList.some((g) => !g.name.trim())) {
      setRsvpAddError('Todos los integrantes deben tener nombre.');
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
          eventId: event.id,
          familyName: newFamilyName.trim(),
          invitedBy: newInvitedBy.trim(),
          invitationSent: newInvitationSent,
          contactPhone: newContactPhone.trim(),
          comments: newComments.trim(),
          guests: newGuestsList,
          rsvpId: editingRsvpId || undefined,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        resetRsvpForm();
        fetchRsvps();
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

  const handleExportCSV = () => {
    if (rsvps.length === 0 || !event) return;

    const headers = ['Familia', 'Invitados por', 'Invitación enviada', 'Telefono de Contacto', 'Nombre de Invitado', 'Tipo', 'Platillo', 'Asistirá', 'Mensaje/Comentarios', 'Fecha Confirmación'];

    const rows = rsvps.flatMap(rsvp =>
      rsvp.guests.map(guest => [
        rsvp.familyName,
        formatInvitedByLabel(rsvp.invitedBy),
        rsvp.invitationSent ? 'Sí' : 'No',
        rsvp.contactPhone || 'N/A',
        guest.name,
        guest.isChild ? 'Niño' : 'Adulto',
        MEAL_SHORT_LABEL[normalizeMealType(guest.mealType, guest.isChild)],
        guest.confirmed === true ? 'Sí' : guest.confirmed === false ? 'No' : 'Pendiente',
        rsvp.comments || '',
        new Date(rsvp.createdAt).toLocaleString('es-MX')
      ])
    );

    const csvContent = '﻿' + [
      headers.join(','),
      ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `confirmados_${event.slug}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const sourceFilteredRsvps = rsvps.filter((rsvp) => {
    if (rsvpInvitedByFilter === 'all') return true;
    return (rsvp.invitedBy || '').toLowerCase() === rsvpInvitedByFilter;
  });

  // Stats for Selected Event RSVPs
  const totalFamilies = sourceFilteredRsvps.length;
  let totalGuests = 0;
  let totalConfirmed = 0;
  let totalDeclined = 0;
  let totalAdultsConfirmed = 0;
  let totalChildrenConfirmed = 0;
  let totalAdultsDeclined = 0;
  let totalChildrenDeclined = 0;
  let totalAdults = 0;
  let totalChildren = 0;
  // Platillos: se cuentan por `mealType`, no por si el invitado es adulto o
  // niño, porque hay adultos que piden platillo de niño.
  let totalAdultMeals = 0;
  let totalChildMeals = 0;
  let totalAdultMealsConfirmed = 0;
  let totalChildMealsConfirmed = 0;
  let adultsWithChildMealConfirmed = 0;
  let childrenWithAdultMealConfirmed = 0;

  sourceFilteredRsvps.forEach(rsvp => {
    rsvp.guests.forEach(guest => {
      const mealType = normalizeMealType(guest.mealType, guest.isChild);
      totalGuests++;
      if (guest.isChild) {
        totalChildren++;
      } else {
        totalAdults++;
      }
      if (guest.confirmed !== false) {
        if (mealType === MEAL_CHILD) {
          totalChildMeals++;
        } else {
          totalAdultMeals++;
        }
      }
      if (guest.confirmed === true) {
        totalConfirmed++;
        if (mealType === MEAL_CHILD) {
          totalChildMealsConfirmed++;
          if (!guest.isChild) adultsWithChildMealConfirmed++;
        } else {
          totalAdultMealsConfirmed++;
          if (guest.isChild) childrenWithAdultMealConfirmed++;
        }
        if (guest.isChild) {
          totalChildrenConfirmed++;
        } else {
          totalAdultsConfirmed++;
        }
      } else if (guest.confirmed === false) {
        totalDeclined++;
        if (guest.isChild) {
          totalChildrenDeclined++;
        } else {
          totalAdultsDeclined++;
        }
      }
    });
  });

  const effectiveTotalGuests = totalGuests - totalDeclined;
  const effectiveTotalAdults = totalAdults - totalAdultsDeclined;
  const effectiveTotalChildren = totalChildren - totalChildrenDeclined;

  // Dynamic counts for origin/side filters
  const sideCounts = useMemo(() => {
    const counts = { all: rsvps.length, papa: 0, mama: 0, bebes: 0 };
    rsvps.forEach((r) => {
      const side = (r.invitedBy || '').toLowerCase();
      if (side === 'papa') counts.papa++;
      else if (side === 'mama') counts.mama++;
      else if (side === 'bebes') counts.bebes++;
    });
    return counts;
  }, [rsvps]);

  // Dynamic counts for status filters (within selected side)
  const statusCounts = useMemo(() => {
    const counts = { all: sourceFilteredRsvps.length, confirmed: 0, pending: 0, declined: 0 };
    sourceFilteredRsvps.forEach((r) => {
      const st = getFamilyRsvpStatus(r).key;
      if (st === 'confirmed') counts.confirmed++;
      else if (st === 'pending') counts.pending++;
      else if (st === 'declined') counts.declined++;
    });
    return counts;
  }, [sourceFilteredRsvps]);

  // Dynamic counts for invitation filters (within selected side)
  const invitationCounts = useMemo(() => {
    const counts = { all: sourceFilteredRsvps.length, sent: 0, pending: 0 };
    sourceFilteredRsvps.forEach((r) => {
      if (r.invitationSent) counts.sent++;
      else counts.pending++;
    });
    return counts;
  }, [sourceFilteredRsvps]);

  const filteredRsvps = useMemo(() => {
    return sourceFilteredRsvps.filter((rsvp) => {
      const searchLower = rsvpSearchTerm.toLowerCase().trim();
      const familyMatch = rsvp.familyName.toLowerCase().includes(searchLower);
      const phoneMatch = (rsvp.contactPhone || '').toLowerCase().includes(searchLower);
      const guestMatch = rsvp.guests.some((g) => g.name.toLowerCase().includes(searchLower));
      const matchesSearch = !searchLower || familyMatch || phoneMatch || guestMatch;
      const familyStatus = getFamilyRsvpStatus(rsvp);
      const matchesStatus =
        rsvpStatusFilter === 'all' ? true : familyStatus.key === rsvpStatusFilter;
      const matchesInvitation =
        rsvpInvitationFilter === 'all'
          ? true
          : rsvpInvitationFilter === 'sent'
          ? rsvp.invitationSent
          : !rsvp.invitationSent;

      return matchesSearch && matchesStatus && matchesInvitation;
    });
  }, [sourceFilteredRsvps, rsvpSearchTerm, rsvpStatusFilter, rsvpInvitationFilter]);

  const isAnyFilterActive =
    rsvpSearchTerm.trim() !== '' ||
    rsvpInvitedByFilter !== 'all' ||
    rsvpStatusFilter !== 'all' ||
    rsvpInvitationFilter !== 'all';

  const handleClearAllFilters = () => {
    setRsvpSearchTerm('');
    setRsvpInvitedByFilter('all');
    setRsvpStatusFilter('all');
    setRsvpInvitationFilter('all');
    setRsvpPageIndex(1);
  };

  const paginatedRsvps = useMemo(
    () => paginateData(filteredRsvps, rsvpPageIndex, rsvpPageSize),
    [filteredRsvps, rsvpPageIndex, rsvpPageSize]
  );

  if (eventNotFound) {
    return (
      <div className="admin-container" style={{ textAlign: 'center', padding: '4rem 1rem' }}>
        <h2 style={{ color: 'var(--gold-dark)' }}>Evento no encontrado</h2>
        <Link href="/admin" className="btn-outline" style={{ marginTop: '1rem', display: 'inline-flex' }}>Volver a Eventos</Link>
      </div>
    );
  }

  if (eventLoading || !event) {
    return (
      <div className="admin-container" style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-muted)' }}>
        <RefreshCw size={28} style={{ animation: 'spin 1.5s linear infinite' }} />
        <p style={{ marginTop: '0.8rem' }}>Cargando invitados...</p>
      </div>
    );
  }

  return (
    <div className="admin-container">
        <section>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '0.8rem' }}>
            <div>
              <span className="guest-type-tag">Invitados Confirmados</span>
              <h2 style={{ fontSize: '1.8rem', color: 'var(--gold-dark)', marginTop: '0.2rem', margin: 0 }}>
                {event.celebrantName} - {event.title}
              </h2>
            </div>
            <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
              <Link href="/admin" className="btn-outline" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                <ChevronLeft size={16} />
                Volver a Eventos
              </Link>
              <Link href={`/admin/mesas/${event.id}`} className="btn-gold" style={{ textDecoration: 'none' }}>
                <MapPin size={16} />
                Organizar Mesas
              </Link>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="stats-grid" style={{ marginBottom: '2rem' }}>
            <div 
              className="stat-card kpi-card-clickable" 
              onClick={() => { setActiveKpiModal('families'); setKpiModalSearch(''); }}
              title="Haz clic para ver el desglose de familias"
            >
              <div className="stat-value">{totalFamilies}</div>
              <div className="stat-label">Familias Registradas</div>
              <Users size={18} style={{ color: 'var(--gold-medium)', marginTop: '8px' }} />
              <div style={{ fontSize: '0.72rem', color: 'var(--gold-dark)', marginTop: '6px', fontWeight: 600 }}>
                Ver Lista ➔
              </div>
            </div>

            <div 
              className="stat-card kpi-card-clickable" 
              onClick={() => { setActiveKpiModal('all_confirmed'); setKpiModalSearch(''); }}
              title="Haz clic para ver los invitados confirmados"
            >
              <div className="stat-value">
                {totalConfirmed} <span style={{ fontSize: '1.2rem', color: 'var(--text-muted)' }}>/ {effectiveTotalGuests}</span>
              </div>
              <div className="stat-label">Total Invitados (Asisten)</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                Confirmados / Totales Netos
              </div>
              {totalDeclined > 0 ? (
                <div style={{ fontSize: '0.75rem', color: '#dc2626', marginTop: '4px', fontWeight: 600 }}>
                  -{totalDeclined} no asistirán (Orig. {totalGuests})
                </div>
              ) : (
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Sin bajas registradas
                </div>
              )}
              <div style={{ fontSize: '0.72rem', color: 'var(--gold-dark)', marginTop: '6px', fontWeight: 600 }}>
                Ver Confirmados ➔
              </div>
            </div>

            <div 
              className="stat-card kpi-card-clickable" 
              onClick={() => { setActiveKpiModal('adults_confirmed'); setKpiModalSearch(''); }}
              title="Haz clic para ver los adultos confirmados"
            >
              <div className="stat-value">
                {totalAdultsConfirmed} <span style={{ fontSize: '1.2rem', color: 'var(--text-muted)' }}>/ {effectiveTotalAdults}</span>
              </div>
              <div className="stat-label">Adultos (Asisten)</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                Confirmados / Totales Netos
              </div>
              {totalAdultsDeclined > 0 ? (
                <div style={{ fontSize: '0.75rem', color: '#dc2626', marginTop: '4px', fontWeight: 600 }}>
                  -{totalAdultsDeclined} no asistirán (Orig. {totalAdults})
                </div>
              ) : (
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Sin bajas registradas
                </div>
              )}
              <div style={{ fontSize: '0.72rem', color: 'var(--gold-dark)', marginTop: '6px', fontWeight: 600 }}>
                Ver Adultos ➔
              </div>
            </div>

            <div 
              className="stat-card kpi-card-clickable" 
              onClick={() => { setActiveKpiModal('children_confirmed'); setKpiModalSearch(''); }}
              title="Haz clic para ver los niños confirmados"
            >
              <div className="stat-value">
                {totalChildrenConfirmed} <span style={{ fontSize: '1.2rem', color: 'var(--text-muted)' }}>/ {effectiveTotalChildren}</span>
              </div>
              <div className="stat-label">👶 Niños (Asisten)</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                Confirmados / Totales Netos
              </div>
              {totalChildrenDeclined > 0 ? (
                <div style={{ fontSize: '0.75rem', color: '#dc2626', marginTop: '4px', fontWeight: 600 }}>
                  -{totalChildrenDeclined} no asistirán (Orig. {totalChildren})
                </div>
              ) : (
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Sin bajas registradas
                </div>
              )}
              <div style={{ fontSize: '0.72rem', color: 'var(--gold-dark)', marginTop: '6px', fontWeight: 600 }}>
                Ver Niños ➔
              </div>
            </div>

            <div
              className="stat-card kpi-card-clickable"
              onClick={() => { setActiveKpiModal('adult_meals'); setKpiModalSearch(''); }}
              title="Haz clic para ver quién consumirá menú"
            >
              <div className="stat-value">
                {totalAdultMealsConfirmed} <span style={{ fontSize: '1.2rem', color: 'var(--text-muted)' }}>/ {totalAdultMeals}</span>
              </div>
              <div className="stat-label">🍽️ Menús</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                Confirmados / Esperados Netos
              </div>
              {childrenWithAdultMealConfirmed > 0 ? (
                <div style={{ fontSize: '0.75rem', color: '#2563eb', marginTop: '4px', fontWeight: 600 }}>
                  Incluye {childrenWithAdultMealConfirmed} niño{childrenWithAdultMealConfirmed === 1 ? '' : 's'} con menú
                </div>
              ) : (
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Todos son adultos
                </div>
              )}
              <div style={{ fontSize: '0.72rem', color: 'var(--gold-dark)', marginTop: '6px', fontWeight: 600 }}>
                Ver Menús ➔
              </div>
            </div>

            <div
              className="stat-card kpi-card-clickable"
              onClick={() => { setActiveKpiModal('child_meals'); setKpiModalSearch(''); }}
              title="Haz clic para ver quién consumirá hamburguesa"
            >
              <div className="stat-value">
                {totalChildMealsConfirmed} <span style={{ fontSize: '1.2rem', color: 'var(--text-muted)' }}>/ {totalChildMeals}</span>
              </div>
              <div className="stat-label">🍔 Hamburguesas</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                Confirmadas / Esperadas Netas
              </div>
              {adultsWithChildMealConfirmed > 0 ? (
                <div style={{ fontSize: '0.75rem', color: '#c2410c', marginTop: '4px', fontWeight: 600 }}>
                  Incluye {adultsWithChildMealConfirmed} adulto{adultsWithChildMealConfirmed === 1 ? '' : 's'} con hamburguesa
                </div>
              ) : (
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Todos son niños
                </div>
              )}
              <div style={{ fontSize: '0.72rem', color: 'var(--gold-dark)', marginTop: '6px', fontWeight: 600 }}>
                Ver Hamburguesas ➔
              </div>
            </div>

            <div 
              className="stat-card kpi-card-clickable" 
              onClick={() => { setActiveKpiModal('declined'); setKpiModalSearch(''); }}
              style={{ borderColor: totalDeclined > 0 ? '#fca5a5' : undefined }}
              title="Haz clic para ver los invitados que no asistirán"
            >
              <div className="stat-value" style={{ color: totalDeclined > 0 ? '#dc2626' : undefined }}>
                {totalDeclined} <span style={{ fontSize: '1.2rem', color: 'var(--text-muted)' }}>/ {totalGuests}</span>
              </div>
              <div className="stat-label">No Asistirán</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                Descontados del Total
              </div>
              <UserX size={18} style={{ color: totalDeclined > 0 ? '#dc2626' : 'var(--gold-medium)', marginTop: '8px' }} />
              <div style={{ fontSize: '0.72rem', color: totalDeclined > 0 ? '#dc2626' : 'var(--gold-dark)', marginTop: '6px', fontWeight: 600 }}>
                Ver Bajas ➔
              </div>
            </div>
          </div>

          {/* Modal de alta / edición de familias */}
          {showAddRsvpForm && (
            <div
              className="rsvp-modal-overlay"
              onClick={(e) => {
                if (e.target === e.currentTarget) resetRsvpForm();
              }}
            >
              <div className="rsvp-modal-card" role="dialog" aria-modal="true" aria-labelledby="rsvp-modal-title">
                {/* 1. Modal Header */}
                <div className="rsvp-modal-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div className="rsvp-modal-icon-badge">
                      {editingRsvpId ? (
                        <Edit size={22} style={{ color: 'var(--gold-dark)' }} />
                      ) : (
                        <Plus size={22} style={{ color: 'var(--gold-dark)' }} />
                      )}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <h3 id="rsvp-modal-title" className="rsvp-modal-title">
                          {editingRsvpId ? 'Editar Familia' : 'Registrar Familia'}
                        </h3>
                        {editingRsvpId ? (
                          <span className="rsvp-modal-tag">ID #{editingRsvpId}</span>
                        ) : (
                          <span className="rsvp-modal-tag new">Nueva</span>
                        )}
                      </div>
                      <p className="rsvp-modal-subtitle">
                        {editingRsvpId
                          ? 'Gestiona datos de contacto, integrantes, platillos y confirmación.'
                          : 'Captura los datos de la familia, sus integrantes y requerimientos.'}
                      </p>
                    </div>
                  </div>

                  {/* Header Summary & Close */}
                  <div className="rsvp-header-summary">
                    <div className="rsvp-header-stat">
                      <Users size={14} style={{ color: 'var(--gold-dark)' }} />
                      <span>{newGuestsList.length} {newGuestsList.length === 1 ? 'persona' : 'personas'}</span>
                    </div>
                    <div className="rsvp-header-stat">
                      <span>🍽️ {newGuestsList.filter(g => g.mealType === MEAL_ADULT).length}</span>
                      <span style={{ color: '#cbd5e1' }}>·</span>
                      <span>🍔 {newGuestsList.filter(g => g.mealType === MEAL_CHILD).length}</span>
                    </div>
                    <button
                      type="button"
                      onClick={resetRsvpForm}
                      className="rsvp-modal-close"
                      title="Cerrar modal"
                      aria-label="Cerrar"
                    >
                      <X size={20} />
                    </button>
                  </div>
                </div>

                {/* 2. Form Body */}
                <form onSubmit={handleSaveRsvpManual} className="rsvp-modal-form">
                  <div className="rsvp-modal-body">
                    {/* Error Banner */}
                    {rsvpAddError && (
                      <div className="rsvp-modal-error-banner">
                        <Info size={18} style={{ flexShrink: 0 }} />
                        <span>{rsvpAddError}</span>
                      </div>
                    )}

                    {/* SECTION 1: DATOS GENERALES */}
                    <div className="rsvp-modal-section">
                      <div className="rsvp-modal-section-title">
                        <Users size={16} />
                        <span>1. Datos de la Familia</span>
                      </div>

                      <div className="rsvp-family-grid">
                        {/* Nombre de Familia */}
                        <div>
                          <label className="rsvp-modern-label" htmlFor="manual-family-name">
                            Nombre de la Familia <span style={{ color: '#dc2626' }}>*</span>
                          </label>
                          <div className="rsvp-input-wrapper">
                            <Users size={16} className="rsvp-input-icon" />
                            <input
                              id="manual-family-name"
                              type="text"
                              className="rsvp-modern-input"
                              placeholder="Ej: Familia Morales Vega"
                              value={newFamilyName}
                              onChange={(e) => setNewFamilyName(e.target.value)}
                              required
                            />
                          </div>
                        </div>

                        {/* Teléfono de Contacto */}
                        <div>
                          <label className="rsvp-modern-label" htmlFor="manual-contact-phone">
                            Teléfono de Contacto (WhatsApp)
                          </label>
                          <div className="rsvp-input-wrapper">
                            <Phone size={16} className="rsvp-input-icon" />
                            <input
                              id="manual-contact-phone"
                              type="tel"
                              className="rsvp-modern-input"
                              placeholder="Ej: (55) 1234-5678"
                              value={newContactPhone}
                              onChange={(e) => setNewContactPhone(formatMexicanPhone(e.target.value))}
                            />
                          </div>
                        </div>

                        {/* Lado de Invitación */}
                        <div>
                          <label className="rsvp-modern-label">
                            Lado de Invitación <span style={{ color: '#dc2626' }}>*</span>
                          </label>
                          <div className="rsvp-segmented-pills">
                            <button
                              type="button"
                              className={`rsvp-segmented-pill ${newInvitedBy === 'papa' ? 'active' : ''}`}
                              onClick={() => setNewInvitedBy('papa')}
                            >
                              👨 Papá
                            </button>
                            <button
                              type="button"
                              className={`rsvp-segmented-pill ${newInvitedBy === 'mama' ? 'active' : ''}`}
                              onClick={() => setNewInvitedBy('mama')}
                            >
                              👩 Mamá
                            </button>
                            <button
                              type="button"
                              className={`rsvp-segmented-pill ${newInvitedBy === 'bebes' ? 'active' : ''}`}
                              onClick={() => setNewInvitedBy('bebes')}
                            >
                              👶 Bebés
                            </button>
                            {newInvitedBy && !['papa', 'mama', 'bebes'].includes(newInvitedBy) && (
                              <button
                                type="button"
                                className="rsvp-segmented-pill active"
                              >
                                ✨ {newInvitedBy}
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Estado de Invitación */}
                        <div>
                          <label className="rsvp-modern-label">
                            Estatus de Invitación
                          </label>
                          <button
                            type="button"
                            onClick={() => setNewInvitationSent(!newInvitationSent)}
                            className={`rsvp-invitation-toggle-card ${newInvitationSent ? 'sent' : 'pending'}`}
                          >
                            <div className="rsvp-toggle-icon">
                              <Send size={15} />
                            </div>
                            <div className="rsvp-toggle-info">
                              <div className="rsvp-toggle-title">
                                {newInvitationSent ? 'Invitación enviada' : 'Invitación pendiente'}
                              </div>
                              <div className="rsvp-toggle-desc">
                                {newInvitationSent ? 'Enlace entregado a la familia' : 'Aún no se envía la invitación'}
                              </div>
                            </div>
                            <div className={`rsvp-toggle-switch ${newInvitationSent ? 'active' : ''}`}>
                              <span className="rsvp-toggle-slider" />
                            </div>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* SECTION 2: INTEGRANTES Y PLATILLOS */}
                    <div className="rsvp-modal-section">
                      <div className="rsvp-modal-section-header">
                        <div className="rsvp-modal-section-title">
                          <Utensils size={16} />
                          <span>2. Integrantes y Platillos ({newGuestsList.length})</span>
                        </div>
                        
                        <div className="rsvp-members-quick-stats">
                          <span className="rsvp-stat-chip">
                            👨 {newGuestsList.filter(g => !g.isChild).length} adultos
                          </span>
                          <span className="rsvp-stat-chip">
                            👶 {newGuestsList.filter(g => g.isChild).length} niños
                          </span>
                          <span className="rsvp-stat-chip gold">
                            🍽️ {newGuestsList.filter(g => g.mealType === MEAL_ADULT).length} menús / 🍔 {newGuestsList.filter(g => g.mealType === MEAL_CHILD).length} hamburguesas
                          </span>
                        </div>
                      </div>

                      {/* Lista de Integrantes */}
                      <div className="rsvp-guests-container">
                        {newGuestsList.length === 0 ? (
                          <div className="rsvp-guests-empty">
                            <Users size={32} style={{ opacity: 0.4 }} />
                            <p>Aún no hay integrantes registrados en esta familia.</p>
                            <span>Agrega al menos una persona usando el formulario inferior.</span>
                          </div>
                        ) : (
                          newGuestsList.map((g, idx) => {
                            const mismatch = isMealMismatch(g.isChild, g.mealType);
                            return (
                              <div key={idx} className="guest-item-card-refined">
                                <div className="guest-card-top-row">
                                  <div className="guest-index-badge">#{idx + 1}</div>
                                  <input
                                    type="text"
                                    className="rsvp-modern-input guest-name-input"
                                    value={g.name}
                                    onChange={(e) => handleUpdateGuest(idx, { name: e.target.value })}
                                    placeholder="Nombre completo del integrante"
                                    required
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveTempGuest(idx)}
                                    className="guest-remove-btn"
                                    title="Eliminar integrante"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>

                                <div className="guest-card-bottom-row">
                                  {/* Selector Tipo */}
                                  <div className="guest-control-group">
                                    <span className="guest-control-label">Tipo:</span>
                                    <div className="guest-mini-toggle">
                                      <button
                                        type="button"
                                        className={`guest-mini-btn ${!g.isChild ? 'active' : ''}`}
                                        onClick={() => handleUpdateGuest(idx, { isChild: false })}
                                      >
                                        👨 Adulto
                                      </button>
                                      <button
                                        type="button"
                                        className={`guest-mini-btn ${g.isChild ? 'active' : ''}`}
                                        onClick={() => handleUpdateGuest(idx, { isChild: true })}
                                      >
                                        👶 Niño
                                      </button>
                                    </div>
                                  </div>

                                  {/* Selector Comida */}
                                  <div className="guest-control-group">
                                    <span className="guest-control-label">Comida:</span>
                                    <div className="guest-mini-toggle">
                                      <button
                                        type="button"
                                        className={`guest-mini-btn ${g.mealType === MEAL_ADULT ? 'active' : ''}`}
                                        onClick={() => handleUpdateGuest(idx, { mealType: MEAL_ADULT })}
                                      >
                                        🍽️ Menú
                                      </button>
                                      <button
                                        type="button"
                                        className={`guest-mini-btn ${g.mealType === MEAL_CHILD ? 'active' : ''}`}
                                        onClick={() => handleUpdateGuest(idx, { mealType: MEAL_CHILD })}
                                      >
                                        🍔 Hamburguesa
                                      </button>
                                    </div>
                                    {mismatch && (
                                      <span
                                        className="guest-mismatch-badge"
                                        title={g.isChild ? 'Niño consumirá menú de adulto' : 'Adulto consumirá hamburguesa'}
                                      >
                                        ⚠️ Especial
                                      </span>
                                    )}
                                  </div>

                                  {/* Selector Asistencia Tri-State */}
                                  <div className="guest-control-group guest-status-group">
                                    <span className="guest-control-label">Asistencia:</span>
                                    <div className="guest-status-toggle">
                                      <button
                                        type="button"
                                        className={`guest-status-pill pending ${g.confirmed === null ? 'active' : ''}`}
                                        onClick={() => handleUpdateGuest(idx, { confirmed: null })}
                                        title="Pendiente de confirmación"
                                      >
                                        ⏳ Pendiente
                                      </button>
                                      <button
                                        type="button"
                                        className={`guest-status-pill confirmed ${g.confirmed === true ? 'active' : ''}`}
                                        onClick={() => handleUpdateGuest(idx, { confirmed: true })}
                                        title="Asistirá al evento"
                                      >
                                        ✅ Asistirá
                                      </button>
                                      <button
                                        type="button"
                                        className={`guest-status-pill declined ${g.confirmed === false ? 'active' : ''}`}
                                        onClick={() => handleUpdateGuest(idx, { confirmed: false })}
                                        title="No asistirá"
                                      >
                                        ❌ No asistirá
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>

                      {/* Quick Add Guest Box */}
                      <div className="guest-builder-card">
                        <div className="guest-builder-title">
                          <Plus size={15} />
                          <span>Agregar integrante a esta familia</span>
                        </div>
                        <div className="guest-builder-grid">
                          <div className="guest-builder-input-col">
                            <input
                              type="text"
                              className="rsvp-modern-input"
                              placeholder="Nombre completo (ej. Mariana Morales)..."
                              value={tempGuestName}
                              onChange={(e) => setTempGuestName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleAddTempGuest();
                                }
                              }}
                            />
                            <span className="guest-builder-hint">Presiona Enter para agregar rápidamente</span>
                          </div>

                          <div className="guest-builder-controls">
                            <div className="guest-mini-toggle">
                              <button
                                type="button"
                                className={`guest-mini-btn ${tempGuestType === 'adult' ? 'active' : ''}`}
                                onClick={() => {
                                  setTempGuestType('adult');
                                  setTempGuestMeal(MEAL_ADULT);
                                }}
                              >
                                👨 Adulto
                              </button>
                              <button
                                type="button"
                                className={`guest-mini-btn ${tempGuestType === 'child' ? 'active' : ''}`}
                                onClick={() => {
                                  setTempGuestType('child');
                                  setTempGuestMeal(MEAL_CHILD);
                                }}
                              >
                                👶 Niño
                              </button>
                            </div>

                            <div className="guest-mini-toggle">
                              <button
                                type="button"
                                className={`guest-mini-btn ${tempGuestMeal === MEAL_ADULT ? 'active' : ''}`}
                                onClick={() => setTempGuestMeal(MEAL_ADULT)}
                              >
                                🍽️ Menú
                              </button>
                              <button
                                type="button"
                                className={`guest-mini-btn ${tempGuestMeal === MEAL_CHILD ? 'active' : ''}`}
                                onClick={() => setTempGuestMeal(MEAL_CHILD)}
                              >
                                🍔 Hamburguesa
                              </button>
                            </div>

                            <button
                              type="button"
                              onClick={(e) => handleAddTempGuest(e)}
                              className="btn-gold guest-builder-add-btn"
                            >
                              <Plus size={16} />
                              Agregar
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* SECTION 3: NOTAS Y OBSERVACIONES */}
                    <div className="rsvp-modal-section">
                      <div className="rsvp-modal-section-title">
                        <Info size={16} />
                        <span>3. Notas, Alergias o Solicitudes Especiales</span>
                      </div>
                      <div style={{ marginBottom: 0 }}>
                        <textarea
                          id="manual-comments"
                          className="rsvp-modern-textarea"
                          placeholder="Alergias alimentarias, solicitudes de mesa, comentarios o notas de la familia..."
                          value={newComments}
                          onChange={(e) => setNewComments(e.target.value)}
                          rows={2}
                        />
                      </div>
                    </div>
                  </div>

                  {/* 3. Sticky Footer */}
                  <div className="rsvp-modal-footer">
                    <div className="rsvp-footer-summary">
                      <span>
                        Total: <strong>{newGuestsList.length}</strong> {newGuestsList.length === 1 ? 'persona' : 'personas'} (
                        {newGuestsList.filter(g => !g.isChild).length} adultos, {newGuestsList.filter(g => g.isChild).length} niños
                      )
                      </span>
                      <span className="rsvp-footer-dot">·</span>
                      <span>
                        <strong style={{ color: '#15803d' }}>{newGuestsList.filter(g => g.confirmed === true).length}</strong> confirmados
                      </span>
                    </div>

                    <div className="rsvp-footer-actions">
                      <button
                        type="button"
                        onClick={resetRsvpForm}
                        className="btn-outline"
                      >
                        Cancelar
                      </button>

                      <button
                        type="submit"
                        className="btn-gold"
                        disabled={rsvpAddLoading}
                      >
                        <Save size={16} />
                        {rsvpAddLoading ? 'Guardando...' : editingRsvpId ? 'Guardar Cambios' : 'Guardar Familia'}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Metronic v9 Unified Filter Toolbar */}
          <div className="filter-toolbar-card">
            {/* Primary Row: Search & Actions */}
            <div className="toolbar-primary-row">
              <div className="toolbar-search-wrapper">
                <Search className="toolbar-search-icon" size={15} />
                <input
                  type="text"
                  className="toolbar-search-input"
                  placeholder="Buscar familia, invitado o teléfono..."
                  value={rsvpSearchTerm}
                  onChange={(e) => {
                    setRsvpSearchTerm(e.target.value);
                    setRsvpPageIndex(1);
                  }}
                />
                {rsvpSearchTerm && (
                  <button
                    type="button"
                    onClick={() => {
                      setRsvpSearchTerm('');
                      setRsvpPageIndex(1);
                    }}
                    className="toolbar-search-clear"
                    title="Limpiar búsqueda"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Lado Origin Selector (Row 1) */}
              <div className="filter-chip-track">
                <button
                  type="button"
                  className={`filter-chip-btn ${rsvpInvitedByFilter === 'all' ? 'active' : ''}`}
                  onClick={() => {
                    setRsvpInvitedByFilter('all');
                    setRsvpPageIndex(1);
                  }}
                >
                  <span>Todos</span>
                  <span className="filter-chip-count">{sideCounts.all}</span>
                </button>
                <button
                  type="button"
                  className={`filter-chip-btn ${rsvpInvitedByFilter === 'papa' ? 'active' : ''}`}
                  onClick={() => {
                    setRsvpInvitedByFilter('papa');
                    setRsvpPageIndex(1);
                  }}
                >
                  <span>Papá</span>
                  <span className="filter-chip-count">{sideCounts.papa}</span>
                </button>
                <button
                  type="button"
                  className={`filter-chip-btn ${rsvpInvitedByFilter === 'mama' ? 'active' : ''}`}
                  onClick={() => {
                    setRsvpInvitedByFilter('mama');
                    setRsvpPageIndex(1);
                  }}
                >
                  <span>Mamá</span>
                  <span className="filter-chip-count">{sideCounts.mama}</span>
                </button>
                <button
                  type="button"
                  className={`filter-chip-btn ${rsvpInvitedByFilter === 'bebes' ? 'active' : ''}`}
                  onClick={() => {
                    setRsvpInvitedByFilter('bebes');
                    setRsvpPageIndex(1);
                  }}
                >
                  <span>Bebés</span>
                  <span className="filter-chip-count">{sideCounts.bebes}</span>
                </button>
              </div>

              {/* Action Buttons */}
              <div className="toolbar-actions">
                <button
                  onClick={() => {
                    resetRsvpForm();
                    setShowAddRsvpForm(true);
                  }}
                  className="btn-gold"
                  style={{ height: '36px', padding: '0 0.9rem', fontSize: '0.8rem' }}
                >
                  <Plus size={15} />
                  Nueva Familia
                </button>
                <button
                  onClick={handleExportCSV}
                  className="btn-outline"
                  disabled={rsvps.length === 0}
                  style={{ height: '36px', padding: '0 0.85rem', fontSize: '0.8rem' }}
                  title="Descargar CSV"
                >
                  <Download size={14} />
                  Exportar
                </button>
                <button
                  onClick={() => fetchRsvps()}
                  className="btn-outline"
                  disabled={rsvpsLoading}
                  style={{ height: '36px', width: '36px', padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                  title="Actualizar datos"
                >
                  <RefreshCw size={14} className={rsvpsLoading ? 'animate-spin' : ''} />
                </button>
              </div>
            </div>

            {/* Secondary Row: Attendance & Invitation Status + Active Filter Summary */}
            <div className="toolbar-secondary-row">
              <div className="toolbar-filters-group">
                {/* Attendance Filter Track */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Asistencia:
                  </span>
                  <div className="filter-chip-track">
                    <button
                      type="button"
                      className={`filter-chip-btn ${rsvpStatusFilter === 'all' ? 'active' : ''}`}
                      onClick={() => {
                        setRsvpStatusFilter('all');
                        setRsvpPageIndex(1);
                      }}
                    >
                      <span>Todas</span>
                    </button>
                    <button
                      type="button"
                      className={`filter-chip-btn ${rsvpStatusFilter === 'confirmed' ? 'active' : ''}`}
                      onClick={() => {
                        setRsvpStatusFilter('confirmed');
                        setRsvpPageIndex(1);
                      }}
                    >
                      <span>✓ Asisten</span>
                      <span className="filter-chip-count">{statusCounts.confirmed}</span>
                    </button>
                    <button
                      type="button"
                      className={`filter-chip-btn ${rsvpStatusFilter === 'pending' ? 'active' : ''}`}
                      onClick={() => {
                        setRsvpStatusFilter('pending');
                        setRsvpPageIndex(1);
                      }}
                    >
                      <span>○ Pendientes</span>
                      <span className="filter-chip-count">{statusCounts.pending}</span>
                    </button>
                    <button
                      type="button"
                      className={`filter-chip-btn ${rsvpStatusFilter === 'declined' ? 'active' : ''}`}
                      onClick={() => {
                        setRsvpStatusFilter('declined');
                        setRsvpPageIndex(1);
                      }}
                    >
                      <span>✗ No asisten</span>
                      <span className="filter-chip-count">{statusCounts.declined}</span>
                    </button>
                  </div>
                </div>

                <div className="toolbar-divider" />

                {/* Invitation Sent Filter Track */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Invitación:
                  </span>
                  <div className="filter-chip-track">
                    <button
                      type="button"
                      className={`filter-chip-btn ${rsvpInvitationFilter === 'all' ? 'active' : ''}`}
                      onClick={() => {
                        setRsvpInvitationFilter('all');
                        setRsvpPageIndex(1);
                      }}
                    >
                      <span>Todas</span>
                    </button>
                    <button
                      type="button"
                      className={`filter-chip-btn ${rsvpInvitationFilter === 'sent' ? 'active' : ''}`}
                      onClick={() => {
                        setRsvpInvitationFilter('sent');
                        setRsvpPageIndex(1);
                      }}
                    >
                      <span>✓ Enviadas</span>
                      <span className="filter-chip-count">{invitationCounts.sent}</span>
                    </button>
                    <button
                      type="button"
                      className={`filter-chip-btn ${rsvpInvitationFilter === 'pending' ? 'active' : ''}`}
                      onClick={() => {
                        setRsvpInvitationFilter('pending');
                        setRsvpPageIndex(1);
                      }}
                    >
                      <span>○ Por enviar</span>
                      <span className="filter-chip-count">{invitationCounts.pending}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Active Filter Summary or Reset Button */}
              {isAnyFilterActive ? (
                <div className="filter-summary-pill">
                  <span>
                    Mostrando <strong>{filteredRsvps.length}</strong> de <strong>{rsvps.length}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={handleClearAllFilters}
                    className="filter-reset-btn"
                    title="Restablecer todos los filtros"
                  >
                    <X size={12} /> Limpiar filtros
                  </button>
                </div>
              ) : (
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginLeft: 'auto' }}>
                  Total: {rsvps.length} familias
                </div>
              )}
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
                      <th style={{ width: '26%' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Users size={13} style={{ color: '#64748b' }} />
                          <span>Familia & Estado</span>
                        </div>
                      </th>
                      <th style={{ width: '14%' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Phone size={13} style={{ color: '#64748b' }} />
                          <span>Contacto</span>
                        </div>
                      </th>
                      <th style={{ width: '12%', textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                          <Mail size={13} style={{ color: '#64748b' }} />
                          <span>Invitación</span>
                        </div>
                      </th>
                      <th style={{ width: '31%' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Utensils size={13} style={{ color: '#64748b' }} />
                          <span>Integrantes & Menú</span>
                        </div>
                      </th>
                      <th style={{ width: '9%' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <MessageSquare size={13} style={{ color: '#64748b' }} />
                          <span>Notas</span>
                        </div>
                      </th>
                      <th style={{ width: '8%', textAlign: 'center' }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedRsvps.data.map((rsvp) => {
                      const familyStatus = getFamilyRsvpStatus(rsvp);
                      const familyInitials = (() => {
                        const parts = rsvp.familyName.replace(/^familia\s+/i, '').trim().split(/\s+/).filter(Boolean);
                        if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
                        return (rsvp.familyName.trim().slice(0, 2) || 'FM').toUpperCase();
                      })();
                      const sideClass = rsvp.invitedBy === 'PAPA' ? 'papa' : rsvp.invitedBy === 'MAMA' ? 'mama' : 'bebes';

                      return (
                        <tr key={rsvp.id}>
                          {/* 1. Familia & Estado */}
                          <td>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                              <div className={`family-avatar ${sideClass}`} title={`Familia · Lado ${formatInvitedByLabel(rsvp.invitedBy)}`}>
                                {familyInitials}
                              </div>
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontWeight: 700, color: 'var(--text-dark)', fontSize: '0.92rem', lineHeight: '1.25' }}>
                                  {rsvp.familyName}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '5px', marginTop: '0.3rem' }}>
                                  <span className={`status-badge ${familyStatus.className}`} style={{ fontSize: '0.66rem', padding: '0.15rem 0.5rem' }}>
                                    {familyStatus.label}
                                  </span>
                                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                    {familyStatus.summary}
                                  </span>
                                </div>
                                <div style={{ fontSize: '0.68rem', color: '#475569', marginTop: '0.25rem' }}>
                                  Lado: <strong style={{ color: '#475569' }}>{formatInvitedByLabel(rsvp.invitedBy)}</strong> · {new Date(rsvp.createdAt).toLocaleDateString('es-MX')}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* 2. Contacto / WhatsApp */}
                          <td>
                            {rsvp.contactPhone ? (
                              <a 
                                href={`https://wa.me/${rsvp.contactPhone.replace(/\D/g, '')}`} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                style={{ 
                                  display: 'inline-flex', 
                                  alignItems: 'center', 
                                  gap: '5px', 
                                  padding: '0.3rem 0.65rem', 
                                  background: '#f0fdf4', 
                                  border: '1px solid #bbf7d0', 
                                  borderRadius: '8px', 
                                  color: '#15803d', 
                                  textDecoration: 'none', 
                                  fontSize: '0.78rem',
                                  fontWeight: 600,
                                  transition: 'all 0.15s ease'
                                }}
                                title="Abrir chat de WhatsApp"
                              >
                                <Phone size={12} />
                                {rsvp.contactPhone}
                              </a>
                            ) : (
                              <span style={{ color: '#94a3b8', fontSize: '0.78rem' }}>Sin teléfono</span>
                            )}
                          </td>

                          {/* 3. Invitación Enviada Toggle */}
                          <td style={{ textAlign: 'center' }}>
                            <button
                              type="button"
                              onClick={() => handleToggleInvitationSent(rsvp)}
                              disabled={rsvpActionLoadingId === rsvp.id}
                              className={`invitation-sent-pill ${rsvp.invitationSent ? 'sent' : 'pending'}`}
                              title="Click para alternar: Enviada ⇄ Pendiente"
                            >
                              {rsvp.invitationSent ? (
                                <>
                                  <Check size={12} /> Enviada
                                </>
                              ) : (
                                <>
                                  <Clock size={12} /> Pendiente
                                </>
                              )}
                            </button>
                          </td>

                          {/* 4. Integrantes & Menús */}
                          <td>
                            <div className="guest-micro-list">
                              {rsvp.guests.map((guest) => {
                                const mealType = normalizeMealType(guest.mealType, guest.isChild);
                                const mismatch = isMealMismatch(guest.isChild, mealType);
                                const isGuestMealLoading = guestMealLoadingId === guest.id;

                                return (
                                  <div key={guest.id} className="guest-micro-card">
                                    <div className="guest-name-block">
                                      <span className="guest-name-text">{guest.name}</span>
                                      {guest.isChild ? (
                                        <span className="guest-type-tag child">👶 Niño</span>
                                      ) : (
                                        <span className="guest-type-tag adult">👨 Adulto</span>
                                      )}
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
                                      {/* Attendance Toggle */}
                                      <button
                                        type="button"
                                        onClick={() => handleToggleGuestConfirmed(rsvp.id, guest.id, guest.confirmed)}
                                        disabled={guestMealLoadingId === guest.id}
                                        className={`guest-status-toggle ${
                                          guest.confirmed === true
                                            ? 'confirmed'
                                            : guest.confirmed === false
                                            ? 'declined'
                                            : 'pending'
                                        }`}
                                        title="Click para alternar: Asistirá ➔ No asistirá ➔ Pendiente"
                                      >
                                        {guest.confirmed === true ? '✓ Asiste' : guest.confirmed === false ? '✗ No' : '○ Pend'}
                                      </button>

                                      {/* Meal Toggle */}
                                      <button
                                        type="button"
                                        onClick={() => handleToggleGuestMeal(rsvp.id, guest.id, mealType)}
                                        disabled={isGuestMealLoading}
                                        className={`guest-meal-toggle ${mealType === MEAL_CHILD ? 'burger' : 'menu'} ${mismatch ? 'mismatch' : ''}`}
                                        title={
                                          mismatch
                                            ? `${guest.isChild ? 'Niño' : 'Adulto'} con ${MEAL_SHORT_LABEL[mealType].toLowerCase()}. Click para alternar.`
                                            : 'Click para alternar (Menú ⇄ Hamburguesa)'
                                        }
                                      >
                                        {MEAL_EMOJI[mealType]} {MEAL_SHORT_LABEL[mealType]}
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </td>

                          {/* 5. Comentarios / Notas */}
                          <td>
                            {rsvp.comments ? (
                              <div className="comments-callout" title={rsvp.comments}>
                                <MessageSquare size={13} style={{ flexShrink: 0, marginTop: '2px', color: '#94a3b8' }} />
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                                  {rsvp.comments}
                                </span>
                              </div>
                            ) : (
                              <span style={{ color: '#cbd5e1', fontSize: '0.8rem', textAlign: 'center', display: 'block' }}>—</span>
                            )}
                          </td>

                          {/* 6. Acciones Rápidas */}
                          <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                            {(() => {
                              const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/e/${event.slug}?f=${rsvp.slug}`;
                              const text = `¡Hola! Te invitamos cordialmente a celebrar con nosotros: *${event.title} de ${event.celebrantName}* ✨.\n\nPor favor, confirma tu asistencia y la de tus familiares ingresando al siguiente enlace:\n\n${url}`;
                              const cleanPhone = rsvp.contactPhone ? rsvp.contactPhone.replace(/\D/g, '') : '';
                              const formattedPhone = cleanPhone.length === 10 ? `52${cleanPhone}` : cleanPhone;
                              const waLink = formattedPhone 
                                ? `https://wa.me/${formattedPhone}?text=${encodeURIComponent(text)}`
                                : `https://wa.me/?text=${encodeURIComponent(text)}`;
                              
                              return (
                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                                  <button
                                    type="button"
                                    onClick={() => handleEditRsvp(rsvp)}
                                    className="btn-icon-action edit"
                                    title="Editar familia"
                                  >
                                    <Edit size={14} />
                                  </button>
                                  <a
                                    href={waLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="btn-icon-action wa"
                                    title="Enviar invitación por WhatsApp"
                                  >
                                    <Send size={14} />
                                  </a>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteRsvp(rsvp.id, rsvp.familyName)}
                                    className="btn-icon-action danger"
                                    disabled={rsvpActionLoadingId === rsvp.id}
                                    title="Eliminar confirmación"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              );
                            })()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <Pagination
              paging={paginatedRsvps}
              onPageChange={setRsvpPageIndex}
              onPageSizeChange={setRsvpPageSize}
              pageSizeOptions={[5, 10, 25, 50, 100]}
              itemLabel="familias"
              className="mt-3 mb-6"
            />

          {/* KPI Detail Modal */}
          {activeKpiModal && (() => {
            let modalTitle = '';
            let modalSubtitle = '';
            let modalIcon = <Users size={22} style={{ color: 'var(--gold-dark)' }} />;
            let modalColor = 'var(--gold-dark)';

            interface ModalGuestRow {
              id: string;
              guestName: string;
              familyName: string;
              invitedBy?: string;
              contactPhone?: string;
              isChild: boolean;
              mealType: MealType;
              statusLabel: string;
              statusClass: string;
              comments?: string;
            }

            let modalGuestRows: ModalGuestRow[] = [];
            let modalFamilyRows: RSVP[] = [];

            if (activeKpiModal === 'families') {
              modalTitle = 'Familias Registradas';
              modalSubtitle = `${sourceFilteredRsvps.length} familias en total`;
              modalIcon = <Users size={22} style={{ color: 'var(--gold-dark)' }} />;
              modalFamilyRows = sourceFilteredRsvps.filter(f => {
                const q = kpiModalSearch.toLowerCase();
                if (!q) return true;
                return f.familyName.toLowerCase().includes(q) ||
                       (f.contactPhone || '').toLowerCase().includes(q) ||
                       (f.invitedBy || '').toLowerCase().includes(q) ||
                       f.guests.some(g => g.name.toLowerCase().includes(q));
              });
            } else if (activeKpiModal === 'all_confirmed') {
              modalTitle = 'Total Invitados Confirmados (Asisten)';
              modalSubtitle = `${totalConfirmed} invitados confirmados de ${effectiveTotalGuests} esperados netos`;
              modalIcon = <UserCheck size={22} style={{ color: '#16a34a' }} />;
              modalColor = '#16a34a';

              sourceFilteredRsvps.forEach(rsvp => {
                rsvp.guests.forEach(g => {
                  if (g.confirmed === true) {
                    modalGuestRows.push({
                      id: `g-${rsvp.id}-${g.id}`,
                      guestName: g.name,
                      familyName: rsvp.familyName,
                      invitedBy: rsvp.invitedBy,
                      contactPhone: rsvp.contactPhone,
                      isChild: g.isChild,
                      mealType: normalizeMealType(g.mealType, g.isChild),
                      statusLabel: 'Asistirá',
                      statusClass: 'status-confirmed',
                      comments: rsvp.comments || undefined
                    });
                  }
                });
              });

              if (kpiModalSearch) {
                const q = kpiModalSearch.toLowerCase();
                modalGuestRows = modalGuestRows.filter(r => 
                  r.guestName.toLowerCase().includes(q) ||
                  r.familyName.toLowerCase().includes(q) ||
                  (r.invitedBy || '').toLowerCase().includes(q) ||
                  (r.contactPhone || '').toLowerCase().includes(q)
                );
              }
            } else if (activeKpiModal === 'adults_confirmed') {
              modalTitle = 'Adultos Confirmados (Asisten)';
              modalSubtitle = `${totalAdultsConfirmed} adultos confirmados de ${effectiveTotalAdults} esperados netos`;
              modalIcon = <Users size={22} style={{ color: 'var(--gold-dark)' }} />;

              sourceFilteredRsvps.forEach(rsvp => {
                rsvp.guests.forEach(g => {
                  if (!g.isChild && g.confirmed === true) {
                    modalGuestRows.push({
                      id: `g-${rsvp.id}-${g.id}`,
                      guestName: g.name,
                      familyName: rsvp.familyName,
                      invitedBy: rsvp.invitedBy,
                      contactPhone: rsvp.contactPhone,
                      isChild: false,
                      mealType: normalizeMealType(g.mealType, false),
                      statusLabel: 'Asistirá (Adulto)',
                      statusClass: 'status-confirmed',
                      comments: rsvp.comments || undefined
                    });
                  }
                });
              });

              if (kpiModalSearch) {
                const q = kpiModalSearch.toLowerCase();
                modalGuestRows = modalGuestRows.filter(r => 
                  r.guestName.toLowerCase().includes(q) ||
                  r.familyName.toLowerCase().includes(q) ||
                  (r.invitedBy || '').toLowerCase().includes(q)
                );
              }
            } else if (activeKpiModal === 'children_confirmed') {
              modalTitle = 'Niños Confirmados (Asisten)';
              modalSubtitle = `${totalChildrenConfirmed} niños confirmados de ${effectiveTotalChildren} esperados netos`;
              modalIcon = <Baby size={22} style={{ color: '#2563eb' }} />;
              modalColor = '#2563eb';

              sourceFilteredRsvps.forEach(rsvp => {
                rsvp.guests.forEach(g => {
                  if (g.isChild && g.confirmed === true) {
                    modalGuestRows.push({
                      id: `g-${rsvp.id}-${g.id}`,
                      guestName: g.name,
                      familyName: rsvp.familyName,
                      invitedBy: rsvp.invitedBy,
                      contactPhone: rsvp.contactPhone,
                      isChild: true,
                      mealType: normalizeMealType(g.mealType, true),
                      statusLabel: 'Asistirá (Niño)',
                      statusClass: 'status-confirmed',
                      comments: rsvp.comments || undefined
                    });
                  }
                });
              });

              if (kpiModalSearch) {
                const q = kpiModalSearch.toLowerCase();
                modalGuestRows = modalGuestRows.filter(r => 
                  r.guestName.toLowerCase().includes(q) ||
                  r.familyName.toLowerCase().includes(q) ||
                  (r.invitedBy || '').toLowerCase().includes(q)
                );
              }
            } else if (activeKpiModal === 'adult_meals' || activeKpiModal === 'child_meals') {
              const targetMeal: MealType = activeKpiModal === 'child_meals' ? MEAL_CHILD : MEAL_ADULT;
              const isChildMeal = targetMeal === MEAL_CHILD;

              modalTitle = isChildMeal ? 'Hamburguesas' : 'Menús';
              modalSubtitle = isChildMeal
                ? `${totalChildMealsConfirmed} hamburguesas confirmadas de ${totalChildMeals} esperadas netas · ${adultsWithChildMealConfirmed} son adultos`
                : `${totalAdultMealsConfirmed} menús confirmados de ${totalAdultMeals} esperados netos · ${childrenWithAdultMealConfirmed} son niños`;
              modalIcon = <Utensils size={22} style={{ color: isChildMeal ? '#ea580c' : '#2563eb' }} />;
              modalColor = isChildMeal ? '#ea580c' : '#2563eb';

              sourceFilteredRsvps.forEach(rsvp => {
                rsvp.guests.forEach(g => {
                  const mealType = normalizeMealType(g.mealType, g.isChild);
                  // Las bajas no comen: solo cuentan confirmados y pendientes.
                  if (mealType === targetMeal && g.confirmed !== false) {
                    modalGuestRows.push({
                      id: `g-${rsvp.id}-${g.id}`,
                      guestName: g.name,
                      familyName: rsvp.familyName,
                      invitedBy: rsvp.invitedBy,
                      contactPhone: rsvp.contactPhone,
                      isChild: g.isChild,
                      mealType,
                      statusLabel: g.confirmed === true ? 'Asistirá' : 'Pendiente',
                      statusClass: g.confirmed === true ? 'status-confirmed' : 'status-pending',
                      comments: rsvp.comments || undefined
                    });
                  }
                });
              });

              if (kpiModalSearch) {
                const q = kpiModalSearch.toLowerCase();
                modalGuestRows = modalGuestRows.filter(r =>
                  r.guestName.toLowerCase().includes(q) ||
                  r.familyName.toLowerCase().includes(q) ||
                  (r.invitedBy || '').toLowerCase().includes(q)
                );
              }
            } else if (activeKpiModal === 'declined') {
              modalTitle = 'Invitados que No Asistirán (Bajas)';
              modalSubtitle = `${totalDeclined} personas declinadas descontadas del total (${totalGuests} originales)`;
              modalIcon = <UserX size={22} style={{ color: '#dc2626' }} />;
              modalColor = '#dc2626';

              sourceFilteredRsvps.forEach(rsvp => {
                rsvp.guests.forEach(g => {
                  if (g.confirmed === false) {
                    modalGuestRows.push({
                      id: `g-${rsvp.id}-${g.id}`,
                      guestName: g.name,
                      familyName: rsvp.familyName,
                      invitedBy: rsvp.invitedBy,
                      contactPhone: rsvp.contactPhone,
                      isChild: g.isChild,
                      mealType: normalizeMealType(g.mealType, g.isChild),
                      statusLabel: 'No asistirá',
                      statusClass: 'status-declined',
                      comments: rsvp.comments || undefined
                    });
                  }
                });
              });

              if (kpiModalSearch) {
                const q = kpiModalSearch.toLowerCase();
                modalGuestRows = modalGuestRows.filter(r => 
                  r.guestName.toLowerCase().includes(q) ||
                  r.familyName.toLowerCase().includes(q) ||
                  (r.invitedBy || '').toLowerCase().includes(q)
                );
              }
            }

            return (
              <div 
                style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: 'rgba(0, 0, 0, 0.65)',
                  backdropFilter: 'blur(4px)',
                  zIndex: 1000,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '1rem'
                }}
                onClick={(e) => {
                  if (e.target === e.currentTarget) setActiveKpiModal(null);
                }}
              >
                <div 
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '20px',
                    width: '100%',
                    maxWidth: '680px',
                    maxHeight: '85vh',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
                    overflow: 'hidden',
                    border: '1px solid rgba(212, 175, 55, 0.3)'
                  }}
                >
                  {/* Modal Header */}
                  <div style={{ padding: '1.4rem 1.8rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(to right, #faf8f5, #ffffff)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ padding: '10px', borderRadius: '12px', background: 'rgba(212, 175, 55, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {modalIcon}
                      </div>
                      <div>
                        <h3 style={{ fontSize: '1.3rem', color: modalColor, margin: 0, fontWeight: 600 }}>
                          {modalTitle}
                        </h3>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '3px 0 0 0' }}>
                          {modalSubtitle}
                        </p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setActiveKpiModal(null)} 
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '6px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      title="Cerrar modal"
                    >
                      <X size={22} />
                    </button>
                  </div>

                  {/* Search filter inside modal */}
                  <div style={{ padding: '0.8rem 1.8rem', borderBottom: '1px solid #f1f5f9', backgroundColor: '#f8fafc' }}>
                    <div className="search-wrapper" style={{ margin: 0, maxWidth: '100%' }}>
                      <Search className="search-icon" size={16} />
                      <input
                        type="text"
                        className="rsvp-input search-input"
                        placeholder="Filtrar datos en esta lista..."
                        value={kpiModalSearch}
                        onChange={(e) => {
                          setKpiModalSearch(e.target.value);
                          setKpiModalPageIndex(1);
                        }}
                        style={{ width: '100%', fontSize: '0.85rem' }}
                      />
                    </div>
                  </div>

                  {/* Modal Body */}
                  <div style={{ padding: '1.2rem 1.8rem', overflowY: 'auto', flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {(() => {
                      const paginatedModalFamilies = paginateData(modalFamilyRows, kpiModalPageIndex, kpiModalPageSize);
                      const paginatedModalGuests = paginateData(modalGuestRows, kpiModalPageIndex, kpiModalPageSize);

                      if (activeKpiModal === 'families') {
                        if (modalFamilyRows.length === 0) {
                          return (
                            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                              <Users size={36} style={{ margin: '0 auto 0.8rem auto', opacity: 0.4 }} />
                              <p style={{ margin: 0 }}>No se encontraron familias que coincidan con la búsqueda.</p>
                            </div>
                          );
                        }
                        return (
                          <>
                            {paginatedModalFamilies.data.map((rsvp) => {
                              const status = getFamilyRsvpStatus(rsvp);
                              const confirmedCount = rsvp.guests.filter(g => g.confirmed === true).length;
                              const totalG = rsvp.guests.length;
                              return (
                                <div key={rsvp.id} style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1rem 1.2rem', backgroundColor: '#ffffff', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.4rem' }}>
                                    <div>
                                      <div style={{ fontWeight: 600, fontSize: '1.05rem', color: 'var(--text-dark)' }}>
                                        {rsvp.familyName}
                                      </div>
                                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                                        Invitados por: <span style={{ fontWeight: 500, color: 'var(--gold-dark)' }}>{formatInvitedByLabel(rsvp.invitedBy)}</span>
                                        {rsvp.contactPhone && (
                                          <span style={{ marginLeft: '10px' }}>· Tel: {rsvp.contactPhone}</span>
                                        )}
                                      </div>
                                    </div>
                                    <span className={`status-badge ${status.className}`} style={{ fontSize: '0.72rem', padding: '0.25rem 0.6rem' }}>
                                      {status.label} ({confirmedCount}/{totalG})
                                    </span>
                                  </div>

                                  {/* Guest list pills */}
                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '0.6rem', paddingTop: '0.6rem', borderTop: '1px dashed #f1f5f9' }}>
                                    {rsvp.guests.map(g => (
                                      <span 
                                        key={g.id} 
                                        style={{ 
                                          fontSize: '0.75rem', 
                                          padding: '3px 8px', 
                                          borderRadius: '6px', 
                                          backgroundColor: g.confirmed === true ? '#f0fdf4' : g.confirmed === false ? '#fef2f2' : '#f8fafc',
                                          color: g.confirmed === true ? '#15803d' : g.confirmed === false ? '#b91c1c' : '#64748b',
                                          border: `1px solid ${g.confirmed === true ? '#bbf7d0' : g.confirmed === false ? '#fecaca' : '#e2e8f0'}`,
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '4px'
                                        }}
                                      >
                                        {g.name}
                                        {g.isChild && <span style={{ fontSize: '0.65rem', color: '#2563eb', fontWeight: 600, backgroundColor: '#eff6ff', padding: '1px 4px', borderRadius: '4px' }}>👶 Niño</span>}
                                        {isMealMismatch(g.isChild, normalizeMealType(g.mealType, g.isChild)) && (
                                          <span
                                            style={{ fontSize: '0.65rem', color: '#c2410c', fontWeight: 600, backgroundColor: '#fff7ed', padding: '1px 4px', borderRadius: '4px' }}
                                            title={`Come ${MEAL_SHORT_LABEL[normalizeMealType(g.mealType, g.isChild)].toLowerCase()}`}
                                          >
                                            {MEAL_EMOJI[normalizeMealType(g.mealType, g.isChild)]} {MEAL_SHORT_LABEL[normalizeMealType(g.mealType, g.isChild)]}
                                          </span>
                                        )}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              );
                            })}
                            <Pagination
                              paging={paginatedModalFamilies}
                              onPageChange={setKpiModalPageIndex}
                              onPageSizeChange={setKpiModalPageSize}
                              pageSizeOptions={[5, 10, 25, 50]}
                              itemLabel="familias"
                              className="mt-2"
                            />
                          </>
                        );
                      }

                      if (modalGuestRows.length === 0) {
                        return (
                          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                            <Users size={36} style={{ margin: '0 auto 0.8rem auto', opacity: 0.4 }} />
                            <p style={{ margin: 0 }}>No se encontraron personas en este reporte.</p>
                          </div>
                        );
                      }

                      return (
                        <>
                          {paginatedModalGuests.data.map((row, idx) => (
                            <div key={row.id || idx} style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '0.8rem 1.1rem', backgroundColor: '#ffffff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
                              <div style={{ flexGrow: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span style={{ fontWeight: 600, fontSize: '0.98rem', color: 'var(--text-dark)' }}>{row.guestName}</span>
                                  {row.isChild ? (
                                    <span style={{ fontSize: '0.68rem', color: '#2563eb', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', padding: '1px 6px', borderRadius: '12px', fontWeight: 600 }}>👶 Niño</span>
                                  ) : (
                                    <span style={{ fontSize: '0.68rem', color: '#475569', backgroundColor: '#f1f5f9', border: '1px solid #e2e8f0', padding: '1px 6px', borderRadius: '12px', fontWeight: 500 }}>Adulto</span>
                                  )}
                                  <span
                                    style={{
                                      fontSize: '0.68rem',
                                      padding: '1px 6px',
                                      borderRadius: '12px',
                                      fontWeight: 600,
                                      color: isMealMismatch(row.isChild, row.mealType) ? '#c2410c' : '#475569',
                                      backgroundColor: isMealMismatch(row.isChild, row.mealType) ? '#fff7ed' : '#f8fafc',
                                      border: `1px solid ${isMealMismatch(row.isChild, row.mealType) ? '#fed7aa' : '#e2e8f0'}`,
                                    }}
                                    title={`Comida: ${MEAL_SHORT_LABEL[row.mealType].toLowerCase()}`}
                                  >
                                    {MEAL_EMOJI[row.mealType]} {MEAL_SHORT_LABEL[row.mealType]}
                                  </span>
                                </div>
                                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '3px' }}>
                                  Familia: <strong style={{ color: 'var(--text-dark)' }}>{row.familyName}</strong> · Lado: {formatInvitedByLabel(row.invitedBy || '')}
                                  {row.contactPhone && <span style={{ marginLeft: '8px' }}>· Tel: {row.contactPhone}</span>}
                                </div>
                                {row.comments && (
                                  <div style={{ fontSize: '0.72rem', color: '#64748b', fontStyle: 'italic', marginTop: '2px' }}>
                                    "{row.comments}"
                                  </div>
                                )}
                              </div>
                              <span className={`status-badge ${row.statusClass}`} style={{ fontSize: '0.72rem', padding: '0.25rem 0.65rem', flexShrink: 0 }}>
                                {row.statusLabel}
                              </span>
                            </div>
                          ))}
                          <Pagination
                            paging={paginatedModalGuests}
                            onPageChange={setKpiModalPageIndex}
                            onPageSizeChange={setKpiModalPageSize}
                            pageSizeOptions={[5, 10, 25, 50]}
                            itemLabel="invitados"
                            className="mt-2"
                          />
                        </>
                      );
                    })()}
                  </div>

                  {/* Modal Footer */}
                  <div style={{ padding: '1rem 1.8rem', borderTop: '1px solid #f1f5f9', backgroundColor: '#faf8f5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                      {activeKpiModal === 'families' 
                        ? `Mostrando ${modalFamilyRows.length} familias`
                        : `Mostrando ${modalGuestRows.length} invitados`}
                    </div>
                    <button 
                      onClick={() => setActiveKpiModal(null)} 
                      className="btn-outline" 
                      style={{ padding: '0.4rem 1.2rem', fontSize: '0.82rem' }}
                    >
                      Cerrar
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}
        </section>


    </div>
  );
}
