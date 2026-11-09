const express = require('express');
const rateLimit = require('express-rate-limit');
const db = require('../db');
const store = require('../store');
const { EMAIL, ValidationError } = require('../schema');

const router = express.Router();

router.get('/content', async (req, res) => {
  res.set('Cache-Control', 'no-cache');
  res.json(await store.publicContent());
});

const contactStore = db.limiterStore('contact');
const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 6,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'You have sent a few messages already — please try again later.' },
  ...(contactStore && { store: contactStore }),
});

router.post('/contact', contactLimiter, async (req, res) => {
  const body = req.body || {};
  // Hidden "website" field: humans leave it empty, bots fill it in. Pretend it worked.
  if (body.website) return res.status(201).json({ ok: true });

  const name = String(body.name ?? '').trim();
  const email = String(body.email ?? '').trim();
  const message = String(body.message ?? '').trim();

  if (name.length < 2 || name.length > 80) throw new ValidationError('Please enter your name');
  if (!EMAIL.test(email) || email.length > 120) throw new ValidationError('Please enter a valid email address');
  if (message.length < 10 || message.length > 3000) throw new ValidationError('Your message should be between 10 and 3000 characters');

  await store.addMessage({ name, email, message });
  res.status(201).json({ ok: true });
});

module.exports = router;
