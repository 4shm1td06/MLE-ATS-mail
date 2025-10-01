// sendEmail.js
const sendEmail = async ({ to, subject, text, html, resumeFile }) => {
  try {
    if (!to || !subject || (!text && !html)) {
      throw new Error('Missing required email fields');
    }

    const formData = new FormData();
    formData.append('to', to);
    formData.append('subject', subject);
    if (text) formData.append('text', text);
    if (html) formData.append('html', html);
    if (resumeFile) formData.append('resume', resumeFile);

    const response = await fetch(
      process.env.NODE_ENV === 'production'
        ? 'https://mle-ats-mail.vercel.app/send-email'
        : 'http://localhost:4000/send-email',
      {
        method: 'POST',
        body: formData,
      }
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to send email');
    }

    console.log('✅ Email sent successfully');
    return result;
  } catch (error) {
    console.error('❌ Failed to send email:', error.message);
    throw error;
  }
};

export default sendEmail;
