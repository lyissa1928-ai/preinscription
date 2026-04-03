'use client';

export function SeverityBadge({ severity }: { severity: string }) {
  const styles: Record<string, string> = {
    CRITICAL: 'bg-red-100 text-red-800 border-red-200',
    WARNING: 'bg-amber-100 text-amber-800 border-amber-200',
    INFO: 'bg-blue-100 text-blue-800 border-blue-200',
  };
  const labels: Record<string, string> = {
    CRITICAL: 'Critique',
    WARNING: 'Attention',
    INFO: 'Info',
  };
  const s = severity?.toUpperCase?.() ?? 'INFO';
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${styles[s] ?? styles.INFO}`}
    >
      {labels[s] ?? severity}
    </span>
  );
}
