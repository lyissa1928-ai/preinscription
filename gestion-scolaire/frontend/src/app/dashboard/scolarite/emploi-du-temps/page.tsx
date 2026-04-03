'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ScolariteEmploiDuTempsRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/dashboard/pedagogie/emploi-du-temps');
  }, [router]);
  return <p className="text-slate-500 p-6">Redirection vers Pédagogie → Emploi du temps...</p>;
}
