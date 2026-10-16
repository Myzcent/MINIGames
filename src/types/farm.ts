export type ToolType = 'select' | 'hoe' | 'plant' | 'water' | 'harvest' | 'fertilizer';

export interface CropDef {
  id: string;
  name: string;
  icon: string;
  seedPrice: number;
  sellPrice: number;
  growthTime: number; // in seconds
  expGain: number;
  unlockLevel: number;
  color: number;
  leafColor: number;
  produceName: string;
  desc: string;
}

export interface FarmPlot {
  id: string;
  gridX: number; // e.g. -3 to 3
  gridZ: number; // e.g. -3 to 3
  isPlowed: boolean;
  cropId: string | null;
  plantedAt: number | null; // Date.now() timestamp
  isWatered: boolean;
  growthProgress: number; // 0 to 1
  isReady: boolean;
}

export interface AnimalDef {
  id: string;
  name: string;
  type: 'chicken' | 'cow' | 'sheep';
  icon: string;
  produceId: string;
  produceName: string;
  produceIcon: string;
  produceInterval: number; // in seconds
  sellPrice: number;
  expGain: number;
  cost: number;
  unlockLevel: number;
  color: number;
}

export interface FarmAnimal {
  id: string;
  defId: string;
  x: number;
  z: number;
  wanderTargetX: number;
  wanderTargetZ: number;
  lastCollectTime: number;
  isReady: boolean;
  progress: number; // 0 to 1
}

export interface OrderQuest {
  id: string;
  customerName: string;
  customerAvatar: string;
  customerRole: string;
  requirements: { itemId: string; name: string; icon: string; qty: number }[];
  rewardCoins: number;
  rewardExp: number;
  rewardGems: number;
  completed: boolean;
}

export interface FarmFloatingText {
  id: number;
  text: string;
  type: 'coin' | 'exp' | 'water' | 'harvest' | 'level';
  screenX: number;
  screenY: number;
}

export interface RemotePlayer {
  id: string;
  name: string;
  color: number;
  x: number;
  z: number;
  targetX?: number;
  targetZ?: number;
  angle: number;
  isWorking: boolean;
  tool: ToolType;
  lastSeen: number;
}

