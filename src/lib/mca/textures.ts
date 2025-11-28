// Block name to texture file mapping
export const blockTextures: Record<string, { top: string; side: string; bottom?: string }> = {
  // Basic blocks
  stone: { top: "stone.png", side: "stone.png" },
  granite: { top: "granite.png", side: "granite.png" },
  diorite: { top: "diorite.png", side: "diorite.png" },
  andesite: { top: "andesite.png", side: "andesite.png" },
  deepslate: { top: "deepslate_top.png", side: "deepslate.png" },
  
  // Dirt variants
  grass_block: { top: "grass_block_top.png", side: "grass_block_side.png", bottom: "dirt.png" },
  dirt: { top: "dirt.png", side: "dirt.png" },
  coarse_dirt: { top: "coarse_dirt.png", side: "coarse_dirt.png" },
  podzol: { top: "podzol_top.png", side: "podzol_side.png", bottom: "dirt.png" },
  rooted_dirt: { top: "rooted_dirt.png", side: "rooted_dirt.png" },
  mud: { top: "mud.png", side: "mud.png" },
  
  // Sand variants
  sand: { top: "sand.png", side: "sand.png" },
  red_sand: { top: "red_sand.png", side: "red_sand.png" },
  gravel: { top: "gravel.png", side: "gravel.png" },
  clay: { top: "clay.png", side: "clay.png" },
  
  // Stone variants
  cobblestone: { top: "cobblestone.png", side: "cobblestone.png" },
  mossy_cobblestone: { top: "mossy_cobblestone.png", side: "mossy_cobblestone.png" },
  stone_bricks: { top: "stone_bricks.png", side: "stone_bricks.png" },
  mossy_stone_bricks: { top: "mossy_stone_bricks.png", side: "mossy_stone_bricks.png" },
  
  // Ores
  coal_ore: { top: "coal_ore.png", side: "coal_ore.png" },
  iron_ore: { top: "iron_ore.png", side: "iron_ore.png" },
  gold_ore: { top: "gold_ore.png", side: "gold_ore.png" },
  diamond_ore: { top: "diamond_ore.png", side: "diamond_ore.png" },
  redstone_ore: { top: "redstone_ore.png", side: "redstone_ore.png" },
  lapis_ore: { top: "lapis_ore.png", side: "lapis_ore.png" },
  emerald_ore: { top: "emerald_ore.png", side: "emerald_ore.png" },
  copper_ore: { top: "copper_ore.png", side: "copper_ore.png" },
  
  // Deepslate ores
  deepslate_coal_ore: { top: "deepslate_coal_ore.png", side: "deepslate_coal_ore.png" },
  deepslate_iron_ore: { top: "deepslate_iron_ore.png", side: "deepslate_iron_ore.png" },
  deepslate_gold_ore: { top: "deepslate_gold_ore.png", side: "deepslate_gold_ore.png" },
  deepslate_diamond_ore: { top: "deepslate_diamond_ore.png", side: "deepslate_diamond_ore.png" },
  deepslate_redstone_ore: { top: "deepslate_redstone_ore.png", side: "deepslate_redstone_ore.png" },
  deepslate_lapis_ore: { top: "deepslate_lapis_ore.png", side: "deepslate_lapis_ore.png" },
  deepslate_emerald_ore: { top: "deepslate_emerald_ore.png", side: "deepslate_emerald_ore.png" },
  deepslate_copper_ore: { top: "deepslate_copper_ore.png", side: "deepslate_copper_ore.png" },
  
  // Wood logs
  oak_log: { top: "oak_log_top.png", side: "oak_log.png" },
  spruce_log: { top: "spruce_log_top.png", side: "spruce_log.png" },
  birch_log: { top: "birch_log_top.png", side: "birch_log.png" },
  jungle_log: { top: "jungle_log_top.png", side: "jungle_log.png" },
  acacia_log: { top: "acacia_log_top.png", side: "acacia_log.png" },
  dark_oak_log: { top: "dark_oak_log_top.png", side: "dark_oak_log.png" },
  cherry_log: { top: "cherry_log_top.png", side: "cherry_log.png" },
  mangrove_log: { top: "mangrove_log_top.png", side: "mangrove_log.png" },
  
  // Wood planks
  oak_planks: { top: "oak_planks.png", side: "oak_planks.png" },
  spruce_planks: { top: "spruce_planks.png", side: "spruce_planks.png" },
  birch_planks: { top: "birch_planks.png", side: "birch_planks.png" },
  jungle_planks: { top: "jungle_planks.png", side: "jungle_planks.png" },
  acacia_planks: { top: "acacia_planks.png", side: "acacia_planks.png" },
  dark_oak_planks: { top: "dark_oak_planks.png", side: "dark_oak_planks.png" },
  cherry_planks: { top: "cherry_planks.png", side: "cherry_planks.png" },
  mangrove_planks: { top: "mangrove_planks.png", side: "mangrove_planks.png" },
  
  // Leaves
  oak_leaves: { top: "oak_leaves.png", side: "oak_leaves.png" },
  spruce_leaves: { top: "spruce_leaves.png", side: "spruce_leaves.png" },
  birch_leaves: { top: "birch_leaves.png", side: "birch_leaves.png" },
  jungle_leaves: { top: "jungle_leaves.png", side: "jungle_leaves.png" },
  acacia_leaves: { top: "acacia_leaves.png", side: "acacia_leaves.png" },
  dark_oak_leaves: { top: "dark_oak_leaves.png", side: "dark_oak_leaves.png" },
  cherry_leaves: { top: "cherry_leaves.png", side: "cherry_leaves.png" },
  mangrove_leaves: { top: "mangrove_leaves.png", side: "mangrove_leaves.png" },
  azalea_leaves: { top: "azalea_leaves.png", side: "azalea_leaves.png" },
  
  // Fluids
  water: { top: "water_still.png", side: "water_still.png" },
  lava: { top: "lava_still.png", side: "lava_still.png" },
  
  // Cross model blocks (plants, flowers, etc.)
  // Grass and ferns
  short_grass: { top: "short_grass.png", side: "short_grass.png" },
  grass: { top: "short_grass.png", side: "short_grass.png" },
  tall_grass: { top: "tall_grass_top.png", side: "tall_grass_top.png" },
  fern: { top: "fern.png", side: "fern.png" },
  large_fern: { top: "large_fern_top.png", side: "large_fern_top.png" },
  
  // Flowers
  dandelion: { top: "dandelion.png", side: "dandelion.png" },
  poppy: { top: "poppy.png", side: "poppy.png" },
  blue_orchid: { top: "blue_orchid.png", side: "blue_orchid.png" },
  allium: { top: "allium.png", side: "allium.png" },
  azure_bluet: { top: "azure_bluet.png", side: "azure_bluet.png" },
  red_tulip: { top: "red_tulip.png", side: "red_tulip.png" },
  orange_tulip: { top: "orange_tulip.png", side: "orange_tulip.png" },
  white_tulip: { top: "white_tulip.png", side: "white_tulip.png" },
  pink_tulip: { top: "pink_tulip.png", side: "pink_tulip.png" },
  oxeye_daisy: { top: "oxeye_daisy.png", side: "oxeye_daisy.png" },
  cornflower: { top: "cornflower.png", side: "cornflower.png" },
  lily_of_the_valley: { top: "lily_of_the_valley.png", side: "lily_of_the_valley.png" },
  wither_rose: { top: "wither_rose.png", side: "wither_rose.png" },
  torchflower: { top: "torchflower.png", side: "torchflower.png" },
  
  // Saplings
  oak_sapling: { top: "oak_sapling.png", side: "oak_sapling.png" },
  spruce_sapling: { top: "spruce_sapling.png", side: "spruce_sapling.png" },
  birch_sapling: { top: "birch_sapling.png", side: "birch_sapling.png" },
  jungle_sapling: { top: "jungle_sapling.png", side: "jungle_sapling.png" },
  acacia_sapling: { top: "acacia_sapling.png", side: "acacia_sapling.png" },
  dark_oak_sapling: { top: "dark_oak_sapling.png", side: "dark_oak_sapling.png" },
  cherry_sapling: { top: "cherry_sapling.png", side: "cherry_sapling.png" },
  
  // Other plants
  dead_bush: { top: "dead_bush.png", side: "dead_bush.png" },
  seagrass: { top: "seagrass.png", side: "seagrass.png" },
  tall_seagrass: { top: "tall_seagrass_top.png", side: "tall_seagrass_top.png" },
  kelp: { top: "kelp.png", side: "kelp.png" },
  kelp_plant: { top: "kelp_plant.png", side: "kelp_plant.png" },
  sugar_cane: { top: "sugar_cane.png", side: "sugar_cane.png" },
  
  // Mushrooms
  red_mushroom: { top: "red_mushroom.png", side: "red_mushroom.png" },
  brown_mushroom: { top: "brown_mushroom.png", side: "brown_mushroom.png" },
  
  // Cave blocks
  dripstone_block: { top: "dripstone_block.png", side: "dripstone_block.png" },
  // Default pointed_dripstone (will be overridden based on properties)
  pointed_dripstone: { top: "pointed_dripstone_up_tip.png", side: "pointed_dripstone_up_tip.png" },
  // Pointed dripstone variants based on thickness and direction
  "pointed_dripstone_up_tip": { top: "pointed_dripstone_up_tip.png", side: "pointed_dripstone_up_tip.png" },
  "pointed_dripstone_up_tip_merge": { top: "pointed_dripstone_up_tip_merge.png", side: "pointed_dripstone_up_tip_merge.png" },
  "pointed_dripstone_up_frustum": { top: "pointed_dripstone_up_frustum.png", side: "pointed_dripstone_up_frustum.png" },
  "pointed_dripstone_up_middle": { top: "pointed_dripstone_up_middle.png", side: "pointed_dripstone_up_middle.png" },
  "pointed_dripstone_up_base": { top: "pointed_dripstone_up_base.png", side: "pointed_dripstone_up_base.png" },
  "pointed_dripstone_down_tip": { top: "pointed_dripstone_down_tip.png", side: "pointed_dripstone_down_tip.png" },
  "pointed_dripstone_down_tip_merge": { top: "pointed_dripstone_down_tip_merge.png", side: "pointed_dripstone_down_tip_merge.png" },
  "pointed_dripstone_down_frustum": { top: "pointed_dripstone_down_frustum.png", side: "pointed_dripstone_down_frustum.png" },
  "pointed_dripstone_down_middle": { top: "pointed_dripstone_down_middle.png", side: "pointed_dripstone_down_middle.png" },
  "pointed_dripstone_down_base": { top: "pointed_dripstone_down_base.png", side: "pointed_dripstone_down_base.png" },
  calcite: { top: "calcite.png", side: "calcite.png" },
  smooth_basalt: { top: "smooth_basalt.png", side: "smooth_basalt.png" },
  tuff: { top: "tuff.png", side: "tuff.png" },
  tuff_bricks: { top: "tuff_bricks.png", side: "tuff_bricks.png" },
  polished_tuff: { top: "polished_tuff.png", side: "polished_tuff.png" },
  magma_block: { top: "magma.png", side: "magma.png" },
  
  // Special blocks
  bedrock: { top: "bedrock.png", side: "bedrock.png" },
  obsidian: { top: "obsidian.png", side: "obsidian.png" },
  crying_obsidian: { top: "crying_obsidian.png", side: "crying_obsidian.png" },
  
  // Sandstone
  sandstone: { top: "sandstone_top.png", side: "sandstone.png", bottom: "sandstone_bottom.png" },
  red_sandstone: { top: "red_sandstone_top.png", side: "red_sandstone.png", bottom: "red_sandstone_bottom.png" },
  
  // Metal blocks
  iron_block: { top: "iron_block.png", side: "iron_block.png" },
  gold_block: { top: "gold_block.png", side: "gold_block.png" },
  diamond_block: { top: "diamond_block.png", side: "diamond_block.png" },
  emerald_block: { top: "emerald_block.png", side: "emerald_block.png" },
  lapis_block: { top: "lapis_block.png", side: "lapis_block.png" },
  redstone_block: { top: "redstone_block.png", side: "redstone_block.png" },
  copper_block: { top: "copper_block.png", side: "copper_block.png" },
  
  // Misc
  glowstone: { top: "glowstone.png", side: "glowstone.png" },
  netherrack: { top: "netherrack.png", side: "netherrack.png" },
  soul_sand: { top: "soul_sand.png", side: "soul_sand.png" },
  soul_soil: { top: "soul_soil.png", side: "soul_soil.png" },
  end_stone: { top: "end_stone.png", side: "end_stone.png" },
  snow_block: { top: "snow.png", side: "snow.png" },
  snow: { top: "snow.png", side: "snow.png" },
  powder_snow: { top: "powder_snow.png", side: "powder_snow.png" },
  ice: { top: "ice.png", side: "ice.png" },
  packed_ice: { top: "packed_ice.png", side: "packed_ice.png" },
  blue_ice: { top: "blue_ice.png", side: "blue_ice.png" },
  
  // Terracotta
  terracotta: { top: "terracotta.png", side: "terracotta.png" },
  white_terracotta: { top: "white_terracotta.png", side: "white_terracotta.png" },
  orange_terracotta: { top: "orange_terracotta.png", side: "orange_terracotta.png" },
  magenta_terracotta: { top: "magenta_terracotta.png", side: "magenta_terracotta.png" },
  light_blue_terracotta: { top: "light_blue_terracotta.png", side: "light_blue_terracotta.png" },
  yellow_terracotta: { top: "yellow_terracotta.png", side: "yellow_terracotta.png" },
  lime_terracotta: { top: "lime_terracotta.png", side: "lime_terracotta.png" },
  pink_terracotta: { top: "pink_terracotta.png", side: "pink_terracotta.png" },
  gray_terracotta: { top: "gray_terracotta.png", side: "gray_terracotta.png" },
  light_gray_terracotta: { top: "light_gray_terracotta.png", side: "light_gray_terracotta.png" },
  cyan_terracotta: { top: "cyan_terracotta.png", side: "cyan_terracotta.png" },
  purple_terracotta: { top: "purple_terracotta.png", side: "purple_terracotta.png" },
  blue_terracotta: { top: "blue_terracotta.png", side: "blue_terracotta.png" },
  brown_terracotta: { top: "brown_terracotta.png", side: "brown_terracotta.png" },
  green_terracotta: { top: "green_terracotta.png", side: "green_terracotta.png" },
  red_terracotta: { top: "red_terracotta.png", side: "red_terracotta.png" },
  black_terracotta: { top: "black_terracotta.png", side: "black_terracotta.png" },
  
  // Concrete
  white_concrete: { top: "white_concrete.png", side: "white_concrete.png" },
  orange_concrete: { top: "orange_concrete.png", side: "orange_concrete.png" },
  magenta_concrete: { top: "magenta_concrete.png", side: "magenta_concrete.png" },
  light_blue_concrete: { top: "light_blue_concrete.png", side: "light_blue_concrete.png" },
  yellow_concrete: { top: "yellow_concrete.png", side: "yellow_concrete.png" },
  lime_concrete: { top: "lime_concrete.png", side: "lime_concrete.png" },
  pink_concrete: { top: "pink_concrete.png", side: "pink_concrete.png" },
  gray_concrete: { top: "gray_concrete.png", side: "gray_concrete.png" },
  light_gray_concrete: { top: "light_gray_concrete.png", side: "light_gray_concrete.png" },
  cyan_concrete: { top: "cyan_concrete.png", side: "cyan_concrete.png" },
  purple_concrete: { top: "purple_concrete.png", side: "purple_concrete.png" },
  blue_concrete: { top: "blue_concrete.png", side: "blue_concrete.png" },
  brown_concrete: { top: "brown_concrete.png", side: "brown_concrete.png" },
  green_concrete: { top: "green_concrete.png", side: "green_concrete.png" },
  red_concrete: { top: "red_concrete.png", side: "red_concrete.png" },
  black_concrete: { top: "black_concrete.png", side: "black_concrete.png" },
  
  // Wool
  white_wool: { top: "white_wool.png", side: "white_wool.png" },
  orange_wool: { top: "orange_wool.png", side: "orange_wool.png" },
  magenta_wool: { top: "magenta_wool.png", side: "magenta_wool.png" },
  light_blue_wool: { top: "light_blue_wool.png", side: "light_blue_wool.png" },
  yellow_wool: { top: "yellow_wool.png", side: "yellow_wool.png" },
  lime_wool: { top: "lime_wool.png", side: "lime_wool.png" },
  pink_wool: { top: "pink_wool.png", side: "pink_wool.png" },
  gray_wool: { top: "gray_wool.png", side: "gray_wool.png" },
  light_gray_wool: { top: "light_gray_wool.png", side: "light_gray_wool.png" },
  cyan_wool: { top: "cyan_wool.png", side: "cyan_wool.png" },
  purple_wool: { top: "purple_wool.png", side: "purple_wool.png" },
  blue_wool: { top: "blue_wool.png", side: "blue_wool.png" },
  brown_wool: { top: "brown_wool.png", side: "brown_wool.png" },
  green_wool: { top: "green_wool.png", side: "green_wool.png" },
  red_wool: { top: "red_wool.png", side: "red_wool.png" },
  black_wool: { top: "black_wool.png", side: "black_wool.png" },
  
  // Nether blocks
  nether_bricks: { top: "nether_bricks.png", side: "nether_bricks.png" },
  red_nether_bricks: { top: "red_nether_bricks.png", side: "red_nether_bricks.png" },
  basalt: { top: "basalt_top.png", side: "basalt_side.png" },
  polished_basalt: { top: "polished_basalt_top.png", side: "polished_basalt_side.png" },
  blackstone: { top: "blackstone_top.png", side: "blackstone.png" },
  
  // Quartz
  quartz_block: { top: "quartz_block_top.png", side: "quartz_block_side.png", bottom: "quartz_block_bottom.png" },
  smooth_quartz: { top: "quartz_block_bottom.png", side: "quartz_block_bottom.png" },
  
  // Bricks
  bricks: { top: "bricks.png", side: "bricks.png" },
  
  // Prismarine
  prismarine: { top: "prismarine.png", side: "prismarine.png" },
  prismarine_bricks: { top: "prismarine_bricks.png", side: "prismarine_bricks.png" },
  dark_prismarine: { top: "dark_prismarine.png", side: "dark_prismarine.png" },
  
  // Amethyst
  amethyst_block: { top: "amethyst_block.png", side: "amethyst_block.png" },
  budding_amethyst: { top: "budding_amethyst.png", side: "budding_amethyst.png" },
  
  // Copper variants
  exposed_copper: { top: "exposed_copper.png", side: "exposed_copper.png" },
  weathered_copper: { top: "weathered_copper.png", side: "weathered_copper.png" },
  oxidized_copper: { top: "oxidized_copper.png", side: "oxidized_copper.png" },
  
  // Moss
  moss_block: { top: "moss_block.png", side: "moss_block.png" },
  
  // Sculk
  sculk: { top: "sculk.png", side: "sculk.png" },
};

