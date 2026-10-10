'use strict';
/* Dialogue system: who says what, subtitle box, typewriter text. */

// Which character says which lines. Text for each key lives in TEXT[lang].
const SPEAKER_LINES = {
  Mara: 'm1 m2 m3 m4',
  ELIAS: 'e_go e_lock e_dead e_win e_f0 e_f1 e_f2 e_f3 e_f4 e_f5',
  Scarecrow: 's1 s2',
  Cinder: 'c1 c2',
  Wraith: 'w1 w2 w3',
  'Mara?': 'fm1 fm2 fm3 fm4',
  Boxy: 'b1 b2',
  you: 'y_k1 y_k2 y_k3 y_k4 y_k5 y_f2 y_f3 y_f4 y_scare y_burn y_splash y_btn'
};
const SPEAKER_COLOR = {
  Mara: '#8fd3ff', ELIAS: '#7dffb0', Scarecrow: '#e0c070', Cinder: '#ff9a50',
  Wraith: '#e8e8e8', 'Mara?': '#ff5a4a', Boxy: '#ffd24a', you: '#ffffff'
};
const speakerOf = {};
for (const [name, keys] of Object.entries(SPEAKER_LINES)) keys.split(' ').forEach(k => speakerOf[k] = name);

const dialogue = { queue: [], current: null, spoken: {} };

function say(key, onlyOnce) {
  const id = key + settings.lang;
  if (onlyOnce && dialogue.spoken[id]) return;
  dialogue.spoken[id] = true;
  dialogue.queue.push(key);
  if (dialogue.queue.length > 3) dialogue.queue.shift();
}

function updateDialogue(dt) {
  const d = dialogue;
  if (!d.current && d.queue.length) {
    const key = d.queue.shift();
    const speaker = speakerOf[key];
    const text = t(key);
    d.current = { age: 0, text, duration: 1.5 + text.length * (settings.lang === 'ja' ? 0.15 : 0.05) };
    $('speaker').textContent = speaker === 'you' ? t('you') : speaker;
    $('speaker').style.color = SPEAKER_COLOR[speaker];
    $('dialogue').style.borderColor = SPEAKER_COLOR[speaker];
    $('dialogue').classList.add('on');
    speak(text, speaker);
  }
  if (d.current) {
    d.current.age += dt;
    $('speech').textContent = d.current.text.slice(0, Math.floor(d.current.age * 45));
    if (d.current.age > d.current.duration) {
      d.current = null;
      $('dialogue').classList.remove('on');
    }
  }
}