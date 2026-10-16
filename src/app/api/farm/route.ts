import { NextResponse } from 'next/server';
import { FarmPlot, RemotePlayer, FarmAnimal } from '@/types/farm';
import { FARM_CROPS, FARM_ANIMALS } from '@/data/farmData';

interface SharedFarmState {
  plots: FarmPlot[];
  animals: FarmAnimal[];
  players: Record<string, RemotePlayer>;
  activities: Array<{ id: string; text: string; time: number }>;
  lastTickTime: number;
}

declare global {
  // eslint-disable-next-line no-var
  var __SHARED_FARM__: SharedFarmState | undefined;
}

function getInitialPlots(): FarmPlot[] {
  const list: FarmPlot[] = [];
  for (let x = -3; x <= 2; x++) {
    for (let z = -3; z <= 2; z++) {
      const id = `plot_${x}_${z}`;
      const isCenter = Math.abs(x) <= 1 && Math.abs(z) <= 1;
      let cropId: string | null = null;
      let plantedAt: number | null = null;
      let isReady = false;
      let growthProgress = 0;

      if (x === 0 && z === 0) {
        cropId = 'wheat';
        plantedAt = Date.now() - 15000;
        isReady = true;
        growthProgress = 1;
      } else if (x === -1 && z === 0) {
        cropId = 'carrot';
        plantedAt = Date.now() - 6000;
        growthProgress = 0.5;
      }

      list.push({
        id,
        gridX: x,
        gridZ: z,
        isPlowed: isCenter,
        cropId,
        plantedAt,
        isWatered: isCenter,
        growthProgress,
        isReady
      });
    }
  }
  return list;
}

function getInitialAnimals(): FarmAnimal[] {
  return [
    {
      id: 'hen_1',
      defId: 'chicken',
      x: -5,
      z: 7,
      wanderTargetX: -6,
      wanderTargetZ: 8,
      lastCollectTime: Date.now() - 10000,
      isReady: true,
      progress: 1
    },
    {
      id: 'cow_1',
      defId: 'cow',
      x: -10,
      z: 8,
      wanderTargetX: -9,
      wanderTargetZ: 9,
      lastCollectTime: Date.now() - 15000,
      isReady: false,
      progress: 0.5
    }
  ];
}

function getSharedState(): SharedFarmState {
  if (!globalThis.__SHARED_FARM__) {
    globalThis.__SHARED_FARM__ = {
      plots: getInitialPlots(),
      animals: getInitialAnimals(),
      players: {},
      activities: [
        { id: 'act_init', text: '🌾 Sunny Meadow Farm opened for co-op play!', time: Date.now() }
      ],
      lastTickTime: Date.now()
    };
  }
  return globalThis.__SHARED_FARM__;
}

// Tick crop growth & animal progress
function tickSharedFarm(state: SharedFarmState) {
  const now = Date.now();

  // Update Crops
  state.plots = state.plots.map(plot => {
    if (!plot.cropId || !plot.plantedAt || plot.isReady) return plot;
    const crop = FARM_CROPS[plot.cropId];
    if (!crop) return plot;

    const elapsedSec = (now - plot.plantedAt) / 1000;
    const speedMultiplier = plot.isWatered ? 2.0 : 1.0;
    const progress = Math.min(1, (elapsedSec * speedMultiplier) / crop.growthTime);
    const isReady = progress >= 1;

    return {
      ...plot,
      growthProgress: progress,
      isReady
    };
  });

  // Update Animals
  state.animals = state.animals.map(anim => {
    const def = FARM_ANIMALS[anim.defId];
    if (!def) return anim;

    const elapsedSec = (now - anim.lastCollectTime) / 1000;
    const progress = Math.min(1, elapsedSec / def.produceInterval);
    const isReady = progress >= 1;

    return {
      ...anim,
      progress,
      isReady
    };
  });

  // Prune inactive players (older than 8 seconds)
  const activePlayers: Record<string, RemotePlayer> = {};
  for (const [id, player] of Object.entries(state.players)) {
    if (now - player.lastSeen < 8000) {
      activePlayers[id] = player;
    }
  }
  state.players = activePlayers;

  state.lastTickTime = now;
}

