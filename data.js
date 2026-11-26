/* ===== HERO DATA & MP3-READY SOUND SYSTEM ===== */
const HEROES = [
  {
    id: "blaze", name: "Blaze", emoji: "🔥", color: "#ff7043", role: "Fighter",
    voice: "blaze_012824.mp3", quote: "Burn bright, or not at all.",
    hp: 1450, atk: 52, armor: 32, mres: 24, range: 95, speed: 235, aspd: 1.0, price: 0,
    passive: "Burning Blood: Attacks & skills apply Burn. At 3 stacks, deals 6% Max HP bonus magic damage.", //passive
    skills: [
      { name: "Flame Dash", icon: "💨", desc: "Dash forward, damaging enemies & applying Burn.", type: "dash", dmgType: "phys", cd: 5.5, dmg: 115, dist: 275, burn: 1 , damageBase: 115, paRatio: 0.60, mpRatio: 0.00, scalingStatus: "provisional-Stage-0A", manaCost: 50, manaStatus: "provisional-Stage-0B"},//s1
      { name: "Inferno", icon: "🔥", desc: "Fire blast (+35% bonus damage to Burning targets).", type: "inferno", dmgType: "magic", cd: 7.5, dmg: 145, radius: 170, burn: 1 , damageBase: 145, paRatio: 0.45, mpRatio: 0.00, scalingStatus: "provisional-Stage-0A", manaCost: 65, manaStatus: "provisional-Stage-0B"},//s2
      { name: "Phoenix Rebirth", icon: "🐦‍🔥", desc: "(Lv.4+) 4s Flame Aura: +20% DMG Reduction, +25% Atk Spd & pulsing burn.", type: "phoenix", dmgType: "magic", cd: 28, dur: 4.0, radius: 165 , damageBase: 20, paRatio: 0.15, mpRatio: 0.00, scalingStatus: "provisional-Stage-0A", manaCost: 110, manaStatus: "provisional-Stage-0B"},//s3
    ],
  },
  {
    id: "aria", name: "Aria", emoji: "🔮", color: "#ab47bc", role: "Mage",
    voice: "aria_012756.mp3", quote: "The stars answer to me.",
    hp: 1050, atk: 44, armor: 16, mres: 26, range: 340, speed: 215, aspd: 0.95, price: 0,
    passive: "Arcane Resonance: After casting 2 skills, your next basic attack deals bonus magic damage.",//passive
    skills: [
      { name: "Arcane Bolt", icon: "✨", desc: "Skillshot arcane bolt. Hitting an enemy hero refunds 1s cooldown.", type: "shot", dmgType: "magic", cd: 3.8, dmg: 90, speed: 800, range: 540, r: 20, refundHero: 1.0, damageBase: 90, paRatio: 0.00, mpRatio: 1.20, scalingStatus: "v6.1-aria-buff", manaCost: 50, manaStatus: "working-value" },//s1
      { name: "Frost Prison", icon: "❄️", desc: "0.45s delay: an arcane ice prison damages and roots enemies (0.7s).", type: "frost_prison", dmgType: "magic", cd: 9, dmg: 80, radius: 175, range: 520, delay: 0.45, root: 0.7, damageBase: 80, paRatio: 0.00, mpRatio: 1.00, scalingStatus: "v6.1-aria-buff", manaCost: 70, manaStatus: "working-value" },//s2
      { name: "Astral Symphony", icon: "🌠", desc: "(Lv.4+) Channel 3.5s, you can still walk: a huge celestial field follows you and pulses 7x (25 +0.55 MP) then collapses (80 +1.30 MP). Takes 30% less damage while channeling. Stuns / knock-ups interrupt.", type: "symphony", dmgType: "magic", cd: 45, cdRanks: [45, 40, 35], dmg: 255, radius: 262, channel: 3.5, chanDr: 0.30, pulses: 7, pulseTick: 0.5, pulseBase: 25, pulseMp: 0.55, finalBase: 80, finalMp: 1.30, damageBase: 255, paRatio: 0.00, mpRatio: 5.15, scalingStatus: "v6.1-aria-buff", manaCost: 100, manaStatus: "working-value" },//s3
    ],
  },
  {
    id: "rex", name: "Rex", emoji: "🦁", color: "#8d6e63", role: "Tank",
    voice: "rex_012823.mp3", quote: "Stand behind me. Always.",
    hp: 2050, atk: 40, armor: 46, mres: 36, range: 92, speed: 210, aspd: 0.9, price: 0,
    passive: "Unbreakable: Taking 5 hits builds Resolve, granting 22% DMG Reduction on next skill. After casting any skill, Rex's basic attacks send shockwaves to up to 3 nearby enemies for 3s (150% vs minions) and shield him for each enemy hero hit.",
    skills: [
      { name: "Lion's Charge", icon: "🐂", desc: "Charge forward, damaging enemies in the way, bumping them aside and stunning them for 0.35s.", type: "dash", dmgType: "phys", cd: 7, dmg: 95, dist: 270, stun: 0.35, knock: 40, damageBase: 95, paRatio: 0.60, mpRatio: 0.00, scalingStatus: "v6.9-rex-v67-dash", manaCost: 55, manaStatus: "provisional-Stage-0B"},
      { name: "Guardian Slam", icon: "💥", desc: "After a 0.45s windup, Rex slams the ground: enemies in the wide area are pulled into a tight cluster around him, take damage and are launched airborne for 1s (slowed on landing). Cannot be interrupted by regular CC. Shields nearby allies if it hits an enemy hero. Damage scales with Rex's max HP.", type: "guardian_slam", dmgType: "phys", cd: 9.5, dmg: 60, radius: 250, delay: 0.45, air: 1.0, slow: 1.8, allyShield: 130, damageBase: 60, paRatio: 0.40, hpRatio: 0.03, mpRatio: 0.00, scalingStatus: "v6.9-rex-gather", manaCost: 70, manaStatus: "provisional-Stage-0B"},
      { name: "King's Protection", icon: "🛡️", desc: "(Lv.4+) Raises a 5s aura that follows Rex: allies inside take 25/30/35% less damage (stacks with Unbreakable) and enemies inside are slowed 20%.", type: "kings_prot", dmgType: "phys", cd: 26, radius: 240, dur: 5, red: 0.25, redRanks: [0.25, 0.30, 0.35], slowMult: 0.8, manaCost: 110, manaStatus: "provisional-Stage-0B"},
    ],
  },
  {
    id: "vex", name: "Vex", emoji: "🗡️", color: "#546e7a", role: "Assassin",
    voice: "vex_012814.mp3", quote: "You will never see me coming.",
    hp: 1150, atk: 62, armor: 20, mres: 20, range: 88, speed: 262, aspd: 1.1, price: 150,
    passive: "Mark of the Void: Shadow Step marks enemies; next hit detonates for +30% burst damage.",
    skills: [
      { name: "Shadow Step", icon: "🌑", desc: "Blink forward, damaging & applying Void Mark.", type: "dash", dmgType: "phys", cd: 5, dmg: 125, dist: 330, mark: 4.0 , damageBase: 110, paRatio: 0.75, mpRatio: 0.00, scalingStatus: "provisional-Stage-0A", manaCost: 50, manaStatus: "provisional-Stage-0B"},
      { name: "Blade Storm", icon: "🌀", desc: "3 rapid dagger slashes (bonus damage vs Marked targets).", type: "blade_storm", dmgType: "phys", cd: 7, dmg: 60, hits: 3, radius: 150 , damageBase: 65, paRatio: 0.40, mpRatio: 0.00, scalingStatus: "provisional-Stage-0A", manaCost: 65, manaStatus: "provisional-Stage-0B"},
      { name: "Death's Embrace", icon: "💀", desc: "(Lv.4+) 0.6s warning mark, then teleports behind target + 12% missing HP.", type: "death_mark", dmgType: "phys", cd: 25, dmg: 220, range: 520, delay: 0.6, execPct: 0.12 , damageBase: 190, paRatio: 1.00, mpRatio: 0.00, scalingStatus: "provisional-Stage-0A", manaCost: 100, manaStatus: "provisional-Stage-0B"},
    ],
  },
  {
    id: "lumi", name: "Lumi", emoji: "🏹", color: "#66bb6a", role: "Marksman",
    voice: "lumi_012821.mp3", quote: "One arrow. One chance.",
    hp: 1100, atk: 54, armor: 16, mres: 18, range: 400, speed: 222, aspd: 1.25, price: 250,
    passive: "Precision: Every 4th basic attack deals +45% bonus physical damage.",
    skills: [
      { name: "Piercing Shot", icon: "🎯", desc: "Fires a piercing arrow at the target. Each enemy hit reduces cooldown.", type: "shot", dmgType: "phys", cd: 5, dmg: 150, speed: 900, range: 460, r: 16, pierce: true, falloff: 0.85 , damageBase: 150, paRatio: 0.85, mpRatio: 0.00, scalingStatus: "provisional-Stage-0A", manaCost: 45, manaStatus: "provisional-Stage-0B"},
      { name: "Wind Step", icon: "🌪️", desc: "Two charges. Aim any direction to dash forward, sideways, or backward. During the dash, automatically fires 3 homing arrows toward the nearest enemy. Each arrow hit on an enemy hero or minion reduces Piercing Shot cooldown by 1s. Each charge recharges in 6s.", type: "windstep", dmgType: "phys", cd: 6, charges: 2, recharge: 6, dist: 225, arrowDmg: 42, arrowDamageBase: 42, arrowPaRatio: 0.35, arrowMpRatio: 0, scalingStatus: "provisional-Stage-0A", arrowSpeed: 980, arrowRange: 620 , manaCost: 65, manaStatus: "provisional-Stage-0B"},
      { name: "Celestial Barrage", icon: "☔", desc: "(Lv.4+) Fires repeated waves of arrows over the target area for 5s, slowing enemies inside.", type: "barrage", dmgType: "phys", cd: 24, dmg: 35, waves: 10, radius: 185, range: 580, dur: 5, tick: 0.5, slow: 0.8 , damageBase: 35, paRatio: 0.25, mpRatio: 0.00, scalingStatus: "provisional-Stage-0A", manaCost: 110, manaStatus: "provisional-Stage-0B"},
    ],
  },
  {
    id: "ophelia", name: "Ophelia", emoji: "🎸", color: "#ec407a", role: "Tank Support",
    voice: "ophelia_012815.mp3", quote: "I\u2019ll protect you\u2026 even if the world falls.",
    hp: 1800, atk: 42, armor: 42, mres: 36, range: 300, speed: 212, aspd: 0.95, price: 300,
    passive: "Harmony Tempo: At Lv.4+, gains +14% Move Speed. Basic attacks throw musical notes.",
    atkProj: "note",
    skills: [
      { name: "Guitar Slam", icon: "🎸", desc: "Small AoE moderate damage; grants small shield if hitting a hero.", type: "guitar", dmgType: "magic", cd: 5.5, dmg: 95, radius: 135, hitShield: 90, minLv: 1 , damageBase: 95, paRatio: 0.00, mpRatio: 0.45, scalingStatus: "provisional-Stage-0A", manaCost: 60, manaStatus: "provisional-Stage-0B"},
      { name: "Sand Wave", icon: "🏜️", desc: "(Lv.2+) Small-mid sand wave that roots enemies (0.9s).", type: "sand_wave", dmgType: "magic", cd: 9, dmg: 85, speed: 620, range: 350, r: 42, root: 0.9, minLv: 2 , damageBase: 85, paRatio: 0.00, mpRatio: 0.45, scalingStatus: "provisional-Stage-0A", manaCost: 75, manaStatus: "provisional-Stage-0B"},
      { name: "Encore Anthem", icon: "🎶", desc: "(Lv.4+) Aura heals nearby allies 12% Max HP + 8% Max HP Shield (5s).", type: "team_anthem", dmgType: "magic", cd: 24, radius: 260, healPct: 0.12, shieldPct: 0.08, shieldDur: 5.0, minLv: 4 , manaCost: 120, manaStatus: "provisional-Stage-0B"},
    ],
  },
  {
    id: "zora", name: "Zora", emoji: "⚡", color: "#ffee58", role: "Mage",
    voice: "zora_012817.mp3", quote: "Let the storm decide.",
    hp: 1050, atk: 46, armor: 16, mres: 26, range: 340, speed: 220, aspd: 1.0, price: 350,
    passive: "Static Charge: Skills apply Static (3 stacks = 100 magic zap). Ambush: Thunderbolt cast from a bush deals +20% damage & stuns 0.25s longer. Burst Mage: huge damage in a short window.",
    skills: [
      { name: "Thunderbolt", icon: "🌩️", desc: "Fast lightning bolt that damages & stuns (0.7s). Combo: 1 → 3 → 2.", type: "shot", dmgType: "magic", cd: 4.5, dmg: 75, speed: 860, range: 520, r: 19, slow: 0.9, stun: 0.7, staticStack: 1 , damageBase: 75, paRatio: 0.00, mpRatio: 2.25, scalingStatus: "v6.0-mage-revamp", manaCost: 50, manaStatus: "provisional-Stage-0B"},
      { name: "Chain Reaction", icon: "⚡", desc: "Lightning bounces up to 4 enemies (82% damage per jump).", type: "chain", dmgType: "magic", cd: 7.5, dmg: 72, range: 440, bounces: 4, falloff: 0.82, staticStack: 1 , damageBase: 72, paRatio: 0.00, mpRatio: 2.00, scalingStatus: "v6.0-mage-revamp", manaCost: 70, manaStatus: "provisional-Stage-0B"},
      { name: "Stormcaller", icon: "⛈️", desc: "(Lv.4+) Marks an area (0.5s warning), then a thunderstorm breaks: 5 rapid bolts (0.22s apart) strike EVERY enemy inside and slow them; the final thunderclap hits 2.4x as hard and stuns (0.6s).", type: "storm", dmgType: "magic", cd: 26, dmg: 34, strikes: 5, radius: 215, range: 520, dur: 0.4, delay: 0.5, tick: 0.22, finalMult: 2.4, finalStun: 0.6 , damageBase: 34, paRatio: 0.00, mpRatio: 0.50, scalingStatus: "v6.0-mage-revamp", manaCost: 115, manaStatus: "provisional-Stage-0B"},
    ],
  },
  {
    id: "deana", name: "De'ana", emoji: "🌸", color: "#8bc34a", role: "Mage",
    voice: "deana_012820.mp3", quote: "Even thorns bloom, gently.",
    /* v7.0 SPRITE SHEETS (first hero with full animation). Every frame sits in a square cell, read left-to-right, top-to-bottom.
       scale = on-screen size of a cell / cell px; foot = pixel row of the feet inside a cell (the feet are pinned to the hero's ground point).
       Sheets face RIGHT; the engine mirrors them when the hero faces left. cast.from = first frame played (frame 8 is the beam release). */
    sprites: { dir: "sprites/deana/", cell: 256, scale: 0.46, foot: 243, refSpeed: 215,
      anims: {
        idle:  { src: "idle.webp",  cols: 5, frames: 16, fps: 12, loop: true },
        walk:  { src: "walk.webp",  cols: 5, frames: 25, fps: 30, loop: true },
        cast:  { src: "cast.webp",  cols: 5, frames: 25, fps: 34, from: 6 },
        death: { src: "death.webp", cols: 5, frames: 25, fps: 16, hold: 1.2, fade: 0.8 },
      } },
    hp: 1050, atk: 44, armor: 17, mres: 26, range: 340, speed: 215, aspd: 0.95, price: 380,
    passive: "Botanical Quiet: Restores 4 HP every 10 seconds while resting in a grass bush (resets when hit).",
    skills: [
      { name: "Thornhook", icon: "🪝", desc: "Dodgeable brown hook: hits first enemy, roots (0.8s) & pulls it toward you. Sets up Root Awakening.", type: "hook", dmgType: "magic", cd: 8.5, dmg: 60, speed: 680, range: 450, r: 18, pull: 140, root: 0.8 , damageBase: 60, paRatio: 0.00, mpRatio: 0.90, scalingStatus: "v6.0-mage-revamp", manaCost: 55, manaStatus: "provisional-Stage-0B"},
      { name: "Petal Tempest", icon: "🌸", desc: "2.5s small petal vortex dealing interval damage & slow in target area.", type: "vortex", dmgType: "magic", cd: 9, dmg: 18, radius: 135, range: 480, dur: 2.5, tick: 0.5, slow: 1.2 , damageBase: 18, paRatio: 0.00, mpRatio: 0.26, scalingStatus: "v6.0-mage-revamp", manaCost: 70, manaStatus: "provisional-Stage-0B"},
      { name: "Root Awakening", icon: "🌿", desc: "(Lv.4+) Aim a spot within 500 range: after 0.55s roots burst out 3 times (0.5s apart, 40% damage each, slowing). The final burst roots (0.75s). Lands on a hooked target.", type: "root_burst", dmgType: "magic", cd: 24, dmg: 110, radius: 235, range: 500, delay: 0.55, root: 0.75, pulses: 3, pulseGap: 0.5, pulseDmg: 0.4, pulseSlow: 0.9 , damageBase: 110, paRatio: 0.00, mpRatio: 1.40, scalingStatus: "v6.0-mage-revamp", manaCost: 115, manaStatus: "provisional-Stage-0B"},
    ],
  },
  {
    id: "gorn", name: "Gorn", emoji: "🪓", color: "#d84315", role: "Fighter",
    voice: "gorn_012816.mp3", quote: "Blood for the Realm!",
    hp: 1650, atk: 58, armor: 34, mres: 26, range: 100, speed: 225, aspd: 0.92, price: 400,
    passive: "Bloodlust: 4 basic attacks build Fury, empowering next skill (+30% DMG & 8% missing HP heal).",
    skills: [
      { name: "Savage Leap", icon: "🦘", desc: "Leaps to target point, slamming enemies on impact.", type: "leap", dmgType: "phys", cd: 6.5, dmg: 140, dist: 310, radius: 135 , damageBase: 140, paRatio: 0.60, mpRatio: 0.00, scalingStatus: "provisional-Stage-0A", manaCost: 55, manaStatus: "provisional-Stage-0B"},
      { name: "Whirlwind", icon: "🌪️", desc: "Spins axe for 2s (4 ticks) while moving & slowing enemies.", type: "whirlwind", dmgType: "phys", cd: 8, dmg: 40, ticks: 4, dur: 2.0, radius: 165, slow: 0.8 , damageBase: 40, paRatio: 0.35, mpRatio: 0.00, scalingStatus: "provisional-Stage-0A", manaCost: 70, manaStatus: "provisional-Stage-0B"},
      { name: "Berserker's Roar", icon: "📣", desc: "(Lv.4+) 5s Rage: +20% temporary Max HP & +20% ATK.", type: "berserk", dmgType: "phys", cd: 26, dur: 5.0 , manaCost: 110, manaStatus: "provisional-Stage-0B"},
    ],
  },
  {
    id: "felix", name: "Felix", emoji: "🌌", artFallback: "felix.jpg", color: "#26c6da", role: "Control Mage",
    voice: "felix_012818.mp3", quote: "Gravity bends to my will.",
    hp: 1100, atk: 46, armor: 17, mres: 26, range: 340, speed: 215, aspd: 0.95, price: 450,
    passive: "Cosmic Gravity: At Lv.4+, gains +12% Move Speed (+18% near enemies hit by gravity).",
    skills: [
      { name: "Gravity Well", icon: "🌀", desc: "0.5s delay: pulls enemies inward & blocks dashes for 1.4s.", type: "gravity", dmgType: "magic", cd: 9, dmg: 55, radius: 155, range: 460, delay: 0.5, duration: 1.4 , damageBase: 55, paRatio: 0.00, mpRatio: 1.00, scalingStatus: "v6.0-mage-revamp", manaCost: 60, manaStatus: "provisional-Stage-0B"},
      { name: "Astral Wave", icon: "🌊", desc: "Fires 2 waves 0.4s apart (55% damage each); the 2nd re-aims toward a nearby enemy. Reveals bush-hidden enemies (3.5s) + slows targets.", type: "wave", dmgType: "magic", cd: 7.5, dmg: 65, speed: 780, range: 720, r: 42, slow: 1.4, reveal: 3.5, waves: 2, waveGap: 0.4, waveDmg: 0.55 , damageBase: 65, paRatio: 0.00, mpRatio: 1.10, scalingStatus: "v6.0-mage-revamp", manaCost: 75, manaStatus: "provisional-Stage-0B"},
      { name: "Ethereal Beam", icon: "💠", desc: "(Lv.4+) 0.85s warning line, then fires a massive cosmic beam into base.", type: "beam", dmgType: "magic", cd: 28, dmg: 130, range: 2600, width: 50, delay: 0.85 , damageBase: 130, paRatio: 0.00, mpRatio: 1.40, scalingStatus: "v6.0-mage-revamp", manaCost: 120, manaStatus: "provisional-Stage-0B"},
    ],
  },
];

