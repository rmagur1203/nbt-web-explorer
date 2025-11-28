"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  FolderOpen,
  Globe,
  User,
  MapPin,
  Clock,
  Gamepad2,
  Cloud,
  Database,
  ChevronRight,
  Package,
  Eye,
  Download,
  FileEdit,
  Save,
} from "lucide-react";
import * as nbt from "prismarine-nbt";
import pako from "pako";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  parseSaveFolder,
  FileEntry,
  getDimensionStats,
  GAME_TYPES,
  DIFFICULTIES,
  DimensionData,
  LevelData,
} from "@/lib/save/parser";
import { useSaveStore } from "@/lib/store/save-store";
import { cn } from "@/lib/utils";
import { NbtEditorDialog } from "@/components/nbt-editor-dialog";
import { LevelEditor, PlayerEditor } from "@/components/save-editors";
import { PlayerData } from "@/lib/save/parser";

export default function SaveLoaderPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Use zustand store for save data
  const { 
    save, 
    setSave, 
    selectedDimension, 
    setSelectedDimension,
    modifiedFiles,
    markFileModified,
    downloadAsZip
  } = useSaveStore();
  
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  
  // NBT Editor Dialog state
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorTitle, setEditorTitle] = useState("");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [editorData, setEditorData] = useState<any>(null);
  const [editorFilePath, setEditorFilePath] = useState("");
  
  // GUI Editor states
  const [levelEditorOpen, setLevelEditorOpen] = useState(false);
  const [playerEditorOpen, setPlayerEditorOpen] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerData | null>(null);

  const handleFolderSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;

      setLoading(true);
      setError(null);
      setProgress(0);
      setProgressMessage("파일 분석 중...");

      try {
        // Convert FileList to FileEntry array
        const entries: FileEntry[] = [];
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          // webkitRelativePath contains the full path from the selected folder
          const path = (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name;
          entries.push({
            name: file.name,
            path: path.toLowerCase(),
            file,
          });
        }

        const saveData = await parseSaveFolder(entries, (prog, msg) => {
          setProgress(prog);
          setProgressMessage(msg);
        });

        setSave(saveData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "폴더를 읽는 중 오류가 발생했습니다.");
      } finally {
        setLoading(false);
        setProgress(100);
        setProgressMessage("완료");
      }

      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    []
  );

  const formatTime = (ticks: number) => {
    const totalSeconds = Math.floor(ticks / 20);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    return `${hours}시간 ${minutes}분`;
  };

  const formatDate = (timestamp: number) => {
    if (!timestamp) return "알 수 없음";
    return new Date(Number(timestamp)).toLocaleString("ko-KR");
  };

  const getDimension = (): DimensionData | null => {
    if (!save) return null;
    switch (selectedDimension) {
      case "overworld": return save.dimensions.overworld;
      case "nether": return save.dimensions.nether;
      case "end": return save.dimensions.end;
    }
  };

  const handleDownload = useCallback(async () => {
    if (!save) return;
    
    setDownloading(true);
    setProgress(0);
    setProgressMessage("다운로드 준비 중...");
    
    try {
      await downloadAsZip((prog, msg) => {
        setProgress(prog);
        setProgressMessage(msg);
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "다운로드 중 오류가 발생했습니다.");
    } finally {
      setDownloading(false);
      setProgress(100);
      setProgressMessage("완료");
    }
  }, [save, downloadAsZip]);

  // Open NBT editor for level.dat
  const handleEditLevelDat = useCallback(() => {
    if (!save?.levelData?.raw) return;
    setEditorTitle("level.dat 편집");
    setEditorData(save.levelData.raw);
    setEditorFilePath("level.dat");
    setEditorOpen(true);
  }, [save]);
  
  // Open GUI editor for level.dat
  const handleGuiEditLevelDat = useCallback(() => {
    if (!save?.levelData) return;
    setLevelEditorOpen(true);
  }, [save]);

  // Open NBT editor for player data
  const handleEditPlayer = useCallback((player: { uuid: string; filename: string; raw: unknown }) => {
    setEditorTitle(`플레이어 데이터 편집 (${player.uuid.substring(0, 8)}...)`);
    setEditorData(player.raw);
    setEditorFilePath(`playerdata/${player.filename}`);
    setEditorOpen(true);
  }, []);
  
  // Open GUI editor for player data
  const handleGuiEditPlayer = useCallback((player: PlayerData) => {
    setSelectedPlayer(player);
    setPlayerEditorOpen(true);
  }, []);

  // Open NBT editor for data files
  const handleEditDataFile = useCallback((dataFile: { name: string; path: string; raw: unknown }) => {
    setEditorTitle(`${dataFile.name} 편집`);
    setEditorData(dataFile.raw);
    setEditorFilePath(dataFile.path);
    setEditorOpen(true);
  }, []);

  // Handle save from editor
  const handleEditorSave = useCallback((path: string, data: Uint8Array) => {
    markFileModified(path, data);
  }, [markFileModified]);

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="flex items-center gap-3 px-6 py-4 border-b bg-gradient-to-r from-card to-background">
        <Link href="/">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div className="p-2 rounded-lg bg-emerald-500/10 ring-1 ring-emerald-500/20">
          <FolderOpen className="w-6 h-6 text-emerald-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Save Folder Loader</h1>
          <p className="text-xs text-muted-foreground">
            마인크래프트 세이브 폴더 전체 로더
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {/* Show modified files count */}
          {save && modifiedFiles.size > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 ring-1 ring-amber-500/20 text-amber-400 text-sm">
              <FileEdit className="w-4 h-4" />
              {modifiedFiles.size}개 수정됨
            </div>
          )}
          
          {/* Download button */}
          {save && (
            <Button
              onClick={handleDownload}
              variant="default"
              className="gap-2 bg-emerald-600 hover:bg-emerald-700"
              disabled={downloading}
            >
              <Download className="w-4 h-4" />
              {downloading ? "다운로드 중..." : "ZIP 다운로드"}
            </Button>
          )}
          
          <input
            ref={fileInputRef}
            type="file"
            // @ts-expect-error webkitdirectory is not standard
            webkitdirectory="true"
            directory=""
            multiple
            onChange={handleFolderSelect}
            className="hidden"
          />
          <Button
            onClick={() => fileInputRef.current?.click()}
            variant="outline"
            className="gap-2"
            disabled={loading || downloading}
          >
            <FolderOpen className="w-4 h-4" />
            세이브 폴더 열기
          </Button>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-hidden">
        {(loading || downloading) && (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <div className="relative w-48 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 bg-emerald-500 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-sm text-muted-foreground">{progressMessage}</p>
            <p className="text-xs text-muted-foreground">{progress}%</p>
          </div>
        )}

        {error && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-destructive">{error}</p>
            </div>
          </div>
        )}

        {!save && !loading && !error && (
          <div className="flex items-center justify-center h-full">
            <div
              className={cn(
                "flex flex-col items-center gap-4 p-8 rounded-xl",
                "border-2 border-dashed border-muted-foreground/25",
                "hover:border-emerald-500/50 hover:bg-emerald-500/5",
                "transition-colors cursor-pointer"
              )}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="p-4 rounded-full bg-emerald-500/10">
                <FolderOpen className="w-12 h-12 text-emerald-400" />
              </div>
              <div className="text-center">
                <h3 className="text-lg font-semibold">세이브 폴더를 선택하세요</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  .minecraft/saves/[월드명] 폴더를 선택해주세요
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  level.dat, region 파일, 플레이어 데이터 등이 자동으로 로드됩니다
                </p>
              </div>
            </div>
          </div>
        )}

        {save && !loading && (
          <div className="h-full flex">
            {/* Left sidebar - World info */}
            <div className="w-80 border-r bg-card/50 p-4 overflow-y-auto">
              <div className="space-y-6">
                {/* World name */}
                <div>
                  <h2 className="text-lg font-bold flex items-center gap-2">
                    <Globe className="w-5 h-5 text-emerald-400" />
                    {save.name}
                  </h2>
                  {save.levelData && (
                    <p className="text-xs text-muted-foreground mt-1">
                      버전: {save.levelData.version}
                    </p>
                  )}
                </div>

                {/* World stats */}
                {save.levelData && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Gamepad2 className="w-4 h-4 text-muted-foreground" />
                      <span>게임 모드: {GAME_TYPES[save.levelData.gameType] || "알 수 없음"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="w-4 h-4 flex items-center justify-center text-muted-foreground">⚔️</span>
                      <span>난이도: {DIFFICULTIES[save.levelData.difficulty] || "알 수 없음"}</span>
                      {save.levelData.hardcore && (
                        <span className="px-1.5 py-0.5 bg-red-500/20 text-red-400 text-xs rounded">하드코어</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <span>플레이 시간: {formatTime(save.levelData.time)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      <span>스폰: {save.levelData.spawnX}, {save.levelData.spawnY}, {save.levelData.spawnZ}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Cloud className="w-4 h-4 text-muted-foreground" />
                      <span>날씨: {save.levelData.weather.raining ? "비" : save.levelData.weather.thundering ? "천둥" : "맑음"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Database className="w-4 h-4" />
                      <span>마지막 플레이: {formatDate(save.levelData.lastPlayed)}</span>
                    </div>
                    
                    {/* Edit level.dat buttons */}
                    <div className="flex gap-2 mt-2">
                      <Button
                        variant="default"
                        size="sm"
                        onClick={handleGuiEditLevelDat}
                        className="flex-1 gap-1 bg-emerald-600 hover:bg-emerald-700"
                      >
                        <FileEdit className="w-3 h-3" />
                        편집
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleEditLevelDat}
                        className="gap-1"
                        title="NBT 트리로 편집"
                      >
                        NBT
                      </Button>
                    </div>
                  </div>
                )}

                {/* Dimension stats */}
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground">차원</h3>
                  {["overworld", "nether", "end"].map((dim) => {
                    const dimension = save.dimensions[dim as keyof typeof save.dimensions];
                    if (!dimension) return null;
                    const stats = getDimensionStats(dimension);
                    return (
                      <button
                        key={dim}
                        onClick={() => setSelectedDimension(dim as "overworld" | "nether" | "end")}
                        className={cn(
                          "w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors",
                          selectedDimension === dim
                            ? "bg-emerald-500/20 text-emerald-400"
                            : "hover:bg-muted/50"
                        )}
                      >
                        <span className="flex items-center gap-2">
                          {dim === "overworld" && "🌍"}
                          {dim === "nether" && "🔥"}
                          {dim === "end" && "🌌"}
                          {dim === "overworld" ? "오버월드" : dim === "nether" ? "네더" : "엔드"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {stats.regionCount} region / {stats.chunkCount} 청크
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Players */}
                {save.players.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium text-muted-foreground">플레이어 ({save.players.length})</h3>
                    {save.players.map((player) => (
                      <div
                        key={player.uuid}
                        className="px-3 py-2 rounded-lg bg-muted/30 text-sm group"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-muted-foreground" />
                            <span className="font-mono text-xs truncate">{player.uuid.slice(0, 8)}...</span>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleGuiEditPlayer(player)}
                              className="h-6 px-2 text-xs"
                              title="간편 편집"
                            >
                              <FileEdit className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditPlayer(player)}
                              className="h-6 px-2 text-xs"
                              title="NBT 편집"
                            >
                              NBT
                            </Button>
                          </div>
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground space-y-0.5">
                          <div>❤️ {player.health}/20 | 🍖 {player.foodLevel}/20 | ✨ Lv.{player.xpLevel}</div>
                          <div>📍 {Math.round(player.position[0])}, {Math.round(player.position[1])}, {Math.round(player.position[2])}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Data files */}
                {save.dataFiles.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium text-muted-foreground">데이터 파일 ({save.dataFiles.length})</h3>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {save.dataFiles.map((file, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between gap-2 px-2 py-1 text-xs text-muted-foreground hover:bg-muted/30 rounded group"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <Package className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">{file.name}</span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditDataFile(file)}
                            className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                          >
                            <FileEdit className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Main area - Dimension viewer */}
            <div className="flex-1 flex flex-col">
              <Tabs defaultValue="map" className="flex-1 flex flex-col">
                <div className="border-b px-4">
                  <TabsList className="h-12">
                    <TabsTrigger value="map" className="gap-2">
                      <Globe className="w-4 h-4" />
                      지도
                    </TabsTrigger>
                    <TabsTrigger value="regions" className="gap-2">
                      <Database className="w-4 h-4" />
                      Region 파일
                    </TabsTrigger>
                    <TabsTrigger value="gamerules" className="gap-2">
                      <Gamepad2 className="w-4 h-4" />
                      게임 규칙
                    </TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="map" className="flex-1 p-4 m-0">
                  <DimensionMapView dimension={getDimension()} onOpenViewer={() => router.push("/mca")} />
                </TabsContent>

                <TabsContent value="regions" className="flex-1 p-4 m-0 overflow-auto">
                  <RegionListView dimension={getDimension()} />
                </TabsContent>

                <TabsContent value="gamerules" className="flex-1 p-4 m-0 overflow-hidden">
                  <GameRulesView 
                    gameRules={save.levelData?.gameRules || {}} 
                    levelData={save.levelData}
                    onSave={handleEditorSave}
                  />
                </TabsContent>
              </Tabs>
            </div>
          </div>
        )}
      </main>

      {/* NBT Editor Dialog */}
      <NbtEditorDialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        title={editorTitle}
        nbtData={editorData}
        filePath={editorFilePath}
        onSave={handleEditorSave}
      />
      
      {/* GUI Level Editor */}
      <LevelEditor
        open={levelEditorOpen}
        onOpenChange={setLevelEditorOpen}
        levelData={save?.levelData || null}
        onSave={handleEditorSave}
      />
      
      {/* GUI Player Editor */}
      <PlayerEditor
        open={playerEditorOpen}
        onOpenChange={setPlayerEditorOpen}
        player={selectedPlayer}
        onSave={handleEditorSave}
      />
    </div>
  );
}

// Dimension map view component
function DimensionMapView({ dimension, onOpenViewer }: { dimension: DimensionData | null; onOpenViewer: () => void }) {
  if (!dimension || dimension.regions.size === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        이 차원에 Region 파일이 없습니다
      </div>
    );
  }

  const stats = getDimensionStats(dimension);

  return (
    <div className="h-full flex flex-col">
      <div className="mb-4 text-sm text-muted-foreground">
        {stats.regionCount} Region 파일, {stats.chunkCount} 청크
        {stats.regionCount > 0 && (
          <span className="ml-2">
            (X: {stats.bounds.minX} ~ {stats.bounds.maxX}, Z: {stats.bounds.minZ} ~ {stats.bounds.maxZ})
          </span>
        )}
      </div>
      <div className="flex-1 flex items-center justify-center">
        <button
          onClick={onOpenViewer}
          className={cn(
            "flex flex-col items-center gap-4 p-8 rounded-xl",
            "border-2 border-dashed border-muted-foreground/25",
            "hover:border-purple-500/50 hover:bg-purple-500/5",
            "transition-colors cursor-pointer"
          )}
        >
          <Eye className="w-12 h-12 text-purple-400" />
          <div className="text-center">
            <h3 className="text-lg font-semibold">3D 뷰어에서 열기</h3>
            <p className="text-sm text-muted-foreground mt-1">
              현재 차원의 Region 파일을 MCA Chunk Viewer에서 탐색하세요
            </p>
            <p className="text-xs text-emerald-400 mt-2">
              ✓ 로드된 데이터가 유지됩니다
            </p>
          </div>
          <ChevronRight className="w-6 h-6 text-muted-foreground" />
        </button>
      </div>
    </div>
  );
}

// Region list view component
function RegionListView({ dimension }: { dimension: DimensionData | null }) {
  if (!dimension || dimension.regions.size === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        이 차원에 Region 파일이 없습니다
      </div>
    );
  }

  const regions = Array.from(dimension.regions.entries()).sort((a, b) => {
    const [ax, az] = a[0].split(",").map(Number);
    const [bx, bz] = b[0].split(",").map(Number);
    return ax - bx || az - bz;
  });

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
      {regions.map(([key, region]) => (
        <div
          key={key}
          className="p-4 rounded-lg bg-card border hover:border-primary/50 transition-colors"
        >
          <div className="font-medium">{region.filename}</div>
          <div className="text-xs text-muted-foreground mt-1">
            Region ({region.regionX}, {region.regionZ})
          </div>
          <div className="text-xs text-muted-foreground">
            {region.regionData.availableChunks.length} 청크
          </div>
          <div className="text-xs text-muted-foreground">
            {(region.buffer.length / 1024).toFixed(1)} KB
          </div>
        </div>
      ))}
    </div>
  );
}

// Game rules view component
function GameRulesView({ 
  gameRules, 
  levelData,
  onSave 
}: { 
  gameRules: Record<string, string>;
  levelData: LevelData | null;
  onSave: (path: string, data: Uint8Array) => void;
}) {
  const [localRules, setLocalRules] = useState<Record<string, string>>(gameRules);
  const [modified, setModified] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState("");
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  
  // Sync with props when gameRules changes
  useEffect(() => {
    setLocalRules(gameRules);
    setModified(false);
  }, [gameRules]);

  const rules = Object.entries(localRules)
    .filter(([key]) => filter === "" || key.toLowerCase().includes(filter.toLowerCase()))
    .sort((a, b) => a[0].localeCompare(b[0]));

  const updateRule = (key: string, newValue: string) => {
    setLocalRules(prev => ({ ...prev, [key]: newValue }));
    setModified(true);
  };

  const toggleRule = (key: string, currentValue: string) => {
    if (currentValue === "true") {
      updateRule(key, "false");
    } else if (currentValue === "false") {
      updateRule(key, "true");
    }
  };

  const startEditing = (key: string, value: string) => {
    setEditingKey(key);
    setEditValue(value);
  };

  const finishEditing = () => {
    if (editingKey && editValue !== localRules[editingKey]) {
      updateRule(editingKey, editValue);
    }
    setEditingKey(null);
    setEditValue("");
  };

  const handleSave = async () => {
    if (!levelData?.raw || !modified) return;

    setSaving(true);
    try {
      // Clone the raw data and update game rules
      const updatedData = JSON.parse(JSON.stringify(levelData.raw));
      const data = updatedData.Data || updatedData;
      
      if (data.GameRules) {
        Object.assign(data.GameRules, localRules);
      }

      // Serialize to NBT
      const nbtData = convertLevelToNbt(updatedData);
      const buffer = nbt.writeUncompressed(nbtData, "big");
      const compressed = pako.gzip(buffer);

      onSave("level.dat", new Uint8Array(compressed));
      setModified(false);
    } catch (err) {
      console.error("Save error:", err);
    } finally {
      setSaving(false);
    }
  };

  if (Object.keys(gameRules).length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        게임 규칙 데이터가 없습니다
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col" style={{ maxHeight: "calc(100vh - 250px)" }}>
      {/* Header with search and save */}
      <div className="flex items-center gap-2 mb-4 flex-shrink-0">
        <input
          type="text"
          placeholder="규칙 검색..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="flex-1 px-3 py-2 rounded-lg bg-muted/50 border text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
        {modified && (
          <Button
            onClick={handleSave}
            disabled={saving}
            className="gap-1 bg-emerald-600 hover:bg-emerald-700"
            size="sm"
          >
            <Save className="w-4 h-4" />
            {saving ? "저장 중..." : "저장"}
          </Button>
        )}
      </div>
      
      {/* Rules list - scrollable */}
      <div className="flex-1 overflow-y-auto min-h-0" style={{ maxHeight: "calc(100vh - 350px)" }}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 pb-4">
          {rules.map(([key, value]) => {
            const isBooleanRule = value === "true" || value === "false";
            const isTrue = value === "true";
            const isEditing = editingKey === key;
            
            return (
              <div
                key={key}
                className={cn(
                  "flex items-center justify-between px-3 py-2 rounded-lg border text-sm transition-colors",
                  isBooleanRule && isTrue 
                    ? "bg-emerald-500/10 border-emerald-500/30" 
                    : "bg-card"
                )}
              >
                <span className="font-mono text-xs truncate flex-1 mr-2" title={key}>{key}</span>
                
                {isEditing ? (
                  <input
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={finishEditing}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") finishEditing();
                      if (e.key === "Escape") {
                        setEditingKey(null);
                        setEditValue("");
                      }
                    }}
                    autoFocus
                    className="w-24 px-2 py-0.5 rounded text-xs bg-background border focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                ) : isBooleanRule ? (
                  <button
                    onClick={() => toggleRule(key, value)}
                    className={cn(
                      "px-2 py-0.5 rounded text-xs cursor-pointer transition-colors",
                      isTrue 
                        ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30" 
                        : "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                    )}
                  >
                    {value}
                  </button>
                ) : (
                  <button
                    onClick={() => startEditing(key, value)}
                    className="px-2 py-0.5 rounded text-xs bg-muted text-muted-foreground hover:bg-muted/80 cursor-pointer"
                    title="클릭하여 편집"
                  >
                    {value}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Footer info */}
      <div className="mt-2 pt-2 border-t text-xs text-muted-foreground flex-shrink-0">
        총 {Object.keys(localRules).length}개 규칙 {filter && `(${rules.length}개 표시)`}
        {modified && <span className="ml-2 text-amber-400">• 수정됨</span>}
        <span className="ml-2">• 값을 클릭하여 편집</span>
      </div>
    </div>
  );
}

// Helper to convert level data to NBT format
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function convertLevelToNbt(data: any): any {
  if (data === null || data === undefined) {
    return { type: "byte", value: 0 };
  }

  if (typeof data === "bigint") {
    return { type: "long", value: [Number(data >> BigInt(32)), Number(data & BigInt(0xffffffff))] };
  }

  if (typeof data === "number") {
    if (Number.isInteger(data)) {
      if (data >= -128 && data <= 127) {
        return { type: "byte", value: data };
      } else if (data >= -32768 && data <= 32767) {
        return { type: "short", value: data };
      } else {
        return { type: "int", value: data };
      }
    }
    return { type: "double", value: data };
  }

  if (typeof data === "string") {
    return { type: "string", value: data };
  }

  if (typeof data === "boolean") {
    return { type: "byte", value: data ? 1 : 0 };
  }

  if (Array.isArray(data)) {
    if (data.length === 0) {
      return { type: "list", value: { type: "end", value: [] } };
    }
    
    const firstType = typeof data[0];
    if (firstType === "number" && data.every(x => typeof x === "number")) {
      return { type: "intArray", value: data };
    }
    
    const convertedItems = data.map(item => convertLevelToNbt(item));
    return {
      type: "list",
      value: {
        type: convertedItems[0]?.type || "compound",
        value: convertedItems.map(item => item.value),
      },
    };
  }

  if (typeof data === "object") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      result[key] = convertLevelToNbt(value);
    }
    return { type: "compound", value: result };
  }

  return { type: "string", value: String(data) };
}

