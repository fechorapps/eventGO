import type { ReactNode } from 'react';
import './metronic.css';
import { AdminHeader } from '@/components/admin/header';
import { AdminLoginGate } from '@/components/admin/AdminLoginGate';
import { SelectedEventProvider } from '@/components/admin/selected-event-context';
import { verifyAdmin } from '@/lib/auth';

// The login flow's router.refresh() (in AdminLoginGate) only re-runs this
// layout's server-side verifyAdmin() check if the segment is dynamic —
// on a fully static/cached segment, refresh() silently no-ops. cookies()
// inside verifyAdmin() already forces dynamic rendering today; this export
// makes that dependency explicit instead of implicit, so it can't be lost
// by a future refactor that moves the auth check elsewhere.
export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const authenticated = await verifyAdmin();

  return (
    <SelectedEventProvider>
      <div className="metronic-scope min-h-screen flex flex-col bg-background text-foreground">
        <AdminHeader authenticated={authenticated} />
        <div className="grow" role="content">
          {authenticated ? children : <AdminLoginGate />}
        </div>
      </div>
    </SelectedEventProvider>
  );
}
