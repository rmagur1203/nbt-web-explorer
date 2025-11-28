import pako from "pako";
import * as nbt from "prismarine-nbt";

export interface ChunkLocation {
  x: number;
  z: number;
  offset: number;
  sectorCount: number;
  timestamp: number;
}

export interface BlockData {
  position: [number, number, number];
  blockId: number;
  blockData: number;
  lighting: number;
  biome: number;
  blockName?: string;
  properties?: Record<string, string>; // Block state properties (e.g., facing, half, thickness)
}

export interface RegionData {
  filename: string;
  chunks: Map<string, ChunkLocation>;
  heightMap: Uint8Array;
  availableChunks: [number, number][];
}

const SECTION_SIZE = 16 * 16 * 16;

// Parse region file header
export function parseRegionHeader(buffer: Uint8Array): RegionData {
  const chunks = new Map<string, ChunkLocation>();
  const availableChunks: [number, number][] = [];
  const heightMap = new Uint8Array(512 * 512);

  // First 4KB: chunk locations (1024 entries, 4 bytes each)
  for (let i = 0; i < 1024; i++) {
    const offset = i * 4;
    const locationData =
      (buffer[offset] << 16) |
      (buffer[offset + 1] << 8) |
      buffer[offset + 2];
    const sectorCount = buffer[offset + 3];

    if (locationData === 0 && sectorCount === 0) continue;

    // Second 4KB: timestamps (1024 entries, 4 bytes each)
    const timestampOffset = 4096 + i * 4;
    const timestamp =
      (buffer[timestampOffset] << 24) |
      (buffer[timestampOffset + 1] << 16) |
      (buffer[timestampOffset + 2] << 8) |
      buffer[timestampOffset + 3];

    const x = i % 32;
    const z = Math.floor(i / 32);

    chunks.set(`${x},${z}`, {
      x,
      z,
      offset: locationData,
      sectorCount,
      timestamp,
    });
    availableChunks.push([x, z]);
  }

  return {
    filename: "",
    chunks,
    heightMap,
    availableChunks,
  };
}

// Read chunk NBT data
export function readChunkData(
  buffer: Uint8Array,
  location: ChunkLocation
): Uint8Array | null {
  try {
    const chunkOffset = location.offset * 4096;
    const dataLength =
      (buffer[chunkOffset] << 24) |
      (buffer[chunkOffset + 1] << 16) |
      (buffer[chunkOffset + 2] << 8) |
      buffer[chunkOffset + 3];
    const compressionType = buffer[chunkOffset + 4];

    const dataStart = chunkOffset + 5;
    const dataEnd = dataStart + dataLength - 1;
    const compressedData = buffer.slice(dataStart, dataEnd);

    let decompressed: Uint8Array;
    switch (compressionType) {
      case 1: // GZip
        decompressed = pako.ungzip(compressedData);
        break;
      case 2: // Zlib
        decompressed = pako.inflate(compressedData);
        break;
      case 3: // Uncompressed
        decompressed = compressedData;
        break;
      default:
        console.warn(`Unknown compression type: ${compressionType}`);
        return null;
    }

    return decompressed;
  } catch (error) {
    console.error(`Failed to read chunk at (${location.x}, ${location.z}):`, error);
    return null;
  }
}

// Parse chunk NBT using prismarine-nbt
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function parseChunkNBT(data: Uint8Array): Promise<any> {
  const { parsed } = await nbt.parse(Buffer.from(data));
  return simplifyNbt(parsed);
}

// Simplify NBT structure (remove type wrappers)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function simplifyNbt(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  
  if (typeof obj !== 'object') return obj;
  
  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(simplifyNbt);
  }
  
  // Handle typed values from prismarine-nbt
  if ('value' in obj && 'type' in obj) {
    const val = obj.value;
    
    // Handle compound
    if (obj.type === 'compound' && typeof val === 'object') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result: Record<string, any> = {};
      for (const [key, child] of Object.entries(val)) {
        result[key] = simplifyNbt(child);
      }
      return result;
    }
    
    // Handle list
    if (obj.type === 'list' && typeof val === 'object' && 'value' in val) {
      return val.value.map(simplifyNbt);
    }
    
    // Handle byte array, int array, long array - keep as typed arrays
    if (obj.type === 'byteArray' || obj.type === 'intArray' || obj.type === 'longArray') {
      return val;
    }
    
    // Handle primitives
    return val;
  }
  
  // Handle plain objects
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result: Record<string, any> = {};
  for (const [key, child] of Object.entries(obj)) {
    result[key] = simplifyNbt(child);
  }
  return result;
}

