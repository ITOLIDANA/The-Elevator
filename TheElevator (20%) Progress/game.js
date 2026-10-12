(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var stage = $('stage'), cv = $('view'), ctx = cv.getContext('2d'), toastEl = $('toast');
  var RW, RH, img, buf, glow, FOV;

  /* canvas resolution follows the window shape so the view always fills the screen without stretching */
  function resize() {
    var w = stage.clientWidth || window.innerWidth, h = stage.clientHeight || window.innerHeight;
    RH = 270;
    RW = Math.max(160, Math.min(720, Math.round(RH * w / Math.max(1, h))));
    cv.width = RW; cv.height = RH;
    img = ctx.createImageData(RW, RH);
    buf = new Uint32Array(img.data.buffer);
    glow = new Float32Array(RW);
    FOV = Math.max(0.3, RW / (RH * 2.7));
  }
  window.addEventListener('resize', resize);
  resize();

  /* world palette: dusk sky, muted olive ground */
  var ZEN = [34, 58, 90], HOR = [228, 198, 170];
  var GA = [94, 106, 90], GB = [87, 99, 84], GL = [158, 172, 144];
  var SUNC = [255, 190, 120], DISC = [255, 240, 205];
  var SUN_A = -0.55, SUN_X = Math.cos(SUN_A), SUN_Y = Math.sin(SUN_A);

  var px = 0, py = 0, ang = 0, pitch = 0, z = 0, vz = 0;
  var bob = 0, bobAmp = 0, phase = 0, jumpReq = false;

  function pack(r, g, b) { return (255 << 24) | (b << 16) | (g << 8) | r; }

  /* ---------- input ---------- */
  var inp = { f: 0, b: 0, l: 0, r: 0, sl: 0, sr: 0, run: 0 };
  var KM = { KeyW: 'f', ArrowUp: 'f', KeyS: 'b', ArrowDown: 'b', KeyA: 'sl', KeyD: 'sr', ArrowLeft: 'l', ArrowRight: 'r', KeyQ: 'l', KeyE: 'r', ShiftLeft: 'run', ShiftRight: 'run' };
  window.addEventListener('keydown', function (e) {
    if (KM[e.code]) { inp[KM[e.code]] = 1; e.preventDefault(); }
    else if (e.code === 'Space') { jumpReq = true; e.preventDefault(); }
    else if (e.code === 'KeyF') {
      try {
        var p = document.fullscreenElement ? document.exitFullscreen() : stage.requestFullscreen();
        if (p && p.catch) p.catch(function () {});
      } catch (err) {}
    }
  });
  window.addEventListener('keyup', function (e) { if (KM[e.code]) inp[KM[e.code]] = 0; });
  window.addEventListener('blur', function () { for (var k in inp) inp[k] = 0; });

  Array.prototype.forEach.call(document.querySelectorAll('.pad button'), function (b) {
    var k = b.getAttribute('data-k');
    var off = function () { inp[k] = 0; };
    b.addEventListener('pointerdown', function (e) { e.preventDefault(); inp[k] = 1; });
    b.addEventListener('pointerup', off);
    b.addEventListener('pointercancel', off);
    b.addEventListener('pointerleave', off);
    b.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  });

  function clampPitch() { if (pitch > 90) pitch = 90; if (pitch < -90) pitch = -90; }
  var drag = null;
  cv.addEventListener('pointerdown', function (e) {
    drag = { x: e.clientX, y: e.clientY };
    try { cv.setPointerCapture(e.pointerId); } catch (err) {}
    if (e.pointerType === 'mouse' && document.pointerLockElement !== cv) {
      try { var p = cv.requestPointerLock(); if (p && p.catch) p.catch(function () {}); } catch (err) {}
    }
  });
  cv.addEventListener('pointermove', function (e) {
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
  function update(dt) {
    ang += ((inp.r ? 1 : 0) - (inp.l ? 1 : 0)) * 2.2 * dt;
    var dirX = Math.cos(ang), dirY = Math.sin(ang);
    var f = (inp.f ? 1 : 0) - (inp.b ? 1 : 0), s = (inp.sr ? 1 : 0) - (inp.sl ? 1 : 0);
    var moving = !!(f || s) && z === 0;
    if (f || s) {
      var sp = (inp.run ? 8 : 4) * dt / Math.hypot(f, s);
      px += (dirX * f - dirY * s) * sp;
      py += (dirY * f + dirX * s) * sp;
      if (z === 0) phase += dt * (inp.run ? 13 : 9);
    }
    if (jumpReq && z === 0) vz = 2.6;
    jumpReq = false;
    if (z > 0 || vz > 0) {
      vz -= 7 * dt; z += vz * dt;
      if (z <= 0) { z = 0; vz = 0; }
    }
    bobAmp += ((moving ? 1 : 0) - bobAmp) * Math.min(1, dt * 8);
    bob = Math.sin(phase) * bobAmp * 2.5;
  }

  /* ---------- rendering ---------- */
  function render() {
    var dirX = Math.cos(ang), dirY = Math.sin(ang), plX = -dirY * FOV, plY = dirX * FOV;
    var h = Math.round(RH / 2 + pitch + bob);
    var camH = RH * (0.5 + z);
    var x, y;

    for (x = 0; x < RW; x++) {
      var camX = 2 * x / RW - 1, rx = dirX + plX * camX, ry = dirY + plY * camX;
      var dot = (rx * SUN_X + ry * SUN_Y) / Math.hypot(rx, ry);
      glow[x] = dot > 0 ? Math.pow(dot, 18) : 0;
    }
    var sty = dirX * SUN_X + dirY * SUN_Y, stx = (dirX * SUN_Y - dirY * SUN_X) / FOV;
    var sunVis = sty > 0.05, sunX = sunVis ? RW / 2 * (1 + stx / sty) : -999, sunY = h - 30, SR = 12, SR2 = SR * SR;

    /* sky */
    var skyEnd = Math.min(h, RH);
    for (y = 0; y < skyEnd; y++) {
      var t = (h - y) / (RH * 0.95);
      if (t < 0) t = 0; if (t > 1) t = 1;
      var tp = Math.pow(t, 0.55), rowGlow = Math.exp(-(h - y) / (RH * 0.2)) * 0.6;
      var br = HOR[0] + (ZEN[0] - HOR[0]) * tp, bg = HOR[1] + (ZEN[1] - HOR[1]) * tp, bb = HOR[2] + (ZEN[2] - HOR[2]) * tp;
      var o = y * RW, dy = y - sunY;
      for (x = 0; x < RW; x++) {
        var g = glow[x] * rowGlow;
        var r = br + SUNC[0] * g * 0.5, gg = bg + SUNC[1] * g * 0.5, b = bb + SUNC[2] * g * 0.5;
        if (sunVis) {
          var dx = x - sunX, d2 = dx * dx + dy * dy;
          if (d2 < SR2) {
            var a = (SR2 - d2) / (SR2 * 0.35); if (a > 1) a = 1;
            r += (DISC[0] - r) * a; gg += (DISC[1] - gg) * a; b += (DISC[2] - b) * a;
          }
        }
        buf[o + x] = pack(r > 255 ? 255 : r, gg > 255 ? 255 : gg, b > 255 ? 255 : b);
      }
    }

    /* ground */
    for (y = Math.max(h + 1, 0); y < RH; y++) {
      var rd = camH / (y - h);
      var fog = 1 - Math.exp(-rd / 45), inv = 1 - fog;
      var w = 0.018 + rd * 0.0022, w8 = w / 8 * 1.7;
      var stepX = rd * 2 * plX / RW, stepY = rd * 2 * plY / RW;
      var fx = px + rd * (dirX - plX), fy = py + rd * (dirY - plY);
      var oo = y * RW;
      for (x = 0; x < RW; x++) {
        fx += stepX; fy += stepY;
        var cx = Math.floor(fx), cy = Math.floor(fy);
        var base = ((cx + cy) & 1) === 0 ? GA : GB;
        var cr = base[0], cg = base[1], cb = base[2];
        var ax = fx - cx, ay = fy - cy;
        var m = Math.min(ax, 1 - ax, ay, 1 - ay);
        var la = m < w ? (1 - m / w) * 0.4 * inv : 0;
        var fx8 = fx / 8, fy8 = fy / 8;
        var ax8 = fx8 - Math.floor(fx8), ay8 = fy8 - Math.floor(fy8);
        var m8 = Math.min(ax8, 1 - ax8, ay8, 1 - ay8);
        if (m8 < w8) { var l8 = (1 - m8 / w8) * 0.75 * inv; if (l8 > la) la = l8; }
        if (la > 0) { cr += (GL[0] - cr) * la; cg += (GL[1] - cg) * la; cb += (GL[2] - cb) * la; }
        cr += (HOR[0] - cr) * fog; cg += (HOR[1] - cg) * fog; cb += (HOR[2] - cb) * fog;
        buf[oo + x] = pack(cr, cg, cb);
      }
    }
    ctx.putImageData(img, 0, 0);
  }

  /* ---------- loop ---------- */
  var last = 0;
  function frame(ts) {
    var dt = Math.min(0.05, (ts - last) / 1000 || 0.016);
    last = ts;
    update(dt);
    render();
    requestAnimationFrame(frame);
  }
  setTimeout(function () { toastEl.classList.add('off'); }, 8000);
  requestAnimationFrame(frame);
})();