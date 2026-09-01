import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { titreTypeDocument, isFactureDefinitive } from './factureTypeDocument'
import { buildDisplayRows } from './factureDisplayRows'
import { fmtPdfNumber, fmtPdfDate } from './pdfFormat'

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
    const etabSnap = f.etablissement_snapshot || {}
    const etab = opts.etabNom || etabSnap.nom || f.etablissement_nom || 'Établissement'
    const titre = titreTypeDocument(f.type_document)
    const { rows, totalAPayer } = buildDisplayRows(f, fo)

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
    doc.text(fmtPdfDate(f.date_emission), W - M, 20, { align: 'right' })

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
    if (et.telephone) {
      doc.text(String(et.telephone), M, y)
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
    y += titreLines.length * 5 + 2
    if (fo.niveau || fo.duree_formation) {
      doc.setFontSize(9)
      doc.setTextColor(100, 110, 120)
      const meta = [fo.niveau, fo.duree_formation].filter(Boolean).join(' · ')
      doc.text(meta, M, y)
      y += 5
    }

    const tableRows = rows.length
      ? rows.map((r) => [r.designation, fmtPdfNumber(r.montant)])
      : [['Montant TTC', fmtPdfNumber(f.montant_ttc || totalAPayer)]]

    autoTable(doc, {
      startY: y,
      margin: { left: M, right: M },
      head: [['Désignation', 'Montant (FCFA)']],
      body: tableRows,
      foot: [['Total à payer', fmtPdfNumber(totalAPayer || f.montant_ttc)]],
      theme: 'grid',
      headStyles: { fillColor: [234, 88, 12], textColor: 255, fontStyle: 'bold', fontSize: 9 },
      bodyStyles: { fontSize: 9 },
      footStyles: { fillColor: [255, 247, 237], textColor: [30, 40, 50], fontStyle: 'bold', fontSize: 9 },
      columnStyles: { 1: { halign: 'right', cellWidth: 45 } },
    })

    let fy = (doc.lastAutoTable?.finalY || y) + 8
    doc.setFontSize(8)
    doc.setTextColor(130, 140, 150)
    if (f.date_echeance) {
      doc.text(`Valable jusqu'au ${fmtPdfDate(f.date_echeance)} (1 an).`, M, fy)
      fy += 4
    }
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