(function(){
  // Individual skill damage is defined per hero; no universal role damage multiplier.
  // Cooldown tuning remains separate from the damage specification.
  HEROES.forEach(h=>h.skills.forEach((k,i)=>{k.cd=+(k.cd*(i===2?1.12:1.2)).toFixed(1);}));
})();

/* ===== v7.5 IMAGE ICONS =====
   Skill / passive / Recall / Regen icons come from icons/ (<hero>_s1.png, _s2, _s3, <hero>_passive.png, recall.png, regen1.jpg).
   If a file is missing the old emoji is shown instead (onerror fallback), so nothing ever renders blank. */
const RCIcon = {
  dir: "icons/",
  skill(heroId, i) { return this.dir + heroId + "_s" + (i + 1) + ".png"; },
  passive(heroId) { return this.dir + heroId + "_passive.png"; },
  recall: "icons/recall.png",
  regen: "icons/regen1.jpg",
  html(src, fallback, cls) {
    const fb = String(fallback || "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
    return `<img class="${cls || "ico-img"}" src="${src}" alt="" draggable="false" data-fb="${fb}" onerror="this.replaceWith(document.createTextNode(this.dataset.fb))">`;
  },
  items: "icons/items/",
  item(id) { return this.items + id + ".png"; },
  /* v7.8: item art (icons/items/<item-id>.png, 41 files: components, intermediates, completed, boots); emoji fallback if a file is missing */
  itemHtml(id, fallback, cls) { return this.html(this.item(id), fallback, cls || "ico-img item-img"); },
  skillHtml(hero, i) { return this.html(this.skill(hero.id, i), hero.skills[i] && hero.skills[i].icon); },
  passiveHtml(hero) { return this.html(this.passive(hero.id), "✨"); }
};

/* ===== v5.4 HERO ART (banners) =====
   Looks for (first hit wins):  heroes/<id>.<ext>  ->  heroes/<id>_banner.<ext>  ->  <id>_banner.<ext>   (ext: webp jpg jpeg png)
   then the hero's `artFallback` (felix.jpg) -> heroes/_preview/<id>.jpg -> emoji.
   The winner is stored in hero.img, so the hero list, lobby, HUD portraits AND the battlefield token all use the same picture.
   Wide banners (landscape) are zoomed onto the character instead of being squashed. */
const HeroArt = {
  exts: ["webp", "jpg", "jpeg", "png"], key: "realmClashArt_v2",
  candidates(h) {
    const L = [];
    [`heroes/${h.id}`, `heroes/${h.id}_banner`, `${h.id}_banner`].forEach((n) => this.exts.forEach((e) => L.push(`${n}.${e}`)));
    if (h.artFallback) L.push(h.artFallback);
    L.push(`heroes/_preview/${h.id}.jpg`);
    return L;
  },
  apply(h, src, im) { h._art = src; h.img = src; h._wide = !!im && im.naturalWidth / Math.max(1, im.naturalHeight) > 1.3; },
  /* finds the art for one hero; onChange() fires once it is found. The winning path is remembered so later launches skip the probing. */
  resolve(h, onChange) {
    if (h._artState) return; h._artState = 1;
    let mem = {}; try { mem = JSON.parse(localStorage.getItem(this.key)) || {}; } catch (e) {}
    const list = this.candidates(h), remembered = mem[h.id];
    const probe = (src, fail) => { const im = new Image(); im.onload = () => { this.apply(h, src, im); h._artState = 2; try { mem[h.id] = src; localStorage.setItem(this.key, JSON.stringify(mem)); } catch (e) {} onChange && onChange(h); }; im.onerror = fail; im.src = src; };
    const walk = (i) => { if (i >= list.length) return; probe(list[i], () => walk(i + 1)); };
    if (remembered && list.includes(remembered)) {
      // a better candidate may have been added since last time (e.g. the real banner replacing a preview): check those first, cheaply
      const better = list.slice(0, list.indexOf(remembered));
      if (!better.length) return probe(remembered, () => walk(0));
      let i = 0; const up = () => { if (i >= better.length) return probe(remembered, () => walk(0)); probe(better[i++], up); }; up();
    } else walk(0);
  },
  /* square source rectangle [sx, sy, sw, sh] of the picture that shows the character's face/upper body */
  crop(img) {
    const w = img.naturalWidth, hh = img.naturalHeight, ar = w / hh;
    if (ar > 1.3) { const s = hh * 0.4; return [w * 0.5 - s / 2, hh * 0.048, s, s]; }   // wide banner: zoom on the centred character
    if (ar < 0.95) return [0, hh * 0.01, w, w];                                          // tall portrait: top square (face)
    const s = Math.min(w, hh); return [(w - s) / 2, (hh - s) / 2, s, s];
  },
  /* paints a hero into a DOM element (circle / chip / card): picture if there is one, emoji otherwise */
  paint(el, h) {
    if (!el || !h) return;
    if (h.img) { el.textContent = ""; el.style.backgroundImage = `url('${h.img}')`; el.style.backgroundSize = h._wide ? "auto 250%" : ""; el.style.backgroundPosition = h._wide ? "50% 8%" : ""; el.style.backgroundRepeat = "no-repeat"; }
    else { el.style.backgroundImage = ""; el.style.backgroundSize = ""; el.style.backgroundPosition = ""; el.textContent = h.emoji; }
  },
};

const QUESTS = [
  { id: "q1", title: "First Steps", desc: "Play 1 match", need: "played", target: 1, reward: 80 },
  { id: "q2", title: "Warrior Spirit", desc: "Play 5 matches", need: "played", target: 5, reward: 160 },
  { id: "q3", title: "First Victory", desc: "Win 1 match", need: "wins", target: 1, reward: 120 },
  { id: "q4", title: "Arena Champion", desc: "Win 5 matches", need: "wins", target: 5, reward: 300 },
  { id: "q5", title: "Slayer", desc: "Get 25 hero kills", need: "kills", target: 25, reward: 200 },
  { id: "q6", title: "Veteran", desc: "Play 15 matches", need: "played", target: 15, reward: 400 },
  { id: "q7", title: "Realm Legend", desc: "Win 15 matches", need: "wins", target: 15, reward: 700 },
];

const BOT_NAMES = ["Shadow","Nova","Ghost","Titan","Viper","Echo","Rogue","Pixel","Storm","Blitz","Raven","Comet"];

/* ===== SAVE ===== */
const Save = {
  key: "realmClashSave_v1",
  data: null,
  load() {
    let d = {};
    try { d = JSON.parse(localStorage.getItem(this.key)) || {}; } catch (e) {}
    this.data = Object.assign({ coins: 700, unlocked: ["blaze", "aria", "rex"], selected: "blaze", sfx: true, music: true, claimed: [], stats: { played: 0, wins: 0, kills: 0 }, xp: 0 }, d);
    if (!this.data.stats) this.data.stats = { played: 0, wins: 0 };
    if (!Array.isArray(this.data.claimed)) this.data.claimed = [];
  },
  save() { try { localStorage.setItem(this.key, JSON.stringify(this.data)); } catch (e) {} },
  owned(id) { return this.data.unlocked.includes(id); },
  buy(h) {
    if (this.owned(h.id) || this.data.coins < h.price) return false;
    this.data.coins -= h.price; this.data.unlocked.push(h.id); this.save(); return true;
  },
};

/* ===== SOUND ENGINE (MP3-READY + WEBAUDIO SYNTH FALLBACK) ===== */
const Sound = {
  ctx: null, timer: null, step: 0, musicMode: "lobby", bgmAudio: null, cache: {},
  // Add .mp3/.ogg/.wav paths here anytime (e.g. kill: "audio/kill.mp3")
  files: {
    // click: "audio/click.mp3",
    // hit: "audio/hit.mp3",
    // skill: "audio/skill.mp3",
    // beam: "audio/beam.mp3",
    // note: "audio/note.mp3",
    // kill: "audio/kill.mp3",
    // firstblood: "audio/firstblood.mp3",
    // doublekill: "audio/doublekill.mp3",
    // triplekill: "audio/triplekill.mp3",
    // quadrakill: "audio/quadrakill.mp3",
    // pentakill: "audio/pentakill.mp3",
    // shutdown: "audio/shutdown.mp3",
    // ace: "audio/ace.mp3",
    // recall: "audio/recall.mp3",
    // regen: "audio/regen.mp3",
    // ping: "audio/ping.mp3",
    // level: "audio/level.mp3",
    // buy: "audio/buy.mp3",
    // win: "audio/win.mp3",
    // lose: "audio/lose.mp3",
    lobbyMusic: "The%20Ascending%20Motif.mp3",    // v7.4: lobby only
    battleMusic: "bg.mp3",                        // v7.4: from the "preparing" screen to the end of the battle
  },
  /* ---- v5.2 ANNOUNCER (female voice, MP3). Lives inside Sound: same SFX mute, same Audio-element pipeline. ----
     Drop recordings into audio/announcer/ using the file names below. A missing file is simply skipped (no error, no stall).
     cat   = category (for organisation only)      pri = priority 1..5 (higher = more important)
     cd    = seconds before the same cue may repeat   ttl = seconds a queued cue stays valid before it is dropped as stale */
  ann: {
    dir: "", vol: 0.9,   // recordings sit next to index.html; set e.g. "audio/announcer/" if you ever move them
    QUEUE_MIN: 2,        // priority >= 2 waits in the queue when the announcer is busy; lower ones (ordinary notifications) are dropped
    INTERRUPT_PRI: 5,    // priority >= 5 (victory / defeat) cuts off whatever is speaking and clears the queue
    MAX_QUEUE: 4, MAX_LEN: 12000,   // MAX_LEN: safety timeout (ms) if a clip never reports 'ended'
    defs: {
      // Match announcements
      welcome:          { cat: "match",   file: "welcome_020819.mp3",   pri: 2, cd: 0,  ttl: 8 },
      pick_hero:        { cat: "match",   file: "pickhero.mp3",         pri: 3, cd: 0,  ttl: 0 },   // v7.4: "Please pick a hero" at the start of the draft
      battle_start:     { cat: "match",   file: null,                   pri: 3, cd: 0,  ttl: 6 },   // no recording yet
      minions_deployed: { cat: "match",   file: null,                   pri: 2, cd: 20, ttl: 6 },   // no recording yet
      // Kill announcements
      first_blood:      { cat: "kill",    file: "firstblood_020808.mp3",  pri: 3, cd: 0,  ttl: 6 },
      double_kill:      { cat: "kill",    file: "double_020807.mp3",      pri: 3, cd: 1.5, ttl: 5 },
      triple_kill:      { cat: "kill",    file: "tripple_020806.mp3",     pri: 3, cd: 1.5, ttl: 5 },
      quadra_kill:      { cat: "kill",    file: "quadrakill_020805.mp3",  pri: 4, cd: 1.5, ttl: 6 },
      penta_kill:       { cat: "kill",    file: "pentakill_020804.mp3",   pri: 4, cd: 1.5, ttl: 6 },
      killing_spree:    { cat: "kill",    file: "killingspree_020803.mp3", pri: 3, cd: 1.5, ttl: 5 },
      godlike:          { cat: "kill",    file: "godlike_020802.mp3",     pri: 3, cd: 1.5, ttl: 5 },
      shutdown:         { cat: "kill",    file: null,                     pri: 4, cd: 1.5, ttl: 5 },   // no recording yet -> falls back to the normal kill line
      // Battle notifications
      ally_slain:       { cat: "notify",  file: "ally_fallen.mp3",   pri: 1, cd: 4,  ttl: 0 },
      enemy_slain:      { cat: "notify",  file: "enemy_defeated_020800.mp3", pri: 1, cd: 4,  ttl: 0 },
      our_turret_destroyed:   { cat: "notify", file: "our_turret_destroyed_020758.mp3",   pri: 2, cd: 3,  ttl: 5 },
      enemy_turret_destroyed: { cat: "notify", file: "enemy_turret_destroyed_020759.mp3", pri: 2, cd: 3,  ttl: 5 },
      turret_under_attack:    { cat: "notify", file: "turret_under_attack_020753.mp3",    pri: 1, cd: 20, ttl: 0 },
      // Personal lines (you were killed / you killed an enemy)
      you_killed:       { cat: "notify",  file: "you_been_killed.mp3",    pri: 2, cd: 1,  ttl: 4 },
      you_killed_enemy: { cat: "notify",  file: "you_killed_enemy.mp3",   pri: 2, cd: 1,  ttl: 4 },
      // Player commands (quick-chat pings)
      cmd_attack:       { cat: "command", file: "attack_020818.mp3",        pri: 2, cd: 3,  ttl: 3 },
      cmd_retreat:      { cat: "command", file: "retreat.mp3",       pri: 2, cd: 3,  ttl: 3 },
      cmd_backup:       { cat: "command", file: "backup_020815.mp3",        pri: 2, cd: 3,  ttl: 3 },
      cmd_defend:       { cat: "command", file: "defend our base_020814.mp3", pri: 2, cd: 3,  ttl: 3 },
      cmd_missing:      { cat: "command", file: "enemy_missing_020812.mp3", pri: 2, cd: 3,  ttl: 3 },
      cmd_push:         { cat: "command", file: "pushlane_020811.mp3",      pri: 2, cd: 3,  ttl: 3 },
      cmd_wp:           { cat: "command", file: "well_played_020809.mp3",   pri: 2, cd: 3,  ttl: 3 },
      // Victory & defeat
      victory:          { cat: "result",  file: "victory_021114.mp3",       pri: 5, cd: 0,  ttl: 0 },
      defeat:           { cat: "result",  file: "defeat_021105.mp3",        pri: 5, cd: 0,  ttl: 0 },
    },
    el: null, unlocked: false, bad: {}, queue: [], cur: null, last: {},
  },
  /* ONE persistent <audio> element is reused for every cue (a new element per cue made some browsers stop playing after a while,
     and mobile browsers only allow elements that were unlocked by a tap). */
  annEl() {
    const A = this.ann;
    if (!A.el) { try { A.el = new Audio(); A.el.preload = "auto"; } catch (e) { A.el = null; } }
    return A.el;
  },
  annUnlock() {                                  // called from the first tap: unlock the element with a silent clip
    const A = this.ann, el = this.annEl();
    if (!el || A.unlocked) return; A.unlocked = true;
    try {
      el.muted = true; el.src = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=";
      const p = el.play();
      const back = () => { try { el.pause(); el.muted = false; } catch (e) {} };
      if (p && p.then) p.then(back, () => { A.unlocked = false; el.muted = false; }); else back();
    } catch (e) {}
  },
  /* true when the cue has a recording that hasn't recently failed to load (a failure is forgiven after 60 s) */
  annAvailable(key) {
    const A = this.ann, d = A.defs[key];
    return !!(d && d.file && !(A.bad[key] && Date.now() - A.bad[key] < 60000));
  },
  announce(key) {
    const A = this.ann, d = A.defs[key];
    if (!d || !Save.data || !Save.data.sfx) return false;   // respects the existing SFX mute
    if (!this.annAvailable(key)) return false;                // recording missing: skip quietly (doesn't use up the cooldown)
    const now = Date.now();
    if (d.cd && now - (A.last[key] || 0) < d.cd * 1000) return false;   // cooldown on repeated cues
    if (A.cur) {
      if (d.pri >= A.INTERRUPT_PRI) { A.queue.length = 0; this.annStopCurrent(); }
      else if (d.pri < A.QUEUE_MIN) return false;                        // ordinary notification while busy: drop
      else {
        if (A.queue.some((q) => q.key === key)) return false;
        A.last[key] = now;
        A.queue.push({ key, pri: d.pri, t: now, exp: d.ttl ? now + d.ttl * 1000 : Infinity });
        if (A.queue.length > A.MAX_QUEUE) {                 // keep the most important / newest
          A.queue.sort((a, b) => b.pri - a.pri || a.t - b.t); A.queue.length = A.MAX_QUEUE;
        }
        return true;
      }
    }
    A.last[key] = now;
    return this.annStart(key);
  },
  annStart(key) {
    const A = this.ann, d = A.defs[key], el = this.annEl();
    if (!el || !d || !d.file) { this.annNext(); return false; }
    const cur = { key, dead: false, timer: null };
    const done = () => {
      if (cur.dead) return; cur.dead = true; clearTimeout(cur.timer);
      el.onended = null; el.onerror = null; if (A.cur === cur) A.cur = null;
      this.annNext();
    };
    A.cur = cur; cur.timer = setTimeout(done, A.MAX_LEN);
    const hd = this.playBuf(d.file, A.vol, done);                // v5.4: decoded clip through WebAudio when available
    if (hd) { cur.stop = () => hd.stop(); return true; }
    clearTimeout(cur.timer); A.cur = null;
    try {
      A.cur = cur;
      el.onended = done;
      el.onerror = () => { A.bad[key] = Date.now(); done(); };   // missing / unreadable file: skip it, keep the queue moving
      cur.timer = setTimeout(done, A.MAX_LEN);                   // safety net: the queue can never get stuck
      el.muted = false; el.volume = A.vol; el.src = encodeURI(A.dir + d.file);
      const p = el.play(); if (p && p.catch) p.catch(done);
      return true;
    } catch (e) { done(); return false; }
  },
  annNext() {
    const A = this.ann, now = Date.now();
    A.queue = A.queue.filter((q) => q.exp > now && this.annAvailable(q.key));   // stale announcements are not worth saying any more
    if (!A.queue.length || !Save.data || !Save.data.sfx || A.cur) return;
    A.queue.sort((a, b) => b.pri - a.pri || a.t - b.t);
    this.annStart(A.queue.shift().key);
  },
  annStopCurrent() {
    const A = this.ann, c = A.cur; if (!c) return;
    c.dead = true; clearTimeout(c.timer); A.cur = null;
    if (c.stop) { try { c.stop(); } catch (e) {} }
    if (A.el) { A.el.onended = null; A.el.onerror = null; try { A.el.pause(); } catch (e) {} }
  },
  /* stop everything and forget cooldowns: call on match start / leaving a match / SFX switched off */
  annReset() { this.ann.queue.length = 0; this.ann.last = {}; this.annStopCurrent(); },
  /* ---- v5.4 CLIP ENGINE (hero voices + announcer) ----
     Phones are bad at juggling several <audio> elements (music + announcer + voices): clips go silent or get aborted. So short clips are
     decoded once into AudioBuffers and played through WebAudio (instant, mixes with the music, no network wait, works offline).
     If WebAudio / fetch is unavailable (e.g. page opened from file://) or a clip isn't decoded yet, the <audio>-element path is used instead. */
  buf: {}, bufState: {}, primeQ: [], primeOn: false, primed: false,
  loadBuf(file) {
    const ctx = this.ctx;
    if (!file || this.buf[file] || this.bufState[file] || !ctx || typeof fetch !== "function") return Promise.resolve();
    if (typeof location !== "undefined" && location.protocol === "file:") return Promise.resolve();   // fetch() can't read file:// -> element fallback
    this.bufState[file] = 1;
    return fetch(encodeURI(file)).then((r) => { if (!r.ok) throw 0; return r.arrayBuffer(); })
      .then((ab) => new Promise((ok, no) => { const p = ctx.decodeAudioData(ab, ok, no); if (p && p.catch) p.catch(no); }))
      .then((b) => { this.buf[file] = b; this.bufState[file] = 2; })
      .catch(() => { this.bufState[file] = -1; });
  },
  /* decode every voice clip, one at a time, so the main thread never stalls */
  primeClips() {
    if (this.primed || !this.ctx) return; this.primed = true;
    const files = [];
    (typeof HEROES !== "undefined" ? HEROES : []).forEach((h) => h.voice && files.push(h.voice));
    Object.values(this.ann.defs).forEach((d) => d.file && files.push(d.file));
    this.primeQ = [...new Set(files)];
    const pump = () => { const f = this.primeQ.shift(); if (!f) { this.primeOn = false; return; } this.primeOn = true; this.loadBuf(f).then(() => setTimeout(pump, 30)); };
    if (!this.primeOn) pump();
  },
  /* plays a decoded clip; returns a handle {stop()} or null when it can't (not decoded / context not running) */
  playBuf(file, vol, onend) {
    const ctx = this.ctx, b = this.buf[file];
    if (!b || !ctx || ctx.state !== "running") return null;
    try {
      const src = ctx.createBufferSource(), g = ctx.createGain(); src.buffer = b; g.gain.value = vol; src.connect(g); g.connect(ctx.destination);
      const h = { stopped: false, stop() { if (h.stopped) return; h.stopped = true; src.onended = null; try { src.stop(); } catch (e) {} try { src.disconnect(); g.disconnect(); } catch (e) {} } };
      src.onended = () => { if (h.stopped) return; h.stopped = true; onend && onend(); };
      src.start(0);
      return h;
    } catch (e) { return null; }
  },

  /* ---- v5.3/5.4 HERO VOICE: a hero's own line when its card is tapped in the hero list. SFX mute respected, one line at a time
     (latest tap wins), music ducked while the hero speaks. A clip that gets interrupted by the next tap is NOT treated as broken. ---- */
  hv: { els: {}, cur: null, vol: 1.0, duck: 0.12, bad: {}, token: 0 },
  duckMusic(on) { if (this.bgmAudio) { try { this.bgmAudio.volume = on ? this.hv.duck : 0.35; } catch (e) {} } },
  heroVoice(h) {
    const V = this.hv;
    if (!h || !h.voice || !Save.data || !Save.data.sfx) return false;
    if (V.bad[h.id] && Date.now() - V.bad[h.id] < 30000) return false;      // only files the browser truly can't read are skipped
    this.heroVoiceStop(true);
    const tok = ++V.token, done = () => { if (V.token !== tok) return; V.cur = null; this.duckMusic(false); };
    const hd = this.playBuf(h.voice, V.vol, done);
    if (hd) { V.cur = hd; this.duckMusic(true); return true; }
    try {                                                                    // fallback: one persistent <audio> per hero (no src swapping)
      let el = V.els[h.id];
      if (!el) { el = new Audio(); el.preload = "auto"; el.src = encodeURI(h.voice); V.els[h.id] = el; }
      el.onended = done; el.onerror = () => { V.bad[h.id] = Date.now(); done(); };
      try { el.currentTime = 0; } catch (e) {}
      el.muted = false; el.volume = V.vol;
      const timer = setTimeout(done, 15000);
      V.cur = { stop() { clearTimeout(timer); try { el.pause(); } catch (e) {} } };
      this.duckMusic(true);
      const p = el.play();
      if (p && p.catch) p.catch((err) => { if (err && err.name === "NotSupportedError") V.bad[h.id] = Date.now(); done(); });   // Abort/NotAllowed: just stop, never blacklist
      return true;
    } catch (e) { return false; }
  },
  heroVoiceStop(keepMusic) {
    const V = this.hv; V.token++;
    if (V.cur) { try { V.cur.stop(); } catch (e) {} V.cur = null; }
    Object.values(V.els).forEach((e) => { try { e.pause(); } catch (x) {} });
    if (!keepMusic) this.duckMusic(false);
  },
  init() {
    if (!this.ctx) { try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} }
    if (this.ctx && this.ctx.state !== "running") { try { const p = this.ctx.resume(); if (p && p.catch) p.catch(() => {}); } catch (e) {} }
    this.primeClips(); this.preload(); this.annUnlock();
    // browsers block autoplay before the first tap: start the music as soon as the player touches the screen
    if (Save.data && Save.data.music && this.musicMode !== "none" && (!this.bgmAudio || this.bgmAudio.paused) && this.files[this.musicMode === "battle" ? "battleMusic" : "lobbyMusic"]) this.startMusic();
  },
  preload() {
    for (const [k, src] of Object.entries(this.files)) {
      if (!src || this.cache[k] || k === "lobbyMusic" || k === "battleMusic") continue;   // the 5 MB music track is streamed by startMusic only (was loaded 3x)
      const a = new Audio(src); a.preload = "auto";
      a.onerror = () => { this.cache[k] = null; };
      this.cache[k] = a;
    }
  },
  playFile(key, vol = 0.65) {
    const base = this.cache[key];
    if (!base) return false;
    try {
      const a = base.cloneNode(); a.volume = vol;
      const p = a.play(); if (p && p.catch) p.catch(() => {});
      return true;
    } catch (e) { return false; }
  },
  tone(f, d, type = "square", v = 0.04, slideTo = null) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime, o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + d);
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g); g.connect(this.ctx.destination); o.start(t); o.stop(t + d);
  },
  sfx(n) {
    if (!Save.data.sfx) return;
    if (this.playFile(n)) return;
    const T = (f, d, ty, v, s, delay) => delay ? setTimeout(() => this.tone(f, d, ty, v, s), delay) : this.tone(f, d, ty, v, s);
    switch (n) {
      case "click": T(520, 0.06); break;
      case "ping": T(780, 0.08, "sine", 0.05, 1040); break;
      case "hit": T(180, 0.07, "sawtooth", 0.03, 90); break;
      case "skill": T(300, 0.2, "sawtooth", 0.04, 700); break;
      case "beam": T(220, 0.38, "sawtooth", 0.06, 980); break;
      case "note": T(587, 0.12, "triangle", 0.04, 784); break;
      case "regen": T(440, 0.14, "sine", 0.04, 660); T(660, 0.18, "sine", 0.04, 880, 100); break;
      case "recall": T(330, 0.35, "sine", 0.05, 880); break;
      case "buy": T(660, 0.1); T(880, 0.15, "square", 0.04, null, 100); break;
      case "level": T(523, 0.09, "triangle", 0.05); T(659, 0.09, "triangle", 0.05, null, 70); T(880, 0.16, "triangle", 0.06, null, 140); break;
      case "firstblood": case "doublekill": case "triplekill": case "quadrakill": case "pentakill": case "shutdown": case "ace": case "kill":
        T(440, 0.1); T(660, 0.15, "square", 0.04, null, 90); break;
      case "win": [523, 659, 784, 1047].forEach((f, i) => T(f, 0.25, "triangle", 0.06, null, i * 150)); break;
      case "lose": [392, 330, 262, 196].forEach((f, i) => T(f, 0.3, "triangle", 0.06, null, i * 180)); break;
    }
  },
  startMusic(mode) {
    this.musicMode = mode || this.musicMode;
    if (this.musicMode === "none") { this.stopMusic(); return; }          // v7.4: silent phase (hero pick / result screen)
    const key = this.musicMode === "battle" ? "battleMusic" : "lobbyMusic";
    // same track already playing (lobby <-> battle share one file): keep it going instead of restarting
    if (Save.data.music && this.files[key] && this.bgmAudio && this.bgmFile === this.files[key] && !this.bgmAudio.paused) return;
    this.stopMusic();
    if (!Save.data.music) return;
    if (this.files[key]) {
      try {
        this.bgmFile = this.files[key];
        this.bgmAudio = new Audio(this.files[key]);
        this.bgmAudio.loop = true; this.bgmAudio.volume = 0.35;
        const p = this.bgmAudio.play(); if (p && p.catch) p.catch(() => {});
        return;
      } catch (e) {}
    }
    const battle = this.musicMode === "battle";
    const pat = battle ? [220, 0, 262, 0, 330, 262, 294, 0, 196, 0, 247, 0, 294, 247, 262, 0] : [262, 330, 392, 330, 294, 349, 440, 349];
    this.timer = setInterval(() => {
      const f = pat[this.step++ % pat.length];
      if (f && Save.data.music) this.tone(f, 0.18, "triangle", 0.03);
    }, battle ? 200 : 320);
  },
  stopMusic() {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
    if (this.bgmAudio) { try { this.bgmAudio.pause(); this.bgmAudio.currentTime = 0; } catch (e) {} this.bgmAudio = null; }
  },
  silence() { this.musicMode = "none"; this.stopMusic(); },               // v7.4: stop the music and keep it stopped until a mode is started again
  refresh() { Save.data.music ? this.startMusic() : this.stopMusic(); },
};
