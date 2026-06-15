import React, { Suspense, useRef, useEffect, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows, Float } from '@react-three/drei';
import * as THREE from 'three';
import { useStore, calculateTeamProgress, calculateTeamScore } from '../store';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Award, Target, Sparkles, Check, Lock, ChevronDown, ChevronUp, Calendar, Activity, ChevronRight } from 'lucide-react';
import { MvpLeaderboard } from './MvpLeaderboard';
import { generateSandboxAssets, SandboxAsset } from '../lib/endlessSandboxGenerator';
import { supabase } from '../lib/supabase';

function CameraRig({ position }: { position: [number, number, number] }) {
  useFrame((state) => {
    state.camera.position.lerp(new THREE.Vector3(...position), 0.08);
  });
  return null;
}

const MILESTONES = [
  { percent: 25, title: 'Bronze Foundation', desc: 'Base construction successfully locked in (25%)', emoji: '🥉', color: '#b45309', glowColor: 'rgba(180, 83, 9, 0.4)' },
  { percent: 50, title: 'Structural Silver', desc: 'Rises robustly to the halfway progress mark (50%)', emoji: '🥈', color: '#64748b', glowColor: 'rgba(100, 116, 139, 0.4)' },
  { percent: 75, title: 'Golden Apex Peak', desc: 'Structure reaches three-quarters height (75%)', emoji: '🥇', color: '#d97706', glowColor: 'rgba(217, 119, 6, 0.4)' },
  { percent: 100, title: 'Architectural Master', desc: '100% full masterwork completed and crowned!', emoji: '👑', color: '#6366f1', glowColor: 'rgba(99, 102, 241, 0.4)' },
];

function MilestoneGem3D({ position, color, progress, targetProgress, label, emoji }: { position: [number, number, number], color: string, progress: number, targetProgress: number, label: string, emoji: string }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const isUnlocked = progress >= targetProgress;

  useFrame((state) => {
    if (meshRef.current) {
      if (isUnlocked) {
        meshRef.current.rotation.y = state.clock.getElapsedTime() * 1.5;
        meshRef.current.rotation.x = Math.sin(state.clock.getElapsedTime() * 1.0) * 0.4;
        meshRef.current.position.y = position[1] + Math.sin(state.clock.getElapsedTime() * 2 + targetProgress) * 0.12;
      } else {
        meshRef.current.rotation.y = state.clock.getElapsedTime() * 0.4;
        meshRef.current.rotation.x = 0;
        meshRef.current.position.y = position[1] + Math.sin(state.clock.getElapsedTime() * 0.5 + targetProgress) * 0.04;
      }
    }
  });

  return (
    <group position={position}>
      <mesh ref={meshRef} castShadow>
        <octahedronGeometry args={[0.32, 0]} />
        <meshStandardMaterial 
          color={isUnlocked ? color : '#1e293b'} 
          roughness={isUnlocked ? 0.15 : 0.8}
          metalness={isUnlocked ? 0.85 : 0.1}
          emissive={isUnlocked ? color : '#000000'}
          emissiveIntensity={isUnlocked ? 1.2 : 0}
          transparent
          opacity={isUnlocked ? 0.95 : 0.25}
        />
      </mesh>
      
      {isUnlocked && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]}>
          <ringGeometry args={[0.35, 0.45, 16]} />
          <meshBasicMaterial color={color} side={THREE.DoubleSide} transparent opacity={0.3} />
        </mesh>
      )}
    </group>
  );
}

interface BlockData {
  pos: [number, number, number];
  rot: [number, number, number];
  scale: [number, number, number];
  color: string;
}

function generateArkPoints(): BlockData[] {
  const blocks: BlockData[] = [];
  const brownColors = ['#854d0e', '#a16207', '#ca8a04', '#b45309', '#78350f'];
  
  // 1. Keel (bottom centerline)
  for (let x = -3.5; x <= 3.5; x += 0.5) {
    blocks.push({
      pos: [x, 0.1, 0],
      rot: [0, 0, 0],
      scale: [0.6, 0.25, 0.6],
      color: '#451a03',
    });
  }

  // 2. Hull Ribs and Side Planks (Curving upwards and outwards)
  for (let level = 0; level < 4; level++) {
    const y = 0.3 + level * 0.35;
    const widthFactor = 0.5 + level * 0.25;
    
    for (let x = -3.5; x <= 3.5; x += 0.5) {
      const distFromCenter = Math.abs(x) / 4.0;
      const taper = Math.max(0.1, 1.0 - distFromCenter * distFromCenter);
      const zOffset = 1.4 * widthFactor * taper;
      const heightBonus = Math.pow(Math.abs(x) / 3.5, 2) * 0.55;
      
      blocks.push({
        pos: [x, y + heightBonus, zOffset],
        rot: [0, Math.atan2((x === 3.5 ? 0 : zOffset), 0.5), 0.1 * (x / 3.5)],
        scale: [0.55, 0.3, 0.2],
        color: brownColors[Math.abs(Math.floor(x * 2 + level)) % brownColors.length],
      });
      
      blocks.push({
        pos: [x, y + heightBonus, -zOffset],
        rot: [0, -Math.atan2((x === 3.5 ? 0 : zOffset), 0.5), -0.1 * (x / 3.5)],
        scale: [0.55, 0.3, 0.2],
        color: brownColors[Math.abs(Math.floor(x * 2 + level + 3)) % brownColors.length],
      });
    }
  }

  // 3. Deck floor
  for (let x = -3.0; x <= 3.0; x += 0.6) {
    const distFromCenter = Math.abs(x) / 3.5;
    const taper = Math.max(0.1, 1.0 - distFromCenter * distFromCenter);
    const maxZ = 1.1 * taper;
    
    for (let z = -maxZ + 0.25; z <= maxZ - 0.25; z += 0.5) {
      blocks.push({
        pos: [x, 1.4, z],
        rot: [0, 0, 0],
        scale: [0.65, 0.15, 0.45],
        color: '#ca8a04',
      });
    }
  }

  // 4. Cabin on the deck
  for (let level = 0; level < 2; level++) {
    const y = 1.55 + level * 0.4;
    for (let x = -1.5; x <= 1.5; x += 0.6) {
      blocks.push({
        pos: [x, y, 0.5],
        rot: [0, 0, 0],
        scale: [0.5, 0.38, 0.15],
        color: '#78350f',
      });
      blocks.push({
        pos: [x, y, -0.5],
        rot: [0, 0, 0],
        scale: [0.5, 0.38, 0.15],
        color: '#78350f',
      });
    }
  }

  // Cabin roof
  for (let x = -1.8; x <= 1.8; x += 0.5) {
    blocks.push({
      pos: [x, 2.3, 0],
      rot: [0.2 * (x > 0 ? -1 : 1), 0, 0],
      scale: [0.55, 0.15, 1.2],
      color: '#451a03',
    });
  }

  return blocks;
}

