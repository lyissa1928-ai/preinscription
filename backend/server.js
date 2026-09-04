require('dotenv').config();
const { warnPm2ClusterRisk } = require('./utils/dbWriteQueue');
const { initTokenRevocationFromDisk } = require('./utils/tokenRevocation');
const { runChatRetentionPrune } = require('./utils/chatRetention');
warnPm2ClusterRisk();
initTokenRevocationFromDisk();
try {
  const chatPrune = runChatRetentionPrune();
  if (chatPrune.removed > 0) {
    console.log(`[chat] rétention au démarrage : ${chatPrune.removed} message(s) supprimé(s)`);
  }
} catch (e) {
  console.warn('[chat] rétention au démarrage ignorée:', e.message);
}
const http = require('http');
const express = require('express');
const { inscriptionCaptchaEnforced } = require('./utils/antiBot');
const cors = require('cors');
const path = require('path');
const { runMaintenancePrune, retentionConfigFromEnv } = require('./utils/maintenance');
const { recordRequest, getRuntimeMetricsSnapshot } = require('./utils/runtimeMetrics');
const { runHealthChecks } = require('./utils/healthCheck');
const { maintenanceGate } = require('./middleware/maintenanceGate');
const { startAutoBackupScheduler } = require('./utils/autoBackupScheduler');
const { startWeeklyRapportScheduler } = require('./utils/weeklyRapportScheduler');
const { isMaintenanceModeEnabled } = require('./utils/maintenanceMode');
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
// /uploads protégé : logos publics, documents/justificatifs/PJ derrière auth + ACL (Lot 1 sécurité).
const { uploadsGuard } = require('./middleware/uploadsGuard');
app.use('/uploads', uploadsGuard, express.static(path.join(__dirname, 'uploads')));

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

// Rate limit global (filet anti-scraping / brute force) : plafond large par IP
// sur toute l'API. Les limiteurs ciblés (login, inscription, chat…) restent en
// place et sont plus stricts. /health et /api/health sont exemptés (probes).
const { rateLimit: makeRateLimit, getClientIp: clientIp } = require('./utils/rateLimit');
const globalApiLimiter = makeRateLimit({
  windowMs: Number(process.env.GLOBAL_RATE_WINDOW_MS || 60_000),
  max: Number(process.env.GLOBAL_RATE_MAX || 300),
  message: 'Trop de requêtes depuis cette adresse. Réessayez dans un instant.',
  keyGenerator: (req) => `global:${clientIp(req)}`,
});
app.use('/api', (req, res, next) => {
  if (req.path === '/health') return next();
  return globalApiLimiter(req, res, next);
});

app.use(maintenanceGate);

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
app.use('/api/etablissements', require('./routes/flyers'));
app.use('/api/formations', require('./routes/formations'));
app.use('/api/niveaux-etude', require('./routes/niveauxEtude'));
app.use('/api/responsable-fad', require('./routes/responsableFadAgents'));
app.use('/api/factures', require('./routes/factures'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/chatbot', require('./routes/chatbot')); // Orientation IA (RAG) — distinct du chat humain

function sendHealth(req, res) {
  const m = getRuntimeMetricsSnapshot();
  const checks = runHealthChecks();
  const payload = {
    status: checks.ok ? 'OK' : 'DEGRADED',
    time: new Date().toISOString(),
    maintenance_mode: isMaintenanceModeEnabled(),
    checks: {
      json_file: checks.json_file.ok ? 'ok' : 'error',
      database: checks.database.ok ? 'ok' : 'error',
      uploads: checks.uploads.ok ? 'ok' : 'error',
      chat_file: checks.chat_file.ok ? 'ok' : 'error',
      disk: checks.disk.ok ? 'ok' : 'error',
      socket_io: checks.socket_io.ok ? 'ok' : 'error',
      maintenance: checks.maintenance.ok ? 'ok' : 'error',
    },
    details: {
      disk_free_mb: checks.disk.free_mb ?? null,
      socket_clients: checks.socket_io.connected_clients ?? null,
      maintenance_enabled: checks.maintenance.enabled === true,
    },
    uptime_s: m.uptime_s,
    requests_total: m.requests_total,
    errors_5xx: m.errors_5xx,
    avg_duration_ms: m.avg_duration_ms,
    memory_mb: m.memory_mb,
  };
  const errFields = [
    ['json_file', checks.json_file],
    ['database', checks.database],
    ['uploads', checks.uploads],
    ['chat_file', checks.chat_file],
    ['disk', checks.disk],
    ['socket_io', checks.socket_io],
  ];
  errFields.forEach(([key, c]) => {
    if (!c.ok && c.error) payload[`${key}_error`] = c.error;
  });
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
  // Ne pas divulguer err.message au client en production (fuite d'implémentation).
  const isProd = process.env.NODE_ENV === 'production';
  res.status(500).json({
    message: isProd ? 'Erreur serveur interne. Réessayez plus tard.' : (err.message || 'Erreur serveur interne'),
  });
});

const server = http.createServer(app);
const { initChatSocket } = require('./socket/chatSocket');
initChatSocket(server, { allowedCorsOrigins });

server.listen(PORT, () => {
  console.log(`🚀 Serveur : http://localhost:${PORT}`);
  startAutoBackupScheduler();
  startWeeklyRapportScheduler();
  if (isMaintenanceModeEnabled()) {
    console.warn('[MAINTENANCE] Mode maintenance actif (MAINTENANCE_MODE)');
  }
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
