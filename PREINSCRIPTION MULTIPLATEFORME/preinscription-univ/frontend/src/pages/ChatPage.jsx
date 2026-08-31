import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import axios from 'axios'
import { io } from 'socket.io-client'
import { useAuth } from '../context/AuthContext'
import { Link, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { mediaUrl } from '../utils/mediaUrl'
import { resolveApiBaseUrl } from '../utils/resolveApiBaseUrl'
import { getAccessToken } from '../lib/tokenStorage'

/** Palette proche de WhatsApp Web (2024) */
const WA = {
  header: '#008069',
  headerDark: '#075E54',
  panelBg: '#f0f2f5',
  listBg: '#ffffff',
  listHover: '#f5f6f6',
  border: '#e9edef',
  bubbleOut: '#d9fdd3',
  bubbleIn: '#ffffff',
  textMeta: '#667781',
  wallpaper: '#efeae2',
}

const ROLE_LABELS = {
  etudiant: 'Étudiants',
  responsable: 'Responsables',
  agent_admin: 'Agents administratifs',
  comptable: 'Comptabilité',
  controleur_qualite: 'Qualité',
}

function initials(u) {
  const a = (u?.prenom?.[0] || '').toUpperCase()
  const b = (u?.nom?.[0] || '').toUpperCase()
  return (a + b) || '?'
}

function formatListTime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const now = new Date()
  const sameDay =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear()
  if (sameDay) {
    return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  }
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
}

