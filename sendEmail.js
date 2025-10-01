const sendEmail = async (
  to,
  subject,
  text,
  html,
  cc = [],
  extraAttachments = []
) => {
  try {
    const formData = new FormData();
    formData.append("to", to);
    formData.append("subject", subject);
    formData.append("text", text);
    if (html) formData.append("html", html);

    // Attach any extra attachments (files)
    extraAttachments.forEach((file) => {
      // file should be a File or Blob
      formData.append("resume", file);
    });

    const response = await fetch(
      process.env.NODE_ENV === "production"
        ? "https://mle-ats-mail.vercel.app/send-email"
        : "http://localhost:4000/send-email",
      {
        method: "POST",
        body: formData, // DO NOT set Content-Type for FormData
      }
    );

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Email failed");
    console.log("✅ Email sent successfully");
  } catch (error) {
    console.error("❌ Failed to send email:", error.message);
  }
};

export default sendEmail;
