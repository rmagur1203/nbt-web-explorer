"use client";

import { useState, useCallback, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
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
import {
  NbtTreeNode,
  TagType,
  TagTypeName,
  NbtValue,
  NbtList,
  createDefaultValue,
} from "@/lib/nbt/types";

interface NodeEditorProps {
  node: NbtTreeNode | null;
  mode: "edit" | "rename" | "add" | null;
  parentType?: TagType;
  listItemType?: TagType;
  onSave: (value: NbtValue | string, name?: string, type?: TagType) => void;
  onClose: () => void;
}

export function NodeEditor({
  node,
  mode,
  parentType,
  listItemType,
  onSave,
  onClose,
}: NodeEditorProps) {
  const [value, setValue] = useState<string>("");
  const [name, setName] = useState<string>("");
  const [tagType, setTagType] = useState<TagType>(TagType.String);

  // Initialize form values when node changes
  useEffect(() => {
    if (mode === "edit" && node) {
      const val = node.value;
      if (node.type === TagType.Long) {
        setValue(String(val));
      } else if (
        node.type === TagType.ByteArray ||
        node.type === TagType.IntArray ||
        node.type === TagType.LongArray
      ) {
        // Format array as comma-separated values
        setValue(Array.from(val as ArrayLike<number | bigint>).join(", "));
      } else {
        setValue(String(val));
      }
    } else if (mode === "rename" && node) {
      setName(node.name);
    } else if (mode === "add") {
      setName("");
      setValue("");
      // If parent is a list, use the list's item type
      if (listItemType !== undefined) {
        setTagType(listItemType);
      } else {
        setTagType(TagType.String);
      }
    }
  }, [node, mode, listItemType]);

  const handleSave = useCallback(() => {
    if (mode === "edit" && node) {
      let parsedValue: NbtValue;

      try {
        switch (node.type) {
          case TagType.Byte:
            parsedValue = Math.max(-128, Math.min(127, parseInt(value) || 0));
            break;
          case TagType.Short:
            parsedValue = Math.max(-32768, Math.min(32767, parseInt(value) || 0));
            break;
          case TagType.Int:
            parsedValue = parseInt(value) || 0;
            break;
          case TagType.Long:
            parsedValue = BigInt(value || 0);
            break;
          case TagType.Float:
          case TagType.Double:
            parsedValue = parseFloat(value) || 0;
            break;
          case TagType.String:
            parsedValue = value;
            break;
          case TagType.ByteArray: {
            const bytes = value
              .split(",")
              .map((s) => parseInt(s.trim()))
              .filter((n) => !isNaN(n));
            parsedValue = new Int8Array(bytes);
            break;
          }
          case TagType.IntArray: {
            const ints = value
              .split(",")
              .map((s) => parseInt(s.trim()))
              .filter((n) => !isNaN(n));
            parsedValue = new Int32Array(ints);
            break;
          }
          case TagType.LongArray: {
            const longs = value
              .split(",")
              .map((s) => {
                try {
                  return BigInt(s.trim());
                } catch {
                  return BigInt(0);
                }
              });
            parsedValue = new BigInt64Array(longs);
            break;
          }
          default:
            parsedValue = value;
        }

        onSave(parsedValue);
      } catch (error) {
        console.error("Failed to parse value:", error);
      }
    } else if (mode === "rename") {
      if (name.trim()) {
        onSave(name.trim());
      }
    } else if (mode === "add") {
      const defaultValue = createDefaultValue(tagType);
      // For lists, name is the index (handled by parent)
      const tagName = parentType === TagType.List ? "" : name.trim() || "newTag";
      onSave(defaultValue, tagName, tagType);
    }
  }, [mode, node, value, name, tagType, parentType, onSave]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSave();
      }
    },
    [handleSave]
  );

  if (!mode) return null;

  const isOpen = mode !== null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === "edit"
              ? "값 편집"
              : mode === "rename"
              ? "이름 변경"
              : "새 태그 추가"}
          </DialogTitle>
          <DialogDescription>
            {mode === "edit" && node
              ? `${TagTypeName[node.type]} 값을 입력하세요`
              : mode === "rename"
              ? "새 이름을 입력하세요"
              : "추가할 태그의 정보를 입력하세요"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {mode === "add" && parentType !== TagType.List && (
            <div className="space-y-2">
              <Label htmlFor="name">이름</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="태그 이름"
                autoFocus
              />
            </div>
          )}

          {mode === "add" && listItemType === undefined && (
            <div className="space-y-2">
              <Label htmlFor="type">타입</Label>
              <Select
                value={String(tagType)}
                onValueChange={(v) => setTagType(parseInt(v) as TagType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TagTypeName)
                    .filter(([key]) => parseInt(key) !== TagType.End)
                    .map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {mode === "rename" && (
            <div className="space-y-2">
              <Label htmlFor="rename">새 이름</Label>
              <Input
                id="rename"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="새 이름"
                autoFocus
              />
            </div>
          )}

          {mode === "edit" && node && (
            <div className="space-y-2">
              <Label htmlFor="value">
                값 ({TagTypeName[node.type]})
              </Label>
              {node.type === TagType.ByteArray ||
              node.type === TagType.IntArray ||
              node.type === TagType.LongArray ? (
                <textarea
                  id="value"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  className="flex min-h-[120px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring font-mono"
                  placeholder="쉼표로 구분된 값 (예: 1, 2, 3, 4)"
                />
              ) : (
                <Input
                  id="value"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  type={
                    node.type === TagType.String
                      ? "text"
                      : "text"
                  }
                  placeholder={getPlaceholder(node.type)}
                  autoFocus
                  className="font-mono"
                />
              )}
              {getTypeHint(node.type) && (
                <p className="text-xs text-muted-foreground">
                  {getTypeHint(node.type)}
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            취소
          </Button>
          <Button onClick={handleSave}>저장</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function getPlaceholder(type: TagType): string {
  switch (type) {
    case TagType.Byte:
      return "-128 ~ 127";
    case TagType.Short:
      return "-32768 ~ 32767";
    case TagType.Int:
      return "정수";
    case TagType.Long:
      return "큰 정수 (예: 12345678901234)";
    case TagType.Float:
    case TagType.Double:
      return "실수 (예: 3.14)";
    case TagType.String:
      return "문자열";
    default:
      return "";
  }
}

function getTypeHint(type: TagType): string | null {
  switch (type) {
    case TagType.Byte:
      return "범위: -128 ~ 127";
    case TagType.Short:
      return "범위: -32,768 ~ 32,767";
    case TagType.Int:
      return "범위: -2,147,483,648 ~ 2,147,483,647";
    case TagType.Long:
      return "64비트 정수";
    case TagType.Float:
      return "32비트 부동소수점";
    case TagType.Double:
      return "64비트 부동소수점";
    default:
      return null;
  }
}

// Export for use in add dialog
export function getListItemType(node: NbtTreeNode): TagType | undefined {
  if (node.type === TagType.List) {
    const list = node.value as NbtList;
    return list.type;
  }
  return undefined;
}

