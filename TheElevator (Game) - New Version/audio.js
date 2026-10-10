'use strict';
/* Sound effects (WebAudio) and text-to-speech. */

const audio = { ctx: null, master: null, noiseBuffer: null };

function startAudio() {
  if (audio.ctx) return;
  try {
    audio.ctx = new AudioContext();
    audio.master = audio.ctx.createGain();
    audio.master.gain.value = settings.volume;
    audio.master.connect(audio.ctx.destination);
  } catch (e) { /* no audio available */ }
}

function tone(freq, duration, type = 'sine', volume = 0.2, endFreq) {
  if (!audio.ctx) return;
  const now = audio.ctx.currentTime;
  const osc = audio.ctx.createOscillator();
  const gain = audio.ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);
  if (endFreq) osc.frequency.exponentialRampToValueAtTime(endFreq, now + duration);
  gain.gain.setValueAtTime(volume, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
  osc.connect(gain);
  gain.connect(audio.master);
  osc.start(now);
  osc.stop(now + duration);
}

function noise(duration, volume = 0.2, cutoff = 2000) {
  if (!audio.ctx) return;
  if (!audio.noiseBuffer) {
    const rate = audio.ctx.sampleRate;
    audio.noiseBuffer = audio.ctx.createBuffer(1, rate, rate);
    const data = audio.noiseBuffer.getChannelData(0);
    for (let i = 0; i < rate; i++) data[i] = Math.random() * 2 - 1;
  }
  const now = audio.ctx.currentTime;
  const source = audio.ctx.createBufferSource();
  const filter = audio.ctx.createBiquadFilter();
  const gain = audio.ctx.createGain();
  source.buffer = audio.noiseBuffer;
  filter.type = 'lowpass';
  filter.frequency.value = cutoff;
  gain.gain.setValueAtTime(volume, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
  source.connect(filter);
  filter.connect(gain);
  gain.connect(audio.master);
  source.start(now);
  source.stop(now + duration);
}

const SPEECH_LANG = { en: 'en-US', fil: 'fil-PH', es: 'es-ES', ja: 'ja-JP' };
const SPEECH_PITCH = { Wraith: 0.1, ELIAS: 0.5, 'Mara?': 0.6, Cinder: 1.6 };
function speak(text, speaker) {
  if (!settings.voice || !window.speechSynthesis) return;
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = SPEECH_LANG[settings.lang];
    u.volume = settings.volume;
    u.pitch = SPEECH_PITCH[speaker] || 1;
    u.rate = speaker === 'Wraith' ? 0.7 : 1;
    speechSynthesis.speak(u);
  } catch (e) { /* ignore */ }
}