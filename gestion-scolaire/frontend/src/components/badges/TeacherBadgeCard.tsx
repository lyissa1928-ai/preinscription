'use client';

import { useEffect, useMemo, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import JsBarcode from 'jsbarcode';
import { getThemeImageSrc } from '@/lib/theme-images';

const DEFAULT_BRAND = '#ea580c';

function parseHex(hex: string | null | undefined): { r: number; g: number; b: number } {
  const m = /^#?([0-9a-fA-F]{6})$/.exec((hex || '').trim());
  if (!m) return { r: 234, g: 88, b: 12 };
  const n = parseInt(m[1], 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function rgbStr(r: number, g: number, b: number, a = 1) {
  return `rgba(${Math.round(r)},${Math.round(g)},${Math.round(b)},${a})`;
}

function formatFrDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export type TeacherBadgeCardProps = {
  firstName: string;
  lastName: string;
  jobTitle?: string | null;
  teacherContract?: string | null;
  personMatricule: string;
  rhMatricule?: string | null;
  dateNaissancePerson?: string | null;
  dateNaissanceUser?: string | null;
  hireDate?: string | null;
  profilePhotoUrl?: string | null;
  badgeBarcode: string;
  presenceQrContent: string;
  establishmentName?: string | null;
  logoUrl?: string | null;
  websiteUrl?: string | null;
  primaryColor?: string | null;
  annéeUniv: string;
  className?: string;
};

/**
 * Aperçu HTML du badge enseignant (structure proche du modèle « carte institutionnelle » :
 * bandeau graphique, photo circulaire, nom / fonction, grille, QR présence, code-barres).
 */
export function TeacherBadgeCard({
  firstName,
  lastName,
  jobTitle,
  teacherContract,
  personMatricule,
  rhMatricule,
  dateNaissancePerson,
  dateNaissanceUser,
  hireDate,
  profilePhotoUrl,
  badgeBarcode,
  presenceQrContent,
  establishmentName,
  logoUrl,
  websiteUrl,
  primaryColor,
  annéeUniv,
  className = '',
}: TeacherBadgeCardProps) {
  const barcodeRef = useRef<HTMLCanvasElement>(null);
  const base = parseHex(primaryColor || DEFAULT_BRAND);
  const c1 = rgbStr(base.r * 0.85, base.g * 0.9, base.b * 1.05);
  const c2 = rgbStr(base.r * 1.05, base.g * 0.95, base.b * 0.9);
  const c3 = rgbStr(base.r * 0.95, base.g * 1.08, base.b * 0.95);
  const fonction =
    (jobTitle && jobTitle.trim()) ||
    (teacherContract === 'VACATAIRE'
      ? 'Enseignant vacataire'
      : teacherContract === 'PERMANENT'
        ? 'Enseignant permanent'
        : 'Enseignant');
  const dob = formatFrDate(dateNaissanceUser || dateNaissancePerson);
  const hire = formatFrDate(hireDate);
  const fullName = `${firstName} ${lastName}`.trim().toUpperCase();
  const photoSrc = profilePhotoUrl ? getThemeImageSrc(profilePhotoUrl) : '';
  const logoSrc = logoUrl ? getThemeImageSrc(logoUrl) : '';

  const bannerStyle = useMemo(
    () => ({
      background: `
        linear-gradient(125deg, ${c1} 0%, transparent 55%),
        linear-gradient(210deg, ${c2} 0%, ${c3} 48%, ${c1} 100%),
        linear-gradient(to bottom, rgba(255,255,255,0.14), transparent 60%)
      `,
    }),
    [c1, c2, c3],
  );

  useEffect(() => {
    const canvas = barcodeRef.current;
    if (!canvas || !badgeBarcode) return;
    try {
      JsBarcode(canvas, badgeBarcode.replace(/\s/g, ''), {
        format: 'CODE128',
        displayValue: true,
        fontSize: 11,
        height: 36,
        margin: 0,
        width: 1.6,
      });
    } catch {
      /* ignore */
    }
  }, [badgeBarcode]);

  return (
    <div
      className={`relative w-full max-w-[532px] overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xl ${className}`}
      style={{ aspectRatio: '532 / 340' }}
    >
      <div className="absolute inset-x-0 top-0 h-[33%] min-h-[112px]" style={bannerStyle} />

      {/* Découpe visuelle type « encoche » sous la photo : disque blanc */}
      <div
        className="pointer-events-none absolute left-[5.5rem] top-[calc(33%-18px)] z-[1] h-[104px] w-[104px] -translate-x-1/2 rounded-full bg-white shadow-none ring-0"
        aria-hidden
      />

      <div className="absolute right-4 top-4 z-[3] flex h-10 w-10 items-center justify-center rounded-full bg-white/15 p-1 ring-1 ring-white/40">
        {logoSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoSrc} alt="" className="max-h-9 max-w-[2.25rem] object-contain brightness-0 invert" />
        ) : (
          <span className="text-[10px] font-bold uppercase tracking-tight text-white/90">Logo</span>
        )}
      </div>

      <div className="absolute left-[5.5rem] top-[calc(33%-18px)] z-[4] h-[92px] w-[92px] -translate-x-1/2">
        <div className="h-full w-full overflow-hidden rounded-full border-[3px] border-white bg-slate-100 shadow-sm ring-1 ring-slate-200/80">
          {photoSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photoSrc} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-lg font-bold text-slate-400">
              {firstName[0]}
              {lastName[0]}
            </div>
          )}
        </div>
      </div>

      <div className="absolute left-[9.25rem] right-[7.5rem] top-5 z-[2] text-white drop-shadow-sm">
        <p className="text-xs font-bold leading-tight line-clamp-2">
          {establishmentName?.trim() || 'Établissement'}
        </p>
        {websiteUrl?.trim() ? (
          <p className="mt-0.5 text-[10px] text-white/85 line-clamp-1">{websiteUrl.trim()}</p>
        ) : null}
      </div>

      <div className="absolute left-[9.25rem] right-[7rem] top-[calc(33%+6px)] z-[2]">
        <h2 className="text-[15px] font-bold leading-snug tracking-tight text-slate-900 line-clamp-2">
          {fullName}
        </h2>
        <p className="mt-1 text-[10px] font-medium" style={{ color: primaryColor || DEFAULT_BRAND }}>
          {fonction}
        </p>
        <div className="mt-2 h-px w-[calc(100%-6rem)] bg-slate-200/90" />
        <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-4 text-left">
          <div>
            <p className="text-[6.5px] font-medium uppercase tracking-wide text-slate-500">N° matricule</p>
            <p className="text-[9px] font-bold text-slate-900">{personMatricule}</p>
          </div>
          <div>
            <p className="text-[6.5px] font-medium uppercase tracking-wide text-slate-500">Date de naissance</p>
            <p className="text-[9px] font-bold text-slate-900">{dob}</p>
          </div>
          <div>
            <p className="text-[6.5px] font-medium uppercase tracking-wide text-slate-500">Année universitaire</p>
            <p className="text-[9px] font-bold text-slate-900">{annéeUniv}</p>
          </div>
          <div>
            <p className="text-[6.5px] font-medium uppercase tracking-wide text-slate-500">Prise de fonction</p>
            <p className="text-[9px] font-bold text-slate-900">{hire}</p>
          </div>
        </div>
        {rhMatricule?.trim() ? (
          <div className="mt-3">
            <p className="text-[6.5px] font-medium uppercase tracking-wide text-slate-500">Réf. RH</p>
            <p className="text-[9px] font-bold text-slate-900">{rhMatricule.trim()}</p>
          </div>
        ) : null}
      </div>

      <div className="absolute bottom-[4.5rem] right-4 z-[2] rounded-md border border-slate-200/90 bg-slate-50/95 p-1.5 shadow-sm">
        <p className="mb-0.5 text-center text-[6.5px] font-bold uppercase tracking-wide text-slate-500">Présence</p>
        <p className="mb-1 text-center text-[6px] text-slate-500">Scan → pointage</p>
        <div className="rounded bg-white p-0.5">
          <QRCodeSVG value={presenceQrContent} size={74} level="M" />
        </div>
      </div>

      <div className="absolute bottom-2 right-3 z-[2] flex flex-col items-end">
        <canvas ref={barcodeRef} className="max-h-12 max-w-[168px]" />
      </div>
    </div>
  );
}
