'use client';

import React, { useState } from 'react';
import { ToolType, FarmFloatingText, OrderQuest, RemotePlayer } from '@/types/farm';
import { FARM_CROPS, FARM_ANIMALS, FRUIT_PRODUCE, LEVEL_EXP_TABLE } from '@/data/farmData';
import { farmSounds } from '@/utils/audio';

interface FarmHUDProps {
  level: number;
  exp: number;
  coins: number;
  gems: number;
  fertilizerCount: number;
  selectedTool: ToolType;
  selectedSeedId: string | null;
  seedInventory: Record<string, number>;
  produceInventory: Record<string, number>;
  orders: OrderQuest[];
  floatingTexts: FarmFloatingText[];
  remotePlayers: RemotePlayer[];
  wifiUrl: string;
  activities: Array<{ id: string; text: string; time: number }>;
  playerName: string;
  onChangePlayerName: (name: string) => void;
  onSelectTool: (tool: ToolType) => void;
  onSelectSeed: (seedId: string) => void;
  onBuySeeds: (seedId: string, qty: number) => void;
  onBuyAnimal: (defId: string) => void;
  onSellProduce: (produceId: string, qty: number) => void;
  onSellAllProduce: () => void;
  onCompleteOrder: (orderId: string) => void;
}

export default function FarmHUD({
  level,
  exp,
  coins,
  gems,
  fertilizerCount,
  selectedTool,
  selectedSeedId,
  seedInventory,
  produceInventory,
  orders,
  floatingTexts,
  remotePlayers,
  wifiUrl,
  activities,
  playerName,
  onChangePlayerName,
  onSelectTool,
  onSelectSeed,
  onBuySeeds,
  onBuyAnimal,
  onSellProduce,
  onSellAllProduce,
  onCompleteOrder
}: FarmHUDProps) {
  const [activeModal, setActiveModal] = useState<'shop' | 'silo' | 'orders' | 'help' | 'coop' | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(farmSounds.isEnabled());
  const [musicEnabled, setMusicEnabled] = useState(farmSounds.isBGMPlaying());

  const curMaxExp = LEVEL_EXP_TABLE[level] || LEVEL_EXP_TABLE[LEVEL_EXP_TABLE.length - 1];
  const expPercent = Math.min(100, Math.floor((exp / curMaxExp) * 100));

  const totalStoredProduce = Object.values(produceInventory).reduce((a, b) => a + b, 0);

  const toggleSound = () => {
    const s = farmSounds.toggle();
    setSoundEnabled(s);
  };

  const toggleMusic = () => {
    const m = farmSounds.toggleBGM();
    setMusicEnabled(m);
  };

  return (
    <div className="farm-hud-container">
      {/* Top Farm Status Bar */}
      <header className="farm-top-bar">
        {/* Farmer Profile & Level */}
        <div className="farmer-profile-card">
          <div className="farmer-avatar">
            <span>🧑‍🌾</span>
            <span className="level-star">Lv.{level}</span>
          </div>
          <div className="farmer-level-info">
            <div className="farmer-name-row">
              <span className="farm-title">Sunny Meadow Farm</span>
              <span className="exp-text">{exp} / {curMaxExp} EXP</span>
            </div>
            <div className="exp-bar-bg">
              <div className="exp-bar-fill" style={{ width: `${expPercent}%` }} />
            </div>
          </div>
        </div>

        {/* Wealth Counters */}
        <div className="farm-wealth-group">
          <div className="wealth-pill coins-pill">
            <span className="wealth-icon">🪙</span>
            <span className="wealth-value">{coins.toLocaleString()}</span>
          </div>
          <div className="wealth-pill gems-pill">
            <span className="wealth-icon">💎</span>
            <span className="wealth-value">{gems}</span>
          </div>
          <div className="wealth-pill fertilizer-pill" title="Speed-Gro Fertilizer (Instantly Grow Crops)">
            <span className="wealth-icon">🧪</span>
            <span className="wealth-value">x{fertilizerCount}</span>
          </div>
          <button
            className="wealth-pill coop-pill"
            onClick={() => { farmSounds.click(); setActiveModal(activeModal === 'coop' ? null : 'coop'); }}
            title="Invite Friends on Same WiFi to Join!"
          >
            <span className="online-dot" />
            <span className="wealth-icon">👥</span>
            <span className="wealth-value">{1 + (remotePlayers?.length || 0)} Co-op</span>
          </button>
        </div>

        {/* Quick Audio & Action Icons */}
        <div className="farm-top-actions">
          <button
            className={`farm-icon-btn ${musicEnabled ? 'active' : ''}`}
            onClick={toggleMusic}
            title={musicEnabled ? 'Pause Farm Music' : 'Play Farm Music'}
          >
            🎵
          </button>
          <button
            className={`farm-icon-btn ${soundEnabled ? 'active' : ''}`}
            onClick={toggleSound}
            title={soundEnabled ? 'Mute Sound' : 'Enable Sound'}
          >
            {soundEnabled ? '🔊' : '🔇'}
          </button>
          <button
            className="farm-icon-btn"
            onClick={() => setActiveModal('help')}
            title="How to Play"
          >
            ❓
          </button>
        </div>
      </header>

      {/* Floating 3D Text Numbers & Badges */}
      <div className="floating-text-container">
        {floatingTexts.map(ft => (
          <div
            key={ft.id}
            className={`farm-floating-bubble ${ft.type}`}
            style={{ left: `${ft.screenX}px`, top: `${ft.screenY}px` }}
          >
            {ft.text}
          </div>
        ))}
      </div>

      {/* Floating Side Action Modals (Shop, Barn, Orders) */}
      <aside className="farm-side-ribbon">
        <button
          className="side-action-btn shop-btn"
          onClick={() => { farmSounds.click(); setActiveModal(activeModal === 'shop' ? null : 'shop'); }}
        >
          <span className="side-btn-icon">🛒</span>
          <span className="side-btn-label">Market</span>
        </button>

        <button
          className="side-action-btn barn-btn"
          onClick={() => { farmSounds.click(); setActiveModal(activeModal === 'silo' ? null : 'silo'); }}
        >
          <span className="side-btn-icon">📦</span>
          <span className="side-btn-label">Silo & Barn</span>
          {totalStoredProduce > 0 && <span className="side-badge">{totalStoredProduce}</span>}
        </button>

        <button
          className="side-action-btn orders-btn"
          onClick={() => { farmSounds.click(); setActiveModal(activeModal === 'orders' ? null : 'orders'); }}
        >
          <span className="side-btn-icon">📋</span>
          <span className="side-btn-label">Orders</span>
          <span className="side-badge pulse">!</span>
        </button>
      </aside>

      {/* Seed Selector Drawer (Displays when Plant tool is active) */}
      {selectedTool === 'plant' && (
        <div className="seed-drawer-container">
          <div className="seed-drawer-header">
            <span>🌱 Choose Seed to Plant:</span>
          </div>
          <div className="seed-drawer-list">
            {Object.values(FARM_CROPS).map(crop => {
              const isUnlocked = level >= crop.unlockLevel;
              const ownedCount = seedInventory[crop.id] || 0;
              const isSelected = selectedSeedId === crop.id;

              return (
                <div
                  key={crop.id}
                  className={`seed-item-card ${isSelected ? 'selected' : ''} ${!isUnlocked ? 'locked' : ''}`}
                  onClick={() => {
                    if (isUnlocked) {
                      farmSounds.click();
                      onSelectSeed(crop.id);
                    }
                  }}
                >
                  <span className="seed-icon">{crop.icon}</span>
                  <div className="seed-info">
                    <strong>{crop.name}</strong>
                    <small>⏱️ {crop.growthTime}s | 🌟 +{crop.expGain} EXP</small>
                    <span className="seed-count-badge">
                      {isUnlocked ? `Owned: x${ownedCount}` : `🔒 Lv. ${crop.unlockLevel}`}
                    </span>
                  </div>
                  {isUnlocked && ownedCount === 0 && (
                    <button
                      className="btn-quick-buy-seed"
                      onClick={(e) => {
                        e.stopPropagation();
                        onBuySeeds(crop.id, 5);
                      }}
                    >
                      Buy 5 (🪙 {crop.seedPrice * 5})
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Bottom Farming Toolbar Ribbon */}
      <footer className="farm-bottom-dock">
        <div className="farm-tools-ribbon">
          <button
            className={`dock-tool-btn ${selectedTool === 'select' ? 'active' : ''}`}
            onClick={() => { farmSounds.click(); onSelectTool('select'); }}
            title="Inspect & Auto-Interact"
          >
            <span className="tool-icon">🔍</span>
            <span className="tool-name">Select</span>
          </button>

          <button
            className={`dock-tool-btn ${selectedTool === 'hoe' ? 'active' : ''}`}
            onClick={() => { farmSounds.click(); onSelectTool('hoe'); }}
            title="Plow Grass into Soil Plots"
          >
            <span className="tool-icon">⛏️</span>
            <span className="tool-name">Plow</span>
          </button>

          <button
            className={`dock-tool-btn ${selectedTool === 'plant' ? 'active' : ''}`}
            onClick={() => { farmSounds.click(); onSelectTool('plant'); }}
            title="Plant Seeds from Seed Drawer"
          >
            <span className="tool-icon">🌱</span>
            <span className="tool-name">Plant</span>
            {selectedSeedId && (
              <span className="selected-seed-indicator">
                {FARM_CROPS[selectedSeedId]?.icon}
              </span>
            )}
          </button>

          <button
            className={`dock-tool-btn ${selectedTool === 'water' ? 'active' : ''}`}
            onClick={() => { farmSounds.click(); onSelectTool('water'); }}
            title="Water Crops for 2x Fast Growth"
          >
            <span className="tool-icon">💧</span>
            <span className="tool-name">Water</span>
          </button>

          <button
            className={`dock-tool-btn ${selectedTool === 'harvest' ? 'active' : ''}`}
            onClick={() => { farmSounds.click(); onSelectTool('harvest'); }}
            title="Harvest Ripe Crops"
          >
            <span className="tool-icon">🧺</span>
            <span className="tool-name">Harvest</span>
          </button>

          <button
            className={`dock-tool-btn ${selectedTool === 'fertilizer' ? 'active' : ''}`}
            onClick={() => { farmSounds.click(); onSelectTool('fertilizer'); }}
            title="Speed-Gro: Instantly mature any crop!"
          >
            <span className="tool-icon">🧪</span>
            <span className="tool-name">Speed-Gro</span>
            <span className="fertilizer-badge">{fertilizerCount}</span>
          </button>
        </div>
      </footer>

      {/* =========================================================================
         MODAL 1: FARM MARKET / SEED & ANIMAL SHOP
         ========================================================================= */}
      {activeModal === 'shop' && (
        <div className="farm-modal-backdrop">
          <div className="farm-modal-panel">
            <div className="farm-modal-header">
              <div className="modal-title-row">
                <span className="modal-title-icon">🛒</span>
                <div>
                  <h3>Sunny Valley Farm Market</h3>
                  <small>Purchase high-yield seeds and lovable farm livestock</small>
                </div>
              </div>
              <button className="farm-modal-close" onClick={() => setActiveModal(null)}>✕</button>
            </div>

            <div className="farm-modal-body">
              {/* Seeds Section */}
              <h4 className="shop-section-heading">🌱 Crop Seeds</h4>
              <div className="shop-cards-grid">
                {Object.values(FARM_CROPS).map(crop => {
                  const isUnlocked = level >= crop.unlockLevel;
                  const canAfford5 = coins >= crop.seedPrice * 5;
                  const canAfford10 = coins >= crop.seedPrice * 10;

                  return (
                    <div key={crop.id} className={`shop-item-card ${!isUnlocked ? 'locked' : ''}`}>
                      <div className="shop-item-top">
                        <span className="shop-item-icon">{crop.icon}</span>
                        <div>
                          <strong>{crop.name} Seeds</strong>
                          <p>{crop.desc}</p>
                          <div className="crop-meta-tags">
                            <span>⏱️ {crop.growthTime}s Growth</span>
                            <span>🪙 Sells for {crop.sellPrice}</span>
                            <span>🌟 +{crop.expGain} EXP</span>
                          </div>
                        </div>
                      </div>

                      <div className="shop-item-actions">
                        {isUnlocked ? (
                          <>
                            <button
                              className="btn-buy-shop"
                              disabled={!canAfford5}
                              onClick={() => onBuySeeds(crop.id, 5)}
                            >
                              Buy 5 (🪙 {crop.seedPrice * 5})
                            </button>
                            <button
                              className="btn-buy-shop primary"
                              disabled={!canAfford10}
                              onClick={() => onBuySeeds(crop.id, 10)}
                            >
                              Buy 10 (🪙 {crop.seedPrice * 10})
                            </button>
                          </>
                        ) : (
                          <div className="locked-banner">
                            🔒 Unlocks at Farmer Level {crop.unlockLevel}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Animals Section */}
              <h4 className="shop-section-heading" style={{ marginTop: '24px' }}>🐄 Farm Animals & Livestock</h4>
              <div className="shop-cards-grid">
                {Object.values(FARM_ANIMALS).map(animal => {
                  const isUnlocked = level >= animal.unlockLevel;
                  const canAfford = coins >= animal.cost;

                  return (
                    <div key={animal.id} className={`shop-item-card ${!isUnlocked ? 'locked' : ''}`}>
                      <div className="shop-item-top">
                        <span className="shop-item-icon">{animal.icon}</span>
                        <div>
                          <strong>{animal.name}</strong>
                          <p>Produces fresh {animal.produceIcon} {animal.produceName} every {animal.produceInterval} seconds!</p>
                          <div className="crop-meta-tags">
                            <span>🪙 Yield Value: {animal.sellPrice}</span>
                            <span>🌟 +{animal.expGain} EXP</span>
                          </div>
                        </div>
                      </div>

                      <div className="shop-item-actions">
                        {isUnlocked ? (
                          <button
                            className="btn-buy-shop primary"
                            disabled={!canAfford}
                            onClick={() => onBuyAnimal(animal.id)}
                          >
                            Adopt Animal (🪙 {animal.cost.toLocaleString()})
                          </button>
                        ) : (
                          <div className="locked-banner">
                            🔒 Unlocks at Farmer Level {animal.unlockLevel}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
         MODAL 2: SILO & BARN (SELL PRODUCE)
         ========================================================================= */}
      {activeModal === 'silo' && (
        <div className="farm-modal-backdrop">
          <div className="farm-modal-panel">
            <div className="farm-modal-header">
              <div className="modal-title-row">
                <span className="modal-title-icon">📦</span>
                <div>
                  <h3>Grain Silo & Storage Barn</h3>
                  <small>Manage and sell all your harvested crops, fresh milk, and farm eggs</small>
                </div>
              </div>
              <button className="farm-modal-close" onClick={() => setActiveModal(null)}>✕</button>
            </div>

            <div className="farm-modal-body">
              <div className="silo-overview-bar">
                <div className="silo-capacity-info">
                  <span>Total Harvested Produce:</span>
                  <b>{totalStoredProduce} items</b>
                </div>
                {totalStoredProduce > 0 && (
                  <button className="btn-sell-all" onClick={onSellAllProduce}>
                    💰 Sell All Produce
                  </button>
                )}
              </div>

              {totalStoredProduce === 0 ? (
                <div className="empty-storage-notice">
                  <span>🌾</span>
                  <h4>Your Silo and Barn are currently empty!</h4>
                  <p>Plant seeds, water your plots, and harvest mature crops to stock up your storage.</p>
                </div>
              ) : (
                <div className="stored-items-grid">
                  {Object.entries(produceInventory).map(([prodId, qty]) => {
                    if (qty <= 0) return null;
                    const cropDef = FARM_CROPS[prodId];
                    const fruitDef = FRUIT_PRODUCE[prodId];

                    const name = cropDef?.produceName || fruitDef?.name || prodId;
                    const icon = cropDef?.icon || fruitDef?.icon || '📦';
                    const unitPrice = cropDef?.sellPrice || fruitDef?.sellPrice || 15;
                    const totalPrice = unitPrice * qty;

                    return (
                      <div key={prodId} className="storage-card">
                        <span className="storage-icon">{icon}</span>
                        <div className="storage-details">
                          <strong>{name}</strong>
                          <span className="storage-qty">In Stock: x{qty}</span>
                          <span className="storage-value">🪙 {unitPrice} each (Total: 🪙 {totalPrice})</span>
                        </div>
                        <div className="storage-sell-actions">
                          <button
                            className="btn-sell-unit"
                            onClick={() => onSellProduce(prodId, 1)}
                          >
                            Sell 1 (+🪙 {unitPrice})
                          </button>
                          <button
                            className="btn-sell-unit all"
                            onClick={() => onSellProduce(prodId, qty)}
                          >
                            Sell All (+🪙 {totalPrice})
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
         MODAL 3: ORDER BOARD (TOWN CUSTOMER REQUESTS)
         ========================================================================= */}
      {activeModal === 'orders' && (
        <div className="farm-modal-backdrop">
          <div className="farm-modal-panel">
            <div className="farm-modal-header">
              <div className="modal-title-row">
                <span className="modal-title-icon">📋</span>
                <div>
                  <h3>Sunny Valley Order Board</h3>
                  <small>Deliver fresh farm produce to town residents for massive coin & gem bounties!</small>
                </div>
              </div>
              <button className="farm-modal-close" onClick={() => setActiveModal(null)}>✕</button>
            </div>

            <div className="farm-modal-body">
              <div className="orders-grid">
                {orders.map(order => {
                  const canComplete = !order.completed && order.requirements.every(req => {
                    const have = produceInventory[req.itemId] || 0;
                    return have >= req.qty;
                  });

                  return (
                    <div key={order.id} className={`order-ticket ${order.completed ? 'completed' : ''}`}>
                      <div className="ticket-top">
                        <div className="customer-badge">
                          <span className="customer-avatar">{order.customerAvatar}</span>
                          <div>
                            <strong>{order.customerName}</strong>
                            <small>{order.customerRole}</small>
                          </div>
                        </div>
                        <span className={`ticket-status ${order.completed ? 'done' : 'pending'}`}>
                          {order.completed ? '✓ Fulfilled' : 'Active Order'}
                        </span>
                      </div>

                      <div className="ticket-reqs">
                        <span className="reqs-title">Requested Deliveries:</span>
                        <div className="reqs-list">
                          {order.requirements.map(req => {
                            const have = produceInventory[req.itemId] || 0;
                            const isMet = have >= req.qty;

                            return (
                              <div key={req.itemId} className={`req-tag ${isMet ? 'met' : 'unmet'}`}>
                                <span>{req.icon} {req.name}:</span>
                                <b>{have}/{req.qty}</b>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="ticket-rewards">
                        <span>Rewards:</span>
                        <b>🪙 {order.rewardCoins}</b>
                        <b>🌟 +{order.rewardExp} EXP</b>
                        <b>💎 +{order.rewardGems} Gems</b>
                      </div>

                      <button
                        className="btn-fulfill-order"
                        disabled={!canComplete || order.completed}
                        onClick={() => onCompleteOrder(order.id)}
                      >
                        {order.completed ? 'Delivered' : canComplete ? 'Deliver Order! 🚚' : 'Gathering Produce...'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
         MODAL 4: HOW TO PLAY / TIPS
         ========================================================================= */}
      {activeModal === 'help' && (
        <div className="farm-modal-backdrop">
          <div className="farm-modal-panel">
            <div className="farm-modal-header">
              <div className="modal-title-row">
                <span className="modal-title-icon">🌾</span>
                <div>
                  <h3>How to Play FarmVille 3D</h3>
                  <small>Master your farmland and become the richest farmer in Sunny Valley!</small>
                </div>
              </div>
              <button className="farm-modal-close" onClick={() => setActiveModal(null)}>✕</button>
            </div>

            <div className="farm-modal-body help-guide">
              <div className="guide-step">
                <span className="step-num">1</span>
                <div>
                  <strong>⛏️ Plow the Soil:</strong>
                  <p>Select the <b>Plow (Hoe)</b> tool and click on virgin green grass tiles to till rich planting beds.</p>
                </div>
              </div>

              <div className="guide-step">
                <span className="step-num">2</span>
                <div>
                  <strong>🌱 Plant Seeds:</strong>
                  <p>Select the <b>Plant</b> tool, pick your desired seed from the drawer, and click plowed soil plots.</p>
                </div>
              </div>

              <div className="guide-step">
                <span className="step-num">3</span>
                <div>
                  <strong>💧 Water for 2x Speed:</strong>
                  <p>Select the <b>Water</b> tool and spray dry plots to make your crops grow twice as fast!</p>
                </div>
              </div>

              <div className="guide-step">
                <span className="step-num">4</span>
                <div>
                  <strong>🧺 Harvest & Sell:</strong>
                  <p>When crops are ripe, a bouncing basket appears. Use the <b>Harvest</b> tool to gather crops into your Silo, then sell them at the Market for handsome profits!</p>
                </div>
              </div>

              <div className="guide-step">
                <span className="step-num">5</span>
                <div>
                  <strong>🐄 Adopt Livestock:</strong>
                  <p>Buy Chickens, Cows, and Sheep from the Market to produce fresh eggs, milk, and wool.</p>
                </div>
              </div>

              <div className="camera-tips">
                <strong>🎥 Camera Controls:</strong>
                <p>• <b>Right Click / Drag</b> to pan your farm view.</p>
                <p>• <b>Mouse Wheel</b> to zoom in and out.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
         MODAL 5: SAME WIFI CO-OP MULTIPLAYER
         ========================================================================= */}
      {activeModal === 'coop' && (
        <div className="farm-modal-backdrop">
          <div className="farm-modal-panel">
            <div className="farm-modal-header">
              <div className="modal-title-row">
                <span className="modal-title-icon">👥</span>
                <div>
                  <h3>WiFi Co-op: Farm With Friends</h3>
                  <small>Share this link with anyone on your same WiFi network to farm together in real-time!</small>
                </div>
              </div>
              <button className="farm-modal-close" onClick={() => setActiveModal(null)}>✕</button>
            </div>

            <div className="farm-modal-body coop-modal-body">
              {/* Join Link Card */}
              <div className="wifi-invite-card">
                <span className="wifi-label">📡 Your Local WiFi Game Address:</span>
                <div className="wifi-link-row">
                  <input
                    type="text"
                    readOnly
                    value={wifiUrl}
                    className="wifi-link-input"
                  />
                  <button
                    className="btn-copy-wifi"
                    onClick={() => {
                      navigator.clipboard.writeText(wifiUrl);
                      setCopiedLink(true);
                      setTimeout(() => setCopiedLink(false), 2500);
                    }}
                  >
                    {copiedLink ? '✓ Copied!' : '📋 Copy Link'}
                  </button>
                </div>
                <p className="wifi-note">
                  💡 <b>How it works:</b> Tell your friends on the same WiFi to open <b>{wifiUrl}</b> on their phone, iPad, or laptop browser. They will appear right next to you on this 3D farm!
                </p>
              </div>

              {/* Player Profile Setting */}
              <div className="player-name-setting">
                <label>Your Farmer Name:</label>
                <input
                  type="text"
                  maxLength={16}
                  value={playerName}
                  onChange={(e) => onChangePlayerName(e.target.value)}
                  placeholder="Enter your name"
                  className="farmer-name-input"
                />
              </div>

              {/* Connected Farmers List */}
              <div className="connected-farmers-section">
                <h4>Currently on this Farm ({1 + (remotePlayers?.length || 0)}):</h4>
                <div className="farmers-list">
                  <div className="farmer-badge you">
                    <span>🧑‍🌾</span>
                    <strong>{playerName || 'You'} (You)</strong>
                    <span className="host-tag">Active</span>
                  </div>

                  {(remotePlayers || []).map(p => (
                    <div key={p.id} className="farmer-badge remote">
                      <span>🧑‍🌾</span>
                      <strong>{p.name}</strong>
                      <span className="coop-tag">Co-op Farmer</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Activity Ticker */}
              {activities && activities.length > 0 && (
                <div className="farm-activity-log">
                  <h4>Recent Farm Events:</h4>
                  <ul>
                    {activities.map(act => (
                      <li key={act.id}>{act.text}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
