/**
 * Persistance sécurisée des pièces dossier : taille, validation binaire, nom de fichier non prédictible.
 * (Pas de SQL dans ce projet — les chemins stockés sont des basenames sans répertoire utilisateur.)
 */

const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const {
  verifyDossierUploadBuffer,
  detectDossierMagicFormat,
  extensionForStoredDossierFile,
  unlinkQuiet,
} = require('./verifyUploadedFile');
const { optionalClamScanFile } = require('./optionalClamScan');

const MAX_DOSSIER_FILE_BYTES = 2 * 1024 * 1024;

function sanitizeSegment(s, maxLen) {
  return String(s || 'doc')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, maxLen || 64);
}

/**
 * @param {object} opts
 * @param {string} opts.uploadsDir Répertoire absolu d’upload
 * @param {string} opts.tempAbsPath Chemin absolu du fichier temporaire (multer)
 * @param {string} opts.originalname Nom d’origine (pour extension déclarée)
 * @param {string} opts.niveauKey Profil de règles (ex. l1, m2)
 * @param {string} opts.fieldKey Nom du champ formulaire (ex. releve_l1_s1)
 * @returns {Promise<{ ok: boolean, message?: string, finalName?: string, finalAbsPath?: string }>}
 */
async function processAndPersistDossierFile({ uploadsDir, tempAbsPath, originalname, niveauKey, fieldKey }) {
  let buf;
  try {
    buf = fs.readFileSync(tempAbsPath);
  } catch {
    return { ok: false, message: 'Lecture du fichier impossible.' };
  }
  if (buf.length > MAX_DOSSIER_FILE_BYTES) {
    unlinkQuiet(tempAbsPath);
    return { ok: false, message: 'Chaque document est limité à 2 Mo.' };
  }

  const ext = path.extname(originalname || '').toLowerCase();
  const v = await verifyDossierUploadBuffer(buf, ext);
  if (!v.ok) {
    unlinkQuiet(tempAbsPath);
    return v;
  }

  const magic = detectDossierMagicFormat(buf);
  const extFinal = extensionForStoredDossierFile(magic);
  const finalName = `${uuidv4()}_${Date.now()}_${sanitizeSegment(niveauKey, 32)}_${sanitizeSegment(fieldKey, 64)}${extFinal}`;
  const destAbs = path.join(uploadsDir, finalName);

  if (finalName !== path.basename(finalName) || finalName.includes('..')) {
    unlinkQuiet(tempAbsPath);
    return { ok: false, message: 'Nom de fichier invalide.' };
  }

  try {
    fs.renameSync(tempAbsPath, destAbs);
  } catch {
    unlinkQuiet(tempAbsPath);
    return { ok: false, message: 'Enregistrement du fichier impossible.' };
  }

  const clam = await optionalClamScanFile(destAbs);
  if (!clam.ok) {
    unlinkQuiet(destAbs);
    return { ok: false, message: clam.message || 'Analyse antivirus refusée.' };
  }

  return { ok: true, finalName, finalAbsPath: destAbs };
}

module.exports = {
  MAX_DOSSIER_FILE_BYTES,
  processAndPersistDossierFile,
};
