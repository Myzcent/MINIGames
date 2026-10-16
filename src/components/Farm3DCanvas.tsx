'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { ToolType, FarmPlot, FarmAnimal, RemotePlayer } from '@/types/farm';
import { FARM_CROPS, FARM_ANIMALS } from '@/data/farmData';
import { farmSounds } from '@/utils/audio';

interface Farm3DCanvasProps {
  plots: FarmPlot[];
  animals: FarmAnimal[];
  remotePlayers: RemotePlayer[];
  localPlayerId: string;
  selectedTool: ToolType;
  selectedSeedId: string | null;
  onPlotAction: (plotId: string, action: ToolType, screenX: number, screenY: number) => void;
  onAnimalCollect: (animalId: string, screenX: number, screenY: number) => void;
  onHarvestTree: (treeId: string, screenX: number, screenY: number) => void;
  onSpawnFloatingText: (text: string, type: 'coin' | 'exp' | 'water' | 'harvest' | 'level', x: number, y: number) => void;
  onLocalPlayerMove?: (
    x: number,
    z: number,
    angle: number,
    isWorking: boolean,
    targetX?: number,
    targetZ?: number,
    isImmediate?: boolean
  ) => void;
}

export default function Farm3DCanvas({
  plots,
  animals,
  remotePlayers,
  localPlayerId,
  selectedTool,
  selectedSeedId,
  onPlotAction,
  onAnimalCollect,
  onHarvestTree,
  onSpawnFloatingText,
  onLocalPlayerMove
}: Farm3DCanvasProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [webglError, setWebglError] = useState(false);

  // Keep references to current state so animation loop and event listeners access latest values
  const propsRef = useRef({
    plots,
    animals,
    remotePlayers,
    localPlayerId,
    selectedTool,
    selectedSeedId,
    onPlotAction,
    onAnimalCollect,
    onHarvestTree,
    onSpawnFloatingText,
    onLocalPlayerMove
  });

  useEffect(() => {
    propsRef.current = {
      plots,
      animals,
      remotePlayers,
      localPlayerId,
      selectedTool,
      selectedSeedId,
      onPlotAction,
      onAnimalCollect,
      onHarvestTree,
      onSpawnFloatingText,
      onLocalPlayerMove
    };
  });

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb); // Sunny Sky Blue
    scene.fog = new THREE.FogExp2(0xa5e4ff, 0.008);

    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(22, 26, 26);
    camera.lookAt(0, 0, 0);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'default' });
    } catch {
      try {
        renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'default' });
      } catch (err) {
        console.error('WebGL could not be initialized:', err);
        setWebglError(true);
        return;
      }
    }
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    container.appendChild(renderer.domElement);

    // 2. Lights
    const ambientLight = new THREE.AmbientLight(0xfffaed, 0.9);
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0xecfccb, 0x78716c, 0.6);
    scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(0xfffbeb, 1.4);
    sunLight.position.set(35, 60, 30);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 160;
    const shadowD = 40;
    sunLight.shadow.camera.left = -shadowD;
    sunLight.shadow.camera.right = shadowD;
    sunLight.shadow.camera.top = shadowD;
    sunLight.shadow.camera.bottom = -shadowD;
    scene.add(sunLight);

    // Warm secondary light
    const fillLight = new THREE.DirectionalLight(0xfef08a, 0.4);
    fillLight.position.set(-30, 20, -25);
    scene.add(fillLight);

    // 3. Environment & Farm Meadow Ground
    createFarmEnvironment(scene);

    // 4. Buildings (Barn, Windmill, Silo, Farmhouse, Well, Orchard, Fences)
    const windmillBlades = createFarmBuildings(scene);

    // 5. Apple Trees & Pasture
    const appleTrees = createAppleOrchard(scene);

    // 6. Farmer Character
    const farmer = createFarmer(scene);

    // 7. Interactive Plot Meshes Group
    const plotMeshesMap = new Map<string, {
      tileMesh: THREE.Mesh;
      soilMesh: THREE.Mesh;
      waterMesh: THREE.Mesh;
      cropGroup: THREE.Group;
      readyBadge: THREE.Sprite;
    }>();

    const hoverRing = createHoverRing(scene);

    // 8. Animals Meshes Group
    const animalMeshesMap = new Map<string, {
      group: THREE.Group;
      type: 'chicken' | 'cow' | 'sheep';
      readyBubble: THREE.Sprite;
      bodyMesh: THREE.Mesh;
    }>();

    // 8b. Remote Players Meshes Group
    const remotePlayersMap = new Map<string, {
      group: THREE.Group;
      nameTag: THREE.Sprite;
      toolMesh: THREE.Mesh;
      targetPos: THREE.Vector3;
    }>();

    // 9. Floating Butterflies & Dust Motes
    const butterflies = createButterflies(scene);
    const chimneyPuffs = createChimneySmoke(scene);

    // Camera Pan / Zoom State
    let isDragging = false;
    let prevMouseX = 0;
    let prevMouseY = 0;
    const cameraTarget = new THREE.Vector3(0, 0, 0);

    // Raycaster for mouse picking
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let hoveredPlotId: string | null = null;
    let hoveredAnimalId: string | null = null;
    let hoveredTreeId: string | null = null;

    // Mouse Move Listener
    const onMouseMove = (e: MouseEvent) => {
      mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

      if (isDragging) {
        const deltaX = (e.clientX - prevMouseX) * 0.04;
        const deltaY = (e.clientY - prevMouseY) * 0.04;

        // Pan camera along ground plane relative to camera angle
        const forward = new THREE.Vector3(-1, 0, -1).normalize();
        const right = new THREE.Vector3(1, 0, -1).normalize();

        camera.position.addScaledVector(right, -deltaX);
        camera.position.addScaledVector(forward, deltaY);
        cameraTarget.addScaledVector(right, -deltaX);
        cameraTarget.addScaledVector(forward, deltaY);
        cameraTarget.x = THREE.MathUtils.clamp(cameraTarget.x, -30, 30);
        cameraTarget.z = THREE.MathUtils.clamp(cameraTarget.z, -30, 30);

        prevMouseX = e.clientX;
        prevMouseY = e.clientY;
      }
    };

    const onMouseDown = (e: MouseEvent) => {
      if (e.button === 2 || e.shiftKey) {
        // Right click or Shift+Click to Pan
        isDragging = true;
        prevMouseX = e.clientX;
        prevMouseY = e.clientY;
      }
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    // Wheel Zoom
    const onWheel = (e: WheelEvent) => {
      const zoomFactor = e.deltaY * 0.02;
      const dir = new THREE.Vector3().subVectors(camera.position, cameraTarget).normalize();
      const currentDist = camera.position.distanceTo(cameraTarget);
      const nextDist = THREE.MathUtils.clamp(currentDist + zoomFactor, 12, 60);

      camera.position.copy(cameraTarget).addScaledVector(dir, nextDist);
    };

    // Click on interactive objects
    const onClick = (e: MouseEvent) => {
      if (isDragging) return;
      if (e.button !== 0) return; // Only left click

      mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);

      // 1. Check Plots
      const plotObjects: THREE.Object3D[] = [];
      plotMeshesMap.forEach((p) => {
        plotObjects.push(p.tileMesh);
      });
      const plotIntersects = raycaster.intersectObjects(plotObjects, false);

      if (plotIntersects.length > 0) {
        const clickedMesh = plotIntersects[0].object;
        const plotId = clickedMesh.name;
        if (plotId) {
          const plot = propsRef.current.plots.find(p => p.id === plotId);
          if (plot) {
            // Animate farmer running to plot
            farmer.targetPos.set(plot.gridX * 2.5, 0, plot.gridZ * 2.5 + 0.8);
            farmer.isWorking = true;
            farmer.workTimer = 0.45;

            propsRef.current.onLocalPlayerMove?.(
              farmer.group.position.x,
              farmer.group.position.z,
              farmer.group.rotation.y,
              farmer.isWorking,
              farmer.targetPos.x,
              farmer.targetPos.z,
              true
            );

            // Trigger action callback
            propsRef.current.onPlotAction(plotId, propsRef.current.selectedTool, e.clientX, e.clientY);
            return;
          }
        }
      }

      // 2. Check Animals
      const animalObjects: THREE.Object3D[] = [];
      animalMeshesMap.forEach((a) => {
        animalObjects.push(a.bodyMesh);
      });
      const animalIntersects = raycaster.intersectObjects(animalObjects, false);
      if (animalIntersects.length > 0) {
        const clickedAnimalMesh = animalIntersects[0].object;
        const animId = clickedAnimalMesh.name;
        if (animId) {
          farmer.targetPos.set(clickedAnimalMesh.parent?.position.x || 0, 0, (clickedAnimalMesh.parent?.position.z || 0) + 1.2);
          propsRef.current.onLocalPlayerMove?.(
            farmer.group.position.x,
            farmer.group.position.z,
            farmer.group.rotation.y,
            farmer.isWorking,
            farmer.targetPos.x,
            farmer.targetPos.z,
            true
          );
          propsRef.current.onAnimalCollect(animId, e.clientX, e.clientY);
          return;
        }
      }

      // 3. Check Apple Trees
      const treeObjects = appleTrees.map(t => t.trunkMesh);
      const treeIntersects = raycaster.intersectObjects(treeObjects, false);
      if (treeIntersects.length > 0) {
        const clickedTree = treeIntersects[0].object;
        const treeId = clickedTree.name;
        if (treeId) {
          propsRef.current.onHarvestTree(treeId, e.clientX, e.clientY);
          return;
        }
      }

      // 4. Move farmer to ground click
      const groundObj = scene.getObjectByName('farmGround');
      const groundIntersects = groundObj ? raycaster.intersectObject(groundObj, false) : [];
      if (groundIntersects.length > 0) {
        farmer.targetPos.x = THREE.MathUtils.clamp(groundIntersects[0].point.x, -35, 35);
        farmer.targetPos.z = THREE.MathUtils.clamp(groundIntersects[0].point.z, -35, 35);
        farmer.targetPos.y = 0;

        propsRef.current.onLocalPlayerMove?.(
          farmer.group.position.x,
          farmer.group.position.z,
          farmer.group.rotation.y,
          farmer.isWorking,
          farmer.targetPos.x,
          farmer.targetPos.z,
          true
        );
      }
    };

    const handleContextMenu = (e: MouseEvent) => e.preventDefault();

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('wheel', onWheel, { passive: true });
    window.addEventListener('click', onClick);
    window.addEventListener('contextmenu', handleContextMenu);

    // Resize
    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', onResize);

    // Clock
    const clock = new THREE.Clock();

    // 10. Animation Loop
    let animationFrameId: number;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const delta = Math.min(clock.getDelta(), 0.1);
      const elapsed = clock.getElapsedTime();

      // Spin Windmill blades
      if (windmillBlades) {
        windmillBlades.rotation.z += delta * 1.5;
      }

      // Animate Butterflies
      butterflies.forEach((b, idx) => {
        const time = elapsed * 1.2 + idx * 2.0;
        b.group.position.x = b.originX + Math.sin(time * 0.8) * 4.0;
        b.group.position.z = b.originZ + Math.cos(time * 0.7) * 4.0;
        b.group.position.y = 1.2 + Math.sin(time * 2.5) * 0.4;
        b.leftWing.rotation.y = Math.sin(time * 18) * 0.8;
        b.rightWing.rotation.y = -Math.sin(time * 18) * 0.8;
      });

      // Animate Chimney smoke puffs
      chimneyPuffs.forEach(p => {
        p.position.y += delta * 1.2;
        p.scale.addScalar(delta * 0.6);
        if (p.position.y > 11) {
          p.position.set(-16.8, 7.8, -10.2);
          p.scale.set(0.3, 0.3, 0.3);
        }
      });

      // Synchronize and update 3D Farm Plots
      syncPlots(scene, propsRef.current.plots, plotMeshesMap, elapsed);

      // Synchronize and update 3D Farm Animals
      syncAnimals(scene, propsRef.current.animals, animalMeshesMap, delta, elapsed);

      // Animate Apple Trees apples
      appleTrees.forEach((t, idx) => {
        t.applesGroup.rotation.y = Math.sin(elapsed * 0.8 + idx) * 0.05;
      });

      // Animate Farmer movement & work
      updateFarmer(farmer, delta, elapsed, propsRef.current.onLocalPlayerMove);

      // Synchronize and render Remote Co-op Farmers
      syncRemotePlayers(
        scene,
        propsRef.current.remotePlayers,
        propsRef.current.localPlayerId,
        remotePlayersMap,
        delta,
        elapsed
      );

      // Raycast hover highlight
      raycaster.setFromCamera(mouse, camera);
      const plotObjects: THREE.Object3D[] = [];
      plotMeshesMap.forEach((p) => {
        plotObjects.push(p.tileMesh);
      });
      const intersects = raycaster.intersectObjects(plotObjects, false);
      if (intersects.length > 0) {
        const pMesh = intersects[0].object;
        const parentPos = pMesh.parent ? pMesh.parent.position : pMesh.position;
        hoverRing.visible = true;
        hoverRing.position.set(parentPos.x, 0.08, parentPos.z);
        hoveredPlotId = pMesh.name;
      } else {
        hoverRing.visible = false;
        hoveredPlotId = null;
      }

      camera.lookAt(cameraTarget);
      renderer.render(scene, camera);
    };

    animate();

    // Cleanup
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('click', onClick);
      window.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('resize', onResize);

      if (container && renderer && renderer.domElement) {
        if (container.contains(renderer.domElement)) {
          container.removeChild(renderer.domElement);
        }
        try {
          renderer.forceContextLoss();
          renderer.dispose();
        } catch {
          // Ignore context disposal error
        }
      }
    };
  }, []);

  return (
    <>
      <div
        ref={mountRef}
        style={{
          width: '100vw',
          height: '100vh',
          position: 'absolute',
          top: 0,
          left: 0,
          overflow: 'hidden',
          cursor: selectedTool === 'hoe' ? 'crosshair' : selectedTool === 'water' ? 'cell' : 'pointer'
        }}
      />
      {webglError && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
            padding: '28px 36px',
            borderRadius: '24px',
            border: '3px solid #ef4444',
            boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
            textAlign: 'center',
            zIndex: 1000,
            maxWidth: '460px',
            fontFamily: 'Fredoka, sans-serif'
          }}
        >
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>⚠️</div>
          <h2 style={{ color: '#991b1b', marginBottom: '8px', fontSize: '22px' }}>
            WebGL Context Error
          </h2>
          <p style={{ color: '#475569', fontSize: '15px', lineHeight: '1.5', marginBottom: '16px' }}>
            Hindi ma-load ang 3D Farm dahil disabled o naubusan ng WebGL contexts ang browser.
          </p>
          <div style={{ textAlign: 'left', background: '#f8fafc', padding: '12px 16px', borderRadius: '12px', fontSize: '13px', color: '#334155', marginBottom: '18px' }}>
            <strong>Solusyon:</strong>
            <ul style={{ paddingLeft: '18px', marginTop: '6px' }}>
              <li>I-close ang ibang bukas na 3D tabs sa browser.</li>
              <li>Pumunta sa <code>chrome://settings/system</code> at i-on ang <strong>&quot;Use graphics acceleration when available&quot;</strong>.</li>
              <li>I-restart ang Google Chrome.</li>
            </ul>
          </div>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '12px 28px',
              background: '#22c55e',
              color: '#ffffff',
              border: 'none',
              borderRadius: '16px',
              fontSize: '16px',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(34, 197, 94, 0.4)'
            }}
          >
            🔄 Reload Game
          </button>
        </div>
      )}
    </>
  );
}

