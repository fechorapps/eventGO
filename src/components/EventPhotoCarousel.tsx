'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CarouselPhoto {
  url: string;
  alt?: string;
}

interface EventPhotoCarouselProps {
  photos: CarouselPhoto[];
  title: string;
}

export default function EventPhotoCarousel({ photos, title }: EventPhotoCarouselProps) {
  const carouselPhotos = useMemo(() => photos.filter((photo) => Boolean(photo.url)), [photos]);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

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
