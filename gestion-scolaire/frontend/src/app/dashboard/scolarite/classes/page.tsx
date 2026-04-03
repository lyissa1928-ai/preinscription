'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ScolariteClassesRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/dashboard/pedagogie/classes');
  }, [router]);
  return <p className="text-slate-500">Redirection vers Pédagogie → Classes...</p>;
}
