'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { AlertDTO } from '@/lib/api';
import { SeverityBadge } from './SeverityBadge';
import { StatusBadge } from './StatusBadge';
import { MuteDialog } from './MuteDialog';
import { useAckAlert, useResolveAlert, useMuteAlert } from '@/hooks/use-alerts';

type AlertCardProps = {
  alert: AlertDTO;
};

export function AlertCard({ alert }: AlertCardProps) {
  const [muteOpen, setMuteOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const ackMutation = useAckAlert();
  const resolveMutation = useResolveAlert();
  const muteMutation = useMuteAlert();

  const handleAction = async (fn: () => Promise<unknown>) => {
    setErrorMsg(null);
    try {
      await fn();
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'Erreur');
    }
  };

  const isOpen = alert.status === 'OPEN';
  const isMuted = alert.status === 'MUTED';
  const loading = ackMutation.isPending || resolveMutation.isPending || muteMutation.isPending;

  const formatDate = (d: string | null) =>
    d ? new Date(d).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) : '-';

  return (
    <>
      <div className="bg-white rounded-2xl shadow-sm p-4 border border-stone-100">
        <div className="flex justify-between items-start gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap gap-2 items-center mb-2">
              <SeverityBadge severity={alert.severity} />
              <StatusBadge status={alert.status} />
            </div>
            <h3 className="font-semibold text-stone-800">{alert.title}</h3>
            <p className="text-stone-600 text-sm mt-1">{alert.message}</p>
            <div className="flex flex-wrap gap-4 mt-2 text-xs text-stone-500">
              <span>
                Parcelle: {alert.parcelName ?? alert.parcelId}
              </span>
              <span>Déclenchée: {formatDate(alert.triggeredAt)}</span>
              {alert.ackedAt && <span>Acquittée: {formatDate(alert.ackedAt)}</span>}
              {alert.resolvedAt && <span>Résolue: {formatDate(alert.resolvedAt)}</span>}
              {alert.mutedUntil && <span>Mute jusqu&apos;à: {formatDate(alert.mutedUntil)}</span>}
            </div>
          </div>
          <div className="flex flex-col gap-2 shrink-0">
            <Link
              href={`/parcels/${alert.parcelId}`}
              className="text-sm text-emerald-600 hover:underline"
            >
              Voir parcelle
            </Link>
            {(isOpen || isMuted) && (
              <div className="flex flex-col gap-2">
                {errorMsg && (
                  <p className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded">{errorMsg}</p>
                )}
                <div className="flex flex-wrap gap-2">
                  {isOpen && (
                    <button
                      onClick={() => handleAction(() => ackMutation.mutateAsync(alert.id))}
                      disabled={loading}
                      className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      Acquitter
                    </button>
                  )}
                  {(isOpen || isMuted) && (
                    <>
                      <button
                        onClick={() => setMuteOpen(true)}
                        disabled={loading}
                        className="px-3 py-1.5 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
                      >
                        Mute
                      </button>
                      <button
                        onClick={() => handleAction(() => resolveMutation.mutateAsync(alert.id))}
                        disabled={loading}
                        className="px-3 py-1.5 text-sm bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50"
                      >
                        Résoudre
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {muteOpen && (
        <MuteDialog
          alertId={alert.id}
          alertTitle={alert.title}
          onConfirm={async (hours) => muteMutation.mutateAsync({ id: alert.id, hours })}
          onClose={() => setMuteOpen(false)}
        />
      )}
    </>
  );
}
