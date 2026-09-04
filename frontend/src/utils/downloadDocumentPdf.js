import { jsPDF } from 'jspdf'
import html2canvas from 'html2canvas'

/** A4 portrait en mm */
export const A4_WIDTH_MM = 210
export const A4_HEIGHT_MM = 297

/**
 * Capture un template A4 fixe (largeur 210 mm) et produit un PDF multipage
 * sans jamais réduire (scale/zoom) le document pour « le faire rentrer ».
 *
 * Aperçu HTML et PDF téléchargé partagent le même nœud DOM (même source).
 */
export async function downloadDocumentPdf(element, filename = 'document.pdf') {
  if (!element) throw new Error('Document introuvable.')

  const prev = {
    width: element.style.width,
    minWidth: element.style.minWidth,
    maxWidth: element.style.maxWidth,
    height: element.style.height,
    transform: element.style.transform,
    zoom: element.style.zoom,
  }

  // Verrouillage physique A4 — indépendant du viewport
  element.style.width = `${A4_WIDTH_MM}mm`
  element.style.minWidth = `${A4_WIDTH_MM}mm`
  element.style.maxWidth = `${A4_WIDTH_MM}mm`
  element.style.height = 'auto'
  element.style.transform = 'none'
  element.style.zoom = 'normal'
  element.classList.add('a4-sheet--capturing')

  // Attendre polices + layout
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
      // Largeur CSS du nœud (A4), pas la largeur de la fenêtre
      windowWidth: element.scrollWidth,
      windowHeight: element.scrollHeight,
      onclone: (_doc, cloned) => {
        cloned.style.width = `${A4_WIDTH_MM}mm`
        cloned.style.minWidth = `${A4_WIDTH_MM}mm`
        cloned.style.maxWidth = `${A4_WIDTH_MM}mm`
        cloned.style.transform = 'none'
        cloned.style.zoom = 'normal'
        cloned.classList.add('a4-sheet', 'a4-sheet--capturing')
      },
    })
  } finally {
    element.style.width = prev.width
    element.style.minWidth = prev.minWidth
    element.style.maxWidth = prev.maxWidth
    element.style.height = prev.height
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

  // Rapport px canvas → mm : la largeur du canvas = exactement 210 mm
  const pxPerMm = canvas.width / A4_WIDTH_MM
  const pageHeightPx = Math.floor(A4_HEIGHT_MM * pxPerMm)

  let srcY = 0
  let pageIndex = 0

  while (srcY < canvas.height - 1) {
    const sliceHeightPx = Math.min(pageHeightPx, canvas.height - srcY)
    const sliceCanvas = document.createElement('canvas')
    sliceCanvas.width = canvas.width
    sliceCanvas.height = sliceHeightPx
    const ctx = sliceCanvas.getContext('2d')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height)
    ctx.drawImage(
      canvas,
      0,
      srcY,
      canvas.width,
      sliceHeightPx,
      0,
      0,
      canvas.width,
      sliceHeightPx,
    )

    const imgData = sliceCanvas.toDataURL('image/png')
    const sliceHeightMm = sliceHeightPx / pxPerMm

    if (pageIndex > 0) pdf.addPage()
    // Toujours pleine largeur A4 — jamais de shrink horizontal
    pdf.addImage(imgData, 'PNG', 0, 0, A4_WIDTH_MM, sliceHeightMm, undefined, 'FAST')

    srcY += pageHeightPx
    pageIndex += 1
    // Garde-fou multipage
    if (pageIndex > 20) break
  }

  pdf.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`)
}