// Extract block data from parsed chunk
export function extractBlocks(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  chunkNBT: any,
  regionChunkX: number,
  regionChunkZ: number
): BlockData[] {
  const blocks: BlockData[] = [];
  
  if (!chunkNBT) {
    return blocks;
  }
  
  // Get Level data (Minecraft stores chunk data under "Level" tag)
  // In 1.18+, data might be at root level
  const level = chunkNBT.Level || chunkNBT;
  
  if (!level) {
    return blocks;
  }
  
  // Get sections (can be "Sections" or "sections")
  const sections = level.Sections || level.sections || level.section;
  
  if (!sections) {
    return blocks;
  }
  
  if (!Array.isArray(sections)) {
    return blocks;
  }
  
  // Get world chunk coordinates (not region-relative)
  const xPos = level.xPos ?? level.XPos ?? regionChunkX;
  const zPos = level.zPos ?? level.ZPos ?? regionChunkZ;
  const xOffset = xPos * 16;
  const zOffset = zPos * 16;
  
  // Get biomes
  const biomes = level.Biomes || new Uint8Array(256).fill(4);

  for (const section of sections) {
    if (!section) continue;
    
    const sectionY = section.Y ?? section.y ?? 0;
    const yOffset = sectionY * 16;
    
    // 1.12 and earlier format: Blocks array
    if (section.Blocks) {
      
      for (let i = 0; i < SECTION_SIZE; i++) {
        let blockId = section.Blocks[i];
        if (section.Add) {
          blockId += (get4BitData(section.Add, i) << 8);
        }

        if (blockId === 0) continue; // Skip air

        const blockData = section.Data ? get4BitData(section.Data, i) : 0;
        const blockLight = section.BlockLight ? get4BitData(section.BlockLight, i) : 0;
        const skyLight = section.SkyLight ? get4BitData(section.SkyLight, i) : 15;
        const lighting = Math.min(blockLight + skyLight, 15);

        const x = i & 0xf;
        const y = (i >> 8) + yOffset;
        const z = (i >> 4) & 0xf;
        const biomeIdx = (z * 16 + x) % 256;
        const biome = Array.isArray(biomes) ? (biomes[biomeIdx] || 4) : 4;

        blocks.push({
          position: [x + xOffset, y, z + zOffset],
          blockId,
          blockData,
          lighting,
          biome,
        });
      }
    }
    // 1.13-1.17 format: Palette and BlockStates
    else if (section.Palette && section.BlockStates) {
      const yOffset = (section.Y ?? 0) * 16;
      const palette = section.Palette;
      
      if (!palette || palette.length === 0) continue;
      
      // Calculate bits per block
      const bitsPerBlock = Math.max(4, Math.ceil(Math.log2(palette.length)));
      const blocksPerLong = Math.floor(64 / bitsPerBlock);
      const blockStates = section.BlockStates;
      
      if (!blockStates || blockStates.length === 0) continue;
      
      const mask = (1 << bitsPerBlock) - 1;
      
      for (let i = 0; i < SECTION_SIZE; i++) {
        const longIndex = Math.floor(i / blocksPerLong);
        const bitOffset = (i % blocksPerLong) * bitsPerBlock;
        
        if (longIndex >= blockStates.length) continue;
        
        let paletteIndex: number;
        const longVal = blockStates[longIndex];
        
        if (typeof longVal === 'bigint') {
          paletteIndex = Number((longVal >> BigInt(bitOffset)) & BigInt(mask));
        } else if (Array.isArray(longVal)) {
          // [high, low] format
          const combined = BigInt(longVal[0]) * BigInt(2 ** 32) + BigInt(longVal[1] >>> 0);
          paletteIndex = Number((combined >> BigInt(bitOffset)) & BigInt(mask));
        } else {
          continue;
        }
        
        if (paletteIndex >= palette.length) continue;
        
        const block = palette[paletteIndex];
        const blockName = typeof block === 'string' ? block : block?.Name;
        
        if (!blockName || blockName === 'minecraft:air' || blockName === 'air') continue;
        
        // Convert block name to approximate ID for color
        const blockId = getBlockIdFromName(blockName);
        const cleanName = blockName.replace('minecraft:', '');
        
        const x = i & 0xf;
        const y = (i >> 8) + yOffset;
        const z = (i >> 4) & 0xf;

        blocks.push({
          position: [x + xOffset, y, z + zOffset],
          blockId,
          blockData: 0,
          lighting: 15,
          biome: 4,
          blockName: cleanName,
        });
      }
    }
    // 1.18+ format: block_states with nested palette and data
    else if (section.block_states) {
      const blockStates = section.block_states;
      const palette = blockStates.palette;
      const data = blockStates.data;
      
      if (!palette || palette.length === 0) {
        // Single block section (no data array needed)
        if (palette && palette.length === 1) {
          const block = palette[0];
          const blockName = typeof block === 'string' ? block : block?.Name;
          if (blockName && blockName !== 'minecraft:air' && blockName !== 'air') {
            const blockId = getBlockIdFromName(blockName);
            const cleanName = blockName.replace('minecraft:', '');
            for (let i = 0; i < SECTION_SIZE; i++) {
              const x = i & 0xf;
              const y = (i >> 8) + yOffset;
              const z = (i >> 4) & 0xf;
              blocks.push({
                position: [x + xOffset, y, z + zOffset],
                blockId,
                blockData: 0,
                lighting: 15,
                biome: 4,
                blockName: cleanName,
              });
            }
          }
        }
        continue;
      }
      
      if (!data || data.length === 0) {
        // Only one block type in palette, fill entire section
        const block = palette[0];
        const blockName = typeof block === 'string' ? block : block?.Name;
        if (blockName && blockName !== 'minecraft:air' && blockName !== 'air') {
          const blockId = getBlockIdFromName(blockName);
          const cleanName = blockName.replace('minecraft:', '');
          for (let i = 0; i < SECTION_SIZE; i++) {
            const x = i & 0xf;
            const y = (i >> 8) + yOffset;
            const z = (i >> 4) & 0xf;
            blocks.push({
              position: [x + xOffset, y, z + zOffset],
              blockId,
              blockData: 0,
              lighting: 15,
              biome: 4,
              blockName: cleanName,
            });
          }
        }
        continue;
      }
      
      // Calculate bits per block (minimum 4 bits)
      const bitsPerBlock = Math.max(4, Math.ceil(Math.log2(palette.length)));
      const blocksPerLong = Math.floor(64 / bitsPerBlock);
      const mask = (1n << BigInt(bitsPerBlock)) - 1n;
      
      for (let i = 0; i < SECTION_SIZE; i++) {
        const longIndex = Math.floor(i / blocksPerLong);
        const startBit = (i % blocksPerLong) * bitsPerBlock;
        
        if (longIndex >= data.length) continue;
        
        let paletteIndex: number;
        const longVal = data[longIndex];
        
        if (typeof longVal === 'bigint') {
          paletteIndex = Number((longVal >> BigInt(startBit)) & mask);
        } else if (Array.isArray(longVal)) {
          // [high, low] format from prismarine-nbt
          const high = BigInt(longVal[0]);
          const low = BigInt(longVal[1] >>> 0);
          const combined = (high << 32n) | low;
          paletteIndex = Number((combined >> BigInt(startBit)) & mask);
        } else if (typeof longVal === 'number') {
          paletteIndex = (longVal >> startBit) & Number(mask);
        } else {
          continue;
        }
        
        if (paletteIndex >= palette.length) continue;
        
        const block = palette[paletteIndex];
        const blockName = typeof block === 'string' ? block : block?.Name;
        
        if (!blockName || blockName === 'minecraft:air' || blockName === 'air') continue;
        
        const blockId = getBlockIdFromName(blockName);
        const cleanName = blockName.replace('minecraft:', '');
        
        // Extract block properties if available
        const blockProperties = typeof block === 'object' && block?.Properties 
          ? Object.fromEntries(
              Object.entries(block.Properties).map(([k, v]) => [k, String(v)])
            )
          : undefined;
        
        const x = i & 0xf;
        const y = (i >> 8) + yOffset;
        const z = (i >> 4) & 0xf;

        blocks.push({
          position: [x + xOffset, y, z + zOffset],
          blockId,
          properties: blockProperties,
          blockData: 0,
          lighting: 15,
          biome: 4,
          blockName: cleanName,
        });
      }
    }
  }

  return blocks;
}

