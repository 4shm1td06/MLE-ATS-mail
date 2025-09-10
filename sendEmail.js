import express from "express";
import nodemailer from "nodemailer";

const router = express.Router();

router.post("/send-email", async (req, res) => {
  try {
    const { to, subject, text, html, cc, attachments = [] } = req.body;

    const transporter = nodemailer.createTransport({
      service: "gmail", // or smtp config
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to,
      cc,
      subject,
      text,
      html,
      attachments, // ✅ forward directly
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("✅ Email sent:", info.messageId, "Attachments:", attachments.length);

    res.json({ success: true, messageId: info.messageId, attachments: attachments.length });
  } catch (error) {
    console.error("❌ Error sending email:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