function generateWallPoints(): BlockData[] {
  const blocks: BlockData[] = [];
  const stoneColors = ['#cbd5e1', '#94a3b8', '#64748b', '#475569', '#334155'];
  const size = 3.0;
  const heightLevels = 5;
  const blockLength = 0.8;
  const getStoneColor = (val: number) => stoneColors[Math.abs(Math.floor(val * 13)) % stoneColors.length];

  // 1. Standard Wall Blocks on 4 sides
  for (let level = 0; level < heightLevels; level++) {
    const y = 0.2 + level * 0.4;
    const isTopCrenellation = level === heightLevels - 1;
    
    // Front (South) Wall: z = size
    for (let x = -size + 0.6; x <= size - 0.6; x += blockLength) {
      if (Math.abs(x) < 0.6 && level < 2) continue;
      if (isTopCrenellation && Math.round(x / blockLength) % 2 === 0) continue;
      blocks.push({
        pos: [x, y, size],
        rot: [0, 0, 0],
        scale: [blockLength - 0.05, 0.38, 0.4],
        color: getStoneColor(x + y + 1),
      });
    }

    // Back (North) Wall: z = -size
    for (let x = -size + 0.6; x <= size - 0.6; x += blockLength) {
      if (isTopCrenellation && Math.round(x / blockLength) % 2 === 0) continue;
      blocks.push({
        pos: [x, y, -size],
        rot: [0, 0, 0],
        scale: [blockLength - 0.05, 0.38, 0.4],
        color: getStoneColor(x + y + 2),
      });
    }

    // Left (West) Wall: x = -size
    for (let z = -size + 0.6; z <= size - 0.6; z += blockLength) {
      if (isTopCrenellation && Math.round(z / blockLength) % 2 === 0) continue;
      blocks.push({
        pos: [-size, y, z],
        rot: [0, Math.PI / 2, 0],
        scale: [blockLength - 0.05, 0.38, 0.4],
        color: getStoneColor(z + y + 3),
      });
    }

    // Right (East) Wall: x = size
    for (let z = -size + 0.6; z <= size - 0.6; z += blockLength) {
      if (isTopCrenellation && Math.round(z / blockLength) % 2 === 0) continue;
      blocks.push({
        pos: [size, y, z],
        rot: [0, Math.PI / 2, 0],
        scale: [blockLength - 0.05, 0.38, 0.4],
        color: getStoneColor(z + y + 4),
      });
    }
  }

  // 2. Corner Watchtowers
  const corners = [
    [-size, -size],
    [size, -size],
    [-size, size],
    [size, size]
  ];

  for (const [cx, cz] of corners) {
    for (let level = 0; level < 7; level++) {
      const y = 0.2 + level * 0.4;
      const isTop = level === 6;
      blocks.push({
        pos: [cx, y, cz],
        rot: [0, 0, 0],
        scale: [0.8, 0.38, 0.8],
        color: isTop ? '#475569' : getStoneColor(cx * cz + y),
      });
      if (isTop) {
        blocks.push({
          pos: [cx, y + 0.3, cz],
          rot: [0, 0, 0],
          scale: [0.6, 0.2, 0.6],
          color: '#e2e8f0',
        });
      }
    }
  }

  // 3. Gate Lintel and Door
  blocks.push({
    pos: [0, 1.0, size],
    rot: [0, 0, 0],
    scale: [1.3, 0.35, 0.6],
    color: '#1e293b',
  });
  blocks.push({
    pos: [-0.35, 0.4, size - 0.1],
    rot: [0, 0.6, 0],
    scale: [0.5, 0.8, 0.08],
    color: '#78350f',
  });
  blocks.push({
    pos: [0.35, 0.4, size - 0.1],
    rot: [0, -0.6, 0],
    scale: [0.5, 0.8, 0.08],
    color: '#78350f',
  });

  return blocks;
}

function ProgressiveStructure({ progress, teamId }: { progress: number, teamId: string }) {
  const isShipping = teamId === 'shipping' || teamId === 'Noo7_&Shorakah' || teamId.toLowerCase().includes('noo7') || teamId.toLowerCase().includes('shipping');
  
  const blocks = isShipping ? generateArkPoints() : generateWallPoints();
  const totalBlocks = blocks.length;
  const visibleBlocksCount = Math.floor((progress / 100) * totalBlocks);
  const groupRef = useRef<THREE.Group>(null);

  return (
    <group ref={groupRef} position={[0, -1, 0]}>
      {/* Base Foundation */}
      <mesh position={[0, 0.1, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[4.2, 4.2, 0.2, 32]} />
        <meshStandardMaterial color={isShipping ? "#4b5563" : "#334155"} opacity={0.8} transparent />
      </mesh>

      {/* Render construction piece by piece */}
      {blocks.map((block, i) => {
        const isVisible = i < visibleBlocksCount;
        return (
          <mesh
            key={i}
            position={block.pos}
            rotation={block.rot}
            visible={isVisible}
            castShadow
            receiveShadow
          >
            <boxGeometry args={block.scale} />
            <meshStandardMaterial
              color={block.color}
              roughness={isShipping ? 0.3 : 0.6}
              metalness={isShipping ? 0.2 : 0.1}
            />
          </mesh>
        );
      })}

      {progress >= 100 && (
         <Float speed={2} rotationIntensity={0.5} floatIntensity={1}>
           <mesh position={[0, isShipping ? 2.8 : 3.5, 0]}>
             <sphereGeometry args={[0.5, 32, 32]} />
             <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={2} />
           </mesh>
         </Float>
      )}
    </group>
  );
}

function EndlessSandbox3D({ score, teamColor, targetScore }: { score: number, teamColor: string, targetScore: number }) {
  const assets = generateSandboxAssets(score, targetScore);
  return (
    <group position={[0, -0.1, 0]}>
      {assets.map((asset) => (
        <EndlessAssetMesh key={asset.id} asset={asset} teamColor={teamColor} />
      ))}
    </group>
  );
}

function EndlessAssetMesh({ asset, teamColor }: { asset: SandboxAsset; teamColor: string }) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (meshRef.current) {
      if (asset.metadata?.spinSpeed) {
        if (asset.id.includes('blades')) {
          meshRef.current.rotation.z = state.clock.getElapsedTime() * asset.metadata.spinSpeed;
        } else {
          meshRef.current.rotation.y = state.clock.getElapsedTime() * asset.metadata.spinSpeed;
        }
      }
      if (asset.metadata?.floatSpeed) {
        meshRef.current.position.y = asset.pos[1] + Math.sin(state.clock.getElapsedTime() * asset.metadata.floatSpeed) * 0.08;
      }
    }
  });

  // Determine geometry parameters based on asset metadata
  let geometry: React.ReactNode = <boxGeometry args={asset.scale} />;
  const rotation: [number, number, number] = asset.rotation || [0, 0, 0];
  
  if (asset.id.includes('halo')) {
    geometry = <torusGeometry args={[asset.scale[0] * 0.45, 0.04, 8, 24]} />;
  } else if (asset.id.includes('fountain_spire') || asset.id.includes('spire')) {
    geometry = <cylinderGeometry args={[0, asset.scale[0]/2, asset.scale[1], 16]} />;
  } else if (asset.id.includes('pylon')) {
    geometry = <cylinderGeometry args={[0.02, asset.scale[0]/2, asset.scale[1], 8]} />;
  } else if (asset.id.includes('beacon')) {
    geometry = <octahedronGeometry args={[asset.scale[0], 0]} />;
  } else if (asset.type === 'tree') {
    if (asset.id.includes('foliage')) {
      geometry = <sphereGeometry args={[asset.scale[0]/2, 16, 16]} />;
    } else {
      geometry = <cylinderGeometry args={[asset.scale[0]/2, asset.scale[0]/2, asset.scale[1], 8]} />;
    }
  } else if (asset.type === 'building' && asset.id.includes('roof')) {
    geometry = <coneGeometry args={[asset.scale[0] * 0.68, asset.scale[1], 4]} />;
  }

  // Roof tilt
  const finalRot: [number, number, number] = asset.id.includes('roof') ? [0, Math.PI / 4, 0] : rotation;

  return (
    <mesh
      ref={meshRef}
      position={asset.pos}
      rotation={finalRot}
      castShadow
      receiveShadow
    >
      {geometry}
      <meshStandardMaterial
        color={asset.color}
        roughness={asset.type === 'terrain' ? 0.95 : (asset.type === 'water' ? 0.05 : 0.6)}
        metalness={asset.type === 'energy' ? 0.8 : (asset.type === 'water' ? 0.95 : 0.1)}
        emissive={asset.metadata?.emissive || undefined}
        emissiveIntensity={asset.metadata?.intensity || undefined}
        transparent={asset.type === 'water'}
        opacity={asset.type === 'water' ? 0.85 : 1.0}
      />
    </mesh>
  );
}

