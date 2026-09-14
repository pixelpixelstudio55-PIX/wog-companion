# War of Genesis — Personal Database & Calculator

Personal, local-only (`ใช้ในเครื่องฉันคนเดียวก่อน`, boss's own words) reference tool for the Steam
game "War of Genesis: Idle Loot", built 2026-09-14 after the boss ran into a sketchy fan
helper site (`titlee2111.github.io/war-of-genesis-helper/`) that pushed an "Always allow
Steam" auto-launch permission — see that day's security investigation in the parent
conversation. This project exists so the boss has an equivalent tool without that risk.

## Where the game data came from — and what was/wasn't reused

The fan site is a static GitHub Pages page; **its entire game-mechanics database (skill %,
stage HP/gold, jewel/equipment stats) is hardcoded in its own public, client-side JS** — not
a live connection to the game, not a secret. Confirmed directly: its `userProfile` variable
*is* a hardcoded empty template (`nickname: "Tân Thủ (Chưa nạp save)"`, all zeros) — the "live"
appearance in earlier reports came from the site remembering a manually-imported save via
localStorage, never from reading the running game.

**What was extracted and reused**: the raw factual game data — 400 stages, 1872 equipment,
105 skills across 3 classes, 85 jewels, 40 training skills, the level-1-100 EXP curve. This
describes the third-party *game*, not the fan site's own creative work.
**What was deliberately NOT reused**: the fan site's own HTML/CSS/JS structure, visual
design, branding, or copy. This project's UI, code, and architecture are original.

## Where the raw data lives, and how to regenerate

- `raw/data_*.js` — the 6 extracted tables, each a single `const X = [...]`/`{...}` line
  copied verbatim from the source page (via `curl` + `sed`, not by executing any of its own
  JS). Kept around so the translation pipeline can be re-run without re-fetching.
- `tools/build_data.js` — translates every player-facing string to Thai (and keeps/derives
  English) and writes the final `assets/game_data.js` the app actually loads. Run with
  `node tools/build_data.js` after touching this file or the raw tables.
- **Translation approach: templates, not per-entry.** The 1050 skill-level descriptions and
  5423 equipment/training stat lines only follow **99 + 40 (+18 found on a second pass)**
  distinct Vietnamese sentence patterns — each hand-translated ONCE in `build_data.js`
  (`SKILL_DESC_MAP`, `STAT_TEXT_MAP`), with the real numbers substituted back in on output in
  the order they appeared in the original. Same approach for the 40 stage area names, 10
  difficulty tiers, 14 equipment slots, and the 85 jewels' 5 description patterns / 6 grades
  / 4 categories. **Coverage is 100%** for all of these (verified — see the script's own
  console output on every run: "Skill descriptions: 1050/1050", "Stat lines: 5423/5423").
  Equipment/training/jewel *names* are left as their English form even in Thai mode
  (`name_th = name_en`) — they're already stylized proper nouns in the source data (e.g.
  "Iron Sword", "Moon Cleave"), the same convention the DreamEchoes talent database used.
- If a NEW pattern ever shows up (game data updates, or a table this pass didn't cover), an
  untranslated string renders with a visible `[ยังไม่แปล]` / `[untranslated]` suffix rather than
  silently showing raw Vietnamese or guessed text — that's the signal to add the pattern to
  the relevant map in `build_data.js` and rerun.

## The app itself (`index.html`)

Single static HTML/CSS/JS file, no backend, no build step beyond the one-time
`node tools/build_data.js` — open `index.html` directly, no server needed. `#hash` deep-links
each tab (`#skills`, `#training`, `#equipment`, `#jewels`, `#farm`, `#profile`) for quick
testing/bookmarking.

- **Skill Tree** — all 3 classes × 5 branches × 105 skills, click +/- to simulate point
  allocation (`localStorage`, never touches the real game/save).
- **Farm Ranking** — all 400 stages, sortable (Gold/sec default, highest first), searchable,
  filterable by difficulty. This table's numbers are the game's own real precomputed values,
  not derived from character stats — the most reliably accurate menu in the whole tool.
- **Equipment** (1872 items) / **Jewels** (85) / **Training** (40) — searchable reference,
  chunk-rendered (equipment) so 1872 rows never block the main thread on insert.
- **Profile / DPS** — a local-only character-stat form (attack/crit/bonuses, defaults to the
  source data's own default profile) feeding a per-skill DPS estimate.
  ⚠️ **The DPS formula is a calibrated estimate, not the game's real formula** (which isn't
  published anywhere reachable here). It was tuned against one real number the source data
  *does* expose — `userProfile.combatStats.realDps: 3750` at the default stats — and additive
  stacking of the three "increased %" bonus categories landed within ~5% of that (~3948 vs
  3750), vs. ~17% off with multiplicative stacking. Good enough to **rank skills against each
  other**, not to promise an exact in-game number — the UI says so directly next to the
  result, keep that caveat if this section is ever redesigned.
- **The "Smart Analysis: what class/upgrade is optimal" feature the boss asked for is
  deliberately not built yet** (`ในอนาคต` - boss's own words, future phase) — this pass is the
  reference database + a basic per-skill DPS comparator; a real optimizer would need to
  search across skill-point allocations against real stat formulas, which needs the DPS
  model above to be more trustworthy first.

## Verified 2026-09-14

Screenshotted every tab via headless Chrome against the real generated `game_data.js` (not a
mockup): Skill Tree (all 3 classes render, level-1 Moon Cleave etc. show real 250% dmg text in
Thai), Farm Ranking (confirmed sort bug — was ascending by default, fixed to descending/
highest-gold-first, re-verified), Equipment (1872 real rows, slot names now translated),
Jewels (all 85, full Thai descriptions after a second translation pass), Profile/DPS (real
default stats, DPS formula calibrated against the source's own reported baseline).
