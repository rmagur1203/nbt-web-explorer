import JSZip from "jszip";
import { saveAs } from "file-saver";
import * as nbt from "prismarine-nbt";
import pako from "pako";
import { MinecraftSave } from "./parser";

export interface ModifiedFile {
  path: string;
  data: Uint8Array;
  isNbt: boolean;
}

// Serialize NBT data to buffer
export async function serializeNbt(
  data: nbt.NBT,
  compressed: boolean = true
): Promise<Uint8Array> {
  const buffer = nbt.writeUncompressed(data, "big");
  
  if (compressed) {
    return pako.gzip(buffer);
  }
  
  return buffer;
}

// Download save folder as ZIP
export async function downloadSaveAsZip(
  save: MinecraftSave,
  modifiedFiles: Map<string, Uint8Array>,
  onProgress?: (progress: number, message: string) => void
): Promise<void> {
  const zip = new JSZip();
  const saveName = save.name || "minecraft-save";
  
  let processedFiles = 0;
  const totalFiles = save.files.length;
  
  onProgress?.(0, "ZIP 파일 생성 중...");
  
  // Add all files to ZIP
  for (const fileEntry of save.files) {
    const relativePath = fileEntry.path;
    
    // Check if this file was modified
    const modifiedData = modifiedFiles.get(relativePath);
    
    if (modifiedData) {
      // Use modified data
      zip.file(relativePath, modifiedData);
    } else if (fileEntry.file) {
      // Use original file
      const buffer = await fileEntry.file.arrayBuffer();
      zip.file(relativePath, new Uint8Array(buffer));
    }
    
    processedFiles++;
    onProgress?.(
      Math.round((processedFiles / totalFiles) * 80),
      `파일 추가 중: ${relativePath}`
    );
  }
  
  onProgress?.(80, "ZIP 압축 중...");
  
  // Generate ZIP file
  const zipBlob = await zip.generateAsync(
    { 
      type: "blob",
      compression: "DEFLATE",
      compressionOptions: { level: 6 }
    },
    (metadata) => {
      onProgress?.(
        80 + Math.round(metadata.percent * 0.2),
        `압축 중: ${Math.round(metadata.percent)}%`
      );
    }
  );
  
  onProgress?.(100, "다운로드 시작...");
  
  // Download
  saveAs(zipBlob, `${saveName}.zip`);
}

// Download a single NBT file
export async function downloadNbtFile(
  data: nbt.NBT,
  filename: string,
  compressed: boolean = true
): Promise<void> {
  const buffer = await serializeNbt(data, compressed);
  const blob = new Blob([buffer], { type: "application/octet-stream" });
  saveAs(blob, filename);
}

// Download a single file (any type)
export function downloadFile(
  data: Uint8Array,
  filename: string,
  mimeType: string = "application/octet-stream"
): void {
  const blob = new Blob([data], { type: mimeType });
  saveAs(blob, filename);
}

