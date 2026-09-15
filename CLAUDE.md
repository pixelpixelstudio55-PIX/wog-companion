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
- **Farm Ranking** (`#farm`) — rebuilt 2026-09-16. The old note here called the game's own
  precomputed `gold_per_sec` "the most reliably accurate menu in the whole tool"; **real runs
  proved that wrong for this account.** The game's `est_clear_sec` assumes a reference
  character: this account's clears ran ~2.9× longer, and the game's #1 gold stage for it (4-2,
  321 gold/s on paper) died 5 of 5 runs and paid nothing, while 3-9 really paid 94/s. The old
  Smart Analysis farm card had even advised moving to 4-2.
  Now built on `stagePerfTable()` (shared with the Smart Analysis farm card): a stage with runs
  uses its **measured rate including deaths** (gold earned ÷ seconds spent on cleared + died
  runs; abandoned/partial runs are excluded as untrustworthy timing); a stage without runs uses
  `est_clear_sec` × this account's measured slowdown, labelled as an estimate. **Death risk is
  applied whichever number basis is on screen** — flipping to "game numbers" must never put a
  deadly stage back at ⭐ best (it did, before the fix). Stages harder than the hardest one
  ever cleared are never recommended. When the top pick is only an estimate, the advice says
  so and names the best *proven* stage too. Also fixed three old bugs: the difficulty filter
  showed raw Vietnamese, the "EXP/sec" sort actually sorted total EXP, and "clear time"
  sorted slowest-first.
  **Feature parity with the reference site's stage tab (2026-09-16), in our own code.** Boss
  said "copy the original"; its features were all rebuilt here, its code was not pasted, both
  per the "what was NOT reused" rule at the top of this file and because two of its inputs are
  invented: clear time = `total_hp / DPS + (boss_req_mobs/4.5*1.5+3)` with a DPS slider
  defaulting to 3,415, and placeholder stage objects (`total_gold: 15000`, `total_hp: 500000`)
  when a stage isn't found. Parity items: detailed highlight cards (gold/min + gold/hour,
  total mob HP, "+X% vs current stage"; EXP card with **time to next level** from live EXP;
  current-stage card with status + a 4-way gold/EXP recommendation), gold/silver/bronze rank
  badges, an icon per area theme (`farmAreaIcon`, keyed on `area_name_en`, all 40 checked),
  tiered verdicts (⭐ best / ✅ recommended = next 4 safe stages by gold / 📍 current / normal,
  plus our 💀 / ⚠️ / 🔒), a gold/min sort, a scope label showing "(≤ stage X)", and search by
  difficulty name. **Their DPS slider became a pace slider**: it scales `est_clear_sec` for
  stages not yet run (×1–×5, `wog_farm_pace`), and its button snaps back to the pace measured
  from real runs — measured stages always keep their real numbers. `stagePerfTable(paceOverride)`
  takes the override; Smart Analysis calls it with no argument, so it always uses the real pace.
- **Equipment** (1872 items) / **Jewels** (85) / **Training** (40) — searchable reference,
  chunk-rendered (equipment) so 1872 rows never block the main thread on insert.
