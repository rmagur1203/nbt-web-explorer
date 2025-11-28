"use client";

import { useCallback, useState, useRef } from "react";
import { Upload, FileArchive } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileDropZoneProps {
  onFileSelect: (file: File) => void;
  accept?: string;
  className?: string;
}

export function FileDropZone({
  onFileSelect,
  accept = ".dat,.nbt,.schematic,.dat_mcr,.dat_old,.bpt,.rc,.mcr,.mca",
  className,
}: FileDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        onFileSelect(files[0]);
      }
    },
    [onFileSelect]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        onFileSelect(files[0]);
      }
    },
    [onFileSelect]
  );

  const handleClick = useCallback(() => {
    inputRef.current?.click();
  }, []);

  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center",
        "border-2 border-dashed rounded-xl p-12",
        "transition-all duration-200 cursor-pointer",
        "hover:border-primary/50 hover:bg-primary/5",
        isDragging
          ? "border-primary bg-primary/10 scale-[1.02]"
          : "border-muted-foreground/25",
        className
      )}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={handleClick}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleFileInput}
        className="hidden"
      />

      <div
        className={cn(
          "flex flex-col items-center gap-4 text-center",
          "transition-transform duration-200",
          isDragging && "scale-110"
        )}
      >
        <div
          className={cn(
            "p-4 rounded-full",
            "bg-gradient-to-br from-primary/20 to-primary/5",
            "ring-1 ring-primary/20"
          )}
        >
          {isDragging ? (
            <FileArchive className="w-12 h-12 text-primary animate-pulse" />
          ) : (
            <Upload className="w-12 h-12 text-muted-foreground" />
          )}
        </div>

        <div className="space-y-2">
          <h3 className="text-lg font-semibold">
            {isDragging ? "파일을 놓아주세요" : "NBT 파일을 드래그하거나 클릭하세요"}
          </h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            지원 형식: .dat, .nbt, .schematic, .mcr, .mca 등
          </p>
        </div>
      </div>

      {/* Decorative elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-xl">
        <div
          className={cn(
            "absolute -top-1/2 -right-1/2 w-full h-full",
            "bg-gradient-to-br from-primary/5 to-transparent",
            "rounded-full blur-3xl",
            "transition-opacity duration-300",
            isDragging ? "opacity-100" : "opacity-0"
          )}
        />
      </div>
    </div>
  );
}

