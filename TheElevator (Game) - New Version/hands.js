'use strict';
/* First-person hands and the flashlight model. */

const hands = new Group();
camera.add(hands);
hands.visible = false;
let renderOrder = 900;   // hands always draw on top of the world

const handMaterial = (color, emissive) => new THREE.MeshLambertMaterial({ color, emissive, emissiveIntensity: 0.55, fog: false, depthTest: false });
const SKIN = handMaterial(0xd9a67e, 0x4a2a1a), KNUCKLE = handMaterial(0xc4875f, 0x3a1e12), NAIL = handMaterial(0xe8c4ae, 0x442a22);
const SLEEVE = handMaterial(0x2f3a55, 0x10141f), CUFF = handMaterial(0xe8e8e8, 0x303030);
const handPart = (geometry, material) => { const m = new Mesh(geometry, material); m.renderOrder = renderOrder++; return m; };

// Builds sleeve, wrist, palm, four 3-joint fingers and a 2-joint thumb. Joints rotate to make a fist.
function createHand(side) {
  const hand = new Group();
  const place = (mesh, x, y, z) => { mesh.position.set(x, y, z); hand.add(mesh); return mesh; };

  place(handPart(new CylinderGeometry(0.062, 0.078, 0.5, 10), SLEEVE), 0, 0, -0.23).rotation.x = Math.PI / 2;
  place(handPart(new CylinderGeometry(0.07, 0.07, 0.05, 10), CUFF), 0, 0, -0.48).rotation.x = Math.PI / 2;
  place(handPart(new CylinderGeometry(0.034, 0.04, 0.12, 8), SKIN), 0, 0, -0.55).rotation.x = Math.PI / 2;
  place(handPart(new BoxGeometry(0.088, 0.03, 0.1), SKIN), 0, 0, -0.64);
  place(handPart(new SphereGeometry(0.045, 8, 6), SKIN), 0, 0, -0.6).scale.set(1, 0.5, 0.8);

  // x position, then lengths of the three finger segments
  const fingerSpecs = [[-0.033, 0.034, 0.024, 0.019], [-0.011, 0.038, 0.027, 0.02], [0.011, 0.036, 0.026, 0.019], [0.033, 0.03, 0.02, 0.017]];
  const fingers = fingerSpecs.map(([fx, ...lengths]) => {
    const root = new Group();
    root.position.set(fx, 0.002, -0.69);
    hand.add(root);
    let parent = root;
    return lengths.map((length, j) => {
      const radius = 0.0095 - j * 0.0011;
      const segment = new Group();
      parent.add(segment);
      const bone = handPart(new CylinderGeometry(radius, radius * 1.05, length, 6), SKIN);
      bone.rotation.x = Math.PI / 2; bone.position.z = -length / 2;
      segment.add(bone, handPart(new SphereGeometry(radius * 1.2, 6, 5), j ? SKIN : KNUCKLE));
      if (j === 2) {
        const nail = handPart(new BoxGeometry(radius * 1.3, 0.003, length * 0.5), NAIL);
        nail.position.set(0, radius * 0.85, -length * 0.6);
        segment.add(nail);
      }
      const next = new Group();
      next.position.z = -length;
      segment.add(next);
      parent = next;
      return segment;
    });
  });

  const thumbRoot = new Group();
  thumbRoot.position.set(-side * 0.05, -0.004, -0.62);
  thumbRoot.rotation.set(0.1, side * 0.7, 0);
  hand.add(thumbRoot);
  let thumbParent = thumbRoot;
  const thumb = [0.032, 0.026].map((length, j) => {
    const segment = new Group();
    thumbParent.add(segment);
    const bone = handPart(new CylinderGeometry(0.0105 - j * 0.001, 0.011, length, 6), SKIN);
    bone.rotation.x = Math.PI / 2; bone.position.z = -length / 2;
    segment.add(bone, handPart(new SphereGeometry(0.012, 6, 5), KNUCKLE));
    const next = new Group();
    next.position.z = -length;
    segment.add(next);
    thumbParent = next;
    return segment;
  });

  hand.userData = { fingers, thumb };
  hand.position.set(side * 0.24, -0.32, -0.1);
  hand.rotation.set(0.28, -side * 0.12, side * 0.05);
  hands.add(hand);
  return hand;
}

function setGrip(hand, curl) {
  hand.userData.fingers.forEach((segments, i) => {
    const k = curl * (1 + i * 0.05);
    segments[0].rotation.x = -k;
    segments[1].rotation.x = -k * 1.25;
    segments[2].rotation.x = -k * 0.8;
  });
  hand.userData.thumb[0].rotation.x = -curl * 0.35;
  hand.userData.thumb[1].rotation.x = -curl * 0.5;
}

const leftHand = createHand(-1), rightHand = createHand(1);
const flashlightModel = new Group();
{
  const body = handPart(new CylinderGeometry(0.034, 0.04, 0.26, 10), handMaterial(0x44484f, 0x15171a));
  body.rotation.x = Math.PI / 2;
  const lens = handPart(new CylinderGeometry(0.05, 0.034, 0.04, 10), handMaterial(0xfff2a0, 0xfff2a0));
  lens.rotation.x = Math.PI / 2; lens.position.z = -0.15;
  flashlightModel.add(body, lens);
  flashlightModel.position.set(-0.21, -0.2, -0.8);
  hands.add(flashlightModel);
}