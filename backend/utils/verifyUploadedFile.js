const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

function isPdfBuffer(buf) {
  return buf.length >= 5 && buf.slice(0, 5).toString('ascii') === '%PDF-';
}

/**
 * Détection stricte du type réel (magic bytes) — PDF / JPEG / PNG uniquement pour dossiers étudiants.
 * @returns {'pdf'|'jpeg'|'png'|null}
 */
function detectDossierMagicFormat(buf) {
  if (!buf || buf.length < 8) return null;
  if (isPdfBuffer(buf)) return 'pdf';
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpeg';
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 && buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a) {
    return 'png';
  }
  return null;
}

function extMatchesMagic(extLower, magic) {
  if (!magic) return false;
  if (magic === 'pdf') return extLower === '.pdf';
  if (magic === 'jpeg') return extLower === '.jpg' || extLower === '.jpeg';
  if (magic === 'png') return extLower === '.png';
  return false;
}

/** Extension de fichier stockée (JPEG toujours .jpg). */
function extensionForStoredDossierFile(magic) {
  if (magic === 'pdf') return '.pdf';
  if (magic === 'jpeg') return '.jpg';
  if (magic === 'png') return '.png';
  return '.bin';
}

async function verifyRasterImageBuffer(buf) {
  try {
    const meta = await sharp(buf).metadata();
    if (!meta.format || !['jpeg', 'png', 'webp', 'gif', 'tiff'].includes(meta.format)) {
      return { ok: false, message: 'Image invalide ou format non autorisé.' };
    }
    return { ok: true };
  } catch {
    return { ok: false, message: 'Fichier image invalide ou corrompu.' };
  }
}

function isProbablySvgBuffer(buf) {
  const head = buf.slice(0, Math.min(1024, buf.length)).toString('utf8').trimStart();
  return head.startsWith('<svg') || head.startsWith('<?xml');
}

/**
 * Vérifie le contenu binaire + cohérence avec l’extension déclarée (anti scripts déguisés).
 */
async function verifyDossierUploadBuffer(buf, extLower) {
  const magic = detectDossierMagicFormat(buf);
  if (!magic) {
    return { ok: false, message: 'Format non reconnu : déposez un PDF ou une image JPG/PNG authentiques.' };
  }
  if (!extMatchesMagic(extLower, magic)) {
    return {
      ok: false,
      message:
        'Le contenu du fichier ne correspond pas à l’extension (fichier suspect ou corrompu). Utilisez PDF, JPG ou PNG.',
    };
  }
  if (magic === 'pdf') return { ok: true, magic };
  const img = await verifyRasterImageBuffer(buf);
  if (!img.ok) return img;
  return { ok: true, magic };
}

async function verifyEtablissementAssetBuffer(buf, extLower) {
  if (extLower === '.svg') {
    if (!isProbablySvgBuffer(buf)) return { ok: false, message: 'Fichier SVG invalide.' };
    return { ok: true };
  }
  if (['.jpg', '.jpeg', '.png', '.webp'].includes(extLower)) {
    return verifyRasterImageBuffer(buf);
  }
  return { ok: false, message: 'Format de fichier non autorisé.' };
}

const CHAT_BLOCKED_EXT = new Set(['.svg', '.html', '.htm', '.js', '.exe', '.php', '.sh', '.bat']);
const CHAT_MAX_BYTES = 12 * 1024 * 1024;

async function verifyChatUploadBuffer(buf, extLower) {
  if (!buf || buf.length > CHAT_MAX_BYTES) {
    return { ok: false, message: 'Fichier trop volumineux (12 Mo max.).' };
  }
  if (CHAT_BLOCKED_EXT.has(extLower)) {
    return { ok: false, message: 'Format de fichier non autorisé pour le chat.' };
  }
  return verifyDossierUploadBuffer(buf, extLower);
}

async function verifyDiskFile(filePath, originalname, kind) {
  let buf;
  try {
    buf = fs.readFileSync(filePath);
  } catch {
    return { ok: false, message: 'Lecture du fichier impossible.' };
  }
  const ext = path.extname(originalname || '').toLowerCase();
  if (kind === 'dossier') return verifyDossierUploadBuffer(buf, ext);
  if (kind === 'chat') return verifyChatUploadBuffer(buf, ext);
  return verifyEtablissementAssetBuffer(buf, ext);
}

function unlinkQuiet(p) {
  try {
    fs.unlinkSync(p);
  } catch {
    /* ignore */
  }
}

module.exports = {
  verifyDossierUploadBuffer,
  verifyChatUploadBuffer,
  verifyEtablissementAssetBuffer,
  verifyDiskFile,
  unlinkQuiet,
  detectDossierMagicFormat,
  extensionForStoredDossierFile,
  CHAT_MAX_BYTES,
};
