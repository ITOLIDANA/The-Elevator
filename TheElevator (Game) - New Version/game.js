'use strict';
/* Game state, loading floors, movement, monsters, keys, elevator trips, input. */

const game = {
  floor: 0, started: false, paused: true, won: false, time: 0,
  keys: [0, 0, 0, 0, 0, 0],      // keys[floor] = 1 once collected
  ride: null,                     // active elevator trip, or null
  flashlightOn: true, hoverButton: -1, hoverItem: null,
  shake: 0, fear: 0, reach: 0, lastScare: 0, spawn: { x: 0, y: 0, z: 0.6, yaw: 0 }
};
const player = { x: 0, y: 0, z: 0, vy: 0, yaw: 0, pitch: 0, walkAmount: 0, bobPhase: 0, airborne: false, coyote: 0, stepTimer: 0, grip: 0.3, gripLeft: 0.3 };
const input = {};
const tempVec = new Vector3();

// ----- small UI helpers -----
function showNote(text, ms = 4000) {
  const el = $('note');
  el.textContent = text;
  el.style.opacity = text ? 1 : 0;
  clearTimeout(showNote.timer);
  if (text) showNote.timer = setTimeout(() => el.style.opacity = 0, ms);
}
function showTitleCard(heading, sub) {
  $('title').innerHTML = '<h2>' + heading + '</h2><p>' + sub + '</p>';
  $('title').classList.add('on');
  clearTimeout(showTitleCard.timer);
  showTitleCard.timer = setTimeout(() => $('title').classList.remove('on'), 3400);
}
function flashScreen(color, opacity) {
  const el = $('flash');
  el.style.transition = 'none';
  el.style.background = color;
  el.style.opacity = opacity;
  requestAnimationFrame(() => requestAnimationFrame(() => { el.style.transition = 'opacity .7s'; el.style.opacity = 0; }));
}
function refreshHud() {
  $('keys').innerHTML = [1, 2, 3, 4, 5].map(i => '<i class="' + (game.keys[i] ? 'on' : '') + '">' + i + '</i>').join('');
  $('objective').textContent = game.floor > 0 && game.keys[game.floor] ? t('oback') : t('o' + game.floor);
}

// ----- loading a floor -----
function loadFloor(floor, arrivedByElevator) {
  if (world) scene.remove(world.group);
  world = newWorld();
  scene.add(world.group);
  game.floor = floor;
  hemiLight.intensity = 1;
  sunLight.intensity = 0;

  FLOOR_BUILDERS[floor]();
  buildElevator();
  if (world.keyPos && !game.keys[floor]) world.key = createKey(world.keyPos);

  game.spawn = { x: 0, y: 0, z: 0.6, yaw: 0 };
  moveTo(game.spawn);
  player.pitch = 0;
  elevator.doorOpenAmount = arrivedByElevator ? 1 : 0;
  elevator.doorTarget = elevator.doorOpenAmount;
  game.flashlightOn = true;
  $('vig').style.opacity = isDarkFloor(floor) ? 0.8 : 0.4;
  elevator.displayText = '';
  refreshHud();
}

function moveTo(spot) {
  player.x = spot.x; player.z = spot.z; player.y = spot.y; player.vy = 0;
  if (spot.yaw !== undefined) player.yaw = spot.yaw;
}

// A jump scare: red flash, sting, and you are thrown back to a safe spot.
function jumpScare() {
  if (game.time < game.lastScare || game.ride) return;
  game.lastScare = game.time + 3;
  flashScreen('#b00000', 0.95);
  game.shake = 0.9;
  noise(0.9, 0.8, 5000);
  tone(80, 1, 'sawtooth', 0.45, 28);
  tone(1500, 0.5, 'square', 0.08, 300);
  say('w3');
  setTimeout(() => say('y_scare'), 1800);
  moveTo(world.scareSpawn || game.spawn);
  world.resetMonsters();
}

