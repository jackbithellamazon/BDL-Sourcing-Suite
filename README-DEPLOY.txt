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

Build: v1.1 · 2026-09-14 · b15 — UK-buy Rule 1 leads carry an 'OA · Currys 5% → £x · y% ROI' chip (best price-matcher from the discount
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
