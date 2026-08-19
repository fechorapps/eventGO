'use client';

import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useScrollPosition } from '@/hooks/use-scroll-position';
import { Container } from '@/components/admin/ui/container';
import { Button } from '@/components/admin/ui/button';
import { useSelectedEventSlug } from '@/components/admin/selected-event-context';

const HEADER_SCROLLED_OFFSET = 8;

export function AdminHeader() {
  const scrollPosition = useScrollPosition();
  const scrolled = scrollPosition > HEADER_SCROLLED_OFFSET;
  const { slug } = useSelectedEventSlug();
  const inviteHref = slug ? `/e/${slug}` : '/';

  return (
    <header
      className={cn(
        'sticky top-0 z-10 flex items-center shrink-0 bg-background border-b border-border py-3 lg:h-[70px] transition-shadow',
        scrolled && 'shadow-xs backdrop-blur-md bg-background/70',
      )}
    >
      <Container className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="text-mono text-lg font-semibold">eventGO</span>
          <span className="text-muted-foreground text-sm hidden sm:inline">Panel de administración</span>
        </div>

        <Button variant="outline" size="sm" asChild>
          <Link href={inviteHref} target="_blank">
            Ver invitación
            <ExternalLink />
          </Link>
        </Button>
      </Container>
    </header>
  );
}
