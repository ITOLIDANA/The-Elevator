'use strict';
/* Every floor: lobby, field, lava room, house maze, fake office, obby. */

// ----- Office (lobby, and its haunted twin "bad") -----
function buildOffice(bad) {
  const wallColor = bad ? 0x6a4a4e : 0xdcd6c6;
  const trimColor = bad ? 0x40282a : 0x8c8574;
  setEnvironment({
    sky: bad ? 0x14060a : 0xf0b27a, fog: bad ? 0.034 : 0.014,
    hemiSky: bad ? 0x442233 : 0xfff1dc, hemiGround: bad ? 0x100608 : 0x7a6a5a,
    hemi: bad ? 0.4 : 1, sun: bad ? 0 : 0.5, sunColor: 0xffd2a0
  });

  // Room shell: floor, ceiling, outside ground, back wall, front wall, windows
  plane(28, 29.8, 0, 0, -11.25, lambert(bad ? 0xaa7777 : 0xffffff, { map: TEX.carpet }));
  plane(28, 29.8, 0, 4, -11.25, lambert(bad ? 0x2a1a1c : 0xeeeeee), Math.PI / 2);
  plane(500, 500, 0, -0.05, 0, lambert(0xffffff, { map: bad ? TEX.deadGrass : TEX.grass }));
  box(28.6, 4, 0.3, 0, 2, 3.65, lambert(wallColor), true);
  if (bad) buildFakeFrontWall(wallColor);
  else box(28.6, 4, 0.3, 0, 2, -26.15, lambert(wallColor), true);
  addWindowWalls(-26.15, 3.65, wallColor, trimColor);
  scatterTrees(22, bad);

  buildOfficeLights(bad);
  for (const z of [-9, -15, -21]) for (const x of [-10, -6, 6, 10]) addDesk(x, z, bad);
  for (const x of [-8, 8]) for (const z of [-9, -15, -21]) box(0.08, 1.4, 4, x, 0.7, z, lambert(0x6a7a8a), true);

  // Plants, water cooler, reception desk, clock
  for (const [x, z] of [[-12.8, -24.8], [12.8, -24.8], [-12.8, 2.4], [12.8, 2.4]]) {
    cylinder(0.3, 0.25, 0.5, x, 0.25, z, lambert(0x8a5a3a));
    sphere(0.6, x, 0.95, z, lambert(bad ? 0x2a3a22 : 0x2f7a35));
    world.circles.push([x, z, 0.5]);
  }
  box(0.5, 1.1, 0.5, 7, 0.55, -1, lambert(0xdde6ee), true);
  cylinder(0.2, 0.2, 0.4, 7, 1.3, -1, lambert(0x7fb6e8));
  box(3, 1.1, 0.8, -6, 0.55, -3.7, lambert(bad ? 0x3a2420 : 0x8a6a48), true);
  plane(1.2, 1.2, bad ? -7 : 0, 2.9, -25.95, basic(0xffffff, { map: makeClock(bad) }), 0);

  if (!bad) {
    addNpc({
      kind: 'mara', name: 'Mara', x: -6, z: -2.6, facing: Math.PI,
      lines: () => game.keys.slice(1).every(Boolean) ? 'm4' : game.keys.some(Boolean) ? 'm3' : 'm2'
    });
  } else buildFakeOfficeExtras();
}

function buildOfficeLights(bad) {
  const panels = [];
  for (const x of [-8, 0, 8]) for (const z of [-8, -14, -20]) {
    const material = basic(0xffffff);
    box(2.4, 0.06, 0.6, x, 3.95, z, material);
    panels.push(material);
  }
  const light = new PointLight(bad ? 0xff7a6a : 0xfff0dd, bad ? 0.8 : 1.1, 40);
  light.position.set(0, 3.4, -12);
  world.group.add(light);
  if (!bad) return;

  // Haunted office: lights flicker, and sometimes everything goes black for a few seconds.
  let untilBlackout = rand(8, 14), blackoutLeft = 0;
  world.ticks.push(dt => {
    untilBlackout -= dt;
    if (untilBlackout <= 0) { untilBlackout = rand(14, 24); blackoutLeft = rand(3, 6); noise(0.5, 0.3, 300); }
    blackoutLeft -= dt;
    const blackout = blackoutLeft > 0;
    for (const m of panels) {
      m.userData.flicker = Math.max(0, (m.userData.flicker || 0) - dt);
      if (Math.random() < 0.015) m.userData.flicker = rand(0.05, 0.3);
      m.color.setHex(blackout || m.userData.flicker > 0 ? 0x120303 : 0xffd9b0);
    }
    const flickering = panels.some(m => m.userData.flicker > 0);
    light.intensity = blackout ? 0 : flickering ? 0.2 : 0.8;
    hemiLight.intensity = blackout ? 0.1 : 0.4;
  });
}

