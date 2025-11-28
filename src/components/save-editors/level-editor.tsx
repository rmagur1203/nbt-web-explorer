"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save, Globe, Gamepad2, Cloud, MapPin, Settings } from "lucide-react";
import { LevelData, GAME_TYPES, DIFFICULTIES } from "@/lib/save/parser";
import * as nbt from "prismarine-nbt";
import pako from "pako";

interface LevelEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  levelData: LevelData | null;
  onSave: (path: string, data: Uint8Array) => void;
}

export function LevelEditor({
  open,
  onOpenChange,
  levelData,
  onSave,
}: LevelEditorProps) {
  // Form state
  const [worldName, setWorldName] = useState("");
  const [gameType, setGameType] = useState(0);
  const [difficulty, setDifficulty] = useState(2);
  const [hardcore, setHardcore] = useState(false);
  const [spawnX, setSpawnX] = useState(0);
  const [spawnY, setSpawnY] = useState(64);
  const [spawnZ, setSpawnZ] = useState(0);
  const [raining, setRaining] = useState(false);
  const [thundering, setThundering] = useState(false);
  const [dayTime, setDayTime] = useState(0);
  
  // Game rules state
  const [gameRules, setGameRules] = useState<Record<string, string>>({});
  
  const [modified, setModified] = useState(false);
  const [saving, setSaving] = useState(false);

  // Initialize form with level data
  useEffect(() => {
    if (open && levelData) {
      setWorldName(levelData.worldName || "");
      setGameType(levelData.gameType ?? 0);
      setDifficulty(levelData.difficulty ?? 2);
      setHardcore(levelData.hardcore ?? false);
      setSpawnX(levelData.spawnX ?? 0);
      setSpawnY(levelData.spawnY ?? 64);
      setSpawnZ(levelData.spawnZ ?? 0);
      setRaining(levelData.weather?.raining ?? false);
      setThundering(levelData.weather?.thundering ?? false);
      setDayTime(Number(levelData.dayTime ?? 0));
      setGameRules(levelData.gameRules || {});
      setModified(false);
    }
  }, [open, levelData]);

  const handleSave = async () => {
    if (!levelData?.raw) return;

    setSaving(true);
    try {
      // Clone the raw data and update values
      const updatedData = JSON.parse(JSON.stringify(levelData.raw));
      const data = updatedData.Data || updatedData;

      // Update basic values
      data.LevelName = worldName;
      data.GameType = gameType;
      data.Difficulty = difficulty;
      data.hardcore = hardcore ? 1 : 0;
      data.SpawnX = spawnX;
      data.SpawnY = spawnY;
      data.SpawnZ = spawnZ;
      data.raining = raining ? 1 : 0;
      data.thundering = thundering ? 1 : 0;
      data.DayTime = BigInt(dayTime);

      // Update game rules
      if (data.GameRules) {
        Object.assign(data.GameRules, gameRules);
      }

      // Serialize to NBT
      const nbtData = convertToNbt(updatedData);
      const buffer = nbt.writeUncompressed(nbtData, "big");
      const compressed = pako.gzip(buffer);

      onSave("level.dat", new Uint8Array(compressed));
      setModified(false);
      onOpenChange(false);
    } catch (err) {
      console.error("Save error:", err);
    } finally {
      setSaving(false);
    }
  };

  const markModified = () => setModified(true);

  const updateGameRule = (key: string, value: string) => {
    setGameRules(prev => ({ ...prev, [key]: value }));
    markModified();
  };

  // Common game rules for quick editing
  const commonGameRules = [
    { key: "keepInventory", label: "인벤토리 유지", desc: "죽어도 아이템을 잃지 않음" },
    { key: "doDaylightCycle", label: "낮/밤 순환", desc: "시간이 흐름" },
    { key: "doWeatherCycle", label: "날씨 변화", desc: "날씨가 변함" },
    { key: "doMobSpawning", label: "몹 스폰", desc: "몬스터와 동물이 스폰됨" },
    { key: "mobGriefing", label: "몹 그리핑", desc: "몹이 블록을 파괴할 수 있음" },
    { key: "doFireTick", label: "불 번짐", desc: "불이 주변으로 번짐" },
    { key: "pvp", label: "PvP", desc: "플레이어끼리 공격 가능" },
    { key: "doTileDrops", label: "블록 드롭", desc: "블록 파괴 시 아이템 드롭" },
    { key: "naturalRegeneration", label: "자연 회복", desc: "배고픔이 차면 체력 회복" },
    { key: "showDeathMessages", label: "사망 메시지", desc: "사망 시 채팅에 표시" },
    { key: "doInsomnia", label: "팬텀 스폰", desc: "잠을 자지 않으면 팬텀 스폰" },
    { key: "doImmediateRespawn", label: "즉시 리스폰", desc: "사망 화면 없이 즉시 리스폰" },
    { key: "fallDamage", label: "낙하 데미지", desc: "낙하 시 데미지를 받음" },
    { key: "fireDamage", label: "화염 데미지", desc: "불에 데미지를 받음" },
    { key: "drowningDamage", label: "익사 데미지", desc: "물에 빠지면 데미지를 받음" },
    { key: "freezeDamage", label: "동결 데미지", desc: "얼음에 데미지를 받음" },
    { key: "announceAdvancements", label: "발전과제 알림", desc: "발전과제 달성 시 알림" },
    { key: "doEntityDrops", label: "엔티티 드롭", desc: "엔티티가 아이템을 드롭" },
    { key: "doTraderSpawning", label: "상인 스폰", desc: "떠돌이 상인이 스폰됨" },
    { key: "doPatrolSpawning", label: "순찰대 스폰", desc: "약탈자 순찰대가 스폰됨" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-emerald-400" />
              월드 설정 편집
            </span>
            <div className="flex items-center gap-2">
              {modified && (
                <span className="text-xs text-amber-400 px-2 py-1 bg-amber-500/10 rounded">
                  수정됨
                </span>
              )}
              <Button
                variant="default"
                size="sm"
                onClick={handleSave}
                disabled={!modified || saving}
                className="gap-1"
              >
                <Save className="w-4 h-4" />
                저장
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="general" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="flex-shrink-0">
            <TabsTrigger value="general" className="gap-1">
              <Globe className="w-4 h-4" />
              일반
            </TabsTrigger>
            <TabsTrigger value="spawn" className="gap-1">
              <MapPin className="w-4 h-4" />
              스폰
            </TabsTrigger>
            <TabsTrigger value="weather" className="gap-1">
              <Cloud className="w-4 h-4" />
              날씨/시간
            </TabsTrigger>
            <TabsTrigger value="gamerules" className="gap-1">
              <Settings className="w-4 h-4" />
              게임 규칙
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto mt-4">
            <TabsContent value="general" className="m-0 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="worldName">월드 이름</Label>
                <Input
                  id="worldName"
                  value={worldName}
                  onChange={(e) => { setWorldName(e.target.value); markModified(); }}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>게임 모드</Label>
                  <Select
                    value={String(gameType)}
                    onValueChange={(v) => { setGameType(Number(v)); markModified(); }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(GAME_TYPES).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>난이도</Label>
                  <Select
                    value={String(difficulty)}
                    onValueChange={(v) => { setDifficulty(Number(v)); markModified(); }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(DIFFICULTIES).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <div>
                  <Label className="text-base">하드코어 모드</Label>
                  <p className="text-xs text-muted-foreground">죽으면 월드가 삭제됩니다</p>
                </div>
                <Switch
                  checked={hardcore}
                  onCheckedChange={(v) => { setHardcore(v); markModified(); }}
                />
              </div>
            </TabsContent>

            <TabsContent value="spawn" className="m-0 space-y-4">
              <div className="p-4 bg-muted/30 rounded-lg space-y-4">
                <h3 className="font-medium flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  월드 스폰 위치
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="spawnX">X</Label>
                    <Input
                      id="spawnX"
                      type="number"
                      value={spawnX}
                      onChange={(e) => { setSpawnX(Number(e.target.value)); markModified(); }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="spawnY">Y</Label>
                    <Input
                      id="spawnY"
                      type="number"
                      value={spawnY}
                      onChange={(e) => { setSpawnY(Number(e.target.value)); markModified(); }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="spawnZ">Z</Label>
                    <Input
                      id="spawnZ"
                      type="number"
                      value={spawnZ}
                      onChange={(e) => { setSpawnZ(Number(e.target.value)); markModified(); }}
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="weather" className="m-0 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="dayTime">시간 (틱)</Label>
                <Input
                  id="dayTime"
                  type="number"
                  value={dayTime}
                  onChange={(e) => { setDayTime(Number(e.target.value)); markModified(); }}
                />
                <p className="text-xs text-muted-foreground">
                  0 = 일출, 6000 = 정오, 12000 = 일몰, 18000 = 자정
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div>
                    <Label>비</Label>
                    <p className="text-xs text-muted-foreground">비가 내리는 중</p>
                  </div>
                  <Switch
                    checked={raining}
                    onCheckedChange={(v) => { setRaining(v); markModified(); }}
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div>
                    <Label>천둥</Label>
                    <p className="text-xs text-muted-foreground">폭풍우 진행 중</p>
                  </div>
                  <Switch
                    checked={thundering}
                    onCheckedChange={(v) => { setThundering(v); markModified(); }}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="gamerules" className="m-0 overflow-y-auto pr-2" style={{ maxHeight: "calc(85vh - 200px)" }}>
              <div className="space-y-2">
                {commonGameRules.map((rule) => {
                  const isEnabled = gameRules[rule.key] === "true";
                  return (
                    <div
                      key={rule.key}
                      onClick={() => updateGameRule(rule.key, isEnabled ? "false" : "true")}
                      className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                        isEnabled 
                          ? "bg-emerald-500/20 hover:bg-emerald-500/30" 
                          : "bg-muted/30 hover:bg-muted/50"
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-medium ${isEnabled ? "text-emerald-400" : ""}`}>
                            {rule.label}
                          </span>
                          <span className="text-xs text-muted-foreground font-mono">
                            {rule.key}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{rule.desc}</p>
                      </div>
                      <Switch
                        checked={isEnabled}
                        onCheckedChange={(v) => {
                          // Prevent double trigger from click
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="pointer-events-none"
                      />
                    </div>
                  );
                })}
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

// Helper to convert simplified data back to NBT format
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function convertToNbt(data: any): any {
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
    
    // Detect array type
    const firstType = typeof data[0];
    if (firstType === "number" && data.every(x => typeof x === "number")) {
      return { type: "intArray", value: data };
    }
    
    const convertedItems = data.map(item => convertToNbt(item));
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
      result[key] = convertToNbt(value);
    }
    return { type: "compound", value: result };
  }

  return { type: "string", value: String(data) };
}

