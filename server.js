// server.js

const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// ✅ Create Nodemailer transporter using Gmail SMTP
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// ✅ Route to send email
app.post('/send-email', async (req, res) => {
  const { to, subject, text, html, cc, bcc, attachments } = req.body;

  // Normalize CC and BCC
  const ccList = Array.isArray(cc) ? cc : cc ? [cc] : [];
  const bccList = Array.isArray(bcc) ? bcc : bcc ? [bcc] : [];

  // Logging
  console.log('\n📤 Sending Email...');
  console.log('🧑‍💼 To:', to);
  console.log('👥 CC:', ccList);
  console.log('👥 BCC:', bccList);
  console.log('📝 Subject:', subject);
  console.log('📎 Attachments:', attachments?.length || 0);

  const mailOptions = {
    from: `"MLE ATS" <${process.env.SMTP_USER}>`,
    to,
    cc: ccList,
    bcc: bccList,
    subject,
    text,
    html,
    attachments: attachments || [], // ✅ Pass attachments if provided
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent! Message ID:', info.messageId);
    res.status(200).json({ message: 'Email sent successfully', id: info.messageId });
  } catch (error) {
    console.error('❌ Failed to send email:', error.message);
    res.status(500).json({ message: 'Failed to send email', error: error.toString() });
  }
});

// ✅ Route to ping SMTP connection
app.get('/ping', async (req, res) => {
  try {
    await transporter.verify();
    console.log('✅ SMTP connection OK');
    res.status(200).send('SMTP server is alive');
  } catch (err) {
    console.error('❌ SMTP connection failed:', err.message);
    res.status(500).send('SMTP server connection failed');
  }
});

// ✅ Start server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`\n📡 Server running on port ${PORT}`);
});
