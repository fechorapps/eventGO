import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function Container({
  children,
  className = '',
}: {
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div data-slot="container" className={cn('w-full mx-auto px-4 lg:px-6 max-w-[1320px]', className)}>
      {children}
    </div>
  );
}
