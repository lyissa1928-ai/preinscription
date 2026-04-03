import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import axios from 'axios'
import { jsPDF } from 'jspdf'
import { mediaUrl } from '../utils/mediaUrl'
import autoTable from 'jspdf-autotable'

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt     = (n) => new Intl.NumberFormat('fr-FR').format(Math.round(n || 0))
const fmtDate = (d) => new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })

// Niveau court : "Bac+1 / Licence 1" → "Licence 1"
const niveauCourt = (n) => n?.includes(' / ') ? n.split(' / ').pop().trim() : (n || '')

// Type de formation lisible
const typeLabel = (t) => t === 'en_ligne' ? 'En ligne (FAD)' : 'Présentiel'

/**
 * Détail lisible pour le tableau (évite les libellés bruts des lignes API).
 */
function buildFactureBreakdown(facture, data) {
  const lignes = facture?.lignes || []
  const fi = Number(lignes.find((l) => /inscription/i.test(String(l.designation || '')))?.montant) || 0
  const ligneMen = lignes.find((l) => /mensualit/i.test(String(l.designation || '')))
  const totalMensualites = Number(ligneMen?.montant) || 0
  let mensualite = Number(data?.formation_mensualite) || 0
  let dureeMois = data?.formation_duree_mois != null && data.formation_duree_mois !== ''
    ? Number(data.formation_duree_mois)
    : null
  if (ligneMen?.designation) {
    const m = String(ligneMen.designation).match(/(\d+)\s*mois/i)
    if (m != null && (dureeMois == null || Number.isNaN(dureeMois) || dureeMois <= 0)) {
      dureeMois = parseInt(m[1], 10)
    }
  }
  if (mensualite <= 0 && dureeMois > 0 && totalMensualites > 0) {
    mensualite = Math.round(totalMensualites / dureeMois)
  }
  if (dureeMois == null || Number.isNaN(dureeMois) || dureeMois < 0) {
    if (mensualite > 0 && totalMensualites > 0) {
      dureeMois = Math.round(totalMensualites / mensualite)
    } else {
      dureeMois = 0
    }
  }
  const fraisAnnuels = Number(facture?.montant_ht) || fi + totalMensualites

  const rawSupp = facture?.lignes_frais_supplementaires || facture?.lignes_supplementaires || []
  const supplementaires = (Array.isArray(rawSupp) ? rawSupp : [])
    .map((l) => ({
      designation: String(l.designation || '').trim(),
      montant: Number(l.montant) || 0,
    }))
    .filter((l) => l.designation && l.montant > 0)

  return {
    fraisInscription: fi,
    mensualite,
    dureeMois,
    totalMensualites,
    fraisAnnuels,
    supplementaires,
  }
}

// Hex → RGB array pour jsPDF
const hexToRgb = (hex) => {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || '#1e40af')
  return r ? [parseInt(r[1], 16), parseInt(r[2], 16), parseInt(r[3], 16)] : [30, 64, 175]
}

