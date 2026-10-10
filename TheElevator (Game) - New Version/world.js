'use strict';
/* World state and the building helpers (box, plane, trees, platforms...). */

// "world" holds everything belonging to the floor that is currently loaded.
let world = null;

function newWorld() {
  return {
    group: new Group(),
    solids: [],          // axis-aligned walls: [minX, minZ, maxX, maxZ]
    circles: [],         // round obstacles: [x, z, radius]
    ground: () => 0,     // (x, z, feetY) -> height of the floor under the player, or -999 for a gap
    standingOn: null,    // platform the player is standing on (set by ground())
    blocked: () => false,
    ticks: [],           // per-frame callbacks (dt) for animated things
    keyPos: null, key: null,
    decoys: [], monsters: [], npcs: [], interacts: [],
    bound: Infinity,     // radius of the playable area
    scareSpawn: null,    // where to put the player after a jump scare
    resetMonsters: () => {},
    gapWall: null        // fake office: hidden wall that the red button opens
  };
}

function addMesh(geometry, material, x, y, z) {
  const mesh = new Mesh(geometry, material);
  mesh.position.set(x, y, z);
  world.group.add(mesh);
  return mesh;
}
function box(w, h, d, x, y, z, material, solid) {
  if (solid) world.solids.push([x - w / 2, z - d / 2, x + w / 2, z + d / 2]);
  return addMesh(new BoxGeometry(w, h, d), material, x, y, z);
}
function plane(w, d, x, y, z, material, rotX = -Math.PI / 2) {
  const mesh = addMesh(new PlaneGeometry(w, d), material, x, y, z);
  mesh.rotation.x = rotX;
  return mesh;
}
const cylinder = (r1, r2, h, x, y, z, material) => addMesh(new CylinderGeometry(r1, r2, h, 8), material, x, y, z);
const sphere = (r, x, y, z, material) => addMesh(new SphereGeometry(r, 8, 6), material, x, y, z);

function glowSprite(color, size, x, y, z) {
  const sprite = new Sprite(new SpriteMaterial({ map: TEX.glow, color, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  sprite.scale.set(size, size, 1);
  sprite.position.set(x, y, z);
  return sprite;
}

function setEnvironment({ sky, fog, hemiSky, hemiGround, hemi, sun = 0, sunColor = 0xffffff }) {
  scene.background = new Color(sky);
  scene.fog = new THREE.FogExp2(sky, fog);
  hemiLight.color.set(hemiSky);
  hemiLight.groundColor.set(hemiGround);
  hemiLight.intensity = hemi;
  sunLight.intensity = sun;
  sunLight.color.set(sunColor);
}

function addTree(x, z, dead, baseY = 0) {
  const s = rand(0.9, 1.6);
  const tree = new Group();
  const bark = lambert(dead ? 0x2a2220 : 0x5a3d22);
  const trunk = new Mesh(new CylinderGeometry(0.2 * s, 0.3 * s, 3.2 * s, 6), bark);
  trunk.position.y = 1.6 * s;
  tree.add(trunk);
  if (dead) {
    for (let k = 0; k < 4; k++) {
      const branch = new Mesh(new CylinderGeometry(0.04 * s, 0.09 * s, 1.7 * s, 5), bark);
      branch.position.y = (2 + k * 0.45) * s;
      branch.rotation.set(rand(-0.9, 0.9), k * 1.7, rand(0.6, 1.1));
      tree.add(branch);
    }
  } else {
    const leaves = lambert(new Color().setHSL(rand(0.26, 0.34), 0.5, rand(0.22, 0.3)));
    [[2 * s, 3.6 * s, 3.2], [1.5 * s, 3 * s, 4.8]].forEach(([radius, height, y]) => {
      const cone = new Mesh(new ConeGeometry(radius, height, 7), leaves);
      cone.position.y = y * s;
      tree.add(cone);
    });
  }
  tree.position.set(x, baseY, z);
  world.group.add(tree);
  world.circles.push([x, z, 0.5 * s]);
}

function scatterTrees(count, dead, xRange = [20, 48], zRange = [-70, 25]) {
  for (let i = 0; i < count; i++) addTree((Math.random() < 0.5 ? -1 : 1) * rand(...xRange), rand(...zRange), dead);
}

// Two side walls with window strips (so trees outside are visible).
function addWindowWalls(z0, z1, wallColor, trimColor) {
  const length = z1 - z0, centerZ = (z0 + z1) / 2, pillars = Math.round(length / 5.7);
  for (const side of [-1, 1]) {
    const x = side * 14.15;
    box(0.3, 1, length, x, 0.5, centerZ, lambert(trimColor));
    box(0.3, 1, length, x, 3.5, centerZ, lambert(trimColor));
    world.solids.push([side > 0 ? 13.95 : -14.35, z0 - 0.1, side > 0 ? 14.35 : -13.95, z1 + 0.1]);
    for (let k = 0; k <= pillars; k++) box(0.3, 2, 1.2, x, 2, z0 + 0.6 + k * (length - 1.2) / pillars, lambert(wallColor));
    plane(length, 2, x, 2, centerZ, basic(0x6a86a8, { transparent: true, opacity: 0.2, side: 2 }), 0).rotation.set(0, Math.PI / 2, 0);
  }
}

// Platform floors (lava room and obby) share the same ground logic.
function addPlatform(list, x, y, z, w, d, kind, color, extra) {
  const h = (extra && extra.h) || 0.8;
  const mesh = addMesh(new BoxGeometry(w, h, d), lambert(color), x, y - h / 2, z);
  const platform = { x, y, z, w, d, h, kind, mesh, baseZ: z, dz: 0, visible: true, ...extra };
  list.push(platform);
  return platform;
}
function usePlatforms(list) {
  world.ground = (px, pz, feetY) => {
    let best = -999;
    world.standingOn = null;
    for (const p of list) {
      if (p.y > feetY + 0.6 || p.y <= best) continue;
      if (Math.abs(px - p.x) <= p.w / 2 + 0.3 && Math.abs(pz - p.z) <= p.d / 2 + 0.3) { best = p.y; world.standingOn = p; }
    }
    return best;
  };
  world.blocked = (px, pz, feetY) => list.some(p =>
    p.y > feetY + 0.6 && p.y - p.h < feetY + 1.7 && Math.abs(px - p.x) < p.w / 2 + 0.3 && Math.abs(pz - p.z) < p.d / 2 + 0.3);
}