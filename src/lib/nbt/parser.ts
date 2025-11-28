import * as nbt from "prismarine-nbt";
import pako from "pako";
import {
  TagType,
  NbtCompound,
  NbtTreeNode,
  NbtFileInfo,
  NbtValue,
  NbtList,
  CompressionType,
  NbtTag,
} from "./types";

// Convert prismarine-nbt tag type to our TagType enum
function convertTagType(type: string): TagType {
  const typeMap: Record<string, TagType> = {
    byte: TagType.Byte,
    short: TagType.Short,
    int: TagType.Int,
    long: TagType.Long,
    float: TagType.Float,
    double: TagType.Double,
    byteArray: TagType.ByteArray,
    string: TagType.String,
    list: TagType.List,
    compound: TagType.Compound,
    intArray: TagType.IntArray,
    longArray: TagType.LongArray,
  };
  return typeMap[type] ?? TagType.End;
}

// Convert TagType enum to prismarine-nbt type string
function convertToNbtType(type: TagType): string {
  const typeMap: Record<TagType, string> = {
    [TagType.End]: "end",
    [TagType.Byte]: "byte",
    [TagType.Short]: "short",
    [TagType.Int]: "int",
    [TagType.Long]: "long",
    [TagType.Float]: "float",
    [TagType.Double]: "double",
    [TagType.ByteArray]: "byteArray",
    [TagType.String]: "string",
    [TagType.List]: "list",
    [TagType.Compound]: "compound",
    [TagType.IntArray]: "intArray",
    [TagType.LongArray]: "longArray",
  };
  return typeMap[type];
}

// Convert prismarine-nbt value to our NbtValue type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function convertValue(type: string, value: any): NbtValue {
  switch (type) {
    case "byte":
    case "short":
    case "int":
    case "float":
    case "double":
      return value as number;
    case "long":
      return Array.isArray(value) ? BigInt(value[0]) * BigInt(2 ** 32) + BigInt(value[1] >>> 0) : BigInt(value);
    case "string":
      return value as string;
    case "byteArray":
      return new Int8Array(value);
    case "intArray":
      return new Int32Array(value);
    case "longArray": {
      const arr = new BigInt64Array(value.length);
      for (let i = 0; i < value.length; i++) {
        const v = value[i];
        arr[i] = Array.isArray(v) ? BigInt(v[0]) * BigInt(2 ** 32) + BigInt(v[1] >>> 0) : BigInt(v);
      }
      return arr;
    }
    case "list": {
      const listValue = value as { type: string; value: unknown[] };
      return {
        type: convertTagType(listValue.type),
        value: listValue.value.map((v) => convertValue(listValue.type, v)),
      } as NbtList;
    }
    case "compound": {
      const compound: NbtCompound = {};
      for (const [key, val] of Object.entries(value as Record<string, { type: string; value: unknown }>)) {
        compound[key] = {
          type: convertTagType(val.type),
          value: convertValue(val.type, val.value),
        };
      }
      return compound;
    }
    default:
      return value;
  }
}

// Convert our NbtValue back to prismarine-nbt format
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function convertToPrismarineValue(type: TagType, value: NbtValue): any {
  switch (type) {
    case TagType.Byte:
    case TagType.Short:
    case TagType.Int:
    case TagType.Float:
    case TagType.Double:
      return value;
    case TagType.Long: {
      const bigVal = value as bigint;
      return [Number(bigVal >> BigInt(32)), Number(bigVal & BigInt(0xffffffff))];
    }
    case TagType.String:
      return value;
    case TagType.ByteArray:
      return Array.from(value as Int8Array);
    case TagType.IntArray:
      return Array.from(value as Int32Array);
    case TagType.LongArray: {
      const arr = value as BigInt64Array;
      return Array.from(arr).map((v) => [Number(v >> BigInt(32)), Number(v & BigInt(0xffffffff))]);
    }
    case TagType.List: {
      const list = value as NbtList;
      return {
        type: convertToNbtType(list.type),
        value: list.value.map((v) => convertToPrismarineValue(list.type, v)),
      };
    }
    case TagType.Compound: {
      const compound = value as NbtCompound;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result: Record<string, any> = {};
      for (const [key, tag] of Object.entries(compound)) {
        result[key] = {
          type: convertToNbtType(tag.type),
          value: convertToPrismarineValue(tag.type, tag.value),
        };
      }
      return result;
    }
    default:
      return value;
  }
}

// Generate unique ID for tree nodes
let nodeIdCounter = 0;
function generateNodeId(): string {
  return `node-${++nodeIdCounter}`;
}

// Reset node ID counter (call when loading new file)
export function resetNodeIdCounter(): void {
  nodeIdCounter = 0;
}

