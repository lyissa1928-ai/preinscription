import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-4">
      <h1 className="text-6xl font-bold text-slate-300">404</h1>
      <p className="mt-2 text-slate-600 text-lg">Page introuvable</p>
      <p className="mt-1 text-slate-500 text-sm">L’adresse demandée n’existe pas ou a été déplacée.</p>
      <Link
        href="/dashboard"
        className="mt-6 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
      >
        Retour au tableau de bord
      </Link>
    </div>
  );
}
