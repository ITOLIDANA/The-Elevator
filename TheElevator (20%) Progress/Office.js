(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var stage = $('stage'), cv = $('view'), ctx = cv.getContext('2d');
  var toastEl = $('toast'), fadeEl = $('fade'), endEl = $('end'), endBtn = $('endBtn');
  var promptEl = $('prompt'), dialogEl = $('dialog'), dialogWho = $('dialogWho'), dialogText = $('dialogText'), dialogNext = $('dialogNext');
  var RW, RH, img, buf, zbuf, FOV;

  /* canvas resolution follows the window shape so the view always fills the screen without stretching */
  function resize() {
    var w = stage.clientWidth || window.innerWidth, h = stage.clientHeight || window.innerHeight;
    RH = 270;
    RW = Math.max(160, Math.min(720, Math.round(RH * w / Math.max(1, h))));
    cv.width = RW; cv.height = RH;
    img = ctx.createImageData(RW, RH);
    buf = new Uint32Array(img.data.buffer);
    zbuf = new Float32Array(RW);
    FOV = Math.max(0.3, RW / (RH * 2.7));
  }
  window.addEventListener('resize', resize);
  resize();

  /* ---------- the building ----------
     #  plaster wall with wood wainscot     P  structural pillar
     F  steel door frame (reader / button)  E  elevator door leaf (two tiles, slide apart)
     S  cab side wall   B  cab back wall    .  open floor (lobby and cab) */
  var ROWS = [
    '#########BB#######',
    '########S..S######',
    '########S..S######',
    '########FEEF######',
    '#................#',
    '#................#',
    '#...P........P...#',
    '#................#',
    '#................#',
    '#................#',
    '#...P........P...#',
    '#................#',
    '#................#',
    '##################'
  ];
  var G = ROWS.map(function (r) { return r.split(''); });
  function ch(x, y) { var r = G[y]; return r && r[x] !== undefined ? r[x] : '#'; }

  var START = { x: 10.0, y: 9.6, a: -Math.PI / 2 };
  var CARD_POS = { x: 10.0, y: 11.6 };         /* appears here, far down the carpet, after talking to the guard */
  var NPC_POS = { x: 12.0, y: 4.8 };           /* right side of the elevator */
  var NPC_NAME = 'Marcus · Security';
  var TALK_FIRST = [
    'Morning! You must be headed up to the first floor.',
    'The elevators are badge-locked today, so you need a visitor keycard.',
    'I left one on the carpet by the entrance. Follow the yellow arrow, grab it, then come back to the elevator.'
  ];
  var TALK_WAIT = ['Your keycard is on the carpet by the entrance. Follow the yellow arrow.'];
  var TALK_DONE = ['You are all set. Enjoy the first floor!'];
  var TOUCH = !!(window.matchMedia && window.matchMedia('(hover: none)').matches);
  promptEl.textContent = TOUCH ? 'Tap to talk to Marcus' : 'Press E to talk to Marcus';
  var DOOR_CENTER = { x: 10.0, y: 3.5 };
  var PLANTS = [[1.8, 4.8], [16.2, 4.8], [1.8, 12.2], [16.2, 12.2]];
  var SOFAS = [[2.5, 8.5], [15.5, 8.5]];

  /* ---------- palette ---------- */
  var CREAM = [220, 213, 198], WOOD = [124, 88, 60], RAIL = [152, 114, 80], BASE = [84, 60, 42];
  var STEEL = [176, 182, 190], DARKSTEEL = [62, 66, 72], BRASS = [184, 150, 86];
  var CONC = [206, 201, 190];
  var NAVY = [34, 48, 86], NAVYD = [24, 30, 52], SKIN = [214, 170, 132], YEL = [255, 210, 40];
  var LEAF1 = [42, 108, 58], LEAF2 = [58, 136, 74], LEAF3 = [96, 168, 96], POT = [150, 86, 60], POTRIM = [176, 108, 76];
  var SOFA = [44, 84, 100], SOFAD = [32, 64, 78], SOFAL = [62, 110, 126];
  var ART = [
    [[196, 92, 64], [236, 196, 120]],
    [[54, 98, 136], [196, 214, 226]],
    [[70, 118, 92], [226, 214, 176]]
  ];

  /* ---------- state ---------- */
  var px, py, ang, pitch, bob = 0, bobAmp = 0, phase = 0, nowT = 0;
  var hasCard, npcTalked, state, rideT, rideFaded, rideDinged, sprites, nagT = 0;
  var door = { open: 0, target: 0, pinged: false };
  var dlg = { lines: [], i: 0, shown: 0, len: 0, last: '' };

  function reset() {
    px = START.x; py = START.y; ang = START.a; pitch = 0;
    hasCard = false; npcTalked = false; state = 'play'; rideT = 0; rideFaded = false; rideDinged = false; nagT = 0;
    door.open = 0; door.target = 0; door.pinged = false;
    sprites = [];
    PLANTS.forEach(function (p) { sprites.push({ x: p[0], y: p[1], t: 'plant', r: 0.3 }); });
    SOFAS.forEach(function (p) { sprites.push({ x: p[0], y: p[1], t: 'sofa', r: 0.55 }); });
    sprites.push({ x: NPC_POS.x, y: NPC_POS.y, t: 'npc', r: 0.35 });
    dlg.lines = []; dlg.i = 0; dlg.shown = 0; dlg.len = 0; dlg.last = '';
    promptEl.hidden = true; dialogEl.hidden = true;
    fadeEl.classList.remove('on');
    endEl.hidden = true;
  }

  /* ---------- audio ---------- */
  var AC = null;
  function audio() {
    try {
      if (!AC) AC = new (window.AudioContext || window.webkitAudioContext)();
      if (AC.state === 'suspended') AC.resume();
    } catch (e) { AC = null; }
  }
  function tone(freq, t0, dur, type, vol) {
    if (!AC) return;
    try {
      var o = AC.createOscillator(), g = AC.createGain(), t = AC.currentTime + t0;
      o.type = type || 'sine'; o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(AC.destination);
      o.start(t); o.stop(t + dur + 0.05);
    } catch (e) {}
  }
  function ding() { tone(988, 0, 0.9, 'sine', 0.16); tone(740, 0.35, 1.2, 'sine', 0.16); }
  function appear() { tone(520, 0, 0.15, 'triangle', 0.12); tone(780, 0.12, 0.2, 'triangle', 0.12); tone(1040, 0.24, 0.4, 'triangle', 0.1); }
  function pickup() { tone(660, 0, 0.12, 'triangle', 0.14); tone(990, 0.1, 0.28, 'triangle', 0.14); tone(1320, 0.2, 0.4, 'triangle', 0.1); }

  var toastTimer = 0;
  function toast(msg, ms) {
    toastEl.textContent = msg; toastEl.classList.remove('off');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.add('off'); }, ms || 3000);
  }

  /* ---------- input ---------- */
  var inp = { f: 0, b: 0, l: 0, r: 0, sl: 0, sr: 0, run: 0 };
  var KM = { KeyW: 'f', ArrowUp: 'f', KeyS: 'b', ArrowDown: 'b', KeyA: 'sl', KeyD: 'sr', ArrowLeft: 'l', ArrowRight: 'r', ShiftLeft: 'run', ShiftRight: 'run' };
  window.addEventListener('keydown', function (e) {
    audio();
    if (KM[e.code]) { inp[KM[e.code]] = 1; e.preventDefault(); }
    else if (e.code === 'KeyF') {
      try {
        var p = document.fullscreenElement ? document.exitFullscreen() : stage.requestFullscreen();
        if (p && p.catch) p.catch(function () {});
      } catch (err) {}
    } else if (e.code === 'KeyE' || e.code === 'Enter' || e.code === 'Space') {
      e.preventDefault();
      if (e.repeat) return;
      if (!endEl.hidden) reset(); else interact();
    }
  });
  window.addEventListener('keyup', function (e) { if (KM[e.code]) inp[KM[e.code]] = 0; });
  window.addEventListener('blur', function () { for (var k in inp) inp[k] = 0; });
  endBtn.addEventListener('click', function () { audio(); reset(); });
  promptEl.addEventListener('click', function () { interact(); });
  dialogEl.addEventListener('click', function () { interact(); });

  Array.prototype.forEach.call(document.querySelectorAll('.pad button'), function (b) {
    var k = b.getAttribute('data-k');
    var off = function () { inp[k] = 0; };
    b.addEventListener('pointerdown', function (e) { e.preventDefault(); audio(); inp[k] = 1; });
    b.addEventListener('pointerup', off);
    b.addEventListener('pointercancel', off);
    b.addEventListener('pointerleave', off);
    b.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  });

  function clampPitch() { if (pitch > 90) pitch = 90; if (pitch < -90) pitch = -90; }
  var drag = null;
  cv.addEventListener('pointerdown', function (e) {
    audio();
    drag = { x: e.clientX, y: e.clientY };
    try { cv.setPointerCapture(e.pointerId); } catch (err) {}
    if (e.pointerType === 'mouse' && document.pointerLockElement !== cv) {
      try { var p = cv.requestPointerLock(); if (p && p.catch) p.catch(function () {}); } catch (err) {}
    }
  });
  cv.addEventListener('pointermove', function (e) {
    if (state !== 'play') return;
    if (document.pointerLockElement === cv) { ang += e.movementX * 0.0025; pitch -= e.movementY * 0.35; clampPitch(); }
    else if (drag) {
      ang += (e.clientX - drag.x) * 0.006;
      pitch -= (e.clientY - drag.y) * 0.4; clampPitch();
      drag.x = e.clientX; drag.y = e.clientY;
    }
  });
  cv.addEventListener('pointerup', function () { drag = null; });
  cv.addEventListener('pointercancel', function () { drag = null; });

  /* ---------- simulation ---------- */
  function solidAt(x, y) {
    var c = ch(Math.floor(x), Math.floor(y));
    if (c === '.') return false;
    if (c === 'E') return door.open < 0.85;
    return true;
  }
  function blocked(x, y, r) { return solidAt(x - r, y - r) || solidAt(x + r, y - r) || solidAt(x - r, y + r) || solidAt(x + r, y + r); }

  /* ---------- talking to the guard ---------- */
  function npcDist() { return Math.hypot(px - NPC_POS.x, py - NPC_POS.y); }
  function setPrompt(on) { if (promptEl.hidden === on) promptEl.hidden = !on; }
  function interact() {
    audio();
    if (state === 'talk') advanceDialog();
    else if (state === 'play' && npcDist() < 2.8) startTalk();
  }
  function startTalk() {
    state = 'talk';
    for (var k in inp) inp[k] = 0;
    dlg.lines = !npcTalked ? TALK_FIRST : (hasCard ? TALK_DONE : TALK_WAIT);
    dlg.i = 0; dlg.shown = 0; dlg.last = ''; dlg.len = dlg.lines[0].length;
    dialogWho.textContent = NPC_NAME; dialogText.textContent = ''; dialogNext.textContent = '';
    dialogEl.hidden = false;
    setPrompt(false);
  }
  function advanceDialog() {
    var txt = dlg.lines[dlg.i] || '';
    if (dlg.shown < txt.length) { dlg.shown = txt.length; return; }
    dlg.i++;
    if (dlg.i >= dlg.lines.length) { endTalk(); return; }
    dlg.shown = 0; dlg.last = ''; dlg.len = dlg.lines[dlg.i].length;
  }
  function endTalk() {
    state = 'play';
    dialogEl.hidden = true;
    if (!npcTalked) {
      npcTalked = true; appear();
      toast('A keycard appeared down the lobby by the entrance. Follow the yellow arrow.', 4800);
    }
  }

  function update(dt) {
    if (state === 'play') {
      ang += ((inp.r ? 1 : 0) - (inp.l ? 1 : 0)) * 2.2 * dt;
      var dirX = Math.cos(ang), dirY = Math.sin(ang);
      var f = (inp.f ? 1 : 0) - (inp.b ? 1 : 0), s = (inp.sr ? 1 : 0) - (inp.sl ? 1 : 0);
      var moving = !!(f || s);
      if (moving) {
        var sp = (inp.run ? 6 : 3.4) * dt / Math.hypot(f, s);
        var mx = (dirX * f - dirY * s) * sp, my = (dirY * f + dirX * s) * sp;
        if (!blocked(px + mx, py, 0.22)) px += mx;
        if (!blocked(px, py + my, 0.22)) py += my;
        phase += dt * (inp.run ? 12 : 8.5);
      }
      for (var i = 0; i < sprites.length; i++) {
        var sp2 = sprites[i], dx = px - sp2.x, dy = py - sp2.y, d = Math.hypot(dx, dy), min = sp2.r + 0.22;
        if (d < min && d > 0.0001) { px = sp2.x + dx / d * min; py = sp2.y + dy / d * min; }
      }
      bobAmp += ((moving ? 1 : 0) - bobAmp) * Math.min(1, dt * 8);
      bob = Math.sin(phase) * bobAmp * 2.2;

      if (npcTalked && !hasCard && Math.hypot(px - CARD_POS.x, py - CARD_POS.y) < 0.7) {
        hasCard = true; pickup();
        toast('Keycard acquired. The elevator reader is lit green.', 3600);
      }
      setPrompt(npcDist() < 2.8);
      var dd = Math.hypot(px - DOOR_CENTER.x, py - DOOR_CENTER.y);
      door.target = (hasCard && dd < 3.8) ? 1 : 0;
      if (door.target === 1 && !door.pinged) { door.pinged = true; ding(); }
      if (door.target === 0 && dd > 5) door.pinged = false;
      if (door.open > 0.6 && px >= 9 && px < 11 && py < 2.6) { state = 'ride'; rideT = 0; }
      nagT -= dt;
      if (!hasCard && dd < 1.6 && nagT <= 0) {
        toast(npcTalked ? 'The elevator needs a keycard.' : 'The elevator is locked. Talk to the security guard first.', 2400);
        nagT = 3;
      }
    } else if (state === 'talk') {
      var tb = Math.atan2(NPC_POS.y - py, NPC_POS.x - px);
      var tda = Math.atan2(Math.sin(tb - ang), Math.cos(tb - ang)), tk = Math.min(1, dt * 4);
      ang += tda * tk; pitch -= pitch * tk; bobAmp = 0; bob = 0;
      dlg.shown += dt * 48;
      var txt = dlg.lines[dlg.i] || '', n = Math.min(txt.length, Math.floor(dlg.shown)), cut = txt.slice(0, n);
      if (cut !== dlg.last) { dialogText.textContent = cut; dlg.last = cut; }
      var lastLine = dlg.i >= dlg.lines.length - 1;
      var hint = n >= txt.length ? (lastLine ? (TOUCH ? 'Tap to close' : 'Press E to close') : (TOUCH ? 'Tap to continue' : 'Press E to continue')) : '';
      if (dialogNext.textContent !== hint) dialogNext.textContent = hint;
    } else if (state === 'ride') {
      setPrompt(false);
      rideT += dt;
      var k = Math.min(1, dt * 3);
      px += (10 - px) * k; py += (1.75 - py) * k;
      var da = Math.atan2(Math.sin(Math.PI / 2 - ang), Math.cos(Math.PI / 2 - ang));
      ang += da * k; pitch -= pitch * k; bobAmp = 0; bob = 0;
      door.target = rideT > 1.0 ? 0 : 1;
      if (rideT > 2.4 && !rideFaded) { fadeEl.classList.add('on'); rideFaded = true; }
      if (rideT > 3.2 && !rideDinged) { ding(); rideDinged = true; }
      if (rideT > 4.6) { state = 'end'; endEl.hidden = false; try { endBtn.focus({ preventScroll: true }); } catch (e) {} }
    }
    var dv = door.target - door.open;
    var stepD = dt * 0.75;
    door.open = Math.abs(dv) < stepD ? door.target : door.open + (dv > 0 ? stepD : -stepD);
  }

  /* ---------- floor and ceiling ---------- */
  var O = [0, 0, 0];
  function setO(c, k) { O[0] = c[0] * k; O[1] = c[1] * k; O[2] = c[2] * k; }
  function hsh(n) { var s = Math.sin(n * 127.1) * 43758.5453; return s - Math.floor(s); }

  /* writes the colour into O and returns the minimum brightness (lit areas ignore distance fog) */
  function floorPix(fx, fy, rd) {
    if (fx >= 9 && fx < 11 && fy >= 1 && fy < 3) {
      if (fx < 9.08 || fx >= 10.92 || fy < 1.08 || fy >= 2.92) setO(BRASS, 1);
      else if (((Math.floor(fx * 2) + Math.floor(fy * 2)) & 1) === 0) { O[0] = 72; O[1] = 72; O[2] = 80; }
      else { O[0] = 54; O[1] = 54; O[2] = 62; }
      return 0.9;
    }
    if (fx >= 9 && fx < 11 && fy >= 3.42 && fy < 3.58) { setO(BRASS, 1); return 0.7; }
    var dx = Math.abs(fx - 10);
    if (dx < 1.5 && fy >= 4 && fy < 12.6) {
      if (dx > 1.34) setO([178, 148, 86], 1);
      else if (dx > 1.2) { O[0] = 26; O[1] = 36; O[2] = 66; }
      else if (((Math.floor(fx * 9) + Math.floor(fy * 9)) & 1) === 0) { O[0] = 48; O[1] = 62; O[2] = 102; }
      else { O[0] = 42; O[1] = 56; O[2] = 94; }
      return 0;
    }
    var gx = fx / 2, gy = fy / 2, ix = Math.floor(gx), iy = Math.floor(gy);
    var ax = gx - ix, ay = gy - iy, m = Math.min(ax, 1 - ax, ay, 1 - ay);
    var w = 0.012 + rd * 0.0014;
    if (m < w) { O[0] = 126; O[1] = 120; O[2] = 112; }
    else if (((ix + iy) & 1) === 0) { O[0] = 200; O[1] = 194; O[2] = 184; }
    else { O[0] = 188; O[1] = 182; O[2] = 172; }
    return 0;
  }
  function ceilPix(fx, fy, rd) {
    if (fx >= 9 && fx < 11 && fy >= 1 && fy < 3) {
      if (fx > 9.25 && fx < 10.75 && fy > 1.25 && fy < 2.75) { O[0] = 255; O[1] = 250; O[2] = 236; return 1; }
      O[0] = 178; O[1] = 182; O[2] = 188; return 0.9;
    }
    var gx = fx / 3 - Math.floor(fx / 3), gy = fy / 3 - Math.floor(fy / 3);
    if (gx > 0.2 && gx < 0.8 && gy > 0.3 && gy < 0.7) { O[0] = 255; O[1] = 251; O[2] = 238; return 1; }
    var tx = fx - Math.floor(fx), ty = fy - Math.floor(fy), w = 0.02 + rd * 0.002;
    if (tx < w || ty < w) { O[0] = 168; O[1] = 168; O[2] = 164; }
    else { O[0] = 228; O[1] = 228; O[2] = 223; }
    return 0;
  }

  function pack(r, g, b) { return (255 << 24) | (b << 16) | (g << 8) | r; }
  function rgbs(c, k) { return 'rgb(' + (Math.min(255, c[0] * k) | 0) + ',' + (Math.min(255, c[1] * k) | 0) + ',' + (Math.min(255, c[2] * k) | 0) + ')'; }
  function band(x, top, lh, v0, v1, c, k) { ctx.fillStyle = rgbs(c, k); ctx.fillRect(x, top + lh * v0, 1, lh * (v1 - v0) + 0.6); }

  function drawDisplay(x, top, lh, wx, k) {
    if (wx > 0.18 && wx < 0.82) {
      band(x, top, lh, 0.035, 0.135, [14, 14, 18], Math.max(k, 0.7));
      if (wx > 0.46 && wx < 0.54) band(x, top, lh, 0.06, 0.11, hasCard ? [70, 255, 150] : [255, 80, 60], 1);
    }
  }

  /* one vertical strip of wall, painted base first and details on top */
  function drawWall(x, c, mx, my, side, wx, top, lh, k) {
    var kk, v;
    if (c === '#') {
      band(x, top, lh, 0, 1, CREAM, k);
      band(x, top, lh, 0, 0.035, CREAM, k * 1.06);
      band(x, top, lh, 0.035, 0.05, CREAM, k * 0.86);
      kk = (wx * 4 - Math.floor(wx * 4)) < 0.04 ? k * 0.7 : k;
      band(x, top, lh, 0.625, 1, WOOD, kk);
      band(x, top, lh, 0.6, 0.628, RAIL, k * 1.05);
      band(x, top, lh, 0.94, 1, BASE, k);
      if ((mx * 5 + my * 3) % 7 === 0 && wx > 0.2 && wx < 0.8) {
        band(x, top, lh, 0.17, 0.5, [58, 42, 32], k);
        if (wx > 0.235 && wx < 0.765) {
          var a = ART[(mx + my) % 3];
          band(x, top, lh, 0.2, 0.35, a[0], k);
          band(x, top, lh, 0.35, 0.47, a[1], k);
        }
      }
    } else if (c === 'P') {
      kk = (wx < 0.06 || wx > 0.94) ? k * 0.8 : k * (0.94 + 0.08 * Math.sin(wx * Math.PI));
      band(x, top, lh, 0, 1, CONC, kk);
      band(x, top, lh, 0.6, 0.625, DARKSTEEL, kk);
      band(x, top, lh, 0.93, 1, BASE, kk);
    } else if (c === 'F') {
      kk = k * (0.92 + 0.08 * hsh(Math.floor(wx * 70) + mx));
      band(x, top, lh, 0, 1, DARKSTEEL, kk);
      if (wx < 0.07 || wx > 0.93) band(x, top, lh, 0, 1, BRASS, k);
      if (side === 1 && wx > 0.3 && wx < 0.7) {
        if (mx === 11) {
          band(x, top, lh, 0.4, 0.64, [18, 20, 24], Math.max(k, 0.6));
          band(x, top, lh, 0.45, 0.48, [70, 76, 84], Math.max(k, 0.6));
          if (wx > 0.44 && wx < 0.56) band(x, top, lh, 0.53, 0.58, hasCard ? [70, 255, 150] : [255, 80, 60], 1);
        } else if (mx === 8) {
          band(x, top, lh, 0.42, 0.58, [196, 196, 202], Math.max(k, 0.6));
          if (wx > 0.44 && wx < 0.56) band(x, top, lh, 0.47, 0.53, hasCard ? [255, 205, 90] : [112, 84, 40], 1);
        }
      }
    } else if (c === 'E') {
      kk = k * (0.9 + 0.1 * hsh(Math.floor(wx * 90) + mx * 13)) * (0.94 + 0.1 * Math.sin(wx * Math.PI));
      band(x, top, lh, 0, 1, STEEL, kk);
      band(x, top, lh, 0, 0.04, [122, 126, 132], k);
      band(x, top, lh, 0.5, 0.52, [214, 218, 224], kk);
      band(x, top, lh, 0.95, 1, [112, 116, 122], k);
      v = mx === 9 ? wx > 1 - door.open - 0.02 : wx < door.open + 0.02;
      if (v || (mx === 9 && wx < 0.02) || (mx === 10 && wx > 0.98)) band(x, top, lh, 0, 1, [40, 42, 46], k);
      drawDisplay(x, top, lh, wx, k);
    } else {
      var kc = Math.max(k, c === 'B' ? 0.95 : 0.88);
      band(x, top, lh, 0, 0.56, c === 'B' ? [208, 214, 218] : [176, 180, 184], kc * (0.94 + 0.08 * hsh(Math.floor(wx * 60) + my)));
      kk = (wx * 3 - Math.floor(wx * 3)) < 0.05 ? kc * 0.72 : kc;
      band(x, top, lh, 0.56, 1, WOOD, kk);
      band(x, top, lh, 0.53, 0.57, BRASS, kc);
      band(x, top, lh, 0, 0.04, [120, 124, 130], kc);
    }
  }

  /* ---------- sprites ---------- */
  function spriteCols(left, wpx, ty, fn) {
    var x0 = Math.max(0, Math.floor(left)), x1 = Math.min(RW - 1, Math.floor(left + wpx));
    for (var xx = x0; xx <= x1; xx++) { if (zbuf[xx] > ty) fn(xx, (xx - left) / wpx); }
  }
  function drawPlant(scr, size, ty, h) {
    var wpx = size * 0.46, hpx = size * 0.58, topY = h + size / 2 - hpx, k = Math.max(0.35, 1 - ty / 22);
    spriteCols(scr - wpx / 2, wpx, ty, function (xx, u) {
      var cu = Math.abs(u - 0.5);
      if (cu < 0.46) {
        var vt = 0.06 + 0.68 * Math.pow(cu / 0.46, 1.2) + 0.05 * Math.sin(u * 38);
        ctx.fillStyle = rgbs(Math.sin(u * 27) > 0 ? LEAF1 : LEAF2, k);
        ctx.fillRect(xx, topY + hpx * vt, 1, hpx * (0.82 - vt));
        ctx.fillStyle = rgbs(LEAF3, k);
        ctx.fillRect(xx, topY + hpx * vt, 1, hpx * 0.04);
      }
      if (cu < 0.2) {
        ctx.fillStyle = rgbs(POT, k * (u < 0.42 ? 0.82 : 1));
        ctx.fillRect(xx, topY + hpx * 0.78, 1, hpx * 0.22);
        ctx.fillStyle = rgbs(POTRIM, k);
        ctx.fillRect(xx, topY + hpx * 0.78, 1, hpx * 0.04);
      }
    });
  }
  function drawSofa(scr, size, ty, h) {
    var wpx = size * 0.95, hpx = size * 0.34, topY = h + size / 2 - hpx, k = Math.max(0.35, 1 - ty / 22);
    spriteCols(scr - wpx / 2, wpx, ty, function (xx, u) {
      var arm = u < 0.1 || u > 0.9;
      if (!arm) { ctx.fillStyle = rgbs(SOFAL, k); ctx.fillRect(xx, topY, 1, hpx * 0.5); }
      ctx.fillStyle = rgbs(arm ? SOFAD : SOFA, k);
      ctx.fillRect(xx, topY + hpx * (arm ? 0.3 : 0.48), 1, hpx * (arm ? 0.58 : 0.4));
      if (Math.abs(u - 0.5) < 0.008) { ctx.fillStyle = rgbs(SOFAD, k); ctx.fillRect(xx, topY + hpx * 0.1, 1, hpx * 0.78); }
      if ((u > 0.04 && u < 0.1) || (u > 0.9 && u < 0.96)) { ctx.fillStyle = rgbs(DARKSTEEL, k); ctx.fillRect(xx, topY + hpx * 0.88, 1, hpx * 0.12); }
    });
  }
  function drawNpc(scr, size, ty, h) {
    var wpx = size * 0.36, hpx = size * 0.62, topY = h + size / 2 - hpx + Math.sin(nowT * 2) * hpx * 0.004;
    var k = Math.max(0.38, 1 - ty / 22);
    var talking = state === 'talk' && dlg.shown < dlg.len, mouth = talking && Math.sin(nowT * 16) > 0;
    var armUp = !npcTalked && state === 'play' && npcDist() < 6 && Math.sin(nowT * 7) > -0.2;
    function R(xx, v0, v1, c, kk) { ctx.fillStyle = rgbs(c, kk || k); ctx.fillRect(xx, topY + hpx * v0, 1, hpx * (v1 - v0) + 0.5); }
    spriteCols(scr - wpx / 2, wpx, ty, function (xx, u) {
      if ((u > 0.27 && u < 0.47) || (u > 0.53 && u < 0.73)) { R(xx, 0.6, 0.96, NAVYD); R(xx, 0.96, 1, [20, 20, 24]); }
      if (u > 0.22 && u < 0.78) R(xx, 0.2, 0.62, NAVY, u < 0.3 || u > 0.7 ? k * 0.85 : k);
      if (u > 0.1 && u <= 0.22) { R(xx, 0.22, 0.56, NAVY, k * 0.85); R(xx, 0.56, 0.63, SKIN); }
      if (u >= 0.78 && u < 0.9) {
        if (armUp) { R(xx, 0.08, 0.4, NAVY, k * 0.85); R(xx, 0.01, 0.09, SKIN); }
        else { R(xx, 0.22, 0.56, NAVY, k * 0.85); R(xx, 0.56, 0.63, SKIN); }
      }
      if (u > 0.43 && u < 0.57) R(xx, 0.2, 0.27, [236, 238, 242]);
      if (u > 0.48 && u < 0.52) R(xx, 0.25, 0.46, [120, 30, 40]);
      if (u > 0.3 && u < 0.38) R(xx, 0.33, 0.38, [214, 176, 80]);
      if (u > 0.44 && u < 0.56) R(xx, 0.16, 0.21, SKIN, k * 0.9);
      if (u > 0.36 && u < 0.64) {
        R(xx, 0.03, 0.18, SKIN);
        if ((u > 0.41 && u < 0.46) || (u > 0.54 && u < 0.59)) R(xx, 0.09, 0.115, [30, 24, 22]);
        if (u > 0.455 && u < 0.545) R(xx, mouth ? 0.135 : 0.145, mouth ? 0.165 : 0.152, [120, 52, 48]);
      }
      if (u > 0.32 && u < 0.68) { R(xx, 0, 0.065, NAVY); if (u > 0.47 && u < 0.53) R(xx, 0.012, 0.045, [214, 176, 80]); }
      if (u > 0.3 && u < 0.7) R(xx, 0.06, 0.08, NAVYD);
    });
    if (!npcTalked) {
      var msz = Math.max(size, RH * 0.22), mw = msz * 0.14, mh = msz * 0.22;
      var my2 = topY - msz * 0.05 - mh - (Math.sin(nowT * 4) * 0.5 + 0.5) * msz * 0.04;
      ctx.globalAlpha = 0.22; ctx.fillStyle = rgbs(YEL, 1);
      spriteCols(scr - mw * 1.3, mw * 2.6, ty, function (xx) { ctx.fillRect(xx, my2 - mh * 0.1, 1, mh * 1.2); });
      ctx.globalAlpha = 1;
      spriteCols(scr - mw / 2, mw, ty, function (xx, u) {
        ctx.fillStyle = rgbs(YEL, 1);
        if (u > 0.1 && u < 0.9) ctx.fillRect(xx, my2, 1, mh * 0.62);
        if (u > 0.1 && u < 0.9) ctx.fillRect(xx, my2 + mh * 0.76, 1, mh * 0.24);
      });
    }
  }
  /* yellow chevron on the screen edge when the keycard is outside the view (dir: 1 right, -1 left) */
  function drawEdgeArrow(dir) {
    var xb = dir > 0 ? RW - 22 : 22, i, hh;
    ctx.globalAlpha = 0.75 + 0.25 * Math.sin(nowT * 6);
    ctx.fillStyle = rgbs(YEL, 1);
    for (i = 0; i < 14; i++) { hh = 34 * (1 - i / 14); ctx.fillRect(xb + dir * i, RH / 2 - hh / 2, 1, hh); }
    ctx.globalAlpha = 1;
  }
  /* bouncing yellow arrow above the keycard, pointing down at it */
  function drawArrow(scr, size, ty, h) {
    var asz = Math.max(size, RH * 0.28), ah = asz * 0.34, aw = asz * 0.26;
    var cy = h - Math.sin(nowT * 2.2) * size * 0.03;
    var bounce = (Math.sin(nowT * 4) * 0.5 + 0.5) * asz * 0.06;
    var tipY = cy - size * 0.115 - size * 0.04 - bounce, top = tipY - ah;
    ctx.globalAlpha = 0.22; ctx.fillStyle = rgbs(YEL, 1);
    spriteCols(scr - aw * 0.9, aw * 1.8, ty, function (xx) { ctx.fillRect(xx, top - ah * 0.15, 1, ah * 1.3); });
    ctx.globalAlpha = 1;
    spriteCols(scr - aw / 2, aw, ty, function (xx, u) {
      var du = Math.abs(u - 0.5) * 2, ext = 0.5 + 0.5 * (1 - du);
      ctx.fillStyle = rgbs(du > 0.88 ? [176, 124, 10] : YEL, u < 0.5 ? 1 : 0.84);
      if (du < 0.46) ctx.fillRect(xx, top, 1, ah * 0.52);
      ctx.fillRect(xx, top + ah * 0.5, 1, ah * (ext - 0.5) + 0.5);
    });
  }
  function drawCard(scr, size, ty, h) {
    var spin = Math.cos(nowT * 1.7), cw0 = size * 0.36, ch0 = size * 0.23;
    var cw = Math.max(size * 0.03, Math.abs(spin) * cw0), cy = h - Math.sin(nowT * 2.2) * size * 0.03, left = scr - cw / 2;
    var front = spin > 0, bk = Math.max(0.75, 1 - ty / 22);
    ctx.globalAlpha = 0.2 + 0.07 * Math.sin(nowT * 4);
    ctx.fillStyle = 'rgb(120,220,255)';
    spriteCols(scr - cw * 1.1, cw * 2.2, ty, function (xx) { ctx.fillRect(xx, cy - ch0 * 1.25, 1, ch0 * 2.5); });
    ctx.globalAlpha = 1;
    spriteCols(left, cw, ty, function (xx, u) {
      ctx.fillStyle = rgbs(front ? [238, 242, 246] : [206, 212, 220], bk);
      ctx.fillRect(xx, cy - ch0 / 2, 1, ch0);
      if (front) {
        ctx.fillStyle = rgbs([28, 58, 118], bk); ctx.fillRect(xx, cy - ch0 / 2, 1, ch0 * 0.28);
        if (u > 0.12 && u < 0.3) { ctx.fillStyle = rgbs([232, 190, 92], bk); ctx.fillRect(xx, cy - ch0 * 0.02, 1, ch0 * 0.3); }
        if (u > 0.62 && u < 0.9) { ctx.fillStyle = rgbs([168, 180, 192], bk); ctx.fillRect(xx, cy + ch0 * 0.0, 1, ch0 * 0.4); }
      } else {
        ctx.fillStyle = rgbs([20, 22, 26], bk); ctx.fillRect(xx, cy - ch0 * 0.3, 1, ch0 * 0.22);
      }
      if (u > 0.44 && u < 0.56) { ctx.fillStyle = rgbs([60, 66, 74], bk); ctx.fillRect(xx, cy - ch0 * 0.46, 1, ch0 * 0.1); }
    });
  }

  /* ---------- rendering ---------- */
  function render() {
    var dirX = Math.cos(ang), dirY = Math.sin(ang), plX = -dirY * FOV, plY = dirX * FOV;
    var h = Math.round(RH / 2 + pitch + bob), half = RH * 0.5, x, y;

    var yc = Math.min(h - 1, RH - 1);
    for (y = 0; y <= yc; y++) {
      var rdc = half / (h - y), shc = 1 - rdc / 26; if (shc < 0.3) shc = 0.3;
      var scx = rdc * 2 * plX / RW, scy = rdc * 2 * plY / RW, cfx = px + rdc * (dirX - plX), cfy = py + rdc * (dirY - plY), oc = y * RW;
      for (x = 0; x < RW; x++) {
        cfx += scx; cfy += scy;
        var mbc = ceilPix(cfx, cfy, rdc), sc = mbc > shc ? mbc : shc;
        buf[oc + x] = pack(O[0] * sc, O[1] * sc, O[2] * sc);
      }
    }
    for (y = Math.max(h + 1, 0); y < RH; y++) {
      var rd = half / (y - h), sh = 1 - rd / 26; if (sh < 0.3) sh = 0.3;
      var sx = rd * 2 * plX / RW, sy = rd * 2 * plY / RW, fx = px + rd * (dirX - plX), fy = py + rd * (dirY - plY), of = y * RW;
      for (x = 0; x < RW; x++) {
        fx += sx; fy += sy;
        var mb = floorPix(fx, fy, rd), s = mb > sh ? mb : sh;
        buf[of + x] = pack(O[0] * s, O[1] * s, O[2] * s);
      }
    }
    if (h >= 0 && h < RH) {
      var srcRow = h + 1 < RH ? h + 1 : h - 1;
      if (srcRow >= 0) buf.copyWithin(h * RW, srcRow * RW, srcRow * RW + RW);
    }
    ctx.putImageData(img, 0, 0);

    /* walls */
    for (x = 0; x < RW; x++) {
      var camX = 2 * x / RW - 1, rdx = dirX + plX * camX, rdy = dirY + plY * camX;
      var mx = Math.floor(px), my = Math.floor(py);
      var ddx = rdx === 0 ? 1e30 : Math.abs(1 / rdx), ddy = rdy === 0 ? 1e30 : Math.abs(1 / rdy);
      var stx, sty, sdx, sdy;
      if (rdx < 0) { stx = -1; sdx = (px - mx) * ddx; } else { stx = 1; sdx = (mx + 1 - px) * ddx; }
      if (rdy < 0) { sty = -1; sdy = (py - my) * ddy; } else { sty = 1; sdy = (my + 1 - py) * ddy; }
      var side = 0, hit = '', guard = 0, pd = 0, wallX = 0, lint = null;
      while (!hit && guard++ < 80) {
        if (sdx < sdy) { sdx += ddx; mx += stx; side = 0; } else { sdy += ddy; my += sty; side = 1; }
        var c = ch(mx, my);
        if (c === '.') continue;
        var ppd = side === 0 ? sdx - ddx : sdy - ddy;
        var wx = side === 0 ? py + ppd * rdy : px + ppd * rdx;
        wx -= Math.floor(wx);
        if (c === 'E') {
          var leaf = mx === 9 ? wx < 1 - door.open : wx > door.open;
          if (!leaf) { if (!lint) lint = { pd: ppd, wx: wx }; continue; }
        }
        hit = c; pd = ppd; wallX = wx;
      }
      if (!hit) { zbuf[x] = 99; continue; }
      if (pd < 0.01) pd = 0.01;
      zbuf[x] = pd;
      var lh = RH / pd, top = h - lh / 2;
      var k = Math.max(0.35, 1 - pd / 22) * (side ? 0.86 : 1);
      drawWall(x, hit, mx, my, side, wallX, top, lh, k);
      if (lint) {
        var lh2 = RH / lint.pd, top2 = h - lh2 / 2, k2 = Math.max(0.35, 1 - lint.pd / 22);
        band(x, top2, lh2, 0, 0.15, [64, 68, 74], k2);
        band(x, top2, lh2, 0.14, 0.15, BRASS, k2);
        drawDisplay(x, top2, lh2, lint.wx, k2);
      }
    }

    /* sprites, far to near */
    var list = sprites.slice();
    if (npcTalked && !hasCard) list.push({ x: CARD_POS.x, y: CARD_POS.y, t: 'card' });
    var invDet = -1 / FOV, i, s2;
    for (i = 0; i < list.length; i++) {
      s2 = list[i];
      var rx = s2.x - px, ry = s2.y - py;
      s2.ty = invDet * (-plY * rx + plX * ry);
      s2.tx = invDet * (dirY * rx - dirX * ry);
    }
    list.sort(function (a, b) { return b.ty - a.ty; });
    for (i = 0; i < list.length; i++) {
      s2 = list[i];
      if (s2.t === 'card' && s2.ty < 0.2) { drawEdgeArrow(s2.tx >= 0 ? 1 : -1); continue; }
      if (s2.ty < 0.2) continue;
      var scr = RW / 2 * (1 + s2.tx / s2.ty), size = Math.abs(RH / s2.ty);
      if (s2.t === 'card' && (scr < 0 || scr > RW)) drawEdgeArrow(scr < 0 ? -1 : 1);
      if (s2.t === 'plant') drawPlant(scr, size, s2.ty, h);
      else if (s2.t === 'sofa') drawSofa(scr, size, s2.ty, h);
      else if (s2.t === 'npc') drawNpc(scr, size, s2.ty, h);
      else { drawCard(scr, size, s2.ty, h); drawArrow(scr, size, s2.ty, h); }
    }
  }

  /* ---------- loop ---------- */
  /* any runtime error is shown on screen instead of silently stopping the game */
  var lastErr = '';
  function showError(e) {
    var msg = 'Error: ' + (e && e.message ? e.message : e);
    if (msg === lastErr) return;
    lastErr = msg;
    toastEl.textContent = msg; toastEl.classList.remove('off');
    clearTimeout(toastTimer);
  }
  window.addEventListener('error', function (ev) { showError(ev.error || ev.message); });

  var last = 0;
  function frame(ts) {
    var dt = Math.min(0.05, (ts - last) / 1000 || 0.016);
    last = ts; nowT = ts / 1000;
    try { update(dt); render(); } catch (e) { showError(e); }
    requestAnimationFrame(frame);
  }
  window.__officeLoaded = true;
  reset();
  setTimeout(function () { toastEl.classList.add('off'); }, 9000);
  requestAnimationFrame(frame);
})();