- **Profile / DPS** — a local-only character-stat form (attack/crit/bonuses, defaults to the
  source data's own default profile) feeding a per-skill DPS estimate.
  ⚠️ **The DPS formula is an estimate and does NOT reproduce the game's own number** — see
  the Skill DPS section below for what was measured and what replaced it. It survives only as
  the offline fallback (no game running) and as a source of *ratios*.
- **Ability ids — read them from the game, never guess.** `nn.db.ability._convertFinalToBaseMap`
  maps each final stat (1xx) to its base row (3xxx), and `_abilityTypeMap` holds that row's
  locale key, so the game will name its own stats. Corrected 2026-09-16 after **103 was
  wrongly used as "real DPS"** for two menus (a label inherited from the reference site's
  `realDps`): 103 is **HP**, proven equal to the combat pawn's own `_maxHp`, and 105 is
  **Movement Speed**, not HP. The authoritative list now lives in a comment above
  `PROFILE_ABILITY_IDS` in `index.html`. **The game exposes no DPS stat at all** — anything
  labelled DPS in this app is either our own estimate or a measured throughput.
- **Skill DPS breakdown** (`#dpsbreak`) — rebuilt 2026-09-15, corrected 2026-09-16.
  Three tiers of trust, kept visibly separate in the UI and worth preserving:
  - **Exact**: equipped skills, their real levels, cooldowns, casts/min, and the **% share** of
    damage. The share needs no formula — normal attack contributes `hits/sec`, a skill
    contributes `(damage% / 100) / cooldown`, and attack/crit/every damage bonus multiply all
    sources alike so they cancel out of the ratio (`dpsbWeights()`).
  - **Measured**: `stageRunMeasuredDps()` = mobs that actually died × that stage's real
    `avg_mob_hp` ÷ real elapsed seconds. Real, but it is clear *throughput*, so it includes
    time spent waiting for spawns.
  - **Estimated**: the DPS / damage-per-cast / damage-per-minute columns, from our own formula.
    Fine for ranking skills, not an in-game number.
  **Measured finding worth keeping:** the estimate runs ~20–37× the measured throughput, and
  mob defense cannot explain it (350 vs 2,418 attack on stage 3-10). The hero is only dealing
  damage a few percent of the time — clear speed is gated by the **spawn rate**, not by damage.
  So on a stage where mobs already die in one hit, more DPS does not clear it faster;
  survivability is what unlocks higher stages. The page says this out loud.
  Also here: live stage banner, mob/boss mode (boss mode applies only the real boss-bonus
  ratio from ability 1057 — **no invented AoE multiplier**, the data doesn't say which skills
  are AoE), and a 3-class comparison table fed by `recordClassDpsSnapshot()` (localStorage
  `wog_class_dps_log`, written from both this page and Smart Analysis; unseen classes stay
  blank, never guessed).
- **Stage Run History** (`#history`) — rebuilt 2026-09-16 as a real per-run tracker.
  `LIVE_SYNC_EXPR` now also returns `out.run` from `ServiceCombat.getCurrentActiveCombatProxy()`:
  `_gameId` (run identity), `_elapsedTime` (the run's own clock), `_dieMobCnt` (kills),
  `_bStageClearSequenceStarted`, `_gameState`/`_isGameEnd`, `_mapMonsterPawnProxy.size`, plus
  the hero pawn's `_curHp`/`_maxHp`/`_isDead`. From those, `trackStageRun()` derives a run's
  true duration, its lowest HP, and a status: `success` / `failed` / `abandoned` / `partial`
  (caught mid-run, so its duration can't be trusted). Up to 100 runs in `wog_stage_runs`,
  plus a LIVE row, summary cards, CSV export, and an advice line that warns when the death
  rate is high or real clear times drift from `est_clear_sec`.
  **Verified against real gameplay** on 2026-09-16: a death on 3-10 (HP → 0%, 58/70 kills,
  101.4s) recorded as `failed`, and a clear of 3-9 (67/70 kills, lowest HP 20.6%, 129.6s)
  recorded as `success`.
  The reference site does this by injecting `globalThis.__stageTracker` **into the game
  process**. We deliberately keep the tracker in our page: it samples the same values at the
  same 2s cadence, so accuracy is identical, and nothing is written into the game's globals.
  **Consequence worth remembering:** real clear times ran ~199% longer than the game's own
  `est_clear_sec`, so every gold/sec and EXP/sec figure derived from it (Farm Ranking, the
  Smart Analysis farm card) is optimistic for this account — the history table's own
  gold-per-sec column is the real one.
- **Combat skill level = (treeTid − groupTid)/10 + 1.** Verified 2026-09-16 against the game's own
  `nn.services.tree.getSkillGroupReachedLevel()` on all 19 learned skills (it reads
  `nn.db.skill.get(treeTid).Level`; skill rows are keyed `groupTid + (level−1)×10`). Before that
  date **every page showed one level too low** and used each skill's previous-level damage %.
  Training levels are `treeTid − groupTid` (matches `getReachedLevel(1, …)` exactly).
- **Resource Optimizer** (`#optimize`) — built 2026-09-16, **recommend-only** by boss's decision
  (a "wear it for me" button is a later phase, and writes are risky while error 21028 is open).
  Four goals the viewer picks from (survive & push / gold+EXP per hour / max damage / balanced),
  sections for class, skills, gear + jewels, maps and "other" (hero promotion, unspent points,
  empty sockets, gear waiting for a level), topped by a ranked "do these first" list.
  Exact from the game: owned items with base stats + socketed jewels (`randomOptions` with
  `slotIdx > 0` are the sockets), wear rules via the game's own `canEquipByHeroClass` and
  `getEquipLimitLevel`, socket count `RandomOptionCnt`, jewel fit `JewelGroupID.includes(jewel
  GroupID)`, skill unlock level / prerequisites / point cost from `nn.db.skill`, hero promotion
  from `nn.db.hero`, stat names from `nn.db.ability._abilityTypeMap`. **Estimated:** the score —
  the game has no "what if" combat-power calculator (`ServiceCombatPower` only reads `finalCp`
  after gear is worn), so `optLineEffect()` converts each stat into a "% equivalent" for the goal
  (formulas documented there). Class comparison is medium-low confidence by nature: the game
  computes full stats only for the class being played.
- **Respec planner** (card inside `#optimize`, 2026-09-16, recommend-only) — "if every skill
  point were reset and spent again at this character level, which allocation is best", one plan
  per goal vs the current allocation. Budget = points spent (from `getTreeAllInfo(4)` with the +1
  level rule) + unspent. Exact from the game: every level's `OpenLevel`, `ConditionID` prerequisite
  (resolved to group + level), `LevelUpItemCnt`, cooldown, and effects from `nn.db.abilityAction`
  (self buffs, enemy debuffs, heals, trigger + duration). **Active skills carry big buffs the plain
  DPS model ignores** (Arcane Burst Attack +120% for 10 s, Fireball Crit Damage +150%, Titan Seal
  Boss +75%, Flame Storm enemy Defense −60%), valued at uptime = duration / cooldown. Periodic
  passives: duration / interval; permanent: 1. Other trigger codes are unnamed by the game and are
  **never assigned an invented rate**.
  **Lesson worth keeping:** seven Mage passives have no `abilityAction` rows at all, yet are
  always-on stats (Master's Staff Attack +84%, Battle Experience Crit +52, Sharp Strike, Ignition,
  Skill Tome, Elemental Convergence, Mana Amplification). The first version scored them as zero and
  **recommended stripping Master's Staff Lv 9 (≈ −76% attack)**. Now: their effect is read from the
  description, only for phrasings verified against real table rows on other skills
  (`OPT_PERMANENT_PHRASES`; conditional wording is never parsed), and any skill still unscorable is
  **locked at its current level** — its points leave the budget and no plan may touch it. Crit
  points are summed across sources and converted once, **capped at 100% crit rate**
  (`optCritPtsToDmg`); this also applies to gear scoring. For the current Mage all four goals
  converge on one allocation — verified, not a bug: Prayer scores 0.17/point vs Master's Staff
  2.92 under Survive, and the real survival passives are conditional (locked) — the card says so.
  Reset, from the game's own text: a per-class "Reset All Skills" button and a per-skill reset
  (blocked while equipped or while a higher skill depends on it); a reset unequips all skills; no
  price in any confirm text and no reset item exists → probably free, not proven.
- **Live Steam prices** (Equipment + Jewels tabs only, boss's call) — checked in **THB** then
  converted to USD via open.er-api.com. Steam's `priceoverview` has no CORS headers (verified:
  the browser blocks it), so prices go through `workers/steam-price-relay/` (Cloudflare Worker,
  deploy steps in its README; boss must deploy it with their own Cloudflare account — until then
  the column shows the old 14 Sep snapshot, labelled). Only rows on screen are checked, one every
  3.3 s, cached 30 min, because Steam rate-limits the endpoint (~20/min). The game client itself
  has no price data (`nn.services.steamMarket` only lists/withdraws items).
  **Steam blocks the Cloudflare Worker — verified, don't re-test blindly.** Boss deployed it to
  `https://wog-steam-price-relay.luckycut.workers.dev`: `/health` 200, but every `/price` got 429
  (first request, and again after a minute), while the identical Steam request from boss's PC
  returned 200 instantly with or without a User-Agent — so it's Cloudflare's IPs, not the request.
  Fix: `workers/steam-price-relay/local-relay.js` (same API, runs on boss's PC on
  `127.0.0.1:8932`, CORS + Chrome private-network preflight, 3.3 s spacing, 10 min cache, 60 s
  back-off), started hidden by `start-local-relay.vbs`. The site tries relays in order — saved URL →
  local → Cloudflare — and fails over on unreachable or 429. The bar's Test button sends a real
  price request, because `/health` alone passed on the blocked Worker.
- **Phone layout (fixed 2026-09-16, pre-existing bug).** At ≤860px `.app-shell` becomes a column,
  but its base rule kept `align-items: flex-start`, so the content column sized itself to its widest
  table instead of the screen and every `.table-scroll` grew rather than scrolled — on a 375px
  phone Farm Ranking was 1,174px wide, History 903, Skill DPS 909, Jewels 583. The mobile rule now
  sets `align-items: stretch` and `.main-content { width: 100% }`. Keep that if the shell changes.
- **Smart Analysis** (`#smart`) — built 2026-09-15 on top of Live Sync, so it no longer needs
  the manual profile form at all. Four cards, all driven by one `buildProfileExpr()` snapshot:
  Account Overview, DPS Analysis (measured run DPS + our estimate + normal-attack vs skill
  share), Skill Tree Optimization, and Optimal Gold/EXP Farming (best unlocked stage, ≥3%
  threshold before it suggests switching). Its DPS numbers follow the same three-tiers-of-trust
  rule as the Skill DPS page above — it used to headline ability 103 as "real DPS", which was
  wrong.
  ⚠️ **The upgrade ranking deliberately scores the DPS you'd actually gain, not raw skill
  damage.** With all 6 skill slots full, learning a 7th skill adds nothing until it replaces
  an equipped one, so an unequipped skill is scored against the *weakest equipped* skill and
  labelled with what it would replace. Ranking by raw damage (what the reference site does)
  puts every unlearned skill above every real upgrade, which is simply wrong advice — keep
  this behaviour if the card is ever rewritten.

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
  `E_AbilityType` ids — **but take the id list from the "Ability ids" bullet above, read out of
  the game's own tables; the ones assumed here in 2026-09-15 included two wrong ones.**
- Fed into a persistent top bar (own design, not the reference site's layout) shown on every
  tab, plus three new computed tabs — Skill DPS Breakdown, Smart Analysis (skill-upgrade
  ranking), Stage Run History (local log starting from now, can't backfill; clear-vs-fail
  detection was added 2026-09-16 — see its section above) — all client-side math on data
  already in `game_data.js`, plus the live combat read the run tracker needs.

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