export async function GET() {
  const state = getSharedState();
  tickSharedFarm(state);

  return NextResponse.json({
    plots: state.plots,
    animals: state.animals,
    players: Object.values(state.players),
    activities: state.activities.slice(-5),
    serverTime: Date.now()
  });
}

export async function POST(req: Request) {
  const state = getSharedState();
  tickSharedFarm(state);
  const body = await req.json();

  const { type, player, plotId, tool, selectedSeedId, animalId } = body;
  const now = Date.now();

  // 1. Heartbeat & Player update
  if (player && player.id) {
    const existing = state.players[player.id] || {
      id: player.id,
      name: player.name || 'Farmer',
      color: player.color || 0x1d4ed8,
      x: 0,
      z: 3.5,
      angle: 0,
      isWorking: false,
      lastSeen: now
    };
    state.players[player.id] = {
      ...existing,
      x: typeof player.x === 'number' && !isNaN(player.x) ? player.x : existing.x,
      z: typeof player.z === 'number' && !isNaN(player.z) ? player.z : existing.z,
      targetX: typeof player.targetX === 'number' && !isNaN(player.targetX) ? player.targetX : existing.targetX,
      targetZ: typeof player.targetZ === 'number' && !isNaN(player.targetZ) ? player.targetZ : existing.targetZ,
      angle: typeof player.angle === 'number' && !isNaN(player.angle) ? player.angle : existing.angle,
      isWorking: typeof player.isWorking === 'boolean' ? player.isWorking : existing.isWorking,
      lastSeen: now
    };
  }

  // 2. Action: Plot Action
  if (type === 'plot_action' && plotId) {
    const plot = state.plots.find(p => p.id === plotId);
    if (plot) {
      let activityText: string | null = null;
      const playerName = player?.name || 'A farmer';

      // Harvest
      if (plot.isReady && (tool === 'harvest' || tool === 'select')) {
        const crop = FARM_CROPS[plot.cropId || ''];
        plot.cropId = null;
        plot.plantedAt = null;
        plot.isReady = false;
        plot.growthProgress = 0;
        plot.isWatered = false;
        activityText = `🧺 ${playerName} harvested ${crop?.name || 'crops'}!`;
      }
      // Speed-Gro Fertilizer
      else if (tool === 'fertilizer' && plot.cropId && !plot.isReady) {
        plot.isReady = true;
        plot.growthProgress = 1.0;
        activityText = `⚡ ${playerName} used Speed-Gro on ${FARM_CROPS[plot.cropId]?.name || 'crop'}!`;
      }
      // Water
      else if (!plot.isWatered && (tool === 'water' || (tool === 'select' && plot.cropId))) {
        plot.isWatered = true;
        activityText = `💧 ${playerName} watered a crop bed!`;
      }
      // Plant
      else if (plot.isPlowed && !plot.cropId && (tool === 'plant' || tool === 'select')) {
        if (selectedSeedId && FARM_CROPS[selectedSeedId]) {
          plot.cropId = selectedSeedId;
          plot.plantedAt = now;
          plot.growthProgress = 0.15;
          plot.isReady = false;
          activityText = `🌱 ${playerName} planted ${FARM_CROPS[selectedSeedId].name}!`;
        }
      }
      // Plow
      else if (!plot.isPlowed && (tool === 'hoe' || tool === 'select')) {
        plot.isPlowed = true;
        activityText = `⛏️ ${playerName} plowed fertile soil!`;
      }

      if (activityText) {
        state.activities.push({ id: `act_${now}`, text: activityText, time: now });
        if (state.activities.length > 20) state.activities.shift();
      }
    }
  }

  // 3. Action: Animal Collect
  if (type === 'animal_collect' && animalId) {
    const animal = state.animals.find(a => a.id === animalId);
    if (animal && animal.isReady) {
      const def = FARM_ANIMALS[animal.defId];
      animal.lastCollectTime = now;
      animal.isReady = false;
      animal.progress = 0;
      const playerName = player?.name || 'A farmer';
      state.activities.push({
        id: `act_${now}`,
        text: `🥛 ${playerName} collected ${def?.produceName || 'produce'}!`,
        time: now
      });
    }
  }

  return NextResponse.json({
    plots: state.plots,
    animals: state.animals,
    players: Object.values(state.players),
    activities: state.activities.slice(-5),
    serverTime: now
  });
}
