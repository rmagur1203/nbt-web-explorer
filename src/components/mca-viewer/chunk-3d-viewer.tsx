"use client";

import { useRef, useEffect, useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { BlockData } from "@/lib/mca/parser";
import { blockTextures } from "@/lib/mca/textures";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

// Texture cache for Three.js
const textureLoader = new THREE.TextureLoader();
const threeTextureCache = new Map<string, THREE.Texture>();

// Animated textures that need special handling (first frame only)
const ANIMATED_TEXTURES: Record<string, number> = {
  "water_still.png": 32, // 32 frames
  "water_flow.png": 32,
  "lava_still.png": 20, // 20 frames
  "lava_flow.png": 32,
  "fire_0.png": 32,
  "fire_1.png": 32,
  "soul_fire_0.png": 32,
  "soul_fire_1.png": 32,
  "nether_portal.png": 32,
  "prismarine_dark.png": 4,
  "magma.png": 3,
  "sea_lantern.png": 5,
  "lantern.png": 4,
  // Underwater plants
  "kelp.png": 20, // 16x320 → 20 frames
  "kelp_plant.png": 20, // 16x320 → 20 frames
  "seagrass.png": 18, // 16x288 → 18 frames
  "tall_seagrass_top.png": 19, // 16x304 → 19 frames
  "tall_seagrass_bottom.png": 19, // 16x304 → 19 frames
};

function loadThreeTexture(filename: string): Promise<THREE.Texture> {
  const cached = threeTextureCache.get(filename);
  if (cached) return Promise.resolve(cached.clone());

  return new Promise((resolve) => {
    const frameCount = ANIMATED_TEXTURES[filename];
    
    if (frameCount && frameCount > 1) {
      // For animated textures, extract first frame using canvas
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const frameHeight = img.height / frameCount;
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = frameHeight;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          // Draw first frame (top of the image)
          ctx.drawImage(img, 0, 0, img.width, frameHeight, 0, 0, img.width, frameHeight);
        }
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.magFilter = THREE.NearestFilter;
        texture.minFilter = THREE.NearestFilter;
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.needsUpdate = true;
        
        threeTextureCache.set(filename, texture);
        resolve(texture.clone());
      };
      img.onerror = () => {
        const placeholder = new THREE.Texture();
        resolve(placeholder);
      };
      img.src = `/textures/${filename}`;
    } else {
      // For non-animated textures, load normally
      textureLoader.load(
        `/textures/${filename}`,
        (texture) => {
          texture.magFilter = THREE.NearestFilter;
          texture.minFilter = THREE.NearestFilter;
          texture.colorSpace = THREE.SRGBColorSpace;

          threeTextureCache.set(filename, texture);
          resolve(texture.clone());
        },
        undefined,
        () => {
          // On error, create a placeholder texture
          const placeholder = new THREE.Texture();
          resolve(placeholder);
        }
      );
    }
  });
}

function getBlockTextureDef(
  blockName: string
): { top: string; side: string; bottom: string } | null {
  const name = blockName.replace("minecraft:", "");
  const def = blockTextures[name];
  if (def) {
    return {
      top: def.top,
      side: def.side,
      bottom: def.bottom || def.top,
    };
  }
  return null;
}

// Create X-shaped (cross) geometry for plants
function createCrossGeometry(): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();

  // Two intersecting planes at 45 degrees
  // Plane 1: diagonal from (-0.5, 0, -0.5) to (0.5, 0, 0.5)
  // Plane 2: diagonal from (-0.5, 0, 0.5) to (0.5, 0, -0.5)

  const positions = new Float32Array([
    // Plane 1 (diagonal)
    -0.5, 0, -0.5, 0.5, 0, 0.5, 0.5, 1, 0.5, -0.5, 1, -0.5,

    // Plane 1 back face
    0.5, 0, 0.5, -0.5, 0, -0.5, -0.5, 1, -0.5, 0.5, 1, 0.5,

    // Plane 2 (other diagonal)
    -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 1, -0.5, -0.5, 1, 0.5,

    // Plane 2 back face
    0.5, 0, -0.5, -0.5, 0, 0.5, -0.5, 1, 0.5, 0.5, 1, -0.5,
  ]);

  const uvs = new Float32Array([
    // Plane 1
    0, 0, 1, 0, 1, 1, 0, 1,
    // Plane 1 back
    0, 0, 1, 0, 1, 1, 0, 1,
    // Plane 2
    0, 0, 1, 0, 1, 1, 0, 1,
    // Plane 2 back
    0, 0, 1, 0, 1, 1, 0, 1,
  ]);

  const indices = new Uint16Array([
    // Plane 1
    0, 1, 2, 0, 2, 3,
    // Plane 1 back
    4, 5, 6, 4, 6, 7,
    // Plane 2
    8, 9, 10, 8, 10, 11,
    // Plane 2 back
    12, 13, 14, 12, 14, 15,
  ]);

  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
  geometry.setIndex(new THREE.BufferAttribute(indices, 1));
  geometry.computeVertexNormals();

  return geometry;
}

