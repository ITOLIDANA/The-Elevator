'use strict';
/* The Hollow, mannequins, NPCs and keys. */

// The Hollow (house): tall, pale, long arms, red glowing eyes. Passes through walls.
function createHollow() {
  const group = new Group();
  const skin = basic(0x8e8e86), robeMat = basic(0x101012, { side: 2 });
  const part = (geometry, material, y) => { const m = new Mesh(geometry, material); m.position.y = y; group.add(m); return m; };

  const robe = part(new ConeGeometry(0.6, 2, 8, 1, true), robeMat, 1);
  part(new CylinderGeometry(0.16, 0.2, 1, 6), skin, 1.9);
  part(new CylinderGeometry(0.06, 0.06, 0.4, 5), skin, 2.5);

  const head = new Group();
  head.position.y = 2.8;
  group.add(head);
  const skull = new Mesh(new SphereGeometry(0.3, 12, 10), basic(0xffffff, { map: TEX.hollowFace }));
  skull.scale.set(0.82, 1.3, 0.85);
  head.add(skull);
  for (const side of [-1, 1]) head.add(glowSprite(0xff1010, 0.45, side * 0.1, 0.14, 0.28));

  const arms = [];
  for (const side of [-1, 1]) {
    const shoulder = new Group();
    shoulder.position.set(side * 0.26, 2.25, 0);
    group.add(shoulder);
    const upper = new Mesh(new CylinderGeometry(0.04, 0.03, 1, 5), skin);
    upper.position.y = -0.5;
    shoulder.add(upper);
    const elbow = new Group();
    elbow.position.y = -1;
    shoulder.add(elbow);
    const fore = new Mesh(new CylinderGeometry(0.03, 0.02, 1.1, 5), skin);
    fore.position.y = -0.55;
    elbow.add(fore);
    for (let k = 0; k < 4; k++) {
      const finger = new Mesh(new BoxGeometry(0.015, 0.45, 0.015), skin);
      finger.position.set((k - 1.5) * 0.03, -1.3, 0);
      finger.rotation.z = (k - 1.5) * 0.15;
      elbow.add(finger);
    }
    arms.push({ shoulder, elbow, side });
  }
  group.scale.setScalar(1.12);
  world.group.add(group);
  return { kind: 'hollow', group, head, robe, arms, speed: 1.1, seen: false, whisperTimer: rand(6, 12), heartTimer: 0 };
}

// Mannequins (fake office): only move while you are not looking at them.
function createMannequin(x, z) {
  const group = new Group();
  const plastic = basic(0xd6cebd), dark = basic(0x111111);
  const part = (geometry, x, y, z, rotX = 0) => { const m = new Mesh(geometry, plastic); m.position.set(x, y, z); m.rotation.x = rotX; group.add(m); return m; };
  part(new BoxGeometry(0.5, 0.8, 0.25), 0, 1.25, 0);
  for (const side of [-1, 1]) {
    part(new BoxGeometry(0.18, 0.85, 0.18), side * 0.13, 0.43, 0);
    part(new BoxGeometry(0.12, 0.7, 0.12), side * 0.34, 1.45, 0.3, -1.3);
    const eye = new Mesh(new SphereGeometry(0.025, 5, 5), dark);
    eye.position.set(side * 0.06, 1.88, 0.15);
    group.add(eye);
  }
  part(new SphereGeometry(0.17, 8, 6), 0, 1.85, 0);
  const mouth = new Mesh(new BoxGeometry(0.1, 0.015, 0.02), dark);
  mouth.position.set(0, 1.78, 0.16);
  group.add(mouth);
  group.position.set(x, 0, z);
  world.group.add(group);
  return { kind: 'mannequin', group, home: [x, z], seen: false };
}

