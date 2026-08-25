# Handoff: Cricket Tosser Marketing Website

## Overview
Single-page marketing site for Cricket Tosser, an AI-powered cricket pitch analysis app. Communicates the core value prop (bat/bowl toss decisions from pitch photos + weather + squad data), drives app store downloads, and explains pricing.

## About the Design Files
The bundled file (`Cricket Tosser.dc.html`) is a **design reference built in HTML** — a prototype showing intended look, layout, and behavior. It is not production code to copy directly. The task is to **recreate this design in the target codebase's existing environment** (e.g. Next.js/React, Webflow, plain static site generator, etc.) using its established patterns — or, if no environment exists yet, choose the most appropriate framework (a static site generator or lightweight React/Next app is a good fit for a marketing page) and implement there.

## Fidelity
**High-fidelity.** Colors, typography, spacing, and copy are final/near-final. Recreate pixel-close using the codebase's tooling; the exact hex values, font stack, and section structure below should be followed.

## Screens / Views
This is a single scrolling page with a sticky nav. Sections top to bottom:

### 1. Sticky Nav
- Fixed/sticky top bar, `rgba(241,234,216,0.88)` background with `backdrop-filter: blur(8px)`, bottom border `1px solid rgba(26,14,12,0.1)`.
- Left: coin icon (38×38px) + "Cricket Tosser" wordmark, Bricolage Grotesque 800, 20px.
- Right: nav links "How it works", "Features", "Pricing" (Work Sans 500, 15px) + pill "Download" CTA button (oxblood `#a8331f` bg, cream text, 999px radius, 10px/22px padding).
- Padding: 16px vertical, 5vw horizontal.

### 2. Hero
- Min-height ~92vh, cream `#f1ead8` background, 2-column grid (1.1fr / 0.9fr) on desktop, stacks on mobile.
- Left column: small pill eyebrow ("Built for captains"), H1 headline "Read the pitch before the bowler does." (Bricolage Grotesque 800, clamp(40px,6.2vw,76px), line-height 0.98; word "before" in italic oxblood), subheadline paragraph (Work Sans, clamp(17px,20px), 75% opacity ink), two pill CTA buttons side by side ("Download on the App Store" / "GET IT ON Google Play", both `#1a0e0c` bg, cream text/icon, 12px radius).
- Right column: coin emblem image centered, floating animation (translateY + slight rotate, 6s ease-in-out loop), soft radial oxblood glow behind it, drop shadow.

### 3. How It Works
- Background `#e7ddc4` (slightly darker cream), 110px vertical padding.
- Centered eyebrow "HOW IT WORKS" (oxblood, uppercase, 14px) + H2 "Three steps to a smarter toss."
- 3-column grid of cards (1 column on mobile): cream `#f1ead8` bg, 20px radius, 1px border `rgba(26,14,12,0.08)`, 40px/32px padding. Each card: "STEP 0N" label (oxblood, 14px bold), emoji icon (34px: 📸 / 🤖 / 🪙), H3 title (Bricolage Grotesque 700, 22px), body copy (15px, 70% opacity ink).
  - Step 1: "Photograph the pitch" — "Take up to 4 photos from different angles before the match."
  - Step 2: "Cricket Tosser analyses it" — "Our AI reads the surface, checks live weather, and factors in your squad."
  - Step 3: "Win the toss" — "Get a clear bat or bowl recommendation with confidence score and pitch breakdown."

### 4. Features
- Cream `#f1ead8` background, 110px padding. Eyebrow "FEATURES" + H2 "Everything a captain needs at the toss."
- 2×2 grid (1 column on mobile) of cards: bg `#fff9ec`, border `1px solid rgba(26,58,42,0.15)`, 20px radius, 36px padding. Icon in 52×52px rounded square (`rgba(26,58,42,0.1)` bg), H3 in forest green `#1a3a2a`, body 15px at 70% ink opacity.
  - 🌦 Live weather intelligence — Rain probability, humidity, and DLS context built into every recommendation.
  - 🏏 Squad-aware advice — Tell us your seamers and spinners — we tailor the report to your team.
  - 📊 Par score prediction — Know what a good first innings score looks like before a ball is bowled.
  - 📍 Ground recognition — Auto-detects your venue or search 1,000+ UK cricket grounds.

### 5. Stats
- Dark ink `#1a0e0c` background, 90px padding. 3-column grid, centered text.
- Big numbers in Bricolage Grotesque 800, clamp(44px,72px), cream color: "500+" / "4.8★" / "1 second", each with a small caption below at 60% opacity cream, 15px ("reports generated", "average rating", "to a toss decision"). Placeholder values — swap for real stats when available.

### 6. Report Preview
- Forest green `#1a3a2a` background, 120px padding, overflow hidden. A large faint (6% opacity) coin image rotates slowly (60s linear) in the top-right corner as a background flourish.
- 2-column grid: left is eyebrow "THE REPORT" + H2 "A full captain's brief. In seconds." + supporting paragraph, all in cream/cream-70%.
- Right is a card mockup of the in-app report: cream bg, 24px radius, heavy shadow. Contents: header row with ground name + "BAT" badge (forest green pill, cream bold text), confidence meter (label + % + progress bar filled in oxblood), 3-up stat row (Rain risk 8%, Humidity 54%, Par score 245–265) in light green-tinted boxes, and a summary sentence below a divider ("Dry surface with early cracking — expect turn from over 25...").

