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

// 切换战斗背景：剧情/世界BOSS 按场景名加载 assets/bg/<name>.png
function loadBattleBg(name) {
  const src = name ? 'assets/bg/' + name + '.png?v=1' : 'assets/bg_battle.png';
  // 若已有同名缓存且加载成功则复用，否则新建 Image（必须新建，否则旧图 still ready 会残留）
  if (art.bg && art.bg._bgName === name && ready(art.bg)) return;
  art.bg = loadImg(src);
  art.bg._bgName = name;
}

// ---- 全局弹窗（离线/在线通用，避免依赖 online.js）----
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
const _modal = document.getElementById('modal');
const _modalBox = document.getElementById('modal-box');
function openModal(html) { _modalBox.innerHTML = html; _modal.hidden = false; }
function closeModal() { _modal.hidden = true; _modalBox.innerHTML = ''; }
_modal.addEventListener('click', e => { if (e.target === _modal) closeModal(); });

// 统一返回主页：关弹窗 + 强制显示主页 + 清掉残留战斗态 + 重置状态机
// 解决世界BOSS「开打前 HUB.hide()，结算后只 closeModal 不恢复主页」导致的卡死
function returnToHub() {
  closeModal();
  document.body.classList.remove('battle-mode');
  if (typeof battle !== 'undefined' && battle) battle = null; // 世界BOSS 从战斗弹窗返回时 battle 仍指向旧场
  state = 'hub';
  if (window.HUB) { window.HUB.refresh(); window.HUB.show(); }
}
window.returnToHub = returnToHub;

// 轻提示（toast）：用于在线奖励达成等即时反馈，2.6 秒后自动消失
function showToast(msg) {
  try {
    const el = document.createElement('div');
    el.textContent = msg;
    el.style.cssText = 'position:fixed;left:50%;bottom:80px;transform:translateX(-50%);z-index:9998;' +
      'background:rgba(20,18,28,0.92);color:#E8D9A0;border:1px solid rgba(212,168,67,0.5);' +
      'padding:8px 16px;border-radius:10px;font:13px/1.4 sans-serif;max-width:80%;text-align:center;' +
      'box-shadow:0 4px 16px rgba(0,0,0,0.4)';
    (document.body || document.documentElement).appendChild(el);
    setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); }, 2600);
  } catch (e) {}
}
window.showToast = showToast;

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
      learned: player.learned, equippedSkills: player.equippedSkills,
      lastSeen: player.lastSeen,
      equipment: player.equipment, bag: player.bag, gold: player.gold,
      storyCleared: player.storyCleared, storyRewardClaimed: player.storyRewardClaimed,
      storyLevelFirstClear: player.storyLevelFirstClear,
      worldBoss: player.worldBoss,
      daily: player.daily, diamond: player.diamond,
      items: player.items,
      equipCollected: player.equipCollected,
      codexReward: player.codexReward,
      skillPity: player.skillPity,
    }));
  } catch (e) {}
}
