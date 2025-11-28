"use client";

import { memo, useCallback } from "react";
import {
  ChevronRight,
  ChevronDown,
  Hash,
  Type,
  List,
  Braces,
  Binary,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  NbtTreeNode,
  TagType,
  TagTypeName,
  TagColors,
  getDisplayValue,
  isContainerType,
  isArrayType,
} from "@/lib/nbt/types";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

interface TreeNodeProps {
  node: NbtTreeNode;
  depth: number;
  isExpanded: boolean;
  isSelected: boolean;
  onSelect: (node: NbtTreeNode) => void;
  onToggle: (nodeId: string) => void;
  onEdit: (node: NbtTreeNode) => void;
  onDelete: (node: NbtTreeNode) => void;
  onRename: (node: NbtTreeNode) => void;
  onAddTag: (node: NbtTreeNode, type: TagType) => void;
  onCopy: (node: NbtTreeNode) => void;
  onCut: (node: NbtTreeNode) => void;
  onPaste: (node: NbtTreeNode) => void;
  canPaste: boolean;
  expandedNodes: Set<string>;
}

// Get icon for tag type
function getTagIcon(type: TagType): React.ReactNode {
  const iconClass = "w-4 h-4";

  switch (type) {
    case TagType.Byte:
    case TagType.Short:
    case TagType.Int:
    case TagType.Long:
    case TagType.Float:
    case TagType.Double:
      return <Hash className={iconClass} />;
    case TagType.String:
      return <Type className={iconClass} />;
    case TagType.List:
      return <List className={iconClass} />;
    case TagType.Compound:
      return <Braces className={iconClass} />;
    case TagType.ByteArray:
    case TagType.IntArray:
    case TagType.LongArray:
      return <Binary className={iconClass} />;
    default:
      return <Hash className={iconClass} />;
  }
}

// Creatable tag types
const creatableTagTypes = [
  TagType.Byte,
  TagType.Short,
  TagType.Int,
  TagType.Long,
  TagType.Float,
  TagType.Double,
  TagType.String,
  TagType.ByteArray,
  TagType.IntArray,
  TagType.LongArray,
  TagType.List,
  TagType.Compound,
];

export const TreeNode = memo(function TreeNode({
  node,
  depth,
  isExpanded,
  isSelected,
  onSelect,
  onToggle,
  onEdit,
  onDelete,
  onRename,
  onAddTag,
  onCopy,
  onCut,
  onPaste,
  canPaste,
  expandedNodes,
}: TreeNodeProps) {
  const hasChildren =
    (isContainerType(node.type) || isArrayType(node.type)) &&
    node.children &&
    node.children.length > 0;

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onSelect(node);
    },
    [node, onSelect]
  );

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (hasChildren) {
        onToggle(node.id);
      } else if (!isContainerType(node.type) && !isArrayType(node.type)) {
        onEdit(node);
      }
    },
    [node, hasChildren, onToggle, onEdit]
  );

  const handleToggle = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onToggle(node.id);
    },
    [node.id, onToggle]
  );

  const canAddChildren = node.type === TagType.Compound || node.type === TagType.List;
  const canRename = node.path.length > 1 && node.parent?.type === TagType.Compound;
  const canDelete = node.path.length > 1;
  const canEdit = !isContainerType(node.type);

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div className="select-none">
          {/* Node row */}
          <div
            className={cn(
              "flex items-center gap-1 py-0.5 px-2 rounded-sm cursor-pointer",
              "transition-colors duration-100",
              "hover:bg-accent/50",
              isSelected && "bg-accent text-accent-foreground"
            )}
            style={{ paddingLeft: `${depth * 16 + 8}px` }}
            onClick={handleClick}
            onDoubleClick={handleDoubleClick}
          >
            {/* Expand/collapse button */}
            <button
              className={cn(
                "w-4 h-4 flex items-center justify-center",
                "rounded hover:bg-accent",
                "transition-colors",
                !hasChildren && "invisible"
              )}
              onClick={handleToggle}
            >
              {isExpanded ? (
                <ChevronDown className="w-3 h-3" />
              ) : (
                <ChevronRight className="w-3 h-3" />
              )}
            </button>

            {/* Tag icon */}
            <span
              className="flex items-center"
              style={{ color: TagColors[node.type] }}
            >
              {getTagIcon(node.type)}
            </span>

            {/* Node name */}
            <span className="font-medium text-sm truncate">{node.name}</span>

            {/* Separator */}
            {!isContainerType(node.type) && !isArrayType(node.type) && (
              <span className="text-muted-foreground">:</span>
            )}

            {/* Value display */}
            <span
              className={cn(
                "text-sm truncate",
                isContainerType(node.type) || isArrayType(node.type)
                  ? "text-muted-foreground"
                  : "text-foreground/80"
              )}
              style={{
                color:
                  !isContainerType(node.type) && !isArrayType(node.type)
                    ? TagColors[node.type]
                    : undefined,
              }}
            >
              {getDisplayValue({ type: node.type, value: node.value })}
            </span>
          </div>

          {/* Children */}
          {isExpanded && node.children && (
            <div className="tree-children">
              {node.children.map((child) => (
                <TreeNode
                  key={child.id}
                  node={child}
                  depth={depth + 1}
                  isExpanded={expandedNodes.has(child.id)}
                  isSelected={false}
                  onSelect={onSelect}
                  onToggle={onToggle}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onRename={onRename}
                  onAddTag={onAddTag}
                  onCopy={onCopy}
                  onCut={onCut}
                  onPaste={onPaste}
                  canPaste={canPaste}
                  expandedNodes={expandedNodes}
                />
              ))}
            </div>
          )}
        </div>
      </ContextMenuTrigger>

      <ContextMenuContent className="w-56">
        {canEdit && (
          <ContextMenuItem onClick={() => onEdit(node)}>
            값 편집
          </ContextMenuItem>
        )}

        {canRename && (
          <ContextMenuItem onClick={() => onRename(node)}>
            이름 변경
          </ContextMenuItem>
        )}

        {(canEdit || canRename) && <ContextMenuSeparator />}

        <ContextMenuItem onClick={() => onCopy(node)}>복사</ContextMenuItem>

        {canDelete && (
          <ContextMenuItem onClick={() => onCut(node)}>잘라내기</ContextMenuItem>
        )}

        {canAddChildren && canPaste && (
          <ContextMenuItem onClick={() => onPaste(node)}>
            붙여넣기
          </ContextMenuItem>
        )}

        {canAddChildren && (
          <>
            <ContextMenuSeparator />
            <ContextMenuSub>
              <ContextMenuSubTrigger>태그 추가</ContextMenuSubTrigger>
              <ContextMenuSubContent className="w-48">
                {creatableTagTypes.map((type) => (
                  <ContextMenuItem
                    key={type}
                    onClick={() => onAddTag(node, type)}
                    className="gap-2"
                  >
                    <span style={{ color: TagColors[type] }}>
                      {getTagIcon(type)}
                    </span>
                    {TagTypeName[type]}
                  </ContextMenuItem>
                ))}
              </ContextMenuSubContent>
            </ContextMenuSub>
          </>
        )}

        {canDelete && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem
              onClick={() => onDelete(node)}
              className="text-destructive focus:text-destructive"
            >
              삭제
            </ContextMenuItem>
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
});

