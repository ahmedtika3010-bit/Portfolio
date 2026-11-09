// Admin dashboard. Forms are generated from the schema the server sends
// (/api/admin/bootstrap), so adding a field in src/schema.js is all it takes
// to make it editable here.
(() => {
  'use strict';

  const app = document.getElementById('app');
  const state = { username: '', schema: null, content: null, unread: 0, traffic: null, messages: null, limits: { upload: 4 * 1024 * 1024 } };
  let uid = 0;

  const $$ = (sel, scope = document) => [...scope.querySelectorAll(sel)];
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const unique = (list) => [...new Set(list.filter(Boolean))];
  const initials = (name) => (String(name).trim().split(/\s+/).map((w) => w[0]).join('').slice(0, 2) || '?').toUpperCase();

  // ---------------------------------------------------------------- api ----

  async function api(path, { method = 'GET', body, form } = {}) {
    const options = { method, credentials: 'same-origin', headers: { 'X-Requested-With': 'portfolio-admin' } };
    if (body !== undefined) {
      options.headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(body);
    }
    if (form) options.body = form;

    let res;
    try {
      res = await fetch(`/api/admin${path}`, options);
    } catch {
      throw new Error('Network error — is the server running?');
    }
    const json = await res.json().catch(() => ({}));
    if (res.status === 401 && path !== '/login') {
      showLogin();
      throw new Error('Your session expired — please sign in again.');
    }
    if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`);
    return json;
  }

  // ----------------------------------------------------------- feedback ----

  function toast(message, type = 'ok') {
    const el = h('div', { class: `toast${type === 'err' ? ' err' : ''}`, role: type === 'err' ? 'alert' : 'status' },
      icon(type === 'err' ? 'x' : 'check', 18), message);
    document.getElementById('toasts').append(el);
    setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 320); }, type === 'err' ? 5200 : 2600);
  }

  function openDialog(content, { className = '' } = {}) {
    const dialog = h('dialog', { class: `dlg ${className}` }, content);
    document.body.append(dialog);
    dialog.addEventListener('close', () => dialog.remove());
    dialog.addEventListener('mousedown', (e) => { if (e.target === dialog) dialog.close(); });
    dialog.showModal();
    return dialog;
  }

  function confirmDialog({ title, text, confirm = 'Delete', danger = true }) {
    return new Promise((resolve) => {
      const done = (value) => { resolved = value; dialog.close(); };
      let resolved = false;
      const dialog = openDialog(h('div', { class: 'dlg-body' },
        h('h2', null, title),
        h('p', { class: 'lead', style: { marginTop: '8px', color: 'var(--muted)' } }, text),
        h('div', { class: 'dlg-foot' },
          h('button', { class: 'btn ghost', type: 'button', onclick: () => done(false) }, 'Cancel'),
          h('button', { class: `btn ${danger ? 'danger' : 'primary'}`, type: 'button', onclick: () => done(true) }, confirm))), { className: 'confirm' });
      dialog.addEventListener('close', () => resolve(resolved));
    });
  }

  // ------------------------------------------------------------- theming ----

  // Dark text on light accents, white on dark ones — mirrors src/render.js.
  function inkFor(...colors) {
    const lum = (hex) => {
      const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
      const lin = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
      return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
    };
    return colors.reduce((s, c) => s + lum(c), 0) / colors.length > 0.28 ? '#0b1020' : '#ffffff';
  }

  function applyAccent(settings) {
    const root = document.documentElement.style;
    root.setProperty('--accent', settings.accentFrom);
    root.setProperty('--accent-2', settings.accentTo);
    root.setProperty('--on-accent', inkFor(settings.accentFrom, settings.accentTo));
  }

  // ------------------------------------------------------- form controls ----

  const fieldId = () => `f${++uid}`;

  // Hosts cap the size of an upload (Vercel: 4.5 MB). Phone photos and screenshots often exceed
  // that, so big PNG/JPG/WEBP images are shrunk in the browser before they are sent.
  async function prepareUpload(file, isFile) {
    const limit = state.limits.upload;
    const mb = Math.round(limit / 1048576);
    if (file.size <= limit) return file;
    if (isFile || !/^image\/(png|jpeg|webp)$/.test(file.type)) throw new Error(`This file is too large (max ${mb} MB).`);

    const bitmap = await createImageBitmap(file);
    const asWebp = file.type === 'image/png'; // keeps transparency; JPEG photos stay JPEG
    const type = asWebp ? 'image/webp' : 'image/jpeg';
    let scale = Math.min(1, 2400 / Math.max(bitmap.width, bitmap.height));
    for (const quality of [0.9, 0.8, 0.7, 0.6]) {
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, type, quality));
      if (blob && blob.type === type && blob.size <= limit) {
        bitmap.close?.();
        toast(`Large image resized to fit the ${mb} MB limit`);
        return new File([blob], file.name.replace(/\.\w+$/, asWebp ? '.webp' : '.jpg'), { type });
      }
      scale *= 0.85;
    }
    bitmap.close?.();
    throw new Error(`This image is too large to upload (max ${mb} MB).`);
  }

  function control(key, def, value, ctx) {
    const id = fieldId();
    const wrap = (node, extra) => h('div', { class: 'field' },
      def.type === 'boolean'
        ? null
        : h('label', { for: id }, h('span', null, def.label || cap(key), def.required && h('span', { class: 'req' }, ' *')), extra),
      node,
      def.hint && h('div', { class: 'hint' }, def.hint));

    switch (def.type) {
      case 'textarea': {
        const counter = h('span', { class: 'counter' });
        const input = h('textarea', { class: 'input', id, rows: def.rows || 4, maxlength: def.max, placeholder: def.placeholder || '', required: !!def.required, dir: 'auto' });
        input.value = value || '';
        const count = () => { counter.textContent = `${input.value.length}/${def.max}`; };
        input.addEventListener('input', count);
        count();
        return { el: wrap(input, counter), get: () => input.value };
      }

      case 'boolean': {
        const input = h('input', { type: 'checkbox', id });
        input.checked = !!value;
        return {
          el: h('div', { class: 'field' },
            h('label', { class: 'switch', for: id }, input, h('span', { class: 'track' }), h('span', { class: 'switch-text' }, def.label)),
            def.hint && h('div', { class: 'hint' }, def.hint)),
          get: () => input.checked,
        };
      }

      case 'number': {
        if (def.max <= 100) {
          const out = h('output', null, `${value}${def.suffix || ''}`);
          const input = h('input', { type: 'range', id, min: def.min, max: def.max, step: def.step || 1 });
          input.value = value;
          input.addEventListener('input', () => { out.textContent = `${input.value}${def.suffix || ''}`; });
          return { el: wrap(h('div', { class: 'range' }, input, out)), get: () => Number(input.value) };
        }
        const input = h('input', { class: 'input', type: 'number', id, min: def.min, max: def.max, step: def.step || 1 });
        input.value = value;
        return { el: wrap(input), get: () => (input.value === '' ? 0 : Number(input.value)) };
      }

      case 'select': {
        const input = h('select', { class: 'input', id }, def.options.map((o) => h('option', { value: o }, cap(o))));
        input.value = value || def.default || def.options[0];
        return { el: wrap(input), get: () => input.value };
      }

      case 'color': {
        const picker = h('input', { type: 'color', 'aria-label': `${def.label} picker` });
        const text = h('input', { class: 'input', id, maxlength: 7, spellcheck: false });
        picker.value = text.value = value || def.default;
        picker.addEventListener('input', () => { text.value = picker.value; text.dispatchEvent(new Event('change')); });
        text.addEventListener('input', () => { if (/^#[0-9a-f]{6}$/i.test(text.value)) { picker.value = text.value; text.dispatchEvent(new Event('change')); } });
        const el = wrap(h('div', { class: 'color-row' }, picker, text));
        return { el, get: () => text.value, onChange: (fn) => text.addEventListener('change', fn) };
      }

      case 'tags': {
        const tags = [...(value || [])];
        const input = h('input', { id, maxlength: 30, placeholder: tags.length ? '' : 'Type and press Enter', dir: 'auto', autocomplete: 'off' });
        const box = h('div', { class: 'tags-input' });
        const add = (raw) => {
          const tag = raw.trim().replace(/,$/, '').trim();
          if (tag && !tags.some((t) => t.toLowerCase() === tag.toLowerCase()) && tags.length < 20) tags.push(tag);
          input.value = '';
        };
        const paint = (refocus) => {
          box.replaceChildren(...tags.map((tag, i) =>
            h('span', { class: 'chip' }, tag,
              h('button', { type: 'button', 'aria-label': `Remove ${tag}`, onclick: () => { tags.splice(i, 1); paint(true); } }, icon('x', 12)))), input);
          if (refocus) input.focus();
        };
        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(input.value); paint(true); }
          else if (e.key === 'Backspace' && !input.value && tags.length) { tags.pop(); paint(true); }
        });
        input.addEventListener('blur', () => { if (input.value.trim()) { add(input.value); paint(false); } });
        paint(false);
        return { el: wrap(box), get: () => { add(input.value); return tags; }, peek: () => [...tags] };
      }

      case 'image':
      case 'file': {
        const isFile = def.type === 'file';
        let current = value || '';
        const preview = h('div', { class: 'upload-preview' });
        const url = h('input', { class: 'input', id, placeholder: isFile ? 'Upload a PDF, or paste a link' : 'Upload an image, or paste a link', spellcheck: false });
        const picker = h('input', { type: 'file', hidden: true, accept: isFile ? 'application/pdf' : 'image/png,image/jpeg,image/webp,image/gif' });
        const uploadBtn = h('button', { class: 'btn ghost sm', type: 'button' }, icon('upload', 16), isFile ? 'Upload PDF' : 'Upload image');
        const removeBtn = h('button', { class: 'btn ghost sm', type: 'button' }, icon('trash', 16), 'Remove');

        const paint = () => {
          url.value = current;
          removeBtn.hidden = !current;
          if (!current) preview.replaceChildren(icon(isFile ? 'file' : 'image', 26));
          else if (isFile) preview.replaceChildren(icon('file', 26), h('span', null, current.split('/').pop().slice(0, 18)));
          else preview.replaceChildren(h('img', { src: current, alt: '', onerror: (e) => e.target.replaceWith(icon('image', 26)) }));
        };
        url.addEventListener('change', () => { current = url.value.trim(); paint(); });
        removeBtn.addEventListener('click', () => { current = ''; paint(); });
        uploadBtn.addEventListener('click', () => picker.click());
        picker.addEventListener('change', async () => {
          const file = picker.files[0];
          picker.value = '';
          if (!file) return;
          const label = uploadBtn.lastChild.textContent;
          uploadBtn.disabled = true;
          uploadBtn.lastChild.textContent = 'Uploading…';
          try {
            const body = new FormData();
            body.append('file', await prepareUpload(file, isFile));
            const res = await api(`/upload?kind=${isFile ? 'file' : 'image'}`, { method: 'POST', form: body });
            current = res.url;
            paint();
          } catch (err) {
            toast(err.message, 'err');
          } finally {
            uploadBtn.disabled = false;
            uploadBtn.lastChild.textContent = label;
          }
        });
        paint();
        return {
          el: wrap(h('div', { class: 'upload' }, preview, h('div', null, h('div', { class: 'upload-actions' }, uploadBtn, removeBtn, picker), url))),
          get: () => url.value.trim() || current,
        };
      }

      default: {
        // text, email, url
        const listId = def.suggest ? `${id}-list` : null;
        const input = h('input', { class: 'input', type: def.type === 'email' ? 'email' : 'text', id, maxlength: def.max, placeholder: def.placeholder || '', required: !!def.required, dir: def.type === 'text' ? 'auto' : 'ltr', autocomplete: 'off', list: listId });
        input.value = value || '';
        const datalist = listId && h('datalist', { id: listId }, (ctx.suggest?.[def.suggest] || []).map((v) => h('option', { value: v })));
        return {
          el: wrap(h('div', null, input, datalist)),
          get: () => {
            const v = input.value.trim();
            // Be forgiving: "github.com/me" becomes "https://github.com/me".
            if (def.type === 'url' && v && !/^[a-z][a-z0-9+.-]*:/i.test(v) && !v.startsWith('/')) return `https://${v}`;
            return v;
          },
        };
      }
    }
  }

  const emptyFor = (def) => def.default ?? (def.type === 'boolean' ? false : def.type === 'tags' ? [] : def.type === 'number' ? 0 : '');

  // Builds a <form> from a schema `fields` map.
  function buildForm({ fields, values = {}, ctx = {}, submitLabel = 'Save', onSubmit, onCancel, onChange }) {
    const controls = Object.entries(fields).map(([key, def]) => [key, control(key, def, values[key] ?? emptyFor(def), ctx)]);
    const error = h('div', { class: 'form-error', role: 'alert', hidden: true });
    const submit = h('button', { class: 'btn primary', type: 'submit' }, icon('check', 18), submitLabel);

    const form = h('form', { class: 'form-grid' },
      error, controls.map(([, c]) => c.el),
      h('div', { class: 'dlg-foot' }, onCancel && h('button', { class: 'btn ghost', type: 'button', onclick: onCancel }, 'Cancel'), submit));

    const read = (peek = false) => Object.fromEntries(controls.map(([key, c]) => [key, peek && c.peek ? c.peek() : c.get()]));
    if (onChange) {
      const notify = () => onChange(read(true));
      form.addEventListener('input', notify);
      form.addEventListener('change', notify);
      controls.forEach(([, c]) => c.onChange?.(notify));
    }

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      error.hidden = true;
      submit.disabled = true;
      try {
        await onSubmit(read());
      } catch (err) {
        error.textContent = err.message;
        error.hidden = false;
        error.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      } finally {
        submit.disabled = false;
      }
    });
    return { form, submit, read };
  }

  // -------------------------------------------------------------- login ----

  function showLogin() {
    document.documentElement.removeAttribute('style');
    const error = h('div', { class: 'form-error', role: 'alert', hidden: true });
    const user = h('input', { class: 'input', id: 'u', autocomplete: 'username', required: true, autofocus: true });
    const pass = h('input', { class: 'input', id: 'p', type: 'password', autocomplete: 'current-password', required: true });
    const btn = h('button', { class: 'btn primary', type: 'submit' }, 'Sign in', icon('arrowRight', 18));

    const form = h('form', { class: 'form-grid', onsubmit: async (e) => {
      e.preventDefault();
      error.hidden = true;
      btn.disabled = true;
      try {
        await api('/login', { method: 'POST', body: { username: user.value, password: pass.value } });
        await boot();
      } catch (err) {
        error.textContent = err.message;
        error.hidden = false;
        pass.value = '';
        pass.focus();
      } finally {
        btn.disabled = false;
      }
    } },
      error,
      h('div', { class: 'field' }, h('label', { for: 'u' }, 'Username'), user),
      h('div', { class: 'field' }, h('label', { for: 'p' }, 'Password'), pass),
      btn);

    app.replaceChildren(h('main', { class: 'login' },
      h('div', { class: 'login-card' },
        h('div', { class: 'logo' }, icon('lock', 22)),
        h('h1', { style: { marginTop: '18px' } }, 'Welcome back'),
        h('p', { class: 'sub' }, 'Sign in to manage your portfolio.'),
        form)));
  }

  // --------------------------------------------------------------- shell ----

  const NAV = [
    { label: 'Overview', items: [{ route: 'dashboard', text: 'Dashboard', icon: 'home' }] },
    {
      label: 'Content',
      items: [
        { route: 'profile', text: 'Profile', icon: 'user' },
        { route: 'c/projects', icon: 'folder' },
        { route: 'c/skills', icon: 'zap' },
        { route: 'c/services', icon: 'layers' },
        { route: 'c/experience', icon: 'briefcase' },
        { route: 'c/certificates', icon: 'award' },
        { route: 'c/stats', icon: 'bar-chart' },
        { route: 'c/socials', icon: 'link' },
      ],
    },
    {
      label: 'Inbox & site',
      items: [
        { route: 'messages', text: 'Messages', icon: 'inbox', badge: true },
        { route: 'settings', text: 'Settings', icon: 'sliders' },
      ],
    },
  ];

  const routeTitle = (route) => (route.startsWith('c/') ? state.schema.collections[route.slice(2)].label : null);

  function renderShell() {
    const links = NAV.map((group) => [
      h('div', { class: 'nav-label' }, group.label),
      group.items.map((item) =>
        h('a', { class: 'nav-link', href: `#/${item.route}`, dataset: { route: item.route } },
          icon(item.icon, 19), item.text || routeTitle(item.route),
          item.badge && h('span', { class: 'count', id: 'unread-badge', hidden: !state.unread }, String(state.unread)))),
    ]);

    const themeBtn = h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Toggle theme' });
    const paintTheme = () => themeBtn.replaceChildren(icon(document.documentElement.dataset.theme === 'light' ? 'moon' : 'sun', 18));
    themeBtn.addEventListener('click', () => {
      const next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
      document.documentElement.dataset.theme = next;
      try { localStorage.setItem('pf-theme', next); } catch { /* storage blocked */ }
      paintTheme();
    });
    paintTheme();

    const shell = h('div', { class: 'app' },
      h('div', { class: 'topbar' },
        h('div', { class: 'brand' }, h('span', { class: 'logo' }, icon('code', 18)), 'Portfolio admin'),
        h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Menu', onclick: () => shell.classList.toggle('menu-open') }, icon('menu', 20))),
      h('aside', { class: 'sidebar' },
        h('div', { class: 'side-brand' },
          h('span', { class: 'logo' }, icon('code', 20)),
          h('div', null, h('b', null, 'Portfolio admin'), h('small', null, 'Manage your content'))),
        h('nav', { 'aria-label': 'Admin' }, links),
        h('div', { class: 'side-foot' },
          h('a', { class: 'btn ghost sm', href: '/', target: '_blank', rel: 'noopener' }, icon('eye', 16), 'View live site'),
          h('div', { class: 'who' }, icon('user', 16), h('span', { id: 'who', style: { flex: 1 } }, state.username), themeBtn),
          h('button', { class: 'btn ghost sm', type: 'button', onclick: logout }, icon('logout', 16), 'Sign out'))),
      h('main', { class: 'main', id: 'view' }));

    shell.addEventListener('click', (e) => { if (e.target.closest('.nav-link')) shell.classList.remove('menu-open'); });
    app.replaceChildren(shell);
  }

  async function logout() {
    try { await api('/logout', { method: 'POST' }); } catch { /* already signed out */ }
    showLogin();
  }

  const setUnread = (n) => {
    state.unread = Math.max(0, n);
    const badge = document.getElementById('unread-badge');
    if (badge) { badge.textContent = state.unread; badge.hidden = !state.unread; }
  };

  // -------------------------------------------------------------- router ----

  // "c/projects/new" opens the collection and its "add" form straight away.
  const currentRoute = () => (location.hash.replace(/^#\//, '').replace(/\/new$/, '') || 'dashboard');
  let lastRoute = null;

  function renderRoute() {
    const route = currentRoute();
    const wantsNew = /\/new$/.test(location.hash);
    $$('.nav-link').forEach((a) => a.classList.toggle('active', a.dataset.route === route));
    const view = document.getElementById('view');
    if (!view) return;
    let node;
    if (route === 'dashboard') node = dashboardView();
    else if (route === 'profile') node = singletonView('profile', 'Profile', 'This is what visitors see first.');
    else if (route === 'settings') node = settingsView();
    else if (route === 'messages') node = messagesView();
    else if (route.startsWith('c/') && state.schema.collections[route.slice(2)]) node = collectionView(route.slice(2));
    else node = dashboardView();
    view.replaceChildren(node);
    if (route !== lastRoute) window.scrollTo({ top: 0 });
    lastRoute = route;
    if (wantsNew && route.startsWith('c/')) {
      history.replaceState(null, '', `#/${route}`);
      openItemForm(route.slice(2));
    }
  }

  const pageHead = (title, subtitle, ...actions) =>
    h('div', { class: 'page-head' },
      h('div', null, h('h1', null, title), subtitle && h('p', null, subtitle)),
      actions.length > 0 && h('div', { class: 'actions' }, actions));

  // ----------------------------------------------------------- dashboard ----

  function dashboardView() {
    const c = state.content;
    const t = state.traffic;
    const sample = c.profile.email === 'hello@example.com'; // still the starter placeholder
    const noCover = c.projects.filter((p) => !p.image).length;
    const noCertImage = c.certificates.filter((x) => !x.image).length;

    const tips = [
      sample && { text: 'Replace the sample content with your own details.', to: '#/profile', icon: 'user' },
      !c.profile.avatar && { text: 'Add a profile photo.', to: '#/profile', icon: 'image' },
      !c.profile.resume && { text: 'Upload your CV (PDF) to show a download button.', to: '#/profile', icon: 'file' },
      noCover > 0 && { text: `${noCover} project${noCover > 1 ? 's use' : ' uses'} a generated cover — add real screenshots.`, to: '#/c/projects', icon: 'folder' },
      c.certificates.length === 0 && { text: 'Add your certificates and courses — recruiters like proof.', to: '#/c/certificates/new', icon: 'award' },
      noCertImage > 0 && { text: `${noCertImage} certificate${noCertImage > 1 ? 's have' : ' has'} no image — upload a photo or screenshot of each.`, to: '#/c/certificates', icon: 'award' },
      c.socials.length === 0 && { text: 'Add your social links.', to: '#/c/socials', icon: 'link' },
    ].filter(Boolean);

    const stat = (iconName, value, label, sub) =>
      h('div', { class: 'stat-card' }, h('div', { class: 'ico' }, icon(iconName, 20)), h('strong', null, String(value)), h('span', null, label), sub && h('small', null, sub));

    const recent = h('div', { class: 'list' });
    api('/messages').then((list) => {
      state.messages = list;
      setUnread(list.filter((m) => !m.read).length);
      recent.replaceChildren(...(list.length
        ? list.slice(0, 4).map(messageRow)
        : [h('div', { class: 'empty' }, h('h3', null, 'No messages yet'), 'Messages sent from your contact form will show up here.')]));
    }).catch(() => {});

    return h('div', null,
      pageHead(`Hello, ${c.profile.name.split(' ')[0]}`, 'Here’s what’s going on with your portfolio.',
        h('a', { class: 'btn ghost', href: '/', target: '_blank', rel: 'noopener' }, icon('eye', 18), 'View site'),
        h('a', { class: 'btn primary', href: '#/c/projects/new' }, icon('plus', 18), 'New project')),
      h('div', { class: 'stat-grid' },
        stat('folder', c.projects.length, 'Projects', `${c.projects.filter((p) => p.featured).length} featured`),
        stat('zap', c.skills.length, 'Skills', `${unique(c.skills.map((s) => s.category)).length} categories`),
        stat('inbox', state.unread, 'Unread messages'),
        stat('eye', t.total.toLocaleString(), 'Page views', `${t.today} today · ${t.week} this week`)),
      h('div', { class: 'two-col' },
        h('section', { class: 'panel' },
          h('h2', null, 'Recent messages'), h('p', { class: 'lead' }, 'Latest people who reached out.'), recent,
          h('div', { style: { marginTop: '16px' } }, h('a', { class: 'btn ghost sm', href: '#/messages' }, 'Open inbox', icon('arrowRight', 16)))),
        h('section', { class: 'panel' },
          h('h2', null, 'To-do'), h('p', { class: 'lead' }, tips.length ? 'A few things that will make your portfolio stronger.' : 'Everything looks great.'),
          h('div', { class: 'tips' }, tips.length
            ? tips.map((tip) => h('a', { class: 'tip', href: tip.to }, h('span', { class: 'ico' }, icon(tip.icon, 17)), h('span', null, tip.text), icon('arrowRight', 16)))
            : h('div', { class: 'tip done' }, h('span', { class: 'ico' }, icon('check', 17)), h('span', null, 'Your profile is complete.'))))));
  }

  // ---------------------------------------------------- profile/settings ----

  function singletonView(name, title, subtitle, { onChange, extra } = {}) {
    const def = state.schema.singletons[name];
    const { form } = buildForm({
      fields: def.fields,
      values: state.content[name],
      submitLabel: 'Save changes',
      onChange,
      onSubmit: async (data) => {
        state.content[name] = await api(`/singleton/${name}`, { method: 'PUT', body: data });
        if (name === 'settings') applyAccent(state.content.settings);
        toast('Saved — your site is updated');
      },
    });
    form.querySelector('.dlg-foot').className = 'savebar';
    groupFields(form);
    return h('div', null, pageHead(title, subtitle), h('section', { class: 'panel' }, form), extra);
  }

  // Long forms read better with the on/off switches boxed together and colour pickers side by side.
  function groupFields(form) {
    const fields = [...form.children].filter((el) => el.classList.contains('field'));
    const switches = fields.filter((f) => f.querySelector('.switch'));
    if (switches.length > 1) {
      const box = h('div', { class: 'switch-grid' });
      switches[0].before(box);
      box.append(...switches);
    }
    const colours = fields.filter((f) => f.querySelector('.color-row'));
    if (colours.length === 2) {
      const row = h('div', { class: 'two-up' });
      colours[0].before(row);
      row.append(...colours);
    }
  }

  function settingsView() {
    const swatch = h('div', { class: 'swatch', 'aria-hidden': 'true' });
    const paintSwatch = (v) => { swatch.style.background = `linear-gradient(120deg, ${v.accentFrom}, ${v.accentTo})`; };
    const view = singletonView('settings', 'Settings', 'Colours, SEO and which sections appear on the site.', {
      onChange: (v) => { if (/^#[0-9a-f]{6}$/i.test(v.accentFrom) && /^#[0-9a-f]{6}$/i.test(v.accentTo)) paintSwatch(v); },
      extra: accountPanel(),
    });
    paintSwatch(state.content.settings);
    view.querySelector('.two-up')?.after(swatch);
    return view;
  }

  // Hand-built (not schema driven) so passwords are sent exactly as typed.
  function accountPanel() {
    const input = (id, props) => h('input', { class: 'input', id, ...props });
    const current = input('acc-current', { type: 'password', autocomplete: 'current-password', required: true });
    const username = input('acc-user', { autocomplete: 'username', required: true, maxlength: 40 });
    const password = input('acc-new', { type: 'password', autocomplete: 'new-password', minlength: 8 });
    username.value = state.username;

    const error = h('div', { class: 'form-error', role: 'alert', hidden: true });
    const submit = h('button', { class: 'btn primary', type: 'submit' }, icon('check', 18), 'Update account');
    const field = (id, label, control, hint) => h('div', { class: 'field' }, h('label', { for: id }, label), control, hint && h('div', { class: 'hint' }, hint));

    const form = h('form', { class: 'form-grid', onsubmit: async (e) => {
      e.preventDefault();
      error.hidden = true;
      submit.disabled = true;
      try {
        const res = await api('/account', { method: 'POST', body: { current: current.value, username: username.value.trim(), password: password.value } });
        state.username = res.username;
        document.getElementById('who').textContent = res.username;
        current.value = password.value = '';
        toast('Account updated');
      } catch (err) {
        error.textContent = err.message;
        error.hidden = false;
      } finally {
        submit.disabled = false;
      }
    } },
      error,
      field('acc-user', 'Username', username),
      field('acc-new', 'New password', password, 'At least 8 characters. Leave empty to keep the current one.'),
      field('acc-current', 'Current password (required to confirm)', current),
      h('div', { class: 'dlg-foot' }, submit));

    return h('section', { class: 'panel' }, h('h2', null, 'Account'), h('p', { class: 'lead' }, 'Change your username or password. Other signed-in devices are signed out.'), form);
  }

  // --------------------------------------------------------- collections ----

  function subtitleOf(name, item) {
    if (name === 'stats') return `${item.value}${item.suffix || ''}`;
    const def = state.schema.collections[name];
    return def.subtitle.map((key) => (key === 'level' ? `${item.level}%` : item[key])).filter(Boolean).join(' · ');
  }

  function collectionView(name) {
    const def = state.schema.collections[name];
    const list = h('div', { class: 'list' });
    const items = () => state.content[name];

    const paint = () => {
      if (!items().length) {
        list.replaceChildren(h('div', { class: 'empty' }, h('h3', null, `No ${def.label.toLowerCase()} yet`), 'Add your first one to show it on the site.',
          h('div', null, h('button', { class: 'btn primary', type: 'button', onclick: () => openItemForm(name) }, icon('plus', 18), `Add ${def.singular.toLowerCase()}`))));
        return;
      }
      list.replaceChildren(...items().map((item, i) =>
        h('div', { class: 'row' },
          h('div', { class: 'thumb' }, item.image ? h('img', { src: item.image, alt: '', loading: 'lazy' }) : name === 'socials' ? icon(item.platform, 20) : name === 'services' ? icon(item.icon, 20) : name === 'certificates' ? icon('award', 20) : initials(item[def.title])),
          h('div', { class: 'meta' },
            h('b', null, h('span', { dir: 'auto' }, name === 'socials' ? cap(item.platform) : item[def.title]), item.featured && h('i', { class: 'pill' }, 'Featured'), item.kind === 'education' && h('i', { class: 'pill' }, 'Education'), name === 'certificates' && item.kind !== 'certificate' && h('i', { class: 'pill' }, cap(item.kind))),
            h('small', { dir: 'auto' }, subtitleOf(name, item))),
          h('div', { class: 'tools' },
            h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Move up', title: 'Move up', disabled: i === 0, onclick: () => move(i, -1) }, icon('up', 17)),
            h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Move down', title: 'Move down', disabled: i === items().length - 1, onclick: () => move(i, 1) }, icon('down', 17)),
            h('button', { class: 'icon-btn', type: 'button', 'aria-label': `Edit ${item[def.title]}`, title: 'Edit', onclick: () => openItemForm(name, item) }, icon('pencil', 17)),
            h('button', { class: 'icon-btn danger', type: 'button', 'aria-label': `Delete ${item[def.title]}`, title: 'Delete', onclick: () => remove(item) }, icon('trash', 17))))));
    };

    async function move(index, delta) {
      const arr = items();
      const target = index + delta;
      [arr[index], arr[target]] = [arr[target], arr[index]];
      paint();
      try {
        await api(`/c/${name}/reorder`, { method: 'PUT', body: { ids: arr.map((i) => i.id) } });
      } catch (err) {
        toast(err.message, 'err');
        await reload();
      }
    }

    async function remove(item) {
      const ok = await confirmDialog({ title: `Delete “${name === 'socials' ? cap(item.platform) : item[def.title]}”?`, text: 'This removes it from your site and can’t be undone.' });
      if (!ok) return;
      try {
        await api(`/c/${name}/${item.id}`, { method: 'DELETE' });
        state.content[name] = items().filter((i) => i.id !== item.id);
        paint();
        toast('Deleted');
      } catch (err) {
        toast(err.message, 'err');
      }
    }

    paint();
    return h('div', null,
      pageHead(def.label, `${items().length} ${items().length === 1 ? 'item' : 'items'} — use the arrows to change the order on the site.`,
        h('button', { class: 'btn primary', type: 'button', onclick: () => openItemForm(name) }, icon('plus', 18), `Add ${def.singular.toLowerCase()}`)),
      list);
  }

  function openItemForm(name, item) {
    const def = state.schema.collections[name];
    // A field with `suggest: 'x'` offers the values already used in that field as autocomplete.
    const ctx = { suggest: {} };
    for (const [key, field] of Object.entries(def.fields)) {
      if (field.suggest) ctx.suggest[field.suggest] = unique(state.content[name].map((i) => i[key]));
    }
    const dialog = openDialog(h('div'));
    const { form } = buildForm({
      fields: def.fields,
      values: item || {},
      ctx,
      submitLabel: item ? 'Save changes' : `Add ${def.singular.toLowerCase()}`,
      onCancel: () => dialog.close(),
      onSubmit: async (data) => {
        const list = state.content[name];
        if (item) {
          const saved = await api(`/c/${name}/${item.id}`, { method: 'PUT', body: data });
          list[list.findIndex((i) => i.id === item.id)] = saved;
        } else {
          const saved = await api(`/c/${name}`, { method: 'POST', body: data });
          if (def.addToStart) list.unshift(saved); else list.push(saved);
        }
        dialog.close();
        toast(item ? 'Changes saved' : `${def.singular} added`);
        renderRoute();
      },
    });
    dialog.firstChild.replaceWith(h('div', null,
      h('div', { class: 'dlg-head' }, h('h2', null, item ? `Edit ${def.singular.toLowerCase()}` : `New ${def.singular.toLowerCase()}`),
        h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Close', onclick: () => dialog.close() }, icon('x', 18))),
      h('div', { class: 'dlg-body' }, form)));
    dialog.querySelector('input:not([type=hidden]):not([type=file]), textarea')?.focus();
  }

  async function reload() {
    const data = await api('/bootstrap');
    Object.assign(state, { content: data.content, unread: data.unread, traffic: data.traffic });
    renderRoute();
  }

  // ------------------------------------------------------------ messages ----

  const when = (iso) => new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

  function messageRow(msg) {
    return h('div', { class: `row msg${msg.read ? '' : ' unread'}`, tabindex: 0, role: 'button', onclick: () => openMessage(msg), onkeydown: (e) => { if (e.key === 'Enter') openMessage(msg); } },
      h('div', { class: 'avatar' }, initials(msg.name)),
      h('div', { class: 'meta' },
        h('b', null, !msg.read && h('i', { class: 'dot', title: 'Unread' }), h('span', { dir: 'auto' }, msg.name)),
        h('small', { dir: 'auto' }, msg.message.replace(/\s+/g, ' '))),
      h('span', { class: 'when' }, when(msg.createdAt)));
  }

  function messagesView() {
    const list = h('div', { class: 'list' }, h('div', { style: { display: 'grid', placeItems: 'center', padding: '40px' } }, h('div', { class: 'spinner' })));
    const paint = () => {
      list.replaceChildren(...(state.messages.length
        ? state.messages.map(messageRow)
        : [h('div', { class: 'empty' }, h('h3', null, 'Your inbox is empty'), 'Messages from the contact form on your site will appear here.')]));
    };
    state.repaintMessages = paint;
    api('/messages').then((data) => { state.messages = data; setUnread(data.filter((m) => !m.read).length); paint(); })
      .catch((err) => list.replaceChildren(h('div', { class: 'form-error' }, err.message)));
    return h('div', null, pageHead('Messages', 'Sent through the contact form on your site.'), list);
  }

  async function openMessage(msg) {
    const close = () => dialog.close();
    const toggle = h('button', { class: 'btn ghost', type: 'button' });
    const paintToggle = () => { toggle.textContent = msg.read ? 'Mark as unread' : 'Mark as read'; };
    paintToggle();

    const dialog = openDialog(h('div', null,
      h('div', { class: 'dlg-head' }, h('h2', { dir: 'auto' }, msg.name), h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Close', onclick: close }, icon('x', 18))),
      h('div', { class: 'dlg-body' },
        h('p', { style: { color: 'var(--muted)', marginBottom: '16px', fontSize: '0.88rem' } }, h('a', { href: `mailto:${msg.email}`, style: { color: 'var(--accent-ink)' } }, msg.email), ` · ${when(msg.createdAt)}`),
        h('div', { class: 'msg-text', dir: 'auto' }, msg.message),
        h('div', { class: 'dlg-foot' },
          h('button', { class: 'btn danger', type: 'button', onclick: async () => {
            if (!(await confirmDialog({ title: 'Delete this message?', text: 'This can’t be undone.' }))) return;
            try {
              await api(`/messages/${msg.id}`, { method: 'DELETE' });
              state.messages = state.messages.filter((m) => m.id !== msg.id);
              if (!msg.read) setUnread(state.unread - 1);
              close();
              renderRoute();
              toast('Message deleted');
            } catch (err) { toast(err.message, 'err'); }
          } }, icon('trash', 17), 'Delete'),
          toggle,
          h('a', { class: 'btn primary', href: `mailto:${msg.email}?subject=${encodeURIComponent('Re: your message')}` }, icon('send', 17), 'Reply by email')))));

    toggle.addEventListener('click', async () => {
      try {
        await setRead(msg, !msg.read);
        paintToggle();
        renderRoute();
      } catch (err) { toast(err.message, 'err'); }
    });

    if (!msg.read) {
      try { await setRead(msg, true); paintToggle(); } catch { /* not critical */ }
    }
  }

  async function setRead(msg, read) {
    await api(`/messages/${msg.id}`, { method: 'PATCH', body: { read } });
    msg.read = read;
    setUnread(state.unread + (read ? -1 : 1));
    if (currentRoute() === 'messages') state.repaintMessages?.();
  }

  // ---------------------------------------------------------------- boot ----

  async function boot() {
    try {
      const data = await api('/bootstrap');
      Object.assign(state, { username: data.username, schema: data.schema, content: data.content, unread: data.unread, traffic: data.traffic, limits: data.limits });
      applyAccent(state.content.settings);
      renderShell();
      renderRoute();
    } catch (err) {
      if (!app.firstChild || app.querySelector('.spinner')) showLogin();
      throw err;
    }
  }

  window.addEventListener('hashchange', () => state.schema && renderRoute());

  app.append(h('div', { class: 'center-screen' }, h('div', { class: 'spinner' })));
  api('/me').then((me) => (me.authenticated ? boot() : showLogin())).catch(() => showLogin());
})();
