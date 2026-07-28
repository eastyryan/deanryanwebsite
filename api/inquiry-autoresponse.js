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
// The contract is attached ONLY when BOTH are true:
//   - the service requested is Snow Removal, and
//   - the postal code is in the Barrhaven auto-send area (K2J / K2G).
// A Barrhaven lawn-care lead gets a plain confirmation, not a snow contract.
//
// Required environment variable (Vercel → Project → Settings → Environment Variables):
//   RESEND_API_KEY   — from resend.com/api-keys
// Optional overrides:
//   FROM_EMAIL       — defaults to "Dean Ryans Enterprises <inquiries@deanryans.com>"
//   REPLY_TO         — where customer replies land, defaults to deanryans@rogers.com
//   BCC_EMAIL        — copy the owner on every auto-response
//   CONTRACT_PDF_URL — defaults to the contract.pdf on this same deployment
//   LOGO_URL         — defaults to the signature logo on this same deployment

const FROM_EMAIL =
  process.env.FROM_EMAIL || 'Dean Ryans Enterprises <inquiries@deanryans.com>';
const REPLY_TO = process.env.REPLY_TO || 'deanryans@rogers.com';
const BCC_EMAIL = process.env.BCC_EMAIL || '';
// Brand red (matches primary-container in assets/js/config.js), dark enough to
// stay legible as a link on the white background email clients render on.
const LINK = '#8b1d1d';

// Barrhaven auto-send area — forward sortation areas K2J and K2G.
function isBarrhavenPostal(postal) {
  return /^K2[JG]/.test(String(postal || '').replace(/\s+/g, '').toUpperCase());
}

// The contract covers snow removal only. Matches the "Snow Removal" dropdown
// value, and stays tolerant of wording changes to that option.
function isSnowRemoval(service) {
  return /snow/i.test(String(service || ''));
}

function esc(s) {
  return String(s == null ? '' : s).replace(/[<>&]/g, function (c) {
    return c === '<' ? '&lt;' : c === '>' ? '&gt;' : '&amp;';
  });
}

// Resolve site assets against this deployment so preview builds use their own
// copies rather than reaching into production.
function assetUrl(req, path) {
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const proto = req.headers['x-forwarded-proto'] || 'https';
  return (host ? proto + '://' + host : 'https://www.deanryans.com') + path;
}

function contractUrl(req) {
  return process.env.CONTRACT_PDF_URL || assetUrl(req, '/assets/contract.pdf');
}

function logoUrl(req) {
  return process.env.LOGO_URL || assetUrl(req, '/assets/images/logo.png');
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
  const snow = isSnowRemoval(service);
  // Snow contract goes out only to snow-removal leads inside the auto-send area.
  const contractEligible = barrhaven && snow;
  const firstName = name ? name.split(/\s+/)[0] : 'there';

  const attachments = [];
  if (contractEligible) {
    const pdf = await fetchContractBase64(contractUrl(req));
    if (pdf) {
      attachments.push({
        filename: 'Dean-Ryans-Snow-Removal-Contract.pdf',
        content: pdf,
      });
    } else {
      console.warn(
        'Eligible snow-removal inquiry but contract PDF unavailable:',
        contractUrl(req)
      );
    }
  }

  const contractBlurb =
    attachments.length
      ? '<p>Great news — your property is right in our Barrhaven snow removal area, so we’ve attached our snow removal contract to help you get started right away. Review it at your convenience and reply to this email with any questions.</p>'
      : '<p>We’ll review your request and get back to you within one business day with next steps.</p>';

  const subject = attachments.length
    ? 'Your Dean Ryans snow removal inquiry — contract enclosed'
    : 'We received your inquiry — Dean Ryans Enterprises';

  const html =
    '<div style="font-family:Arial,Helvetica,sans-serif;color:#1a1a1a;line-height:1.6;max-width:560px">' +
    '<p>Hi ' + esc(firstName) + ',</p>' +
    '<p>Thanks for reaching out to <strong>Dean Ryans Enterprises</strong>' +
    (service ? ' about <strong>' + esc(service) + '</strong>' : '') +
    '. We’ve received your inquiry.</p>' +
    contractBlurb +
    '<p>If you need us sooner, call <a href="tel:6138257913">613.825.7913</a>.</p>' +
    // Signature: bold name, tagline, contact links, then the logo.
    '<div style="margin-top:28px">' +
    '<div style="font-weight:bold">DeanRyans</div>' +
    '<div style="color:#555">Trusted Property Maintenance since 1991</div>' +
    '<div style="margin-top:8px">' +
    '<a href="https://www.deanryans.com" style="color:' + LINK + '">deanryans.com</a><br>' +
    '<a href="mailto:deanryans@rogers.com" style="color:' + LINK + '">deanryans@rogers.com</a><br>' +
    '<a href="tel:6138257913" style="color:' + LINK + '">613.825.7913</a>' +
    '</div>' +
    '<img src="' + logoUrl(req) + '" width="260" ' +
    'alt="DeanRyans — Landscape / Property Maintenance — www.deanryans.com" ' +
    'style="display:block;margin-top:14px;width:260px;max-width:100%;height:auto;border:0">' +
    '</div>' +
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

  return res.status(200).json({
    ok: true,
    barrhaven: barrhaven,
    snow_removal: snow,
    contract_sent: attachments.length > 0,
  });
};
