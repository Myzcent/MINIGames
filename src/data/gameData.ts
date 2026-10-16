import { ItemDef, SkillDef, Quest, CraftingRecipe } from '@/types/game';

export const GAME_ITEMS: Record<string, ItemDef> = {
  // Survival Foods & Drinks
  cooked_meat: {
    id: 'cooked_meat',
    name: 'Grilled Wolf Steak',
    type: 'consumable',
    icon: '🥩',
    healHp: 35,
    healHunger: 50,
    price: 25,
    desc: 'Nutritious roasted meat. Restores +50 Hunger and +35 HP.'
  },
  fresh_water: {
    id: 'fresh_water',
    name: 'Fresh Spring Water',
    type: 'consumable',
    icon: '🥤',
    healThirst: 65,
    healMp: 20,
    price: 15,
    desc: 'Pure water from the village well. Restores +65 Thirst and +20 MP.'
  },
  wild_berries: {
    id: 'wild_berries',
    name: 'Wild Forest Berries',
    type: 'consumable',
    icon: '🫐',
    healHunger: 20,
    healThirst: 20,
    price: 10,
    desc: 'Sweet wild berries that restore +20 Hunger and +20 Thirst.'
  },
  potion_small: {
    id: 'potion_small',
    name: 'Lesser Healing Potion',
    type: 'consumable',
    icon: '🧪',
    healHp: 50,
    price: 30,
    desc: 'Quickly heals 50 points of HP.'
  },
  potion_large: {
    id: 'potion_large',
    name: 'Grand Elixir of Life',
    type: 'consumable',
    icon: '🍷',
    healHp: 150,
    price: 90,
    desc: 'Potent elixir that restores 150 HP.'
  },
  mana_potion: {
    id: 'mana_potion',
    name: 'Blue Mana Potion',
    type: 'consumable',
    icon: '💧',
    healMp: 50,
    price: 40,
    desc: 'Restores 50 points of MP.'
  },

  // Raw Materials
  wood: {
    id: 'wood',
    name: 'Hardwood Timber',
    type: 'material',
    icon: '🪵',
    price: 5,
    desc: 'Gathered by cutting down trees. Used for crafting weapons and fire.'
  },
  iron_ore: {
    id: 'iron_ore',
    name: 'Raw Iron Ore',
    type: 'material',
    icon: '🪨',
    price: 15,
    desc: 'Mined from rock veins. Crucial for forging sturdy plate armor and weapons.'
  },
  gold_ore: {
    id: 'gold_ore',
    name: 'Gold Ore',
    type: 'material',
    icon: '✨',
    price: 40,
    desc: 'Rare precious mineral found on the rocky highlands.'
  },
  wolf_pelt: {
    id: 'wolf_pelt',
    name: 'Dire Wolf Pelt',
    type: 'material',
    icon: '🐺',
    price: 25,
    desc: 'Thick predator fur used for crafting warm, resilient armor.'
  },
  bone_shard: {
    id: 'bone_shard',
    name: 'Skeleton Bone Shard',
    type: 'material',
    icon: '🦴',
    price: 20,
    desc: 'Enchanted bone shard dropped by undead warriors.'
  },

  // Tools & Weapons
  wooden_club: {
    id: 'wooden_club',
    name: 'Heavy Wooden Club',
    type: 'weapon',
    icon: '🏏',
    atk: 8,
    price: 20,
    desc: 'Basic starter bludgeon made from hardened wood. (+8 ATK)'
  },
  axe_iron: {
    id: 'axe_iron',
    name: 'Iron Woodcutter Axe',
    type: 'tool',
    icon: '🪓',
    atk: 14,
    price: 70,
    desc: 'Efficient tool for chopping trees and cleaving foes. (+14 ATK)'
  },
  pickaxe_iron: {
    id: 'pickaxe_iron',
    name: 'Iron Miner Pickaxe',
    type: 'tool',
    icon: '⛏️',
    atk: 12,
    price: 70,
    desc: 'Tool used to extract iron and gold ore from mountain veins. (+12 ATK)'
  },
  sword_iron: {
    id: 'sword_iron',
    name: 'Iron Broadsword',
    type: 'weapon',
    icon: '⚔️',
    atk: 22,
    price: 120,
    desc: 'Sharp and reliable blade forged for wilderness survival. (+22 ATK)'
  },
  sword_dragon: {
    id: 'sword_dragon',
    name: 'Dragon Slayer Blade',
    type: 'weapon',
    icon: '🗡️',
    atk: 50,
    price: 450,
    desc: 'Masterwork weapon forged with gold, iron, and ancient bone. (+50 ATK)'
  },
  armor_leather: {
    id: 'armor_leather',
    name: 'Wolf Leather Armor',
    type: 'armor',
    icon: '🧥',
    def: 12,
    price: 80,
    desc: 'Rugged armor made from dire wolf pelts. (+12 DEF)'
  },
  armor_plate: {
    id: 'armor_plate',
    name: 'Heavy Iron Plate Armor',
    type: 'armor',
    icon: '🛡️',
    def: 28,
    price: 250,
    desc: 'Reinforced iron plates offering high defensive protection. (+28 DEF)'
  },
  torch_item: {
    id: 'torch_item',
    name: 'Flaming Torch',
    type: 'tool',
    icon: '🔥',
    price: 15,
    desc: 'Provides light and wards off dangerous beasts in the dark.'
  }
};

