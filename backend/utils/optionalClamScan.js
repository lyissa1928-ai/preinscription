const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * Scan antivirus optionnel (ClamAV). Si CLAMSCAN_BIN n'est pas défini ou fichier absent : skip.
 * clamscan: code 0 = OK, 1 = infecté, 2 = erreur.
 */
function optionalClamScanFile(filePath) {
  const bin = String(process.env.CLAMSCAN_BIN || '').trim();
  if (!bin || !fs.existsSync(filePath)) {
    return Promise.resolve({ ok: true, skipped: true });
  }
  const resolvedBin = path.isAbsolute(bin) ? bin : path.resolve(process.cwd(), bin);
  if (!fs.existsSync(resolvedBin)) {
    return Promise.resolve({ ok: true, skipped: true });
  }

  return new Promise((resolve) => {
    execFile(
      resolvedBin,
      ['--no-summary', '--stdout', filePath],
      { timeout: 120_000, maxBuffer: 10 * 1024 * 1024, windowsHide: true },
      (err, stdout, stderr) => {
        if (err) {
          if (err.code === 'ETIMEDOUT') {
            return resolve({ ok: true, skipped: true, warn: 'clamscan_timeout' });
          }
          const exitCode = typeof err.code === 'number' ? err.code : null;
          if (exitCode === 1) {
            return resolve({ ok: false, message: 'Fichier refusé par l’analyse antivirus.' });
          }
          return resolve({ ok: true, skipped: true, warn: String(stderr || err.message || '') });
        }
        resolve({ ok: true });
      }
    );
  });
}

module.exports = { optionalClamScanFile };
