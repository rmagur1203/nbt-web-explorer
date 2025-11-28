import pako from "pako";
import { parseNbtBuffer, resetNodeIdCounter } from "./parser";
import { NbtTreeNode, TagType, NbtCompound } from "./types";

export interface RegionChunkInfo {
  x: number;
  z: number;
  offset: number;
  sectorCount: number;
  timestamp: number;
  compressionType: number;
  dataLength: number;
}

export interface RegionFileInfo {
  filename: string;
  chunks: (RegionChunkInfo | null)[];
  chunkCount: number;
}

// Parse region file header to get chunk locations
export function parseRegionHeader(buffer: Uint8Array): RegionFileInfo {
  const chunks: (RegionChunkInfo | null)[] = new Array(1024).fill(null);
  let chunkCount = 0;

  // First 4KB: chunk locations (1024 entries, 4 bytes each)
  for (let i = 0; i < 1024; i++) {
    const offset = i * 4;
    const locationData =
      (buffer[offset] << 16) |
      (buffer[offset + 1] << 8) |
      buffer[offset + 2];
    const sectorCount = buffer[offset + 3];

    if (locationData === 0 && sectorCount === 0) continue;

    // Second 4KB: timestamps (1024 entries, 4 bytes each)
    const timestampOffset = 4096 + i * 4;
    const timestamp =
      (buffer[timestampOffset] << 24) |
      (buffer[timestampOffset + 1] << 16) |
      (buffer[timestampOffset + 2] << 8) |
      buffer[timestampOffset + 3];

    const x = i % 32;
    const z = Math.floor(i / 32);

    // Read compression type and data length from chunk header
    const chunkOffset = locationData * 4096;
    const dataLength =
      (buffer[chunkOffset] << 24) |
      (buffer[chunkOffset + 1] << 16) |
      (buffer[chunkOffset + 2] << 8) |
      buffer[chunkOffset + 3];
    const compressionType = buffer[chunkOffset + 4];

    chunks[i] = {
      x,
      z,
      offset: locationData,
      sectorCount,
      timestamp,
      compressionType,
      dataLength: dataLength - 1, // Subtract 1 for compression byte
    };
    chunkCount++;
  }

  return {
    filename: "",
    chunks,
    chunkCount,
  };
}

// Extract and decompress chunk data
export async function extractChunk(
  buffer: Uint8Array,
  chunkInfo: RegionChunkInfo
): Promise<NbtTreeNode | null> {
  try {
    const chunkOffset = chunkInfo.offset * 4096;
    const dataStart = chunkOffset + 5; // Skip length (4) + compression (1)
    const dataEnd = dataStart + chunkInfo.dataLength;
    const compressedData = buffer.slice(dataStart, dataEnd);

    let decompressed: Uint8Array;
    switch (chunkInfo.compressionType) {
      case 1: // GZip
        decompressed = pako.ungzip(compressedData);
        break;
      case 2: // Zlib
        decompressed = pako.inflate(compressedData);
        break;
      case 3: // Uncompressed
        decompressed = compressedData;
        break;
      default:
        console.warn(`Unknown compression type: ${chunkInfo.compressionType}`);
        return null;
    }

    return await parseNbtBuffer(decompressed);
  } catch (error) {
    console.error(`Failed to extract chunk at (${chunkInfo.x}, ${chunkInfo.z}):`, error);
    return null;
  }
}

// Parse entire region file into a tree structure
export async function parseRegionFile(
  file: File
): Promise<{ tree: NbtTreeNode; info: RegionFileInfo }> {
  resetNodeIdCounter();

  const buffer = new Uint8Array(await file.arrayBuffer());
  const info = parseRegionHeader(buffer);
  info.filename = file.name;

  // Create root node for region file
  const rootChildren: NbtTreeNode[] = [];

  // Parse each chunk
  for (let i = 0; i < 1024; i++) {
    const chunkInfo = info.chunks[i];
    if (!chunkInfo) continue;

    const chunkData = await extractChunk(buffer, chunkInfo);
    if (chunkData) {
      const chunkNode: NbtTreeNode = {
        id: `chunk-${chunkInfo.x}-${chunkInfo.z}`,
        name: `Chunk [${chunkInfo.x}, ${chunkInfo.z}]`,
        type: TagType.Compound,
        value: chunkData.value,
        path: [`Region`, `Chunk [${chunkInfo.x}, ${chunkInfo.z}]`],
        children: chunkData.children,
      };

      // Update children's parent reference
      if (chunkNode.children) {
        chunkNode.children.forEach((child) => {
          child.parent = chunkNode;
          updateChildPaths(child, chunkNode.path);
        });
      }

      rootChildren.push(chunkNode);
    }
  }

  // Sort chunks by position
  rootChildren.sort((a, b) => {
    const aMatch = a.name.match(/\[(\d+), (\d+)\]/);
    const bMatch = b.name.match(/\[(\d+), (\d+)\]/);
    if (!aMatch || !bMatch) return 0;
    const aX = parseInt(aMatch[1]);
    const aZ = parseInt(aMatch[2]);
    const bX = parseInt(bMatch[1]);
    const bZ = parseInt(bMatch[2]);
    return aZ !== bZ ? aZ - bZ : aX - bX;
  });

  const tree: NbtTreeNode = {
    id: "region-root",
    name: file.name,
    type: TagType.Compound,
    value: {} as NbtCompound,
    path: [file.name],
    children: rootChildren,
  };

  // Update children's parent reference
  rootChildren.forEach((child) => {
    child.parent = tree;
  });

  return { tree, info };
}

// Helper to update child paths recursively
function updateChildPaths(node: NbtTreeNode, parentPath: string[]): void {
  node.path = [...parentPath, node.name];
  if (node.children) {
    node.children.forEach((child) => {
      child.parent = node;
      updateChildPaths(child, node.path);
    });
  }
}

// Check if file is a region file
export function isRegionFile(filename: string): boolean {
  return /\.(mcr|mca)$/i.test(filename);
}

// Serialize region file (not fully implemented - regions are complex)
export function serializeRegionFile(
  _tree: NbtTreeNode,
  _originalBuffer: Uint8Array
): Uint8Array {
  // Region file serialization is complex and typically not needed for basic editing
  // For now, throw an error indicating this isn't supported
  throw new Error("Region file saving is not yet supported. Please extract individual chunks.");
}

