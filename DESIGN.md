---
name: Unspoof
description: A free email-domain security checker whose result is posted like a shop-window inspection grade.
colors:
  stone-ground: "#F2F3EF"
  card-white: "#FFFFFF"
  stone-well: "#E8EAE4"
  hairline: "#D9DBD4"
  hairline-strong: "#B9BCB3"
  ink: "#15171A"
  ink-soft: "#4F545A"
  muted: "#62676E"
  graphite-frame: "#23262B"
  on-frame: "#F2F3EF"
  lime-good: "#B7E234"
  on-lime: "#1E2A05"
  lime-text: "#3F6A07"
  orange-check: "#F39C12"
  on-orange: "#2E1A00"
  orange-text: "#9A5800"
  crimson-fix: "#D7263D"
  on-crimson: "#FFFFFF"
  crimson-text: "#C21F35"
  dark-ground: "#121416"
  dark-surface: "#1A1D20"
  dark-well: "#23272B"
  dark-hairline: "#2E3338"
  dark-hairline-strong: "#41474D"
  dark-ink: "#E9EBE6"
  dark-ink-soft: "#A9AEB3"
  dark-muted: "#969CA2"
  dark-frame: "#3A3F46"
  dark-on-frame: "#E9EBE6"
  dark-lime-good: "#C5F04A"
  dark-on-lime: "#1E2A05"
  dark-lime-text: "#C5F04A"
  dark-orange-check: "#F5A623"
  dark-on-orange: "#2E1A00"
  dark-orange-text: "#F5A623"
  dark-crimson-fix: "#FF5468"
  dark-on-crimson: "#2A0008"
  dark-crimson-text: "#FF7A8A"
typography:
  display:
    fontFamily: "Public Sans, system-ui, sans-serif"
    fontSize: "clamp(32px, 4.2vw, 50px)"
    fontWeight: 800
    lineHeight: 1.06
    letterSpacing: "-0.025em"
  score:
    fontFamily: "Public Sans, system-ui, sans-serif"
    fontSize: "64px"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "-0.03em"
    fontFeature: "tnum"
  headline:
    fontFamily: "Public Sans, system-ui, sans-serif"
    fontSize: "26px"
    fontWeight: 800
    lineHeight: 1.12
    letterSpacing: "-0.015em"
  title:
    fontFamily: "Public Sans, system-ui, sans-serif"
    fontSize: "20px"
    fontWeight: 800
    letterSpacing: "-0.01em"
  title-sm:
    fontFamily: "Public Sans, system-ui, sans-serif"
    fontSize: "18px"
    fontWeight: 800
  body:
    fontFamily: "Public Sans, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.55
    fontFeature: "tnum"
  lede:
    fontFamily: "Public Sans, system-ui, sans-serif"
    fontSize: "18px"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "Public Sans, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 700
  band-label:
    fontFamily: "Public Sans, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 700
    letterSpacing: "0.12em"
  mono:
    fontFamily: "ui-monospace, Cascadia Mono, Menlo, Consolas, monospace"
    fontSize: "13px"
rounded:
  xs: "4px"
  sm: "6px"
  md: "8px"
  lg: "12px"
  card: "14px"
  pill: "999px"
spacing:
  gutter: "24px"
  gutter-phone: "16px"
  card-inset: "22px"
  row: "20px"
  column-gap: "64px"
  section: "48px"