// Blocks that need transparency
const TRANSPARENT_BLOCKS = new Set([
  "oak_leaves",
  "spruce_leaves",
  "birch_leaves",
  "jungle_leaves",
  "acacia_leaves",
  "dark_oak_leaves",
  "cherry_leaves",
  "mangrove_leaves",
  "azalea_leaves",
  "flowering_azalea_leaves",
  "glass",
  "glass_pane",
  "white_stained_glass",
  "orange_stained_glass",
  "magenta_stained_glass",
  "light_blue_stained_glass",
  "yellow_stained_glass",
  "lime_stained_glass",
  "pink_stained_glass",
  "gray_stained_glass",
  "light_gray_stained_glass",
  "cyan_stained_glass",
  "purple_stained_glass",
  "blue_stained_glass",
  "brown_stained_glass",
  "green_stained_glass",
  "red_stained_glass",
  "black_stained_glass",
  "ice",
  "frosted_ice",
  "water",
  "seagrass",
  "tall_seagrass",
  "kelp",
  "kelp_plant",
  "grass",
  "tall_grass",
  "fern",
  "large_fern",
  "vine",
  "glow_lichen",
  "hanging_roots",
  "spore_blossom",
  "cobweb",
  "torch",
  "wall_torch",
  "lantern",
  "soul_lantern",
  "chain",
  "iron_bars",
  "ladder",
  "scaffolding",
]);

function isTransparentBlock(blockName: string): boolean {
  const name = blockName.replace("minecraft:", "");
  return (
    TRANSPARENT_BLOCKS.has(name) ||
    name.includes("leaves") ||
    name.includes("glass")
  );
}

// Liquid blocks that should occlude same-type liquids
const LIQUID_BLOCKS = new Set([
  "water",
  "lava",
  "flowing_water",
  "flowing_lava",
]);

function isLiquidBlock(blockName: string): boolean {
  const name = blockName.replace("minecraft:", "");
  return LIQUID_BLOCKS.has(name) || name.includes("water") || name.includes("lava");
}

function getLiquidType(blockName: string): string | null {
  const name = blockName.replace("minecraft:", "");
  if (name.includes("water")) return "water";
  if (name.includes("lava")) return "lava";
  return null;
}

// Blocks that should not be rendered
const SKIP_BLOCKS = new Set([
  "air",
  "cave_air",
  "void_air",
  "structure_void",
  "light",
  "barrier",
  "bubble_column", // Invisible block in water
]);

function shouldSkipBlock(blockName: string): boolean {
  const name = blockName.replace("minecraft:", "");
  return SKIP_BLOCKS.has(name);
}

// Underwater plants that should be rendered with water
const UNDERWATER_PLANTS = new Set([
  "kelp",
  "kelp_plant",
  "seagrass",
  "tall_seagrass",
]);

function isUnderwaterPlant(blockName: string): boolean {
  const name = blockName.replace("minecraft:", "");
  return UNDERWATER_PLANTS.has(name);
}

// Blocks that use cross/X-shape model (plants, flowers, etc.)
const CROSS_MODEL_BLOCKS = new Set([
  // Grass and ferns
  "short_grass",
  "grass",
  "tall_grass",
  "fern",
  "large_fern",

  // Flowers
  "dandelion",
  "poppy",
  "blue_orchid",
  "allium",
  "azure_bluet",
  "red_tulip",
  "orange_tulip",
  "white_tulip",
  "pink_tulip",
  "oxeye_daisy",
  "cornflower",
  "lily_of_the_valley",
  "wither_rose",
  "torchflower",
  "pitcher_plant",

  // Tall flowers (lower and upper)
  "sunflower",
  "lilac",
  "rose_bush",
  "peony",

  // Saplings
  "oak_sapling",
  "spruce_sapling",
  "birch_sapling",
  "jungle_sapling",
  "acacia_sapling",
  "dark_oak_sapling",
  "cherry_sapling",
  "mangrove_propagule",

  // Other plants
  "dead_bush",
  "seagrass",
  "tall_seagrass",
  "kelp",
  "kelp_plant",
  "sweet_berry_bush",
  "cave_vines",
  "cave_vines_plant",
  "glow_lichen",
  "hanging_roots",
  "spore_blossom",
  "nether_sprouts",
  "warped_roots",
  "crimson_roots",
  "twisting_vines",
  "twisting_vines_plant",
  "weeping_vines",
  "weeping_vines_plant",

  // Mushrooms
  "red_mushroom",
  "brown_mushroom",
  "crimson_fungus",
  "warped_fungus",

  // Crops
  "wheat",
  "carrots",
  "potatoes",
  "beetroots",
  "melon_stem",
  "pumpkin_stem",
  "attached_melon_stem",
  "attached_pumpkin_stem",

  // Sugar cane
  "sugar_cane",

  // Bamboo
  "bamboo_sapling",

  // Dripstone (stalactites and stalagmites)
  "pointed_dripstone",
]);

