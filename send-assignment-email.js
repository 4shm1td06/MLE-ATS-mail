import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // service role for storage access
);

export default async function handler(req, res) {
  try {
    const { recruiterId, jobId } = req.body;

    // 1. Fetch recruiter
    const { data: recruiterData } = await supabase
      .from("users")
      .select("email, full_name")
      .eq("id", recruiterId)
      .single();

    // 2. Fetch job
    const { data: jobData } = await supabase
      .from("jobs")
      .select("title, client_id, mode, jd_url, jd_type, jd_text")
      .eq("id", jobId)
      .single();

    // 3. Fetch client
    let clientData = null;
    if (jobData?.client_id) {
      const { data } = await supabase
        .from("clients")
        .select("name")
        .eq("id", jobData.client_id)
        .single();
      clientData = data;
    }

    // 4. Prepare attachment (if uploaded)
    let attachments = [];
    if (jobData.jd_type === "upload" && jobData.jd_url) {
      const filePath = jobData.jd_url.split("/object/public/")[1];
      const { data, error } = await supabase.storage
        .from("job-descriptions")
        .download(filePath);

      if (error) throw error;

      const buffer = Buffer.from(await data.arrayBuffer());

      attachments.push({
        filename: `JD_${jobData.title}.pdf`,
        content: buffer,
        contentType: "application/pdf",
      });
    }

    // 5. Compose email
    const subject = `New Job Assigned: ${jobData.title} :: ${clientData?.name || "Unknown Client"} :: ${jobData.mode}`;
    const text = `Hi ${recruiterData.full_name},

You have been assigned a new job titled "${jobData.title}" for the client "${clientData?.name}".

Please log in to the ATS portal to view the job details and start aligning candidates.

Thanks,
MLE ATS Team`;

    // 6. Send email via nodemailer
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: `"MLE ATS" <${process.env.SMTP_USER}>`,
      to: recruiterData.email,
      cc: "alpha5sector@gmail.com",
      subject,
      text,
      attachments,
    });

    return res.status(200).json({ message: "Email sent" });
  } catch (err) {
    console.error("Error sending assignment email:", err);
    return res.status(500).json({ error: err.message });
  }
}