components:
  button-primary:
    backgroundColor: "{colors.graphite-frame}"
    textColor: "{colors.on-frame}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "0 22px"
    height: "52px"
  button-primary-dark:
    backgroundColor: "{colors.dark-lime-good}"
    textColor: "{colors.dark-on-lime}"
    rounded: "{rounded.md}"
    height: "52px"
  input-domain:
    backgroundColor: "{colors.card-white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "0 16px"
    height: "52px"
  inspection-card:
    backgroundColor: "{colors.card-white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
  inspection-band:
    backgroundColor: "{colors.graphite-frame}"
    textColor: "{colors.on-frame}"
    typography: "{typography.band-label}"
    padding: "10px 22px 14px"
  score-disc-good:
    backgroundColor: "{colors.lime-good}"
    textColor: "{colors.on-lime}"
    rounded: "{rounded.pill}"
    size: "148px"
  score-disc-check:
    backgroundColor: "{colors.orange-check}"
    textColor: "{colors.on-orange}"
    rounded: "{rounded.pill}"
    size: "148px"
  score-disc-fix:
    backgroundColor: "{colors.crimson-fix}"
    textColor: "{colors.on-crimson}"
    rounded: "{rounded.pill}"
    size: "148px"
  badge-good:
    backgroundColor: "{colors.lime-good}"
    textColor: "{colors.on-lime}"
    rounded: "{rounded.pill}"
    padding: "4px 12px 4px 5px"
  badge-check:
    backgroundColor: "{colors.orange-check}"
    textColor: "{colors.on-orange}"
    rounded: "{rounded.pill}"
    padding: "4px 12px 4px 5px"
  badge-fix:
    backgroundColor: "{colors.crimson-fix}"
    textColor: "{colors.on-crimson}"
    rounded: "{rounded.pill}"
    padding: "4px 12px 4px 5px"
  check-list:
    backgroundColor: "{colors.card-white}"
    rounded: "{rounded.lg}"
    padding: "20px 22px"
  fact-chip:
    backgroundColor: "{colors.stone-well}"
    textColor: "{colors.ink-soft}"
    typography: "{typography.mono}"
    rounded: "{rounded.xs}"
    padding: "1px 8px"
---

# Design System: Unspoof

## Overview

**Creative North Star: "The Shop-window Grade Card"**

The result is a posted inspection card, the kind of grade every business owner already reads in a restaurant window. A white card sits in a thick graphite frame, headed by a graphite band label, with one heavy score figure on a solid disc and a five-band scale beneath it. Everything around the card is quiet: pale stone ground, white surfaces, hairline borders, no shadows. The card is the only object with weight on the page.

The world is graphite plus lime. Graphite carries structure (frame, band, primary button, brand mark); lime, orange and crimson carry verdicts and nothing else. Type is a single family, Public Sans, set heavy (800) for figures and headings and plain (400) for reading, with tabular numerals throughout so scores and counts sit still. Density is moderate: generous column gap, rows separated by hairlines rather than boxes.

It explicitly refuses the category default of a score ring over a 2x2 grid of identical cards. Checks are a single bordered list ranked by urgency; the grade lives on one card.

**Key Characteristics:**
- One framed inspection card (6px graphite frame, 14px radius) carries the verdict.
- Three far-apart solid status fills, each paired with a drawn SVG icon and a word.
- Pale stone ground, white surfaces, hairlines; flat, no shadows.
- Public Sans only, 800 for figures and headings, tabular numerals everywhere.
- Light and dark token sets via `prefers-color-scheme`; both are first-class.

## Colors

Graphite structure on pale stone, with three solid status colours chosen to sit as far apart as possible.

### Primary
- **Graphite Frame** (`graphite-frame`): the card frame, the band label, the primary button, the brand tile, admin chart bars. Structure, never status. In dark mode it lifts to `dark-frame` so the frame still reads against the near-black ground.

### Status (the three verdict colours)
- **Lime, Good** (`lime-good`, text on it `on-lime`): passing checks, the disc and active scale band when the domain is protected. Also the text-selection colour and the input focus halo, the only non-status uses.
- **Orange, Check** (`orange-check`, text `on-orange`): checks that work but need attention; the "Not protected yet" verdict.
- **Crimson, Fix needed** (`crimson-fix`, text `on-crimson`): failing checks, the "Open to spoofing" verdict, the DNS-error alert border.
- **Status text variants** (`lime-text`, `orange-text`, `crimson-text`): for status shown as coloured text on a surface (admin result pills), where the solid fill colour would fail contrast.