function isCrossModelBlock(blockName: string): boolean {
  const name = blockName.replace("minecraft:", "");
  return CROSS_MODEL_BLOCKS.has(name);
}

// Blocks that need color tinting (grayscale textures that need biome colors)
// { top: [r,g,b] | null, side: [r,g,b] | null, all: [r,g,b] | null }
interface TintDefinition {
  top?: [number, number, number];
  side?: [number, number, number];
  all?: [number, number, number];
}

const TINTED_BLOCKS: Record<string, TintDefinition> = {
  // Grass blocks - only top is tinted
  grass_block: { top: [124, 189, 107] },

  // Grass plants (full tint)
  short_grass: { all: [124, 189, 107] },
  grass: { all: [124, 189, 107] },
  tall_grass: { all: [124, 189, 107] },
  fern: { all: [124, 189, 107] },
  large_fern: { all: [124, 189, 107] },

  // Leaves (full tint - all faces)
  oak_leaves: { all: [72, 181, 72] },
  jungle_leaves: { all: [72, 181, 72] },
  acacia_leaves: { all: [72, 181, 72] },
  dark_oak_leaves: { all: [72, 181, 72] },
  mangrove_leaves: { all: [72, 181, 72] },
  birch_leaves: { all: [128, 192, 96] }, // Birch has yellower leaves
  spruce_leaves: { all: [97, 153, 97] }, // Spruce has darker leaves
  azalea_leaves: { all: [90, 160, 70] },
  flowering_azalea_leaves: { all: [90, 160, 70] },

  // Water (full tint)
  water: { all: [63, 118, 228] },
  flowing_water: { all: [63, 118, 228] },

  // Vines and other plants
  vine: { all: [72, 181, 72] },
  cave_vines: { all: [72, 181, 72] },
  cave_vines_plant: { all: [72, 181, 72] },

  // Sugar cane
  sugar_cane: { all: [130, 190, 100] },

  // Lily pad
  lily_pad: { all: [72, 181, 72] },

  // Stems (pumpkin/melon)
  attached_pumpkin_stem: { all: [180, 180, 40] },
  attached_melon_stem: { all: [180, 180, 40] },
  pumpkin_stem: { all: [180, 180, 40] },
  melon_stem: { all: [180, 180, 40] },
  
  // Underwater plants
  seagrass: { all: [72, 150, 72] },
  tall_seagrass: { all: [72, 150, 72] },
  kelp: { all: [72, 130, 72] },
  kelp_plant: { all: [72, 130, 72] },
};

function getBlockTint(blockName: string): {
  top: THREE.Color | null;
  side: THREE.Color | null;
} {
  const name = blockName.replace("minecraft:", "");

  const tintDef = TINTED_BLOCKS[name];
  if (tintDef) {
    const topTint = tintDef.top || tintDef.all;
    const sideTint = tintDef.side || tintDef.all;

    return {
      top: topTint
        ? new THREE.Color(topTint[0] / 255, topTint[1] / 255, topTint[2] / 255)
        : null,
      side: sideTint
        ? new THREE.Color(
            sideTint[0] / 255,
            sideTint[1] / 255,
            sideTint[2] / 255
          )
        : null,
    };
  }

  // Check for partial matches
  if (name.includes("leaves")) {
    const color = new THREE.Color(72 / 255, 181 / 255, 72 / 255);
    return { top: color, side: color };
  }
  if (
    name.includes("grass") &&
    !name.includes("dead") &&
    !name.includes("block")
  ) {
    const color = new THREE.Color(124 / 255, 189 / 255, 107 / 255);
    return { top: color, side: color };
  }

  return { top: null, side: null };
}

