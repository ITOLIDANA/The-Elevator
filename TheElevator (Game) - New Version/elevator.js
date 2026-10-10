'use strict';
/* The elevator: model, doors, display, buttons, unlock rules.
   Enhanced: richer cabin, arrow display, bezelled buttons with press/pulse feedback,
   rubber-edged doors, handrail, plaque, arrival chime, and ride flicker.
   Drop-in compatible: same globals and function names as before.
   NEW (optional hooks): updateElevatorFx(dt, time) and elevatorChime(). */

const elevator = {
  buttons: [], rings: [], halos: [], pressTimers: [],
  leftDoor: null, rightDoor: null, light: null, lamps: [],
  doorOpenAmount: 0, doorTarget: 0, displayText: '', displayKey: ''
};
const DOOR_BLOCK = [-2.6, -3.3, 2.6, -2.9];   // solid while the doors are closed

// The little screen above the doors is a canvas texture we redraw when the text changes.
const displayCanvas = document.createElement('canvas');
displayCanvas.width = 512; displayCanvas.height = 128;
const displayCtx = displayCanvas.getContext('2d');
const displayTexture = new THREE.CanvasTexture(displayCanvas);
displayTexture.encoding = THREE.sRGBEncoding;

// arrow: 'up' | 'down' | undefined (idle dot)
function setDisplay(text, color, arrow) {
  const key = text + '|' + (color || '') + '|' + (arrow || '');
  if (key === elevator.displayKey) return;
  elevator.displayKey = key;
  elevator.displayText = text;
  const c = displayCtx, glow = color || '#7dffb0';

  // Dark glass with a soft vignette
  const bg = c.createRadialGradient(256, 64, 20, 256, 64, 300);
  bg.addColorStop(0, '#12141a'); bg.addColorStop(1, '#040407');
  c.fillStyle = bg; c.fillRect(0, 0, 512, 128);

  // Brass bezel (double line)
  c.strokeStyle = '#d9b25f'; c.lineWidth = 6; c.strokeRect(3, 3, 506, 122);
  c.strokeStyle = '#7a5c22'; c.lineWidth = 2; c.strokeRect(11, 11, 490, 106);

  // Arrow on the left
  c.fillStyle = glow; c.shadowColor = glow; c.shadowBlur = 14;
  c.beginPath();
  if (arrow === 'up') { c.moveTo(60, 38); c.lineTo(88, 82); c.lineTo(32, 82); }
  else if (arrow === 'down') { c.moveTo(60, 90); c.lineTo(88, 46); c.lineTo(32, 46); }
  else { c.arc(60, 64, 8, 0, Math.PI * 2); }
  c.closePath(); c.fill();

  // Text with glow
  c.font = 'bold 48px "Special Elite", "Noto Sans JP", Georgia, monospace';
  c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText(text, 290, 66);
  c.shadowBlur = 0;

  // CRT scanlines
  c.fillStyle = 'rgba(0,0,0,0.22)';
  for (let y = 12; y < 118; y += 4) c.fillRect(12, y, 488, 1);

  displayTexture.needsUpdate = true;
}

