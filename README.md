# Dean Ryans Enterprises — Website

Static marketing site for Dean Ryans Enterprises Inc., a property-maintenance company
serving Ottawa & Barrhaven since 1991 (snow removal, lawn care, landscaping, bin rentals).

Built from the "Deep Crimson Technical" Stitch design system using Tailwind CSS.

## Pages
| File | Purpose |
|------|---------|
| `index.html` | Home — hero carousel, services overview, "why us", CTA |
| `services.html` | Detailed service cards (snow, lawn, landscaping, bins) |
| `about.html` | Company story, stats, values |
| `contact.html` | Contact info, service area, inquiry form |

## Structure
```
assets/
  css/styles.css   custom styles (carousel, reveal, drawer, scrollbar)
  js/config.js     Tailwind theme (colors, fonts, spacing)
  js/main.js       mobile drawer, hero carousel, scroll-reveal, contact form
  images/          real branded photos (logo + job-site photography)
```

## Run locally
```bash
python3 -m http.server 4321
# then open http://localhost:4321
```

## Deploy (Vercel)
It's a plain static site — no build step. Either:
- `vercel --prod` from this folder, or
- push to a Git repo and import it in the Vercel dashboard (Framework preset: "Other").

## Notes
- **Tailwind** is loaded via CDN (matches the original design exports). The browser console
  shows a "don't use the CDN in production" notice — harmless. For a fully optimized build,
  compile Tailwind with the CLI and replace the CDN `<script>`.
- **Contact form** has no backend; on submit it opens the visitor's email client
  (`mailto:deanryans@rogers.com`) pre-filled. To capture submissions server-side, wire the
  form to a service like Formspree/Vercel Forms.
- **Business details** (phone 613.825.7913, email deanryans@rogers.com, "since 1991") come
  from the live site content. The Stitch about/contact mockups contained placeholder data
  (a fake address, "Industrial", est. 1988) which was **not** used. Update copy as needed.
```
