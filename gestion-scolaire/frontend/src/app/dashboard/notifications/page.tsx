'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

type Notification = {
  id: string;
  type: string;
  message: string;
  lu: boolean;
  createdAt: string;
};

export default function NotificationsPage() {
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    api<Notification[]>('/notifications').then(setItems).catch(() => setItems([])).finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const markAsRead = (id: string) => {
    api(`/notifications/${id}/read`, { method: 'PATCH' }).then(() => {
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, lu: true } : n)));
    });
  };

  const markAllAsRead = () => {
    api('/notifications/read-all', { method: 'PATCH' }).then(() => {
      setItems((prev) => prev.map((n) => ({ ...n, lu: true })));
    });
  };

  const unreadCount = items.filter((n) => !n.lu).length;

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <p className="text-slate-500">Chargement...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Notifications</h1>
        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            Tout marquer comme lu
          </button>
        )}
      </div>
      {items.length === 0 ? (
        <div className="bg-white rounded-lg border border-slate-200 p-8 text-center text-slate-500">
          Aucune notification
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((n) => (
            <li
              key={n.id}
              className={`bg-white rounded-lg border p-4 flex justify-between items-start ${
                n.lu ? 'border-slate-200' : 'border-blue-200 bg-blue-50/30'
              }`}
            >
              <div className="flex-1">
                <p className="text-slate-800">{n.message}</p>
                <p className="text-xs text-slate-500 mt-1">
                  {new Date(n.createdAt).toLocaleString('fr-FR')}
                  {n.type && ` • ${n.type}`}
                </p>
              </div>
              {!n.lu && (
                <button
                  onClick={() => markAsRead(n.id)}
                  className="text-sm text-blue-600 hover:text-blue-700 ml-2"
                >
                  Marquer lu
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      <p className="mt-4">
        <Link href="/dashboard" className="text-blue-600 hover:text-blue-700">
          ← Retour au tableau de bord
        </Link>
      </p>
    </div>
  );
}
