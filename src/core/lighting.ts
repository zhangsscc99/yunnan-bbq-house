// Saltline-style lighting rig — the visual anchor of the slice.
// PMREM warm environment, one shadowed sun, per-grill charcoal point lights
// with flicker, pendant lamps with additive volumetric cones, exp2 fog.

import * as THREE from 'three';
import { COLORS, RENDER } from '../config.ts';

export interface LightRig {
  update(t: number): void;
  charcoalLightAt(slotIndex: number): THREE.PointLight | null;
}

interface FlickerLight {
  light: THREE.PointLight;
  base: number;
  phase: number;
  freq: number;
}

// Build a tiny procedural env scene → PMREM → scene.environment.
// Warm sky card above, dark warm walls around → appetising warm reflections.
function makeEnvironment(renderer: THREE.WebGLRenderer, scene: THREE.Scene): void {
  const env = new THREE.Scene();
  env.background = new THREE.Color(0x120d09);

  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(30, 16, 12),
    new THREE.MeshBasicMaterial({ color: 0x3d2f22, side: THREE.BackSide }),
  );
  env.add(sky);

  // warm top light card (the "sky")
  const top = new THREE.Mesh(
    new THREE.PlaneGeometry(24, 24),
    new THREE.MeshBasicMaterial({ color: 0xffd9a0 }),
  );
  top.position.y = 18;
  top.rotation.x = Math.PI / 2;
  env.add(top);

  // amber bounce cards (walls reflecting lamps/charcoal)
  const cardMat = new THREE.MeshBasicMaterial({ color: 0x6b4a2c });
  for (let i = 0; i < 4; i++) {
    const card = new THREE.Mesh(new THREE.PlaneGeometry(18, 7), cardMat);
    const a = (i / 4) * Math.PI * 2;
    card.position.set(Math.cos(a) * 20, 5, Math.sin(a) * 20);
    card.lookAt(0, 3, 0);
    env.add(card);
  }

  // hot amber strip low on one side — reads as charcoal glow in reflections
  const ember = new THREE.Mesh(
    new THREE.PlaneGeometry(9, 1.4),
    new THREE.MeshBasicMaterial({ color: 0xff7a30 }),
  );
  ember.position.set(-12, 1.4, -8);
  ember.lookAt(0, 2, 0);
  env.add(ember);

  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTex = pmrem.fromScene(env, 0.04).texture;
  scene.environment = envTex;
  scene.environmentIntensity = RENDER.envIntensity;
  pmrem.dispose();
}

export function buildLighting(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  grillLightPositions: THREE.Vector3[],
  pendantPositions: THREE.Vector3[],
): LightRig {
  makeEnvironment(renderer, scene);

  // base fill so ingredients stay readable in shade
  const hemi = new THREE.HemisphereLight(0xa08a70, 0x453832, 2.6);
  scene.add(hemi);

  // key sun — the only shadow caster
  const sun = new THREE.DirectionalLight(COLORS.sunLight, 8);
  sun.position.set(6, 12, 4);
  sun.castShadow = true;
  sun.shadow.mapSize.set(RENDER.shadowMapSize, RENDER.shadowMapSize);
  sun.shadow.camera.left = -9;
  sun.shadow.camera.right = 9;
  sun.shadow.camera.top = 9;
  sun.shadow.camera.bottom = -9;
  sun.shadow.camera.near = 2;
  sun.shadow.camera.far = 30;
  sun.shadow.normalBias = 0.02;
  scene.add(sun);
  scene.add(sun.target);
  sun.target.position.set(0, 0, -1);

  // charcoal key light per grill slot
  const flickers: FlickerLight[] = [];
  const charcoalLights: THREE.PointLight[] = [];
  for (const p of grillLightPositions) {
    const pl = new THREE.PointLight(COLORS.charcoalLight, 22, 4.5, 2);
    pl.position.copy(p).add(new THREE.Vector3(0, 0.55, 0));
    pl.castShadow = false;
    scene.add(pl);
    charcoalLights.push(pl);
    flickers.push({
      light: pl,
      base: 22,
      phase: Math.random() * Math.PI * 2,
      freq: 7 + Math.random() * 4,
    });
  }

  // pendant lamps + volumetric cones (additive, depthWrite off)
  const coneMat = new THREE.MeshBasicMaterial({
    color: 0xffc98a,
    transparent: true,
    opacity: 0.06,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  for (const p of pendantPositions) {
    const pl = new THREE.PointLight(COLORS.lampLight, 26, 6.5, 2);
    pl.position.copy(p);
    pl.castShadow = false;
    scene.add(pl);

    const cone = new THREE.Mesh(
      new THREE.ConeGeometry(0.85, 2.4, 20, 1, true),
      coneMat,
    );
    cone.position.set(p.x, p.y - 1.25, p.z);
    scene.add(cone);

    flickers.push({
      light: pl,
      base: 26,
      phase: Math.random() * Math.PI * 2,
      freq: 1.2 + Math.random() * 0.8,
    });
  }

  return {
    charcoalLightAt: (i) => charcoalLights[i] ?? null,
    update(t: number) {
      for (const f of flickers) {
        // ±8% intensity wobble, per-light phase (lamps barely move)
        const lamp = f.base < 4;
        const amp = lamp ? 0.02 : 0.08;
        f.light.intensity =
          f.base *
          (1 +
            amp * Math.sin(t * f.freq + f.phase) +
            amp * 0.5 * Math.sin(t * f.freq * 2.7 + f.phase * 1.3));
      }
    },
  };
}
