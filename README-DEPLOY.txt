BDL Sourcing — how to update the live app
1. Open the GitHub repo → Add file → Upload files.
2. Drag the WHOLE contents of this folder in (index.html, css/, js/, tests/).
3. Commit. GitHub Pages serves it within a minute. Same URL.
Rollback: upload the previous dated folder the same way.

TEST MODE: everything stays in this browser's localStorage. Nothing is uploaded anywhere.
Rules: js/rule1.js is FROZEN (9 Sep 2026). js/rule2.js is the Mera filter. Do not edit either by hand.
Checks: open the page, add ?checks to the URL, and the known-answer tests run against the fixtures
        (fixtures are kept locally in bdl-sourcing-harness/fixtures, not in the repo).

Build: v1.0 · 2026-09-12 · b6 — list split into Saved filters / Brands, owner column + who last ran it, Edit button on every row
