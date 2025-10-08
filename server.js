// server.js
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const nodemailer = require('nodemailer');
require('dotenv').config();

const app = express();
const upload = multer(); // in-memory storage

// -----------------------
// Middleware
// -----------------------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  cors({
    origin: ['http://localhost:3000', 'https://mle-ats.vercel.app'],
    methods: ['GET', 'POST', 'OPTIONS'],
    credentials: true,
  })
);

// -----------------------
// Ping route
// -----------------------
app.get('/ping', (req, res) => res.status(200).send('Server is alive'));

// -----------------------
// /send-email route (Gmail SMTP)
// -----------------------
app.post('/send-email', upload.single('resume'), async (req, res) => {
  const { to, subject, text, html } = req.body;
  const resumeFile = req.file;

  if (!to || !subject || (!text && !html)) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  try {
    // Configure transporter for Gmail SMTP
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: process.env.SMTP_SECURE === 'true', // false for 587
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    // Build email
    const mailOptions = {
      from: `"MLE ATS" <${process.env.SMTP_USER}>`,
      to,
      subject,
      text,
      html,
      attachments: resumeFile
        ? [
            {
              filename: resumeFile.originalname,
              content: resumeFile.buffer,
            },
          ]
        : [],
    };

    // Send email
    await transporter.sendMail(mailOptions);

    res.status(200).json({ message: 'Email sent successfully via Gmail SMTP' });
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
// -----------------------