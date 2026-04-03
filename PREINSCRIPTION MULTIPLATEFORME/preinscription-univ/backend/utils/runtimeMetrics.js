const startedAt = Date.now();

const state = {
  requests_total: 0,
  errors_5xx: 0,
  by_method: {},
  by_status: {},
  by_route: {},
  total_duration_ms: 0,
  max_duration_ms: 0,
};

function inc(map, key, amount = 1) {
  map[key] = (map[key] || 0) + amount;
}

function recordRequest({ method, route, statusCode, durationMs }) {
  const m = String(method || 'UNKNOWN').toUpperCase();
  const r = String(route || 'unknown');
  const s = String(statusCode || 0);
  const d = Math.max(0, Number(durationMs || 0));

  state.requests_total += 1;
  inc(state.by_method, m);
  inc(state.by_status, s);
  inc(state.by_route, `${m} ${r}`);
  state.total_duration_ms += d;
  if (d > state.max_duration_ms) state.max_duration_ms = d;
  if (Number(statusCode) >= 500) state.errors_5xx += 1;
}

function topEntries(map, limit = 8) {
  return Object.entries(map)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([key, count]) => ({ key, count }));
}

function getRuntimeMetricsSnapshot() {
  const uptime_s = Math.floor((Date.now() - startedAt) / 1000);
  const avg_ms = state.requests_total > 0 ? Math.round((state.total_duration_ms / state.requests_total) * 100) / 100 : 0;
  const mem = process.memoryUsage();

  return {
    started_at: new Date(startedAt).toISOString(),
    uptime_s,
    requests_total: state.requests_total,
    errors_5xx: state.errors_5xx,
    avg_duration_ms: avg_ms,
    max_duration_ms: state.max_duration_ms,
    memory_mb: {
      rss: Math.round((mem.rss / 1024 / 1024) * 100) / 100,
      heap_used: Math.round((mem.heapUsed / 1024 / 1024) * 100) / 100,
      heap_total: Math.round((mem.heapTotal / 1024 / 1024) * 100) / 100,
    },
    top_methods: topEntries(state.by_method, 8),
    top_status: topEntries(state.by_status, 8),
    top_routes: topEntries(state.by_route, 10),
  };
}

module.exports = { recordRequest, getRuntimeMetricsSnapshot };

