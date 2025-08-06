const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

app.post('/send-email', async (req, res) => {
  const { to, subject, text, html, cc , bcc } = req.body;

  // 🛡️ Ensure cc is an array (fallback to empty array)
  const ccList = Array.isArray(cc) ? cc : [];
  const bccList = Array.isArray(bcc) ? bcc : [];

  // ✅ Console logging
  console.log('📤 Sending Email...');
  console.log('🧑‍💼 To:', to);
  console.log('👥 CC:', ccList);
  console.log('👥 BCC:', bccList);
  console.log('📝 Subject:', subject);

  const mailOptions = {
    from: '"MLE ATS" <' + process.env.SMTP_USER + '>',
    to,
    cc: ccList,
    bcc: bccList,
    subject,
    text,
    html,
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

// Start the server (optional if not shown earlier)
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`📡 Server running on port ${PORT}`));
