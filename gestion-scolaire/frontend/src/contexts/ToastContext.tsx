'use client';

import React, { createContext, useCallback, useContext, useState } from 'react';

export type ToastType = 'success' | 'error' | 'info';

type Toast = { id: number; message: string; type: ToastType };

type ToastContextValue = {
  toast: (message: string, type?: ToastType) => void;
  success: (message: string) => void;
  error: (message: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

let id = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const add = useCallback((message: string, type: ToastType = 'info') => {
    const currentId = ++id;
    setToasts((prev) => [...prev, { id: currentId, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== currentId));
    }, 4000);
  }, []);

  const toast = useCallback((message: string, type?: ToastType) => add(message, type || 'info'), [add]);
  const success = useCallback((message: string) => add(message, 'success'), [add]);
  const error = useCallback((message: string) => add(message, 'error'), [add]);

  return (
    <ToastContext.Provider value={{ toast, success, error }}>
      {children}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto px-4 py-3 rounded-lg shadow-lg text-sm font-medium text-white ${
              t.type === 'error' ? 'bg-red-600' : t.type === 'success' ? 'bg-green-600' : 'bg-slate-700'
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return {
      toast: (msg: string) => alert(msg),
      success: (msg: string) => alert(msg),
      error: (msg: string) => alert(msg),
    };
  }
  return ctx;
}
