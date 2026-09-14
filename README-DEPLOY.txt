BDL Sourcing — how to update the live app
1. Open the GitHub repo → Add file → Upload files.
2. Drag the WHOLE contents of this folder in (index.html, css/, js/, tests/).
3. Commit. GitHub Pages serves it within a minute. Same URL.
Rollback: upload the previous dated folder the same way.

SHARED STORAGE (b10): saves in the browser first, then row-by-row to the shared BDL Supabase project (src_ tables).
  One-time setup: run ~/Downloads/2026-09-13-BDL-SOURCING-SUPABASE.sql in the project's SQL editor. Until that is done the
  header pill says "Shared storage not set up" and every change queues in the browser, then sends itself once the tables exist.
Rules: js/rule1.js is FROZEN (9 Sep 2026). js/rule2.js is Rule 2 AND Rule 3 (same maths). js/rule4.js is VAT. js/queue.js is
  the new/better compare. Do not edit rule1 by hand.
Checks: open the page, add ?checks to the URL, and the known-answer tests run against the fixtures
        (fixtures are kept locally in bdl-sourcing-harness/fixtures, not in the repo).

Build: v1.1 · 2026-09-14 · b24 — Who-are-you gate on first visit and on every marking click (the click is replayed after picking); b23 KPIs + calmer tables
  slot and no Step-4 merge box; OA chips just say 'Check OA · up to x% ROI' (retailers on hover).
Previous: v1.1 · 2026-09-14 · b20 — Rule 1 leads get a score (same formula, display only, the frozen maths is untouched) and sort by it;
  flag chips are short labels with the full text on hover; buy market shown as a flag; calmer palette (no coloured pills, ROI green/amber/red);
  dropped-reason rows list their ASINs on hover; OA chip only when it is worth ≥8% ROI.
Previous: v1.1 · 2026-09-14 · b19 — low-ticket sell: the 180d Buy Box average is ignored when it is a different price regime (>1.35× the 90d,
  e.g. a launch price) — L'OR pods £19.94 → £10.82 (a loss, dropped); low-ticket SCORE scale: £1,500/month and £6/unit saturate under £60
  (WoodWick candle 28 → 51). Mera and all 12 grocery calls unchanged. S&S 136 leads.
  Also b19 — run screen tightened: floors live in the drop card (no dead space on one-file runs), summary compressed,
  Keepa/SAS/Buy/Sell links under the product title (Links column gone), score + status in one column, 'OA check · you check' column with
  category-aware retailers (grocery: Boots/Superdrug/Tesco by eye; electricals: Currys/AO/Marks Electrical; general: Argos/JL/Robert Dyas).
Previous: v1.1 · 2026-09-14 · b18 — under-£60 sell model refitted on 13 of Jack's grocery calls (higher Buy Box 90/180d average, no uplift,
  capped at the FBA 90d average; all calls within ±9%): S&S 137 leads, Business 10, Mera unchanged.
  Round two of Jack's calls: Logitech within 2% of the frozen Rule 1 (no change); high-ticket: only FBA history proves a plateau now
  (FBM-only rows get +5%, not +25%) — Galaxy Book4 Pro £2,207 → £1,788; Mera 12 Sep 390 → 376, 11 Sep unchanged.
  Also b18: Rule 3 folded into Rule 2 (Jack: behaviours belong to the product, not the filter): the under-£50 sell
  model, S&S / Business / coupon buy adjustments and Rule 4 VAT all apply per row on every UK filter. Sources on rule 3 migrate to 2.
