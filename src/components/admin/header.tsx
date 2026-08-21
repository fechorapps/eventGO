'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ExternalLink, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useScrollPosition } from '@/hooks/use-scroll-position';
import { Container } from '@/components/admin/ui/container';
import { Button } from '@/components/admin/ui/button';
import { useSelectedEventSlug } from '@/components/admin/selected-event-context';

const HEADER_SCROLLED_OFFSET = 8;

export function AdminHeader({ authenticated = false }: { authenticated?: boolean }) {
  const scrollPosition = useScrollPosition();
  const scrolled = scrollPosition > HEADER_SCROLLED_OFFSET;
  const { slug } = useSelectedEventSlug();
  const inviteHref = slug ? `/e/${slug}` : '/';

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
    } catch (e) {
      console.error(e);
    }
    // Hard navigation, not router.refresh(): clears the client router
    // cache so Back after logout can't render a stale authenticated shell
    // whose fetches would just 401.
    window.location.href = '/admin';
  };

  return (
    <header
      className={cn(
        'sticky top-0 z-10 flex items-center shrink-0 bg-background border-b border-border py-3 lg:h-[70px] transition-shadow',
        scrolled && 'shadow-xs backdrop-blur-md bg-background/70',
      )}
    >
      <Container className="flex flex-wrap items-center justify-between gap-3 max-sm:py-1">
        <div className="flex items-center gap-2.5">
          <Link href="/admin" className="flex items-center gap-2 no-underline" aria-label="EventGo, ir al panel de administración">
            <Image src="/brand/eventgo-mark.png" alt="" width={32} height={32} priority className="size-8 shrink-0" />
            <span className="text-mono text-lg font-semibold tracking-tight text-foreground">EventGo</span>
          </Link>
          <span className="text-muted-foreground text-sm hidden sm:inline">Panel de administración</span>
        </div>

        <div className="flex items-center gap-2 max-sm:w-full">
          <Button variant="outline" size="sm" className="max-sm:h-11 max-sm:flex-1" asChild>
            <Link href={inviteHref} target="_blank">
              Ver invitación
              <ExternalLink />
            </Link>
          </Button>
          {authenticated && (
            <Button variant="outline" size="sm" className="max-sm:h-11 max-sm:flex-1" onClick={handleLogout}>
              Salir
              <LogOut />
            </Button>
          )}
        </div>
      </Container>
    </header>
  );
}
