import DOMPurify from 'dompurify'

/** HTML « vide » produit par Quill quand il n’y a rien à afficher */
export function isEmptyConditionsHtml(html) {
  const s = String(html || '')
    .replace(/\u00a0/g, ' ')
    .replace(/\s/g, '')
  if (!s) return true
  return /^<p><br\s*\/?><\/p>$/i.test(s) || /^<p>\s*<\/p>$/i.test(s)
}

/**
 * Contenu avec balises souvent simplifiées par l’éditeur visuel Quill — préférer le mode « Code HTML ».
 */
export function needsAdvancedHtmlForEditor(html) {
  return /<(table|colgroup|tbody|thead|tfoot|tr|th|td|caption)\b/i.test(String(html || ''))
}

/**
 * HTML affiché / stocké après enregistrement : balises étendues, pas de script ni d’événements inline.
 * Les balises &lt;script&gt; et le JavaScript inline sont retirés (sécurité XSS).
 */
export function sanitizeConditionsHtml(html) {
  return DOMPurify.sanitize(String(html || ''), {
    ALLOWED_TAGS: [
      'p', 'br', 'span', 'strong', 'b', 'em', 'i', 'u', 's', 'strike',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'blockquote', 'ol', 'ul', 'li',
      'a', 'sub', 'sup', 'pre', 'code', 'kbd', 'samp', 'var',
      'div', 'section', 'article', 'aside', 'header', 'footer', 'nav', 'main',
      'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption', 'colgroup', 'col',
      'hr', 'img', 'figure', 'figcaption', 'details', 'summary', 'mark', 'small',
    ],
    ALLOWED_ATTR: [
      'style', 'class', 'href', 'target', 'rel', 'dir', 'id', 'title',
      'colspan', 'rowspan', 'scope', 'headers',
      'width', 'height', 'alt', 'loading', 'decoding', 'src', 'srcset', 'sizes',
    ],
    ALLOW_DATA_ATTR: false,
  })
}

/** Affichage public : ancien contenu sans balises = texte brut */
export function renderConditionsLooksLikeHtml(s) {
  return /<[a-z][\s\S]*>/i.test(String(s || ''))
}

/** Ancien contenu plain text → paragraphe HTML sûr pour Quill */
export function plainToSafeHtml(text) {
  const s = String(text ?? '')
  if (!s.trim()) return ''
  const escaped = s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  return `<p>${escaped.replace(/\r\n/g, '\n').replace(/\n/g, '<br/>')}</p>`
}