Previous: v1.1 · 2026-09-14 · b17 — RULE 3 SELL CHANGE (Jack's grocery calls): under £50 the sell price is the lower Buy Box 90/180-day average
  with no plateau uplift, capped at the Amazon 90-day average; £50+ keeps Mera's model. S&S 596 → 103 leads, Business 16 → 8. Rule 2 untouched.
  Never-sell categories (alcohol, fashion, shoes — editable in Settings, shared) drop leads on every rule. HP + Oral-B in the brand blacklist (live).
Previous: v1.1 · 2026-09-14 · b16 — run summary card now carries the story, the status pills and a detail block (why things dropped, leads by
  market or score band, ROI bands) so there is no dead space; flag links tick green once that country's export is in; every row has Buy <market>
  and Sell UK links; floors save quietly (no toast, re-log 2.5 s after typing stops, 0 = unset); 'Open all N in Keepa' when the view is ≤250;
  list: on-it tag under the status, 'manual export' instead of a token count, hover highlight.
Previous: v1.1 · 2026-09-14 · b15 — UK-buy Rule 1 leads carry an 'OA · Currys 5% → £x · y% ROI' chip (best price-matcher from the discount
  list, all of them on hover) plus the Currys/Argos/JL/Brand-direct confirm toggles; tables use Inter instead of the monospace (Jack: 'font is a bit
  shit'); links as a 2×2 grid; sales floor placeholder shows the rule's own 10/month.
Previous: v1.1 · 2026-09-14 · b14 — leads table redesign: ASIN sits under the title (both rules fit the card without scrolling at 1440),
  coloured market pills, ROI bands, coloured flags, tinted header, row hover; the story sits inside the Run summary card (no dead space);
  floors bar renamed 'Customise this source'.
Previous: v1.1 · 2026-09-14 · b13 — Rule 1 run screen: the merge/Viewer bar is visible from the start ('Step 4 happens here'), plain-text
  note that Keepa cannot take the marketplace from a link (switch the flag in Keepa per country); story repaints after verdicts; No rows readable.
Previous: v1.1 · 2026-09-14 · b12 — leads per page (50/100/200/all) with 'Open these N in Keepa' saying how many it opens; the run
  summary points at 'Mark all as seen' when unreviewed leads are carried over from the last run.
Previous: v1.1 · 2026-09-14 · b11 — readability + density pass on the leads table (brighter greys, bigger secondary text, tighter rows,
  chips capped at 4 + '+n'), Track button removed (Keepa's page has the Track tab), links next to the verdict, run summary told as a
  sentence (export → leads → to review today, and what changed vs last time), own lock never shown as 'someone else'.
Previous: v1.1 · 2026-09-13 · b10 — shared storage (Supabase src_ tables, local-first outbox), who-am-I dropdown, per-source in-progress lock,
  To-review queue (new + better since last verdict, 2p counts), ASIN blacklist with reason, brand blacklist with Jack approval,
  Rule 4 VAT (tea/coffee 0%, VA override chip, editable words), Rule 3 = Suz grocery/S&S/Business (same maths as Rule 2),
  Suz's three filters seeded (EU one parked, tea & coffee waiting for its link), per-source FLOORS (the customisable Filter & Sort,
  saved on the source, applied before the queue), brand + title stored with every lead, Settings regrouped with shared / this-browser tags,
  Track-at-£ note, Keepa 'low was' on WORSE rows. Checks: 41.
  Rule 3 locked on Suz's 13 Sep exports (S&S 2,520 → 596 · Business 179 → 16); Rule 4 word lists widened (syrups, perfumes, cosmetics, supplements = 20%). Checks: 54.
  Edit drawer redesigned 13 Sep 22:10: sections (What it is / Where it buys / Who and when / Keepa / Notes), rule + status as pick-one cards,
  owner + cadence one-tap, market chips, link field shows saved vs generated with Open, brand-only and filter-only fields hide, Delete in the footer.
  LIVE-TESTED 13 Sep 21:30 with two browsers against the real src_ tables (seed rows are in; test rows removed).
Previous: v1.0 · 2026-09-13 · b9 — Jack's real Keepa Finder links seeded for 15 sources; Corsair/Elgato, Ninja/Shark, SanDisk/Seagate/WD merged; Bialetti + Repken seller watch added; UK-only brand runs work off one Finder export