### Neutral
- **Stone Ground** (`stone-ground`): page background and `theme-color`.
- **Card White** (`card-white`): card, check list, input, top bar.
- **Stone Well** (`stone-well`): recessed fills: empty disc, inactive scale bands, first-fix link, fact chips, raw-record block, table headers.
- **Hairline** / **Hairline Strong** (`hairline`, `hairline-strong`): list dividers and borders; the strong one for dashed card divider, empty-disc dash, chart baseline.
- **Ink** / **Ink Soft** / **Muted** (`ink`, `ink-soft`, `muted`): headings and body; secondary copy (lede, meaning, fix lines); hints, sub-labels, dates.

### Dark mode
Every role has a `dark-*` counterpart, swapped wholesale under `@media (prefers-color-scheme: dark)`. Status fills brighten (`dark-lime-good`, `dark-orange-check`, `dark-crimson-fix`) and crimson's on-colour flips to a near-black wine (`dark-on-crimson`) so the fill stays legible. Two structural swaps happen in dark mode: the primary button becomes lime with `dark-on-lime` text, and the domain input border drops from graphite to `dark-hairline-strong` with a lime caret.

### Named Rules
**The Three Verdicts Rule.** Good, Check and Fix needed are always lime, orange and crimson solid fills, each with its own drawn SVG icon (tick, exclamation, cross) and its word. Never colour alone, never icon alone, never a tint or outline instead of the solid fill. If two statuses could be confused in greyscale or by a colour-blind reader, the icon and word must still separate them.

**The Status-Only Rule.** Lime, orange and crimson mean status. Structure, links and decoration use graphite and neutrals. The two sanctioned exceptions are lime for text selection and the input focus halo.

**The Disc Takes the Verdict Rule.** The score disc and the active scale band are filled with the verdict colour; the rest of the card stays graphite and white.

## Typography

**Display Font:** Public Sans (self-hosted variable woff2, weights 400–800, with system-ui fallback)
**Body Font:** Public Sans
**Label/Mono Font:** ui-monospace stack (Cascadia Mono, Menlo, Consolas) for raw DNS records and fact chips only

**Character:** A plain civic sans set heavy, like the figures on an official notice; trustworthy rather than techy.

### Hierarchy
- **Display** (800, clamp 32–50px, 1.06, −0.025em, balanced): the page question only. 30px on phones.
- **Score** (800, 64px, 1, −0.03em): the disc number. 48px on phones.
- **Headline** (800, 26px, 1.12, −0.015em): the verdict on the card.
- **Title** (800, 20px / 18px): section titles and check names; a muted 500-weight sub-label sits beside each.
- **Body** (400, 16px, 1.55): summaries capped at 62ch. Lede is 18px, ink-soft, max 34em.
- **Label** (700, 13px): badges, button-adjacent text, card footer. Buttons are 700 at 17px.
- **Band Label** (700, 13px, 0.12em, uppercase): the card's graphite band only.

### Named Rules
**The Tabular Figures Rule.** `font-variant-numeric: tabular-nums` is set on the body; every score, count and date lines up.

**The One Band Rule.** Uppercase tracked text belongs to the inspection band, which is part of the card object. It does not become a section kicker or eyebrow elsewhere.

## Layout

Centred wrap, 1160px max, 24px side gutter (16px under 520px). Desktop is a two-column grid: a fluid left column (headline, lede, input row, ranked check list, explainer) and a fixed 440px right column for the inspection card, 64px apart. The card is sticky at 24px from the top while the list scrolls.

At 900px and below the grid collapses to one column ordered intro, card, results, explainer, so the card sits directly under the input. At 520px the form stacks input over button, the card body stacks disc over text, the disc shrinks to 112px, and the explainer's two-column definition list becomes one.

Rhythm: 56px top padding (32px on phones), 48px between intro and results, 56px before the explainer, 22px inside the card and 20px/22px inside check rows.

## Elevation & Depth

Flat. There are no drop shadows anywhere. Depth comes from the frame (a 6px graphite border makes the card read as a physical object), tonal wells (`stone-well` fills recessed elements), and hairlines. The only `box-shadow` in the build is the 4px lime focus halo on the domain input, which is a state ring, not elevation.