// Friendly (or not) NPCs. "lines" is a function returning the next dialogue key.
function addNpc({ kind, name, x, y = 0, z, facing, lines, lookAtPlayer = true }) {
  const group = new Group();
  const part = (w, h, d, px, py, pz, color) => { const m = new Mesh(new BoxGeometry(w, h, d), lambert(color)); m.position.set(px, py, pz); group.add(m); return m; };

  if (kind === 'cinder') {
    // A floating flame spirit
    group.add(glowSprite(0xff7a2a, 2.4, 0, 0, 0));
    group.add(new Mesh(new ConeGeometry(0.3, 0.9, 6), basic(0xffb040)));
    const core = new Mesh(new ConeGeometry(0.17, 0.6, 6), basic(0xfff0a0));
    core.position.y = -0.08;
    group.add(core);
    for (const side of [-1, 1]) {
      const eye = new Mesh(new SphereGeometry(0.05, 5, 5), basic(0x330000));
      eye.position.set(side * 0.1, 0.05, 0.2);
      group.add(eye);
    }
  } else {
    const isFake = kind === 'fmara', isScarecrow = kind === 'scare', isCoach = kind === 'coach';
    const shirt = isScarecrow ? 0x6a5a3a : isCoach ? 0xffd24a : isFake ? 0x4a1a1a : 0x2d4a7a;
    const pants = isScarecrow ? 0x4a3a22 : isCoach ? 0x3a6ad0 : 0x1c1c24;
    const skin = isScarecrow ? 0xc9a86a : isCoach ? 0xffd24a : 0xe3b894;
    part(0.16, 0.7, 0.16, -0.1, 0.35, 0, pants);
    part(0.16, 0.7, 0.16, 0.1, 0.35, 0, pants);
    part(0.42, 0.62, 0.24, 0, 1.0, 0, shirt);
    part(0.1, 0.55, 0.1, -0.27, 1.02, 0, shirt);
    part(0.1, 0.55, 0.1, 0.27, 1.02, 0, shirt);
    if (isCoach) part(0.3, 0.3, 0.3, 0, 1.48, 0, skin);
    else { const head = new Mesh(new SphereGeometry(0.16, 8, 6), lambert(skin)); head.position.y = 1.48; group.add(head); }
    if (isScarecrow) {
      const hat = new Mesh(new ConeGeometry(0.28, 0.3, 8), lambert(0x3a2a14));
      hat.position.y = 1.8;
      group.add(hat);
      part(0.9, 0.08, 0.08, 0, 1.2, 0, 0x6a4a22);
    } else if (!isCoach) part(0.34, 0.12, 0.3, 0, 1.58, -0.02, isFake ? 0x0a0a0a : 0x3a2414);
    for (const side of [-1, 1]) {
      const eye = new Mesh(new SphereGeometry(0.025, 5, 5), basic(isFake ? 0xff2020 : 0x111111));
      eye.position.set(side * 0.06, 1.5, 0.14);
      group.add(eye);
    }
  }
  group.position.set(x, y, z);
  group.rotation.y = facing;
  world.group.add(group);
  if (kind !== 'cinder') world.circles.push([x, z, 0.55]);

  const npc = { group, name, kind, baseY: y, lookAtPlayer };
  world.npcs.push(npc);
  world.interacts.push({
    x, y: y + 1.2, z, radius: 3,
    label: () => t('talk') + ' ' + name,
    action: () => { game.reach = 1; npc.lookAtPlayer = true; say(lines()); }
  });
  return npc;
}

// Floating key. Decoys use red.
function createKey({ x, y, z, beam }, color = 0xffd24a) {
  const group = new Group();
  const gold = basic(color);
  const ring = new Mesh(new TorusGeometry(0.22, 0.07, 6, 12), gold);
  ring.position.y = 0.45;
  group.add(ring);
  const shaft = new Mesh(new BoxGeometry(0.09, 0.7, 0.09), gold);
  shaft.position.y = -0.05;
  group.add(shaft);
  for (const [w, y2] of [[0.15, -0.25], [0.12, -0.4]]) {
    const tooth = new Mesh(new BoxGeometry(w, 0.09, 0.09), gold);
    tooth.position.set(w / 2 + 0.045, y2, 0);
    group.add(tooth);
  }
  group.add(glowSprite(color, 3, 0, 0.2, 0));
  if (beam) {
    const light = new Mesh(new CylinderGeometry(0.25, 0.25, 200, 8, 1, true),
      basic(color, { transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, side: 2 }));
    light.position.y = 100;
    group.add(light);
  }
  group.scale.setScalar(1.3);
  group.position.set(x, y, z);
  world.group.add(group);
  return { group, x, y, z };
}