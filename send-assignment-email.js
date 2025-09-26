// /api/send-assignment-email.js
import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Service role key required for storage access
);

export default async function handler(req, res) {
  try {
    const { recruiterId, jobId } = req.body;

    if (!recruiterId || !jobId) {
      return res.status(400).json({ error: "Missing recruiterId or jobId" });
    }

    // 1️⃣ Fetch recruiter info
    const { data: recruiterData, error: recruiterError } = await supabase
      .from("users")
      .select("email, full_name")
      .eq("id", recruiterId)
      .single();
    if (recruiterError || !recruiterData) throw recruiterError || new Error("Recruiter not found");

    // 2️⃣ Fetch job info
    const { data: jobData, error: jobError } = await supabase
      .from("jobs")
      .select("title, client_id, mode, jd_url, jd_type, jd_text, salary_min, salary_max , location")
      .eq("id", jobId)
      .single();
    if (jobError || !jobData) throw jobError || new Error("Job not found");

    // 3️⃣ Fetch client info (optional)
    let clientData = null;
    if (jobData.client_id) {
      const { data, error } = await supabase
        .from("clients")
        .select("name")
        .eq("id", jobData.client_id)
        .single();
      if (!error) clientData = data;
    }

    // 4️⃣ Prepare JD attachment
    let attachments = [];
    let jdContent = "No JD provided";

    if (jobData.jd_type === "upload" && jobData.jd_url) {
      // Download file from Supabase
      const { data: fileData, error: fileError } = await supabase.storage
        .from("job-descriptions") // replace with your bucket name
        .download(jobData.jd_url);

      if (fileError) throw fileError;

      const buffer = Buffer.from(await fileData.arrayBuffer());
      const filename = jobData.jd_url.split("/").pop();
      const ext = filename.split(".").pop().toLowerCase();

      // Determine MIME type
      let contentType = "application/octet-stream";
      if (ext === "pdf") contentType = "application/pdf";
      else if (ext === "docx") contentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
      else if (ext === "doc") contentType = "application/msword";
      else if (ext === "txt") contentType = "text/plain";

      attachments.push({
        filename,
        content: buffer,
        contentType,
      });

      jdContent = "Attachment included";
    } else if (jobData.jd_type === "text" && jobData.jd_text) {
      attachments.push({
        filename: `JD_${jobData.title}.txt`,
        content: jobData.jd_text,
        contentType: "text/plain",
      });
      jdContent = jobData.jd_text.substring(0, 200) + (jobData.jd_text.length > 200 ? "..." : "");
    }

    // 5️⃣ Compose email
    const subject = `New Job Assigned: ${jobData.title} :: ${clientData?.name || "Unknown Client"} :: ${jobData.mode}`;
    const text = `Hi ${recruiterData.full_name},

You have been assigned a new job titled "${jobData.title}" for the client "${clientData?.name || "Unknown Client"}".

Please log in to the ATS portal to view the job details and start aligning candidates.

Thanks,
MLE ATS Team`;

    const html = `
      <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.5;">
        <p>Hi <strong>${recruiterData.full_name}</strong>,</p>
        <p>You have been assigned a new job. Please find the details below:</p>
        
        <table style="border-collapse: collapse; width: 100%; max-width: 600px; margin: 20px 0; border: 1px solid #ddd;">
          <tr style="background-color: #f4f4f4;">
            <th style="text-align: left; padding: 10px; border: 1px solid #ddd;">Field</th>
            <th style="text-align: left; padding: 10px; border: 1px solid #ddd;">Details</th>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd;">Job Title</td>
            <td style="padding: 10px; border: 1px solid #ddd;">${jobData.title}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd;">Client</td>
            <td style="padding: 10px; border: 1px solid #ddd;">${clientData?.name || 'Unknown Client'}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd;">Job Mode</td>
            <td style="padding: 10px; border: 1px solid #ddd;">${jobData.mode}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd;">Job Description</td>
            <td style="padding: 10px; border: 1px solid #ddd;">${jobData.salary_max} - ${jobData.salary_min}</td>
          </tr>
        </table>

        <p>
          Please <a href="https://mle-ats.vercel.app" 
          style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
          Log in to ATS Portal</a> to view full job details and start aligning candidates.
        </p>

        <p>Thanks,<br/>MLE ATS Team</p>
      </div>
    `;

    // 6️⃣ Configure Gmail SMTP
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 465,
      secure: true, // true for 465
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS, // Gmail App Password
      },
    });

    // 7️⃣ Send email
    await transporter.sendMail({
      from: `"MLE ATS" <${process.env.SMTP_USER}>`,
      to: recruiterData.email,
      cc: "alpha5sector@gmail.com",
      subject,
      text,
      html,
      attachments,
    });

    return res.status(200).json({ message: "Email sent successfully" });

  } catch (err) {
    console.error("Error sending assignment email:", err);
    return res.status(500).json({ error: err.message });
  }
}