// =========================================================================
// HELPER: Create Farm Landscape
// =========================================================================
function createFarmEnvironment(scene: THREE.Scene) {
  // Main lush green terrain
  const groundGeo = new THREE.PlaneGeometry(160, 160, 40, 40);
  const pos = groundGeo.attributes.position;
  // Gentle undulations on borders
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const dist = Math.hypot(x, y);
    if (dist > 35) {
      pos.setZ(i, Math.sin(x * 0.1) * Math.cos(y * 0.1) * 3.5);
    }
  }
  groundGeo.computeVertexNormals();

  const groundMat = new THREE.MeshStandardMaterial({
    color: 0x65a30d, // Lush spring grass green
    roughness: 0.85,
    metalness: 0.05
  });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.name = 'farmGround';
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // Cobblestone / Dirt Path leading through the farm
  const pathMat = new THREE.MeshStandardMaterial({ color: 0xd4a373, roughness: 0.9 });
  const mainPath = new THREE.Mesh(new THREE.PlaneGeometry(4.5, 36), pathMat);
  mainPath.rotation.x = -Math.PI / 2;
  mainPath.position.set(-11, 0.02, 0);
  mainPath.receiveShadow = true;
  scene.add(mainPath);

  const crossPath = new THREE.Mesh(new THREE.PlaneGeometry(28, 4.0), pathMat);
  crossPath.rotation.x = -Math.PI / 2;
  crossPath.position.set(0, 0.02, -10.5);
  crossPath.receiveShadow = true;
  scene.add(crossPath);

  // Decorative Wildflower Patches
  const flowerColors = [0xf43f5e, 0xfacc15, 0xa855f7, 0x38bdf8, 0xffffff];
  for (let i = 0; i < 40; i++) {
    const fx = (Math.random() - 0.5) * 80;
    const fz = (Math.random() - 0.5) * 80;
    // Don't spawn on plot grid (-8 to 8)
    if (Math.abs(fx) < 12 && Math.abs(fz) < 12) continue;

    const flowerGroup = new THREE.Group();
    flowerGroup.position.set(fx, 0, fz);

    const stem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, 0.4),
      new THREE.MeshStandardMaterial({ color: 0x22c55e })
    );
    stem.position.y = 0.2;
    flowerGroup.add(stem);

    const petalColor = flowerColors[Math.floor(Math.random() * flowerColors.length)];
    const blossom = new THREE.Mesh(
      new THREE.SphereGeometry(0.16, 6, 6),
      new THREE.MeshStandardMaterial({ color: petalColor, roughness: 0.6 })
    );
    blossom.position.y = 0.4;
    flowerGroup.add(blossom);

    scene.add(flowerGroup);
  }

  // Pine and Oak Trees on the Horizon
  for (let i = 0; i < 28; i++) {
    const ang = (i / 28) * Math.PI * 2;
    const radius = 45 + Math.random() * 20;
    const tx = Math.cos(ang) * radius;
    const tz = Math.sin(ang) * radius;
    createHorizonTree(scene, tx, tz);
  }
}

