/* core.js — Canvas/画布常量 + 素材加载 + 全局弹窗 + 存档
 * 由 index.html 拆分而来。加载顺序见 index.html 底部 <script> 列表，勿随意调整。
 * 注意：顶层 const/let 跨文件可直接引用，但不会挂到 window（详见 PROJECT.md 坑点 8.1）。
 */
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const W = 640, H = 360;
const cmdBar = document.getElementById('cmd');
const buttons = [...cmdBar.querySelectorAll('button')];

// ---- 美术素材接口：优先用 assets 里的图，缺失则画占位图 ----
function loadImg(src) {
  const i = new Image();
  i.src = src;
  i.failed = false;
  i.onerror = () => { i.failed = true; };
  return i;
}
const art = {
  hero:  loadImg('assets/hero.png'),
  enemy: loadImg('assets/enemy.png'),
  bg:    loadImg('assets/bg_battle.png'),
};
function ready(img) { return img.complete && !img.failed && img.naturalWidth > 0; }

// ---- 全局弹窗（离线/在线通用，避免依赖 online.js）----
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
const _modal = document.getElementById('modal');
const _modalBox = document.getElementById('modal-box');
function openModal(html) { _modalBox.innerHTML = html; _modal.hidden = false; }
function closeModal() { _modal.hidden = true; _modalBox.innerHTML = ''; }
_modal.addEventListener('click', e => { if (e.target === _modal) closeModal(); });

// 全局错误兜底：任何运行时错误显示在页面顶部红条，便于排查（正常时不出现）
window.addEventListener('error', e => {
  let bar = document.getElementById('err-bar');
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'err-bar';
    bar.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:9999;background:#c0392b;color:#fff;font:12px/1.5 monospace;padding:8px 12px;white-space:pre-wrap;';
    (document.body || document.documentElement).appendChild(bar);
  }
  bar.textContent = '运行错误: ' + (e.message || e.error) + (e.filename ? (' @ ' + e.filename + ':' + e.lineno) : '');
});

// 统一存档（含 6 属性与已分配点数）
function saveGame() {
  try {
    localStorage.setItem('wuxia_save', JSON.stringify({
      name: player.name, sect: player.sect, avatarId: player.avatarId,
      avatarImg: art.hero.src, xp: player.xp, score: player.score,
      con: player.con, str: player.str, sou: player.sou, spd: player.spd,
      com: player.com, des: player.des, spent: player.spent,
      learned: player.learned, activeSkill: player.activeSkill,
      lastSeen: player.lastSeen,
      equipment: player.equipment, bag: player.bag, gold: player.gold,
    }));
  } catch (e) {}
}
