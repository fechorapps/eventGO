'use client';
import { useEffect, useState } from 'react';

interface SparkleItem {
  id: number;
  left: string;
  top: string;
  delay: string;
  duration: string;
  size: string;
}

export default function Sparkles() {
  const [sparkles, setSparkles] = useState<SparkleItem[]>([]);

  useEffect(() => {
    // Generate 35 sparkles with random positioning and timings
    const newSparkles = Array.from({ length: 35 }).map((_, i) => {
      const size = `${1.5 + Math.random() * 2.5}px`;
      return {
        id: i,
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        delay: `${Math.random() * 6}s`,
        duration: `${4 + Math.random() * 6}s`,
        size,
      };
    });
    setSparkles(newSparkles);
  }, []);

  return (
    <div className="sparkles-container">
      {sparkles.map((s) => (
        <div
          key={s.id}
          className="sparkle"
          style={{
            left: s.left,
            top: s.top,
            animationDelay: s.delay,
            animationDuration: s.duration,
            width: s.size,
            height: s.size,
          }}
        />
      ))}
    </div>
  );
}