// Base path for assets
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

// Texture cache
const textureCache = new Map<string, HTMLImageElement>();
const loadingPromises = new Map<string, Promise<HTMLImageElement>>();

export function loadTexture(filename: string): Promise<HTMLImageElement> {
  const cached = textureCache.get(filename);
  if (cached) return Promise.resolve(cached);
  
  const loading = loadingPromises.get(filename);
  if (loading) return loading;
  
  const promise = new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      textureCache.set(filename, img);
      loadingPromises.delete(filename);
      resolve(img);
    };
    img.onerror = () => {
      loadingPromises.delete(filename);
      reject(new Error(`Failed to load texture: ${filename}`));
    };
    img.src = `${basePath}/textures/${filename}`;
  });
  
  loadingPromises.set(filename, promise);
  return promise;
}

export async function preloadTextures(blockNames: string[]): Promise<void> {
  const uniqueTextures = new Set<string>();
  
  for (const name of blockNames) {
    const textures = blockTextures[name];
    if (textures) {
      uniqueTextures.add(textures.top);
      uniqueTextures.add(textures.side);
      if (textures.bottom) uniqueTextures.add(textures.bottom);
    }
  }
  
  await Promise.allSettled(
    Array.from(uniqueTextures).map(filename => loadTexture(filename))
  );
}

export function getBlockTextures(blockName: string): { top: HTMLImageElement | null; side: HTMLImageElement | null; bottom: HTMLImageElement | null } {
  const textureDef = blockTextures[blockName];
  if (!textureDef) {
    return { top: null, side: null, bottom: null };
  }
  
  return {
    top: textureCache.get(textureDef.top) || null,
    side: textureCache.get(textureDef.side) || null,
    bottom: textureCache.get(textureDef.bottom || textureDef.top) || null,
  };
}

export function hasTexture(blockName: string): boolean {
  return blockName in blockTextures;
}

