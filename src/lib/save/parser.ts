// Minecraft Save Folder Parser
import * as nbt from "prismarine-nbt";
import pako from "pako";
import { parseRegionHeader, RegionData } from "../mca/parser";

// Save folder structure
export interface MinecraftSave {
  name: string;
  levelData: LevelData | null;
  dimensions: {
    overworld: DimensionData;
    nether: DimensionData | null;
    end: DimensionData | null;
  };
  players: PlayerData[];
  dataFiles: DataFile[];
  files: FileEntry[]; // All original files for ZIP export
}

export interface LevelData {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  raw: any;
  version: string;
  worldName: string;
  gameType: number;
  difficulty: number;
  hardcore: boolean;
  seed: string;
  time: number;
  dayTime: number;
  lastPlayed: number;
  spawnX: number;
  spawnY: number;
  spawnZ: number;
  weather: {
    raining: boolean;
    thundering: boolean;
    rainTime: number;
    thunderTime: number;
  };
  gameRules: Record<string, string>;
}

export interface DimensionData {
  name: string;
  regions: Map<string, RegionFileData>;
  entities?: Map<string, RegionFileData>;
  poi?: Map<string, RegionFileData>;
}

export interface RegionFileData {
  filename: string;
  buffer: Uint8Array;
  regionData: RegionData;
  regionX: number;
  regionZ: number;
}

export interface PlayerData {
  uuid: string;
  filename: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  raw: any;
  position: [number, number, number];
  dimension: string;
  health: number;
  foodLevel: number;
  xpLevel: number;
  gameType: number;
  inventory: InventoryItem[];
}

export interface InventoryItem {
  slot: number;
  id: string;
  count: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tag?: any;
}

export interface DataFile {
  name: string;
  path: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  raw: any; // Alias for data, for compatibility
}

// Parse region coordinates from filename
function parseRegionCoords(filename: string): { x: number; z: number } {
  const match = filename.match(/r\.(-?\d+)\.(-?\d+)\.mc[ar]$/i);
  if (match) {
    return { x: parseInt(match[1], 10), z: parseInt(match[2], 10) };
  }
  return { x: 0, z: 0 };
}

// Parse NBT data (handles both compressed and uncompressed)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function parseNbtData(buffer: Uint8Array): Promise<any> {
  try {
    // Try parsing as gzip compressed
    const decompressed = pako.ungzip(buffer);
    const result = await nbt.parse(Buffer.from(decompressed));
    return nbt.simplify(result.parsed);
  } catch {
    try {
      // Try parsing as uncompressed
      const result = await nbt.parse(Buffer.from(buffer));
      return nbt.simplify(result.parsed);
    } catch {
      return null;
    }
  }
}

// Parse level.dat
async function parseLevelDat(buffer: Uint8Array): Promise<LevelData | null> {
  const data = await parseNbtData(buffer);
  if (!data || !data.Data) return null;

  const d = data.Data;
  
  return {
    raw: data,
    version: d.Version?.Name || "Unknown",
    worldName: d.LevelName || "Unknown",
    gameType: d.GameType ?? 0,
    difficulty: d.Difficulty ?? 2,
    hardcore: d.hardcore ?? false,
    seed: String(d.WorldGenSettings?.seed || d.RandomSeed || 0),
    time: Number(d.Time || 0),
    dayTime: Number(d.DayTime || 0),
    lastPlayed: Number(d.LastPlayed || 0),
    spawnX: d.SpawnX ?? 0,
    spawnY: d.SpawnY ?? 64,
    spawnZ: d.SpawnZ ?? 0,
    weather: {
      raining: d.raining ?? false,
      thundering: d.thundering ?? false,
      rainTime: d.rainTime ?? 0,
      thunderTime: d.thunderTime ?? 0,
    },
    gameRules: d.GameRules || {},
  };
}

// Parse player data
async function parsePlayerData(buffer: Uint8Array, filename: string): Promise<PlayerData | null> {
  const data = await parseNbtData(buffer);
  if (!data) return null;

  const uuid = filename.replace(".dat", "");
  
  // Parse inventory
  const inventory: InventoryItem[] = [];
  if (data.Inventory && Array.isArray(data.Inventory)) {
    for (const item of data.Inventory) {
      inventory.push({
        slot: item.Slot ?? 0,
        id: item.id || item.Id || "unknown",
        count: item.Count ?? item.count ?? 1,
        tag: item.tag || item.Tag,
      });
    }
  }

  return {
    uuid,
    filename,
    raw: data,
    position: [
      data.Pos?.[0] ?? 0,
      data.Pos?.[1] ?? 64,
      data.Pos?.[2] ?? 0,
    ],
    dimension: data.Dimension || "minecraft:overworld",
    health: data.Health ?? 20,
    foodLevel: data.foodLevel ?? 20,
    xpLevel: data.XpLevel ?? 0,
    gameType: data.playerGameType ?? 0,
    inventory,
  };
}

// File entry from directory upload
export interface FileEntry {
  name: string;
  path: string;
  file: File;
}

