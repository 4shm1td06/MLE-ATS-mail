// server.js
const express = require('express');
const cors = require('cors');
const multer = require('multer');
require('dotenv').config();
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));


const app = express();
const upload = multer(); // in-memory storage

// -----------------------
// CORS configuration
// -----------------------
const corsOptions = {
  origin: ['http://localhost:3000', 'https://mle-ats.vercel.app'],
  methods: ['GET', 'POST', 'OPTIONS'],
  credentials: true,
};

// Handle preflight requests for all routes
app.options('*', cors(corsOptions));

// -----------------------
// Ping route
// -----------------------
app.get('/ping', cors(corsOptions), (req, res) => res.status(200).send('Server is alive'));

// -----------------------
// /send-email route
// -----------------------
app.post('/send-email', cors(corsOptions), upload.single('resume'), async (req, res) => {
  const { to, subject, text, html } = req.body;
  const resumeFile = req.file; // uploaded file

  if (!to || !subject || (!text && !html)) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  try {
    const emailPayload = {
      personalizations: [{ to: [{ email: to }] }],
      from: { email: 'noreply@mlesystems.com' },
      subject,
      content: [{ type: 'text/plain', value: text || '' }],
    };

    if (html) {
      emailPayload.content.push({ type: 'text/html', value: html });
    }

    if (resumeFile) {
      emailPayload.attachments = [
        {
          content: resumeFile.buffer.toString('base64'),
          filename: resumeFile.originalname,
          type: resumeFile.mimetype,
          disposition: 'attachment',
        },
      ];
    }

    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailPayload),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(errText);
    }

    res.status(200).json({ message: 'Email sent successfully' });
  } catch (err) {
    console.error('❌ Failed to send email:', err.message);
    res.status(500).json({ message: 'Failed to send email', error: err.message });
  }
});

// -----------------------
// Start server
// -----------------------
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`📡 Server running on port ${PORT}`));
// new