function buildElevator() {
  const brass = lambert(0xd9b25f, { emissive: 0x3a2a0c });
  const darkBrass = lambert(0x8a6a2a, { emissive: 0x20160a });
  const rubber = lambert(0x1a1612);
  const wood = lambert(0x4a2f1c, { emissive: 0x120a05 });
  const lit = (map, strength = 0.4) => lambert(0xffffff, { map, emissiveMap: map, emissive: 0xffffff, emissiveIntensity: strength });
  elevator.buttons.length = 0; elevator.rings.length = 0; elevator.halos.length = 0;
  elevator.pressTimers.length = 0; elevator.lamps.length = 0;

  world.solids.push([-3.2, 2.9, 3.2, 3.2], [-3.2, -3.1, -2.9, 3.2], [2.9, -3.1, 3.2, 3.2], [-3.2, -3.3, -2.6, -2.9], [2.6, -3.3, 3.2, -2.9]);

  // Floor, ceiling, walls, door frame
  box(6, 0.04, 6, 0, 0, 0, lit(TEX.tiles, 0.3));
  box(6.4, 0.1, 6.4, 0, 3.45, 0, lambert(0xefe3c8, { emissive: 0x403828 }));
  box(6.4, 3.4, 0.3, 0, 1.7, 3.05, lit(TEX.deco));
  box(0.3, 3.4, 6.4, -3.05, 1.7, 0, lit(TEX.deco));
  box(0.3, 3.4, 6.4, 3.05, 1.7, 0, lit(TEX.deco));
  box(6.4, 0.5, 0.3, 0, 3.2, -3.05, brass);
  box(0.6, 3.4, 0.3, -2.9, 1.7, -3.05, brass);
  box(0.6, 3.4, 0.3, 2.9, 1.7, -3.05, brass);
  for (const x of [-2.85, 2.85]) cylinder(0.08, 0.08, 3.4, x, 1.7, 2.85, brass);
  cylinder(0.04, 0.04, 5.4, 0, 0.9, 2.8, brass).rotation.z = Math.PI / 2;

  // Cabin detailing ------------------------------------------------------
  // Carpet runner and brass threshold at the doorway
  box(3.4, 0.02, 4.6, 0, 0.03, 0.4, lambert(0x6b1d26, { emissive: 0x1a0508 }));
  box(3.6, 0.03, 0.06, 0, 0.035, 0.4 + 2.3, brass);
  box(3.6, 0.03, 0.06, 0, 0.035, 0.4 - 2.3, brass);
  box(5.4, 0.05, 0.12, 0, 0.04, -2.85, darkBrass);

  // Baseboards and wainscot rail on the three walls
  box(5.8, 0.25, 0.06, 0, 0.14, 2.9, wood);
  box(0.06, 0.25, 5.8, -2.9, 0.14, 0, wood);
  box(0.06, 0.25, 5.8, 2.9, 0.14, 0, wood);
  box(5.8, 0.06, 0.08, 0, 1.15, 2.9, brass);
  box(0.08, 0.06, 5.8, -2.9, 1.15, 0, brass);

  // Wooden handrail on the back wall with brass brackets
  box(4.6, 0.08, 0.1, 0, 1.0, 2.82, wood);
  for (const x of [-2, 0, 2]) box(0.06, 0.06, 0.12, x, 0.95, 2.86, brass);

  // Framed plaque on the left wall
  box(0.04, 0.7, 1.3, -2.88, 1.9, 0, brass);
  const plaque = plane(1.1, 0.5, -2.85, 1.9, 0, basic(0xffffff, { map: makeLabel('MAX 8 PERSONS', 300, 140, '#2a1c08', '#e9d9a8') }), 0);
  plaque.rotation.y = Math.PI / 2;

  // Ceiling light panels with brass frames (and a soft glow)
  for (const [x, z] of [[-1.6, -1.6], [1.6, -1.6], [-1.6, 1.6], [1.6, 1.6]]) {
    box(1.05, 0.03, 1.05, x, 3.395, z, brass);
    const lamp = box(0.9, 0.04, 0.9, x, 3.39, z, basic(0xfff3d6));
    elevator.lamps.push(lamp);
  }

  // Sliding doors: two panels hinged at the frame, squashed on x to open.
  const buildPanel = (side) => {
    const g = new Group();
    g.position.set(side * -2.6, 0, -3.05);
    const dir = -side;                                   // +1 for left door, -1 for right door
    const panel = new Mesh(new BoxGeometry(2.6, 2.95, 0.08), lit(TEX.deco, 0.5));
    panel.position.set(1.3 * dir, 1.475, 0);
    g.add(panel);
    // Brass inset frame on the panel face
    const trim = new Mesh(new BoxGeometry(2.2, 0.05, 0.1), brass);
    for (const y of [0.35, 2.6]) { const m = trim.clone(); m.position.set(1.3 * dir, y, 0); g.add(m); }
    const side2 = new Mesh(new BoxGeometry(0.05, 2.3, 0.1), brass);
    for (const x of [0.2, 2.4]) { const m = side2.clone(); m.position.set(x * dir, 1.475, 0); g.add(m); }
    // Black rubber leading edge where the doors meet
    const edge = new Mesh(new BoxGeometry(0.07, 2.95, 0.12), rubber);
    edge.position.set(2.58 * dir, 1.475, 0);
    g.add(edge);
    return g;
  };
  elevator.leftDoor = buildPanel(1);
  elevator.rightDoor = buildPanel(-1);
  world.group.add(elevator.leftDoor, elevator.rightDoor);

  // Floor display (inside) and sign (outside)
  plane(2.8, 0.5, 0, 3.2, -2.89, basic(0xffffff, { map: displayTexture }), 0);
  plane(3.4, 0.6, 0, 3.2, -3.22, basic(0xffffff, { map: makeLabel('ELEVATOR', 400, 70, '#d9b25f', '#14100a') }), 0).rotation.y = Math.PI;

  // Button panel on the right wall: L, 1, 2, 3, 4, 5 from bottom to top
  box(0.06, 2.8, 0.7, 2.87, 1.5, 0, brass);
  box(0.03, 2.6, 0.5, 2.845, 1.5, 0, lambert(0x1a1208, { emissive: 0x080604 }));   // dark inset
  LABELS.forEach((label, i) => {
    const y = 0.55 + i * 0.38;
    // Bezel ring
    const ring = addMesh(new THREE.TorusGeometry(0.16, 0.025, 8, 24), brass, 2.815, y, 0);
    ring.rotation.y = Math.PI / 2;
    elevator.rings.push(ring);
    // Glow halo behind the button (brightens when unlocked / current)
    const halo = addMesh(new CircleGeometry(0.2, 24),
      basic(0xffffff, { transparent: true, opacity: 0 }), 2.835, y, 0);
    halo.rotation.y = -Math.PI / 2;
    elevator.halos.push(halo);
    // Button
    const button = addMesh(new CylinderGeometry(0.14, 0.14, 0.07, 16), lambert(0x5a4a2a, { emissive: 0x401010 }), 2.82, y, 0);
    button.rotation.z = Math.PI / 2;
    button.userData.floor = i;
    button.userData.restX = 2.82;
    elevator.buttons.push(button);
    elevator.pressTimers.push(0);
    const number = addMesh(new CircleGeometry(0.1, 16),
      basic(0xffffff, { map: makeLabel(label, 64, 64, '#fff6d8', null, 'bold 330px Cinzel, serif'), transparent: true }), 2.78, y, 0);
    number.rotation.y = -Math.PI / 2;
  });

  const light = new PointLight(0xffe2b0, 0.9, 11);
  light.position.set(0, 3, 0);
  world.group.add(light);
  elevator.light = light;
  elevator.lightBase = 0.9;
}

