'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** Ancienne entrée « Examens » : tout est regroupé sous Notes / évaluations. */
export default function ExamensRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/dashboard/pedagogie/notes');
  }, [router]);
  return (
    <div className="p-6 text-sm text-[var(--foreground-muted)]">
      Redirection vers Évaluations &amp; notes…
    </div>
  );
}
