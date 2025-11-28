// Minecraft biome colors (grass/foliage tint colors)
export const BIOME_COLORS: Record<string, [number, number, number]> = {
  // Overworld biomes
  ocean: [0, 63, 127],
  deep_ocean: [0, 47, 95],
  frozen_ocean: [141, 180, 234],
  deep_frozen_ocean: [115, 155, 200],
  cold_ocean: [47, 95, 143],
  deep_cold_ocean: [31, 79, 127],
  lukewarm_ocean: [31, 95, 159],
  deep_lukewarm_ocean: [31, 79, 143],
  warm_ocean: [63, 127, 175],
  
  river: [63, 127, 191],
  frozen_river: [141, 180, 234],
  
  beach: [219, 211, 160],
  snowy_beach: [230, 225, 220],
  stony_shore: [136, 136, 136],
  
  plains: [141, 179, 96],
  sunflower_plains: [181, 199, 76],
  snowy_plains: [240, 252, 255],
  ice_spikes: [200, 220, 255],
  
  desert: [219, 197, 135],
  
  swamp: [107, 119, 71],
  mangrove_swamp: [95, 117, 71],
  
  forest: [89, 145, 67],
  flower_forest: [109, 165, 87],
  birch_forest: [125, 175, 85],
  old_growth_birch_forest: [135, 185, 95],
  dark_forest: [64, 81, 26],
  
  taiga: [106, 148, 89],
  old_growth_pine_taiga: [95, 135, 75],
  old_growth_spruce_taiga: [85, 120, 65],
  snowy_taiga: [140, 180, 160],
  
  savanna: [189, 178, 95],
  savanna_plateau: [189, 178, 95],
  windswept_savanna: [169, 158, 75],
  
  jungle: [83, 123, 9],
  sparse_jungle: [103, 143, 29],
  bamboo_jungle: [93, 133, 19],
  
  badlands: [217, 69, 46],
  eroded_badlands: [197, 49, 26],
  wooded_badlands: [167, 89, 66],
  
  meadow: [131, 169, 86],
  grove: [140, 180, 160],
  snowy_slopes: [220, 235, 245],
  frozen_peaks: [200, 220, 240],
  jagged_peaks: [190, 210, 230],
  stony_peaks: [150, 150, 150],
  
  mushroom_fields: [125, 103, 125],
  
  windswept_hills: [136, 163, 136],
  windswept_gravelly_hills: [126, 153, 126],
  windswept_forest: [116, 143, 116],
  
  cherry_grove: [255, 182, 193],
  
  // Nether biomes
  nether_wastes: [111, 54, 53],
  soul_sand_valley: [84, 64, 51],
  crimson_forest: [148, 46, 46],
  warped_forest: [49, 111, 111],
  basalt_deltas: [64, 64, 72],
  
  // End biomes
  the_end: [95, 87, 111],
  small_end_islands: [95, 87, 111],
  end_midlands: [105, 97, 121],
  end_highlands: [115, 107, 131],
  end_barrens: [85, 77, 101],
  
  // Cave biomes
  lush_caves: [83, 143, 49],
  dripstone_caves: [129, 116, 99],
  deep_dark: [17, 23, 31],
  
  // Default
  the_void: [0, 0, 0],
};

// Biome ID to name mapping (for older Minecraft versions using numeric IDs)
export const BIOME_ID_MAP: Record<number, string> = {
  0: "ocean",
  1: "plains",
  2: "desert",
  3: "windswept_hills",
  4: "forest",
  5: "taiga",
  6: "swamp",
  7: "river",
  8: "nether_wastes",
  9: "the_end",
  10: "frozen_ocean",
  11: "frozen_river",
  12: "snowy_plains",
  13: "snowy_mountains",
  14: "mushroom_fields",
  15: "mushroom_field_shore",
  16: "beach",
  17: "desert_hills",
  18: "wooded_hills",
  19: "taiga_hills",
  20: "mountain_edge",
  21: "jungle",
  22: "jungle_hills",
  23: "sparse_jungle",
  24: "deep_ocean",
  25: "stony_shore",
  26: "snowy_beach",
  27: "birch_forest",
  28: "birch_forest_hills",
  29: "dark_forest",
  30: "snowy_taiga",
  31: "snowy_taiga_hills",
  32: "old_growth_pine_taiga",
  33: "giant_tree_taiga_hills",
  34: "windswept_forest",
  35: "savanna",
  36: "savanna_plateau",
  37: "badlands",
  38: "wooded_badlands",
  39: "badlands_plateau",
  44: "warm_ocean",
  45: "lukewarm_ocean",
  46: "cold_ocean",
  47: "deep_warm_ocean",
  48: "deep_lukewarm_ocean",
  49: "deep_cold_ocean",
  50: "deep_frozen_ocean",
  127: "the_void",
  129: "sunflower_plains",
  130: "desert_lakes",
  131: "windswept_gravelly_hills",
  132: "flower_forest",
  133: "taiga_mountains",
  134: "swamp_hills",
  140: "ice_spikes",
  149: "modified_jungle",
  151: "modified_jungle_edge",
  155: "old_growth_birch_forest",
  156: "tall_birch_hills",
  157: "dark_forest_hills",
  158: "snowy_taiga_mountains",
  160: "old_growth_spruce_taiga",
  161: "giant_spruce_taiga_hills",
  162: "modified_gravelly_mountains",
  163: "windswept_savanna",
  164: "shattered_savanna_plateau",
  165: "eroded_badlands",
  166: "modified_wooded_badlands_plateau",
  167: "modified_badlands_plateau",
  168: "bamboo_jungle",
  169: "bamboo_jungle_hills",
  170: "soul_sand_valley",
  171: "crimson_forest",
  172: "warped_forest",
  173: "basalt_deltas",
  174: "dripstone_caves",
  175: "lush_caves",
  177: "meadow",
  178: "grove",
  179: "snowy_slopes",
  180: "frozen_peaks",
  181: "jagged_peaks",
  182: "stony_peaks",
  183: "deep_dark",
  184: "mangrove_swamp",
  185: "cherry_grove",
};

export function getBiomeColor(biomeId: number | string): [number, number, number] {
  if (typeof biomeId === "string") {
    // Remove minecraft: prefix if present
    const name = biomeId.replace("minecraft:", "");
    return BIOME_COLORS[name] || [100, 140, 80];
  }
  
  // Numeric ID
  const biomeName = BIOME_ID_MAP[biomeId];
  if (biomeName) {
    return BIOME_COLORS[biomeName] || [100, 140, 80];
  }
  
  return [100, 140, 80]; // Default grass color
}

export function getBiomeName(biomeId: number | string): string {
  if (typeof biomeId === "string") {
    return biomeId.replace("minecraft:", "");
  }
  return BIOME_ID_MAP[biomeId] || "unknown";
}

