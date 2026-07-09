'use client';
import { useEffect, useState } from 'react';

interface CountdownProps {
  targetDate: string; // Formato ISO o fecha reconocible, ej. '2026-10-24T12:00:00'
}

export default function Countdown({ targetDate }: CountdownProps) {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const calculateTimeLeft = () => {
      const difference = +new Date(targetDate) - +new Date();
      let newTimeLeft = { days: 0, hours: 0, minutes: 0, seconds: 0 };

      if (difference > 0) {
        newTimeLeft = {
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60),
        };
      }
      setTimeLeft(newTimeLeft);
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [targetDate]);

  // Render dummy loader during server side render to match HTML structure
  const renderBox = (val: number | string, label: string) => (
    <div className="countdown-box">
      <div className="countdown-value">{typeof val === 'number' ? String(val).padStart(2, '0') : val}</div>
      <div className="countdown-label">{label}</div>
    </div>
  );

  return (
    <div className="countdown-container">
      {renderBox(isMounted ? timeLeft.days : '00', 'Días')}
      {renderBox(isMounted ? timeLeft.hours : '00', 'Horas')}
      {renderBox(isMounted ? timeLeft.minutes : '00', 'Minutos')}
      {renderBox(isMounted ? timeLeft.seconds : '00', 'Segundos')}
    </div>
  );
}
