'use strict';
/* Core setup: helpers, constants, renderer, scene, lights, resize, film grain. */

const {
  Group, Mesh, BoxGeometry, PlaneGeometry, CylinderGeometry, SphereGeometry, ConeGeometry,
  TorusGeometry, CircleGeometry, IcosahedronGeometry, Sprite, SpriteMaterial, Color,
  Vector2, Vector3, PointLight, Raycaster
} = THREE;

const $ = id => document.getElementById(id);
const rand = (a, b) => a + Math.random() * (b - a);
const pick = list => list[Math.floor(Math.random() * list.length)];
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const lambert = (color, opts) => new THREE.MeshLambertMaterial({ color, ...opts });
const basic = (color, opts) => new THREE.MeshBasicMaterial({ color, ...opts });

const FLOOR = { LOBBY: 0, FIELD: 1, LAVA: 2, HOUSE: 3, FAKE: 4, OBBY: 5 };
const LABELS = ['L', '1', '2', '3', '4', '5'];
const isDarkFloor = f => f === FLOOR.HOUSE || f === FLOOR.FAKE;

/* ---------- 1. Setup: renderer, scene, lights ---------- */
const renderer = new THREE.WebGLRenderer({ canvas: $('c'), antialias: false, powerPreference: 'high-performance' });
renderer.outputEncoding = THREE.sRGBEncoding;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0, 0.01);
const camera = new THREE.PerspectiveCamera(70, 1, 0.05, 300);
scene.add(camera);

const hemiLight = new THREE.HemisphereLight(0xffffff, 0x555555, 1);
const sunLight = new THREE.DirectionalLight(0xffffff, 0);
sunLight.position.set(30, 60, 20);
scene.add(hemiLight, sunLight);

// The flashlight is a spotlight parented to the camera.
const flashlight = new THREE.SpotLight(0xfff2d0, 0, 40, 0.55, 0.5, 1);
const flashlightTarget = new THREE.Object3D();
flashlightTarget.position.set(0, 0, -1);
camera.add(flashlight, flashlightTarget);
flashlight.target = flashlightTarget;

// Render height per quality level (0 = native). A low height + pixelated canvas gives the retro look.
const RENDER_HEIGHT = { q1: 240, q2: 360, q3: 480, q4: 0 };

function resize() {
  const height = RENDER_HEIGHT[settings.quality];
  const scale = height ? height / innerHeight : Math.min(devicePixelRatio || 1, 2);
  renderer.setPixelRatio(1);
  renderer.setSize(Math.max(2, Math.round(innerWidth * scale)), Math.max(2, Math.round(innerHeight * scale)), false);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
}
addEventListener('resize', () => resize());

// Film grain overlay, redrawn ~11 times a second. Fear makes it stronger.
const grainCtx = $('grain').getContext('2d');
const grainImage = grainCtx.createImageData(192, 108);
let lastGrain = 0;
function drawGrain(now, fear) {
  if (now - lastGrain < 90) return;
  lastGrain = now;
  const d = grainImage.data;
  for (let i = 0; i < d.length; i += 4) {
    d[i] = d[i + 1] = d[i + 2] = Math.random() * 255;
    d[i + 3] = 255;
  }
  grainCtx.putImageData(grainImage, 0, 0);
  $('grain').style.opacity = 0.13 + fear * 0.55;
}