function createHorizonTree(scene: THREE.Scene, x: number, z: number) {
  const treeGroup = new THREE.Group();
  treeGroup.position.set(x, 0, z);

  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.35, 0.5, 2.8, 6),
    new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.9 })
  );
  trunk.position.y = 1.4;
  trunk.castShadow = true;
  treeGroup.add(trunk);

  const leavesMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.8 });
  const foliage1 = new THREE.Mesh(new THREE.ConeGeometry(2.4, 3.2, 6), leavesMat);
  foliage1.position.y = 3.6;
  foliage1.castShadow = true;
  treeGroup.add(foliage1);

  const foliage2 = new THREE.Mesh(new THREE.ConeGeometry(1.8, 2.6, 6), leavesMat);
  foliage2.position.y = 5.2;
  foliage2.castShadow = true;
  treeGroup.add(foliage2);

  scene.add(treeGroup);
}

// =========================================================================
// HELPER: Farm Buildings (Barn, Windmill, House, Silo, Well)
// =========================================================================
function createFarmBuildings(scene: THREE.Scene) {
  // 1. Classic Red Barn (Position: X: -18, Z: 5)
  const barnGroup = new THREE.Group();
  barnGroup.position.set(-18, 0, 4);

  // Red barn body
  const barnMat = new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.7 }); // Classic Barn Red
  const whiteTrimMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.5 });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.6 });

  const barnBody = new THREE.Mesh(new THREE.BoxGeometry(9, 6.5, 12), barnMat);
  barnBody.position.y = 3.25;
  barnBody.castShadow = true;
  barnBody.receiveShadow = true;
  barnGroup.add(barnBody);

  // Gambrel Roof
  const roof = new THREE.Mesh(new THREE.ConeGeometry(7.2, 4.2, 4), roofMat);
  roof.rotation.y = Math.PI / 4;
  roof.position.y = 8.4;
  roof.scale.set(1.1, 1, 1.4);
  roof.castShadow = true;
  barnGroup.add(roof);

  // White cross barn doors on front
  const doorGroup = new THREE.Group();
  doorGroup.position.set(4.55, 2.2, 0);
  doorGroup.rotation.y = Math.PI / 2;
  const doorBase = new THREE.Mesh(new THREE.BoxGeometry(3.6, 4.2, 0.15), whiteTrimMat);
  doorGroup.add(doorBase);
  barnGroup.add(doorGroup);

  // Weather vane on top
  const vanePole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.4), whiteTrimMat);
  vanePole.position.y = 11.2;
  barnGroup.add(vanePole);
  const rooster = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.5, 0.1), new THREE.MeshStandardMaterial({ color: 0xf59e0b }));
  rooster.position.y = 11.9;
  barnGroup.add(rooster);

  scene.add(barnGroup);

  // 2. Wooden Grain Silo (Position: X: -24, Z: 11)
  const siloGroup = new THREE.Group();
  siloGroup.position.set(-25, 0, 11);

  const siloMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.8 });
  const siloBody = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.4, 9, 16), siloMat);
  siloBody.position.y = 4.5;
  siloBody.castShadow = true;
  siloGroup.add(siloBody);

  const siloDome = new THREE.Mesh(
    new THREE.SphereGeometry(2.4, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.6, roughness: 0.3 })
  );
  siloDome.position.y = 9.0;
  siloDome.castShadow = true;
  siloGroup.add(siloDome);

  scene.add(siloGroup);

  // 3. Animated Rustic Windmill (Position: X: 16, Z: -18)
  const windmillGroup = new THREE.Group();
  windmillGroup.position.set(16, 0, -18);

  const towerMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.8 });
  const tower = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 3.2, 10, 8), towerMat);
  tower.position.y = 5;
  tower.castShadow = true;
  windmillGroup.add(tower);

  const cap = new THREE.Mesh(new THREE.ConeGeometry(2.6, 2.4, 8), roofMat);
  cap.position.y = 11;
  windmillGroup.add(cap);

  // Spinning Windmill Blades
  const bladesGroup = new THREE.Group();
  bladesGroup.position.set(0, 10.2, 2.5);

  const hubMat = new THREE.MeshStandardMaterial({ color: 0x78350f });
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.6, 8), hubMat);
  hub.rotation.x = Math.PI / 2;
  bladesGroup.add(hub);

  const bladeMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.6 }); // White/cream cloth sails
  for (let i = 0; i < 4; i++) {
    const arm = new THREE.Group();
    arm.rotation.z = (i * Math.PI) / 2;

    const woodenSpoke = new THREE.Mesh(new THREE.BoxGeometry(0.18, 5.2, 0.1), hubMat);
    woodenSpoke.position.y = 2.6;
    arm.add(woodenSpoke);

    const sail = new THREE.Mesh(new THREE.BoxGeometry(0.9, 3.8, 0.05), bladeMat);
    sail.position.set(0.45, 2.8, 0.04);
    arm.add(sail);

    bladesGroup.add(arm);
  }
  windmillGroup.add(bladesGroup);
  scene.add(windmillGroup);

  // 4. Country Farmhouse (Position: X: -16, Z: -14)
  const houseGroup = new THREE.Group();
  houseGroup.position.set(-16, 0, -14);

  const houseMat = new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.7 }); // Cozy buttercream
  const houseBody = new THREE.Mesh(new THREE.BoxGeometry(8, 5, 7), houseMat);
  houseBody.position.y = 2.5;
  houseBody.castShadow = true;
  houseGroup.add(houseBody);

  const houseRoof = new THREE.Mesh(new THREE.ConeGeometry(6.4, 3.2, 4), roofMat);
  houseRoof.rotation.y = Math.PI / 4;
  houseRoof.position.y = 6.4;
  houseRoof.scale.set(1.2, 1, 1.4);
  houseRoof.castShadow = true;
  houseGroup.add(houseRoof);

  // Stone Chimney
  const chimney = new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 3.4, 0.9),
    new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.9 })
  );
  chimney.position.set(-2.4, 6.8, -1.2);
  houseGroup.add(chimney);

  scene.add(houseGroup);

  // 5. Stone Water Well (Position: X: 11, Z: 0)
  const wellGroup = new THREE.Group();
  wellGroup.position.set(11, 0, 0);

  const stoneMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.9 });
  const wellWall = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 1.1, 12, 1, true), stoneMat);
  wellWall.position.y = 0.55;
  wellWall.castShadow = true;
  wellGroup.add(wellWall);

  const waterInside = new THREE.Mesh(
    new THREE.CylinderGeometry(1.45, 1.45, 0.2, 12),
    new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.1, metalness: 0.3 })
  );
  waterInside.position.y = 0.45;
  wellGroup.add(waterInside);

  // Well canopy
  const pole1 = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.5), hubMat);
  pole1.position.set(1.4, 1.25, 0);
  wellGroup.add(pole1);
  const pole2 = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.5), hubMat);
  pole2.position.set(-1.4, 1.25, 0);
  wellGroup.add(pole2);

  const wellRoof = new THREE.Mesh(new THREE.ConeGeometry(2.0, 1.2, 4), roofMat);
  wellRoof.rotation.y = Math.PI / 4;
  wellRoof.position.y = 2.8;
  wellGroup.add(wellRoof);

  scene.add(wellGroup);

  return bladesGroup;
}

