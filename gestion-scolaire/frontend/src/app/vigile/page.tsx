'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
const QUEUE_KEY = 'vigile_checkin_queue';

type CheckResult = { authorized: boolean; message: string; nom?: string };

type QueuedCheckIn = { matricule: string; timestamp: number };

function getQueue(): QueuedCheckIn[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setQueue(queue: QueuedCheckIn[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export default function VigileKiosquePage() {
  const [matricule, setMatricule] = useState('');
  const [result, setResult] = useState<CheckResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [offline, setOffline] = useState(false);
  const [queueLength, setQueueLength] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const persistQueueLength = useCallback(() => {
    setQueueLength(getQueue().length);
  }, []);

  const sendCheckIn = useCallback(async (value: string): Promise<CheckResult | null> => {
    const res = await fetch(`${API_URL}/vigile/check-in`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ matricule: value }),
    });
    return res.json();
  }, []);

  const flushQueue = useCallback(async () => {
    const queue = getQueue();
    if (queue.length === 0) {
      persistQueueLength();
      return;
    }
    setSyncing(true);
    const remaining: QueuedCheckIn[] = [];
    for (const item of queue) {
      try {
        await sendCheckIn(item.matricule);
      } catch {
        remaining.push(item);
      }
    }
    setQueue(remaining);
    persistQueueLength();
    setSyncing(false);
  }, [sendCheckIn, persistQueueLength]);

  const checkIn = async (value: string) => {
    const v = value?.trim();
    if (!v) return;
    setLoading(true);
    setResult(null);

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      const queue = getQueue();
      queue.push({ matricule: v, timestamp: Date.now() });
      setQueue(queue);
      setOffline(true);
      setQueueLength(queue.length);
      setResult({ authorized: true, message: `Enregistré localement (${queue.length} en attente de synchronisation)` });
      setMatricule('');
      setLoading(false);
      setTimeout(() => { setResult(null); inputRef.current?.focus(); }, 3000);
      return;
    }

    try {
      const data = await sendCheckIn(v);
      setResult(data ?? { authorized: false, message: 'Réponse invalide' });
      setMatricule('');
      setTimeout(() => {
        setResult(null);
        inputRef.current?.focus();
      }, 3000);
    } catch {
      const queue = getQueue();
      queue.push({ matricule: v, timestamp: Date.now() });
      setQueue(queue);
      setOffline(true);
      setQueueLength(queue.length);
      setResult({ authorized: true, message: `Connexion impossible. Enregistré localement (${queue.length} en attente).` });
      setTimeout(() => { setResult(null); inputRef.current?.focus(); }, 4000);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    checkIn(matricule);
  };

  useEffect(() => {
    setOffline(typeof navigator !== 'undefined' && !navigator.onLine);
    persistQueueLength();
  }, [persistQueueLength]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onOnline = () => {
      setOffline(false);
      flushQueue();
    };
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [flushQueue]);

  useEffect(() => {
    if (!offline && queueLength > 0) flushQueue();
  }, [offline, queueLength, flushQueue]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 p-4">
      <h1 className="text-white text-xl mb-8 font-medium">Contrôle d&apos;accès</h1>

      {offline && (
        <div className="mb-4 px-4 py-2 bg-amber-600 text-white rounded-lg text-sm">
          Mode hors ligne — Les passages sont enregistrés localement et seront synchronisés au rétablissement de la connexion.
        </div>
      )}
      {queueLength > 0 && !syncing && (
        <div className="mb-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">
          {queueLength} passage(s) en attente de synchronisation.
        </div>
      )}
      {syncing && (
        <div className="mb-4 px-4 py-2 bg-slate-600 text-white rounded-lg text-sm">
          Synchronisation en cours...
        </div>
      )}

      {!result ? (
        <form onSubmit={handleSubmit} className="w-full max-w-md">
          <input
            ref={inputRef}
            type="text"
            value={matricule}
            onChange={(e) => setMatricule(e.target.value)}
            placeholder="Scannez ou saisissez le matricule"
            className="w-full px-6 py-4 text-xl border-2 border-slate-600 rounded-lg bg-slate-800 text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none"
            autoFocus
            autoComplete="off"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !matricule.trim()}
            className="mt-4 w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Vérification...' : 'Vérifier'}
          </button>
        </form>
      ) : (
        <div
          className={`w-full max-w-2xl p-12 rounded-2xl text-center ${
            result.authorized ? 'bg-green-600' : 'bg-red-600'
          }`}
        >
          <div className="text-6xl font-bold text-white mb-4">
            {result.authorized ? 'AUTORISÉ' : 'REFUSÉ'}
          </div>
          {result.nom && (
            <div className="text-2xl text-white/90 mb-2">{result.nom}</div>
          )}
          <div className="text-xl text-white/80">{result.message}</div>
          <div className="mt-6 text-white/60 text-sm">Prochain scan dans 3 secondes...</div>
        </div>
      )}

      <p className="mt-8 text-slate-500 text-sm">
        Mode kiosque — Fonctionne hors ligne, synchronisation automatique au retour de la connexion.
      </p>
    </div>
  );
}
