"use client";

import { memo } from "react";
import {
  Save,
  FolderOpen,
  X,
  ChevronsUpDown,
  ChevronsDownUp,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { NbtFileInfo } from "@/lib/nbt/types";
import { RegionFileInfo } from "@/lib/nbt/region";
import { formatBytes } from "@/lib/utils";

interface ToolbarProps {
  fileInfo: NbtFileInfo | RegionFileInfo | null;
  modified: boolean;
  isRegion: boolean;
  onOpenFile: () => void;
  onSaveFile: () => void;
  onCloseFile: () => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
}

export const Toolbar = memo(function Toolbar({
  fileInfo,
  modified,
  isRegion,
  onOpenFile,
  onSaveFile,
  onCloseFile,
  onExpandAll,
  onCollapseAll,
}: ToolbarProps) {
  const canSave = fileInfo && !isRegion && modified;

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex items-center justify-between px-4 py-2 border-b bg-card/50">
        {/* Left side - File actions */}
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onOpenFile}
                className="h-8 w-8"
              >
                <FolderOpen className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>파일 열기</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onSaveFile}
                disabled={!canSave}
                className="h-8 w-8"
              >
                <Save className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {isRegion ? "Region 파일은 저장할 수 없습니다" : "파일 저장"}
            </TooltipContent>
          </Tooltip>

          {fileInfo && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onCloseFile}
                  className="h-8 w-8"
                >
                  <X className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>파일 닫기</TooltipContent>
            </Tooltip>
          )}

          <div className="w-px h-6 bg-border mx-2" />

          {/* View actions */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onExpandAll}
                disabled={!fileInfo}
                className="h-8 w-8"
              >
                <ChevronsUpDown className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>모두 펼치기</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onCollapseAll}
                disabled={!fileInfo}
                className="h-8 w-8"
              >
                <ChevronsDownUp className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>모두 접기</TooltipContent>
          </Tooltip>
        </div>

        {/* Center - File info */}
        {fileInfo && (
          <div className="flex items-center gap-3 text-sm">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">
              {"name" in fileInfo ? fileInfo.name : fileInfo.filename}
            </span>
            <span className="text-muted-foreground">
              {formatBytes("size" in fileInfo ? fileInfo.size : 0)}
            </span>
            {"compression" in fileInfo && (
              <span
                className={cn(
                  "px-2 py-0.5 rounded-full text-xs font-medium",
                  fileInfo.compression === "gzip"
                    ? "bg-green-500/20 text-green-400"
                    : fileInfo.compression === "zlib"
                    ? "bg-blue-500/20 text-blue-400"
                    : "bg-gray-500/20 text-gray-400"
                )}
              >
                {fileInfo.compression.toUpperCase()}
              </span>
            )}
            {isRegion && (
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-500/20 text-purple-400">
                REGION
              </span>
            )}
            {modified && (
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-400">
                수정됨
              </span>
            )}
          </div>
        )}

        {/* Right side - Status */}
        <div className="w-32" />
      </div>
    </TooltipProvider>
  );
});

