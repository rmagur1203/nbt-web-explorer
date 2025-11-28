// NBT Tag Types
export enum TagType {
  End = 0,
  Byte = 1,
  Short = 2,
  Int = 3,
  Long = 4,
  Float = 5,
  Double = 6,
  ByteArray = 7,
  String = 8,
  List = 9,
  Compound = 10,
  IntArray = 11,
  LongArray = 12,
}

export const TagTypeName: Record<TagType, string> = {
  [TagType.End]: "End",
  [TagType.Byte]: "Byte",
  [TagType.Short]: "Short",
  [TagType.Int]: "Int",
  [TagType.Long]: "Long",
  [TagType.Float]: "Float",
  [TagType.Double]: "Double",
  [TagType.ByteArray]: "Byte Array",
  [TagType.String]: "String",
  [TagType.List]: "List",
  [TagType.Compound]: "Compound",
  [TagType.IntArray]: "Int Array",
  [TagType.LongArray]: "Long Array",
};

// NBT Value Types
export type NbtByte = number;
export type NbtShort = number;
export type NbtInt = number;
export type NbtLong = bigint;
export type NbtFloat = number;
export type NbtDouble = number;
export type NbtByteArray = Int8Array;
export type NbtString = string;
export type NbtIntArray = Int32Array;
export type NbtLongArray = BigInt64Array;

export interface NbtList {
  type: TagType;
  value: NbtValue[];
}

export interface NbtCompound {
  [key: string]: NbtTag;
}

export type NbtValue =
  | NbtByte
  | NbtShort
  | NbtInt
  | NbtLong
  | NbtFloat
  | NbtDouble
  | NbtByteArray
  | NbtString
  | NbtList
  | NbtCompound
  | NbtIntArray
  | NbtLongArray;

export interface NbtTag {
  type: TagType;
  value: NbtValue;
}

// Tree node for UI representation
export interface NbtTreeNode {
  id: string;
  name: string;
  type: TagType;
  value: NbtValue;
  children?: NbtTreeNode[];
  parent?: NbtTreeNode;
  path: string[];
}

// File metadata
export interface NbtFileInfo {
  name: string;
  size: number;
  compression: "gzip" | "zlib" | "none";
  rootName: string;
}

// Compression types
export type CompressionType = "gzip" | "zlib" | "none";

// Region file types
export interface RegionChunk {
  x: number;
  z: number;
  timestamp: number;
  data: NbtCompound | null;
  compression: number;
}

export interface RegionFile {
  chunks: (RegionChunk | null)[];
  filename: string;
}

// Editor state
export interface EditorState {
  file: NbtFileInfo | null;
  root: NbtTreeNode | null;
  selectedNode: NbtTreeNode | null;
  expandedNodes: Set<string>;
  modified: boolean;
  clipboard: NbtTreeNode | null;
}

// Tag colors for UI
export const TagColors: Record<TagType, string> = {
  [TagType.End]: "#6b7280",
  [TagType.Byte]: "#e06c75",
  [TagType.Short]: "#d19a66",
  [TagType.Int]: "#e5c07b",
  [TagType.Long]: "#98c379",
  [TagType.Float]: "#56b6c2",
  [TagType.Double]: "#61afef",
  [TagType.ByteArray]: "#e06c75",
  [TagType.String]: "#c678dd",
  [TagType.List]: "#abb2bf",
  [TagType.Compound]: "#abb2bf",
  [TagType.IntArray]: "#e5c07b",
  [TagType.LongArray]: "#98c379",
};

// Helper function to check if a tag type is a container
export function isContainerType(type: TagType): boolean {
  return type === TagType.Compound || type === TagType.List;
}

// Helper function to check if a tag type is an array
export function isArrayType(type: TagType): boolean {
  return (
    type === TagType.ByteArray ||
    type === TagType.IntArray ||
    type === TagType.LongArray
  );
}

// Helper function to check if a tag type is numeric
export function isNumericType(type: TagType): boolean {
  return (
    type === TagType.Byte ||
    type === TagType.Short ||
    type === TagType.Int ||
    type === TagType.Long ||
    type === TagType.Float ||
    type === TagType.Double
  );
}

// Helper function to get display value
export function getDisplayValue(tag: NbtTag): string {
  switch (tag.type) {
    case TagType.Byte:
    case TagType.Short:
    case TagType.Int:
    case TagType.Float:
    case TagType.Double:
      return String(tag.value);
    case TagType.Long:
      return String(tag.value) + "L";
    case TagType.String:
      return `"${tag.value}"`;
    case TagType.ByteArray:
      return `[${(tag.value as NbtByteArray).length} bytes]`;
    case TagType.IntArray:
      return `[${(tag.value as NbtIntArray).length} ints]`;
    case TagType.LongArray:
      return `[${(tag.value as NbtLongArray).length} longs]`;
    case TagType.List: {
      const list = tag.value as NbtList;
      return `${list.value.length} entries`;
    }
    case TagType.Compound: {
      const compound = tag.value as NbtCompound;
      const count = Object.keys(compound).length;
      return `${count} ${count === 1 ? "entry" : "entries"}`;
    }
    default:
      return "";
  }
}

// Create default value for tag type
export function createDefaultValue(type: TagType): NbtValue {
  switch (type) {
    case TagType.Byte:
    case TagType.Short:
    case TagType.Int:
    case TagType.Float:
    case TagType.Double:
      return 0;
    case TagType.Long:
      return BigInt(0);
    case TagType.String:
      return "";
    case TagType.ByteArray:
      return new Int8Array(0);
    case TagType.IntArray:
      return new Int32Array(0);
    case TagType.LongArray:
      return new BigInt64Array(0);
    case TagType.List:
      return { type: TagType.Byte, value: [] };
    case TagType.Compound:
      return {};
    default:
      return 0;
  }
}