function addDesk(x, z, bad) {
  const desk = new Group();
  const tipped = bad && Math.random() < 0.25;
  const part = (w, h, d, px, py, pz, material) => { const m = new Mesh(new BoxGeometry(w, h, d), material); m.position.set(px, py, pz); desk.add(m); return m; };
  part(2, 0.08, 1, 0, 0.76, 0, lambert(0x8a6a48));
  part(0.08, 0.7, 0.9, -0.9, 0.36, 0, lambert(0x6a4e34));
  part(0.08, 0.7, 0.9, 0.9, 0.36, 0, lambert(0x6a4e34));
  part(0.6, 0.4, 0.05, 0, 1.12, -0.25, lambert(0x222222));
  const screen = new Mesh(new PlaneGeometry(0.52, 0.32), basic(0xffffff, { map: bad ? TEX.screenBad : TEX.screenOk }));
  screen.position.set(0, 1.12, -0.222);
  desk.add(screen);
  part(0.1, 0.2, 0.1, 0, 0.9, -0.25, lambert(0x222222));
  part(0.5, 0.03, 0.18, 0, 0.8, 0.12, lambert(0x333333));

  const chair = new Group();
  const seat = new Mesh(new CylinderGeometry(0.25, 0.25, 0.08, 8), lambert(0x2a2e38));
  seat.position.y = 0.5;
  const back = new Mesh(new BoxGeometry(0.5, 0.55, 0.06), lambert(0x2a2e38));
  back.position.set(0, 0.85, 0.25);
  chair.add(seat, back);
  chair.position.z = 0.75;
  if (bad && Math.random() < 0.5) chair.rotation.y = Math.PI;   // chairs turned away
  desk.add(chair);

  desk.position.set(x, tipped ? 0.4 : 0, z);
  if (tipped) desk.rotation.z = x < 0 ? 1.2 : -1.2;
  world.group.add(desk);
  world.solids.push([x - 1, z - 0.5, x + 1, z + 1.1]);
}

// The fake office has a hidden wall where the real office has none.
function buildFakeFrontWall(wallColor) {
  box(12.4, 4, 0.3, -7.8, 2, -26.15, lambert(wallColor), true);
  box(12.4, 4, 0.3, 7.8, 2, -26.15, lambert(wallColor), true);
  box(3.2, 0.9, 0.3, 0, 3.55, -26.15, lambert(wallColor));
  const panel = box(3.2, 3.1, 0.3, 0, 1.55, -26.15, lambert(wallColor));
  world.gapWall = { solid: [-1.6, -26.35, 1.6, -25.95], open: false };
  world.ticks.push(dt => {
    const targetY = world.gapWall.open ? 4.9 : 1.55;
    panel.position.y += (targetY - panel.position.y) * Math.min(1, dt * 2);
  });
}

