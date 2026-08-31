import { useState, useEffect, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'
import { normalizeBrandColor, getUserBrandColor } from '../utils/etabTheme'
import { mediaUrl } from '../utils/mediaUrl'

const HIDDEN_PATHS = ['/chat', '/connexion', '/inscription', '/changer-mot-de-passe-obligatoire']

function simpleMarkdown(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br/>')
}

function ActionButton({ action, brand, onNavigate }) {
  const className =
    'inline-flex items-center justify-center rounded-full px-3.5 py-1.5 text-xs font-semibold transition shadow-sm'
  const style =
    action.style === 'primary'
      ? { background: brand.primary, color: brand.onPrimary }
      : { background: '#fff', color: brand.primary, border: `1px solid ${brand.primary}55` }

  if (action.external || String(action.href || '').startsWith('mailto:')) {
    return (
      <a href={action.href} className={className} style={style}>
        {action.label}
      </a>
    )
  }
  return (
    <Link to={action.href} className={className} style={style} onClick={onNavigate}>
      {action.label}
    </Link>
  )
}

/**
 * Accueil virtuel scolarité — widget institutionnel multi-établissements.
 */
export default function ChatbotWidget() {
  const { user } = useAuth()
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const [minimized, setMinimized] = useState(false)
  const [enabled, setEnabled] = useState(true)
  const [etabId, setEtabId] = useState('')
  const [etabs, setEtabs] = useState([])
  const [etab, setEtab] = useState(null)
  const [assistantName, setAssistantName] = useState('Accueil scolarité')
  const [welcome, setWelcome] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [sessionId, setSessionId] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [actions, setActions] = useState([])
  const [followUps, setFollowUps] = useState([])
  const [pulse, setPulse] = useState(true)
  const bottomRef = useRef(null)

  const brandHex =
    etab?.couleur_primaire ||
    getUserBrandColor(user) ||
    etabs.find((e) => String(e.id) === String(etabId))?.couleur_primaire
  const brand = normalizeBrandColor(brandHex || '#1e40af')
  const logoSrc = mediaUrl(etab?.logo_url)

  const hidden = HIDDEN_PATHS.some((p) => location.pathname === p || location.pathname.startsWith(`${p}/`))

  useEffect(() => {
    const m = location.pathname.match(/^\/etablissement\/(\d+)/)
    if (m) setEtabId(m[1])
    else if (user?.etablissement_id) setEtabId(String(user.etablissement_id))
  }, [location.pathname, user?.etablissement_id])

  useEffect(() => {
    if (!open) return
    const q = etabId ? `?etablissement_id=${etabId}` : ''
    axios
      .get(`/api/chatbot/bootstrap${q}`)
      .then(({ data }) => {
        if (data.enabled === false) {
          setEnabled(false)
          return
        }
        setEnabled(true)
        setSuggestions(data.suggestions || [])
        setEtabs(data.etablissements || [])
        setWelcome(data.welcome || '')
        setAssistantName(data.assistant_name || 'Accueil scolarité')
        if (data.etablissement) setEtab(data.etablissement)
        if (data.etablissement?.id) setEtabId(String(data.etablissement.id))
      })
      .catch(() => {})
  }, [open, etabId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading, open, minimized])

  useEffect(() => {
    const t = setTimeout(() => setPulse(false), 8000)
    return () => clearTimeout(t)
  }, [])

  if (hidden || !enabled) return null

  const send = async (raw) => {
    const text = String(raw?.message || raw || input).trim()
    if (!text || loading) return
    setInput('')
    setMessages((prev) => [...prev, { role: 'user', text }])
    setLoading(true)
    setActions([])
    setFollowUps([])
    try {
      const { data } = await axios.post('/api/chatbot/message', {
        message: text,
        session_id: sessionId,
        etablissement_id: etabId || undefined,
      })
      if (data.session_id) setSessionId(data.session_id)
      if (data.assistant_name) setAssistantName(data.assistant_name)
      if (data.etablissement) setEtab(data.etablissement)
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: data.reply,
          formations: data.formations || [],
          contacts: data.contacts || [],
        },
      ])
      setActions(data.actions || [])
      setFollowUps(data.follow_ups || [])
      if (data.etablissements_disponibles?.length) setEtabs(data.etablissements_disponibles)
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text:
            err.response?.data?.message ||
            'Je rencontre une difficulté temporaire. Réessayez ou contactez la scolarité.',
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  const resetConversation = () => {
    setSessionId(null)
    setMessages([])
    setActions([])
    setFollowUps([])
  }

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => {
            setOpen(true)
            setMinimized(false)
            setPulse(false)
          }}
          className="group fixed bottom-5 right-5 z-[60] flex items-center gap-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
          aria-label="Ouvrir l’accueil scolarité"
        >
          <span
            className="hidden rounded-full bg-white/95 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-lg sm:inline-block"
            style={{ border: `1px solid ${brand.primary}33` }}
          >
            Besoin d’aide ?
          </span>
          <span className="relative flex h-14 w-14 items-center justify-center rounded-full text-white shadow-xl transition group-hover:scale-105">
            {pulse && (
              <span
                className="absolute inset-0 animate-ping rounded-full opacity-40"
                style={{ background: brand.primary }}
              />
            )}
            <span
              className="relative flex h-14 w-14 items-center justify-center rounded-full"
              style={{
                background: `linear-gradient(145deg, ${brand.primary}, ${brand.secondary})`,
                color: brand.onPrimary,
              }}
            >
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M12 3c4.4 0 8 2.9 8 6.5S16.4 16 12 16c-.7 0-1.4-.1-2-.2L6 18l.8-3.2C5.1 13.7 4 12 4 9.5 4 5.9 7.6 3 12 3z"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          </span>
        </button>
      )}

      {open && (
        <div
          className={`fixed bottom-4 right-4 z-[60] flex w-[min(100vw-1.25rem,26rem)] flex-col overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-[0_25px_60px_-15px_rgba(15,23,42,0.35)] ${
            minimized ? 'h-auto' : ''
          }`}
          style={minimized ? undefined : { height: 'min(78vh, 640px)' }}
          role="dialog"
          aria-label={assistantName}
        >
          <header
            className="relative overflow-hidden px-4 pb-3 pt-3 text-white"
            style={{ background: `linear-gradient(135deg, ${brand.primary} 0%, ${brand.secondary} 100%)` }}
          >
            <div className="pointer-events-none absolute -right-6 -top-8 h-28 w-28 rounded-full bg-white/10" />
            <div className="relative flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white/15 ring-1 ring-white/25">
                {logoSrc ? (
                  <img src={logoSrc} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-lg font-black">{(etab?.nom || 'A').slice(0, 1)}</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold tracking-tight">{assistantName}</p>
                <p className="truncate text-[11px] text-white/85">
                  {etab?.nom ? etab.nom : 'Portail multi-établissements'} · Réponses issues du catalogue
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  className="rounded-lg px-2 py-1 text-sm hover:bg-white/15"
                  onClick={() => setMinimized((v) => !v)}
                  aria-label={minimized ? 'Agrandir' : 'Réduire'}
                >
                  {minimized ? '▢' : '—'}
                </button>
                <button
                  type="button"
                  className="rounded-lg px-2 py-1 text-sm hover:bg-white/15"
                  onClick={() => setOpen(false)}
                  aria-label="Fermer"
                >
                  ✕
                </button>
              </div>
            </div>
          </header>

          {!minimized && (
            <>
              {!etabId && (
                <div className="border-b border-slate-100 bg-slate-50/90 px-3 py-2">
                  <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Établissement
                  </label>
                  <select
                    className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-sm"
                    value={etabId}
                    onChange={(e) => {
                      setEtabId(e.target.value)
                      resetConversation()
                      setEtab(null)
                    }}
                  >
                    <option value="">Tous (chaque formation indique son établissement)</option>
                    {etabs.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.nom}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {etabId && !user?.etablissement_id && (
                <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-3 py-1.5 text-[11px] text-slate-600">
                  <span>Contexte établissement actif</span>
                  <button
                    type="button"
                    className="font-semibold"
                    style={{ color: brand.primary }}
                    onClick={() => {
                      setEtabId('')
                      setEtab(null)
                      resetConversation()
                    }}
                  >
                    Changer
                  </button>
                </div>
              )}

              <div className="flex-1 space-y-3 overflow-y-auto bg-gradient-to-b from-slate-50 to-white px-3 py-3">
                {messages.length === 0 && (
                  <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                    <p className="text-sm leading-relaxed text-slate-700">{welcome}</p>
                    <p className="mt-3 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                      Que recherchez-vous ?
                    </p>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      {suggestions.map((s) => {
                        const label = typeof s === 'string' ? s : s.label
                        const msg = typeof s === 'string' ? s : s.message || s.label
                        return (
                          <button
                            key={typeof s === 'string' ? s : s.id || label}
                            type="button"
                            onClick={() => send(msg)}
                            className="rounded-xl border border-slate-150 bg-slate-50 px-2.5 py-2 text-left text-xs font-semibold text-slate-700 transition hover:bg-white hover:shadow-sm"
                            style={{ borderColor: `${brand.primary}22` }}
                          >
                            {label}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {messages.map((m, i) => (
                  <div key={`${i}-${m.role}`} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[94%] ${m.role === 'user' ? '' : 'space-y-2'}`}>
                      {m.role === 'assistant' && (
                        <div className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                          <span
                            className="inline-block h-1.5 w-1.5 rounded-full"
                            style={{ background: brand.primary }}
                          />
                          {assistantName}
                        </div>
                      )}
                      <div
                        className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-sm ${
                          m.role === 'user' ? 'rounded-br-md text-white' : 'rounded-bl-md border border-slate-100 bg-white text-slate-800'
                        }`}
                        style={m.role === 'user' ? { background: brand.primary, color: brand.onPrimary } : undefined}
                        dangerouslySetInnerHTML={{ __html: simpleMarkdown(m.text) }}
                      />

                      {m.role === 'assistant' && m.formations?.length > 0 && (
                        <div className="space-y-2">
                          {m.formations.slice(0, 4).map((f) => (
                            <div
                              key={f.id}
                              className="rounded-2xl border bg-white p-3 shadow-sm"
                              style={{ borderColor: `${brand.primary}28` }}
                            >
                              <p className="text-sm font-bold text-slate-900">{f.titre}</p>
                              <p className="mt-1 text-[11px] text-slate-500">
                                {[f.niveau, f.duree, f.etablissement_nom].filter(Boolean).join(' · ')}
                              </p>
                              {f.prix_label && (
                                <p className="mt-1 text-xs font-semibold" style={{ color: brand.primary }}>
                                  {f.prix_label}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {m.role === 'assistant' && m.contacts?.length > 0 && (
                        <div className="space-y-1.5">
                          {m.contacts.filter(Boolean).map((c, idx) => (
                            <div
                              key={`${c.email || c.label}-${idx}`}
                              className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs"
                            >
                              <div>
                                <p className="font-semibold text-slate-800">{c.label}</p>
                                {c.nom && <p className="text-slate-500">{c.nom}</p>}
                                {c.email && <p className="font-medium" style={{ color: brand.primary }}>{c.email}</p>}
                              </div>
                              {c.mailto && (
                                <a
                                  href={c.mailto}
                                  className="shrink-0 rounded-full px-2.5 py-1 font-bold text-white"
                                  style={{ background: brand.primary }}
                                >
                                  Écrire
                                </a>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {loading && (
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="flex gap-1">
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full" style={{ background: brand.primary }} />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full [animation-delay:120ms]" style={{ background: brand.primary }} />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full [animation-delay:240ms]" style={{ background: brand.primary }} />
                    </span>
                    Recherche des informations…
                  </div>
                )}

                {!loading && followUps.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {followUps.map((f) => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => send(f)}
                        className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold shadow-sm"
                        style={{ color: brand.primary, border: `1px solid ${brand.primary}40` }}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                )}

                {!loading && actions.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {actions.map((a) => (
                      <ActionButton key={a.id} action={a} brand={brand} onNavigate={() => setOpen(false)} />
                    ))}
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              <form
                className="border-t border-slate-100 bg-white p-3"
                onSubmit={(e) => {
                  e.preventDefault()
                  send()
                }}
              >
                <div className="flex items-end gap-2">
                  <input
                    className="min-h-11 flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm outline-none focus:border-slate-300 focus:bg-white"
                    placeholder="Écrivez votre demande…"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    disabled={loading}
                    maxLength={1000}
                  />
                  <button
                    type="submit"
                    disabled={loading || !input.trim()}
                    className="flex h-11 w-11 items-center justify-center rounded-2xl text-white shadow-md disabled:opacity-40"
                    style={{ background: brand.primary, color: brand.onPrimary }}
                    aria-label="Envoyer"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                      <path d="M4 12l16-8-6 16-2.5-6.5L4 12z" fill="currentColor" />
                    </svg>
                  </button>
                </div>
                <p className="mt-1.5 text-center text-[10px] text-slate-400">
                  Informations institutionnelles issues du catalogue — jamais inventées.
                </p>
              </form>
            </>
          )}
        </div>
      )}
    </>
  )
}
