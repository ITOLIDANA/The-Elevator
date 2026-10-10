'use strict';
/* Small canvas-drawn textures (nearest filtered for the retro look). */

function makeTexture(w, h, draw, { repeat = 0, smooth = false } = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  draw(canvas.getContext('2d'), w, h);
  const tex = new THREE.CanvasTexture(canvas);
  tex.encoding = THREE.sRGBEncoding;
  if (!smooth) { tex.magFilter = tex.minFilter = THREE.NearestFilter; tex.generateMipmaps = false; }
  if (repeat) { tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(repeat, repeat); }
  return tex;
}

function speckle(ctx, w, h, base, colors, count, size) {
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < count; i++) {
    ctx.fillStyle = colors[i % colors.length];
    ctx.fillRect(Math.random() * w, Math.random() * h, size, size);
  }
}

function makeLabel(text, w, h, color, background, font) {
  return makeTexture(512, Math.round(512 * h / w), (ctx, cw, ch) => {
    if (background) { ctx.fillStyle = background; ctx.fillRect(0, 0, cw, ch); }
    ctx.fillStyle = color;
    ctx.font = font || 'bold 64px Cinzel, Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, cw / 2, ch / 2);
  }, { smooth: true });
}

function makeClock(bad) {
  return makeTexture(128, 128, ctx => {
    ctx.fillStyle = bad ? '#2a0a0a' : '#f3efe4';
    ctx.beginPath(); ctx.arc(64, 64, 60, 0, 7); ctx.fill();
    ctx.strokeStyle = bad ? '#a01010' : '#222';
    ctx.lineWidth = 4; ctx.stroke();
    const hand = (angle, length, width) => {
      ctx.lineWidth = width;
      ctx.beginPath(); ctx.moveTo(64, 64);
      ctx.lineTo(64 + Math.cos(angle) * length, 64 + Math.sin(angle) * length);
      ctx.stroke();
    };
    hand(bad ? 3.9 : -1.2, 30, 5);
    hand(bad ? 0.4 : 1.1, 46, 3);
  }, { smooth: true });
}

