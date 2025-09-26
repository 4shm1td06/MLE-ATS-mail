// server.js
const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// ✅ Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ✅ Nodemailer transporter using Gmail
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// ✅ Route to send assignment email with JD
app.post('/send-assignment-email', async (req, res) => {
  try {
    const { recruiterId, jobId } = req.body;

    // 1️⃣ Fetch recruiter
    const { data: recruiterData, error: recruiterError } = await supabase
      .from('users')
      .select('email, full_name')
      .eq('id', recruiterId)
      .single();
    if (recruiterError || !recruiterData) throw recruiterError || new Error('Recruiter not found');

    // 2️⃣ Fetch job
    const { data: jobData, error: jobError } = await supabase
      .from('jobs')
      .select('title, client_id, mode, jd_url, jd_type, jd_text')
      .eq('id', jobId)
      .single();
    if (jobError || !jobData) throw jobError || new Error('Job not found');

    // 3️⃣ Fetch client
    let clientName = 'Unknown Client';
    if (jobData.client_id) {
      const { data: clientData } = await supabase
        .from('clients')
        .select('name')
        .eq('id', jobData.client_id)
        .single();
      if (clientData) clientName = clientData.name;
    }

    // 4️⃣ Prepare attachment if JD uploaded
    let attachments = [];
    let jdContentInline = '';

    if (jobData.jd_type === 'upload' && jobData.jd_url) {
      const filePath = jobData.jd_url;
      const { data: fileData, error: fileError } = await supabase.storage
        .from('job-descriptions') // bucket name
        .download(filePath);
      if (fileError) throw fileError;

      const buffer = Buffer.from(await fileData.arrayBuffer());
      const filename = filePath.split('/').pop();
      const ext = filename.split('.').pop().toLowerCase();
      let contentType = 'application/octet-stream';
      if (ext === 'pdf') contentType = 'application/pdf';
      if (ext === 'docx') contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      if (ext === 'doc') contentType = 'application/msword';
      if (ext === 'txt') contentType = 'text/plain';

      attachments.push({ filename, content: buffer, contentType });
      jdContentInline = `JD attached: ${filename}`;
    } else if (jobData.jd_text) {
      // If no upload, use jd_text inline
      jdContentInline = jobData.jd_text;
    } else {
      jdContentInline = 'No JD provided';
    }

    // 5️⃣ Compose email
    const subject = `New Job Assigned: ${jobData.title} :: ${clientName} :: ${jobData.mode}`;
    const text = `Hi ${recruiterData.full_name},

You have been assigned a new job titled "${jobData.title}" for the client "${clientName}".

Job Description:
${jdContentInline}

Please log in to the ATS portal to view the job details and start aligning candidates.

Thanks,
MLE ATS Team`;

    const html = `<p>Hi <strong>${recruiterData.full_name}</strong>,</p>
<p>You have been assigned a new job titled <strong>${jobData.title}</strong> for the client <strong>${clientName}</strong>.</p>
<p><strong>Job Description:</strong><br/>${jdContentInline.replace(/\n/g, '<br/>')}</p>
<p>Please <a href="https://mle-ats.vercel.app">log in to the ATS portal</a> to view full job details and start aligning candidates.</p>
<p>Thanks,<br/>MLE ATS Team</p>`;

    // 6️⃣ Send email
    const info = await transporter.sendMail({
      from: `"MLE ATS" <${process.env.SMTP_USER}>`,
      to: recruiterData.email,
      cc: 'alpha5sector@gmail.com',
      subject,
      text,
      html,
      attachments,
    });

    console.log('✅ Email sent:', info.messageId);
    res.status(200).json({ message: 'Email sent', id: info.messageId });
  } catch (err) {
    console.error('❌ Failed to send assignment email:', err);
    res.status(500).json({ error: err.message });
  }
});

// ✅ Ping SMTP
app.get('/ping', async (req, res) => {
  try {
    await transporter.verify();
    res.status(200).send('SMTP server is alive');
  } catch (err) {
    res.status(500).send('SMTP connection failed: ' + err.message);
  }
});

// ✅ Start server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`📡 Server running on port ${PORT}`));
