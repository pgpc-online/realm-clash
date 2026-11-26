/* Realm Clash Stage 0I catalog. Working values; see status metadata. */
window.RC_ITEMIZATION = {
  "schemaVersion": "1.0.0",
  "system": "Realm Clash Stage 0I itemization",
  "catalogStatus": "WORKING_CATALOG_PROVISIONAL_NUMERICAL_BALANCE",
  "authority": "Stages 0A-0H design specifications plus user-approved Stage 0I decisions; catalog values are working values and not all final balance approvals.",
  "globalRules": {
    "shopAccess": "anywhere",
    "equipmentSlots": 6,
    "bootsOccupySlot": true,
    "maxBoots": 1,
    "baseAttributesStack": true,
    "identicalUniquePassivesStack": false,
    "cooldownReduction": "flat seconds, not percentage",
    "criticalChanceCapPct": 75,
    "criticalDamageMultiplier": 2.0,
    "manaIsDistinctFromMagicPower": true,
    "mpScroll": "temporary testing mechanic only; remove when final itemization provides Mana sources",
    "recipePurchase": "BUY on a completed item automatically buys missing components and assembles it in one atomic transaction; owned ingredients are credited; no manual ingredient selection",
    "quickBuy": "legacy prompt API retained; the shop now uses PRIORITIZE (build priority list, max 6) instead",
    "autoBuy": "optional and toggleable; follows the build priority list strictly: buys the next affordable component, combines ready ingredients, completes the build",
    "ingredientConsumption": "only ingredients of the item being bought are consumed, and never an owned item reserved for a higher-priority build in the priority list",
    "ingredientStats": "consumed ingredient stats are replaced by completed item stats, never duplicated",
    "jungleRoamBlessings": "attached to boots; mutually exclusive; Jungle requires Retribution",
    "sellingRefund": "UNRESOLVED; 70% was proposed but is not an approved rule",
    "attributeCaps": "only critical chance 75% and critical damage 200% are established here; other caps require testing/approval"
  },
  "provisionalValues": {
    "sellRefundRate": 0.70,
    "sellRefundStatus": "PROVISIONAL_NOT_APPROVED"
  },
  "tiers": {
    "component": 1,
    "intermediate": 2,
    "completed": 3,
    "boots": "occupy one regular slot; catalog tier 1 for storage"
  },
  "combiningFees": {
    "tier2": 100,
    "tier3": 200
  },
  "aiBuilds": {
    "Tank": ["duskveil", "warrior-boots", "phoenix-sigil", "soulwell", "guardian-plate", "arcane-guard-boots"],
    "Fighter": ["warbringer", "warrior-boots", "blood-reaver", "ruinous-crossbow", "titan-piercer", "duskveil"],
    "Tank Support": ["soulwell", "tenacity-boots", "phoenix-sigil", "duskveil", "astral-pendant", "chronomancers-focus"],
    "Assassin": ["titan-piercer", "swift-boots", "warbringer", "deadeye", "ruinous-crossbow", "blood-reaver"],
    "Marksman": ["warbringer", "berserker-boots", "deadeye", "ruinous-crossbow", "stormfang", "titan-piercer"],
    "Mage": ["astral-pendant", "sorcerer-boots", "void-catalyst", "echo-scepter", "soulwell", "chronomancers-focus"],
    "Control Mage": ["astral-pendant", "tenacity-boots", "soulwell", "void-catalyst", "phoenix-sigil", "chronomancers-focus"]
  },
  "aiBuildStatus": "PROVISIONAL_ROLE_BASED_BUILDS_FOR_TESTING_NOT_FINAL_HERO_BUILDS",
  "items": [
    {
      "id": "physical-power-component",
      "name": "Physical Power Component",
      "tier": 1,
      "category": "component",
      "price": 300,
      "stats": {
        "physicalAttack": 15
      }
    },
    {
      "id": "magic-power-component",
      "name": "Magic Power Component",
      "tier": 1,
      "category": "component",
      "price": 300,
      "stats": {
        "magicPower": 30
      }
    },
    {
      "id": "vitality-component",
      "name": "Vitality Component",
      "tier": 1,
      "category": "component",
      "price": 300,
      "stats": {
        "maxHp": 250
      }
    },
    {
      "id": "physical-guard-component",
      "name": "Physical Guard Component",
      "tier": 1,
      "category": "component",
      "price": 300,
      "stats": {
        "physicalDefense": 15
      }
    },
    {
      "id": "arcane-guard-component",
      "name": "Arcane Guard Component",
      "tier": 1,
      "category": "component",
      "price": 300,
      "stats": {
        "magicDefense": 15
      }
    },
    {
      "id": "mana-component",
      "name": "Mana Component",
      "tier": 1,
      "category": "component",
      "price": 250,
      "stats": {
        "maxMana": 200
      }
    },
    {
      "id": "mana-recovery-component",
      "name": "Mana Recovery Component",
      "tier": 1,
      "category": "component",
      "price": 250,
      "stats": {
        "manaRegen": 3
      }
    },
    {
      "id": "agility-component",
      "name": "Agility Component",
      "tier": 1,
      "category": "component",
      "price": 300,
      "stats": {
        "attackSpeedPct": 15
      }
    },
    {
      "id": "precision-component",
      "name": "Precision Component",
      "tier": 1,
      "category": "component",
      "price": 300,
      "stats": {
        "critChancePct": 5
      }
    },
    {
      "id": "physical-penetration-component",
      "name": "Physical Penetration Component",
      "tier": 1,
      "category": "component",
      "price": 300,
      "stats": {
        "physicalPenFlat": 10
      }
    },
    {
      "id": "magic-penetration-component",
      "name": "Magic Penetration Component",
      "tier": 1,
      "category": "component",
      "price": 300,
      "stats": {
        "magicPenFlat": 10
      }
    },
    {
      "id": "time-shard",
      "name": "Time Shard",
      "tier": 1,
      "category": "component",
      "price": 350,
      "stats": {
        "cooldownReductionSeconds": 1
      }
    },
    {
      "id": "reinforced-blade",
      "name": "Reinforced Blade",
      "tier": 2,
      "category": "intermediate",
      "price": 700,
      "stats": {
        "physicalAttack": 30
      },
      "recipe": {
        "ingredients": [
          "physical-power-component",
          "physical-power-component"
        ],
        "combiningFee": 100
      }
    },
    {
      "id": "hunters-edge",
      "name": "Hunter's Edge",
      "tier": 2,
      "category": "intermediate",
      "price": 700,
      "stats": {
        "physicalAttack": 15,
        "attackSpeedPct": 15
      },
      "recipe": {
        "ingredients": [
          "physical-power-component",
          "agility-component"
        ],
        "combiningFee": 100
      }
    },
    {
      "id": "piercing-spear",
      "name": "Piercing Spear",
      "tier": 2,
      "category": "intermediate",
      "price": 700,
      "stats": {
        "physicalAttack": 15,
        "physicalPenFlat": 10
      },
      "recipe": {
        "ingredients": [
          "physical-power-component",
          "physical-penetration-component"
        ],
        "combiningFee": 100
      }
    },
    {
      "id": "sharpshooter-lens",
      "name": "Sharpshooter Lens",
      "tier": 2,
      "category": "intermediate",
      "price": 700,
      "stats": {
        "critChancePct": 10
      },
      "recipe": {
        "ingredients": [
          "precision-component",
          "precision-component"
        ],
        "combiningFee": 100
      }
    },
    {
      "id": "arcane-codex",
      "name": "Arcane Codex",
      "tier": 2,
      "category": "intermediate",
      "price": 700,
      "stats": {
        "magicPower": 60
      },
      "recipe": {
        "ingredients": [
          "magic-power-component",
          "magic-power-component"
        ],
        "combiningFee": 100
      }
    },
    {
      "id": "mana-core",
      "name": "Mana Core",
      "tier": 2,
      "category": "intermediate",
      "price": 600,
      "stats": {
        "maxMana": 200,
        "manaRegen": 3
      },
      "recipe": {
        "ingredients": [
          "mana-component",
          "mana-recovery-component"
        ],
        "combiningFee": 100
      }
    },
    {
      "id": "void-fragment",
      "name": "Void Fragment",
      "tier": 2,
      "category": "intermediate",
      "price": 700,
      "stats": {
        "magicPower": 30,
        "magicPenFlat": 10
      },
      "recipe": {
        "ingredients": [
          "magic-power-component",
          "magic-penetration-component"
        ],
        "combiningFee": 100
      }
    },
    {
      "id": "guardian-plate",
      "name": "Guardian Plate",
      "tier": 2,
      "category": "intermediate",
      "price": 700,
      "stats": {
        "maxHp": 250,
        "physicalDefense": 15
      },
      "recipe": {
        "ingredients": [
          "vitality-component",
          "physical-guard-component"
        ],
        "combiningFee": 100
      }
    },
    {
      "id": "warding-mantle",
      "name": "Warding Mantle",
      "tier": 2,
      "category": "intermediate",
      "price": 700,
      "stats": {
        "maxHp": 250,
        "magicDefense": 15
      },
      "recipe": {
        "ingredients": [
          "vitality-component",
          "arcane-guard-component"
        ],
        "combiningFee": 100
      }
    },
    {
      "id": "chrono-relic",
      "name": "Chrono Relic",
      "tier": 2,
      "category": "intermediate",
      "price": 800,
      "stats": {
        "cooldownReductionSeconds": 2
      },
      "recipe": {
        "ingredients": [
          "time-shard",
          "time-shard"
        ],
        "combiningFee": 100
      }
    },
    {
      "id": "warbringer",
      "name": "Warbringer",
      "tier": 3,
      "category": "completed",
      "price": 1200,
      "stats": {
        "physicalAttack": 30,
        "attackSpeedPct": 15
      },
      "recipe": {
        "ingredients": [
          "reinforced-blade",
          "agility-component"
        ],
        "combiningFee": 200
      },
      "uniquePassive": {
        "id": "warbringer-momentum",
        "trigger": "Successful basic attack against an enemy hero",
        "effect": "+4 Physical Attack per stack, up to 5 stacks (+20); 3-second duration refreshed by attacks",
        "status": "provisional"
      }
    },
    {
      "id": "ruinous-crossbow",
      "name": "Ruinous Crossbow",
      "tier": 3,
      "category": "completed",
      "price": 1200,
      "stats": {
        "physicalAttack": 15,
        "physicalPenFlat": 10,
        "attackSpeedPct": 15
      },
      "recipe": {
        "ingredients": [
          "piercing-spear",
          "agility-component"
        ],
        "combiningFee": 200
      },
      "uniquePassive": {
        "id": "ruinous-crossbow-rupture",
        "trigger": "Successful basic attack against an enemy hero",
        "effect": "Reduces target Physical Defense by 3 per stack, up to 4 stacks (12); each stack lasts 3 seconds and refreshes",
        "status": "provisional"
      }
    },
    {
      "id": "titan-piercer",
      "name": "Titan Piercer",
      "tier": 3,
      "category": "completed",
      "price": 1200,
      "stats": {
        "physicalAttack": 30,
        "physicalPenFlat": 10
      },
      "recipe": {
        "ingredients": [
          "piercing-spear",
          "physical-power-component"
        ],
        "combiningFee": 200
      },
      "uniquePassive": {
        "id": "titan-piercer-giant-slayer",
        "trigger": "Basic attack against an enemy hero",
        "effect": "+5% physical damage if target has at least 100 Physical Defense; +8% at 180+; non-stacking",
        "status": "provisional"
      }
    },
    {
      "id": "deadeye",
      "name": "Deadeye",
      "tier": 3,
      "category": "completed",
      "price": 1200,
      "stats": {
        "physicalAttack": 15,
        "critChancePct": 10
      },
      "recipe": {
        "ingredients": [
          "sharpshooter-lens",
          "physical-power-component"
        ],
        "combiningFee": 200
      },
      "uniquePassive": {
        "id": "deadeye-quickstep",
        "trigger": "Critical basic attack against an enemy hero",
        "effect": "+0.20 movement speed for 2 seconds; 4-second passive cooldown",
        "status": "provisional"
      }
    },
    {
      "id": "stormfang",
      "name": "Stormfang",
      "tier": 3,
      "category": "completed",
      "price": 1200,
      "stats": {
        "physicalAttack": 15,
        "attackSpeedPct": 15,
        "critChancePct": 5
      },
      "recipe": {
        "ingredients": [
          "hunters-edge",
          "precision-component"
        ],
        "combiningFee": 200
      },
      "uniquePassive": {
        "id": "stormfang-lightning-strike",
        "trigger": "Every 5th successful basic attack against an enemy hero",
        "effect": "Deals 40 magic damage; cannot critically strike or trigger itself",
        "status": "provisional"
      }
    },
    {
      "id": "astral-pendant",
      "name": "Astral Pendant",
      "tier": 3,
      "category": "completed",
      "price": 1500,
      "stats": {
        "magicPower": 60,
        "maxMana": 200,
        "manaRegen": 3
      },
      "recipe": {
        "ingredients": [
          "arcane-codex",
          "mana-core"
        ],
        "combiningFee": 200
      }
    },
    {
      "id": "void-catalyst",
      "name": "Void Catalyst",
      "tier": 3,
      "category": "completed",
      "price": 1200,
      "stats": {
        "magicPower": 60,
        "magicPenFlat": 10
      },
      "recipe": {
        "ingredients": [
          "void-fragment",
          "magic-power-component"
        ],
        "combiningFee": 200
      },
      "uniquePassive": {
        "id": "void-catalyst-void-exposure",
        "trigger": "Skill damage against an enemy hero",
        "effect": "+5% magic damage if target has at least 100 Magic Defense; +8% at 180+; non-stacking",
        "status": "provisional"
      }
    },
    {
      "id": "chronomancers-focus",
      "name": "Chronomancer's Focus",
      "tier": 3,
      "category": "completed",
      "price": 1250,
      "stats": {
        "cooldownReductionSeconds": 2,
        "maxMana": 200
      },
      "recipe": {
        "ingredients": [
          "chrono-relic",
          "mana-component"
        ],
        "combiningFee": 200
      },
      "uniquePassive": {
        "id": "chronomancers-focus-time-return",
        "trigger": "Hero takedown",
        "effect": "Restores 10% maximum Mana; 10-second cooldown",
        "status": "provisional"
      }
    },
    {
      "id": "duskveil",
      "name": "Duskveil",
      "tier": 3,
      "category": "completed",
      "price": 1200,
      "stats": {
        "maxHp": 250,
        "physicalDefense": 30
      },
      "recipe": {
        "ingredients": [
          "guardian-plate",
          "physical-guard-component"
        ],
        "combiningFee": 200
      },
      "uniquePassive": {
        "id": "duskveil-umbral-protection",
        "trigger": "Incoming physical damage",
        "effect": "Reduces incoming physical damage by 8%; subject to equipment damage-reduction limit if approved",
        "status": "provisional"
      }
    },
    {
      "id": "blood-reaver",
      "name": "Blood Reaver",
      "tier": 3,
      "category": "completed",
      "price": 1200,
      "stats": {
        "physicalAttack": 30,
        "maxHp": 250
      },
      "recipe": {
        "ingredients": [
          "reinforced-blade",
          "vitality-component"
        ],
        "combiningFee": 200
      },
      "uniquePassive": {
        "id": "blood-reaver-blood-harvest",
        "trigger": "Hero takedown",
        "effect": "Restores 10% missing HP; 10-second cooldown",
        "status": "provisional"
      }
    },
    {
      "id": "soulwell",
      "name": "Soulwell",
      "tier": 3,
      "category": "completed",
      "price": 1600,
      "stats": {
        "magicPower": 60,
        "maxHp": 250,
        "magicDefense": 15
      },
      "recipe": {
        "ingredients": [
          "arcane-codex",
          "warding-mantle"
        ],
        "combiningFee": 200
      },
      "uniquePassive": {
        "id": "soulwell-soul-drain",
        "trigger": "Skill damage to an enemy hero",
        "effect": "Restores 3% maximum Mana; 3-second internal cooldown; one activation per cast regardless of targets; DoT ticks do not retrigger",
        "status": "provisional"
      }
    },
    {
      "id": "phoenix-sigil",
      "name": "Phoenix Sigil",
      "tier": 3,
      "category": "completed",
      "price": 1250,
      "stats": {
        "maxHp": 250,
        "magicDefense": 15,
        "cooldownReductionSeconds": 1
      },
      "recipe": {
        "ingredients": [
          "warding-mantle",
          "time-shard"
        ],
        "combiningFee": 200
      },
      "uniquePassive": {
        "id": "phoenix-sigil-rebirth",
        "trigger": "Lethal damage",
        "effect": "Once every 180 seconds, leaves hero at 1 HP; does not heal or prevent crowd control/subsequent damage",
        "status": "provisional"
      }
    },
    {
      "id": "echo-scepter",
      "name": "Echo Scepter",
      "tier": 3,
      "category": "completed",
      "price": 1250,
      "stats": {
        "magicPower": 60,
        "cooldownReductionSeconds": 1
      },
      "recipe": {
        "ingredients": [
          "arcane-codex",
          "time-shard"
        ],
        "combiningFee": 200
      },
      "uniquePassive": {
        "id": "echo-scepter-resonance",
        "trigger": "Damaging skill cast",
        "effect": "Every 6s, your next damaging skill echoes 0.35s later: 80 (+0.45 Magic Power) magic damage to all enemy heroes and minions within 280 range; once per cast, no crit; utility skills do not consume it",
        "status": "provisional"
      }
    },
    {
      "id": "swift-boots",
      "name": "Swift Boots",
      "tier": 1,
      "category": "boots",
      "price": 700,
      "stats": {
        "movementSpeed": 0.5
      },
      "notes": "Jungle/Roam blessing attachment rules are defined in Stage 0I; blessing prices and effects remain unresolved."
    },
    {
      "id": "warrior-boots",
      "name": "Warrior Boots",
      "tier": 1,
      "category": "boots",
      "price": 750,
      "stats": {
        "movementSpeed": 0.3,
        "physicalDefense": 15
      },
      "notes": "Jungle/Roam blessing attachment rules are defined in Stage 0I; blessing prices and effects remain unresolved."
    },
    {
      "id": "arcane-guard-boots",
      "name": "Arcane Guard Boots",
      "tier": 1,
      "category": "boots",
      "price": 750,
      "stats": {
        "movementSpeed": 0.3,
        "magicDefense": 15
      },
      "notes": "Jungle/Roam blessing attachment rules are defined in Stage 0I; blessing prices and effects remain unresolved."
    },
    {
      "id": "berserker-boots",
      "name": "Berserker Boots",
      "tier": 1,
      "category": "boots",
      "price": 800,
      "stats": {
        "movementSpeed": 0.3,
        "attackSpeedPct": 10
      },
      "notes": "Jungle/Roam blessing attachment rules are defined in Stage 0I; blessing prices and effects remain unresolved."
    },
    {
      "id": "sorcerer-boots",
      "name": "Sorcerer Boots",
      "tier": 1,
      "category": "boots",
      "price": 800,
      "stats": {
        "movementSpeed": 0.3,
        "magicPower": 30
      },
      "notes": "Jungle/Roam blessing attachment rules are defined in Stage 0I; blessing prices and effects remain unresolved."
    },
    {
      "id": "tenacity-boots",
      "name": "Tenacity Boots",
      "tier": 1,
      "category": "boots",
      "price": 850,
      "stats": {
        "movementSpeed": 0.3,
        "maxHp": 200,
        "ccDurationReductionPct": 15
      },
      "notes": "Jungle/Roam blessing attachment rules are defined in Stage 0I; blessing prices and effects remain unresolved."
    }
  ],
  "blessings": {
    "status": "NOT_FINALIZED",
    "rule": "Jungle and Roam mutually exclusive; Jungle requires Retribution; blessings attach to boots and do not occupy an extra slot."
  }
};