// ----- collision and movement -----
function resolveCollisions(x, z) {
  for (const [cx, cz, radius] of world.circles) {
    const dx = x - cx, dz = z - cz, minDist = radius + 0.35, d = Math.hypot(dx, dz);
    if (d < minDist && d > 1e-4) { x = cx + dx / d * minDist; z = cz + dz / d * minDist; }
  }
  const walls = [...world.solids];
  if (elevator.doorOpenAmount > 0.15) walls.push(DOOR_BLOCK);
  if (world.gapWall && !world.gapWall.open) walls.push(world.gapWall.solid);
  for (const [x0, z0, x1, z1] of walls) {
    const m = 0.35;
    if (x > x0 - m && x < x1 + m && z > z0 - m && z < z1 + m) {
      // push out along the shortest way
      const pushes = [x - (x0 - m), x1 + m - x, z - (z0 - m), z1 + m - z];
      const best = Math.min(...pushes);
      if (best === pushes[0]) x = x0 - m; else if (best === pushes[1]) x = x1 + m;
      else if (best === pushes[2]) z = z0 - m; else z = z1 + m;
    }
  }
  return [x, z];
}

function movePlayer(dt) {
  const forward = (input.KeyW || input.ArrowUp ? 1 : 0) - (input.KeyS || input.ArrowDown ? 1 : 0);
  const strafe = (input.KeyD ? 1 : 0) - (input.KeyA ? 1 : 0);
  const running = input.ShiftLeft || input.ShiftRight;
  const speed = running ? 9 : 6, norm = Math.hypot(forward, strafe) || 1;
  const dx = (-Math.sin(player.yaw) * forward + Math.cos(player.yaw) * strafe) / norm * speed * dt;
  const dz = (-Math.cos(player.yaw) * forward - Math.sin(player.yaw) * strafe) / norm * speed * dt;
  player.walkAmount += ((forward || strafe ? 1 : 0) - player.walkAmount) * Math.min(1, dt * 10);

  const tryStep = (nx, nz) => {
    [nx, nz] = resolveCollisions(nx, nz);
    if (world.blocked(nx, nz, player.y)) return false;
    const r = Math.hypot(nx, nz);
    if (r > world.bound) { nx *= world.bound / r; nz *= world.bound / r; }
    player.x = nx; player.z = nz;
    return true;
  };
  if (!tryStep(player.x + dx, player.z + dz) && !tryStep(player.x + dx, player.z)) tryStep(player.x, player.z + dz);

  // Gravity, landing, jumping (with a short "coyote time" so jumps feel forgiving)
  const feetBefore = player.y;
  player.vy -= 22 * dt;
  player.y += player.vy * dt;
  const groundY = world.ground(player.x, player.z, feetBefore);
  const platform = world.standingOn;
  let onGround = false;
  if (groundY > -900 && player.y <= groundY && player.vy <= 0) { player.y = groundY; player.vy = 0; onGround = true; }
  player.coyote = onGround ? 0.12 : player.coyote - dt;
  if (input.Space && (onGround || player.coyote > 0) && player.vy <= 0.01) {
    player.vy = 8.2; player.coyote = 0; onGround = false;
    tone(300, 0.12, 'sine', 0.05, 500);
  }
  player.airborne = !onGround;

  if (onGround && platform) {
    if (platform.kind === 'mover') player.z += platform.dz;
    if (platform.kind === 'checkpoint' && game.spawn.checkpoint !== platform) {
      game.spawn = { x: platform.x, y: platform.y, z: platform.z, yaw: 0, checkpoint: platform };
      showNote(t('cpt'));
      tone(880, 0.25, 'sine', 0.12); tone(1320, 0.3, 'sine', 0.1);
    }
  }
  if (game.floor === FLOOR.LAVA && player.y < -0.55) {
    noise(0.5, 0.6, 3000); flashScreen('#ff5a10', 0.7); say('y_burn'); moveTo(game.spawn);
  }
  if (game.floor === FLOOR.OBBY && player.y < -4.2) {
    noise(0.5, 0.5, 900); tone(300, 0.4, 'sine', 0.2, 90); flashScreen('#8fd8ff', 0.4); say('y_splash'); moveTo(game.spawn);
  }
  if (onGround && (forward || strafe)) {
    player.stepTimer -= dt * (running ? 1.7 : 1);
    if (player.stepTimer <= 0) { player.stepTimer = 0.5; noise(0.07, 0.1, game.floor === FLOOR.FIELD ? 700 : 1400); }
  }
}

