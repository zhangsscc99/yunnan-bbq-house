// Shared material instances — one instance per look so mergeStatic can
// collapse them into single draws (TECH-STACK §3 draw-call budget).

import * as THREE from 'three';
import { COLORS, DISHES } from '../config.ts';
import {
  woodFloorTex, wallTex, counterTopTex, bambooTex, charcoalTex,
  tiedyeTex, chiliTex, menuBoardTex, crateSignTex,
} from './textures.ts';

let cache: Record<string, THREE.Material> | null = null;

export function MATS(): Record<string, THREE.MeshStandardMaterial | THREE.MeshBasicMaterial> {
  if (cache) return cache as never;
  cache = {
    floor: new THREE.MeshStandardMaterial({ map: woodFloorTex(), roughness: 0.75, metalness: 0.05 }),
    wall: new THREE.MeshStandardMaterial({ map: wallTex(), roughness: 0.9, metalness: 0 }),
    eave: new THREE.MeshStandardMaterial({ color: 0x3f5a4a, roughness: 0.4, metalness: 0.1 }),
    counterBody: new THREE.MeshStandardMaterial({ color: COLORS.counterBody, roughness: 0.85 }),
    counterTop: new THREE.MeshStandardMaterial({ map: counterTopTex(), roughness: 0.35, metalness: 0.1 }),
    bamboo: new THREE.MeshStandardMaterial({ map: bambooTex(), roughness: 0.8 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x1a120c, roughness: 1 }),
    stick: new THREE.MeshStandardMaterial({ color: 0xc9a876, roughness: 0.8 }),
    board: new THREE.MeshStandardMaterial({ color: 0xd8c9a8, roughness: 0.6 }),
    cleaverBlade: new THREE.MeshStandardMaterial({ color: 0xb8bcc4, roughness: 0.25, metalness: 0.85 }),
    cleaverGrip: new THREE.MeshStandardMaterial({ color: 0x5a3c22, roughness: 0.7 }),
    ember: new THREE.MeshStandardMaterial({
      map: charcoalTex(), color: 0xffffff,
      emissive: COLORS.charcoalEmissive, emissiveMap: charcoalTex(),
      emissiveIntensity: 3.2, roughness: 0.9,
    }),
    grillBar: new THREE.MeshStandardMaterial({ color: 0x3a3a3e, roughness: 0.4, metalness: 0.8 }),
    plate: new THREE.MeshStandardMaterial({ color: 0xe8e2d4, roughness: 0.3, metalness: 0.05 }),
    bin: new THREE.MeshStandardMaterial({ color: 0x4a4a48, roughness: 0.6, metalness: 0.3 }),
    binRim: new THREE.MeshStandardMaterial({ color: 0x2e2e2c, roughness: 0.5, metalness: 0.4 }),
    tableLeg: new THREE.MeshStandardMaterial({ color: 0x3a2e22, roughness: 0.8 }),
    clay: new THREE.MeshStandardMaterial({ color: 0x7a4a30, roughness: 0.6 }),
    leaf: new THREE.MeshStandardMaterial({ color: 0x5d7a3a, roughness: 0.8 }),
    doorWood: new THREE.MeshStandardMaterial({ color: 0x5a3c22, roughness: 0.7 }),
    doorGlow: new THREE.MeshBasicMaterial({
      color: 0xff9a40, transparent: true, opacity: 0.5,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }),
    menuBoard: new THREE.MeshStandardMaterial({ map: menuBoardTex(), roughness: 0.9 }),
    chili: new THREE.MeshStandardMaterial({
      map: chiliTex(), transparent: true, roughness: 0.8,
      side: THREE.DoubleSide, alphaTest: 0.15,
    }),
    tiedye: new THREE.MeshStandardMaterial({
      map: tiedyeTex(), roughness: 0.9, side: THREE.DoubleSide,
    }),
    cord: new THREE.MeshStandardMaterial({ color: 0x241a12, roughness: 0.9 }),
    shade: new THREE.MeshStandardMaterial({ color: 0x8a5a30, roughness: 0.5, metalness: 0.35, side: THREE.DoubleSide }),
    bulb: new THREE.MeshStandardMaterial({ color: 0xffe0b0, emissive: 0xffc070, emissiveIntensity: 3.6 }),
    shroom: new THREE.MeshStandardMaterial({ color: 0x7d5a34, roughness: 0.95 }),
    cratePorkLean: new THREE.MeshStandardMaterial({ color: DISHES.pork.hue, roughness: 0.52 }),
    cratePorkFat: new THREE.MeshStandardMaterial({ color: 0xf5d0b8, roughness: 0.48 }),
    crateMushCap: new THREE.MeshStandardMaterial({ color: DISHES.mushroom.hue, roughness: 0.62 }),
    crateMushStem: new THREE.MeshStandardMaterial({ color: 0xf2ead6, roughness: 0.72 }),
    crateMixian: new THREE.MeshStandardMaterial({ color: DISHES.mixian.hue, roughness: 0.46 }),
    crateSign: new THREE.MeshStandardMaterial({ map: crateSignTex(), roughness: 0.55 }),
    decorBamboo: new THREE.MeshStandardMaterial({ color: 0x766e64, roughness: 0.92 }),
    decorClay: new THREE.MeshStandardMaterial({ color: 0x6e6058, roughness: 0.88 }),
    decorDark: new THREE.MeshStandardMaterial({ color: 0x262422, roughness: 1 }),
  };
  return cache as never;
}
