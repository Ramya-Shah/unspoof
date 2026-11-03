# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
Small-business owners and marketers, not IT experts. They arrive two ways, in roughly equal measure:
- from a cold email, on a link like `/?d=theircompany.com`, so their own result is already running when the page opens;
- from search, at an empty input, looking for a DMARC / SPF / DKIM checker.

Their job: find out whether someone could send email pretending to be their company, and what to change.

## Product Purpose
A free email-domain security checker. It reads a domain's public DNS (DMARC, SPF, DKIM, MX) and says in plain language whether the domain can be spoofed and what to fix. It is the free top of a future paid product (ongoing DMARC monitoring, alerts, fix guidance) and the link used in cold outreach.

Success: a visitor understands their own result in seconds, knows the one thing to fix first, and trusts the tool enough to come back or pay for monitoring later.

## Positioning
Plain language plus a clear fix, not more checks. The competitor to beat on clarity is MXToolbox: powerful, but ugly and jargon-heavy. The edge is that a non-expert can read the result without looking anything up.

## Operating Context
- The result page doubles as the landing page for cold-email links; the domain in the URL is the visitor's own.
- A private `/admin` usage monitor exists for the owner (separate surface).
- Later: server-rendered tool pages and guides for SEO (`/dmarc-checker`, `/spf-checker`, "how to add DMARC on GoDaddy").

## Capabilities and Constraints
- Reads public DNS only. Never scans ports, probes the domain, or sends email as it.
- Score out of 100: DMARC 40, SPF 30, DKIM 20, MX 10. Headline verdict follows the DMARC policy: "Protected against spoofing" / "Not protected yet" / "Open to spoofing".
- Each check has a status (Good / Check / Fix needed), a one-sentence plain-English summary, an optional fix line, and the raw DNS record on demand.
- DKIM "not found" is not proof of absence (custom selector names exist); the page must say so.
- DNS failure shows an error, never a false low score.
- Raw IPs are never stored.
- First version: plain Node, no dependencies, static HTML/CSS/JS. Later move to Next.js on Vercel on a custom domain.
- Product name: Unspoof (chosen 3 Nov 2026).

## Brand Commitments
- Headline copy: "Can someone send email pretending to be you?"
- Colour must carry meaning: one colour for good, one for check, one for fix needed.
- Light by default; dark via a toggle, remembered per device; must work at phone width.

## Evidence on Hand
No customers, testimonials, usage numbers, or pricing are public yet. Do not invent any. Paid tiers are on the roadmap only.

## Product Principles
1. The visitor's own result is the product; everything else supports reading it.
2. Plain words first, raw records on demand.
3. One clear next step beats a complete list.
4. Never overstate: say what DNS can and can't prove.

## Accessibility & Inclusion
Status must never rely on colour alone (always paired with a word: Good / Check / Fix needed).
