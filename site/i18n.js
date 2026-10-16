// 給塑膠怪 / Left on Read — language. The page says which one it is (<html lang>):
// / is 中文, /en/ is English. A saved choice sends you to the other one.
const KEY = 'plastic.lang';
export const LANG = document.documentElement.lang === 'en' ? 'en' : 'zh';
export const EN = LANG === 'en';

/** Inline pair: L('今天', 'Today'). */
export const L = (zh, en) => (EN ? en : zh);

const home = () => (EN ? '../' : 'en/');
export function switchLang() {
  try { localStorage.setItem(KEY, EN ? 'zh' : 'en'); } catch { /* private mode */ }
  location.href = home();
}

// Came back after choosing the other language → go there.
try {
  const saved = localStorage.getItem(KEY);
  if (saved && saved !== LANG) location.replace(home());
} catch { /* private mode */ }
