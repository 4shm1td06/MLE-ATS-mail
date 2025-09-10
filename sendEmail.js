// server: send-email route
import fetch from "node-fetch";

app.post("/send-email", async (req, res) => {
  try {
    const { to, subject, text, html, cc, attachments } = req.body;

    let finalAttachments = [];

    if (attachments?.length) {
      for (const att of attachments) {
        if (att.path && att.path.startsWith("http")) {
          const response = await fetch(att.path);
          const buffer = await response.buffer();
          finalAttachments.push({
            filename: att.filename,
            content: buffer,
            contentType: response.headers.get("content-type") || "application/octet-stream",
          });
        } else {
          finalAttachments.push(att);
        }
      }
    }

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to,
      cc,
      subject,
      text,
      html,
      attachments: finalAttachments,
    });

    res.json({ message: "Email sent" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to send email" });
  }
});
