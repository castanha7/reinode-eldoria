// ---------------------------------------------------------------------------
// tiles.js — definição dos tipos de tile (constantes + metadados)
// ---------------------------------------------------------------------------

export const TILE = {
  VOID: 0,
  GRASS: 1,
  GRASS_TALL: 2,
  DIRT: 3,
  ROAD: 4,
  WATER: 5,
  SAND: 6,
  SWAMP: 7,
  FLOWERS: 8,
  CROP: 9,
  COBBLE: 10,
  STONE_FLOOR: 11,
  WOOD_FLOOR: 12,
  WALL: 13,        // muralha de pedra (sólido)
  TREE: 14,        // sólido
  PINE: 15,        // sólido
  ROCK: 16,        // sólido
  MOUNTAIN: 17,    // sólido
  FENCE: 18,       // sólido
  BRIDGE: 19,
  BUSH: 20,        // sólido (arbusto alto)
  CAVE_FLOOR: 21,
  CAVE_WALL: 22,   // sólido
  STUMP: 23,
  LILY: 24,
  LAVA: 25,        // sólido
  CRYSTAL: 26,     // sólido
  RUINS: 27,
  DARK_GRASS: 28,
  MOSS_ROCK: 29,
  PORTAL: 30,
  SAND_PATH: 31,
  STAIRS: 32,
};

/** Sólidos para colisão. */
export const SOLID = new Uint8Array(64);
for (const k of ['WALL', 'TREE', 'PINE', 'ROCK', 'MOUNTAIN', 'FENCE', 'BUSH', 'CAVE_WALL', 'STUMP', 'LAVA', 'CRYSTAL']) {
  SOLID[TILE[k]] = 1;
}

/** Bloqueia o MOVIMENTO de corpos (sólidos + água). Projéteis voam sobre a água. */
export const BLOCK = new Uint8Array(64);
for (let i = 0; i < 64; i++) BLOCK[i] = SOLID[i];
BLOCK[TILE.WATER] = 1;
BLOCK[TILE.LILY] = 1;

/** Multiplicador de velocidade ao pisar no tile. */
export const SPEED_MUL = new Float32Array(64).fill(1);
SPEED_MUL[TILE.SWAMP] = 0.72;
SPEED_MUL[TILE.GRASS_TALL] = 0.94;
SPEED_MUL[TILE.SAND] = 0.92;

/** Bloqueia visão/linha de tiro. */
export const OPAQUE = new Uint8Array(64);
for (const k of ['WALL', 'TREE', 'PINE', 'ROCK', 'MOUNTAIN', 'CAVE_WALL', 'BUSH']) {
  OPAQUE[TILE[k]] = 1;
}

/** Dano por tick. */
export const HAZARD = { [TILE.LAVA]: 18, [TILE.SWAMP]: 0 };

/** Custo de movimento (pathfinding simples). */
export const MOVE_COST = { [TILE.WATER]: 2.4, [TILE.SWAMP]: 1.8, [TILE.GRASS_TALL]: 1.15 };

export const TILE_NAMES = {
  [TILE.GRASS]: 'Campo',
  [TILE.WATER]: 'Água',
  [TILE.SWAMP]: 'Pântano',
  [TILE.CAVE_FLOOR]: 'Caverna',
  [TILE.LAVA]: 'Lava',
};

export function isSolid(t) { return SOLID[t] === 1; }
export function isBlocking(t) { return BLOCK[t] === 1; }