// Convert parsed NBT to tree structure
function buildTreeNode(
  name: string,
  tag: NbtTag,
  path: string[],
  parent?: NbtTreeNode
): NbtTreeNode {
  const node: NbtTreeNode = {
    id: generateNodeId(),
    name,
    type: tag.type,
    value: tag.value,
    path: [...path, name],
    parent,
  };

  if (tag.type === TagType.Compound) {
    const compound = tag.value as NbtCompound;
    node.children = Object.entries(compound)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, childTag]) => buildTreeNode(key, childTag, node.path, node));
  } else if (tag.type === TagType.List) {
    const list = tag.value as NbtList;
    node.children = list.value.map((value, index) =>
      buildTreeNode(
        String(index),
        { type: list.type, value },
        node.path,
        node
      )
    );
  }

  return node;
}

// Detect compression type from buffer
function detectCompression(buffer: Uint8Array): CompressionType {
  // GZip magic number: 1f 8b
  if (buffer[0] === 0x1f && buffer[1] === 0x8b) {
    return "gzip";
  }
  // Zlib header: 78 01, 78 9c, 78 da
  if (buffer[0] === 0x78 && (buffer[1] === 0x01 || buffer[1] === 0x9c || buffer[1] === 0xda)) {
    return "zlib";
  }
  return "none";
}

// Decompress data if needed
function decompressData(buffer: Uint8Array, compression: CompressionType): Uint8Array {
  switch (compression) {
    case "gzip":
      return pako.ungzip(buffer);
    case "zlib":
      return pako.inflate(buffer);
    default:
      return buffer;
  }
}

// Compress data
function compressData(buffer: Uint8Array, compression: CompressionType): Uint8Array {
  switch (compression) {
    case "gzip":
      return pako.gzip(buffer);
    case "zlib":
      return pako.deflate(buffer);
    default:
      return buffer;
  }
}

// Parse NBT file
export async function parseNbtFile(
  file: File
): Promise<{ tree: NbtTreeNode; info: NbtFileInfo }> {
  resetNodeIdCounter();

  const buffer = new Uint8Array(await file.arrayBuffer());
  const compression = detectCompression(buffer);
  const decompressed = decompressData(buffer, compression);

  const { parsed, type } = await nbt.parse(Buffer.from(decompressed));
  
  const rootName = parsed.name || "Data";
  const rootTag: NbtTag = {
    type: convertTagType(type),
    value: convertValue(type, parsed.value),
  };

  const tree = buildTreeNode(rootName, rootTag, []);

  const info: NbtFileInfo = {
    name: file.name,
    size: file.size,
    compression,
    rootName,
  };

  return { tree, info };
}

// Parse NBT from buffer (for region chunks)
export async function parseNbtBuffer(
  buffer: Uint8Array,
  compression: CompressionType = "none"
): Promise<NbtTreeNode> {
  const decompressed = decompressData(buffer, compression);
  const { parsed, type } = await nbt.parse(Buffer.from(decompressed));

  const rootTag: NbtTag = {
    type: convertTagType(type),
    value: convertValue(type, parsed.value),
  };

  return buildTreeNode(parsed.name || "Data", rootTag, []);
}

// Serialize tree back to NBT buffer
export function serializeNbtTree(
  tree: NbtTreeNode,
  compression: CompressionType = "gzip"
): Uint8Array {
  const prismarineValue = convertToPrismarineValue(tree.type, tree.value);
  
  const nbtData = nbt.writeUncompressed({
    name: tree.name,
    type: "compound" as const,
    value: prismarineValue,
  });

  return compressData(new Uint8Array(nbtData), compression);
}

// Update a node value in the tree
export function updateNodeValue(
  root: NbtTreeNode,
  nodePath: string[],
  newValue: NbtValue
): NbtTreeNode {
  // Deep clone the tree
  const clonedRoot = cloneTree(root);
  
  // Find and update the node
  const node = findNodeByPath(clonedRoot, nodePath);
  if (node) {
    node.value = newValue;
    // Also update the parent's value reference
    updateParentValues(clonedRoot, nodePath);
  }
  
  return clonedRoot;
}

// Clone tree structure
function cloneTree(node: NbtTreeNode, parent?: NbtTreeNode): NbtTreeNode {
  const cloned: NbtTreeNode = {
    id: node.id,
    name: node.name,
    type: node.type,
    value: cloneValue(node.type, node.value),
    path: [...node.path],
    parent,
  };

  if (node.children) {
    cloned.children = node.children.map((child) => cloneTree(child, cloned));
  }

  return cloned;
}

