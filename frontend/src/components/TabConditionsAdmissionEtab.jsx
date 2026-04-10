import { useCallback, useEffect, useState } from 'react'

import axios from 'axios'

import toast from 'react-hot-toast'

import { FaSave, FaTrash, FaEdit } from 'react-icons/fa'

import ConditionsAdmissionRichEditor from './ConditionsAdmissionRichEditor'

import {
  isEmptyConditionsHtml,
  plainToSafeHtml,
  renderConditionsLooksLikeHtml,
  sanitizeConditionsHtml,
} from '../utils/conditionsHtml'
import { messageFromAxiosError } from '../utils/axiosErrorMessage'

function normalizeForEditor(raw) {
  if (!String(raw || '').trim()) return ''
  if (renderConditionsLooksLikeHtml(raw)) return raw
  return plainToSafeHtml(raw)
}

/**
 * Plusieurs blocs de conditions d’admission (HTML riche) par établissement — responsable / admin.
 */
export default function TabConditionsAdmissionEtab({ etabId, etabNom }) {
  const [conditions, setConditions] = useState([])
  const [newText, setNewText] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editText, setEditText] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const apiOpts = (id) => {
    if (id == null || id === '') return {}
    const n = Number(id)
    return Number.isFinite(n) ? { params: { etablissement_id: n } } : {}
  }

  const load = useCallback(() => {
    if (etabId == null || etabId === '') {
      setConditions([])
      setLoading(false)
      return
    }
    setLoading(true)
    axios
      .get('/api/conditions-admission/me', apiOpts(etabId))
      .then(({ data }) => {
        const list = Array.isArray(data.conditions) ? data.conditions : []
        setConditions(
          list.map((c) => ({
            id: c.id,
            texte: normalizeForEditor(c.texte || ''),
            updated_at: c.updated_at || null,
            updated_by_user_id: c.updated_by_user_id ?? null,
          })),
        )
      })
      .catch(() => toast.error('Impossible de charger les conditions.'))
      .finally(() => setLoading(false))
  }, [etabId])

  useEffect(() => {
    setEditingId(null)
    setEditText('')
    setNewText('')
    load()
  }, [etabId, load])

  const addCondition = () => {
    if (etabId == null || etabId === '') {
      toast.error('Sélectionnez un établissement.')
      return
    }
    if (isEmptyConditionsHtml(newText)) {
      toast.error('Saisissez le texte de la condition avant d’ajouter.')
      return
    }
    setSaving(true)
    axios
      .post('/api/conditions-admission/me', { texte: sanitizeConditionsHtml(newText) }, apiOpts(etabId))
      .then(() => {
        toast.success('Condition ajoutée.')
        setNewText('')
        load()
      })
      .catch((e) => {
        const code = e.response?.data?.code
        if (e.response?.status === 403 && code === 'MUST_CHANGE_PASSWORD') {
          toast.error(e.response?.data?.message || 'Vous devez changer votre mot de passe avant d’enregistrer.')
          return
        }
        toast.error(messageFromAxiosError(e, 'Ajout impossible.'))
      })
      .finally(() => setSaving(false))
  }

  const saveEdit = () => {
    if (editingId == null) return
    if (isEmptyConditionsHtml(editText)) {
      toast.error('Le texte ne peut pas être vide.')
      return
    }
    setSaving(true)
    axios
      .put(`/api/conditions-admission/me/${editingId}`, { texte: sanitizeConditionsHtml(editText) }, apiOpts(etabId))
      .then(() => {
        toast.success('Modification enregistrée.')
        setEditingId(null)
        setEditText('')
        load()
      })
      .catch((e) => toast.error(messageFromAxiosError(e, 'Enregistrement impossible.')))
      .finally(() => setSaving(false))
  }

  const removeOne = (id) => {
    if (!window.confirm('Supprimer cette condition ? Elle ne sera plus visible pour les candidats.')) return
    setSaving(true)
    axios
      .delete(`/api/conditions-admission/me/${id}`, apiOpts(etabId))
      .then(() => {
        toast.success('Condition supprimée.')
        if (editingId === id) {
          setEditingId(null)
          setEditText('')
        }
        load()
      })
      .catch((e) => toast.error(e.response?.data?.message || 'Suppression impossible.'))
      .finally(() => setSaving(false))
  }

  const clearAll = () => {
    if (
      !window.confirm(
        'Supprimer toutes les conditions publiées pour cet établissement ? Les candidats ne verront plus aucun bloc sur la demande proforma.',
      )
    )
      return
    setSaving(true)
    axios
      .delete('/api/conditions-admission/me', apiOpts(etabId))
      .then(() => {
        toast.success('Toutes les conditions ont été supprimées.')
        setEditingId(null)
        setEditText('')
        load()
      })
      .catch((e) => toast.error(e.response?.data?.message || 'Suppression impossible.'))
      .finally(() => setSaving(false))
  }

  const startEdit = (c) => {
    setEditingId(c.id)
    setEditText(c.texte || '')
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditText('')
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    )
  }

  const canAdd = !isEmptyConditionsHtml(newText)
  const hasList = conditions.length > 0

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-black text-slate-900">Conditions d’admission — candidats</h2>
        <p className="text-sm text-slate-600 mt-1">
          Ajoutez <strong>plusieurs blocs</strong> (par thème, par niveau, etc.). Après chaque ajout ou modification
          validée, le champ de saisie du <strong>nouveau</strong> bloc est vidé pour vous permettre d’en saisir un autre.
          Le contenu est affiché sur la page « Demande de facture proforma » après sélection de{' '}
          <strong>{etabNom || 'votre établissement'}</strong>.
        </p>
        <p className="text-xs text-slate-500 mt-2">
          Mode <strong>Éditeur</strong> (barre : titres, puces, couleurs, <strong>AA</strong> / <strong>aa</strong> pour
          majuscules/minuscules) ou mode <strong>Code HTML</strong> pour tableaux et balises avancées. À
          l’enregistrement, le HTML est sécurisé (pas de JavaScript exécutable).
        </p>
      </div>

      <div>
        <label className="block text-sm font-semibold text-slate-800 mb-2">Nouvelle condition (mise en forme)</label>
        <ConditionsAdmissionRichEditor key={`new-${etabId}`} value={newText} onChange={setNewText} />
        <div className="flex flex-wrap gap-3 pt-3">
          <button
            type="button"
            onClick={addCondition}
            disabled={saving || !canAdd}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-800 disabled:opacity-50"
          >
            <FaSave className="h-4 w-4" aria-hidden />
            Ajouter cette condition
          </button>
          {hasList && (
            <button
              type="button"
              onClick={clearAll}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-5 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-40"
            >
              <FaTrash className="h-3.5 w-3.5" aria-hidden />
              Tout supprimer
            </button>
          )}
        </div>
      </div>

      {hasList && (
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Conditions publiées</h3>
          <ul className="space-y-4">
            {conditions.map((c, idx) => (
              <li
                key={c.id}
                className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                  <p className="text-xs font-bold text-slate-500">
                    Bloc {idx + 1}
                    {c.updated_at && (
                      <span className="font-normal text-slate-400">
                        {' '}
                        · {new Date(c.updated_at).toLocaleString('fr-FR')}
                      </span>
                    )}
                  </p>
                  {editingId !== c.id && (
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => startEdit(c)}
                        disabled={saving}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-100 disabled:opacity-40"
                      >
                        <FaEdit className="h-3 w-3" aria-hidden />
                        Modifier
                      </button>
                      <button
                        type="button"
                        onClick={() => removeOne(c.id)}
                        disabled={saving}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-red-100 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-40"
                      >
                        <FaTrash className="h-3 w-3" aria-hidden />
                        Supprimer
                      </button>
                    </div>
                  )}
                </div>

                {editingId === c.id ? (
                  <div className="space-y-3">
                    <ConditionsAdmissionRichEditor key={`edit-${editingId}`} value={editText} onChange={setEditText} />
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={saveEdit}
                        disabled={saving || isEmptyConditionsHtml(editText)}
                        className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2 text-sm font-bold text-white hover:bg-blue-800 disabled:opacity-50"
                      >
                        <FaSave className="h-3.5 w-3.5" aria-hidden />
                        Enregistrer les modifications
                      </button>
                      <button
                        type="button"
                        onClick={cancelEdit}
                        disabled={saving}
                        className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-40"
                      >
                        Annuler
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    className="ql-editor border-0 p-0 min-h-0 max-h-48 overflow-y-auto rounded-xl border border-white bg-white px-3 py-2 text-sm text-slate-800 [&_a]:underline"
                    dangerouslySetInnerHTML={{ __html: sanitizeConditionsHtml(c.texte) }}
                  />
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
