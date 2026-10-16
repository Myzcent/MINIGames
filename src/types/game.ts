export interface AttributeStats {
  str: number;
  def: number;
  int: number;
  agi: number;
}

export interface SurvivalStats {
  hunger: number;     // 0 - 100
  maxHunger: number;
  thirst: number;     // 0 - 100
  maxThirst: number;
  stamina: number;    // 0 - 100
  maxStamina: number;
}

export interface ItemDef {
  id: string;
  name: string;
  type: 'weapon' | 'armor' | 'accessory' | 'consumable' | 'material' | 'tool';
  icon: string;
  atk?: number;
  def?: number;
  healHp?: number;
  healMp?: number;
  healHunger?: number;
  healThirst?: number;
  price: number;
  desc: string;
}

export interface CraftingRecipe {
  id: string;
  name: string;
  resultItemId: string;
  resultQty: number;
  ingredients: { itemId: string; qty: number }[];
  desc: string;
}

export interface InventoryItem {
  id: string;
  qty: number;
}

export interface SkillDef {
  id: string;
  name: string;
  icon: string;
  mpCost: number;
  staminaCost: number;
  power: number;
  heal?: number;
  desc: string;
  cooldown: number;
}

export interface Quest {
  id: string;
  title: string;
  desc: string;
  targetType: 'talk' | 'kill' | 'boss' | 'gather';
  targetId?: string;
  targetCount?: number;
  currentCount?: number;
  rewardGold: number;
  rewardExp: number;
  rewardItem?: string;
  completed: boolean;
}

export interface EnemyState {
  id: string;
  name: string;
  type: 'slime' | 'skeleton' | 'wolf' | 'golem' | 'boss_bakunawa';
  maxHp: number;
  hp: number;
  atk: number;
  def: number;
  exp: number;
  gold: number;
  level: number;
  x: number;
  z: number;
  isDead: boolean;
  isBoss?: boolean;
  dropItemId?: string;
}

export interface FloatingText {
  id: number;
  text: string;
  x: number;
  y: number;
  type: 'damage' | 'crit' | 'heal' | 'exp' | 'warning';
}

export interface ResourceNode {
  id: string;
  type: 'tree' | 'iron_ore' | 'gold_ore' | 'water_well';
  name: string;
  x: number;
  z: number;
  hp: number;
  maxHp: number;
  yieldItem: string;
}
