// Single source of truth: the server validates with it, and the admin UI
// builds its forms from it (served through /api/admin/bootstrap).

const SOCIAL_PLATFORMS = [
  'github', 'linkedin', 'twitter', 'facebook', 'instagram', 'youtube',
  'behance', 'dribbble', 'telegram', 'whatsapp', 'website', 'email',
];

const SERVICE_ICONS = [
  'code', 'server', 'layout', 'smartphone', 'database', 'cloud',
  'shield', 'zap', 'palette', 'rocket', 'layers', 'terminal',
];

const text = (label, extra = {}) => ({ type: 'text', label, max: 120, ...extra });
const area = (label, extra = {}) => ({ type: 'textarea', label, max: 3000, ...extra });

const collections = {
  projects: {
    label: 'Projects',
    singular: 'Project',
    icon: 'folder',
    title: 'title',
    subtitle: ['summary'],
    addToStart: true,
    fields: {
      title: text('Title', { required: true, max: 80, placeholder: 'e.g. Realtime Analytics Dashboard' }),
      summary: text('Short summary', { max: 180, placeholder: 'One sentence shown on the card' }),
      description: area('Full description', { max: 2500, hint: 'Shown in the project popup. Blank line = new paragraph.' }),
      image: { type: 'image', label: 'Cover image', hint: 'Recommended 1600×1000. Leave empty for a generated cover.' },
      tags: { type: 'tags', label: 'Tech stack', hint: 'Press Enter after each one — also used for the filter buttons.' },
      liveUrl: { type: 'url', label: 'Live demo URL' },
      repoUrl: { type: 'url', label: 'Source code URL' },
      featured: { type: 'boolean', label: 'Featured', hint: 'Featured projects get a highlighted badge.' },
    },
  },
  skills: {
    label: 'Skills',
    singular: 'Skill',
    icon: 'zap',
    title: 'name',
    subtitle: ['category', 'level'],
    fields: {
      name: text('Skill', { required: true, max: 40, placeholder: 'e.g. React' }),
      category: text('Category', { required: true, max: 40, placeholder: 'e.g. Frontend', suggest: 'category' }),
      level: { type: 'number', label: 'Proficiency', min: 0, max: 100, step: 5, suffix: '%', default: 80 },
    },
  },
  services: {
    label: 'Services',
    singular: 'Service',
    icon: 'layers',
    title: 'title',
    subtitle: ['description'],
    fields: {
      title: text('Title', { required: true, max: 60 }),
      description: area('Description', { max: 300 }),
      icon: { type: 'select', label: 'Icon', options: SERVICE_ICONS, default: 'code' },
    },
  },
  experience: {
    label: 'Experience',
    singular: 'Entry',
    icon: 'briefcase',
    title: 'role',
    subtitle: ['company', 'period'],
    fields: {
      kind: { type: 'select', label: 'Type', options: ['work', 'education'], default: 'work' },
      role: text('Role / Degree', { required: true, max: 80 }),
      company: text('Company / School', { required: true, max: 80 }),
      period: text('Period', { max: 40, placeholder: '2022 — Present' }),
      description: area('Description', { max: 800, hint: 'Blank line = new paragraph.' }),
    },
  },
  certificates: {
    label: 'Certificates',
    singular: 'Certificate',
    icon: 'award',
    title: 'title',
    subtitle: ['issuer', 'date'],
    addToStart: true,
    fields: {
      title: text('Certificate title', { required: true, max: 100, placeholder: 'e.g. Full Stack Web Development' }),
      issuer: text('Issued by', { required: true, max: 80, placeholder: 'e.g. Coursera, Udemy, ITI', suggest: 'issuer' }),
      kind: { type: 'select', label: 'Type', options: ['certificate', 'course', 'bootcamp', 'award', 'badge'], default: 'certificate' },
      date: text('Date', { max: 30, placeholder: 'Mar 2025' }),
      image: { type: 'image', label: 'Certificate image', hint: 'A photo or screenshot of the certificate (landscape works best). Leave empty for a generated card.' },
      credentialUrl: { type: 'url', label: 'Verification link', hint: 'Lets employers verify it — Credly, Coursera, Udemy, LinkedIn…' },
      credentialId: text('Credential ID', { max: 60 }),
      skills: { type: 'tags', label: 'Skills covered', hint: 'Press Enter after each one. The first 3 show on the card.' },
    },
  },
  stats: {
    label: 'Stats',
    singular: 'Stat',
    icon: 'bar-chart',
    title: 'label',
    subtitle: ['value', 'suffix'],
    fields: {
      label: text('Label', { required: true, max: 40, placeholder: 'Years of experience' }),
      value: { type: 'number', label: 'Value', min: 0, max: 1000000, step: 1, default: 1 },
      suffix: text('Suffix', { max: 6, placeholder: '+' }),
    },
  },
  socials: {
    label: 'Social links',
    singular: 'Link',
    icon: 'link',
    title: 'platform',
    subtitle: ['url'],
    fields: {
      platform: { type: 'select', label: 'Platform', options: SOCIAL_PLATFORMS, default: 'github' },
      url: { type: 'url', label: 'URL', required: true, hint: 'For email use mailto:you@example.com' },
    },
  },
};

