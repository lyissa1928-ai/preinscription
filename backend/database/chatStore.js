const low = require('lowdb')
const FileSync = require('lowdb/adapters/FileSync')
const path = require('path')
const { conversationKey } = require('../utils/chatRules')

const CHAT_PATH = path.join(__dirname, 'chat.json')
const adapter = new FileSync(CHAT_PATH)
let chatDb
try {
  chatDb = low(adapter)
} catch (e) {
  console.error(
    `❌ Impossible de lire la base chat ${CHAT_PATH} (JSON invalide ou fichier inaccessible).\n`,
    e.message
  )
  throw e
}

chatDb
  .defaults({
    messages: [],
    conversations: [],
    reads: [],
    _nextId: { messages: 1 },
  })
  .write()

// Après restauration manuelle ou import : le compteur doit dépasser le max(id) des messages
;(() => {
  const msgs = chatDb.get('messages').value()
  if (!Array.isArray(msgs) || msgs.length === 0) return
  const ids = msgs
    .map((m) => (m && m.id != null ? Number(m.id) : NaN))
    .filter((n) => Number.isFinite(n) && n >= 0)
  if (!ids.length) return
  const maxId = Math.max(...ids)
  const cur = chatDb.get('_nextId.messages').value()
  const n = typeof cur === 'number' && cur > maxId ? cur : maxId + 1
  if (cur !== n) chatDb.set('_nextId.messages', n).write()
})()

function nextMessageId() {
  const id = chatDb.get('_nextId.messages').value() || 1
  chatDb.set('_nextId.messages', id + 1).write()
  return id
}

function upsertConversation(etablissementId, key, participants, last) {
  const existing = chatDb.get('conversations').find({ key }).value()
  const now = new Date().toISOString()
  if (existing) {
    chatDb
      .get('conversations')
      .find({ key })
      .assign({
        updated_at: now,
        last_message_body: last.body,
        last_sender_id: last.sender_id,
      })
      .write()
    return
  }
  chatDb
    .get('conversations')
    .push({
      key,
      etablissement_id: Number(etablissementId),
      participants,
      updated_at: now,
      last_message_body: last.body,
      last_sender_id: last.sender_id,
      created_at: now,
    })
    .write()
}

/**
 * @param {number} etablissementId
 * @param {number} senderId
 * @param {number} peerId
 * @param {string} body
 * @param {{ url?: string, original_name?: string, mime?: string, size?: number } | null} [attachment]
 */
function addMessage(etablissementId, senderId, peerId, body, attachment = null) {
  const key = conversationKey(etablissementId, senderId, peerId)
  const trimmed = String(body || '').trim()
  if (!trimmed && !attachment) return null

  const preview =
    trimmed ||
    (attachment?.original_name
      ? `📎 ${String(attachment.original_name).slice(0, 120)}`
      : '📎 Document')

  const id = nextMessageId()
  const created_at = new Date().toISOString()
  const msg = {
    id,
    conversation_key: key,
    etablissement_id: Number(etablissementId),
    sender_id: Number(senderId),
    body: trimmed ? trimmed.slice(0, 8000) : preview,
    created_at,
    attachment_url: attachment?.url || null,
    attachment_name: attachment?.original_name || null,
    attachment_mime: attachment?.mime || null,
    attachment_size: attachment?.size != null ? Number(attachment.size) : null,
  }
  chatDb.get('messages').push(msg).write()
  upsertConversation(
    etablissementId,
    key,
    [Number(senderId), Number(peerId)].sort((a, b) => a - b),
    { body: preview, sender_id: senderId }
  )
  return msg
}

/** Documents échangés sur le chat pour un établissement (staff). */
function listAttachmentMessagesForEtablissement(etablissementId) {
  const eid = Number(etablissementId)
  const raw = chatDb.get('messages').value() || []
  return raw
    .filter((m) => Number(m.etablissement_id) === eid && m.attachment_url)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
}

function getMessagesForConversation(conversationKeyStr, { limit = 80, beforeId } = {}) {
  const raw = chatDb.get('messages').value() || []
  const all = raw.filter((m) => m.conversation_key === conversationKeyStr)
  let list = [...all].sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
  if (beforeId) {
    const idx = list.findIndex((m) => m.id === beforeId)
    if (idx > 0) list = list.slice(0, idx)
    else if (idx === 0) list = []
  }
  if (list.length > limit) list = list.slice(-limit)
  return list
}

function listConversationsForUser(userId, etablissementId) {
  const uid = Number(userId)
  const eid = Number(etablissementId)
  const convs = chatDb.get('conversations').value() || []
  return convs
    .filter((c) => c.etablissement_id === eid && (c.participants || []).includes(uid))
    .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
}

function getReadState(userId, key) {
  return chatDb.get('reads').find({ user_id: Number(userId), conversation_key: key }).value()
}

function markConversationRead(userId, conversationKeyStr) {
  const uid = Number(userId)
  const existing = chatDb.get('reads').find({ user_id: uid, conversation_key: conversationKeyStr }).value()
  const now = new Date().toISOString()
  if (existing) {
    chatDb.get('reads').find({ user_id: uid, conversation_key: conversationKeyStr }).assign({ last_read_at: now }).write()
  } else {
    chatDb.get('reads').push({ user_id: uid, conversation_key: conversationKeyStr, last_read_at: now }).write()
  }
}

function unreadCountForConversation(userId, conversationKeyStr) {
  const uid = Number(userId)
  const read = getReadState(uid, conversationKeyStr)
  const lastRead = read?.last_read_at ? new Date(read.last_read_at).getTime() : 0
  const raw = chatDb.get('messages').value() || []
  const messages = raw.filter((m) => m.conversation_key === conversationKeyStr)
  let n = 0
  for (const m of messages) {
    if (m.sender_id === uid) continue
    const t = new Date(m.created_at).getTime()
    if (t > lastRead) n += 1
  }
  return n
}

module.exports = {
  chatDb,
  addMessage,
  getMessagesForConversation,
  listConversationsForUser,
  markConversationRead,
  unreadCountForConversation,
  getReadState,
  listAttachmentMessagesForEtablissement,
}
