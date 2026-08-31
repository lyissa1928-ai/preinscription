import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { titreTypeDocument, isFactureDefinitive } from './factureTypeDocument'

const fmt = (n) => new Intl.NumberFormat('fr-FR').format(n || 0)
const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

/** PDF une page par facture (liste établissement). */
export async function downloadFacturesPdfBatch(factures, opts = {}) {
  const list = Array.isArray(factures) ? factures.filter(Boolean) : []
  if (list.length === 0) throw new Error('Aucune facture à exporter.')

  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const M = 16
  const W = doc.internal.pageSize.getWidth()

  list.forEach((f, idx) => {
    if (idx > 0) doc.addPage()
    const et = f.etudiant_snapshot || {}
    const fo = f.formation_snapshot || {}
    const etab = opts.etabNom || f.etablissement_nom || 'Établissement'
    const titre = titreTypeDocument(f.type_document)

    doc.setFillColor(234, 88, 12)
    doc.rect(0, 0, W, 28, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(14)
    doc.text(String(etab).slice(0, 60), M, 12)
    doc.setFontSize(10)
    doc.text(titre, M, 20)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.text(f.numero || '—', W - M, 12, { align: 'right' })
    doc.text(fmtDate(f.date_emission), W - M, 20, { align: 'right' })

    let y = 40
    doc.setTextColor(30, 40, 50)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.text('Bénéficiaire', M, y)
    y += 6
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.text(`${et.prenom || ''} ${et.nom || ''}`.trim() || '—', M, y)
    y += 5
    if (et.email) {
      doc.setFontSize(9)
      doc.setTextColor(100, 110, 120)
      doc.text(String(et.email), M, y)
      y += 5
    }

    y += 4
    doc.setTextColor(30, 40, 50)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.text('Formation', M, y)
    y += 6
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    const titreLines = doc.splitTextToSize(fo.titre || '—', W - 2 * M)
    doc.text(titreLines, M, y)
    y += titreLines.length * 5 + 4

    autoTable(doc, {
      startY: y,
      margin: { left: M, right: M },
      head: [['Désignation', 'Montant (FCFA)']],
      body: [
        ['Montant TTC', fmt(f.montant_ttc)],
        ['Statut', String(f.statut || '—')],
        ['Type', titreTypeDocument(f.type_document, { uppercase: false })],
        ['Dossier', f.dossier_id ? `#${f.dossier_id}` : '—'],
      ],
      theme: 'grid',
      headStyles: { fillColor: [234, 88, 12], textColor: 255, fontStyle: 'bold', fontSize: 9 },
      bodyStyles: { fontSize: 9 },
      columnStyles: { 1: { halign: 'right', cellWidth: 45 } },
    })

    const fy = (doc.lastAutoTable?.finalY || y) + 12
    doc.setFontSize(8)
    doc.setTextColor(130, 140, 150)
    doc.text(
      isFactureDefinitive(f.type_document)
        ? 'Document généré depuis UniPortail — facture définitive.'
        : 'Document généré depuis UniPortail — facture proforma.',
      M,
      fy,
    )
  })

  const name =
    list.length === 1
      ? `${list[0].numero || 'facture'}.pdf`
      : `factures-selection-${list.length}.pdf`
  doc.save(name)
}