function get4BitData(uint8Arr: Uint8Array | number[], index: number): number {
  if (!(index % 2)) {
    return uint8Arr[index >> 1] & 0xf;
  }
  return uint8Arr[index >> 1] >> 4;
}

// Map Minecraft 1.13+ block names to approximate old IDs for coloring
function getBlockIdFromName(name: string): number {
  const n = name.replace('minecraft:', '');
  const blockNameMap: Record<string, number> = {
    'stone': 1, 'granite': 1, 'diorite': 1, 'andesite': 1,
    'grass_block': 2, 'grass': 2,
    'dirt': 3, 'coarse_dirt': 3, 'podzol': 3,
    'cobblestone': 4,
    'oak_planks': 5, 'spruce_planks': 5, 'birch_planks': 5, 'jungle_planks': 5, 'acacia_planks': 5, 'dark_oak_planks': 5,
    'bedrock': 7,
    'water': 8, 'flowing_water': 8,
    'lava': 10, 'flowing_lava': 10,
    'sand': 12, 'red_sand': 12,
    'gravel': 13,
    'gold_ore': 14, 'deepslate_gold_ore': 14,
    'iron_ore': 15, 'deepslate_iron_ore': 15,
    'coal_ore': 16, 'deepslate_coal_ore': 16,
    'oak_log': 17, 'spruce_log': 17, 'birch_log': 17, 'jungle_log': 17,
    'oak_leaves': 18, 'spruce_leaves': 18, 'birch_leaves': 18, 'jungle_leaves': 18,
    'sandstone': 24,
    'tall_grass': 31, 'short_grass': 31, 'fern': 31,
    'dead_bush': 32,
    'white_wool': 35, 'wool': 35,
    'dandelion': 37, 'yellow_flower': 37,
    'poppy': 38, 'rose': 38,
    'stone_slab': 44, 'smooth_stone_slab': 44,
    'bricks': 45, 'brick': 45,
    'mossy_cobblestone': 48,
    'obsidian': 49,
    'torch': 50, 'wall_torch': 50,
    'diamond_ore': 56, 'deepslate_diamond_ore': 56,
    'redstone_ore': 73, 'deepslate_redstone_ore': 73,
    'snow': 78, 'snow_layer': 78,
    'ice': 79,
    'snow_block': 80,
    'cactus': 81,
    'clay': 82,
    'sugar_cane': 83,
    'pumpkin': 86,
    'netherrack': 87,
    'soul_sand': 88,
    'glowstone': 89,
    'stone_bricks': 98, 'mossy_stone_bricks': 98, 'cracked_stone_bricks': 98,
    'brown_mushroom_block': 99,
    'red_mushroom_block': 100,
    'mycelium': 110,
    'emerald_ore': 129, 'deepslate_emerald_ore': 129,
    'quartz_block': 155,
    'terracotta': 159,
    'acacia_leaves': 161, 'dark_oak_leaves': 161,
    'acacia_log': 162, 'dark_oak_log': 162,
    'hay_block': 170,
    'hardened_clay': 172,
    'coal_block': 173,
    'packed_ice': 174,
    'red_sandstone': 179,
    // Add deepslate and other new blocks
    'deepslate': 1,
    'tuff': 1,
    'calcite': 1,
    'copper_ore': 15,
    'deepslate_copper_ore': 15,
  };
  
  return blockNameMap[n] || 1; // Default to stone
}

