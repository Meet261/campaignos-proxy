const express = require('express');
const cors    = require('cors');

const app = express();
app.use(express.json({ limit: '2mb' }));
app.use(cors());

// ── Health check ──────────────────────────────────────────────
app.get('/', (_req, res) => {
  res.json({ ok: true, service: 'CampaignOS SMTP Proxy' });
});

// ── Send endpoint ─────────────────────────────────────────────
// POST /send
// Body: { to, toName, subject, html, fromName }
app.post('/send', async (req, res) => {
  const { to, toName, subject, html, fromName } = req.body;

  if (!to || !subject || !html) {
    return res.status(400).json({ ok: false, error: 'Missing required fields: to, subject, html' });
  }

  const payload = {
    sender: {
      name:  fromName || process.env.BREVO_SENDER_NAME || 'CampaignOS',
      email: process.env.BREVO_SENDER_EMAIL
    },
    to: [{ email: to, name: toName || to }],
    subject,
    htmlContent: html
  };

  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method:  'POST',
      headers: {
        'accept':       'application/json',
        'content-type': 'application/json',
        'api-key':      process.env.BREVO_API_KEY
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[Brevo error]', data);
      return res.status(500).json({ ok: false, error: data.message || 'Brevo API error' });
    }

    res.json({ ok: true, messageId: data.messageId });
  } catch (err) {
    console.error('[Send error]', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ── Start ─────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`CampaignOS proxy listening on port ${PORT}`);
  console.log(`Brevo sender: ${process.env.BREVO_SENDER_EMAIL}`);
});
