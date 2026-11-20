# The Signal Room — Rap Recording Studio, Pompano Beach FL

A static, audio-first marketing site and conversion funnel for an independent rap
recording studio. Built with **Astro 5** (zero-JS-by-default, islands only where needed),
hand-written CSS design system, and a ~6 KB gzipped vanilla-TS client bundle.

> "Where the next one gets made." Pro sound. Rap-fluent engineers. Booked in 60 seconds.

**Primary conversion:** paid session booking (deposit) at `/book`
**Secondary conversion:** tap-to-text / IG DM from anywhere on the site

## Quick start

```bash
npm install
npm run dev        # local dev server
npm run build      # static build → dist/
npm run preview    # serve the build locally
npx lhci autorun   # Lighthouse CI with budget gate (build must pass)
```

Requires Node ≥ 20.3 (Astro 5). The Arena sandbox runs Node 22.x.

## What's inside

| Route | Purpose |
|---|---|
| `/` | Home — conversion hub: hero w/ live "next open" line, before/after audio, pricing snapshot, proof wall, FAQ, sticky mobile book bar |
| `/book` | 3-step booking wizard: session type → time (deterministic live availability, quick-pick chips) → details + deposit. Promo `FIRST` auto-applies via `?offer=first`; engineers preselect via `?engineer=marcus` |
| `/pricing` | Full rate table, add-ons, "which package?" guide, student/late-night rates |
| `/work` | Filterable grid (Recorded / Mixed / Mastered), 9 tiles, tap-to-play |
| `/studio` | Room story, collapsible gear list, hours, find-us (static SVG map) |
| `/engineers` | Bios, credits, 30s reels (in-page player), "Book [name]" deep links |
| `/faq` | Grouped accordions + `FAQPage` schema |
| `/contact` | Text/DM/email/address + schematic map (zero external requests) |
| `/lp/first-session`, `/lp/mixing` | Message-matched ad landing variants |
| `/terms`, `/privacy`, `/404` | Legal + error page |

## Design system

- **Tokens** — `--bg #0A0A0B`, `--surface #141416`, `--accent #D4FF3A` (Signal Lime), `--hot #FF3B30` (REC), warm off-white `--text #F4F2EC`. 4 px radius, mono labels (`ui-monospace`), Archivo variable (`wght` axis, latin subset, **34 KB**, size-adjusted local fallback → zero font CLS).
- **Type** — Display `clamp(2.75rem, 9vw, 7rem)`, uppercase, weight 900, −0.02em tracking, line-height 0.92.
- **Layout** — 1280 px max, 4/8/12-col intent, 72/128 px section padding.
- **Motion** — transform/opacity only; 150/300/600 ms tokens; mask-reveal hero (no JS), CSS marquee (paused on hover/reduced-motion), IntersectionObserver reveals, `prefers-reduced-motion` honored everywhere; `@view-transition { navigation: auto; }` for cross-document page crossfade.

## Performance

Budget vs. actual (mobile, above the fold):

| Asset | Budget | Actual |
|---|---|---|
| JS (all, gzipped) | ≤ 30 KB | **~6.3 KB** |
| Font (latin var. subset) | ≤ 35 KB | **34.1 KB** ✓ |
| Hero (AVIF, 1024 w) | ≤ 40 KB | **11.1 KB** ✓ |
| Above-fold transfer | ≤ 150 KB | **~80 KB** ✓ |
| HTML (gzipped) | ≤ 14 KB | ~17 KB (inlined 29 KB CSS; see trade-off below) |

**Trade-off:** critical CSS is fully inlined (Astro `inlineStylesheets: 'always'`) instead of shipped as a render-blocking external file — we pay ~3 KB extra gzipped HTML to avoid a blocking round-trip, which wins on LCP. The HTML budget is the one miss on the sheet; trimming the design system further is a deliberate non-goal for this iteration.

**Other:** `fetchpriority=high` hero `<img>` + `<link rel=preload>`, AVIF→WebP→JPEG `<picture>` fallback chains, explicit `width`/`height` everywhere, `loading=lazy` below the fold, speculation rules prefetch for `/book` and `/pricing`, `Cache-Control: immutable` for `/assets`, `/fonts`, `/img` (see `public/_headers`), Plausible-style cookieless analytics shim (`window.plausible?.(…)` — zero bytes until configured), `FAQPage` + `LocalBusiness` JSON-LD, sitemap via `@astrojs/sitemap`, canonical + OG/Twitter cards, static map (no iframes anywhere), no video on the critical path, audio is `preload=none` ~422 KB Opus-grade MP3 (96 kbps) fetched only on tap, custom 3 KB player instead of SoundCloud/Spotify embeds.