// Nombre formaté pour PDF (espace ASCII, pas de \u00A0)
const fmtN = (n) => Math.round(n || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')

// Charger image URL → base64
async function loadImgBase64(url) {
  try {
    const r = await fetch(url)
    if (!r.ok) return null
    const blob = await r.blob()
    return new Promise(resolve => {
      const rd = new FileReader()
      rd.onloadend = () => resolve(rd.result)
      rd.onerror   = () => resolve(null)
      rd.readAsDataURL(blob)
    })
  } catch { return null }
}

// ─── Génération PDF ────────────────────────────────────────────────────────────
async function generatePDF(data) {
  const {
    facture, prenom, nom, email, telephone, niveau,
    type_formation, formation_titre, formation_ville, formation_niveau_requis, formation_description,
    formation_mensualite, formation_duree_mois,
    reference, created_at, type_payeur, payeur,
    etablissement_snapshot: es
  } = data

  const etab   = es || {}
  const P      = hexToRgb(etab.couleur_primaire  || '#1e40af')   // primary
  const S      = hexToRgb(etab.couleur_secondaire || '#3b82f6')   // secondary
  const etabNom    = etab.nom           || 'Établissement'
  const etabAdr    = etab.adresse       || ''
  const etabTel    = etab.telephone     || ''
  const etabEmail  = etab.email_contact || ''
  const etabNinea  = etab.ninea         || ''
  const etabCompte = etab.compte_bancaire || ''

  // Chargement des images
  const [logoB64, cachetB64] = await Promise.all([
    etab.logo_url   ? loadImgBase64(mediaUrl(etab.logo_url))   : Promise.resolve(null),
    etab.cachet_url ? loadImgBase64(mediaUrl(etab.cachet_url)) : Promise.resolve(null)
  ])

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const W = doc.internal.pageSize.getWidth()   // 210
  const H = doc.internal.pageSize.getHeight()  // 297
  const M = 13  // marges gauche/droite

  // ── Bande de couleur haute ────────────────────────────────────────────────
  doc.setFillColor(...P); doc.rect(0, 0, W, 4.5, 'F')
  doc.setFillColor(...S); doc.rect(0, 3.5, W, 1.5, 'F')

  // ── LOGO (au-dessus des infos, dans la même colonne) ─────────────────────
  let y = 7
  const logoX = M, logoW = 18, logoH = 18
  if (logoB64) {
    try   { doc.addImage(logoB64, 'AUTO', logoX, y, logoW, logoH) }
    catch { _drawLetterBox(doc, P, logoX, y, logoW, logoH, etabNom[0]) }
  } else {
    _drawLetterBox(doc, P, logoX, y, logoW, logoH, etabNom[0])
  }

  // ── NOM ÉTABLISSEMENT + INFOS (sous le logo, même colonne) ───────────────
  const txX = M
  let iy = y + logoH + 3
  doc.setTextColor(...P); doc.setFontSize(11); doc.setFont('helvetica', 'bold')
  doc.text(etabNom.toUpperCase(), txX, iy); iy += 4.5

  doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(80, 95, 115)
  if (etabAdr)   { doc.text(etabAdr,              txX, iy); iy += 4 }
  if (etabTel)   { doc.text(etabTel,              txX, iy); iy += 4 }
  if (etabEmail) { doc.text(etabEmail,            txX, iy); iy += 4 }
  if (etabNinea) { doc.setFont('helvetica', 'bold'); doc.text(`NINEA : ${etabNinea}`, txX, iy); iy += 4; doc.setFont('helvetica', 'normal') }
  const etabRC     = etab.rc     || ''
  const etabArrete = etab.arrete || ''
  if (etabRC)     { doc.setFont('helvetica', 'bold'); doc.text(`RC : ${etabRC}`, txX, iy); iy += 4; doc.setFont('helvetica', 'normal') }
  if (etabArrete) { doc.setFont('helvetica', 'bold'); doc.text(`Arrêté : ${etabArrete}`, txX, iy); doc.setFont('helvetica', 'normal') }

  // ── BLOC FACTURE PROFORMA (droite) ────────────────────────────────────────
  const bx = 128, bw = W - bx - M
  const headerTopY = 7
  doc.setFillColor(...P); doc.roundedRect(bx, headerTopY, bw, 9, 2, 2, 'F')
  doc.setTextColor(255, 255, 255); doc.setFontSize(10); doc.setFont('helvetica', 'bold')
  doc.text('FACTURE PROFORMA', bx + bw / 2, headerTopY + 6, { align: 'center' })

  doc.setFontSize(7.5); doc.setTextColor(50, 60, 80)
  const meta = [
    [`N° Facture :`,   facture.numero],
    [`Date :`,         fmtDate(created_at)],
    [`Référence :`,    reference],
  ]
  meta.forEach(([lbl, val], i) => {
    doc.setFont('helvetica', 'bold');   doc.text(lbl,  bx + 2,  headerTopY + 13 + i * 4.5)
    doc.setFont('helvetica', 'normal'); doc.text(val,  bx + 28, headerTopY + 13 + i * 4.5)
  })

  y = 55
  doc.setDrawColor(220, 228, 240); doc.setLineWidth(0.4); doc.line(M, y, W - M, y)
  y += 5

  // ── ÉTUDIANT + PAYEUR ─────────────────────────────────────────────────────
  const hasPayeur = type_payeur && type_payeur !== 'etudiant' && payeur
  const blkW = hasPayeur ? (W - 2 * M - 4) / 2 : W - 2 * M

  // Ligne destinataire dans le bloc étudiant
  let destinataireLabel = null
  if (type_payeur === 'tuteur') {
    const nomParent = [`${payeur?.prenom || ''} ${(payeur?.nom || '').toUpperCase()}`.trim()].filter(Boolean).join(' ')
    destinataireLabel = `Destinataire : Parent${nomParent ? ` (${nomParent})` : ''}`
  } else if (type_payeur === 'organisation' && payeur?.org_nom) {
    destinataireLabel = `Destinataire : ${payeur.org_nom}`
  }

  // Bloc étudiant
  _drawInfoBox(doc, M, y, blkW, hasPayeur ? 30 : 26, 'ÉTUDIANT CONCERNÉ', [
    `${prenom} ${nom.toUpperCase()}`,
    `${email}`,
    `Tél : ${telephone}`,
    niveau ? `Niveau : ${niveauCourt(niveau)}` : null,
    destinataireLabel,
  ].filter(Boolean), P)

  // Bloc payeur
  if (hasPayeur) {
    const px = M + blkW + 4
    let payeurLines = []
    let payeurTitle = ''
    if (type_payeur === 'tuteur') {
      payeurTitle = 'TUTEUR / PAYEUR'
      payeurLines = [
        `${payeur.prenom || ''} ${(payeur.nom || '').toUpperCase()}`.trim(),
        payeur.relation ? `Lien : ${payeur.relation}` : null,
        payeur.telephone ? `Tél : ${payeur.telephone}` : null,
      ].filter(Boolean)
    } else if (type_payeur === 'organisation') {
      payeurTitle = 'ORGANISME PAYEUR'
      payeurLines = [
        payeur.org_nom || '',
        payeur.ninea ? `NINEA : ${payeur.ninea}` : null,
        payeur.contact ? `Contact : ${payeur.contact}` : null,
      ].filter(Boolean)
    }
    _drawInfoBox(doc, px, y, blkW, 30, payeurTitle, payeurLines, S)
  }

  y += hasPayeur ? 34 : 30

  // ── FORMATION ─────────────────────────────────────────────────────────────
  // Pré-calculer les splits pour hauteur dynamique
  doc.setFontSize(9.5)
  const formationDisplay = `${formation_titre}  (${typeLabel(type_formation)})`
  const splitF = doc.splitTextToSize(formationDisplay, W - 2 * M - 55)

  doc.setFontSize(7)
  let splitDesc = []
  if (formation_description) {
    splitDesc = doc.splitTextToSize(formation_description, W - 2 * M - 8)
  }

  const hasDetails = !!(formation_ville || formation_niveau_requis)
  const titleExtraH = (splitF.length - 1) * 5        // lignes supplémentaires du titre
  const descBlockH  = splitDesc.length > 0 ? 4.5 + (splitDesc.length - 1) * 3.5 : 0
  const fBoxH = Math.max(16, 11 + titleExtraH + descBlockH + (hasDetails ? 7 : 5))

  doc.setFillColor(235, 242, 255)
  doc.roundedRect(M, y, W - 2 * M, fBoxH, 2, 2, 'F')
  doc.setDrawColor(...P.map(v => Math.min(255, v + 80)))
  doc.roundedRect(M, y, W - 2 * M, fBoxH, 2, 2, 'S')

  doc.setFontSize(6.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(120, 140, 170)
  doc.text('FORMATION CONCERNÉE', M + 3, y + 5)

  doc.setFontSize(9.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(...P)
  doc.text(splitF, M + 3, y + 11)

  if (splitDesc.length > 0) {
    const descY = y + 11 + titleExtraH + 4.5
    doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(80, 95, 115)
    doc.text(splitDesc, M + 3, descY)
  }

  doc.setFontSize(7.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(80, 95, 115)
  const detailsStr = [formation_ville, formation_niveau_requis ? `Niveau requis : ${formation_niveau_requis}` : null].filter(Boolean).join('   ·   ')
  if (detailsStr) doc.text(detailsStr, W - M - 3, y + fBoxH - 3, { align: 'right' })

  y += fBoxH + 4

  // ── DÉTAIL FACTURATION ────────────────────────────────────────────────────
  doc.setFontSize(7.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(110, 125, 145)
  doc.text('DÉTAIL DE LA FACTURATION', M, y); y += 3

  const br = buildFactureBreakdown(facture, data)
  const labelTotalMen = br.dureeMois > 0 && br.mensualite > 0
    ? `Total mensualités (${br.dureeMois} × ${fmtN(br.mensualite)} FCFA)`
    : 'Total mensualités'

  const tableRows = [
    ['Frais d\'inscription', `${fmtN(br.fraisInscription)} FCFA`],
    [
      'Mensualité (unitaire)',
      br.mensualite > 0 ? `${fmtN(br.mensualite)} FCFA/mois` : '—',
    ],
    [labelTotalMen, `${fmtN(br.totalMensualites)} FCFA`],
    [
      { content: 'Frais annuels (forfait scolarité)', styles: { fontStyle: 'bold', fillColor: [239, 246, 255] } },
      { content: `${fmtN(br.fraisAnnuels)} FCFA`, styles: { fontStyle: 'bold', halign: 'right', fillColor: [239, 246, 255] } },
    ],
  ]
  const footRows  = facture.tva === 0
    ? [['TVA exonérée (0%)', '— exonéré']]
    : [[`TVA (${facture.tva}%)`, `${fmtN(facture.montant_ttc - facture.montant_ht)} FCFA`]]

  autoTable(doc, {
    startY: y,
    head:   [['Désignation', 'Montant']],
    body:   tableRows,
    foot:   footRows,
    theme:  'grid',
    headStyles: { fillColor: P, textColor: [255,255,255], fontStyle: 'bold', fontSize: 9, cellPadding: 3.5 },
    columnStyles: {
      0: { cellWidth: 'auto', overflow: 'linebreak', fontSize: 9, cellPadding: 3 },
      1: { halign: 'right', cellWidth: 52, fontStyle: 'bold', fontSize: 9, cellPadding: 3 }
    },
    footStyles: { fillColor: [245, 247, 250], textColor: [110, 125, 145], fontSize: 8, halign: 'right' },
    styles:     { overflow: 'linebreak' },
    margin:     { left: M, right: M }
  })

  y = doc.lastAutoTable.finalY

  // ── TOTAL TTC (bloc distinct) ─────────────────────────────────────────────
  const totH = 13
  doc.setFillColor(...P); doc.rect(M, y, W - 2 * M, totH, 'F')
  // Accent secondaire
  doc.setFillColor(...S); doc.rect(M, y, 3, totH, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(8.5); doc.setFont('helvetica', 'bold')
  doc.text('TOTAL TTC (forfait annuel)', M + 6, y + 8.5)
  doc.setFontSize(14)
  doc.text(`${fmtN(facture.montant_ttc)} FCFA`, W - M - 3, y + 9, { align: 'right' })
  y += totH + 6

  if (br.supplementaires.length > 0) {
    doc.setFontSize(7.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(146, 64, 14)
    doc.text('Frais complémentaires (hors forfait annuel — non inclus dans le total ci-dessus)', M, y)
    y += 4.5
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(55, 50, 45)
    br.supplementaires.forEach((s) => {
      const wLabel = W - 2 * M - 45
      const lines = doc.splitTextToSize(s.designation, wLabel)
      doc.text(lines, M + 2, y)
      doc.setFont('helvetica', 'bold')
      doc.text(`${fmtN(s.montant)} FCFA`, W - M - 3, y + 3, { align: 'right' })
      doc.setFont('helvetica', 'normal')
      y += Math.max(lines.length * 4.2 + 2, 7)
    })
    y += 3
  }

  // ── MODALITÉS DE PAIEMENT ─────────────────────────────────────────────────
  if (y < 252) {
    doc.setFontSize(7.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(110, 125, 145)
    doc.text('MODALITÉS DE PAIEMENT', M, y); y += 3

    const modW = (W - 2 * M - 4) / 2
    const mods = [
      ['Virement bancaire', etabCompte || 'Coordonnées sur demande'],
      ['Mobile Money',       'Wave · Orange Money · Free Money'],
    ]
    mods.forEach(([title, detail], i) => {
      const mx = M + i * (modW + 4)
      doc.setFillColor(248, 250, 252)
      doc.roundedRect(mx, y, modW, 13, 1.5, 1.5, 'F')
      doc.setDrawColor(220, 228, 240)
      doc.roundedRect(mx, y, modW, 13, 1.5, 1.5, 'S')
      doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 35, 45)
      doc.text(title, mx + modW / 2, y + 5.5, { align: 'center' })
      doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(100, 116, 139)
      const sp = doc.splitTextToSize(detail, modW - 6)
      doc.text(sp, mx + modW / 2, y + 10, { align: 'center' })
    })
    y += 17
  }

  // ── LA DIRECTION (cachet) ─────────────────────────────────────────────────
  if (cachetB64) {
    const cW = 30, cH = 30
    const cx = W - M - cW
    try {
      doc.addImage(cachetB64, 'AUTO', cx, y, cW, cH)
      doc.setFontSize(7); doc.setFont('helvetica', 'bold'); doc.setTextColor(60, 70, 90)
      doc.text('La Direction', cx + cW / 2, y + cH + 4, { align: 'center' })
    } catch { /* pas de cachet */ }
  }

  // ── PIED DE PAGE ─────────────────────────────────────────────────────────
  doc.setFillColor(18, 22, 35); doc.rect(0, H - 9, W, 9, 'F')
  doc.setFillColor(...P); doc.rect(0, H - 10.5, W, 1.5, 'F')
  doc.setTextColor(200, 210, 225); doc.setFontSize(7); doc.setFont('helvetica', 'normal')
  const foot = [etabNom, etabAdr, etabEmail, etabTel].filter(Boolean).join('  ·  ')
  doc.text(foot, W / 2, H - 3.5, { align: 'center' })

  doc.save(`Facture-Proforma-${reference}.pdf`)
}

// helper : boîte colorée avec initiale
function _drawLetterBox(doc, color, x, y, w, h, letter) {
  doc.setFillColor(...color)
  doc.roundedRect(x, y, w, h, 2, 2, 'F')
  doc.setTextColor(255, 255, 255); doc.setFontSize(11); doc.setFont('helvetica', 'bold')
  doc.text((letter || 'E').toUpperCase(), x + w / 2, y + h / 2 + 2, { align: 'center' })
}

// helper : bloc info
function _drawInfoBox(doc, x, y, w, h, title, lines, color) {
  doc.setFillColor(249, 250, 252)
  doc.roundedRect(x, y, w, h, 2, 2, 'F')
  doc.setDrawColor(218, 226, 240)
  doc.roundedRect(x, y, w, h, 2, 2, 'S')
  // Bande couleur gauche
  doc.setFillColor(...color); doc.rect(x, y, 2.5, h, 'F')
  doc.setFontSize(6); doc.setFont('helvetica', 'bold'); doc.setTextColor(160, 175, 200)
  doc.text(title, x + 5, y + 4.5)
  doc.setFontSize(8.5)
  let iy = y + 9.5
  lines.forEach((l, i) => {
    if (i === 0) { doc.setFont('helvetica', 'bold'); doc.setTextColor(15, 22, 40) }
    else         { doc.setFont('helvetica', 'normal'); doc.setTextColor(75, 90, 115) }
    const sp = doc.splitTextToSize(l, w - 8)
    doc.text(sp, x + 5, iy)
    iy += sp.length * 4
  })
}

// ─── Page principale ──────────────────────────────────────────────────────────
export default function PublicFactureView() {
  const { reference } = useParams()
  const [data,         setData]         = useState(null)
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState(null)
  const [pdfLoading,   setPdfLoading]   = useState(false)
  const [autoGenerated,setAutoGenerated]= useState(false)

  useEffect(() => {
    axios.get(`/api/public/facture-proforma/${reference}`)
      .then(({ data: d }) => {
        setData(d)
        setTimeout(async () => {
          await generatePDF(d)
          setAutoGenerated(true)
        }, 600)
      })
      .catch(err => setError(err.response?.data?.message || 'Facture introuvable.'))
      .finally(() => setLoading(false))
  }, [reference])

  const handleDownloadPDF = async () => {
    if (!data) return
    setPdfLoading(true)
    try { await generatePDF(data) } finally { setPdfLoading(false) }
  }

  if (loading) return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-14 w-14 border-4 border-blue-700 border-t-transparent mx-auto mb-4" />
        <p className="text-gray-600 font-medium">Génération de votre facture…</p>
      </div>
    </div>
  )

  if (error) return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-xl p-10 max-w-md w-full text-center">
        <div className="text-5xl mb-4">⚠️</div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Facture introuvable</h2>
        <p className="text-gray-500 mb-6">{error}</p>
        <Link to="/" className="inline-flex items-center gap-2 bg-blue-700 text-white font-semibold px-6 py-2.5 rounded-xl hover:bg-blue-800 transition-colors">
          ← Retour à l'accueil
        </Link>
      </div>
    </div>
  )

  const {
    facture, prenom, nom, email, telephone, niveau,
    type_formation, formation_titre, formation_ville, formation_niveau_requis, formation_description,
    formation_mensualite, formation_duree_mois,
    type_payeur, payeur, etablissement_snapshot: es
  } = data

  const br = buildFactureBreakdown(facture, { ...data, formation_mensualite, formation_duree_mois })

  const etab      = es || {}
  const primary   = etab.couleur_primaire   || '#1e40af'
  const secondary = etab.couleur_secondaire || '#3b82f6'
  const etabNom   = etab.nom || 'UniPréinscription'

  const hasPayeur = type_payeur && type_payeur !== 'etudiant' && payeur

  return (
    <div className="min-h-screen bg-slate-100 py-8 px-4">

      {/* ── Barre d'actions ────────────────────────────────────────────────── */}
      <div className="max-w-3xl mx-auto mb-5 flex items-center justify-between gap-3 flex-wrap">
        <Link to="/" className="flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium text-sm bg-white px-4 py-2 rounded-lg border border-gray-200 shadow-sm hover:shadow transition-all">
          ← Retour à l'accueil
        </Link>
        <div className="flex items-center gap-3">
          {autoGenerated && (
            <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1.5 rounded-full">
              ✅ PDF généré automatiquement
            </span>
          )}
          <button onClick={handleDownloadPDF} disabled={pdfLoading}
            className="flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white font-semibold px-5 py-2.5 rounded-lg transition-colors shadow-md text-sm disabled:opacity-60">
            {pdfLoading
              ? <><div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" /> Génération…</>
              : <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Télécharger le PDF
                </>
            }
          </button>
        </div>
      </div>

      {/* ── Document ───────────────────────────────────────────────────────── */}
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-2xl overflow-hidden">

        {/* Bande couleur haute */}
        <div style={{ height: 6, background: `linear-gradient(90deg, ${primary}, ${secondary})` }} />

        {/* ── EN-TÊTE ─────────────────────────────────────────────────────── */}
        <div className="px-8 pt-7 pb-5">
          <div className="flex items-start justify-between gap-6">

            {/* Logo + infos établissement */}
            <div className="flex flex-col gap-2">
              <div className="w-16 h-16 rounded-xl overflow-hidden flex items-center justify-center border border-gray-100"
                style={{ background: etab.logo_url ? '#f8fafc' : primary }}>
                {etab.logo_url
                  ? <img src={mediaUrl(etab.logo_url)} alt="logo" className="w-full h-full object-contain" />
                  : <span className="text-2xl font-black text-white">{etabNom[0]}</span>
                }
              </div>
              <div>
                <div className="text-xl font-black" style={{ color: primary }}>{etabNom.toUpperCase()}</div>
                <div className="text-xs text-gray-500 mt-1 space-y-0.5">
                  {etab.adresse      && <p>{etab.adresse}</p>}
                  {etab.telephone    && <p>{etab.telephone}</p>}
                  {etab.email_contact && <p>{etab.email_contact}</p>}
                  {etab.ninea        && <p className="font-semibold text-gray-600">NINEA : {etab.ninea}</p>}
                  {etab.rc           && <p className="font-semibold text-gray-600">RC : {etab.rc}</p>}
                  {etab.arrete       && <p className="font-semibold text-gray-600">Arrêté : {etab.arrete}</p>}
                  {etab.site_web     && <p>{etab.site_web}</p>}
                </div>
              </div>
            </div>

            {/* Métadonnées facture */}
            <div className="text-right flex-shrink-0">
              <div className="inline-block text-white font-black text-sm px-5 py-2.5 rounded-xl mb-3"
                style={{ background: primary }}>
                FACTURE PROFORMA
              </div>
              <div className="text-xs text-gray-500 space-y-1">
                <p><span className="font-semibold text-gray-700">N° :</span>{' '}
                  <span className="font-mono font-bold" style={{ color: primary }}>{facture.numero}</span></p>
                <p><span className="font-semibold text-gray-700">Date :</span> {fmtDate(data.created_at)}</p>
                <p><span className="font-semibold text-gray-700">Réf :</span> <span className="font-mono">{data.reference}</span></p>
              </div>
            </div>
          </div>
        </div>

        <div className="mx-8 border-t border-gray-100 mb-5" />

        {/* ── ÉTUDIANT + PAYEUR ───────────────────────────────────────────── */}
        <div className={`px-8 mb-5 grid gap-4 ${hasPayeur ? 'sm:grid-cols-2' : 'grid-cols-1'}`}>

          {/* Étudiant */}
          <div className="rounded-xl border border-gray-200 p-4 bg-gray-50"
            style={{ borderLeftWidth: 3, borderLeftColor: primary }}>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Étudiant concerné</p>
            <p className="font-bold text-gray-900 text-base">{prenom} {nom.toUpperCase()}</p>
            <p className="text-sm text-gray-600 mt-1">{email}</p>
            <p className="text-sm text-gray-600">Tél : {telephone}</p>
            {niveau && (
              <p className="text-sm text-gray-600 mt-1">
                Niveau : <span className="font-semibold">{niveauCourt(niveau)}</span>
              </p>
            )}
            {/* Destinataire de la facture */}
            {type_payeur === 'tuteur' && (
              <p className="text-sm text-gray-700 mt-2 font-semibold border-t border-gray-200 pt-2">
                Destinataire : <span className="font-bold" style={{ color: primary }}>Parent</span>
                {payeur?.prenom || payeur?.nom
                  ? <span className="font-normal text-gray-500"> ({[payeur.prenom, payeur.nom?.toUpperCase()].filter(Boolean).join(' ')})</span>
                  : null}
              </p>
            )}
            {type_payeur === 'organisation' && payeur?.org_nom && (
              <p className="text-sm text-gray-700 mt-2 font-semibold border-t border-gray-200 pt-2">
                Destinataire : <span className="font-bold" style={{ color: primary }}>{payeur.org_nom}</span>
              </p>
            )}
          </div>

          {/* Détail payeur (si différent de l'étudiant) */}
          {hasPayeur && (
            <div className="rounded-xl border p-4"
              style={{
                borderLeftWidth: 3, borderLeftColor: secondary,
                background: type_payeur === 'organisation' ? '#f5f3ff' : '#f0fdf4',
                borderColor:  type_payeur === 'organisation' ? '#ddd6fe' : '#bbf7d0',
              }}>
              <p className="text-xs font-bold uppercase tracking-wider mb-2"
                style={{ color: secondary }}>
                {type_payeur === 'tuteur' ? 'Tuteur / Payeur' : 'Organisme Payeur'}
              </p>
              {type_payeur === 'tuteur' && (
                <>
                  <p className="font-bold text-gray-900 text-base">
                    {payeur.prenom} {payeur.nom?.toUpperCase()}
                  </p>
                  {payeur.relation  && <p className="text-sm text-gray-600">Lien : {payeur.relation}</p>}
                  {payeur.telephone && <p className="text-sm text-gray-600">Tél : {payeur.telephone}</p>}
                </>
              )}
              {type_payeur === 'organisation' && (
                <>
                  <p className="font-bold text-gray-900 text-base">{payeur.org_nom}</p>
                  {payeur.ninea   && <p className="text-sm text-gray-600">NINEA : {payeur.ninea}</p>}
                  {payeur.contact && <p className="text-sm text-gray-600">Contact : {payeur.contact}</p>}
                </>
              )}
            </div>
          )}
        </div>

        {/* ── FORMATION ───────────────────────────────────────────────────── */}
        <div className="px-8 mb-5">
          <div className="rounded-xl p-4 border" style={{ background: `${primary}12`, borderColor: `${primary}40` }}>
            <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: `${primary}99` }}>
              Formation concernée
            </p>
            <p className="font-bold text-base" style={{ color: primary }}>
              {formation_titre}
              <span className="ml-2 text-sm font-semibold text-gray-600">({typeLabel(type_formation)})</span>
            </p>
            {formation_description && (
              <p className="text-xs text-gray-600 mt-1 leading-snug break-words">{formation_description}</p>
            )}
            <div className="flex flex-wrap gap-3 mt-1.5 text-xs text-gray-500">
              {formation_ville        && <span>📍 {formation_ville}</span>}
              {formation_niveau_requis && <span>🎓 Niveau requis : {formation_niveau_requis}</span>}
            </div>
          </div>
        </div>

        {/* ── TABLEAU DES FRAIS (forfait annuel structuré) ───────────────── */}
        <div className="px-8 mb-0">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Détail de la facturation</p>
          <table className="w-full border-collapse overflow-hidden rounded-xl border border-gray-200">
            <thead>
              <tr style={{ background: primary }}>
                <th className="text-left px-4 py-3 text-sm font-semibold text-white">Désignation</th>
                <th className="text-right px-4 py-3 text-sm font-semibold text-white w-44">Montant (FCFA)</th>
              </tr>
            </thead>
            <tbody>
              <tr className="bg-white">
                <td className="px-4 py-3 text-sm text-gray-800">
                  <span className="font-semibold">Frais d&apos;inscription</span>
                  <span className="block text-xs text-gray-500 mt-0.5">{formation_titre}</span>
                </td>
                <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900 tabular-nums">
                  {fmt(br.fraisInscription)}
                </td>
              </tr>
              <tr className="bg-gray-50 border-t border-gray-100">
                <td className="px-4 py-3 text-sm text-gray-800">
                  <span className="font-semibold">Mensualité</span>
                  {br.dureeMois > 0 && (
                    <span className="block text-xs text-gray-500 mt-0.5">
                      {br.dureeMois} mois — échelonnement possible
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900 tabular-nums">
                  {br.mensualite > 0 ? (
                    <>
                      {fmt(br.mensualite)} <span className="text-xs font-normal text-gray-600">/ mois</span>
                    </>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
              </tr>
              <tr className="bg-white border-t border-gray-100">
                <td className="px-4 py-3 text-sm text-gray-800">
                  <span className="font-semibold">Total mensualités</span>
                  {br.dureeMois > 0 && br.mensualite > 0 && (
                    <span className="block text-xs text-gray-500 mt-0.5">
                      {br.dureeMois} mois × {fmt(br.mensualite)} FCFA
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900 tabular-nums">
                  {fmt(br.totalMensualites)}
                </td>
              </tr>
              <tr className="border-t border-gray-200" style={{ background: `${primary}0d` }}>
                <td className="px-4 py-3 text-sm font-bold" style={{ color: primary }}>
                  Frais annuels (forfait HT)
                </td>
                <td className="px-4 py-3 text-sm text-right font-bold tabular-nums" style={{ color: primary }}>
                  {fmt(br.fraisAnnuels)}
                </td>
              </tr>
              <tr className="bg-gray-50/80 border-t border-gray-200">
                <td className="px-4 py-2 text-sm text-gray-400 italic">
                  {facture.tva === 0 ? 'TVA exonérée (0%)' : `TVA (${facture.tva}%)`}
                </td>
                <td className="px-4 py-2 text-sm text-right text-gray-400 tabular-nums">
                  {facture.tva === 0 ? '— exonéré' : `${fmt(facture.montant_ttc - facture.montant_ht)} FCFA`}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* ── TOTAL TTC ────────────────────────────────────────────────────── */}
        <div className="px-8 mb-6">
          <div className="flex items-center justify-between px-5 py-4 rounded-b-xl text-white -mt-px border border-t-0 border-gray-200/30"
            style={{ background: `linear-gradient(135deg, ${primary}, ${secondary})` }}>
            <span className="font-bold text-base tracking-wide">TOTAL TTC (forfait annuel)</span>
            <span className="font-black text-2xl tabular-nums">{fmt(facture.montant_ttc)} <span className="text-sm font-bold opacity-80">FCFA</span></span>
          </div>
        </div>

        {/* ── Frais complémentaires (hors forfait, si montants connus) ───── */}
        {br.supplementaires.length > 0 && (
          <div className="px-8 mb-6">
            <p className="text-xs font-bold text-amber-800 uppercase tracking-wider mb-2">
              Frais complémentaires
            </p>
            <p className="text-[11px] text-amber-900/80 mb-3">
              Non inclus dans le total TTC ci-dessus — à régler selon modalités indiquées.
            </p>
            <div className="rounded-xl border border-amber-200 bg-amber-50/80 divide-y divide-amber-100">
              {br.supplementaires.map((s, idx) => (
                <div key={idx} className="flex items-start justify-between gap-4 px-4 py-3">
                  <span className="text-sm text-amber-950">{s.designation}</span>
                  <span className="text-sm font-bold text-amber-950 tabular-nums shrink-0">
                    {fmt(s.montant)} FCFA
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── MODALITÉS DE PAIEMENT ────────────────────────────────────────── */}
        <div className="px-8 mb-6">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Modalités de paiement</p>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-center">
              <div className="text-xl mb-1">🏦</div>
              <p className="font-semibold text-gray-800 text-xs mb-0.5">Virement bancaire</p>
              <p className="text-xs text-gray-500">{etab.compte_bancaire || 'Coordonnées disponibles sur demande'}</p>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-center">
              <div className="text-xl mb-1">📱</div>
              <p className="font-semibold text-gray-800 text-xs mb-0.5">Mobile Money</p>
              <p className="text-xs text-gray-500">Wave · Orange Money · Free Money</p>
            </div>
          </div>
        </div>

        {/* ── CACHET / LA DIRECTION ───────────────────────────────────────── */}
        {etab.cachet_url && (
          <div className="px-8 mb-6 flex justify-end">
            <div className="text-center">
              <img src={mediaUrl(etab.cachet_url)} alt="La Direction" className="w-28 h-28 object-contain opacity-90" />
              <p className="text-xs text-gray-500 mt-1 font-semibold">La Direction</p>
            </div>
          </div>
        )}

        {/* ── CTA ──────────────────────────────────────────────────────────── */}
        <div className="px-8 mb-8">
          <div className="rounded-2xl p-6 text-center text-white"
            style={{ background: `linear-gradient(135deg, ${primary}, ${secondary})` }}>
            <h3 className="font-bold text-lg mb-2">Prêt à vous inscrire officiellement ?</h3>
            <p className="text-white/80 text-sm mb-4">Créez votre compte et soumettez votre dossier pour confirmer votre préinscription.</p>
            <Link to="/inscription"
              className="inline-flex items-center gap-2 bg-yellow-400 hover:bg-yellow-300 text-blue-900 font-bold px-6 py-2.5 rounded-xl transition-all text-sm">
              Créer mon compte gratuitement →
            </Link>
          </div>
        </div>

        {/* ── PIED DE PAGE ────────────────────────────────────────────────── */}
        <div style={{ height: 6, background: `linear-gradient(90deg, ${primary}, ${secondary})` }} />
        <div className="bg-slate-900 text-slate-400 text-center py-3 px-8">
          <p className="text-xs">
            {[etabNom, etab.adresse, etab.email_contact, etab.telephone].filter(Boolean).join('  ·  ')}
          </p>
        </div>
      </div>
    </div>
  )
}
