// Procedural canvas textures — the whole game ships zero image files.
// Budget: ≤8 maps (ART-DIRECTION §4). Each factory returns a THREE texture.

import * as THREE from 'three';

function canvas(size: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d')!;
  return [c, ctx];
}

function toTex(c: HTMLCanvasElement, repeat = 1): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

// 1. wood floor: dark warm planks with grain + tile seams
export function woodFloorTex(): THREE.CanvasTexture {
  const [c, g] = canvas(512);
  g.fillStyle = '#3a3430';
  g.fillRect(0, 0, 512, 512);
  const plankH = 512 / 8;
  for (let i = 0; i < 8; i++) {
    const y = i * plankH;
    const shade = 0.9 + ((i * 37) % 10) / 60;
    g.fillStyle = `rgb(${58 * shade | 0},${52 * shade | 0},${46 * shade | 0})`;
    g.fillRect(0, y, 512, plankH - 2);
    // grain streaks
    g.strokeStyle = 'rgba(0,0,0,0.16)';
    for (let s = 0; s < 5; s++) {
      const gy = y + 6 + ((i * 53 + s * 41) % (plankH - 12));
      g.beginPath();
      g.moveTo(0, gy);
      g.bezierCurveTo(140, gy + 3, 300, gy - 3, 512, gy + 2);
      g.stroke();
    }
    // plank seam
    g.fillStyle = 'rgba(0,0,0,0.5)';
    g.fillRect(0, y + plankH - 2, 512, 2);
    // butt joints
    const jx = (i * 173) % 512;
    g.fillRect(jx, y, 2, plankH - 2);
  }
  return toTex(c, 4);
}

// 2. wall plaster: soft warm noise
export function wallTex(): THREE.CanvasTexture {
  const [c, g] = canvas(512);
  g.fillStyle = '#4a4238';
  g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 2600; i++) {
    const x = (i * 97) % 512, y = (i * 57 + (i >> 4) * 31) % 512;
    g.fillStyle = `rgba(${i % 2 ? '255,235,200' : '0,0,0'},${0.018 + (i % 5) * 0.006})`;
    g.fillRect(x, y, 3, 3);
  }
  // faint horizontal render marks
  g.fillStyle = 'rgba(0,0,0,0.08)';
  for (let y = 60; y < 512; y += 128) g.fillRect(0, y, 512, 3);
  return toTex(c, 2);
}

// 3. counter top: butcher-block wood
export function counterTopTex(): THREE.CanvasTexture {
  const [c, g] = canvas(256);
  g.fillStyle = '#6b5238';
  g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 6; i++) {
    const y = i * (256 / 6);
    g.fillStyle = `rgba(${107 + (i % 3) * 8},${82 + (i % 3) * 6},${56},0.85)`;
    g.fillRect(0, y, 256, 256 / 6 - 3);
    g.strokeStyle = 'rgba(0,0,0,0.2)';
    for (let s = 0; s < 3; s++) {
      const gy = y + 5 + ((i * 41 + s * 29) % 30);
      g.beginPath(); g.moveTo(0, gy); g.lineTo(256, gy + ((i + s) % 3) - 1); g.stroke();
    }
  }
  return toTex(c, 1);
}

// 4. bamboo weave (crates / trays / baskets)
export function bambooTex(): THREE.CanvasTexture {
  const [c, g] = canvas(256);
  g.fillStyle = '#8f6f42';
  g.fillRect(0, 0, 256, 256);
  const s = 32;
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      const horiz = (x + y) % 2 === 0;
      g.fillStyle = horiz ? '#a8834f' : '#7d5f38';
      g.fillRect(x * s + 1, y * s + 1, s - 2, s - 2);
      g.fillStyle = 'rgba(0,0,0,0.18)';
      if (horiz) for (let i = 1; i < 4; i++) g.fillRect(x * s + 1, y * s + i * 8, s - 2, 2);
      else for (let i = 1; i < 4; i++) g.fillRect(x * s + i * 8, y * s + 1, 2, s - 2);
    }
  }
  return toTex(c, 1);
}

// 5. tie-dye cloth banner (indigo + white rosettes)
export function tiedyeTex(): THREE.CanvasTexture {
  const [c, g] = canvas(256);
  g.fillStyle = '#2e4a6b';
  g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 40; i++) {
    const x = (i * 67) % 256, y = (i * 43 + (i >> 3) * 71) % 256;
    const r = 8 + (i % 4) * 5;
    const grad = g.createRadialGradient(x, y, 1, x, y, r);
    grad.addColorStop(0, 'rgba(230,235,245,0.85)');
    grad.addColorStop(0.55, 'rgba(180,200,225,0.25)');
    grad.addColorStop(1, 'rgba(46,74,107,0)');
    g.fillStyle = grad;
    g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  }
  // stitched edge
  g.strokeStyle = 'rgba(235,240,250,0.5)';
  g.setLineDash([7, 5]);
  g.strokeRect(6, 6, 244, 244);
  return toTex(c, 1);
}

