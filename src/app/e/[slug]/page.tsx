import React from 'react';
import Sparkles from '@/components/Sparkles';
import Countdown from '@/components/Countdown';
import InvitationNav from '@/components/InvitationNav';
import RsvpForm from '@/components/RsvpForm';
import ScrollReveal from '@/components/ScrollReveal';
import { MapPin, Calendar, Clock, Gift, Heart, AlertCircle, Church, Wine, Shirt } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { prisma } from '@/lib/db';

interface EventPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ f?: string }>;
}

export async function generateMetadata({ params }: EventPageProps) {
  const { slug } = await params;
  const event = await prisma.event.findUnique({
    where: { slug },
  });

  if (!event) {
    return {
      title: 'Evento no encontrado',
      description: 'La invitación digital no está disponible.',
    };
  }

  return {
    title: `${event.title} | ${event.celebrantName}`,
    description: `Estás cordialmente invitado a: ${event.title} de ${event.celebrantName}. Acompáñanos en este día tan especial.`,
  };
}

export default async function EventPage({ params, searchParams }: EventPageProps) {
  const { slug } = await params;
  const searchParamsResolved = await searchParams;
  const f = searchParamsResolved?.f;

  let preloadedRsvp = null;
  if (f) {
    try {
      preloadedRsvp = await prisma.rsvp.findUnique({
        where: { slug: f },
        include: {
          guests: {
            orderBy: { id: 'asc' },
          },
        },
      });
    } catch (e) {
      console.error('Error fetching preloaded RSVP:', e);
    }
  }

  const event = await prisma.event.findUnique({
    where: { slug },
    include: {
      itinerary: {
        orderBy: { id: 'asc' },
      },
      photos: {
        orderBy: { id: 'asc' },
      },
      giftRegistries: {
        orderBy: { id: 'asc' },
      },
    },
  });

  if (!event) {
    // Show a beautiful custom "Not Found" rather than raw Next.js 404
    return (
      <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '90vh' }}>
        <div className="section-card" style={{ maxWidth: '500px', margin: '0 auto' }}>
          <AlertCircle size={48} style={{ color: 'var(--gold-dark)', marginBottom: '1.5rem', display: 'inline-block' }} />
          <h2 className="section-title">Invitación No Encontrada</h2>
          <div className="section-divider"><span className="divider-symbol">✦</span></div>
          <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
            El enlace que ingresaste no corresponde a ninguna invitación activa en nuestro sistema. Por favor, verifica el enlace e inténtalo de nuevo.
          </p>
          <Link href="/" className="btn-gold">
            Ir al Inicio
          </Link>
        </div>
      </div>
    );
  }

  const eventDateIso = event.date.toISOString();
  const formattedEventDate = event.date.toLocaleDateString('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  // Helper to split comma-separated names
  const parseNames = (str: string | null) => {
    if (!str) return [];
    return str.split(',').map((name) => name.trim()).filter(Boolean);
  };

  const formatClabe = (value: string) =>
    (value.replace(/\D/g, '').match(/.{1,3}/g) || []).join(' ');

  // Google Maps embed URL generator helper
  const getGoogleMapsEmbedUrl = (mapsUrl: string | null, address: string | null, name: string | null): string => {
    if (mapsUrl && (mapsUrl.includes('google.com/maps/embed') || mapsUrl.includes('output=embed'))) {
      return mapsUrl;
    }
    if (mapsUrl && mapsUrl.includes('?q=')) {
      try {
        const urlObj = new URL(mapsUrl);
        const q = urlObj.searchParams.get('q');
        if (q) return `https://maps.google.com/maps?q=${encodeURIComponent(q)}&t=&z=15&ie=UTF8&iwloc=&output=embed`;
      } catch {
        // Ignore malformed map urls and fallback to the address query below.
      }
    }
    const query = [name, address].filter(Boolean).join(', ');
    if (!query) return '';
    return `https://maps.google.com/maps?q=${encodeURIComponent(query)}&t=&z=15&ie=UTF8&iwloc=&output=embed`;
  };

  const churchEmbedUrl = getGoogleMapsEmbedUrl(event.churchMapsUrl, event.churchAddress, event.churchName);
  const hallEmbedUrl = getGoogleMapsEmbedUrl(event.hallMapsUrl, event.hallAddress, event.hallName);
  const locationsAreSame = event.locationsAreSame;

  const heroBackgroundUrl = event.heroBackgroundUrl || event.photos[0]?.url || null;
  const detailsBackgroundUrl = event.detailsBackgroundUrl || event.photos[1]?.url || event.photos[0]?.url || null;
  const rsvpBackgroundUrl = event.rsvpBackgroundUrl || event.photos[2]?.url || event.photos[0]?.url || null;
  const introPrimaryPhoto = event.photos[0]?.url || heroBackgroundUrl;
  const introSecondaryPhoto = event.photos[1]?.url || event.photos[0]?.url || null;
  const introTertiaryPhoto = event.photos[2]?.url || event.photos[1]?.url || null;
  const floatingBackgroundPhotos = event.photos.slice(0, 4);
  const parentsList = parseNames(event.parents);
  const godparentsList = parseNames(event.godparents);

  return (
    <>
      {/* Background decorations */}
      <div className="bg-decorations">
        <div className="cloud cloud-1"></div>
        <div className="cloud cloud-2"></div>
        <div className="cloud cloud-3"></div>
      </div>
      
      {/* Interactive sparkles */}
      <Sparkles />
      
      {/* Scroll-reveal and parallax background helper */}
      <ScrollReveal />

      {floatingBackgroundPhotos.length > 0 && (
        <div className="bg-floating-photos" aria-hidden="true">
          {floatingBackgroundPhotos.map((photo, idx) => {
            const positions = [
              { top: '7rem', left: '4%', rotate: '-5deg' },
              { top: '30rem', right: '5%', rotate: '4deg' },
              { top: '58rem', left: '8%', rotate: '-3deg' },
              { top: '92rem', right: '10%', rotate: '5deg' },
            ];
            const pos = positions[idx] || positions[idx % positions.length];

            return (
              <div
                key={photo.id}
                className="bg-floating-photo"
                style={{
                  position: 'absolute',
                  top: pos.top,
                  left: pos.left,
                  right: pos.right,
                  transform: `rotate(${pos.rotate})`,
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo.url} alt="" className="bg-photo-img" loading="lazy" decoding="async" />
              </div>
            );
          })}
        </div>
      )}



      <InvitationNav
        showItinerary={event.itinerary.length > 0}
        showFamily={parentsList.length > 0 || godparentsList.length > 0}
        showPhotos={event.photos.length > 0}
      />

      <main className="container" style={{ position: 'relative', zIndex: 10 }}>
        
        {/* HERO SECTION */}
        <section className={`hero ${heroBackgroundUrl ? 'hero-with-background' : ''}`}>
          {heroBackgroundUrl && (
            <>
              <div className="section-background-media">
                <Image
                  src={heroBackgroundUrl}
                  alt={`Fondo del evento ${event.title}`}
                  fill
                  priority
                  sizes="(max-width: 900px) 100vw, 900px"
                  className="section-background-image"
                />
              </div>
              <div className="section-background-overlay section-background-overlay-hero"></div>
            </>
          )}
          <div className="section-content-shell">
          <div className="hero-logo" style={{ animation: 'none', marginBottom: '2rem' }}>
            {/* Elegant Minimalist Cross cradled by an olive semicircle wreath */}
            <svg width="160" height="104" viewBox="0 0 140 96" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M67.5 2H72.5V17H85V22H72.5V52H67.5V22H55V17H67.5V2Z" fill="var(--gold-medium)" />
              <g stroke="#8E9B72" strokeWidth="1.4" fill="none" opacity="0.9">
                <path d="M 64.6 83.7 A 44 44 0 0 1 26.2 35.4" />
                <path d="M 75.4 83.7 A 44 44 0 0 0 113.8 35.4" />
              </g>
              <path d="M0 0 Q 6.2 -3.8 12.5 0 Q 6.2 3.8 0 0 Z" fill="#96A382" transform="translate(60.9 83.0) rotate(226)"/>
              <path d="M0 0 Q 5.9 -3.6 11.9 0 Q 5.9 3.6 0 0 Z" fill="#A3AE8C" transform="translate(53.5 80.8) rotate(168)"/>
              <path d="M0 0 Q 5.6 -3.4 11.2 0 Q 5.6 3.4 0 0 Z" fill="#96A382" transform="translate(46.7 77.3) rotate(246)"/>
              <path d="M0 0 Q 5.3 -3.2 10.6 0 Q 5.3 3.2 0 0 Z" fill="#A3AE8C" transform="translate(40.6 72.7) rotate(188)"/>
              <path d="M0 0 Q 5.0 -3.0 10.0 0 Q 5.0 3.0 0 0 Z" fill="#96A382" transform="translate(35.3 67.1) rotate(266)"/>
              <path d="M0 0 Q 4.7 -2.8 9.4 0 Q 4.7 2.8 0 0 Z" fill="#A3AE8C" transform="translate(31.2 60.7) rotate(208)"/>
              <path d="M0 0 Q 4.4 -2.6 8.8 0 Q 4.4 2.6 0 0 Z" fill="#96A382" transform="translate(28.2 53.6) rotate(286)"/>
              <path d="M0 0 Q 4.1 -2.4 8.1 0 Q 4.1 2.4 0 0 Z" fill="#A3AE8C" transform="translate(26.4 46.1) rotate(228)"/>
              <path d="M0 0 Q 3.8 -2.2 7.5 0 Q 3.8 2.2 0 0 Z" fill="#96A382" transform="translate(26.0 38.5) rotate(306)"/>
              <path d="M0 0 Q 6.2 -3.8 12.5 0 Q 6.2 3.8 0 0 Z" fill="#96A382" transform="translate(79.1 83.0) rotate(22)"/>
              <path d="M0 0 Q 5.9 -3.6 11.9 0 Q 5.9 3.6 0 0 Z" fill="#A3AE8C" transform="translate(86.5 80.8) rotate(-56)"/>
              <path d="M0 0 Q 5.6 -3.4 11.2 0 Q 5.6 3.4 0 0 Z" fill="#96A382" transform="translate(93.3 77.3) rotate(2)"/>
              <path d="M0 0 Q 5.3 -3.2 10.6 0 Q 5.3 3.2 0 0 Z" fill="#A3AE8C" transform="translate(99.4 72.7) rotate(-76)"/>
              <path d="M0 0 Q 5.0 -3.0 10.0 0 Q 5.0 3.0 0 0 Z" fill="#96A382" transform="translate(104.7 67.1) rotate(-18)"/>
              <path d="M0 0 Q 4.7 -2.8 9.4 0 Q 4.7 2.8 0 0 Z" fill="#A3AE8C" transform="translate(108.8 60.7) rotate(-96)"/>
              <path d="M0 0 Q 4.4 -2.6 8.8 0 Q 4.4 2.6 0 0 Z" fill="#96A382" transform="translate(111.8 53.6) rotate(-38)"/>
              <path d="M0 0 Q 4.1 -2.4 8.1 0 Q 4.1 2.4 0 0 Z" fill="#A3AE8C" transform="translate(113.6 46.1) rotate(-116)"/>
              <path d="M0 0 Q 3.8 -2.2 7.5 0 Q 3.8 2.2 0 0 Z" fill="#96A382" transform="translate(114.0 38.5) rotate(-58)"/>
              <circle cx="48.5" cy="77.2" r="2.4" fill="#C2A478"/>
              <circle cx="30.1" cy="56.1" r="2.4" fill="#C2A478"/>
              <circle cx="91.5" cy="77.2" r="2.4" fill="#C2A478"/>
              <circle cx="109.9" cy="56.1" r="2.4" fill="#C2A478"/>
            </svg>
          </div>
          <span className="hero-subtitle">{event.subtitle || 'Nuestra Promesa de Amor'}</span>
          <h1 className="hero-name">{event.celebrantName}</h1>
          <span className="serif-italic" style={{ color: 'var(--gold-dark)', fontSize: '1.5rem' }}>{event.title}</span>
          
          <div className="section-divider">
            <span className="divider-symbol">✦</span>
          </div>

          {event.quote && (
            <p className="hero-intro">
              &ldquo;{event.quote}&rdquo;
            </p>
          )}

          {/* Countdown component */}
          <div style={{ marginTop: '1.5rem', width: '100%' }}>
            <Countdown targetDate={eventDateIso} />
          </div>

          <div className="scroll-indicator">
            <span>Desliza para ver detalles</span>
            <svg width="12" height="20" viewBox="0 0 12 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M6 1V19M6 19L1 14M6 19L11 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          </div>
        </section>

        {/* EDITORIAL INTRO */}
        <section className="editorial-intro reveal" id="about">
          <div className="editorial-intro-grid">
            <div className="editorial-photo-stack">
              {introPrimaryPhoto && (
                <div className="editorial-photo editorial-photo-main" style={{ position: 'absolute' }}>
                  <Image
                    src={introPrimaryPhoto}
                    alt={`Foto principal de ${event.title}`}
                    fill
                    sizes="(max-width: 900px) 100vw, 55vw"
                    className="editorial-photo-image"
                  />
                </div>
              )}

              {introSecondaryPhoto && (
                <div className="editorial-photo editorial-photo-secondary" style={{ position: 'absolute' }}>
                  <Image
                    src={introSecondaryPhoto}
                    alt={`Foto secundaria de ${event.title}`}
                    fill
                    sizes="(max-width: 900px) 60vw, 26vw"
                    className="editorial-photo-image"
                  />
                </div>
              )}

              {introTertiaryPhoto && (
                <div className="editorial-photo editorial-photo-tertiary" style={{ position: 'absolute' }}>
                  <Image
                    src={introTertiaryPhoto}
                    alt={`Foto complementaria de ${event.title}`}
                    fill
                    sizes="(max-width: 900px) 60vw, 24vw"
                    className="editorial-photo-image"
                  />
                </div>
              )}
            </div>

            <div className="editorial-copy">
              <span className="section-subtitle">Te invitamos a compartir este día</span>
              <h2 className="editorial-title">{event.title}</h2>
              <p className="editorial-lead">
                {event.quote || `Acompáñanos en la celebración de ${event.celebrantName}, un día preparado con cariño para la familia y las personas más cercanas.`}
              </p>

              <div className="editorial-meta">
                <div className="editorial-chip">
                  <Calendar size={16} />
                  <span>{formattedEventDate}</span>
                </div>
                <div className="editorial-chip">
                  <Clock size={16} />
                  <span>{event.date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                {event.churchName && (
                  <div className="editorial-chip">
                    <Church size={16} />
                    <span>{event.churchName}</span>
                  </div>
                )}
              </div>

              <div className="editorial-actions">
                <a href="#ceremony" className="btn-gold">Ver detalles</a>
                <a href="#rsvp" className="btn-outline">Confirmar asistencia</a>
              </div>
            </div>
          </div>
        </section>

        {/* DETAILS SECTION: DATE AND TIME */}
        <section className={`section-card reveal ${detailsBackgroundUrl ? 'section-card-with-background' : ''}`} id="ceremony">
          {detailsBackgroundUrl && (
            <>
              <div className="section-background-media">
                <Image
                  src={detailsBackgroundUrl}
                  alt={`Fondo de detalles de ${event.title}`}
                  fill
                  sizes="(max-width: 900px) 100vw, 900px"
                  className="section-background-image"
                />
              </div>
              <div className="section-background-overlay"></div>
            </>
          )}
          <div className="section-content-shell">
          <span className="section-subtitle">¿Cuándo y Dónde?</span>
          <h2 className="section-title">Detalles del Evento</h2>
          
          <div className="section-divider">
            <span className="divider-symbol">✦</span>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '2rem', marginBottom: '3rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Calendar className="location-icon" size={20} />
              <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{formattedEventDate}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Clock className="location-icon" size={20} />
              <span style={{ fontWeight: 600 }}>A partir de las {event.date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </div>

          <div className={`location-grid ${locationsAreSame ? 'location-grid-single' : ''}`}>
            {/* Shared venue (only if ceremony and reception take place together) */}
            {locationsAreSame && event.churchName && (
              <div className="location-card location-card-featured">
                <div className="location-icon">
                  <Church size={40} strokeWidth={1.5} />
                </div>
                <h3 className="location-title">Ceremonia y recepción</h3>
                <p className="location-name">{event.churchName}</p>
                {event.churchTime && <p className="location-time">Ceremonia: {event.churchTime}</p>}
                {event.hallTime && <p className="location-time">Recepción: {event.hallTime}</p>}
                {event.churchAddress && <p className="location-address">{event.churchAddress}</p>}
                {event.churchMapsUrl && (
                  <a
                    href={event.churchMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-gold"
                    style={{ marginBottom: churchEmbedUrl ? '1rem' : 0 }}
                  >
                    <MapPin size={16} />
                    Ver en Google Maps
                  </a>
                )}

                {churchEmbedUrl && (
                  <div className="embed-map-wrapper">
                    <iframe
                      src={churchEmbedUrl}
                      width="100%"
                      height="100%"
                      style={{ border: 0 }}
                      allowFullScreen={false}
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                    ></iframe>
                  </div>
                )}
              </div>
            )}

            {/* Church (Only if configured) */}
            {!locationsAreSame && event.churchName && (
              <div className="location-card">
                <div className="location-icon">
                  <Church size={40} strokeWidth={1.5} />
                </div>
                <h3 className="location-title">Ceremonia</h3>
                <p className="location-name">{event.churchName}</p>
                {event.churchTime && <p className="location-time">{event.churchTime}</p>}
                {event.churchAddress && <p className="location-address">{event.churchAddress}</p>}
                {event.churchMapsUrl && (
                  <a 
                    href={event.churchMapsUrl} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="btn-outline"
                    style={{ marginBottom: churchEmbedUrl ? '1rem' : 0 }}
                  >
                    <MapPin size={16} />
                    Ver en Google Maps
                  </a>
                )}
                
                {churchEmbedUrl && (
                  <div className="embed-map-wrapper">
                    <iframe
                      src={churchEmbedUrl}
                      width="100%"
                      height="100%"
                      style={{ border: 0 }}
                      allowFullScreen={false}
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                    ></iframe>
                  </div>
                )}
              </div>
            )}

            {/* Reception (Only if configured) */}
            {!locationsAreSame && event.hallName && (
              <div className="location-card">
                <div className="location-icon">
                  <Wine size={40} strokeWidth={1.5} />
                </div>
                <h3 className="location-title">Recepción</h3>
                <p className="location-name">{event.hallName}</p>
                {event.hallTime && <p className="location-time">{event.hallTime}</p>}
                {event.hallAddress && <p className="location-address">{event.hallAddress}</p>}
                {event.hallMapsUrl && (
                  <a 
                    href={event.hallMapsUrl} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="btn-gold"
                    style={{ marginBottom: hallEmbedUrl ? '1rem' : 0 }}
                  >
                    <MapPin size={16} />
                    Ver en Google Maps
                  </a>
                )}

                {hallEmbedUrl && (
                  <div className="embed-map-wrapper">
                    <iframe
                      src={hallEmbedUrl}
                      width="100%"
                      height="100%"
                      style={{ border: 0 }}
                      allowFullScreen={false}
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                    ></iframe>
                  </div>
                )}
              </div>
            )}
          </div>
          </div>
        </section>

        {/* ITINERARY & DRESS CODE SECTION */}
        {(event.itinerary || event.dressCode) && (
          <section className="section-card reveal" id="itinerary">
            {event.itinerary && event.itinerary.length > 0 && (
              <>
                <span className="section-subtitle">El transcurso del día</span>
                <h2 className="section-title">Itinerario</h2>
                <div className="section-divider"><span className="divider-symbol">✦</span></div>
                <div className="timeline">
                  {event.itinerary.map((item, idx) => (
                    <div key={item.id || idx} className={`timeline-item reveal-item delay-${(idx % 5) + 1}`}>
                      <div className="timeline-dot"></div>
                      <div className="timeline-time">{item.time}</div>
                      <div className="timeline-content">{item.activity}</div>
                    </div>
                  ))}
                </div>
                {event.dressCode && <div style={{ height: '3rem' }}></div>}
              </>
            )}

            {event.dressCode && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div className="dress-code-box">
                  <Shirt size={24} style={{ color: 'var(--gold-dark)' }} />
                  <h3 className="dress-code-title">Código de Vestimenta</h3>
                  <p className="dress-code-text">{event.dressCode}</p>
                </div>
              </div>
            )}
          </section>
        )}

        {/* FAMILY SECTION (PARENTS & GODPARENTS) */}
        {(parentsList.length > 0 || godparentsList.length > 0) && (
          <section className="section-card reveal" id="family">
            <span className="section-subtitle">En Compañía de la Familia</span>
            <h2 className="section-title">Padres y Padrinos</h2>
            
            <div className="section-divider">
              <span className="divider-symbol">✦</span>
            </div>

            <div className="people-grid">
              {parentsList.length > 0 && (
                <div>
                  <h3 className="people-group-title">Mis Padres</h3>
                  <ul className="people-names">
                    {parentsList.map((name, idx) => (
                      <li key={idx}>
                        {name}
                        <span>{idx === 0 ? 'Mamá' : idx === 1 ? 'Papá' : 'Padre'}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {godparentsList.length > 0 && (
                <div>
                  <h3 className="people-group-title">Mis Padrinos</h3>
                  <ul className="people-names">
                    {godparentsList.map((name, idx) => (
                      <li key={idx}>
                        {name}
                        <span>{idx % 2 === 0 ? 'Madrina' : 'Padrino'}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </section>
        )}

        {/* GIFTS SECTION */}
        <section className="section-card reveal" id="gifts">
          <div className="location-icon" style={{ display: 'inline-block' }}>
            <Gift size={32} />
          </div>
          <span className="section-subtitle" style={{ marginTop: '0.5rem' }}>Muestras de Cariño</span>
          <h2 className="section-title">Mesa de Regalos</h2>
          
          <div className="section-divider">
            <span className="divider-symbol">✦</span>
          </div>

          <div className="gift-text">
            <p style={{ marginBottom: '1rem', fontSize: '1.05rem' }}>
              &ldquo;Tu presencia en este día especial es el mayor regalo que podemos recibir. Sin embargo, si deseas tener un detalle con {event.celebrantName}, te dejamos nuestras opciones de mesa de regalos o transferencias.&rdquo;
            </p>
            {event.giftEnvelope && (
              <p className="serif-italic" style={{ color: 'var(--gold-dark)', fontWeight: 500, fontSize: '1.2rem', marginBottom: '1.5rem' }}>
                ✨ Lluvia de Sobres: Contaremos con un cofre especial en el salón para depositar sus sobres con obsequios en efectivo.
              </p>
            )}
          </div>

          {/* Bank Info Box (Only if configured) */}
          {event.giftBankClabe && (
            <div className="bank-info-box">
              <h4 className="bank-info-title">Datos Bancarios para Transferencias</h4>
              <div className="bank-row">
                <span className="bank-label">CLABE Interbancaria:</span>
                <span className="bank-value">{formatClabe(event.giftBankClabe)}</span>
              </div>
            </div>
          )}

          {/* Store Gift Registries (Mexico) */}
          {event.giftRegistries && event.giftRegistries.length > 0 && (
            <div style={{ marginTop: '2.5rem' }}>
              <h4 className="bank-info-title" style={{ marginBottom: '1.2rem' }}>Mesas de Regalo en Tiendas</h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '1.2rem' }}>
                {event.giftRegistries.map((reg, idx) => {
                  const getStoreColors = (name: string) => {
                    switch (name) {
                      case 'Liverpool':
                        return { bg: '#e01e5a', text: '#FFF', border: '1px solid #c9114b' };
                      case 'Sears':
                        return { bg: '#0055a4', text: '#FFF', border: '1px solid #003d75' };
                      case 'Amazon México':
                        return { bg: '#232f3e', text: '#ff9900', border: '1px solid #ff9900' };
                      case 'El Palacio de Hierro':
                        return { bg: '#000000', text: '#d4af37', border: '1px solid #d4af37' };
                      case 'Mercado Libre':
                        return { bg: '#ffe600', text: '#2d3277', border: '1px solid #2d3277' };
                      default:
                        return { bg: 'var(--bg-accent)', text: 'var(--gold-dark)', border: 'var(--border-gold)' };
                    }
                  };
                  const colors = getStoreColors(reg.storeName);

                  // Construct destination URL: fallback to Liverpool list format if only number is provided
                  let destinationUrl = reg.url || '';
                  if (!destinationUrl && reg.storeName === 'Liverpool' && reg.registryNumber) {
                    destinationUrl = `https://mesaderegalos.liverpool.com.mx/milistaderegalos/${reg.registryNumber}`;
                  } else if (!destinationUrl && reg.storeName === 'Amazon México' && reg.registryNumber) {
                    destinationUrl = `https://www.amazon.com.mx/s?k=${reg.registryNumber}`; // Amazon search fallback
                  }

                  return (
                    <div 
                      key={reg.id || idx} 
                      style={{ 
                        background: colors.bg, 
                        color: colors.text, 
                        border: colors.border,
                        padding: '1.2rem 1.8rem', 
                        borderRadius: '12px', 
                        display: 'flex', 
                        flexDirection: 'column', 
                        alignItems: 'center', 
                        minWidth: '200px',
                        boxShadow: '0 4px 10px rgba(0,0,0,0.05)',
                        transition: 'transform 0.2s, box-shadow 0.2s'
                      }}
                      className="registry-card-hover"
                    >
                      <span style={{ fontSize: '1.15rem', fontWeight: 'bold', letterSpacing: '0.05em' }}>
                        {reg.storeName}
                      </span>
                      {reg.registryNumber && (
                        <span style={{ fontSize: '0.85rem', marginTop: '0.4rem', opacity: 0.9, fontWeight: 500 }}>
                          Código: <strong>{reg.registryNumber}</strong>
                        </span>
                      )}
                      {destinationUrl && (
                        <a 
                          href={destinationUrl} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="btn-gold"
                          style={{ 
                            marginTop: '0.8rem', 
                            fontSize: '0.75rem', 
                            padding: '0.4rem 1rem', 
                            background: '#FFF', 
                            color: '#000', 
                            border: '1px solid #eee',
                            fontFamily: 'var(--font-sans)',
                            fontWeight: 600
                          }}
                        >
                          Ver Mesa de Regalos
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        {/* PHOTO GALLERY */}
        {event.photos.length > 0 && (
          <section className="section-card reveal" id="photos">
            <span className="section-subtitle">Recuerdos del evento</span>
            <h2 className="section-title">Galería de Fotos</h2>

            <div className="section-divider">
              <span className="divider-symbol">✦</span>
            </div>

            <div className="gallery-grid">
              {event.photos.map((photo, idx) => (
                <div key={photo.id} className={`gallery-item reveal-item delay-${(idx % 5) + 1}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photo.url} alt={`Foto ${idx + 1} de ${event.title}`} className="gallery-img" />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* RSVP CONFIRMATION FORM */}
        <section className={`section-card reveal ${rsvpBackgroundUrl ? 'section-card-with-background' : ''}`} id="rsvp">
          {rsvpBackgroundUrl && (
            <>
              <div className="section-background-media">
                <Image
                  src={rsvpBackgroundUrl}
                  alt={`Fondo de confirmación de ${event.title}`}
                  fill
                  sizes="(max-width: 900px) 100vw, 900px"
                  className="section-background-image"
                />
              </div>
              <div className="section-background-overlay"></div>
            </>
          )}
          <div className="section-content-shell">
          <span className="section-subtitle">Confirmación de Asistencia</span>
          <h2 className="section-title">¿Nos Acompañas?</h2>
          
          <div className="section-divider">
            <span className="divider-symbol">✦</span>
          </div>

          {event.rsvpDeadline && (
            <p style={{ textAlign: 'center', marginBottom: '2.5rem', color: 'var(--text-muted)' }}>
              Por favor, confirma el número de asistentes de tu familia antes del <strong>
                {event.rsvpDeadline.toLocaleDateString('es-MX', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </strong>.
            </p>
          )}

          <RsvpForm eventId={event.id} slug={event.slug} rsvpPhone={event.rsvpPhone} preloadedRsvp={preloadedRsvp} />
          </div>
        </section>

        {/* FOOTER */}
        <footer className="footer">
          <div style={{ color: 'var(--gold-medium)', marginBottom: '1rem' }}>
            <Heart size={20} fill="currentColor" style={{ display: 'inline' }} />
          </div>
          <p className="serif-italic" style={{ fontSize: '1.4rem', textTransform: 'none', color: 'var(--gold-dark)', marginBottom: '0.8rem' }}>
            Te esperamos con mucho amor
          </p>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {event.title} de {event.celebrantName} • {event.date.getFullYear()}
          </p>
        </footer>

      </main>
    </>
  );
}