// =========================================================================
// HELPER: Apple Orchard
// =========================================================================
function createAppleOrchard(scene: THREE.Scene) {
  const trees: Array<{ id: string; trunkMesh: THREE.Mesh; applesGroup: THREE.Group }> = [];
  const orchardPositions = [
    { id: 'orchard_1', x: 12, z: 12 },
    { id: 'orchard_2', x: 17, z: 12 },
    { id: 'orchard_3', x: 12, z: 17 },
    { id: 'orchard_4', x: 17, z: 17 }
  ];

  orchardPositions.forEach(pos => {
    const treeGroup = new THREE.Group();
    treeGroup.position.set(pos.x, 0, pos.z);

    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.4, 0.55, 2.4, 8),
      new THREE.MeshStandardMaterial({ color: 0x582f0e, roughness: 0.9 })
    );
    trunk.name = pos.id;
    trunk.position.y = 1.2;
    trunk.castShadow = true;
    treeGroup.add(trunk);

    const foliage = new THREE.Mesh(
      new THREE.SphereGeometry(2.0, 8, 8),
      new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.8 })
    );
    foliage.position.y = 3.2;
    foliage.castShadow = true;
    treeGroup.add(foliage);

    // Red Apples hanging
    const applesGroup = new THREE.Group();
    const appleMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.3 });
    const appleOffsets = [
      { x: 1.2, y: 3.0, z: 0.8 },
      { x: -1.1, y: 2.8, z: 0.9 },
      { x: 0.2, y: 3.4, z: 1.4 },
      { x: -0.9, y: 3.1, z: -1.0 },
      { x: 1.0, y: 2.7, z: -1.1 }
    ];

    appleOffsets.forEach(ao => {
      const apple = new THREE.Mesh(new THREE.SphereGeometry(0.24, 6, 6), appleMat);
      apple.position.set(ao.x, ao.y, ao.z);
      applesGroup.add(apple);
    });

    treeGroup.add(applesGroup);
    scene.add(treeGroup);
    trees.push({ id: pos.id, trunkMesh: trunk, applesGroup });
  });

  return trees;
}

