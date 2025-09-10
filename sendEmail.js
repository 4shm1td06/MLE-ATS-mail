// send-email.js

const sendEmail = async (to, subject, text, html, cc = [], jobData = null) => {
  try {
    let attachments = [];

    // ✅ Handle JD attachment if upload type
    if (jobData?.jd_type === "upload" && jobData.jd_url) {
      // Try to extract filename from the URL
      const urlParts = jobData.jd_url.split("/");
      const originalName = urlParts[urlParts.length - 1] || `JD_${jobData.title}.pdf`;

      attachments.push({
        filename: originalName,
        path: jobData.jd_url, // Nodemailer will fetch this
      });
    }

    const response = await fetch(
      process.env.NODE_ENV === "production"
        ? "https://mle-ats.vercel.app/send-email"
        : "http://localhost:4000/send-email",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to, subject, text, html, cc, attachments }),
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
