'use strict';
/* Main menu, pause menu, settings panel, starting and ending the game. */

const PANELS = ['panelMain', 'panelControls', 'panelSettings'];
const showPanel = id => PANELS.forEach(p => $(p).hidden = p !== id);

function applyLanguage() {
  document.querySelectorAll('[data-t]').forEach(el => el.textContent = t(el.dataset.t));
  document.documentElement.lang = settings.lang;
  elevator.displayText = '';
  refreshHud();
  if (!$('menu').classList.contains('hide')) openMenu(game.started && !game.won);
}

function openMenu(inGame) {
  game.paused = true;
  for (const k in input) input[k] = false;
  $('menu').classList.remove('hide');
  $('menuTitle').innerHTML = game.won ? t('ettl') : inGame ? t('pttl') : t('ttl');
  $('menuSub').textContent = game.won ? t('esub') : inGame ? t('psub') : t('sub');
  $('btnPlay').textContent = game.won ? t('again') : inGame ? t('resume') : t('play');
  $('btnHome').hidden = !inGame && !game.won;
  showPanel('panelMain');
  if (document.exitPointerLock) document.exitPointerLock();
}

function returnToTitle() {
  game.keys.fill(0);
  game.won = false; game.started = false; game.ride = null;
  dialogue.queue = [];
  $('fade').style.opacity = 0;
  loadFloor(FLOOR.LOBBY);
  openMenu(false);
}

function startGame() {
  startAudio();
  game.won = false; game.started = true; game.paused = false;
  $('menu').classList.add('hide');
  if (game.floor !== FLOOR.LOBBY || game.keys.some(Boolean)) loadFloor(FLOOR.LOBBY);
  game.spawn = { x: 0, y: 0, z: -9, yaw: Math.PI };
  moveTo(game.spawn);
  requestLock();
  showTitleCard(floorLabel(0) + ' - ' + t('n0'), t('lobSub'));
  refreshHud();
  setTimeout(() => say('m1'), 1200);
}

$('btnPlay').onclick = () => {
  if (game.won || !game.started) { if (game.won) returnToTitle(); startGame(); }
  else { startAudio(); game.paused = false; $('menu').classList.add('hide'); requestLock(); }
};
$('btnHome').onclick = returnToTitle;
$('btnControls').onclick = () => showPanel('panelControls');
$('btnSettings').onclick = () => showPanel('panelSettings');
document.querySelectorAll('[data-back]').forEach(b => b.onclick = () => showPanel('panelMain'));

$('selQuality').onchange = e => { settings.quality = e.target.value; saveSetting('el_q', settings.quality); resize(); };
$('selLang').onchange = e => { settings.lang = e.target.value; saveSetting('el_lang', settings.lang); applyLanguage(); };
$('selVoice').onchange = e => {
  settings.voice = e.target.value === '1';
  saveSetting('el_voice', settings.voice ? '1' : '0');
  if (settings.voice) speak(t('m1'), 'Mara');
};
$('rngVolume').oninput = e => { settings.volume = +e.target.value; if (audio.master) audio.master.gain.value = settings.volume; };
$('rngSens').oninput = e => { settings.sensitivity = +e.target.value; };