'use client';

import { useState } from 'react';

type MuteDialogProps = {
  alertId: string;
  alertTitle: string;
  onConfirm: (hours: number) => Promise<unknown>;
  onClose: () => void;
};

const PRESETS = [
  { label: '6 heures', hours: 6 },
  { label: '12 heures', hours: 12 },
  { label: '24 heures', hours: 24 },
  { label: '48 heures', hours: 48 },
];

export function MuteDialog({ alertId, alertTitle, onConfirm, onClose }: MuteDialogProps) {
  const [hours, setHours] = useState(24);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await onConfirm(hours);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">Mettre en sourdine</h3>
        <p className="text-gray-600 text-sm mb-4">{alertTitle}</p>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Durée</label>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p.hours}
                  type="button"
                  onClick={() => setHours(p.hours)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border ${
                    hours === p.hours
                      ? 'bg-green-600 text-white border-green-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <div className="mt-2">
              <input
                type="number"
                min={1}
                max={168}
                value={hours}
                onChange={(e) => setHours(parseInt(e.target.value, 10) || 24)}
                className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
              <span className="ml-2 text-sm text-gray-500">heures</span>
            </div>
          </div>
          {error && (
            <p className="mb-4 text-sm text-red-600 bg-red-50 p-2 rounded">{error}</p>
          )}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? 'En cours…' : 'Confirmer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
