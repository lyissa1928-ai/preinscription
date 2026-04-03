'use client';

import Link from 'next/link';
import { Icon } from '@/components/ui/icons';
import { SectionCard } from './SectionCard';

export type AlertItem = {
  id: string;
  message: string;
  href?: string;
  severity: 'warning' | 'danger' | 'info';
  count?: number;
};

type AlertPanelProps = {
  alerts: AlertItem[];
};

const severityStyles = {
  warning: 'bg-amber-50 text-amber-800 border-amber-200',
  danger: 'bg-red-50 text-red-800 border-red-200',
  info: 'bg-blue-50 text-blue-800 border-blue-200',
};

const severityIcon = {
  warning: 'exclamation-circle',
  danger: 'x-circle',
  info: 'information-circle',
} as const;

export function AlertPanel({ alerts }: AlertPanelProps) {
  return (
    <SectionCard
      title="Alertes et points d'attention"
      description="À traiter en priorité"
    >
      {alerts.length === 0 ? (
        <p className="text-sm text-slate-500 py-2">Aucune alerte pour le moment.</p>
      ) : (
        <ul className="space-y-2">
          {alerts.map((alert) => {
            const style = severityStyles[alert.severity];
            const icon = severityIcon[alert.severity];
            const content = (
              <span className="flex items-center gap-2">
                <Icon name={icon} className="h-4 w-4 shrink-0" />
                <span>
                  {alert.message}
                  {alert.count != null && alert.count > 0 && (
                    <span className="font-medium ml-1">({alert.count})</span>
                  )}
                </span>
              </span>
            );
            return (
              <li key={alert.id}>
                {alert.href ? (
                  <Link
                    href={alert.href}
                    className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2.5 text-sm transition-colors hover:opacity-90 ${style}`}
                  >
                    {content}
                    <span className="text-xs opacity-80">Voir →</span>
                  </Link>
                ) : (
                  <div
                    className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2.5 text-sm ${style}`}
                  >
                    {content}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </SectionCard>
  );
}
