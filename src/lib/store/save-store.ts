import { create } from "zustand";
import { MinecraftSave, DimensionData, RegionFileData } from "../save/parser";
import { downloadSaveAsZip } from "../save/download";

interface SaveStore {
  // Current loaded save
  save: MinecraftSave | null;
  setSave: (save: MinecraftSave | null) => void;
  
  // Selected dimension
  selectedDimension: "overworld" | "nether" | "end";
  setSelectedDimension: (dim: "overworld" | "nether" | "end") => void;
  
  // Modified files tracking
  modifiedFiles: Map<string, Uint8Array>;
  markFileModified: (path: string, data: Uint8Array) => void;
  isFileModified: (path: string) => boolean;
  getModifiedData: (path: string) => Uint8Array | undefined;
  clearModifications: () => void;
  
  // Get current dimension data
  getCurrentDimension: () => DimensionData | null;
  
  // Get all regions from current dimension as LoadedRegion format for MCA viewer
  getRegionsForViewer: () => {
    filename: string;
    buffer: Uint8Array;
    data: import("../mca/parser").RegionData;
    regionX: number;
    regionZ: number;
  }[];
  
  // Download save as ZIP
  downloadAsZip: (onProgress?: (progress: number, message: string) => void) => Promise<void>;
  
  // Clear save data
  clearSave: () => void;
}

export const useSaveStore = create<SaveStore>((set, get) => ({
  save: null,
  setSave: (save) => set({ save, modifiedFiles: new Map() }),
  
  selectedDimension: "overworld",
  setSelectedDimension: (dim) => set({ selectedDimension: dim }),
  
  // Modified files tracking
  modifiedFiles: new Map(),
  
  markFileModified: (path, data) => {
    const { modifiedFiles } = get();
    const newMap = new Map(modifiedFiles);
    newMap.set(path, data);
    set({ modifiedFiles: newMap });
  },
  
  isFileModified: (path) => {
    return get().modifiedFiles.has(path);
  },
  
  getModifiedData: (path) => {
    return get().modifiedFiles.get(path);
  },
  
  clearModifications: () => {
    set({ modifiedFiles: new Map() });
  },
  
  getCurrentDimension: () => {
    const { save, selectedDimension } = get();
    if (!save) return null;
    
    switch (selectedDimension) {
      case "overworld":
        return save.dimensions.overworld;
      case "nether":
        return save.dimensions.nether;
      case "end":
        return save.dimensions.end;
      default:
        return null;
    }
  },
  
  getRegionsForViewer: () => {
    const dimension = get().getCurrentDimension();
    if (!dimension) return [];
    
    return Array.from(dimension.regions.values()).map((region: RegionFileData) => ({
      filename: region.filename,
      buffer: region.buffer,
      data: region.regionData,
      regionX: region.regionX,
      regionZ: region.regionZ,
    }));
  },
  
  downloadAsZip: async (onProgress) => {
    const { save, modifiedFiles } = get();
    if (!save) {
      throw new Error("No save loaded");
    }
    
    await downloadSaveAsZip(save, modifiedFiles, onProgress);
  },
  
  clearSave: () => set({ 
    save: null, 
    selectedDimension: "overworld",
    modifiedFiles: new Map()
  }),
}));

