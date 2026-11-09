// Fills views/index.html with the current content so the page paints complete
// on first load (good for SEO + no empty flash), then the client script takes over.
//
// The template lives in views/, not public/: on Vercel everything in public/ is served
// straight from the CDN, which would skip this step and show the raw {{placeholders}}.
const fs = require('fs');
const path = require('path');
const store = require('./store');

const TEMPLATE = path.join(__dirname, '..', 'views', 'index.html');
const loadTemplate = () => fs.readFileSync(TEMPLATE, 'utf8');
// Read once in production, on every request while developing so edits show without a restart.
const template = process.env.NODE_ENV === 'production' || process.env.VERCEL ? loadTemplate() : null;

const esc = (value) =>
  String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// Safe to put inside <script type="application/json">.
const safeJson = (value) =>
  JSON.stringify(value).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');

// Dark text on light accents, white text on dark ones (WCAG relative luminance).
function inkFor(...colors) {
  const lum = (hex) => {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
    const lin = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  };
  const avg = colors.reduce((sum, c) => sum + lum(c), 0) / colors.length;
  return avg > 0.28 ? '#0b1020' : '#ffffff';
}

async function renderIndex(req) {
  const data = await store.publicContent();
  const { profile, settings } = data;
  // Vercel gives every project a stable production domain; prefer it so preview URLs don't become canonical.
  const vercelUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL && `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  const base = (process.env.SITE_URL || vercelUrl || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
  const absolute = (url) => (url ? (/^https?:/.test(url) ? url : base + url) : '');
  const image = absolute(profile.avatar);

  const sameAs = data.socials.filter((s) => /^https?:/.test(s.url)).map((s) => s.url);
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: profile.name,
    jobTitle: profile.role,
    url: base,
    ...(image && { image }),
    ...(sameAs.length && { sameAs }),
  };

  // Until the owner replaces the starter email, the page still shows made-up sample content,
  // so keep search engines away from it.
  const isPlaceholder = profile.email === 'hello@example.com';

  const meta = [
    isPlaceholder && `<meta name="robots" content="noindex, nofollow">`,
    `<meta name="description" content="${esc(settings.description)}">`,
    `<meta property="og:type" content="website">`,
    `<meta property="og:title" content="${esc(settings.siteTitle)}">`,
    `<meta property="og:description" content="${esc(settings.description)}">`,
    `<meta property="og:url" content="${esc(base)}/">`,
    image && `<meta property="og:image" content="${esc(image)}">`,
    `<meta name="twitter:card" content="${image ? 'summary_large_image' : 'summary'}">`,
    `<link rel="canonical" href="${esc(base)}/">`,
    `<script type="application/ld+json">${safeJson(jsonLd)}</script>`,
  ]
    .filter(Boolean)
    .join('\n    ');

  const vars = `:root{--accent:${settings.accentFrom};--accent-2:${settings.accentTo};--on-accent:${inkFor(settings.accentFrom, settings.accentTo)}}`;

  return (template ?? loadTemplate())
    .replace('{{TITLE}}', esc(settings.siteTitle))
    .replace('{{DEFAULT_THEME}}', esc(settings.defaultTheme))
    .replace('<!--META-->', () => meta)
    .replace('/*THEME_VARS*/', () => vars)
    .replace('<!--DATA-->', () => `<script type="application/json" id="site-data">${safeJson(data)}</script>`);
}

module.exports = { renderIndex };
