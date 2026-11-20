// The 12×9 board. Cell coords are integer tile centres → world metres:
// world.x = cell.x - GRID.cols/2 + 0.5, world.z = cell.z - GRID.rows/2 + 0.5.
// Stations occupy counter cells (non-walkable); the player stands in the
// adjacent free cell to use them (approach cell listed per station).

import { GRID } from '../config.ts';

export interface StationDef {
  id: string;
  kind: 'crate' | 'chop' | 'grill' | 'plate' | 'table' | 'bin' | 'decor';
  cells: [number, number][];   // occupied cells (blocking)
  use: [number, number];       // where the player stands to interact
  dish?: 'pork' | 'mushroom' | 'mixian';
  label: string;
}

// Station cells along the back wall (z=7) + trash + left-wall decor.
export const STATIONS: StationDef[] = [
  { id: 'bin',        kind: 'bin',   label: '垃圾桶',   cells: [[0, 7]], use: [0, 6] },
  { id: 'crate-pork', kind: 'crate', label: '五花肉箱', dish: 'pork',     cells: [[1, 7]], use: [1, 6] },
  { id: 'crate-mush', kind: 'crate', label: '菌子筐',   dish: 'mushroom', cells: [[2, 7]], use: [2, 6] },
  { id: 'crate-mix',  kind: 'crate', label: '米线筐',   dish: 'mixian',   cells: [[3, 7]], use: [3, 6] },
  { id: 'chop',       kind: 'chop',  label: '切配台',   cells: [[4, 7], [5, 7]], use: [4.5, 6] },
  { id: 'grill',      kind: 'grill', label: '炭火烤炉', cells: [[6, 7], [7, 7], [8, 7]], use: [7, 6] },
  { id: 'plate',      kind: 'plate', label: '装盘台',   cells: [[9, 7], [10, 7]], use: [9.5, 6] },
];

// Dining tables: each occupies its own footprint; chairs face the table.
export interface TableDef {
  id: string;
  pos: [number, number];   // centre in cell coords
  use: [number, number];   // where the player stands to serve
  seat: [number, number];  // where the customer sits
}

export const TABLES: TableDef[] = [
  { id: 't1', pos: [2.2, 1.6], use: [2.2, 2.8], seat: [1.4, 1.6] },
  { id: 't2', pos: [5.8, 1.6], use: [5.8, 2.8], seat: [5.0, 1.6] },
  { id: 't3', pos: [9.4, 1.6], use: [9.4, 2.8], seat: [8.6, 1.6] },
  { id: 't4', pos: [7.6, 3.6], use: [7.6, 4.8], seat: [6.8, 3.6] },
];

export const DOOR: [number, number] = [0.7, 0.4];      // customer entry (cell coords)
export const PLAYER_SPAWN: [number, number] = [3, 4];

const blocked = new Set<string>();
for (const s of STATIONS) for (const [cx, cz] of s.cells) blocked.add(`${cx},${cz}`);
for (const t of TABLES) {
  // block every cell whose centre falls inside the table footprint (~1.05m)
  const hw = 0.55;
  for (let cz = 0; cz < GRID.rows; cz++) {
    for (let cx = 0; cx < GRID.cols; cx++) {
      const wx = cx - GRID.cols / 2 + 0.5;
      const wz = cz - GRID.rows / 2 + 0.5;
      const tx = t.pos[0] - GRID.cols / 2 + 0.5;
      const tz = t.pos[1] - GRID.rows / 2 + 0.5;
      if (Math.abs(wx - tx) < hw && Math.abs(wz - tz) < hw) {
        blocked.add(`${cx},${cz}`);
      }
    }
  }
}

export function cellToWorld(cx: number, cz: number): { x: number; z: number } {
  return {
    x: cx - GRID.cols / 2 + 0.5,
    z: cz - GRID.rows / 2 + 0.5,
  };
}

export function worldToCell(x: number, z: number): { cx: number; cz: number } {
  return {
    cx: Math.floor(x + GRID.cols / 2),
    cz: Math.floor(z + GRID.rows / 2),
  };
}

// Circle-vs-grid collision: is world (x,z) inside a blocked cell or wall?
export function isWalkable(x: number, z: number, r = 0.3): boolean {
  const minX = -GRID.cols / 2 + r;
  const maxX = GRID.cols / 2 - r;
  const minZ = -GRID.rows / 2 + r;
  const maxZ = GRID.rows / 2 - r;
  if (x < minX || x > maxX || z < minZ || z > maxZ) return false;
  // check the cells overlapped by the circle
  const c0 = worldToCell(x - r, z - r);
  const c1 = worldToCell(x + r, z + r);
  for (let cz = c0.cz; cz <= c1.cz; cz++) {
    for (let cx = c0.cx; cx <= c1.cx; cx++) {
      if (blocked.has(`${cx},${cz}`)) {
        // circle vs cell-rect (cell spans [cx-0.5..cx+0.5] in world)
        const wx = cx - GRID.cols / 2;
        const wz = cz - GRID.rows / 2;
        const nx = Math.max(wx, Math.min(x, wx + 1));
        const nz = Math.max(wz, Math.min(z, wz + 1));
        if ((x - nx) ** 2 + (z - nz) ** 2 < r * r) return false;
      }
    }
  }
  return true;
}
