import { jsPDF } from 'jspdf'
import html2canvas from 'html2canvas'

/**
 * Télécharge un bloc HTML (facture, lettre, attestation) en PDF — sans impression navigateur.
 */
export async function downloadDocumentPdf(element, filename = 'document.pdf') {
  if (!element) throw new Error('Document introuvable.')

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff',
    windowWidth: element.scrollWidth,
    windowHeight: element.scrollHeight,
  })

  const imgData = canvas.toDataURL('image/png')
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageW = pdf.internal.pageSize.getWidth()
  const pageH = pdf.internal.pageSize.getHeight()
  const margin = 0
  const usableW = pageW - margin * 2
  const usableH = pageH - margin * 2

  let imgW = usableW
  let imgH = (canvas.height * imgW) / canvas.width

  if (imgH > usableH) {
    imgH = usableH
    imgW = (canvas.width * imgH) / canvas.height
  }

  const x = margin + (usableW - imgW) / 2
  pdf.addImage(imgData, 'PNG', x, margin, imgW, imgH)
  pdf.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`)
}