// 6. chili-string decoration strip
export function chiliTex(): THREE.CanvasTexture {
  const [c, g] = canvas(256);
  g.clearRect(0, 0, 256, 256);
  // a hanging strand: brown cord + red peppers
  g.strokeStyle = '#5c4630';
  g.lineWidth = 5;
  g.beginPath(); g.moveTo(128, 0); g.lineTo(128, 256); g.stroke();
  for (let i = 0; i < 7; i++) {
    const y = 22 + i * 33;
    const sway = Math.sin(i * 1.7) * 13;
    g.fillStyle = i % 3 === 0 ? '#c2381f' : '#a82c18';
    g.beginPath();
    g.ellipse(128 + sway, y, 10, 15, sway * 0.02, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#3f6b2e';
    g.fillRect(126 + sway, y - 19, 4, 7);
    // highlight
    g.fillStyle = 'rgba(255,150,110,0.35)';
    g.beginPath(); g.ellipse(124 + sway, y - 3, 3, 8, 0.2, 0, Math.PI * 2); g.fill();
  }
  const t = toTex(c, 1);
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

// 7. charcoal bump/emissive detail (glowing cracks on dark lumps)
export function charcoalTex(): THREE.CanvasTexture {
  const [c, g] = canvas(256);
  g.fillStyle = '#1c1512';
  g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 60; i++) {
    const x = (i * 89) % 256, y = (i * 53 + (i >> 4) * 97) % 256;
    const w = 14 + (i % 5) * 7, h = 10 + (i % 4) * 6;
    g.fillStyle = `rgba(${20 + (i % 3) * 8},${15},${12},1)`;
    g.beginPath(); g.ellipse(x, y, w, h, (i % 7) * 0.4, 0, Math.PI * 2); g.fill();
    // hot crack
    g.strokeStyle = `rgba(255,${90 + (i % 4) * 30},20,${0.5 + (i % 3) * 0.16})`;
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(x - w * 0.5, y);
    g.lineTo(x, y + (i % 2 ? 4 : -4));
    g.lineTo(x + w * 0.5, y + (i % 3) - 1);
    g.stroke();
  }
  return toTex(c, 1);
}

// 8. chalk menu board (hand-drawn feel, drawn at 512 for text)
export function menuBoardTex(): THREE.CanvasTexture {
  const [c, g] = canvas(512);
  g.fillStyle = '#22201e';
  g.fillRect(0, 0, 512, 512);
  g.strokeStyle = '#8a6b40';
  g.lineWidth = 18;
  g.strokeRect(9, 9, 494, 494);
  g.fillStyle = '#f0e6d4';
  g.textAlign = 'center';
  g.font = '600 52px "PingFang SC", "Noto Sans SC", sans-serif';
  g.fillText('柳真真烤肉', 256, 92);
  g.font = '500 34px "PingFang SC", "Noto Sans SC", sans-serif';
  g.fillStyle = '#e8d9b8';
  const rows = [['烤五花肉拼盘', '¥48'], ['烤菌子', '¥32'], ['豆泥米线', '¥26']];
  rows.forEach(([n, p], i) => {
    const y = 190 + i * 84;
    g.textAlign = 'left'; g.fillText(n, 60, y);
    g.textAlign = 'right'; g.fillStyle = '#f0c060'; g.fillText(p, 452, y);
    g.fillStyle = '#e8d9b8';
    g.strokeStyle = 'rgba(230,217,184,0.35)';
    g.lineWidth = 2;
    g.setLineDash([4, 8]);
    g.beginPath(); g.moveTo(60, y + 18); g.lineTo(452, y + 18); g.stroke();
  });
  return toTex(c, 1);
}

// 9. pass window overhead signboard ("出菜窗口")
export function passSignTex(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 128;
  const g = c.getContext('2d')!;
  g.fillStyle = '#24170f';
  g.fillRect(0, 0, 512, 128);
  g.strokeStyle = '#f0c060';
  g.lineWidth = 8;
  g.strokeRect(8, 8, 496, 112);
  g.fillStyle = '#f0c060';
  g.font = '700 56px "PingFang SC", "Noto Sans SC", sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('出 菜 窗 口', 256, 68);
  const t = toTex(c, 1);
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}
