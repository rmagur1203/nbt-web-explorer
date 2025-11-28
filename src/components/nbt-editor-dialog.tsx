"use client";

import { useState, useCallback, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Save } from "lucide-react";
import { TreeView } from "@/components/nbt-tree/tree-view";
import {
  NbtTreeNode,
  NbtValue,
  TagType,
  createDefaultValue,
  CompressionType,
} from "@/lib/nbt/types";
import {
  serializeNbtTree,
  updateNodeValue,
  addTag,
  deleteTag,
  renameTag,
  cloneTree,
} from "@/lib/nbt/parser";

interface NbtEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  nbtData: any; // Raw NBT data (already parsed/simplified)
  filePath: string;
  onSave: (path: string, data: Uint8Array) => void;
}

export function NbtEditorDialog({
  open,
  onOpenChange,
  title,
  nbtData,
  filePath,
  onSave,
}: NbtEditorDialogProps) {
  const [tree, setTree] = useState<NbtTreeNode | null>(null);
  const [selectedNode, setSelectedNode] = useState<NbtTreeNode | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [modified, setModified] = useState(false);
  const [clipboard, setClipboard] = useState<NbtTreeNode | null>(null);
  const [loading, setLoading] = useState(false);

  // Convert raw NBT data to tree structure when dialog opens
  useEffect(() => {
    if (open && nbtData) {
      const convertedTree = convertToTree(nbtData, "root");
      setTree(convertedTree);
      setExpandedNodes(new Set([convertedTree.id]));
      setModified(false);
    }
  }, [open, nbtData]);

  // Save handler
  const handleSave = useCallback(async () => {
    if (!tree) return;

    setLoading(true);
    try {
      const compression: CompressionType = "gzip";
      const data = serializeNbtTree(tree, compression);
      onSave(filePath, new Uint8Array(data));
      setModified(false);
      onOpenChange(false);
    } catch (err) {
      console.error("Save error:", err);
    } finally {
      setLoading(false);
    }
  }, [tree, filePath, onSave, onOpenChange]);

  // Toggle expand
  const toggleExpand = useCallback((nodeId: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  }, []);

  // Update value
  const updateValue = useCallback(
    (nodePath: string[], newValue: NbtValue) => {
      if (!tree) return;
      const newTree = updateNodeValue(tree, nodePath, newValue);
      setTree(newTree);
      setModified(true);
    },
    [tree]
  );

  // Add new tag
  const addNewTag = useCallback(
    (parentPath: string[], name: string, type: TagType) => {
      if (!tree) return;
      const defaultValue = createDefaultValue(type);
      const newTree = addTag(tree, parentPath, name, type, defaultValue);
      setTree(newTree);
      setModified(true);
    },
    [tree]
  );

  // Delete node
  const deleteNode = useCallback(
    (nodePath: string[]) => {
      if (!tree) return;
      const newTree = deleteTag(tree, nodePath);
      setTree(newTree);
      setModified(true);
      setSelectedNode(null);
    },
    [tree]
  );

  // Rename node
  const renameNode = useCallback(
    (nodePath: string[], newName: string) => {
      if (!tree) return;
      const newTree = renameTag(tree, nodePath, newName);
      setTree(newTree);
      setModified(true);
    },
    [tree]
  );

  // Copy/Cut/Paste
  const copyNode = useCallback((node: NbtTreeNode) => {
    setClipboard(cloneTree(node));
  }, []);

  const cutNode = useCallback((node: NbtTreeNode) => {
    setClipboard(cloneTree(node));
  }, []);

  const pasteNode = useCallback(
    (parentPath: string[]) => {
      if (!tree || !clipboard) return;
      const newTree = addTag(tree, parentPath, clipboard.name, clipboard.type, clipboard.value);
      setTree(newTree);
      setModified(true);
    },
    [tree, clipboard]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center justify-between">
            <span>{title}</span>
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
                disabled={!modified || loading}
                className="gap-1"
              >
                <Save className="w-4 h-4" />
                저장
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 border rounded-lg overflow-hidden bg-background">
          {tree ? (
            <TreeView
              tree={tree}
              selectedNode={selectedNode}
              expandedNodes={expandedNodes}
              clipboard={clipboard}
              onSelectNode={setSelectedNode}
              onToggleExpand={toggleExpand}
              onUpdateValue={updateValue}
              onAddTag={addNewTag}
              onDeleteNode={deleteNode}
              onRenameNode={renameNode}
              onCopyNode={copyNode}
              onCutNode={cutNode}
              onPasteNode={pasteNode}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              데이터를 불러오는 중...
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Helper function to convert raw NBT data to tree structure
// This converts simplified NBT data back to the internal tree format
function convertToTree(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any,
  name: string,
  path: string[] = [],
  idCounter = { value: 0 }
): NbtTreeNode {
  const id = `node-${idCounter.value++}`;
  const currentPath = [...path, name];

  // Determine type and convert value
  if (data === null || data === undefined) {
    return {
      id,
      name,
      type: TagType.Byte,
      value: 0,
      path: currentPath,
    };
  }

  if (typeof data === "number") {
    // Check if it's an integer or float
    if (Number.isInteger(data)) {
      if (data >= -128 && data <= 127) {
        return { id, name, type: TagType.Byte, value: data, path: currentPath };
      } else if (data >= -32768 && data <= 32767) {
        return { id, name, type: TagType.Short, value: data, path: currentPath };
      } else {
        return { id, name, type: TagType.Int, value: data, path: currentPath };
      }
    } else {
      return { id, name, type: TagType.Double, value: data, path: currentPath };
    }
  }

  if (typeof data === "bigint") {
    return { id, name, type: TagType.Long, value: data, path: currentPath };
  }

  if (typeof data === "string") {
    return { id, name, type: TagType.String, value: data, path: currentPath };
  }

  if (typeof data === "boolean") {
    return { id, name, type: TagType.Byte, value: data ? 1 : 0, path: currentPath };
  }

  if (Array.isArray(data)) {
    // Check if all elements are numbers (could be ByteArray, IntArray)
    if (data.length > 0 && data.every(item => typeof item === "number")) {
      // Treat as IntArray for now
      return {
        id,
        name,
        type: TagType.IntArray,
        value: new Int32Array(data),
        path: currentPath,
      };
    }

    // Regular list
    const children = data.map((item, index) =>
      convertToTree(item, String(index), currentPath, idCounter)
    );
    const listType = children.length > 0 ? children[0].type : TagType.Compound;

    // Build proper NbtList value format
    const listValue = {
      type: listType,
      value: children.map((c) => c.value),
    };

    return {
      id,
      name,
      type: TagType.List,
      value: listValue,
      path: currentPath,
      children,
    };
  }

  if (typeof data === "object") {
    // Compound tag
    const children = Object.entries(data).map(([key, value]) =>
      convertToTree(value, key, currentPath, idCounter)
    );

    // Build proper NbtCompound value format: {[key]: {type, value}}
    const compoundValue: Record<string, { type: TagType; value: NbtValue }> = {};
    for (const child of children) {
      compoundValue[child.name] = {
        type: child.type,
        value: child.value,
      };
    }

    return {
      id,
      name,
      type: TagType.Compound,
      value: compoundValue,
      path: currentPath,
      children,
    };
  }

  // Fallback
  return {
    id,
    name,
    type: TagType.String,
    value: String(data),
    path: currentPath,
  };
}

