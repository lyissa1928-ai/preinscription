/**
 * Présentation premium partagée des tableaux de bord (UI uniquement).
 * Règle : le hero empile toujours titre + actions (jamais côte à côte
 * avec des boutons shrink-0 qui écrasent le sous-titre).
 */

export function DashboardPage({ children, maxWidthClass = 'max-w-7xl', className = '' }) {
  return (
    <main
      className={`ui-page relative ${maxWidthClass} mx-auto w-full min-h-[calc(100vh-5rem)] px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10 ${className}`}
    >
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden>
        <div className="absolute -top-32 left-1/2 h-[28rem] w-[min(100%,64rem)] -translate-x-1/2 rounded-[100%] bg-gradient-to-b from-blue-400/20 via-indigo-400/10 to-transparent blur-3xl" />
        <div className="absolute top-48 -right-20 h-72 w-72 animate-pulse-glow rounded-full bg-cyan-400/14 blur-3xl" />
        <div className="absolute bottom-20 -left-24 h-80 w-80 rounded-full bg-violet-400/10 blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_0%,rgba(248,250,252,0.55)_45%,rgb(248,250,252)_100%)]" />
      </div>
      <div className="relative z-[1] animate-fade-in w-full min-w-0">{children}</div>
    </main>
  )
}

export function DashboardHero({ eyebrow, title, subtitle, actions }) {
  return (
    <div className="animate-fade-in-up relative mb-8 overflow-hidden rounded-2xl border border-white/90 bg-white/80 p-5 shadow-[0_20px_50px_-18px_rgba(15,23,42,0.12),0_0_0_1px_rgba(255,255,255,0.95)_inset] backdrop-blur-xl sm:mb-10 sm:rounded-[1.75rem] sm:p-8 md:p-10">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_60%_at_0%_-10%,rgba(99,102,241,0.1),transparent_55%),radial-gradient(ellipse_70%_50%_at_100%_0%,rgba(168,85,247,0.07),transparent_50%)]"
        aria-hidden
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/90 via-slate-50/90 to-indigo-50/35" aria-hidden />
      <div
        className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-gradient-to-bl from-indigo-400/25 via-sky-400/12 to-transparent blur-3xl"
        aria-hidden
      />

      {/* Toujours en colonne : le sous-titre ne doit jamais être écrasé par les actions */}
      <div className="relative flex w-full min-w-0 flex-col gap-5 sm:gap-6">
        <div className="w-full min-w-0">
          {eyebrow ? (
            <p className="mb-3 inline-flex max-w-full items-center gap-2 rounded-full border border-indigo-100/80 bg-gradient-to-r from-indigo-50 to-violet-50/90 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-indigo-800 shadow-sm">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500" aria-hidden />
              <span className="truncate">{eyebrow}</span>
            </p>
          ) : null}
          <h1 className="text-2xl font-black tracking-tight text-slate-900 break-words sm:text-3xl md:text-[2.35rem] md:leading-[1.15]">
            {title}
          </h1>
          <div
            className="mt-3 h-1 w-20 rounded-full bg-gradient-to-r from-[var(--etab-primary,#4f46e5)] via-blue-500 to-violet-500 shadow-sm sm:w-24"
            aria-hidden
          />
          {subtitle ? (
            <p className="mt-4 w-full max-w-3xl text-sm leading-relaxed text-slate-600 sm:text-[15px] md:text-base">
              {subtitle}
            </p>
          ) : null}
        </div>

        {actions ? (
          <div className="w-full min-w-0 border-t border-slate-200/70 pt-5">
            <div className="ui-action-bar">{actions}</div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

const STAT_GRADIENTS = {
  blue: 'from-blue-600 to-indigo-700',
  amber: 'from-amber-500 to-orange-600',
  emerald: 'from-emerald-500 to-teal-700',
  violet: 'from-violet-600 to-purple-800',
  rose: 'from-rose-500 to-pink-700',
  slate: 'from-slate-600 to-slate-800',
  cyan: 'from-cyan-500 to-blue-700',
}

export function StatTile({ icon, label, value, sub, gradient = 'blue' }) {
  const g = STAT_GRADIENTS[gradient] || STAT_GRADIENTS.blue
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-slate-200/70 bg-white/85 p-4 shadow-[0_12px_40px_-12px_rgba(15,23,42,0.1)] ring-1 ring-white/60 backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-indigo-200/50 hover:shadow-[0_20px_50px_-16px_rgba(79,70,229,0.16)] sm:p-5">
      <div
        className={`pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-gradient-to-br ${g} opacity-[0.12] blur-2xl transition-all duration-500 group-hover:scale-110 group-hover:opacity-[0.2]`}
        aria-hidden
      />
      <div className="relative flex items-start gap-3 sm:gap-4">
        <div
          className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${g} text-white shadow-lg shadow-slate-900/10 ring-2 ring-white/30 sm:h-12 sm:w-12 [&_svg]:stroke-white`}
        >
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xl font-black tabular-nums tracking-tight text-slate-900 sm:text-2xl md:text-[1.75rem]">
            {value ?? '—'}
          </p>
          <p className="mt-0.5 text-sm font-semibold text-slate-500">{label}</p>
          {sub ? <p className="mt-1 text-xs text-slate-400">{sub}</p> : null}
        </div>
      </div>
    </div>
  )
}

export function Panel({ title, meta, children, className = '', bodyClassName = 'p-5 sm:p-6' }) {
  return (
    <div
      className={`ui-card overflow-hidden rounded-2xl border border-slate-200/60 bg-white/90 shadow-[0_20px_50px_-28px_rgba(15,23,42,0.12)] ring-1 ring-white/70 backdrop-blur-md sm:rounded-3xl ${className}`}
    >
      {title ? (
        <div className="relative flex flex-col gap-3 border-b border-slate-100/80 bg-gradient-to-r from-slate-50/98 via-white to-indigo-50/30 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-6 sm:py-4">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-200/60 to-transparent" aria-hidden />
          <h2 className="min-w-0 text-base font-bold tracking-tight text-slate-800 sm:text-lg">{title}</h2>
          {meta ? <div className="shrink-0">{meta}</div> : null}
        </div>
      ) : null}
      <div className={`min-w-0 ${bodyClassName}`}>{children}</div>
    </div>
  )
}

export function DashboardSpinner({ className = '' }) {
  return (
    <div className={`flex flex-col items-center justify-center gap-4 py-16 ${className}`}>
      <div className="relative h-14 w-14">
        <div className="absolute inset-0 rounded-full border-[3px] border-slate-200" />
        <div className="absolute inset-0 animate-spin rounded-full border-[3px] border-transparent border-t-indigo-600 border-r-violet-500" />
      </div>
      <p className="text-sm font-medium text-slate-500">Chargement des données…</p>
    </div>
  )
}

export function TabPillBar({ children, className = '' }) {
  return (
    <div
      className={`mb-6 flex flex-wrap gap-1 rounded-2xl border border-slate-200/80 bg-slate-100/80 p-1.5 shadow-inner backdrop-blur-sm sm:mb-8 ${className}`}
    >
      {children}
    </div>
  )
}

export function TabPill({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-[40px] rounded-xl px-3 py-2 text-sm font-bold transition-all sm:px-4 sm:py-2.5 ${
        active
          ? 'bg-white text-blue-700 shadow-md shadow-slate-200/50 ring-1 ring-slate-200/60'
          : 'text-slate-600 hover:bg-white/60 hover:text-slate-900'
      }`}
    >
      {children}
    </button>
  )
}
