'use client';

import React, { useState, useEffect, useRef } from 'react';
import FarmHUD from '@/components/FarmHUD';
import Farm3DCanvas from '@/components/Farm3DCanvas';
import { ToolType, FarmPlot, FarmAnimal, FarmFloatingText, OrderQuest, RemotePlayer } from '@/types/farm';
import { FARM_CROPS, FARM_ANIMALS, FRUIT_PRODUCE, INITIAL_ORDERS, LEVEL_EXP_TABLE } from '@/data/farmData';
import { farmSounds } from '@/utils/audio';

export default function FarmPage() {
  // Player Stats & Progression
  const [level, setLevel] = useState(1);
  const [exp, setExp] = useState(0);
  const [coins, setCoins] = useState(380);
  const [gems, setGems] = useState(8);
  const [fertilizerCount, setFertilizerCount] = useState(3);

  // Local Player Identity for WiFi Co-op (Static during SSR, initialized on mount)
  const [localPlayerId, setLocalPlayerId] = useState<string>('p_host');
  const [playerName, setPlayerName] = useState<string>('Farmer');
  const [playerColor, setPlayerColor] = useState<number>(0x1d4ed8);

  useEffect(() => {
    let id = sessionStorage.getItem('farm_player_id');
    if (!id) {
      id = 'p_' + Math.random().toString(36).substring(2, 8);
      sessionStorage.setItem('farm_player_id', id);
    }
    setLocalPlayerId(id);

    const savedName = sessionStorage.getItem('farm_player_name');
    if (savedName) {
      setPlayerName(savedName);
    } else {
      const generated = `Farmer_${Math.floor(Math.random() * 899 + 100)}`;
      setPlayerName(generated);
      sessionStorage.setItem('farm_player_name', generated);
    }

    const colors = [0x1d4ed8, 0xd97706, 0x16a34a, 0x9333ea, 0xe11d48, 0x0284c7];
    setPlayerColor(colors[Math.floor(Math.random() * colors.length)]);

    if (typeof window !== 'undefined') {
      const port = window.location.port || '3030';
      const host = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? '10.200.54.200' : window.location.hostname;
      setWifiUrl(`http://${host}:${port}`);
    }
  }, []);

  const [remotePlayers, setRemotePlayers] = useState<RemotePlayer[]>([]);
  const [activities, setActivities] = useState<Array<{ id: string; text: string; time: number }>>([]);
  const localFarmerPosRef = useRef({ x: 0, z: 3.5, angle: 0, isWorking: false, targetX: 0, targetZ: 3.5 });
  const [wifiUrl, setWifiUrl] = useState('http://10.200.54.200:3030');

  // Real-time zero-latency multi-tab sync via BroadcastChannel
  useEffect(() => {
    if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') return;

    const channel = new BroadcastChannel('farm_multiplayer_sync');

    channel.onmessage = (event) => {
      const data = event.data;
      if (!data) return;

      if (data.type === 'player_move' && data.player && data.player.id !== localPlayerId) {
        setRemotePlayers(prev => {
          const idx = prev.findIndex(p => p.id === data.player.id);
          if (idx >= 0) {
            const updated = [...prev];
            updated[idx] = { ...updated[idx], ...data.player, lastSeen: Date.now() };
            return updated;
          }
          return [...prev, { ...data.player, lastSeen: Date.now() }];
        });
      }
    };

    return () => {
      channel.close();
    };
  }, [localPlayerId]);

  const handleUpdatePlayerName = (name: string) => {
    setPlayerName(name);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('farm_player_name', name);
    }
  };

  // Farming Tools & Selected Seed
  const [selectedTool, setSelectedTool] = useState<ToolType>('select');
  const [selectedSeedId, setSelectedSeedId] = useState<string | null>('wheat');

  // Inventories
  const [seedInventory, setSeedInventory] = useState<Record<string, number>>({
    wheat: 8,
    carrot: 4,
    tomato: 2
  });

  const [produceInventory, setProduceInventory] = useState<Record<string, number>>({
    apple: 2
  });

  // Orders
  const [orders, setOrders] = useState<OrderQuest[]>(INITIAL_ORDERS);

  // Floating text / Visual FX
  const [floatingTexts, setFloatingTexts] = useState<FarmFloatingText[]>([]);

  // 6x6 Farm Plots Grid Setup (-3 to 2)
  const [plots, setPlots] = useState<FarmPlot[]>(() => {
    const list: FarmPlot[] = [];
    for (let x = -3; x <= 2; x++) {
      for (let z = -3; z <= 2; z++) {
        const id = `plot_${x}_${z}`;
        // Give 4 center starter plots ready / plowed to jumpstart the fun!
        const isCenter = Math.abs(x) <= 1 && Math.abs(z) <= 1;
        const isPlowed = isCenter;
        let cropId: string | null = null;
        let plantedAt: number | null = null;
        let isReady = false;
        let growthProgress = 0;

        if (x === 0 && z === 0) {
          cropId = 'wheat';
          plantedAt = 1000; // Ready!
          isReady = true;
          growthProgress = 1;
        } else if (x === -1 && z === 0) {
          cropId = 'carrot';
          plantedAt = 1000;
          growthProgress = 0.5;
        }

        list.push({
          id,
          gridX: x,
          gridZ: z,
          isPlowed,
          cropId,
          plantedAt,
          isWatered: isCenter,
          growthProgress,
          isReady
        });
      }
    }
    return list;
  });

  // Livestock Animals
  const [animals, setAnimals] = useState<FarmAnimal[]>([
    {
      id: 'hen_1',
      defId: 'chicken',
      x: -5,
      z: 7,
      wanderTargetX: -6,
      wanderTargetZ: 8,
      lastCollectTime: 1000,
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
      lastCollectTime: 1000,
      isReady: false,
      progress: 0.5
    }
  ]);

  // Floating text spawner helper
  const spawnFloatingText = (text: string, type: 'coin' | 'exp' | 'water' | 'harvest' | 'level', screenX: number, screenY: number) => {
    const newBubble: FarmFloatingText = {
      id: Date.now() + Math.random(),
      text,
      type,
      screenX,
      screenY
    };
    setFloatingTexts(prev => [...prev, newBubble]);
    setTimeout(() => {
      setFloatingTexts(prev => prev.filter(b => b.id !== newBubble.id));
    }, 1100);
  };

  // Level Up & Gain EXP
  const gainExp = (amount: number, screenX?: number, screenY?: number) => {
    setExp(prevExp => {
      const nextExp = prevExp + amount;
      const targetExp = LEVEL_EXP_TABLE[level] || 999999;

      if (screenX && screenY) {
        spawnFloatingText(`+${amount} EXP!`, 'exp', screenX, screenY - 20);
      }

      if (nextExp >= targetExp) {
        const nextLevel = level + 1;
        setLevel(nextLevel);
        setFertilizerCount(f => f + 2);
        setCoins(c => c + nextLevel * 100);
        farmSounds.levelUp();
        if (screenX && screenY) {
          spawnFloatingText(`🎉 LEVEL UP! Lv. ${nextLevel}!`, 'level', screenX, screenY - 50);
        }
        return nextExp - targetExp;
      }
      return nextExp;
    });
  };

  // Real-time WiFi Multiplayer Polling Loop (Syncs with server every 700ms)
  useEffect(() => {
    let isMounted = true;

    const syncWithServer = async () => {
      try {
        const res = await fetch('/api/farm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'heartbeat',
            player: {
              id: localPlayerId,
              name: playerName,
              color: playerColor,
              x: localFarmerPosRef.current.x,
              z: localFarmerPosRef.current.z,
              targetX: localFarmerPosRef.current.targetX,
              targetZ: localFarmerPosRef.current.targetZ,
              angle: localFarmerPosRef.current.angle,
              isWorking: localFarmerPosRef.current.isWorking,
              tool: selectedTool
            }
          })
        });

        if (res.ok && isMounted) {
          const data = await res.json();
          if (data.plots) {
            setPlots(data.plots);
          }
          if (data.animals) {
            setAnimals(data.animals);
          }
          if (data.players) {
            setRemotePlayers(data.players.filter((p: RemotePlayer) => p.id !== localPlayerId));
          }
          if (data.activities) {
            setActivities(data.activities);
          }
        }
      } catch {
        // Fallback silently if offline or initial boot
      }
    };

    const interval = setInterval(syncWithServer, 200);
    syncWithServer();

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [localPlayerId, playerName, playerColor, selectedTool]);

  // Crop Growth & Animal Production Heartbeat Loop (Runs every 1 second)
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();

      // 1. Update Crops Growth
      setPlots(prevPlots =>
        prevPlots.map(plot => {
          if (!plot.cropId || !plot.plantedAt || plot.isReady) return plot;
          const crop = FARM_CROPS[plot.cropId];
          if (!crop) return plot;

          const elapsedSec = (now - plot.plantedAt) / 1000;
          // Watered crops grow 2x faster!
          const speedMultiplier = plot.isWatered ? 2.0 : 1.0;
          const adjustedElapsed = elapsedSec * speedMultiplier;

          const progress = Math.min(1, adjustedElapsed / crop.growthTime);
          const isReady = progress >= 1;

          if (isReady !== plot.isReady || Math.abs(progress - plot.growthProgress) > 0.05) {
            return {
              ...plot,
              growthProgress: progress,
              isReady
            };
          }
          return plot;
        })
      );

      // 2. Update Animals Produce & Wandering
      setAnimals(prevAnimals =>
        prevAnimals.map(anim => {
          const def = FARM_ANIMALS[anim.defId];
          if (!def) return anim;

          const elapsedSec = (now - anim.lastCollectTime) / 1000;
          const progress = Math.min(1, elapsedSec / def.produceInterval);
          const isReady = progress >= 1;

          // Occasionally pick a new wander target in pasture
          let wx = anim.wanderTargetX;
          let wz = anim.wanderTargetZ;
          if (Math.random() < 0.25) {
            wx = -12 + Math.random() * 8;
            wz = 5 + Math.random() * 6;
          }

          return {
            ...anim,
            progress,
            isReady,
            wanderTargetX: wx,
            wanderTargetZ: wz
          };
        })
      );
    }, 1000);

    return () => clearInterval(timer);
  }, [level]);

  // Handle Plot Interaction (Hoe, Plant, Water, Harvest, Speed-Gro)
  const handlePlotAction = (plotId: string, tool: ToolType, screenX: number, screenY: number) => {
    const plot = plots.find(p => p.id === plotId);
    if (!plot) return;

    // A. HARVEST ACTION (or auto-action on ripe crop)
    if (plot.isReady && (tool === 'harvest' || tool === 'select')) {
      const crop = FARM_CROPS[plot.cropId || ''];
      if (!crop) return;

      farmSounds.harvest();
      // Add produce to inventory
      setProduceInventory(prev => ({
        ...prev,
        [crop.id]: (prev[crop.id] || 0) + 1
      }));

      // Award EXP & floating badge
      gainExp(crop.expGain, screenX, screenY);
      spawnFloatingText(`+1 ${crop.produceName}!`, 'harvest', screenX, screenY);

      // Reset plot
      setPlots(prev =>
        prev.map(p =>
          p.id === plotId
            ? { ...p, cropId: null, plantedAt: null, isReady: false, growthProgress: 0, isWatered: false }
            : p
        )
      );
      return;
    }

    // B. SPEED-GRO FERTILIZER ACTION
    if (tool === 'fertilizer' && plot.cropId && !plot.isReady) {
      if (fertilizerCount > 0) {
        farmSounds.fertilizer();
        setFertilizerCount(f => f - 1);
        setPlots(prev =>
          prev.map(p =>
            p.id === plotId ? { ...p, isReady: true, growthProgress: 1.0 } : p
          )
        );
        spawnFloatingText('⚡ Instant Growth!', 'harvest', screenX, screenY);
      }
      return;
    }

    // C. WATER ACTION (or auto-action if dry)
    if (!plot.isWatered && (tool === 'water' || (tool === 'select' && plot.cropId))) {
      farmSounds.water();
      setPlots(prev =>
        prev.map(p => (p.id === plotId ? { ...p, isWatered: true } : p))
      );
      spawnFloatingText('💧 Watered (2x Growth Speed)', 'water', screenX, screenY);
      return;
    }

    // D. PLANT ACTION (or auto-action on empty plowed bed)
    if (plot.isPlowed && !plot.cropId && (tool === 'plant' || tool === 'select')) {
      const seedToPlant = selectedSeedId;
      if (!seedToPlant) return;

      const ownedSeeds = seedInventory[seedToPlant] || 0;
      if (ownedSeeds > 0) {
        farmSounds.plant();
        setSeedInventory(prev => ({
          ...prev,
          [seedToPlant]: prev[seedToPlant] - 1
        }));

        setPlots(prev =>
          prev.map(p =>
            p.id === plotId
              ? {
                  ...p,
                  cropId: seedToPlant,
                  plantedAt: Date.now(),
                  growthProgress: 0.15,
                  isReady: false
                }
              : p
          )
        );

        spawnFloatingText(`🌱 Planted ${FARM_CROPS[seedToPlant]?.name}`, 'harvest', screenX, screenY);
      } else {
        spawnFloatingText(`⚠️ Out of ${FARM_CROPS[seedToPlant]?.name} seeds!`, 'coin', screenX, screenY);
      }
      return;
    }

    // E. PLOW ACTION (or auto-action on virgin grass)
    if (!plot.isPlowed && (tool === 'hoe' || tool === 'select')) {
      farmSounds.plow();
      setPlots(prev =>
        prev.map(p => (p.id === plotId ? { ...p, isPlowed: true } : p))
      );
      gainExp(3, screenX, screenY);
      spawnFloatingText('⛏️ Plowed Fertile Soil!', 'exp', screenX, screenY);
      notifyServerAction(plotId, tool);
      return;
    }
  };

  const notifyServerAction = (plotId: string, tool: ToolType) => {
    fetch('/api/farm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'plot_action',
        plotId,
        tool,
        selectedSeedId,
        player: {
          id: localPlayerId,
          name: playerName,
          color: playerColor,
          x: localFarmerPosRef.current.x,
          z: localFarmerPosRef.current.z,
          angle: localFarmerPosRef.current.angle,
          isWorking: localFarmerPosRef.current.isWorking
        }
      })
    }).catch(() => {});
  };

  // Collect Animal Produce (Eggs, Milk, Wool)
  const handleAnimalCollect = (animalId: string, screenX: number, screenY: number) => {
    const animal = animals.find(a => a.id === animalId);
    if (!animal || !animal.isReady) return;

    const def = FARM_ANIMALS[animal.defId];
    if (!def) return;

    farmSounds.animalCollect(def.type);
    setProduceInventory(prev => ({
      ...prev,
      [def.produceId]: (prev[def.produceId] || 0) + 1
    }));

    gainExp(def.expGain, screenX, screenY);
    spawnFloatingText(`+1 ${def.produceName}!`, 'harvest', screenX, screenY);

    fetch('/api/farm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'animal_collect',
        animalId,
        player: {
          id: localPlayerId,
          name: playerName,
          color: playerColor,
          x: localFarmerPosRef.current.x,
          z: localFarmerPosRef.current.z,
          angle: localFarmerPosRef.current.angle,
          isWorking: localFarmerPosRef.current.isWorking
        }
      })
    }).catch(() => {});

    setAnimals(prev =>
      prev.map(a =>
        a.id === animalId
          ? { ...a, lastCollectTime: Date.now(), isReady: false, progress: 0 }
          : a
      )
    );
  };

  // Harvest Apple Tree
  const handleHarvestTree = (treeId: string, screenX: number, screenY: number) => {
    farmSounds.harvest();
    setProduceInventory(prev => ({
      ...prev,
      apple: (prev.apple || 0) + 3
    }));

    gainExp(15, screenX, screenY);
    spawnFloatingText('+3 Crisp Red Apples!', 'harvest', screenX, screenY);
  };

  // Buy Seeds from Market
  const handleBuySeeds = (seedId: string, qty: number) => {
    const crop = FARM_CROPS[seedId];
    if (!crop) return;

    const totalCost = crop.seedPrice * qty;
    if (coins < totalCost) return;

    farmSounds.coin();
    setCoins(c => c - totalCost);
    setSeedInventory(prev => ({
      ...prev,
      [seedId]: (prev[seedId] || 0) + qty
    }));
  };

  // Buy Farm Livestock from Market
  const handleBuyAnimal = (defId: string) => {
    const def = FARM_ANIMALS[defId];
    if (!def || coins < def.cost) return;

    farmSounds.coin();
    setCoins(c => c - def.cost);

    const newAnimal: FarmAnimal = {
      id: `${def.type}_${Date.now()}`,
      defId,
      x: -10 + (Math.random() - 0.5) * 6,
      z: 7 + (Math.random() - 0.5) * 4,
      wanderTargetX: -10,
      wanderTargetZ: 7,
      lastCollectTime: Date.now(),
      isReady: false,
      progress: 0
    };

    setAnimals(prev => [...prev, newAnimal]);
    gainExp(35);
  };

  // Sell Produce from Silo
  const handleSellProduce = (produceId: string, qty: number) => {
    const owned = produceInventory[produceId] || 0;
    if (owned < qty) return;

    const cropDef = FARM_CROPS[produceId];
    const fruitDef = FRUIT_PRODUCE[produceId];
    const unitPrice = cropDef?.sellPrice || fruitDef?.sellPrice || 15;
    const earnings = unitPrice * qty;

    farmSounds.coin();
    setCoins(c => c + earnings);
    setProduceInventory(prev => ({
      ...prev,
      [produceId]: prev[produceId] - qty
    }));
  };

  // Sell All Produce in Bulk
  const handleSellAllProduce = () => {
    let totalEarnings = 0;
    Object.entries(produceInventory).forEach(([prodId, qty]) => {
      if (qty <= 0) return;
      const cropDef = FARM_CROPS[prodId];
      const fruitDef = FRUIT_PRODUCE[prodId];
      const unitPrice = cropDef?.sellPrice || fruitDef?.sellPrice || 15;
      totalEarnings += unitPrice * qty;
    });

    if (totalEarnings > 0) {
      farmSounds.coin();
      setCoins(c => c + totalEarnings);
      setProduceInventory({});
    }
  };

  // Complete Town Orders
  const handleCompleteOrder = (orderId: string) => {
    const order = orders.find(o => o.id === orderId);
    if (!order || order.completed) return;

    // Deduct requirements
    setProduceInventory(prev => {
      const copy = { ...prev };
      order.requirements.forEach(req => {
        copy[req.itemId] = Math.max(0, (copy[req.itemId] || 0) - req.qty);
      });
      return copy;
    });

    farmSounds.levelUp();
    setCoins(c => c + order.rewardCoins);
    setGems(g => g + order.rewardGems);
    gainExp(order.rewardExp);

    setOrders(prev =>
      prev.map(o => (o.id === orderId ? { ...o, completed: true } : o))
    );
  };

  return (
    <main style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }}>
      <Farm3DCanvas
        plots={plots}
        animals={animals}
        remotePlayers={remotePlayers}
        localPlayerId={localPlayerId}
        selectedTool={selectedTool}
        selectedSeedId={selectedSeedId}
        onPlotAction={handlePlotAction}
        onAnimalCollect={handleAnimalCollect}
        onHarvestTree={handleHarvestTree}
        onSpawnFloatingText={spawnFloatingText}
        onLocalPlayerMove={(x, z, angle, isWorking, targetX, targetZ, isImmediate) => {
          localFarmerPosRef.current = {
            x,
            z,
            angle,
            isWorking,
            targetX: targetX ?? x,
            targetZ: targetZ ?? z
          };

          if (isImmediate) {
            // 1. Instant zero-latency cross-tab sync via BroadcastChannel
            if (typeof window !== 'undefined' && typeof BroadcastChannel !== 'undefined') {
              try {
                const channel = new BroadcastChannel('farm_multiplayer_sync');
                channel.postMessage({
                  type: 'player_move',
                  player: {
                    id: localPlayerId,
                    name: playerName,
                    color: playerColor,
                    x,
                    z,
                    targetX: targetX ?? x,
                    targetZ: targetZ ?? z,
                    angle,
                    isWorking,
                    tool: selectedTool
                  }
                });
                channel.close();
              } catch {}
            }

            // 2. Immediate push to server across WiFi devices
            fetch('/api/farm', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                type: 'heartbeat',
                player: {
                  id: localPlayerId,
                  name: playerName,
                  color: playerColor,
                  x,
                  z,
                  targetX: targetX ?? x,
                  targetZ: targetZ ?? z,
                  angle,
                  isWorking,
                  tool: selectedTool
                }
              })
            }).catch(() => {});
          }
        }}
      />

      <FarmHUD
        level={level}
        exp={exp}
        coins={coins}
        gems={gems}
        fertilizerCount={fertilizerCount}
        selectedTool={selectedTool}
        selectedSeedId={selectedSeedId}
        seedInventory={seedInventory}
        produceInventory={produceInventory}
        orders={orders}
        floatingTexts={floatingTexts}
        remotePlayers={remotePlayers}
        wifiUrl={wifiUrl}
        activities={activities}
        playerName={playerName}
        onChangePlayerName={handleUpdatePlayerName}
        onSelectTool={setSelectedTool}
        onSelectSeed={setSelectedSeedId}
        onBuySeeds={handleBuySeeds}
        onBuyAnimal={handleBuyAnimal}
        onSellProduce={handleSellProduce}
        onSellAllProduce={handleSellAllProduce}
        onCompleteOrder={handleCompleteOrder}
      />
    </main>
  );
}
