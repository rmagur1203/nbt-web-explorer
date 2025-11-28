"use client";

import { useState, useCallback } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TreeNode } from "./tree-node";
import { NodeEditor, getListItemType } from "./node-editor";
import { NbtTreeNode, TagType, NbtValue, NbtList } from "@/lib/nbt/types";

interface TreeViewProps {
  tree: NbtTreeNode | null;
  selectedNode: NbtTreeNode | null;
  expandedNodes: Set<string>;
  clipboard: NbtTreeNode | null;
  onSelectNode: (node: NbtTreeNode | null) => void;
  onToggleExpand: (nodeId: string) => void;
  onUpdateValue: (nodePath: string[], value: NbtValue) => void;
  onAddTag: (parentPath: string[], name: string, type: TagType) => void;
  onDeleteNode: (nodePath: string[]) => void;
  onRenameNode: (nodePath: string[], newName: string) => void;
  onCopyNode: (node: NbtTreeNode) => void;
  onCutNode: (node: NbtTreeNode) => void;
  onPasteNode: (parentPath: string[]) => void;
}

type EditorMode = "edit" | "rename" | "add" | null;

export function TreeView({
  tree,
  selectedNode,
  expandedNodes,
  clipboard,
  onSelectNode,
  onToggleExpand,
  onUpdateValue,
  onAddTag,
  onDeleteNode,
  onRenameNode,
  onCopyNode,
  onCutNode,
  onPasteNode,
}: TreeViewProps) {
  const [editorNode, setEditorNode] = useState<NbtTreeNode | null>(null);
  const [editorMode, setEditorMode] = useState<EditorMode>(null);
  const [addParentNode, setAddParentNode] = useState<NbtTreeNode | null>(null);
  const [addTagType, setAddTagType] = useState<TagType | undefined>(undefined);

  const handleEdit = useCallback((node: NbtTreeNode) => {
    setEditorNode(node);
    setEditorMode("edit");
  }, []);

  const handleRename = useCallback((node: NbtTreeNode) => {
    setEditorNode(node);
    setEditorMode("rename");
  }, []);

  const handleAddTag = useCallback((node: NbtTreeNode, type: TagType) => {
    setAddParentNode(node);
    setAddTagType(type);
    setEditorMode("add");

    // If adding to a list, use the specified type
    if (node.type === TagType.List) {
      // Get the list's item type if it has items
      const list = node.value as NbtList;
      if (list.value.length > 0) {
        setAddTagType(list.type);
      } else {
        setAddTagType(type);
      }
    } else {
      setAddTagType(type);
    }
  }, []);

  const handleDelete = useCallback(
    (node: NbtTreeNode) => {
      onDeleteNode(node.path);
    },
    [onDeleteNode]
  );

  const handleCopy = useCallback(
    (node: NbtTreeNode) => {
      onCopyNode(node);
    },
    [onCopyNode]
  );

  const handleCut = useCallback(
    (node: NbtTreeNode) => {
      onCutNode(node);
    },
    [onCutNode]
  );

  const handlePaste = useCallback(
    (node: NbtTreeNode) => {
      onPasteNode(node.path);
    },
    [onPasteNode]
  );

  const handleEditorSave = useCallback(
    (value: NbtValue | string, name?: string, type?: TagType) => {
      if (editorMode === "edit" && editorNode) {
        onUpdateValue(editorNode.path, value as NbtValue);
      } else if (editorMode === "rename" && editorNode) {
        onRenameNode(editorNode.path, value as string);
      } else if (editorMode === "add" && addParentNode && type !== undefined) {
        const tagName = name || String(addParentNode.children?.length || 0);
        onAddTag(addParentNode.path, tagName, type);
      }

      setEditorNode(null);
      setAddParentNode(null);
      setEditorMode(null);
    },
    [editorMode, editorNode, addParentNode, onUpdateValue, onRenameNode, onAddTag]
  );

  const handleEditorClose = useCallback(() => {
    setEditorNode(null);
    setAddParentNode(null);
    setEditorMode(null);
  }, []);

  if (!tree) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        파일을 불러와주세요
      </div>
    );
  }

  return (
    <>
      <ScrollArea className="h-full">
        <div className="py-2 font-mono text-sm">
          <TreeNode
            node={tree}
            depth={0}
            isExpanded={expandedNodes.has(tree.id)}
            isSelected={selectedNode?.id === tree.id}
            onSelect={onSelectNode}
            onToggle={onToggleExpand}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onRename={handleRename}
            onAddTag={handleAddTag}
            onCopy={handleCopy}
            onCut={handleCut}
            onPaste={handlePaste}
            canPaste={clipboard !== null}
            expandedNodes={expandedNodes}
          />
        </div>
      </ScrollArea>

      <NodeEditor
        node={editorMode === "add" ? null : editorNode}
        mode={editorMode}
        parentType={addParentNode?.type}
        listItemType={
          addParentNode ? getListItemType(addParentNode) ?? addTagType : undefined
        }
        onSave={handleEditorSave}
        onClose={handleEditorClose}
      />
    </>
  );
}