function buildFakeOfficeExtras() {
  // Fake Mara: stands facing the wall until you talk to her.
  let line = 0;
  addNpc({ kind: 'fmara', name: 'Mara?', x: -6, z: -2.6, facing: Math.PI, lookAtPlayer: false, lines: () => ['fm1', 'fm2', 'fm3'][line++ % 3] });

  // Writing on the walls, blood stains, wrong exit sign
  const scrawl = (text, w, h, x, y, z, font) => plane(w, h, x, y, z,
    basic(0xffffff, { map: makeLabel(text, w * 100, h * 100, '#c01818', null, font), transparent: true }), 0);
  scrawl('IT IS NOT REAL', 5, 1, -7.8, 2.2, -25.97, 'bold 58px "Special Elite", serif');
  plane(2.2, 0.5, 0, 3.55, -25.95, basic(0xffffff, { map: makeLabel('EXIT', 200, 80, '#ff3030', '#200808', 'bold 150px Cinzel, serif') }), 0);
  for (let k = 0; k < 9; k++) {
    const stain = plane(1, 1, rand(-11, 11), 0.012, rand(-22, -4), basic(0x4a0707));
    stain.geometry = new CircleGeometry(rand(0.4, 1), 10);
  }

  // Key room behind the hidden wall
  const roomWall = lambert(0x2a1214);
  box(0.3, 4, 8, -5, 2, -30.4, roomWall, true);
  box(0.3, 4, 8, 5, 2, -30.4, roomWall, true);
  box(10.3, 4, 0.3, 0, 2, -34.4, roomWall, true);
  plane(10, 8, 0, 0, -30.4, lambert(0x3a1a1c));
  plane(10, 8, 0, 4, -30.4, lambert(0x1a0808), Math.PI / 2);
  plane(6, 1.4, 0, 2.3, -34.2, basic(0xffffff, { map: makeLabel('LOOK BEHIND YOU', 500, 120, '#b01010', null, 'bold 52px "Special Elite", serif'), transparent: true }), 0);
  box(1.6, 0.8, 0.9, 0, 0.4, -31, lambert(0x4a3028));
  const redLight = new PointLight(0xff3020, 1.1, 14);
  redLight.position.set(0, 3, -31);
  world.group.add(redLight);
  world.keyPos = { x: 0, y: 1.45, z: -31, beam: false };

  // Red button on the left wall opens the hidden wall
  cylinder(0.14, 0.14, 0.06, -13.8, 1.4, -16, basic(0xff2020)).rotation.z = Math.PI / 2;
  world.group.add(glowSprite(0xff2020, 1.4, -13.6, 1.4, -16));
  world.interacts.push({
    x: -13.6, y: 1.4, z: -16, radius: 2.6, label: () => t('pe'),
    action: () => {
      if (world.gapWall.open) return;
      world.gapWall.open = true; game.reach = 1;
      tone(90, 1, 'sawtooth', 0.3, 40); noise(1.2, 0.4, 500); say('y_btn');
    }
  });

  // Decoy keys (touching one is a mistake) and three mannequins
  for (const [x, y, z] of [[-10, 1.25, -15], [6, 1.25, -9], [-6, 1.25, -21]]) world.decoys.push(createKey({ x, y, z }, 0xff3a3a));
  for (const [x, z] of [[-4, -10], [8, -17], [0, -23]]) world.monsters.push(createMannequin(x, z));
  world.resetMonsters = () => world.monsters.forEach(m => m.group.position.set(m.home[0], 0, m.home[1]));
}

// ----- Field (floor 1) -----
function buildField() {
  setEnvironment({ sky: 0x8ecbf2, fog: 0.0035, hemiSky: 0xcfe8ff, hemiGround: 0x5a8a3a, hemi: 1.05, sun: 1, sunColor: 0xfff3d6 });
  world.bound = 130;
  plane(700, 700, 0, 0, 0, lambert(0xffffff, { map: TEX.grass }));

  // Flowers as coloured points
  const count = 1200, positions = new Float32Array(count * 3), colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    positions.set([rand(-130, 130), 0.12, rand(-130, 130)], i * 3);
    const c = new Color(pick([0xffffff, 0xffe066, 0xff9ecb, 0xb39dff]));
    colors.set([c.r, c.g, c.b], i * 3);
  }
  const flowers = new THREE.BufferGeometry();
  flowers.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  flowers.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  world.group.add(new THREE.Points(flowers, new THREE.PointsMaterial({ size: 0.4, vertexColors: true })));

  // Sky: clouds and sun
  for (let k = 0; k < 14; k++) {
    const cloud = addMesh(new SphereGeometry(rand(8, 16), 6, 5), basic(0xffffff, { transparent: true, opacity: 0.85, fog: false }), rand(-250, 250), rand(60, 90), rand(-250, 250));
    cloud.scale.y = 0.3;
  }
  addMesh(new SphereGeometry(14, 8, 6), basic(0xfff1b0, { fog: false }), 150, 170, -200);

  // Rocks (no trees on this floor)
  for (let k = 0; k < 14; k++) {
    const x = rand(-100, 100), z = rand(-100, 100);
    if (Math.hypot(x, z) < 14) continue;
    const r = rand(0.7, 1.5);
    addMesh(new IcosahedronGeometry(r, 0), lambert(0x8a8a82), x, r * 0.35, z);
    world.circles.push([x, z, r * 0.85]);
  }
  let line = 0;
  addNpc({ kind: 'scare', name: 'Scarecrow', x: 9, z: -18, facing: -1.2, lines: () => ['s1', 's2'][line++ % 2] });
  world.keyPos = { x: -32, y: 1.6, z: -40, beam: true };
}

