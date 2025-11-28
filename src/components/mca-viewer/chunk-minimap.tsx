"use client";

import { useRef, useEffect, useCallback, useState, useMemo } from "react";
import { ZoomIn, ZoomOut, Home } from "lucide-react";
import { cn } from "@/lib/utils";
import { getBiomeColor, getBiomeName } from "@/lib/mca/biomes";

export interface ChunkBiomeData {
  x: number;
  z: number;
  biomes: string[];
  heightMap: number[];
}

interface ChunkMinimapProps {
  availableChunks: [number, number][];
  selectedChunks: [number, number][];
  chunkBiomeData: Map<string, ChunkBiomeData>;
  onSelectChunks: (chunks: [number, number][]) => void;
  className?: string;
}

export function ChunkMinimap({
  availableChunks,
  selectedChunks,
  chunkBiomeData,
  onSelectChunks,
  className,
}: ChunkMinimapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState<{
    x: number;
    z: number;
    biome?: string;
  } | null>(null);
  const [renderMode, setRenderMode] = useState<"biome" | "height">("biome");

  // Zoom and pan state
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panZ, setPanZ] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, z: 0 });
  const [dragStartPan, setDragStartPan] = useState({ x: 0, z: 0 });

  // Selection drag state
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState<{
    x: number;
    z: number;
  } | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<{
    x: number;
    z: number;
  } | null>(null);

  // Calculate bounds and offset for centering
  const bounds = useMemo(() => {
    if (availableChunks.length === 0) {
      return { minX: 0, maxX: 32, minZ: 0, maxZ: 32, offsetX: 0, offsetZ: 0 };
    }

    let minX = Infinity,
      maxX = -Infinity;
    let minZ = Infinity,
      maxZ = -Infinity;

    availableChunks.forEach(([x, z]) => {
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minZ = Math.min(minZ, z);
      maxZ = Math.max(maxZ, z);
    });

    // Calculate offset to center the chunks
    const chunkRangeX = maxX - minX + 1;
    const chunkRangeZ = maxZ - minZ + 1;
    const maxChunks = 32; // 512px / 16px per chunk

    const offsetX = Math.floor((maxChunks - chunkRangeX) / 2) - minX;
    const offsetZ = Math.floor((maxChunks - chunkRangeZ) / 2) - minZ;

    return { minX, maxX, minZ, maxZ, offsetX, offsetZ };
  }, [availableChunks]);

  // Reset view to fit all chunks
  const resetView = useCallback(() => {
    setZoom(1);
    setPanX(0);
    setPanZ(0);
  }, []);

  // Handle wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom((prev) => Math.max(0.5, Math.min(8, prev * delta)));
  }, []);

  // Convert screen coordinates to world coordinates (accounting for zoom and pan)
  const screenToWorld = useCallback(
    (screenX: number, screenY: number, rect: DOMRect) => {
      const canvasSize = 512;
      const scaleX = canvasSize / rect.width;
      const scaleY = canvasSize / rect.height;

      // Convert to canvas coordinates
      const canvasX = (screenX - rect.left) * scaleX;
      const canvasY = (screenY - rect.top) * scaleY;

      // Reverse the zoom and pan transformation
      const worldX = (canvasX - canvasSize / 2 - panX) / zoom + canvasSize / 2;
      const worldY = (canvasY - canvasSize / 2 - panZ) / zoom + canvasSize / 2;

      // Convert to chunk coordinates
      const chunkX = Math.floor(worldX / 16) - bounds.offsetX;
      const chunkZ = Math.floor(worldY / 16) - bounds.offsetZ;

      const localX = Math.floor(worldX % 16);
      const localZ = Math.floor(worldY % 16);

      return { chunkX, chunkZ, localX, localZ };
    },
    [zoom, panX, panZ, bounds]
  );

  // Handle mouse down for dragging or selection
  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (e.button === 1 || (e.button === 0 && e.altKey)) {
        // Middle click or Alt+Left click for panning
        e.preventDefault();
        setIsDragging(true);
        setDragStart({ x: e.clientX, z: e.clientY });
        setDragStartPan({ x: panX, z: panZ });
      } else if (e.button === 0 && !e.altKey) {
        // Left click for selection drag
        const rect = e.currentTarget.getBoundingClientRect();
        const { chunkX, chunkZ } = screenToWorld(e.clientX, e.clientY, rect);
        setIsSelecting(true);
        setSelectionStart({ x: chunkX, z: chunkZ });
        setSelectionEnd({ x: chunkX, z: chunkZ });
      }
    },
    [panX, panZ, screenToWorld]
  );

  // Handle mouse move for dragging or selection
  const handleMouseMoveForDrag = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (isDragging) {
        const dx = e.clientX - dragStart.x;
        const dz = e.clientY - dragStart.z;
        setPanX(dragStartPan.x + dx / zoom);
        setPanZ(dragStartPan.z + dz / zoom);
      } else if (isSelecting) {
        const rect = e.currentTarget.getBoundingClientRect();
        const { chunkX, chunkZ } = screenToWorld(e.clientX, e.clientY, rect);
        setSelectionEnd({ x: chunkX, z: chunkZ });
      }
    },
    [isDragging, dragStart, dragStartPan, zoom, isSelecting, screenToWorld]
  );

  // Handle mouse up to stop dragging or complete selection
  const handleMouseUp = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (isDragging) {
        setIsDragging(false);
        return;
      }

      if (isSelecting && selectionStart && selectionEnd) {
        const minX = Math.min(selectionStart.x, selectionEnd.x);
        const maxX = Math.max(selectionStart.x, selectionEnd.x);
        const minZ = Math.min(selectionStart.z, selectionEnd.z);
        const maxZ = Math.max(selectionStart.z, selectionEnd.z);

        // Check if it's a single click (no drag)
        const isSingleClick = minX === maxX && minZ === maxZ;

        if (isSingleClick) {
          // Single click - select single chunk
          const clickedChunk = availableChunks.find(
            ([cx, cz]) => cx === selectionStart.x && cz === selectionStart.z
          );

          if (clickedChunk) {
            const [x, z] = clickedChunk;
            const isSelected = selectedChunks.some(
              ([cx, cz]) => cx === x && cz === z
            );

            if (e.ctrlKey || e.metaKey || e.shiftKey) {
              // Multi-select mode
              if (isSelected) {
                if (selectedChunks.length > 1) {
                  onSelectChunks(
                    selectedChunks.filter(([cx, cz]) => cx !== x || cz !== z)
                  );
                }
              } else {
                onSelectChunks([...selectedChunks, [x, z]]);
              }
            } else {
              // Single select mode
              onSelectChunks([[x, z]]);
            }
          }
        } else {
          // Drag selection - get all chunks within the selection rectangle
          const chunksInSelection = availableChunks.filter(
            ([cx, cz]) => cx >= minX && cx <= maxX && cz >= minZ && cz <= maxZ
          );

          if (chunksInSelection.length > 0) {
            if (e.ctrlKey || e.metaKey || e.shiftKey) {
              // Add to existing selection
              const existingSet = new Set(
                selectedChunks.map(([x, z]) => `${x},${z}`)
              );
              const newChunks = chunksInSelection.filter(
                ([x, z]) => !existingSet.has(`${x},${z}`)
              );
              onSelectChunks([...selectedChunks, ...newChunks]);
            } else {
              // Replace selection
              onSelectChunks(chunksInSelection);
            }
          }
        }

        setIsSelecting(false);
        setSelectionStart(null);
        setSelectionEnd(null);
      }
    },
    [
      isDragging,
      isSelecting,
      selectionStart,
      selectionEnd,
      availableChunks,
      selectedChunks,
      onSelectChunks,
    ]
  );

  // Render minimap with zoom and pan
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    const { offsetX, offsetZ } = bounds;
    const canvasSize = 512;

    // Clear canvas with dark background
    ctx.fillStyle = "#0a0f14";
    ctx.fillRect(0, 0, canvasSize, canvasSize);

    // Apply zoom and pan transformation
    ctx.save();
    ctx.translate(canvasSize / 2 + panX, canvasSize / 2 + panZ);
    ctx.scale(zoom, zoom);
    ctx.translate(-canvasSize / 2, -canvasSize / 2);

    // Calculate global height range
    let globalMinH = 255;
    let globalMaxH = 0;
    chunkBiomeData.forEach((data) => {
      data.heightMap.forEach((h) => {
        if (h > 0) {
          globalMinH = Math.min(globalMinH, h);
          globalMaxH = Math.max(globalMaxH, h);
        }
      });
    });
    const heightRange = globalMaxH - globalMinH || 1;

    // Draw biome/height data for each chunk
    if (chunkBiomeData.size > 0) {
      // Create offscreen canvas for biome data
      const offscreen = document.createElement("canvas");
      offscreen.width = canvasSize;
      offscreen.height = canvasSize;
      const offCtx = offscreen.getContext("2d");
      if (offCtx) {
        const imgData = offCtx.createImageData(canvasSize, canvasSize);
        const { data } = imgData;

        chunkBiomeData.forEach((chunkData) => {
          const { x: chunkX, z: chunkZ, biomes, heightMap } = chunkData;
          const baseX = (chunkX + offsetX) * 16;
          const baseZ = (chunkZ + offsetZ) * 16;

          for (let localZ = 0; localZ < 16; localZ++) {
            for (let localX = 0; localX < 16; localX++) {
              const pixelX = baseX + localX;
              const pixelZ = baseZ + localZ;

              if (
                pixelX < 0 ||
                pixelX >= canvasSize ||
                pixelZ < 0 ||
                pixelZ >= canvasSize
              )
                continue;

              const idx = localZ * 16 + localX;
              const pixelIdx = (pixelZ * canvasSize + pixelX) * 4;

              if (renderMode === "biome") {
                const biome = biomes[idx] || "plains";
                const biomeColor = getBiomeColor(biome);
                const height = heightMap[idx] || 64;
                const heightFactor =
                  0.6 + 0.4 * ((height - globalMinH) / heightRange);

                data[pixelIdx] = Math.round(biomeColor[0] * heightFactor);
                data[pixelIdx + 1] = Math.round(biomeColor[1] * heightFactor);
                data[pixelIdx + 2] = Math.round(biomeColor[2] * heightFactor);
                data[pixelIdx + 3] = 255;
              } else {
                const height = heightMap[idx] || 64;
                const normalizedHeight = (height - globalMinH) / heightRange;

                let r, g, b;
                if (normalizedHeight < 0.3) {
                  const t = normalizedHeight / 0.3;
                  r = Math.round(32 + 32 * t);
                  g = Math.round(64 + 64 * t);
                  b = Math.round(160 + 40 * t);
                } else if (normalizedHeight < 0.6) {
                  const t = (normalizedHeight - 0.3) / 0.3;
                  r = Math.round(64 + 70 * t);
                  g = Math.round(128 - 30 * t);
                  b = Math.round(64 - 20 * t);
                } else {
                  const t = (normalizedHeight - 0.6) / 0.4;
                  r = Math.round(134 + 100 * t);
                  g = Math.round(98 + 140 * t);
                  b = Math.round(44 + 200 * t);
                }

                data[pixelIdx] = r;
                data[pixelIdx + 1] = g;
                data[pixelIdx + 2] = b;
                data[pixelIdx + 3] = 255;
              }
            }
          }
        });

        offCtx.putImageData(imgData, 0, 0);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(offscreen, 0, 0);
      }
    } else {
      // No biome data, draw simple chunk indicators
      ctx.fillStyle = "#1e293b";
      availableChunks.forEach(([x, z]) => {
        ctx.fillRect((x + offsetX) * 16, (z + offsetZ) * 16, 16, 16);
      });
    }

    // Draw chunk borders
    ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
    ctx.lineWidth = 0.5 / zoom;
    availableChunks.forEach(([x, z]) => {
      ctx.strokeRect((x + offsetX) * 16, (z + offsetZ) * 16, 16, 16);
    });

    // Draw selected chunks with highlight
    ctx.fillStyle = "rgba(59, 130, 246, 0.4)";
    ctx.strokeStyle = "rgba(59, 130, 246, 1)";
    ctx.lineWidth = 2 / zoom;
    selectedChunks.forEach(([x, z]) => {
      ctx.fillRect((x + offsetX) * 16, (z + offsetZ) * 16, 16, 16);
      ctx.strokeRect((x + offsetX) * 16, (z + offsetZ) * 16, 16, 16);
    });

    // Draw hovered chunk
    if (hovered && !isSelecting) {
      ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
      ctx.lineWidth = 2 / zoom;
      ctx.strokeRect(
        (hovered.x + offsetX) * 16,
        (hovered.z + offsetZ) * 16,
        16,
        16
      );
    }

    // Draw selection rectangle
    if (isSelecting && selectionStart && selectionEnd) {
      const minX = Math.min(selectionStart.x, selectionEnd.x);
      const maxX = Math.max(selectionStart.x, selectionEnd.x);
      const minZ = Math.min(selectionStart.z, selectionEnd.z);
      const maxZ = Math.max(selectionStart.z, selectionEnd.z);

      // Highlight chunks that would be selected
      ctx.fillStyle = "rgba(34, 197, 94, 0.3)";
      availableChunks.forEach(([cx, cz]) => {
        if (cx >= minX && cx <= maxX && cz >= minZ && cz <= maxZ) {
          ctx.fillRect((cx + offsetX) * 16, (cz + offsetZ) * 16, 16, 16);
        }
      });

      // Draw selection rectangle outline
      ctx.strokeStyle = "rgba(34, 197, 94, 1)";
      ctx.lineWidth = 2 / zoom;
      ctx.setLineDash([4 / zoom, 4 / zoom]);
      ctx.strokeRect(
        (minX + offsetX) * 16,
        (minZ + offsetZ) * 16,
        (maxX - minX + 1) * 16,
        (maxZ - minZ + 1) * 16
      );
      ctx.setLineDash([]);
    }

    ctx.restore();
  }, [
    availableChunks,
    selectedChunks,
    chunkBiomeData,
    hovered,
    renderMode,
    bounds,
    zoom,
    panX,
    panZ,
    isSelecting,
    selectionStart,
    selectionEnd,
  ]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      // Handle panning
      if (isDragging) {
        handleMouseMoveForDrag(e);
        return;
      }

      const rect = e.currentTarget.getBoundingClientRect();
      const {
        chunkX: x,
        chunkZ: z,
        localX,
        localZ,
      } = screenToWorld(e.clientX, e.clientY, rect);

      // Handle selection drag
      if (isSelecting) {
        setSelectionEnd({ x, z });
      }

      // Update hover state
      if (availableChunks.some(([cx, cz]) => cx === x && cz === z)) {
        const chunkData = chunkBiomeData.get(`${x},${z}`);
        let biome: string | undefined;
        if (
          chunkData &&
          localX >= 0 &&
          localX < 16 &&
          localZ >= 0 &&
          localZ < 16
        ) {
          biome = chunkData.biomes[localZ * 16 + localX];
        }
        setHovered({ x, z, biome });
      } else {
        setHovered(null);
      }
    },
    [
      availableChunks,
      chunkBiomeData,
      screenToWorld,
      isDragging,
      isSelecting,
      handleMouseMoveForDrag,
    ]
  );

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <canvas
        ref={canvasRef}
        width={512}
        height={512}
        className={cn(
          "w-full h-full rounded-lg",
          isDragging
            ? "cursor-grabbing"
            : isSelecting
            ? "cursor-crosshair"
            : "cursor-crosshair"
        )}
        style={{ imageRendering: "pixelated" }}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
          setHovered(null);
          setIsDragging(false);
          setIsSelecting(false);
          setSelectionStart(null);
          setSelectionEnd(null);
        }}
        onWheel={handleWheel}
      />

      {/* Mode toggle */}
      <div className="absolute top-2 left-2 flex gap-1">
        <button
          onClick={() => setRenderMode("biome")}
          className={cn(
            "px-2 py-1 rounded text-xs font-medium transition-colors",
            renderMode === "biome"
              ? "bg-emerald-600 text-white"
              : "bg-slate-700/80 text-slate-300 hover:bg-slate-600"
          )}
        >
          바이옴
        </button>
        <button
          onClick={() => setRenderMode("height")}
          className={cn(
            "px-2 py-1 rounded text-xs font-medium transition-colors",
            renderMode === "height"
              ? "bg-amber-600 text-white"
              : "bg-slate-700/80 text-slate-300 hover:bg-slate-600"
          )}
        >
          높이
        </button>
      </div>

      {/* Zoom controls */}
      <div className="absolute top-2 right-2 flex flex-col gap-1">
        <button
          onClick={() => setZoom((prev) => Math.min(8, prev * 1.2))}
          className="p-1.5 rounded bg-slate-700/80 text-slate-300 hover:bg-slate-600 transition-colors"
          title="확대"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={() => setZoom((prev) => Math.max(0.5, prev / 1.2))}
          className="p-1.5 rounded bg-slate-700/80 text-slate-300 hover:bg-slate-600 transition-colors"
          title="축소"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={resetView}
          className="p-1.5 rounded bg-slate-700/80 text-slate-300 hover:bg-slate-600 transition-colors"
          title="초기화"
        >
          <Home className="w-4 h-4" />
        </button>
      </div>

      {/* Zoom indicator and hint */}
      <div className="absolute bottom-2 right-2 bg-black/70 backdrop-blur-sm px-2 py-1 rounded text-xs text-slate-300 flex items-center gap-2">
        <span>{Math.round(zoom * 100)}%</span>
        <span className="text-slate-500">|</span>
        <span className="text-slate-400">
          드래그: 범위 선택, Alt+드래그: 이동, 스크롤: 확대/축소
        </span>
      </div>

      {/* Chunk info */}
      {hovered && (
        <div className="absolute bottom-2 left-2 bg-black/80 backdrop-blur-sm px-3 py-2 rounded-lg text-xs space-y-1">
          <div className="text-slate-200 font-medium">
            청크 [{hovered.x}, {hovered.z}]
          </div>
          {hovered.biome && (
            <div className="text-slate-400">
              🌿 {getBiomeName(hovered.biome)}
            </div>
          )}
        </div>
      )}

      {/* Selection count */}
      <div className="absolute top-2 right-2 bg-black/80 backdrop-blur-sm px-2 py-1 rounded text-xs text-slate-300">
        {selectedChunks.length} / {availableChunks.length} 청크 선택
      </div>
    </div>
  );
}