// Parse entire save folder
export async function parseSaveFolder(
  files: FileEntry[],
  onProgress?: (progress: number, message: string) => void
): Promise<MinecraftSave> {
  const save: MinecraftSave = {
    name: "Unknown",
    levelData: null,
    dimensions: {
      overworld: { name: "overworld", regions: new Map() },
      nether: null,
      end: null,
    },
    players: [],
    dataFiles: [],
    files: files, // Store original files for ZIP export
  };

  const totalFiles = files.length;
  let processedFiles = 0;

  const reportProgress = (message: string) => {
    processedFiles++;
    onProgress?.(Math.round((processedFiles / totalFiles) * 100), message);
  };

  // Categorize files by path
  const filesByPath = new Map<string, FileEntry>();
  for (const entry of files) {
    filesByPath.set(entry.path.toLowerCase(), entry);
  }

  // Find save folder root (look for level.dat)
  let rootPath = "";
  for (const [path] of filesByPath) {
    if (path.endsWith("level.dat")) {
      rootPath = path.replace("level.dat", "");
      save.name = rootPath.split("/").filter(Boolean).pop() || "Unknown";
      break;
    }
  }

  // Parse level.dat
  for (const [path, entry] of filesByPath) {
    if (path.endsWith("level.dat") && !path.endsWith("level.dat_old")) {
      reportProgress("level.dat 파싱 중...");
      const buffer = new Uint8Array(await entry.file.arrayBuffer());
      save.levelData = await parseLevelDat(buffer);
      if (save.levelData?.worldName) {
        save.name = save.levelData.worldName;
      }
      break;
    }
  }

  // Parse region files
  for (const [path, entry] of filesByPath) {
    if (!path.includes("/region/") || !path.match(/\.mc[ar]$/i)) continue;

    reportProgress(`Region 파일 로딩: ${entry.name}`);
    
    try {
      const buffer = new Uint8Array(await entry.file.arrayBuffer());
      const regionData = parseRegionHeader(buffer);
      regionData.filename = entry.name;
      
      const coords = parseRegionCoords(entry.name);
      
      const regionFileData: RegionFileData = {
        filename: entry.name,
        buffer,
        regionData,
        regionX: coords.x,
        regionZ: coords.z,
      };

      // Determine dimension
      if (path.includes("/dim-1/") || path.includes("/dim_-1/")) {
        if (!save.dimensions.nether) {
          save.dimensions.nether = { name: "nether", regions: new Map() };
        }
        save.dimensions.nether.regions.set(`${coords.x},${coords.z}`, regionFileData);
      } else if (path.includes("/dim1/") || path.includes("/dim_1/")) {
        if (!save.dimensions.end) {
          save.dimensions.end = { name: "end", regions: new Map() };
        }
        save.dimensions.end.regions.set(`${coords.x},${coords.z}`, regionFileData);
      } else {
        save.dimensions.overworld.regions.set(`${coords.x},${coords.z}`, regionFileData);
      }
    } catch (err) {
      console.warn(`Failed to parse region file ${entry.name}:`, err);
    }
  }

  // Parse player data
  for (const [path, entry] of filesByPath) {
    if (!path.includes("/playerdata/") || !path.endsWith(".dat")) continue;

    reportProgress(`플레이어 데이터 로딩: ${entry.name}`);
    
    try {
      const buffer = new Uint8Array(await entry.file.arrayBuffer());
      const playerData = await parsePlayerData(buffer, entry.name);
      if (playerData) {
        save.players.push(playerData);
      }
    } catch (err) {
      console.warn(`Failed to parse player data ${entry.name}:`, err);
    }
  }

  // Parse other data files
  for (const [path, entry] of filesByPath) {
    if (!path.includes("/data/") || !path.endsWith(".dat")) continue;

    reportProgress(`데이터 파일 로딩: ${entry.name}`);
    
    try {
      const buffer = new Uint8Array(await entry.file.arrayBuffer());
      const data = await parseNbtData(buffer);
      if (data) {
        save.dataFiles.push({
          name: entry.name,
          path: path,
          data,
          raw: data, // Same as data, for compatibility
        });
      }
    } catch (err) {
      console.warn(`Failed to parse data file ${entry.name}:`, err);
    }
  }

  return save;
}

// Get dimension statistics
export function getDimensionStats(dimension: DimensionData): {
  regionCount: number;
  chunkCount: number;
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
} {
  let chunkCount = 0;
  let minX = Infinity, maxX = -Infinity;
  let minZ = Infinity, maxZ = -Infinity;

  for (const [, region] of dimension.regions) {
    chunkCount += region.regionData.availableChunks.length;
    
    // Calculate bounds in chunk coordinates
    const regionChunkMinX = region.regionX * 32;
    const regionChunkMinZ = region.regionZ * 32;
    const regionChunkMaxX = regionChunkMinX + 31;
    const regionChunkMaxZ = regionChunkMinZ + 31;
    
    minX = Math.min(minX, regionChunkMinX);
    maxX = Math.max(maxX, regionChunkMaxX);
    minZ = Math.min(minZ, regionChunkMinZ);
    maxZ = Math.max(maxZ, regionChunkMaxZ);
  }

  return {
    regionCount: dimension.regions.size,
    chunkCount,
    bounds: { minX, maxX, minZ, maxZ },
  };
}

// Game type names
export const GAME_TYPES = ["서바이벌", "크리에이티브", "어드벤처", "관전"];

// Difficulty names
export const DIFFICULTIES = ["평화로움", "쉬움", "보통", "어려움"];