// Block name to color mapping for modern Minecraft (1.13+)
const BLOCK_NAME_COLORS: Record<string, [number, number, number]> = {
  // Stone variants
  stone: [128, 128, 128],
  granite: [150, 100, 80],
  diorite: [180, 180, 180],
  andesite: [130, 130, 130],
  deepslate: [70, 70, 75],
  tuff: [100, 100, 90],

  // Dirt variants
  grass_block: [90, 150, 60],
  dirt: [134, 96, 67],
  coarse_dirt: [120, 85, 60],
  podzol: [110, 85, 50],
  rooted_dirt: [130, 95, 65],
  mud: [60, 55, 55],

  // Sand & Gravel
  sand: [220, 210, 160],
  red_sand: [190, 100, 50],
  gravel: [140, 130, 130],
  clay: [160, 165, 180],

  // Ores
  coal_ore: [60, 60, 60],
  deepslate_coal_ore: [50, 50, 55],
  iron_ore: [180, 150, 130],
  deepslate_iron_ore: [120, 100, 90],
  copper_ore: [130, 100, 80],
  gold_ore: [240, 220, 100],
  redstone_ore: [180, 50, 50],
  emerald_ore: [80, 200, 100],
  lapis_ore: [50, 80, 180],
  diamond_ore: [100, 220, 230],
  deepslate_diamond_ore: [80, 180, 190],

  // Water & Lava
  water: [50, 100, 200],
  lava: [220, 100, 30],

  // Wood
  oak_log: [100, 80, 50],
  spruce_log: [60, 40, 25],
  birch_log: [220, 215, 200],
  jungle_log: [85, 65, 35],
  acacia_log: [105, 95, 80],
  dark_oak_log: [50, 35, 20],
  mangrove_log: [80, 60, 50],
  cherry_log: [180, 130, 130],

  oak_planks: [160, 130, 80],
  spruce_planks: [115, 85, 50],
  birch_planks: [195, 175, 120],
  jungle_planks: [160, 115, 80],

  // Leaves
  oak_leaves: [60, 140, 50],
  spruce_leaves: [50, 90, 50],
  birch_leaves: [80, 140, 60],
  jungle_leaves: [50, 130, 45],
  azalea_leaves: [90, 130, 60],

  // Flowers & Plants
  grass: [100, 160, 70],
  tall_grass: [100, 160, 70],
  fern: [80, 140, 60],
  dandelion: [255, 220, 50],
  poppy: [220, 50, 50],

  // Building blocks
  cobblestone: [110, 110, 110],
  mossy_cobblestone: [100, 120, 100],
  stone_bricks: [120, 120, 120],
  bricks: [150, 90, 80],

  // Terracotta
  terracotta: [150, 90, 70],
  white_terracotta: [210, 180, 160],
  orange_terracotta: [160, 85, 40],
  red_terracotta: [140, 60, 55],
  brown_terracotta: [80, 55, 40],

  // Concrete
  white_concrete: [210, 215, 220],
  gray_concrete: [55, 60, 65],
  black_concrete: [10, 12, 15],

  // Special
  bedrock: [80, 80, 90],
  obsidian: [20, 15, 30],
  crying_obsidian: [40, 20, 60],
  glowstone: [255, 220, 100],
  netherrack: [100, 40, 40],
  soul_sand: [80, 65, 55],
  end_stone: [220, 220, 170],

  // Ice & Snow
  ice: [150, 200, 255],
  packed_ice: [130, 180, 230],
  blue_ice: [100, 160, 220],
  snow: [250, 255, 255],
  snow_block: [250, 255, 255],
  powder_snow: [248, 252, 255],

  // Air (transparent - will be filtered)
  air: [0, 0, 0],
  cave_air: [0, 0, 0],
  void_air: [0, 0, 0],
};

