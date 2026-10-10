'use strict';
/* Player settings (saved in localStorage) and text lookup t(). */

const settings = { lang: 'en', voice: false, quality: 'q2', volume: 0.6, sensitivity: 1 };
try {
  settings.lang = localStorage.getItem('el_lang') || 'en';
  settings.voice = localStorage.getItem('el_voice') === '1';
  settings.quality = localStorage.getItem('el_q') || 'q2';
} catch (e) { /* storage may be blocked */ }

function saveSetting(name, value) {
  try { localStorage.setItem(name, value); } catch (e) { /* ignore */ }
}

const t = key => (TEXT[settings.lang] && TEXT[settings.lang][key]) || TEXT.en[key] || key;
const floorLabel = i => i === 0 ? 'L' : settings.lang === 'ja' ? LABELS[i] + '階' : t('fl') + ' ' + LABELS[i];