// ----- monsters -----
function updateMonsters(dt) {
  let fear = 0;
  for (const m of world.monsters) {
    const pos = m.group.position;
    const dx = player.x - pos.x, dz = player.z - pos.z, dist = Math.hypot(dx, dz) || 1;
    m.group.rotation.y = Math.atan2(dx, dz);
    camera.getWorldDirection(tempVec);
    const inView = (tempVec.x * dx + tempVec.z * dz) / dist > 0.5 && dist < 40;

    // The Hollow always creeps forward. Mannequins only move when unseen.
    const speed = m.kind === 'hollow' ? m.speed : inView ? 0 : 3.6;
    if (!game.ride && dist > 1.1) { pos.x += dx / dist * speed * dt; pos.z += dz / dist * speed * dt; }
    else if (!game.ride) jumpScare();

    if (m.kind === 'hollow') animateHollow(m, dt, dist, inView);
    else if (inView && dist < 30 && !m.seen) { m.seen = true; tone(60, 0.5, 'sawtooth', 0.2); }
    else if (!inView) m.seen = false;
    fear = Math.max(fear, 1 - dist / (m.kind === 'hollow' ? 11 : 8));
  }
  game.fear += (Math.max(0, fear) - game.fear) * 0.1;
}

function animateHollow(m, dt, dist, inView) {
  const time = game.time;
  m.group.position.y = 0.05 + Math.sin(time * 2) * 0.06;
  m.head.rotation.z = Math.sin(time * 2.3) * 0.28 + (Math.random() < 0.06 ? rand(-0.5, 0.5) : 0);
  m.head.rotation.x = 0.15 + (Math.random() < 0.04 ? 0.3 : 0);
  m.robe.rotation.y += dt * 0.5;
  for (const arm of m.arms) {
    arm.shoulder.rotation.x = -0.55 + Math.sin(time * 2 + arm.side) * 0.25;
    arm.elbow.rotation.x = -0.5 + Math.sin(time * 3 + arm.side) * 0.2;
    arm.shoulder.rotation.z = arm.side * (0.15 + Math.sin(time * 1.7) * 0.1);
  }
  // First sighting: sting and flash
  if (inView && dist < 22 && !m.seen) { m.seen = true; noise(0.9, 0.6, 6000); tone(1200, 0.8, 'sawtooth', 0.12, 200); game.shake = 0.3; flashScreen('#fff', 0.25); }
  if (!inView || dist > 26) m.seen = false;
  // Whispers and heartbeat when close; flashlight flickers
  m.whisperTimer -= dt;
  if (dist < 16 && m.whisperTimer <= 0) { m.whisperTimer = rand(10, 16); say(Math.random() < 0.5 ? 'w1' : 'w2'); }
  m.heartTimer -= dt;
  if (dist < 16 && m.heartTimer <= 0) { m.heartTimer = 0.45 + dist / 22; tone(55, 0.18, 'sine', 0.5); }
  if (dist < 9 && Math.random() < 0.05) game.flashlightOn = Math.random() < 0.5 || dist > 6;
}

// ----- keys -----
function updateKeys(dt) {
  const key = world.key;
  if (key) {
    key.group.rotation.y += dt * 1.6;
    key.group.position.y = key.y + Math.sin(game.time * 2) * 0.15;
    if (!game.ride && Math.hypot(player.x - key.x, player.y + 1 - key.y, player.z - key.z) < 2.3) {
      game.keys[game.floor] = 1;
      world.group.remove(key.group);
      world.key = null;
      game.reach = 1;
      tone(988, 0.25, 'sine', 0.2); tone(1319, 0.35, 'sine', 0.18); tone(1568, 0.5, 'sine', 0.15);
      flashScreen('#ffd24a', 0.5);
      say('y_k' + game.floor);
      refreshHud();
    }
  }
  for (const decoy of [...world.decoys]) {
    decoy.group.rotation.y += dt * 1.6;
    if (!game.ride && Math.hypot(player.x - decoy.x, player.y + 1 - decoy.y, player.z - decoy.z) < 1.6) {
      world.group.remove(decoy.group);
      world.decoys.splice(world.decoys.indexOf(decoy), 1);
      say('fm4');
      jumpScare();
    }
  }
}