### 7. Pricing
- Cream background, 120px padding, centered, max-width 520px.
- Eyebrow "PRICING" + H2 "3 free reports to get started. Then Cricket Tosser Pro."
- Single pricing card: bg `#fff9ec`, 2px forest-green border, 24px radius, 44px/36px padding, relative positioning.
  - Floating badge pill at top, overlapping card edge (-14px top, centered): oxblood bg, cream text, "Launch offer — use code HITFORSIX".
  - Price: "£9.99" (Bricolage Grotesque 800, 48px) + " / year" (18px, 60% ink).
  - 4 checklist rows (✓ in forest green + 15px text): Unlimited pitch reports / Live weather analysis / Squad recommendations / Full match history.
  - Full-width CTA button: oxblood bg, cream text, 14px radius, 16px padding, "Start free →".

### 8. Footer
- Ink `#1a0e0c` background, cream text, 64px/40px padding.
- Top row (flex, wraps on mobile): brand block (coin icon 32px + wordmark + tagline "Know your pitch. Own the toss." at 60% opacity), two link columns ("Product": How it works, Pricing; "Company": Privacy Policy, Contact), app store badge stack (small pill buttons, `rgba(241,234,216,0.08)` bg).
- Divider line `rgba(241,234,216,0.12)`, then centered copyright line at 40% opacity, 13px: "© 2026 Cricket Tosser. Built for captains."

## Interactions & Behavior
- **Scroll reveal**: Elements marked for reveal fade in + slide up (28px → 0, opacity 0 → 1, 0.7s ease) when they enter the viewport (IntersectionObserver, threshold 0.15, fires once per element, then unobserves). Applied to section headers, step/feature cards, stat block, report preview column, and pricing card.
- **Hero coin float**: continuous CSS keyframe animation, 6s ease-in-out infinite loop, alternating translateY(-18px) and slight rotation.
- **Report preview background coin**: continuous 360° rotation, 60s linear infinite, very low opacity, purely decorative.
- **Nav anchor links**: `#how`, `#features`, `#pricing` scroll to their respective sections (standard anchor behavior — implement smooth-scroll if desired).
- No modals, forms, or multi-state interactions in this version — all CTAs (`Download`, App Store/Google Play buttons, "Start free →") are placeholder links (`#`) to be wired to real store URLs and signup flow.
- **Responsive**: two-column sections (hero, features, report preview) should collapse to a single column below ~768px; nav links can collapse into a menu if needed (not built in this version — currently always visible, may overflow on very small screens — recommend adding a mobile hamburger menu during implementation).

## State Management
None — this is a static marketing page. No client state, no data fetching. If analytics/CTA tracking is desired, hook into the four outbound links (2 in hero, 2 in footer) and the pricing CTA.

## Design Tokens

**Colors**
- Cream / paper background: `#f1ead8`
- Cream card variant: `#fff9ec`
- Secondary cream section bg: `#e7ddc4`
- Forest green: `#1a3a2a`
- Oxblood red: `#a8331f`
- Ink dark: `#1a0e0c`
- Muted text on cream: `rgba(26,14,12,0.6–0.75)`
- Muted text on dark: `rgba(241,234,216,0.4–0.7)`

**Typography**
- Headings: Bricolage Grotesque, weights 400/500/700/800, italic used selectively for emphasis words. Google Fonts import: `Bricolage+Grotesque:ital,opsz,wght@0,12..96,400;0,12..96,500;0,12..96,700;0,12..96,800;1,12..96,600`
- Body: Work Sans, weights 400/500/600/700.
- H1: clamp(40px, 6.2vw, 76px), weight 800, line-height 0.98, letter-spacing -0.02em.
- H2: clamp(30px, 4vw, 46px) (pricing H2 clamp(28px,4vw,40px)), weight 800, letter-spacing -0.01em.
- H3: 20–22px, weight 700.
- Body: 14–20px, line-height 1.5–1.6.
- Eyebrow labels: 13–14px, weight 700, uppercase, letter-spacing 0.08em, oxblood.

**Spacing / Radius**
- Section vertical padding: 90–120px; horizontal 5vw.
- Card radius: 20–24px. Button/pill radius: 10–14px, or 999px for full pills.
- Grid gaps: 24–32px between cards; 40–56px between major columns.

**Shadows**
- Report preview card: `0 40px 80px rgba(0,0,0,0.35)`.
- Hero coin: `drop-shadow(0 30px 40px rgba(26,14,12,0.25))`.

## Assets
- `assets/coin-icon.png` — the Cricket Tosser coin emblem (heads/tails cricket coin), user-provided. Used in: nav logo, hero hero-visual (large, floating), report preview section background flourish (rotated, low opacity), footer logo. Source unknown/user-uploaded — confirm licensing/final art before production use.
- All icons in cards/features/steps are emoji glyphs (📸 🤖 🪙 🌦 🏏 📊 📍 ✓) — no custom icon set was built. Consider commissioning a matching icon set for production if emoji feel too casual for final brand.
- App Store / Google Play badges are hand-built SVG+text buttons, not official badge assets — replace with Apple's and Google's official badge artwork per their brand guidelines before shipping.
- No photography used by design intent (cricket-specific illustration/photos only, per brief) — none included in this draft; pitch/ground photography could be added later.

## Files
- `Cricket Tosser.dc.html` — full page design reference (all sections, inline styles, scroll-reveal logic in an embedded script).
- `assets/coin-icon.png` — coin emblem asset.
