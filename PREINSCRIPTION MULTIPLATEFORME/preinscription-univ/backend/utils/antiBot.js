function envFlag(name, defaultValue = false) {
  const raw = process.env[name];
  if (raw == null || raw === '') return defaultValue;
  return ['1', 'true', 'yes', 'on'].includes(String(raw).trim().toLowerCase());
}

/** Inscription : exiger Turnstile côté serveur sauf si AUTH_INSCRIPTION_BYPASS_CAPTCHA=1 (dev local). */
function inscriptionCaptchaEnforced() {
  return !envFlag('AUTH_INSCRIPTION_BYPASS_CAPTCHA', false);
}

function toPositiveInt(value, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.floor(n);
}

function antiBotConfig() {
  const secret = String(process.env.TURNSTILE_SECRET_KEY || '').trim();
  const requireCaptcha = envFlag('ANTI_BOT_REQUIRE_CAPTCHA', false) || Boolean(secret);
  const minFillMs = toPositiveInt(process.env.ANTI_BOT_MIN_FILL_MS, 2500);
  return { secret, requireCaptcha, minFillMs };
}

/**
 * Vérifie le jeton reCAPTCHA v2 et renvoie les codes d’erreur Google (diagnostic prod).
 * @returns {{ ok: boolean, errorCodes: string[], httpOk: boolean }}
 */
async function verifyRecaptchaTokenWithDetails(token, remoteIp, secret) {
  const empty = { ok: false, errorCodes: [], httpOk: false };
  if (!token || !secret) return { ...empty, errorCodes: ['missing-token-or-secret'] };
  if (typeof fetch !== 'function') return { ...empty, errorCodes: ['no-fetch'] };
  try {
    const payload = new URLSearchParams();
    payload.set('secret', secret);
    payload.set('response', String(token));
    if (remoteIp && envFlag('RECAPTCHA_VERIFY_SEND_REMOTEIP', false)) {
      payload.set('remoteip', String(remoteIp));
    }

    const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: payload.toString(),
    });
    if (!response.ok) {
      return { ok: false, errorCodes: [`http_${response.status}`], httpOk: false };
    }
    const data = await response.json();
    const errorCodes = Array.isArray(data?.['error-codes']) ? data['error-codes'] : [];
    const ok = data?.success === true;
    if (!ok) {
      console.warn('[recaptcha] siteverify success=false', errorCodes.length ? errorCodes : data);
    }
    return { ok, errorCodes, httpOk: true };
  } catch (e) {
    console.warn('[recaptcha] siteverify exception', e?.message || e);
    return { ...empty, errorCodes: ['network-or-parse-error'] };
  }
}

async function verifyRecaptchaToken(token, remoteIp, secret) {
  const r = await verifyRecaptchaTokenWithDetails(token, remoteIp, secret);
  return r.ok;
}

/** True si reCAPTCHA Enterprise est prêt (prioritaire sur la clé secrète classique). */
function recaptchaEnterpriseConfigured() {
  const pid = String(process.env.RECAPTCHA_ENTERPRISE_PROJECT_ID || '').trim();
  const apiKey = String(process.env.RECAPTCHA_ENTERPRISE_API_KEY || '').trim();
  const siteKey = String(process.env.RECAPTCHA_ENTERPRISE_SITE_KEY || '').trim();
  return Boolean(pid && apiKey && siteKey);
}

/**
 * reCAPTCHA Enterprise — CreateAssessment (remplace siteverify).
 * @see https://cloud.google.com/recaptcha-enterprise/docs/create-assessment
 * @returns {{ ok: boolean, errorCodes: string[], httpOk: boolean }}
 */
async function verifyRecaptchaEnterpriseWithDetails(token) {
  const empty = { ok: false, errorCodes: [], httpOk: false };
  if (!token || typeof fetch !== 'function') {
    return { ...empty, errorCodes: ['missing-token-or-fetch'] };
  }
  const projectId = String(process.env.RECAPTCHA_ENTERPRISE_PROJECT_ID || '').trim();
  let apiKey = String(process.env.RECAPTCHA_ENTERPRISE_API_KEY || '').trim();
  const siteKey = String(process.env.RECAPTCHA_ENTERPRISE_SITE_KEY || '').trim();
  if ((apiKey.startsWith('"') && apiKey.endsWith('"')) || (apiKey.startsWith("'") && apiKey.endsWith("'"))) {
    apiKey = apiKey.slice(1, -1).trim();
  }
  apiKey = apiKey.replace(/\r\n/g, '').replace(/\n/g, '').replace(/\s/g, '');
  if (!projectId || !apiKey || !siteKey) {
    return { ...empty, errorCodes: ['enterprise-missing-config'] };
  }
  const url = `https://recaptchaenterprise.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/assessments?key=${encodeURIComponent(apiKey)}`;
  const body = {
    event: {
      token: String(token),
      siteKey,
    },
  };
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const msg = data?.error?.message || data?.error?.status || `http_${response.status}`;
      console.warn('[recaptcha-enterprise] API HTTP error', response.status, msg);
      return { ok: false, errorCodes: [String(msg)], httpOk: false };
    }
    const valid = data?.tokenProperties?.valid === true;
    if (!valid) {
      const reason = data?.tokenProperties?.invalidReason || 'INVALID';
      console.warn('[recaptcha-enterprise] token not valid', reason, data?.tokenProperties);
      return { ok: false, errorCodes: [String(reason)], httpOk: true };
    }
    return { ok: true, errorCodes: [], httpOk: true };
  } catch (e) {
    console.warn('[recaptcha-enterprise] exception', e?.message || e);
    return { ...empty, errorCodes: ['network-or-parse-error'] };
  }
}

async function verifyTurnstileToken(token, remoteIp, secret) {
  if (!token || !secret) return false;
  if (typeof fetch !== 'function') return false;
  try {
    const payload = new URLSearchParams();
    payload.set('secret', secret);
    payload.set('response', String(token));
    if (remoteIp && envFlag('TURNSTILE_VERIFY_SEND_REMOTEIP', false)) {
      payload.set('remoteip', String(remoteIp));
    }

    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: payload.toString(),
    });
    if (!response.ok) return false;
    const data = await response.json();
    return data?.success === true;
  } catch {
    return false;
  }
}

function recaptchaSecret() {
  let s = String(process.env.RECAPTCHA_SECRET_KEY || '').trim();
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    s = s.slice(1, -1).trim();
  }
  // Retraits fins de ligne / espaces parasites souvent copiés depuis la console Google
  s = s.replace(/\r\n/g, '').replace(/\n/g, '').replace(/\s/g, '');
  return s;
}

module.exports = {
  antiBotConfig,
  verifyTurnstileToken,
  verifyRecaptchaToken,
  verifyRecaptchaTokenWithDetails,
  verifyRecaptchaEnterpriseWithDetails,
  recaptchaEnterpriseConfigured,
  recaptchaSecret,
  envFlag,
  inscriptionCaptchaEnforced,
};
