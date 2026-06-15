export interface SandboxAsset {
  id: string;
  type: 'terrain' | 'ruins' | 'crop' | 'tree' | 'path' | 'building' | 'energy' | 'water' | 'details';
  pos: [number, number, number];
  scale: [number, number, number];
  color: string;
  rotation?: [number, number, number];
  metadata?: {
    spinSpeed?: number;
    floatSpeed?: number;
    emissive?: string;
    intensity?: number;
  };
}

// Generate spiral grid positions deterministically
export function getSpiralCellCoordinates(index: number): [number, number] {
  if (index === 0) return [0, 0];
  
  // Spiral algorithms
  let x = 0;
  let z = 0;
  let dx = 0;
  let dz = -1;
  let maxI = index * 4; // safe bounds
  
  let currentStep = 0;
  let level = 1;
  let stepsInCurrentSide = 0;
  let sideIndex = 0;
  
  // Simple deterministic spiral
  const spiralCoords: [number, number][] = [[0, 0]];
  
  let cx = 0, cz = 0;
  let dirX = 1, dirZ = 0;
  let steps = 1;
  let stepCount = 0;
  let turns = 0;

  while (spiralCoords.length <= index + 50) {
    cx += dirX;
    cz += dirZ;
    spiralCoords.push([cx, cz]);
    stepCount++;
    if (stepCount === steps) {
      stepCount = 0;
      // turn 90 deg clockwise
      const temp = dirX;
      dirX = -dirZ;
      dirZ = temp;
      turns++;
      if (turns % 2 === 0) {
        steps++;
      }
    }
  }
  
  return spiralCoords[index] || [0, 0];
}

/**
 * Deterministic PRNG based on grid seed.
 * Ensures that the layout is stable for each grid coordinate.
 */
function pseudoRandom(x: number, z: number, offset: number = 0): number {
  const seed = Math.sin(x * 12.9898 + z * 78.233 + offset) * 43758.5453123;
  return seed - Math.floor(seed);
}

/**
 * Endless procedurally generated base builder sandbox assets
 * based entirely on a continuous `score` variable.
 */
