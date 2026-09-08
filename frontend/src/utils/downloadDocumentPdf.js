import { jsPDF } from 'jspdf'
import html2canvas from 'html2canvas'

/** A4 portrait en mm */
export const A4_WIDTH_MM = 210
export const A4_HEIGHT_MM = 297

/**
 * Capture un template A4 et produit un PDF.
 * @param {HTMLElement} element
 * @param {string} filename
 * @param {{ fitContent?: boolean }} [options]
 *   fitContent: hauteur = contenu (attestation) — pas de page blanche sous le cadre.
 */
export async function downloadDocumentPdf(element, filename = 'document.pdf', options = {}) {
  if (!element) throw new Error('Document introuvable.')
  const fitContent = options.fitContent === true

  const prev = {
    width: element.style.width,
    minWidth: element.style.minWidth,
    maxWidth: element.style.maxWidth,
    height: element.style.height,
    minHeight: element.style.minHeight,
    maxHeight: element.style.maxHeight,
    transform: element.style.transform,
    zoom: element.style.zoom,
  }

  element.style.width = `${A4_WIDTH_MM}mm`
  element.style.minWidth = `${A4_WIDTH_MM}mm`
  element.style.maxWidth = `${A4_WIDTH_MM}mm`
  if (fitContent) {
    element.style.height = 'auto'
    element.style.minHeight = '0'
    element.style.maxHeight = 'none'
  } else {
    element.style.height = `${A4_HEIGHT_MM}mm`
    element.style.maxHeight = `${A4_HEIGHT_MM}mm`
  }
  element.style.transform = 'none'
  element.style.zoom = 'normal'
  element.classList.add('a4-sheet--capturing')
  if (fitContent) {
    element.classList.add('a4-sheet--fit')
    element.classList.remove('a4-sheet--single')
  }

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
        if (fitContent) {
          cloned.style.height = 'auto'
          cloned.style.minHeight = '0'
          cloned.style.maxHeight = 'none'
          cloned.classList.add('a4-sheet', 'a4-sheet--capturing', 'a4-sheet--fit')
          cloned.classList.remove('a4-sheet--single')
        } else {
          cloned.style.height = `${A4_HEIGHT_MM}mm`
          cloned.style.maxHeight = `${A4_HEIGHT_MM}mm`
          cloned.classList.add('a4-sheet', 'a4-sheet--capturing', 'a4-sheet--single')
        }
        cloned.style.transform = 'none'
        cloned.style.zoom = 'normal'
      },
    })
  } finally {
    element.style.width = prev.width
    element.style.minWidth = prev.minWidth
    element.style.maxWidth = prev.maxWidth
    element.style.height = prev.height
    element.style.minHeight = prev.minHeight
    element.style.maxHeight = prev.maxHeight
    element.style.transform = prev.transform
    element.style.zoom = prev.zoom
    element.classList.remove('a4-sheet--capturing')
  }

  const pxPerMm = canvas.width / A4_WIDTH_MM
  const imgHeightMm = canvas.height / pxPerMm
  const imgData = canvas.toDataURL('image/png')

  if (fitContent) {
    const pageH = Math.max(imgHeightMm, 40)
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [A4_WIDTH_MM, pageH],
      compress: true,
    })
    pdf.addImage(imgData, 'PNG', 0, 0, A4_WIDTH_MM, imgHeightMm, undefined, 'FAST')
    pdf.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`)
    return
  }

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  })

  if (imgHeightMm <= A4_HEIGHT_MM + 0.5) {
    pdf.addImage(imgData, 'PNG', 0, 0, A4_WIDTH_MM, Math.min(imgHeightMm, A4_HEIGHT_MM), undefined, 'FAST')
  } else {
    const scale = A4_HEIGHT_MM / imgHeightMm
    const w = A4_WIDTH_MM * scale
    const h = A4_HEIGHT_MM
    const x = (A4_WIDTH_MM - w) / 2
    pdf.addImage(imgData, 'PNG', x, 0, w, h, undefined, 'FAST')
  }

  pdf.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`)
}
