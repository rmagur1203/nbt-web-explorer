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
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save, User, Heart, MapPin, Sparkles, Package } from "lucide-react";
import { PlayerData, GAME_TYPES, InventoryItem } from "@/lib/save/parser";
import * as nbt from "prismarine-nbt";
import pako from "pako";

interface PlayerEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  player: PlayerData | null;
  onSave: (path: string, data: Uint8Array) => void;
}

export function PlayerEditor({
  open,
  onOpenChange,
  player,
  onSave,
}: PlayerEditorProps) {
  // Form state
  const [health, setHealth] = useState(20);
  const [foodLevel, setFoodLevel] = useState(20);
  const [saturation, setSaturation] = useState(5);
  const [xpLevel, setXpLevel] = useState(0);
  const [xpTotal, setXpTotal] = useState(0);
  const [gameType, setGameType] = useState(0);
  const [posX, setPosX] = useState(0);
  const [posY, setPosY] = useState(64);
  const [posZ, setPosZ] = useState(0);
  const [dimension, setDimension] = useState("minecraft:overworld");
  
  const [modified, setModified] = useState(false);
  const [saving, setSaving] = useState(false);

  // Initialize form with player data
  useEffect(() => {
    if (open && player) {
      setHealth(player.health ?? 20);
      setFoodLevel(player.foodLevel ?? 20);
      setSaturation(player.raw?.foodSaturationLevel ?? 5);
      setXpLevel(player.xpLevel ?? 0);
      setXpTotal(player.raw?.XpTotal ?? 0);
      setGameType(player.gameType ?? 0);
      setPosX(player.position?.[0] ?? 0);
      setPosY(player.position?.[1] ?? 64);
      setPosZ(player.position?.[2] ?? 0);
      setDimension(player.dimension || "minecraft:overworld");
      setModified(false);
    }
  }, [open, player]);

  const handleSave = async () => {
    if (!player?.raw) return;

    setSaving(true);
    try {
      // Clone the raw data and update values
      const updatedData = JSON.parse(JSON.stringify(player.raw));

      // Update values
      updatedData.Health = health;
      updatedData.foodLevel = foodLevel;
      updatedData.foodSaturationLevel = saturation;
      updatedData.XpLevel = xpLevel;
      updatedData.XpTotal = xpTotal;
      updatedData.playerGameType = gameType;
      updatedData.Pos = [posX, posY, posZ];
      updatedData.Dimension = dimension;

      // Serialize to NBT
      const nbtData = convertToNbt(updatedData);
      const buffer = nbt.writeUncompressed(nbtData, "big");
      const compressed = pako.gzip(buffer);

      onSave(`playerdata/${player.filename}`, new Uint8Array(compressed));
      setModified(false);
      onOpenChange(false);
    } catch (err) {
      console.error("Save error:", err);
    } finally {
      setSaving(false);
    }
  };

  const markModified = () => setModified(true);

  const dimensions = [
    { value: "minecraft:overworld", label: "오버월드" },
    { value: "minecraft:the_nether", label: "네더" },
    { value: "minecraft:the_end", label: "엔드" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <User className="w-5 h-5 text-blue-400" />
              플레이어 편집
              {player && (
                <span className="text-xs text-muted-foreground font-mono">
                  ({player.uuid.slice(0, 8)}...)
                </span>
              )}
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

        <Tabs defaultValue="stats" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="flex-shrink-0">
            <TabsTrigger value="stats" className="gap-1">
              <Heart className="w-4 h-4" />
              스탯
            </TabsTrigger>
            <TabsTrigger value="position" className="gap-1">
              <MapPin className="w-4 h-4" />
              위치
            </TabsTrigger>
            <TabsTrigger value="xp" className="gap-1">
              <Sparkles className="w-4 h-4" />
              경험치
            </TabsTrigger>
            <TabsTrigger value="inventory" className="gap-1">
              <Package className="w-4 h-4" />
              인벤토리
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto mt-4">
            <TabsContent value="stats" className="m-0 space-y-6">
              {/* Health */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <span className="text-red-400">❤️</span> 체력
                  </Label>
                  <span className="text-sm font-mono">{health} / 20</span>
                </div>
                <Slider
                  value={[health]}
                  max={20}
                  min={0}
                  step={1}
                  onValueChange={([v]) => { setHealth(v); markModified(); }}
                  className="[&_[role=slider]]:bg-red-500"
                />
              </div>

              {/* Food */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <span>🍖</span> 배고픔
                  </Label>
                  <span className="text-sm font-mono">{foodLevel} / 20</span>
                </div>
                <Slider
                  value={[foodLevel]}
                  max={20}
                  min={0}
                  step={1}
                  onValueChange={([v]) => { setFoodLevel(v); markModified(); }}
                  className="[&_[role=slider]]:bg-amber-500"
                />
              </div>

              {/* Saturation */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <span>🥩</span> 포만감
                  </Label>
                  <span className="text-sm font-mono">{saturation.toFixed(1)}</span>
                </div>
                <Slider
                  value={[saturation]}
                  max={20}
                  min={0}
                  step={0.5}
                  onValueChange={([v]) => { setSaturation(v); markModified(); }}
                  className="[&_[role=slider]]:bg-orange-500"
                />
              </div>

              {/* Game Mode */}
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
            </TabsContent>

            <TabsContent value="position" className="m-0 space-y-4">
              <div className="space-y-2">
                <Label>차원</Label>
                <Select
                  value={dimension}
                  onValueChange={(v) => { setDimension(v); markModified(); }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {dimensions.map((dim) => (
                      <SelectItem key={dim.value} value={dim.value}>{dim.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="p-4 bg-muted/30 rounded-lg space-y-4">
                <h3 className="font-medium flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  플레이어 위치
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="posX">X</Label>
                    <Input
                      id="posX"
                      type="number"
                      step="0.01"
                      value={posX}
                      onChange={(e) => { setPosX(Number(e.target.value)); markModified(); }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="posY">Y</Label>
                    <Input
                      id="posY"
                      type="number"
                      step="0.01"
                      value={posY}
                      onChange={(e) => { setPosY(Number(e.target.value)); markModified(); }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="posZ">Z</Label>
                    <Input
                      id="posZ"
                      type="number"
                      step="0.01"
                      value={posZ}
                      onChange={(e) => { setPosZ(Number(e.target.value)); markModified(); }}
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setPosY(320); markModified(); }}
                >
                  최대 높이로
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setPosX(0); setPosZ(0); markModified(); }}
                >
                  원점으로
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="xp" className="m-0 space-y-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-green-400" />
                    경험치 레벨
                  </Label>
                  <span className="text-sm font-mono">{xpLevel}</span>
                </div>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={xpLevel}
                    onChange={(e) => { setXpLevel(Number(e.target.value)); markModified(); }}
                    min={0}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <Label>총 경험치</Label>
                <Input
                  type="number"
                  value={xpTotal}
                  onChange={(e) => { setXpTotal(Number(e.target.value)); markModified(); }}
                  min={0}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setXpLevel(30); setXpTotal(1395); markModified(); }}
                >
                  30 레벨
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setXpLevel(100); setXpTotal(20891); markModified(); }}
                >
                  100 레벨
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setXpLevel(0); setXpTotal(0); markModified(); }}
                >
                  초기화
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="inventory" className="m-0">
              <div className="text-center text-muted-foreground py-8">
                <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>인벤토리 편집은 NBT 에디터를 사용해주세요</p>
                <p className="text-xs mt-1">복잡한 아이템 데이터는 트리 뷰에서 편집하는 것이 안전합니다</p>
              </div>
              
              {/* Show current inventory as read-only */}
              {player?.inventory && player.inventory.length > 0 && (
                <div className="mt-4 space-y-2">
                  <Label>현재 인벤토리 ({player.inventory.length}개 아이템)</Label>
                  <div className="max-h-48 overflow-y-auto space-y-1 p-2 bg-muted/30 rounded-lg">
                    {player.inventory.map((item, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2 text-xs font-mono p-1 hover:bg-muted/50 rounded"
                      >
                        <span className="text-muted-foreground w-8">#{item.slot}</span>
                        <span className="flex-1 truncate">{item.id}</span>
                        <span className="text-muted-foreground">x{item.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
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
    
    const firstType = typeof data[0];
    if (firstType === "number" && data.every(x => typeof x === "number")) {
      // Check if floats (for Pos, Motion, Rotation)
      if (data.some(x => !Number.isInteger(x))) {
        return {
          type: "list",
          value: {
            type: "double",
            value: data,
          },
        };
      }
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

