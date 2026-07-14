'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, Heart } from 'lucide-react';

interface CarouselPhoto {
  url: string;
  alt?: string;
  likesCount?: number;
}

interface EventPhotoCarouselProps {
  photos: CarouselPhoto[];
  title: string;
  eventId: number;
}

const CLIENT_ID_STORAGE_KEY = 'eventgo-photo-client-id';

export default function EventPhotoCarousel({ photos, title, eventId }: EventPhotoCarouselProps) {
  const carouselPhotos = useMemo(() => photos.filter((photo) => Boolean(photo.url)), [photos]);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [clientId, setClientId] = useState('');
  const [likedPhotos, setLikedPhotos] = useState<Record<string, boolean>>({});
  const [photoLikes, setPhotoLikes] = useState<Record<string, number>>(
    () => Object.fromEntries(carouselPhotos.map((photo) => [photo.url, photo.likesCount || 0]))
  );
  const [pendingPhotoUrl, setPendingPhotoUrl] = useState<string | null>(null);

  useEffect(() => {
    setPhotoLikes(Object.fromEntries(carouselPhotos.map((photo) => [photo.url, photo.likesCount || 0])));
  }, [carouselPhotos]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const storedClientId = window.localStorage.getItem(CLIENT_ID_STORAGE_KEY);
    const nextClientId = storedClientId || window.crypto.randomUUID();
    if (!storedClientId) {
      window.localStorage.setItem(CLIENT_ID_STORAGE_KEY, nextClientId);
    }

    setClientId(nextClientId);

    const likedKey = `eventgo-photo-likes:${eventId}`;
    try {
      const storedLikes = window.localStorage.getItem(likedKey);
      if (storedLikes) {
        const parsed = JSON.parse(storedLikes) as Record<string, boolean>;
        setLikedPhotos(parsed);
      }
    } catch {
      // Ignore malformed client storage.
    }
  }, [eventId]);

  const scrollToIndex = (index: number) => {
    const track = trackRef.current;
    if (!track || carouselPhotos.length === 0) return;

    const nextIndex = Math.max(0, Math.min(index, carouselPhotos.length - 1));
    const slideWidth = track.clientWidth;
    track.scrollTo({
      left: slideWidth * nextIndex,
      behavior: 'smooth',
    });
    setActiveIndex(nextIndex);
  };

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const onScroll = () => {
      const slideWidth = track.clientWidth;
      if (!slideWidth) return;
      const nextIndex = Math.round(track.scrollLeft / slideWidth);
      setActiveIndex(Math.max(0, Math.min(nextIndex, carouselPhotos.length - 1)));
    };

    onScroll();
    track.addEventListener('scroll', onScroll, { passive: true });
    return () => track.removeEventListener('scroll', onScroll);
  }, [carouselPhotos.length]);

  useEffect(() => {
    if (carouselPhotos.length <= 1 || isHovered) return;

    const timer = window.setInterval(() => {
      setActiveIndex((current) => {
        const nextIndex = current + 1 >= carouselPhotos.length ? 0 : current + 1;
        const track = trackRef.current;
        if (track) {
          track.scrollTo({
            left: track.clientWidth * nextIndex,
            behavior: 'smooth',
          });
        }
        return nextIndex;
      });
    }, 4500);

    return () => window.clearInterval(timer);
  }, [carouselPhotos.length, isHovered]);

  const persistLikedState = (nextLikedPhotos: Record<string, boolean>) => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(`eventgo-photo-likes:${eventId}`, JSON.stringify(nextLikedPhotos));
  };

  const handleToggleLike = async (photoUrl: string) => {
    if (!clientId || pendingPhotoUrl) return;

    const nextLiked = !likedPhotos[photoUrl];
    setPendingPhotoUrl(photoUrl);

    const previousLiked = likedPhotos[photoUrl] || false;
    const previousCount = photoLikes[photoUrl] ?? 0;

    setLikedPhotos((current) => {
      const next = { ...current, [photoUrl]: nextLiked };
      persistLikedState(next);
      return next;
    });
    setPhotoLikes((current) => ({
      ...current,
      [photoUrl]: Math.max(0, previousCount + (nextLiked ? 1 : -1)),
    }));

    try {
      const response = await fetch('/api/photos/like', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventId,
          photoUrl,
          clientId,
          liked: nextLiked,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'No fue posible actualizar el me gusta.');
      }

      setLikedPhotos((current) => {
        const next = { ...current, [photoUrl]: data.liked };
        persistLikedState(next);
        return next;
      });
      setPhotoLikes((current) => ({
        ...current,
        [photoUrl]: data.count ?? current[photoUrl] ?? 0,
      }));
    } catch (error) {
      console.error(error);
      setLikedPhotos((current) => {
        const next = { ...current, [photoUrl]: previousLiked };
        persistLikedState(next);
        return next;
      });
      setPhotoLikes((current) => ({
        ...current,
        [photoUrl]: previousCount,
      }));
    } finally {
      setPendingPhotoUrl(null);
    }
  };

  if (carouselPhotos.length === 0) return null;

  return (
    <div className="photo-carousel" aria-label={`Carrusel de fotos de ${title}`}>
      <div className="photo-carousel-viewport">
        <div
          className="photo-carousel-track"
          ref={trackRef}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onTouchStart={() => setIsHovered(true)}
          onTouchEnd={() => setIsHovered(false)}
        >
          {carouselPhotos.map((photo, index) => (
            <div className="photo-carousel-slide" key={`${photo.url}-${index}`}>
              <div className="photo-carousel-frame">
                <Image
                  src={photo.url}
                  alt={photo.alt || `Foto ${index + 1} de ${title}`}
                  fill
                  sizes="(max-width: 900px) 92vw, 760px"
                  className="photo-carousel-image"
                  priority={index === 0}
                />
                <div className="photo-carousel-like-wrapper">
                  <button
                    type="button"
                    className={`photo-carousel-like-button${likedPhotos[photo.url] ? ' liked' : ''}`}
                    onClick={() => handleToggleLike(photo.url)}
                    disabled={pendingPhotoUrl === photo.url}
                    aria-pressed={likedPhotos[photo.url] || false}
                    aria-label={likedPhotos[photo.url] ? 'Quitar me gusta de la foto' : 'Me gusta esta foto'}
                  >
                    <Heart size={16} fill={likedPhotos[photo.url] ? 'currentColor' : 'none'} />
                    <span>{photoLikes[photo.url] ?? photo.likesCount ?? 0}</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {carouselPhotos.length > 1 && (
        <div className="photo-carousel-controls">
          <button
            type="button"
            className="photo-carousel-button"
            onClick={() => scrollToIndex(activeIndex - 1)}
            aria-label="Foto anterior"
            disabled={activeIndex === 0}
          >
            <ChevronLeft size={18} />
          </button>

          <div className="photo-carousel-dots" aria-label="Indicadores del carrusel">
            {carouselPhotos.map((_, index) => (
              <button
                key={index}
                type="button"
                className={`photo-carousel-dot${index === activeIndex ? ' active' : ''}`}
                onClick={() => scrollToIndex(index)}
                aria-label={`Ir a la foto ${index + 1}`}
                aria-current={index === activeIndex}
              />
            ))}
          </div>

          <button
            type="button"
            className="photo-carousel-button"
            onClick={() => scrollToIndex(activeIndex + 1)}
            aria-label="Foto siguiente"
            disabled={activeIndex === carouselPhotos.length - 1}
          >
            <ChevronRight size={18} />
          </button>
        </div>
      )}
    </div>
  );
}
