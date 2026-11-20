import * as THREE from 'three';
import { RENDER, COLORS } from '../config.ts';

export function createRenderer(canvas: HTMLCanvasElement): THREE.WebGLRenderer {
  const r = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: 'high-performance',
  });
  r.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  r.setSize(window.innerWidth, window.innerHeight);
  r.toneMapping = THREE.ACESFilmicToneMapping;
  r.toneMappingExposure = RENDER.exposure;
  r.shadowMap.enabled = true;
  r.shadowMap.type = THREE.PCFSoftShadowMap;
  return r;
}

export function createScene(): THREE.Scene {
  const s = new THREE.Scene();
  s.background = new THREE.Color(0x1c1410);
  s.fog = new THREE.FogExp2(COLORS.fog, RENDER.fogDensity);
  return s;
}