function getBlockColorByName(blockName?: string): [number, number, number] {
  if (!blockName) return [180, 180, 180]; // Default gray

  // Remove minecraft: prefix if present
  const name = blockName.replace("minecraft:", "");

  // Direct match
  if (BLOCK_NAME_COLORS[name]) {
    return BLOCK_NAME_COLORS[name];
  }

  // Partial matches
  if (name.includes("stone")) return [128, 128, 128];
  if (name.includes("deepslate")) return [70, 70, 75];
  if (name.includes("dirt") || name.includes("mud")) return [134, 96, 67];
  if (name.includes("grass")) return [90, 150, 60];
  if (name.includes("sand")) return [220, 210, 160];
  if (name.includes("gravel")) return [140, 130, 130];
  if (name.includes("ore")) return [150, 130, 120];
  if (name.includes("log") || name.includes("wood")) return [100, 80, 50];
  if (name.includes("planks")) return [160, 130, 80];
  if (name.includes("leaves")) return [60, 140, 50];
  if (name.includes("water")) return [50, 100, 200];
  if (name.includes("lava")) return [220, 100, 30];
  if (name.includes("ice") || name.includes("snow")) return [200, 230, 255];
  if (name.includes("terracotta")) return [150, 90, 70];
  if (name.includes("concrete")) return [130, 130, 130];
  if (name.includes("wool")) return [230, 230, 230];
  if (name.includes("glass")) return [200, 220, 240];
  if (name.includes("brick")) return [150, 90, 80];
  if (name.includes("copper")) return [180, 120, 80];
  if (name.includes("iron")) return [200, 200, 200];
  if (name.includes("gold")) return [240, 200, 80];
  if (name.includes("diamond")) return [100, 230, 240];
  if (name.includes("emerald")) return [80, 200, 100];
  if (name.includes("coal")) return [40, 40, 40];
  if (name.includes("nether")) return [100, 40, 40];
  if (name.includes("end")) return [220, 220, 170];
  if (name.includes("soul")) return [80, 65, 55];
  if (name.includes("basalt")) return [60, 60, 65];
  if (name.includes("blackstone")) return [35, 30, 35];
  if (name.includes("amethyst")) return [140, 80, 180];
  if (name.includes("dripstone")) return [140, 120, 100];
  if (name.includes("moss")) return [90, 130, 60];
  if (name.includes("azalea")) return [100, 140, 70];
  if (name.includes("sculk")) return [10, 30, 40];
  if (name.includes("mangrove")) return [100, 70, 60];
  if (name.includes("cherry")) return [230, 170, 180];

  // Default
  return [180, 180, 180];
}

interface Chunk3DViewerProps {
  blocks: BlockData[];
  className?: string;
  sliceY: number;
}

