/**
 * Validation des pièces jointes chat fournies par le client (Lot 1 sécurité).
 *
 * Avant : `attachment.url` était accepté tel quel — un client pouvait faire
 * référencer n'importe quel fichier /uploads (document d'identité d'un autre
 * étudiant) ou une URL externe. Désormais seuls les fichiers réellement
 * présents dans uploads/chat-attachments/ sont acceptés.
 */
const path = require('path');
const fs = require('fs');

const CHAT_URL_PREFIX = '/uploads/chat-attachments/';
const CHAT_UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'chat-attachments');

/**
 * @returns {{ attachment: object|null, invalid: boolean }}
 *  - attachment null + invalid false : pas de pièce jointe.
 *  - attachment null + invalid true  : pièce jointe fournie mais refusée.
 *  - attachment object               : pièce jointe validée et normalisée.
 */
function sanitizeChatAttachment(a) {
  if (!a || typeof a !== 'object') return { attachment: null, invalid: false };
  const url = String(a.url || '').trim();
  if (!url) return { attachment: null, invalid: false };

  if (!url.startsWith(CHAT_URL_PREFIX)) return { attachment: null, invalid: true };
  const name = url.slice(CHAT_URL_PREFIX.length);
  if (
    !name ||
    name !== path.basename(name) ||
    name.includes('..') ||
    /[?#%\\/]/.test(name)
  ) {
    return { attachment: null, invalid: true };
  }
  const abs = path.join(CHAT_UPLOAD_DIR, name);
  if (!fs.existsSync(abs)) return { attachment: null, invalid: true };

  const nameRaw = a.original_name || a.name;
  return {
    invalid: false,
    attachment: {
      url: CHAT_URL_PREFIX + name,
      original_name: nameRaw ? String(nameRaw).slice(0, 500) : null,
      mime: a.mime ? String(a.mime).slice(0, 200) : null,
      size: a.size != null ? Number(a.size) : null,
    },
  };
}

module.exports = { sanitizeChatAttachment, CHAT_URL_PREFIX, CHAT_UPLOAD_DIR };
