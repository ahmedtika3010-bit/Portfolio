// Single-admin authentication: bcrypt password + signed JWT in an httpOnly cookie.
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./db');
const { ValidationError } = require('./schema');

const COOKIE = 'pf_admin';
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

const record = () => db.read('auth');

// Creates the admin account on first run. The password comes from ADMIN_PASSWORD or is
// generated, and is returned so the server can print it exactly once (locally only —
// a deployed site must set ADMIN_PASSWORD, there is nobody watching the console).
async function init() {
  const existing = await record();
  if (existing?.hash) return null;

  const fromEnv = process.env.ADMIN_PASSWORD;
  if (db.serverless && !fromEnv) {
    throw db.notConfigured('Set the ADMIN_PASSWORD environment variable in your Vercel project settings, then redeploy.');
  }

  const password = fromEnv || crypto.randomBytes(9).toString('base64url');
  const username = process.env.ADMIN_USERNAME || 'admin';
  const created = await db.writeIfAbsent('auth', {
    username,
    hash: await bcrypt.hash(password, 12),
    secret: crypto.randomBytes(48).toString('hex'),
    version: 1,
  });
  // Two cold starts can race on a brand-new site; only the one that wrote the record reports it.
  return created ? { username, password, generated: !fromEnv } : null;
}

// A constant hash so unknown usernames cost the same time as wrong passwords.
const DUMMY_HASH = '$2b$12$AxxMpnh4TsQfoobB0VUoDuDiOINi7QZ8Y26nhPuPKiykcGFDevdim';

async function verify(username, password) {
  const auth = await record();
  const okUser = Boolean(auth) && typeof username === 'string' && username.toLowerCase() === auth.username.toLowerCase();
  const okPass = await bcrypt.compare(String(password || ''), okUser ? auth.hash : DUMMY_HASH);
  return okUser && okPass;
}

async function issue(res) {
  const auth = await record();
  const token = jwt.sign({ u: auth.username, v: auth.version }, auth.secret, { expiresIn: '7d' });
  res.cookie(COOKIE, token, {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    maxAge: MAX_AGE_MS,
    path: '/',
  });
}

const clear = (res) => res.clearCookie(COOKIE, { path: '/' });

async function session(req) {
  const token = req.cookies?.[COOKIE];
  if (!token) return null;
  try {
    const auth = await record();
    if (!auth) return null;
    const payload = jwt.verify(token, auth.secret, { algorithms: ['HS256'] });
    return payload.v === auth.version ? { username: auth.username } : null;
  } catch {
    return null;
  }
}

async function require_(req, res, next) {
  const s = await session(req);
  if (!s) return res.status(401).json({ error: 'Please sign in' });
  req.admin = s;
  next();
}

async function changeCredentials({ current, username, password }) {
  const auth = await record();
  if (!(await verify(auth.username, current))) throw new ValidationError('Current password is wrong');
  if (username !== undefined && username !== '') {
    if (!/^[\w.@-]{3,40}$/.test(username)) throw new ValidationError('Username must be 3–40 letters, numbers or . _ - @');
    auth.username = username;
  }
  if (password) {
    if (password.length < 8) throw new ValidationError('New password must be at least 8 characters');
    auth.hash = await bcrypt.hash(password, 12);
  }
  auth.version += 1; // signs out every other session
  await db.write('auth', auth);
  return auth.username;
}

module.exports = { init, verify, issue, clear, session, require: require_, changeCredentials };