// Get height map from chunk
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function extractHeightMap(chunkNBT: any): number[] {
  const level = chunkNBT?.Level || chunkNBT;
  if (level && level.HeightMap) {
    return Array.from(level.HeightMap);
  }
  // Try Heightmaps for 1.13+
  if (level && level.Heightmaps && level.Heightmaps.WORLD_SURFACE) {
    // For now, return default - proper heightmap decoding is complex
    return new Array(256).fill(64);
  }
  return new Array(256).fill(64);
}

// Block colors for simple visualization
export const BLOCK_COLORS: Record<number, [number, number, number]> = {
  1: [128, 128, 128], // Stone
  2: [86, 125, 70], // Grass
  3: [134, 96, 67], // Dirt
  4: [100, 100, 100], // Cobblestone
  5: [157, 128, 79], // Wood Planks
  7: [50, 50, 50], // Bedrock
  8: [32, 82, 189], // Water
  9: [32, 82, 189], // Still Water
  10: [207, 91, 29], // Lava
  11: [207, 91, 29], // Still Lava
  12: [219, 211, 160], // Sand
  13: [136, 126, 126], // Gravel
  14: [252, 238, 75], // Gold Ore
  15: [143, 140, 125], // Iron Ore
  16: [35, 35, 35], // Coal Ore
  17: [102, 81, 51], // Wood
  18: [60, 120, 35], // Leaves
  24: [218, 210, 158], // Sandstone
  31: [90, 140, 50], // Tall Grass
  32: [128, 100, 64], // Dead Bush
  35: [230, 230, 230], // Wool
  37: [255, 255, 0], // Dandelion
  38: [255, 0, 0], // Rose
  43: [165, 165, 165], // Double Slab
  44: [165, 165, 165], // Slab
  45: [178, 90, 83], // Brick
  48: [77, 97, 77], // Moss Stone
  49: [20, 18, 30], // Obsidian
  50: [255, 214, 0], // Torch
  56: [93, 236, 245], // Diamond Ore
  73: [160, 100, 90], // Redstone Ore
  78: [240, 252, 255], // Snow Layer
  79: [141, 180, 255], // Ice
  80: [240, 252, 255], // Snow Block
  81: [14, 69, 20], // Cactus
  82: [159, 164, 177], // Clay
  83: [145, 176, 96], // Sugar Cane
  86: [206, 126, 25], // Pumpkin
  87: [111, 54, 53], // Netherrack
  88: [84, 64, 51], // Soul Sand
  89: [249, 212, 156], // Glowstone
  98: [122, 122, 122], // Stone Brick
  99: [140, 108, 78], // Brown Mushroom Block
  100: [183, 37, 34], // Red Mushroom Block
  110: [75, 63, 79], // Mycelium
  129: [105, 152, 101], // Emerald Ore
  155: [235, 229, 222], // Quartz Block
  159: [209, 178, 161], // Stained Clay
  161: [60, 120, 35], // Acacia Leaves
  162: [102, 81, 51], // Acacia Wood
  170: [180, 165, 55], // Hay Block
  172: [151, 94, 67], // Hardened Clay
  173: [17, 17, 17], // Coal Block
  174: [157, 203, 234], // Packed Ice
  179: [170, 86, 62], // Red Sandstone
};

