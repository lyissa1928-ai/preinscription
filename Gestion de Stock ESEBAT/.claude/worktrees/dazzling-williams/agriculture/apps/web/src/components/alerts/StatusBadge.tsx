'use client';

export function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    OPEN: 'bg-orange-100 text-orange-800 border-orange-200',
    ACKED: 'bg-blue-100 text-blue-800 border-blue-200',
    RESOLVED: 'bg-green-100 text-green-800 border-green-200',
    MUTED: 'bg-gray-100 text-gray-700 border-gray-200',
  };
  const labels: Record<string, string> = {
    OPEN: 'Ouverte',
    ACKED: 'Acquittée',
    RESOLVED: 'Résolue',
    MUTED: 'En sourdine',
  };
  const s = status?.toUpperCase?.() ?? 'OPEN';
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${styles[s] ?? styles.OPEN}`}
    >
      {labels[s] ?? status}
    </span>
  );
}
