/**
 * Enregistrement des polices / tailles Quill avant le premier montage de l’éditeur.
 */
import Quill from 'quill'

const Font = Quill.import('formats/font')
Font.whitelist = [
  'times-new-roman',
  'arial',
  'georgia',
  'verdana',
  'tahoma',
  'courier-new',
  'calibri',
  'garamond',
  'trebuchet-ms',
  'arabic-typesetting',
  'segoe-ui',
  'comic-sans-ms',
]
Quill.register(Font, true)

const Size = Quill.import('formats/size')
Size.whitelist = ['small', false, 'large', 'huge']
Quill.register(Size, true)
