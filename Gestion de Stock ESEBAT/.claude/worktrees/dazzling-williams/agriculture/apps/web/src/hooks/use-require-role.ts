'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './use-auth';

export function useRequireRole(allowedRoles: string[]) {
  const { currentUser } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!currentUser) return;
    if (!allowedRoles.includes(currentUser.role)) {
      router.replace('/dashboard');
    }
  }, [currentUser, allowedRoles, router]);
}
