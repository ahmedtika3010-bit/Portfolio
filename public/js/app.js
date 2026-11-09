// Portfolio front end. Content arrives inline as JSON (see render.js) and is
// built with DOM APIs only — user text is never parsed as HTML.
(() => {
  'use strict';

  const data = JSON.parse(document.getElementById('site-data').textContent);
  const { profile, settings, stats, socials, skills, services, projects, experience, certificates } = data;

  const root = document.documentElement;
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;

  const $ = (sel, scope = document) => scope.querySelector(sel);
  const $$ = (sel, scope = document) => [...scope.querySelectorAll(sel)];
  const paragraphs = (text) => String(text || '').split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const initials = (name) => (String(name).trim().split(/\s+/).map((w) => w[0]).join('').slice(0, 2) || '·').toUpperCase();
  const external = (href) => (/^https?:/.test(href) ? { target: '_blank', rel: 'noopener noreferrer' } : {});
  const stagger = (i, step = 0.08) => `--d:${Math.min(i * step, 0.6).toFixed(2)}s`;

  const SOCIAL_NAMES = {
    github: 'GitHub', linkedin: 'LinkedIn', twitter: 'X (Twitter)', facebook: 'Facebook', instagram: 'Instagram',
    youtube: 'YouTube', behance: 'Behance', dribbble: 'Dribbble', telegram: 'Telegram', whatsapp: 'WhatsApp',
    website: 'Website', email: 'Email',
  };

  const socialLinks = (className = 'socials') =>
    h('div', { class: className }, socials.map((s) =>
      h('a', { class: 'icon-btn', href: s.url, 'aria-label': SOCIAL_NAMES[s.platform] || s.platform, title: SOCIAL_NAMES[s.platform] || s.platform, ...external(s.url) }, icon(s.platform, 18)),
    ));

  const sections = [
    { id: 'home', label: 'Home', on: true },
    { id: 'about', label: 'About', on: settings.showAbout && (profile.about || stats.length) },
    { id: 'skills', label: 'Skills', on: settings.showSkills && skills.length },
    { id: 'services', label: 'Services', on: settings.showServices && services.length },
    { id: 'projects', label: 'Projects', on: settings.showProjects && projects.length },
    { id: 'experience', label: 'Experience', on: settings.showExperience && experience.length },
    { id: 'certificates', label: 'Certificates', on: settings.showCertificates && certificates.length },
    { id: 'contact', label: 'Contact', on: settings.showContact },
  ].filter((s) => s.on);
  const has = (id) => sections.some((s) => s.id === id);

  const sectionHead = (eyebrow, title, sub, center = false) =>
    h('div', { class: `section-head reveal${center ? ' center' : ''}` },
      h('span', { class: 'eyebrow' }, eyebrow),
      h('h2', { class: 'section-title' }, title),
      sub && h('p', { class: 'section-sub' }, sub));

  const accent = (text) => h('span', { class: 'grad-text' }, text);

  // Pill buttons that filter a grid. `options` = [{ value, label }], the first is active.
  function filterButtons(label, options, onPick) {
    return h('div', { class: 'filters reveal', role: 'group', 'aria-label': label },
      options.map((option, i) => h('button', {
        class: `filter${i === 0 ? ' active' : ''}`,
        type: 'button',
        'aria-pressed': String(i === 0),
        onclick: (e) => {
          $$('.filter', e.currentTarget.parentNode).forEach((b) => { b.classList.toggle('active', b === e.currentTarget); b.setAttribute('aria-pressed', String(b === e.currentTarget)); });
          onPick(option.value);
        },
      }, option.label)));
  }

  // One shared <dialog>; `open(...nodes)` swaps in new content.
  function createModal(label) {
    const body = h('div');
    const close = h('button', { class: 'icon-btn modal-close', type: 'button', 'aria-label': 'Close' }, icon('x', 18));
    const dialog = h('dialog', { class: 'modal', 'aria-label': label }, close, body);
    document.body.append(dialog);

    close.addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });
    dialog.addEventListener('close', () => { document.body.style.overflow = ''; });

    return {
      open(...nodes) {
        body.replaceChildren(...nodes);
        document.body.style.overflow = 'hidden';
        dialog.showModal();
        dialog.scrollTop = 0;
      },
    };
  }

  // ---------------------------------------------------------------- nav ----

  function buildNav() {
    const nav = $('#nav');
    const brand = h('a', { class: 'brand', href: '#home', 'aria-label': `${profile.name} — home` },
      h('span', { class: 'brand-mark' }, initials(profile.name)),
      h('span', { class: 'brand-name', dir: 'auto' }, profile.name));

    const links = h('ul', { class: 'nav-links', id: 'nav-links' },
      sections.map((s) => h('li', null, h('a', { href: `#${s.id}`, dataset: { id: s.id } }, s.label))));

    const themeBtn = h('button', { class: 'icon-btn', type: 'button' });
    const paintTheme = () => {
      const light = root.dataset.theme === 'light';
      themeBtn.replaceChildren(icon(light ? 'moon' : 'sun', 18));
      themeBtn.setAttribute('aria-label', light ? 'Switch to dark theme' : 'Switch to light theme');
      $('meta[name="theme-color"]')?.setAttribute('content', light ? '#f4f5fb' : '#080b16');
    };
    themeBtn.addEventListener('click', () => {
      const next = root.dataset.theme === 'light' ? 'dark' : 'light';
      root.dataset.theme = next;
      try { localStorage.setItem('pf-theme', next); } catch { /* storage blocked */ }
      paintTheme();
    });
    paintTheme();

    const burger = h('button', { class: 'icon-btn burger', type: 'button', 'aria-label': 'Open menu', 'aria-expanded': 'false', 'aria-controls': 'nav-links' }, icon('menu', 20));
    const setOpen = (open) => {
      nav.classList.toggle('open', open);
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      burger.replaceChildren(icon(open ? 'x' : 'menu', 20));
    };
    burger.addEventListener('click', () => setOpen(!nav.classList.contains('open')));
    links.addEventListener('click', (e) => e.target.closest('a') && setOpen(false));
    document.addEventListener('keydown', (e) => e.key === 'Escape' && setOpen(false));
    document.addEventListener('click', (e) => !nav.contains(e.target) && setOpen(false));

    nav.append(h('div', { class: 'container nav-inner' },
      brand,
      h('nav', { 'aria-label': 'Primary' }, links),
      h('div', { class: 'nav-actions' },
        themeBtn,
        has('contact') && h('a', { class: 'btn primary sm', href: '#contact' }, 'Hire me'),
        burger)));
  }

  // --------------------------------------------------------------- hero ----

  function typeRoles(el, words) {
    if (!words.length) return;
    if (reduceMotion || words.length === 1) { el.textContent = words[0]; return; }
    let w = 0, count = 0, deleting = false;
    const tick = () => {
      const letters = [...words[w]];
      count += deleting ? -1 : 1;
      el.textContent = letters.slice(0, count).join('');
      let delay = deleting ? 38 : 80;
      if (!deleting && count === letters.length) { deleting = true; delay = 1700; }
      else if (deleting && count === 0) { deleting = false; w = (w + 1) % words.length; delay = 380; }
      setTimeout(tick, delay);
    };
    tick();
  }

  const tk = (kind, text) => h('span', { class: `tk-${kind}` }, text);
  const codeLine = (indent, ...parts) => h('span', { class: `ln${indent ? ' ind' : ''}` }, ...parts);
  const prop = (key, value) => codeLine(true, tk('key', key), tk('p', ': '), value, tk('p', ','));

  function codeCard() {
    const top = [...skills].sort((a, b) => b.level - a.level).slice(0, 4).map((s) => s.name);
    const stack = top.flatMap((name, i) => [tk('str', JSON.stringify(name)), i < top.length - 1 && tk('p', ', ')]);
    return h('div', { class: 'code-card', id: 'code-card' },
      h('div', { class: 'code-bar' }, h('i'), h('i'), h('i'), h('span', null, 'developer.js')),
      h('div', { class: 'code-body', 'aria-hidden': 'true' },
        codeLine(false, tk('kw', 'const '), tk('var', 'developer'), tk('p', ' = {')),
        prop('name', tk('str', JSON.stringify(profile.name))),
        prop('role', tk('str', JSON.stringify(profile.role))),
        profile.location && prop('location', tk('str', JSON.stringify(profile.location))),
        top.length > 0 && codeLine(true, tk('key', 'stack'), tk('p', ': ['), ...stack, tk('p', '],')),
        prop('available', tk('bool', String(!!profile.available))),
        codeLine(false, tk('p', '};')),
        codeLine(false, tk('var', 'developer'), tk('p', '.'), tk('fn', 'shipGreatWork'), tk('p', '();'), h('span', { class: 'caret' }))));
  }

  const chip = (stat, cls, iconName) =>
    stat && h('div', { class: `float-chip ${cls}`, 'aria-hidden': 'true' },
      h('span', { class: 'glyph' }, icon(iconName, 18)),
      h('span', null, `${stat.value.toLocaleString('en-US')}${stat.suffix}`, h('small', null, stat.label)));

  function buildHero() {
    const typed = h('b', { class: 'typed' });
    const avatar = h('div', { class: 'avatar-ring' },
      profile.avatar
        ? h('img', { src: profile.avatar, alt: profile.name, width: 112, height: 112, decoding: 'async' })
        : h('div', { class: 'mono' }, initials(profile.name)));

    const section = h('section', { class: 'hero', id: 'home' },
      h('div', { class: 'container hero-grid' },
        h('div', { class: 'hero-copy' },
          profile.available && h('span', { class: 'pill reveal' }, h('i', { class: 'dot' }), profile.availabilityText || 'Available for work'),
          h('h1', { class: 'hero-title reveal', style: stagger(1) }, h('small', null, 'Hi, I’m'), accent(profile.name)),
          h('p', { class: 'hero-role reveal', style: stagger(2), dir: 'auto' }, profile.role, profile.roles.length > 0 && [' — I build ', typed]),
          profile.headline && h('p', { class: 'hero-lead reveal', style: stagger(3), dir: 'auto' }, profile.headline),
          h('div', { class: 'hero-cta reveal', style: stagger(4) },
            has('projects') && h('a', { class: 'btn primary', href: '#projects' }, 'View my work', icon('arrowRight', 18)),
            profile.resume
              ? h('a', { class: 'btn ghost', href: profile.resume, target: '_blank', rel: 'noopener', download: '' }, icon('download', 18), 'Download CV')
              : has('contact') && h('a', { class: 'btn ghost', href: '#contact' }, 'Get in touch')),
          socials.length > 0 && h('div', { class: 'reveal', style: stagger(5) }, socialLinks())),
        h('div', { class: 'hero-visual reveal', style: stagger(3) }, avatar, codeCard(), chip(stats[0], 'fc-1', 'briefcase'), chip(stats[1], 'fc-2', 'rocket'))));

    typeRoles(typed, profile.roles);
    return section;
  }

  function buildMarquee() {
    const names = [...new Set(skills.map((s) => s.name))];
    if (!names.length) return null;
    const group = () => {
      const items = [];
      while (items.length < 12) items.push(...names);
      return items.map((n) => h('span', null, n));
    };
    return h('div', { class: 'marquee', 'aria-hidden': 'true' }, h('div', { class: 'marquee-track' }, group(), group()));
  }

  // -------------------------------------------------------------- about ----

  function buildAbout() {
    const facts = [
      profile.location && { icon: 'pin', label: 'Location', value: profile.location },
      profile.email && { icon: 'email', label: 'Email', value: profile.email, href: `mailto:${profile.email}` },
      profile.phone && { icon: 'phone', label: 'Phone', value: profile.phone, href: `tel:${profile.phone.replace(/[^\d+]/g, '')}` },
      { icon: 'check', label: 'Status', value: profile.available ? profile.availabilityText || 'Available for work' : 'Currently booked' },
    ].filter(Boolean);

    const portrait = h('div', { class: 'card portrait reveal' },
      profile.avatar
        ? h('img', { src: profile.avatar, alt: `Portrait of ${profile.name}`, loading: 'lazy', decoding: 'async' })
        : h('div', { class: 'mono' }, accent(initials(profile.name))),
      profile.location && h('div', { class: 'tag' }, icon('pin', 18), profile.location));

    return h('section', { id: 'about' },
      h('div', { class: 'container about-grid' },
        portrait,
        h('div', { class: 'about-text' },
          sectionHead('About me', ['Crafting digital products with ', accent('care')]),
          h('div', { class: 'reveal', style: stagger(1) }, paragraphs(profile.about).map((p) => h('p', { dir: 'auto' }, p))),
          h('div', { class: 'facts reveal', style: stagger(2) }, facts.map((f) =>
            h('div', { class: 'fact' },
              h('span', { class: 'glyph' }, icon(f.icon, 18)),
              h('div', null, h('small', null, f.label), f.href ? h('b', null, h('a', { href: f.href }, f.value)) : h('b', null, f.value))))),
          stats.length > 0 && h('div', { class: 'stats' }, stats.map((s, i) =>
            h('div', { class: 'card stat reveal', style: stagger(i) },
              h('strong', { class: 'grad-text', dataset: { count: s.value, suffix: s.suffix } }, `0${s.suffix}`),
              h('span', null, s.label)))))));
  }

  // ------------------------------------------------------------- skills ----

  const categoryIcon = (name) => {
    const n = name.toLowerCase();
    if (/front|ui|web|design/.test(n)) return /design/.test(n) ? 'palette' : 'layout';
    if (/back|api|server/.test(n)) return 'server';
    if (/data|sql|storage/.test(n)) return 'database';
    if (/devops|cloud|ops|infra/.test(n)) return 'cloud';
    if (/mobile|app/.test(n)) return 'smartphone';
    if (/secur/.test(n)) return 'shield';
    if (/tool|other/.test(n)) return 'terminal';
    return 'code';
  };

  function buildSkills() {
    const groups = new Map();
    for (const s of skills) groups.set(s.category, [...(groups.get(s.category) || []), s]);

    return h('section', { id: 'skills' },
      h('div', { class: 'container' },
        sectionHead('Skills', ['The tools I ', accent('build with')], 'A snapshot of the technologies I use to bring ideas to life.', true),
        h('div', { class: `grid-3${groups.size === 2 || groups.size === 4 ? ' pair' : ''}` }, [...groups].map(([category, items], i) =>
          h('article', { class: 'card skill-card reveal', style: stagger(i) },
            h('div', { class: 'icon-tile' }, icon(categoryIcon(category), 24)),
            h('h3', { dir: 'auto' }, category),
            h('div', { class: 'count' }, `${items.length} ${items.length === 1 ? 'skill' : 'skills'}`),
            h('div', { class: 'skill-list' }, items.map((s) =>
              h('div', null,
                h('div', { class: 'skill-top' }, h('span', { dir: 'auto' }, s.name), h('span', { class: 'pct' }, `${s.level}%`)),
                h('div', { class: 'bar', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': s.level, 'aria-label': s.name },
                  h('i', { style: `--w:${s.level}%` }))))))))));
  }

  // ----------------------------------------------------------- services ----

  function buildServices() {
    return h('section', { id: 'services' },
      h('div', { class: 'container' },
        sectionHead('What I do', ['How I can ', accent('help you')], 'From the first idea to deployment — end-to-end development for modern web products.', true),
        h('div', { class: 'grid-4' }, services.map((s, i) =>
          h('article', { class: 'card service reveal', style: stagger(i) },
            h('div', { class: 'icon-tile' }, icon(s.icon, 24)),
            h('h3', { dir: 'auto' }, s.title),
            h('p', { dir: 'auto' }, s.description))))));
  }

  // ----------------------------------------------------------- projects ----

  const COVER_POS = [[20, 20, 85, 85], [80, 20, 15, 85], [25, 78, 80, 18], [72, 80, 20, 25]];

  const cover = (project, index) => {
    const [x1, y1, x2, y2] = COVER_POS[index % COVER_POS.length];
    return h('div', { class: 'cover' },
      project.featured && h('span', { class: 'badge' }, icon('star', 13), 'Featured'),
      project.image
        ? h('img', { src: project.image, alt: `${project.title} preview`, loading: 'lazy', decoding: 'async' })
        : h('div', { class: 'cover-gen', style: `--x1:${x1}%;--y1:${y1}%;--x2:${x2}%;--y2:${y2}%`, 'aria-hidden': 'true' },
          h('b', null, initials(project.title))));
  };

  const projectLinks = (project, cls = 'links') =>
    h('div', { class: cls },
      project.liveUrl && h('a', { class: 'icon-btn', href: project.liveUrl, 'aria-label': `${project.title} — live demo`, title: 'Live demo', onclick: (e) => e.stopPropagation(), ...external(project.liveUrl) }, icon('external', 17)),
      project.repoUrl && h('a', { class: 'icon-btn', href: project.repoUrl, 'aria-label': `${project.title} — source code`, title: 'Source code', onclick: (e) => e.stopPropagation(), ...external(project.repoUrl) }, icon('github', 17)));

  function buildProjects() {
    const grid = h('div', { class: `project-grid${projects.length === 2 || projects.length === 4 ? ' pair' : ''}` });
    const dialog = buildProjectDialog();

    const counts = new Map();
    for (const p of projects) for (const t of p.tags) counts.set(t, (counts.get(t) || 0) + 1);
    const tags = [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 6).map(([t]) => t);

    const card = (project, i, animateNow) => {
      const open = () => dialog.show(project, projects.indexOf(project));
      return h('article', {
        class: `card project reveal${animateNow ? ' in' : ''}`,
        style: stagger(i, 0.07),
        tabindex: 0,
        role: 'button',
        'aria-label': `${project.title} — view details`,
        onclick: open,
        onkeydown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } },
      },
        cover(project, projects.indexOf(project)),
        h('div', { class: 'project-body' },
          h('h3', { dir: 'auto' }, project.title),
          project.summary && h('p', { dir: 'auto' }, project.summary),
          project.tags.length > 0 && h('div', { class: 'tags' }, project.tags.slice(0, 4).map((t) => h('span', { class: 'tag-pill' }, t))),
          h('div', { class: 'project-foot' }, projectLinks(project), h('span', { class: 'more' }, 'Details', icon('arrowRight', 16)))));
    };

    const paint = (filter, animateNow) => {
      const list = filter === 'All' ? projects : projects.filter((p) => p.tags.includes(filter));
      grid.replaceChildren(...list.map((p, i) => card(p, i, animateNow)));
      if (!list.length) grid.append(h('p', { class: 'empty' }, 'No projects here yet.'));
    };

    const filterBar = tags.length > 1 && filterButtons('Filter projects', ['All', ...tags].map((tag) => ({ value: tag, label: tag })), (tag) => paint(tag, true));

    paint('All', false);

    return h('section', { id: 'projects' },
      h('div', { class: 'container' },
        sectionHead('Portfolio', ['Selected ', accent('work')], 'A few projects I’m proud of. Open any card to learn more.', true),
        filterBar, grid));
  }

  function buildProjectDialog() {
    const modal = createModal('Project details');
    return {
      show(project, index) {
        modal.open(
          cover(project, index),
          h('div', { class: 'modal-body' },
            h('h3', { dir: 'auto' }, project.title),
            paragraphs(project.description || project.summary).map((p) => h('p', { dir: 'auto' }, p)),
            project.tags.length > 0 && h('div', { class: 'tags' }, project.tags.map((t) => h('span', { class: 'tag-pill' }, t))),
            (project.liveUrl || project.repoUrl) && h('div', { class: 'hero-cta' },
              project.liveUrl && h('a', { class: 'btn primary', href: project.liveUrl, ...external(project.liveUrl) }, 'Live demo', icon('external', 17)),
              project.repoUrl && h('a', { class: 'btn ghost', href: project.repoUrl, ...external(project.repoUrl) }, icon('github', 17), 'Source code'))));
      },
    };
  }

  // --------------------------------------------------------- experience ----

  function buildExperience() {
    const kinds = ['work', 'education'].filter((k) => experience.some((e) => e.kind === k));
    const labels = { work: 'Experience', education: 'Education' };
    const wrap = h('div');
    const timeline = h('div', { class: 'timeline' });

    const paint = (kind, animateNow) => {
      timeline.replaceChildren(...experience.filter((e) => e.kind === kind).map((item, i) =>
        h('div', { class: `t-item reveal${animateNow ? ' in' : ''}`, style: stagger(i) },
          h('span', { class: 't-dot' }, icon(kind === 'work' ? 'briefcase' : 'cap', 20)),
          h('div', { class: 'card' },
            item.period && h('span', { class: 'period' }, item.period),
            h('h3', { dir: 'auto' }, item.role),
            h('div', { class: 'org', dir: 'auto' }, item.company),
            paragraphs(item.description).map((p) => h('p', { dir: 'auto' }, p))))));
    };

    if (kinds.length > 1) {
      const tabs = h('div', { class: 'tabs reveal', role: 'tablist' }, kinds.map((kind, i) => h('button', {
        class: `tab${i === 0 ? ' active' : ''}`,
        type: 'button',
        role: 'tab',
        'aria-selected': String(i === 0),
        onclick: (e) => {
          $$('.tab', tabs).forEach((b) => { b.classList.toggle('active', b === e.currentTarget); b.setAttribute('aria-selected', String(b === e.currentTarget)); });
          paint(kind, true);
        },
      }, labels[kind])));
      wrap.append(h('div', { style: { textAlign: 'center' } }, tabs));
    }
    paint(kinds[0], false);
    wrap.append(timeline);

    return h('section', { id: 'experience' },
      h('div', { class: 'container' },
        sectionHead('Journey', ['Experience & ', accent('education')], null, true),
        wrap));
  }

  // -------------------------------------------------------- certificates ----

  const KINDS = {
    certificate: { one: 'Certificate', many: 'Certificates' },
    course: { one: 'Course', many: 'Courses' },
    bootcamp: { one: 'Bootcamp', many: 'Bootcamps' },
    award: { one: 'Award', many: 'Awards' },
    badge: { one: 'Badge', many: 'Badges' },
  };
  const kindOf = (cert) => KINDS[cert.kind] || KINDS.certificate;

  // The uploaded certificate, or a generated "certificate paper" when there is none.
  const certMedia = (cert) => cert.image
    ? h('img', { src: cert.image, alt: `${cert.title} — ${cert.issuer}`, loading: 'lazy', decoding: 'async' })
    : h('div', { class: 'cert-gen', 'aria-hidden': 'true' },
      h('div', { class: 'frame' },
        h('span', { class: 'seal' }, icon('award', 26)),
        h('small', null, kindOf(cert).one),
        h('strong', { dir: 'auto' }, cert.title),
        h('small', { dir: 'auto' }, cert.issuer)));

  function credentialId(id) {
    const btn = h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Copy credential ID', title: 'Copy' }, icon('copy', 16));
    btn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(id);
        btn.replaceChildren(icon('check', 16));
        setTimeout(() => btn.replaceChildren(icon('copy', 16)), 1600);
      } catch { /* clipboard unavailable (e.g. plain http) */ }
    });
    return h('div', { class: 'cred-id' }, h('span', null, 'Credential ID'), h('code', null, id), btn);
  }

  function buildCertificates() {
    const modal = createModal('Certificate details');
    const issuers = [...new Set(certificates.map((c) => c.issuer))];
    const kinds = Object.keys(KINDS).filter((k) => certificates.some((c) => c.kind === k));
    const FIRST_PAGE = 6;
    let filter = 'all';
    let expanded = false;

    const grid = h('div', { class: 'cert-grid' });
    const more = h('div', { class: 'show-more' });

    const openCert = (cert) => modal.open(
      h('div', { class: 'cert-view' }, certMedia(cert)),
      h('div', { class: 'modal-body' },
        h('span', { class: 'eyebrow' }, kindOf(cert).one),
        h('h3', { dir: 'auto' }, cert.title),
        h('p', { dir: 'auto' }, [cert.issuer, cert.date].filter(Boolean).join(' · ')),
        cert.credentialId && credentialId(cert.credentialId),
        cert.skills.length > 0 && h('div', { class: 'tags' }, cert.skills.map((s) => h('span', { class: 'tag-pill' }, s))),
        cert.credentialUrl && h('div', { class: 'hero-cta' },
          h('a', { class: 'btn primary', href: cert.credentialUrl, ...external(cert.credentialUrl) }, 'Verify this credential', icon('external', 17)))));

    const card = (cert, i, animateNow) =>
      h('article', {
        class: `card cert reveal${animateNow ? ' in' : ''}`,
        style: stagger(i, 0.07),
        tabindex: 0,
        role: 'button',
        'aria-label': `${cert.title} — view certificate`,
        onclick: () => openCert(cert),
        onkeydown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openCert(cert); } },
      },
        h('div', { class: 'cert-media' },
          certMedia(cert),
          h('span', { class: 'kind' }, icon(cert.kind === 'award' ? 'star' : 'award', 13), kindOf(cert).one),
          h('span', { class: 'cert-zoom', 'aria-hidden': 'true' }, icon('eye', 26))),
        h('div', { class: 'cert-body' },
          h('div', { class: 'issuer', dir: 'auto' }, cert.issuer),
          h('h3', { dir: 'auto' }, cert.title),
          (cert.date || cert.credentialId) && h('div', { class: 'cert-meta' }, cert.date && h('span', null, cert.date), cert.credentialId && h('code', null, `ID ${cert.credentialId}`)),
          cert.skills.length > 0 && h('div', { class: 'tags' }, cert.skills.slice(0, 3).map((s) => h('span', { class: 'tag-pill' }, s))),
          h('div', { class: 'cert-foot' },
            cert.credentialUrl && h('a', { class: 'btn ghost sm', href: cert.credentialUrl, onclick: (e) => e.stopPropagation(), ...external(cert.credentialUrl) }, icon('external', 15), 'Verify'),
            h('span', { class: 'more' }, 'View', icon('arrowRight', 16)))));

    const paint = (animateNow) => {
      const list = filter === 'all' ? certificates : certificates.filter((c) => c.kind === filter);
      const shown = expanded ? list : list.slice(0, FIRST_PAGE);
      grid.replaceChildren(...shown.map((c, i) => card(c, i, animateNow)));
      more.replaceChildren(...(!expanded && list.length > FIRST_PAGE
        ? [h('button', { class: 'btn ghost', type: 'button', onclick: () => { expanded = true; paint(true); } }, `Show all ${list.length}`, icon('down', 18))]
        : []));
    };
    paint(false);

    const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
    const filterBar = kinds.length > 1 && filterButtons('Filter credentials',
      [{ value: 'all', label: 'All' }, ...kinds.map((k) => ({ value: k, label: KINDS[k].many }))],
      (value) => { filter = value; expanded = false; paint(true); });

    return h('section', { id: 'certificates' },
      h('div', { class: 'container' },
        sectionHead('Credentials', ['Certified & ', accent('always learning')],
          `${plural(certificates.length, 'credential', 'credentials')} from ${plural(issuers.length, 'organisation', 'organisations')} — open any card to see the full certificate.`, true),
        issuers.length > 1 && h('div', { class: 'issuers reveal', 'aria-label': 'Issuing organisations' },
          issuers.slice(0, 8).map((name) => h('span', { class: 'issuer-chip', dir: 'auto' }, icon('award', 15), name)),
          issuers.length > 8 && h('span', { class: 'issuer-chip' }, `+${issuers.length - 8} more`)),
        filterBar, grid, more));
  }

  // ------------------------------------------------------------ contact ----

  function buildContact() {
    const rows = [
      profile.email && { icon: 'email', label: 'Email', value: profile.email, href: `mailto:${profile.email}` },
      profile.phone && { icon: 'phone', label: 'Phone', value: profile.phone, href: `tel:${profile.phone.replace(/[^\d+]/g, '')}` },
      profile.location && { icon: 'pin', label: 'Based in', value: profile.location },
    ].filter(Boolean);

    const status = h('p', { class: 'form-status', role: 'status', 'aria-live': 'polite' });
    const label = h('span', null, 'Send message');
    const submit = h('button', { class: 'btn primary', type: 'submit' }, label, icon('send', 18));

    const field = (id, text, control) => h('div', { class: 'field' }, h('label', { for: id }, text), control);
    const form = h('form', { class: 'contact' },
      h('div', { class: 'row-2' },
        field('c-name', 'Your name', h('input', { class: 'input', id: 'c-name', name: 'name', required: true, minlength: 2, maxlength: 80, autocomplete: 'name', placeholder: 'Jane Doe', dir: 'auto' })),
        field('c-email', 'Email address', h('input', { class: 'input', id: 'c-email', name: 'email', type: 'email', required: true, maxlength: 120, autocomplete: 'email', placeholder: 'jane@company.com' }))),
      field('c-message', 'Message', h('textarea', { class: 'input', id: 'c-message', name: 'message', required: true, minlength: 10, maxlength: 3000, placeholder: 'Tell me about your project…', dir: 'auto' })),
      h('div', { class: 'hp', 'aria-hidden': 'true' }, h('label', { for: 'c-site' }, 'Leave this empty'), h('input', { id: 'c-site', name: 'website', tabindex: -1, autocomplete: 'off' })),
      h('div', null, submit),
      status);

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      status.className = 'form-status';
      status.textContent = '';
      submit.disabled = true;
      label.textContent = 'Sending…';
      try {
        const res = await fetch('/api/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(Object.fromEntries(new FormData(form))),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.error || 'Something went wrong. Please try again.');
        form.reset();
        status.classList.add('ok');
        status.textContent = 'Thank you! Your message was sent — I’ll get back to you soon.';
      } catch (err) {
        status.classList.add('err');
        status.textContent = err instanceof TypeError ? 'Network error — please check your connection and try again.' : err.message;
      } finally {
        submit.disabled = false;
        label.textContent = 'Send message';
      }
    });

    return h('section', { id: 'contact' },
      h('div', { class: 'container contact-grid' },
        h('div', { class: 'contact-info' },
          sectionHead('Contact', ['Let’s build something ', accent('great')]),
          h('p', { class: 'section-sub reveal', style: stagger(1) }, 'Have a project in mind or just want to say hi? Send a message and I’ll get back to you within a day or two.'),
          rows.length > 0 && h('div', { class: 'contact-list' }, rows.map((r, i) =>
            h('div', { class: 'card contact-row reveal', style: stagger(i + 2) },
              h('span', { class: 'glyph' }, icon(r.icon, 20)),
              h('div', null, h('small', null, r.label), h('b', null, r.href ? h('a', { href: r.href }, r.value) : r.value))))),
          socials.length > 0 && h('div', { class: 'reveal', style: stagger(5) }, socialLinks())),
        h('div', { class: 'card form-card reveal', style: stagger(2) }, form)));
  }

  // ------------------------------------------------------------- footer ----

  function buildFooter() {
    $('#footer').append(h('div', { class: 'container footer-inner' },
      h('p', { dir: 'auto' }, `© ${new Date().getFullYear()} ${profile.name}. ${settings.footerText || ''}`.trim()),
      socials.length > 0 && socialLinks()));
  }

  // ------------------------------------------------------------ effects ----

  function setupEffects() {
    // Reveal on scroll
    const revealables = $$('.reveal:not(.in)');
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        }
      }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
      revealables.forEach((el) => io.observe(el));
    } else {
      revealables.forEach((el) => el.classList.add('in'));
    }

    // Animated counters
    const counters = $$('[data-count]');
    const run = (el) => {
      const target = Number(el.dataset.count);
      const suffix = el.dataset.suffix || '';
      if (reduceMotion || target < 2) { el.textContent = `${target.toLocaleString('en-US')}${suffix}`; return; }
      const start = performance.now();
      const duration = 1500;
      const frame = (now) => {
        const t = Math.min(1, (now - start) / duration);
        const eased = 1 - (1 - t) ** 4;
        el.textContent = `${Math.round(target * eased).toLocaleString('en-US')}${suffix}`;
        if (t < 1) requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    };
    if ('IntersectionObserver' in window) {
      const co = new IntersectionObserver((entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          run(entry.target);
          co.unobserve(entry.target);
        }
      }, { threshold: 0.6 });
      counters.forEach((el) => co.observe(el));
    } else {
      counters.forEach(run);
    }

    // Scroll-spy
    const links = new Map($$('.nav-links a').map((a) => [a.dataset.id, a]));
    if ('IntersectionObserver' in window) {
      const spy = new IntersectionObserver((entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          links.forEach((a, id) => a.classList.toggle('active', id === entry.target.id));
        }
      }, { rootMargin: '-45% 0px -50% 0px' });
      sections.forEach((s) => { const el = document.getElementById(s.id); el && spy.observe(el); });
    }

    // Progress bar, sticky-nav style, back-to-top
    const bar = $('.progress');
    const nav = $('#nav');
    const toTop = $('#to-top');
    toTop.append(icon('arrowUp', 20));
    toTop.addEventListener('click', () => scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' }));
    let queued = false;
    const onScroll = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        const max = document.documentElement.scrollHeight - innerHeight;
        bar.style.transform = `scaleX(${max > 0 ? Math.min(1, scrollY / max) : 0})`;
        nav.classList.toggle('scrolled', scrollY > 24);
        toTop.classList.toggle('show', scrollY > 700);
      });
    };
    addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    if (finePointer && !reduceMotion) {
      // Card spotlight follows the cursor
      document.addEventListener('pointermove', (e) => {
        const card = e.target.closest?.('.card');
        if (!card) return;
        const r = card.getBoundingClientRect();
        card.style.setProperty('--mx', `${e.clientX - r.left}px`);
        card.style.setProperty('--my', `${e.clientY - r.top}px`);
      }, { passive: true });

      // Gentle 3D tilt on the hero code card
      const visual = $('.hero-visual');
      const code = $('#code-card');
      if (visual && code) {
        visual.addEventListener('pointermove', (e) => {
          const r = visual.getBoundingClientRect();
          const x = (e.clientX - r.left) / r.width - 0.5;
          const y = (e.clientY - r.top) / r.height - 0.5;
          code.style.transform = `rotateY(${x * 9}deg) rotateX(${-y * 9}deg)`;
        });
        visual.addEventListener('pointerleave', () => { code.style.transform = ''; });
      }
    }
  }

  // --------------------------------------------------------------- boot ----

  buildNav();
  const main = $('#main');
  main.append(buildHero());
  const marquee = buildMarquee();
  if (marquee) main.append(marquee);
  if (has('about')) main.append(buildAbout());
  if (has('skills')) main.append(buildSkills());
  if (has('services')) main.append(buildServices());
  if (has('projects')) main.append(buildProjects());
  if (has('experience')) main.append(buildExperience());
  if (has('certificates')) main.append(buildCertificates());
  if (has('contact')) main.append(buildContact());
  buildFooter();
  setupEffects();
})();
