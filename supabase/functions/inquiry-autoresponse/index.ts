// Auto-response for contact-form inquiries.
//
// Sends the customer a "thanks, we got your inquiry" email. If the inquiry is
// inside the Barrhaven service area (postal code starts with K2J or K2G), the
// email also carries the service contract PDF as an attachment.
//
// Emails are sent via Resend (https://resend.com). The owner notification email
// is still handled separately by Web3Forms on the website — this function only
// emails the CUSTOMER.
//
// Configure these as function secrets (see SETUP-inquiry-autoresponse.md):
//   RESEND_API_KEY   — required, from resend.com/api-keys
//   FROM_EMAIL       — e.g. "Dean Ryans Enterprises <inquiries@deanryans.com>"
//   CONTRACT_PDF_URL — public URL of the contract PDF to attach for Barrhaven
//   BCC_EMAIL        — optional, copies the owner on the auto-response

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const FROM_EMAIL =
  Deno.env.get("FROM_EMAIL") ?? "Dean Ryans Enterprises <onboarding@resend.dev>";
const CONTRACT_PDF_URL =
  Deno.env.get("CONTRACT_PDF_URL") ??
  "https://deanryanwebsite.vercel.app/assets/contract.pdf";
const BCC_EMAIL = Deno.env.get("BCC_EMAIL") ?? "";
// Where customer "Reply" goes — your real inbox (no mailbox needed on the domain).
const REPLY_TO = Deno.env.get("REPLY_TO") ?? "deanryans@rogers.com";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });

function isBarrhavenPostal(postal: string): boolean {
  const p = (postal || "").replace(/\s+/g, "").toUpperCase();
  return /^K2[JG]/.test(p);
}

function esc(s: string): string {
  return String(s || "").replace(/[<>&]/g, (c) =>
    c === "<" ? "&lt;" : c === ">" ? "&gt;" : "&amp;"
  );
}

// Fetch the contract PDF and return it base64-encoded for a Resend attachment.
async function fetchContractBase64(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buf = new Uint8Array(await res.arrayBuffer());
    let binary = "";
    const chunk = 0x8000;
    for (let i = 0; i < buf.length; i += chunk) {
      binary += String.fromCharCode(...buf.subarray(i, i + chunk));
    }
    return btoa(binary);
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  if (!RESEND_API_KEY) {
    console.error("RESEND_API_KEY is not set");
    return json({ error: "Email service not configured" }, 500);
  }

  let data: Record<string, string>;
  try {
    data = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const name = (data.name || "").trim();
  const email = (data.email || "").trim();
  const postal = (data.postal_code || "").trim();
  const service = (data.service || "").trim();

  // Basic validation — need a real email to reply to.
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return json({ error: "Valid email required" }, 400);
  }

  const barrhaven = isBarrhavenPostal(postal);
  const firstName = name ? name.split(/\s+/)[0] : "there";

  const attachments: Array<{ filename: string; content: string }> = [];
  if (barrhaven) {
    const pdf = await fetchContractBase64(CONTRACT_PDF_URL);
    if (pdf) {
      attachments.push({ filename: "Dean-Ryans-Service-Contract.pdf", content: pdf });
    } else {
      console.warn("Barrhaven inquiry but contract PDF could not be fetched:", CONTRACT_PDF_URL);
    }
  }

  const contractBlurb = barrhaven && attachments.length
    ? `<p>Great news — your property is right in our Barrhaven service area, so we've attached our service contract to help you get started right away. Review it at your convenience and reply to this email with any questions.</p>`
    : `<p>We'll review your request and get back to you within one business day with next steps.</p>`;

  const subject = barrhaven && attachments.length
    ? "Your Dean Ryans inquiry — service contract enclosed"
    : "We received your inquiry — Dean Ryans Enterprises";

  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;color:#1a1a1a;line-height:1.6;max-width:560px">
      <p>Hi ${esc(firstName)},</p>
      <p>Thanks for reaching out to <strong>Dean Ryans Enterprises</strong>${
        service ? ` about <strong>${esc(service)}</strong>` : ""
      }. We've received your inquiry.</p>
      ${contractBlurb}
      <p>If you need us sooner, call <a href="tel:6138257913">613.825.7913</a>.</p>
      <p style="margin-top:24px">— The Dean Ryans Enterprises Team<br>
      <span style="color:#666">Serving Ottawa &amp; Barrhaven since 1991</span></p>
    </div>`;

  const payload: Record<string, unknown> = {
    from: FROM_EMAIL,
    to: [email],
    reply_to: REPLY_TO,
    subject,
    html,
  };
  if (BCC_EMAIL) payload.bcc = [BCC_EMAIL];
  if (attachments.length) payload.attachments = attachments;

  const resp = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!resp.ok) {
    const detail = await resp.text();
    console.error("Resend error:", resp.status, detail);
    return json({ error: "Failed to send auto-response" }, 502);
  }

  return json({ ok: true, barrhaven, contract_sent: attachments.length > 0 });
});