export function Chunk3DViewer({
  blocks,
  className,
  sliceY,
}: Chunk3DViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const meshGroupRef = useRef<THREE.Group | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const [surfaceOnly, setSurfaceOnly] = useState(true);
  const [useTextures, setUseTextures] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  // Filter blocks
  const processedBlocks = useMemo(() => {
    // First filter out air and other non-renderable blocks
    let filtered = blocks.filter((block) => {
      if (block.position[1] > sliceY) return false;
      if (!block.blockName) return false;
      if (shouldSkipBlock(block.blockName)) return false;
      return true;
    });

    // Add water blocks for underwater plants (kelp, seagrass, etc.)
    const waterBlocksToAdd: BlockData[] = [];
    
    filtered.forEach((block) => {
      if (isUnderwaterPlant(block.blockName || "")) {
        const [x, y, z] = block.position;
        // Add a virtual water block at the same position
        waterBlocksToAdd.push({
          position: [x, y, z],
          blockId: 0,
          blockData: 0,
          lighting: block.lighting,
          biome: block.biome,
          blockName: "minecraft:water",
        });
      }
    });
    
    // Add water blocks for underwater plants
    filtered = [...filtered, ...waterBlocksToAdd];

    if (surfaceOnly && filtered.length > 5000) {
      // Filter surface blocks
      // Occlusion rules:
      // - Cross model blocks (plants, flowers): don't participate in occlusion
      // - Opaque blocks: occlude everything
      // - Liquids: visible only when neighbor is empty (air/nothing) - water surface only
      // - Other transparent blocks (leaves, glass): don't occlude anything
      
      const solidOccupied = new Set<string>();
      const liquidTypeMap = new Map<string, string>(); // position -> liquid type
      const allOccupied = new Set<string>(); // All blocks for liquid surface detection
      
      filtered.forEach((block) => {
        const [x, y, z] = block.position;
        const posKey = `${x},${y},${z}`;
        const blockName = block.blockName || "";
        
        // Cross model blocks don't participate in surface calculation
        if (isCrossModelBlock(blockName)) {
          return;
        }
        
        // Track all non-cross blocks for liquid surface detection
        allOccupied.add(posKey);
        
        if (isLiquidBlock(blockName)) {
          // Track liquid type for same-type occlusion
          const liquidType = getLiquidType(blockName);
          if (liquidType) {
            liquidTypeMap.set(posKey, liquidType);
          }
        } else if (!isTransparentBlock(blockName)) {
          // Only opaque blocks go into solid set
          solidOccupied.add(posKey);
        }
      });

      filtered = filtered.filter((block) => {
        const [x, y, z] = block.position;
        const blockName = block.blockName || "";

        // Cross model blocks: always render (they don't participate in surface calc)
        if (isCrossModelBlock(blockName)) {
          return true;
        }

        const neighbors = [
          `${x + 1},${y},${z}`,
          `${x - 1},${y},${z}`,
          `${x},${y + 1},${z}`,
          `${x},${y - 1},${z}`,
          `${x},${y},${z + 1}`,
          `${x},${y},${z - 1}`,
        ];

        // Liquid blocks: visible only when neighbor is empty (air or nothing)
        // This shows only the water surface, not underwater faces
        if (isLiquidBlock(blockName)) {
          return neighbors.some((pos) => {
            // Visible only if neighbor position is completely empty (no block at all)
            return !allOccupied.has(pos);
          });
        }

        // Other transparent blocks (leaves, glass): always render
        if (isTransparentBlock(blockName)) {
          return true;
        }

        // Opaque blocks: visible if any neighbor is not a solid opaque block
        return neighbors.some((pos) => !solidOccupied.has(pos));
      });
    }

    return filtered;
  }, [blocks, sliceY, surfaceOnly]);

  // Initialize Three.js
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f172a);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      2000
    );
    camera.position.set(50, 100, 50);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.1;
    controls.target.set(8, 32, 8);
    controlsRef.current = controls;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
    directionalLight.position.set(100, 200, 100);
    scene.add(directionalLight);

    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight2.position.set(-100, 100, -100);
    scene.add(directionalLight2);

    // Animation loop
    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    setIsInitialized(true);

    // Resize handler
    const handleResize = () => {
      if (!container || !camera || !renderer) return;
      const width = container.clientWidth;
      const height = container.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      controls.dispose();
      renderer.dispose();
      container.removeChild(renderer.domElement);
    };
  }, []);

  // Update blocks
  useEffect(() => {
    const scene = sceneRef.current;
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!scene || !isInitialized) return;

    // Remove old mesh group
    if (meshGroupRef.current) {
      meshGroupRef.current.traverse((child) => {
        if (
          child instanceof THREE.Mesh ||
          child instanceof THREE.InstancedMesh
        ) {
          child.geometry.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach((m) => m.dispose());
          } else if (child.material) {
            child.material.dispose();
          }
        }
      });
      scene.remove(meshGroupRef.current);
      meshGroupRef.current = null;
    }

    if (processedBlocks.length === 0) return;

    // Calculate bounds
    let minX = Infinity,
      maxX = -Infinity;
    let minY = Infinity,
      maxY = -Infinity;
    let minZ = Infinity,
      maxZ = -Infinity;

    processedBlocks.forEach((block) => {
      const [x, y, z] = block.position;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
      minZ = Math.min(minZ, z);
      maxZ = Math.max(maxZ, z);
    });

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const centerZ = (minZ + maxZ) / 2;

    // Update camera target
    if (controls && camera) {
      controls.target.set(centerX, centerY, centerZ);
      const rangeX = maxX - minX;
      const rangeZ = maxZ - minZ;
      const maxRange = Math.max(rangeX, rangeZ, 1);
      const distance = maxRange * 1.5;
      camera.position.set(
        centerX + distance * 0.7,
        centerY + distance * 0.5,
        centerZ + distance * 0.7
      );
    }

    const group = new THREE.Group();
    meshGroupRef.current = group;
    scene.add(group);

    // Group blocks by type for textured rendering
    if (useTextures) {
      const blocksByType = new Map<string, BlockData[]>();
      const crossModelBlocks = new Map<string, BlockData[]>();
      const blocksWithoutTexture: BlockData[] = [];

      processedBlocks.forEach((block) => {
        const name = (block.blockName || "unknown").replace("minecraft:", "");

        // Check if it's a cross model block (plants, flowers, etc.)
        if (isCrossModelBlock(name)) {
          const existing = crossModelBlocks.get(name) || [];
          existing.push(block);
          crossModelBlocks.set(name, existing);
        } else if (blockTextures[name]) {
          const existing = blocksByType.get(name) || [];
          existing.push(block);
          blocksByType.set(name, existing);
        } else {
          blocksWithoutTexture.push(block);
        }
      });

      // Load textures and create meshes
      const createTexturedMeshes = async () => {
        const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
        const crossGeometry = createCrossGeometry();
        const matrix = new THREE.Matrix4();

        // Render regular cube blocks
        for (const [blockName, blocks] of blocksByType.entries()) {
          const textureDef = getBlockTextureDef(blockName);
          if (!textureDef || blocks.length === 0) continue;

          try {
            const [topTex, sideTex, bottomTex] = await Promise.all([
              loadThreeTexture(textureDef.top),
              loadThreeTexture(textureDef.side),
              loadThreeTexture(textureDef.bottom),
            ]);

            // Check if this block needs transparency
            const needsTransparency = isTransparentBlock(blockName);
            const isLiquid = isLiquidBlock(blockName);

            // Check if this block needs color tinting
            const tints = getBlockTint(blockName);

            // Base material options for transparency
            const baseOptions: THREE.MeshLambertMaterialParameters = {};
            if (needsTransparency) {
              baseOptions.transparent = true;
              baseOptions.alphaTest = 0.1;
              baseOptions.side = THREE.DoubleSide;
            }

            // Create materials for each face with appropriate tints: +X, -X, +Y, -Y, +Z, -Z
            const materials = [
              new THREE.MeshLambertMaterial({
                map: sideTex,
                ...baseOptions,
                ...(tints.side && { color: tints.side }),
              }), // +X (right)
              new THREE.MeshLambertMaterial({
                map: sideTex,
                ...baseOptions,
                ...(tints.side && { color: tints.side }),
              }), // -X (left)
              new THREE.MeshLambertMaterial({
                map: topTex,
                ...baseOptions,
                ...(tints.top && { color: tints.top }),
              }), // +Y (top)
              new THREE.MeshLambertMaterial({
                map: bottomTex,
                ...baseOptions,
              }), // -Y (bottom) - no tint
              new THREE.MeshLambertMaterial({
                map: sideTex,
                ...baseOptions,
                ...(tints.side && { color: tints.side }),
              }), // +Z (front)
              new THREE.MeshLambertMaterial({
                map: sideTex,
                ...baseOptions,
                ...(tints.side && { color: tints.side }),
              }), // -Z (back)
            ];

            const mesh = new THREE.InstancedMesh(
              boxGeometry,
              materials,
              blocks.length
            );
            
            // Set render order: liquids first (0), other blocks later (1)
            // This ensures underwater plants render on top of water
            mesh.renderOrder = isLiquid ? 0 : 1;

            blocks.forEach((block, i) => {
              const [x, y, z] = block.position;
              matrix.setPosition(x + 0.5, y + 0.5, z + 0.5);
              mesh.setMatrixAt(i, matrix);
            });

            mesh.instanceMatrix.needsUpdate = true;
            group.add(mesh);
          } catch (error) {
            console.warn(`Failed to load texture for ${blockName}:`, error);
            // Fall back to color for this block type
            blocksWithoutTexture.push(...blocks);
          }
        }

        // Render cross model blocks (plants, flowers, etc.)
        // For blocks with properties (like pointed_dripstone), group by texture variant
        const crossBlocksByTexture = new Map<string, BlockData[]>();

        for (const [blockName, blocks] of crossModelBlocks.entries()) {
          blocks.forEach((block) => {
            let textureKey = blockName;

            // Handle pointed_dripstone with properties
            if (blockName === "pointed_dripstone" && block.properties) {
              const direction = block.properties.vertical_direction || "up";
              const thickness = block.properties.thickness || "tip";
              textureKey = `pointed_dripstone_${direction}_${thickness}`;
            }

            const existing = crossBlocksByTexture.get(textureKey) || [];
            existing.push(block);
            crossBlocksByTexture.set(textureKey, existing);
          });
        }

        for (const [textureKey, blocks] of crossBlocksByTexture.entries()) {
          const textureDef = getBlockTextureDef(textureKey);
          const baseName =
            textureKey.split("_").slice(0, -2).join("_") || textureKey;

          try {
            // Get the texture (use side texture for cross models)
            const textureName = textureDef?.side || `${textureKey}.png`;
            const texture = await loadThreeTexture(textureName);

            // Get tint for this block
            const tints = getBlockTint(baseName);
            const tintColor = tints.side || tints.top;

            const material = new THREE.MeshLambertMaterial({
              map: texture,
              transparent: true,
              alphaTest: 0.1,
              side: THREE.DoubleSide,
              ...(tintColor && { color: tintColor }),
            });

            const mesh = new THREE.InstancedMesh(
              crossGeometry,
              material,
              blocks.length
            );

            blocks.forEach((block, i) => {
              const [x, y, z] = block.position;
              matrix.setPosition(x + 0.5, y, z + 0.5);
              mesh.setMatrixAt(i, matrix);
            });

            mesh.instanceMatrix.needsUpdate = true;
            group.add(mesh);
          } catch (error) {
            console.warn(
              `Failed to load texture for cross model ${textureKey}:`,
              error
            );
          }
        }

        // Render blocks without textures using colors
        if (blocksWithoutTexture.length > 0) {
          // Log which blocks don't have textures
          const missingTextureTypes = new Set<string>();
          blocksWithoutTexture.forEach((block) => {
            const name = (block.blockName || "unknown").replace(
              "minecraft:",
              ""
            );
            missingTextureTypes.add(name);
          });

          const colorMaterial = new THREE.MeshLambertMaterial({
            vertexColors: false,
            color: 0xffffff,
          });
          const colorMesh = new THREE.InstancedMesh(
            boxGeometry,
            colorMaterial,
            blocksWithoutTexture.length
          );
          const color = new THREE.Color();

          blocksWithoutTexture.forEach((block, i) => {
            const [x, y, z] = block.position;
            matrix.setPosition(x + 0.5, y + 0.5, z + 0.5);
            colorMesh.setMatrixAt(i, matrix);

            const blockColor = getBlockColorByName(block.blockName);
            color.setRGB(
              blockColor[0] / 255,
              blockColor[1] / 255,
              blockColor[2] / 255
            );
            colorMesh.setColorAt(i, color);
          });

          colorMesh.instanceMatrix.needsUpdate = true;
          if (colorMesh.instanceColor) {
            colorMesh.instanceColor.needsUpdate = true;
          }
          group.add(colorMesh);
        }

      };

      createTexturedMeshes();
    } else {
      // Color-only rendering (faster)
      const geometry = new THREE.BoxGeometry(1, 1, 1);
      const material = new THREE.MeshLambertMaterial({
        vertexColors: false,
        color: 0xffffff,
      });

      const mesh = new THREE.InstancedMesh(
        geometry,
        material,
        processedBlocks.length
      );
      const matrix = new THREE.Matrix4();
      const color = new THREE.Color();

      processedBlocks.forEach((block, i) => {
        const [x, y, z] = block.position;
        matrix.setPosition(x + 0.5, y + 0.5, z + 0.5);
        mesh.setMatrixAt(i, matrix);

        const blockColor = getBlockColorByName(block.blockName);
        color.setRGB(
          blockColor[0] / 255,
          blockColor[1] / 255,
          blockColor[2] / 255
        );
        mesh.setColorAt(i, color);
      });

      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) {
        mesh.instanceColor.needsUpdate = true;
      }

      group.add(mesh);
    }
  }, [processedBlocks, isInitialized, useTextures]);

  return (
    <div
      ref={containerRef}
      className={cn("relative w-full h-full min-h-[400px]", className)}
    >
      <div className="absolute top-4 right-4 flex flex-col gap-2">
        <div className="px-3 py-2 rounded-lg text-xs font-medium bg-green-600 text-white">
          🚀 WebGL (Three.js)
        </div>
        <button
          onClick={() => setSurfaceOnly(!surfaceOnly)}
          className={cn(
            "px-3 py-2 rounded-lg text-xs font-medium transition-colors",
            surfaceOnly
              ? "bg-blue-600 text-white"
              : "bg-slate-700 text-slate-300"
          )}
        >
          {surfaceOnly ? "🔲 표면만" : "🔲 전체"}
        </button>
        <button
          onClick={() => setUseTextures(!useTextures)}
          className={cn(
            "px-3 py-2 rounded-lg text-xs font-medium transition-colors",
            useTextures
              ? "bg-purple-600 text-white"
              : "bg-slate-700 text-slate-300"
          )}
        >
          {useTextures ? "🎨 텍스처" : "🎨 색상"}
        </button>
      </div>

      <div className="absolute top-4 left-4 bg-slate-900/90 backdrop-blur-sm px-4 py-3 rounded-lg text-xs border border-slate-700/50">
        <div className="text-slate-200 font-bold mb-1">
          블록: {processedBlocks.length.toLocaleString()}
        </div>
        <div className="text-slate-400">Y 레벨: {sliceY}</div>
        <div className="text-slate-400">
          원본:{" "}
          {blocks
            .filter((b) => b.position[1] <= sliceY)
            .length.toLocaleString()}
        </div>
      </div>

      <div className="absolute bottom-4 left-4 bg-slate-900/90 backdrop-blur-sm px-4 py-3 rounded-lg text-xs border border-slate-700/50">
        <div className="text-slate-300 font-medium mb-1">
          🖱️ 마우스 드래그: 회전
        </div>
        <div className="text-slate-400">🔍 스크롤: 확대/축소</div>
        <div className="text-slate-400">⌘+드래그: 이동</div>
      </div>
    </div>
  );
}
