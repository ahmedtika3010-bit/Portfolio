const crypto = require('crypto');
const express = require('express');
const multer = require('multer');
const rateLimit = require('express-rate-limit');
const auth = require('../auth');
const db = require('../db');
const files = require('../files');
const store = require('../store');
const { collections, singletons, ValidationError } = require('../schema');

const router = express.Router();

router.use((req, res, next) => {
  res.set('Cache-Control', 'no-store');
  // Browsers never add this header cross-site without a CORS preflight, which we don't allow.
  if (req.method !== 'GET' && req.get('X-Requested-With') !== 'portfolio-admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
});

// --- session ------------------------------------------------------------------------

const loginStore = db.limiterStore('login');
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true, // only failed sign-ins count towards the limit
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many attempts. Try again in a few minutes.' },
  ...(loginStore && { store: loginStore }),
});

router.post('/login', loginLimiter, async (req, res) => {
  const { username, password } = req.body || {};
  if (!(await auth.verify(username, password))) return res.status(401).json({ error: 'Wrong username or password' });
  await auth.issue(res);
  res.json({ ok: true });
});

router.post('/logout', (req, res) => {
  auth.clear(res);
  res.json({ ok: true });
});

// Always 200 so the login page loads without a red "401" in the browser console.
router.get('/me', async (req, res) => {
  const s = await auth.session(req);
  res.json(s ? { authenticated: true, username: s.username } : { authenticated: false });
});

// Everything below needs a valid session.
router.use(auth.require);

router.get('/bootstrap', async (req, res) => {
  const [content, unread, traffic] = await Promise.all([store.publicContent(), store.unreadCount(), store.trafficSummary()]);
  res.json({
    username: req.admin.username,
    schema: { collections, singletons },
    content,
    unread,
    traffic,
    limits: { upload: files.MAX_BYTES },
  });
});

router.post('/account', async (req, res) => {
  const { current, username, password } = req.body || {};
  const name = await auth.changeCredentials({ current, username, password });
  await auth.issue(res); // the version bump invalidated the old cookie
  res.json({ username: name });
});

// --- profile & settings -------------------------------------------------------------

router.put('/singleton/:name', async (req, res) => {
  if (!singletons[req.params.name]) return res.status(404).json({ error: 'Not found' });
  res.json(await store.updateSingleton(req.params.name, req.body));
});

// --- collections --------------------------------------------------------------------

router.post('/c/:name', async (req, res) => res.status(201).json(await store.createItem(req.params.name, req.body)));
router.put('/c/:name/reorder', async (req, res) => {
  await store.reorder(req.params.name, req.body?.ids);
  res.json({ ok: true });
});
router.put('/c/:name/:id', async (req, res) => res.json(await store.updateItem(req.params.name, req.params.id, req.body)));
router.delete('/c/:name/:id', async (req, res) => {
  await store.deleteItem(req.params.name, req.params.id);
  res.json({ ok: true });
});

// --- messages -----------------------------------------------------------------------

router.get('/messages', async (req, res) => res.json(await store.listMessages()));
router.patch('/messages/:id', async (req, res) => res.json(await store.setMessageRead(req.params.id, req.body?.read)));
router.delete('/messages/:id', async (req, res) => {
  await store.deleteMessage(req.params.id);
  res.json({ ok: true });
});

// --- uploads ------------------------------------------------------------------------

// The extension is decided by what the bytes actually are, never by the file name.
const SIGNATURES = [
  { ext: 'png', kind: 'image', test: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  { ext: 'jpg', kind: 'image', test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { ext: 'gif', kind: 'image', test: (b) => b.subarray(0, 4).toString('latin1') === 'GIF8' },
  { ext: 'webp', kind: 'image', test: (b) => b.subarray(0, 4).toString('latin1') === 'RIFF' && b.subarray(8, 12).toString('latin1') === 'WEBP' },
  { ext: 'pdf', kind: 'file', test: (b) => b.subarray(0, 5).toString('latin1') === '%PDF-' },
];

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: files.MAX_BYTES, files: 1 } });

router.post('/upload', upload.single('file'), async (req, res) => {
  if (!req.file) throw new ValidationError('No file received');
  const kind = req.query.kind === 'file' ? 'file' : 'image';
  const match = SIGNATURES.find((sig) => sig.test(req.file.buffer));
  if (!match || match.kind !== kind) {
    throw new ValidationError(kind === 'file' ? 'Please upload a PDF file' : 'Please upload a PNG, JPG, WEBP or GIF image');
  }
  res.status(201).json({ url: await files.save(req.file.buffer, match.ext) });
});

module.exports = router;
