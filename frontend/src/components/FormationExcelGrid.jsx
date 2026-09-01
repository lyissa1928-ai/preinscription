import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { computeScolariteAnnuelle, computeTotalMensualites, dureeLabelFromMois } from '../lib/formationTarifs'
import {
  emptyGridRow,
  formationToGridRow,
  FORMATION_COMPUTED_COLUMNS,
  loadColumnState,
  saveColumnState,
  templateColumnsFromState,
  visibleDataColumns,
} from '../lib/formationGridSchema'

const fmt = (n) => new Intl.NumberFormat('fr-FR').format(n || 0)

function parsePasteCell(raw, type) {
  const s = String(raw ?? '').trim()
  if (type === 'number') {
    const n = parseInt(s.replace(/\s/g, '').replace(',', ''), 10)
    return Number.isFinite(n) && n >= 0 ? String(n) : s === '' ? '' : '0'
  }
  return s
}

function selectionSet(sel) {
  if (!sel) return new Set()
  const out = new Set()
  const r0 = Math.min(sel.r1, sel.r2)
  const r1 = Math.max(sel.r1, sel.r2)
  const c0 = Math.min(sel.c1, sel.c2)
  const c1 = Math.max(sel.c1, sel.c2)
  for (let r = r0; r <= r1; r += 1) {
    for (let c = c0; c <= c1; c += 1) out.add(`${r}:${c}`)
  }
  return out
}

/**
 * Grille type Excel — création (variant=create) ou modification par lot (variant=edit).
 */