interface ThreeDViewPageProps {
  teamId: string;
  onBack: () => void;
}

const rubblePieces = [
  { pos: [-1.5, -0.92, 1.2] as [number, number, number], scale: [0.35, 0.1, 0.45] as [number, number, number], rot: [0.1, 0.5, 0.2] as [number, number, number], color: '#2a1a15' },
  { pos: [2.2, -0.95, -1.5] as [number, number, number], scale: [0.45, 0.15, 0.3] as [number, number, number], rot: [0.3, -0.2, 0.1] as [number, number, number], color: '#221612' },
  { pos: [-2.5, -0.94, -2.2] as [number, number, number], scale: [0.5, 0.08, 0.4] as [number, number, number], rot: [-0.2, 0.8, -0.1] as [number, number, number], color: '#1a100d' },
  { pos: [0.8, -0.96, 2.5] as [number, number, number], scale: [0.38, 0.12, 0.38] as [number, number, number], rot: [0.5, 0.1, -0.4] as [number, number, number], color: '#261915' },
  { pos: [-0.4, -0.95, -1.8] as [number, number, number], scale: [0.3, 0.18, 0.32] as [number, number, number], rot: [0.2, 0.4, 0.5] as [number, number, number], color: '#1c110e' },
];

export function ThreeDViewPage({ teamId, onBack }: ThreeDViewPageProps) {
  const games = useStore((state) => state.games);
  const eventTargetScore = useStore((state) => state.eventTargetScore);
  const team = useStore((state) => state.teams[teamId]);
  const parentTeam = team?.parentId ? useStore((state) => state.teams[team.parentId!]) : null;
  const days = useStore((state) => state.days);
  const allTeams = useStore((state) => state.teams);
  const children = Object.values(allTeams)
    .filter((t: any) => t.parentId === team?.id)
    .sort((a: any, b: any) => a.id.localeCompare(b.id, undefined, { numeric: true, sensitivity: 'base' }));
  const isParent = children.length > 0;

  // Helper function to resolve dynamic score values (sums children if parent + parent's direct score)
  const getScoreValueForTeam = (scoreId: string) => {
    if (isParent) {
      const parentScore = team?.scores?.[scoreId] || 0;
      const childrenScore = children.reduce((sum, child) => sum + (child.scores?.[scoreId] || 0), 0);
      return childrenScore + parentScore;
    }
    return team?.scores?.[scoreId] || 0;
  };

  // Helper function to resolve dynamic max points (scales by children if parent, unless it is an activity)
  const getMaxPointsForTeam = (baseMax: number, isActivity?: boolean) => {
    if (isParent && !isActivity) {
      return baseMax * children.length;
    }
    return baseMax;
  };
  
  // Use parent progress so all sub-groups contribute to the combined structure!
  const progress = parentTeam
    ? calculateTeamProgress(parentTeam, games, eventTargetScore)
    : calculateTeamProgress(team, games, eventTargetScore);

  const currentScore = calculateTeamScore(team, games);
  const parentCompanyScore = parentTeam ? calculateTeamScore(parentTeam, games) : currentScore;
  
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const [isMounting, setIsMounting] = useState(true);
  const [activeTab, setActiveTab ] = useState<'3d' | 'scores'>('3d');
  const [selectedBreakdownTeamId, setSelectedBreakdownTeamId] = useState<string | null>(null);
  const [activeScoreDayId, setActiveScoreDayId] = useState<string>('default-day');
  const [expandedScoresGames, setExpandedScoresGames] = useState<Record<string, boolean>>({});
  const [dismissedVictory, setDismissedVictory] = useState(false);

  const controlsRef = useRef<any>(null);

  const handleZoomIn = () => {
    if (controlsRef.current) {
      const controls = controlsRef.current;
      controls.object.position.multiplyScalar(0.85);
      controls.update();
    }
  };

  const handleZoomOut = () => {
    if (controlsRef.current) {
      const controls = controlsRef.current;
      controls.object.position.multiplyScalar(1.15);
      controls.update();
    }
  };
  const [activities, setActivities] = useState<Record<string, { name: string; icon: string; maxPoints: number; isDaily: boolean }>>(() => {
    const saved = localStorage.getItem('scoring_activities_config');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return {
      attendance: { name: 'Attendance', icon: '👥', maxPoints: 10, isDaily: true },
      tashge3: { name: 'Tashge3 (Cheering)', icon: '📣', maxPoints: 15, isDaily: true },
      teamwork: { name: 'Teamwork', icon: '🤝', maxPoints: 15, isDaily: true },
      creativity: { name: 'Creativity', icon: '🎨', maxPoints: 20, isDaily: false },
      she3ar: { name: 'She3ar (Slogan)', icon: '📣', maxPoints: 10, isDaily: false },
      la7n: { name: 'La7n Memorization', icon: '⛪', maxPoints: 30, isDaily: false }
    };
  });
  const [expandedActivities, setExpandedActivities] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const loadDbActivities = async () => {
      try {
        const { data, error } = await supabase.from('activities').select('*');
        if (!error && data && data.length > 0) {
          const loaded: Record<string, { name: string; icon: string; maxPoints: number; isDaily: boolean }> = {};
          data.forEach((act) => {
            loaded[act.id] = {
              name: act.name,
              icon: act.icon || '🏆',
              maxPoints: act.max_points || 10,
              isDaily: act.is_daily ?? true,
            };
          });
          setActivities(loaded);
          localStorage.setItem('scoring_activities_config', JSON.stringify(loaded));
        }
      } catch (e) {
        console.warn('Failed to load activities in ThreeDViewPage:', e);
      }
    };
    loadDbActivities();
  }, []);

  useEffect(() => {
    if (days && !days[activeScoreDayId]) {
      const firstId = Object.keys(days)[0];
      if (firstId) {
        setActiveScoreDayId(firstId);
      }
    }
  }, [days, activeScoreDayId]);
  
  useEffect(() => {
    const t = setTimeout(() => setIsMounting(false), 50);
    return () => clearTimeout(t);
  }, []);

  if (!team) return null;

  const activeBadgeTeam = parentTeam || team;
  const unlockedMilestones = MILESTONES.filter(m => activeBadgeTeam?.scores?.[`badge_${m.percent}`] === 1);

  const hasWonBuild = (
    unlockedMilestones.length === MILESTONES.length || 
    activeBadgeTeam?.scores?.badge_100 === 1 || 
    progress >= 100 || 
    currentScore >= eventTargetScore
  );

  // Dynamic framing zoom parameters based on score size & mobile adaptation
  const numCells = Math.max(1, Math.ceil(currentScore / 20));
  const dynamicDist = isMobile 
    ? 3.8 + Math.min(4.5, numCells * 0.45) 
    : 6.0 + Math.min(6.5, numCells * 0.65);
  const cameraPos: [number, number, number] = [dynamicDist, dynamicDist * 0.8, dynamicDist];

  return (
    <div className={`fixed inset-0 w-full h-full ${activeTab === 'scores' ? 'bg-[#f8fafc]' : 'bg-slate-900'} flex flex-col select-none ${activeTab === '3d' ? 'pt-0' : 'pt-[max(env(safe-area-inset-top),_1rem)]'} transition-colors duration-200`}>
      {/* Top Bar Navigation */}
      <div className="absolute top-0 left-0 right-0 z-20 flex flex-col">
        <div className={`h-[80px] w-full flex items-center justify-between px-6 sm:px-[40px] transition-colors duration-200 ${
          activeTab === 'scores'
            ? 'bg-white/95 backdrop-blur-[8px] border-b border-slate-200 shadow-sm'
            : 'bg-[#0F172A]/95 backdrop-blur-[8px] border-b border-white/10 shadow-lg'
        }`}>
          <div className="flex items-center gap-4">
            <button 
              onClick={onBack}
              className={`px-4 sm:px-6 py-2.5 rounded-[12px] font-semibold text-xs sm:text-[0.875rem] transition shadow-sm cursor-pointer border ${
                activeTab === 'scores'
                  ? 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  : 'bg-white text-black border-transparent hover:bg-gray-100'
              }`}
            >
              ← Back
            </button>
            
            <div className={`px-4 sm:px-6 py-2.5 rounded-[12px] font-semibold flex items-center transition shadow-xs ${
              activeTab === 'scores'
                ? 'bg-slate-100 text-slate-800 border border-slate-200/40'
                : 'bg-[#2D3748] text-white shadow-inner'
            }`}>
              <span className="font-sansArabic text-xs sm:text-base">{team.nameAr}</span>
            </div>
          </div>
          
          {/* Custom Selection Tab Menu */}
          <div className={`flex p-1 rounded-xl shadow-inner overflow-x-auto select-none transition border ${
            activeTab === 'scores'
              ? 'bg-slate-100 border-slate-200/60'
              : 'bg-slate-950/80 border-white/5'
          }`}>
            <button
              onClick={() => setActiveTab('3d')}
              className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-[10px] sm:text-xs font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-1 sm:gap-1.5 ${
                activeTab === '3d' 
                  ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20' 
                  : activeTab === 'scores'
                    ? 'text-slate-500 hover:text-slate-900'
                    : 'text-white/60 hover:text-white'
              }`}
            >
              <span>🏗️</span> <span>3D Sandbox</span>
            </button>
            <button
              onClick={() => setActiveTab('scores')}
              className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-[10px] sm:text-xs font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-1 sm:gap-1.5 ${
                activeTab === 'scores' 
                  ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20' 
                  : 'text-white/60 hover:text-white'
              }`}
            >
              <span>📊</span> <span>Scores & Badges</span>
            </button>
          </div>

          <div className={`text-[0.875rem] hidden xl:block transition-colors ${
            activeTab === 'scores' ? 'text-slate-500 font-medium' : 'text-white/50'
          }`}>
            Portal Hub • Live Feed Active
          </div>
        </div>
        
        {/* Helper Banner for 3D View */}
        {activeTab === '3d' && (
          <div className="w-full h-[32px] bg-[#0F172A]/70 text-white flex items-center justify-center text-[0.70rem] sm:text-[0.75rem] tracking-[0.05em] uppercase shadow-md">
             Drag with mouse or finger to rotate & explore
          </div>
        )}
      </div>

      {/* View switching logic */}
      <div className={`flex-1 w-full ${activeTab === '3d' ? 'absolute inset-0 pt-[112px] overflow-hidden' : 'relative h-full overflow-y-auto pt-[80px]'}`}>
        {activeTab === '3d' && (
          /* 3D MAP VIEW SCREEN */
          <div className="w-full h-full relative cursor-move">
            {/* Simple Floating progress overlay in bottom center */}
            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10 w-[80%] max-w-sm pointer-events-none mb-[env(safe-area-inset-bottom)]">
               <div className={`backdrop-blur-md p-4 rounded-3xl border shadow-2xl transition-all duration-300 ${
                 hasWonBuild
                   ? "bg-slate-950/75 border-amber-400 shadow-[0_4px_30px_rgba(251,191,36,0.3)]"
                   : "bg-black/55 border-white/10"
               }`}>
                  <div className="flex justify-between text-white/95 text-xs font-bold mb-2 tracking-widest uppercase">
                     <span>SandBox Build Progress</span>
                     <span>{currentScore} PTS</span>
                  </div>
                  <div className="h-1.5 w-full bg-white/20 rounded-full overflow-hidden">
                     <div 
                       className="h-full rounded-full transition-all duration-1000 ease-out"
                       style={{ width: `${Math.min(100, Math.max(0, progress))}%`, backgroundColor: team.color }}
                     />
                  </div>
                  {parentTeam ? (
                    <div className="flex flex-col items-center gap-1 mt-2 font-mono text-[10px] text-white/50">
                       <div className="flex justify-between w-full">
                         <span>Your Team's Score:</span>
                         <span className="text-amber-400 font-bold">{currentScore} PTS</span>
                       </div>
                       <div className="flex justify-between w-full text-white/40">
                         <span>Combined Company Score:</span>
                         <span className="text-white font-bold">{parentCompanyScore} PTS</span>
                       </div>
                    </div>
                  ) : (
                    <div className="flex justify-center text-[10px] text-white/40 mt-1.5 font-mono">
                       <span>Score: <b className="text-white font-bold">{currentScore}</b> PTS</span>
                     </div>
                  )}
               </div>
            </div>



            {/* Floating Zoom controls on bottom right */}
            {activeTab === '3d' && (
              <div className="absolute bottom-12 right-6 sm:right-[40px] z-10 flex flex-col gap-2.5">
                <button 
                  onClick={handleZoomIn}
                  className="w-12 h-12 rounded-full bg-slate-900/85 hover:bg-slate-950 text-white border border-white/20 flex items-center justify-center font-bold text-xl shadow-xl transition-all active:scale-95 cursor-pointer select-none"
                  title="Zoom In"
                >
                  ＋
                </button>
                <button 
                  onClick={handleZoomOut}
                  className="w-12 h-12 rounded-full bg-slate-900/85 hover:bg-slate-950 text-white border border-white/20 flex items-center justify-center font-bold text-xl shadow-xl transition-all active:scale-95 cursor-pointer select-none"
                  title="Zoom Out"
                >
                  －
                </button>
              </div>
            )}

            {!isMounting && (
               <Canvas shadows={{ type: THREE.PCFShadowMap }} camera={{ position: cameraPos, fov: 45 }}>
                 <CameraRig position={cameraPos} />
                 <color attach="background" args={['#0f172a']} />
                 <fog attach="fog" args={['#0f172a', 15, 38]} />
                 
                 <Environment preset="city" />
                 <ambientLight intensity={0.5} />
                 <directionalLight 
                   position={[15, 15, 8]} 
                   intensity={1.5} 
                   castShadow 
                   shadow-mapSize={[2048, 2048]} 
                 />
                 
                 <Suspense fallback={null}>
                   <EndlessSandbox3D score={currentScore} teamColor={team.color} targetScore={eventTargetScore} />
                 </Suspense>

                 {/* Floor Island - desolate barren landscape if score is 0, premium build paving if score is active */}
                 <mesh receiveShadow position={[0, -1.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                   <circleGeometry args={[22, 64]} />
                   <meshStandardMaterial 
                     color={currentScore === 0 ? "#1c1412" : "#1e293b"} 
                     roughness={currentScore === 0 ? 1.0 : 0.8} 
                   />
                 </mesh>
                 
                 <gridHelper args={[44, 44, currentScore === 0 ? '#452b22' : '#334155', currentScore === 0 ? '#1f130f' : '#1e293b']} position={[0, -1, 0]} />

                 <ContactShadows position={[0, -1, 0]} opacity={0.6} scale={24} blur={2.5} far={12} />
                 
                 <OrbitControls 
                   ref={controlsRef}
                   enablePan={false} 
                   minPolarAngle={Math.PI / 6} 
                   maxPolarAngle={Math.PI / 2 - 0.05} 
                   minDistance={isMobile ? 3.0 : 4.5}
                   maxDistance={dynamicDist * 2.5}
                   dampingFactor={0.05}
                   makeDefault
                 />
               </Canvas>
            )}
          </div>
        )}
        {activeTab === 'scores' && (
          /* COMPLETELY STANDALONE DETAILED SCORES & BADGES HUB */
          <div className="max-w-6xl mx-auto px-6 py-8 text-slate-800">
            {selectedBreakdownTeamId ? (
              (() => {
                const breakdownTeam = allTeams[selectedBreakdownTeamId];
                if (!breakdownTeam) return null;

                // Games Total
                let gamesTotal = 0;
                const activeGamesOnly = games.filter(g => g.isTeamScoring !== false);
                activeGamesOnly.forEach(g => {
                  if (g.subGames && g.subGames.length > 0) {
                    g.subGames.forEach(sg => {
                      gamesTotal += (breakdownTeam.scores?.[sg.id] || 0);
                    });
                  } else {
                    gamesTotal += (breakdownTeam.scores?.[g.id] || 0);
                  }
                });

                // Activities Total
                let actTotal = 0;
                Object.entries(activities).forEach(([key, act]) => {
                  if (act.isDaily) {
                    Object.values(days).forEach(day => {
                      actTotal += (breakdownTeam.scores?.[`activity_${key}_${day.id}`] || 0);
                    });
                  } else {
                    actTotal += (breakdownTeam.scores?.[`activity_${key}_onetime`] || 0);
                  }
                });

                const cumulativeTotal = gamesTotal + actTotal;

                return (
                  <div className="animate-in fade-in duration-305">
                    <button 
                      onClick={() => setSelectedBreakdownTeamId(null)}
                      className="mb-6 inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white border border-white/10 px-5 py-2.5 rounded-xl text-xs sm:text-[0.875rem] font-bold transition cursor-pointer shadow-md"
                    >
                      ← Back to Sub-teams
                    </button>

                    <div className="mb-8 bg-slate-950/40 border border-white/5 rounded-[2rem] p-6 sm:p-8 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
                      <div className="space-y-1 text-center md:text-left">
                        <div className="inline-flex items-center gap-2 bg-indigo-500/15 text-indigo-400 px-3 py-1 rounded-full text-xs font-bold font-sansArabic">
                          {breakdownTeam.emojis} {breakdownTeam.nameAr}
                        </div>
                        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-sansArabic">{breakdownTeam.nameAr} Detailed Breakdown</h2>
                        <p className="text-sm text-slate-405">Comprehensive score breakdown of games and other activities.</p>
                      </div>

                      <div className="bg-gradient-to-br from-indigo-950/70 to-slate-900 border border-indigo-500/20 px-6 py-4 rounded-2xl w-full md:max-w-xs shadow-lg text-center md:text-left">
                        <div className="text-xs text-indigo-300 border-b border-indigo-500/10 pb-2 mb-2 font-black uppercase tracking-wider">
                          Cumulative Total Points
                        </div>
                        <div className="text-3xl font-black text-amber-400 font-mono flex items-center justify-center md:justify-start gap-2">
                          🏆 <span>{cumulativeTotal} PTS</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                      <div className="bg-slate-950/50 border border-white/5 p-5 rounded-2xl flex flex-col justify-between">
                        <div className="text-indigo-400 text-xs uppercase tracking-wider font-bold mb-1 font-sans font-mono animate-pulse">🎮 Game Tournaments</div>
                        <div className="text-2xl font-black font-mono text-white mt-1">{gamesTotal} PTS</div>
                        <p className="text-[11px] text-slate-400 mt-2">Aggregated points from all daily sports & console tournaments.</p>
                      </div>

                      <div className="bg-slate-950/50 border border-white/5 p-5 rounded-2xl flex flex-col justify-between">
                        <div className="text-teal-400 text-xs uppercase tracking-wider font-bold mb-1 font-sans font-mono">👥 Attendance/Daily</div>
                        <div className="text-2xl font-black font-mono text-white mt-1">
                          {(() => {
                            let dailyActTotal = 0;
                            Object.entries(activities).forEach(([key, act]) => {
                              if (act.isDaily) {
                                Object.values(days).forEach(day => {
                                  dailyActTotal += (breakdownTeam.scores?.[`activity_${key}_${day.id}`] || 0);
                                });
                              }
                            });
                            return dailyActTotal;
                          })()} PTS
                        </div>
                        <p className="text-[11px] text-slate-400 mt-2">Combined daily presence & spiritual shouting/cheering bonuses.</p>
                      </div>

                      <div className="bg-slate-950/50 border border-white/5 p-5 rounded-2xl flex flex-col justify-between">
                        <div className="text-amber-400 text-xs uppercase tracking-wider font-bold mb-1 font-sans font-mono">🎨 Special Activities</div>
                        <div className="text-2xl font-black font-mono text-white mt-1">
                          {(() => {
                            let specialActTotal = 0;
                            Object.entries(activities).forEach(([key, act]) => {
                              if (!act.isDaily) {
                                specialActTotal += (breakdownTeam.scores?.[`activity_${key}_onetime`] || 0);
                              }
                            });
                            return specialActTotal;
                          })()} PTS
                        </div>
                        <p className="text-[11px] text-slate-400 mt-2">Creativity, Christian slogan, and tune memorization contests.</p>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="text-lg font-black tracking-tight border-b border-white/5 pb-2">📅 Day-by-Day Scores Ledger</div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {Object.values(days).map((day) => {
                          const dayGames = games.filter(g => g.dayId === day.id && g.isTeamScoring !== false);
                          
                          let dayGamesPts = 0;
                          dayGames.forEach(g => {
                            if (g.subGames && g.subGames.length > 0) {
                              g.subGames.forEach(sg => {
                                dayGamesPts += (breakdownTeam.scores?.[sg.id] || 0);
                              });
                            } else {
                              dayGamesPts += (breakdownTeam.scores?.[g.id] || 0);
                            }
                          });

                          let dayActPts = 0;
                          Object.entries(activities).forEach(([key, act]) => {
                            if (act.isDaily) {
                              dayActPts += (breakdownTeam.scores?.[`activity_${key}_${day.id}`] || 0);
                            }
                          });

                          const dayTotal = dayGamesPts + dayActPts;

                          return (
                            <div key={day.id} className="bg-slate-900/60 border border-white/10 rounded-2xl p-5 hover:border-white/20 transition duration-150 flex flex-col justify-between">
                              <div>
                                <div className="flex justify-between items-center border-b border-white/5 pb-2 mb-3">
                                  <span className="text-sm font-black text-white/95">{day.name} Ledger</span>
                                  <span className="bg-amber-400/10 text-amber-400 font-extrabold text-[11px] px-2.5 py-1 rounded-full font-mono">
                                    Day Total: {dayTotal} PTS
                                  </span>
                                </div>

                                <div className="mb-4 space-y-2">
                                  <div className="text-[10px] text-indigo-400 uppercase font-black tracking-wider font-mono">🎮 Games Breakdown</div>
                                  {dayGames.length === 0 ? (
                                    <div className="text-[11px] text-slate-500 italic font-mono">No games scheduled.</div>
                                  ) : (
                                    <div className="space-y-1.5 pl-1 font-mono">
                                      {dayGames.map(dg => {
                                        let dgPts = 0;
                                        if (dg.subGames && dg.subGames.length > 0) {
                                          dg.subGames.forEach(sg => {
                                            dgPts += (breakdownTeam.scores?.[sg.id] || 0);
                                          });
                                        } else {
                                          dgPts = (breakdownTeam.scores?.[dg.id] || 0);
                                        }

                                        return (
                                          <div key={dg.id} className="flex justify-between items-center text-xs text-slate-300">
                                            <span>⚽ {dg.name}</span>
                                            <span className="font-mono font-bold text-white">{dgPts} pts</span>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>

                                <div className="space-y-2">
                                  <div className="text-[10px] text-teal-400 uppercase font-black tracking-wider font-mono">📣 Daily Activities</div>
                                  <div className="space-y-1.5 pl-1 font-mono">
                                    {Object.entries(activities).filter(([_, act]) => act.isDaily).map(([key, act]) => {
                                      const actScore = (breakdownTeam.scores?.[`activity_${key}_${day.id}`] || 0);
                                      return (
                                        <div key={key} className="flex justify-between items-center text-xs text-slate-300">
                                          <span>{act.icon} {act.name}</span>
                                          <span className="font-mono font-bold text-white">{actScore} pts</span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-6">
                        <div className="border-b border-white/5 pb-2 mb-3 flex justify-between items-center">
                          <span className="text-base font-black text-white">🏆 Special & One-Time Activities</span>
                          <span className="bg-teal-400/15 text-teal-400 font-extrabold text-[11px] px-2.5 py-1 rounded-full font-mono font-sans font-mono animate-bounce">
                            One-time Total: {(() => {
                              let specialActTotal = 0;
                              Object.entries(activities).forEach(([key, act]) => {
                                if (!act.isDaily) {
                                  specialActTotal += (breakdownTeam.scores?.[`activity_${key}_onetime`] || 0);
                                }
                              });
                              return specialActTotal;
                            })()} PTS
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          {Object.entries(activities).filter(([_, act]) => !act.isDaily).map(([key, act]) => {
                            const actScore = (breakdownTeam.scores?.[`activity_${key}_onetime`] || 0);
                            return (
                              <div key={key} className="bg-slate-950/40 border border-white/5 rounded-xl p-4 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="text-xl">{act.icon}</span>
                                  <span className="text-xs font-extrabold text-slate-300">{act.name}</span>
                                </div>
                                <span className="font-mono font-black text-amber-300 text-sm">{actScore} pts</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                    </div>
                  </div>
                );
              })()
            ) : (
              <>
                {/* Header Area */}
                <div className="mb-8 bg-white border border-slate-200/80 rounded-[2rem] p-6 sm:p-8 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6 text-slate-800">
              <div className="space-y-2 text-center md:text-left">
                <div className="inline-flex items-center gap-2 bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-xs font-bold font-sansArabic">
                  {team.emojis} {team.nameAr}
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-800">Scores & Milestones Portal</h2>
                <p className="text-sm text-slate-500 font-medium">Detailed overview of challenges, points and unlock statuses.</p>
              </div>

              {/* Progress Panel */}
              <div className="bg-slate-50 border border-slate-200/60 px-6 py-5 rounded-2xl w-full md:max-w-xs shadow-xs">
                <div className="flex justify-between items-center text-xs text-slate-500 mb-2 font-bold uppercase tracking-wider">
                  <span>Accumulated Score</span>
                  <span className="text-indigo-600 font-mono text-sm">{currentScore} PTS</span>
                </div>
                <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden mb-3">
                  <div 
                    className="h-full rounded-full transition-all duration-1000"
                    style={{ width: `${Math.min(100, Math.max(0, progress))}%`, backgroundColor: team.color }}
                  />
                </div>
                {parentTeam ? (
                  <div className="flex flex-col gap-1 items-center text-[10px] text-slate-500 font-mono w-full">
                    <div className="flex justify-between w-full">
                      <span>Your Contribution:</span>
                      <span className="text-indigo-600 font-bold">{currentScore} PTS</span>
                    </div>
                    <div className="flex justify-between w-full">
                      <span>Company Aggregate:</span>
                      <span className="text-slate-800 font-bold">{parentCompanyScore} PTS</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-center items-center text-[11px] text-slate-500 font-mono">
                    <span>Score: <b className="text-slate-850 text-sm">{currentScore}</b> PTS</span>
                  </div>
                )}
              </div>
            </div>

            {/* Main Double Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start mb-16">
              
              {/* Left Column: Scores Breakdown (7 cols) */}
              <div className="lg:col-span-7 flex flex-col gap-6">
                
                {/* Standard Challenges & Games Card */}
                <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm flex flex-col gap-6 text-slate-800">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                    <div className="flex items-center gap-2">
                      <Award className="text-amber-500" size={20} />
                      <h3 className="text-lg font-black tracking-tight text-slate-800">Scores Breakdown</h3>
                    </div>
                    <span className="text-xs text-slate-450 font-bold">Select Day to view details</span>
                  </div>

                  {/* Day Selection Tabs */}
                  <div className="flex gap-2 pb-2 overflow-x-auto border-b border-slate-100">
                    {Object.values(days).map((d) => (
                      <button
                        key={d.id}
                        onClick={() => setActiveScoreDayId(d.id)}
                        className={`text-xs px-4 py-2 rounded-xl whitespace-nowrap cursor-pointer transition font-bold ${
                          activeScoreDayId === d.id 
                            ? 'bg-amber-400 text-slate-900 shadow-md' 
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                        }`}
                      >
                        {d.name}
                      </button>
                    ))}
                  </div>

                  {/* Challenges & Points List */}
                  {(() => {
                    const filtered = games.filter(g => g.dayId === activeScoreDayId && g.isTeamScoring !== false);
                    const directScore = getScoreValueForTeam(activeScoreDayId);

                    if (filtered.length === 0 && directScore === 0) {
                      return (
                        <div className="text-center text-slate-400 text-sm py-16">
                          No challenges or raw scores registered for this day yet.
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-3">
                        {/* Show General Day Raw Score if greater than 0 */}
                        {directScore > 0 && (
                          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-center justify-between gap-4 shadow-sm animate-in fade-in duration-200">
                            <div className="min-w-0 flex-1">
                              <div className="font-sansArabic font-black text-sm sm:text-base text-amber-800">🎯 General Day Performance / نقاط اليوم المباشرة</div>
                              <p className="text-xs text-slate-500 mt-1 font-sansArabic">النقاط العامة المباشرة المكتسبة للمجموعة بالكامل</p>
                            </div>
                            <span className="bg-amber-400 text-slate-950 font-black text-xs sm:text-[13px] px-5 py-2.5 rounded-full font-mono shadow-sm shrink-0 min-w-[85px] text-center tracking-wider">
                              {directScore} PTS
                            </span>
                          </div>
                        )}

                        {filtered.map((game) => {
                          const isScoreExpanded = !!expandedScoresGames[game.id];
                          const hasSub = game.subGames && game.subGames.length > 0;
                          
                          // Calculate score
                          let score = 0;
                          let maxVal = 0;
                          if (hasSub) {
                            game.subGames.forEach(s => {
                              score += getScoreValueForTeam(s.id);
                              maxVal += getMaxPointsForTeam(s.maxPoints);
                            });
                          } else {
                            score = getScoreValueForTeam(game.id);
                            maxVal = getMaxPointsForTeam(game.maxPoints);
                          }

                          const pPercent = maxVal > 0 ? (score / maxVal) * 100 : 0;

                          return (
                            <div key={game.id} className="bg-slate-50 border border-slate-200/60 rounded-2xl overflow-hidden shadow-xs hover:border-slate-300 transition-colors">
                              <button
                                onClick={() => setExpandedScoresGames(prev => ({ ...prev, [game.id]: !prev[game.id] }))}
                                className="w-full text-left p-4 hover:bg-slate-100 transition flex items-center justify-between gap-4"
                              >
                                <div className="min-w-0 flex-1">
                                  <div className="font-extrabold text-sm sm:text-base text-slate-800">{game.name}</div>
                                  <div className="text-xs text-indigo-600 font-bold mt-1 font-mono">{score} / {maxVal} PTS</div>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className="bg-slate-100 text-slate-850 font-black px-3 py-1 rounded-full text-[10px] font-mono leading-relaxed">
                                    {score} PTS
                                  </span>
                                  <div className="text-slate-400 text-xs">
                                    {isScoreExpanded ? '▲' : '▼'}
                                  </div>
                                </div>
                              </button>

                              {isScoreExpanded && (
                                <div className="p-4 bg-white border-t border-slate-100 space-y-4">
                                  <div className="space-y-1.5">
                                    <div className="flex justify-between text-[11px] font-bold text-slate-500">
                                      <span>Challenge Points Breakdown</span>
                                      <span>{score} / {maxVal} PTS</span>
                                    </div>
                                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                      <div 
                                        className="h-full rounded-full transition-all duration-500"
                                        style={{ width: `${pPercent}%`, backgroundColor: team.color }}
                                      />
                                    </div>
                                  </div>

                                  {hasSub && (
                                    <div className="space-y-3 pt-2 border-t border-slate-100">
                                      <div className="text-[11px] font-bold text-slate-450 tracking-wider uppercase">Games breakdown</div>
                                      <div className="space-y-2">
                                        {game.subGames.map(sg => {
                                          const sgVal = getScoreValueForTeam(sg.id);
                                          const sgMax = getMaxPointsForTeam(sg.maxPoints);
                                          return (
                                            <div key={sg.id} className="flex justify-between items-center bg-slate-50 p-3 rounded-xl text-xs border border-slate-100">
                                              <span className="text-slate-600 font-semibold">{sg.name}</span>
                                              <span className="font-mono text-indigo-600 font-extrabold">{sgVal} / {sgMax} pts</span>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>

                {/* Other Activities Detail Breakdown Card */}
                <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm flex flex-col gap-6 text-slate-800">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                    <div className="flex items-center gap-2">
                      <Activity className="text-emerald-500" size={20} />
                      <h3 className="text-lg font-black tracking-tight text-slate-800">Other Activities Details</h3>
                    </div>
                    <span className="text-xs text-slate-400 font-bold">Extra Activities Details</span>
                  </div>

                  {/* Overall stats banner for Other Activities */}
                  {(() => {
                    let totalEarned = 0;
                    let grandMax = 0;
                    
                    Object.entries(activities).forEach(([key, act]) => {
                      if (act.isDaily) {
                        Object.values(days).forEach(day => {
                          const scoreId = `activity_${key}_${day.id}`;
                          totalEarned += getScoreValueForTeam(scoreId);
                          grandMax += getMaxPointsForTeam(act.maxPoints, true);
                        });
                      } else {
                        const scoreId = `activity_${key}_onetime`;
                        totalEarned += getScoreValueForTeam(scoreId);
                        grandMax += getMaxPointsForTeam(act.maxPoints, true);
                      }
                    });

                    return (
                      <div className="bg-[#eefdf5] border border-emerald-200 p-4 rounded-2xl flex items-center justify-between">
                        <div>
                          <div className="text-xs text-emerald-700 uppercase tracking-widest font-black">Total Activities Score</div>
                          <div className="text-slate-500 text-[11px] mt-0.5">Sum of daily points, participation & teamwork</div>
                        </div>
                        <div className="text-right">
                          <span className="text-2xl font-black text-emerald-600 font-mono">{totalEarned}</span>
                          <span className="text-slate-400 text-xs ml-1">/ {grandMax} PTS</span>
                        </div>
                      </div>
                    );
                  })()}

                  {/* List of Other Activities */}
                  <div className="space-y-3">
                    {Object.entries(activities).map(([key, act]) => {
                      // Sum points for this specific activity
                      let actPoints = 0;
                      let actMax = 0;
                      if (act.isDaily) {
                        Object.values(days).forEach(day => {
                          actPoints += getScoreValueForTeam(`activity_${key}_${day.id}`);
                          actMax += getMaxPointsForTeam(act.maxPoints, true);
                        });
                      } else {
                        actPoints = getScoreValueForTeam(`activity_${key}_onetime`);
                        actMax = getMaxPointsForTeam(act.maxPoints, true);
                      }

                      const isExpanded = !!expandedActivities[key];
                      const percent = actMax > 0 ? Math.round((actPoints / actMax) * 100) : 0;

                      return (
                        <div key={key} className="bg-slate-50 border border-slate-200/60 rounded-2xl overflow-hidden shadow-xs hover:border-slate-300 transition-colors">
                          <button
                            onClick={() => setExpandedActivities(prev => ({ ...prev, [key]: !prev[key] }))}
                            className="w-full text-left p-4 hover:bg-slate-100 transition flex items-center justify-between gap-4 cursor-pointer"
                          >
                            <div className="min-w-0 flex-1 flex items-center gap-3">
                              <span className="text-2xl select-none shrink-0" role="img" aria-label={act.name}>
                                {act.icon}
                              </span>
                              <div className="min-w-0">
                                <div className="font-extrabold text-sm sm:text-base text-slate-800 flex items-center gap-2">
                                  <span>{act.name}</span>
                                  <span className={`text-[9px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider ${
                                    act.isDaily ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-100 text-amber-800'
                                  }`}>
                                    {act.isDaily ? 'Daily' : 'One-time'}
                                  </span>
                                </div>
                                <div className="text-xs text-emerald-700 font-bold mt-1 font-mono">
                                  {actPoints} / {actMax} PTS Earned
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-3">
                              <span className="bg-white border border-slate-200 text-slate-800 font-black px-3 py-1 rounded-full text-[10px] font-mono leading-relaxed shadow-sm">
                                {actPoints} PTS
                              </span>
                              <div className="text-slate-400">
                                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                              </div>
                            </div>
                          </button>

                          {isExpanded && (
                            <div className="p-4 bg-white border-t border-slate-100 space-y-3">
                              {/* Activity progress slider indicator */}
                              <div className="space-y-1 pb-2 border-b border-slate-100">
                                <div className="flex justify-between text-[11px] font-bold text-slate-500">
                                  <span>Activity Performance</span>
                                  <span>{actPoints} / {actMax} PTS</span>
                                </div>
                                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full rounded-full transition-all duration-500"
                                    style={{ width: `${percent}%`, backgroundColor: team.color || '#3b82f6' }}
                                  />
                                </div>
                              </div>

                              {/* Day by Day Log breakdown */}
                              <div className="space-y-2">
                                <div className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">Scoring Log</div>
                                {act.isDaily ? (
                                  Object.values(days).map(day => {
                                    const scoreId = `activity_${key}_${day.id}`;
                                    const dayScore = getScoreValueForTeam(scoreId);
                                    const dayMax = getMaxPointsForTeam(act.maxPoints, true);
                                    const hasPts = dayScore > 0;
                                    return (
                                      <div key={day.id} className={`flex justify-between items-center bg-slate-50 p-3 rounded-xl text-xs border ${
                                        hasPts ? 'border-emerald-200 bg-emerald-50' : 'border-slate-150'
                                      }`}>
                                        <div className="flex items-center gap-2">
                                          <Calendar size={13} className={hasPts ? 'text-emerald-600' : 'text-slate-400'} />
                                          <span className="font-bold text-slate-600">{day.name}</span>
                                        </div>
                                        <div className="font-mono flex items-center gap-1.5">
                                          <span className={`font-black ${hasPts ? 'text-emerald-700' : 'text-slate-500'}`}>
                                            {dayScore}
                                          </span>
                                          <span className="text-slate-400">/ {dayMax} pts</span>
                                        </div>
                                      </div>
                                    );
                                  })
                                ) : (
                                  <div className={`flex justify-between items-center bg-slate-50 p-3 rounded-xl text-xs border ${
                                    actPoints > 0 ? 'border-amber-200 bg-amber-50' : 'border-slate-150'
                                  }`}>
                                    <div className="flex items-center gap-2">
                                      <Trophy size={13} className={actPoints > 0 ? 'text-amber-500' : 'text-slate-400'} />
                                      <span className="font-bold text-slate-600">Entire Event Duration</span>
                                    </div>
                                    <div className="font-mono flex items-center gap-1.5">
                                      <span className={`font-black ${actPoints > 0 ? 'text-amber-700' : 'text-slate-500'}`}>
                                        {actPoints}
                                      </span>
                                      <span className="text-slate-400">/ {getMaxPointsForTeam(act.maxPoints, true)} pts</span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Right Column: Milestones Achievements (5 cols) */}
              <div className="lg:col-span-5 bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm flex flex-col gap-6 text-slate-800">
                <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-2">
                    <Trophy className="text-amber-500" size={20} />
                    <h3 className="text-lg font-black tracking-tight text-slate-800">Milestone Badges</h3>
                  </div>
                  <span className="bg-slate-100 text-slate-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                    {unlockedMilestones.length} / 4
                  </span>
                </div>

                {/* Milestone unlocked banner alert */}
                {unlockedMilestones.length > 0 && (
                  <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl text-emerald-800 text-xs font-semibold flex items-center gap-3">
                    <Sparkles size={18} className="shrink-0 animate-pulse text-emerald-500" />
                    <div>
                      <div className="font-bold text-sm">Amazing work!</div>
                      <div className="opacity-80">You've unlocked milestones in your construction journey!</div>
                    </div>
                  </div>
                )}

                {/* Milestone cards list */}
                <div className="space-y-3">
                  {MILESTONES.map((m) => {
                    const isUnlocked = activeBadgeTeam?.scores?.[`badge_${m.percent}`] === 1;
                    return (
                      <div 
                        key={m.percent}
                        className={`flex items-start gap-4 p-4 rounded-2xl border transition-all duration-300 ${
                          isUnlocked 
                            ? 'bg-slate-50 border-slate-200/60 shadow-xs' 
                            : 'bg-slate-100/30 border-slate-150 opacity-50'
                        }`}
                      >
                        {/* Emoji visual badge */}
                        <div 
                          className="flex items-center justify-center w-12 h-12 text-2xl rounded-2xl shrink-0"
                          style={{ 
                            backgroundColor: isUnlocked ? `${m.color}15` : 'rgba(0,0,0,0.03)',
                            border: isUnlocked ? `1px solid ${m.color}30` : '1px solid rgba(0,0,0,0.05)'
                          }}
                        >
                          {isUnlocked ? m.emoji : <Lock size={16} className="text-slate-400" />}
                        </div>

                        {/* Title and descriptions */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <h4 className={`text-sm font-extrabold truncate ${isUnlocked ? 'text-slate-800' : 'text-slate-400'}`}>
                              {m.title}
                            </h4>
                            <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-widest ${
                              isUnlocked 
                                ? 'bg-emerald-100 text-emerald-800' 
                                : 'bg-slate-100 text-slate-400'
                            }`}>
                              {isUnlocked ? 'Unlocked' : 'Locked'}
                            </span>
                          </div>
                          
                          <p className={`text-[10px] mt-1 font-bold ${isUnlocked ? 'text-indigo-600 font-mono' : 'text-slate-400'}`}>
                            Goal: {m.percent}% Progress
                          </p>

                          <p className={`text-[11px] mt-1.5 leading-relaxed ${isUnlocked ? 'text-slate-600' : 'text-slate-400'}`}>
                            {m.desc}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          </>
        )}
      </div>
    )}
      </div>

      {hasWonBuild && dismissedVictory && (
        <button
          onClick={() => setDismissedVictory(false)}
          className="fixed bottom-[110px] sm:bottom-12 left-6 sm:left-[40px] z-30 bg-amber-400 hover:bg-amber-500 text-slate-950 border border-amber-300 font-extrabold text-xs sm:text-sm px-5 py-3 rounded-2xl shadow-[0_4px_24px_rgba(251,191,36,0.35)] flex items-center gap-2 hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer animate-bounce font-sans"
        >
          <span>🏆</span>
          <span>Victory Note / تهنئة الفوز</span>
        </button>
      )}

      {/* Victory Celebration Overlay */}
      <AnimatePresence>
        {hasWonBuild && !dismissedVictory && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[9999] flex items-center justify-center p-4 overflow-y-auto"
          >
            {/* Sparkles / Emojis continuous burst background */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              {Array.from({ length: 15 }).map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute text-2xl sm:text-3xl pointer-events-none select-none"
                  initial={{ 
                    x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 500) - (typeof window !== 'undefined' ? window.innerWidth / 2 : 250), 
                    y: 400, 
                    opacity: 1, 
                    scale: 0 
                  }}
                  animate={{ 
                    x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 500) - (typeof window !== 'undefined' ? window.innerWidth / 2 : 250), 
                    y: -300, 
                    opacity: [1, 1, 0],
                    scale: [0, Math.random() * 1.5 + 0.8, 0],
                    rotate: Math.random() * 360
                  }}
                  transition={{ 
                    duration: Math.random() * 3 + 3, 
                    repeat: Infinity,
                    delay: Math.random() * 1.8
                  }}
                  style={{
                    left: '50%',
                    top: '50%'
                  }}
                >
                  {['🎉', '✨', '🏆', '👑', '⭐️', '🎊', '💫', '🥇', '🌟'][i % 9]}
                </motion.div>
               ))}
            </div>

            {/* Glowing Golden Victory Card */}
            <motion.div
              initial={{ scale: 0.9, y: 30, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: -30, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 180 }}
              className="bg-slate-900 border-2 border-amber-400/60 text-white max-w-xl w-full p-6 sm:p-8 rounded-[32px] shadow-[0_0_50px_rgba(251,191,36,0.25)] flex flex-col items-center text-center relative overflow-hidden"
            >
              {/* Card top flare */}
              <div className="absolute top-0 left-1/4 right-1/4 h-[3px] bg-gradient-to-r from-transparent via-amber-400 to-transparent" />
              
              {/* Dynamic floating main crown or trophy */}
              <motion.div 
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                className="w-20 h-20 bg-amber-400 text-slate-950 rounded-3xl flex items-center justify-center text-4xl shadow-[0_0_30px_rgba(251,191,36,0.4)] border-2 border-amber-300/50 mb-4"
              >
                👑
              </motion.div>

              {/* Celebration Headers */}
              <h2 className="text-2xl sm:text-3xl font-black text-amber-400 tracking-tight font-sans uppercase">
                Victory Complete!
              </h2>
              <h3 className="text-lg sm:text-xl font-extrabold text-white leading-tight font-sansArabic mt-1">
                تهانينا يا أبطال الكرنفال! 🎉
              </h3>
              
              {/* Context message */}
              <div className="space-y-3 my-5 max-w-md">
                <p className="text-slate-300 text-sm font-medium leading-relaxed">
                  Outstanding work! Your team <span className="text-amber-300 font-bold font-sansArabic">{team.nameAr}</span> has built and completed the entire 3D sandbox structure! You succeeded in constructing the carnival land before other competitors!
                </p>
                <div className="border-t border-white/10 my-2" />
                <p className="text-slate-200 text-sm font-extrabold leading-relaxed font-sansArabic">
                  عمل جبار! لقد تمكن فريقكم من تشييد وبناء هيكل الكرنفال بالكامل واعتلاء القمة والصدارة بنجاح باهر قبل الجميع! 🏆🏰
                </p>
              </div>

              {/* Achievements stats grid */}
              <div className="grid grid-cols-3 gap-3 w-full bg-slate-950/60 p-4 rounded-2xl border border-white/5 mb-6 text-center">
                <div className="flex flex-col items-center">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Score / النتيجة</span>
                  <span className="text-sm font-black text-amber-300 font-mono">{currentScore} PTS</span>
                </div>
                <div className="flex flex-col items-center border-x border-white/10">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Badges / الأوسمة</span>
                  <span className="text-sm font-black text-emerald-400">{unlockedMilestones.length} / 4</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">State / الحالة</span>
                  <span className="text-[10px] font-black bg-indigo-500/20 text-indigo-300 py-0.5 px-2 rounded-md uppercase">100% COMPLETE</span>
                </div>
              </div>

              {/* Dismiss CTA Button */}
              <div className="flex flex-col sm:flex-row gap-3 w-full justify-center">
                <button
                  onClick={() => setDismissedVictory(true)}
                  className="px-6 py-3 bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-sm rounded-2xl transition-all duration-150 transform hover:scale-102 flex items-center justify-center gap-1.5 cursor-pointer shadow-lg w-full font-sans"
                >
                  <span>🏰</span>
                  <span>Explore Masterpiece / تصفح الإنجاز</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
