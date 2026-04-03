'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';

export default function ConsultationPage() {
  const router = useRouter();
  const { currentUser } = useAuth();

  useEffect(() => {
    if (!currentUser) return;
    if (currentUser.role === 'AGRONOMIST') {
      router.replace('/consultation/crops');
    } else if (currentUser.role === 'TECHNICIAN') {
      router.replace('/consultation/regions');
    } else {
      router.replace('/dashboard');
    }
  }, [currentUser, router]);

  return (
    <div className="flex items-center justify-center min-h-[200px]">
      <div className="animate-pulse text-stone-500">Redirection...</div>
    </div>
  );
}