// =========================================================================
// HELPER: Farmer Character
// =========================================================================
interface FarmerState {
  group: THREE.Group;
  targetPos: THREE.Vector3;
  toolMesh: THREE.Mesh;
  isWorking: boolean;
  workTimer: number;
}

function createFarmer(scene: THREE.Scene): FarmerState {
  const farmerGroup = new THREE.Group();
  farmerGroup.position.set(0, 0, 3.5);

  // Body & Denim Overalls
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.65, 0.9, 0.45),
    new THREE.MeshStandardMaterial({ color: 0x1d4ed8 }) // Denim Blue
  );
  body.position.y = 0.9;
  body.castShadow = true;
  farmerGroup.add(body);

  // Plaid Shirt Torso Upper
  const shirt = new THREE.Mesh(
    new THREE.BoxGeometry(0.66, 0.4, 0.46),
    new THREE.MeshStandardMaterial({ color: 0xdc2626 }) // Red Plaid
  );
  shirt.position.y = 1.15;
  farmerGroup.add(shirt);

  // Head
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.3, 10, 10),
    new THREE.MeshStandardMaterial({ color: 0xfbcfe8, roughness: 0.6 }) // Friendly peach skin
  );
  head.position.y = 1.6;
  head.castShadow = true;
  farmerGroup.add(head);

  // Straw Hat
  const hatBrim = new THREE.Mesh(
    new THREE.CylinderGeometry(0.7, 0.75, 0.08, 12),
    new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.9 })
  );
  hatBrim.position.y = 1.82;
  farmerGroup.add(hatBrim);

  const hatCrown = new THREE.Mesh(
    new THREE.CylinderGeometry(0.35, 0.4, 0.35, 10),
    new THREE.MeshStandardMaterial({ color: 0xfde047, roughness: 0.9 })
  );
  hatCrown.position.y = 2.0;
  farmerGroup.add(hatCrown);

  // Hand Tool (Hoe / Can)
  const tool = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.04, 1.1),
    new THREE.MeshStandardMaterial({ color: 0x78350f })
  );
  tool.position.set(0.45, 0.9, 0.2);
  tool.rotation.x = Math.PI / 6;
  farmerGroup.add(tool);

  scene.add(farmerGroup);

  return {
    group: farmerGroup,
    targetPos: farmerGroup.position.clone(),
    toolMesh: tool,
    isWorking: false,
    workTimer: 0
  };
}

function updateFarmer(
  farmer: FarmerState,
  delta: number,
  elapsed: number,
  onMove?: (
    x: number,
    z: number,
    angle: number,
    isWorking: boolean,
    targetX?: number,
    targetZ?: number,
    isImmediate?: boolean
  ) => void
) {
  const dist = farmer.group.position.distanceTo(farmer.targetPos);

  if (dist > 0.15) {
    const dir = new THREE.Vector3().subVectors(farmer.targetPos, farmer.group.position).normalize();
    farmer.group.position.addScaledVector(dir, delta * 7.5);

    // Look at moving direction
    const angle = Math.atan2(dir.x, dir.z);
    farmer.group.rotation.y = THREE.MathUtils.lerp(farmer.group.rotation.y, angle, delta * 12);

    // Running bob
    farmer.group.position.y = Math.abs(Math.sin(elapsed * 12)) * 0.18;
  } else {
    farmer.group.position.y = 0;
  }

  // Work animation
  if (farmer.isWorking) {
    farmer.workTimer -= delta;
    farmer.toolMesh.rotation.x = Math.sin(elapsed * 16) * 0.8;
    if (farmer.workTimer <= 0) {
      farmer.isWorking = false;
      farmer.toolMesh.rotation.x = Math.PI / 6;
    }
  }

  if (onMove) {
    onMove(
      farmer.group.position.x,
      farmer.group.position.z,
      farmer.group.rotation.y,
      farmer.isWorking,
      farmer.targetPos.x,
      farmer.targetPos.z,
      false
    );
  }
}

// =========================================================================
// HELPER: Interactive Hover Ring
// =========================================================================
function createHoverRing(scene: THREE.Scene) {
  const ringGeo = new THREE.RingGeometry(1.05, 1.2, 20);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0xfacc15,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.85
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.visible = false;
  scene.add(ring);
  return ring;
}

