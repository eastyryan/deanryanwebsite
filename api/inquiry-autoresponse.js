// Auto-response for contact-form inquiries.
//
// Sends the CUSTOMER a "thanks, we got your inquiry" email. If the inquiry is
// inside the Barrhaven service area (postal code starts with K2J or K2G), the
// email also carries the service contract PDF as an attachment.
//
// Emails go out via Resend (https://resend.com). The OWNER notification email is
// handled separately by Web3Forms in assets/js/main.js — this function only
// emails the customer.
//
// This replaces the old Supabase Edge Function, which died when the Supabase
// project was deleted. Running it on Vercel keeps it same-origin with the site
// (no CORS, no anon key in the browser) and removes the Supabase dependency.
//
// Required environment variable (Vercel → Project → Settings → Environment Variables):
//   RESEND_API_KEY   — from resend.com/api-keys
// Optional overrides:
//   FROM_EMAIL       — defaults to "Dean Ryans Enterprises <inquiries@deanryans.com>"
//   REPLY_TO         — where customer replies land, defaults to deanryans@rogers.com
//   BCC_EMAIL        — copy the owner on every auto-response
//   CONTRACT_PDF_URL — defaults to the contract.pdf on this same deployment

const FROM_EMAIL =
  process.env.FROM_EMAIL || 'Dean Ryans Enterprises <inquiries@deanryans.com>';
const REPLY_TO = process.env.REPLY_TO || 'deanryans@rogers.com';
const BCC_EMAIL = process.env.BCC_EMAIL || '';

// Barrhaven service area — forward sortation areas K2J and K2G.
function isBarrhavenPostal(postal) {
  return /^K2[JG]/.test(String(postal || '').replace(/\s+/g, '').toUpperCase());
}

function esc(s) {
  return String(s == null ? '' : s).replace(/[<>&]/g, function (c) {
    return c === '<' ? '&lt;' : c === '>' ? '&gt;' : '&amp;';
  });
}

// Resolve the contract PDF against this deployment so preview builds attach
// their own copy rather than reaching into production.
function contractUrl(req) {
  if (process.env.CONTRACT_PDF_URL) return process.env.CONTRACT_PDF_URL;
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const proto = req.headers['x-forwarded-proto'] || 'https';
  return host
    ? proto + '://' + host + '/assets/contract.pdf'
    : 'https://www.deanryans.com/assets/contract.pdf';
}

// Fetch the contract PDF and base64-encode it for a Resend attachment.
async function fetchContractBase64(url) {
  try {
    const res = await fetch(url, { redirect: 'follow' });
    if (!res.ok) {
      console.error('Contract PDF fetch failed:', res.status, url);
      return null;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    if (!buf.length) {
      console.error('Contract PDF fetched but empty:', url);
      return null;
    }
    return buf.toString('base64');
  } catch (err) {
    console.error('Contract PDF fetch threw:', err && err.message, url);
    return null;
  }
}

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!process.env.RESEND_API_KEY) {
    console.error('RESEND_API_KEY is not set — cannot send auto-response');
    return res.status(500).json({ error: 'Email service not configured' });
  }

  // Vercel parses JSON bodies automatically, but tolerate a raw string too.
  let data = req.body;
  if (typeof data === 'string') {
    try {
      data = JSON.parse(data);
    } catch {
      return res.status(400).json({ error: 'Invalid JSON' });
    }
  }
  if (!data || typeof data !== 'object') {
    return res.status(400).json({ error: 'Invalid JSON' });
  }

  const name = String(data.name || '').trim();
  const email = String(data.email || '').trim();
  const postal = String(data.postal_code || '').trim();
  const service = String(data.service || '').trim();

  // Need a real address to reply to.
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return res.status(400).json({ error: 'Valid email required' });
  }

  const barrhaven = isBarrhavenPostal(postal);
  const firstName = name ? name.split(/\s+/)[0] : 'there';

  const attachments = [];
  if (barrhaven) {
    const pdf = await fetchContractBase64(contractUrl(req));
    if (pdf) {
      attachments.push({
        filename: 'Dean-Ryans-Service-Contract.pdf',
        content: pdf,
      });
    } else {
      console.warn('Barrhaven inquiry but contract PDF unavailable:', contractUrl(req));
    }
  }

  const contractBlurb =
    barrhaven && attachments.length
      ? '<p>Great news — your property is right in our Barrhaven service area, so we’ve attached our service contract to help you get started right away. Review it at your convenience and reply to this email with any questions.</p>'
      : '<p>We’ll review your request and get back to you within one business day with next steps.</p>';

  const subject =
    barrhaven && attachments.length
      ? 'Your Dean Ryans inquiry — service contract enclosed'
      : 'We received your inquiry — Dean Ryans Enterprises';

  const html =
    '<div style="font-family:Arial,Helvetica,sans-serif;color:#1a1a1a;line-height:1.6;max-width:560px">' +
    '<p>Hi ' + esc(firstName) + ',</p>' +
    '<p>Thanks for reaching out to <strong>Dean Ryans Enterprises</strong>' +
    (service ? ' about <strong>' + esc(service) + '</strong>' : '') +
    '. We’ve received your inquiry.</p>' +
    contractBlurb +
    '<p>If you need us sooner, call <a href="tel:6138257913">613.825.7913</a>.</p>' +
    '<p style="margin-top:24px">— The Dean Ryans Enterprises Team<br>' +
    '<span style="color:#666">Serving Ottawa &amp; Barrhaven since 1991</span></p>' +
    '</div>';

  const payload = {
    from: FROM_EMAIL,
    to: [email],
    reply_to: REPLY_TO,
    subject: subject,
    html: html,
  };
  if (BCC_EMAIL) payload.bcc = [BCC_EMAIL];
  if (attachments.length) payload.attachments = attachments;

  let resend;
  try {
    resend = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + process.env.RESEND_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.error('Resend request failed:', err && err.message);
    return res.status(502).json({ error: 'Failed to send auto-response' });
  }

  if (!resend.ok) {
    const detail = await resend.text();
    console.error('Resend error:', resend.status, detail);
    return res.status(502).json({ error: 'Failed to send auto-response' });
  }

  return res
    .status(200)
    .json({ ok: true, barrhaven: barrhaven, contract_sent: attachments.length > 0 });
};
