const express    = require('express');
const nodemailer = require('nodemailer');
const cors       = require('cors');

const app = express();
app.use(express.json({ limit: '2mb' }));

// ── CORS ──────────────────────────────────────────────────────
// Allow requests from any origin (the HTML file can be opened locally
// or hosted anywhere). Tighten this to your domain if you prefer.
app.use(cors());

// ── SMTP transporter ─────────────────────────────────────────
// All config comes from environment variables — never hard-coded.
const transporter = nodemailer.createTransport({
  host:   process.env.SMTP_HOST,
  port:   parseInt(process.env.SMTP_PORT || '587', 10),
  secure: process.env.SMTP_SECURE === 'true',   // true = port 465 (SSL), false = STARTTLS
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// ── Health check ──────────────────────────────────────────────
app.get('/', (_req, res) => {
  res.json({ ok: true, service: 'CampaignOS SMTP Proxy' });
});

// ── Send endpoint ─────────────────────────────────────────────
// POST /send
// Body: { to, toName, subject, html, fromName, fromEmail, replyTo? }
app.post('/send', async (req, res) => {
  const { to, toName, subject, html, fromName, fromEmail, replyTo } = req.body;

  // Basic validation
  if (!to || !subject || !html) {
    return res.status(400).json({ ok: false, error: 'Missing required fields: to, subject, html' });
  }

  // The "from" address must match the authenticated SMTP user to avoid
  // rejection. We use SMTP_USER as the actual sender, fromEmail is cosmetic.
  const fromAddress = fromName
    ? `"${fromName}" <${process.env.SMTP_USER}>`
    : process.env.SMTP_USER;

  try {
    await transporter.sendMail({
      from:    fromAddress,
      to:      toName ? `"${toName}" <${to}>` : to,
      replyTo: replyTo || undefined,
      subject,
      html
    });
    res.json({ ok: true });
  } catch (err) {
    console.error('[SMTP error]', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ── Start ─────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`CampaignOS SMTP proxy listening on port ${PORT}`);
  console.log(`SMTP: ${process.env.SMTP_USER}@${process.env.SMTP_HOST}:${process.env.SMTP_PORT}`);
});