// =========================================================================
// HELPER: Sync Plots
// =========================================================================
function syncPlots(
  scene: THREE.Scene,
  plots: FarmPlot[],
  plotMeshesMap: Map<string, {
    tileMesh: THREE.Mesh;
    soilMesh: THREE.Mesh;
    waterMesh: THREE.Mesh;
    cropGroup: THREE.Group;
    readyBadge: THREE.Sprite;
  }>,
  elapsed: number
) {
  plots.forEach(plot => {
    let entry = plotMeshesMap.get(plot.id);

    // Create plot mesh if not existing
    if (!entry) {
      const plotGroup = new THREE.Group();
      plotGroup.position.set(plot.gridX * 2.5, 0, plot.gridZ * 2.5);

      // Grass border / base tile
      const tileMat = new THREE.MeshStandardMaterial({
        color: 0x84cc16,
        roughness: 0.9
      });
      const tileMesh = new THREE.Mesh(new THREE.BoxGeometry(2.35, 0.12, 2.35), tileMat);
      tileMesh.name = plot.id;
      tileMesh.position.y = 0.06;
      tileMesh.receiveShadow = true;
      plotGroup.add(tileMesh);

      // Soil Bed (tilled dark earth)
      const soilMat = new THREE.MeshStandardMaterial({
        color: 0x78350f, // Rich dark brown soil
        roughness: 0.95
      });
      const soilMesh = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.14, 2.1), soilMat);
      soilMesh.name = plot.id;
      soilMesh.position.y = 0.08;
      soilMesh.visible = false;
      plotGroup.add(soilMesh);

      // Water sheen
      const waterMat = new THREE.MeshStandardMaterial({
        color: 0x451a03, // Wet dark mud
        roughness: 0.25,
        metalness: 0.2
      });
      const waterMesh = new THREE.Mesh(new THREE.BoxGeometry(2.11, 0.15, 2.11), waterMat);
      waterMesh.position.y = 0.085;
      waterMesh.visible = false;
      plotGroup.add(waterMesh);

      // Crop group
      const cropGroup = new THREE.Group();
      cropGroup.position.y = 0.15;
      plotGroup.add(cropGroup);

      // Ready-to-harvest bouncing badge sprite
      const canvas = document.createElement('canvas');
      canvas.width = 128;
      canvas.height = 128;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(64, 64, 56, 0, Math.PI * 2);
        ctx.fill();
        ctx.lineWidth = 6;
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();
        ctx.font = '64px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🧺', 64, 64);
      }
      const badgeTexture = new THREE.CanvasTexture(canvas);
      const readyBadge = new THREE.Sprite(new THREE.SpriteMaterial({ map: badgeTexture, transparent: true }));
      readyBadge.scale.set(0.9, 0.9, 0.9);
      readyBadge.position.set(0, 1.8, 0);
      readyBadge.visible = false;
      plotGroup.add(readyBadge);

      scene.add(plotGroup);

      entry = { tileMesh, soilMesh, waterMesh, cropGroup, readyBadge };
      plotMeshesMap.set(plot.id, entry);
    }

    // Update visuals based on plot state
    entry.soilMesh.visible = plot.isPlowed;
    entry.waterMesh.visible = plot.isWatered;

    // Check Ready Badge
    entry.readyBadge.visible = !!plot.isReady;
    if (plot.isReady) {
      entry.readyBadge.position.y = 1.6 + Math.sin(elapsed * 4 + plot.gridX) * 0.15;
    }

    // Rebuild or scale crop 3D visuals
    updateCropMesh(entry.cropGroup, plot, elapsed);
  });
}

function updateCropMesh(cropGroup: THREE.Group, plot: FarmPlot, elapsed: number) {
  // If no crop planted, clear group
  if (!plot.cropId) {
    if (cropGroup.children.length > 0) {
      cropGroup.clear();
    }
    return;
  }

  const cropDef = FARM_CROPS[plot.cropId];
  if (!cropDef) return;

  // If children don't match crop type, create crop 3D structure
  if (cropGroup.name !== plot.cropId) {
    cropGroup.clear();
    cropGroup.name = plot.cropId;

    const stemMat = new THREE.MeshStandardMaterial({ color: cropDef.leafColor, roughness: 0.7 });
    const fruitMat = new THREE.MeshStandardMaterial({ color: cropDef.color, roughness: 0.5 });

    if (plot.cropId === 'wheat') {
      // Multiple wheat stalks
      for (let i = 0; i < 7; i++) {
        const ang = (i / 7) * Math.PI * 2;
        const rad = 0.45;
        const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 1.2), stemMat);
        stalk.position.set(Math.cos(ang) * rad, 0.6, Math.sin(ang) * rad);
        stalk.rotation.z = (Math.random() - 0.5) * 0.2;
        cropGroup.add(stalk);

        const ear = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.08, 0.45, 6), fruitMat);
        ear.position.set(Math.cos(ang) * rad, 1.2, Math.sin(ang) * rad);
        cropGroup.add(ear);
      }
    } else if (plot.cropId === 'carrot') {
      // Frilly green foliage + orange top
      const foliage = new THREE.Mesh(new THREE.ConeGeometry(0.45, 0.8, 6), stemMat);
      foliage.position.y = 0.5;
      cropGroup.add(foliage);

      const top = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.05, 0.35, 8), fruitMat);
      top.position.y = 0.15;
      cropGroup.add(top);
    } else if (plot.cropId === 'pumpkin') {
      // Big ribbed pumpkin
      const pumpkinMesh = new THREE.Mesh(new THREE.SphereGeometry(0.55, 10, 10), fruitMat);
      pumpkinMesh.scale.set(1.2, 0.85, 1.2);
      pumpkinMesh.position.y = 0.4;
      cropGroup.add(pumpkinMesh);

      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.25), stemMat);
      stem.position.y = 0.8;
      cropGroup.add(stem);
    } else if (plot.cropId === 'strawberry') {
      // Bush with red berries
      const bush = new THREE.Mesh(new THREE.SphereGeometry(0.45, 8, 8), stemMat);
      bush.position.y = 0.35;
      cropGroup.add(bush);

      for (let i = 0; i < 4; i++) {
        const berry = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.22, 6), fruitMat);
        const ang = (i / 4) * Math.PI * 2;
        berry.position.set(Math.cos(ang) * 0.4, 0.35, Math.sin(ang) * 0.4);
        berry.rotation.x = Math.PI;
        cropGroup.add(berry);
      }
    } else if (plot.cropId === 'sunflower') {
      // Tall stalk with golden blossom face
      const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 1.5), stemMat);
      stalk.position.y = 0.75;
      cropGroup.add(stalk);

      const head = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.12, 12), fruitMat);
      head.rotation.x = Math.PI / 4;
      head.position.set(0, 1.45, 0.2);
      cropGroup.add(head);

      const center = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.14, 12), new THREE.MeshStandardMaterial({ color: 0x451a03 }));
      center.rotation.x = Math.PI / 4;
      center.position.set(0, 1.46, 0.22);
      cropGroup.add(center);
    } else {
      // Generic Tomato / Corn
      const plant = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 1.1), stemMat);
      plant.position.y = 0.55;
      cropGroup.add(plant);

      const fruit1 = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 8), fruitMat);
      fruit1.position.set(0.2, 0.7, 0.1);
      cropGroup.add(fruit1);

      const fruit2 = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 8), fruitMat);
      fruit2.position.set(-0.2, 0.9, -0.1);
      cropGroup.add(fruit2);
    }
  }

  // Scale according to growth progress (0.15 sprout -> 1.0 full)
  const scale = 0.2 + plot.growthProgress * 0.8;
  cropGroup.scale.set(scale, scale, scale);

  // Subtle wind sway
  cropGroup.rotation.z = Math.sin(elapsed * 2.5 + plot.gridX) * 0.04;
}

