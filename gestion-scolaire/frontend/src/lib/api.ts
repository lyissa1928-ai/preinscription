import { clearSession } from './session';

const DEFAULT_BACKEND = 'http://localhost:3000';

export function getApiUrl(): string {
  if (typeof process.env.NEXT_PUBLIC_API_URL === 'string' && process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, '');
  }
  if (typeof window !== 'undefined') {
    return DEFAULT_BACKEND;
  }
  return DEFAULT_BACKEND;
}

export function getFetchUrl(path: string): string {
  const base = getApiUrl();
  const pathNorm = path.startsWith('/') ? path : `/${path}`;
  return `${base}${pathNorm}`;
}

const API_URL = getApiUrl();

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('refresh_token');
}

function setToken(accessToken: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('token', accessToken);
}

function handleUnauthorized(): void {
  if (typeof window === 'undefined') return;
  clearSession();
  window.location.href = '/login?expired=1';
}

/** Tente de renouveler l'access token via le refresh token. Retourne le nouveau token ou null. */
async function tryRefreshToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;
  const base = getApiUrl();
  const url = `${base}/auth/refresh`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { access_token?: string };
    if (data.access_token) {
      setToken(data.access_token);
      return data.access_token;
    }
  } catch {
    // ignore
  }
  return null;
}

export async function api<T>(
  path: string,
  options: RequestInit & { token?: string; _retried?: boolean } = {}
): Promise<T> {
  const { token, _retried, ...init } = options;
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string>),
  };
  const authToken = token ?? getToken();
  if (authToken) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${authToken}`;
  }
  const url = typeof window !== 'undefined' ? getFetchUrl(path) : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}${path.startsWith('/') ? path : '/' + path}`;
  let res: Response;
  try {
    res = await fetch(url, { ...init, headers });
  } catch (err) {
    const msg =
      err instanceof TypeError && (err.message === 'Failed to fetch' || (err as Error).message?.includes('fetch'))
        ? `Impossible de joindre le serveur. Vérifiez que l'API est démarrée (${getApiUrl()}).`
        : err instanceof Error
          ? err.message
          : 'Erreur réseau';
    throw new Error(msg);
  }
  if (res.status === 401 && !_retried && typeof window !== 'undefined') {
    const newToken = await tryRefreshToken();
    if (newToken) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${newToken}`;
      try {
        res = await fetch(url, { ...init, headers });
      } catch (err2) {
        const msg =
          err2 instanceof TypeError && ((err2 as Error).message === 'Failed to fetch' || (err2 as Error).message?.includes('fetch'))
            ? `Impossible de joindre le serveur. Vérifiez que l'API est démarrée (${getApiUrl()}).`
            : err2 instanceof Error
              ? err2.message
              : 'Erreur réseau';
        throw new Error(msg);
      }
    }
  }
  if (res.status === 401) {
    handleUnauthorized();
    throw new Error('Session expirée');
  }
  if (!res.ok) {
    const text = await res.text();
    let msg = res.statusText;
    try {
      const err = JSON.parse(text);
      msg = err.message || err.error || (Array.isArray(err.message) ? err.message.join(', ') : text);
    } catch {
      msg = text || msg;
    }
    throw new Error(msg);
  }
  return res.json();
}

export type DownloadFileOptions = {
  /** Vérifie que le fichier commence par %PDF (évite un JSON/HTML téléchargé par erreur). */
  validatePdfMagic?: boolean;
};

export async function downloadFile(
  path: string,
  filename: string,
  options?: DownloadFileOptions,
): Promise<void> {
  let token = getToken();
  const url = typeof window !== 'undefined' ? getFetchUrl(path) : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}${path.startsWith('/') ? path : '/' + path}`;
  const headers: HeadersInit = {};
  if (token) (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  let res = await fetch(url, { headers });
  if (res.status === 401 && typeof window !== 'undefined') {
    const newToken = await tryRefreshToken();
    if (newToken) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${newToken}`;
      res = await fetch(url, { headers });
    }
  }
  if (res.status === 401) {
    handleUnauthorized();
    throw new Error('Session expirée');
  }
  if (!res.ok) {
    const text = await res.text();
    let msg = res.statusText;
    try {
      const err = JSON.parse(text);
      msg = err.message || err.error || msg;
    } catch {
      msg = text || msg;
    }
    throw new Error(msg);
  }
  const blob = await res.blob();
  if (options?.validatePdfMagic) {
    const headBuf = await blob.slice(0, 5).arrayBuffer();
    const head = new TextDecoder('latin1').decode(headBuf);
    if (!head.startsWith('%PDF')) {
      throw new Error(
        'La réponse du serveur n’est pas un PDF valide. Vérifiez les journaux API ou réessayez plus tard.',
      );
    }
  }
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(blobUrl);
}

export const downloadPdf = downloadFile;

export async function apiUpload<T>(path: string, formData: FormData): Promise<T> {
  let token = getToken();
  const headers: HeadersInit = {};
  if (token) (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  const url = typeof window !== 'undefined' ? getFetchUrl(path) : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}${path.startsWith('/') ? path : '/' + path}`;
  let res = await fetch(url, { method: 'POST', body: formData, headers });
  if (res.status === 401 && typeof window !== 'undefined') {
    const newToken = await tryRefreshToken();
    if (newToken) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${newToken}`;
      res = await fetch(url, { method: 'POST', body: formData, headers });
    }
  }
  if (res.status === 401) {
    handleUnauthorized();
    throw new Error('Session expirée');
  }
  if (!res.ok) {
    const text = await res.text();
    let msg = res.statusText;
    try {
      const err = JSON.parse(text);
      msg = err.message || err.error || (Array.isArray(err.message) ? err.message.join(', ') : text);
    } catch {
      msg = text || msg;
    }
    throw new Error(msg);
  }
  const text = await res.text();
  if (!text || !text.trim()) throw new Error('Réponse vide du serveur');
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error('Réponse invalide du serveur (JSON attendu).');
  }
}

export async function downloadCsv(path: string, filename: string): Promise<void> {
  let token = getToken();
  const headers: HeadersInit = {};
  if (token) (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  const url = typeof window !== 'undefined' ? getFetchUrl(path) : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}${path.startsWith('/') ? path : '/' + path}`;
  let res = await fetch(url, { headers });
  if (res.status === 401 && typeof window !== 'undefined') {
    const newToken = await tryRefreshToken();
    if (newToken) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${newToken}`;
      res = await fetch(url, { headers });
    }
  }
  if (res.status === 401) {
    handleUnauthorized();
    throw new Error('Session expirée');
  }
  if (!res.ok) {
    const text = await res.text();
    let msg = res.statusText;
    try {
      const err = JSON.parse(text);
      msg = err.message || err.error || msg;
    } catch {
      msg = text || msg;
    }
    throw new Error(msg);
  }
  const text = await res.text();
  const blob = new Blob([text], { type: 'text/csv;charset=utf-8' });
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(blobUrl);
}