const singletons = {
  profile: {
    label: 'Profile',
    fields: {
      name: text('Full name', { required: true, max: 60 }),
      role: text('Job title', { required: true, max: 80, placeholder: 'Full Stack Developer' }),
      headline: area('Hero headline', { max: 240, rows: 3, hint: 'The sentence under your name on the home page.' }),
      roles: { type: 'tags', label: 'Typing animation words', hint: 'Cycled in the hero, e.g. "APIs", "Web apps", "Dashboards".' },
      avatar: { type: 'image', label: 'Profile photo' },
      about: area('About me', { max: 3000, rows: 7, hint: 'Blank line = new paragraph.' }),
      location: text('Location', { max: 60, placeholder: 'Cairo, Egypt' }),
      email: { type: 'email', label: 'Public email' },
      phone: text('Phone', { max: 30 }),
      resume: { type: 'file', label: 'Résumé / CV (PDF)', hint: 'Shows a "Download CV" button when set.' },
      available: { type: 'boolean', label: 'Available for work', default: true },
      availabilityText: text('Availability text', { max: 60, placeholder: 'Available for new projects' }),
    },
  },
  settings: {
    label: 'Site settings',
    fields: {
      siteTitle: text('Site title (browser tab)', { required: true, max: 80 }),
      description: area('SEO description', { max: 300, rows: 3, hint: 'Shown by Google and when the link is shared.' }),
      accentFrom: { type: 'color', label: 'Accent colour — start', default: '#8b7bff' },
      accentTo: { type: 'color', label: 'Accent colour — end', default: '#2fd4bd' },
      defaultTheme: { type: 'select', label: 'Default theme', options: ['system', 'dark', 'light'], default: 'dark' },
      footerText: text('Footer text', { max: 120 }),
      showAbout: { type: 'boolean', label: 'Show “About”', default: true },
      showSkills: { type: 'boolean', label: 'Show “Skills”', default: true },
      showServices: { type: 'boolean', label: 'Show “Services”', default: true },
      showProjects: { type: 'boolean', label: 'Show “Projects”', default: true },
      showExperience: { type: 'boolean', label: 'Show “Experience”', default: true },
      showCertificates: { type: 'boolean', label: 'Show “Certificates”', default: true },
      showContact: { type: 'boolean', label: 'Show “Contact”', default: true },
    },
  },
};

class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.status = 400;
  }
}

const HEX = /^#[0-9a-f]{6}$/i;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const UPLOAD = /^\/uploads\/[\w.-]+$/;

function isSafeUrl(value, { allowMailto = true } = {}) {
  if (UPLOAD.test(value)) return true;
  try {
    const { protocol } = new URL(value);
    return protocol === 'https:' || protocol === 'http:' || (allowMailto && (protocol === 'mailto:' || protocol === 'tel:'));
  } catch {
    return false;
  }
}

function clean(key, def, raw) {
  const label = def.label || key;
  const empty = raw === undefined || raw === null || raw === '' || (Array.isArray(raw) && raw.length === 0);

  switch (def.type) {
    case 'boolean':
      return raw === true || raw === 'true' || raw === 1;

    case 'number': {
      if (empty) {
        if (def.required) throw new ValidationError(`${label} is required`);
        return def.default ?? 0;
      }
      const n = Number(raw);
      if (!Number.isFinite(n)) throw new ValidationError(`${label} must be a number`);
      return Math.min(def.max ?? Infinity, Math.max(def.min ?? -Infinity, Math.round(n)));
    }

    case 'tags': {
      if (empty) return [];
      if (!Array.isArray(raw)) throw new ValidationError(`${label} must be a list`);
      const seen = new Set();
      const tags = [];
      for (const item of raw) {
        const tag = String(item).trim().slice(0, 30);
        if (tag && !seen.has(tag.toLowerCase())) {
          seen.add(tag.toLowerCase());
          tags.push(tag);
        }
      }
      return tags.slice(0, 20);
    }

    case 'select': {
      if (empty) return def.default ?? def.options[0];
      if (!def.options.includes(raw)) throw new ValidationError(`${label} has an invalid value`);
      return raw;
    }

    case 'color': {
      if (empty) return def.default;
      if (!HEX.test(raw)) throw new ValidationError(`${label} must be a hex colour like #8b7bff`);
      return String(raw).toLowerCase();
    }

    default: {
      // text, textarea, url, email, image, file
      if (empty) {
        if (def.required) throw new ValidationError(`${label} is required`);
        return '';
      }
      if (typeof raw !== 'string') throw new ValidationError(`${label} must be text`);
      const value = raw.trim();
      if (def.max && value.length > def.max) throw new ValidationError(`${label} is too long (max ${def.max} characters)`);
      if (def.type === 'email' && !EMAIL.test(value)) throw new ValidationError(`${label} is not a valid email`);
      if (['url', 'image', 'file'].includes(def.type)) {
        if (!isSafeUrl(value, { allowMailto: def.type === 'url' })) throw new ValidationError(`${label} must be an http(s) link or an uploaded file`);
      }
      return value;
    }
  }
}

// Returns a new object holding only the fields declared in `fields`.
function sanitize(fields, input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new ValidationError('Invalid payload');
  const out = {};
  for (const [key, def] of Object.entries(fields)) out[key] = clean(key, def, input[key]);
  return out;
}

function defaultsOf(fields) {
  const out = {};
  for (const [key, def] of Object.entries(fields)) {
    out[key] = def.default ?? (def.type === 'boolean' ? false : def.type === 'tags' ? [] : def.type === 'number' ? 0 : '');
  }
  return out;
}

module.exports = { collections, singletons, sanitize, defaultsOf, ValidationError, EMAIL, HEX };