// ----- elevator trip -----
function updateRide(dt) {
  const ride = game.ride, time = (ride.time += dt);
  if (time > 1.2 && !ride.faded) { ride.faded = true; $('fade').style.opacity = 1; $('fade').textContent = ''; }
  if (time > 1.4 && time < 3.4) {   // rumbling, floor numbers counting past
    game.shake = 0.05;
    ride.rumble -= dt;
    if (ride.rumble <= 0) {
      ride.rumble = 0.3;
      tone(48, 0.3, 'sawtooth', 0.06);
      $('fade').textContent = LABELS[Math.round(game.floor + (ride.to - game.floor) * Math.min(1, (time - 1.4) / 2))];
    }
  }
  if (time >= 3.4 && !ride.arrived) {   // swap the world while the screen is black
    ride.arrived = true;
    const to = ride.to;
    loadFloor(to, true);
    tone(880, 0.7, 'sine', 0.14); tone(1175, 0.9, 'sine', 0.1);
    $('fade').textContent = ''; $('fade').style.opacity = 0;
    showTitleCard(floorLabel(to), t('n' + to));
    setTimeout(() => say('e_f' + to), 900);
    if (to === FLOOR.LAVA) setTimeout(() => say('y_f2', true), 3200);
    if (to === FLOOR.HOUSE) setTimeout(() => say('y_f3', true), 3200);
    if (to === FLOOR.FAKE) setTimeout(() => say('y_f4', true), 3400);
  }
  if (time >= 4.1 && !ride.doorsOpened) { ride.doorsOpened = true; elevator.doorTarget = 0; }
  if (time >= 5) {
    game.ride = null;
    if (game.floor === FLOOR.LOBBY && game.keys.slice(1).every(Boolean) && !game.won) {
      game.won = true;
      say('e_win');
      setTimeout(() => openMenu(true), 4500);
    }
  }
}

// ----- what the crosshair is pointing at -----
function updateHover() {
  camera.updateMatrixWorld();
  const ray = new Raycaster();
  ray.far = 5;
  ray.setFromCamera(new Vector2(0, 0), camera);
  const hits = ray.intersectObjects(elevator.buttons);
  game.hoverButton = !game.ride && hits.length ? hits[0].object.userData.floor : -1;

  camera.getWorldDirection(tempVec);
  game.hoverItem = null;
  let best = 9;
  if (!game.ride) for (const item of world.interacts) {
    const dx = item.x - player.x, dz = item.z - player.z, d = Math.hypot(dx, dz);
    if (d < item.radius && d < best && (tempVec.x * dx + tempVec.z * dz) / (d || 1) > 0.3) { best = d; game.hoverItem = item; }
  }

  const b = game.hoverButton;
  $('prompt').textContent = game.ride ? ''
    : b >= 0 ? (b === game.floor ? t('here') : isFloorUnlocked(b) ? floorLabel(b) + ', ' + t('n' + b) + ' (' + t('go') + ')'
      : game.floor === FLOOR.FAKE && b === 0 ? t('dead') : t('lk'))
    : game.hoverItem ? '[E] ' + game.hoverItem.label() : '';
}

function updateElevatorDisplay() {
  const ride = game.ride;
  const text = ride ? (ride.time < 1.3 ? '...' : ride.time < 3.4 ? '>>>' : LABELS[game.floor])
    : game.floor === FLOOR.FAKE ? 'L   ' + t('n0').toUpperCase()    // the fake office lies about where it is
    : LABELS[game.floor] + '   ' + t('n' + game.floor).toUpperCase();
  setDisplay(text, ride && ride.time < 3.4 ? '#ffb04a' : game.floor === FLOOR.FAKE ? '#ff5a4a' : '#7dffb0');
  refreshButtonLights();
}

