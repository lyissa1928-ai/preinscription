/**
 * Parse une durée style JWT (15m, 7d, 1h) en millisecondes.
 */
function parseDurationMs(raw, fallbackMs) {
  const s = String(raw || '').trim();
  if (!s) return fallbackMs;
  const m = s.match(/^(\d+)\s*(s|m|h|d)?$/i);
  if (!m) return fallbackMs;
  const n = parseInt(m[1], 10);
  const unit = (m[2] || 's').toLowerCase();
  const mul = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
  const ms = n * (mul[unit] || 0);
  return ms > 0 ? ms : fallbackMs;
}

module.exports = { parseDurationMs };