// =========================================================================
// HELPER: Sync Animals
// =========================================================================
function syncAnimals(
  scene: THREE.Scene,
  animals: FarmAnimal[],
  animalMeshesMap: Map<string, {
    group: THREE.Group;
    type: 'chicken' | 'cow' | 'sheep';
    readyBubble: THREE.Sprite;
    bodyMesh: THREE.Mesh;
  }>,
  delta: number,
  elapsed: number
) {
  animals.forEach(anim => {
    let entry = animalMeshesMap.get(anim.id);

    if (!entry) {
      const animGroup = new THREE.Group();
      animGroup.position.set(anim.x, 0, anim.z);

      const def = FARM_ANIMALS[anim.defId];
      let bodyMesh: THREE.Mesh;

      if (def?.type === 'chicken') {
        bodyMesh = createChickenMesh();
      } else if (def?.type === 'cow') {
        bodyMesh = createCowMesh();
      } else {
        bodyMesh = createSheepMesh();
      }
      bodyMesh.name = anim.id;
      animGroup.add(bodyMesh);

      // Ready-to-collect produce bubble
      const canvas = document.createElement('canvas');
      canvas.width = 128;
      canvas.height = 128;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(64, 64, 56, 0, Math.PI * 2);
        ctx.fill();
        ctx.lineWidth = 6;
        ctx.strokeStyle = '#38bdf8';
        ctx.stroke();
        ctx.font = '64px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(def?.produceIcon || '🥛', 64, 64);
      }
      const bubbleTexture = new THREE.CanvasTexture(canvas);
      const readyBubble = new THREE.Sprite(new THREE.SpriteMaterial({ map: bubbleTexture, transparent: true }));
      readyBubble.scale.set(0.85, 0.85, 0.85);
      readyBubble.position.set(0, def?.type === 'cow' ? 2.2 : 1.4, 0);
      readyBubble.visible = false;
      animGroup.add(readyBubble);

      scene.add(animGroup);
      entry = { group: animGroup, type: def?.type || 'chicken', readyBubble, bodyMesh };
      animalMeshesMap.set(anim.id, entry);
    }

    // Wander towards target
    const currentPos = entry.group.position;
    const target = new THREE.Vector3(anim.wanderTargetX, 0, anim.wanderTargetZ);
    if (currentPos.distanceTo(target) > 0.2) {
      const dir = new THREE.Vector3().subVectors(target, currentPos).normalize();
      currentPos.addScaledVector(dir, delta * (entry.type === 'chicken' ? 1.4 : 0.8));

      const angle = Math.atan2(dir.x, dir.z);
      entry.group.rotation.y = THREE.MathUtils.lerp(entry.group.rotation.y, angle, delta * 5);
      entry.group.position.y = Math.abs(Math.sin(elapsed * 6)) * 0.08;
    }

    // Ready bubble
    entry.readyBubble.visible = anim.isReady;
    if (anim.isReady) {
      entry.readyBubble.position.y = (entry.type === 'cow' ? 2.2 : 1.3) + Math.sin(elapsed * 3 + anim.x) * 0.12;
    }
  });
}

function createChickenMesh(): THREE.Mesh {
  const chickenGroup = new THREE.Group();

  const whiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 });
  const redMat = new THREE.MeshStandardMaterial({ color: 0xef4444 });
  const yellowMat = new THREE.MeshStandardMaterial({ color: 0xfacc15 });

  // Body
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 8), whiteMat);
  body.position.y = 0.45;
  chickenGroup.add(body);

  // Comb
  const comb = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.18, 0.22), redMat);
  comb.position.set(0, 0.82, 0.05);
  chickenGroup.add(comb);

  // Beak
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.2, 4), yellowMat);
  beak.rotation.x = Math.PI / 2;
  beak.position.set(0, 0.62, 0.35);
  chickenGroup.add(beak);

  // Return container mesh
  const root = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.8, 0.7), new THREE.MeshBasicMaterial({ visible: false }));
  root.add(chickenGroup);
  return root;
}

function createCowMesh(): THREE.Mesh {
  const cowGroup = new THREE.Group();

  const cowMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.7 });
  const spotMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 });
  const snoutMat = new THREE.MeshStandardMaterial({ color: 0xfbcfe8 });

  // Body
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.1, 2.2), cowMat);
  body.position.y = 1.2;
  cowGroup.add(body);

  // Black Spots
  const spot1 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.6), spotMat);
  spot1.position.set(0.5, 1.3, 0.3);
  cowGroup.add(spot1);

  // Head
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.75, 0.85), cowMat);
  head.position.set(0, 1.5, 1.3);
  cowGroup.add(head);

  // Pink Snout
  const snout = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.35, 0.3), snoutMat);
  snout.position.set(0, 1.3, 1.75);
  cowGroup.add(snout);

  // 4 Legs
  const legMat = new THREE.MeshStandardMaterial({ color: 0x1e293b });
  const legPositions = [
    { x: 0.45, z: 0.7 },
    { x: -0.45, z: 0.7 },
    { x: 0.45, z: -0.7 },
    { x: -0.45, z: -0.7 }
  ];
  legPositions.forEach(lp => {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.7), legMat);
    leg.position.set(lp.x, 0.35, lp.z);
    cowGroup.add(leg);
  });

  const root = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.0, 2.4), new THREE.MeshBasicMaterial({ visible: false }));
  root.add(cowGroup);
  return root;
}

function createSheepMesh(): THREE.Mesh {
  const sheepGroup = new THREE.Group();

  const woolMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.95 });
  const faceMat = new THREE.MeshStandardMaterial({ color: 0x334155 });

  // Fluffy Wool Body
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.8, 8, 8), woolMat);
  body.scale.set(1.1, 0.9, 1.3);
  body.position.y = 0.85;
  sheepGroup.add(body);

  // Dark Head
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.45, 0.5), faceMat);
  head.position.set(0, 0.95, 0.85);
  sheepGroup.add(head);

  // 4 Legs
  for (let i = 0; i < 4; i++) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.5), faceMat);
    leg.position.set(
      (i % 2 === 0 ? 0.35 : -0.35),
      0.25,
      (i < 2 ? 0.45 : -0.45)
    );
    sheepGroup.add(leg);
  }

  const root = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.4, 1.6), new THREE.MeshBasicMaterial({ visible: false }));
  root.add(sheepGroup);
  return root;
}

// =========================================================================
// HELPER: Butterflies & Chimney Smoke
// =========================================================================
function createButterflies(scene: THREE.Scene) {
  const list: Array<{ group: THREE.Group; leftWing: THREE.Mesh; rightWing: THREE.Mesh; originX: number; originZ: number }> = [];
  const colors = [0xf43f5e, 0x38bdf8, 0xfacc15, 0xa855f7];

  for (let i = 0; i < 6; i++) {
    const group = new THREE.Group();
    const wingMat = new THREE.MeshStandardMaterial({
      color: colors[i % colors.length],
      side: THREE.DoubleSide
    });

    const leftWing = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.24), wingMat);
    leftWing.position.x = -0.12;
    group.add(leftWing);

    const rightWing = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.24), wingMat);
    rightWing.position.x = 0.12;
    group.add(rightWing);

    const originX = (Math.random() - 0.5) * 20;
    const originZ = (Math.random() - 0.5) * 20;
    group.position.set(originX, 1.5, originZ);
    scene.add(group);

    list.push({ group, leftWing, rightWing, originX, originZ });
  }

  return list;
}