// Clone NBT value
function cloneValue(type: TagType, value: NbtValue): NbtValue {
  switch (type) {
    case TagType.ByteArray:
      return new Int8Array(value as Int8Array);
    case TagType.IntArray:
      return new Int32Array(value as Int32Array);
    case TagType.LongArray:
      return new BigInt64Array(value as BigInt64Array);
    case TagType.List: {
      const list = value as NbtList;
      return {
        type: list.type,
        value: list.value.map((v) => cloneValue(list.type, v)),
      };
    }
    case TagType.Compound: {
      const compound = value as NbtCompound;
      const cloned: NbtCompound = {};
      for (const [key, tag] of Object.entries(compound)) {
        cloned[key] = {
          type: tag.type,
          value: cloneValue(tag.type, tag.value),
        };
      }
      return cloned;
    }
    default:
      return value;
  }
}

// Find node by path
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

// Update parent compound/list values after child modification
function updateParentValues(root: NbtTreeNode, path: string[]): void {
  for (let i = path.length - 1; i >= 1; i--) {
    const parentPath = path.slice(0, i);
    const parent = findNodeByPath(root, parentPath);
    const child = findNodeByPath(root, path.slice(0, i + 1));

    if (!parent || !child) continue;

    if (parent.type === TagType.Compound) {
      const compound = parent.value as NbtCompound;
      compound[child.name] = { type: child.type, value: child.value };
    } else if (parent.type === TagType.List) {
      const list = parent.value as NbtList;
      const index = parseInt(child.name);
      list.value[index] = child.value;
    }
  }
}

// Add a new tag to a compound or list
export function addTag(
  root: NbtTreeNode,
  parentPath: string[],
  name: string,
  type: TagType,
  value: NbtValue
): NbtTreeNode {
  const clonedRoot = cloneTree(root);
  const parent = findNodeByPath(clonedRoot, parentPath);

  if (!parent) return clonedRoot;

  const newNode: NbtTreeNode = {
    id: generateNodeId(),
    name,
    type,
    value,
    path: [...parentPath, name],
    parent,
  };

  if (parent.type === TagType.Compound) {
    const compound = parent.value as NbtCompound;
    compound[name] = { type, value };
    parent.children = parent.children || [];
    parent.children.push(newNode);
    parent.children.sort((a, b) => a.name.localeCompare(b.name));
  } else if (parent.type === TagType.List) {
    const list = parent.value as NbtList;
    list.value.push(value);
    parent.children = parent.children || [];
    newNode.name = String(parent.children.length);
    newNode.path = [...parentPath, newNode.name];
    parent.children.push(newNode);
  }

  updateParentValues(clonedRoot, parentPath);
  return clonedRoot;
}

// Delete a tag from compound or list
export function deleteTag(root: NbtTreeNode, nodePath: string[]): NbtTreeNode {
  if (nodePath.length <= 1) return root; // Can't delete root

  const clonedRoot = cloneTree(root);
  const parentPath = nodePath.slice(0, -1);
  const parent = findNodeByPath(clonedRoot, parentPath);
  const nodeName = nodePath[nodePath.length - 1];

  if (!parent) return clonedRoot;

  if (parent.type === TagType.Compound) {
    const compound = parent.value as NbtCompound;
    delete compound[nodeName];
    parent.children = parent.children?.filter((c) => c.name !== nodeName);
  } else if (parent.type === TagType.List) {
    const list = parent.value as NbtList;
    const index = parseInt(nodeName);
    list.value.splice(index, 1);
    parent.children?.splice(index, 1);
    // Update indices
    parent.children?.forEach((c, i) => {
      c.name = String(i);
      c.path = [...parentPath, String(i)];
    });
  }

  updateParentValues(clonedRoot, parentPath);
  return clonedRoot;
}

// Rename a tag in a compound
export function renameTag(
  root: NbtTreeNode,
  nodePath: string[],
  newName: string
): NbtTreeNode {
  if (nodePath.length <= 1) return root; // Can't rename root

  const clonedRoot = cloneTree(root);
  const parentPath = nodePath.slice(0, -1);
  const parent = findNodeByPath(clonedRoot, parentPath);
  const node = findNodeByPath(clonedRoot, nodePath);
  const oldName = nodePath[nodePath.length - 1];

  if (!parent || !node || parent.type !== TagType.Compound) return clonedRoot;

  const compound = parent.value as NbtCompound;
  const tag = compound[oldName];
  delete compound[oldName];
  compound[newName] = tag;

  node.name = newName;
  node.path = [...parentPath, newName];

  // Re-sort children
  if (parent.children) {
    parent.children.sort((a, b) => a.name.localeCompare(b.name));
  }

  return clonedRoot;
}

// Export the cloneTree function for use in hooks
export { cloneTree, findNodeByPath };

