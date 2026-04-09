import { useMemo, useState } from 'react'
import ReactQuill from 'react-quill'
import './quillConditionsSetup.js'
import './conditionsAdmissionQuill.css'
import 'react-quill/dist/quill.snow.css'
import { needsAdvancedHtmlForEditor } from '../utils/conditionsHtml'

const FORMATS = [
  'font',
  'size',
  'bold',
  'italic',
  'underline',
  'strike',
  'color',
  'background',
  'script',
  'header',
  'list',
  'indent',
  'align',
  'direction',
  'link',
]

/** Sélection du mot au curseur (MAJ/minuscule sans sélection préalable). */
function expandWordRange(quill, index) {
  const text = quill.getText()
  if (!text || index < 0 || index > text.length) return null
  const isWordChar = (ch) => ch && /[\p{L}\p{N}]/u.test(ch)
  let i = index
  if (i < text.length && isWordChar(text[i])) {
    let start = i
    while (start > 0 && isWordChar(text[start - 1])) start--
    let end = i
    while (end < text.length && isWordChar(text[end])) end++
    if (end > start) return { index: start, length: end - start }
  }
  if (i > 0 && isWordChar(text[i - 1])) {
    let start = i - 1
    while (start > 0 && isWordChar(text[start - 1])) start--
    let end = start
    while (end < text.length && isWordChar(text[end])) end++
    if (end > start) return { index: start, length: end - start }
  }
  return null
}

function applyCase(quill, mode) {
  let range = quill.getSelection(true)
  if (!range) return
  if (range.length === 0) {
    const expanded = expandWordRange(quill, range.index)
    if (!expanded) return
    range = expanded
    quill.setSelection(range.index, range.length, 'silent')
  }
  const text = quill.getText(range.index, range.length)
  const next = mode === 'upper' ? text.toLocaleUpperCase('fr-FR') : text.toLocaleLowerCase('fr-FR')
  quill.deleteText(range.index, range.length, 'user')
  quill.insertText(range.index, next, 'user')
  quill.setSelection(range.index, next.length, 'user')
}

export default function ConditionsAdmissionRichEditor({ value, onChange, readOnly }) {
  const [mode, setMode] = useState(() => (needsAdvancedHtmlForEditor(value) ? 'code' : 'visual'))

  const modules = useMemo(
    () => ({
      toolbar: {
        container: [
          [{ font: [] }],
          [{ size: ['small', false, 'large', 'huge'] }],
          ['bold', 'italic', 'underline', 'strike'],
          [{ color: [] }, { background: [] }],
          [{ script: 'sub' }, { script: 'super' }],
          [{ header: [1, 2, 3, false] }],
          [{ list: 'ordered' }, { list: 'bullet' }],
          [{ indent: '-1' }, { indent: '+1' }],
          [{ align: [] }],
          [{ direction: 'rtl' }],
          ['link'],
          ['uppercase', 'lowercase'],
          ['clean'],
        ],
        handlers: {
          uppercase() {
            applyCase(this.quill, 'upper')
          },
          lowercase() {
            applyCase(this.quill, 'lower')
          },
        },
      },
      clipboard: { matchVisual: false },
    }),
    [],
  )

  const goVisual = () => {
    if (mode === 'visual') return
    if (needsAdvancedHtmlForEditor(value)) {
      const ok = window.confirm(
        'Ce bloc contient du HTML avancé (ex. tableaux). L’éditeur visuel peut le simplifier et supprimer certaines balises. Continuer ?',
      )
      if (!ok) return
    }
    setMode('visual')
  }

  return (
    <div className="conditions-admission-quill space-y-2">
      {!readOnly && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-500">Mode :</span>
          <button
            type="button"
            onClick={() => goVisual()}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
              mode === 'visual'
                ? 'bg-blue-700 text-white shadow-sm'
                : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            Éditeur
          </button>
          <button
            type="button"
            onClick={() => setMode('code')}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
              mode === 'code'
                ? 'bg-blue-700 text-white shadow-sm'
                : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            Code HTML
          </button>
          <span className="text-xs text-slate-400 hidden sm:inline" title="Aide">
            AA / aa : majuscules ou minuscules sur la sélection (ou le mot sous le curseur).
          </span>
        </div>
      )}

      {mode === 'code' ? (
        <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
          <textarea
            className="w-full min-h-[320px] resize-y p-4 font-mono text-sm text-slate-800 leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            readOnly={readOnly}
            spellCheck={false}
            placeholder="Collez ou saisissez du HTML (tableaux, listes, styles inline…). Les balises &lt;script&gt; et le JavaScript sont retirés à l’enregistrement."
            aria-label="Édition du code HTML des conditions d’admission"
          />
          {!readOnly && (
            <p className="border-t border-slate-100 bg-slate-50/80 px-4 py-2 text-xs text-slate-600">
              <strong>Sécurité :</strong> le contenu est nettoyé à l’enregistrement (pas d’exécution de JavaScript dans les
              pages publiques). Le HTML structuré (titres, tableaux, images avec URL https, liens) est conservé.
            </p>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
          <ReactQuill
            theme="snow"
            value={value || ''}
            onChange={onChange}
            modules={modules}
            formats={FORMATS}
            readOnly={readOnly}
            placeholder="Rédigez les conditions d’admission : titres, listes, couleurs, etc."
          />
        </div>
      )}
    </div>
  )
}