function createChimneySmoke(scene: THREE.Scene) {
  const puffs: THREE.Mesh[] = [];
  const puffMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.45,
    roughness: 1.0
  });

  for (let i = 0; i < 4; i++) {
    const puff = new THREE.Mesh(new THREE.SphereGeometry(0.35, 6, 6), puffMat);
    puff.position.set(-18.4, 7.8 + i * 0.9, -15.2);
    scene.add(puff);
    puffs.push(puff);
  }

  return puffs;
}

// =========================================================================
// HELPER: Sync Remote Co-op Farmers
// =========================================================================
function syncRemotePlayers(
  scene: THREE.Scene,
  remotePlayers: RemotePlayer[],
  localPlayerId: string,
  remotePlayersMap: Map<string, { group: THREE.Group; nameTag: THREE.Sprite; toolMesh: THREE.Mesh; targetPos: THREE.Vector3 }>,
  delta: number,
  elapsed: number
) {
  const activeIds = new Set<string>();

  (remotePlayers || []).forEach(p => {
    if (p.id === localPlayerId) return;
    activeIds.add(p.id);

    let entry = remotePlayersMap.get(p.id);
    if (!entry) {
      entry = createRemoteFarmerMesh(scene, p);
      remotePlayersMap.set(p.id, entry);
    }

    // Set destination target if moving or server position updated
    const destX = typeof p.targetX === 'number' && !isNaN(p.targetX) ? p.targetX : p.x;
    const destZ = typeof p.targetZ === 'number' && !isNaN(p.targetZ) ? p.targetZ : p.z;
    if (typeof destX === 'number' && !isNaN(destX) && typeof destZ === 'number' && !isNaN(destZ)) {
      entry.targetPos.set(destX, 0, destZ);
    }

    const dist = entry.group.position.distanceTo(entry.targetPos);
    if (dist > 0.15) {
      // Walk towards target destination smoothly with same speed as local player
      const dir = new THREE.Vector3().subVectors(entry.targetPos, entry.group.position).normalize();
      entry.group.position.addScaledVector(dir, delta * 7.5);
      const angle = Math.atan2(dir.x, dir.z);
      entry.group.rotation.y = THREE.MathUtils.lerp(entry.group.rotation.y, angle, delta * 12);
      entry.group.position.y = Math.abs(Math.sin(elapsed * 12)) * 0.18;
    } else {
      entry.group.position.y = 0;
      if (typeof p.angle === 'number' && !isNaN(p.angle)) {
        entry.group.rotation.y = THREE.MathUtils.lerp(entry.group.rotation.y, p.angle, delta * 8);
      }
      // Reconcile small drift with current reported position
      if (typeof p.x === 'number' && !isNaN(p.x)) {
        entry.group.position.x = THREE.MathUtils.lerp(entry.group.position.x, p.x, delta * 6);
      }
      if (typeof p.z === 'number' && !isNaN(p.z)) {
        entry.group.position.z = THREE.MathUtils.lerp(entry.group.position.z, p.z, delta * 6);
      }
    }

    // Work tool animation
    if (p.isWorking) {
      entry.toolMesh.rotation.x = Math.sin(elapsed * 16) * 0.8;
    } else {
      entry.toolMesh.rotation.x = Math.PI / 6;
    }
  });

  // Remove players who left
  remotePlayersMap.forEach((entry, id) => {
    if (!activeIds.has(id)) {
      scene.remove(entry.group);
      remotePlayersMap.delete(id);
    }
  });
}

function createRemoteFarmerMesh(
  scene: THREE.Scene,
  player: RemotePlayer
): { group: THREE.Group; nameTag: THREE.Sprite; toolMesh: THREE.Mesh; targetPos: THREE.Vector3 } {
  const farmerGroup = new THREE.Group();
  const initX = typeof player.x === 'number' && !isNaN(player.x) ? player.x : 0;
  const initZ = typeof player.z === 'number' && !isNaN(player.z) ? player.z : 3.5;
  farmerGroup.position.set(initX, 0, initZ);

  // Overalls with player color
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.65, 0.9, 0.45),
    new THREE.MeshStandardMaterial({ color: player.color || 0x1d4ed8 })
  );
  body.position.y = 0.9;
  body.castShadow = true;
  farmerGroup.add(body);

  // Shirt
  const shirt = new THREE.Mesh(
    new THREE.BoxGeometry(0.66, 0.4, 0.46),
    new THREE.MeshStandardMaterial({ color: 0x0284c7 })
  );
  shirt.position.y = 1.15;
  farmerGroup.add(shirt);

  // Head
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.3, 10, 10),
    new THREE.MeshStandardMaterial({ color: 0xfbcfe8, roughness: 0.6 })
  );
  head.position.y = 1.6;
  head.castShadow = true;
  farmerGroup.add(head);

  // Straw Hat
  const hatBrim = new THREE.Mesh(
    new THREE.CylinderGeometry(0.7, 0.75, 0.08, 12),
    new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.9 })
  );
  hatBrim.position.y = 1.82;
  farmerGroup.add(hatBrim);

  const hatCrown = new THREE.Mesh(
    new THREE.CylinderGeometry(0.35, 0.4, 0.35, 10),
    new THREE.MeshStandardMaterial({ color: 0xfde047, roughness: 0.9 })
  );
  hatCrown.position.y = 2.0;
  farmerGroup.add(hatCrown);

  // Tool in hand
  const tool = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.04, 1.1),
    new THREE.MeshStandardMaterial({ color: 0x78350f })
  );
  tool.position.set(0.45, 0.9, 0.2);
  tool.rotation.x = Math.PI / 6;
  farmerGroup.add(tool);

  // Floating Overhead Name Tag (e.g. "🧑‍🌾 Player Name")
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    if (ctx.roundRect) {
      ctx.roundRect(8, 8, 240, 48, 24);
    } else {
      ctx.fillRect(8, 8, 240, 48);
    }
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#f59e0b';
    ctx.stroke();

    ctx.font = 'bold 22px Fredoka, sans-serif';
    ctx.fillStyle = '#78350f';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`🧑‍🌾 ${player.name}`, 128, 32);
  }
  const texture = new THREE.CanvasTexture(canvas);
  const nameTag = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true }));
  nameTag.scale.set(2.0, 0.5, 1);
  nameTag.position.set(0, 2.5, 0);
  farmerGroup.add(nameTag);

  scene.add(farmerGroup);

  return {
    group: farmerGroup,
    nameTag,
    toolMesh: tool,
    targetPos: new THREE.Vector3(
      typeof player.targetX === 'number' && !isNaN(player.targetX) ? player.targetX : initX,
      0,
      typeof player.targetZ === 'number' && !isNaN(player.targetZ) ? player.targetZ : initZ
    )
  };
}