### Named Rules
**The Frame Not Shadow Rule.** If something needs to feel lifted, give it a border or a well, never a shadow.

## Shapes

Gently rounded, never pill-heavy. Controls and wells use 8px; check list and admin cards 12px; the inspection card 14px outside a 6px frame; scale bands and chips 4px; raw-record blocks 6px. Full rounding is reserved for the score disc and the status badges. Dashed lines mark the uninspected state (empty disc border) and the card's footer divider, like a form waiting to be filled.

## Components

### Buttons
- **Shape:** gently rounded (8px), 52px tall, 22px side padding, Public Sans 700 at 17px.
- **Primary:** graphite fill with stone text in light mode; lime fill with dark olive text in dark mode.
- **Hover / Focus:** background darkens to black (light) or a paler lime (dark) over 0.15s; focus is a 2px ink outline offset 2px.
- **Busy:** disabled with `progress` cursor at 75% opacity while the label reads "Checking…".

### Inputs / Fields
- **Style:** 52px, white, 2px graphite border (dark mode: strong hairline, lime caret), 8px radius, 500 at 18px.
- **Focus:** border stays, a 4px lime halo at 70% opacity appears.
- **Error:** an alert below the form with crimson border and a 10% crimson tint on white.

### Inspection Card (signature)
The one framed object. Graphite band label on top, then the score disc beside the verdict headline and one-line meaning, then the five-band scale (0–24 … 90–100), an optional "Fix first" link in a stone well, and a dashed-divider footer with domain and inspection date.
- **States:** empty shows a dashed stone-well disc with "–" and "Not inspected yet"; loading pulses the disc between well and hairline; done fills the disc and active band with the verdict colour; error says "Not inspected" with no score, never a false low number.
- **Stamp:** when a result lands the disc settles from a slight scale and tilt into place (0.55s, `cubic-bezier(.16,1,.3,1)`) and the active band fill sweeps in left to right (0.7s), once per result. Both are removed under `prefers-reduced-motion`.

### Status Badges
Solid pill in the status colour, 13px 700 text, an 18px drawn SVG icon at the left: a filled on-colour circle with the stroke cut out in the status colour (tick for Good, exclamation for Check, cross for Fix needed). The word always follows the icon.

### Check List
One white list with a 1px hairline border and 12px radius; rows divided by hairlines, ranked fail, then warn, then pass. Each row: check name (800) with muted sub-label, badge right-aligned, plain-English summary, an optional "Fix:" line in ink-soft, mono fact chips in stone wells, and a "Show record" disclosure revealing the raw DNS record in a stone-well block. A row targeted by the first-fix link gets a 12% lime wash.

### Navigation
A white top bar, 60px, hairline bottom border. Brand is a graphite tile with a lime tick disc plus the name in 700; a muted note sits right and hides on phones.

### Admin Monitor
Shares every token. Stat tiles and panels are white 12px cards with hairline borders; the daily chart uses graphite bars (lime in dark mode); tables use stone-well headers and hairline rows; result pills use the status text variants.

## Do's and Don'ts

### Do:
- **Do** show every status as solid fill + drawn SVG icon + word: lime/tick/Good, orange/exclamation/Check, crimson/cross/Fix needed.
- **Do** keep graphite for structure (frame, band, primary button) and the three status colours for status only.
- **Do** define every colour through the token set and its `dark-*` counterpart; both modes ship together.
- **Do** keep the page flat: borders, hairlines and stone wells, never shadows.
- **Do** rank checks by urgency in one bordered list and point to the single first fix.
- **Do** guard every animation with `prefers-reduced-motion`.

### Don't:
- **Don't** put a score ring over a 2x2 grid of identical cards; the grade lives on the one framed card.
- **Don't** show status by colour alone, or as a tinted or outlined chip instead of the solid fill.
- **Don't** use lime, orange or crimson for links, headings or decoration.
- **Don't** add drop shadows to cards, the list or buttons.
- **Don't** introduce a second typeface; Public Sans plus the mono stack for raw records is the whole set.
- **Don't** show a score when DNS lookup failed.