const TEX = {
  grass: makeTexture(64, 64, (c, w, h) => speckle(c, w, h, '#3f8f3a', ['#4aa044', '#357f33', '#58b04c', '#2f7a30'], 400, 2), { repeat: 140 }),
  deadGrass: makeTexture(64, 64, (c, w, h) => speckle(c, w, h, '#262d1c', ['#2f3822', '#1d2316', '#3a3a28'], 400, 2), { repeat: 90 }),
  carpet: makeTexture(64, 64, (c, w, h) => speckle(c, w, h, '#46566e', ['#4e5f78', '#3f4e66'], 250, 2), { repeat: 14 }),
  wood: makeTexture(64, 64, c => { for (let i = 0; i < 8; i++) { c.fillStyle = i % 2 ? '#573a29' : '#3f281b'; c.fillRect(0, i * 8, 64, 7); } }, { repeat: 10 }),
  wallpaper: makeTexture(64, 64, (c, w, h) => {
    c.fillStyle = '#3a1f24'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 8; i++) { c.fillStyle = '#4a2a30'; c.fillRect(i * 8, 0, 4, h); }
    for (let i = 0; i < 10; i++) { c.fillStyle = '#00000030'; c.fillRect(Math.random() * w, Math.random() * h, rand(2, 10), rand(5, 20)); }
  }),
  water: makeTexture(64, 64, (c, w, h) => {
    c.fillStyle = '#2b7fd9'; c.fillRect(0, 0, w, h);
    c.strokeStyle = '#ffffff50'; c.lineWidth = 2;
    for (let i = 0; i < 8; i++) { c.beginPath(); c.moveTo(0, i * 8); for (let k = 0; k <= 8; k++) c.lineTo(k * 8, i * 8 + Math.sin(k + i) * 3); c.stroke(); }
  }, { repeat: 70 }),
  lava: makeTexture(64, 64, (c, w, h) => speckle(c, w, h, '#d8400a', ['#ff7a1a', '#ffb030', '#a02a05', '#ff5a10'], 500, 3), { repeat: 16 }),
  glow: makeTexture(64, 64, c => {
    const g = c.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, '#fff'); g.addColorStop(0.3, '#ffffff80'); g.addColorStop(1, '#0000');
    c.fillStyle = g; c.fillRect(0, 0, 64, 64);
  }, { smooth: true }),
  tiles: makeTexture(128, 128, c => {
    for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { c.fillStyle = (i + j) % 2 ? '#26262c' : '#ebe4d2'; c.fillRect(i * 16, j * 16, 16, 16); }
    c.strokeStyle = '#d9b25f'; c.lineWidth = 4; c.strokeRect(2, 2, 124, 124);
  }),
  deco: makeTexture(256, 256, c => {
    c.fillStyle = '#3b2416'; c.fillRect(0, 0, 256, 256);
    c.strokeStyle = '#d9b25f'; c.lineWidth = 3; c.strokeRect(12, 12, 232, 232);
    c.lineWidth = 1; c.strokeRect(18, 18, 220, 220);
    for (let k = 1; k <= 7; k++) { c.beginPath(); c.arc(128, 220, k * 17, Math.PI, 2 * Math.PI); c.stroke(); }
    for (let a = 0; a <= 12; a++) { c.beginPath(); c.moveTo(128, 220); c.lineTo(128 + Math.cos(Math.PI + a * Math.PI / 12) * 120, 220 + Math.sin(Math.PI + a * Math.PI / 12) * 120); c.stroke(); }
  }),
  portrait: makeTexture(64, 80, (c, w, h) => {
    c.fillStyle = '#1b1410'; c.fillRect(0, 0, w, h);
    c.strokeStyle = '#8a6a2a'; c.lineWidth = 4; c.strokeRect(2, 2, w - 4, h - 4);
    c.fillStyle = '#2a2a2e'; c.beginPath(); c.ellipse(32, 43, 17, 22, 0, 0, 7); c.fill();
    c.fillStyle = '#0a0a0a'; c.fillRect(20, 60, 24, 18);
    c.fillStyle = '#ffdd66'; [24, 40].forEach(x => { c.beginPath(); c.ellipse(x, 38, 3, 1.5, 0, 0, 7); c.fill(); });
  }),
  screenOk: makeTexture(64, 48, c => {
    c.fillStyle = '#2a5fb0'; c.fillRect(0, 0, 64, 48);
    c.fillStyle = '#ffffffcc'; for (let i = 0; i < 6; i++) c.fillRect(6, 6 + i * 7, 20 + Math.random() * 30, 3);
  }),
  screenBad: makeTexture(64, 48, c => {
    c.fillStyle = '#120000'; c.fillRect(0, 0, 64, 48);
    c.fillStyle = '#ff2222'; c.font = 'bold 14px monospace'; c.fillText('HELP', 8, 20); c.fillText('ME', 20, 38);
  }),
  // Face of the Hollow. The sphere's front sits at u = 0.25, so the face is drawn at x = 128.
  hollowFace: makeTexture(512, 256, c => {
    c.fillStyle = '#a8a89c'; c.fillRect(0, 0, 512, 256);
    c.fillStyle = '#7a7a70'; for (let i = 0; i < 30; i++) c.fillRect(Math.random() * 512, Math.random() * 256, rand(2, 20), 2);
    c.fillStyle = '#000'; [-34, 34].forEach(o => { c.beginPath(); c.ellipse(128 + o, 100, 24, 34, 0, 0, 7); c.fill(); });
    c.fillStyle = '#ff1010'; [-34, 34].forEach(o => { c.beginPath(); c.arc(128 + o, 108, 5, 0, 7); c.fill(); });
    c.fillStyle = '#000'; c.beginPath(); c.moveTo(80, 170); c.quadraticCurveTo(128, 250, 176, 170); c.quadraticCurveTo(128, 196, 80, 170); c.fill();
    c.fillStyle = '#d8d4c0'; for (let i = -4; i <= 4; i++) c.fillRect(128 + i * 10 - 3, 178 - Math.abs(i), 5, 10);
  })
};