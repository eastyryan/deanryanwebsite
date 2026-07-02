# Setup: Inquiry auto-response + Barrhaven contract

This wires the Contact form to automatically email customers a confirmation, and
attach the service contract PDF when the postal code is in Barrhaven (K2J / K2G).

The website code is already done. These are the one-time backend steps.

---

## 1. Add the contract PDF to the site

Put your contract PDF in the repo at **`assets/contract.pdf`** and commit it.
Vercel will then serve it at:

    https://deanryanwebsite.vercel.app/assets/contract.pdf

(If you name it differently, set `CONTRACT_PDF_URL` in step 4 to match.)

## 2. Add the new columns to Supabase

Supabase → SQL Editor → run:

```sql
alter table contact_submissions
  add column if not exists address     text,
  add column if not exists city        text,
  add column if not exists postal_code text;
```

(Without this, emails still work but the address/postal fields won't be saved.)

## 3. Create a Resend account (email sender)

1. Sign up at https://resend.com (free tier is fine).
2. **Verify `deanryans.com`** under Domains → Add Domain. Resend shows a few DNS
   records (TXT/MX); add each one in Vercel (your domain's DNS tab), entering only
   the prefix Resend shows (Vercel appends `.deanryans.com` for you). Click Verify.
   - You do NOT need a mailbox on the domain. Resend sends *as*
     `inquiries@deanryans.com` because you own the domain — there's nothing to log
     into. Customer replies are routed to your Rogers inbox via `REPLY_TO` below.
3. Create an API key under **API Keys** → copy it (starts with `re_...`).

## 4. Deploy the Edge Function

Install the Supabase CLI once: https://supabase.com/docs/guides/cli

```bash
# from the repo root
supabase login
supabase link --project-ref rvlmtpcuclthdatzmnol

# set the secrets — only RESEND_API_KEY is required; the rest already default
# to the right values in the function, so set them only to override.
supabase secrets set RESEND_API_KEY=re_your_key_here

# optional overrides (defaults shown — you can skip these):
#   FROM_EMAIL     defaults to "Dean Ryans Enterprises <onboarding@resend.dev>"
#                  -> set to your verified domain once deanryans.com is green:
supabase secrets set FROM_EMAIL="Dean Ryans Enterprises <inquiries@deanryans.com>"
#   REPLY_TO       defaults to deanryans@rogers.com (where replies land)
#   CONTRACT_PDF_URL defaults to the assets/contract.pdf on the live site
#   BCC_EMAIL      optional: copy yourself on every auto-response
supabase secrets set BCC_EMAIL="deanryans@rogers.com"

# deploy
supabase functions deploy inquiry-autoresponse
```

`FROM_EMAIL` must use `deanryans.com` once it's verified in Resend. Until then,
leave it unset and it uses `onboarding@resend.dev` (test sender — only reliably
delivers to your own Resend account email).

## 5. Test it

1. Deploy the site (push to `claude/brave-galileo-azPhr`).
2. Submit the Contact form with **your own email** and a **K2J** postal code →
   you should receive the confirmation email **with the contract attached**.
3. Submit again with a non-Barrhaven code (e.g. `K1A 0A0`) → confirmation email
   **without** the attachment.

---

### How it behaves

| Postal code | Customer gets |
|-------------|---------------|
| K2J… / K2G… (Barrhaven) | Confirmation email **+ contract PDF attached** |
| Anything else           | Plain confirmation email |

Your own notification email (via Web3Forms) is unchanged and still arrives for
every inquiry, now including the address, city, postal code, and a "Service Area"
line flagging Barrhaven leads.