export const CRAFTING_RECIPES: CraftingRecipe[] = [
  {
    id: 'craft_torch',
    name: 'Craft Torches',
    resultItemId: 'torch_item',
    resultQty: 2,
    ingredients: [{ itemId: 'wood', qty: 2 }],
    desc: 'Bind hardwood timber together to make portable light.'
  },
  {
    id: 'craft_club',
    name: 'Wooden Club',
    resultItemId: 'wooden_club',
    resultQty: 1,
    ingredients: [{ itemId: 'wood', qty: 4 }],
    desc: 'Basic blunt weapon to defend yourself against slimes.'
  },
  {
    id: 'craft_pickaxe',
    name: 'Iron Miner Pickaxe',
    resultItemId: 'pickaxe_iron',
    resultQty: 1,
    ingredients: [
      { itemId: 'wood', qty: 3 },
      { itemId: 'iron_ore', qty: 3 }
    ],
    desc: 'Essential for mining rock veins and harvesting raw ores.'
  },
  {
    id: 'craft_axe',
    name: 'Iron Woodcutter Axe',
    resultItemId: 'axe_iron',
    resultQty: 1,
    ingredients: [
      { itemId: 'wood', qty: 3 },
      { itemId: 'iron_ore', qty: 3 }
    ],
    desc: 'Chops down trees significantly faster.'
  },
  {
    id: 'craft_sword_iron',
    name: 'Iron Broadsword',
    resultItemId: 'sword_iron',
    resultQty: 1,
    ingredients: [
      { itemId: 'wood', qty: 4 },
      { itemId: 'iron_ore', qty: 6 }
    ],
    desc: 'Sharp steel blade capable of piercing skeleton armor.'
  },
  {
    id: 'craft_leather_armor',
    name: 'Wolf Leather Armor',
    resultItemId: 'armor_leather',
    resultQty: 1,
    ingredients: [
      { itemId: 'wolf_pelt', qty: 4 }
    ],
    desc: 'Reinforced leather armor crafted from hunted wolf pelts.'
  },
  {
    id: 'craft_cooked_meat',
    name: 'Cook Campfire Meat',
    resultItemId: 'cooked_meat',
    resultQty: 1,
    ingredients: [
      { itemId: 'wood', qty: 1 }
    ],
    desc: 'Roast raw game over a fire to satisfy extreme hunger.'
  },
  {
    id: 'craft_sword_dragon',
    name: 'Dragon Slayer Blade',
    resultItemId: 'sword_dragon',
    resultQty: 1,
    ingredients: [
      { itemId: 'iron_ore', qty: 12 },
      { itemId: 'gold_ore', qty: 6 },
      { itemId: 'bone_shard', qty: 5 }
    ],
    desc: 'The ultimate weapon to slay the mythical Bakunawa! (+50 ATK)'
  }
];

export const GAME_SKILLS: SkillDef[] = [
  {
    id: 'slash',
    name: 'Fierce Slash',
    icon: '⚔️',
    mpCost: 6,
    staminaCost: 10,
    power: 1.5,
    cooldown: 0.6,
    desc: 'Sweeping sword slash. Requires 10 Stamina.'
  },
  {
    id: 'fireball',
    name: 'Mayon Fireball',
    icon: '🔥',
    mpCost: 18,
    staminaCost: 10,
    power: 2.5,
    cooldown: 2.2,
    desc: 'Launches a flying 3D fireball that explodes on impact!'
  },
  {
    id: 'holy_heal',
    name: 'Divine Blessing',
    icon: '✨',
    mpCost: 20,
    staminaCost: 12,
    power: 0,
    heal: 70,
    cooldown: 4.0,
    desc: 'Sacred aura that heals +70 HP to your character.'
  },
  {
    id: 'thunder_strike',
    name: 'Wrath of the Heavens',
    icon: '⚡',
    mpCost: 32,
    staminaCost: 20,
    power: 3.8,
    cooldown: 5.5,
    desc: 'Ultimate divine strike! Calls down giant lightning on the enemy!'
  }
];

export const INITIAL_QUESTS: Quest[] = [
  {
    id: 'q_survive_basics',
    title: 'Wilderness Survival',
    desc: 'Chop down nearby trees and gather 4 Hardwood Timber for basic tools.',
    targetType: 'gather',
    targetId: 'wood',
    targetCount: 4,
    currentCount: 0,
    rewardGold: 40,
    rewardExp: 50,
    rewardItem: 'cooked_meat',
    completed: false
  },
  {
    id: 'q_mine_iron',
    title: 'The Iron Rush',
    desc: 'Venture to the rocky highlands to mine 3 Raw Iron Ore from mountain veins.',
    targetType: 'gather',
    targetId: 'iron_ore',
    targetCount: 3,
    currentCount: 0,
    rewardGold: 70,
    rewardExp: 90,
    rewardItem: 'fresh_water',
    completed: false
  },
  {
    id: 'q_hunt_wolves',
    title: 'Prowling Dire Wolves',
    desc: 'Hunt and slay 4 ferocious Dire Wolves prowling the dark forest edge.',
    targetType: 'kill',
    targetId: 'wolf',
    targetCount: 4,
    currentCount: 0,
    rewardGold: 120,
    rewardExp: 150,
    rewardItem: 'armor_leather',
    completed: false
  },
  {
    id: 'q_slay_golem',
    title: 'Guardian of the Ridge',
    desc: 'Defeat the Stone Golem roaming the highland crags to harvest rare ore.',
    targetType: 'kill',
    targetId: 'golem',
    targetCount: 1,
    currentCount: 0,
    rewardGold: 220,
    rewardExp: 300,
    rewardItem: 'gold_ore',
    completed: false
  },
  {
    id: 'q_defeat_boss',
    title: 'Slay the Dragon King Bakunawa',
    desc: 'Venture into the Northern Volcanic Crater and defeat the colossal Bakunawa!',
    targetType: 'boss',
    targetId: 'boss_bakunawa',
    rewardGold: 800,
    rewardExp: 1000,
    rewardItem: 'sword_dragon',
    completed: false
  }
];