// ----- Lava room (floor 2): the floor is lava, hop across the furniture -----
function buildLava() {
  setEnvironment({ sky: 0x1a0806, fog: 0.022, hemiSky: 0xff9a6a, hemiGround: 0x3a0c04, hemi: 0.75 });
  const wallColor = 0x3a1f1a, platforms = [];
  plane(28, 68, 0, 6, -29, lambert(0x120808), Math.PI / 2);
  box(28.6, 6, 0.3, 0, 3, 5.15, lambert(wallColor), true);
  box(28.6, 6, 0.3, 0, 3, -63.15, lambert(wallColor), true);
  addWindowWalls(-63, 5.3, wallColor, 0x2a1512);
  plane(500, 500, 0, -1.5, 0, lambert(0xffffff, { map: TEX.deadGrass }));
  scatterTrees(22, true, [20, 48], [-100, 30]);

  const lava = plane(28, 68, 0, -0.7, -29, basic(0xffffff, { map: TEX.lava }));
  const glow = new PointLight(0xff6a2a, 1.5, 70);
  glow.position.set(0, 1.5, -25);
  world.group.add(glow);

  // Start rug, then a random path of "furniture" with small gaps, checkpoint in the middle, dresser at the end
  addPlatform(platforms, 0, 0, -3, 12, 14, 'solid', 0x7a5a3a, { h: 0.7 });
  const colors = [0x8a4a3a, 0x3a5a8a, 0x6a8a4a, 0x9a7a4a, 0x7a3a6a];
  let z = -10, x = 0, top = 0;
  for (let i = 0; i < 12; i++) {
    const gap = rand(1.3, 2.3), depth = rand(2, 3), width = rand(2.6, 3.8);
    top = clamp(top + rand(-0.35, 0.35), 0.1, 1);
    x = clamp(x + rand(-2.5, 2.5), -8, 8);
    addPlatform(platforms, x, top, z - gap - depth / 2, width, depth, i === 5 ? 'checkpoint' : 'solid', colors[i % 5], { h: top + 0.7 });
    z -= gap + depth;
  }
  addPlatform(platforms, 0, 0.6, z - 5, 9, 6, 'end', 0xb8863a, { h: 1.3 });
  world.keyPos = { x: 0, y: 2.2, z: z - 5, beam: true };
  usePlatforms(platforms);

  // Drifting embers and a pulsing glow
  const embers = new Float32Array(300), emberGeo = new THREE.BufferGeometry();
  for (let i = 0; i < 300; i += 3) { embers[i] = rand(-13, 13); embers[i + 1] = rand(-0.6, 5); embers[i + 2] = rand(-62, 4); }
  emberGeo.setAttribute('position', new THREE.BufferAttribute(embers, 3));
  world.group.add(new THREE.Points(emberGeo, new THREE.PointsMaterial({ size: 0.25, color: 0xff9a3a, fog: false })));
  world.ticks.push(dt => {
    TEX.lava.offset.x += dt * 0.02; TEX.lava.offset.y += dt * 0.01;
    glow.intensity = 1.3 + Math.sin(game.time * 3) * 0.25;
    for (let i = 1; i < 300; i += 3) { embers[i] += dt * 0.8; if (embers[i] > 5) embers[i] = -0.6; }
    emberGeo.attributes.position.needsUpdate = true;
  });

  let line = 0;
  addNpc({ kind: 'cinder', name: 'Cinder', x: 3, y: 1.5, z: -7, facing: 0, lines: () => ['c1', 'c2'][line++ % 2] });
  void lava;
}