export function generateSandboxAssets(score: number, targetScore: number = 500): SandboxAsset[] {
  const assets: SandboxAsset[] = [];
  
  // Calculate apparent score adjusted for max 81 cells to ensure 60 FPS performance
  const maxCells = 81; // 9x9 grid representation
  const pointsPerCell = 20;
  const apparentTarget = maxCells * pointsPerCell; // 1620 points
  
  // Scale score to fit this grid
  const apparentScore = targetScore > 0 ? (score / targetScore) * apparentTarget : 0;
  
  // 1. Barren Post-Apocalyptic Ruins state if score is 0
  if (score <= 0) {
    // Generate scattered burnt rubble and dead elements in the core
    for (let i = 0; i < 28; i++) {
      const angle = (i / 28) * Math.PI * 2;
      const radius = 1.0 + pseudoRandom(i, 2) * 5.0;
      const rx = Math.cos(angle) * radius;
      const rz = Math.sin(angle) * radius;
      const ry = -0.9 + pseudoRandom(i, 5) * 0.15;
      
      const ruinType = i % 3;
      if (ruinType === 0) {
        // Burnt foundation bricks
        assets.push({
          id: `ruin_brick_${i}`,
          type: 'ruins',
          pos: [rx, ry, rz],
          scale: [0.6 + pseudoRandom(i, 1) * 0.6, 0.12, 0.4 + pseudoRandom(i, 6) * 0.4],
          color: '#2a1b18',
          rotation: [0, pseudoRandom(i, 7) * Math.PI, 0]
        });
      } else if (ruinType === 1) {
        // Scorched timber wreckage
        assets.push({
          id: `ruin_wood_${i}`,
          type: 'ruins',
          pos: [rx, ry + 0.1, rz],
          scale: [0.15, 0.15, 1.2 + pseudoRandom(i, 8) * 0.8],
          color: '#1a100e',
          rotation: [pseudoRandom(i, 9) * 0.3, pseudoRandom(i, 10) * Math.PI, pseudoRandom(i, 11) * 0.3]
        });
      } else {
        // Crumbled stone pillars
        assets.push({
          id: `ruin_stone_${i}`,
          type: 'ruins',
          pos: [rx, ry + 0.2, rz],
          scale: [0.35, 0.6 + pseudoRandom(i, 12) * 0.7, 0.35],
          color: '#1f1a18',
          rotation: [0.1, pseudoRandom(i, 13) * 0.4, 0.5]
        });
      }
    }
    
    // Core barren patch
    assets.push({
      id: 'ruined_core_soil',
      type: 'terrain',
      pos: [0, -1.0, 0],
      scale: [6, 0.1, 6],
      color: '#181210'
    });
    
    return assets;
  }
  
  // 2. Score > 0: Endless expansion starts!
  // Determine how many grid cells of land are unlocked. Each cell is 4m x 4m.
  const numCellsBuilt = Math.max(1, Math.ceil(apparentScore / pointsPerCell));
  const totalCellsToDraw = Math.max(maxCells, numCellsBuilt);
  
  // Total score pool distributed sequentially to cells for realistic incremental growth
  let scorePool = apparentScore;
  
  for (let cellIndex = 0; cellIndex < totalCellsToDraw; cellIndex++) {
    const [cellX, cellZ] = getSpiralCellCoordinates(cellIndex);
    
    // Distribute score pool to this cell
    const cellScore = Math.min(scorePool, pointsPerCell);
    scorePool = Math.max(0, scorePool - pointsPerCell);
    
    // Base coordinates for this cell
    const baseX = cellX * 4.4;
    const baseZ = cellZ * 4.4;
    
    // Check if this cell is undeveloped (it has no score allocated to it)
    const isUndeveloped = cellScore <= 0;
    
    if (isUndeveloped) {
      // Empty construction land plot
      assets.push({
        id: `empty_cell_${cellX}_${cellZ}`,
        type: 'terrain',
        pos: [baseX, -1.01, baseZ],
        scale: [4.2, 0.1, 4.2],
        color: '#1e293b' // Modern dark bare plot color (slate-800)
      });
      continue; // Skip building roads, trees, houses, etc on this cell!
    }
    
    // Render Land Tile (Solid pasture)
    // Land gets greener & healthier with higher cellScore
    let floorColor = '#1f2d25'; // damp dark moss
    if (cellScore > 3) floorColor = '#1e3a27'; // green-brown
    if (cellScore > 8) floorColor = '#155e2e'; // healthy pasture
    if (cellScore > 15) floorColor = '#166534'; // premium forest green
    
    assets.push({
      id: `land_cell_${cellX}_${cellZ}`,
      type: 'terrain',
      pos: [baseX, -1.0, baseZ],
      scale: [4.2, 0.2, 4.2],
      color: floorColor
    });

    // Sub-tile details depending on cellScore
    // 1. Cobblestone Pathways connecting elements to center cell (0,0)
    if (cellScore >= 3) {
      // Create pathways towards center depending on indices
      const isVertical = Math.abs(cellZ) > Math.abs(cellX);
      assets.push({
        id: `path_cell_${cellX}_${cellZ}`,
        type: 'path',
        pos: [
          baseX + (isVertical ? 0 : (cellX > 0 ? -1.8 : 1.8)),
          -0.89,
          baseZ + (isVertical ? (cellZ > 0 ? -1.8 : 1.8) : 0)
        ],
        scale: [isVertical ? 1.0 : 4.2, 0.03, isVertical ? 4.2 : 1.0],
        color: '#475569' // steel slate cobblestones
      });
    }

    // 2. Agricultural Crops & Nature plots
    if (cellScore >= 6) {
      const cropSeed = pseudoRandom(cellX, cellZ, 100);
      const cropX = baseX + (cropSeed > 0.5 ? 1.1 : -1.1);
      const cropZ = baseZ + (cropSeed > 0.5 ? -1.1 : 1.1);
      
      // Farm soil plot
      assets.push({
        id: `crop_soil_${cellX}_${cellZ}`,
        type: 'crop',
        pos: [cropX, -0.88, cropZ],
        scale: [1.3, 0.05, 1.3],
        color: '#45220c' // brown rich tilled clay
      });
      
      // Sprouting farm crops (golden wheat or green shoots)
      // Height and count depends on cellScore
      const growthTier = Math.min(3, Math.floor((cellScore - 6) / 3) + 1); // 1 to 3
      const cropColor = growthTier === 3 ? '#eab308' : '#84cc16'; // gold or light green
      
      for (let cx = -0.4; cx <= 0.4; cx += 0.4) {
        for (let cz = -0.4; cz <= 0.4; cz += 0.4) {
          assets.push({
            id: `shoot_${cellX}_${cellZ}_${cx.toFixed(1)}_${cz.toFixed(1)}`,
            type: 'crop',
            pos: [cropX + cx, -0.85 + (growthTier * 0.1)/2, cropZ + cz],
            scale: [0.08, growthTier * 0.12, 0.08],
            color: cropColor
          });
        }
      }
    }

    // 3. Sprouting Trees (Lush green foliage)
    if (cellScore >= 10) {
      const treeSeed = pseudoRandom(cellX, cellZ, 200);
      const treeX = baseX + (treeSeed > 0.5 ? -1.2 : 1.2);
      const treeZ = baseZ + (treeSeed > 0.5 ? -1.2 : -1.2);
      
      const treeScale = 0.7 + treeSeed * 0.5;
      
      // Trunk (brown)
      assets.push({
        id: `tree_trunk_${cellX}_${cellZ}`,
        type: 'tree',
        pos: [treeX, -0.8 + (1.2 * treeScale) / 2, treeZ],
        scale: [0.18 * treeScale, 1.2 * treeScale, 0.18 * treeScale],
        color: '#5c3917'
      });
      
      // Foliage canopy (layered standard green leaves)
      assets.push({
        id: `tree_foliage_${cellX}_${cellZ}`,
        type: 'tree',
        pos: [treeX, -0.8 + 1.2 * treeScale + (0.5 * treeScale), treeZ],
        scale: [1.1 * treeScale, 1.1 * treeScale, 1.1 * treeScale],
        color: cellIndex % 2 === 0 ? '#15803d' : '#166534'
      });
    }

    // 4. Infrastructure (Cottages, watchtowers, storage facilities)
    if (cellScore >= 14) {
      const bSeed = pseudoRandom(cellX, cellZ, 300);
      const bX = baseX + (bSeed > 0.5 ? 0.3 : -0.3);
      const bZ = baseZ + (bSeed > 0.5 ? 0.3 : -0.3);
      
      const bWidth = 1.6 + bSeed * 0.4;
      const bHeight = 1.0 + (cellScore - 14) * 0.12; // building grows with score!
      const bDepth = 1.4 + bSeed * 0.3;
      
      // Base cottage walls
      assets.push({
        id: `building_wall_${cellX}_${cellZ}`,
        type: 'building',
        pos: [bX, -0.8 + bHeight / 2, bZ],
        scale: [bWidth, bHeight, bDepth],
        color: cellIndex % 3 === 0 ? '#f8fafc' : (cellIndex % 3 === 1 ? '#cbd5e1' : '#e2e8f0') // marble white, light slate
      });
      
      // Roof (cozy pitched wooden/tile design)
      assets.push({
        id: `building_roof_${cellX}_${cellZ}`,
        type: 'building',
        pos: [bX, -0.8 + bHeight + 0.25, bZ],
        scale: [bWidth * 1.15, 0.5, bDepth * 1.15],
        color: '#991b1b', // burgundy terracotta tiles
        rotation: [0, 0, 0] // pitched look
      });

      // Window lights (cozy evening glow)
      assets.push({
        id: `building_window_${cellX}_${cellZ}`,
        type: 'details',
        pos: [bX, -0.8 + bHeight / 2 + 0.1, bZ + bDepth / 2 + 0.02],
        scale: [0.3, 0.3, 0.04],
        color: '#fbbf24',
        metadata: {
          emissive: '#fbbf24',
          intensity: 1.5
        }
      });
    }

    // 5. Endless Clean Energy Infrastructure (Glowing lamps, Solar panels, Turbines)
    if (cellScore >= 18) {
      const eSeed = pseudoRandom(cellX, cellZ, 400);
      const eX = baseX + (eSeed > 0.5 ? -1.4 : 1.4);
      const eZ = baseZ + (eSeed > 0.5 ? 1.4 : -1.4);
      
      // Wind turbine generator tower
      assets.push({
        id: `energy_pylon_${cellX}_${cellZ}`,
        type: 'energy',
        pos: [eX, -0.8 + 1.8 / 2, eZ],
        scale: [0.1, 1.8, 0.1],
        color: '#f1f5f9' // high tech white steel
      });
      
      // Wind turbine dynamic rotating blades
      assets.push({
        id: `energy_blades_${cellX}_${cellZ}`,
        type: 'energy',
        pos: [eX, -0.8 + 1.8, eZ + 0.1],
        scale: [0.8, 0.08, 0.08],
        color: '#cbd5e1',
        metadata: {
          spinSpeed: 2.5 + pseudoRandom(cellX, cellZ, 450) * 2.0
        }
      });

      // Shimmering power cell glow (skyward beacon)
      assets.push({
        id: `energy_beacon_${cellX}_${cellZ}`,
        type: 'details',
        pos: [eX, -0.8 + 1.8 + 0.1, eZ],
        scale: [0.15, 0.15, 0.15],
        color: '#38bdf8', // crystal blue cyan energy capsule
        metadata: {
          emissive: '#38bdf8',
          intensity: 2.0,
          floatSpeed: 3.0
        }
      });
    }
  }
  
  // 3. Core Landmark Fountain / Water Monument on the first central cell (0,0) index
  // Gets progressively glorious with score thresholds!
  if (score >= 5) {
    // Elegant Multi-Tier circular brick water pool
    assets.push({
      id: 'core_monument_base',
      type: 'water',
      pos: [0, -0.85, 0],
      scale: [2.0, 0.15, 2.0],
      color: '#475569'
    });
    
    // Water surface
    assets.push({
      id: 'core_monument_water',
      type: 'water',
      pos: [0, -0.76, 0],
      scale: [1.8, 0.05, 1.8],
      color: '#0284c7', // rich blue water
      metadata: {
        floatSpeed: 2.0 // ripples
      }
    });
    
    // central spire that grows with overall score
    const fountainHeight = Math.min(3.5, 0.5 + Math.log2(score / 5) * 0.6);
    assets.push({
      id: 'core_monument_spire',
      type: 'water',
      pos: [0, -0.7 + fountainHeight / 2, 0],
      scale: [0.35, fountainHeight, 0.35],
      color: '#38bdf8',
      metadata: {
        emissive: '#0ea5e9',
        intensity: 1.8
      }
    });

    if (score >= 100) {
      // Golden architectural rings hovering above core fountain for endgame majestic aesthetic
      assets.push({
        id: 'core_monument_halo_1',
        type: 'details',
        pos: [0, 0.6 + fountainHeight, 0],
        scale: [1.2, 0.08, 1.2],
        color: '#fbbf24',
        metadata: {
          floatSpeed: 1.5,
          spinSpeed: 1.0,
          emissive: '#ca8a04',
          intensity: 1.0
        }
      });
    }
  }

  return assets;
}
