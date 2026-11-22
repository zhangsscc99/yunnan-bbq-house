// The 12×9 board. Cell coords are integer tile centres → world metres:
// world.x = cell.x - GRID.cols/2 + 0.5, world.z = cell.z - GRID.rows/2 + 0.5.
// Gameplay v2: only the Pass window (出菜窗口) and the 4 dining tables (each with
// a built-in tabletop charcoal grill) are interactive. Legacy bin / chop / plate /
// crate stations are removed from interactive station definitions.

import { GRID } from '../config.ts';

export interface StationDef {
  id: string;
  kind: 'pass';
  cells: [number, number][];   // occupied cells (blocking)
  use: [number, number];       // where the player stands to pick up dishes
  label: string;
}

export const PASS_STATION: StationDef = {
  id: 'pass',
  kind: 'pass',
  label: '出菜窗口',
  cells: [[5, 7], [6, 7], [7, 7]],
  use: [6, 6],
};

// Interactive kitchen stations: Pass window only (no bin / chop / plate / crate).
export const STATIONS: StationDef[] = [PASS_STATION];

// Non-interactive scenery counter cells kept blocked for walkability collision.
const SCENERY_BLOCKED: [number, number][] = [
  [0, 7], [1, 7], [2, 7], [3, 7], [4, 7],
  [8, 7], [9, 7], [10, 7], [11, 7],
  [0, 4], [0, 5], [0, 6],
];

// Dining tables: each has a built-in charcoal grill + stools.
export interface TableDef {
  id: string;
  tableNum: number;
  pos: [number, number];   // centre in cell coords
  use: [number, number];   // where the player stands to grill & serve
  seat: [number, number];  // where the customer sits
}

export const TABLES: TableDef[] = [
  { id: 't1', tableNum: 1, pos: [2.2, 1.6], use: [2.2, 2.8], seat: [1.4, 1.6] },
  { id: 't2', tableNum: 2, pos: [5.8, 1.6], use: [5.8, 2.8], seat: [5.0, 1.6] },
  { id: 't3', tableNum: 3, pos: [9.4, 1.6], use: [9.4, 2.8], seat: [8.6, 1.6] },
  { id: 't4', tableNum: 4, pos: [7.6, 3.6], use: [7.6, 4.8], seat: [6.8, 3.6] },
];

export const DOOR: [number, number] = [0.7, 0.4];      // customer entry (cell coords)
export const PLAYER_SPAWN: [number, number] = [5, 4];  // world (-0.5, 0.0), open dining aisle

const blocked = new Set<string>();
for (const s of STATIONS) for (const [cx, cz] of s.cells) blocked.add(`${cx},${cz}`);
for (const [cx, cz] of SCENERY_BLOCKED) blocked.add(`${cx},${cz}`);
for (const t of TABLES) {
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
  const c0 = worldToCell(x - r, z - r);
  const c1 = worldToCell(x + r, z + r);
  for (let cz = c0.cz; cz <= c1.cz; cz++) {
    for (let cx = c0.cx; cx <= c1.cx; cx++) {
      if (blocked.has(`${cx},${cz}`)) {
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