// Get block color
export function getBlockColor(blockId: number): [number, number, number] {
  return BLOCK_COLORS[blockId] || [200, 200, 200];
}

// Extract biome data for minimap
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function extractBiomeMap(chunkNBT: any, regionChunkX: number, regionChunkZ: number): { biomes: string[], heightMap: number[] } {
  const result = {
    biomes: new Array(256).fill('plains') as string[],
    heightMap: new Array(256).fill(64) as number[],
  };
  
  if (!chunkNBT) return result;
  
  const level = chunkNBT.Level || chunkNBT;
  
  // Extract biomes (1.18+ format uses sections with biomes)
  const sections = level.Sections || level.sections;
  
  if (sections && Array.isArray(sections)) {
    // Find surface section (around Y=64)
    const surfaceSection = sections.find((s: { Y?: number; y?: number }) => {
      const y = s?.Y ?? s?.y ?? 0;
      return y >= 3 && y <= 5; // Sections 3-5 typically contain surface
    }) || sections.find((s: { Y?: number; y?: number; biomes?: unknown }) => s?.biomes);
    
    if (surfaceSection?.biomes) {
      const biomes = surfaceSection.biomes;
      
      // 1.18+ biome format
      if (biomes.palette && Array.isArray(biomes.palette)) {
        const palette = biomes.palette;
        const data = biomes.data;
        
        if (data && data.length > 0) {
          // Biomes are 4x4x4 per section, so 4x4 per column
          const bitsPerBiome = Math.max(1, Math.ceil(Math.log2(palette.length)));
          const biomesPerLong = Math.floor(64 / bitsPerBiome);
          const mask = (1n << BigInt(bitsPerBiome)) - 1n;
          
          for (let z = 0; z < 16; z++) {
            for (let x = 0; x < 16; x++) {
              // Biome index for this column (4x4 biome grid)
              const biomeX = Math.floor(x / 4);
              const biomeZ = Math.floor(z / 4);
              const biomeIdx = biomeZ * 4 + biomeX; // Y=0 within section
              
              const longIndex = Math.floor(biomeIdx / biomesPerLong);
              const bitOffset = (biomeIdx % biomesPerLong) * bitsPerBiome;
              
              if (longIndex < data.length) {
                let paletteIdx = 0;
                const longVal = data[longIndex];
                
                if (typeof longVal === 'bigint') {
                  paletteIdx = Number((longVal >> BigInt(bitOffset)) & mask);
                } else if (Array.isArray(longVal)) {
                  const combined = (BigInt(longVal[0]) << 32n) | BigInt(longVal[1] >>> 0);
                  paletteIdx = Number((combined >> BigInt(bitOffset)) & mask);
                }
                
                if (paletteIdx < palette.length) {
                  const biomeName = typeof palette[paletteIdx] === 'string' 
                    ? palette[paletteIdx].replace('minecraft:', '')
                    : 'plains';
                  result.biomes[z * 16 + x] = biomeName;
                }
              }
            }
          }
        } else if (palette.length === 1) {
          // Single biome for entire section
          const biomeName = typeof palette[0] === 'string'
            ? palette[0].replace('minecraft:', '')
            : 'plains';
          result.biomes.fill(biomeName);
        }
      }
    }
  }
  
  // Legacy biome format (pre-1.18)
  if (level.Biomes && Array.isArray(level.Biomes)) {
    for (let i = 0; i < Math.min(level.Biomes.length, 256); i++) {
      const biomeId = level.Biomes[i];
      // Convert numeric ID to name using BIOME_ID_MAP (imported from biomes.ts)
      result.biomes[i] = String(biomeId);
    }
  }
  
  // Extract heightmap
  if (level.HeightMap && Array.isArray(level.HeightMap)) {
    for (let i = 0; i < Math.min(level.HeightMap.length, 256); i++) {
      result.heightMap[i] = level.HeightMap[i];
    }
  } else if (level.Heightmaps?.WORLD_SURFACE) {
    // 1.13+ packed heightmap format - simplified extraction
    // Full decoding requires unpacking 9-bit values from long array
    result.heightMap.fill(64);
  }
  
  return result;
}

