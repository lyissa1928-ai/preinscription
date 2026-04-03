import { useEffect, useState, useCallback } from 'react'
import axios from 'axios'
import {
  FaArrowsRotate,
  FaBolt,
  FaChartLine,
  FaClock,
  FaGaugeHigh,
  FaMemory,
  FaMicrochip,
  FaServer,
  FaTriangleExclamation,
  FaWaveSquare,
} from 'react-icons/fa6'

const REFRESH_MS = 15000

function formatUptime(totalSeconds) {
  const s = Math.max(0, Math.floor(Number(totalSeconds) || 0))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (h > 0) return `${h}h ${m}m ${sec}s`
  if (m > 0) return `${m}m ${sec}s`
  return `${sec}s`
}

function statusTone(code) {
  const c = parseInt(String(code), 10)
  if (Number.isNaN(c)) return { bar: 'bg-slate-400', pill: 'bg-slate-100 text-slate-700 ring-slate-200' }
  if (c >= 500) return { bar: 'bg-rose-500', pill: 'bg-rose-50 text-rose-800 ring-rose-200' }
  if (c >= 400) return { bar: 'bg-amber-500', pill: 'bg-amber-50 text-amber-900 ring-amber-200' }
  if (c >= 300) return { bar: 'bg-sky-500', pill: 'bg-sky-50 text-sky-900 ring-sky-200' }
  if (c >= 200) return { bar: 'bg-emerald-500', pill: 'bg-emerald-50 text-emerald-900 ring-emerald-200' }
  return { bar: 'bg-slate-400', pill: 'bg-slate-100 text-slate-700 ring-slate-200' }
}

function methodTone(method) {
  const m = String(method || '').toUpperCase()
  const map = {
    GET: 'from-sky-500 to-blue-600',
    POST: 'from-violet-500 to-purple-600',
    PUT: 'from-amber-500 to-orange-500',
    PATCH: 'from-teal-500 to-cyan-600',
    DELETE: 'from-rose-500 to-red-600',
  }
  return map[m] || 'from-slate-500 to-slate-600'
}

function maxCount(items) {
  if (!items?.length) return 1
  return Math.max(1, ...items.map((x) => x.count))
}

