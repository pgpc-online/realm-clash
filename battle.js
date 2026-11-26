/* ===== 2.5D MOBA ENGINE (MLBB PING RAIL + REGEN + RECALL + TURRET AGGRO) ===== */
(function () {
  /* v5.9: CENTER_EXTRA widens the open middle between the two outer towers (bases/towers stay anchored to their own side). Was 3600 / 800px gap. */
  const CENTER_EXTRA = 600, BASE_X = 330, BASE_SHIFT = BASE_X - 165, W = 3600 + CENTER_EXTRA + 2 * BASE_SHIFT, VIEW_H = 700, LANE_TOP = 245, LANE_BOT = 668, LANE_Y = 456, MAX_LV = 15, RECALL_DUR = 5.0, REGEN_CD = 35.0, RESPAWN_MAX = 30;
  /* v6.6: the healing fountain is its own pad BEHIND each base turret (full lane height, ends at the turret), not a circle around it. */
  /* v6.7: the pad was only ~115px of usable ground squeezed against the map edge. Bases moved BASE_SHIFT px inward (map grew by 2x that so the centre gap /
     tower spacing are unchanged) and the pad is now a wide ellipse: ~375px of usable ground from the back wall to just past the base turret. */
  const FOUNT_OFF = 115, FOUNT_RX = 200, FOUNT_RY = 215;
  const TEAM_COL = ["#42a5f5", "#ef5350"];
  /* ---- v4.5 Phase 2: camera framing. World size / lanes / collision / minimap are untouched; only the screen window changes.
     The empty sky strip above the cliffs is cropped (CAM_TOP) so the lane band gets a bigger share of the screen (HUD now lives in that strip). ---- */
  const CAM_TOP = 50, CAM_H = VIEW_H - CAM_TOP;
  const rand = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const norm = (x, y) => { const l = Math.hypot(x, y) || 1; return { x: x / l, y: y / l }; };
  const $ = (id) => document.getElementById(id);
  const itemGlyph = (item) => {
    if (!item) return "·";
    if (item.category === "boots") return "👢";
    const st = item.stats || {};
    if (st.magicPower || st.magicPenFlat) return "✨";
    if (st.physicalAttack || st.physicalPenFlat || st.critChancePct || st.attackSpeedPct) return "⚔";
    if (st.maxMana || st.manaRegen) return "💧";
    if (st.physicalDefense || st.magicDefense || st.ccDurationReductionPct) return "🛡";
    if (st.maxHp) return "❤️";
    if (st.cooldownReductionSeconds) return "⌛";
    return "◆";
  };

  /* v7.8: image icon for an item (emoji fallback via itemGlyph when the PNG is missing) */
  const itemIcon = (item) => item ? RCIcon.itemHtml(item.id, itemGlyph(item)) : "";
  const TIER_CLS = (item) => item.category === "boots" ? "t1" : "t" + (item.tier || 1);

  /* ---- Simple Shop / scoreboard shared item presentation ---- */
  const STAT_NAMES = { physicalAttack: "Physical Attack", magicPower: "Magic Power", maxHp: "Max HP", physicalDefense: "Physical Defense", magicDefense: "Magic Defense", maxMana: "Max Mana", manaRegen: "Mana Regen", attackSpeedPct: "Attack Speed", critChancePct: "Crit Chance", physicalPenFlat: "Physical Penetration", magicPenFlat: "Magic Penetration", cooldownReductionSeconds: "Cooldown Reduction", movementSpeed: "Movement Speed", ccDurationReductionPct: "CC Reduction" };
  /* v6.1 movement: hero base speed x HERO_SPEED_SCALE (heroes felt too fast); item "movementSpeed" points are worth MS_UNIT px/s each (boots used to add +0.3 px/s, i.e. nothing). */
  const HERO_SPEED_SCALE = 0.75, MS_UNIT = 50;
  const itemStatText = (item) => Object.entries(item.stats || {}).map(([k, v]) => {
    const suffix = ["attackSpeedPct", "critChancePct", "ccDurationReductionPct"].includes(k) ? "%" : k === "manaRegen" ? "/s" : k === "cooldownReductionSeconds" ? "s" : "";
    return `${STAT_NAMES[k] || k} ${k === "cooldownReductionSeconds" ? "−" : "+"}${k === "movementSpeed" ? Math.round(v * MS_UNIT) : v}${suffix}`;
  }).join(" · ") || "No base stats";
  const itemTierLabel = (item) => item.category === "boots" ? "Boots" : item.tier === 1 ? "Component" : item.tier === 2 ? "Intermediate" : "Completed item";
  const itemCategory = (item) => {
    const st = item.stats || {};
    if (item.category === "boots") return "movement";
    if (st.magicPower || st.magicDefense || st.magicPenFlat || st.maxMana || st.manaRegen) return st.magicDefense && !st.magicPower ? "defense" : "magic";
    if (st.physicalDefense || st.maxHp || st.ccDurationReductionPct) return "defense";
    if (st.movementSpeed) return "movement";
    if (st.physicalAttack || st.attackSpeedPct || st.critChancePct || st.physicalPenFlat) return "attack";
    return "defense";
  };
  const escHtml = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const itemDetailHtml = (item) => `<span class="det-ico ${TIER_CLS(item)}">${itemIcon(item)}</span><b>${escHtml(item.name)}</b> <em>${itemTierLabel(item)} · ${item.price} G</em><div>${itemStatText(item)}</div>${item.uniquePassive ? `<div class="passive">Passive: ${escHtml(item.uniquePassive.effect)} <i>(provisional)</i></div>` : ""}`;
  const SHOP_REASONS = { "inventory-full": "Inventory full — sell an item first", "boots-limit": "You already own boots — sell them to swap", "unknown-item": "Unknown item", "invalid-purchase": "Cannot buy", "already-prioritized": "Already in your priority list", "priority-full": "Priority list is full", "queue-empty": "No prioritized build" };

  /* v5.9 MVP score: kills and assists lead, deaths cost, then damage dealt, damage soaked, healing, towers and CS. Highest on each team is that team's MVP. */
  const mvpScore = (h) => h.k * 3 + h.a * 1.5 - h.d * 1.5 + h.heroDmg / 1500 + h.dmgTaken / 3000 + h.healing / 1500 + h.twrKill * 2 + h.cs * 0.05;

  /* ---- v4.5 Phase 1: kill attribution + bounty configuration ---- */
  const KILL_CFG = {
    window: 8.0,              // seconds a damage / CC contribution stays eligible for kill credit & assists
    assistMinDmg: 30,         // flat floor of window damage for a "meaningful" contribution
    assistMinDmgPct: 0.05,    // ...or this fraction of the victim's max HP, whichever is higher
    ccStunRootMin: 0.5,       // a stun/root of at least this many seconds counts as meaningful CC
    ccSlowMin: 1.5,           // a slow of at least this many seconds counts as meaningful CC
    // Kill-streak bounty (victim's streak at time of death). Highest matching tier applies.
    shutdownMin: 3,
    bountyTiers: [
      { min: 3, gold: 50 }, { min: 4, gold: 75 }, { min: 5, gold: 100 },
      { min: 6, gold: 150 }, { min: 7, gold: 200 }, { min: 10, gold: 300 },
    ],
  };

  // Stage 0B role Mana progression (first-pass proposed baseline).
  const MANA_ROLE = {
    Tank: { start: 400, end: 800, regen: 4.0 },
    Fighter: { start: 350, end: 700, regen: 3.5 },
    "Tank Support": { start: 450, end: 850, regen: 4.5 },
    Assassin: { start: 350, end: 700, regen: 3.5 },
    Marksman: { start: 400, end: 750, regen: 4.0 },
    Mage: { start: 500, end: 1000, regen: 4.5 },
    "Control Mage": { start: 500, end: 1000, regen: 4.5 },
  };

  const input = { mx: 0, my: 0, attack: false };
  /* aim.drag = finger moved past the dead-zone (explicit aim). aim.cancel = finger is over the cancel zone. aim.R = full-drag radius in px. */
  const aim = { active: false, slot: -1, dx: 1, dy: 0, frac: 0, ox: 0, oy: 0, pid: null, drag: false, cancel: false, R: 65 };
  /* Aim style per skill type (anything not listed is self-centred): "line" = directional skill-shot, "ground" = placed AoE. */
  const AIM_KIND = { dash: "line", sand_wave: "line", hook: "line", shot: "line", wave: "line", beam: "line",
    leap: "ground", root_burst: "ground", vortex: "ground", frost_prison: "ground", collapse: "ground", barrage: "ground", storm: "ground", gravity: "ground" };
  const AIM_DEAD_FRAC = 0.22;          // drag shorter than this fraction of aim.R = tap-style auto-aim
  const DECAL_K = 0.5, REACH_K = 0.65; // ground-plane squash: AoE decals (matches hazards/rings) and reach ellipse (matches aimPoint's y*0.65)
  let B = null, uid = 1, lowGfx = false;

  const IMG_CACHE = {};
  // v6.5: turret / base artwork (structures/*.webp). If an image is missing or not loaded yet, the old drawn shapes are used.
  // v6.6: every art file is requested up front (not the first time it is drawn) and a failed load is retried, so the far-side (red) art
  //       can no longer get stuck on the old drawn fallback for the whole match after one slow / failed request.
  const STRUCT_IMG = {}, FLASH_IMG = {}, ART_RETRY = 5;
  const ART_SRC = (key) => (key === "bush" ? "props/bush.webp" : "structures/" + key + ".webp");
  function loadArt(key, tries) {
    if (typeof Image === "undefined") return null;
    const im = new Image(); STRUCT_IMG[key] = im;
    im.onerror = () => {
      if (tries >= ART_RETRY || typeof setTimeout === "undefined") return;
      setTimeout(() => { if (STRUCT_IMG[key] === im) loadArt(key, tries + 1); }, 600 * (tries + 1));
    };
    im.src = ART_SRC(key) + (tries ? "?r=" + tries : "");   // cache-bust the retry so a bad cached response is not reused
    return im;
  }
  function getStructImg(key) {
    if (typeof Image === "undefined") return null;
    const im = STRUCT_IMG[key] || loadArt(key, 0);
    return im && im.complete && im.naturalWidth > 0 ? im : null;
  }
  const ART_KEYS = ["tower_blue", "tower_red", "base_blue", "base_red", "bush"];
  function preloadArt() { for (const k of ART_KEYS) getStructImg(k); }
  preloadArt();

  /* ===== v7.0 SPRITE-SHEET HEROES =====
     A hero whose data has `sprites` (see De'ana in data.js) is drawn from animation sheets instead of the portrait circle:
     idle / walk / cast / death. Until a sheet has loaded (or if it is missing) the old portrait circle is used, so nothing breaks. */
  const SPR_SHEET = {};
  function sprSheet(src) {
    if (typeof Image === "undefined") return null;
    let im = SPR_SHEET[src];
    if (!im) {
      const load = (tries) => {
        const i = new Image(); SPR_SHEET[src] = i;
        i.onerror = () => { if (tries < ART_RETRY && typeof setTimeout !== "undefined") setTimeout(() => { if (SPR_SHEET[src] === i) load(tries + 1); }, 600 * (tries + 1)); };
        i.src = src + (tries ? "?r=" + tries : "");
        return i;
      };
      im = load(0);
    }
    return im.complete && im.naturalWidth > 0 ? im : null;
  }
  function preloadSprites(def) { if (def && def.sprites) for (const k in def.sprites.anims) sprSheet(def.sprites.dir + def.sprites.anims[k].src); }
  const sprStart = (a) => a.from || 0;
  const sprDur = (a) => (a.frames - sprStart(a)) / a.fps;                       // seconds for one pass of the animation
  function sprFrame(a, t) {                                                     // frame index at animation time t
    const f0 = sprStart(a), n = a.frames - f0, k = Math.floor(t * a.fps);
    return a.loop ? f0 + (k % n) : f0 + Math.min(n - 1, k);
  }
  let SPR_TMP = null;   // scratch canvas for the white hit-flash silhouette
  /* what to draw for this hero right now: {img, a, f, cell, sc, top} or null (-> portrait circle). top = screen y of the sprite's head. */
  function sprPose(h) {
    const S = h.def.sprites; if (!S || !h.spr) return null;
    const a = S.anims[h.spr.st]; if (!a) return null;
    const img = sprSheet(S.dir + a.src); if (!img) return null;
    const sc = S.scale, f = sprFrame(a, h.spr.t);
    return { img, a, f, cell: S.cell, sc, S, top: h.y + 4 - S.foot * sc };
  }
  function sprBlit(c, h, P, alpha) {
    const { img, a, f, cell, sc } = P, sx = (f % a.cols) * cell, sy = Math.floor(f / a.cols) * cell, dw = cell * sc, dx = h.x - dw / 2, dy = P.top;
    c.save();
    if (h.sprDir < 0) { c.translate(h.x, 0); c.scale(-1, 1); c.translate(-h.x, 0); }   // sheets face right
    if (alpha < 1) c.globalAlpha *= alpha;
    c.drawImage(img, sx, sy, cell, cell, dx, dy, dw, dw);
    if (h.hitFlash > 0 && typeof document !== "undefined") {
      if (!SPR_TMP) SPR_TMP = document.createElement("canvas");
      SPR_TMP.width = SPR_TMP.height = cell;
      const x = SPR_TMP.getContext("2d");
      x.clearRect(0, 0, cell, cell); x.drawImage(img, sx, sy, cell, cell, 0, 0, cell, cell);
      x.globalCompositeOperation = "source-in"; x.fillStyle = "#fff"; x.fillRect(0, 0, cell, cell);
      c.globalAlpha *= 0.7; c.drawImage(SPR_TMP, 0, 0, cell, cell, dx, dy, dw, dw);
    }
    c.restore();
  }
  function getFlashImg(key, im) {   // white silhouette of the sprite, used for the hit flash
    if (FLASH_IMG[key]) return FLASH_IMG[key];
    if (typeof document === "undefined" || !document.createElement) return null;
    const cv = document.createElement("canvas"); cv.width = im.naturalWidth; cv.height = im.naturalHeight;
    const x = cv.getContext && cv.getContext("2d"); if (!x) return null;
    x.drawImage(im, 0, 0); x.globalCompositeOperation = "source-in"; x.fillStyle = "#fff"; x.fillRect(0, 0, cv.width, cv.height);
    return (FLASH_IMG[key] = cv);
  }
  function getHeroImg(def) {
    if (!def.img) return null;
    if (!IMG_CACHE[def.img]) { const im = new Image(); im.src = def.img; IMG_CACHE[def.img] = im; }
    const img = IMG_CACHE[def.img];
    return img.complete && img.naturalWidth > 0 ? img : null;
  }

  class BattleGame {
    constructor(mode, heroId, onEnd, opts) {
      this.mode = mode; this.onEnd = onEnd; preloadArt();
      /* v7.1 DRAFT: the hero-select draft hands in the teams it already chose ({ allies:[ids], enemies:[ids], allyNames:[...] }). Absent = random teams as before. */
      this.picks = opts && opts.picks ? opts.picks : null;
      /* v5.1: practice (1v1 training) options. null in every normal match, so all practice hooks below are inert there. */
      this.practice = opts && opts.practice
        ? { enemyHero: null, myLv: 1, enemyLv: 1, freezeEnemy: false, noCdMe: false, noCdEnemy: false, noManaCost: false, minions: false, dummy: false, ...opts }
        : null;
      $("battleShopModal").classList.add("hidden");
      this.canvas = $("game"); this.ctx = this.canvas.getContext("2d");
      this.mini = $("minimap"); this.mctx = this.mini.getContext("2d");
      this.mini.width = 240; this.mini.height = 50;
      this.time = 0; this.prepT = this.prepTotal = 15.0; this.firstWaveSent = false; this.waveT = 28;
      this.over = false; this.ended = false; this.paused = false; this.stopped = false;
      this.winner = null; this.endTimer = 0; this.score = [0, 0]; this.camX = 0;
      this.inhibDown = [false, false]; this.panActive = false; this.panUntil = 0; this.freeX = 0; this.firstBlood = false; this.bannerT = 0; this.ping = null; this.teamOrder = null; this.orderT = 0;
      this.heroes = []; this.minions = []; this.structs = []; this.projs = []; this.hazards = []; this.slides = [];
      this.particles = []; this.fx = []; this.bases = []; this.towers = [[], []]; this.shopCategory = "all";

      this.bushes = [   // left half hugs the blue side, right half is its mirror, centre pair sits on the new mid line
        { x: 960 + BASE_SHIFT, y: 292, r: 78 }, { x: 1450 + BASE_SHIFT, y: 615, r: 80 }, { x: W / 2, y: 292, r: 86 },
        { x: W / 2, y: 618, r: 86 }, { x: W - 1450 - BASE_SHIFT, y: 615, r: 80 }, { x: W - 960 - BASE_SHIFT, y: 292, r: 78 },
      ];
      this.bushDraw = this.bushes.map((b) => ({ kind: "bush", b, x: b.x, y: b.y + 14 }));   // v6.6: bush art is depth-sorted with heroes
      this.peaks = [];
      for (let x = -280; x <= W + 280; x += 140) this.peaks.push({ x, w: rand(160, 250), h: rand(52, 100), backH: rand(78, 132) });
      this.stones = [];
      for (let i = 0; i < 240; i++) {
        this.stones.push({ x: rand(20, W - 20), y: rand(LANE_TOP + 12, LANE_BOT - 12), rx: rand(10, 28), ry: rand(4, 10),
          c: Math.random() < 0.5 ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.08)" });
      }

      for (let t = 0; t < 2; t++) {
        const dir = t ? -1 : 1, bx = t ? W - BASE_X : BASE_X;
        const base = { kind: "base", team: t, x: bx, y: LANE_Y, r: 68, hp: 5200, maxhp: 5200, armor: 24, mres: 24, range: 350, atkCd: 0, curTarget: null, heat: 0, req: null, dead: false, hitFlash: 0 };
        const outer = { kind: "tower", tier: "Outer", team: t, x: bx + dir * 1235, y: 415, r: 35, hp: 2700, maxhp: 2700, armor: 26, mres: 26, range: 340, atkCd: 0, curTarget: null, heat: 0, req: null, dead: false, hitFlash: 0 };
        const inner = { kind: "tower", tier: "Inhibitor", team: t, x: bx + dir * 755, y: 395, r: 36, hp: 3300, maxhp: 3300, armor: 28, mres: 28, range: 340, atkCd: 0, curTarget: null, heat: 0, req: outer, dead: false, hitFlash: 0 };
        base.req = inner;
        this.bases[t] = base; this.towers[t] = [outer, inner];
        this.structs.push(outer, inner, base);
      }

      const defs = HEROES.find((h) => h.id === heroId) || HEROES[0];
      const allyPool = HEROES.filter((h) => h.id !== defs.id).sort(() => Math.random() - 0.5);
      const enemyPool = HEROES.filter((x) => x.id !== defs.id).sort(() => Math.random() - 0.5);
      const names = BOT_NAMES.slice().sort(() => Math.random() - 0.5);
      const pk = this.picks, byId = (id) => HEROES.find((x) => x.id === id);
      const allyNames = pk && pk.allyNames ? pk.allyNames.slice() : null;
      if (allyNames) for (const n of allyNames) { const k = names.indexOf(n); if (k >= 0) names.splice(k, 1); }
      for (let t = 0; t < 2; t++) {
        for (let i = 0; i < mode; i++) {
          const isPlayer = t === 0 && i === 0;
          const prDef = this.practice && t === 1 ? HEROES.find((x) => x.id === this.practice.enemyHero) : null;
          const pickDef = pk && !isPlayer ? byId((t === 0 ? pk.allies : pk.enemies)[t === 0 ? i - 1 : i]) : null;
          const def = isPlayer ? defs : prDef || pickDef || (t === 0 ? allyPool[(i - 1) % allyPool.length] : enemyPool[i % enemyPool.length]);
          const botName = t === 0 && allyNames && allyNames[i - 1] ? allyNames[i - 1] : names.pop();
          const h = this.makeHero(def, t, i, isPlayer, isPlayer ? "You" : this.practice ? "Enemy" : botName);
          if (!isPlayer) this.aiSpendUpgrades(h);
          this.heroes.push(h);
        }
      }
      this.player = this.heroes[0];
      this.enemyHero = this.heroes.find((x) => x.team === 1);
      this.camX = 0;

      const p = this.player, port = $("hudPort");
      HeroArt.paint(port, p.def);

      const hs = p.def.skills;
      this.skillEls = [0, 1, 2].map((i) => {
        const b = $("btnS" + i), maxRk = i === 2 ? 3 : 5;
        b.innerHTML = `<span class="ico">${RCIcon.skillHtml(p.def, i)}</span><div class="cd"></div><span class="cdt"></span>` +
          `<div class="pips">${'<i class="pip"></i>'.repeat(maxRk)}</div><button class="sk-up hidden" type="button">+</button>`;
        b.querySelector(".sk-up").addEventListener("pointerdown", (e) => { e.stopPropagation(); this.upgradeSkill(this.player, i); });
        return { btn: b, cd: b.querySelector(".cd"), t: b.querySelector(".cdt"), pips: [...b.querySelectorAll(".pip")], up: b.querySelector(".sk-up") };
      });
      this.recallBtn = $("btnRecall"); this.recallCd = this.recallBtn.querySelector(".cd");
      this.regenBtn = $("btnRegen"); this.regenCd = this.regenBtn.querySelector(".cd"); this.regenTxt = this.regenBtn.querySelector(".cdt");
      this.passiveChip = $("passiveChip"); this._pcKey = "";   // v7.5: bottom-centre passive indicator (image icon, only while the effect is active)
      this.passiveChip.querySelector(".pc-ico").innerHTML = RCIcon.passiveHtml(p.def);
      this.passiveChip.classList.add("hidden"); this._pp = { x: p.x, y: p.y, mv: 0 };

      this.buildPortraits();
      $("feed").innerHTML = "";
      $("killBanner").className = "kill-banner hidden";
      $("prepBanner").className = "prep-banner";
      $("endBanner").className = "hidden";
      $("respawnMsg").className = "hidden";
      $("chatDrawer").classList.add("hidden"); $("dimmer").classList.remove("on"); $("dimmer").classList.remove("dead");
      $("wipeBanner").className = "hidden"; this.wipeT = 0;
      $("buildReady").classList.add("hidden"); this._brKey = ""; this._brDismiss = null; this._brT = -9;
      this.practiceUi(!!this.practice);
      this.buildShowcase();
      if (this.practice) this.initPractice();
      /* v6.7: the "welcome" voice line is sequential with the loading (hero showcase) screen: it plays when the loading screen goes away, not on top of it.
         Practice mode has no loading screen, so its welcome still plays right away. */
      Sound.annReset(); if (this.practice || this.prepT <= 0) Sound.announce("welcome");
    }

    /* ---------- v6.0 HERO SHOWCASE: both teams are shown during the 15s pre-battle countdown (not in practice) ---------- */
    buildShowcase() {
      const el = $("showcase"); this.scCards = [];
      if (!el) return;
      if (this.practice || this.prepT <= 0) { el.className = "hidden"; el.innerHTML = ""; return; }
      el.innerHTML = ""; el.className = "";
      const row = (team) => {
        const r = document.createElement("div"); r.className = "sc-row " + (team === 0 ? "me" : "foe");
        this.heroes.filter((h) => h.team === team).forEach((h, k) => {
          const c = document.createElement("div"); c.className = "sc-card" + (h.isPlayer ? " sc-me" : ""); c.style.animationDelay = (team * 0.15 + k * 0.07) + "s";
          const art = document.createElement("div"); art.className = "sc-art"; HeroArt.paint(art, h.def); c.appendChild(art);
          const tx = document.createElement("div"); tx.className = "sc-txt";
          tx.innerHTML = `<span class="sc-role">${escHtml(h.def.role)}</span><span class="sc-hero">${escHtml(h.def.name)}</span><span class="sc-name">${escHtml(h.isPlayer ? "You" : h.name || "Bot")}</span>`;
          c.appendChild(tx);
          const bar = document.createElement("div"); bar.className = "sc-bar"; bar.innerHTML = "<i></i><b>0%</b>"; c.appendChild(bar);
          this.scCards.push({ fill: bar.querySelector("i"), txt: bar.querySelector("b"), speed: 0.78 + Math.random() * 0.22 });
          r.appendChild(c);
        });
        return r;
      };
      const tip = document.createElement("div"); tip.className = "sc-tip"; tip.innerHTML = "<b>BATTLE BEGINS SOON</b> · get ready!";
      this.scTip = tip;
      el.appendChild(row(0)); el.appendChild(tip); el.appendChild(row(1));
    }
    showcaseTick() {
      const el = $("showcase"); if (!el || !this.scCards) return;
      const prog = clamp(1 - this.prepT / (this.prepTotal || 15), 0, 1);
      for (const c of this.scCards) { const p = Math.round(clamp(prog / c.speed, 0, 1) * 100); c.fill.style.width = p + "%"; c.txt.textContent = p + "%"; }
      if (this.scTip) this.scTip.innerHTML = `<b>BATTLE BEGINS IN ${Math.max(1, Math.ceil(this.prepT))}</b> · get ready!`;
      if (this.prepT <= 0) { el.className = "hidden"; this.scCards = null; }
    }

    /* ---------- v5.1 PRACTICE MODE (1v1 training). Every hook is gated by this.practice, so normal matches are untouched. ---------- */
    practiceUi(on) { $("prFab").classList.toggle("hidden", !on); $("prMeter").classList.toggle("hidden", !on); $("prPanel").classList.add("hidden"); }
    initPractice() {
      const pr = this.practice, p = this.player, e = this.enemyHero, mid = W / 2;
      this.prepT = 0; this.firstWaveSent = true; this.waveT = pr.minions ? 1.5 : 28;
      $("prepBanner").className = "prep-banner hidden";
      p.x = p.spawn.x = mid - 170; e.x = e.spawn.x = mid + 170;
      p.y = p.spawn.y = e.y = e.spawn.y = LANE_Y;
      p.face = { x: 1, y: 0 }; e.face = { x: -1, y: 0 }; p.laneY = e.laneY = LANE_Y;
      this.setLevel(p, pr.myLv); this.setLevel(e, pr.enemyLv);
      this.camX = clamp(p.x - 400, 0, W);
      this.meterReset(); this.dummy = null;
      if (pr.dummy) this.setDummy(true);
      this.feed("🎯 Practice mode · tap 🛠 on the left for options");
      this.refreshPracticePanel();
    }
    /* Jump a hero straight to a level: resets and re-spends skill points (the player keeps the manual +1 SP at Lv1). */
    setLevel(h, lv) {
      lv = clamp(Math.round(lv) || 1, 1, MAX_LV);
      h.lv = lv; h.xp = 0; h.xpNext = lv === 1 ? 120 : 120 + lv * 28;
      h.skillLv = [0, 0, 0]; h.sp = lv;
      this.recalcHeroStats(h); h.hp = h.maxhp; h.shield = 0; h.shieldT = 0;
      if (!h.isPlayer || lv > 1) this.spendSkillPoints(h, true);
    }
    practiceLevel(who, act) {
      const h = who === "me" ? this.player : this.enemyHero;
      if (act === "up") { if (h.lv < MAX_LV) { if (h.dead) this.setLevel(h, h.lv + 1); else this.grantXp(h, h.xpNext - h.xp, true); } }
      else if (act === "down") this.setLevel(h, h.lv - 1);
      else if (act === "max") this.setLevel(h, MAX_LV);
      this.refreshPracticePanel();
    }
    practiceToggle(key) {
      const pr = this.practice;
      pr[key] = !pr[key];
      if (key === "minions") { if (!pr.minions) this.clearWave(); else this.waveT = Math.min(this.waveT, 1); }
      if (key === "dummy") this.setDummy(pr.dummy);
      if (key === "freezeEnemy" && pr.freezeEnemy) { this.cancelRecall(this.enemyHero); this.enemyHero.retreat = false; }
      this.refreshPracticePanel();
    }
    clearWave() { for (const m of this.minions) if (!m.practiceDummy) m.dead = true; this.feed("🧹 Minion wave cleared"); }
    setDummy(on) {
      this.minions = this.minions.filter((m) => !m.practiceDummy); this.dummy = null;
      if (!on) return;
      const home = { x: W / 2, y: LANE_Y - 120 };   // above the duel line so it never blocks skill shots or sits under the touch buttons
      this.dummy = { kind: "minion", variant: "dummy", practiceDummy: true, team: 1, x: home.x, y: home.y, home, r: 26, hp: 1e9, maxhp: 1e9, armor: 1e-9, mres: 1e-9,   /* ~0: damage() treats a literal 0 as "unset" (|| 15) */
        atkCd: 0, speed: 0, range: 0, dmg: 0, stunT: 0, rootT: 0, slowT: 0, burnStacks: 0, burnT: 0, hitFlash: 0, dead: false };
      this.minions.push(this.dummy);
    }
    zeroCds(h) {
      h.cds = [0, 0, 0]; h.regenCd = 0;
      if (h.def.id === "lumi") { h.windStepCharges = 2; h.windStepRecharge = []; }
    }
    practiceReset() {
      for (const h of this.heroes) {
        h.dead = false; h.killProcessed = false; h.respawn = 0; h.dmgLog = []; h.hp = h.maxhp; h.mana = h.maxMana; h.shield = 0; h.shieldT = 0;
        h.x = h.spawn.x; h.y = h.spawn.y; h.dash = null; h.whirl = null; h.chan = null; h.recallT = 0; h.regenT = 0;
        h.stunT = h.rootT = h.slowT = h.noDashT = 0; h.burnStacks = 0; h.burnT = 0; h.markT = 0; h.atkCd = 0; h.shockT = 0; h.airUntil = 0;
        this.zeroCds(h); this.ring(h.x, h.y, 70, "#80d8ff");
      }
      this.projs = []; this.hazards = []; this.slides = [];
      this.refreshPracticePanel();
    }
    practiceTick() {
      const pr = this.practice, d = this.dummy;
      this.player.gold = 9999;
      if (pr.noCdMe) this.zeroCds(this.player);
      if (pr.noCdEnemy) this.zeroCds(this.enemyHero);
      if (d) { d.x = d.home.x; d.y = d.home.y; d.hp = d.maxhp; d.dead = false; }
    }
    /* Damage meter: counts the player's hits on the enemy hero and the damage bot. A "session" ends after 4s without a hit; DPS = session damage / session length (min 1s). */
    meterReset() { this.meter = { total: 0, last: 0, best: 0, start: -1, end: -99, sdmg: 0 }; }
    meterHit(amt) {
      const m = this.meter, t = this.time;
      if (m.start < 0 || t - m.end > 4) { m.start = t; m.sdmg = 0; }
      m.sdmg += amt; m.end = t; m.total += amt; m.last = amt; if (amt > m.best) m.best = amt;
    }
    meterDps() { const m = this.meter; return m.start < 0 ? 0 : Math.round(m.sdmg / Math.max(1, m.end - m.start)); }
    refreshPracticePanel() {
      const pr = this.practice; if (!pr) return;
      $("prLvMe").textContent = this.player.lv; $("prLvEn").textContent = this.enemyHero.lv;
      const map = { freeze: "freezeEnemy", "nocd-me": "noCdMe", "nocd-en": "noCdEnemy", "no-mana": "noManaCost", minions: "minions", dummy: "dummy" };
      $("prPanel").querySelectorAll("[data-pr]").forEach((b) => {
        const k = map[b.dataset.pr]; if (!k) return;
        b.classList.toggle("on", !!pr[k]); const em = b.querySelector("em"); if (em) em.textContent = pr[k] ? "ON" : "OFF";
      });
    }
    practiceHud() {
      const m = this.meter, key = this.meterDps() + "|" + m.total + "|" + m.last + "|" + m.best;
      if (key === this._meterKey) return; this._meterKey = key;
      const f = (n) => Math.round(n).toLocaleString("en-US");
      $("prDps").textContent = f(this.meterDps()); $("prTotal").textContent = f(m.total); $("prLast").textContent = f(m.last); $("prBest").textContent = f(m.best);
    }

    /* ---------- v4.5 Phase 2: top-center hero portraits with respawn countdowns ---------- */
    buildPortraits() {
      const tc = $("topCenter"); if (tc.style && tc.style.setProperty) tc.style.setProperty("--n", this.mode);
      this.ptRecs = [];
      [0, 1].forEach((t) => {
        const box = $(t ? "ptRed" : "ptBlue"); box.innerHTML = "";
        this.heroes.filter((h) => h.team === t).forEach((h) => {
          const el = document.createElement("div"), art = document.createElement("i"), cd = document.createElement("span");
          el.className = "pt t" + t + (h.isPlayer ? " me" : ""); art.className = "pt-art"; cd.className = "pt-cd";
          if (h.def.img) { art.className = "pt-art img"; HeroArt.paint(art, h.def); } else art.textContent = h.def.emoji;
          el.title = h.def.name; el.appendChild(art); el.appendChild(cd); box.appendChild(el);
          this.ptRecs.push({ h, el, cd, dead: false, n: 0, txt: "" });
        });
      });
    }
    updatePortraits() {
      for (const r of this.ptRecs) {
        const h = r.h, dead = !!h.dead, n = dead && !this.over ? Math.max(1, Math.ceil(h.respawn)) : 0;
        if (dead !== r.dead) { r.dead = dead; r.el.classList.toggle("dead", dead); }
        if (n !== r.n) { r.n = n; r.txt = n ? String(n) : ""; r.cd.textContent = r.txt; r.el.classList.toggle("soon", n > 0 && n <= 3); }
      }
    }

    makeHero(def, team, idx, isPlayer, name) {
      preloadSprites(def);
      const dir = team ? -1 : 1, base = team ? W - BASE_X : BASE_X, spread = (idx - (this.mode - 1) / 2) * 56;
      const h = {
        kind: "hero", id: uid++, def, team, name, isPlayer, r: 25, spr: def.sprites ? { st: "idle", t: 0 } : null, sprDir: dir, moveT: 0,
        inventory: window.RCEquipment ? window.RCEquipment.createInventory() : null, quickBuyItemId: null, priorityQueue: [], autoBuyEnabled: false, autoBuyT: 0, battleSpell: null,
        mana: null, maxMana: 0, manaRegen: 0,
        warbringerStacks: 0, warbringerT: 0, stormfangCount: 0, deadeyeCd: 0, deadeyeT: 0, deadeyeSpeedBonus: 0, bloodReaverCd: 0, chronomancerCd: 0, soulwellCd: 0, soulwellCastHistory: [], castSequence: 0, currentCastId: 0, phoenixSigilCd: 0, ruptureStacks: 0, ruptureT: 0, echoCd: 0, echoPend: null,
        x: base - dir * 85, y: clamp(LANE_Y + spread, LANE_TOP + 30, LANE_BOT - 20),
        lv: 1, xp: 0, xpNext: 120, sp: 1, skillLv: [0, 0, 0],
        gold: 50, goldEarned: 50, cs: 0, heroDmg: 0, dmgTaken: 0, healing: 0, twrKill: 0,
        hp: def.hp, maxhp: def.hp, atk: def.atk, armor: def.armor || 18, mres: def.mres || 18,
        speed: def.speed, aspd: def.aspd, skillPow: 1, shield: 0, shieldT: 0,
        atkCd: 0, combo: 0, comboT: 0, swingT: 0, cds: [0, 0, 0], windStepCharges: def.id === "lumi" ? 2 : 0, windStepRecharge: [],
        dead: false, respawn: 0, k: 0, d: 0, a: 0, spree: 0, multi: 0, multiT: 0,
        face: { x: dir, y: 0 }, slowT: 0, stunT: 0, rootT: 0, noDashT: 0,
        inBush: false, bushHealT: 0, revealT: 0, hitFlash: 0, dash: null,
        recallT: 0, regenCd: 0, regenT: 0, regenTick: 0,
        dmgLog: [], lastDmgSrc: null, dmgFromTower: 0, dmgFromMinion: 0, killProcessed: false, lastDeath: null, bountyGold: 0, turretAggroT: 0, burnStacks: 0, burnT: 0, burnSrc: null,
        arcaneCount: 0, arcaneEmp: false, resolveStacks: 0, shockT: 0, airUntil: 0, dmgRed: 0, dmgRedT: 0, auraRed: 0, auraRedT: 0, auraSlowT: 0,
        markT: 0, precCount: 0, aspdBuff: 0, aspdBuffT: 0, staticStacks: 0, staticT: 0,
        fury: 0, furyT: 0, whirl: null, berserkT: 0, berserkHp: 0, phoenixT: 0, phoenixTick: 0, gravBoostT: 0,
        aiT: Math.random() * 0.4, aiCastCd: 0, aiShopCd: 15, retreat: false,
        laneY: clamp(LANE_Y + rand(-115, 115), LANE_TOP + 45, LANE_BOT - 35),
      };
      h.spawn = { x: h.x, y: h.y };
      this.recalcHeroStats(h);
      return h;
    }

    /* ---------- SKILL UNLOCK RULES & LEVELING ---------- */
    skillMinLv(h, i) { const s = h.def.skills[i]; return (s && s.minLv) || (i === 2 ? 4 : 1); }
    skillMaxRank(i) { return i === 2 ? 3 : 5; }
    canUpgradeSkill(h, i) {
      if (!h || h.sp <= 0 || h.dead) return false;
      const rk = h.skillLv[i] || 0;
      if (rk >= this.skillMaxRank(i) || h.lv < this.skillMinLv(h, i)) return false;
      if (i < 2) {
        if (rk >= 1 && h.lv < 2) return false;
        const other = 1 - i;
        if (rk >= 1 && (h.skillLv[other] || 0) === 0 && h.lv >= this.skillMinLv(h, other)) return false;
        if (rk >= Math.ceil((h.lv + 1) / 2) && h.lv < 8) return false;
      }
      if (i === 2 && rk >= Math.floor(h.lv / 4)) return false;
      return true;
    }
    upgradeSkill(h, i, quiet) {
      if (!this.canUpgradeSkill(h, i)) return false;
      h.sp--; h.skillLv[i]++;
      if (quiet) return true;
      this.ring(h.x, h.y, 58, h.def.color); this.burst(h.x, h.y - 16, h.def.color, 10, 120);
      this.text(h.x, h.y - 60, `${h.def.skills[i].name} Lv.${h.skillLv[i]}`, "#80d8ff");
      if (h.isPlayer) Sound.sfx("level");
      return true;
    }
    addGold(h, amt) { if (this.practice) return; h.gold += amt; h.goldEarned += amt; }
    healUnit(src, target, amt) {
      if (!target || target.dead || amt <= 0) return 0;
      const before = target.hp; target.hp = Math.min(target.maxhp, target.hp + amt);
      const gained = Math.round(target.hp - before);
      if (src && src.kind === "hero") src.healing += gained;
      return gained;
    }
    grantXp(h, amt, force) {
      if (!h || h.dead || h.lv >= MAX_LV) return;
      if (this.practice && !force) return;           // practice: levels are set by hand, never earned
      let maxOppLv = 1;
      for (const o of this.heroes) if (o.team !== h.team && o.lv > maxOppLv) maxOppLv = o.lv;
      if (!force && h.lv <= maxOppLv - 2) amt *= 1.4;
      h.xp += amt;
      while (h.xp >= h.xpNext && h.lv < MAX_LV) {
        const prevLv = h.lv; h.xp -= h.xpNext; h.lv++;
        h.xpNext = 120 + h.lv * 28; h.sp++;
        const oldMax = h.maxhp; this.recalcHeroStats(h);
        h.hp = Math.min(h.maxhp, h.hp + (h.maxhp - oldMax) + 40);
        this.ring(h.x, h.y, 68, "#ffd54f");
        if ((h.def.id === "felix" || h.def.id === "ophelia") && prevLv < 4 && h.lv >= 4) this.text(h.x, h.y - 86, "Lv.4 PASSIVE + ULT UNLOCKED!", "#4dd0e1");
        else if (prevLv < 4 && h.lv >= 4) this.text(h.x, h.y - 84, "ULTIMATE UNLOCKED!", "#ffca28");
        this.text(h.x, h.y - 66, "LEVEL " + h.lv + "!", "#ffd54f");
        if (h.isPlayer) Sound.sfx("level"); else this.aiSpendUpgrades(h);
      }
    }
    hasItemPassive(h, passiveId) {
      if (!h || !h.inventory || !window.RCEquipment) return false;
      return window.RCEquipment.aggregateStats(h.inventory).uniquePassives.some(p => p.id === passiveId);
    }
    recalcHeroStats(h) {
      const hpGrowth = { Tank: 150, Fighter: 115, "Tank Support": 120, Assassin: 90, Marksman: 85, Mage: 80, "Control Mage": 85 };
      const atkGrowth = { Marksman: 4.2, Assassin: 4.0, Fighter: 3.5, Mage: 2.8, "Control Mage": 2.7, "Tank Support": 2.5, Tank: 2.3 };
      const lv = Math.max(1, h.lv || 1), role = h.def.role;
      const spdMul = 1 + (lv - 1) * 0.012;
      const lv4Spd = h.def.id === "ophelia" && lv >= 4 ? 1.14 : h.def.id === "felix" && lv >= 4 ? (h.gravBoostT > 0 ? 1.18 : 1.12) : 1;
      const itemStats = h.inventory && window.RCEquipment
        ? window.RCEquipment.aggregateStats(h.inventory).stats : {};
      h.itemStats = itemStats;
      const manaCfg = MANA_ROLE[role] || MANA_ROLE.Mage;
      const baseMaxMana = Math.round(manaCfg.start + (lv - 1) * (manaCfg.end - manaCfg.start) / 14);
      h.maxMana = baseMaxMana + (itemStats.maxMana || 0);
      h.manaRegen = manaCfg.regen + (lv - 1) * 0.1 + (itemStats.manaRegen || 0);
      if (h.mana === null || h.mana === undefined) h.mana = h.maxMana;
      else h.mana = Math.min(h.mana, h.maxMana);
      h.maxhp = Math.round(h.def.hp + (lv - 1) * (hpGrowth[role] || 80) + (h.berserkHp || 0) + (itemStats.maxHp || 0));
      h.atk = Math.round((h.def.atk + (lv - 1) * (atkGrowth[role] || 2.8) + (itemStats.physicalAttack || 0) + (this.hasItemPassive(h, "warbringer-momentum") ? (h.warbringerStacks || 0) * 4 : 0)) * (h.berserkT > 0 ? 1.2 : 1));
      h.armor = Math.round((h.def.armor || 18) + (lv - 1) * 2.0 + (itemStats.physicalDefense || 0));
      h.mres = Math.round((h.def.mres || 18) + (lv - 1) * 1.5 + (itemStats.magicDefense || 0));
      h.speed = Math.round(h.def.speed * HERO_SPEED_SCALE * spdMul * lv4Spd * (h.whirl ? 0.82 : 1) + (itemStats.movementSpeed || 0) * MS_UNIT) + (h.deadeyeSpeedBonus || 0) * MS_UNIT;
      h.aspd = h.def.aspd * (1 + (h.aspdBuffT > 0 ? h.aspdBuff : 0)) * (1 + (itemStats.attackSpeedPct || 0) / 100);
      h.skillPow = 1; // Stage 0A: HP Scroll grants HP only; it never increases skill damage.
    }
    skillStats(h, i) {
      const s = h.def.skills[i], rk = Math.max(1, h.skillLv[i] || 1);
      const normalRank = [1.00, 1.10, 1.20, 1.30, 1.40];
      const ultimateRank = [1.00, 1.12, 1.24];
      const rankPow = i === 2 ? ultimateRank[Math.min(2, rk - 1)] : normalRank[Math.min(4, rk - 1)];
      const pow = rankPow, area = 1 + (rk - 1) * 0.05, cdMul = Math.max(0.78, 1 - (rk - 1) * 0.055);
      const flatCdr = h.itemStats ? (h.itemStats.cooldownReductionSeconds || 0) : 0;
      const magicPower = h.itemStats ? (h.itemStats.magicPower || 0) : 0;
      const damageBase = s.damageBase !== undefined ? s.damageBase : (s.dmg || 0);
      const rawSkillDamage = damageBase + (h.atk || 0) * (s.paRatio || 0) + magicPower * (s.mpRatio || 0);
      const arrowRawDamage = (s.arrowDamageBase !== undefined ? s.arrowDamageBase : (s.arrowDmg || 0))
        + (h.atk || 0) * (s.arrowPaRatio || 0) + magicPower * (s.arrowMpRatio || 0);
      const baseCd = s.cdRanks ? s.cdRanks[Math.min(s.cdRanks.length - 1, rk - 1)] : s.cd * cdMul;
      return {
        pow, mp: magicPower,
        cd: Math.max(0, +(baseCd - flatCdr).toFixed(1)), dmg: rawSkillDamage ? Math.round(rawSkillDamage * pow) : 0,
        arrowDmg: arrowRawDamage ? Math.round(arrowRawDamage * pow) : 0, amount: s.amount ? Math.round(s.amount * pow) : 0,
        radius: s.radius ? Math.round(s.radius * area) : 0, dist: s.dist ? Math.round(s.dist * (1 + (rk - 1) * 0.04)) : 0,
        range: s.range ? Math.round(s.range * area) : 0, r: s.r ? Math.round(s.r * (1 + (rk - 1) * 0.04)) : 0,
        width: s.width ? Math.round(s.width * area) : 0, stun: s.stun || 0, root: s.root || 0,
      };
    }
    addShield(h, amt, dur) {
      if (!h || h.dead || amt <= 0) return;
      const cap = Math.round(h.maxhp * 0.45);
      h.shield = Math.min(cap, Math.max(h.shield, amt) + Math.min(h.shield, amt) * 0.25);
      h.shieldT = Math.max(h.shieldT, dur);
    }

    /* ---------- 5s RECALL, REGEN SPELL & MLBB QUICK PINGS ---------- */
    fountainPos(team) { return { x: this.bases[team].x - (team ? -1 : 1) * FOUNT_OFF, y: LANE_Y }; }
    inFountain(h) { const f = this.fountainPos(h.team), dx = (h.x - f.x) / FOUNT_RX, dy = (h.y - f.y) / FOUNT_RY; return dx * dx + dy * dy <= 1; }
    startRecall(h) {
      if (!h || h.dead || this.prepT > 0 || h.stunT > 0 || h.rootT > 0 || h.dash || h.chan || h.recallT > 0 || this.over) return false;
      if (this.inFountain(h)) return false;
      h.recallT = RECALL_DUR;
      if (h.isPlayer) Sound.sfx("recall");
      return true;
    }
    cancelRecall(h) { if (h.recallT > 0) h.recallT = 0; }
    completeRecall(h) {
      h.recallT = 0; this.ring(h.x, h.y, 65, "#4dd0e1");
      h.x = h.spawn.x; h.y = h.spawn.y; h.face = { x: h.team ? -1 : 1, y: 0 };
      const gained = this.healUnit(h, h, Math.round(h.maxhp * 0.25));
      this.ring(h.x, h.y, 75, "#80cbc4"); this.burst(h.x, h.y - 16, "#80cbc4", 12, 130);
      this.text(h.x, h.y - 55, "RECALLED +" + gained, "#80cbc4");
      h.retreat = !h.isPlayer && (h.hp < h.maxhp * 0.96 || h.mana < h.maxMana * 0.8);   // v6.7: a recalled bot stays on the pad until it is topped up
      if (h.isPlayer) Sound.sfx("level");
    }
    startRegen(h) {
      if (!h || h.dead || this.prepT > 0 || h.regenCd > 0 || (h.hp >= h.maxhp * 0.99 && h.mana >= h.maxMana * 0.99) || this.over) return false;
      h.regenCd = REGEN_CD;
      h.regenT = 4.0;
      h.regenTick = 0.05;
      this.ring(h.x, h.y, 55, "#66bb6a");
      this.burst(h.x, h.y - 14, "#81c784", 8, 100, "💚");
      if (h.isPlayer) Sound.sfx("regen");
      return true;
    }
    sendPing(cmd) {
      const p = this.player;
      if (["ATTACK", "FALLBACK", "BACKUP", "DEFEND", "PUSH"].includes(cmd)) {
        this.teamOrder = cmd === "PUSH" ? "ATTACK" : cmd;
        this.orderT = 8.0;
      }
      const tx = cmd === "DEFEND" ? this.bases[0].x + 220 : cmd === "FALLBACK" ? Math.max(250, p.x - 300) : p.x;
      this.ping = { cmd, x: tx, y: p.y, t: 5.0 };
      const labels = {
        ATTACK: "⚔️ Attack!", FALLBACK: "🛡️ Retreat!", BACKUP: "🤝 Gather / Request Backup!",
        DEFEND: "🏰 Defend the Base!", MISSING: "👁️ Enemy Missing!", PUSH: "🔥 Push the Lane!", WP: "👍 Well Played!",
      };
      this.feed("You: " + (labels[cmd] || cmd));
      Sound.sfx("ping");
      Sound.announce({ ATTACK: "cmd_attack", FALLBACK: "cmd_retreat", BACKUP: "cmd_backup", DEFEND: "cmd_defend", MISSING: "cmd_missing", PUSH: "cmd_push", WP: "cmd_wp" }[cmd]);
      $("chatDrawer").classList.add("hidden");
    }

    /* ---------- VISION & HELPERS ---------- */
    isHiddenFrom(u, team) {
      if (u.kind !== "hero" || u.team === team) return false;
      if (!u.inBush || u.revealT > 0) return false;
      for (const a of this.heroes) if (a.team === team && !a.dead && dist(a, u) < 150) return false;
      return true;
    }
    targetable(u) { return !u.dead && (!u.req || u.req.dead); }
    enemiesOf(team, includeHidden) {
      const r = [];
      for (const h of this.heroes) if (h.team !== team && !h.dead && (includeHidden || !this.isHiddenFrom(h, team))) r.push(h);
      for (const m of this.minions) if (m.team !== team && !m.dead) r.push(m);
      for (const s of this.structs) if (s.team !== team && this.targetable(s)) r.push(s);
      return r;
    }
    reachOf(e) { return e.kind === "tower" || e.kind === "base" ? e.r * 0.35 : e.r; }
    nearest(from, list, range) {
      let best = null, bd = 1e9;
      for (const e of list) { const d = dist(from, e) - this.reachOf(e); if (d <= range && d < bd) { bd = d; best = e; } }
      return best;
    }
    nearestTarget(h, range) {
      const en = this.enemiesOf(h.team);
      const lowHero = en.filter((e) => e.kind === "hero" && dist(h, e) - e.r <= range).sort((a, b) => a.hp / a.maxhp - b.hp / b.maxhp)[0];
      return lowHero || this.nearest(h, en, range);
    }
    aimDir(h, range) {
      const t = this.nearestTarget(h, range);
      if (!t) return { x: h.face.x, y: h.face.y };
      let tx = t.x, ty = t.y;
      if (t.kind === "hero" && t.lastVx !== undefined) { tx += t.lastVx * 0.08; ty += t.lastVy * 0.08; }
      return norm(tx - h.x, ty - h.y);
    }
    aimPoint(h, range, dirOverride) {
      if (dirOverride && dirOverride.frac) {
        const r = range * clamp(dirOverride.frac, 0.25, 1);
        return { x: clamp(h.x + dirOverride.x * r, 60, W - 60), y: clamp(h.y + dirOverride.y * r * 0.65, LANE_TOP + 26, LANE_BOT - 18) };
      }
      const t = this.nearestTarget(h, range);
      if (t) return { x: clamp(t.x, 60, W - 60), y: clamp(t.y, LANE_TOP + 26, LANE_BOT - 18) };
      return { x: clamp(h.x + h.face.x * Math.min(260, range * 0.6), 60, W - 60), y: clamp(h.y + h.face.y * 120, LANE_TOP + 26, LANE_BOT - 18) };
    }
    cc(e, o, src) {
      const tenacity = e.kind === "hero" && e.itemStats ? (e.itemStats.ccDurationReductionPct || 0) : 0;
      const durationFactor = Math.max(0, 1 - tenacity / 100);
      const applied = { ...o,
        stun: o.stun ? o.stun * durationFactor : 0,
        root: o.root ? o.root * durationFactor : 0,
        slow: o.slow ? (typeof o.slow === "number" ? o.slow : 2.0) * durationFactor : 0,
        noDash: o.noDash ? o.noDash * durationFactor : 0,
      };
      if (src) this.recordCC(src, e, applied);
      if (applied.stun) e.stunT = Math.max(e.stunT || 0, applied.stun);
      if (applied.root) e.rootT = Math.max(e.rootT || 0, applied.root);
      if (applied.slow) e.slowT = Math.max(e.slowT || 0, applied.slow);
      if (applied.noDash) e.noDashT = Math.max(e.noDashT || 0, applied.noDash);
      if (o.reveal && e.kind === "hero") e.revealT = Math.max(e.revealT, o.reveal);
    }
    burst(x, y, color, count = 8, speed = 130, glyph = null) {
      if (lowGfx) count = Math.ceil(count * 0.35);
      for (let i = 0; i < count; i++) {
        const a = rand(0, 6.283), sp = rand(speed * 0.4, speed);
        this.particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - rand(10, 40), r: rand(3, 6), color, glyph, t: rand(0.3, 0.55), max: 0.55 });
      }
    }
    text(x, y, text, color) { this.fx.push({ type: "text", x, y, text, color, t: 0.85, max: 0.85 }); }
    ring(x, y, r, color) { this.fx.push({ type: "ring", x, y, r, color, t: 0.38, max: 0.38 }); }
    slash(x, y, angle, r, color, big) { this.fx.push({ type: "slash", x, y, angle, r, color, big, t: 0.22, max: 0.22 }); }
    boltFx(pts, color) { this.fx.push({ type: "bolt", pts, color, t: 0.24, max: 0.24 }); }
    feed(msg) {
      const d = document.createElement("div"); d.textContent = msg; $("feed").appendChild(d);
      setTimeout(() => d.remove(), 4000);
      while ($("feed").children.length > 5) $("feed").firstChild.remove();
    }
    /* v5.9: big centre banner when every hero of a team is dead at once (3v3 / 5v5 only). */
    checkWipe(team) {
      if (this.practice || this.mode < 2 || this.over) return;
      const side = this.heroes.filter((h) => h.team === team);
      if (!side.length || !side.every((h) => h.dead)) return;
      const mine = team === 0, el = $("wipeBanner");
      el.className = "hidden"; void el.offsetWidth;                                 // restart the pop animation if it fires twice
      el.innerHTML = `<small>${mine ? "YOUR TEAM" : "ENEMY TEAM"}</small>WIPED OUT`;
      el.className = mine ? "ally" : "enemy";
      this.wipeT = 3.2;
    }
    announceKill(title, killer, victim, color = "#ffd54f") {
      const el = $("killBanner");
      const kE = killer ? killer.def.emoji : "🏰", kN = killer ? killer.name : "Turret";
      el.innerHTML = `<span>${kE} ${kN}</span> <b style="color:${color}">${title}</b> <span>${victim.def.emoji} ${victim.name}</span>`;
      el.classList.remove("hidden");
      this.bannerT = 2.6;
    }

    /* ---------- COMBAT & TURRETS ---------- */
    applyBurn(src, t, stacks = 1) {
      if (t.dead || t.kind === "base" || t.kind === "tower") return;
      t.burnStacks = (t.burnStacks || 0) + stacks; t.burnT = 3.0; t.burnSrc = src;
      if (t.burnStacks >= 3) {
        t.burnStacks = 0; const burst = t.kind === "hero" ? Math.round(t.maxhp * 0.06) : 95;
        this.damage(src, t, burst, true, "magic", "dot"); this.burst(t.x, t.y - 16, "#ff7043", 8, 130, "🔥");
      }
    }
    applyStatic(src, t, stacks = 1) {
      if (t.dead || t.kind !== "hero") return;
      t.staticStacks = (t.staticStacks || 0) + stacks; t.staticT = 4.0;
      if (t.staticStacks >= 3) {
        t.staticStacks = 0; this.damage(src, t, 100, true, "magic");   // v6.7: 75 -> 100 (burst mage)
        this.boltFx([{ x: t.x, y: t.y - 130 }, { x: t.x + 12, y: t.y - 70 }, { x: t.x, y: t.y - 14 }], "#ffee58");
      }
    }
    /* v6.2 Echo Scepter: the echo of a damaging skill cast. Heroes + minions in range, magic, no crit, tag "item-passive" (so Soulwell / Void Catalyst do not retrigger). */
    fireEcho(h) {
      if (h.dead || !this.hasItemPassive(h, "echo-scepter-resonance")) return;
      const RAD = 280, mp = (h.itemStats && h.itemStats.magicPower) || 0, amt = Math.round(80 + 0.45 * mp);
      this.ring(h.x, h.y, RAD * 0.6, "#b388ff");
      for (const e of this.enemiesOf(h.team)) {
        if ((e.kind === "hero" || e.kind === "minion") && dist(h, e) - e.r <= RAD) this.damage(h, e, amt, false, "magic", "item-passive");
      }
    }
    damage(src, t, amt, crit, dmgType = "phys", tag = "direct", castId) {
      if (t.dead || t.hp <= 0 || !amt || this.prepT > 0) return;
      if (this.practice && (t.kind === "tower" || t.kind === "base")) return;   // practice: structures are invulnerable
      if (src && src.kind === "hero" && src.def.id === "vex" && t.markT > 0) {
        t.markT = 0; amt = Math.round(amt * 1.3); crit = true;
      }
      // Stage 0C: only eligible basic attacks can crit; abilities, item procs, minion and tower hits cannot.
      if (tag !== "basic") crit = false;
      if (tag === "basic" && src && src.kind === "hero" && (t.kind === "hero" || t.kind === "minion")) {
        const chancePct = clamp(src.itemStats ? (src.itemStats.critChancePct || 0) : 0, 0, 75);
        crit = Math.random() < chancePct / 100;
        if (crit) amt *= 2.0;
      }
      if (tag === "basic" && dmgType === "phys" && src && src.kind === "hero" && t.kind === "hero" && this.hasItemPassive(src, "titan-piercer-giant-slayer")) {
        const targetDef = Math.max(0, t.armor || 0);
        amt *= targetDef >= 180 ? 1.08 : targetDef >= 100 ? 1.05 : 1;
      }
      if (tag === "skill" && dmgType === "magic" && src && src.kind === "hero" && t.kind === "hero" && this.hasItemPassive(src, "void-catalyst-void-exposure")) {
        const targetDef = Math.max(0, t.mres || 0);
        amt *= targetDef >= 180 ? 1.08 : targetDef >= 100 ? 1.05 : 1;
      }
      let mult = 1;
      if (dmgType !== "true") {
        const rawDef = dmgType === "magic" ? (t.mres || 15) : (t.armor || 15);
        const rupture = dmgType === "phys" && t.kind === "hero" ? (t.ruptureStacks || 0) * 3 : 0;
        const pen = src && src.kind === "hero" && src.itemStats
          ? (dmgType === "magic" ? (src.itemStats.magicPenFlat || 0) : (src.itemStats.physicalPenFlat || 0)) : 0;
        const defStat = Math.max(0, rawDef - rupture - pen);
        mult *= 100 / (100 + defStat);
      }
      if (t.kind === "hero" && t.dmgRedT > 0) mult *= 1 - t.dmgRed;
      if (t.kind === "hero" && t.auraRedT > 0) mult *= 1 - t.auraRed;   // v6.9: King's Protection aura, stacks separately from Unbreakable
      if (t.kind === "hero" && t.chan && t.chan.dr) mult *= 1 - t.chan.dr;   // v6.3: Astral Symphony channel damage reduction
      if (t.kind === "hero" && dmgType === "phys" && this.hasItemPassive(t, "duskveil-umbral-protection")) mult *= 0.92;
      const finalAmt = Math.max(1, Math.round(amt * mult));

      if (t.kind === "hero" && t.def.id === "rex" && t.resolveStacks < 5) t.resolveStacks++;
      if (src && src.kind === "hero" && t.kind === "hero") {
        src.heroDmg += finalAmt;
        if (this.structs.some((s) => !s.dead && s.team === t.team && dist(src, s) <= s.range + 40)) src.turretAggroT = 3.0;
      }
      if (t.kind === "hero") t.dmgTaken += finalAmt;
      if (this.practice && src && src.isPlayer && (t.kind === "hero" || t.practiceDummy)) this.meterHit(finalAmt);

      let realDmg = finalAmt;
      if (t.kind === "hero" && t.shield > 0) {
        const ab = Math.min(t.shield, realDmg); t.shield -= ab; realDmg -= ab;
      }
      if (t.kind === "hero" && realDmg >= t.hp && (t.phoenixSigilCd || 0) <= 0 && this.hasItemPassive(t, "phoenix-sigil-rebirth")) {
        realDmg = Math.max(0, t.hp - 1);
        t.phoenixSigilCd = 180;
        this.text(t.x, t.y - 72, "PHOENIX SIGIL!", "#ffab40");
        this.ring(t.x, t.y, 70, "#ff7043");
      }
      t.hp -= realDmg; t.hitFlash = 0.12; t.lastHit = this.time;
      if (t.kind === "tower" && t.team === 0 && src && src.kind === "hero") Sound.announce("turret_under_attack");   // v5.2
      if (t.kind === "hero" && t.inBush) t.revealT = Math.max(t.revealT, 2.0);
      if (t.kind === "hero" && finalAmt > 0 && src && src.team !== t.team) {
        this.cancelRecall(t);
        if ((src.kind === "hero" || src.kind === "tower" || src.kind === "base") && t.regenT > 0) t.regenT = 0;
      }

      if (t.kind === "hero" || t.kind === "tower" || (src && src.kind === "hero" && src.isPlayer)) {
        const col = crit ? "#ffca28" : dmgType === "magic" ? "#80d8ff" : "#fff176";
        this.text(t.x + rand(-14, 14), t.y - t.r - 22, finalAmt + (crit ? "!" : ""), col);
      }
      if (t.kind === "hero") this.recordDamage(src, t, finalAmt, tag);
      const skillCastId = castId !== undefined && castId !== null ? castId : (src && src.currentCastId);
      if (src && src.kind === "hero" && t.kind === "hero" && src.team !== t.team && tag === "skill" && this.hasItemPassive(src, "soulwell-soul-drain") && (src.soulwellCd || 0) <= 0 && skillCastId !== undefined && skillCastId !== null && !(src.soulwellCastHistory || []).includes(skillCastId)) {
        const recovered = Math.round(src.maxMana * 0.03);
        src.mana = Math.min(src.maxMana, src.mana + recovered); src.soulwellCd = 3;
        src.soulwellCastHistory = [...(src.soulwellCastHistory || []), skillCastId].slice(-24);
        if (recovered > 0) this.text(src.x, src.y - 78, `+${recovered} MANA`, "#64b5f6");
      }
      if (src && src.kind === "hero" && t.kind === "hero" && src.team !== t.team && tag === "basic") {
        if (this.hasItemPassive(src, "warbringer-momentum")) {
          src.warbringerStacks = Math.min(5, (src.warbringerStacks || 0) + 1); src.warbringerT = 3;
          this.recalcHeroStats(src);
        }
        if (t.hp > 0 && this.hasItemPassive(src, "ruinous-crossbow-rupture")) {
          t.ruptureStacks = Math.min(4, (t.ruptureStacks || 0) + 1); t.ruptureT = 3;
        }
        if (this.hasItemPassive(src, "stormfang-lightning-strike")) {
          src.stormfangCount = ((src.stormfangCount || 0) + 1) % 5;
          if (src.stormfangCount === 0 && t.hp > 0) this.damage(src, t, 40, false, "magic", "item-passive");
        }
        if (crit && this.hasItemPassive(src, "deadeye-quickstep") && (src.deadeyeCd || 0) <= 0) {
          src.deadeyeCd = 4; src.deadeyeT = 2; src.deadeyeSpeedBonus = 0.2; this.recalcHeroStats(src);
        }
      }
      if (src && src.kind === "hero" && (src.isPlayer || t.isPlayer)) Sound.sfx("hit");
      if (t.hp <= 0) this.kill(src, t);
    }
    /* ---------- v4.5 KILL ATTRIBUTION ---------- */
    // Record who hurt a hero. Hero damage goes in the timestamped contribution ledger (t.dmgLog);
    // turret / minion damage is tracked separately and can never earn kill credit.
    recordDamage(src, t, amt, tag) {
      if (!src || amt <= 0) return;
      t.lastDmgSrc = { kind: src.kind, id: src.id, name: src.name || src.tier || src.kind, time: this.time };
      if (src.kind === "hero") {
        if (src.team === t.team || src === t) return;
        this.pruneLedger(t);
        t.dmgLog.push({ src, time: this.time, kind: tag === "dot" ? "dot" : "dmg", amt });
      } else if (src.kind === "tower" || src.kind === "base") t.dmgFromTower += amt;
      else if (src.kind === "minion") t.dmgFromMinion += amt;
    }
    recordCC(src, e, o) {
      if (!src || src.kind !== "hero" || !e || e.kind !== "hero" || src.team === e.team || e.dead) return;
      const slow = o.slow ? (typeof o.slow === "number" ? o.slow : 2.0) : 0;
      let dur = 0;
      if ((o.stun || 0) >= KILL_CFG.ccStunRootMin) dur = Math.max(dur, o.stun);
      if ((o.root || 0) >= KILL_CFG.ccStunRootMin) dur = Math.max(dur, o.root);
      if (slow >= KILL_CFG.ccSlowMin) dur = Math.max(dur, slow);
      if (dur <= 0) return;
      this.pruneLedger(e);
      e.dmgLog.push({ src, time: this.time, kind: "cc", dur });
    }
    pruneLedger(t) {
      const cutoff = this.time - KILL_CFG.window;
      if (t.dmgLog.length && t.dmgLog[0].time <= cutoff) t.dmgLog = t.dmgLog.filter((e) => e.time > cutoff);
    }
    // Summarise live (non-expired) contributions per enemy hero and flag the meaningful ones.
    contributors(t) {
      const cutoff = this.time - KILL_CFG.window, by = new Map();
      const need = Math.max(KILL_CFG.assistMinDmg, KILL_CFG.assistMinDmgPct * t.maxhp);
      for (const e of t.dmgLog) {
        if (e.time <= cutoff || e.src.team === t.team || e.src === t) continue;
        let c = by.get(e.src);
        if (!c) by.set(e.src, c = { hero: e.src, dmg: 0, dot: 0, cc: 0, lastDmg: -Infinity });
        if (e.kind === "cc") c.cc += e.dur;
        else { c.dmg += e.amt; if (e.kind === "dot") c.dot += e.amt; c.lastDmg = Math.max(c.lastDmg, e.time); }
      }
      const out = [];
      for (const c of by.values()) { c.damageEligible = c.dmg >= need; c.eligible = c.damageEligible || c.cc > 0; if (c.eligible) out.push(c); }
      return out;
    }
    // Decide kill credit + assists. Final damage source is reported untouched.
    resolveKill(src, t) {
      const list = this.contributors(t);
      let killer = null;
      if (src && src.kind === "hero" && src.team !== t.team) killer = src;           // normal hero-vs-hero kill
      else {                                                                       // turret / minion / base final blow
        let best = null;
        for (const c of list) if (c.damageEligible && (!best || c.lastDmg > best.lastDmg)) best = c;
        if (best) killer = best.hero;                                              // most recent eligible hero attacker (not most damage)
      }
      const assists = list.filter((c) => c.hero !== killer).map((c) => c.hero);
      return { killer, assists, finalSrc: src ? { kind: src.kind, id: src.id, name: src.name || src.tier || src.kind } : null };
    }
    bountyFor(streak) {
      let g = 0; for (const tier of KILL_CFG.bountyTiers) if (streak >= tier.min) g = tier.gold; return g;
    }

    kill(src, t) {
      if (t.kind === "hero" && t.killProcessed) return;                            // never process one death twice
      t.hp = 0; t.dead = true;
      if (t.kind === "hero") {
        t.warbringerStacks = 0; t.warbringerT = 0; t.deadeyeSpeedBonus = 0; t.deadeyeT = 0;
        t.ruptureStacks = 0; t.ruptureT = 0; t.echoPend = null; t.wavePend = null;
        this.recalcHeroStats(t);
      }
      if (t.kind === "minion") {
        if (src && src.kind === "hero") src.cs++;
        for (const h of this.heroes) {
          if (h.team !== t.team && !h.dead && dist(h, t) < 480) {
            this.grantXp(h, h === src ? 55 : 38);
            this.addGold(h, h === src ? (t.variant === "siege" ? 55 : 32) : 12);
          }
        }
      } else if (t.kind === "hero") {
        if (t.spr) t.spr = { st: "death", t: 0 };   // v7.0: sprite heroes play their death animation
        t.killProcessed = true;
        t.d++;
        t.respawn = this.practice ? 2.5 : this.respawnTime(t.lv, this.time);
        t.dash = null; t.whirl = null; t.chan = null; t.shield = 0; t.recallT = 0; t.regenT = 0;
        const wasSpree = t.spree; t.spree = 0;                                      // victim's streak ends (bounty read from wasSpree)
        const cr = this.resolveKill(src, t), killer = cr.killer;
        let killerName = "Minions", bannerTitle = "", sfxCue = "kill", bounty = 0, annCue = null, baseCue = null;   // annCue: v5.2 announcer voice line
        if (killer) {
          killerName = killer.name;
          killer.k++; this.score[killer.team]++;
          killer.spree++; killer.multi = killer.multiT > 0 ? killer.multi + 1 : 1; killer.multiT = 8.0;
          bounty = wasSpree >= KILL_CFG.shutdownMin ? this.bountyFor(wasSpree) : 0;
          this.grantXp(killer, 110 + t.lv * 14);
          this.addGold(killer, 150 + bounty + Math.max(0, Math.min(100, (t.lv - killer.lv) * 20)));
          if (this.hasItemPassive(killer, "blood-reaver-blood-harvest") && (killer.bloodReaverCd || 0) <= 0) {
            const recovered = this.healUnit(killer, killer, (killer.maxhp - killer.hp) * 0.10);
            killer.bloodReaverCd = 10;
            if (recovered > 0) this.text(killer.x, killer.y - 64, `BLOOD REAVER +${recovered}`, "#ef6c78");
          }
          if (this.hasItemPassive(killer, "chronomancers-focus-time-return") && (killer.chronomancerCd || 0) <= 0) {
            const recovered = Math.round(killer.maxMana * 0.10); killer.mana = Math.min(killer.maxMana, killer.mana + recovered); killer.chronomancerCd = 10;
            if (recovered > 0) this.text(killer.x, killer.y - 82, `+${recovered} MANA`, "#64b5f6");
          }
          killer.bountyGold += bounty;
          for (const h of cr.assists) {
            h.a++; this.grantXp(h, 55); this.addGold(h, 55);
            if (this.hasItemPassive(h, "chronomancers-focus-time-return") && (h.chronomancerCd || 0) <= 0) {
              const recovered = Math.round(h.maxMana * 0.10); h.mana = Math.min(h.maxMana, h.mana + recovered); h.chronomancerCd = 10;
              if (recovered > 0) this.text(h.x, h.y - 82, `+${recovered} MANA`, "#64b5f6");
            }
            if (this.hasItemPassive(h, "blood-reaver-blood-harvest") && (h.bloodReaverCd || 0) <= 0) {
              const recovered = this.healUnit(h, h, (h.maxhp - h.hp) * 0.10);
              h.bloodReaverCd = 10;
              if (recovered > 0) this.text(h.x, h.y - 64, `BLOOD REAVER +${recovered}`, "#ef6c78");
            }
            if (h.isPlayer) this.text(h.x, h.y - 60, "ASSIST", "#80d8ff");
          }
          if (!this.firstBlood) { this.firstBlood = true; bannerTitle = "FIRST BLOOD!"; sfxCue = "firstblood"; annCue = "first_blood"; }
          else if (killer.multi >= 5) { bannerTitle = "PENTA KILL!"; sfxCue = "pentakill"; annCue = "penta_kill"; }
          else if (killer.multi === 4) { bannerTitle = "QUADRA KILL!"; sfxCue = "quadrakill"; annCue = "quadra_kill"; }
          else if (killer.multi === 3) { bannerTitle = "TRIPLE KILL!"; sfxCue = "triplekill"; annCue = "triple_kill"; }
          else if (killer.multi === 2) { bannerTitle = "DOUBLE KILL!"; sfxCue = "doublekill"; annCue = "double_kill"; }
          else if (killer.spree >= 5) { bannerTitle = "GODLIKE!"; annCue = "godlike"; }
          else if (killer.spree >= 3) { bannerTitle = "KILLING SPREE!"; annCue = "killing_spree"; }
          else bannerTitle = "ELIMINATED";
          if (bounty > 0) {                                                         // SHUT DOWN announcement + bounty
            bannerTitle = (killer.multi >= 2 && killer.multi <= 5 ? bannerTitle.replace("!", "") + " · " : "") + `SHUT DOWN! +${bounty}g`;
            if (killer.multi < 4) { sfxCue = "shutdown"; baseCue = annCue; annCue = "shutdown"; }
            this.text(killer.x, killer.y - 76, `+${bounty}g BOUNTY`, "#ffd54f");
          }
          const allDead = this.heroes.filter((h) => h.team === t.team).every((h) => h.dead);
          if (allDead && this.mode > 1) { bannerTitle = "ACE · " + bannerTitle; sfxCue = "ace"; }
          this.announceKill(bannerTitle, killer, t, killer.team === 0 ? "#80d8ff" : "#ff8a80");
          Sound.sfx(sfxCue);
        } else if (src && (src.kind === "tower" || src.kind === "base")) {
          killerName = "Turret";
          this.announceKill("EXECUTED", null, t, "#ffab40");
        }
        // v5.2: a special kill line wins; a plain kill (or turret execution) gets the ally / enemy slain notice instead
        // a special kill line wins; otherwise "you were killed" / "you killed an enemy", otherwise the ally / enemy slain notice
        const plain = t.isPlayer ? "you_killed" : killer && killer.isPlayer ? "you_killed_enemy" : (t.team === 0 ? "ally_slain" : "enemy_slain");
        Sound.announce(Sound.annAvailable(annCue) ? annCue : (baseCue || plain));
        let line = `${killerName} ➜ ${t.name}`;
        if (killer && cr.finalSrc && cr.finalSrc.kind !== "hero") line += cr.finalSrc.kind === "minion" ? " (finished by Minions)" : " (finished by Turret)";
        if (cr.assists.length) line += ` · assist: ${cr.assists.map((h) => h.name).join(", ")}`;
        t.lastDeath = { time: this.time, finalSrc: cr.finalSrc, killerId: killer ? killer.id : null, assistIds: cr.assists.map((h) => h.id), bounty, victimStreak: wasSpree };
        t.dmgLog = [];
        this.feed(line);
        this.ring(t.x, t.y, 95, "#fff");
        this.checkWipe(t.team);
      } else if (t.kind === "tower") {
        if (src && src.kind === "hero") src.twrKill++;
        if (t.tier === "Inhibitor") { this.inhibDown[t.team] = true; this.text(t.x, t.y - 110, "INHIBITOR DESTROYED!", "#ff8a80"); this.feed(`${t.team ? "Enemy" : "Your"} Inhibitor destroyed! Super minions incoming!`); }
        else this.feed(`${t.team ? "Enemy" : "Your"} ${t.tier} tower destroyed!`);
        this.ring(t.x, t.y, 175, "#ffb74d");
        Sound.announce(t.team === 0 ? "our_turret_destroyed" : "enemy_turret_destroyed");
        for (const h of this.heroes) if (h.team !== t.team && !h.dead) { this.grantXp(h, 160); this.addGold(h, 150); }
      } else if (t.kind === "base") {
        this.ring(t.x, t.y, 260, "#ffb74d");
        this.over = true; this.winner = 1 - t.team; this.endTimer = 2.4;
        Sound.silence();   // v7.4: battle music stops the moment the match is decided
        Sound.announce(this.winner === 0 ? "victory" : "defeat");
      }
    }

    /* ---------- BASIC ATTACK & SKILLS ---------- */
    basicAttack(h, t) {
      if (h.atkCd > 0 || this.prepT > 0 || h.dead || h.chan) return;
      this.cancelRecall(h);
      if (h.inBush) h.revealT = Math.max(h.revealT, 1.5);
      const step = h.combo, isFinisher = step === 2;
      h.combo = (h.combo + 1) % 3; h.comboT = 1.05; h.swingT = 0.18;
      h.atkCd = (1 / h.aspd) * (isFinisher ? 1.12 : 0.85);
      if (t) h.face = norm(t.x - h.x, t.y - h.y);
      const ang = Math.atan2(h.face.y, h.face.x);
      let dmg = Math.round(h.atk * (isFinisher ? 1.38 : step === 1 ? 1.06 : 1)), dmgType = "phys", crit = false;

      if (h.def.id === "lumi") { h.precCount = (h.precCount + 1) % 4; if (h.precCount === 0) dmg = Math.round(dmg * 1.45); }
      let arcaneBonus = 0;
      if (h.def.id === "aria" && h.arcaneEmp) { h.arcaneEmp = false; arcaneBonus = Math.round(55 + 0.40 * ((h.itemStats && h.itemStats.magicPower) || 0)); this.text(h.x, h.y - 58, "RESONANCE!", "#ce93d8"); }

      if (h.def.range <= 150) {
        if (h.rootT <= 0) {
          h.x = clamp(h.x + h.face.x * (isFinisher ? 16 : 9), 40, W - 40);
          h.y = clamp(h.y + h.face.y * (isFinisher ? 9 : 5), LANE_TOP + 22, LANE_BOT - 10);
        }
        const reach = h.def.range + (isFinisher ? 34 : 16);
        this.slash(h.x + h.face.x * 22, h.y - 12 + h.face.y * 12, ang, reach, crit ? "#ffca28" : h.def.color, crit);
        const en = this.enemiesOf(h.team); let hitAny = false; const swingHits = [];
        for (const e of en) {
          if (dist(h, e) - this.reachOf(e) <= reach) {
            const dirTo = norm(e.x - h.x, e.y - h.y);
            if (e === t || dirTo.x * h.face.x + dirTo.y * h.face.y > (isFinisher ? -0.1 : 0.25)) {
              this.damage(h, e, dmg, crit, dmgType, "basic"); hitAny = true; swingHits.push(e);
              if (h.def.id === "blaze") this.applyBurn(h, e, 1);
              if (h.def.id === "gorn" && e.kind === "hero") { h.fury = Math.min(4, h.fury + 1); h.furyT = 12; }
              if (isFinisher && (e.kind === "hero" || e.kind === "minion")) {
                e.x = clamp(e.x + dirTo.x * 22, 40, W - 40); e.y = clamp(e.y + dirTo.y * 10, LANE_TOP + 22, LANE_BOT - 10);
              }
              if (!isFinisher) break;
            }
          }
        }
        if (hitAny && h.def.id === "rex" && h.shockT > 0) this.rexShockwave(h, swingHits);
        if (hitAny && t) { this.ring(t.x, t.y, crit ? 44 : 26, crit ? "#ffca28" : h.def.color); this.burst(t.x, t.y - 12, crit ? "#ffca28" : h.def.color, 5, 110); }
      } else {
        if (!t) return;
        const isNote = h.def.atkProj === "note";
        if (isNote && h.isPlayer) Sound.sfx("note");
        this.projs.push({
          homing: isFinisher ? null : t, kind: isNote ? "note" : "basic", x: h.x + h.face.x * 16, y: h.y - 14 + h.face.y * 8,
          vx: h.face.x * 860, vy: h.face.y * 860, speed: 820, dmg, dmgType, crit, tag: "basic", arcaneBonus, team: h.team, owner: h,
          r: crit ? 13 : 9, color: crit ? "#ffca28" : h.def.color, big: crit, pierce: isFinisher, hit: new Set(), life: isFinisher ? (h.def.range + 120) / 860 : 3,
        });
      }
    }

    // v6.4: one Astral Wave projectile (used for the first wave and any follow-up waves)
    fireWave(h, s, dir, dmg, r, dmgType, castId) {
      this.projs.push({ kind: "wave", x: h.x, y: h.y - 10, vx: dir.x * s.speed, vy: dir.y * s.speed, dmg, dmgType, tag: "skill", castId, team: h.team, owner: h, r, life: s.range / s.speed, pierce: true, hit: new Set(), slow: s.slow, reveal: s.reveal || 3.5, color: h.def.color, ang: Math.atan2(dir.y, dir.x) });
    }
    // follow-up wave: re-aims at the nearest visible enemy hero within ~40 degrees of the original line, else keeps the original line
    tickWavePend(h, dt) {
      const wp = h.wavePend; if (!wp) return;
      if (h.dead || h.stunT > 0) { h.wavePend = null; return; }   // stun / death cancels the 2nd wave
      wp.t -= dt; if (wp.t > 0) return;
      let dir = wp.dir;
      const foes = this.enemiesOf(h.team, true).filter((e) => e.kind === "hero" && !e.dead && (!e.inBush || e.revealT > 0));
      const tgt = this.nearest(h, foes, (wp.range || 720) + 60);
      if (tgt) { const d2 = norm(tgt.x - h.x, tgt.y - h.y); if (d2.x * dir.x + d2.y * dir.y >= 0.766) dir = d2; }
      h.face = dir; this.fireWave(h, wp.s, dir, wp.dmg, wp.r, wp.dmgType, wp.castId);
      this.burst(h.x, h.y - 10, h.def.color, 6, 110);
      if (--wp.left > 0) wp.t = wp.s.waveGap || 0.4; else h.wavePend = null;
    }

    castSkill(h, i, dirOverride) {
      const s = h.def.skills[i];
      if (s && h.inBush && !h.dead && (h.skillLv[i] || 0) > 0 && h.cds[i] <= 0) h.revealT = Math.max(h.revealT, 1.2);
      if (!s || h.dead || h.stunT > 0 || h.dash || h.chan || this.over) return false;
      if ((h.skillLv[i] || 0) <= 0) {
        if (h.isPlayer && this.canUpgradeSkill(h, i)) { this.upgradeSkill(h, i); return false; }
        if (h.isPlayer) { const req = this.skillMinLv(h, i); this.text(h.x, h.y - 58, h.lv < req ? `UNLOCKS AT LV.${req}` : "UNLOCK WITH +", "#ffd54f"); }
        return false;
      }
      if (this.prepT > 0 || (s.type === "windstep" ? (h.windStepCharges || 0) <= 0 : h.cds[i] > 0)) return false;
      const moveSkill = s.type === "dash" || s.type === "leap" || s.type === "windstep";
      if (moveSkill && (h.noDashT > 0 || h.rootT > 0)) {
        if (h.isPlayer) this.text(h.x, h.y - 56, h.rootT > 0 ? "ROOTED!" : "GROUNDED!", "#26c6da");
        return false;
      }
      const st = this.skillStats(h, i);
      if (s.type === "death_mark" && !this.enemiesOf(h.team).some(e => e.kind === "hero" && dist(h, e) <= st.range + e.r)) {
        if (h.isPlayer) this.text(h.x, h.y - 56, "NO HERO IN RANGE", "#fff176");
        return false;
      }
      if (s.type === "chain" && !this.nearest(h, this.enemiesOf(h.team), st.range)) {
        if (h.isPlayer) this.text(h.x, h.y - 56, "NO TARGET", "#fff176");
        return false;
      }
      const manaCost = Math.max(0, s.manaCost || 0);
      const freePractice = !!(this.practice && this.practice.noManaCost && h.isPlayer);
      if (!freePractice && h.mana + 1e-9 < manaCost) {
        if (h.isPlayer) this.text(h.x, h.y - 56, "NOT ENOUGH MANA", "#64b5f6");
        return false;
      }

      this.cancelRecall(h);
      if (h.inBush) h.revealT = Math.max(h.revealT, 1.5);
      if (!freePractice) h.mana = Math.max(0, h.mana - manaCost);
      h.castSequence = (h.castSequence || 0) + 1; h.currentCastId = h.castSequence;
      if ((h.echoCd || 0) <= 0 && (s.damageBase || s.dmg) && this.hasItemPassive(h, "echo-scepter-resonance")) { h.echoCd = 6; h.echoPend = { t: 0.35 }; }   // v6.2 Echo Scepter
      if (s.type === "windstep") { h.windStepCharges = Math.max(0, (h.windStepCharges || 0) - 1); h.windStepRecharge = h.windStepRecharge || []; h.windStepRecharge.push(s.recharge || 6); h.cds[i] = 0; }
      else h.cds[i] = st.cd;
      this.sprCast(h);   // v7.0: play the cast animation (sprite heroes only)

      if (h.def.id === "aria") { h.arcaneCount++; if (h.arcaneCount >= 2) { h.arcaneCount = 0; h.arcaneEmp = true; this.text(h.x, h.y - 58, "ARCANE CHARGED!", "#ce93d8"); } }
      if (h.def.id === "rex") h.shockT = 3.0;   // v6.8: Shockwave window (passive)
      if (h.def.id === "rex" && h.resolveStacks >= 5) { h.resolveStacks = 0; h.dmgRed = Math.max(h.dmgRed, 0.22); h.dmgRedT = Math.max(h.dmgRedT, 2.5); this.text(h.x, h.y - 58, "UNBREAKABLE!", "#ffe082"); }
      let furyEmp = false;
      if (h.def.id === "gorn" && h.fury >= 4) {
        h.fury = 0; furyEmp = true;
        const gained = this.healUnit(h, h, Math.round((h.maxhp - h.hp) * 0.08 + 40));
        this.text(h.x, h.y - 60, "BLOODLUST +" + gained, "#ff8a65");
      }

      const dmgType = s.dmgType || "magic", dmgMult = furyEmp ? 1.3 : 1;
      let dir = dirOverride && dirOverride.x !== undefined ? norm(dirOverride.x, dirOverride.y) : null;
      if (!dir) dir = moveSkill && !s.dmg ? { x: h.face.x, y: h.face.y } : this.aimDir(h, (st.range || st.dist || st.radius || 500) + 120);

      switch (s.type) {
        case "dash":
          h.face = dir;
          h.dash = { vx: (dir.x * st.dist) / 0.22, vy: (dir.y * st.dist) / 0.22, t: 0.22, dmg: Math.round(st.dmg * dmgMult), dmgType, tag: "skill", castId: h.currentCastId, stun: st.stun, knock: s.knock || 0, burn: s.burn || 0, mark: s.mark || 0, hit: new Set() };
          this.burst(h.x, h.y - 10, h.def.color, 8, 120);
          break;
        case "windstep": {
          // Movement is fully player-aimed: the dash can go forward, sideways, or backward.
          // Enemy selection is independent and only determines where the three arrows travel.
          const dashDir = dir || { x: h.face.x, y: h.face.y };
          const target = this.nearest(h, this.enemiesOf(h.team, true).filter(e => e.kind === "hero" || e.kind === "minion"), s.arrowRange || 620);
          h.face = dashDir;
          const dashDist = st.dist || 225;
          h.dash = { vx: (dashDir.x * dashDist) / 0.2, vy: (dashDir.y * dashDist) / 0.2, t: 0.2, dmg: 0, hit: new Set() };
          // Fire three consecutive homing arrows toward the nearest enemy while dashing.
          // If no enemy is in range, arrows travel along the dash direction.
          for (let n = 0; n < 3; n++) {
            const originX = h.x + dashDir.x * 18, originY = h.y - 12 + dashDir.y * 18;
            const ad = target ? norm(target.x - originX, target.y - 12 - originY) : dashDir;
            this.projs.push({ kind: "lumi_wind_arrow", homing: target || null, delay: n * 0.12, x: originX, y: originY,
              vx: ad.x * (s.arrowSpeed || 980), vy: ad.y * (s.arrowSpeed || 980), speed: s.arrowSpeed || 980,
              dmg: Math.round((st.arrowDmg || s.arrowDmg || 48) * dmgMult), dmgType: "phys", tag: "skill", castId: h.currentCastId, team: h.team, owner: h, r: 9,
              life: (s.arrowRange || 620) / (s.arrowSpeed || 980), hit: new Set(), color: "#a5d6a7", big: true,
              refundSkill: 0, refundAmount: 1 });
          }
          this.burst(h.x, h.y - 10, "#a5d6a7", 8, 110);
          break; }
        case "leap": {
          const pt = this.aimPoint(h, st.dist, dirOverride);
          h.face = norm(pt.x - h.x, pt.y - h.y);
          h.dash = { vx: (pt.x - h.x) / 0.26, vy: (pt.y - h.y) / 0.26, t: 0.26, dmg: 0, onEnd: { radius: st.radius, dmg: Math.round(st.dmg * dmgMult), dmgType, tag: "skill", castId: h.currentCastId, color: h.def.color }, hit: new Set() };
          break;
        }
        case "inferno":
          this.ring(h.x, h.y, st.radius, "#ff7043"); this.burst(h.x, h.y - 14, "#ff7043", 14, 180, "🔥");
          for (const e of this.enemiesOf(h.team, true)) {
            if (dist(h, e) <= st.radius + e.r) {
              const bonus = e.burnT > 0 ? 1.35 : 1;
              this.damage(h, e, Math.round(st.dmg * bonus), bonus > 1, dmgType, "skill");
              this.applyBurn(h, e, 1);
            }
          }
          break;
        case "phoenix":
          h.phoenixT = s.dur || 4.0; h.phoenixDmg = st.dmg; h.phoenixTick = 0.2;
          h.dmgRed = Math.max(h.dmgRed, 0.2); h.dmgRedT = Math.max(h.dmgRedT, s.dur || 4.0);
          h.aspdBuff = Math.max(h.aspdBuff, 0.25); h.aspdBuffT = Math.max(h.aspdBuffT, s.dur || 4.0);
          this.recalcHeroStats(h); this.ring(h.x, h.y, s.radius, "#ffab40"); this.text(h.x, h.y - 62, "PHOENIX REBIRTH!", "#ffab40");
          break;
        case "guardian_slam": {
          const hpBonus = Math.round(h.maxhp * (s.hpRatio || 0) * st.pow);
          this.hazards.push({ kind: "rex_slam", team: h.team, owner: h, x: h.x, y: h.y, r: st.radius, dmg: st.dmg + hpBonus, dmgType, tag: "skill", castId: h.currentCastId, delay: s.delay || 0.45, maxDelay: s.delay || 0.45, air: s.air || 1.0, slow: s.slow || 1.8, allyShield: s.allyShield || 130, color: "#ffb74d" });
          this.burst(h.x, h.y - 10, "#d7ccc8", 6, 110);
          break;
        }
        case "kings_prot": {
          // v6.9: a 5s zone that follows Rex. Allies inside take less damage (by ultimate rank; stacks separately from Unbreakable), enemies inside are slowed 20%.
          this.hazards = this.hazards.filter((z) => !(z.kind === "rex_aura" && z.owner === h));
          const rk = Math.max(1, h.skillLv[i] || 1), reds = s.redRanks || [s.red || 0.25];
          this.hazards.push({ kind: "rex_aura", team: h.team, owner: h, r: s.radius, dur: s.dur || 5, maxDur: s.dur || 5, red: reds[Math.min(reds.length - 1, rk - 1)], slowMult: s.slowMult || 0.8 });
          this.ring(h.x, h.y, s.radius, "#ffd54f"); this.burst(h.x, h.y - 16, "#ffd54f", 14, 150, "🛡️");
          this.text(h.x, h.y - 62, "KING'S PROTECTION!", "#ffd54f");
          break;
        }
        case "blade_storm":
          this.ring(h.x, h.y, st.radius, "#90a4ae"); this.burst(h.x, h.y - 14, "#cfd8dc", 12, 160);
          for (const e of this.enemiesOf(h.team, true)) if (dist(h, e) <= st.radius + e.r) this.damage(h, e, st.dmg * (s.hits || 3), e.markT > 0, dmgType, "skill");
          break;
        case "death_mark": {
          const target = this.enemiesOf(h.team).filter((e) => e.kind === "hero" && dist(h, e) <= st.range + e.r).sort((a, b) => a.hp / a.maxhp - b.hp / b.maxhp)[0];
          if (!target) { h.cds[i] = 0; if (h.isPlayer) this.text(h.x, h.y - 56, "NO HERO IN RANGE", "#ef9a9a"); return false; }
          this.hazards.push({ kind: "death_mark", team: h.team, owner: h, target, dmg: st.dmg, dmgType, tag: "skill", castId: h.currentCastId, execPct: s.execPct || 0.12, delay: s.delay || 0.6, maxDelay: s.delay || 0.6 });
          this.text(target.x, target.y - 68, "⚠️ MARKED!", "#ef5350");
          break;
        }
        case "whirlwind":
          h.whirl = { dur: s.dur || 2.0, tickT: 0.05, tick: (s.dur || 2.0) / (s.ticks || 4), radius: st.radius, dmg: Math.round(st.dmg * dmgMult), dmgType, slow: s.slow || 0.8 };
          this.recalcHeroStats(h);
          break;
        case "berserk": {
          const bonusHp = Math.round(h.maxhp * 0.2); h.berserkHp = bonusHp; h.berserkT = s.dur || 5.0; this.recalcHeroStats(h);
          h.hp = Math.min(h.maxhp, h.hp + bonusHp); this.ring(h.x, h.y, 80, "#ff7043"); this.text(h.x, h.y - 60, "BERSERKER ROAR!", "#ff8a65");
          break;
        }
        case "chain": {
          let cur = this.nearest(h, this.enemiesOf(h.team), st.range);
          if (!cur) { h.cds[i] = 0; if (h.isPlayer) this.text(h.x, h.y - 56, "NO TARGET", "#fff176"); return false; }
          const hitSet = new Set(); let prev = { x: h.x, y: h.y - 14 }, dmg = st.dmg;
          for (let b = 0; b < (s.bounces || 4) && cur; b++) {
            hitSet.add(cur);
            this.boltFx([prev, { x: (prev.x + cur.x) / 2 + rand(-18, 18), y: (prev.y + cur.y) / 2 - 22 }, { x: cur.x, y: cur.y - 12 }], "#ffee58");
            this.damage(h, cur, dmg, b === 0, dmgType, "skill"); this.applyStatic(h, cur, s.staticStack || 1);
            prev = { x: cur.x, y: cur.y - 12 }; dmg = Math.round(dmg * (s.falloff || 0.68));
            cur = this.nearest(cur, this.enemiesOf(h.team).filter((e) => !hitSet.has(e)), 240);
          }
          break;
        }
        case "guitar": {
          this.ring(h.x, h.y, st.radius, "#ec407a"); this.ring(h.x, h.y, st.radius * 0.65, "#ffd54f"); this.burst(h.x, h.y - 16, "#f48fb1", 10, 140, "♪");
          let hitHero = false;
          for (const e of this.enemiesOf(h.team, true)) if (dist(h, e) <= st.radius + e.r) { this.damage(h, e, st.dmg, false, dmgType, "skill"); if (e.kind === "hero") hitHero = true; }
          if (hitHero && s.hitShield) this.addShield(h, s.hitShield, 3.0);
          break;
        }
        case "sand_wave":
          h.face = dir;
          this.projs.push({ kind: "sand_wave", x: h.x + dir.x * 18, y: h.y - 10, vx: dir.x * s.speed, vy: dir.y * s.speed, dmg: st.dmg, dmgType, tag: "skill", castId: h.currentCastId, team: h.team, owner: h, r: st.r, life: st.range / s.speed, pierce: true, hit: new Set(), root: st.root, slow: 1.0, color: "#e6be7a", ang: Math.atan2(dir.y, dir.x) });
          this.burst(h.x, h.y - 8, "#e6be7a", 8, 110);
          break;
        case "team_anthem": {
          const rad = s.radius || 260;
          this.ring(h.x, h.y, rad, "#f48fb1"); this.burst(h.x, h.y - 20, "#ffd54f", 16, 170, "♫");
          for (const ally of this.heroes) {
            if (ally.team !== h.team || ally.dead || dist(h, ally) > rad + ally.r) continue;
            const gained = this.healUnit(h, ally, Math.round(ally.maxhp * (s.healPct || 0.12)));
            const shieldAmt = Math.round(ally.maxhp * (s.shieldPct || 0.08));
            this.addShield(ally, shieldAmt, s.shieldDur || 5.0);
            this.ring(ally.x, ally.y, 75, "#f48fb1"); this.burst(ally.x, ally.y - 18, "#81c784", 8, 110, "♪");
            this.text(ally.x, ally.y - 62, `+${gained} HP · 🛡️+${shieldAmt}`, "#a5d6a7");
          }
          break;
        }
        case "hook":
          h.face = dir;
          this.projs.push({ kind: "hook", x: h.x + dir.x * 16, y: h.y - 12, vx: dir.x * s.speed, vy: dir.y * s.speed, dmg: st.dmg, dmgType, tag: "skill", castId: h.currentCastId, team: h.team, owner: h, r: st.r, pull: s.pull || 110, root: st.root || 0.85, life: st.range / s.speed, hit: new Set(), color: "#795548", ang: Math.atan2(dir.y, dir.x) });
          break;
        case "vortex": case "frost_prison": case "collapse": case "barrage": case "storm": case "gravity": {
          const pt = this.aimPoint(h, s.range || 520, dirOverride);
          h.face = norm(pt.x - h.x, pt.y - h.y);
          this.hazards.push({ kind: s.type, team: h.team, owner: h, x: pt.x, y: pt.y, r: st.radius, dmg: st.dmg, dmgType, tag: (s.type === "vortex") ? "dot" : "skill", castId: h.currentCastId, delay: s.delay || 0, maxDelay: s.delay || 0.5, dur: s.dur || s.duration || 0.5, maxDur: s.dur || s.duration || 1.5, tick: s.tick || (s.type === "storm" ? 0.6 : 0.5), tickT: s.type === "barrage" || s.type === "storm" ? 0.25 : 0.12, left: s.waves || s.strikes || 0, finalMult: s.finalMult || 0, finalStun: s.finalStun || 0, root: st.root || 0, slow: s.slow || 1.2, color: h.def.color });
          break;
        }
        case "symphony": {
          const pulse = Math.round(((s.pulseBase || 35) + (s.pulseMp || 0.15) * st.mp) * st.pow), fin = Math.round(((s.finalBase || 100) + (s.finalMp || 0.35) * st.mp) * st.pow);
          h.chan = { kind: "symphony", t: 0, tick: s.pulseTick || 0.5, tickT: s.pulseTick || 0.5, n: 0, total: s.pulses || 7, dur: s.channel || 3.5, cx: h.x, cy: h.y, r: st.radius, pulse, fin, castId: h.currentCastId, dr: s.chanDr || 0, color: "#ce93d8" };
          this.ring(h.x, h.y, st.radius, "#ce93d8"); this.burst(h.x, h.y - 20, "#e1bee7", 18, 190, "✨");
          this.text(h.x, h.y - 64, "ASTRAL SYMPHONY", "#e1bee7");
          break;
        }
        case "root_burst":
        {   // v6.3: placed at the aimed point (range s.range), no longer centred on the caster
          const pt = this.aimPoint(h, s.range || 500, dirOverride);
          h.face = norm(pt.x - h.x, pt.y - h.y);
          this.hazards.push({ kind: "root_burst", team: h.team, owner: h, x: pt.x, y: pt.y, r: st.radius, dmg: st.dmg, dmgType, tag: "skill", castId: h.currentCastId, root: st.root || 0.95, delay: s.delay || 0.55, maxDelay: s.delay || 0.55, dur: 0.65, color: "#6d4c41",
            pulses: s.pulses || 1, pulseN: 0, gap: s.pulseGap || 0.5, pulseDmg: s.pulseDmg || 1, pulseSlow: s.pulseSlow || 0 });   // v6.4: multi-pulse
          break;
        }
        case "shot": {
          h.face = dir; const amb = h.def.id === "zora" && h.inBush;
          this.projs.push({ x: h.x, y: h.y - 12, vx: dir.x * s.speed, vy: dir.y * s.speed, dmg: Math.round(st.dmg * (amb ? 1.2 : 1)), dmgType, tag: "skill", castId: h.currentCastId, crit: h.skillLv[i] >= 4, team: h.team, owner: h, r: st.r, life: st.range / s.speed, pierce: s.pierce, falloff: s.falloff || 1, refundHero: s.refundHero || 0, skillIdx: i, staticStack: s.staticStack || 0, hit: new Set(), stun: (st.stun || 0) + (amb ? 0.25 : 0), slow: s.slow, color: h.def.color, big: true });
          break; }
        case "wave": {
          h.face = dir;
          const nW = s.waves || 1, wDmg = nW > 1 ? Math.round(st.dmg * (s.waveDmg || 1)) : st.dmg;
          this.fireWave(h, s, dir, wDmg, st.r, dmgType, h.currentCastId);
          if (nW > 1) h.wavePend = { t: s.waveGap || 0.4, left: nW - 1, s, dir, dmg: wDmg, r: st.r, dmgType, castId: h.currentCastId, range: st.range || s.range };   // v6.4: follow-up waves
          break; }
        case "beam":
          h.face = dir;
          this.hazards.push({ kind: "beam", team: h.team, owner: h, x: h.x, y: h.y - 14, dx: dir.x, dy: dir.y, range: s.range || 2600, width: st.width || 50, dmg: st.dmg, dmgType, tag: "skill", castId: h.currentCastId, delay: s.delay || 0.85, dur: 0.36, color: h.def.color });
          break;
      }
      if (h.isPlayer) Sound.sfx(s.type === "beam" ? "beam" : s.type === "team_anthem" ? "note" : "skill");
      return true;
    }

    /* ---------- MOVEMENT & SMART AI ---------- */
    moveHero(h, dx, dy, dt) {
      if (h.rootT > 0 || this.prepT > 0 || h.dead) return;   // v6.1: Aria can walk while channeling
      const l = Math.hypot(dx, dy);
      if (l < 0.01) return;
      this.cancelRecall(h);
      const nx = dx / l, ny = dy / l, sp = h.speed * (h.slowT > 0 ? 0.55 : 1) * (h.auraSlowT > 0 ? 0.8 : 1) * Math.min(1, l);
      const oldX = h.x, oldY = h.y;
      h.x = clamp(h.x + nx * sp * dt, 40, W - 40);
      h.y = clamp(h.y + ny * sp * dt, LANE_TOP + 22, LANE_BOT - 10);
      h.lastVx = (h.x - oldX) / Math.max(0.001, dt); h.lastVy = (h.y - oldY) / Math.max(0.001, dt);
      h.face = { x: nx, y: ny }; h.moveT = 0.12;   // v7.0: "was walking" flag for the sprite animation
    }
    moveTo(h, tx, ty, dt, stop) { const dx = tx - h.x, dy = ty - h.y; if (Math.hypot(dx, dy) >= stop) this.moveHero(h, dx, dy, dt); }

    spendSkillPoints(h, quiet) {
      while (h.sp > 0) {
        let pick = [2, 0, 1].find((i) => (h.skillLv[i] || 0) === 0 && this.canUpgradeSkill(h, i));
        if (pick === undefined) pick = [0, 1, 2].filter((i) => this.canUpgradeSkill(h, i)).sort((a, b) => h.skillLv[a] - h.skillLv[b])[0];
        if (pick === undefined) break;
        this.upgradeSkill(h, pick, quiet);
      }
    }
    aiSpendUpgrades(h) { this.spendSkillPoints(h); }
    aiPurchaseEquipment(h) {
      if (!h || !h.inventory || h.inventory.slots.every(Boolean)) return false;
      const oldMaxHp = h.maxhp;
      const result = window.RCShopSystem.purchaseAI(h);
      if (!result.ok) return false;
      this.recalcHeroStats(h);
      h.hp = Math.min(h.maxhp, h.hp + (h.maxhp - oldMaxHp));
      if (h.isPlayer) this.text(h.x, h.y - 55, "AUTO-BUY: " + window.RCEquipment.getItem(result.selectedItemId).name, "#ffd54f");
      return true;
    }
    ai(h, dt) {
      const enemies = this.enemiesOf(h.team);
      const nearHero = this.nearest(h, enemies.filter((e) => e.kind === "hero"), 340);
      if (h.recallT > 0) {
        if (nearHero && dist(h, nearHero) < 230) { this.cancelRecall(h); h.retreat = true; }
        else return;
      }

      h.aiT -= dt; h.aiCastCd = Math.max(0, h.aiCastCd - dt); h.aiShopCd = Math.max(0, h.aiShopCd - dt);
      if (h.aiShopCd <= 0) { h.aiShopCd = 12; this.aiPurchaseEquipment(h); }
      const dir = h.team ? -1 : 1, base = this.bases[h.team], eb = this.bases[1 - h.team];

      if (h.hp < h.maxhp * 0.55 && h.regenCd <= 0 && (!nearHero || dist(h, nearHero) > 200)) this.startRegen(h);
      /* v6.7: bots know the fountain pad. They go home when low on HP (or out of mana and hurt), then HOLD on the pad until HP and mana are topped up
         (they used to turn round at 82% HP - or straight after a recall - and walk out half-healed). */
      const onPad = this.inFountain(h);
      if (h.hp < h.maxhp * 0.3 || (h.mana < h.maxMana * 0.12 && h.hp < h.maxhp * 0.6)) h.retreat = true;
      else if (h.retreat && (onPad ? h.hp > h.maxhp * 0.96 && h.mana > h.maxMana * 0.8 : h.hp > h.maxhp * 0.82)) h.retreat = false;
      if (this.practice) h.retreat = false;          // practice enemy always fights; never runs home

      if (h.aiT <= 0) { h.aiT = (h.team ? 0.5 : 0.35) + Math.random() * 0.25; this.aiSpendUpgrades(h); if (h.aiCastCd <= 0) this.aiSkills(h, enemies); }

      if (h.team === 0 && this.orderT > 0 && this.teamOrder && !h.retreat) {
        if (this.teamOrder === "FALLBACK") { this.moveTo(h, base.x + 280, h.laneY, dt, 20); return; }
        if (this.teamOrder === "DEFEND") {
          const thr = enemies.find((e) => dist(e, base) < 820);
          if (thr) { this.moveTo(h, thr.x, thr.y, dt, h.def.range * 0.85); if (dist(h, thr) - this.reachOf(thr) <= h.def.range) this.basicAttack(h, thr); return; }
          this.moveTo(h, base.x + 360, h.laneY, dt, 30); return;
        }
        if (this.teamOrder === "BACKUP" && dist(h, this.player) > 240 && !this.player.dead) {
          this.moveTo(h, this.player.x - 40, this.player.y, dt, 80); return;
        }
      }

      if (h.retreat) {
        const ownTw = this.towers[h.team].find((t) => !t.dead);
        const safeX = ownTw ? ownTw.x - dir * 130 : base.x + dir * 110;
        if (!nearHero && ((dir > 0 && h.x <= safeX + 80) || (dir < 0 && h.x >= safeX - 80)) && dist(h, base) > 360 && this.startRecall(h)) return;
        if (!onPad) {   // walk to the near side of the pad (not its centre) and stop the moment we are standing on it
          const fp = this.fountainPos(h.team);
          this.moveTo(h, fp.x + dir * FOUNT_RX * 0.5, clamp(h.y, LANE_Y - 120, LANE_Y + 120), dt, 10);
        } else {      // healing: still swing at anything that follows us home
          const foe = this.nearest(h, enemies.filter((e) => e.kind === "hero" || e.kind === "minion"), h.def.range + 30);
          if (foe) this.basicAttack(h, foe);
        }
        return;
      }

      const tw = this.structs.find((t) => t.team !== h.team && !t.dead && dist(h, t) < t.range + 45);
      if (!this.practice && tw && !this.minions.some((m) => m.team === h.team && !m.dead && dist(m, tw) < tw.range - 20)) {
        this.moveTo(h, h.x - dir * 280, h.y, dt, 5); return;
      }

      const threatAtBase = enemies.find((e) => (e.kind === "hero" || e.kind === "minion") && dist(e, base) < 620);
      if (threatAtBase && dist(h, base) > 750) { this.moveTo(h, threatAtBase.x, threatAtBase.y, dt, 60); return; }

      const enemyHeroes = enemies.filter((e) => e.kind === "hero");
      let t =
        enemyHeroes.filter((e) => dist(h, e) - e.r <= 430).sort((a, b) => a.hp / a.maxhp - b.hp / b.maxhp || dist(h, a) - dist(h, b))[0] ||
        this.nearest(h, enemies.filter((e) => e.kind === "minion"), 330) ||
        this.nearest(h, enemies.filter((e) => e.kind === "tower" || e.kind === "base"), h.def.range + 250);

      if (t && t.kind === "hero") {
        const oppCount = enemyHeroes.filter((e) => dist(h, e) < 380).length;
        const allyCount = this.heroes.filter((a) => a.team === h.team && !a.dead && dist(h, a) < 420).length;
        if (oppCount >= allyCount + 2 && dist(h, base) > 900) { this.moveTo(h, h.x - dir * 260, h.y, dt, 5); return; }
      }

      if (t) {
        const d = dist(h, t) - this.reachOf(t);
        if (h.def.range > 180 && t.kind === "hero" && d < h.def.range * 0.45 && h.atkCd > 0.2) {
          const away = norm(h.x - t.x, h.y - t.y); this.moveHero(h, away.x, away.y, dt); return;
        }
        if (d > h.def.range * 0.9) this.moveTo(h, t.x, t.y, dt, 0); else this.basicAttack(h, t);
        return;
      }

      if (this.practice) { const pl = this.player; if (!pl.dead) this.moveTo(h, pl.x, pl.y, dt, Math.max(60, h.def.range * 0.8)); return; }   // practice: walk up to the player
      const allies = this.minions.filter((m) => m.team === h.team && !m.dead);
      let tx = allies.length ? (dir > 0 ? Math.max(...allies.map((m) => m.x)) : Math.min(...allies.map((m) => m.x))) - dir * 35
        : (this.towers[h.team].find((x) => !x.dead)?.x || base.x + dir * 200) + dir * 40;
      tx = dir > 0 ? Math.min(tx, eb.x) : Math.max(tx, eb.x);
      this.moveTo(h, tx, h.laneY, dt, 26);
    }

    aiSkills(h, enemies) {
      const heroes = enemies.filter((e) => e.kind === "hero");
      const allyCount = this.heroes.filter((a) => a.team === h.team && !a.dead && dist(h, a) < 420).length;
      for (let i = 0; i < 3; i++) {
        const s = h.def.skills[i], st = this.skillStats(h, i);
        if ((h.skillLv[i] || 0) <= 0 || (s.type === "windstep" ? (h.windStepCharges || 0) <= 0 : h.cds[i] > 0)) continue;
        let cast = false;
        switch (s.type) {
          case "team_anthem": case "kings_prot": {
            const rad = s.radius || 250;
            if (this.heroes.some((a) => a.team === h.team && !a.dead && dist(h, a) <= rad && a.hp < a.maxhp * 0.78)) cast = this.castSkill(h, i);
            break;
          }
          case "phoenix": case "berserk":
            if (heroes.some((e) => dist(h, e) < 280) && h.hp > h.maxhp * 0.35) cast = this.castSkill(h, i); break;
          case "inferno": case "guardian_slam": case "blade_storm": case "guitar": case "whirlwind": {
            const near = enemies.filter((e) => dist(h, e) < st.radius * 0.88 + e.r);
            if (near.some((e) => e.kind === "hero") || near.length >= 3) cast = this.castSkill(h, i);
            break;
          }
          case "root_burst": { const rg = (s.range || 500) * 0.9; if (heroes.some((e) => dist(h, e) < rg && (e.rootT > 0 || e.stunT > 0 || dist(h, e) < 300))) cast = this.castSkill(h, i); break; }   // v6.3: ranged; prefers rooted targets (hook combo)
          case "shot": case "wave": case "sand_wave": case "hook": case "chain": case "death_mark":
            if (this.nearest(h, heroes, st.range * 0.88)) cast = this.castSkill(h, i); break;
          case "gravity": case "vortex": case "frost_prison": case "collapse": case "barrage": case "storm":
            if (this.nearest(h, heroes, (s.range || 520) * 0.9)) cast = this.castSkill(h, i); break;
          case "beam": if (this.nearest(h, heroes, 1800)) cast = this.castSkill(h, i); break;
          case "symphony": { const inn = enemies.filter((e) => dist(h, e) < st.radius * 0.8 + e.r); if (inn.filter((e) => e.kind === "hero").length >= 2 || (inn.some((e) => e.kind === "hero" && e.stunT <= 0) && h.hp > h.maxhp * 0.5)) cast = this.castSkill(h, i); break; }
          case "dash": case "leap": case "windstep":
            if (h.noDashT > 0 || h.rootT > 0) break;
            if (!s.dmg) { if (h.hp < h.maxhp * 0.5 && heroes.some((e) => dist(h, e) < 300)) cast = this.castSkill(h, i, norm(this.bases[h.team].x - h.x, LANE_Y - h.y)); }
            else {
              const t = this.nearest(h, heroes, st.dist + 70), oppNearT = t ? heroes.filter((e) => dist(t, e) < 300).length : 0;
              if (t && dist(h, t) > 125 && oppNearT <= allyCount + 1 && (t.hp < t.maxhp * 0.65 || h.hp > h.maxhp * 0.55)) cast = this.castSkill(h, i);
            }
            break;
        }
        if (cast) { h.aiCastCd = 0.75; break; }
      }
    }

    /* ---------- MINIONS & UPDATE ---------- */
    spawnWave(withSiege) {
      const minionStage = Math.min(6, Math.floor(this.time / 180));
      const hpScale = 1 + minionStage * 0.04;
      const dmgScale = 1 + minionStage * 0.02;
      for (let t = 0; t < 2; t++) {
        const dir = t ? -1 : 1, bx = t ? W - BASE_X : BASE_X;
        const specs = [
          { v: "melee", hp: 360, dmg: 22, range: 52, r: 17, sp: 102, ox: 155, oy: -34 },
          { v: "melee", hp: 360, dmg: 22, range: 52, r: 17, sp: 102, ox: 155, oy: 34 },
          { v: "ranged", hp: 230, dmg: 28, range: 210, r: 15, sp: 98, ox: 210, oy: 0 },
        ];
        if (this.inhibDown[1 - t]) specs.push({ v: "siege", hp: 1300, dmg: 80, range: 230, r: 27, sp: 92, ox: 300, oy: 0 });
        if (withSiege) specs.push({ v: "siege", hp: 620, dmg: 44, range: 220, r: 21, sp: 88, ox: 255, oy: 0 });
        for (const sp of specs) {
          this.minions.push({
            kind: "minion", variant: sp.v, team: t, x: bx + dir * sp.ox, y: clamp(LANE_Y + sp.oy, LANE_TOP + 35, LANE_BOT - 25),
            r: sp.r, hp: Math.round(sp.hp * hpScale), maxhp: Math.round(sp.hp * hpScale), armor: sp.v === "siege" ? 16 : 8, mres: 8,
            atkCd: 0, speed: sp.sp, range: sp.range, dmg: Math.round(sp.dmg * dmgScale),
            stunT: 0, rootT: 0, slowT: 0, burnStacks: 0, burnT: 0, hitFlash: 0, dead: false,
          });
        }
      }
    }
    catchUp(team) { const d = this.score[1 - team] - this.score[team], td = this.towers[team].filter((x) => x.dead).length - this.towers[1 - team].filter((x) => x.dead).length; return 1 + clamp(d * 0.02 + td * 0.04, 0, 0.20); }
    tickAutoBuy(dt) {
      const p = this.player;
      if (!p || this.over) return;
      this.tickShopLive(dt);
      if (!p.autoBuyEnabled || !(p.priorityQueue && p.priorityQueue.length)) return;
      p.autoBuyT = Math.max(0, (p.autoBuyT || 0) - dt);
      if (p.autoBuyT > 0) return;
      p.autoBuyT = 0.5;
      const oldMaxHp = p.maxhp;
      const result = window.RCShopSystem.autoBuyStep(p);
      if (result.ok) {
        this.recalcHeroStats(p);
        p.hp = Math.min(p.maxhp, p.hp + (p.maxhp - oldMaxHp));
        this.text(p.x, p.y - 55, "AUTO-BUY: " + window.RCEquipment.getItem(result.selectedItemId || result.itemId).name, "#ffd54f");
        Sound.sfx("buy");
        if (this.shopIsOpen()) { this.shopMsg(`Auto-Buy: ${window.RCEquipment.getItem(result.selectedItemId || result.itemId).name} · −${result.spent} G`); this.refreshBattleShop(); }
      }
    }
    update(dt) {
      this.updateFx(dt);
      this.tickAutoBuy(dt);
      for (const s of this.structs) if (!s.dead && s.kind === "base" && s.hp < s.maxhp) {
        const hot = this.time - (s.lastHit || -99) < 3 || this.heroes.some((x) => !x.dead && x.team !== s.team && dist(x, s) < s.range + 80) || this.minions.some((m) => !m.dead && m.team !== s.team && dist(m, s) < s.range + 40);
        if (!hot) {
          const add = s.maxhp * 0.025 * dt; s.hp = Math.min(s.maxhp, s.hp + add); s.healAcc = (s.healAcc || 0) + add;
          if (s.healAcc >= 130) { this.text(s.x, s.y - 160, "+" + Math.round(s.healAcc), "#a5d6a7"); this.ring(s.x, s.y, 80, "#81c784"); s.healAcc = 0; }
        }
      }
      if (this.bannerT > 0) { this.bannerT -= dt; if (this.bannerT <= 0) $("killBanner").classList.add("hidden"); }
      if (this.wipeT > 0) { this.wipeT -= dt; if (this.wipeT <= 0) $("wipeBanner").className = "hidden"; }
      if (this.ping) { this.ping.t -= dt; if (this.ping.t <= 0) this.ping = null; }
      if (this.orderT > 0) { this.orderT -= dt; if (this.orderT <= 0) this.teamOrder = null; }
      if (this.over) { this.endTimer -= dt; if (this.endTimer <= 0 && !this.ended) { this.ended = true; this.finish(); } return; }

      if (this.prepT > 0) {
        this.prepT -= dt;
        if (!this.firstWaveSent && this.prepT <= 2.0) { this.firstWaveSent = true; this.spawnWave(false); this.feed("Minions have deployed!"); Sound.announce("minions_deployed"); }
        const pb = $("prepBanner"); this.showcaseTick();
        if (this.prepT > 0) { pb.className = "prep-banner"; pb.innerHTML = `<small>BATTLE BEGINS IN</small><b>${Math.ceil(this.prepT)}</b><small>Prepare your heroes!</small>`; }
        else { Sound.announce("welcome"); Sound.announce("battle_start"); pb.className = "prep-banner"; pb.innerHTML = `<b>BATTLE BEGINS!</b>`; setTimeout(() => pb.classList.add("hidden"), 1100); }
        return;
      }

      this.time += dt; this.waveT -= dt;
      if (this.waveT <= 0) { this.waveT = 28; if (!this.practice || this.practice.minions) this.spawnWave(Math.floor(this.time / 28) % 2 === 1); }
      if (this.practice) this.practiceTick();

      for (const h of this.heroes) this.updateHero(h, dt);
      for (const m of this.minions) this.updateMinion(m, dt);
      for (const s of this.structs) this.updateTower(s, dt);
      this.updateProjs(dt); this.updateHazards(dt); this.updateSlides(dt);
      this.minions = this.minions.filter((m) => !m.dead); this.projs = this.projs.filter((p) => !p.dead); this.hazards = this.hazards.filter((z) => !z.dead);
    }
    /* ---------- v6.8/v6.9 Rex: Guardian Slam resolve, Shockwave passive, airborne + slide helpers ---------- */
    isAirborne(e) { return (e.airUntil || 0) > this.time; }
    airLift(e) { if (!this.isAirborne(e)) return 0; const dur = Math.max(0.1, e.airUntil - (e.airStart || 0)); return 46 * Math.sin(Math.PI * clamp((this.time - (e.airStart || 0)) / dur, 0, 1)); }
    flatRing(c, x, y, r, color, w) { c.save(); c.translate(x, y + 4); c.scale(1, 0.45); c.beginPath(); c.arc(0, 0, r, 0, 6.283); c.strokeStyle = color; c.lineWidth = w || 3; c.stroke(); c.restore(); }
    slideUnit(e, dx, dy, dur) { if (!e || e.dead || e.practiceDummy || (e.kind !== "hero" && e.kind !== "minion") || !dur) return; this.slides = this.slides.filter((a) => a.e !== e); this.slides.push({ e, vx: dx / dur, vy: dy / dur, t: dur }); }
    updateSlides(dt) {
      if (!this.slides || !this.slides.length) return;
      for (const a of this.slides) {
        const e = a.e; if (e.dead) { a.t = 0; continue; }
        const step = Math.min(dt, a.t);
        e.x = clamp(e.x + a.vx * step, 40, W - 40); e.y = clamp(e.y + a.vy * step, LANE_TOP + 22, LANE_BOT - 10);
        a.t -= dt;
      }
      this.slides = this.slides.filter((a) => a.t > 0);
    }
    resolveRexSlam(z) {
      // v6.9: everything inside the telegraph is pulled into a tight cluster around Rex, hit, and thrown airborne (the setup for the team's area skills)
      const cx = z.owner && !z.owner.dead ? z.owner.x : z.x, cy = z.owner && !z.owner.dead ? z.owner.y : z.y;
      this.ring(z.x, z.y, z.r, z.color); this.ring(cx, cy, 70, "#fff3e0"); this.burst(cx, cy - 10, "#ffcc80", 18, 190, "💥");
      let heroHit = false;
      const caught = this.enemiesOf(z.team, true).filter((e) => dist(z, e) <= z.r + e.r);
      const units = caught.filter((e) => e.kind === "hero" || e.kind === "minion");
      units.sort((a, b) => dist(z, a) - dist(z, b));
      const n = units.length, spin = rand(0, 6.283);
      units.forEach((e, k) => {
        const ring = k < 6 ? 0 : 1, cnt = ring ? Math.max(1, n - 6) : Math.min(6, n), idx = ring ? k - 6 : k;
        const ang = spin + (idx / cnt) * 6.283 + ring * 0.5, rad = 46 + ring * 34;
        const tx = clamp(cx + Math.cos(ang) * rad, 40, W - 40), ty = clamp(cy + Math.sin(ang) * rad * 0.6, LANE_TOP + 22, LANE_BOT - 10);
        this.slideUnit(e, tx - e.x, ty - e.y, 0.16);
      });
      for (const e of caught) {
        this.damage(z.owner, e, z.dmg, false, z.dmgType, "skill", z.castId);
        if (e.kind !== "hero" && e.kind !== "minion") continue;
        if (e.kind === "hero") heroHit = true;
        this.cc(e, { stun: z.air, slow: z.slow }, z.owner);
        e.airStart = this.time; e.airUntil = this.time + Math.max(0, e.stunT || 0);   // airborne = a stun with a lift visual; Aria's channel treats it as a knock-up
        this.text(e.x, e.y - 52, "AIRBORNE!", "#ffe0b2");
      }
      if (heroHit && !z.owner.dead) for (const a of this.heroes) if (a.team === z.team && !a.dead && dist(z, a) <= z.r + a.r) this.addShield(a, z.allyShield, 3.5);
    }
    rexShockwave(h, swingHits) {
      const first = swingHits[0]; if (!first) return;
      const pool = this.enemiesOf(h.team).filter((e) => (e.kind === "hero" || e.kind === "minion") && !swingHits.includes(e) && dist(first, e) <= 175)
        .sort((a, b) => dist(first, a) - dist(first, b)).slice(0, 3);
      const base = Math.round(14 + h.maxhp * 0.02);
      let heroes = 0;
      for (const e of pool) {
        this.boltFx([{ x: first.x, y: first.y - 20 }, { x: (first.x + e.x) / 2 + rand(-10, 10), y: (first.y + e.y) / 2 - 26 }, { x: e.x, y: e.y - 14 }], "#ffcc80");
        this.damage(h, e, Math.round(base * (e.kind === "minion" ? 1.5 : 1)), false, "phys", "dot");
        if (e.kind === "hero") heroes++;
      }
      if (first.kind === "hero") heroes++;
      if (heroes > 0) this.addShield(h, 18 * heroes, 3);
    }
    updateHazards(dt) {
      for (const z of this.hazards) {
        if (z.kind === "gravity") {
          if (z.delay > 0) {
            z.delay -= dt;
            if (z.delay <= 0) {
              this.ring(z.x, z.y, z.r, z.color);
              for (const e of this.enemiesOf(z.team, true)) if (dist(z, e) <= z.r + e.r) {
                this.damage(z.owner, e, z.dmg, false, z.dmgType, z.tag || "direct", z.castId); this.cc(e, { noDash: z.maxDur, slow: 0.5 }, z.owner);
                if (z.owner.def.id === "felix") z.owner.gravBoostT = 2.0;
              }
            }
          } else {
            z.dur -= dt;
            for (const e of this.enemiesOf(z.team, true)) if ((e.kind === "hero" || e.kind === "minion") && dist(z, e) <= z.r + e.r && dist(z, e) > 12) {
              const pull = norm(z.x - e.x, z.y - e.y); e.x = clamp(e.x + pull.x * 160 * dt, 40, W - 40); e.y = clamp(e.y + pull.y * 160 * dt, LANE_TOP + 22, LANE_BOT - 10);
              this.cc(e, { noDash: 0.25, slow: 0.35 }, z.owner);
            }
            if (z.dur <= 0) z.dead = true;
          }
        } else if (z.kind === "frost_prison" || z.kind === "collapse" || z.kind === "root_burst") {
          if (z.delay > 0) {
            z.delay -= dt;
            if (z.delay <= 0) {
              // v6.4: root_burst may pulse several times; early pulses slow, the last one roots
              const multi = z.kind === "root_burst" && z.pulses > 1;
              if (multi) z.pulseN++;
              const last = !multi || z.pulseN >= z.pulses, pdmg = multi ? Math.round(z.dmg * z.pulseDmg) : z.dmg;
              this.ring(z.x, z.y, z.r, z.color); this.burst(z.x, z.y - 12, z.color, 16, 175, z.kind === "root_burst" ? "🌿" : null);
              for (const e of this.enemiesOf(z.team, true)) if (dist(z, e) <= z.r + e.r) {
                this.damage(z.owner, e, pdmg, z.kind !== "frost_prison", z.dmgType, z.tag || "direct", z.castId);
                if (last) { if (z.root) this.cc(e, { root: z.root }, z.owner); }
                else if (z.pulseSlow) this.cc(e, { slow: z.pulseSlow }, z.owner);
              }
              if (!last) { z.delay = z.maxDelay = z.gap; this.text(z.x, z.y - 40, "PULSE " + z.pulseN + "/" + z.pulses, "#aed581"); }
            }
          } else { z.dur -= dt; if (z.dur <= 0) z.dead = true; }
        } else if (z.kind === "vortex") {
          z.dur -= dt; z.tickT -= dt;
          if (!lowGfx && Math.random() < 0.55) {
            this.particles.push({ x: z.x + rand(-z.r * 0.85, z.r * 0.85), y: z.y - rand(45, 95), vx: rand(-25, 25), vy: rand(45, 85), r: 4,
              color: Math.random() < 0.65 ? "#f48fb1" : "#81c784", glyph: Math.random() < 0.65 ? "🌸" : "🍃", t: 0.65, max: 0.65 });
          }
          if (z.tickT <= 0) { z.tickT = z.tick; for (const e of this.enemiesOf(z.team, true)) if (dist(z, e) <= z.r + e.r) { this.damage(z.owner, e, z.dmg, false, z.dmgType, "dot"); this.cc(e, { slow: z.slow }, z.owner); } }
          if (z.dur <= 0) z.dead = true;
        } else if (z.kind === "barrage" || z.kind === "storm") {
          if (z.kind === "storm" && z.delay > 0) { z.delay -= dt; if (z.delay <= 0) z.tickT = 0; continue; }   // v6.7: short telegraph ring, then the storm breaks
          z.tickT -= dt;
          if (z.tickT <= 0 && z.left > 0) {
            z.tickT = z.tick; z.left--; this.ring(z.x, z.y, z.r, z.color);
            if (z.kind === "barrage") { this.burst(z.x, z.y - 45, "#a5d6a7", 12, 140, "🏹"); for (const e of this.enemiesOf(z.team, true)) if (dist(z, e) <= z.r + e.r) { this.damage(z.owner, e, z.dmg, false, z.dmgType, z.tag || "dot", z.castId); if (z.owner.def.id === "lumi") this.cc(e, { slow: z.slow || 0.8 }, z.owner); } }
            else {
              /* v6.7 burst Stormcaller: every bolt strikes EVERY enemy inside the ring (it used to pick one random target every 0.6s, so walking out of it was
                 trivial), and the last bolt is a heavy thunderclap that stuns. */
              const fin = z.left === 0 && z.finalMult > 0, ins = this.enemiesOf(z.team, true).filter((e) => dist(z, e) <= z.r + e.r);
              if (!ins.length) { const bx = z.x + rand(-z.r * 0.6, z.r * 0.6), by = z.y + rand(-z.r * 0.4, z.r * 0.4); this.boltFx([{ x: bx + rand(-18, 18), y: by - 160 }, { x: bx - 10, y: by - 80 }, { x: bx, y: by - 12 }], "#ffee58"); }
              for (const pick of ins) {
                this.boltFx([{ x: pick.x + rand(-18, 18), y: pick.y - 160 }, { x: pick.x - 10, y: pick.y - 80 }, { x: pick.x, y: pick.y - 12 }], fin ? "#fff9c4" : "#ffee58");
                this.damage(z.owner, pick, Math.round(z.dmg * (fin ? z.finalMult : 1)), fin, z.dmgType, z.tag || "dot", z.castId); this.applyStatic(z.owner, pick, 1);
                this.cc(pick, fin && z.finalStun ? { stun: z.finalStun, slow: 0.9 } : { slow: 0.9 }, z.owner);
              }
              if (fin) this.burst(z.x, z.y - 20, "#fff176", 16, 190);
            }
          }
          if (z.left <= 0) { z.dur -= dt; if (z.dur <= 0) z.dead = true; }
        } else if (z.kind === "rex_aura") {
          z.dur -= dt; const o = z.owner;
          if (z.dur <= 0 || o.dead) { z.dead = true; continue; }
          z.x = o.x; z.y = o.y;
          for (const a of this.heroes) if (a.team === z.team && !a.dead && dist(o, a) <= z.r + a.r) { a.auraRed = Math.max(a.auraRedT > 0 ? a.auraRed : 0, z.red); a.auraRedT = 0.3; }
          for (const e of this.enemiesOf(z.team, true)) if ((e.kind === "hero" || e.kind === "minion") && dist(o, e) <= z.r + e.r) e.auraSlowT = 0.3;
        } else if (z.kind === "rex_slam") {
          z.delay -= dt;   // not interrupted by CC: the slam lands even if Rex is stunned or dies
          if (z.delay <= 0) { this.resolveRexSlam(z); z.dead = true; }
        } else if (z.kind === "death_mark") {
          z.delay -= dt; if (z.target.dead) { z.dead = true; continue; }
          if (z.delay <= 0) {
            z.dead = true; const o = z.owner, t = z.target;
            if (!o.dead) {
              o.x = clamp(t.x - o.face.x * 46, 40, W - 40); o.y = clamp(t.y, LANE_TOP + 22, LANE_BOT - 10); o.face = norm(t.x - o.x, t.y - o.y);
              const missingBonus = Math.min(Math.round(t.maxhp * 0.14), Math.round((t.maxhp - t.hp) * z.execPct));
              this.damage(o, t, z.dmg + missingBonus, false, z.dmgType, z.tag || "direct", z.castId);
              this.slash(t.x, t.y - 16, 0.4, 90, "#ef5350", true); this.burst(t.x, t.y - 14, "#ef5350", 12, 160);
            }
          }
        } else if (z.kind === "beam") {
          if (z.delay > 0) {
            z.delay -= dt;
            if (z.delay <= 0) {
              if (z.owner.isPlayer) Sound.sfx("beam");
              for (const e of this.enemiesOf(z.team, true)) {
                if (e.kind !== "hero" && e.kind !== "minion") continue;
                const vx = e.x - z.x, vy = e.y - 12 - z.y, proj = vx * z.dx + vy * z.dy;
                if (proj < -e.r || proj > z.range) continue;
                if (Math.abs(vx * -z.dy + vy * z.dx) <= z.width * 0.5 + e.r) { this.damage(z.owner, e, z.dmg, true, z.dmgType, z.tag || "direct", z.castId); this.cc(e, { slow: 1.2 }, z.owner); }
              }
            }
          } else { z.dur -= dt; if (z.dur <= 0) z.dead = true; }
        }
      }
    }
    /* ---------- v7.0 sprite animation state: idle / walk / cast / death ---------- */
    sprCast(h) {
      const S = h.def.sprites; if (!S || !h.spr || h.dead) return;
      h.spr = { st: "cast", t: 0 };
    }
    sprTick(h, dt) {
      const s = h.spr, S = h.def.sprites; if (!s || !S) return;
      if (h.face.x > 0.15) h.sprDir = 1; else if (h.face.x < -0.15) h.sprDir = -1;     // mostly-vertical movement keeps the last facing
      h.moveT = Math.max(0, h.moveT - dt);
      if (s.st === "death") { s.st = "idle"; s.t = 0; }                                 // respawned / practice reset
      if (s.st === "cast") { s.t += dt; if (s.t >= sprDur(S.anims.cast)) { s.st = "idle"; s.t = 0; } else return; }
      const want = h.moveT > 0 ? "walk" : "idle";
      if (s.st !== want) { s.st = want; s.t = 0; }
      // the walk cycle follows the real ground speed (slowed -> slower steps, no foot-sliding)
      s.t += dt * (want === "walk" ? clamp(Math.hypot(h.lastVx || 0, h.lastVy || 0) / (S.refSpeed || 215), 0.5, 1.5) : 1);
    }
    /* a dead sprite hero stays on screen: death animation, a short hold, then a fade. Returns false once it has gone. */
    deathVisible(h) {
      const S = h.def.sprites; if (!S || !h.dead || !h.spr || h.spr.st !== "death") return false;
      const a = S.anims.death; return h.spr.t < sprDur(a) + (a.hold || 0) + (a.fade || 0);
    }
    drawDeadSprite(c, h) {
      const P = sprPose(h); if (!P) return;
      const a = P.a, end = sprDur(a) + (a.hold || 0), alpha = h.spr.t <= end ? 1 : Math.max(0, 1 - (h.spr.t - end) / (a.fade || 1));
      c.save(); this.drawShadow(c, h.x, h.y, 26, 11); sprBlit(c, h, P, alpha); c.restore();
    }
    updateHero(h, dt) {
      /* v6.7: the passive gold income keeps ticking while the hero is dead (it used to stop until respawn). Passive XP still pauses. */
      const cu = this.catchUp(h.team); this.addGold(h, 3.2 * cu * dt);
      if (h.dead) { if (h.spr) h.spr.t += dt; h.respawn -= dt; if (h.respawn <= 0) this.respawn(h); return; }
      this.sprTick(h, dt);
      this.grantXp(h, 1.8 * cu * dt);
      const atFountain = this.inFountain(h);
      h.mana = Math.min(h.maxMana, h.mana + h.manaRegen * dt);
      if (!h.dead && h.hp < h.maxhp) h.hp = Math.min(h.maxhp, h.hp + h.maxhp * (atFountain ? 0.05 : 0.004) * dt);
      h.atkCd = Math.max(0, h.atkCd - dt); h.regenCd = Math.max(0, h.regenCd - dt);
      h.swingT = Math.max(0, h.swingT - dt); h.hitFlash = Math.max(0, h.hitFlash - dt); h.shockT = Math.max(0, (h.shockT || 0) - dt);
      h.noDashT = Math.max(0, h.noDashT - dt); h.revealT = Math.max(0, h.revealT - dt);
      h.turretAggroT = Math.max(0, h.turretAggroT - dt); h.multiT = Math.max(0, h.multiT - dt);
      h.markT = Math.max(0, h.markT - dt); h.burnT = Math.max(0, h.burnT - dt); if (h.burnT <= 0) h.burnStacks = 0;
      h.staticT = Math.max(0, h.staticT - dt); if (h.staticT <= 0) h.staticStacks = 0;
      h.furyT = Math.max(0, h.furyT - dt); if (h.furyT <= 0) h.fury = 0;
      h.deadeyeCd = Math.max(0, (h.deadeyeCd || 0) - dt);
      h.bloodReaverCd = Math.max(0, (h.bloodReaverCd || 0) - dt);
      h.chronomancerCd = Math.max(0, (h.chronomancerCd || 0) - dt);
      h.soulwellCd = Math.max(0, (h.soulwellCd || 0) - dt);
      h.phoenixSigilCd = Math.max(0, (h.phoenixSigilCd || 0) - dt);
      h.echoCd = Math.max(0, (h.echoCd || 0) - dt);
      if (h.echoPend) { h.echoPend.t -= dt; if (h.echoPend.t <= 0) { h.echoPend = null; this.fireEcho(h); } }
      if (h.wavePend) this.tickWavePend(h, dt);   // v6.4
      if (h.warbringerT > 0) { h.warbringerT = Math.max(0, h.warbringerT - dt); if (h.warbringerT <= 0 && h.warbringerStacks) { h.warbringerStacks = 0; this.recalcHeroStats(h); } }
      if (h.ruptureT > 0) { h.ruptureT = Math.max(0, h.ruptureT - dt); if (h.ruptureT <= 0) h.ruptureStacks = 0; }
      if (h.deadeyeT > 0) { h.deadeyeT = Math.max(0, h.deadeyeT - dt); if (h.deadeyeT <= 0 && h.deadeyeSpeedBonus) { h.deadeyeSpeedBonus = 0; this.recalcHeroStats(h); } }

      // Regen spell tick (4.5% Max HP/sec over 4s)
      if (h.regenT > 0) {
        h.regenT -= dt; h.regenTick -= dt;
        if (h.regenTick <= 0) {
          h.regenTick = 0.8;
          const g = this.healUnit(h, h, Math.round(h.maxhp * 0.036));
          const m = Math.min(h.maxMana - h.mana, Math.round(h.maxMana * 0.03));
          h.mana += Math.max(0, m);
          if (g > 0) this.text(h.x, h.y - 52, "+" + g, "#81c784");
          if (m > 0) this.text(h.x + 28, h.y - 72, "+" + m + " MANA", "#64b5f6");
        }
      }

      if (h.dmgRedT > 0) { h.dmgRedT -= dt; if (h.dmgRedT <= 0) h.dmgRed = 0; }
      if (h.auraRedT > 0) { h.auraRedT -= dt; if (h.auraRedT <= 0) h.auraRed = 0; }
      if (h.auraSlowT > 0) h.auraSlowT -= dt;
      if (h.aspdBuffT > 0) { h.aspdBuffT -= dt; if (h.aspdBuffT <= 0) { h.aspdBuff = 0; this.recalcHeroStats(h); } }
      if (h.berserkT > 0) { h.berserkT -= dt; if (h.berserkT <= 0) { h.berserkHp = 0; this.recalcHeroStats(h); h.hp = Math.min(h.hp, h.maxhp); } }
      if (h.gravBoostT > 0) { h.gravBoostT -= dt; this.recalcHeroStats(h); }

      if (h.phoenixT > 0) {
        h.phoenixT -= dt; h.phoenixTick -= dt;
        if (h.phoenixT <= 0) h.phoenixDmg = 0;
        if (h.phoenixTick <= 0) {
          h.phoenixTick = 0.8; this.ring(h.x, h.y, 165, "#ff7043");
          for (const e of this.enemiesOf(h.team, true)) if (dist(h, e) <= 165 + e.r) { this.damage(h, e, h.phoenixDmg || 20, false, "magic", "dot"); this.applyBurn(h, e, 1); }
        }
      }
      if (h.chan) {
        const ch = h.chan;
        if (h.stunT > 0 || h.suppressT > 0) { this.text(h.x, h.y - 64, "INTERRUPTED!", "#ef9a9a"); this.burst(h.x, h.y - 20, "#ce93d8", 10, 150); h.chan = null; }   // hard CC: no explosion, cooldown stays spent
        else {
          ch.cx = h.x; ch.cy = h.y;   // v6.1: the field follows Aria while she walks
          ch.t += dt; ch.tickT -= dt;
          while (ch.tickT <= 1e-9 && ch.n < ch.total) {
            ch.tickT += ch.tick; ch.n++;
            this.ring(ch.cx, ch.cy, ch.r * (0.55 + 0.45 * ch.n / ch.total), ch.color); this.burst(ch.cx, ch.cy - 14, "#e1bee7", 9, 150, "✦");
            for (const e of this.enemiesOf(h.team, true)) if (dist({ x: ch.cx, y: ch.cy }, e) <= ch.r + e.r) this.damage(h, e, ch.pulse, false, "magic", "skill", ch.castId);
          }
          if (ch.n >= ch.total) {
            this.ring(ch.cx, ch.cy, ch.r, "#fff"); this.burst(ch.cx, ch.cy - 16, "#ce93d8", 30, 260, "🌠");
            for (const e of this.enemiesOf(h.team, true)) if (dist({ x: ch.cx, y: ch.cy }, e) <= ch.r + e.r) this.damage(h, e, ch.fin, false, "magic", "skill", ch.castId);
            h.chan = null;
          }
        }
      }
      if (h.whirl) {
        h.whirl.dur -= dt; h.whirl.tickT -= dt;
        if (h.whirl.tickT <= 0) {
          h.whirl.tickT = h.whirl.tick; this.ring(h.x, h.y, h.whirl.radius, "#ff7043");
          this.slash(h.x, h.y - 12, this.time * 8, h.whirl.radius, "#ffab40", true);
          for (const e of this.enemiesOf(h.team, true)) if (dist(h, e) <= h.whirl.radius + e.r) { this.damage(h, e, h.whirl.dmg, false, h.whirl.dmgType, "dot"); this.cc(e, { slow: h.whirl.slow }, h); }
        }
        if (h.whirl.dur <= 0) { h.whirl = null; this.recalcHeroStats(h); }
      }

      if (h.comboT > 0) { h.comboT -= dt; if (h.comboT <= 0) h.combo = 0; }
      for (let i = 0; i < 3; i++) h.cds[i] = Math.max(0, h.cds[i] - dt);
      if (h.def.id === "lumi" && h.windStepRecharge && h.windStepRecharge.length) {
        h.windStepRecharge = h.windStepRecharge.map(t => t - dt);
        while (h.windStepRecharge.length && h.windStepRecharge[0] <= 0) { h.windStepRecharge.shift(); h.windStepCharges = Math.min(2, (h.windStepCharges || 0) + 1); }
      }
      h.slowT = Math.max(0, h.slowT - dt); h.stunT = Math.max(0, h.stunT - dt); h.rootT = Math.max(0, h.rootT - dt);
      if (h.stunT > 0 || h.rootT > 0) this.cancelRecall(h);

      h.inBush = this.bushes.some((b) => Math.hypot(h.x - b.x, (h.y - b.y) * 1.35) <= b.r * 0.85);
      if (h.def.id === "deana") {
        if (h.inBush && h.hp < h.maxhp) {
          h.bushHealT += dt;
          if (h.hitFlash > 0) h.bushHealT = 0;
          if (h.bushHealT >= 10.0) { h.bushHealT -= 10.0; this.healUnit(h, h, 4); this.text(h.x, h.y - 54, "+4", "#a5d6a7"); }
        } else if (!h.inBush) h.bushHealT = 0;
      }

      if (h.shieldT > 0) { h.shieldT -= dt; if (h.shieldT <= 0) h.shield = 0; }
      if (atFountain) {   // v6.6: the old 300-radius heal circle around the base turret is gone; only the pad heals
        this.healUnit(h, h, h.maxhp * 0.16 * dt);
        // v5.9: the base refills mana at the same % rate as HP (16% + the 5% fountain bonus on the pad) so a recall is a full reset
        h.mana = Math.min(h.maxMana, h.mana + h.maxMana * 0.16 * dt);
      }
      if (atFountain) h.mana = Math.min(h.maxMana, h.mana + h.maxMana * 0.05 * dt);

      if (h.dash) {
        const d = h.dash;
        h.x = clamp(h.x + d.vx * dt, 40, W - 40); h.y = clamp(h.y + d.vy * dt, LANE_TOP + 22, LANE_BOT - 10); d.t -= dt;
        if (d.dmg > 0) for (const e of this.enemiesOf(h.team, true)) if (!d.hit.has(e) && dist(h, e) < h.r + e.r + 25) {
          d.hit.add(e); this.damage(h, e, d.dmg, false, d.dmgType || "phys", d.tag || "direct", d.castId); this.cc(e, { stun: d.stun }, h);
          if (d.burn) this.applyBurn(h, e, d.burn); if (d.mark) e.markT = Math.max(e.markT || 0, d.mark);
          if (d.knock && (e.kind === "hero" || e.kind === "minion")) e.x = clamp(e.x + norm(e.x - h.x, e.y - h.y).x * d.knock, 40, W - 40);
        }
        if (d.t <= 0) {
          if (d.onEnd) { const o = d.onEnd; this.ring(h.x, h.y, o.radius, o.color); this.burst(h.x, h.y - 10, o.color, 12, 160);
            for (const e of this.enemiesOf(h.team, true)) if (dist(h, e) <= o.radius + e.r) this.damage(h, e, o.dmg, false, o.dmgType, o.tag || "direct", o.castId); }
          h.dash = null;
        }
        return;
      }
      if (h.stunT > 0) return;
      if (h.recallT > 0) { h.recallT -= dt; if (h.recallT <= 0) this.completeRecall(h); }

      if (h.isPlayer) {
        if (Math.abs(input.mx) > 0.05 || Math.abs(input.my) > 0.05) this.moveHero(h, input.mx, input.my, dt);
        else { h.lastVx = 0; h.lastVy = 0; }
        if (input.attack) { const t = this.nearestTarget(h, h.def.range + 20); if (t || h.def.range <= 150) this.basicAttack(h, t); }
      } else if (!(this.practice && this.practice.freezeEnemy)) this.ai(h, dt);
    }
    /* v6.7: respawn grows with hero level and match time and is capped at 30s. Level 15 hits the cap at ~minute 9.5 (it used to top out around 25s in a normal-length match). */
    respawnTime(lv, time) { return Math.min(RESPAWN_MAX, 5 + lv * 1.1 + (time / 60) * 0.9); }
    respawn(h) {
      h.dead = false; h.killProcessed = false; h.dmgLog = []; h.hp = h.maxhp; h.mana = h.maxMana; h.x = h.spawn.x; h.y = h.spawn.y; h.cds = [0, 0, 0]; if (h.def.id === "lumi") { h.windStepCharges = 2; h.windStepRecharge = []; }
      h.recallT = 0; h.regenT = 0; h.noDashT = 0; h.rootT = 0; h.revealT = 0; h.retreat = false;
      this.ring(h.x, h.y, 85, "#ffd54f"); this.ring(h.x, h.y, 55, TEAM_COL[h.team]);
      this.burst(h.x, h.y - 18, "#ffd54f", 14, 150);
    }
    updateMinion(m, dt) {
      if (m.practiceDummy) { m.hitFlash = Math.max(0, m.hitFlash - dt); m.stunT = m.rootT = m.slowT = 0; return; }
      m.atkCd -= dt; m.stunT = Math.max(0, m.stunT - dt); m.rootT = Math.max(0, m.rootT - dt);
      m.slowT = Math.max(0, m.slowT - dt); if (m.auraSlowT > 0) m.auraSlowT -= dt; m.burnT = Math.max(0, m.burnT - dt); if (m.burnT <= 0) m.burnStacks = 0;
      m.hitFlash = Math.max(0, m.hitFlash - dt);
      if (m.stunT > 0) return;
      const sp = m.rootT > 0 ? 0 : m.speed * (m.slowT > 0 ? 0.5 : 1) * (m.auraSlowT > 0 ? 0.8 : 1);
      const t = this.nearest(m, this.enemiesOf(m.team), 240);
      if (t) {
        if (dist(m, t) - t.r <= m.range) {
          if (m.atkCd <= 0) {
            m.atkCd = 1.05;
            const dmg = t.kind === "tower" && m.variant === "siege" ? m.dmg * 1.45 : m.dmg;
            if (m.variant === "ranged" || m.variant === "siege") {
              this.projs.push({ homing: t, x: m.x, y: m.y - 12, speed: 620, dmg, dmgType: "phys", team: m.team, owner: m, r: m.variant === "siege" ? 8 : 5, color: m.variant === "siege" ? "#ffd54f" : TEAM_COL[m.team], life: 2 });
            } else this.damage(m, t, dmg, false, "phys");
          }
        } else if (sp > 0) { const n = norm(t.x - m.x, t.y - m.y); m.x = clamp(m.x + n.x * sp * dt, 40, W - 40); m.y = clamp(m.y + n.y * sp * dt, LANE_TOP + 22, LANE_BOT - 10); }
      } else if (sp > 0) { m.x = clamp(m.x + (m.team ? -1 : 1) * sp * dt, 40, W - 40); m.y += (LANE_Y - m.y) * 0.5 * dt; }
    }
    updateTower(s, dt) {
      s.hitFlash = Math.max(0, (s.hitFlash || 0) - dt);
      if (s.dead || this.practice) return;
      s.atkCd -= dt;
      if (s.curTarget && (s.curTarget.dead || dist(s, s.curTarget) > s.range)) { s.curTarget = null; s.heat = 0; }
      if (s.atkCd > 0) return;
      let target = this.heroes.find((h) => h.team !== s.team && !h.dead && h.turretAggroT > 0 && dist(s, h) <= s.range);
      if (!target) {
        const ms = this.minions.filter((m) => m.team !== s.team && !m.dead && dist(s, m) <= s.range);
        target = ms.find((m) => m.variant === "siege") || this.nearest(s, ms, s.range);
      }
      if (!target) target = this.nearest(s, this.heroes.filter((h) => h.team !== s.team && !h.dead), s.range);
      if (target) {
        if (s.curTarget === target && target.kind === "hero") s.heat = Math.min(4, (s.heat || 0) + 1);
        else { s.curTarget = target; s.heat = 0; }
        s.atkCd = 1.05;
        const baseDmg = target.kind === "hero" ? 120 * (1 + s.heat * 0.35) : 85;
        this.projs.push({ homing: target, x: s.x, y: s.y - (s.kind === "base" ? 95 : 68), speed: 760, dmg: Math.round(baseDmg), dmgType: "phys", crit: s.heat >= 2, team: s.team, owner: s, r: 9, color: target.kind === "hero" ? "#ff5252" : "#fff176", life: 3 });
      }
    }
    updateProjs(dt) {
      for (const p of this.projs) {
        if (p.delay > 0) { p.delay = Math.max(0, p.delay - dt); continue; }
        if (p.homing) {
          const t = p.homing; if (t.dead || t.hp <= 0) { p.dead = true; continue; }
          const n = norm(t.x - p.x, t.y - 12 - p.y); p.x += n.x * p.speed * dt; p.y += n.y * p.speed * dt; p.life -= dt;
          if (p.life <= 0) p.dead = true;
          if (Math.hypot(p.x - t.x, p.y - (t.y - 12)) < t.r + p.r) {
            this.damage(p.owner, t, p.dmg, p.crit, p.dmgType || "phys", p.tag || "direct", p.castId);
            if (p.arcaneBonus && !t.dead) { this.damage(p.owner, t, p.arcaneBonus, false, "magic", "skill", p.castId); this.ring(t.x, t.y, 34, "#ce93d8"); }
            if (p.refundSkill !== undefined && p.owner && p.owner.def.id === "lumi" && (t.kind === "hero" || t.kind === "minion")) {
              p.owner.cds[p.refundSkill] = Math.max(0, p.owner.cds[p.refundSkill] - (p.refundAmount || 1));
              this.text(p.owner.x, p.owner.y - 48, "S1 -1s", "#a5d6a7");
            }
            if (p.kind === "note") this.burst(t.x, t.y - 14, "#f48fb1", 4, 80, "♪");
            p.dead = true;
          }
        } else {
          p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
          if (p.life <= 0) { p.dead = true; continue; }
          if (p.kind === "wave") for (const h of this.heroes) if (h.team !== p.team && !h.dead && dist(p, h) < p.r + 160) {
            if (h.inBush && h.revealT <= 0.2) this.text(h.x, h.y - 64, "👁️ REVEALED!", "#80deea");
            h.revealT = Math.max(h.revealT, p.reveal || 3.5);
          }
          for (const e of this.enemiesOf(p.team, true)) {
            if (p.hit.has(e)) continue;
            if (Math.hypot(p.x - e.x, p.y - (e.y - 10)) < p.r + e.r + 6) {
              if (p.kind === "hook") {
                if (e.kind === "tower" || e.kind === "base") { p.dead = true; break; }
                this.damage(p.owner, e, p.dmg, false, p.dmgType, p.tag || "direct", p.castId); this.cc(e, { root: p.root }, p.owner);
                this.burst(e.x, e.y - 12, "#8d6e63", 8, 120, "🌿");
                const dFull = dist(e, p.owner), pullDist = Math.min(p.pull, Math.max(0, dFull - 85)), pullDir = norm(p.owner.x - e.x, p.owner.y - e.y);
                e.x = clamp(e.x + pullDir.x * pullDist, 40, W - 40); e.y = clamp(e.y + pullDir.y * pullDist, LANE_TOP + 22, LANE_BOT - 10);
                p.dead = true; break;
              }
              p.hit.add(e); this.damage(p.owner, e, p.dmg, p.crit, p.dmgType || "magic", p.tag || "direct", p.castId);
              this.cc(e, { stun: p.stun, root: p.root, slow: p.slow, reveal: p.reveal }, p.owner);
              if (p.staticStack) this.applyStatic(p.owner, e, p.staticStack);
              if (p.refundSkill !== undefined && p.owner.def.id === "lumi" && (e.kind === "hero" || e.kind === "minion")) {
                p.owner.cds[p.refundSkill] = Math.max(0, p.owner.cds[p.refundSkill] - (p.refundAmount || 1));
                this.text(p.owner.x, p.owner.y - 48, "S1 -1s", "#a5d6a7");
              }
              if (p.refundHero && e.kind === "hero" && p.skillIdx !== undefined) p.owner.cds[p.skillIdx] = Math.max(0, p.owner.cds[p.skillIdx] - p.refundHero);
              if (p.pierce && p.falloff && p.falloff < 1) p.dmg = Math.round(p.dmg * p.falloff);
              if (!p.pierce) { p.dead = true; break; }
            }
          }
        }
      }
    }
    updateFx(dt) {
      for (const f of this.fx) { f.t -= dt; if (f.type === "text") f.y -= 44 * dt; }
      for (const pt of this.particles) { pt.t -= dt; pt.x += pt.vx * dt; pt.y += pt.vy * dt; }
      this.fx = this.fx.filter((f) => f.t > 0); this.particles = this.particles.filter((pt) => pt.t > 0);
    }
    finish(quit) {
      const res = this.buildResult(quit); this.onEnd(res);
    }
    /* v6.7: quitting a match shows the scoreboard as a DEFEAT (no coins / XP) instead of dropping straight back to the lobby. */
    forfeit() {
      if (this.ended || this.practice || this.stopped) return false;
      const quit = !this.over;               // the match was already decided (end-of-game timer running): show the real result
      this.ended = true; this.over = true; this.paused = false; if (quit) this.winner = 1;
      Sound.silence();
      this.finish(quit); return true;
    }
    buildResult(quit) {
      const players = this.heroes.map((h) => ({
        name: h.name, hero: h.def.name, emoji: h.def.emoji, team: h.team, k: h.k, d: h.d, a: h.a,
        cs: h.cs, gold: Math.round(h.goldEarned), dmg: h.heroDmg, taken: h.dmgTaken, heal: h.healing, twr: h.twrKill, isPlayer: h.isPlayer,
        score: mvpScore(h), mvp: false,
      }));
      for (const t of [0, 1]) {                                                    // v5.9: best score on each team is its MVP
        const top = players.filter((p) => p.team === t).sort((a, b) => b.score - a.score || b.k - a.k)[0];
        if (top) top.mvp = true;
      }
      return { win: quit ? false : this.winner === 0, quit: !!quit, mode: this.mode, time: this.time, players };
    }

    /* ---------- 2.5D RENDERING ---------- */
    resize() { const dpr = Math.min(2, window.devicePixelRatio || 1); this.canvas.width = Math.floor(window.innerWidth * dpr); this.canvas.height = Math.floor(window.innerHeight * dpr); }
    bar(c, x, y, w, frac, color, lv) {
      c.fillStyle = "#000c"; c.fillRect(x - w / 2 - 1, y - 1, w + 2, 9);
      c.fillStyle = color; c.fillRect(x - w / 2, y, w * Math.max(0, frac), 7);
      if (lv) { c.font = "bold 10px sans-serif"; c.fillStyle = "#ffd54f"; c.strokeStyle = "#000"; c.lineWidth = 3; c.textAlign = "right"; c.strokeText("L" + lv, x - w / 2 - 3, y + 4); c.fillText("L" + lv, x - w / 2 - 3, y + 4); c.textAlign = "center"; }
    }
    drawBackdrop(c, vw) {
      const sky = c.createLinearGradient(0, CAM_TOP - 20, 0, LANE_TOP); sky.addColorStop(0, "#5db7de"); sky.addColorStop(0.65, "#bce4f4"); sky.addColorStop(1, "#e6f2d8");
      c.fillStyle = sky; c.fillRect(this.camX - 20, CAM_TOP - 20, vw + 40, LANE_TOP - CAM_TOP + 20);
      c.save(); const px = this.camX * 0.65; c.fillStyle = "#957c68";
      for (const pk of this.peaks) {
        const x = pk.x + px; if (x + pk.w < this.camX - 100 || x - pk.w > this.camX + vw + 100) continue;
        c.beginPath(); c.moveTo(x - pk.w * 0.6, LANE_TOP); c.lineTo(x - pk.w * 0.15, LANE_TOP - pk.backH); c.lineTo(x + pk.w * 0.2, LANE_TOP - pk.backH * 0.85); c.lineTo(x + pk.w * 0.65, LANE_TOP); c.closePath(); c.fill();
      }
      c.restore();
      const cliff = c.createLinearGradient(0, LANE_TOP - 100, 0, LANE_TOP); cliff.addColorStop(0, "#7c5f4b"); cliff.addColorStop(0.6, "#5b4232"); cliff.addColorStop(1, "#3b2a20");
      for (const pk of this.peaks) {
        if (pk.x + pk.w < this.camX - 120 || pk.x - pk.w > this.camX + vw + 120) continue;
        c.fillStyle = cliff; c.beginPath(); c.moveTo(pk.x - pk.w * 0.55, LANE_TOP); c.lineTo(pk.x - pk.w * 0.35, LANE_TOP - pk.h); c.lineTo(pk.x + pk.w * 0.1, LANE_TOP - pk.h * 0.92); c.lineTo(pk.x + pk.w * 0.45, LANE_TOP - pk.h * 0.55); c.lineTo(pk.x + pk.w * 0.6, LANE_TOP); c.closePath(); c.fill();
      }
      const floor = c.createLinearGradient(0, LANE_TOP, 0, VIEW_H); floor.addColorStop(0, "#8f8394"); floor.addColorStop(0.25, "#a99fb0"); floor.addColorStop(0.85, "#9c90a2"); floor.addColorStop(1, "#6f6475");
      c.fillStyle = floor; c.fillRect(this.camX - 20, LANE_TOP, vw + 40, VIEW_H - LANE_TOP);
      c.fillStyle = "rgba(20,12,18,0.35)"; c.fillRect(this.camX - 20, LANE_TOP, vw + 40, 14);
      c.strokeStyle = "rgba(50,40,60,0.16)"; c.lineWidth = 2;
      for (let x = Math.floor((this.camX - 40) / 160) * 160; x < this.camX + vw + 80; x += 160) { c.beginPath(); c.moveTo(x, LANE_TOP); c.lineTo(x - 36, VIEW_H); c.stroke(); }
      if (!lowGfx) for (const st of this.stones) { if (st.x < this.camX - 40 || st.x > this.camX + vw + 40) continue; c.fillStyle = st.c; c.beginPath(); c.ellipse(st.x, st.y, st.rx, st.ry, 0, 0, 6.283); c.fill(); }

      for (const b of this.bushes) {   // v6.6: only the ground footprint here - the bush art itself is drawn depth-sorted in drawBush()
        if (b.x + b.r < this.camX - 50 || b.x - b.r > this.camX + vw + 50) continue;
        const playerIn = !this.player.dead && dist(this.player, b) <= b.r;
        c.save(); c.translate(b.x, b.y + 4); c.scale(1, 0.5); c.fillStyle = "rgba(20,50,25,0.28)"; c.beginPath(); c.arc(0, 0, b.r * 0.95, 0, 6.283); c.fill();
        if (playerIn) { c.strokeStyle = "#aed581"; c.lineWidth = 4; c.stroke(); }
        c.restore();
      }
      c.setLineDash([16, 14]); c.strokeStyle = "rgba(255,255,255,0.28)"; c.lineWidth = 3; c.beginPath(); c.moveTo(W / 2, LANE_TOP + 10); c.lineTo(W / 2, LANE_BOT); c.stroke(); c.setLineDash([]);
      for (let t = 0; t < 2; t++) {   // v6.6: the fountain pad (where heroes actually heal) - behind the base turret, not around it
        const f = this.fountainPos(t);
        c.save(); c.beginPath(); c.ellipse(f.x, f.y, FOUNT_RX, FOUNT_RY, 0, 0, 6.283);
        c.fillStyle = TEAM_COL[t] + "40"; c.fill(); c.setLineDash([14, 10]); c.strokeStyle = TEAM_COL[t] + "cc"; c.lineWidth = 4; c.stroke(); c.setLineDash([]);
        c.font = "bold 12px sans-serif"; c.textAlign = "center"; c.fillStyle = TEAM_COL[t] + "cc"; c.fillText("FOUNTAIN", f.x, f.y + 175); c.restore();
      }
      if (this.ping) {
        c.save(); c.translate(this.ping.x, this.ping.y + 6); c.scale(1, 0.5);
        c.beginPath(); c.arc(0, 0, 48 + Math.sin(this.time * 10) * 10, 0, 6.283);
        c.strokeStyle = "#ffd54f"; c.lineWidth = 4; c.stroke(); c.restore();
      }
    }
    /* Geometry of the skill being aimed, mirroring exactly what castSkill() will do (same dir / aimPoint / range sources). */
    aimGeometry(h, i) {
      const s = h.def.skills[i]; if (!s) return null;
      const st = this.skillStats(h, i), kind = AIM_KIND[s.type] || "self";
      const drag = aim.drag ? { x: aim.dx, y: aim.dy, frac: Math.max(aim.frac, 0.25) } : null;
      if (kind === "line") {
        const mover = s.type === "dash" || s.type === "windstep";
        const dir = drag ? norm(drag.x, drag.y) : mover && !s.dmg ? { x: h.face.x, y: h.face.y } : this.aimDir(h, (st.range || st.dist || st.radius || 500) + 120);
        const len = s.type === "beam" ? (s.range || 2600) : mover ? st.dist : st.range;
        const width = s.type === "beam" ? (st.width || 50) : mover ? Math.max(50, h.r * 2) : Math.max(24, (st.r || 14) * 2);
        return { kind, dir, len: len || 420, width };
      }
      if (kind === "ground") {
        const range = s.type === "leap" ? st.dist : (s.range || 520);
        return { kind, range, pt: this.aimPoint(h, range, drag), radius: st.radius || 100 };
      }
      const r = s.type === "death_mark" || s.type === "chain" ? st.range : s.type === "phoenix" || s.type === "kings_prot" || s.type === "team_anthem" ? (s.radius || 260) : (st.radius || 80);
      return { kind: "self", r: r || 80 };
    }
    drawAim(c, p) {
      if (!aim.active || p.dead) return;
      if (aim.cancel) { c.save(); c.font = "900 30px sans-serif"; c.textAlign = "center"; c.fillStyle = "#ef5350"; c.strokeStyle = "#000"; c.lineWidth = 5; c.strokeText("✕", p.x, p.y - 62); c.fillText("✕", p.x, p.y - 62); c.restore(); return; }
      const g = this.aimGeometry(p, aim.slot); if (!g) return;
      const pulse = 0.5 + 0.5 * Math.sin(this.time * 8), live = aim.drag ? 1 : 0.6, fy = p.y + 6;
      const flat = (x, y, r, k) => { c.save(); c.translate(x, y); c.scale(1, k); c.beginPath(); c.arc(0, 0, r, 0, 6.283); c.restore(); };
      c.save();
      if (g.kind === "self") {
        flat(p.x, fy, g.r, DECAL_K); c.fillStyle = "rgba(128,216,255,0.14)"; c.globalAlpha = live; c.fill();
        c.strokeStyle = "#80d8ff"; c.lineWidth = 3; c.setLineDash([14, 9]); c.stroke(); c.setLineDash([]);
      } else if (g.kind === "ground") {
        // reach: the ellipse the target point can actually be dragged within (same y*0.65 mapping as aimPoint)
        flat(p.x, fy, g.range, REACH_K); c.strokeStyle = "rgba(128,216,255,0.5)"; c.lineWidth = 2; c.setLineDash([10, 10]); c.stroke(); c.setLineDash([]);
        c.strokeStyle = "rgba(128,216,255,0.45)"; c.lineWidth = 2; c.setLineDash([4, 8]); c.beginPath(); c.moveTo(p.x, fy); c.lineTo(g.pt.x, g.pt.y + 6); c.stroke(); c.setLineDash([]);
        // predicted impact decal: same flattened footprint the hazard will have once cast
        c.globalAlpha = live; flat(g.pt.x, g.pt.y + 6, g.radius, DECAL_K);
        c.fillStyle = "rgba(128,216,255," + (0.2 + pulse * 0.08) + ")"; c.fill(); c.strokeStyle = "#80d8ff"; c.lineWidth = 4; c.stroke();
        flat(g.pt.x, g.pt.y + 6, g.radius * 0.18, DECAL_K); c.fillStyle = "#e0f7ff"; c.fill();
      } else {
        const d = g.dir, nx = -d.y, ny = d.x, hw = g.width / 2, x0 = p.x, y0 = fy, x1 = x0 + d.x * g.len, y1 = y0 + d.y * g.len;
        const grd = c.createLinearGradient(x0, y0, x1, y1); grd.addColorStop(0, "rgba(128,216,255,0.42)"); grd.addColorStop(1, "rgba(128,216,255,0.16)");
        c.globalAlpha = live; c.fillStyle = grd; c.beginPath();
        c.moveTo(x0 + nx * hw, y0 + ny * hw); c.lineTo(x1 + nx * hw, y1 + ny * hw); c.lineTo(x1 - nx * hw, y1 - ny * hw); c.lineTo(x0 - nx * hw, y0 - ny * hw); c.closePath(); c.fill();
        c.strokeStyle = "rgba(160,225,255,0.9)"; c.lineWidth = 2.5; c.stroke();
        c.beginPath(); c.arc(x1, y1, hw, 0, 6.283); c.fillStyle = "rgba(128,216,255,0.25)"; c.fill(); c.stroke();   // landing / end cap
        c.fillStyle = "rgba(255,255,255,0.4)";
        const ch = Math.min(hw * 0.6, 18);
        for (let t = 70; t < g.len - 20; t += 90) {
          const cx = x0 + d.x * t, cy = y0 + d.y * t;
          c.beginPath(); c.moveTo(cx + d.x * ch, cy + d.y * ch); c.lineTo(cx - d.x * ch * 0.5 + nx * ch, cy - d.y * ch * 0.5 + ny * ch); c.lineTo(cx - d.x * ch * 0.5 - nx * ch, cy - d.y * ch * 0.5 - ny * ch); c.closePath(); c.fill();
        }
      }
      c.restore();
    }
    drawHazards(c) {
      for (const z of this.hazards) {
        if (["gravity", "frost_prison", "collapse", "barrage", "storm", "rex_slam"].includes(z.kind)) {
          c.save(); c.translate(z.x, z.y + 6); c.scale(1, 0.5);
          const col = z.kind === "rex_slam" ? "#ffb74d" : z.kind === "frost_prison" ? "#80deea" : z.kind === "collapse" ? "#ce93d8" : z.kind === "barrage" ? "#a5d6a7" : z.kind === "storm" ? "#ffee58" : "#26c6da";
          c.beginPath(); c.arc(0, 0, z.r, 0, 6.283); c.fillStyle = col + "33"; c.fill(); c.strokeStyle = col; c.lineWidth = 4; c.stroke();
          if (z.delay > 0) { c.beginPath(); c.arc(0, 0, z.r * (1 - z.delay / (z.maxDelay || 0.5)), 0, 6.283); c.strokeStyle = "#fff"; c.lineWidth = 3; c.stroke(); }
          c.restore();
        } else if (z.kind === "rex_aura") {
          c.save(); c.translate(z.x, z.y + 6); c.scale(1, 0.5);
          const fade = Math.min(1, z.dur / 0.6), pulse = 1 + Math.sin(this.time * 5) * 0.015;
          c.globalAlpha = fade; c.beginPath(); c.arc(0, 0, z.r * pulse, 0, 6.283); c.fillStyle = "rgba(255,213,79,0.14)"; c.fill();
          c.strokeStyle = "#ffd54f"; c.lineWidth = 4; c.setLineDash([16, 10]); c.lineDashOffset = -this.time * 30; c.stroke(); c.setLineDash([]); c.restore();
        } else if (z.kind === "vortex") {
          c.save(); c.translate(z.x, z.y + 6); c.scale(1, 0.5); c.beginPath(); c.arc(0, 0, z.r, 0, 6.283);
          c.fillStyle = "rgba(244,143,177,0.22)"; c.fill(); c.strokeStyle = "#f48fb1"; c.lineWidth = 4; c.stroke(); c.restore();
        } else if (z.kind === "root_burst") {
          c.save(); c.translate(z.x, z.y + 6); c.scale(1, 0.5);
          if (z.delay > 0) {
            c.beginPath(); c.arc(0, 0, z.r, 0, 6.283); c.fillStyle = "rgba(121,85,72,0.18)"; c.fill();
            c.strokeStyle = "#a1887f"; c.lineWidth = 4; c.setLineDash([12, 8]); c.stroke(); c.setLineDash([]);
            c.beginPath(); c.arc(0, 0, z.r * (1 - z.delay / z.maxDelay), 0, 6.283); c.strokeStyle = "#8bc34a"; c.lineWidth = 5; c.stroke();
          } else {
            c.globalAlpha = clamp(z.dur / 0.65, 0, 1); c.beginPath(); c.arc(0, 0, z.r, 0, 6.283);
            c.fillStyle = "rgba(109,76,65,0.3)"; c.fill(); c.strokeStyle = "#8bc34a"; c.lineWidth = 5; c.stroke();
          }
          c.restore();
        } else if (z.kind === "death_mark" && !z.target.dead) {
          c.save(); c.strokeStyle = "#ef5350"; c.lineWidth = 4;
          c.beginPath(); c.arc(z.target.x, z.target.y - 20, 34 * (z.delay / z.maxDelay) + 14, 0, 6.283); c.stroke(); c.restore();
        } else if (z.kind === "beam") {
          const ex = z.x + z.dx * z.range, ey = z.y + z.dy * z.range;
          c.save(); c.lineCap = "round";
          if (z.delay > 0) { c.setLineDash([18, 12]); c.strokeStyle = "rgba(128,222,234,0.82)"; c.lineWidth = 4; c.beginPath(); c.moveTo(z.x, z.y); c.lineTo(ex, ey); c.stroke(); }
          else { c.globalAlpha = clamp(z.dur / 0.36, 0, 1); c.strokeStyle = "#26c6da"; c.lineWidth = z.width; c.beginPath(); c.moveTo(z.x, z.y); c.lineTo(ex, ey); c.stroke(); c.strokeStyle = "#e0f7fa"; c.lineWidth = z.width * 0.42; c.stroke(); }
          c.restore();
        }
      }
    }
    drawProjs(c, x0, x1) {
      for (const pr of this.projs) {
        if (pr.x < x0 || pr.x > x1) continue;
        if (pr.kind === "wave" || pr.kind === "sand_wave") {
          c.save(); c.translate(pr.x, pr.y); c.rotate(pr.ang); c.beginPath(); c.arc(0, 0, pr.r, -1.0, 1.0);
          c.strokeStyle = pr.kind === "wave" ? "#26c6da" : "#c49048"; c.lineWidth = 14; c.lineCap = "round"; c.stroke();
          c.strokeStyle = pr.kind === "wave" ? "#e0f7fa" : "#ffe0b2"; c.lineWidth = 5; c.stroke(); c.restore();
        } else if (pr.kind === "hook") {
          c.save(); c.strokeStyle = "#6d4c41"; c.lineWidth = 5; c.setLineDash([10, 4]);
          c.beginPath(); c.moveTo(pr.owner.x, pr.owner.y - 14); c.lineTo(pr.x, pr.y); c.stroke(); c.setLineDash([]);
          c.translate(pr.x, pr.y); c.rotate(pr.ang); c.strokeStyle = "#5d4037"; c.fillStyle = "#8d6e63"; c.lineWidth = 4;
          c.beginPath(); c.arc(0, 0, 14, -1.8, 1.8); c.lineTo(18, 0); c.closePath(); c.fill(); c.stroke(); c.restore();
        } else if (pr.kind === "note") {
          c.save(); c.font = (pr.big ? "28px" : "22px") + " serif"; c.fillStyle = pr.color; c.strokeStyle = "#000"; c.lineWidth = 3;
          c.strokeText("♪", pr.x, pr.y); c.fillText("♪", pr.x, pr.y); c.restore();
        } else {
          c.beginPath(); c.arc(pr.x, pr.y, pr.r, 0, 6.283); c.fillStyle = pr.color; c.fill();
          if (pr.big) { c.strokeStyle = "#fff"; c.lineWidth = 3; c.stroke(); }
        }
      }
    }
    render() {
      const cv = this.canvas, c = this.ctx, sc = cv.height / CAM_H, vw = cv.width / sc, p = this.player;
      this.vwW = vw; this.scW = sc;
      const free = this.panActive || performance.now() < this.panUntil, maxX = Math.max(0, W - vw);
      this.camX += ((free ? clamp(this.freeX, 0, maxX) : clamp(p.x - vw / 2, 0, maxX)) - this.camX) * (this.panActive ? 0.5 : 0.2);
      c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = "#5db7de"; c.fillRect(0, 0, cv.width, cv.height);
      c.setTransform(sc, 0, 0, sc, -this.camX * sc, -CAM_TOP * sc);

      this.drawBackdrop(c, vw); this.drawAim(c, p); this.drawHazards(c);
      const x0 = this.camX - 180, x1 = this.camX + vw + 180, drawList = [];
      for (const s of this.structs) if (s.x >= x0 && s.x <= x1) drawList.push(s);
      for (const d of this.bushDraw) if (d.x >= x0 && d.x <= x1) drawList.push(d);
      for (const m of this.minions) if (!m.dead && m.x >= x0 && m.x <= x1) drawList.push(m);
      for (const h of this.heroes) if (h.x >= x0 && h.x <= x1 && ((!h.dead && !this.isHiddenFrom(h, 0)) || (h.dead && this.deathVisible(h)))) drawList.push(h);
      drawList.sort((a, b) => a.y - b.y);
      c.textAlign = "center"; c.textBaseline = "middle";
      for (const u of drawList) {
        if (u.kind === "bush") this.drawBush(c, u);
        else if (u.kind === "base" || u.kind === "tower") this.drawStruct(c, u, p);
        else if (u.kind === "minion") this.drawMinion(c, u);
        else if (u.dead) this.drawDeadSprite(c, u);
        else this.drawHero(c, u);
      }
      for (const hh of this.heroes) if (hh.chan && !hh.dead) {
        const ch = hh.chan, pulse = 0.5 + 0.5 * Math.sin(this.time * 9);
        c.save(); c.translate(ch.cx, ch.cy + 8); c.scale(1, 0.5);
        c.beginPath(); c.arc(0, 0, ch.r, 0, 6.283); c.fillStyle = "rgba(206,147,216," + (0.14 + 0.08 * pulse) + ")"; c.fill();
        c.strokeStyle = "#ce93d8"; c.lineWidth = 4; c.stroke();
        c.beginPath(); c.arc(0, 0, ch.r * clamp(ch.t / ch.dur, 0, 1), 0, 6.283); c.strokeStyle = "#fff"; c.lineWidth = 3; c.stroke();
        c.rotate(this.time * 0.8); c.beginPath(); c.arc(0, 0, ch.r * 0.62, 0, 6.283); c.setLineDash([14, 12]); c.strokeStyle = "#e1bee7"; c.lineWidth = 2; c.stroke(); c.setLineDash([]);
        c.restore();
      }
      this.drawProjs(c, x0, x1);
      for (const pt of this.particles) {
        if (pt.x < x0 || pt.x > x1) continue;
        c.save(); c.globalAlpha = clamp(pt.t / pt.max, 0, 1);
        if (pt.glyph) { c.font = "16px serif"; c.fillText(pt.glyph, pt.x, pt.y); }
        else { c.fillStyle = pt.color; c.beginPath(); c.arc(pt.x, pt.y, pt.r, 0, 6.283); c.fill(); }
        c.restore();
      }
      for (const f of this.fx) {
        const a = Math.max(0, f.t / f.max);
        if (f.type === "ring") {
          c.save(); c.globalAlpha = a; c.translate(f.x, f.y + 8); c.scale(1, 0.48); c.beginPath(); c.arc(0, 0, f.r * (1.12 - a * 0.35), 0, 6.283);
          c.strokeStyle = f.color; c.lineWidth = 6; c.stroke(); c.fillStyle = f.color + "33"; c.fill(); c.restore();
        } else if (f.type === "slash") {
          c.save(); c.globalAlpha = a; c.translate(f.x, f.y); c.rotate(f.angle); c.beginPath(); c.arc(0, 0, f.r * 0.72, -0.95, 0.95);
          c.strokeStyle = f.color; c.lineWidth = f.big ? 13 : 8; c.lineCap = "round"; c.stroke(); c.strokeStyle = "#fff"; c.lineWidth = f.big ? 4 : 2; c.stroke(); c.restore();
        } else if (f.type === "bolt") {
          c.save(); c.globalAlpha = a; c.strokeStyle = f.color; c.lineWidth = 5; c.beginPath();
          f.pts.forEach((pt, idx) => (idx ? c.lineTo(pt.x, pt.y) : c.moveTo(pt.x, pt.y))); c.stroke(); c.restore();
        } else {
          c.globalAlpha = a; c.font = "900 20px sans-serif"; c.fillStyle = f.color; c.strokeStyle = "#000"; c.lineWidth = 4;
          c.strokeText(f.text, f.x, f.y); c.fillText(f.text, f.x, f.y); c.globalAlpha = 1;
        }
      }
      this.renderMini(vw);
    }
    // v6.6: bush artwork (props/bush.webp). Gameplay is unchanged - hiding still uses b.x / b.y / b.r in update().
    // The bush is depth-sorted with heroes (units behind it are covered, units in front overlap it) and turns see-through
    // while one of YOUR heroes is inside, so you can still see yourself. Falls back to the old drawn blobs if the image is not ready.
    drawBush(c, d) {
      const b = d.b, im = getStructImg("bush"), inside = (h) => !h.dead && h.team === 0 && Math.hypot(h.x - b.x, (h.y - b.y) * 1.35) <= b.r * 0.85;
      const friendIn = this.heroes.some(inside);
      if (!im) {
        const sway = Math.sin(this.time * 2.2) * 3;
        for (const [ox, oy, pr, col] of [[-34,-4,24,"#1b5e20"],[34,-4,24,"#1b5e20"],[-18,-14,27,"#2e7d32"],[18,-14,27,"#2e7d32"],[0,-18,30,"#388e3c"],[-24,5,22,"#43a047"],[24,5,22,"#43a047"],[0,6,25,"#4caf50"]]) {
          c.fillStyle = col; c.globalAlpha = friendIn ? 0.55 : 1; c.beginPath(); c.arc(b.x + ox + sway * 0.4, b.y + oy, pr, 0, 6.283); c.fill();
        }
        c.globalAlpha = 1;
      } else {
        const dw = b.r * 2.3, dh = dw * im.naturalHeight / im.naturalWidth, sway = Math.sin(this.time * 1.6 + b.x * 0.01) * 0.012;
        c.save(); c.globalAlpha = friendIn ? 0.55 : 1;
        c.translate(b.x, b.y + dh * 0.3); c.rotate(sway);   // pivot at the base so the leaves sway gently
        c.drawImage(im, -dw / 2, -dh, dw, dh); c.restore();
      }
      if (!this.player.dead && dist(this.player, b) <= b.r) { c.font = "bold 11px sans-serif"; c.lineWidth = 3; c.strokeStyle = "#000a"; c.fillStyle = "#c5e1a5"; c.textAlign = "center"; c.strokeText("HIDDEN IN BUSH", b.x, b.y + 30); c.fillText("HIDDEN IN BUSH", b.x, b.y + 30); }
    }
    drawShadow(c, x, y, rx, ry) { if (lowGfx) return; c.fillStyle = "rgba(0,0,0,0.38)"; c.beginPath(); c.ellipse(x, y + 6, rx, ry, 0, 0, 6.283); c.fill(); }
    // v6.5: sprite version of a tower / inhibitor tower / base. Returns false (-> old drawn shapes) until the image is ready.
    drawStructSprite(c, s, p) {
      const isBase = s.kind === "base", key = (isBase ? "base_" : "tower_") + (s.team ? "red" : "blue");
      const im = getStructImg(key); if (!im) return false;
      const dh = isBase ? 200 : s.tier === "Inhibitor" ? 164 : 150, dw = dh * im.naturalWidth / im.naturalHeight;
      const col = TEAM_COL[s.team], x = s.x - dw / 2, y = s.y + 14 - dh, attacking = !!s.curTarget;
      this.drawShadow(c, s.x, s.y, s.r * 1.2, s.r * 0.5);
      if (dist(p, s) < s.range + 220) {   // range ring (red when it is locked on the player)
        const targetingPlayer = s.curTarget === p;
        c.save(); c.translate(s.x, s.y + 4); c.scale(1, 0.45); c.beginPath(); c.arc(0, 0, s.range, 0, 6.283);
        c.strokeStyle = targetingPlayer ? "#ff5252cc" : col + "55"; c.lineWidth = targetingPlayer ? 4 : 3; c.stroke(); c.restore();
      }
      c.save(); c.translate(s.x, s.y + 8); c.scale(1, 0.4); c.beginPath(); c.arc(0, 0, dw * 0.46, 0, 6.283); c.fillStyle = col + (attacking ? "44" : "26"); c.fill(); c.restore();   // team-coloured ground glow
      c.save();
      if (!lowGfx) { c.shadowColor = col; c.shadowBlur = attacking ? 30 + Math.sin(this.time * 9) * 6 : 16; }
      c.drawImage(im, x, y, dw, dh); c.restore();
      if (s.hitFlash > 0) { const fl = getFlashImg(key, im); if (fl) { c.save(); c.globalAlpha = 0.7; c.drawImage(fl, x, y, dw, dh); c.restore(); } }
      if (s.tier === "Inhibitor") { c.textAlign = "center"; c.font = "bold 13px sans-serif"; c.lineWidth = 3; c.strokeStyle = "#000c"; c.fillStyle = "#fff"; c.strokeText("INHIBITOR", s.x, s.y + 30); c.fillText("INHIBITOR", s.x, s.y + 30); }
      if (!this.targetable(s)) { c.strokeStyle = "#ffffffaa"; c.lineWidth = 3; c.beginPath(); c.ellipse(s.x, y + dh * 0.5, Math.max(s.r + 8, dw * 0.45), dh * 0.55, 0, 0, 6.283); c.stroke(); }
      this.bar(c, s.x, y - 10, s.r * 2.1, s.hp / s.maxhp, col);
      return true;
    }
    drawStruct(c, s, p) {
      if (s.dead) { this.drawShadow(c, s.x, s.y, s.r * 0.9, s.r * 0.35); c.font = "48px serif"; c.fillText("🔥", s.x, s.y - 14); return; }
      if (this.drawStructSprite(c, s, p)) return;
      if (s.tier === "Inhibitor") {
        this.drawShadow(c, s.x, s.y, s.r * 1.2, s.r * 0.5);
        if (dist(p, s) < s.range + 220) { c.save(); c.translate(s.x, s.y + 4); c.scale(1, 0.45); c.beginPath(); c.arc(0, 0, s.range, 0, 6.283); c.strokeStyle = s.curTarget === p ? "#ff5252cc" : TEAM_COL[s.team] + "55"; c.lineWidth = s.curTarget === p ? 4 : 3; c.stroke(); c.restore(); }
        const col = TEAM_COL[s.team], cy = s.y - 66 + Math.sin(this.time * 2.5) * 4;
        c.fillStyle = "#1c2438"; c.strokeStyle = "#000a"; c.lineWidth = 3;
        c.beginPath(); c.ellipse(s.x, s.y - 4, s.r * 1.05, s.r * 0.45, 0, 0, 6.283); c.fill(); c.stroke();
        c.save(); c.shadowColor = col; c.shadowBlur = lowGfx ? 0 : 26; c.fillStyle = s.hitFlash > 0 ? "#fff" : col; c.strokeStyle = "#fff"; c.lineWidth = 3;
        c.beginPath(); c.moveTo(s.x, cy - 52); c.lineTo(s.x + 28, cy); c.lineTo(s.x, cy + 52); c.lineTo(s.x - 28, cy); c.closePath(); c.fill(); c.stroke(); c.restore();
        c.textAlign = "center"; c.fillStyle = "#fff"; c.font = "bold 14px sans-serif"; c.fillText("INHIBITOR", s.x, s.y + 22);
        if (!this.targetable(s)) { c.strokeStyle = "#ffffffaa"; c.lineWidth = 3; c.beginPath(); c.arc(s.x, cy, 48, 0, 6.283); c.stroke(); }
        this.bar(c, s.x, s.y - 140, s.r * 2.1, s.hp / s.maxhp, col); return;
      }
      const isBase = s.kind === "base", h = isBase ? 128 : 94;
      this.drawShadow(c, s.x, s.y, s.r * 1.15, s.r * 0.45);
      if (dist(p, s) < s.range + 220) {
        const targetingPlayer = s.curTarget === p;
        c.save(); c.translate(s.x, s.y + 4); c.scale(1, 0.45); c.beginPath(); c.arc(0, 0, s.range, 0, 6.283);
        c.strokeStyle = targetingPlayer ? "#ff5252cc" : TEAM_COL[s.team] + "55"; c.lineWidth = targetingPlayer ? 4 : 3; c.stroke(); c.restore();
      }
      c.fillStyle = s.hitFlash > 0 ? "#fff" : s.team ? "#693535" : "#2f4e78"; c.strokeStyle = "#221a16"; c.lineWidth = 3;
      c.beginPath(); c.moveTo(s.x - s.r * 0.72, s.y); c.lineTo(s.x - s.r * 0.5, s.y - h); c.lineTo(s.x + s.r * 0.5, s.y - h); c.lineTo(s.x + s.r * 0.72, s.y); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = TEAM_COL[s.team]; c.beginPath(); c.arc(s.x, s.y - h + 16, isBase ? 26 : 16, 0, 6.283); c.fill(); c.strokeStyle = "#fff"; c.lineWidth = 2; c.stroke();
      c.font = (isBase ? 54 : 38) + "px serif"; c.fillText(isBase ? "⛩️" : "🗼", s.x, s.y - h * 0.45);
      if (!this.targetable(s)) { c.strokeStyle = "#ffffffaa"; c.lineWidth = 3; c.beginPath(); c.arc(s.x, s.y - h * 0.5, s.r + 8, 0, 6.283); c.stroke(); }
      this.bar(c, s.x, s.y - h - 22, s.r * 2.1, s.hp / s.maxhp, TEAM_COL[s.team]);
    }
    drawMinion(c, m) {
      if (m.practiceDummy) {
        this.drawShadow(c, m.x, m.y, 30, 12);
        c.beginPath(); c.arc(m.x, m.y - 26, m.r, 0, 6.283); c.fillStyle = m.hitFlash > 0 ? "#fff" : "#ffb74d"; c.fill();
        c.lineWidth = 3; c.strokeStyle = "#fff"; c.stroke(); c.font = "30px serif"; c.fillText("🎯", m.x, m.y - 25);
        c.font = "bold 11px sans-serif"; c.fillStyle = "#ffe082"; c.strokeStyle = "#000"; c.lineWidth = 3;
        c.strokeText("DAMAGE BOT", m.x, m.y - 62); c.fillText("DAMAGE BOT", m.x, m.y - 62);
        return;
      }
      this.drawShadow(c, m.x, m.y, 16, 7);
      const mLift = this.airLift(m); if (mLift > 0) { c.save(); c.translate(0, -mLift); }
      const bob = Math.sin(this.time * 9 + m.x * 0.05) * 2;
      c.beginPath(); c.arc(m.x, m.y - 14 + bob, m.r, 0, 6.283); c.fillStyle = m.hitFlash > 0 ? "#fff" : TEAM_COL[m.team]; c.fill();
      c.lineWidth = 2; c.strokeStyle = m.variant === "siege" ? "#ffd54f" : "#fff"; c.stroke();
      c.font = (m.variant === "siege" ? "20px" : "16px") + " serif";
      c.fillText(m.variant === "siege" ? "💣" : m.variant === "ranged" ? (m.team ? "🏹" : "🔮") : m.team ? "👹" : "🥷", m.x, m.y - 13 + bob);
      if (mLift > 0) c.restore();
      this.bar(c, m.x, m.y - 40 - mLift, m.variant === "siege" ? 42 : 30, m.hp / m.maxhp, TEAM_COL[m.team]);
    }
    drawHero(c, h) {
      c.save();
      if (h.inBush && h.team === 0 && h.revealT <= 0) c.globalAlpha = 0.58;
      this.drawShadow(c, h.x, h.y, 26, 11);
      if (h.def.id === "rex" && h.shockT > 0) this.flatRing(c, h.x, h.y, h.r + 16 + Math.sin(this.time * 12) * 2, "#ffcc80cc", 3);   // v6.8 Shockwave window
      const lift = this.airLift(h); if (lift > 0) c.translate(0, -lift);   // airborne
      if (h.regenT > 0) {
        c.save(); c.translate(h.x, h.y + 4); c.scale(1, 0.45);
        c.beginPath(); c.arc(0, 0, h.r + 12, 0, 6.283); c.strokeStyle = "#81c784cc"; c.lineWidth = 4; c.stroke(); c.restore();
      }
      if (h.recallT > 0) {
        const prog = 1 - h.recallT / RECALL_DUR;
        c.save(); c.translate(h.x, h.y + 4); c.scale(1, 0.45);
        c.beginPath(); c.arc(0, 0, 44, 0, 6.283); c.strokeStyle = "#4dd0e1aa"; c.lineWidth = 4; c.stroke();
        c.beginPath(); c.arc(0, 0, 44, -1.57, -1.57 + prog * 6.283); c.strokeStyle = "#ffd54f"; c.lineWidth = 6; c.stroke(); c.restore();
      }
      if (h.rootT > 0) {
        c.save(); c.translate(h.x, h.y + 4); c.scale(1, 0.48); c.beginPath(); c.arc(0, 0, h.r + 8, 0, 6.283);
        c.strokeStyle = "#6d4c41"; c.lineWidth = 6; c.stroke(); c.strokeStyle = "#8bc34a"; c.lineWidth = 2; c.setLineDash([6, 6]); c.stroke(); c.restore();
      }
      const lunge = h.swingT > 0 ? 5 : 0, hx = h.x + h.face.x * lunge, hy = h.y - 22;
      c.save(); c.translate(h.x, h.y + 4); c.scale(1, 0.45); c.beginPath(); c.arc(0, 0, h.r + 3, 0, 6.283);
      c.strokeStyle = h.isPlayer ? "#ffd54f" : TEAM_COL[h.team]; c.lineWidth = h.isPlayer ? 4 : 3; c.stroke(); c.restore();

      const P = sprPose(h), img = P ? null : getHeroImg(h.def);
      let top = hy - h.r;   // y of the top of the body: the HUD bits (bar, name, status) are stacked above it
      if (P) {   // v7.0: animated sprite instead of the portrait circle
        top = P.top + 8; sprBlit(c, h, P, 1);
        if (h.shield > 0) { c.save(); c.translate(h.x, (P.top + h.y + 4) / 2 + 4); c.scale(1, 1.9); c.beginPath(); c.arc(0, 0, h.r + 10, 0, 6.283); c.restore(); c.strokeStyle = "#4dd0e1"; c.lineWidth = 3; c.stroke(); }
      } else {
        c.beginPath(); c.arc(hx, hy, h.r, 0, 6.283); c.fillStyle = h.hitFlash > 0 ? "#fff" : h.def.color + "dd"; c.fill();
        if (img && h.hitFlash <= 0) { c.save(); c.beginPath(); c.arc(hx, hy, h.r - 2, 0, 6.283); c.clip(); const cr = HeroArt.crop(img); c.drawImage(img, cr[0], cr[1], cr[2], cr[3], hx - h.r, hy - h.r, h.r * 2, h.r * 2); c.restore(); }
        else { c.font = "34px serif"; c.fillText(h.def.emoji, hx, hy + 2); }
        c.beginPath(); c.arc(hx, hy, h.r, 0, 6.283); c.lineWidth = 4; c.strokeStyle = TEAM_COL[h.team]; c.stroke();
        if (h.shield > 0) { c.beginPath(); c.arc(hx, hy, h.r + 6, 0, 6.283); c.strokeStyle = "#4dd0e1"; c.lineWidth = 3; c.stroke(); }
      }
      if (h.stunT > 0) { c.font = "20px serif"; c.fillText("💫", hx, top - 28); }
      else if (h.rootT > 0) { c.font = "bold 10px sans-serif"; c.fillStyle = "#c5e1a5"; c.fillText("ROOTED", hx, top - 40); }

      this.bar(c, hx, top - 16, 54, h.hp / h.maxhp, h.isPlayer ? "#66bb6a" : h.team ? "#ef5350" : "#42a5f5", h.lv);   // v5.9: me = green, allies = blue, enemies = red
      c.font = "bold 11px sans-serif"; c.fillStyle = h.isPlayer ? "#ffd54f" : "#fff"; c.strokeStyle = "#000"; c.lineWidth = 3;
      c.strokeText(h.name, hx, top - 28); c.fillText(h.name, hx, top - 28);
      if (h.recallT > 0) { c.font = "bold 11px sans-serif"; c.fillStyle = "#80cbc4"; c.strokeText("RECALLING", hx, top - 42); c.fillText("RECALLING", hx, top - 42); }
      c.restore();
    }
    renderMini(vw) {
      const c = this.mctx, w = this.mini.width, h = this.mini.height, kx = w / W, ky = h / VIEW_H;
      c.clearRect(0, 0, w, h); c.fillStyle = "#5b483b"; c.fillRect(0, 0, w, 16); c.fillStyle = "#918597"; c.fillRect(0, 16, w, h - 16);
      for (const b of this.bushes) { c.fillStyle = "#43a047cc"; c.beginPath(); c.arc(b.x * kx, b.y * ky, 4.5, 0, 6.283); c.fill(); }
      for (const s of this.structs) { if (s.dead) continue; c.fillStyle = TEAM_COL[s.team]; const z = s.kind === "base" ? 8 : 5; c.fillRect(s.x * kx - z / 2, s.y * ky - z / 2, z, z); }
      for (const m of this.minions) { c.fillStyle = TEAM_COL[m.team]; c.fillRect(m.x * kx - 1, m.y * ky - 1, 2, 2); }
      for (const hh of this.heroes) {
        if (hh.dead || this.isHiddenFrom(hh, 0)) continue;
        c.beginPath(); c.arc(hh.x * kx, hh.y * ky, hh.isPlayer ? 4.5 : 3.5, 0, 6.283); c.fillStyle = TEAM_COL[hh.team]; c.fill();
        c.strokeStyle = hh.revealT > 0 ? "#80deea" : hh.isPlayer ? "#ffd54f" : "#000"; c.lineWidth = 1.5; c.stroke();
      }
      if (this.ping) { c.strokeStyle = "#ffd54f"; c.lineWidth = 2; c.beginPath(); c.arc(this.ping.x * kx, this.ping.y * ky, 6, 0, 6.283); c.stroke(); }
      c.strokeStyle = "#ffd54f"; c.lineWidth = 1.5; c.strokeRect(this.camX * kx, 1, vw * kx, h - 2);
    }
    renderLiveBoard(force) {
      const box = $("liveBoard");
      if ($("scoreModal").classList.contains("hidden")) return;
      // hud() runs every frame: refresh at ~2.5 Hz so equipment buttons aren't replaced under a finger (taps also use pointerdown)
      if (!force && this.time - (this._lbT ?? -9) < 0.4) return;
      this._lbT = this.time;
      const E = window.RCEquipment;
      const fmt = (n) => (n >= 1000 ? (n / 1000).toFixed(1) + "k" : "" + Math.floor(n));
      const panel = (t) => {
        const hs = this.heroes.map((h, idx) => ({ h, idx })).filter((o) => o.h.team === t).sort((a, b) => b.h.k - a.h.k || b.h.a - a.h.a);
        const K = hs.reduce((n, o) => n + o.h.k, 0), G = hs.reduce((n, o) => n + o.h.goldEarned, 0), T = this.towers[1 - t].filter((x) => x.dead).length;
        return `<div class="lb-team t${t}"><div class="lb-th"><b>${t ? "ENEMY TEAM" : "YOUR TEAM"}</b><span>⚔ ${K}</span><span>🗼 ${T}</span><span>🪙 ${fmt(G)}</span></div>` +
          `<div class="lb-row head"><span>Hero</span><span>Lv</span><span>K/D/A</span><span>Gold</span></div>` +
          hs.map(({ h, idx }) => {
            const slots = (h.inventory?.slots || Array(6).fill(null));
            const loadout = slots.map((id, i) => {
              const it = id && E.getItem(id);
              const on = this.sbSel && this.sbSel.hero === idx && this.sbSel.slot === i;
              return `<button type="button" class="lb-item-slot${it ? " owned" : " empty"}${on ? " sel" : ""}" data-sb-hero="${idx}" data-sb-slot="${i}" ${it ? "" : "disabled"} title="${it ? escHtml(it.name) : "Empty slot " + (i + 1)}">${it ? itemIcon(it) : ""}</button>`;
            }).join("");
            const spell = h.dead ? "" : h.regenCd > 0 ? `Regen ⏳${Math.ceil(h.regenCd)}s` : "Regen ✓";
            return `<div class="lb-hero-card${h.isPlayer ? " me" : ""}"><div class="lb-row"><span>${h.def.emoji} ${escHtml(h.name)} <small>${escHtml(h.def.name)}</small></span><span>${h.lv}</span><span>${h.k}/${h.d}/${h.a}</span><span>${h.dead ? "💀" + Math.ceil(h.respawn) + "s" : fmt(h.goldEarned)}</span></div><div class="lb-loadout"><b>BUILD</b>${loadout}<em class="lb-spell">${spell}</em></div></div>`;
          }).join("") + `</div>`;
      };
      // Only touch the DOM when something changed, so taps on equipment slots are never swallowed by a re-render.
      const html = `<div class="lb-teams">${panel(0)}${panel(1)}</div>`;
      if (html !== this._lbHtml) { this._lbHtml = html; box.innerHTML = html; }
      const det = $("sbItemDetail"), sel = this.sbSel, owner = sel && this.heroes[sel.hero], it = owner && owner.inventory && E.getItem(owner.inventory.slots[sel.slot]);
      const dhtml = it ? `<div class="sb-det-owner">${owner.def.emoji} ${escHtml(owner.name)} · slot ${sel.slot + 1}</div>${itemDetailHtml(it)}` : `<small>Tap any equipment slot to inspect an item — yours or the enemy's.</small>`;
      if (dhtml !== this._sbDetHtml) { this._sbDetHtml = dhtml; det.innerHTML = dhtml; }
    }
    shopIsOpen() { const m = $("battleShopModal"); return !!m && !m.classList.contains("hidden"); }
    shopMsg(t) { $("battleShopStatus").textContent = t; }
    openBattleShop() {
      if (!this.player || this.over) return;
      if (!this.shopCategory || this.shopCategory === "all") this.shopCategory = "attack";
      this.shopMsg("");
      this.refreshBattleShop();
      $("battleShopModal").classList.remove("hidden");
    }
    /* v7.8 build path as a diagram: [Arcane Codex] + [Mana Core], with each intermediate's own parts hanging underneath
       ([Magic Power Comp.] + [Magic Power Comp.]). Parts the player already owns get a check mark and are not expanded.
       Border colour = tier (grey component / blue intermediate / gold completed). */
    shopTreeHtml(item, inv) {
      if (!item.recipe) return `<div class="bp-direct">Bought directly</div>`;
      const avail = new Map();
      inv.slots.forEach((id) => { if (id) avail.set(id, (avail.get(id) || 0) + 1); });
      const node = (it, have) => `<div class="bp-node ${TIER_CLS(it)}${have ? " have" : ""}" title="${escHtml(it.name)}${have ? " (owned)" : " · " + it.price + " G"}"><span class="bp-ico">${itemIcon(it)}</span>${have ? `<i class="bp-ck">✓</i>` : ""}<small class="bp-nm">${escHtml(it.name.replace(/ Component$/, " Comp."))}</small><small class="bp-pr">${have ? "owned" : it.price + " G"}</small></div>`;
      const branch = (id) => {
        const it = window.RCEquipment.getItem(id);
        const have = (avail.get(id) || 0) > 0;
        if (have) avail.set(id, avail.get(id) - 1);
        const kids = !have && it.recipe ? it.recipe.ingredients.map(branch) : [];
        return `<div class="bp-branch">${node(it, have)}${kids.length ? `<div class="bp-stem"></div><div class="bp-kids">${kids.join(`<span class="bp-plus">+</span>`)}</div>` : ""}</div>`;
      };
      return `<div class="bp-tree">${item.recipe.ingredients.map(branch).join(`<span class="bp-plus">+</span>`)}</div>`;
    }
    refreshBattleShop() {
      const p = this.player, inv = p.inventory, catalog = window.RC_ITEMIZATION, S = window.RCShopSystem, E = window.RCEquipment;
      if (!inv || !catalog) return;
      if (!this.shopCategory || this.shopCategory === "all") this.shopCategory = "attack";
      const cat = this.shopCategory, simple = !this.shopAll, queue = p.priorityQueue || (p.priorityQueue = []);
      $("shopGold").textContent = Math.floor(p.gold).toLocaleString();
      $("shopAutoBuy").checked = !!p.autoBuyEnabled;
      $("shopModeToggle").textContent = simple ? "Simple Mode" : "All Equipment";
      $("battleShopCategories").querySelectorAll("[data-shop-category]").forEach((btn) => btn.classList.toggle("active", btn.dataset.shopCategory === cat));

      // six-slot inventory (tap to inspect / sell)
      const sel = this.shopSel;
      $("battleShopInventory").innerHTML = inv.slots.map((id, i) => {
        const it = id && E.getItem(id);
        const on = sel && sel.kind === "slot" && sel.i === i;
        return `<button type="button" class="shop-slot${it ? " owned" : ""}${on ? " sel" : ""}" data-shop-slot="${i}" ${it ? "" : "disabled"} title="${it ? escHtml(it.name) : "Empty slot " + (i + 1)}"><span class="ic ${it ? TIER_CLS(it) : ""}">${it ? itemIcon(it) : ""}</span><small>${it ? escHtml(it.name) : "Empty"}</small></button>`;
      }).join("");

      // item grid
      const list = catalog.items.filter((it) => itemCategory(it) === cat && (!simple || it.tier === 3 || it.category === "boots"));
      $("battleShopItems").innerHTML = list.map((it) => {
        const plan = S.planItem(p, it.id), cost = plan.cost ?? it.price;
        const owned = inv.slots.filter((x) => x === it.id).length, on = sel && sel.kind === "item" && sel.id === it.id;
        return `<button type="button" class="shop-tile${on ? " sel" : ""}${p.gold < cost ? " poor" : ""}${queue.includes(it.id) ? " queued" : ""}" data-shop-item="${it.id}"><span class="ic ${TIER_CLS(it)}">${itemIcon(it)}</span><b>${escHtml(it.name)}</b><small>${cost < it.price ? `<s>${it.price}</s> ${cost}` : it.price} G</small>${owned ? `<i class="own">×${owned}</i>` : ""}${queue.includes(it.id) ? `<i class="pri">★${queue.indexOf(it.id) + 1}</i>` : ""}</button>`;
      }).join("") || `<div class="battle-shop-empty">${cat === "jungle" ? "Jungle blessing will be available when its price and effect are finalized. It requires Retribution and attaches to boots." : cat === "roam" ? "Roam blessing will be available when its price and effect are finalized. It attaches to boots and cannot coexist with Jungle blessing." : "No equipment in this category."}</div>`;

      // detail panel
      const det = $("battleShopDetail");
      this._shopBuyKey = null;
      if (sel && sel.kind === "slot" && inv.slots[sel.i]) {
        const it = E.getItem(inv.slots[sel.i]), rate = catalog.provisionalValues?.sellRefundRate ?? 0;
        det.innerHTML = `<div class="det-scroll"><div class="det-head">${itemDetailHtml(it)}</div><small class="det-note">Selling removes its stats and passive immediately. Refund rate is provisional.</small></div><div class="det-actions"><button type="button" class="sell" data-shop-sell="${sel.i}">SELL +${Math.floor(it.price * rate)} G</button></div>`;
      } else if (sel && sel.kind === "item") {
        const it = E.getItem(sel.id), plan = S.planItem(p, it.id), cost = plan.cost ?? it.price, queued = queue.includes(it.id);
        const short = Math.max(0, Math.ceil(cost - p.gold));
        const why = !plan.ok ? (SHOP_REASONS[plan.reason] || plan.reason) : short > 0 ? `Need ${short} more gold` : "";
        this._shopBuyKey = it.id + "|" + (why ? 1 : 0);
        const next = S.nextPriorityStep(p);
        det.innerHTML = `<div class="det-scroll"><div class="det-head">${itemDetailHtml(it)}</div>` +
          `<div class="det-tree"><h4>Build path</h4>${this.shopTreeHtml(it, inv)}</div>` +
          `<div class="det-cost">Cost now: <b>${cost} G</b>${cost < it.price ? ` <small>(full price ${it.price} G — owned parts credited)</small>` : ""}</div>` +
          `<small class="det-note" id="shopBuyWhy">${why}</small></div>` +
          `<div class="det-actions"><button type="button" id="shopBuyBtn" class="buy" data-shop-buy="${it.id}" ${why ? "disabled" : ""}>BUY</button><button type="button" class="prio${queued ? " on" : ""}" data-shop-prio="${it.id}">${queued ? "★ PRIORITIZED" : "PRIORITIZE"}</button></div>`;
      } else {
        det.innerHTML = `<div class="det-empty">Tap an item to see its stats, build path and cost.<br><br><b>BUY</b> purchases the item and handles its recipe for you.<br><b>PRIORITIZE</b> adds it to your build list for Auto-Buy.<br>Tap an owned slot below to sell it.</div>`;
      }

      // priority list
      const nx = S.nextPriorityStep(p);
      $("battleShopQueue").innerHTML = queue.length
        ? `<b>BUILD PRIORITY</b>` + queue.map((id, i) => `<span class="q-chip"><span class="q-ico">${itemIcon(E.getItem(id))}</span>${i + 1}. ${escHtml(E.getItem(id).name)}<button type="button" data-shop-unprio="${id}" aria-label="Remove">✕</button></span>`).join("") + (nx ? `<small>Next: ${escHtml(E.getItem(nx.nextId).name)}${p.autoBuyEnabled ? " (Auto-Buy on)" : " — turn on Auto-Buy to purchase automatically"}</small>` : "")
        : `<small>No build priority set. Select an item and tap PRIORITIZE to plan a build.</small>`;
    }
    /* Light, tap-safe updates while the shop is open (gold ticks in constantly; never replace elements under a finger). */
    tickShopLive(dt) {
      if (!this.shopIsOpen()) return;
      this._shopLiveT = (this._shopLiveT || 0) - dt;
      if (this._shopLiveT > 0) return;
      this._shopLiveT = 0.4;
      const p = this.player, S = window.RCShopSystem;
      $("shopGold").textContent = Math.floor(p.gold).toLocaleString();
      $("battleShopItems").querySelectorAll("[data-shop-item]").forEach((el) => {
        const plan = S.planItem(p, el.dataset.shopItem);
        el.classList.toggle("poor", p.gold < (plan.cost ?? Infinity));
      });
      if (this.shopSel && this.shopSel.kind === "item") {
        const plan = S.planItem(p, this.shopSel.id), why = !plan.ok || p.gold < plan.cost;
        if (this._shopBuyKey !== this.shopSel.id + "|" + (why ? 1 : 0)) this.refreshBattleShop();
      }
    }
    selectShopItem(id) { this.shopSel = { kind: "item", id }; this.refreshBattleShop(); }
    selectShopSlot(i) { if (this.player.inventory.slots[i]) { this.shopSel = { kind: "slot", i: Number(i) }; this.refreshBattleShop(); } }
    togglePriorityShop(id) {
      const r = window.RCShopSystem.togglePriority(this.player, id);
      this.shopMsg(r.ok ? (r.removed ? "Removed from build priority." : `Prioritized: ${window.RCEquipment.getItem(id).name}`) : (SHOP_REASONS[r.reason] || r.reason));
      this.refreshBattleShop();
    }
    buyShopItem(itemId) {
      if (!this.player || this.over) return;
      const p = this.player, oldMaxHp = p.maxhp;
      const result = window.RCShopSystem.buyItem(p, itemId);
      this.shopMsg(result.ok ? `${result.action === "combine" ? "Assembled" : "Purchased"}: ${window.RCEquipment.getItem(itemId).name} · −${result.spent} G` : (result.reason === "insufficient-gold" ? `Need ${Math.ceil(result.due - p.gold)} more gold` : (SHOP_REASONS[result.reason] || `Cannot buy: ${result.reason}`)));
      if (result.ok) {
        Sound.sfx("buy"); this.recalcHeroStats(p);
        p.hp = Math.min(p.maxhp, p.hp + (p.maxhp - oldMaxHp));
      }
      this.refreshBattleShop();
    }
    sellShopItem(slotIndex) {
      if (!this.player || this.over) return;
      const p = this.player;
      const rate = window.RC_ITEMIZATION.provisionalValues?.sellRefundRate;
      const result = window.RCShopSystem.sell(p, Number(slotIndex), rate);
      this.shopMsg(result.ok ? `Sold ${window.RCEquipment.getItem(result.itemId).name} · +${result.refund} G (provisional refund)` : `Cannot sell: ${result.reason}`);
      if (result.ok) {
        this.shopSel = null;
        if (!this.hasItemPassive(p, "warbringer-momentum")) { p.warbringerStacks = 0; p.warbringerT = 0; }
        if (!this.hasItemPassive(p, "deadeye-quickstep")) { p.deadeyeSpeedBonus = 0; p.deadeyeT = 0; }
        this.recalcHeroStats(p); p.hp = Math.min(p.hp, p.maxhp);
      }
      this.refreshBattleShop();
    }
    /* ---------- v5.9 BUILD-READY NOTICE ----------
       Target = head of the player's BUILD PRIORITY list; with no list, the first item of the role's suggested build that is affordable right now.
       When the whole item can be bought/assembled with current gold, a tap-to-buy chip appears under the portrait (no shop visit needed). */
    buildTarget() {
      const p = this.player, S = window.RCShopSystem, E = window.RCEquipment, cat = window.RC_ITEMIZATION;
      if (!p || !p.inventory || !S || !E) return null;
      const slots = p.inventory.slots, hasBoots = slots.some((id) => id && E.getItem(id) && E.getItem(id).category === "boots");
      const ready = (id, blocked) => {
        const item = E.getItem(id);
        if (!item || slots.includes(id) || (item.category === "boots" && hasBoots)) return undefined;   // already owned / not allowed: skip to the next entry
        const plan = S.planItem(p, id, blocked);
        return plan.ok && p.gold >= plan.cost ? { id, cost: plan.cost, item } : null;                   // null = valid target but not affordable yet
      };
      const q = p.priorityQueue || [];
      if (q.length) {
        for (const id of q) { const r = ready(id, new Set()); if (r !== undefined) return r; }          // strict priority: only the first live entry counts
        return null;
      }
      const list = (cat && cat.aiBuilds && (cat.aiBuilds[p.def.role] || cat.aiBuilds.Mage)) || [];
      for (const id of list) { const r = ready(id); if (r) return r; }
      return null;
    }
    updateBuildReady(force) {
      const el = $("buildReady"); if (!el || !this.player) return;
      if (!force && this.time - (this._brT ?? -9) < 0.25) return;
      this._brT = this.time;
      const t = this.over ? null : this.buildTarget(), key = t ? t.id : "";
      const show = !!t && this._brDismiss !== key;
      if (t && key !== this._brKey) {                                    // a new build item just became affordable
        $("brIco").innerHTML = itemIcon(t.item); $("brName").textContent = t.item.name;
        if (show) { Sound.sfx("level"); this.text(this.player.x, this.player.y - 76, "🛒 BUILD READY", "#ffd54f"); }
      }
      if (t) $("brCost").textContent = `TAP TO BUY · ${t.cost} G`;
      if (!t) this._brDismiss = null;                                    // allow a fresh notice next time something is affordable
      this._brKey = key;
      el.classList.toggle("hidden", !show);
      $("btnBattleShop").classList.toggle("has-ready", show);
    }
    quickBuildBuy() {
      if (!this.player || this.over || this.paused) return;
      const t = this.buildTarget(); if (!t) { this.updateBuildReady(true); return; }
      const before = this.player.gold;
      this.buyShopItem(t.id);
      if (this.player.gold < before) this.text(this.player.x, this.player.y - 60, "BOUGHT: " + t.item.name, "#ffd54f");
      this.updateBuildReady(true);
    }
    /* v7.5 PASSIVE INDICATOR: what the bottom-centre chip shows for the player's hero. Returns null while the passive is not "in use".
       { n: badge text (stacks / progress), t: seconds left (0 = none), ready: glow } */
    passiveState(p) {
      if (!p || p.dead) return null;
      const id = p.def.id, foes = () => this.enemiesOf(p.team, true);
      switch (id) {
        case "blaze": { let st = 0, t = 0; for (const e of foes()) if ((e.burnStacks || 0) > 0 && (!e.burnSrc || e.burnSrc === p)) { st = Math.max(st, e.burnStacks); t = Math.max(t, e.burnT || 0); } return st ? { n: st + "/3", t, ready: st >= 2 } : null; }
        case "aria": return p.arcaneEmp ? { n: "", t: 0, ready: true } : p.arcaneCount > 0 ? { n: p.arcaneCount + "/2", t: 0, ready: false } : null;
        case "rex": return p.shockT > 0 ? { n: "", t: p.shockT, ready: true } : p.resolveStacks > 0 ? { n: p.resolveStacks + "/5", t: 0, ready: p.resolveStacks >= 5 } : null;
        case "vex": { let t = 0; for (const e of foes()) if ((e.markT || 0) > 0) t = Math.max(t, e.markT); return t > 0 ? { n: "", t, ready: true } : null; }
        case "lumi": return p.precCount > 0 ? { n: p.precCount + "/4", t: 0, ready: p.precCount >= 3 } : null;
        case "ophelia": return p.lv >= 4 && this._pp && this._pp.mv > 0 ? { n: "", t: 0, ready: true } : null;
        case "zora": { let st = 0, t = 0; for (const e of foes()) if ((e.staticStacks || 0) > 0) { st = Math.max(st, e.staticStacks); t = Math.max(t, e.staticT || 0); } if (st) return { n: st + "/3", t, ready: st >= 2 }; return p.inBush ? { n: "", t: 0, ready: true } : null; }
        case "deana": return p.inBush && p.hp < p.maxhp ? { n: "", t: Math.max(0, 10 - p.bushHealT), ready: false } : null;
        case "gorn": return p.fury > 0 ? { n: p.fury + "/4", t: p.furyT, ready: p.fury >= 4 } : null;
        case "felix": return p.gravBoostT > 0 ? { n: "", t: p.gravBoostT, ready: true } : null;
        default: return null;
      }
    }
    updatePassiveChip() {
      const el = this.passiveChip; if (!el) return;
      const p = this.player;
      if (this._pp) { const moved = Math.hypot(p.x - this._pp.x, p.y - this._pp.y); this._pp.mv = moved > 0.4 ? 0.25 : Math.max(0, this._pp.mv - 1 / 60); this._pp.x = p.x; this._pp.y = p.y; }   // Ophelia: "moving" with a short grace so it doesn't flicker
      const st = this.over ? null : this.passiveState(p);
      if (!st) { if (this._pcKey !== "off") { el.classList.add("hidden"); this._pcKey = "off"; } return; }
      const tTxt = st.t > 0 ? (st.t >= 10 ? Math.ceil(st.t) : st.t.toFixed(1)) + "s" : "";
      const key = st.n + "|" + tTxt + "|" + (st.ready ? 1 : 0);
      if (key === this._pcKey) return;
      this._pcKey = key;
      el.classList.remove("hidden"); el.classList.toggle("ready", !!st.ready);
      el.querySelector(".pc-n").textContent = st.n; el.querySelector(".pc-n").classList.toggle("hidden", !st.n);
      el.querySelector(".pc-t").textContent = tTxt; el.querySelector(".pc-t").classList.toggle("hidden", !tTxt);
    }
    hud() {
      const p = this.player, pct = Math.max(0, Math.round((p.hp / p.maxhp) * 100));
      $("hudLv").textContent = "LV" + p.lv; $("hudHpFill").style.width = pct + "%";
      $("hudHpTxt").textContent = `${Math.ceil(p.hp)}/${p.maxhp}`;
      $("hudManaFill").style.width = (p.maxMana > 0 ? (p.mana / p.maxMana) * 100 : 0) + "%";
      $("hudManaTxt").textContent = `${Math.floor(p.mana)}/${p.maxMana} MANA`;
      $("hudXpFill").style.width = (p.lv >= MAX_LV ? 100 : (p.xp / p.xpNext) * 100) + "%";
      $("hudGold").textContent = Math.floor(p.gold); $("dimmer").classList.toggle("on", !!this.over); $("dimmer").classList.toggle("dead", !!(p.dead && !this.over));   // v5.9: respawn dim is now a light vignette, full dim only at match end

      const pr = $("portRespawn");
      if (p.dead && !this.over) { pr.classList.remove("hidden"); pr.textContent = Math.ceil(p.respawn); }
      else pr.classList.add("hidden");

      const spEl = $("hudSp");
      if (p.sp > 0) { spEl.classList.remove("hidden"); spEl.textContent = `+${p.sp} SP`; } else spEl.classList.add("hidden");

      $("pk").textContent = p.k; $("pd").textContent = p.d; $("pa").textContent = p.a; $("pcs").textContent = p.cs;
      $("sb").textContent = this.score[0]; $("sr").textContent = this.score[1];
      this.updatePortraits(); this.updateBuildReady();
      if (aim.active && (p.dead || this.over || this.paused)) aimAbort();
      const t = Math.floor(this.time);
      $("timer").textContent = String(Math.floor(t / 60)).padStart(2, "0") + ":" + String(t % 60).padStart(2, "0");

      for (let i = 0; i < 3; i++) {
        const rk = p.skillLv[i] || 0, cd = p.cds[i], max = this.skillStats(p, i).cd, el = this.skillEls[i], minLv = this.skillMinLv(p, i);
        el.btn.classList.toggle("sk-locked", rk === 0);
        if (rk === 0) { el.cd.style.clipPath = "inset(0 0 0 0)"; el.t.textContent = p.lv < minLv ? "LV" + minLv : "LOCK"; }
        else if (p.def.id === "lumi" && i === 1) {
          const charges = p.windStepCharges || 0, next = p.windStepRecharge && p.windStepRecharge.length ? Math.max(0, p.windStepRecharge[0]) : 0;
          const frac = charges < 2 && next > 0 ? (next / 6) * 100 : 0;
          el.cd.style.clipPath = `inset(${100 - frac}% 0 0 0)`;
          el.t.textContent = charges > 0 ? String(charges) : String(Math.ceil(next));
        }
        else { const frac = cd > 0 ? (cd / max) * 100 : 0; el.cd.style.clipPath = `inset(${100 - frac}% 0 0 0)`; el.t.textContent = cd > 0 ? Math.ceil(cd) : ""; }
        el.pips.forEach((pip, idx) => pip.classList.toggle("on", idx < rk));
        el.up.classList.toggle("hidden", !this.canUpgradeSkill(p, i));
      }

      // Recall + Regen HUD
      this.recallBtn.classList.toggle("active", p.recallT > 0);
      const rFrac = p.recallT > 0 ? (1 - p.recallT / RECALL_DUR) * 100 : 0;
      this.recallCd.style.clipPath = `inset(${p.recallT > 0 ? (p.recallT / RECALL_DUR) * 100 : 100}% 0 0 0)`;
      $("recallProg").classList.toggle("hidden", p.recallT <= 0); $("recallFill").style.width = rFrac + "%";

      this.regenBtn.classList.toggle("active", p.regenT > 0);
      const regFrac = p.regenCd > 0 ? (p.regenCd / REGEN_CD) * 100 : 0;
      this.regenCd.style.clipPath = `inset(${100 - regFrac}% 0 0 0)`;
      this.regenTxt.textContent = p.regenCd > 0 ? Math.ceil(p.regenCd) : "";

      this.updatePassiveChip();

      const rm = $("respawnMsg");
      if (p.dead && !this.over) { rm.className = ""; rm.textContent = "💀 Respawning in " + Math.ceil(p.respawn) + "s"; }
      else rm.className = "hidden";

if (this.over) { $("dimmer").classList.add("on"); const b = $("endBanner"), win = this.winner === 0; b.className = win ? "win" : "lose"; b.textContent = win ? "VICTORY" : "DEFEAT"; }
      this.renderLiveBoard();
      if (this.practice) this.practiceHud();
    }
    run() {
      this.resize(); this._rz = () => this.resize(); window.addEventListener("resize", this._rz); this.last = performance.now();
      const loop = (now) => {
        if (this.stopped) return;
        const dt = Math.min(0.05, (now - this.last) / 1000); this.last = now;
        if (!this.paused) this.update(dt);
        this.render(); this.hud();
        this.raf = requestAnimationFrame(loop);
      };
      this.raf = requestAnimationFrame(loop);
    }
    destroy() { const sc = $("showcase"); if (sc) sc.className = "hidden"; Sound.annReset(); this.stopped = true; cancelAnimationFrame(this.raf); window.removeEventListener("resize", this._rz); this.practiceUi(false); }
  }

  /* ---------- SKILL AIMING (v4.5 Phase 2): press-hold-drag to aim, release to cast, release over the cancel zone to cancel ---------- */
  function overCancel(x, y) {
    const z = $("cancelZone"); if (!z) return false;
    const r = z.getBoundingClientRect(); if (!r.width) return false;
    const pad = window.innerHeight * 0.025;                 // forgiving hit area; the zone sits in the corner so it extends to the screen edges
    return x >= r.left - pad && y >= r.top - pad;
  }
  function aimUi(on, hot) {
    const z = $("cancelZone"), hint = $("czHint");
    z.classList.toggle("on", !!on); z.classList.toggle("hot", !!hot);
    if (hint) hint.textContent = hot ? "release to cancel" : "drag here to cancel";
    for (let i = 0; i < 3; i++) { const b = $("btnS" + i); b.classList.toggle("aiming", !!on && aim.slot === i && !hot); b.classList.toggle("cancelling", !!on && aim.slot === i && !!hot); }
  }
  function aimReset() { aim.active = false; aim.pid = null; aim.frac = 0; aim.drag = false; aim.cancel = false; aimUi(false, false); }
  function aimBegin(i, pid, x, y, R) {
    if (!B || B.paused || B.over || aim.active) return false;            // a second finger can't hijack an aim in progress
    const p = B.player; if (p.dead || p.stunT > 0 || p.dash) return false;
    if ((p.skillLv[i] || 0) <= 0 || (p.def.id === "lumi" && i === 1 ? (p.windStepCharges || 0) <= 0 : p.cds[i] > 0) || B.prepT > 0) { api.cast(i); return false; }   // locked / cooling down: no aim, keep old feedback
    aim.active = true; aim.slot = i; aim.pid = pid; aim.ox = x; aim.oy = y; aim.dx = p.face.x; aim.dy = p.face.y;
    aim.frac = 0; aim.drag = false; aim.cancel = false; aim.R = R || 65;
    aimUi(true, false); return true;
  }
  function aimMove(pid, x, y, over) {
    if (!aim.active || pid !== aim.pid) return;
    const dx = x - aim.ox, dy = y - aim.oy, l = Math.hypot(dx, dy);
    if (l > Math.max(14, aim.R * AIM_DEAD_FRAC)) { aim.dx = dx / l; aim.dy = dy / l; aim.frac = Math.min(1, l / aim.R); aim.drag = true; }
    else { aim.frac = 0; aim.drag = false; }
    const hot = over === undefined ? overCancel(x, y) : !!over;
    if (hot !== aim.cancel) { aim.cancel = hot; aimUi(true, hot); if (hot && navigator.vibrate) { try { navigator.vibrate(12); } catch (e) {} } }
  }
  /* abort=true (pointercancel, focus loss, pause, death…) never casts. Returns "cancelled" | "cast" | "failed" | null (not our pointer). */
  function aimEnd(pid, abort) {
    if (!aim.active || pid !== aim.pid) return null;
    const slot = aim.slot, dir = aim.drag ? { x: aim.dx, y: aim.dy, frac: aim.frac } : null, cancelled = !!abort || aim.cancel;
    aimReset();
    if (cancelled) return "cancelled";   // nothing below runs: no cooldown, no projectile/hazard, no damage, no passive-stack change
    return api.cast(slot, dir) ? "cast" : "failed";
  }
  function aimAbort() { return aim.active ? aimEnd(aim.pid, true) : null; }

  /* ---------- CONTROLS ---------- */
  let joyId = null;
  function initControls() {
    $("btnBattleShop").addEventListener("click", () => { if (B && !B.paused) B.openBattleShop(); });
    $("buildReady").addEventListener("click", (e) => {            // v5.9: tap the chip = buy; tap its ✕ = dismiss until the next item is ready
      if (!B) return;
      if (e.target.closest("#brX")) { B._brDismiss = B._brKey; B.updateBuildReady(true); return; }
      B.quickBuildBuy();
    });
    $("battleShopClose").addEventListener("click", () => $("battleShopModal").classList.add("hidden"));
    $("battleShopCategories").addEventListener("click", (e) => {
      if (!B) return;
      const tab = e.target.closest("[data-shop-category]");
      if (tab) { B.shopCategory = tab.dataset.shopCategory; B.shopSel = null; B.refreshBattleShop(); return; }
      if (e.target.closest("#shopModeToggle")) { B.shopAll = !B.shopAll; B.refreshBattleShop(); }
    });
    $("battleShopItems").addEventListener("click", (e) => {
      const t = e.target.closest("[data-shop-item]");
      if (t && B) B.selectShopItem(t.dataset.shopItem);
    });
    $("battleShopDetail").addEventListener("click", (e) => {
      if (!B || B.paused) return;
      const buy = e.target.closest("[data-shop-buy]"), prio = e.target.closest("[data-shop-prio]"), sell = e.target.closest("[data-shop-sell]");
      if (buy) B.buyShopItem(buy.dataset.shopBuy);
      else if (prio) B.togglePriorityShop(prio.dataset.shopPrio);
      else if (sell) B.sellShopItem(sell.dataset.shopSell);
    });
    $("battleShopInventory").addEventListener("click", (e) => {
      const slot = e.target.closest("[data-shop-slot]");
      if (slot && B) B.selectShopSlot(Number(slot.dataset.shopSlot));
    });
    $("battleShopQueue").addEventListener("click", (e) => {
      const x = e.target.closest("[data-shop-unprio]");
      if (x && B) B.togglePriorityShop(x.dataset.shopUnprio);
    });
    $("shopAutoBuy").addEventListener("change", (e) => { if (B) { window.RCShopSystem.setAutoBuy(B.player, e.target.checked); B.shopMsg(e.target.checked ? "Auto-Buy on: your prioritized builds are bought and assembled automatically." : "Auto-Buy off."); B.refreshBattleShop(); } });
    const zone = $("joyZone"), base = $("joyBase"), knob = $("joyKnob"), R = 68;
    let ox = 0, oy = 0;
    zone.addEventListener("pointerdown", (e) => {
      if (joyId !== null) return; joyId = e.pointerId; zone.setPointerCapture(e.pointerId);
      const r = zone.getBoundingClientRect(); ox = e.clientX; oy = e.clientY;
      base.style.display = "block"; base.style.left = ox - r.left + "px"; base.style.top = oy - r.top + "px";
      knob.style.transform = "translate(-50%,-50%)";
    });
    zone.addEventListener("pointermove", (e) => {
      if (e.pointerId !== joyId) return;
      let dx = e.clientX - ox, dy = e.clientY - oy, l = Math.hypot(dx, dy);
      if (l > R) { dx *= R / l; dy *= R / l; }
      knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
      input.mx = dx / R; input.my = dy / R;
    });
    const end = (e) => { if (e.pointerId !== joyId) return; joyId = null; input.mx = input.my = 0; base.style.display = "none"; };
    zone.addEventListener("pointerup", end); zone.addEventListener("pointercancel", end); zone.addEventListener("lostpointercapture", end);

    /* free-look: drag any empty area to scroll the map (joystick/buttons sit above and keep their own pointers) */
    const pz = $("panZone"); let pid = null, lx = 0, moved = 0, t0 = 0, lastTap = 0;
    pz.addEventListener("pointerdown", (e) => {
      if (!B || pid !== null) return; pid = e.pointerId; pz.setPointerCapture(e.pointerId);
      lx = e.clientX; moved = 0; t0 = performance.now();
      if (!(B.panActive || t0 < B.panUntil)) B.freeX = B.camX;
    });
    pz.addEventListener("pointermove", (e) => {
      if (e.pointerId !== pid || !B) return;
      const dx = e.clientX - lx; lx = e.clientX; moved += Math.abs(dx);
      if (moved > 8) { B.panActive = true; B.freeX = clamp(B.freeX - dx / B.scW, 0, Math.max(0, W - B.vwW)); }
    });
    const pend = (e) => {
      if (e.pointerId !== pid) return; pid = null; if (!B) return;
      const now = performance.now();
      if (B.panActive) { B.panActive = false; B.panUntil = now + 900; }   // v6.0: peek, then glide back to your hero
      else if (moved <= 8 && now - t0 < 300) { if (now - lastTap < 350) { B.panUntil = 0; B.camX = clamp(B.player.x - B.vwW / 2, 0, Math.max(0, W - B.vwW)); } lastTap = now; }
    };
    pz.addEventListener("pointerup", pend); pz.addEventListener("pointercancel", pend);

    /* minimap: tap or drag to jump the camera */
    const mm = $("minimap"); let mmDown = false;
    const mmGo = (e) => {
      if (!B) return; const r = mm.getBoundingClientRect();
      B.freeX = clamp(((e.clientX - r.left) / r.width) * W - B.vwW / 2, 0, Math.max(0, W - B.vwW)); B.panUntil = performance.now() + 1500;
    };
    mm.addEventListener("pointerdown", (e) => { mmDown = true; mm.setPointerCapture(e.pointerId); mmGo(e); });
    mm.addEventListener("pointermove", (e) => { if (mmDown) mmGo(e); });
    mm.addEventListener("pointerup", () => { mmDown = false; }); mm.addEventListener("pointercancel", () => { mmDown = false; });

    const atk = $("btnAtk");
    atk.addEventListener("pointerdown", (e) => { input.attack = true; atk.setPointerCapture(e.pointerId); });
    const atkEnd = () => { input.attack = false; };
    atk.addEventListener("pointerup", atkEnd); atk.addEventListener("pointercancel", atkEnd);

    [0, 1, 2].forEach((i) => {
      const btn = $("btnS" + i);
      btn.addEventListener("pointerdown", (e) => {
        if (e.pointerType === "mouse" && e.button !== 0) return;
        const w = btn.getBoundingClientRect().width || 60;
        if (aimBegin(i, e.pointerId, e.clientX, e.clientY, clamp(w * 1.05, 56, 130))) { try { btn.setPointerCapture(e.pointerId); } catch (err) {} }
        e.preventDefault();
      });
      btn.addEventListener("pointermove", (e) => aimMove(e.pointerId, e.clientX, e.clientY));
      btn.addEventListener("pointerup", (e) => aimEnd(e.pointerId, false));
      btn.addEventListener("pointercancel", (e) => aimEnd(e.pointerId, true));      // system gesture / palm / interruption: never cast
      btn.addEventListener("lostpointercapture", (e) => aimEnd(e.pointerId, true)); // no-op after a normal release (aim already reset)
    });
    window.addEventListener("blur", aimAbort);
    document.addEventListener("visibilitychange", () => { if (document.hidden) aimAbort(); });

    $("btnRecall").addEventListener("pointerdown", () => api.recall());
    $("btnRegen").addEventListener("pointerdown", () => api.regen());
    [0, 1, 2].forEach((s) => { const el = $("slot" + s); if (el) el.addEventListener("pointerdown", () => api.slot(s)); });   // v5.8: legacy ids; skill buttons are btnS0-2 (wired in aim code). Unguarded null aborted initControls.

    // MLBB-style 1-tap ping rail + expandable quick chat
    // pointerdown (not click): a "click" is dropped by mobile browsers while another finger is held on the joystick
    const tap = (el, fn) => el.addEventListener("pointerdown", (e) => { if (e.pointerType === "mouse" && e.button !== 0) return; e.preventDefault(); e.stopPropagation(); fn(); });
    document.querySelectorAll("#pingRail [data-ping], #chatDrawer [data-ping]").forEach((b) => tap(b, () => B && B.sendPing(b.dataset.ping)));
    tap($("btnChatMore"), () => $("chatDrawer").classList.toggle("hidden"));

    // v5.1 practice panel (only visible in practice mode)
    $("prFab").addEventListener("click", () => { $("prPanel").classList.toggle("hidden"); if (B) B.refreshPracticePanel(); });
    $("prClose").addEventListener("click", () => $("prPanel").classList.add("hidden"));
    $("prMeter").addEventListener("click", () => api.practiceAct("reset-meter"));
    $("prPanel").addEventListener("click", (e) => {
      const b = e.target.closest && e.target.closest("[data-pr]");
      const pk = e.target.closest && e.target.closest("[data-pr-pick]");
      if (pk) { api.practiceSwitch(pk.dataset.prPick); return; }
      if (b && b.dataset.pr === "switch-hero") { b.blur(); api.practicePicker(); return; }
      if (b) { b.blur(); api.practiceAct(b.dataset.pr); }
    });

    const openBoard = () => { if (!B) return; $("scoreModal").classList.remove("hidden"); B.renderLiveBoard(true); };
    $("scoreBox").addEventListener("click", openBoard); $("portStrip").addEventListener("click", openBoard);
    $("scoreClose").addEventListener("click", () => $("scoreModal").classList.add("hidden"));
    $("liveBoard").addEventListener("pointerdown", (e) => {
      const b = e.target.closest("[data-sb-hero]");
      if (!b || b.disabled || !B) return;
      const same = B.sbSel && B.sbSel.hero === Number(b.dataset.sbHero) && B.sbSel.slot === Number(b.dataset.sbSlot);
      B.sbSel = same ? null : { hero: Number(b.dataset.sbHero), slot: Number(b.dataset.sbSlot) };   // tap again to dismiss
      B._lbHtml = null; B.renderLiveBoard(true);
    });

    const keys = {};
    const calc = () => { if (joyId !== null) return; input.mx = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0); input.my = (keys.KeyS || keys.ArrowDown ? 1 : 0) - (keys.KeyW || keys.ArrowUp ? 1 : 0); };
    window.addEventListener("keydown", (e) => {
      if (!B) return;
      if (e.repeat && ["KeyU", "KeyI", "KeyO", "Digit1", "Digit2", "Digit3", "KeyB", "KeyR", "KeyH", "KeyG", "KeyQ", "KeyE", "KeyF"].includes(e.code)) return;
      keys[e.code] = true;
      if (e.shiftKey) { if (e.code === "Digit1") api.upgrade(0); if (e.code === "Digit2") api.upgrade(1); if (e.code === "Digit3") api.upgrade(2); }
      else { if (e.code === "KeyU" || e.code === "Digit1") api.cast(0); if (e.code === "KeyI" || e.code === "Digit2") api.cast(1); if (e.code === "KeyO" || e.code === "Digit3") api.cast(2); }
      if (e.code === "KeyB" || e.code === "KeyR") api.recall();
      if (e.code === "KeyH" || e.code === "KeyG") api.regen();
      if (e.code === "KeyQ") api.slot(0); if (e.code === "KeyE") api.slot(1); if (e.code === "KeyF") api.slot(2);
      if (e.code === "KeyJ" || e.code === "Space") { input.attack = true; e.preventDefault(); }
      if (e.code === "Escape") $("btnPause").click();
      calc();
    });
    window.addEventListener("keyup", (e) => { keys[e.code] = false; if (e.code === "KeyJ" || e.code === "Space") input.attack = false; calc(); });
  }

  const api = {
    initControls,
    aim: { begin: aimBegin, move: aimMove, end: aimEnd, abort: aimAbort, state: aim },   // also used by tests/phase2.test.js
    get game() { return B; },
    practicePicker() {
      const box = $("prPick"); if (!box || !B || !B.practice) return;
      if (!box.classList.contains("hidden")) { box.classList.add("hidden"); return; }
      box.innerHTML = ""; box.classList.remove("hidden");
      for (const d of HEROES) {
        const b = document.createElement("button"); b.type = "button"; b.className = "pr-pick-b" + (d.id === B.player.def.id ? " cur" : ""); b.setAttribute("data-pr-pick", d.id);
        const art = document.createElement("i"); HeroArt.paint(art, d); b.appendChild(art);
        const nm = document.createElement("span"); nm.textContent = d.name; b.appendChild(nm); box.appendChild(b);
      }
    },
    /* restart practice as another hero; keeps levels and toggles, the old hero becomes the enemy if you pick the current enemy */
    practiceSwitch(id) {
      if (!B || !B.practice || !HEROES.some((d) => d.id === id) || id === B.player.def.id) return;
      const pr = B.practice, en = pr.enemyHero === id ? B.player.def.id : pr.enemyHero;
      this.start(1, id, B.onEnd, { ...pr, practice: true, enemyHero: en, myLv: B.player.lv, enemyLv: B.enemyHero.lv });
    },
    start(mode, heroId, onEnd, opts) { this.stop(); input.mx = input.my = 0; input.attack = false; aimReset(); B = new BattleGame(mode, heroId, onEnd, opts); B.run(); },
    practiceAct(name) {
      if (!B || !B.practice) return;
      const lv = { "lv-me-up": ["me", "up"], "lv-me-down": ["me", "down"], "lv-me-max": ["me", "max"], "lv-en-up": ["en", "up"], "lv-en-down": ["en", "down"], "lv-en-max": ["en", "max"] }[name];
      if (lv) return B.practiceLevel(lv[0], lv[1]);
      const tg = { freeze: "freezeEnemy", "nocd-me": "noCdMe", "nocd-en": "noCdEnemy", "no-mana": "noManaCost", minions: "minions", dummy: "dummy" }[name];
      if (tg) return B.practiceToggle(tg);
      if (name === "max-both") { B.practiceLevel("me", "max"); B.practiceLevel("en", "max"); }
      else if (name === "clear-wave") B.clearWave();
      else if (name === "reset-heroes") B.practiceReset();
      else if (name === "reset-meter") B.meterReset();
    },
    forfeit() { return !!(B && B.forfeit()); },   // v6.7: quit -> scoreboard (defeat). Returns false when there is nothing to forfeit (practice / no match).
    stop() { if (B) { B.destroy(); B = null; } input.mx = input.my = 0; input.attack = false; aimReset(); },
    pause(v) { if (v) aimAbort(); if (B) B.paused = v; },
    toggleGfx() { lowGfx = !lowGfx; return lowGfx; },
    cast(i, dir) { return !!(B && !B.paused && !B.over && B.castSkill(B.player, i, dir)); },
    upgrade(i) { if (B && !B.paused && !B.over) B.upgradeSkill(B.player, i); },
    recall() { if (B && !B.paused && !B.over) B.startRecall(B.player); },
    regen() { if (B && !B.paused && !B.over) B.startRegen(B.player); },
  };
  window.Battle = api;
})();

