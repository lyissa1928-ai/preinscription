import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Gestion du stockage agricole',
  description: 'Gestion des stocks et entrepôts agricoles',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="min-h-screen bg-amber-50 text-slate-900 antialiased">{children}</body>
    </html>
  );
}