export default function AdminRuntimeMonitoring() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [lastFetch, setLastFetch] = useState(null)
  const [tick, setTick] = useState(REFRESH_MS / 1000)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data: json } = await axios.get('/api/admin/runtime-metrics')
      setData(json)
      setLastFetch(new Date())
      setTick(REFRESH_MS / 1000)
    } catch (e) {
      setError(e.response?.data?.message || e.message || 'Impossible de charger les métriques.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    const t = setInterval(load, REFRESH_MS)
    return () => clearInterval(t)
  }, [load])

  useEffect(() => {
    const id = setInterval(() => {
      setTick((x) => (x <= 1 ? REFRESH_MS / 1000 : x - 1))
    }, 1000)
    return () => clearInterval(id)
  }, [lastFetch])

  const topRoutes = data?.top_routes || []
  const topStatus = data?.top_status || []
  const topMethods = data?.top_methods || []
  const routesMax = maxCount(topRoutes)
  const statusMax = maxCount(topStatus)
  const methodsMax = maxCount(topMethods)

  const heapTotal = data?.memory_mb?.heap_total ?? 0
  const heapUsed = data?.memory_mb?.heap_used ?? 0
  const heapPct = heapTotal > 0 ? Math.min(100, Math.round((heapUsed / heapTotal) * 100)) : 0

  return (
    <div className="min-h-[calc(100vh-6rem)] bg-gradient-to-b from-slate-50 via-white to-indigo-50/40">
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* En-tête */}
        <header className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-lg shadow-slate-200/50">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/5 via-transparent to-violet-600/10 pointer-events-none" />
          <div className="relative flex flex-col gap-6 p-6 sm:p-8 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-700 text-white shadow-lg shadow-indigo-500/30">
                <FaWaveSquare className="text-2xl" aria-hidden />
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
                  Monitoring runtime
                </h1>
                <p className="mt-1 text-sm text-slate-600 max-w-xl">
                  Vue d’ensemble du processus Node : trafic, latences, mémoire et répartition HTTP. Actualisation automatique toutes les 15&nbsp;s.
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
                  <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 font-semibold text-emerald-800 ring-1 ring-emerald-200/80">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                    </span>
                    Actif
                  </span>
                  {lastFetch && (
                    <span className="text-slate-500">
                      Dernière synchro :{' '}
                      <time dateTime={lastFetch.toISOString()} className="font-medium text-slate-700">
                        {lastFetch.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </time>
                    </span>
                  )}
                  <span className="text-slate-400">·</span>
                  <span className="text-slate-600">
                    Prochain rafraîchissement dans <strong className="text-indigo-700">{tick}s</strong>
                  </span>
                </div>
              </div>
            </div>
            <button
              type="button"
              className="inline-flex items-center justify-center gap-2 self-start rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-3 text-sm font-bold text-white shadow-md shadow-indigo-500/25 transition hover:from-indigo-500 hover:to-violet-500 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
              onClick={load}
              disabled={loading}
            >
              <FaArrowsRotate className={loading ? 'animate-spin' : ''} />
              {loading ? 'Synchronisation…' : 'Rafraîchir'}
            </button>
          </div>
        </header>

        {error && (
          <div
            className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900"
            role="alert"
          >
            <FaTriangleExclamation className="mt-0.5 shrink-0 text-lg text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {!data && !error ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
              <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-200/70" />
            ))}
          </div>
        ) : data ? (
          <>
            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard
                icon={<FaClock />}
                label="Uptime"
                value={formatUptime(data.uptime_s)}
                hint={`Démarrage : ${new Date(data.started_at).toLocaleString('fr-FR')}`}
                accent="border-indigo-200/80 bg-gradient-to-br from-white to-indigo-50/50"
                iconBg="bg-indigo-100 text-indigo-700"
              />
              <MetricCard
                icon={<FaServer />}
                label="Requêtes totales"
                value={data.requests_total}
                hint="Compteur depuis le démarrage du serveur"
                accent="border-sky-200/80 bg-gradient-to-br from-white to-sky-50/50"
                iconBg="bg-sky-100 text-sky-700"
              />
              <MetricCard
                icon={<FaTriangleExclamation />}
                label="Erreurs 5xx"
                value={data.errors_5xx}
                hint={data.errors_5xx === 0 ? 'Aucune erreur serveur relevée' : 'À surveiller côté API'}
                accent={
                  data.errors_5xx > 0
                    ? 'border-rose-200 bg-gradient-to-br from-rose-50/80 to-white'
                    : 'border-emerald-200/80 bg-gradient-to-br from-white to-emerald-50/40'
                }
                iconBg={data.errors_5xx > 0 ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}
              />
              <MetricCard
                icon={<FaGaugeHigh />}
                label="Latence moyenne"
                value={`${data.avg_duration_ms} ms`}
                hint={data.max_duration_ms != null ? `Pic : ${data.max_duration_ms} ms` : undefined}
                accent="border-violet-200/80 bg-gradient-to-br from-white to-violet-50/50"
                iconBg="bg-violet-100 text-violet-700"
              />
            </section>

            <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <MetricCard
                icon={<FaBolt />}
                label="Latence max"
                value={`${data.max_duration_ms ?? 0} ms`}
                hint="Durée la plus longue observée"
                accent="border-amber-200/80 bg-gradient-to-br from-white to-amber-50/40"
                iconBg="bg-amber-100 text-amber-800"
                className="lg:col-span-1"
              />
              <MetricCard
                icon={<FaMicrochip />}
                label="RSS mémoire"
                value={`${data.memory_mb?.rss ?? 0} MB`}
                hint="Mémoire résidente du processus"
                accent="border-slate-200 bg-white"
                iconBg="bg-slate-100 text-slate-700"
              />
              <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-teal-600 text-white shadow-md">
                    <FaMemory className="text-lg" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Heap Node.js</p>
                    <p className="text-lg font-black text-slate-900">
                      {heapUsed} / {heapTotal} MB
                    </p>
                  </div>
                  <span className="ml-auto text-sm font-bold tabular-nums text-teal-700">{heapPct}%</span>
                </div>
                <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-teal-500 to-cyan-500 transition-all duration-500"
                    style={{ width: `${heapPct}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-slate-500">Utilisation du tas V8 (utilisé / total alloué).</p>
              </div>
            </section>

            <section className="grid grid-cols-1 gap-6 xl:grid-cols-5">
              <div className="xl:col-span-3 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm">
                <div className="mb-5 flex items-center gap-2">
                  <FaChartLine className="text-indigo-600" />
                  <h2 className="text-lg font-bold text-slate-900">Routes les plus sollicitées</h2>
                </div>
                <div className="space-y-4">
                  {topRoutes.length === 0 ? (
                    <p className="text-sm text-slate-500">Aucune requête enregistrée pour l’instant.</p>
                  ) : (
                    topRoutes.map((row, i) => (
                      <HorizontalBar
                        key={`${row.key}-${i}`}
                        label={row.key}
                        count={row.count}
                        max={routesMax}
                        barClass="bg-gradient-to-r from-indigo-500 to-violet-500"
                      />
                    ))
                  )}
                </div>
              </div>

              <div className="space-y-6 xl:col-span-2">
                <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm">
                  <h2 className="mb-4 text-base font-bold text-slate-900">Codes HTTP</h2>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {topStatus.map((row, i) => {
                      const tone = statusTone(row.key)
                      return (
                        <span
                          key={`${row.key}-${i}`}
                          className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold ring-1 ${tone.pill}`}
                        >
                          {row.key}
                          <span className="opacity-80">×{row.count}</span>
                        </span>
                      )
                    })}
                  </div>
                  <div className="space-y-3">
                    {topStatus.length === 0 ? (
                      <p className="text-sm text-slate-500">Pas encore de statistiques.</p>
                    ) : (
                      topStatus.map((row, i) => (
                        <HorizontalBar
                          key={`st-${row.key}-${i}`}
                          label={row.key}
                          count={row.count}
                          max={statusMax}
                          barClass={statusTone(row.key).bar}
                        />
                      ))
                    )}
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm">
                  <h2 className="mb-4 text-base font-bold text-slate-900">Méthodes HTTP</h2>
                  <div className="space-y-3">
                    {topMethods.length === 0 ? (
                      <p className="text-sm text-slate-500">Pas encore de statistiques.</p>
                    ) : (
                      topMethods.map((row, i) => (
                        <HorizontalBar
                          key={`m-${row.key}-${i}`}
                          label={row.key}
                          count={row.count}
                          max={methodsMax}
                          barClass={`bg-gradient-to-r ${methodTone(row.key)}`}
                        />
                      ))
                    )}
                  </div>
                </div>
              </div>
            </section>
          </>
        ) : null}
      </div>
    </div>
  )
}

function MetricCard({ icon, label, value, hint, accent, iconBg, className = '' }) {
  return (
    <div
      className={`rounded-2xl border p-5 shadow-sm transition hover:shadow-md ${accent} ${className}`}
    >
      <div className="flex items-start gap-3">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg ${iconBg}`}>{icon}</div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
          <p className="mt-1 text-2xl font-black tracking-tight text-slate-900">{value}</p>
          {hint && <p className="mt-1.5 text-xs leading-snug text-slate-500">{hint}</p>}
        </div>
      </div>
    </div>
  )
}

function HorizontalBar({ label, count, max, barClass }) {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-2 text-sm">
        <span className="truncate font-mono text-[13px] text-slate-700" title={label}>
          {label}
        </span>
        <span className="shrink-0 tabular-nums font-bold text-slate-900">{count}</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-200/60">
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${barClass}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
