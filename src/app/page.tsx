"use client";

import { useCallback, useRef } from "react";
import Link from "next/link";
import { Pickaxe, Layers, FolderOpen } from "lucide-react";
import { FileDropZone } from "@/components/file-drop-zone";
import { TreeView } from "@/components/nbt-tree/tree-view";
import { Toolbar } from "@/components/toolbar";
import { useNbtEditor } from "@/hooks/use-nbt-editor";
import { cn } from "@/lib/utils";

export default function Home() {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
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
  } = useNbtEditor();

  const handleOpenFile = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        loadFile(files[0]);
      }
      // Reset input so the same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [loadFile]
  );

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".dat,.nbt,.schematic,.dat_mcr,.dat_old,.bpt,.rc,.mcr,.mca"
        onChange={handleFileInput}
        className="hidden"
      />

      {/* Header */}
      <header className="flex items-center gap-3 px-6 py-4 border-b bg-gradient-to-r from-card to-background">
        <div className="p-2 rounded-lg bg-primary/10 ring-1 ring-primary/20">
          <Pickaxe className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight">NBT Web Explorer</h1>
          <p className="text-xs text-muted-foreground">
            Minecraft NBT 파일 뷰어 & 에디터
          </p>
        </div>
        <div className="ml-auto flex gap-2">
          <Link
            href="/save"
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 ring-1 ring-emerald-500/20 transition-colors"
          >
            <FolderOpen className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-medium text-emerald-400">세이브 폴더</span>
          </Link>
          <Link
            href="/mca"
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 ring-1 ring-purple-500/20 transition-colors"
          >
            <Layers className="w-4 h-4 text-purple-400" />
            <span className="text-sm font-medium text-purple-400">MCA 3D 뷰어</span>
          </Link>
        </div>
      </header>

      {/* Toolbar */}
      <Toolbar
        fileInfo={fileInfo}
        modified={modified}
        isRegion={isRegion}
        onOpenFile={handleOpenFile}
        onSaveFile={saveFile}
        onCloseFile={closeFile}
        onExpandAll={expandAll}
        onCollapseAll={collapseAll}
      />

      {/* Main content */}
      <main className="flex-1 overflow-hidden">
        {/* Loading state */}
        {loading && (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <div className="w-12 h-12 border-4 border-primary/20 rounded-full" />
                <div className="absolute top-0 left-0 w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
              <p className="text-muted-foreground">파일을 불러오는 중...</p>
            </div>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="flex items-center justify-center h-full p-8">
            <div className="flex flex-col items-center gap-4 text-center max-w-md">
              <div className="p-4 rounded-full bg-destructive/10">
                <svg
                  className="w-8 h-8 text-destructive"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-lg">오류가 발생했습니다</h3>
                <p className="text-sm text-muted-foreground mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && !tree && (
          <div className="flex items-center justify-center h-full p-8">
            <FileDropZone
              onFileSelect={loadFile}
              className="max-w-xl w-full"
            />
          </div>
        )}

        {/* Tree view */}
        {!loading && !error && tree && (
          <div className="h-full">
            <TreeView
              tree={tree}
              selectedNode={selectedNode}
              expandedNodes={expandedNodes}
              clipboard={clipboard}
              onSelectNode={selectNode}
              onToggleExpand={toggleExpand}
              onUpdateValue={updateValue}
              onAddTag={addNewTag}
              onDeleteNode={deleteNode}
              onRenameNode={renameNode}
              onCopyNode={copyNode}
              onCutNode={cutNode}
              onPasteNode={pasteNode}
            />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer
        className={cn(
          "px-4 py-2 text-xs text-muted-foreground border-t",
          "flex items-center justify-between"
        )}
      >
        <span>
          {tree
            ? `선택: ${selectedNode?.path.join(" / ") || "없음"}`
            : "파일을 열어주세요"}
        </span>
        <span>NBT Web Explorer v0.1.0</span>
      </footer>
    </div>
  );
}

