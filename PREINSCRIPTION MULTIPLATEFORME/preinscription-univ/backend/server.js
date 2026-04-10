require('dotenv').config();
const http = require('http');
const express = require('express');
const { inscriptionCaptchaEnforced } = require('./utils/antiBot');
const cors = require('cors');
const path = require('path');
const { runMaintenancePrune, retentionConfigFromEnv } = require('./utils/maintenance');
const { recordRequest, getRuntimeMetricsSnapshot } = require('./utils/runtimeMetrics');
const { runHealthChecks } = require('./utils/healthCheck');

const app = express();
const PORT = process.env.PORT || 5000;
app.disable('x-powered-by');
// Derrière nginx / reverse proxy : req.ip et rate-limit utilisent X-Forwarded-For correctement.
if (process.env.TRUST_PROXY !== '0') {
  app.set('trust proxy', Number(process.env.TRUST_PROXY || 1) || 1);
}

const defaultCorsOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
];
const envCorsOrigins = String(process.env.CORS_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
const allowedCorsOrigins = envCorsOrigins.length > 0 ? envCorsOrigins : defaultCorsOrigins;

app.use(cors({
  origin: (origin, cb) => {
    // Autoriser appels serveur-à-serveur / Postman (pas d'origin) et origins whitelistées.
    if (!origin || allowedCorsOrigins.includes(origin)) return cb(null, true);
    return cb(null, false);
  },
  credentials: true,
}));

// Durcissement HTTP minimal sans casser les fonctionnalités existantes.
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  // CSP stricte sur l’API (réponses JSON) — désactivable en dev (SECURITY_CSP=0).
  if (process.env.SECURITY_CSP !== '0') {
    const enableCsp = process.env.NODE_ENV === 'production' || process.env.SECURITY_CSP === '1';
    if (enableCsp) {
      res.setHeader(
        'Content-Security-Policy',
        "default-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'"
      );
    }
  }
  next();
});
/** Limite élevée : conditions d’admission (HTML Quill), exports, etc. — l’ancienne défaut ~100 ko provoquait 413 silencieux. */
const BODY_LIMIT = process.env.JSON_BODY_LIMIT || '5mb';
app.use(express.json({ limit: BODY_LIMIT }));
app.use(express.urlencoded({ extended: true, limit: BODY_LIMIT }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Metrics middleware (best effort, sans impact métier).
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const route = req.route?.path || req.path || req.originalUrl || 'unknown';
    recordRequest({
      method: req.method,
      route,
      statusCode: res.statusCode,
      durationMs: Date.now() - start,
    });
  });
  next();
});

app.use('/api/auth', require('./routes/auth'));
app.use('/api/public', require('./routes/public'));             // Public — sans auth
app.use('/api/conditions-admission', require('./routes/conditionsAdmission'));
app.use('/api/etudiant', require('./routes/etudiant'));
app.use('/api/admin', require('./routes/admin'));               // Administrateur
app.use('/api/responsable', require('./routes/responsable'));   // Responsable pédagogique
app.use('/api/agent-admin', require('./routes/agent_admin'));   // Agent administratif
app.use('/api/comptable', require('./routes/comptable'));       // Comptable / Finance
app.use('/api/qualite', require('./routes/qualite'));          // Contrôleur qualité
app.use('/api/etablissements', require('./routes/etablissements'));
app.use('/api/formations', require('./routes/formations'));
app.use('/api/factures', require('./routes/factures'));
app.use('/api/chat', require('./routes/chat'));

function sendHealth(req, res) {
  const m = getRuntimeMetricsSnapshot();
  const checks = runHealthChecks();
  const payload = {
    status: checks.ok ? 'OK' : 'DEGRADED',
    time: new Date().toISOString(),
    checks: {
      database: checks.database.ok ? 'ok' : 'error',
      uploads: checks.uploads.ok ? 'ok' : 'error',
      chat_file: checks.chat_file.ok ? 'ok' : 'error',
    },
    uptime_s: m.uptime_s,
    requests_total: m.requests_total,
    errors_5xx: m.errors_5xx,
    avg_duration_ms: m.avg_duration_ms,
    memory_mb: m.memory_mb,
  };
  if (!checks.database.ok && checks.database.error) payload.database_error = checks.database.error;
  if (!checks.uploads.ok && checks.uploads.error) payload.uploads_error = checks.uploads.error;
  if (!checks.chat_file.ok && checks.chat_file.error) payload.chat_file_error = checks.chat_file.error;
  res.status(checks.ok ? 200 : 503).json(payload);
}

app.get('/api/health', sendHealth);
/** Alias pour reverse-proxy / probes qui attendent souvent /health */
app.get('/health', sendHealth);

// Maintenance startup (rétention logs/notifications/backups), best-effort.
try {
  const retention = retentionConfigFromEnv();
  const result = runMaintenancePrune(retention);
  console.log(`[MAINTENANCE] prune startup: removed=${result.total_removed}`);
} catch (e) {
  console.warn('[MAINTENANCE] prune startup failed:', e.message);
}

app.use((err, req, res, next) => {
  if (err && (err.type === 'entity.too.large' || err.status === 413)) {
    return res.status(413).json({
      message: 'Données trop volumineuses pour le serveur (corps JSON). Réduisez le texte ou contactez l’administrateur.',
    });
  }
  console.error(err.stack);
  res.status(500).json({ message: err.message || 'Erreur serveur interne' });
});

const server = http.createServer(app);
const { initChatSocket } = require('./socket/chatSocket');
initChatSocket(server, { allowedCorsOrigins });

server.listen(PORT, () => {
  console.log(`🚀 Serveur : http://localhost:${PORT}`);
  if (!inscriptionCaptchaEnforced()) {
    console.warn(
      '[auth] AUTH_INSCRIPTION_BYPASS_CAPTCHA actif — aucune vérification captcha sur POST /api/auth/inscription (réservé au développement local).'
    );
  }
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(
      `[serveur] Port ${PORT} déjà utilisé (EADDRINUSE). Fermez l’autre instance Node sur ce port ou définissez une autre valeur pour PORT dans .env.`
    );
    process.exit(1);
  }
  throw err;
});
