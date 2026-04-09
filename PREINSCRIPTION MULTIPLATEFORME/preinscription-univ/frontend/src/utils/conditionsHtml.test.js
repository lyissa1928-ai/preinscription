import { describe, it, expect } from 'vitest'
import {
  isEmptyConditionsHtml,
  needsAdvancedHtmlForEditor,
  renderConditionsLooksLikeHtml,
  plainToSafeHtml,
  sanitizeConditionsHtml,
} from './conditionsHtml'

describe('conditionsHtml', () => {
  it('isEmptyConditionsHtml détecte le vide et Quill vide', () => {
    expect(isEmptyConditionsHtml('')).toBe(true)
    expect(isEmptyConditionsHtml('   ')).toBe(true)
    expect(isEmptyConditionsHtml('<p><br></p>')).toBe(true)
    expect(isEmptyConditionsHtml('<p></p>')).toBe(true)
    expect(isEmptyConditionsHtml('<p>Texte</p>')).toBe(false)
  })

  it('renderConditionsLooksLikeHtml', () => {
    expect(renderConditionsLooksLikeHtml('du texte')).toBe(false)
    expect(renderConditionsLooksLikeHtml('<p>x</p>')).toBe(true)
  })

  it('plainToSafeHtml échappe le HTML', () => {
    expect(plainToSafeHtml('')).toBe('')
    expect(plainToSafeHtml('<script>')).toContain('&lt;')
  })

  it('sanitizeConditionsHtml retire les scripts', () => {
    const out = sanitizeConditionsHtml('<p>OK</p><script>evil()</script>')
    expect(out).toContain('<p>OK</p>')
    expect(out).not.toContain('script')
  })

  it('sanitizeConditionsHtml conserve tableaux et images sûres', () => {
    const out = sanitizeConditionsHtml(
      '<table><tr><td>A</td></tr></table><img src="https://exemple.org/x.png" alt="x">',
    )
    expect(out).toContain('<table>')
    expect(out).toContain('https://exemple.org/x.png')
  })

  it('needsAdvancedHtmlForEditor détecte les tableaux', () => {
    expect(needsAdvancedHtmlForEditor('<p>x</p>')).toBe(false)
    expect(needsAdvancedHtmlForEditor('<table><tr><td></td></tr></table>')).toBe(true)
  })
})
