function envInt(name, fallback) {
  const n = parseInt(String(process.env[name] ?? ''), 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

const EXPORT_LIMITS = {
  maxExcelRowsPerSheet: envInt('EXPORT_MAX_ROWS_PER_SHEET', 5000),
  maxExcelFormations: envInt('EXPORT_MAX_FORMATIONS', 40),
  maxFacturesHtmlExport: envInt('EXPORT_MAX_FACTURES_HTML', 200),
  maxFactureIdsParam: envInt('EXPORT_MAX_FACTURE_IDS', 200),
  deferThresholdRows: envInt('EXPORT_DEFER_THRESHOLD_ROWS', 8000),
};

function capArray(arr, max, label) {
  if (!Array.isArray(arr) || arr.length <= max) {
    return { items: arr || [], truncated: false, total: (arr || []).length };
  }
  return {
    items: arr.slice(0, max),
    truncated: true,
    total: arr.length,
    message: `${label} limité à ${max} éléments (total ${arr.length}).`,
  };
}

module.exports = { EXPORT_LIMITS, capArray };
