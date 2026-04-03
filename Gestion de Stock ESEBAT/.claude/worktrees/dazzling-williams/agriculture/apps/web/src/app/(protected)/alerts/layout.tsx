'use client';

import { useRequireRole } from '@/hooks/use-require-role';

export default function AlertsLayout({ children }: { children: React.ReactNode }) {
  useRequireRole(['FARMER']);
  return <>{children}</>;
}
