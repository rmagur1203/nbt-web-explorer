"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Upload, Layers, MapIcon, X, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ChunkMinimap, ChunkBiomeData } from "@/components/mca-viewer/chunk-minimap";
import { Chunk3DViewer } from "@/components/mca-viewer/chunk-3d-viewer";
import {
  parseRegionHeader,
  readChunkData,
  parseChunkNBT,
  extractBlocks,
  extractBiomeMap,
  RegionData,
  BlockData,
} from "@/lib/mca";
import { useSaveStore } from "@/lib/store/save-store";
import { cn } from "@/lib/utils";

// Extended region data with buffer
interface LoadedRegion {
  filename: string;
  buffer: Uint8Array;
  data: RegionData;
  regionX: number;  // Region X coordinate from filename (e.g., r.0.0.mca -> 0)
  regionZ: number;  // Region Z coordinate from filename
}

// Parse region coordinates from filename
function parseRegionCoords(filename: string): { x: number; z: number } {
  const match = filename.match(/r\.(-?\d+)\.(-?\d+)\.mc[ar]$/i);
  if (match) {
    return { x: parseInt(match[1], 10), z: parseInt(match[2], 10) };
  }
  return { x: 0, z: 0 };
}

// Static function to load biome data (for use outside of useCallback)
async function loadBiomeDataForRegionStatic(region: LoadedRegion): Promise<Map<string, ChunkBiomeData>> {
  const biomeMap = new Map<string, ChunkBiomeData>();
  
  const batchSize = 20;
  const chunks = region.data.availableChunks;
  
  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);
    
    await Promise.all(batch.map(async ([localX, localZ]) => {
      const location = region.data.chunks.get(`${localX},${localZ}`);
      if (!location) return;
      
      const chunkBuffer = readChunkData(region.buffer, location);
      if (!chunkBuffer) return;
      
      try {
        const chunkNBT = await parseChunkNBT(chunkBuffer);
        const biomeData = extractBiomeMap(chunkNBT, localX, localZ);
        
        const globalX = localX + region.regionX * 32;
        const globalZ = localZ + region.regionZ * 32;
        
        biomeMap.set(`${globalX},${globalZ}`, {
          x: globalX,
          z: globalZ,
          biomes: biomeData.biomes,
          heightMap: biomeData.heightMap,
        });
      } catch (err) {
        console.warn(`Failed to load biome data for chunk (${localX}, ${localZ}):`, err);
      }
    }));
  }
  
  return biomeMap;
}