const isInsideElevator = () => Math.abs(player.x) < 3.1 && player.z > -3.2 && player.z < 3.1 && player.y < 1.2;

// Floor N needs the key from floor N-1. Floor 1 is always open. The lobby is the way home.
function isFloorUnlocked(i) {
  if (i === FLOOR.LOBBY) return !(game.floor === FLOOR.FAKE && !game.keys[FLOOR.FAKE]);
  if (i === FLOOR.FIELD) return true;
  return !!game.keys[i - 1];
}

// Small "ding" for arrivals. Call it when the doors start opening on a new floor.
function elevatorChime() {
  tone(880, 0.25, 'sine', 0.1);
  setTimeout(() => tone(660, 0.45, 'sine', 0.1), 180);
}

function pressElevatorButton(i) {
  if (game.ride) return;
  game.reach = 1;
  elevator.pressTimers[i] = 0.18;                       // squish the button either way
  if (i === game.floor) { showNote(t('here')); return; }
  if (!isFloorUnlocked(i)) {
    tone(140, 0.4, 'square', 0.12);
    const trapped = game.floor === FLOOR.FAKE && i === FLOOR.LOBBY;
    say(trapped ? 'e_dead' : 'e_lock');
    showNote(trapped ? t('dead') : t('lk'));
    return;
  }
  game.ride = { to: i, time: 0, rumble: 0 };
  elevator.doorTarget = 1;
  tone(660, 0.5, 'sine', 0.12);
  say('e_go');
  showNote('');
}

function refreshButtonLights() {
  elevator.buttons.forEach((b, i) => {
    const color = i === game.floor ? 0x22dd66 : isFloorUnlocked(i) ? (game.keys[i] ? 0xffc84a : 0x8a6a2a) : 0x501010;
    b.material.emissive.set(color);
    const halo = elevator.halos[i];
    if (halo) {
      halo.material.color.set(color);
      halo.userData.base = i === game.floor ? 0.35 : isFloorUnlocked(i) ? 0.18 : 0;
    }
  });
}

// Optional per-frame polish. Call from your main loop: updateElevatorFx(dt, elapsedSeconds)
function updateElevatorFx(dt, time) {
  // Button press animation + current-floor pulse
  elevator.buttons.forEach((b, i) => {
    if (elevator.pressTimers[i] > 0) elevator.pressTimers[i] = Math.max(0, elevator.pressTimers[i] - dt);
    const pressed = elevator.pressTimers[i] > 0;
    b.position.x = b.userData.restX + (pressed ? 0.025 : 0);
    const halo = elevator.halos[i];
    if (halo) {
      const base = halo.userData.base || 0;
      const pulse = i === game.floor ? 0.12 * Math.sin(time * 3) : 0;
      halo.material.opacity = Math.max(0, base + pulse + (pressed ? 0.3 : 0));
    }
  });

  // Ceiling lights hold steady, but flicker and sag while the car is moving
  if (elevator.light) {
    const moving = !!game.ride;
    const flick = moving ? (Math.sin(time * 40) * Math.sin(time * 13) > 0.85 ? 0.45 : 1) : 1;
    elevator.light.intensity = elevator.lightBase * flick;
  }
}