// ----- Haunted house (floor 3): a maze with a Hollow chasing you -----
const MAZE = { size: 6, cell: 4.5, height: 3.4, startCol: 3, left: -13.5, frontZ: -16 };

// Depth-first maze with extra openings (loops) so it is easier to navigate.
function generateMaze() {
  const n = MAZE.size;
  const grid = (rows, cols, v) => Array.from({ length: rows }, () => Array(cols).fill(v));
  const h = grid(n + 1, n, true);   // h[r][c]: wall on the front edge of cell (r, c)
  const v = grid(n, n + 1, true);   // v[r][c]: wall on the left edge of cell (r, c)
  const visited = grid(n, n, false);
  const stack = [[0, MAZE.startCol]];
  visited[0][MAZE.startCol] = true;
  while (stack.length) {
    const [r, c] = stack[stack.length - 1];
    const options = [
      [r + 1, c, () => h[r + 1][c] = false], [r - 1, c, () => h[r][c] = false],
      [r, c + 1, () => v[r][c + 1] = false], [r, c - 1, () => v[r][c] = false]
    ].filter(([nr, nc]) => nr >= 0 && nr < n && nc >= 0 && nc < n && !visited[nr][nc]);
    if (!options.length) { stack.pop(); continue; }
    const [nr, nc, open] = pick(options);
    open();
    visited[nr][nc] = true;
    stack.push([nr, nc]);
  }
  for (let k = 0; k < 22; k++) {
    h[1 + Math.floor(Math.random() * (n - 1))][Math.floor(Math.random() * n)] = false;
    v[Math.floor(Math.random() * n)][1 + Math.floor(Math.random() * (n - 1))] = false;
  }
  h[0][MAZE.startCol] = false;      // entrance

  // Breadth-first search from the entrance to find how far each cell is.
  const dist = grid(n, n, -1);
  dist[0][MAZE.startCol] = 0;
  const queue = [[0, MAZE.startCol]];
  let farthest = [0, MAZE.startCol];
  while (queue.length) {
    const [r, c] = queue.shift();
    if (dist[r][c] > dist[farthest[0]][farthest[1]]) farthest = [r, c];
    for (const [nr, nc, wall] of [[r + 1, c, h[r + 1][c]], [r - 1, c, h[r][c]], [r, c + 1, v[r][c + 1]], [r, c - 1, v[r][c]]]) {
      if (!wall && nr >= 0 && nr < n && nc >= 0 && nc < n && dist[nr][nc] < 0) { dist[nr][nc] = dist[r][c] + 1; queue.push([nr, nc]); }
    }
  }
  return { h, v, dist, farthest };
}

