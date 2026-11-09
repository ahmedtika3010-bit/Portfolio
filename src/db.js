// Storage layer with two interchangeable drivers:
//
//   file   – JSON files in ./data (local development). Cached in memory, written atomically.
//   redis  – Upstash Redis over its REST API (Vercel). Nothing is cached between requests
//            because every serverless instance must see the same data.
//
// The driver is picked from the environment, so the rest of the app never cares which one runs.
const fs = require('fs');
const path = require('path');

const REDIS_URL = (process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || '').replace(/\/$/, '');
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || '';

const kind = REDIS_URL && REDIS_TOKEN ? 'redis' : 'file';
const serverless = Boolean(process.env.VERCEL);

function notConfigured(message) {
  return Object.assign(new Error(message), { code: 'NOT_CONFIGURED', status: 503, expose: true });
}

// Vercel has a read-only filesystem, so it can only run with the Redis driver.
function assertConfigured() {
  if (serverless && kind !== 'redis') {
    throw notConfigured(
      'No database is connected. In Vercel open Storage, create an Upstash Redis database, connect it to this project, then redeploy.',
    );
  }
}

// ---------------------------------------------------------------- file driver --

const DATA_DIR = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(__dirname, '..', 'data');
const fileDriver = (() => {
  const cache = new Map();
  let counters = null;
  let flushTimer = null;

  const fileOf = (name) => path.join(DATA_DIR, `${name}.json`);

  function writeAtomic(name, value) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    const target = fileOf(name);
    const tmp = `${target}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(value, null, 2));
    fs.renameSync(tmp, target);
  }

  function readFile(name) {
    try {
      return JSON.parse(fs.readFileSync(fileOf(name), 'utf8'));
    } catch (err) {
      if (err.code !== 'ENOENT') console.error(`[db] could not read ${name}.json:`, err.message);
      return null;
    }
  }

  const loadCounters = () => (counters ??= readFile('counters') || {});

  return {
    async read(name) {
      if (!cache.has(name)) {
        const value = readFile(name);
        if (value === null) return null;
        cache.set(name, value);
      }
      return cache.get(name);
    },
    async write(name, value) {
      cache.set(name, value);
      writeAtomic(name, value);
    },
    async writeIfAbsent(name, value) {
      if ((await this.read(name)) !== null) return false;
      await this.write(name, value);
      return true;
    },
    async incr(keys) {
      const all = loadCounters();
      const results = keys.map((key) => (all[key] = (all[key] || 0) + 1));
      if (!flushTimer) {
        flushTimer = setTimeout(() => {
          flushTimer = null;
          // keep only the last 90 days of daily counters
          const daily = Object.keys(all).filter((k) => k.startsWith('traffic:d:')).sort();
          for (const k of daily.slice(0, Math.max(0, daily.length - 90))) delete all[k];
          writeAtomic('counters', all);
        }, 5000);
        flushTimer.unref();
      }
      return results;
    },
    async getMany(keys) {
      const all = loadCounters();
      return keys.map((key) => all[key] || 0);
    },
  };
})();

// --------------------------------------------------------------- redis driver --

const PREFIX = 'portfolio:';

const redisDriver = (() => {
  async function send(route, body) {
    let res;
    try {
      res = await fetch(`${REDIS_URL}${route}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${REDIS_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    } catch (err) {
      throw new Error(`Database unreachable: ${err.message}`);
    }
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(`Database error (${res.status}): ${json.error || res.statusText}`);
    return json;
  }

  // Several commands in one round trip. Returns each command's result, throws on the first error.
  async function exec(commands) {
    const replies = await send('/pipeline', commands);
    return replies.map((reply) => {
      if (reply.error) throw new Error(`Database error: ${reply.error}`);
      return reply.result;
    });
  }
  const cmd = async (...args) => (await exec([args]))[0];

  return {
    exec,
    cmd,
    async read(name) {
      const raw = await cmd('GET', PREFIX + name);
      return raw == null ? null : JSON.parse(raw);
    },
    async write(name, value) {
      await cmd('SET', PREFIX + name, JSON.stringify(value));
    },
    async writeIfAbsent(name, value) {
      return (await cmd('SET', PREFIX + name, JSON.stringify(value), 'NX')) === 'OK';
    },
    async incr(keys, ttlSeconds) {
      const commands = keys.map((key) => ['INCR', PREFIX + key]);
      if (ttlSeconds) keys.forEach((key) => commands.push(['EXPIRE', PREFIX + key, ttlSeconds]));
      return (await exec(commands)).slice(0, keys.length);
    },
    async getMany(keys) {
      return (await cmd('MGET', ...keys.map((key) => PREFIX + key))).map((v) => Number(v) || 0);
    },
  };
})();

const driver = kind === 'redis' ? redisDriver : fileDriver;

// A rate-limit store shared by every serverless instance (the default store is per-process,
// which is useless when each request can land on a different instance). Local dev keeps the
// built-in in-memory store, so this returns undefined there.
function limiterStore(name) {
  if (kind !== 'redis') return undefined;
  const keyOf = (key) => `${PREFIX}rl:${name}:${key}`;
  let windowMs = 60 * 1000;
  return {
    localKeys: false,
    prefix: `${PREFIX}rl:${name}:`,
    init(options) {
      windowMs = options.windowMs;
    },
    async increment(key) {
      const k = keyOf(key);
      const [totalHits, ttl] = await redisDriver.exec([['INCR', k], ['PTTL', k]]);
      let remaining = ttl;
      if (totalHits === 1 || ttl < 0) {
        await redisDriver.cmd('PEXPIRE', k, windowMs);
        remaining = windowMs;
      }
      return { totalHits, resetTime: new Date(Date.now() + remaining) };
    },
    async decrement(key) {
      await redisDriver.cmd('DECR', keyOf(key));
    },
    async resetKey(key) {
      await redisDriver.cmd('DEL', keyOf(key));
    },
  };
}

module.exports = {
  kind,
  serverless,
  assertConfigured,
  notConfigured,
  limiterStore,
  DATA_DIR,
  read: (name) => driver.read(name),
  write: (name, value) => driver.write(name, value),
  writeIfAbsent: (name, value) => driver.writeIfAbsent(name, value),
  incr: (keys, ttlSeconds) => driver.incr(keys, ttlSeconds),
  getMany: (keys) => driver.getMany(keys),
};
