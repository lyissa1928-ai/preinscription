/**
 * Présentation premium partagée des tableaux de bord (UI uniquement).
 */

export function DashboardPage({ children, maxWidthClass = 'max-w-7xl' }) {
  return (
    <main className={`relative ${maxWidthClass} mx-auto px-4 py-10 w-full min-h-[calc(100vh-5rem)]`}>
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden>
        <div className="absolute -top-32 left-1/2 h-[28rem] w-[min(100%,64rem)] -translate-x-1/2 rounded-[100%] bg-gradient-to-b from-blue-400/20 via-indigo-400/10 to-transparent blur-3xl" />
        <div className="absolute top-48 -right-20 h-72 w-72 rounded-full bg-cyan-400/15 blur-3xl" />
        <div className="absolute bottom-20 -left-24 h-80 w-80 rounded-full bg-violet-400/10 blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_0%,rgba(248,250,252,0.7)_40%,rgb(248,250,252)_100%)]" />
      </div>
      <div className="relative z-[1]">{children}</div>
    </main>
  )
}

export function DashboardHero({ eyebrow, title, subtitle, actions }) {
  return (
    <div className="relative mb-10 overflow-hidden rounded-3xl border border-white/70 bg-white/75 p-8 shadow-2xl shadow-slate-300/25 backdrop-blur-xl md:p-10">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white via-slate-50/90 to-blue-50/40" aria-hidden />
      <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-gradient-to-bl from-blue-500/20 to-transparent blur-2xl" aria-hidden />
      <div className="relative flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          {eyebrow ? (
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-blue-600">{eyebrow}</p>
          ) : null}
          <h1 className="text-3xl font-black tracking-tight text-slate-900 md:text-4xl">{title}</h1>
          {subtitle ? <p className="mt-2 max-w-2xl text-base leading-relaxed text-slate-600">{subtitle}</p> : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap gap-3">{actions}</div> : null}
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
    <div className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-lg shadow-slate-200/40 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-blue-200/70 hover:shadow-xl hover:shadow-blue-500/10">
      <div
        className={`pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full bg-gradient-to-br ${g} opacity-[0.12] blur-2xl transition-opacity group-hover:opacity-[0.2]`}
        aria-hidden
      />
      <div className="relative flex items-start gap-4">
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${g} text-white shadow-lg [&_svg]:stroke-white`}
        >
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-2xl font-black tabular-nums leading-tight text-slate-900 md:text-3xl">{value ?? '—'}</p>
          <p className="mt-1 text-sm font-semibold text-slate-500">{label}</p>
          {sub ? <p className="mt-1 text-xs text-slate-400">{sub}</p> : null}
        </div>
      </div>
    </div>
  )
}

export function Panel({ title, meta, children, className = '', bodyClassName = 'p-6' }) {
  return (
    <div
      className={`overflow-hidden rounded-3xl border border-slate-200/80 bg-white/95 shadow-xl shadow-slate-200/30 backdrop-blur-md ${className}`}
    >
      {title ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-gradient-to-r from-slate-50/95 via-white to-blue-50/30 px-6 py-4">
          <h2 className="text-lg font-bold text-slate-800">{title}</h2>
          {meta}
        </div>
      ) : null}
      <div className={bodyClassName}>{children}</div>
    </div>
  )
}

export function DashboardSpinner({ className = '' }) {
  return (
    <div className={`flex justify-center py-16 ${className}`}>
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
    </div>
  )
}

export function TabPillBar({ children, className = '' }) {
  return (
    <div
      className={`mb-8 flex flex-wrap gap-1 rounded-2xl border border-slate-200/80 bg-slate-100/80 p-1.5 shadow-inner backdrop-blur-sm ${className}`}
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
      className={`rounded-xl px-4 py-2.5 text-sm font-bold transition-all ${
        active
          ? 'bg-white text-blue-700 shadow-md shadow-slate-200/50 ring-1 ring-slate-200/60'
          : 'text-slate-600 hover:bg-white/60 hover:text-slate-900'
      }`}
    >
      {children}
    </button>
  )
}
