import { CropDef, AnimalDef, OrderQuest } from '@/types/farm';

export const FARM_CROPS: Record<string, CropDef> = {
  wheat: {
    id: 'wheat',
    name: 'Wheat',
    icon: '🌾',
    seedPrice: 12,
    sellPrice: 22,
    growthTime: 8,
    expGain: 8,
    unlockLevel: 1,
    color: 0xf59e0b, // Amber Gold
    leafColor: 0x84cc16,
    produceName: 'Golden Wheat Sheaf',
    desc: 'Fast-growing golden grain. Essential staple for bread and feeding farm animals.'
  },
  carrot: {
    id: 'carrot',
    name: 'Carrot',
    icon: '🥕',
    seedPrice: 25,
    sellPrice: 48,
    growthTime: 14,
    expGain: 15,
    unlockLevel: 1,
    color: 0xf97316, // Orange
    leafColor: 0x22c55e,
    produceName: 'Sweet Crisp Carrot',
    desc: 'Bright orange, crunchy vegetable that sells quickly at the market stand.'
  },
  tomato: {
    id: 'tomato',
    name: 'Tomato',
    icon: '🍅',
    seedPrice: 45,
    sellPrice: 88,
    growthTime: 22,
    expGain: 28,
    unlockLevel: 2,
    color: 0xef4444, // Red
    leafColor: 0x16a34a,
    produceName: 'Juicy Red Tomato',
    desc: 'Plump and sun-ripened tomatoes favored by the town pizzeria.'
  },
  strawberry: {
    id: 'strawberry',
    name: 'Strawberry',
    icon: '🍓',
    seedPrice: 70,
    sellPrice: 145,
    growthTime: 32,
    expGain: 45,
    unlockLevel: 2,
    color: 0xf43f5e, // Rose / Strawberry red
    leafColor: 0x15803d,
    produceName: 'Sweet Strawberry',
    desc: 'Sweet, fragrant berry with high market value and delicious flavor.'
  },
  corn: {
    id: 'corn',
    name: 'Sweet Corn',
    icon: '🌽',
    seedPrice: 110,
    sellPrice: 235,
    growthTime: 45,
    expGain: 75,
    unlockLevel: 3,
    color: 0xfacc15, // Bright yellow
    leafColor: 0x4ade80,
    produceName: 'Golden Sweet Corn',
    desc: 'Tall stalks of golden sweet corn that fetch hefty profits from market traders.'
  },
  pumpkin: {
    id: 'pumpkin',
    name: 'Giant Pumpkin',
    icon: '🎃',
    seedPrice: 180,
    sellPrice: 410,
    growthTime: 65,
    expGain: 130,
    unlockLevel: 4,
    color: 0xea580c, // Deep pumpkin orange
    leafColor: 0x166534,
    produceName: 'Prize Pumpkin',
    desc: 'Hefty, prize-winning pumpkin that awards massive farmer experience and coins.'
  },
  sunflower: {
    id: 'sunflower',
    name: 'Golden Sunflower',
    icon: '🌻',
    seedPrice: 280,
    sellPrice: 660,
    growthTime: 90,
    expGain: 210,
    unlockLevel: 5,
    color: 0xfde047, // Radiant sunflower yellow
    leafColor: 0x15803d,
    produceName: 'Radiant Sunflower',
    desc: 'Magnificent sunflower bringing dazzling beauty and top-tier harvest income.'
  }
};

export const FARM_ANIMALS: Record<string, AnimalDef> = {
  chicken: {
    id: 'chicken',
    name: 'Clucky Hen',
    type: 'chicken',
    icon: '🐔',
    produceId: 'egg',
    produceName: 'Fresh Farm Egg',
    produceIcon: '🥚',
    produceInterval: 18,
    sellPrice: 32,
    expGain: 18,
    cost: 150,
    unlockLevel: 1,
    color: 0xffffff
  },
  cow: {
    id: 'cow',
    name: 'Daisy the Holstein',
    type: 'cow',
    icon: '🐄',
    produceId: 'milk',
    produceName: 'Bottle of Fresh Milk',
    produceIcon: '🥛',
    produceInterval: 35,
    sellPrice: 75,
    expGain: 40,
    cost: 450,
    unlockLevel: 2,
    color: 0x1e293b
  },
  sheep: {
    id: 'sheep',
    name: 'Fluffy Sheep',
    type: 'sheep',
    icon: '🐑',
    produceId: 'wool',
    produceName: 'Spun White Wool',
    produceIcon: '🧶',
    produceInterval: 55,
    sellPrice: 140,
    expGain: 70,
    cost: 850,
    unlockLevel: 3,
    color: 0xf1f5f9
  }
};

export const FRUIT_PRODUCE: Record<string, { name: string; icon: string; sellPrice: number }> = {
  apple: { name: 'Crisp Red Apple', icon: '🍎', sellPrice: 26 },
  egg: { name: 'Fresh Farm Egg', icon: '🥚', sellPrice: 32 },
  milk: { name: 'Bottle of Fresh Milk', icon: '🥛', sellPrice: 75 },
  wool: { name: 'Spun White Wool', icon: '🧶', sellPrice: 140 }
};

export const INITIAL_ORDERS: OrderQuest[] = [
  {
    id: 'ord_1',
    customerName: 'Grandma Daisy',
    customerAvatar: '👵',
    customerRole: 'Village Baker',
    requirements: [
      { itemId: 'wheat', name: 'Wheat', icon: '🌾', qty: 4 },
      { itemId: 'egg', name: 'Fresh Egg', icon: '🥚', qty: 2 }
    ],
    rewardCoins: 180,
    rewardExp: 60,
    rewardGems: 1,
    completed: false
  },
  {
    id: 'ord_2',
    customerName: 'Chef Pierre',
    customerAvatar: '👨‍🍳',
    customerRole: 'Bistro Head Chef',
    requirements: [
      { itemId: 'carrot', name: 'Carrot', icon: '🥕', qty: 3 },
      { itemId: 'tomato', name: 'Tomato', icon: '🍅', qty: 2 }
    ],
    rewardCoins: 310,
    rewardExp: 95,
    rewardGems: 2,
    completed: false
  },
  {
    id: 'ord_3',
    customerName: 'Sweet Lily',
    customerAvatar: '👧',
    customerRole: 'Pastry Shop Owner',
    requirements: [
      { itemId: 'strawberry', name: 'Strawberry', icon: '🍓', qty: 4 },
      { itemId: 'milk', name: 'Milk', icon: '🥛', qty: 2 }
    ],
    rewardCoins: 560,
    rewardExp: 160,
    rewardGems: 3,
    completed: false
  },
  {
    id: 'ord_4',
    customerName: 'Mayor Higgins',
    customerAvatar: '🎩',
    customerRole: 'Town Mayor',
    requirements: [
      { itemId: 'corn', name: 'Sweet Corn', icon: '🌽', qty: 3 },
      { itemId: 'pumpkin', name: 'Pumpkin', icon: '🎃', qty: 2 }
    ],
    rewardCoins: 920,
    rewardExp: 260,
    rewardGems: 5,
    completed: false
  }
];

export const LEVEL_EXP_TABLE = [
  0,     // Lv 0
  100,   // Lv 1 -> 2
  250,   // Lv 2 -> 3
  500,   // Lv 3 -> 4
  900,   // Lv 4 -> 5
  1500,  // Lv 5 -> 6
  2400,  // Lv 6 -> 7
  3600,  // Lv 7 -> 8
  5200,  // Lv 8 -> 9
  7200   // Lv 9 -> 10
];
