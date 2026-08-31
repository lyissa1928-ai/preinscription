import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import axios from 'axios'
import toast from 'react-hot-toast'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { mediaUrl } from '../utils/mediaUrl'
import CachetScolarite from '../components/CachetScolarite'
import { titreTypeDocument, isFactureDefinitive } from '../utils/factureTypeDocument'

const fmt = (n) => new Intl.NumberFormat('fr-FR').format(Math.round(n || 0))
const fmtDate = (d) => {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
}
const typeLabel = (t) => (t === 'en_ligne' ? 'Formation en ligne (FAD)' : 'Formation en présentiel')

function hexToRgb(hex) {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || '#1e40af')
  return r ? [parseInt(r[1], 16), parseInt(r[2], 16), parseInt(r[3], 16)] : [30, 64, 175]
}

function fmtN(n) {
  return Math.round(n || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

async function loadImgBase64(url) {
  try {
    const r = await fetch(url)
    if (!r.ok) return null
    const blob = await r.blob()
    return new Promise((resolve) => {
      const rd = new FileReader()
      rd.onloadend = () => resolve(rd.result)
      rd.onerror = () => resolve(null)
      rd.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

/** Lignes : Mensualité unitaire + Total mensualités (mois × unitaire). */
function buildDisplayRows(facture, fo = {}) {
  const lignes = facture?.lignes || []
  const moisFromLigne = Number(lignes.find((l) => Number(l.duree_mois) > 0)?.duree_mois) || 0
  const mois = Number(fo.duree_mois) > 0 ? Number(fo.duree_mois) : moisFromLigne
  const unitMen = Number(fo.mensualite) || 0
  const rows = []
  let mensualiteAjoutee = false

  const pushMensualiteRows = (unit) => {
    const u = Number(unit) || 0
    if (u <= 0) return
    rows.push({ designation: 'Mensualité', montant: u, isUnitMensualite: true })
    if (mois > 0) {
      rows.push({
        designation: `Total mensualités (${mois} mois)`,
        montant: mois * u,
        isTotalMensualites: true,
      })
    }
    mensualiteAjoutee = true
  }

  for (const l of lignes) {
    const desc = String(l.description || l.designation || '').trim()
    const kind = l.kind
    if (kind === 'mensualite_unitaire' || /^mensualit/i.test(desc) || /^total mensualit/i.test(desc)) {
      if (mensualiteAjoutee) continue
      const unit = Number(l.montant_unitaire ?? fo.mensualite ?? l.prix_unitaire) || unitMen
        || (mois > 0 && Number(l.total) > 0 ? Math.round(Number(l.total) / mois) : 0)
      pushMensualiteRows(unit || unitMen)
      continue
    }
    if (/inscription/i.test(desc)) {
      rows.push({
        designation: "Frais d'inscription",
        montant: Number(l.total ?? l.montant) || Number(fo.frais_inscription) || 0,
      })
      continue
    }
    if (/^scolarit/i.test(desc)) {
      if (!mensualiteAjoutee) {
        const total = Number(l.total ?? l.montant) || 0
        const unit = unitMen || (mois > 0 ? Math.round(total / mois) : 0)
        pushMensualiteRows(unit)
      }
      continue
    }
    rows.push({ designation: desc || 'Frais', montant: Number(l.total ?? l.montant) || 0 })
  }
  if (!rows.some((r) => /inscription/i.test(r.designation)) && Number(fo.frais_inscription) > 0) {
    rows.unshift({ designation: "Frais d'inscription", montant: Number(fo.frais_inscription) })
  }
  if (!mensualiteAjoutee && unitMen > 0) pushMensualiteRows(unitMen)

  const rawSupp = facture?.lignes_supplementaires || []
  const supplementaires = (Array.isArray(rawSupp) ? rawSupp : [])
    .map((l) => ({
      designation: String(l.designation || l.description || '').trim(),
      montant: Number(l.montant || l.total) || 0,
    }))
    .filter((s) => s.designation && s.montant > 0)

  for (const s of supplementaires) {
    rows.push({ designation: s.designation, montant: s.montant, supplement: true })
  }

  const fromSnapshot = Number(facture?.montant_total_a_payer) || Number(facture?.montant_ttc) || 0
  const recomputed = rows
    .filter((r) => !r.isUnitMensualite)
    .reduce((a, b) => a + (Number(b.montant) || 0), 0)

  return { rows, totalAPayer: fromSnapshot > 0 ? fromSnapshot : recomputed, supplementaires }
}

/** Paiement uniquement — pas d’e-mail / tél / arrêté / banque (déjà en en-tête ou inutiles). */
function CoordonneesPaiement({ eb, primary }) {
  const lines = [
    eb?.rc && { label: 'RC (Registre commercial)', value: String(eb.rc).trim() },
    (eb?.compte_bancaire || eb?.iban) && {
      label: 'Compte bancaire / IBAN',
      value: eb.compte_bancaire || eb.iban,
    },
    eb?.swift && { label: 'Code SWIFT', value: eb.swift },
  ].filter(Boolean)

  if (!lines.length) return null

  return (
    <section className="px-8 pb-5">
      <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
        Coordonnées de paiement
      </p>
      <div className="border border-slate-200 px-4 py-3 text-xs text-slate-700" style={{ borderLeftWidth: 3, borderLeftColor: primary }}>
        <dl className="grid gap-2 sm:grid-cols-3">
          {lines.map((l) => (
            <div key={l.label}>
              <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{l.label}</dt>
              <dd className="mt-0.5 font-medium text-slate-800 break-words">{l.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}

function headerContactLines(eb) {
  return [
    eb.adresse,
    eb.telephone,
    eb.email_contact,
    eb.arrete && `Arrêté : ${String(eb.arrete).trim()}`,
    eb.ninea && `NINEA : ${eb.ninea}`,
  ].filter(Boolean)
}

export default function FactureView() {
  const { dossierId } = useParams()
  const [facture, setFacture] = useState(null)
  const [etabLive, setEtabLive] = useState(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [pdfBusy, setPdfBusy] = useState(false)

  useEffect(() => {
    axios.get(`/api/factures/dossier/${dossierId}`)
      .then(({ data }) => setFacture(data))
      .catch(() => {
        setGenerating(true)
        axios.post(`/api/factures/generer/${dossierId}`)
          .then(({ data }) => {
            setFacture(data)
            toast.success('Facture générée et enregistrée dans l’historique.')
          })
          .catch((err) => toast.error(err.response?.data?.message || 'Erreur génération facture'))
          .finally(() => setGenerating(false))
      })
      .finally(() => setLoading(false))
  }, [dossierId])

  useEffect(() => {
    const snap = facture?.etablissement_snapshot
    if (!facture) return
    const missing =
      !snap?.adresse || !snap?.telephone || !snap?.email_contact || !snap?.arrete
      || !snap?.rc || !(snap?.compte_bancaire || snap?.iban) || !snap?.swift
    if (!missing) return
    const tryIds = [facture?.etablissement_id, snap?.id, facture?.formation_snapshot?.etablissement_id].filter(Boolean)
    const applyList = (data) => {
      const list = Array.isArray(data) ? data : []
      const found = tryIds.length
        ? list.find((e) => tryIds.some((id) => Number(e.id) === Number(id)))
        : list.find((e) => e.nom && snap?.nom && e.nom === snap.nom)
      if (found) setEtabLive(found)
    }
    if (tryIds.length) {
      axios.get(`/api/etablissements/${tryIds[0]}`)
        .then(({ data }) => setEtabLive(data))
        .catch(() => axios.get('/api/etablissements').then(({ data }) => applyList(data)).catch(() => {}))
    } else {
      axios.get('/api/etablissements').then(({ data }) => applyList(data)).catch(() => {})
    }
  }, [facture])

  const mergeEtab = (snap = {}, live = null) => ({
    ...snap,
    email_contact: snap.email_contact || live?.email_contact || '',
    telephone: snap.telephone || live?.telephone || '',
    rc: snap.rc || live?.rc || '',
    arrete: snap.arrete || live?.arrete || '',
    compte_bancaire: snap.compte_bancaire || live?.compte_bancaire || live?.iban || '',
    iban: snap.iban || live?.iban || '',
    swift: snap.swift || live?.swift || '',
    ninea: snap.ninea || live?.ninea || '',
    adresse: snap.adresse || live?.adresse || '',
    cachet_url: snap.cachet_url || live?.cachet_url || null,
    logo_url: snap.logo_url || live?.logo_url || null,
    nom: snap.nom || live?.nom || '',
    couleur_primaire: snap.couleur_primaire || live?.couleur_primaire,
    couleur_secondaire: snap.couleur_secondaire || live?.couleur_secondaire,
  })

  const handleDownload = async () => {
    if (!facture) return
    setPdfBusy(true)
    try {
      const et = facture.etudiant_snapshot || {}
      const fo = facture.formation_snapshot || {}
      const eb = mergeEtab(facture.etablissement_snapshot || {}, etabLive)
      const { rows, totalAPayer } = buildDisplayRows(facture, fo)
      const P = hexToRgb(eb.couleur_primaire || '#1e40af')
      const logoB64 = eb.logo_url ? await loadImgBase64(mediaUrl(eb.logo_url)) : null
      const cachetB64 = eb.cachet_url ? await loadImgBase64(mediaUrl(eb.cachet_url)) : null

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const W = doc.internal.pageSize.getWidth()
      const M = 16

      doc.setFillColor(...P)
      doc.rect(0, 0, W, 2.5, 'F')

      let y = 11
      if (logoB64) {
        try { doc.addImage(logoB64, 'AUTO', M, y, 16, 16) } catch { /* ignore */ }
      }
      const leftX = M + (logoB64 ? 20 : 0)
      doc.setTextColor(...P)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(12)
      doc.text(String(eb.nom || 'ÉTABLISSEMENT').toUpperCase(), leftX, y + 5)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7.5)
      doc.setTextColor(70, 80, 90)
      let iy = y + 10
      headerContactLines(eb).forEach((line) => {
        const wrapped = doc.splitTextToSize(String(line), 95)
        wrapped.forEach((w) => {
          doc.text(w, leftX, iy)
          iy += 3.3
        })
      })

      doc.setFillColor(...P)
      doc.roundedRect(128, 11, W - 128 - M, 8, 1, 1, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      doc.text(titreTypeDocument(facture.type_document), 128 + (W - 128 - M) / 2, 16.2, { align: 'center' })
      doc.setTextColor(40, 50, 60)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.text(`N° ${facture.numero}`, 130, 24)
      doc.setFont('helvetica', 'normal')
      doc.text(`Date : ${fmtDate(facture.date_emission)}`, 130, 28.5)

      y = Math.max(iy, 34) + 4
      doc.setDrawColor(220, 225, 230)
      doc.line(M, y, W - M, y)
      y += 7

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(7.5)
      doc.setTextColor(...P)
      doc.text('BÉNÉFICIAIRE', M, y)
      y += 4.5
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.setTextColor(25, 35, 45)
      doc.text(`${et.prenom || ''} ${(et.nom || '').toUpperCase()}`.trim() || '—', M, y)
      y += 4
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(70, 80, 90)
      const proformaPdf = !isFactureDefinitive(facture.type_document)
      const contactLines = [
        et.email,
        et.telephone && `Tél. ${et.telephone}`,
        !proformaPdf && et.nationalite && `Nationalité : ${et.nationalite}`,
        proformaPdf && facture.type_payeur === 'organisation' && facture.payeur?.org_nom
          ? `Destinataire : ${facture.payeur.org_nom}`
          : null,
      ].filter(Boolean)
      contactLines.forEach((line) => {
          doc.text(String(line), M, y)
          y += 3.6
        })

      y += 3
      doc.setDrawColor(...P)
      doc.setFillColor(252, 252, 253)
      doc.roundedRect(M, y, W - 2 * M, 18, 1.5, 1.5, 'FD')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(7.5)
      doc.setTextColor(...P)
      doc.text('FORMATION', M + 3, y + 5)
      doc.setTextColor(20, 30, 40)
      doc.setFontSize(9)
      doc.text(doc.splitTextToSize(fo.titre || '—', W - 2 * M - 8)[0], M + 3, y + 10)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7.5)
      doc.setTextColor(70, 80, 90)
      doc.text(
        [fo.niveau && `Niveau : ${fo.niveau}`, typeLabel(fo.type), (fo.duree_formation || fo.duree) && `Durée : ${fo.duree_formation || fo.duree}`]
          .filter(Boolean)
          .join('  ·  '),
        M + 3,
        y + 15,
      )
      y += 24

      autoTable(doc, {
        startY: y,
        margin: { left: M, right: M },
        head: [['Désignation', 'Montant (FCFA)']],
        body: rows.map((r) => [r.designation, fmtN(r.montant)]),
        foot: [['Montant total à payer', `${fmtN(totalAPayer)} FCFA`]],
        theme: 'grid',
        headStyles: { fillColor: P, textColor: 255, fontStyle: 'bold', fontSize: 9 },
        footStyles: { fillColor: P, textColor: 255, fontStyle: 'bold', fontSize: 10 },
        bodyStyles: { fontSize: 9, textColor: [40, 50, 60] },
        columnStyles: { 1: { halign: 'right', cellWidth: 42 } },
        didParseCell: (data) => {
          const label = String(data.row?.raw?.[0] || '')
          if (data.section === 'body' && /^Mensualité$/i.test(label)) {
            data.cell.styles.textColor = [120, 130, 140]
            data.cell.styles.fontSize = 8
          }
          if (data.section === 'body' && /^Total mensualités/i.test(label)) {
            data.cell.styles.fontStyle = 'bold'
          }
        },
      })

      y = (doc.lastAutoTable?.finalY || y) + 8
      const payLines = [
        eb.rc && `RC : ${String(eb.rc).trim()}`,
        (eb.compte_bancaire || eb.iban) && `Compte / IBAN : ${eb.compte_bancaire || eb.iban}`,
        eb.swift && `SWIFT : ${eb.swift}`,
      ].filter(Boolean)
      if (payLines.length) {
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(8)
        doc.setTextColor(...P)
        doc.text('COORDONNÉES DE PAIEMENT', M, y)
        y += 4
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(50, 60, 70)
        doc.setFontSize(7.5)
        payLines.forEach((line) => {
          doc.text(String(line), M, y)
          y += 3.5
        })
        y += 3
      }

      doc.setFontSize(7.5)
      doc.setTextColor(120, 130, 140)
      doc.text(
        isFactureDefinitive(facture.type_document)
          ? 'Facture définitive — document à conserver.'
          : 'Document non contractuel — Facture proforma émise à titre indicatif.',
        M,
        y,
      )
      y += 9

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      doc.setTextColor(71, 85, 105)
      doc.text('LA SCOLARITÉ', W - M - 15, y, { align: 'center' })
      if (cachetB64) {
        try { doc.addImage(cachetB64, 'AUTO', W - M - 30, y + 2, 28, 28) } catch { /* ignore */ }
      }

      doc.save(`${facture.numero || 'facture'}.pdf`)
      toast.success('PDF téléchargé.')
    } catch (e) {
      console.error(e)
      toast.error('Impossible de générer le PDF.')
    } finally {
      setPdfBusy(false)
    }
  }

  if (loading || generating) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-14 w-14 border-4 border-blue-700 border-t-transparent mx-auto mb-4" />
          <p className="text-gray-600 font-medium">{generating ? 'Génération de votre facture…' : 'Chargement…'}</p>
        </div>
      </div>
    )
  }

  if (!facture) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 text-lg mb-4">Facture introuvable</p>
          <Link to="/dashboard" className="btn-primary">Retour</Link>
        </div>
      </div>
    )
  }

  const et = facture.etudiant_snapshot || {}
  const fo = facture.formation_snapshot || {}
  const eb = mergeEtab(facture.etablissement_snapshot || {}, etabLive)
  const primary = eb.couleur_primaire || '#1e40af'
  const etabNom = eb.nom || 'Établissement'
  const { rows, totalAPayer } = buildDisplayRows(facture, fo)
  const prenom = (et.prenom || '').trim()
  const nom = (et.nom || '').trim()
  const contacts = headerContactLines(eb)

  return (
    <div className="lettre-print-scope min-h-screen bg-slate-200 py-8 px-4">
      <div className="no-print mx-auto mb-5 flex max-w-[210mm] flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => window.history.back()}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          ← Retour
        </button>
        <button
          type="button"
          disabled={pdfBusy}
          onClick={handleDownload}
          className="rounded-lg px-5 py-2.5 text-sm font-bold text-white shadow-md disabled:opacity-50"
          style={{ backgroundColor: primary }}
        >
          {pdfBusy ? 'Préparation…' : 'Télécharger'}
        </button>
      </div>

      <article className="print-page mx-auto max-w-[210mm] overflow-hidden bg-white text-[13px] text-slate-800 shadow-xl">
        <div className="h-1" style={{ background: primary }} />

        <header className="flex items-start justify-between gap-6 px-8 pb-5 pt-6">
          <div className="flex min-w-0 items-start gap-4">
            <div
              className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden border border-slate-100"
              style={{ background: eb.logo_url ? '#fff' : primary }}
            >
              {eb.logo_url ? (
                <img src={mediaUrl(eb.logo_url)} alt="" className="h-full w-full object-contain p-1" />
              ) : (
                <span className="text-2xl font-black text-white">{etabNom.slice(0, 1)}</span>
              )}
            </div>
            <div className="min-w-0">
              <h1 className="text-base font-black uppercase tracking-wide" style={{ color: primary }}>
                {etabNom}
              </h1>
              <div className="mt-1.5 space-y-0.5 text-[11px] leading-snug text-slate-600">
                {contacts.map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </div>
            </div>
          </div>
          <div className="shrink-0 text-right">
            <div
              className="inline-block px-3.5 py-1.5 text-[11px] font-black uppercase tracking-wider text-white"
              style={{ background: primary }}
            >
              {titreTypeDocument(facture.type_document, { uppercase: false })}
            </div>
            <p className="mt-2.5 font-mono text-sm font-bold" style={{ color: primary }}>{facture.numero}</p>
            <p className="mt-1 text-[11px] text-slate-500">{fmtDate(facture.date_emission)}</p>
          </div>
        </header>

        <div className="mx-8 border-t border-slate-200" />

        <section className="grid gap-6 px-8 py-5 sm:grid-cols-2">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color: primary }}>
              {isFactureDefinitive(facture.type_document) ? 'Bénéficiaire' : 'Identité du bénéficiaire'}
            </p>
            <p className="mt-1.5 text-[15px] font-bold text-slate-900">{prenom} {nom.toUpperCase()}</p>
            {et.email && <p className="mt-1 text-sm text-slate-600">{et.email}</p>}
            {et.telephone && <p className="text-sm text-slate-600">Tél. {et.telephone}</p>}
            {isFactureDefinitive(facture.type_document) && et.nationalite && (
              <p className="text-sm text-slate-600">Nationalité : {et.nationalite}</p>
            )}
            {!isFactureDefinitive(facture.type_document) && facture.type_payeur === 'organisation' && facture.payeur?.org_nom && (
              <p className="mt-2 text-sm font-semibold text-slate-800">
                Destinataire : <span style={{ color: primary }}>{facture.payeur.org_nom}</span>
              </p>
            )}
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color: primary }}>Formation</p>
            <p className="mt-1.5 font-bold text-slate-900">{fo.titre || '—'}</p>
            <p className="mt-1.5 text-xs text-slate-600">
              {[
                fo.niveau && `Niveau : ${fo.niveau}`,
                typeLabel(fo.type),
                (fo.duree_formation || fo.duree) && `Durée : ${fo.duree_formation || fo.duree}`,
              ].filter(Boolean).join(' · ')}
            </p>
          </div>
        </section>

        <section className="px-8 pb-4">
          <table className="w-full border-collapse overflow-hidden border border-slate-200">
            <thead>
              <tr style={{ background: primary }}>
                <th className="px-4 py-2.5 text-left text-sm font-semibold text-white">Désignation</th>
                <th className="w-40 px-4 py-2.5 text-right text-sm font-semibold text-white">Montant (FCFA)</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={`${r.designation}-${i}`} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/80'}>
                  <td
                    className={`px-4 py-2.5 text-sm ${
                      r.isTotalMensualites
                        ? 'font-semibold text-slate-900'
                        : r.isUnitMensualite
                          ? 'text-slate-500'
                          : 'font-medium text-slate-800'
                    }`}
                  >
                    {r.designation}
                  </td>
                  <td
                    className={`px-4 py-2.5 text-right text-sm tabular-nums ${
                      r.isTotalMensualites
                        ? 'font-bold text-slate-900'
                        : r.isUnitMensualite
                          ? 'text-slate-500'
                          : 'font-semibold text-slate-900'
                    }`}
                  >
                    {fmt(r.montant)}
                  </td>
                </tr>
              ))}
              <tr style={{ background: primary }}>
                <td className="px-4 py-3 text-sm font-bold text-white">Montant total à payer</td>
                <td className="px-4 py-3 text-right text-base font-black tabular-nums text-white">
                  {fmt(totalAPayer)} <span className="text-xs font-bold opacity-90">FCFA</span>
                </td>
              </tr>
            </tbody>
          </table>
        </section>

        <CoordonneesPaiement eb={eb} primary={primary} />

        <section className="flex items-end justify-between gap-6 px-8 pb-7 pt-1">
          <div className="max-w-xs text-[10px] leading-relaxed text-slate-500">
            <p>
              {isFactureDefinitive(facture.type_document)
                ? 'Facture définitive — document à conserver.'
                : 'Document non contractuel — Facture proforma émise à titre indicatif.'}
            </p>
            {facture.date_echeance && (
              <p className="mt-1">Valable jusqu’au {fmtDate(facture.date_echeance)}.</p>
            )}
          </div>
          <CachetScolarite cachetUrl={eb.cachet_url} />
        </section>
      </article>
    </div>
  )
}