// Arrow toward the key, or back to the elevator once you have it.
function updateArrow() {
  let target = null;
  if (world.key && [FLOOR.FIELD, FLOOR.LAVA, FLOOR.OBBY].includes(game.floor)) target = world.key;
  else if (game.keys[game.floor] && game.floor > 0) target = { x: 0, z: 0 };
  const arrow = $('arrow');
  if (!target) { arrow.style.display = 'none'; return; }
  const rx = target.x - player.x, rz = target.z - player.z;
  arrow.style.display = 'block';
  $('arrowIcon').style.transform = 'rotate(' + (Math.atan2(rx, -rz) + player.yaw) + 'rad)';
  $('arrowDist').textContent = Math.round(Math.hypot(rx, rz)) + ' m';
}

// Ambient sound per floor (one sound every few seconds)
let ambienceTimer = 0;
const AMBIENCE = [
  () => { tone(110, 3, 'sine', 0.03); return 6; },
  () => { noise(2.5, 0.05, 600); tone(rand(2000, 2600), 0.1, 'sine', 0.03, rand(3000, 3600)); return 3; },
  () => { noise(2, 0.08, 300); tone(70, 2, 'sawtooth', 0.04); return 2.5; },
  () => { tone(55, 4, 'sawtooth', 0.05); tone(rand(120, 200), 0.5, 'sawtooth', 0.05, rand(80, 300)); return 3.5; },
  () => { tone(220, 3, 'triangle', 0.04); tone(233, 3, 'triangle', 0.04); noise(1, 0.05, 3000); return 3; },
  () => { [523, 659, 784, 1047, 784, 659].forEach((n, i) => setTimeout(() => tone(n, 0.18, 'square', 0.03), i * 180)); return 1.1; }
];

// ----- input -----
const pointerLocked = () => !!document.pointerLockElement;
function requestLock() {
  try { const p = $('c').requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch (e) { /* not available */ }
}
let dragging = false;

addEventListener('keydown', e => {
  input[e.code] = true;
  if (['Space', 'ArrowUp', 'ArrowDown'].includes(e.code)) e.preventDefault();
  if (!game.started || game.paused) return;
  if (e.code === 'KeyE') {
    if (game.hoverButton >= 0) pressElevatorButton(game.hoverButton);
    else if (game.hoverItem) game.hoverItem.action();
  }
  if (e.code === 'KeyF' && !e.repeat && isDarkFloor(game.floor)) { game.flashlightOn = !game.flashlightOn; tone(1800, 0.03, 'square', 0.05); }
  if (e.code === 'Escape' || e.code === 'KeyP') openMenu(true);
});
addEventListener('keyup', e => { input[e.code] = false; });

$('c').addEventListener('pointerdown', e => {
  if (!game.started || game.paused) return;
  dragging = true;
  if (!pointerLocked()) {
    requestLock();
    // Without pointer lock the cursor is free, so aim the ray at the cursor.
    const ray = new Raycaster();
    ray.far = 6;
    ray.setFromCamera(new Vector2(e.clientX / innerWidth * 2 - 1, -e.clientY / innerHeight * 2 + 1), camera);
    const hits = ray.intersectObjects(elevator.buttons);
    if (hits.length) pressElevatorButton(hits[0].object.userData.floor);
  } else if (game.hoverButton >= 0) pressElevatorButton(game.hoverButton);
});
addEventListener('pointerup', () => { dragging = false; });
addEventListener('mousemove', e => {
  if (!game.started || game.paused || (!pointerLocked() && !dragging)) return;
  player.yaw -= e.movementX * 0.0023 * settings.sensitivity;
  player.pitch = clamp(player.pitch - e.movementY * 0.0023 * settings.sensitivity, -1.5, 1.5);
});
document.addEventListener('pointerlockchange', () => {
  if (!pointerLocked() && game.started && !game.paused && !game.won) openMenu(true);
});