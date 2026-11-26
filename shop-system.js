/* Realm Clash Stage 0I Phase 2 — match-gold shop and atomic recipe transactions. */
(function (global) {
  'use strict';
  const E = global.RCEquipment;
  if (!E) throw new Error('RCEquipment must load before shop-system.js');
  const catalog = E.catalog;
  const items = new Map(catalog.items.map(x => [x.id, x]));
  const cloneInv = inv => ({ ...inv, slots: inv.slots.slice(), blessings: { ...(inv.blessings || {}) } });
  const countIds = ids => ids.reduce((m, id) => m.set(id, (m.get(id) || 0) + 1), new Map());
  function findSlots(slots, needed) {
    const counts = countIds(needed), picked = [];
    for (const [id, count] of counts) {
      const found = [];
      slots.forEach((v, i) => { if (v === id && found.length < count) found.push(i); });
      if (found.length !== count) return null;
      picked.push(...found);
    }
    return picked;
  }
  function purchase(hero, itemId) {
    const item = items.get(itemId);
    if (!hero || !hero.inventory || !item) return { ok: false, reason: 'invalid-purchase' };
    const inv = hero.inventory;
    // Recipe combining is explicit and atomic. All listed ingredients must be owned.
    if (item.recipe && Array.isArray(item.recipe.ingredients)) {
      const selected = findSlots(inv.slots, item.recipe.ingredients);
      if (selected) {
        const ingredientValue = item.recipe.ingredients.reduce((sum, id) => sum + (items.get(id)?.price || 0), 0);
        const due = Math.max(0, item.price - ingredientValue);
        if (hero.gold < due) return { ok: false, reason: 'insufficient-gold', due };
        const remaining = inv.slots.slice();
        selected.sort((a,b) => b-a).forEach(i => remaining.splice(i, 1));
        while (remaining.length < 6) remaining.push(null);
        const free = remaining.findIndex(x => x === null);
        if (free < 0) return { ok: false, reason: 'inventory-full' };
        remaining[free] = itemId;
        hero.gold -= due;
        hero.inventory = { ...inv, slots: remaining };
        return { ok: true, action: 'combine', itemId, spent: due, consumedSlots: selected };
      }
    }
    const can = E.canEquip(inv, itemId);
    if (!can.ok) return { ok: false, reason: can.reason };
    if (hero.gold < item.price) return { ok: false, reason: 'insufficient-gold', due: item.price };
    const added = E.addItem(inv, itemId);
    if (!added.ok) return added;
    hero.gold -= item.price;
    hero.inventory = added.inventory;
    return { ok: true, action: 'buy', itemId, spent: item.price, slot: added.slot };
  }
  function sell(hero, slotIndex, refundRate) {
    if (!hero || !hero.inventory) return { ok: false, reason: 'invalid-hero' };
    if (!Number.isFinite(refundRate) || refundRate < 0 || refundRate > 1) return { ok: false, reason: 'sell-refund-unresolved' };
    const id = hero.inventory.slots[slotIndex], item = items.get(id);
    if (!item) return { ok: false, reason: 'empty-or-invalid-slot' };
    const removed = E.removeItem(hero.inventory, slotIndex);
    if (!removed.ok) return removed;
    const refund = Math.floor(item.price * refundRate);
    hero.gold += refund;
    hero.inventory = removed.inventory;
    if (item.category === 'boots' && hero.inventory.blessings) hero.inventory = { ...hero.inventory, blessings: {} };
    return { ok: true, itemId: id, refund, inventory: hero.inventory };
  }
  function quickBuy(hero, itemId) {
    if (!hero || !items.has(itemId)) return { ok: false, reason: 'unknown-item' };
    hero.quickBuyItemId = itemId;
    return { ok: true, promptOnly: true, itemId, price: items.get(itemId).price };
  }
  function setAutoBuy(hero, enabled) {
    if (!hero) return false;
    hero.autoBuyEnabled = !!enabled;
    return hero.autoBuyEnabled;
  }
  function nextRecipeStep(itemId, inventory) {
    const item = items.get(itemId);
    if (!item || !item.recipe || !Array.isArray(item.recipe.ingredients)) return item;
    const counts = countIds(inventory.slots.filter(Boolean));
    const required = countIds(item.recipe.ingredients);
    for (const [ingredientId, count] of required) {
      if ((counts.get(ingredientId) || 0) < count) return nextRecipeStep(ingredientId, inventory);
    }
    return item;
  }
  function purchaseAI(hero) {
    if (!hero || !hero.inventory || !hero.def) return { ok: false, reason: 'invalid-ai-hero' };
    const build = catalog.aiBuilds && (catalog.aiBuilds[hero.def.role] || catalog.aiBuilds.Mage) || [];
    for (const targetId of build) {
      if (hero.inventory.slots.includes(targetId)) continue;
      const target = items.get(targetId);
      if (!target) continue;
      const bootsOwned = hero.inventory.slots.some(id => id && items.get(id)?.category === 'boots');
      if (target.category === 'boots' && bootsOwned) continue;
      if (target.recipe && findSlots(hero.inventory.slots, target.recipe.ingredients)) {
        const combined = purchase(hero, targetId);
        if (combined.ok) return { ...combined, aiTarget: targetId, selectedItemId: targetId };
      }
      if (hero.gold >= target.price) {
        const direct = purchase(hero, targetId);
        if (direct.ok) return { ...direct, aiTarget: targetId, selectedItemId: targetId };
      }
      const candidate = target.recipe ? nextRecipeStep(targetId, hero.inventory) : target;
      if (!candidate) continue;
      const result = purchase(hero, candidate.id);
      if (result.ok) return { ...result, aiTarget: targetId, selectedItemId: candidate.id };
    }
    return { ok: false, reason: 'no-affordable-build-step' };
  }

  /* ===== Simple Shop: automatic item assembly + build priority (Stage 0I UX) =====
     Players choose WHAT to build; the system handles HOW (recipes, components, combining).
     Rule: assembly never consumes an owned item that is reserved for a higher-priority queued build. */
  const MAX_PRIORITY = 6;
  const priceOf = id => items.get(id)?.price || 0;
  const queueOf = hero => (hero.priorityQueue = Array.isArray(hero.priorityQueue) ? hero.priorityQueue.filter(id => items.has(id)) : []);
  /* Resolve the cheapest way to obtain itemId from the current inventory.
     `used` is a shared Set of slot indexes that may not be consumed (reserved) and collects slots this plan consumes.
     Returns { cost, consumed:[slot], ops:[{type:'buy'|'combine', id, price}] } in execution order. */
  function resolve(itemId, slots, used) {
    const item = items.get(itemId);
    if (!item.recipe || !Array.isArray(item.recipe.ingredients)) return { cost: item.price, consumed: [], ops: [{ type: 'buy', id: itemId, price: item.price }] };
    let cost = 0, fee = item.price;
    const consumed = [], ops = [];
    for (const ing of item.recipe.ingredients) {
      fee -= priceOf(ing);
      const idx = slots.findIndex((v, i) => v === ing && !used.has(i));
      if (idx >= 0) { used.add(idx); consumed.push(idx); continue; }
      const sub = resolve(ing, slots, used);
      cost += sub.cost; consumed.push(...sub.consumed); ops.push(...sub.ops);
    }
    fee = Math.max(0, fee);
    cost += fee;
    ops.push({ type: 'combine', id: itemId, price: fee });
    return { cost, consumed, ops };
  }
  /* Slots reserved by queued builds that rank ahead of `targetId` (all queued builds if the target is not queued). */
  function reservedSlots(hero, targetId) {
    const used = new Set(), q = queueOf(hero), at = q.indexOf(targetId);
    for (const qid of (at < 0 ? q : q.slice(0, at))) if (items.get(qid)?.recipe) resolve(qid, hero.inventory.slots, used);
    return used;
  }
  function planItem(hero, itemId, blocked) {
    const item = items.get(itemId);
    if (!hero || !hero.inventory || !item) return { ok: false, reason: 'invalid-purchase' };
    const inv = hero.inventory, used = new Set(blocked || reservedSlots(hero, itemId));
    const reservedCount = used.size;
    const plan = resolve(itemId, inv.slots, used);
    const remaining = inv.slots.map((v, i) => plan.consumed.includes(i) ? null : v);
    const can = E.canEquip({ ...inv, slots: remaining }, itemId);
    if (!can.ok) return { ok: false, reason: can.reason, cost: plan.cost, consumed: plan.consumed, ops: plan.ops, reservedCount };
    return { ok: true, cost: plan.cost, consumed: plan.consumed, ops: plan.ops, reservedCount, remaining };
  }
  /* BUY: obtain the selected item in one atomic transaction. Missing components are bought and combined automatically;
     owned ingredients (that are not reserved for a higher-priority build) are consumed and credited. */
  function buyItem(hero, itemId, blocked) {
    const plan = planItem(hero, itemId, blocked);
    if (!plan.ok) return { ok: false, reason: plan.reason, due: plan.cost };
    if (hero.gold < plan.cost) return { ok: false, reason: 'insufficient-gold', due: plan.cost };
    const slots = plan.remaining.filter(x => x !== null);
    slots.push(itemId);
    while (slots.length < 6) slots.push(null);
    hero.gold -= plan.cost;
    hero.inventory = { ...hero.inventory, slots };
    const q = queueOf(hero), at = q.indexOf(itemId);
    if (at >= 0) q.splice(at, 1);
    return { ok: true, action: plan.consumed.length ? 'combine' : 'buy', itemId, spent: plan.cost, consumedSlots: plan.consumed, ops: plan.ops };
  }
  function addPriority(hero, itemId) {
    if (!hero || !items.has(itemId)) return { ok: false, reason: 'unknown-item' };
    const q = queueOf(hero);
    if (q.includes(itemId)) return { ok: false, reason: 'already-prioritized' };
    if (q.length >= MAX_PRIORITY) return { ok: false, reason: 'priority-full' };
    if (items.get(itemId).category === 'boots' && q.some(id => items.get(id)?.category === 'boots')) return { ok: false, reason: 'boots-limit' };
    q.push(itemId);
    return { ok: true, queue: q.slice() };
  }
  function removePriority(hero, itemId) {
    const q = queueOf(hero), i = q.indexOf(itemId);
    if (i < 0) return { ok: false, reason: 'not-prioritized' };
    q.splice(i, 1);
    return { ok: true, queue: q.slice() };
  }
  function togglePriority(hero, itemId) {
    return queueOf(hero).includes(itemId) ? { ...removePriority(hero, itemId), removed: true } : addPriority(hero, itemId);
  }
  /* One Auto-Buy step toward the top priority build. Never touches anything outside the queue order.
     1) afford the whole item -> buy/assemble it; 2) otherwise combine ready ingredients; 3) otherwise buy the next affordable component. */
  function autoBuyStep(hero) {
    if (!hero || !hero.inventory) return { ok: false, reason: 'invalid-hero' };
    const q = queueOf(hero);
    while (q.length) {
      const head = q[0], item = items.get(head);
      const owned = hero.inventory.slots.includes(head);
      if (item.category === 'boots' && hero.inventory.slots.some(id => id && items.get(id)?.category === 'boots' && id !== head)) { q.shift(); continue; }
      const blocked = new Set();                                   // head of queue: nothing outranks it
      const plan = planItem(hero, head, blocked);
      if (!plan.ok) {
        if (plan.reason === 'boots-limit') { q.shift(); continue; }
        if (plan.reason !== 'inventory-full') return { ok: false, reason: plan.reason };
      } else if (hero.gold >= plan.cost) {
        const r = buyItem(hero, head, new Set());
        if (r.ok) return { ...r, selectedItemId: head, completed: true };
      }
      if (!item.recipe) return { ok: false, reason: plan.ok ? 'insufficient-gold' : plan.reason };
      const used = new Set(), full = resolve(head, hero.inventory.slots, used);
      // combine any ingredient set that is already complete (frees slots, converts components into stronger items)
      for (const op of full.ops) {
        if (op.type !== 'combine') continue;
        const ing = items.get(op.id).recipe.ingredients, sel = findSlots(hero.inventory.slots, ing);
        if (!sel || hero.gold < op.price) continue;
        const remaining = hero.inventory.slots.slice();
        sel.slice().sort((a, b) => b - a).forEach(i => remaining.splice(i, 1));
        remaining.push(op.id); while (remaining.length < 6) remaining.push(null);
        if (remaining.length > 6) continue;
        hero.gold -= op.price; hero.inventory = { ...hero.inventory, slots: remaining.slice(0, 6) };
        return { ok: true, action: 'combine', itemId: op.id, selectedItemId: op.id, spent: op.price, consumedSlots: sel };
      }
      for (const op of full.ops) {
        if (op.type !== 'buy' || hero.gold < op.price) continue;
        const r = purchase(hero, op.id);
        if (r.ok) return { ...r, selectedItemId: op.id };
        if (r.reason === 'inventory-full') return { ok: false, reason: 'inventory-full' };
      }
      return { ok: false, reason: 'insufficient-gold' };
    }
    return { ok: false, reason: 'queue-empty' };
  }
  /* Read-only description of the next step for UI ("Next: Physical Power Component · 300"). */
  function nextPriorityStep(hero) {
    const q = queueOf(hero);
    if (!q.length || !hero.inventory) return null;
    const plan = planItem(hero, q[0], new Set());
    const op = plan.ops && (plan.ops.find(o => o.type === 'buy') || plan.ops[plan.ops.length - 1]);
    return { targetId: q[0], cost: plan.cost, nextId: op ? op.id : q[0] };
  }
  function attachBlessing(hero, blessingId, config) {
    if (!hero || !hero.inventory || !config || !config[blessingId]) return { ok: false, reason: 'blessing-not-configured' };
    const bootsIndex = hero.inventory.slots.findIndex(id => id && items.get(id)?.category === 'boots');
    if (bootsIndex < 0) return { ok: false, reason: 'boots-required' };
    const cfg = config[blessingId];
    if (hero.inventory.blessings?.[blessingId]) return { ok: false, reason: 'blessing-already-owned' };
    if (blessingId === 'jungle' && hero.battleSpell !== 'retribution') return { ok: false, reason: 'retribution-required' };
    const other = blessingId === 'jungle' ? 'roam' : 'jungle';
    if (hero.inventory.blessings?.[other]) return { ok: false, reason: 'blessings-mutually-exclusive' };
    if (hero.gold < cfg.price) return { ok: false, reason: 'insufficient-gold', due: cfg.price };
    hero.gold -= cfg.price;
    const next = cloneInv(hero.inventory);
    next.blessings[blessingId] = true;
    hero.inventory = next;
    return { ok: true, blessingId, spent: cfg.price, bootsSlot: bootsIndex };
  }
  global.RCShopSystem = Object.freeze({ purchase, sell, quickBuy, setAutoBuy, attachBlessing, findSlots, purchaseAI, nextRecipeStep,
    buyItem, planItem, addPriority, removePriority, togglePriority, autoBuyStep, nextPriorityStep, reservedSlots, MAX_PRIORITY });
})(window);