export default function FormationExcelGrid({
  open,
  onClose,
  etabId,
  filieres,
  initialFiliereId,
  initialType = 'presentiel',
  /** 'create' | 'edit' */
  variant = 'create',
  /** Formations existantes (édition lot) */
  initialRows = null,
  onSubmit,
  saving = false,
  onColumnsChange,
}) {
  const isEdit = variant === 'edit'
  const [filiereId, setFiliereId] = useState(String(initialFiliereId || ''))
  const [mode, setMode] = useState(initialType === 'en_ligne' ? 'en_ligne' : 'presentiel')
  const [columns, setColumns] = useState(() => loadColumnState(etabId))
  const [computedVisible, setComputedVisible] = useState(() => ({
    _total_mens: true,
    _forfait: true,
  }))
  const [rows, setRows] = useState(() => [
    emptyGridRow(initialFiliereId, initialType),
    emptyGridRow(initialFiliereId, initialType),
    emptyGridRow(initialFiliereId, initialType),
  ])
  const [sel, setSel] = useState(null)
  const [dragging, setDragging] = useState(false)
  const [editingHeaderKey, setEditingHeaderKey] = useState(null)
  const [headerDraft, setHeaderDraft] = useState('')
  const tableRef = useRef(null)

  const dataCols = useMemo(() => visibleDataColumns(columns), [columns])
  const computedCols = useMemo(
    () => FORMATION_COMPUTED_COLUMNS.filter((c) => computedVisible[c.key] !== false),
    [computedVisible]
  )

  useEffect(() => {
    if (!open) return
    setColumns(loadColumnState(etabId))
    setFiliereId(String(initialFiliereId || ''))
    setMode(initialType === 'en_ligne' ? 'en_ligne' : 'presentiel')
    if (isEdit && Array.isArray(initialRows) && initialRows.length > 0) {
      setRows(initialRows.map((f) => formationToGridRow(f)))
    } else if (!isEdit) {
      setRows([
        emptyGridRow(initialFiliereId, initialType),
        emptyGridRow(initialFiliereId, initialType),
        emptyGridRow(initialFiliereId, initialType),
      ])
    }
    setSel(null)
    // initialRows volontairement omis des deps : chargé une fois à l’ouverture
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, etabId, initialFiliereId, initialType, isEdit])

  useEffect(() => {
    saveColumnState(etabId, columns)
    onColumnsChange?.(templateColumnsFromState(columns))
  }, [columns, etabId, onColumnsChange])

  const persistColumns = useCallback((next) => {
    setColumns(next)
  }, [])

  const updateCell = useCallback((ri, key, value) => {
    setRows((prev) =>
      prev.map((r, i) => {
        if (i !== ri) return r
        const next = { ...r, [key]: value }
        if (key === 'duree_mois') next.duree = dureeLabelFromMois(value)
        return next
      })
    )
  }, [])

  const addRows = (n = 1) => {
    setRows((prev) => [
      ...prev,
      ...Array.from({ length: n }, () => emptyGridRow(filiereId, mode)),
    ])
  }

  const removeRow = (i) => {
    setRows((prev) => (prev.length <= 1 ? prev : prev.filter((_, idx) => idx !== i)))
    setSel(null)
  }

  const deleteSelectedRows = () => {
    if (!sel) {
      toast.error('Sélectionnez d’abord une ou plusieurs lignes.')
      return
    }
    const r0 = Math.min(sel.r1, sel.r2)
    const r1 = Math.max(sel.r1, sel.r2)
    setRows((prev) => {
      const next = prev.filter((_, i) => i < r0 || i > r1)
      return next.length ? next : [emptyGridRow(filiereId, mode)]
    })
    setSel(null)
    toast.success('Ligne(s) retirée(s) de la grille.')
  }

  const clearSelectionContent = () => {
    if (!sel) return
    const keys = selectionSet(sel)
    setRows((prev) =>
      prev.map((row, ri) => {
        let next = row
        dataCols.forEach((col, ci) => {
          if (!keys.has(`${ri}:${ci}`)) return
          next = { ...next, [col.key]: col.key === 'actif' ? 'true' : '' }
          if (col.key === 'duree_mois') next.duree = ''
        })
        return next
      })
    )
    toast.success('Contenu des cellules sélectionnées effacé.')
  }

  const hideColumn = (key) => {
    const col = columns.find((c) => c.key === key)
    if (col?.required) {
      toast.error(`La colonne « ${col.label} » est obligatoire et ne peut pas être masquée.`)
      return
    }
    if (key === '_total_mens' || key === '_forfait') {
      setComputedVisible((p) => ({ ...p, [key]: false }))
      toast.success('Colonne calculée masquée.')
      return
    }
    persistColumns(columns.map((c) => (c.key === key ? { ...c, visible: false } : c)))
    toast.success('Colonne masquée — le template Excel sera mis à jour.')
  }

  const restoreAllColumns = () => {
    persistColumns(columns.map((c) => ({ ...c, visible: true })))
    setComputedVisible({ _total_mens: true, _forfait: true })
    toast.success('Toutes les colonnes restaurées.')
  }

  const startRename = (col) => {
    setEditingHeaderKey(col.key)
    setHeaderDraft(col.label)
  }

  const commitRename = () => {
    if (!editingHeaderKey) return
    const label = String(headerDraft || '').trim()
    if (!label) {
      setEditingHeaderKey(null)
      return
    }
    persistColumns(columns.map((c) => (c.key === editingHeaderKey ? { ...c, label } : c)))
    setEditingHeaderKey(null)
    toast.success('Titre de colonne modifié — templates synchronisés.')
  }

  const beginSelect = (ri, ci, e) => {
    if (e.shiftKey && sel) setSel({ ...sel, r2: ri, c2: ci })
    else setSel({ r1: ri, c1: ci, r2: ri, c2: ci })
    setDragging(true)
  }

  const extendSelect = (ri, ci) => {
    if (!dragging || !sel) return
    setSel((s) => (s ? { ...s, r2: ri, c2: ci } : s))
  }

  useEffect(() => {
    const up = () => setDragging(false)
    window.addEventListener('mouseup', up)
    return () => window.removeEventListener('mouseup', up)
  }, [])

  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => {
      if (editingHeaderKey) return
      const tag = e.target?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if ((e.key === 'Delete' || e.key === 'Backspace') && sel) {
        e.preventDefault()
        clearSelectionContent()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const handlePaste = (e, startRow, startColKey) => {
    const text = e.clipboardData?.getData('text')
    if (!text || (!text.includes('\t') && !text.includes('\n'))) return
    e.preventDefault()

    const startCol = dataCols.findIndex((c) => c.key === startColKey)
    if (startCol < 0) return

    const pasted = text
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .split('\n')
      .filter((line, idx, arr) => !(idx === arr.length - 1 && line === ''))
      .map((line) => line.split('\t'))

    setRows((prev) => {
      const next = prev.map((r) => ({ ...r }))
      pasted.forEach((cells, di) => {
        const ri = startRow + di
        while (next.length <= ri) next.push(emptyGridRow(filiereId, mode))
        cells.forEach((cell, ci) => {
          const col = dataCols[startCol + ci]
          if (!col) return
          next[ri] = {
            ...next[ri],
            [col.key]: parsePasteCell(cell, col.type),
          }
          if (!isEdit) {
            next[ri].filiere_id = filiereId
            next[ri].type = mode
          }
          if (col.key === 'duree_mois') {
            next[ri].duree = dureeLabelFromMois(next[ri].duree_mois)
          }
        })
      })
      return next
    })
    toast.success(`${pasted.length} ligne(s) collée(s).`)
  }

  const handleValidate = async () => {
    const filled = rows.filter((r) => String(r.titre || '').trim())
    if (filled.length === 0) {
      toast.error('Renseignez au moins un nom de formation.')
      return
    }
    if (!isEdit && !filiereId) {
      toast.error('Sélectionnez une filière.')
      return
    }
    for (const r of filled) {
      const fid = parseInt(r.filiere_id || filiereId, 10)
      if (!fid || Number.isNaN(fid)) {
        toast.error('Chaque ligne doit avoir une filière.')
        return
      }
    }
    const payload = filled.map((r) => {
      const mois = parseInt(r.duree_mois, 10) || 0
      const rowType = r.type === 'en_ligne' ? 'en_ligne' : (isEdit ? (r.type || 'presentiel') : mode)
      return {
        ...(r.id != null ? { id: r.id } : {}),
        filiere_id: parseInt(r.filiere_id || filiereId, 10),
        titre: String(r.titre).trim(),
        type: isEdit ? rowType : mode,
        niveau: r.niveau || '',
        niveau_requis: r.niveau_requis || '',
        duree: dureeLabelFromMois(mois),
        duree_mois: mois,
        description: r.description || '',
        ville: null,
        places: 0,
        frais_inscription: parseInt(r.frais_inscription, 10) || 0,
        mensualite: parseInt(r.mensualite, 10) || 0,
        frais_soutenance: parseInt(r.frais_soutenance, 10) || 0,
        frais_bibliotheque: parseInt(r.frais_bibliotheque, 10) || 0,
        frais_epi: parseInt(r.frais_epi, 10) || 0,
        autres_frais: 0,
        frais_supplementaires: [],
        actif: String(r.actif ?? 'true').toLowerCase() !== 'false',
        nombre_photos_preinscription: 1,
      }
    })
    await onSubmit(payload)
  }

  const selectedKeys = useMemo(() => selectionSet(sel), [sel])
  const hiddenCount = columns.filter((c) => c.visible === false).length
    + Object.values(computedVisible).filter((v) => v === false).length

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-3 sm:p-4">
      <div className="flex max-h-[94vh] w-full max-w-[96rem] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex flex-shrink-0 flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              {isEdit ? 'Modifier les formations sélectionnées — grille Excel' : 'Ajouter des formations — grille Excel'}
            </h3>
            <p className="mt-1 max-w-3xl text-xs text-slate-500">
              {isEdit
                ? 'Les lignes chargées conservent leur identifiant : la validation met à jour les formations existantes sans perte. Vous pouvez aussi ajouter de nouvelles lignes.'
                : 'Même colonnes que le template Excel. Collage multi-lignes, sélection souris, rename des en-têtes (sync templates).'}
              <span className="mt-1 block text-slate-600">
                <strong>Nom de la formation</strong> = nom officiel affiché aux candidats
                (ex. « Licence 1 Génie Civil »).
              </span>
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-2xl leading-none text-slate-400 hover:text-slate-700" aria-label="Fermer">
            ×
          </button>
        </div>

        <div className="flex flex-shrink-0 flex-wrap items-end gap-3 border-b border-slate-50 bg-slate-50/80 px-5 py-3">
          {!isEdit && (
            <>
              <div className="min-w-[12rem]">
                <label className="mb-1 block text-xs font-semibold text-slate-600">Filière *</label>
                <select
                  className="input-field py-2"
                  value={filiereId}
                  onChange={(e) => {
                    setFiliereId(e.target.value)
                    setRows((prev) => prev.map((r) => ({ ...r, filiere_id: e.target.value })))
                  }}
                >
                  <option value="">— Sélectionner —</option>
                  {filieres.map((f) => (
                    <option key={f.id} value={String(f.id)}>{f.nom}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">Mode *</label>
                <div className="flex gap-1 rounded-xl bg-white p-1 ring-1 ring-slate-200">
                  {[
                    { val: 'presentiel', label: 'Présentiel' },
                    { val: 'en_ligne', label: 'En ligne (FAD)' },
                  ].map(({ val, label }) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => {
                        setMode(val)
                        setRows((prev) => prev.map((r) => ({ ...r, type: val })))
                      }}
                      className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                        mode === val ? 'bg-blue-600 text-white shadow' : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
          <button type="button" onClick={() => addRows(1)} className="btn-secondary text-xs">+ Ligne</button>
          <button type="button" onClick={() => addRows(5)} className="btn-secondary text-xs">+ 5 lignes</button>
          <button type="button" onClick={clearSelectionContent} className="btn-secondary text-xs" disabled={!sel}>
            Vider la sélection
          </button>
          <button type="button" onClick={deleteSelectedRows} className="text-xs font-semibold text-red-700 hover:underline" disabled={!sel}>
            Retirer lignes sélectionnées
          </button>
          {hiddenCount > 0 && (
            <button type="button" onClick={restoreAllColumns} className="text-xs font-semibold text-blue-700 hover:underline">
              Restaurer colonnes ({hiddenCount})
            </button>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-auto p-3" ref={tableRef}>
          <table className="w-full min-w-[1100px] border-collapse text-sm select-none">
            <thead className="sticky top-0 z-10 bg-slate-100 shadow-sm">
              <tr className="text-left text-[10px] font-bold uppercase tracking-wide text-slate-500">
                <th className="w-8 px-1 py-2 text-center">#</th>
                {isEdit && (
                  <>
                    <th className="px-1.5 py-2 min-w-[8rem]">Filière *</th>
                    <th className="px-1.5 py-2 min-w-[6rem]">Mode *</th>
                  </>
                )}
                {dataCols.map((c, ci) => (
                  <th key={c.key} className={`px-1 py-2 ${c.width || ''} group relative`}>
                    {editingHeaderKey === c.key ? (
                      <input
                        className="input-field w-full py-0.5 text-xs normal-case"
                        value={headerDraft}
                        autoFocus
                        onChange={(e) => setHeaderDraft(e.target.value)}
                        onBlur={commitRename}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') commitRename()
                          if (e.key === 'Escape') setEditingHeaderKey(null)
                        }}
                      />
                    ) : (
                      <div className="flex items-start gap-1">
                        <button
                          type="button"
                          className="text-left normal-case leading-tight hover:text-blue-700"
                          title={c.help || 'Double-clic pour renommer'}
                          onDoubleClick={() => startRename(c)}
                          onClick={() => setSel({ r1: 0, c1: ci, r2: Math.max(0, rows.length - 1), c2: ci })}
                        >
                          {c.required ? `${c.label} *` : c.label}
                        </button>
                        {!c.required && (
                          <button
                            type="button"
                            className="opacity-0 group-hover:opacity-100 text-red-500 text-[11px]"
                            title="Masquer cette colonne"
                            onClick={() => hideColumn(c.key)}
                          >
                            ×
                          </button>
                        )}
                      </div>
                    )}
                  </th>
                ))}
                {computedCols.map((c) => (
                  <th key={c.key} className={`px-1.5 py-2 whitespace-nowrap group ${c.width || ''}`}>
                    <div className="flex items-center gap-1">
                      <span className="normal-case">{c.label}</span>
                      <button
                        type="button"
                        className="opacity-0 group-hover:opacity-100 text-red-500 text-[11px]"
                        title="Masquer"
                        onClick={() => hideColumn(c.key)}
                      >
                        ×
                      </button>
                    </div>
                  </th>
                ))}
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r, ri) => {
                const totalMen = computeTotalMensualites(r.mensualite, r.duree_mois)
                const forfait = computeScolariteAnnuelle(r.frais_inscription, r.mensualite, r.duree_mois)
                const rowSelected = sel && ri >= Math.min(sel.r1, sel.r2) && ri <= Math.max(sel.r1, sel.r2)
                return (
                  <tr
                    key={r._tmpId}
                    className={`${ri % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'} ${rowSelected ? 'outline outline-1 outline-blue-200' : ''}`}
                  >
                    <td
                      className={`px-1 py-1 text-center text-xs cursor-pointer ${rowSelected ? 'bg-blue-100 text-blue-800 font-bold' : 'text-slate-400'}`}
                      onMouseDown={(e) => beginSelect(ri, 0, e)}
                      onMouseEnter={() => extendSelect(ri, Math.max(0, dataCols.length - 1))}
                      title={r.id != null ? `id ${r.id}` : 'Nouvelle ligne'}
                    >
                      {ri + 1}
                    </td>
                    {isEdit && (
                      <>
                        <td className="px-1 py-0.5">
                          <select
                            className="input-field w-full min-w-[7rem] py-1 text-xs"
                            value={r.filiere_id}
                            onChange={(e) => updateCell(ri, 'filiere_id', e.target.value)}
                          >
                            <option value="">—</option>
                            {filieres.map((f) => (
                              <option key={f.id} value={String(f.id)}>{f.nom}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-1 py-0.5">
                          <select
                            className="input-field w-full py-1 text-xs"
                            value={r.type || 'presentiel'}
                            onChange={(e) => updateCell(ri, 'type', e.target.value)}
                          >
                            <option value="presentiel">Présentiel</option>
                            <option value="en_ligne">En ligne</option>
                          </select>
                        </td>
                      </>
                    )}
                    {dataCols.map((c, ci) => {
                      const active = selectedKeys.has(`${ri}:${ci}`)
                      return (
                        <td
                          key={c.key}
                          data-grid-cell
                          className={`px-0.5 py-0.5 ${active ? 'bg-blue-100 ring-1 ring-inset ring-blue-400' : ''}`}
                          onMouseDown={(e) => beginSelect(ri, ci, e)}
                          onMouseEnter={() => extendSelect(ri, ci)}
                        >
                          <input
                            className="input-field w-full border-0 bg-transparent py-1 text-sm shadow-none focus:ring-1 focus:ring-blue-400"
                            type={c.type === 'number' ? 'number' : 'text'}
                            min={c.type === 'number' ? 0 : undefined}
                            value={r[c.key] ?? ''}
                            onChange={(e) => updateCell(ri, c.key, e.target.value)}
                            onPaste={(e) => handlePaste(e, ri, c.key)}
                            onFocus={() => setSel({ r1: ri, c1: ci, r2: ri, c2: ci })}
                            placeholder={c.key === 'duree_mois' ? 'ex. 10' : c.key === 'titre' ? 'ex. Licence 1…' : ''}
                          />
                        </td>
                      )
                    })}
                    {computedVisible._total_mens !== false && (
                      <td className="px-1.5 py-1 font-semibold tabular-nums text-emerald-800 whitespace-nowrap text-xs">
                        {fmt(totalMen)}
                      </td>
                    )}
                    {computedVisible._forfait !== false && (
                      <td className="px-1.5 py-1 font-bold tabular-nums text-blue-900 whitespace-nowrap text-xs">
                        {fmt(forfait)}
                      </td>
                    )}
                    <td className="px-1 py-1">
                      <button type="button" className="text-red-500 hover:text-red-700 text-sm" onClick={() => removeRow(ri)} title="Retirer la ligne">
                        ×
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className="flex flex-shrink-0 flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-white px-5 py-3">
          <p className="text-xs text-slate-500">
            {rows.filter((r) => String(r.titre || '').trim()).length} formation(s)
            {isEdit ? ' à enregistrer' : ` à créer · mode ${mode === 'en_ligne' ? 'en ligne' : 'présentiel'}`}
            {isEdit ? ` · ${rows.filter((r) => r.id != null).length} existante(s)` : ''}
            {sel ? ' · sélection active' : ''}
          </p>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="btn-secondary" disabled={saving}>
              Fermer
            </button>
            <button type="button" onClick={handleValidate} disabled={saving} className="btn-primary disabled:opacity-40">
              {saving ? 'Enregistrement…' : (isEdit ? 'Valider les modifications' : 'Valider et enregistrer')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
