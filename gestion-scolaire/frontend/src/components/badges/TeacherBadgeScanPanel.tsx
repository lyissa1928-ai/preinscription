'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import { Card } from '@/components/ui/card';

export type TeacherBadgeScanApiResult = {
  success: boolean;
  code: string;
  message: string;
  attendance?: { id: string; heureArrivee: string };
  teacher?: { firstName: string; lastName: string; matricule?: string | null };
};

const SCANNER_REGION_ID = 'html5-qrcode-teacher-badge';

export function TeacherBadgeScanPanel() {
  const toast = useToast();
  const [manual, setManual] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TeacherBadgeScanApiResult | null>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [camHint, setCamHint] = useState<string | null>(null);
  const lastDecodeRef = useRef(0);
  const scannerCleanupRef = useRef<(() => Promise<void>) | null>(null);

  const submit = useCallback(
    async (raw: string) => {
      const qr = raw?.trim();
      if (!qr) {
        toast.error('Saisissez ou scannez le contenu du QR du badge.');
        return;
      }
      setLoading(true);
      setResult(null);
      try {
        const r = await api<TeacherBadgeScanApiResult>('/attendance/scan-teacher-badge', {
          method: 'POST',
          body: JSON.stringify({ qr }),
        });
        setResult(r);
        if (r.success) toast.success(r.message);
        else toast.error(r.message);
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Erreur serveur.';
        setResult({ success: false, code: 'SERVER', message: msg });
        toast.error(msg);
      } finally {
        setLoading(false);
      }
    },
    [toast],
  );

  const onDecoded = useCallback(
    (text: string) => {
      const now = Date.now();
      if (now - lastDecodeRef.current < 2500) return;
      lastDecodeRef.current = now;
      void submit(text);
    },
    [submit],
  );

  useEffect(() => {
    if (!cameraOn || typeof window === 'undefined') {
      void scannerCleanupRef.current?.();
      return;
    }

    let cancelled = false;
    setCamHint(null);

    import('html5-qrcode')
      .then(({ Html5Qrcode }) => {
        if (cancelled) return;
        const html5 = new Html5Qrcode(SCANNER_REGION_ID, /* verbose */ false);
        scannerCleanupRef.current = async () => {
          try {
            await html5.stop();
            await html5.clear();
          } catch {
            /* ignore */
          }
          scannerCleanupRef.current = null;
        };
        return html5.start(
          { facingMode: 'environment' },
          { fps: 8, qrbox: { width: 240, height: 240 } },
          (decoded) => onDecoded(decoded),
          () => {},
        );
      })
      .catch((e: unknown) => {
        setCamHint(
          e instanceof Error
            ? e.message
            : 'Caméra indisponible. Utilisez la saisie manuelle ou un autre appareil.',
        );
        setCameraOn(false);
      });

    return () => {
      cancelled = true;
      void scannerCleanupRef.current?.();
    };
  }, [cameraOn, onDecoded]);

  const resultTone = result?.success ? 'success' : result ? 'error' : 'neutral';

  return (
    <div className="space-y-4 max-w-xl">
      <Card title="Scanner le badge enseignant" description="Enregistre une présence journalière (une fois par jour et par enseignant).">
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setCameraOn((v) => !v)}
              className="rounded-lg border px-4 py-2 text-sm font-medium transition-colors hover:bg-[var(--surface-secondary)]"
              style={{ borderColor: 'var(--color-border)' }}
            >
              {cameraOn ? 'Arrêter la caméra' : 'Activer la caméra'}
            </button>
          </div>
          <div
            className="rounded-lg overflow-hidden border bg-black/5"
            style={{ borderColor: 'var(--color-border)', display: cameraOn ? 'block' : 'none' }}
            aria-hidden={!cameraOn}
          >
            <div id={SCANNER_REGION_ID} className="w-full min-h-[220px]" />
          </div>
          {camHint && <p className="text-sm text-amber-700">{camHint}</p>}

          <div>
            <label htmlFor="manual-qr" className="block text-sm font-medium text-[var(--foreground-muted)] mb-1">
              Contenu du QR (saisie manuelle ou douchette)
            </label>
            <textarea
              id="manual-qr"
              rows={3}
              value={manual}
              onChange={(e) => setManual(e.target.value)}
              placeholder="Collez le texte lu dans le QR (ex. GEST1....)"
              className="w-full rounded-lg border px-3 py-2 text-sm font-mono bg-[var(--surface)]"
              style={{ borderColor: 'var(--color-border)' }}
            />
          </div>
          <button
            type="button"
            disabled={loading}
            onClick={() => void submit(manual)}
            className="w-full sm:w-auto rounded-lg px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            style={{ background: 'var(--color-primary, #0f766e)' }}
          >
            {loading ? 'Traitement…' : 'Valider le scan'}
          </button>
        </div>
      </Card>

      {result && (
        <div
          role="status"
          className={`rounded-xl border p-4 text-sm ${
            resultTone === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
              : 'border-red-200 bg-red-50 text-red-900'
          }`}
        >
          <p className="font-semibold">{result.message}</p>
          <p className="mt-1 text-xs opacity-80">Code : {result.code}</p>
          {result.teacher && (
            <p className="mt-2">
              {result.teacher.firstName} {result.teacher.lastName}
              {result.teacher.matricule ? ` · ${result.teacher.matricule}` : ''}
            </p>
          )}
          {result.attendance?.heureArrivee && (
            <p className="mt-1 text-xs">
              Horodatage : {new Date(result.attendance.heureArrivee).toLocaleString('fr-FR')}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
