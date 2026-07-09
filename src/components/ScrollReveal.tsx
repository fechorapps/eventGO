'use client';
import { useEffect } from 'react';

export default function ScrollReveal() {
  useEffect(() => {
    // 1. Intersection Observer for scroll animations (fade-in, slide-up, slide-in)
    const observerOptions = {
      root: null,
      rootMargin: '0px',
      threshold: 0.1, // Trigger when 10% of the element is in view
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('active');
          // Optionally stop observing once the animation triggers
          observer.unobserve(entry.target);
        }
      });
    }, observerOptions);

    // Observe all elements with the 'reveal' or 'reveal-item' class
    const revealElements = document.querySelectorAll('.reveal, .reveal-item');
    revealElements.forEach((el) => {
      observer.observe(el);
    });

    // 2. Parallax background clouds scrolling effect
    const handleScroll = () => {
      const scrolled = window.pageYOffset || document.documentElement.scrollTop;
      
      const cloud1 = document.querySelector('.cloud-1') as HTMLElement;
      const cloud2 = document.querySelector('.cloud-2') as HTMLElement;
      const cloud3 = document.querySelector('.cloud-3') as HTMLElement;
      
      // Move clouds slowly at different rates
      if (cloud1) {
        cloud1.style.transform = `translate3d(0, ${scrolled * 0.12}px, 0)`;
      }
      if (cloud2) {
        cloud2.style.transform = `translate3d(0, ${-scrolled * 0.08}px, 0)`;
      }
      if (cloud3) {
        cloud3.style.transform = `translate3d(0, ${scrolled * 0.05}px, 0)`;
      }

      // Move floating photos in the background at different parallax rates
      const photos = document.querySelectorAll('.bg-floating-photo');
      photos.forEach((photo, idx) => {
        const speed = 0.06 + (idx % 3) * 0.03;
        const offset = scrolled * speed;
        const rot = (idx % 3 === 0) ? -2.5 : (idx % 3 === 1) ? 1.8 : -1.2;
        (photo as HTMLElement).style.transform = `translate3d(0, ${offset}px, 0) rotate(${rot}deg)`;
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return null; // Behavior-only helper
}
