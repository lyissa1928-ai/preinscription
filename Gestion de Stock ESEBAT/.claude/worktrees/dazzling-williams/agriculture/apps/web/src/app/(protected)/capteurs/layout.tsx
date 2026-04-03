'use client';

import { useRequireRole } from '@/hooks/use-require-role';

export default function CapteursLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useRequireRole(['ADMIN', 'TECHNICIAN']);
  return <>{children}</>;
}
