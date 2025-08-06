const sendEmail = async (to, subject, text, html, cc = []) => {
  try {
    const response = await fetch('http://localhost:4000/send-email' || 'https://mle-ats.vercel.app/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, subject, text, html, cc }), // ← Add cc here
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Email failed');
    console.log('Email sent successfully');
  } catch (error) {
    console.error('Failed to send email:', error.message);
  }
};