function buildHouse() {
  setEnvironment({ sky: 0x04060b, fog: 0.045, hemiSky: 0x22304f, hemiGround: 0x080a0e, hemi: 0.42 });
  plane(400, 400, 0, 0, 0, lambert(0xffffff, { map: TEX.deadGrass }));

  const { size: N, cell: S, height: H, left: x0, frontZ: zf } = MAZE;
  const { h, v, dist, farthest } = generateMaze();
  const cellCenter = (r, c) => [x0 + (c + 0.5) * S, zf - (r + 0.5) * S];
  const wallMaterial = lambert(0xffffff, { map: TEX.wallpaper });

  for (let r = 0; r <= N; r++) for (let c = 0; c < N; c++) if (h[r][c]) box(S + 0.4, H, 0.4, x0 + (c + 0.5) * S, H / 2, zf - r * S, wallMaterial, true);
  for (let r = 0; r < N; r++) for (let c = 0; c <= N; c++) if (v[r][c]) box(0.4, H, S + 0.4, x0 + c * S, H / 2, zf - (r + 0.5) * S, wallMaterial, true);

  // Floor, ceiling, roof, chimney, door lintel
  const centerZ = zf - N * S / 2;
  plane(N * S, N * S, 0, 0.01, centerZ, lambert(0xffffff, { map: TEX.wood }));
  box(N * S + 1, 0.3, N * S + 1, 0, H + 0.15, centerZ, lambert(0x1a1412));
  box(S, 0.6, 0.4, x0 + (MAZE.startCol + 0.5) * S, H - 0.3, zf, wallMaterial);
  const roof = addMesh(new ConeGeometry(20, 7, 4), lambert(0x2a1a1a), 0, H + 3.8, centerZ);
  roof.rotation.y = Math.PI / 4;
  box(2, 5, 2, 6, H + 5, centerZ - 4, lambert(0x1a1210));

  // Key in the farthest cell. Candles and portraits in the others.
  const [keyX, keyZ] = cellCenter(...farthest);
  world.keyPos = { x: keyX, y: 1.3, z: keyZ, beam: false };
  const hollowStarts = [];
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    if (dist[r][c] >= Math.max(4, dist[farthest[0]][farthest[1]] * 0.6)) hollowStarts.push(cellCenter(r, c));
    const isStart = r === 0 && c === MAZE.startCol, isKeyCell = r === farthest[0] && c === farthest[1];
    if (isStart || isKeyCell) continue;
    const [cx, cz] = cellCenter(r, c);
    if (Math.random() < 0.5) {
      box(0.6, 0.7, 0.6, cx + 1.4, 0.35, cz + 1.4, lambert(0x3a2a1c), true);
      cylinder(0.05, 0.05, 0.3, cx + 1.4, 0.85, cz + 1.4, lambert(0xddd5b8));
      world.group.add(glowSprite(0xff9a3a, 2.4, cx + 1.4, 1.15, cz + 1.4));
    }
    if (Math.random() < 0.3 && (h[r + 1][c] || h[r][c])) {
      const onBack = h[r + 1][c];
      const frame = plane(1, 1.25, cx - 0.6, 1.8, onBack ? zf - (r + 1) * S + 0.22 : zf - r * S - 0.22, basic(0xffffff, { map: TEX.portrait }), 0);
      if (!onBack) frame.rotation.y = Math.PI;
    }
  }
  if (!hollowStarts.length) hollowStarts.push([keyX, keyZ]);

  const hollow = createHollow();
  world.monsters.push(hollow);
  world.resetMonsters = () => { const [x, z] = pick(hollowStarts); hollow.group.position.set(x, 0, z); };
  world.resetMonsters();
  world.scareSpawn = { x: x0 + (MAZE.startCol + 0.5) * S, y: 0, z: -13.5, yaw: 0 };

  // Dead trees, stepping stones to the door, lamp post
  for (let k = 0; k < 60; k++) {
    const x = rand(-80, 80), z = rand(-100, 30);
    const insideHouse = Math.abs(x) < 17 && z < -12 && z > -48;
    if (insideHouse || Math.hypot(x, z) < 8 || (Math.abs(x) < 4 && z > -15)) continue;
    addTree(x, z, true);
  }
  for (let k = 0; k < 6; k++) cylinder(0.7, 0.7, 0.06, k * 0.4, 0.03, -4 - k * 1.6, lambert(0x3a3a38));
  cylinder(0.06, 0.06, 3, 5, 1.5, -5, lambert(0x111111));
  sphere(0.25, 5, 3.1, -5, basic(0xffb866));
  const lamp = new PointLight(0xffa860, 1.2, 16);
  lamp.position.set(5, 3, -5);
  world.group.add(lamp);

  // Lightning: strong double flash that lights up everything, plus thunder.
  const darkSky = new Color(0x04060b), flashSky = new Color(0x7a8ab8);
  let untilStrike = rand(3, 6), strikeLeft = 0;
  world.ticks.push(dt => {
    untilStrike -= dt; strikeLeft -= dt;
    if (untilStrike <= 0) {
      untilStrike = rand(6, 13); strikeLeft = 0.5;
      flashScreen('#d8e4ff', 0.8);
      setTimeout(() => noise(2.2, 0.8, 700), 500);
    }
    const lit = strikeLeft > 0 && (strikeLeft > 0.32 || (strikeLeft < 0.22 && strikeLeft > 0.1));
    hemiLight.intensity = lit ? 2.6 : 0.42;
    sunLight.intensity = lit ? 1.8 : 0;
    scene.background.copy(lit ? flashSky : darkSky);
    scene.fog.color.copy(scene.background);
  });
}