**Lighthouse CI** — `.github/workflows/ci.yml` runs build + `lhci autorun` on every push; `lighthouserc.json` asserts Performance ≥ 0.9, A11y ≥ 0.9, SEO ≥ 0.95, scripts ≤ 30 KB, CLS ≤ 0.01, LCP warn ≤ 1.5 s.

## Booking & payments

The wizard is fully client-side and works end-to-end in demo mode (confirmation screen + reference number + downloadable `.ics`). **To go live with real deposits:**

1. Create a Stripe **Payment Link** for the deposit product ($50 recording / $100 mix-master — or use Stripe’s URL parameters for two links).
2. Set `PUBLIC_STRIPE_PAYMENT_LINK=https://buy.stripe.com/…` in the environment when building (e.g. Cloudflare Pages → Settings → Environment variables). The booking button then redirects to Stripe with `?client_reference_id=<booking ref>`.
3. Wire the `booking_complete` event → your ESP/SMS provider (Postmark/Twilio) from a small serverless function (Cloudflare Pages Functions or Vercel) that listens to the Stripe webhook (`checkout.session.completed`) and sends the address + door code + `.ics`.

**Availability model** — in this demo the calendar is a deterministic pseudo-live model (seeded by date+slot, ~34% of slots read as booked) so the same visitor sees a consistent, plausible schedule. Swap `slotBusy()`/`nextOpenSlot()` in `src/scripts/site.ts` for your real availability API (Cal.com, Acuity, or a Google Calendar free/busy endpoint) when wiring live.

**Abandonment recovery** — the `checkout_start` event fires at step 3 entry; phone/email are captured there, ready to hand to an SMS nudge (“still want that slot?”) with the consent checkbox. Wire this in the same webhook function.

## Assets

`src/assets/raw/` holds source imagery (AI-generated for this build — see below). Optimized AVIF/WebP/JPEG sets and the OG image are generated by scripts:

```bash
python3 scripts/optimize-images.py   # responsive sets → public/img/
python3 scripts/synth_audio.py       # synthesized 30–40s raw/mixed demo clips → public/audio/
```

**Audio demos are synthesized** (numpy + lameenc): three tracks in two masters each ("raw" = uncompressed/dark, "mix" = EQ/compression/limiting + stereo widen) so the Before/After section is honest A/B and requires zero third-party files. Swap with real client work (with permission) before launch — keep the same filenames or update the `data-before`/`data-after` attributes.

**Images are AI-generated placeholders** standing in for the studio shoot the spec calls for ("real photography only"). They are graded consistently (crushed blacks, warm skin, lime/red practicals) but must be replaced with the actual room/engineers before launch — swap files in `public/img/` (same names) or the `<picture>` sources.

## Analytics events

`cta_click` (with `location`), `audio_play`, `audio_complete`, `book_start`, `slot_selected`, `checkout_start`, `booking_complete`, `text_click`, `dm_click`, `faq_open`, `scroll_75` — fired to `window.plausible` if present, plus a `dataLayer` push for GTM compatibility. No PII in events.

## Pre-launch QA (from the spec) — status of this build

- [x] Static build, zero JS by default; single 6 KB bundle, deferred
- [x] Font self-hosted, preloaded, size-adjusted fallback (CLS 0 by design)
- [x] Images AVIF/WebP/JPEG with explicit dimensions; hero ≤ 40 KB AVIF
- [x] `prefers-reduced-motion`, focus-visible rings, skip link, 48 px tap targets
- [x] Semantic landmarks, heading order, `<details>` accordions (zero JS)
- [x] Works with JS disabled (readable content; CTAs still link to `/book`, `sms:`, IG)
- [x] 404, `robots.txt`, sitemap, canonical, OG per page, LocalBusiness + FAQPage schema
- [ ] Lighthouse 95+ on device — gate configured; run on real hardware before launch
- [ ] Real photos, real client audio, real Google reviews (replace placeholders)
- [ ] Stripe Payment Link + webhook (address/door-code SMS + `.ics`), `PUBLIC_STRIPE_PAYMENT_LINK`
- [ ] Google Business Profile link + NAP consistency check
- [ ] Abandoned-checkout SMS nudge (consent-gated, ≤ 30 min)

## Repo layout

```
src/
  data/site.ts        — single source of truth (rates, engineers, reviews, FAQs)
  layouts/BaseLayout.astro — head, schema, nav/footer/sticky bar, font preloads
  components/         — Nav, Footer, StickyBar
  pages/              — 13 routes
  scripts/site.ts     — ~5 KB TS: players, availability, booking wizard, reveals
  styles/global.css   — design tokens + everything (minified & inlined by Astro)
public/
  img/  audio/  fonts/  favicon.svg  robots.txt  _headers  site.webmanifest
scripts/              — image + audio asset pipelines (python)
lighthouserc.json · .github/workflows/ci.yml
```
