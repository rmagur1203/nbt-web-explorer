"use client";

import { useState, useCallback, useRef } from "react";
import {
  NbtTreeNode,
  NbtFileInfo,
  NbtValue,
  TagType,
  createDefaultValue,
  CompressionType,
} from "@/lib/nbt/types";
import {
  parseNbtFile,
  serializeNbtTree,
  updateNodeValue,
  addTag,
  deleteTag,
  renameTag,
  cloneTree,
} from "@/lib/nbt/parser";
import { parseRegionFile, isRegionFile, RegionFileInfo } from "@/lib/nbt/region";

export interface UseNbtEditorReturn {
  // State
  tree: NbtTreeNode | null;
  fileInfo: NbtFileInfo | RegionFileInfo | null;
  selectedNode: NbtTreeNode | null;
  expandedNodes: Set<string>;
  modified: boolean;
  loading: boolean;
  error: string | null;
  clipboard: NbtTreeNode | null;
  isRegion: boolean;

  // File operations
  loadFile: (file: File) => Promise<void>;
  saveFile: () => void;
  closeFile: () => void;

  // Tree operations
  selectNode: (node: NbtTreeNode | null) => void;
  toggleExpand: (nodeId: string) => void;
  expandAll: () => void;
  collapseAll: () => void;

  // Edit operations
  updateValue: (nodePath: string[], newValue: NbtValue) => void;
  addNewTag: (parentPath: string[], name: string, type: TagType) => void;
  deleteNode: (nodePath: string[]) => void;
  renameNode: (nodePath: string[], newName: string) => void;

  // Clipboard operations
  copyNode: (node: NbtTreeNode) => void;
  cutNode: (node: NbtTreeNode) => void;
  pasteNode: (parentPath: string[]) => void;
}

export function useNbtEditor(): UseNbtEditorReturn {
  const [tree, setTree] = useState<NbtTreeNode | null>(null);
  const [fileInfo, setFileInfo] = useState<NbtFileInfo | RegionFileInfo | null>(null);
  const [selectedNode, setSelectedNode] = useState<NbtTreeNode | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [modified, setModified] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clipboard, setClipboard] = useState<NbtTreeNode | null>(null);
  const [isRegion, setIsRegion] = useState(false);
  const cutNodeRef = useRef<NbtTreeNode | null>(null);

  // Load file
  const loadFile = useCallback(async (file: File) => {
    setLoading(true);
    setError(null);

    try {
      if (isRegionFile(file.name)) {
        const { tree: parsedTree, info } = await parseRegionFile(file);
        setTree(parsedTree);
        setFileInfo(info);
        setIsRegion(true);
        // Expand root by default
        setExpandedNodes(new Set([parsedTree.id]));
      } else {
        const { tree: parsedTree, info } = await parseNbtFile(file);
        setTree(parsedTree);
        setFileInfo(info);
        setIsRegion(false);
        // Expand root by default
        setExpandedNodes(new Set([parsedTree.id]));
      }
      setSelectedNode(null);
      setModified(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "파일을 불러오는데 실패했습니다.");
      setTree(null);
      setFileInfo(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Save file
  const saveFile = useCallback(() => {
    if (!tree || !fileInfo) return;

    try {
      const compression: CompressionType = 
        "compression" in fileInfo ? fileInfo.compression : "gzip";
      const data = serializeNbtTree(tree, compression);
      const blob = new Blob([new Uint8Array(data)], { type: "application/octet-stream" });
      
      // Create download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = ("name" in fileInfo ? fileInfo.name : fileInfo.filename) || "data.nbt";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setModified(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "파일 저장에 실패했습니다.");
    }
  }, [tree, fileInfo]);

  // Close file
  const closeFile = useCallback(() => {
    setTree(null);
    setFileInfo(null);
    setSelectedNode(null);
    setExpandedNodes(new Set());
    setModified(false);
    setError(null);
    setIsRegion(false);
  }, []);

  // Select node
  const selectNode = useCallback((node: NbtTreeNode | null) => {
    setSelectedNode(node);
  }, []);

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

  // Expand all
  const expandAll = useCallback(() => {
    if (!tree) return;

    const allIds = new Set<string>();
    const collectIds = (node: NbtTreeNode) => {
      allIds.add(node.id);
      node.children?.forEach(collectIds);
    };
    collectIds(tree);
    setExpandedNodes(allIds);
  }, [tree]);

  // Collapse all
  const collapseAll = useCallback(() => {
    if (!tree) return;
    setExpandedNodes(new Set([tree.id]));
  }, [tree]);

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

      // Expand parent
      const parentId = findNodeIdByPath(tree, parentPath);
      if (parentId) {
        setExpandedNodes((prev) => new Set([...prev, parentId]));
      }
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

  // Copy node
  const copyNode = useCallback((node: NbtTreeNode) => {
    setClipboard(cloneTree(node));
    cutNodeRef.current = null;
  }, []);

  // Cut node
  const cutNode = useCallback((node: NbtTreeNode) => {
    setClipboard(cloneTree(node));
    cutNodeRef.current = node;
  }, []);

  // Paste node
  const pasteNode = useCallback(
    (parentPath: string[]) => {
      if (!tree || !clipboard) return;

      // If this was a cut operation, delete the original
      if (cutNodeRef.current) {
        const newTree = deleteTag(tree, cutNodeRef.current.path);
        setTree(newTree);
        cutNodeRef.current = null;
      }

      // Generate unique name if needed
      let name = clipboard.name;
      const parentNode = findNodeByPath(tree, parentPath);
      if (parentNode?.type === TagType.Compound) {
        const existingNames = parentNode.children?.map((c) => c.name) || [];
        let counter = 1;
        while (existingNames.includes(name)) {
          name = `${clipboard.name} (${counter})`;
          counter++;
        }
      }

      const newTree = addTag(tree, parentPath, name, clipboard.type, clipboard.value);
      setTree(newTree);
      setModified(true);
    },
    [tree, clipboard]
  );

  return {
    tree,
    fileInfo,
    selectedNode,
    expandedNodes,
    modified,
    loading,
    error,
    clipboard,
    isRegion,
    loadFile,
    saveFile,
    closeFile,
    selectNode,
    toggleExpand,
    expandAll,
    collapseAll,
    updateValue,
    addNewTag,
    deleteNode,
    renameNode,
    copyNode,
    cutNode,
    pasteNode,
  };
}

// Helper to find node ID by path
function findNodeIdByPath(root: NbtTreeNode, path: string[]): string | null {
  const node = findNodeByPath(root, path);
  return node?.id ?? null;
}

// Helper to find node by path (imported version doesn't work well with our structure)
function findNodeByPath(root: NbtTreeNode, path: string[]): NbtTreeNode | null {
  if (path.length === 0 || (path.length === 1 && path[0] === root.name)) {
    return root;
  }

  let current: NbtTreeNode | undefined = root;
  for (let i = 1; i < path.length; i++) {
    if (!current?.children) return null;
    current = current.children.find((c) => c.name === path[i]);
    if (!current) return null;
  }

  return current ?? null;
}

