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

## 2026-09-15: Live Sync, sidebar rebuild, and the Jewel Forge write feature

Boss asked for the site to go public (GitHub Pages, repo `wog-companion`) and to match the
reference site's *systems*, not just its data — including live-updating gold/level/DPS.
Investigated the reference site's own JS (read-only, for understanding — never executed its
code) and found the real mechanism: the game itself ("War of Genesis: Idle Loot", a Unity game
scripted via Puerts/V8) opens a debug WebSocket at `ws://127.0.0.1:10998` on **every launch, by
default** — not something either site turns on. Each visitor's own browser connects to their
own `127.0.0.1`, so hosting this publicly never exposes anyone else's game.

**What Live Sync reads** (`LIVE_SYNC_EXPR` in `index.html`), all via getters, nothing mutated:
- UI Text components already on screen (`nn.uiManager._showingPanels[n].TxtStageNum.text` etc.)
  for stage name/progress/boss HP — literally reading what's rendered, nothing more.
- `nn.netData._mapContainer` / `nn.services._mapService` are Map-likes (need `.entries()`, not
  `Object.keys()` — this was the missing piece for a while). `NetContainerItem._mapItemStack`
  holds currency/item counts by tid (1000=gold, 6000=diamond); `ServiceUser.getCurrentExpInfo()`
  gives level/EXP; `ServiceContentState.getValue(id)` gives live combat stats by the same
  `E_AbilityType` ids documented in the game's own enum table (101=attack, 104=attack speed,
  106/107=crit rate/damage, 1054/1057/1058=PvE/Boss/general damage bonus).
- Fed into a persistent top bar (own design, not the reference site's layout) shown on every
  tab, plus three new computed tabs — Skill DPS Breakdown, Smart Analysis (skill-upgrade
  ranking), Stage Run History (local log starting from now, can't backfill or detect
  clear-vs-fail) — all pure client-side math on data already in `game_data.js`.

**Real game icons**: equipment/jewel/training items share the *same* base64 icon atlas as
skills (`skillIconsBase64` in the reference page), keyed by each item's own `icon` field which
was already in our extracted raw data. Fetched at runtime from the reference site's own URL
(CORS is wide open there) and never committed to this repo — see `loadRemoteSkillIcons()`.

**Jewel Forge & Storage — the one write-capable feature.** Boss explicitly asked for this and
was warned clearly, twice, about real ban risk from a game potentially detecting access outside
its own client; boss's own words: "ทำเลย รับความเสี่ยงได้" (do it, I accept the risk). Scoped to
the safest slice on purpose:
- Read-only jewel counts per fusion tier (`ServiceItem.getOwnedItemCount(tid)`, summed by grade
  from our own `jewelDatabase`, excluding item 9600 which is a synthesis-EXP material, not a
  fusable jewel) — zero risk, just numbers.
- One write action: `ServiceWorkshop.setAutoFusionOn(true/false)` — a real, developer-provided
  toggle (confirmed via the game's own save-data fields, `_workShopAutoFusionOn` etc., which
  have proper `_key`/`_defaultValue` structure — this is a shipped QoL feature of the game, not
  cheat-injected state) called through its own official service method, not a raw field poke.
  Tested end-to-end against the real running game: toggled true, confirmed via reading the raw
  setting back, restored to false.
- Explicitly **not** built: the actual "fuse now" flow (`reqFusionAsync` and friends). It needs
  staging several items through interdependent methods first, calling several prototype methods
  that errored unpredictably in testing (`isAutoFusionOn()` etc. threw "not a function" despite
  existing on the prototype — the C#↔JS bridge here is not fully reliable), and getting the
  sequence wrong risks actually consuming real jewels, not just showing a wrong number like
  everywhere else in this app. Boss agreed to defer this specifically until it can be tested
  more carefully.

## Verified 2026-09-14

Screenshotted every tab via headless Chrome against the real generated `game_data.js` (not a
mockup): Skill Tree (all 3 classes render, level-1 Moon Cleave etc. show real 250% dmg text in
Thai), Farm Ranking (confirmed sort bug — was ascending by default, fixed to descending/
highest-gold-first, re-verified), Equipment (1872 real rows, slot names now translated),
Jewels (all 85, full Thai descriptions after a second translation pass), Profile/DPS (real
default stats, DPS formula calibrated against the source's own reported baseline).
