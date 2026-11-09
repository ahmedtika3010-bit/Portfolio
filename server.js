const fs = require('fs');
const path = require('path');

// Optional .env (PORT, ADMIN_PASSWORD, SITE_URL, ...). Real environment variables win.
try {
  process.loadEnvFile(path.join(__dirname, '.env'));
} catch {
  /* no .env file — that's fine */
}

const express = require('express');
const helmet = require('helmet');
const compression = require('compression');
const cookieParser = require('cookie-parser');

const db = require('./src/db');
const files = require('./src/files');
const auth = require('./src/auth');
const store = require('./src/store');
const { renderIndex } = require('./src/render');
const publicRoutes = require('./src/routes/public');
const adminRoutes = require('./src/routes/admin');

const PROD = process.env.NODE_ENV === 'production';
const ON_VERCEL = Boolean(process.env.VERCEL);
const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || (PROD ? '0.0.0.0' : '127.0.0.1');
const PUBLIC_DIR = path.join(__dirname, 'public');
// Read at start-up (not per request) so the file is bundled with the serverless function.
const ADMIN_HTML = fs.readFileSync(path.join(__dirname, 'views', 'admin.html'), 'utf8');

// First request (or first start): create the starter content and the admin account.
// Memoised, and retried if it fails (e.g. the database isn't connected yet).
let booted = null;
let firstRun = null;
function boot() {
  booted ??= (async () => {
    db.assertConfigured();
    await store.init();
    firstRun = await auth.init();
  })().catch((err) => {
    booted = null;
    throw err;
  });
  return booted;
}

const app = express();
app.disable('x-powered-by');
if (process.env.TRUST_PROXY) app.set('trust proxy', /^\d+$/.test(process.env.TRUST_PROXY) ? Number(process.env.TRUST_PROXY) : process.env.TRUST_PROXY);
else if (ON_VERCEL) app.set('trust proxy', 1);

app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        'script-src': ["'self'"],
        'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        'font-src': ["'self'", 'https://fonts.gstatic.com'],
        'img-src': ["'self'", 'data:', 'https:'],
        'connect-src': ["'self'"],
        'frame-ancestors': ["'none'"],
        'upgrade-insecure-requests': PROD ? [] : null,
      },
    },
    crossOriginEmbedderPolicy: false,
  }),
);
app.use(compression());
app.use(cookieParser());
app.use(express.json({ limit: '100kb' }));
app.use(async (req, res, next) => {
  await boot();
  next();
});

// --- pages --------------------------------------------------------------------------

const BOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|headless|lighthouse/i;

app.get('/', async (req, res) => {
  const countView = !BOT.test(req.get('user-agent') || '');
  // A failed counter must never break the page.
  const [html] = await Promise.all([renderIndex(req), countView && store.recordView().catch(() => {})]);
  res.set('Cache-Control', 'no-cache').type('html').send(html);
});

app.get('/admin', (req, res) => {
  res.set({ 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' }).type('html').send(ADMIN_HTML);
});

// --- api ----------------------------------------------------------------------------

app.use('/api/admin', (req, res, next) => {
  res.set('X-Robots-Tag', 'noindex, nofollow');
  next();
}, adminRoutes);
app.use('/api', publicRoutes);

// --- static -------------------------------------------------------------------------

// On Vercel, public/ is served by the CDN and express.static is ignored, so this only
// matters locally. Uploads are served from disk locally and from Vercel Blob when deployed.
if (!ON_VERCEL) {
  app.use('/uploads', express.static(files.UPLOAD_DIR, { maxAge: '365d', immutable: true, index: false, dotfiles: 'ignore' }));
  app.use(express.static(PUBLIC_DIR, { index: false, dotfiles: 'ignore' }));
}

// --- errors -------------------------------------------------------------------------

const page = (title, body) =>
  '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
  `<title>${title}</title><body style="font-family:system-ui;background:#0a0e1a;color:#e8ecf6;display:grid;place-items:center;min-height:100vh;margin:0;padding:24px;text-align:center;line-height:1.6">${body}`;

app.use((req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'Not found' });
  res.status(404).type('html').send(
    page('Not found',
      '<div><h1 style="font-size:5rem;margin:0;background:linear-gradient(120deg,#8b7bff,#2fd4bd);-webkit-background-clip:text;color:transparent">404</h1>' +
        '<p>This page does not exist.</p><a style="color:#8b7bff" href="/">Back to the portfolio</a></div>'),
  );
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  let status = err.status || err.statusCode || (err.name === 'MulterError' ? 400 : 500);
  let message = status < 500 || err.expose ? err.message : 'Something went wrong';
  if (err.type === 'entity.parse.failed') [status, message] = [400, 'Invalid JSON'];
  if (err.code === 'LIMIT_FILE_SIZE') [status, message] = [400, `File is too large (max ${Math.round(files.MAX_BYTES / 1048576)} MB)`];
  if (status >= 500 && !err.expose) console.error(err);

  if (err.code === 'NOT_CONFIGURED' && !req.path.startsWith('/api/')) {
    return res.status(503).type('html').send(
      page('Setup needed',
        '<div style="max-width:520px"><h1 style="margin:0 0 8px">Almost there</h1>' +
          `<p style="color:#a0aac2">${message.replace(/[<>&]/g, '')}</p></div>`),
    );
  }
  res.status(status).json({ error: message });
});

// Vercel imports this file and uses the exported app; locally we start a server.
module.exports = app;

if (require.main === module && !ON_VERCEL) {
  boot()
    .then(() => {
      app.listen(PORT, HOST, (err) => {
        // Express 5 hands listen errors (e.g. port already in use) to this callback.
        if (err) {
          console.error(err.code === 'EADDRINUSE' ? `\n  Port ${PORT} is already in use. Stop the other process or set PORT in .env.\n` : err);
          process.exit(1);
        }
        const where = `http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`;
        console.log(`\n  Portfolio   ${where}`);
        console.log(`  Admin       ${where}/admin`);
        console.log(`  Storage     ${db.kind === 'redis' ? 'Upstash Redis' : 'local files (./data)'}${files.useBlob ? ' + Vercel Blob' : ''}`);
        if (firstRun) {
          console.log('\n  ------------------------------------------------------');
          console.log('  First run: admin account created');
          console.log(`    username: ${firstRun.username}`);
          console.log(`    password: ${firstRun.password}${firstRun.generated ? '   (generated - shown only once, save it!)' : ''}`);
          console.log('  Change it later in Admin > Settings > Account.');
          console.log('  ------------------------------------------------------');
        }
        console.log();
      });
    })
    .catch((err) => {
      console.error(`\n  ${err.message}\n`);
      process.exit(1);
    });
}
