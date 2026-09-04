import { jsPDF } from 'jspdf'
import html2canvas from 'html2canvas'

/** A4 portrait en mm */
export const A4_WIDTH_MM = 210
export const A4_HEIGHT_MM = 297

/**
 * Capture un template A4 et produit un PDF d’une seule page.
 * Si le contenu dépasse légèrement, il est mis à l’échelle pour tenir sur A4
 * (sans découpe multipage).
 */
export async function downloadDocumentPdf(element, filename = 'document.pdf') {
  if (!element) throw new Error('Document introuvable.')

  const prev = {
    width: element.style.width,
    minWidth: element.style.minWidth,
    maxWidth: element.style.maxWidth,
    height: element.style.height,
    maxHeight: element.style.maxHeight,
    transform: element.style.transform,
    zoom: element.style.zoom,
  }

  element.style.width = `${A4_WIDTH_MM}mm`
  element.style.minWidth = `${A4_WIDTH_MM}mm`
  element.style.maxWidth = `${A4_WIDTH_MM}mm`
  element.style.height = `${A4_HEIGHT_MM}mm`
  element.style.maxHeight = `${A4_HEIGHT_MM}mm`
  element.style.transform = 'none'
  element.style.zoom = 'normal'
  element.classList.add('a4-sheet--capturing')

  try {
    if (document.fonts?.ready) await document.fonts.ready
  } catch { /* ignore */ }
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))

  let canvas
  try {
    canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: element.scrollWidth,
      windowHeight: element.scrollHeight,
      onclone: (_doc, cloned) => {
        cloned.style.width = `${A4_WIDTH_MM}mm`
        cloned.style.minWidth = `${A4_WIDTH_MM}mm`
        cloned.style.maxWidth = `${A4_WIDTH_MM}mm`
        cloned.style.height = `${A4_HEIGHT_MM}mm`
        cloned.style.maxHeight = `${A4_HEIGHT_MM}mm`
        cloned.style.transform = 'none'
        cloned.style.zoom = 'normal'
        cloned.classList.add('a4-sheet', 'a4-sheet--capturing', 'a4-sheet--single')
      },
    })
  } finally {
    element.style.width = prev.width
    element.style.minWidth = prev.minWidth
    element.style.maxWidth = prev.maxWidth
    element.style.height = prev.height
    element.style.maxHeight = prev.maxHeight
    element.style.transform = prev.transform
    element.style.zoom = prev.zoom
    element.classList.remove('a4-sheet--capturing')
  }

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  })

  const pxPerMm = canvas.width / A4_WIDTH_MM
  const imgHeightMm = canvas.height / pxPerMm
  const imgData = canvas.toDataURL('image/png')

  if (imgHeightMm <= A4_HEIGHT_MM + 0.5) {
    pdf.addImage(imgData, 'PNG', 0, 0, A4_WIDTH_MM, Math.min(imgHeightMm, A4_HEIGHT_MM), undefined, 'FAST')
  } else {
    // Une seule page : échelle pour tout faire tenir
    const scale = A4_HEIGHT_MM / imgHeightMm
    const w = A4_WIDTH_MM * scale
    const h = A4_HEIGHT_MM
    const x = (A4_WIDTH_MM - w) / 2
    pdf.addImage(imgData, 'PNG', x, 0, w, h, undefined, 'FAST')
  }

  pdf.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`)
}
