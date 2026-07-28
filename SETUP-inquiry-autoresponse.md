# Setup: Inquiry auto-response + Barrhaven contract

When someone submits the Contact form, two emails go out:

1. **To Dean** — the lead notification, via **Web3Forms**. Always worked, needs no setup.
2. **To the customer** — a confirmation email, via **Resend**, sent by the Vercel
   function at `api/inquiry-autoresponse.js`. If the postal code is in Barrhaven
   (**K2J** or **K2G**), the service contract PDF is attached.

---

## History — why this moved off Supabase

The customer auto-response originally ran as a Supabase Edge Function. **That
Supabase project (`rvlmtpcuclthdatzmnol`) was deleted** — its hostname now returns
NXDOMAIN. Because the browser fired that request with a `.catch()` that swallowed
errors, and the success message only required *either* Web3Forms *or* the database
to succeed, the form kept showing "Thanks! Your message has been sent" while
**customers silently received no confirmation and no contract PDF**.

It now runs on Vercel instead, which means:

- No Supabase project to keep alive, and nothing to pause or expire.
- Same-origin (`/api/...`) — no CORS, and no anon key exposed in the browser.
- Failures are logged to the browser console and to Vercel function logs rather
  than being swallowed, so this cannot break invisibly again.

The Supabase `contact_submissions` database save was removed along with it. Every
submission is still retained in the **Web3Forms dashboard**, in addition to Dean's
inbox. If you want a real database again later, that's a separate piece of work.

---

## The one required setting

Vercel → project **deanryanwebsite** → Settings → Environment Variables:

| Name | Value | Environments |
|---|---|---|
| `RESEND_API_KEY` | your key from [resend.com/api-keys](https://resend.com/api-keys) (starts with `re_`) | Production, Preview, Development |

**Redeploy after adding it** — env var changes don't apply to existing deployments.

Resend only shows an API key once at creation. The old key was stored as a Supabase
secret and went away with the project, so you'll most likely need to create a new
one. That's free and takes a moment; the sending domain itself is unaffected.

### Optional overrides

Defaults are already correct — set these only to change behaviour.

| Name | Default |
|---|---|
| `FROM_EMAIL` | `Dean Ryans Enterprises <inquiries@deanryans.com>` |
| `REPLY_TO` | `deanryans@rogers.com` — where customer replies land |
| `BCC_EMAIL` | unset — set to copy Dean on every auto-response |
| `CONTRACT_PDF_URL` | `/assets/contract.pdf` on the current deployment |

---

## Sending domain

`deanryans.com` is verified in Resend and its DNS is intact — DKIM at
`resend._domainkey.deanryans.com`, plus SPF and MX on `send.deanryans.com`.
There is no mailbox to log into; Resend sends *as* `inquiries@deanryans.com`
because you own the domain, and replies route to Rogers via `REPLY_TO`.

Don't delete those DNS records in Vercel — that would break sending.

---

## Changing the contract PDF

Replace `assets/contract.pdf` and push. The function fetches it from whatever
deployment it's running on, so previews attach their own copy.

---

## Testing it

1. Push to `main` and let Vercel deploy.
2. Submit the Contact form with **your own email** and a **K2J** postal code
   → confirmation email arrives **with the contract attached**.
3. Submit again with `K1A 0A0` → confirmation email, **no** attachment.

If the confirmation doesn't arrive, open the browser console on the contact page —
a failure now logs there explicitly. For the server side, check Vercel → the
project → Logs, filtered to `/api/inquiry-autoresponse`.

| Symptom in logs | Cause |
|---|---|
| `RESEND_API_KEY is not set` | env var missing, or added without redeploying |
| `Resend error: 403` | key revoked, or `FROM_EMAIL` domain not verified |
| `Contract PDF fetch failed` | `assets/contract.pdf` missing from the deploy |
