/**
 * Store rate-limit : mémoire (défaut) ou Redis si REDIS_URL + package ioredis installé.
 */
const memoryBuckets = new Map();

let redisClient = null;
let redisWarned = false;

function getRedisClient() {
  const url = String(process.env.REDIS_URL || '').trim();
  if (!url) return null;
  if (redisClient) return redisClient;
  try {
    // eslint-disable-next-line global-require, import/no-extraneous-dependencies
    const Redis = require('ioredis');
    redisClient = new Redis(url, {
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      lazyConnect: true,
    });
    redisClient.on('error', (err) => {
      if (!redisWarned) {
        redisWarned = true;
        console.warn('[rate-limit] Redis error, fallback mémoire:', err.message);
      }
    });
    return redisClient;
  } catch {
    if (!redisWarned) {
      redisWarned = true;
      console.warn(
        '[rate-limit] REDIS_URL défini mais ioredis absent — npm install ioredis pour activer Redis. Fallback mémoire.',
      );
    }
    return null;
  }
}

function memoryHit(key, windowMs, max) {
  const now = Date.now();
  const hit = memoryBuckets.get(key);
  if (!hit || hit.expiresAt <= now) {
    memoryBuckets.set(key, { count: 1, expiresAt: now + windowMs });
    return { allowed: true, retryAfterSec: 0 };
  }
  if (hit.count >= max) {
    return {
      allowed: false,
      retryAfterSec: Math.max(1, Math.ceil((hit.expiresAt - now) / 1000)),
    };
  }
  hit.count += 1;
  memoryBuckets.set(key, hit);
  return { allowed: true, retryAfterSec: 0 };
}

async function redisHit(key, windowMs, max) {
  const client = getRedisClient();
  if (!client) return memoryHit(key, windowMs, max);
  try {
    if (client.status !== 'ready') await client.connect().catch(() => {});
    const ttlSec = Math.max(1, Math.ceil(windowMs / 1000));
    const n = await client.incr(`rl:${key}`);
    if (n === 1) await client.expire(`rl:${key}`, ttlSec);
    if (n > max) {
      const ttl = await client.ttl(`rl:${key}`);
      return { allowed: false, retryAfterSec: Math.max(1, ttl > 0 ? ttl : ttlSec) };
    }
    return { allowed: true, retryAfterSec: 0 };
  } catch {
    return memoryHit(key, windowMs, max);
  }
}

function checkRateLimit(key, windowMs, max) {
  const useRedis = !!String(process.env.REDIS_URL || '').trim() && getRedisClient();
  if (useRedis) {
    return redisHit(key, windowMs, max);
  }
  return Promise.resolve(memoryHit(key, windowMs, max));
}

function resetMemoryStoreForTests() {
  memoryBuckets.clear();
}

module.exports = { checkRateLimit, resetMemoryStoreForTests, getRedisClient };