export default function MCAViewerPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loadedRegions, setLoadedRegions] = useState<LoadedRegion[]>([]);
  const [selectedChunks, setSelectedChunks] = useState<[number, number][]>([]);
  const [blocks, setBlocks] = useState<BlockData[]>([]);
  const [chunkBiomeData, setChunkBiomeData] = useState<Map<string, ChunkBiomeData>>(new Map());
  const [sliceY, setSliceY] = useState(256);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadedFromSave, setLoadedFromSave] = useState(false);

  // Get data from save store
  const { save, getRegionsForViewer, selectedDimension } = useSaveStore();

  // Load regions from save store on mount
  useEffect(() => {
    if (save && !loadedFromSave) {
      const regions = getRegionsForViewer();
      if (regions.length > 0) {
        setLoadedRegions(regions);
        setLoadedFromSave(true);
        
        // Load biome data for all regions
        const loadAllBiomeData = async () => {
          setLoading(true);
          const allBiomeData = new Map<string, ChunkBiomeData>();
          
          for (const region of regions) {
            const biomeData = await loadBiomeDataForRegionStatic(region);
            biomeData.forEach((v, k) => allBiomeData.set(k, v));
          }
          
          setChunkBiomeData(allBiomeData);
          setLoading(false);
        };
        
        loadAllBiomeData();
      }
    }
  }, [save, loadedFromSave, getRegionsForViewer]);

  // Combine all available chunks from all regions (with global coordinates)
  const allAvailableChunks: [number, number][] = loadedRegions.flatMap((region) =>
    region.data.availableChunks.map(([x, z]) => [
      x + region.regionX * 32,
      z + region.regionZ * 32,
    ] as [number, number])
  );

  // Find region containing a global chunk coordinate
  const findRegionForChunk = useCallback((globalX: number, globalZ: number): LoadedRegion | null => {
    return loadedRegions.find((region) => {
      const localX = globalX - region.regionX * 32;
      const localZ = globalZ - region.regionZ * 32;
      return localX >= 0 && localX < 32 && localZ >= 0 && localZ < 32 &&
        region.data.chunks.has(`${localX},${localZ}`);
    }) || null;
  }, [loadedRegions]);

  // Load biome data for a region
  const loadBiomeDataForRegion = useCallback(async (region: LoadedRegion): Promise<Map<string, ChunkBiomeData>> => {
    const biomeMap = new Map<string, ChunkBiomeData>();
    
    // Load biome data in batches for better performance
    const batchSize = 20;
    const chunks = region.data.availableChunks;
    
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      
      await Promise.all(batch.map(async ([localX, localZ]) => {
        const location = region.data.chunks.get(`${localX},${localZ}`);
        if (!location) return;
        
        const chunkBuffer = readChunkData(region.buffer, location);
        if (!chunkBuffer) return;
        
        try {
          const chunkNBT = await parseChunkNBT(chunkBuffer);
          const biomeData = extractBiomeMap(chunkNBT, localX, localZ);
          
          // Use global coordinates
          const globalX = localX + region.regionX * 32;
          const globalZ = localZ + region.regionZ * 32;
          
          biomeMap.set(`${globalX},${globalZ}`, {
            x: globalX,
            z: globalZ,
            biomes: biomeData.biomes,
            heightMap: biomeData.heightMap,
          });
        } catch (err) {
          console.warn(`Failed to load biome data for chunk (${localX}, ${localZ}):`, err);
        }
      }));
    }
    
    return biomeMap;
  }, []);

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;

      // Validate all files
      const validFiles: File[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.name.match(/\.(mca|mcr)$/i)) {
          validFiles.push(file);
        }
      }

      if (validFiles.length === 0) {
        setError("MCA 또는 MCR 파일만 지원합니다.");
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const newRegions: LoadedRegion[] = [];
        
        for (const file of validFiles) {
          const buffer = new Uint8Array(await file.arrayBuffer());
          const data = parseRegionHeader(buffer);
          data.filename = file.name;

          const heightMap = new Uint8Array(512 * 512);
          data.heightMap = heightMap;
          
          const coords = parseRegionCoords(file.name);
          
          newRegions.push({
            filename: file.name,
            buffer,
            data,
            regionX: coords.x,
            regionZ: coords.z,
          });
        }
        
        // Add to existing regions or replace
        setLoadedRegions((prev) => {
          // Remove duplicates (same region coordinates)
          const filtered = prev.filter((r) => 
            !newRegions.some((nr) => nr.regionX === r.regionX && nr.regionZ === r.regionZ)
          );
          return [...filtered, ...newRegions];
        });
        
        setSelectedChunks([]);
        setBlocks([]);

        // Load biome data for new regions in background
        const allBiomeData = new Map<string, ChunkBiomeData>();
        
        // Keep existing biome data
        chunkBiomeData.forEach((v, k) => allBiomeData.set(k, v));
        
        for (const region of newRegions) {
          const regionBiomeData = await loadBiomeDataForRegion(region);
          regionBiomeData.forEach((v, k) => allBiomeData.set(k, v));
        }
        
        setChunkBiomeData(allBiomeData);

        // Get all regions (existing + new)
        const allRegions = [...loadedRegions.filter((r) => 
          !newRegions.some((nr) => nr.regionX === r.regionX && nr.regionZ === r.regionZ)
        ), ...newRegions];

        // Auto-select first available chunk from first new region
        if (newRegions.length > 0 && newRegions[0].data.availableChunks.length > 0) {
          const firstChunk = newRegions[0].data.availableChunks[0];
          const globalChunk: [number, number] = [
            firstChunk[0] + newRegions[0].regionX * 32,
            firstChunk[1] + newRegions[0].regionZ * 32,
          ];
          handleSelectChunks([globalChunk], allRegions);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "파일을 읽는 중 오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }

      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [loadBiomeDataForRegion, chunkBiomeData]
  );

  const handleSelectChunks = useCallback(
    async (chunks: [number, number][], regionsOverride?: LoadedRegion[]) => {
      const regions = regionsOverride || loadedRegions;
      if (regions.length === 0) return;

      // Helper to find region for a chunk
      const findRegion = (globalX: number, globalZ: number): LoadedRegion | null => {
        return regions.find((region) => {
          const localX = globalX - region.regionX * 32;
          const localZ = globalZ - region.regionZ * 32;
          return localX >= 0 && localX < 32 && localZ >= 0 && localZ < 32 &&
            region.data.chunks.has(`${localX},${localZ}`);
        }) || null;
      };

      setSelectedChunks(chunks);
      setLoading(true);
      setError(null);

      // Load blocks from selected chunks (using global coordinates)
      const allBlocks: BlockData[] = [];
      let maxY = 0;

      for (const [globalX, globalZ] of chunks) {
        // Find which region contains this chunk
        const region = findRegion(globalX, globalZ);
        if (!region) {
          console.warn(`No region found for global chunk (${globalX}, ${globalZ})`);
          continue;
        }

        // Convert to local coordinates
        const localX = globalX - region.regionX * 32;
        const localZ = globalZ - region.regionZ * 32;

        const location = region.data.chunks.get(`${localX},${localZ}`);
        if (!location) {
          console.warn(`Chunk location not found for (${localX}, ${localZ}) in ${region.filename}`);
          continue;
        }

        const chunkBuffer = readChunkData(region.buffer, location);
        if (!chunkBuffer) {
          console.warn(`Failed to read chunk data for (${localX}, ${localZ}) in ${region.filename}`);
          continue;
        }

        try {
          const chunkNBT = await parseChunkNBT(chunkBuffer);
          
          // Extract blocks with global coordinates
          const chunkBlocks = extractBlocks(chunkNBT, globalX, globalZ);
          
          allBlocks.push(...chunkBlocks);

          chunkBlocks.forEach((block) => {
            maxY = Math.max(maxY, block.position[1]);
          });
        } catch (err) {
          console.error(`Error parsing chunk (${globalX}, ${globalZ}):`, err);
        }
      }

      setBlocks(allBlocks);
      setSliceY(maxY || 256);
      setLoading(false);
    },
    [loadedRegions]
  );

  const handleLoadSample = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/sample.mca');
      const arrayBuffer = await response.arrayBuffer();
      const buffer = new Uint8Array(arrayBuffer);
      const data = parseRegionHeader(buffer);
      data.filename = 'sample.mca';
      
      const heightMap = new Uint8Array(512 * 512);
      data.heightMap = heightMap;
      
      const coords = parseRegionCoords('sample.mca');
      const region: LoadedRegion = {
        filename: 'sample.mca',
        buffer,
        data,
        regionX: coords.x,
        regionZ: coords.z,
      };
      
      setLoadedRegions([region]);
      setSelectedChunks([]);
      setBlocks([]);
      
      // Load biome data
      const biomeData = await loadBiomeDataForRegion(region);
      setChunkBiomeData(biomeData);
      
      if (data.availableChunks.length > 0) {
        const firstChunk = data.availableChunks[0];
        const globalChunk: [number, number] = [
          firstChunk[0] + region.regionX * 32,
          firstChunk[1] + region.regionZ * 32,
        ];
        handleSelectChunks([globalChunk], [region]);
      }
    } catch (err) {
      console.error('Failed to load sample:', err);
      setError('샘플 파일 로드 실패');
    } finally {
      setLoading(false);
    }
  }, [loadBiomeDataForRegion, handleSelectChunks]);

  // Remove a loaded region
  const handleRemoveRegion = useCallback((filename: string) => {
    setLoadedRegions((prev) => prev.filter((r) => r.filename !== filename));
    // Clear biome data for removed region
    setChunkBiomeData((prev) => {
      const newMap = new Map(prev);
      const removedRegion = loadedRegions.find((r) => r.filename === filename);
      if (removedRegion) {
        removedRegion.data.availableChunks.forEach(([localX, localZ]) => {
          const globalX = localX + removedRegion.regionX * 32;
          const globalZ = localZ + removedRegion.regionZ * 32;
          newMap.delete(`${globalX},${globalZ}`);
        });
      }
      return newMap;
    });
    setSelectedChunks([]);
    setBlocks([]);
  }, [loadedRegions]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const files = e.dataTransfer.files;
      if (files.length > 0 && fileInputRef.current) {
        const dt = new DataTransfer();
        for (let i = 0; i < files.length; i++) {
          dt.items.add(files[i]);
        }
        fileInputRef.current.files = dt.files;
        fileInputRef.current.dispatchEvent(new Event("change", { bubbles: true }));
      }
    },
    []
  );

  return (
    <div
      className="flex flex-col h-screen bg-background"
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      {/* Header */}
      <header className="flex items-center gap-3 px-6 py-4 border-b bg-gradient-to-r from-card to-background">
        <Link href="/">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div className="p-2 rounded-lg bg-purple-500/10 ring-1 ring-purple-500/20">
          <Layers className="w-6 h-6 text-purple-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight">MCA Chunk Viewer</h1>
          <p className="text-xs text-muted-foreground">
            Minecraft Region 파일 3D 뷰어
          </p>
        </div>
        
        {/* Show save info if loaded from save */}
        {loadedFromSave && save && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/10 ring-1 ring-emerald-500/20">
            <FolderOpen className="w-4 h-4 text-emerald-400" />
            <div className="text-sm">
              <span className="font-medium text-emerald-400">{save.name}</span>
              <span className="text-muted-foreground ml-2">
                ({selectedDimension === "overworld" ? "오버월드" : selectedDimension === "nether" ? "네더" : "엔드"})
              </span>
            </div>
            <Link href="/save" className="ml-2 text-xs text-emerald-400 hover:underline">
              ← 돌아가기
            </Link>
          </div>
        )}
        
        <div className="ml-auto flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".mca,.mcr"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
          <Button
            onClick={handleLoadSample}
            variant="secondary"
            className="gap-2"
          >
            샘플 로드
          </Button>
          <Button
            onClick={() => fileInputRef.current?.click()}
            variant="outline"
            className="gap-2"
          >
            <Upload className="w-4 h-4" />
            MCA 파일 열기
          </Button>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex overflow-hidden">
        {/* Left panel - Minimap */}
        <div className="w-[360px] border-r bg-card/50 p-4 flex flex-col gap-4 overflow-y-auto">
          <div className="flex items-center gap-2">
            <MapIcon className="w-4 h-4 text-muted-foreground" />
            <h2 className="font-semibold text-sm">Region 미니맵</h2>
          </div>

          {loadedRegions.length > 0 ? (
            <ChunkMinimap
              availableChunks={allAvailableChunks}
              selectedChunks={selectedChunks}
              chunkBiomeData={chunkBiomeData}
              onSelectChunks={handleSelectChunks}
              className="aspect-square"
            />
          ) : (
            <div className="aspect-square bg-muted/30 rounded-lg flex items-center justify-center text-sm text-muted-foreground">
              MCA 파일을 열어주세요
            </div>
          )}

          {loadedRegions.length > 0 && (
            <div className="space-y-3">
              {/* Loaded regions list */}
              <div className="space-y-1">
                <div className="text-xs font-medium text-muted-foreground">로드된 Region 파일:</div>
                <div className="space-y-1 max-h-[150px] overflow-y-auto">
                  {loadedRegions.map((region) => (
                    <div
                      key={region.filename}
                      className="flex items-center justify-between px-2 py-1.5 bg-muted/30 rounded text-xs"
                    >
                      <div className="flex flex-col">
                        <span className="font-medium">{region.filename}</span>
                        <span className="text-muted-foreground">
                          r.{region.regionX}.{region.regionZ} · {region.data.availableChunks.length}청크
                        </span>
                      </div>
                      <button
                        onClick={() => handleRemoveRegion(region.filename)}
                        className="p-1 hover:bg-destructive/20 rounded transition-colors"
                      >
                        <X className="w-3 h-3 text-muted-foreground hover:text-destructive" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Stats */}
              <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
                <div>총 청크: {allAvailableChunks.length}개</div>
                <div>바이옴 로드: {chunkBiomeData.size}개</div>
                <div className="text-muted-foreground/70">
                  클릭: 단일 선택 | Ctrl+클릭: 다중 선택
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right panel - 3D View */}
        <div className="flex-1 flex flex-col">
          {/* Y Slice control */}
          <div className="px-4 py-3 border-b bg-card/30 flex items-center gap-4">
            <span className="text-sm font-medium">Y 슬라이스:</span>
            <Slider
              value={[sliceY]}
              onValueChange={(v) => setSliceY(v[0])}
              min={-64}
              max={320}
              step={1}
              className="flex-1 max-w-md"
              disabled={blocks.length === 0}
            />
            <span className="text-sm font-mono w-10 text-right">{sliceY}</span>
          </div>

          {/* 3D Viewer */}
          <div className="flex-1 relative">
            {loading && (
              <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-10">
                <div className="flex flex-col items-center gap-4">
                  <div className="relative">
                    <div className="w-12 h-12 border-4 border-primary/20 rounded-full" />
                    <div className="absolute top-0 left-0 w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                  <p className="text-muted-foreground">청크 로딩 중...</p>
                </div>
              </div>
            )}

            {error && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-destructive">{error}</p>
                </div>
              </div>
            )}

            {loadedRegions.length === 0 && !loading && !error && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div
                  className={cn(
                    "flex flex-col items-center gap-4 p-8 rounded-xl",
                    "border-2 border-dashed border-muted-foreground/25",
                    "hover:border-purple-500/50 hover:bg-purple-500/5",
                    "transition-colors cursor-pointer"
                  )}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="p-4 rounded-full bg-purple-500/10">
                    <Upload className="w-12 h-12 text-purple-400" />
                  </div>
                  <div className="text-center">
                    <h3 className="text-lg font-semibold">MCA 파일을 드래그하거나 클릭하세요</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Minecraft Region 파일 (.mca, .mcr) - 여러 파일 선택 가능
                    </p>
                  </div>
                </div>
              </div>
            )}

            {loadedRegions.length > 0 && (
              <Chunk3DViewer
                blocks={blocks}
                sliceY={sliceY}
                className="w-full h-full"
              />
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-4 py-2 text-xs text-muted-foreground border-t">
        <span>
          {blocks.length > 0
            ? `${blocks.length.toLocaleString()} 블록 로드됨`
            : "청크를 선택하세요"}
        </span>
      </footer>
    </div>
  );
}
