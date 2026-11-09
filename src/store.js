// Content, messages and traffic counters on top of the storage layer (src/db.js).
//
// Every function follows the same pattern: read the document, change it, write it back.
// That works for both drivers — on Vercel each request reads fresh data from Redis.
const crypto = require('crypto');
const db = require('./db');
const files = require('./files');
const seed = require('./seed');
const { collections, singletons, sanitize, defaultsOf, ValidationError } = require('./schema');

const newId = () => crypto.randomBytes(6).toString('hex');
const byOrder = (a, b) => a.order - b.order;
const notFound = () => Object.assign(new Error('Not found'), { status: 404 });

const starter = () => seed.content({ name: process.env.OWNER_NAME, role: process.env.OWNER_ROLE });

async function content() {
  let data = await db.read('content');
  if (!data) {
    await db.writeIfAbsent('content', starter());
    data = await db.read('content');
  }
  return data;
}
const saveContent = (data) => db.write('content', data);

// Remove files nothing points to anymore. Never fails the request it runs in.
async function pruneUploads(data) {
  try {
    await files.prune(data);
  } catch (err) {
    console.error('[uploads] cleanup failed:', err.message);
  }
}

// Make sure an older data set still has every key the current schema expects.
async function init() {
  const data = await content();
  let changed = false;
  for (const [name, def] of Object.entries(singletons)) {
    const merged = { ...defaultsOf(def.fields), ...(data[name] || {}) };
    if (JSON.stringify(merged) !== JSON.stringify(data[name])) {
      data[name] = merged;
      changed = true;
    }
  }
  for (const name of Object.keys(collections)) {
    if (!Array.isArray(data[name])) {
      data[name] = [];
      changed = true;
    }
  }
  if (changed) await saveContent(data);
  if ((await db.read('messages')) === null) await db.writeIfAbsent('messages', []);
}

async function publicContent() {
  const data = await content();
  const out = { profile: data.profile, settings: data.settings };
  for (const name of Object.keys(collections)) out[name] = [...data[name]].sort(byOrder);
  return out;
}

// --- singletons (profile, settings) ------------------------------------------------

async function updateSingleton(name, input) {
  const def = singletons[name];
  if (!def) throw new ValidationError('Unknown section');
  const data = await content();
  data[name] = sanitize(def.fields, input);
  await saveContent(data);
  await pruneUploads(data);
  return data[name];
}

// --- collections --------------------------------------------------------------------

function collectionOf(name) {
  const def = collections[name];
  if (!def) throw notFound();
  return def;
}

async function createItem(name, input) {
  const def = collectionOf(name);
  const clean = sanitize(def.fields, input);
  const data = await content();
  const orders = data[name].map((item) => item.order);
  const order = def.addToStart ? Math.min(0, ...orders) - 1 : Math.max(-1, ...orders) + 1;
  const item = { id: newId(), order, ...clean };
  data[name].push(item);
  await saveContent(data);
  return item;
}

async function updateItem(name, id, input) {
  const def = collectionOf(name);
  const data = await content();
  const index = data[name].findIndex((item) => item.id === id);
  if (index === -1) throw notFound();
  data[name][index] = { id, order: data[name][index].order, ...sanitize(def.fields, input) };
  await saveContent(data);
  await pruneUploads(data);
  return data[name][index];
}

async function deleteItem(name, id) {
  collectionOf(name);
  const data = await content();
  const before = data[name].length;
  data[name] = data[name].filter((item) => item.id !== id);
  if (data[name].length === before) throw notFound();
  await saveContent(data);
  await pruneUploads(data);
}

async function reorder(name, ids) {
  collectionOf(name);
  const data = await content();
  const list = data[name];
  if (!Array.isArray(ids) || ids.length !== list.length || new Set(ids).size !== ids.length) {
    throw new ValidationError('Invalid order');
  }
  const lookup = new Map(list.map((item) => [item.id, item]));
  ids.forEach((id, order) => {
    const item = lookup.get(id);
    if (!item) throw new ValidationError('Invalid order');
    item.order = order;
  });
  await saveContent(data);
}

// --- contact messages ---------------------------------------------------------------

// Kept small: one Redis value holds the whole inbox and the free tier caps a request at 1 MB.
const MESSAGE_CAP = 200;

const messages = async () => (await db.read('messages')) ?? [];

async function addMessage({ name, email, message }) {
  const list = await messages();
  list.unshift({ id: newId(), name, email, message, read: false, createdAt: new Date().toISOString() });
  if (list.length > MESSAGE_CAP) list.length = MESSAGE_CAP;
  await db.write('messages', list);
}

const listMessages = messages;
const unreadCount = async () => (await messages()).filter((m) => !m.read).length;

async function setMessageRead(id, read) {
  const list = await messages();
  const msg = list.find((m) => m.id === id);
  if (!msg) throw notFound();
  msg.read = !!read;
  await db.write('messages', list);
  return msg;
}

async function deleteMessage(id) {
  const list = await messages();
  const index = list.findIndex((m) => m.id === id);
  if (index === -1) throw notFound();
  list.splice(index, 1);
  await db.write('messages', list);
}

// --- traffic ------------------------------------------------------------------------

const dayKey = (date = new Date()) => `traffic:d:${date.toISOString().slice(0, 10)}`;
const NINETY_DAYS = 90 * 24 * 60 * 60;

const recordView = () => db.incr(['traffic:total', dayKey()], NINETY_DAYS);

async function trafficSummary() {
  const days = Array.from({ length: 7 }, (_, i) => dayKey(new Date(Date.now() - i * 864e5)));
  const [total, ...perDay] = await db.getMany(['traffic:total', ...days]);
  return { total, today: perDay[0], week: perDay.reduce((sum, n) => sum + n, 0) };
}

module.exports = {
  init,
  publicContent,
  updateSingleton,
  createItem,
  updateItem,
  deleteItem,
  reorder,
  addMessage,
  listMessages,
  unreadCount,
  setMessageRead,
  deleteMessage,
  recordView,
  trafficSummary,
};