// Light emission values for blocks
export const LIGHT_EMITTING_BLOCKS: Record<string, number> = {
  'lava': 15,
  'flowing_lava': 15,
  'fire': 15,
  'soul_fire': 10,
  'glowstone': 15,
  'jack_o_lantern': 15,
  'lantern': 15,
  'soul_lantern': 10,
  'sea_lantern': 15,
  'torch': 14,
  'wall_torch': 14,
  'soul_torch': 10,
  'soul_wall_torch': 10,
  'end_rod': 14,
  'redstone_lamp': 15,
  'crying_obsidian': 10,
  'respawn_anchor': 15,
  'beacon': 15,
  'conduit': 15,
  'shroomlight': 15,
  'glow_lichen': 7,
  'magma_block': 3,
  'brewing_stand': 1,
  'brown_mushroom': 1,
  'dragon_egg': 1,
  'end_portal_frame': 1,
  'enchanting_table': 7,
  'ender_chest': 7,
  'redstone_torch': 7,
  'redstone_wall_torch': 7,
  'amethyst_cluster': 5,
  'large_amethyst_bud': 4,
  'medium_amethyst_bud': 2,
  'small_amethyst_bud': 1,
  'candle': 3,
  'sea_pickle': 6,
  'sculk_catalyst': 6,
};

export function getBlockLightEmission(blockName: string): number {
  const name = blockName.replace('minecraft:', '');
  return LIGHT_EMITTING_BLOCKS[name] || 0;
}