// ----- Obby (floor 5): short and easy -----
function buildObby() {
  setEnvironment({ sky: 0x8fd8ff, fog: 0.005, hemiSky: 0xffffff, hemiGround: 0x7aa0c0, hemi: 1.1, sun: 0.9 });
  const water = addMesh(new PlaneGeometry(900, 900), lambert(0xffffff, { map: TEX.water, transparent: true, opacity: 0.9 }), 0, -6, 0);
  water.rotation.x = -Math.PI / 2;

  const platforms = [], colors = [0xff5a5a, 0xffb347, 0xffe14a, 0x4fc3ff, 0xb07bff, 0xff7ad1, 0x6ee27a];
  let z = -15, y = 0, x = 0, colorIndex = 0;
  addPlatform(platforms, 0, 0, -3, 20, 24, 'solid', 0x6ec96a);

  // A jump platform "gap" meters ahead of the last one.
  const jump = (gap, width, depth, atX) => {
    if (atX !== undefined) x = atX;
    addPlatform(platforms, x, y, z - gap - depth / 2, width, depth, 'solid', colors[colorIndex++ % 7]);
    z -= gap + depth;
  };
  for (let i = 0; i < 3; i++) { y += 0.5; jump(1.6, 4, 3, 0); }     // easy stairs
  jump(2.2, 4, 4, 2); jump(2.4, 4, 4, -2); jump(2.4, 4, 4, 0);    // zig-zag
  addPlatform(platforms, x, y, z - 7.2, 4.5, 4.5, 'mover', 0xff8a3a, { baseZ: z - 7.2 });   // one slow moving platform
  addPlatform(platforms, x, y, z - 16.2, 5, 4, 'checkpoint', 0x37d67a);
  z -= 18.4;
  jump(2.4, 4, 4, 2); jump(2.6, 4, 4, -2); jump(2.6, 4, 4, 0);    // second zig-zag
  y += 0.4; jump(2, 4, 4, 0);
  z -= 2;
  addPlatform(platforms, 0, y, z - 5, 10, 10, 'end', 0xffd24a);
  world.keyPos = { x: 0, y: y + 1.8, z: z - 5, beam: true };
  const endZ = z - 10;
  usePlatforms(platforms);

  // Grassy banks with trees on both sides, clouds
  for (const side of [-1, 1]) box(14, 8, 40 - endZ, side * 30, -3, endZ / 2, lambert(0x4caf50));
  for (let zz = 15; zz > endZ - 15; zz -= 9) for (const side of [-1, 1]) addTree(side * rand(25, 33), zz + rand(-3, 3), false, 1);
  for (let k = 0; k < 8; k++) {
    const cloud = addMesh(new SphereGeometry(rand(8, 14), 6, 5), basic(0xffffff, { transparent: true, opacity: 0.85, fog: false }), rand(-150, 150), rand(45, 70), rand(endZ, 20));
    cloud.scale.y = 0.3;
  }

  world.ticks.push(() => {
    for (const p of platforms) {
      if (p.kind !== 'mover') continue;
      const newZ = p.baseZ + Math.sin(game.time * 0.7) * 3.4;
      p.dz = newZ - p.z; p.z = newZ; p.mesh.position.z = newZ;
    }
    water.material.map.offset.x += 0.0006;
    water.material.map.offset.y += 0.0004;
  });

  let line = 0;
  addNpc({ kind: 'coach', name: 'Boxy', x: -5, z: -6, facing: 0.5, lines: () => ['b1', 'b2'][line++ % 2] });
}

const FLOOR_BUILDERS = [() => buildOffice(false), buildField, buildLava, buildHouse, () => buildOffice(true), buildObby];