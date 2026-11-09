// Uploaded files (images and the CV). On Vercel they go to Vercel Blob, because the
// filesystem there is read-only; locally they are plain files in ./uploads.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const db = require('./db');

const useBlob = Boolean(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID);

const UPLOAD_DIR = process.env.UPLOAD_DIR ? path.resolve(process.env.UPLOAD_DIR) : path.join(__dirname, '..', 'uploads');
if (!useBlob && !db.serverless) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// A request body over 4.5 MB is rejected by Vercel before it reaches the app.
const MAX_BYTES = (db.serverless ? 4 : 8) * 1024 * 1024;

const TYPES = { png: 'image/png', jpg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', pdf: 'application/pdf' };

async function save(buffer, ext) {
  if (useBlob) {
    const { put } = require('@vercel/blob');
    try {
      const blob = await put(`uploads/upload.${ext}`, buffer, { access: 'public', addRandomSuffix: true, contentType: TYPES[ext] });
      return blob.url;
    } catch (err) {
      throw Object.assign(
        new Error(`Could not store the file in Vercel Blob. Make sure the Blob store is PUBLIC and connected to this project. (${err.message})`),
        { status: 500, expose: true },
      );
    }
  }
  if (db.serverless) {
    throw Object.assign(
      new Error('Uploads need a Blob store. In Vercel open Storage, create a PUBLIC Blob store, connect it to this project, then redeploy.'),
      { status: 503, expose: true },
    );
  }
  const name = `${Date.now().toString(36)}-${crypto.randomBytes(5).toString('hex')}.${ext}`;
  fs.writeFileSync(path.join(UPLOAD_DIR, name), buffer);
  return `/uploads/${name}`;
}

const collectStrings = (value, found) => {
  if (typeof value === 'string') found.add(value);
  else if (Array.isArray(value)) value.forEach((v) => collectStrings(v, found));
  else if (value && typeof value === 'object') Object.values(value).forEach((v) => collectStrings(v, found));
  return found;
};

// Delete uploaded files nothing points to any more. Files younger than 15 minutes are kept
// so an image uploaded in a form that is still open isn't removed before it is saved.
async function prune(content) {
  const used = collectStrings(content, new Set());
  const cutoff = Date.now() - 15 * 60 * 1000;

  if (useBlob) {
    const { list, del } = require('@vercel/blob');
    const stale = [];
    let cursor;
    do {
      const page = await list({ prefix: 'uploads/', cursor });
      for (const blob of page.blobs) {
        if (!used.has(blob.url) && new Date(blob.uploadedAt).getTime() < cutoff) stale.push(blob.url);
      }
      cursor = page.hasMore ? page.cursor : undefined;
    } while (cursor);
    if (stale.length) await del(stale);
    return;
  }

  if (db.serverless) return;
  for (const file of fs.readdirSync(UPLOAD_DIR)) {
    if (used.has(`/uploads/${file}`) || file.startsWith('.')) continue;
    const full = path.join(UPLOAD_DIR, file);
    try {
      if (fs.statSync(full).mtimeMs < cutoff) fs.unlinkSync(full);
    } catch {
      /* already gone */
    }
  }
}

module.exports = { save, prune, MAX_BYTES, UPLOAD_DIR, useBlob };