function formatBubbleTime(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

function socketBaseUrl() {
  const b = resolveApiBaseUrl()
  if (b) return b
  return typeof window !== 'undefined' ? window.location.origin : ''
}

export default function ChatPage() {
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const lastOpenedPeerFromQuery = useRef(null)
  const [tab, setTab] = useState('chats') // chats | contacts
  const [mobileChat, setMobileChat] = useState(false)
  const [conversations, setConversations] = useState([])
  const [contacts, setContacts] = useState([])
  const [selectedPeer, setSelectedPeer] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [search, setSearch] = useState('')
  const [typingFrom, setTypingFrom] = useState(null)
  const [online, setOnline] = useState(() => new Set())
  const messagesEndRef = useRef(null)
  const typingTimer = useRef(null)
  const socketRef = useRef(null)
  const fileInputRef = useRef(null)
  const selectedPeerRef = useRef(null)
  selectedPeerRef.current = selectedPeer

  const peerLabel = useCallback((u) => {
    if (!u) return '—'
    const role = ROLE_LABELS[u.role] || u.role
    return `${u.prenom || ''} ${u.nom || ''}`.trim() || role
  }, [])

  const loadConversations = useCallback(async () => {
    const { data } = await axios.get('/api/chat/conversations')
    setConversations(data.conversations || [])
  }, [])

  const loadContacts = useCallback(async () => {
    const { data } = await axios.get('/api/chat/contacts')
    setContacts(data.contacts || [])
  }, [])

  const loadMessages = useCallback(async (peerId) => {
    const { data } = await axios.get(`/api/chat/peer/${peerId}/messages`)
    setMessages(data.messages || [])
  }, [])

  useEffect(() => {
    loadConversations()
    loadContacts()
  }, [loadConversations, loadContacts])

  const openPeer = useCallback(
    async (peer) => {
      if (!peer?.id) return
      setSelectedPeer(peer)
      setMobileChat(true)
      setMessages([])
      try {
        await loadMessages(peer.id)
        await axios.post(`/api/chat/peer/${peer.id}/read`)
        socketRef.current?.emit('chat:read', { peerId: peer.id })
        loadConversations()
      } catch {
        setMessages([])
        throw new Error('chat_open_failed')
      }
    },
    [loadMessages, loadConversations],
  )

  /** Deep link : /chat?peer=<utilisateur_id>&prenom=&nom= (ex. depuis une demande de préinscription) */
  useEffect(() => {
    const raw = searchParams.get('peer')
    if (!raw) {
      lastOpenedPeerFromQuery.current = null
      return
    }
    if (!user?.etablissement_id) return
    const pid = parseInt(raw, 10)
    if (!Number.isFinite(pid)) return
    if (lastOpenedPeerFromQuery.current === pid) return
    lastOpenedPeerFromQuery.current = pid

    const fromContact = contacts.find((c) => c.id === pid)
    const fromConv = conversations.find((c) => c.peer?.id === pid)
    const peer =
      fromContact ||
      fromConv?.peer || {
        id: pid,
        prenom: searchParams.get('prenom') || '',
        nom: searchParams.get('nom') || '',
        role: searchParams.get('peerRole') || 'etudiant',
        matricule: null,
        etablissement_id: null,
      }

    openPeer(peer).catch(() => {
      lastOpenedPeerFromQuery.current = null
      toast.error(
        'Impossible d’ouvrir la conversation avec cet étudiant (droits insuffisants, autre établissement ou compte introuvable).',
      )
      setSelectedPeer(null)
      setMobileChat(false)
    })
  }, [user?.etablissement_id, searchParams, contacts, conversations, openPeer])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, selectedPeer])

  useEffect(() => {
    const token = getAccessToken()
    if (!token) return

    const s = io(socketBaseUrl(), {
      path: '/socket.io',
      auth: { token },
      transports: ['websocket', 'polling'],
    })

    socketRef.current = s

    s.on('chat:message', (msg) => {
      const peer = selectedPeerRef.current
      const me = user?.id
      const forOpen =
        peer &&
        me != null &&
        (msg.sender_id === peer.id || msg.sender_id === me)
      if (forOpen) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev
          return [...prev, msg]
        })
      }
      loadConversations()
    })

    s.on('chat:conversation-updated', () => {
      loadConversations()
    })

    s.on('chat:typing', ({ fromUserId, typing }) => {
      const peer = selectedPeerRef.current
      if (peer && fromUserId === peer.id) {
        setTypingFrom(typing ? fromUserId : null)
      }
    })

    s.on('presence:update', ({ userId, online: on }) => {
      setOnline((prev) => {
        const next = new Set(prev)
        if (on) next.add(userId)
        else next.delete(userId)
        return next
      })
    })

    return () => {
      s.removeAllListeners()
      s.disconnect()
      socketRef.current = null
    }
  }, [user?.id, loadConversations])

  const sendMessage = () => {
    const t = input.trim()
    if (!t || !selectedPeer) return
    const s = socketRef.current
    setInput('')
    if (s?.connected) {
      s.emit('chat:send', { peerId: selectedPeer.id, body: t }, (res) => {
        if (res && res.ok) return
        axios.post(`/api/chat/peer/${selectedPeer.id}/messages`, { body: t }).then(() => {
          loadMessages(selectedPeer.id)
          loadConversations()
        })
      })
    } else {
      axios.post(`/api/chat/peer/${selectedPeer.id}/messages`, { body: t }).then(() => {
        loadMessages(selectedPeer.id)
        loadConversations()
      })
    }
  }

  const uploadAndSendFile = async (file) => {
    if (!selectedPeer || !file) return
    const fd = new FormData()
    fd.append('file', file)
    try {
      const { data } = await axios.post('/api/chat/upload', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      const caption = input.trim()
      setInput('')
      const attachment = {
        url: data.url,
        original_name: data.original_name,
        mime: data.mime,
        size: data.size,
      }
      const s = socketRef.current
      if (s?.connected) {
        s.emit(
          'chat:send',
          { peerId: selectedPeer.id, body: caption, attachment },
          (res) => {
            if (res && res.ok) {
              loadConversations()
              return
            }
            axios
              .post(`/api/chat/peer/${selectedPeer.id}/messages`, { body: caption, attachment })
              .then(() => {
                loadMessages(selectedPeer.id)
                loadConversations()
              })
          }
        )
      } else {
        await axios.post(`/api/chat/peer/${selectedPeer.id}/messages`, { body: caption, attachment })
        loadMessages(selectedPeer.id)
        loadConversations()
      }
    } catch {
      toast.error('Impossible d’envoyer le fichier.')
    }
  }

  const onInputChange = (v) => {
    setInput(v)
    if (selectedPeer && socketRef.current?.connected) {
      socketRef.current.emit('chat:typing', { peerId: selectedPeer.id, typing: true })
      clearTimeout(typingTimer.current)
      typingTimer.current = setTimeout(() => {
        socketRef.current?.emit('chat:typing', { peerId: selectedPeer.id, typing: false })
      }, 2000)
    }
  }

  const filteredConversations = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return conversations
    return conversations.filter((c) => peerLabel(c.peer).toLowerCase().includes(q))
  }, [conversations, search, peerLabel])

  const filteredContacts = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return contacts
    return contacts.filter((c) => peerLabel(c).toLowerCase().includes(q))
  }, [contacts, search, peerLabel])

  if (!user?.etablissement_id) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center bg-[#f0f2f5] p-8 text-center">
        <p className="text-slate-600 max-w-md">Le chat est réservé aux comptes rattachés à un établissement.</p>
        <Link to="/" className="mt-4 text-[#008069] font-medium hover:underline">
          Retour
        </Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col bg-[#f0f2f5] overflow-hidden h-[calc(100dvh-3.5rem)] md:h-[calc(100vh)] md:min-h-0">
      <div className="flex flex-1 min-h-0 shadow-[0_1px_1px_rgba(11,20,26,0.16)]">
        {/* ─── Colonne gauche (liste) ─── */}
        <div
          className={`flex flex-col border-r border-[#e9edef] bg-white min-w-0 md:w-[380px] md:max-w-[40%] w-full ${
            mobileChat ? 'hidden md:flex' : 'flex'
          }`}
        >
          <header
            className="flex-shrink-0 flex items-center gap-3 px-3 py-2.5 text-white"
            style={{ background: `linear-gradient(180deg, ${WA.header} 0%, ${WA.headerDark} 100%)` }}
          >
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold">
              {initials(user)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-[15px] truncate">Discussions</p>
              <p className="text-xs text-white/80 truncate">{user.etablissement_nom || 'Mon établissement'}</p>
            </div>
          </header>

          <div className="px-2 py-2 bg-[#f0f2f5] border-b border-[#e9edef]">
            <div className="flex rounded-lg bg-white items-center px-3 py-1.5 border border-[#e9edef]">
              <span className="text-[#54656f] mr-2">🔍</span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher un contact…"
                className="flex-1 min-w-0 text-[14px] py-1 outline-none bg-transparent placeholder:text-[#8696a0]"
              />
            </div>
          </div>

          <div className="flex border-b border-[#e9edef] text-[14px] font-medium">
            <button
              type="button"
              onClick={() => setTab('chats')}
              className={`flex-1 py-3 ${tab === 'chats' ? 'text-[#008069] border-b-2 border-[#008069]' : 'text-[#54656f]'}`}
            >
              Discussions
            </button>
            <button
              type="button"
              onClick={() => setTab('contacts')}
              className={`flex-1 py-3 ${tab === 'contacts' ? 'text-[#008069] border-b-2 border-[#008069]' : 'text-[#54656f]'}`}
            >
              Contacts
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {tab === 'chats' &&
              filteredConversations.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => c.peer && openPeer(c.peer)}
                  className="w-full flex items-center gap-3 px-3 py-3 hover:bg-[#f5f6f6] border-b border-[#f0f2f5] text-left transition-colors"
                >
                  <div className="relative flex-shrink-0">
                    <div className="w-12 h-12 rounded-full bg-[#dfe5e7] flex items-center justify-center text-[#54656f] font-semibold text-sm">
                      {c.peer ? initials(c.peer) : '?'}
                    </div>
                    {c.peer && online.has(c.peer.id) && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-[#25d366] border-2 border-white" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline gap-2">
                      <span className="font-medium text-[#111b21] text-[16px] truncate">{c.peer ? peerLabel(c.peer) : '—'}</span>
                      <span className="text-[12px] text-[#667781] flex-shrink-0">{formatListTime(c.updated_at)}</span>
                    </div>
                    <div className="flex justify-between items-center gap-2 mt-0.5">
                      <p className="text-[14px] text-[#667781] truncate">
                        {c.last_sender_id === user?.id ? 'Vous : ' : ''}
                        {c.last_message_body || '…'}
                      </p>
                      {c.unread > 0 && (
                        <span className="bg-[#25d366] text-white text-[11px] font-bold min-w-[20px] h-5 px-1.5 rounded-full flex items-center justify-center flex-shrink-0">
                          {c.unread > 99 ? '99+' : c.unread}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))}

            {tab === 'chats' && filteredConversations.length === 0 && (
              <p className="p-8 text-center text-[#667781] text-sm">Aucune discussion. Ouvrez l’onglet Contacts.</p>
            )}

            {tab === 'contacts' &&
              filteredContacts.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => openPeer(c)}
                  className="w-full flex items-center gap-3 px-3 py-3 hover:bg-[#f5f6f6] border-b border-[#f0f2f5] text-left"
                >
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full bg-[#00a884] text-white flex items-center justify-center text-sm font-semibold">
                      {initials(c)}
                    </div>
                    {online.has(c.id) && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-[#25d366] border-2 border-white" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-[#111b21] text-[16px] truncate">{peerLabel(c)}</p>
                    <p className="text-[13px] text-[#667781]">{ROLE_LABELS[c.role] || c.role}</p>
                  </div>
                </button>
              ))}
          </div>
        </div>

        {/* ─── Panneau conversation ─── */}
        <div
          className={`flex-1 flex flex-col min-w-0 min-h-0 bg-[#efeae2] ${
            !mobileChat ? 'hidden md:flex' : 'flex'
          }`}
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23d1ccc4' fill-opacity='0.25'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            backgroundColor: WA.wallpaper,
          }}
        >
          {!selectedPeer ? (
            <div className="flex-1 flex flex-col items-center justify-center border-b border-[#d1d7db] bg-[#f0f2f5] p-8">
              <div className="w-64 h-64 mb-6 opacity-90" aria-hidden>
                <svg viewBox="0 0 303 172" className="w-full h-full text-[#364147]">
                  <path
                    fill="currentColor"
                    d="M229.5 153.5h-156C51.57 153.5 41 142.93 41 129.5v-87C41 29.07 51.57 18.5 73.5 18.5h156c21.93 0 32.5 10.57 32.5 24v87c0 13.43-10.57 24-32.5 24z"
                    opacity=".1"
                  />
                  <path
                    fill="#25d366"
                    d="M261 42.5C261 29.07 250.43 18.5 228.5 18.5h-156C50.57 18.5 40 29.07 40 42.5v87c0 13.43 10.57 24 32.5 24h156c21.93 0 32.5-10.57 32.5-24v-87z"
                  />
                </svg>
              </div>
              <h2 className="text-[28px] font-light text-[#41525d] text-center">UniPortail Chat</h2>
              <p className="mt-4 text-[#667781] text-sm text-center max-w-md">
                Envoyez des messages à votre équipe et aux étudiants de votre établissement. Les discussions sont privées et conservées sur le serveur.
              </p>
            </div>
          ) : (
            <>
              <header
                className="flex-shrink-0 flex items-center gap-2 px-3 py-2 border-b border-[#d1d7db]"
                style={{ background: `linear-gradient(180deg, ${WA.header} 0%, ${WA.headerDark} 100%)` }}
              >
                <button
                  type="button"
                  className="md:hidden p-2 text-white/90 hover:bg-white/10 rounded-full"
                  onClick={() => {
                    setMobileChat(false)
                    setSelectedPeer(null)
                  }}
                  aria-label="Retour"
                >
                  ←
                </button>
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white text-sm font-bold">
                  {initials(selectedPeer)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium text-[16px] truncate">{peerLabel(selectedPeer)}</p>
                  <p className="text-xs text-white/80">
                    {typingFrom ? 'en train d’écrire…' : online.has(selectedPeer.id) ? 'en ligne' : ROLE_LABELS[selectedPeer.role] || ''}
                  </p>
                </div>
              </header>

              <div className="flex-1 overflow-y-auto px-4 py-2 space-y-1 min-h-0">
                {messages.map((m) => {
                  const mine = m.sender_id === user?.id
                  return (
                    <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[75%] rounded-lg px-3 py-1.5 shadow-sm text-[14.2px] leading-[1.4] ${
                          mine ? 'rounded-br-none bg-[#d9fdd3]' : 'rounded-bl-none bg-white'
                        }`}
                        style={{ color: '#111b21' }}
                      >
                        {m.attachment_url && (
                          <a
                            href={mediaUrl(m.attachment_url) || '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mb-1 block font-semibold text-[#027eb5] underline break-all"
                          >
                            📎 {m.attachment_name || 'Document'}
                          </a>
                        )}
                        {m.body &&
                          (() => {
                            if (!m.attachment_url) return true
                            const autoPreview = m.attachment_name
                              ? `📎 ${String(m.attachment_name).slice(0, 120)}`
                              : '📎 Document'
                            return m.body !== autoPreview
                          })() && (
                            <p className="whitespace-pre-wrap break-words">{m.body}</p>
                          )}
                        <div className={`text-[11px] mt-0.5 flex justify-end gap-1 ${mine ? 'text-[#667781]' : 'text-[#8696a0]'}`}>
                          <span>{formatBubbleTime(m.created_at)}</span>
                          {mine && <span aria-hidden>✓✓</span>}
                        </div>
                      </div>
                    </div>
                  )
                })}
                <div ref={messagesEndRef} />
              </div>

              <div className="flex-shrink-0 bg-[#f0f2f5] px-3 py-2 pb-safe border-t border-[#d1d7db]">
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    e.target.value = ''
                    if (f) uploadAndSendFile(f)
                  }}
                />
                <div className="flex items-end gap-2 bg-white rounded-lg px-2 py-1 border border-[#e9edef]">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="mb-1 p-2 rounded-full text-[#54656f] hover:bg-[#f0f2f5]"
                    aria-label="Joindre un fichier"
                    title="Joindre un fichier"
                  >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                  </button>
                  <textarea
                    value={input}
                    onChange={(e) => onInputChange(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        sendMessage()
                      }
                    }}
                    placeholder="Tapez un message"
                    rows={1}
                    className="flex-1 max-h-32 min-h-[42px] py-2.5 px-2 text-[15px] outline-none resize-none bg-transparent placeholder:text-[#8696a0]"
                  />
                  <button
                    type="button"
                    onClick={sendMessage}
                    disabled={!input.trim()}
                    className="mb-1 p-2 rounded-full bg-[#008069] text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#005c4b]"
                    aria-label="Envoyer"
                  >
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                    </svg>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
