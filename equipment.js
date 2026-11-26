/* Realm Clash Stage 0I — inventory/stat foundation. No UI or combat hooks in Phase 1. */
(function (global) {
  'use strict';
  const catalog = global.RC_ITEMIZATION;
  if (!catalog || !Array.isArray(catalog.items)) throw new Error('RC_ITEMIZATION catalog must load before equipment.js');
  const byId = new Map(catalog.items.map(item => [item.id, item]));
  const statKeys = new Set(catalog.items.flatMap(item => Object.keys(item.stats || {})));
  function createInventory() { return { slots: Array(6).fill(null), activeItemId: null, blessings: {} }; }
  function getItem(itemId) { return byId.get(itemId) || null; }
  function getOwnedCount(inventory, itemId) { return inventory.slots.filter(id => id === itemId).length; }
  function canEquip(inventory, itemId) {
    const item = getItem(itemId);
    if (!item) return { ok: false, reason: 'unknown-item' };
    if (inventory.slots.every(Boolean)) return { ok: false, reason: 'inventory-full' };
    if (item.category === 'boots' && inventory.slots.some(id => id && getItem(id)?.category === 'boots')) return { ok: false, reason: 'boots-limit' };
    return { ok: true, reason: null };
  }
  function addItem(inventory, itemId) {
    const check = canEquip(inventory, itemId);
    if (!check.ok) return { ok: false, reason: check.reason, inventory };
    const next = { ...inventory, slots: inventory.slots.slice() };
    const index = next.slots.findIndex(slot => slot === null);
    next.slots[index] = itemId;
    return { ok: true, slot: index, inventory: next };
  }
  function removeItem(inventory, slotIndex) {
    if (!Number.isInteger(slotIndex) || slotIndex < 0 || slotIndex >= 6 || !inventory.slots[slotIndex])
      return { ok: false, reason: 'empty-or-invalid-slot', inventory };
    const next = { ...inventory, slots: inventory.slots.slice() };
    const removed = next.slots[slotIndex];
    next.slots[slotIndex] = null;
    if (next.activeItemId === removed) next.activeItemId = null;
    return { ok: true, removed, inventory: next };
  }
  function aggregateStats(inventory) {
    const totals = Object.fromEntries([...statKeys].map(key => [key, 0]));
    const passiveIds = new Set();
    const passives = [];
    for (const id of inventory.slots) {
      if (!id) continue;
      const item = getItem(id);
      for (const [key, value] of Object.entries(item.stats || {})) totals[key] = (totals[key] || 0) + value;
      const passive = item.uniquePassive;
      if (passive && !passiveIds.has(passive.id)) { passiveIds.add(passive.id); passives.push(passive); }
    }
    return { stats: totals, uniquePassives: passives };
  }
  function validateInventory(inventory) {
    const errors = [];
    if (!inventory || !Array.isArray(inventory.slots) || inventory.slots.length !== 6) errors.push('six-slot-array-required');
    else {
      const boots = inventory.slots.filter(id => id && getItem(id)?.category === 'boots');
      if (boots.length > 1) errors.push('more-than-one-boots-item');
      for (const id of inventory.slots) if (id && !getItem(id)) errors.push('unknown-item:' + id);
    }
    return { valid: errors.length === 0, errors };
  }
  global.RCEquipment = Object.freeze({ createInventory, getItem, getOwnedCount, canEquip, addItem, removeItem, aggregateStats, validateInventory, catalog });
})(window);
