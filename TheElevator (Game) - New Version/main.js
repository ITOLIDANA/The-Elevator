'use strict';
/* Per-frame update, camera/hands, render loop and startup. Load this one last. */

function update(dt) {
  updateDialogue(dt);
  if (game.ride) updateRide(dt); else movePlayer(dt);

  // Elevator doors slide toward their target
  const e = elevator, diff = e.doorTarget - e.doorOpenAmount;
  e.doorOpenAmount += Math.sign(diff) * Math.min(Math.abs(diff), dt * 1.1);
  const squash = Math.max(0.03, e.doorOpenAmount);
  if (e.leftDoor) { e.leftDoor.scale.x = squash; e.rightDoor.scale.x = squash; }

  updateMonsters(dt);
  for (const npc of world.npcs) {
    const dx = player.x - npc.group.position.x, dz = player.z - npc.group.position.z;
    if (npc.lookAtPlayer && Math.hypot(dx, dz) < 14) npc.group.rotation.y = Math.atan2(dx, dz);
    if (npc.kind === 'cinder') npc.group.position.y = npc.baseY + Math.sin(game.time * 2.5) * 0.15;
  }
  updateKeys(dt);
  if (game.shake > 0) game.shake = Math.max(0, game.shake - dt * 0.6);

  const dark = isDarkFloor(game.floor);
  flashlight.intensity = dark && game.flashlightOn ? 2.3 * (Math.random() < 0.02 ? 0.3 : 1) : 0;
  flashlightModel.visible = dark;

  ambienceTimer -= dt;
  if (ambienceTimer <= 0) ambienceTimer = AMBIENCE[game.floor]();

  updateHover();
  updateElevatorDisplay();
  updateArrow();
}

function updateCameraAndHands(dt, playing) {
  if (!playing) {
    // Title screen: slowly circle the lobby
    hands.visible = false;
    if (game.floor === FLOOR.LOBBY) {
      const a = game.time * 0.13;
      camera.position.set(Math.sin(a) * 8, 2.3, -10 + Math.cos(a) * 7);
      camera.lookAt(0, 1.6, -1);
    }
    return;
  }
  const bob = Math.sin(player.bobPhase * 2) * 0.035 * player.walkAmount;
  const shake = game.shake * 0.1;
  camera.position.set(player.x + (Math.random() - 0.5) * shake, player.y + 1.65 + bob + (Math.random() - 0.5) * shake, player.z);
  camera.rotation.set(player.pitch, player.yaw, 0, 'YXZ');

  // Hands bob when walking, the right hand reaches and grips when interacting
  player.bobPhase += dt * (input.ShiftLeft ? 12 : 8.5) * player.walkAmount;
  game.reach = Math.max(0, game.reach - dt * 2.5);
  const reach = Math.sin(Math.min(1, game.reach) * Math.PI);
  player.grip += ((reach > 0.05 ? 0.9 : 0.25) - player.grip) * Math.min(1, dt * 14);
  player.gripLeft += ((isDarkFloor(game.floor) ? 0.95 : 0.25) - player.gripLeft) * Math.min(1, dt * 8);
  setGrip(rightHand, player.grip);
  setGrip(leftHand, player.gripLeft);
  const phase = player.bobPhase, walk = player.walkAmount;
  rightHand.position.set(0.24, -0.32 + Math.sin(phase) * 0.02 * walk + reach * 0.1, -0.1 - reach * 0.28);
  rightHand.rotation.x = 0.28 + reach * 0.3;
  leftHand.position.set(-0.24, -0.32 + Math.sin(phase + Math.PI) * 0.02 * walk, -0.1 + Math.cos(phase * 2) * 0.012 * walk);
  flashlightModel.position.y = -0.2 + Math.sin(phase + Math.PI) * 0.02 * walk;
  hands.position.y = player.airborne ? 0.04 : 0;
  hands.visible = true;
}

let lastFrame = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - (lastFrame || now)) / 1000);
  lastFrame = now;
  game.time += dt;
  const playing = game.started && !game.paused;

  drawGrain(now, game.fear);
  if (playing || !game.started) world.ticks.forEach(tick => tick(dt));
  if (playing) update(dt);
  updateCameraAndHands(dt, playing);
  renderer.render(scene, camera);
}

/* ---------- Start ---------- */
$('selLang').value = settings.lang;
$('selQuality').value = settings.quality;
$('selVoice').value = settings.voice ? '1' : '0';
resize();
applyLanguage();
loadFloor(FLOOR.LOBBY);
openMenu(false);
requestAnimationFrame(frame);