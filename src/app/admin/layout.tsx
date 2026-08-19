import type { ReactNode } from 'react';
import './metronic.css';
import { AdminHeader } from '@/components/admin/header';
import { SelectedEventProvider } from '@/components/admin/selected-event-context';

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <SelectedEventProvider>
      <div className="metronic-scope min-h-screen flex flex-col bg-background text-foreground">
        <AdminHeader />
        <div className="grow" role="content">
          {children}
        </div>
      </div>
    </SelectedEventProvider>
  );
}
