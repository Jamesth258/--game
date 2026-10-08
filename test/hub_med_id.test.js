/* 回归测试：主页打坐形象 id 解析守卫（防「主页黑屏」）
 * 运行：node test/hub_med_id.test.js
 *
 * 背景（真实事故 2026-10-08）：hub.js 曾用 player.selectedAvatar 直接拼打坐视频路径。
 * 但头像池 AVATAR_DB 有 21 项（6 主角 + 10 敌人 + 5 BOSS），只有 6 主角有 _med_h.mp4/webp，
 * 其余 15 项文件缺失 → 视频与 poster 双双 404 → 视频层无帧即透明 → 露出 #hub-screen 黑底
 * (#0a0a0c) → 玩家看到「主页背景全黑」。
 * 本测试枚举全部 21 个头像，断言解析出的视频文件在磁盘上真实存在 —— 此类黑屏不可再犯。
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const NL = String.fromCharCode(10);
const ROOT = path.join(__dirname, '..');
const FILES = [
  'config.js', 'cultivation.js', 'js/core.js', 'js/equip_db.js', 'js/player.js', 'js/skills-data.js',
  'js/story-data.js', 'js/battle.js', 'js/hub.js', 'js/avatars.js', 'js/create.js', 'js/story.js',
  'js/worldboss.js', 'js/codex.js', 'js/main.js',
];

// ---- DOM 桩：hub-char-video 需能记录 src/poster，并支持 addEventListener 以便模拟 error ----
const ctxStub = new Proxy({}, { get: () => () => {}, set: () => true });
const elements = {};
function makeEl(id) {
  return {
    id, _attrs: {}, style: {}, innerHTML: '', textContent: '', hidden: false,
    src: '', poster: '', dataset: {}, _h: {},
    classList: { add() {}, remove() {}, contains() { return false; } },
    setAttribute(k, v) { this._attrs[k] = v; if (k === 'hidden') this.hidden = true; },
    removeAttribute(k) { delete this._attrs[k]; if (k === 'hidden') this.hidden = false; },
    getAttribute(k) { return this._attrs[k]; },
    addEventListener(t, fn) { (this._h[t] = this._h[t] || []).push(fn); },
    removeEventListener() {}, appendChild() {},
    querySelectorAll() { return []; }, querySelector() { return null; },
    load() {}, play() { return Promise.resolve(); },
    getContext() { return ctxStub; },
    getBoundingClientRect() { return { left: 0, top: 0, width: 640, height: 360 }; },
    width: 640, height: 360, naturalWidth: 0, complete: false, onerror: null,
  };
}
function getEl(id) { return elements[id] || (elements[id] = makeEl(id)); }

const localStore = {};
const sandbox = {
  console, Math, Date, JSON, Array, Object, String, Number, Boolean, Promise,
  parseInt, parseFloat, isNaN, isFinite,
  setTimeout: () => 0, clearTimeout: () => {},
  setInterval: () => 0, clearInterval: () => {},
  requestAnimationFrame: () => 0,
  Image: class { constructor() { this.onerror = null; this.complete = false; this.naturalWidth = 0; } set src(v) { this._src = v; } get src() { return this._src; } },
  localStorage: {
    getItem: k => (k in localStore ? localStore[k] : null),
    setItem: (k, v) => { localStore[k] = String(v); },
    removeItem: k => { delete localStore[k]; },
  },
  document: { getElementById: getEl, createElement: () => makeEl('dyn'), querySelectorAll: () => [], querySelector: () => null, body: makeEl('body'), documentElement: makeEl('html'), addEventListener() {} },
  window: { addEventListener() {} },
};
sandbox.globalThis = sandbox;
vm.createContext(sandbox);

let code = '';
for (const f of FILES) {
  code += NL + ';// ===== ' + f + ' =====' + NL + fs.readFileSync(path.join(ROOT, f), 'utf8');
}

// 追加测试代码（与游戏脚本同一词法作用域）。用数组 join 拼装，避免模板字符串。
const APPEND = [
  '',
  ';(function(){',
  '  const results = [];',
  "  function assert(name, cond){ results.push((cond ? 'PASS' : 'FAIL') + ' | ' + name); }",
  '  const out = {};',
  '  try {',
  '    if (!window.HUB) initHub();',
  "    assert('initHub 后 window.HUB 存在', !!window.HUB);",
  "    const cv = document.getElementById('hub-char-video');",
  "    assert('hub-char-video 元素可取到', !!cv);",
  "    player.avatarId = 'm2';",
  "    player.selectedAvatar = 'm2';",
  '    const ids = (window.AVATAR_DB || []).map(function(a){ return a.id; });',
  '    out.avatarCount = ids.length;',
  '    const resolved = {};',
  '    ids.forEach(function(id){',
  '      player.selectedAvatar = id;',
  "      cv.dataset.src = '';",
  '      cv._medFellBack = false;',
  '      window.HUB.refresh();',
  '      resolved[id] = cv.src;',
  '    });',
  '    out.resolved = resolved;',
  "    player.selectedAvatar = 'f3';",
  "    cv.dataset.src = ''; cv._medFellBack = false;",
  '    window.HUB.refresh();',
  '    out.pickF3 = cv.src;',
  "    player.selectedAvatar = 'boss_3';",
  "    cv.dataset.src = ''; cv._medFellBack = false;",
  '    window.HUB.refresh();',
  '    out.pickBoss = cv.src;',
  "    player.avatarId = 'weird_id';",
  "    player.selectedAvatar = 'enemy_v9';",
  "    cv.dataset.src = ''; cv._medFellBack = false;",
  '    window.HUB.refresh();',
  '    out.pickFallbackM2 = cv.src;',
  "    player.avatarId = 'm2';",
  "    player.unlockedAvatars = ['m2', 'f1'];",
  '    let cnt = 0;',
  '    const orig = window.HUB.refresh;',
  '    window.HUB.refresh = function(){ cnt++; };',
  "    selectAvatar('f1');",
  '    window.HUB.refresh = orig;',
  '    out.selectCallsRefresh = cnt;',
  '    out.selected = player.selectedAvatar;',
  "    cv.dataset.src = ''; cv._medFellBack = false;",
  '    window.HUB.refresh();',
  "    cv.dataset.src = 'assets/select/boss_1_med_h.mp4?v=23';",
  "    cv.src = 'assets/select/boss_1_med_h.mp4?v=23';",
  '    (cv._h.error || []).forEach(function(fn){ fn(); });',
  '    out.errFallback = cv.src;',
  '    out.errPoster = cv.poster;',
  "    results.push('INFO | 头像总数=' + ids.length + ' | selectAvatar 触发 HUB.refresh 次数=' + out.selectCallsRefresh);",
  '  } catch (e) {',
  "    results.push('ERROR | ' + (e && e.stack ? e.stack : e));",
  '  }',
  '  window.__TEST = results.join(String.fromCharCode(10));',
  '  window.__OUT = out;',
  '})();',
  '',
].join(NL);
code += NL + APPEND;

sandbox.__CODE = code;
vm.runInContext(code, sandbox, { filename: 'concat_hub_med.js' });

// ---- 外层校验（可访问真实磁盘）----
const lines = [];
function chk(name, cond) { lines.push((cond ? 'PASS' : 'FAIL') + ' | ' + name); }

const out = sandbox.window.__OUT || {};
const rawLog = sandbox.window.__TEST || '';
const strip = s => String(s || '').split('?')[0];
const exists = p => fs.existsSync(path.join(ROOT, p));

['m1', 'm2', 'm3', 'f1', 'f2', 'f3'].forEach(id => {
  chk('主角 ' + id + ' 打坐视频存在', exists('assets/select/' + id + '_med_h.mp4'));
  chk('主角 ' + id + ' 打坐海报存在', exists('assets/select/' + id + '_med_h.webp'));
});

const resolved = out.resolved || {};
const keys = Object.keys(resolved);
chk('枚举头像数=21（AVATAR_DB 全量）', keys.length === 21);
const bad = [];
keys.forEach(id => {
  const p1 = strip(resolved[id]);
  if (!exists(p1)) bad.push(id + ' -> ' + p1);
});
chk('全部头像解析出的视频文件均真实存在' + (bad.length ? ' [缺失: ' + bad.join(', ') + ']' : ''), bad.length === 0);

chk('选中主角 f3 -> 放 f3 视频', strip(out.pickF3) === 'assets/select/f3_med_h.mp4');
chk('选中 BOSS boss_3 -> 回退玩家本体 m2 视频', strip(out.pickBoss) === 'assets/select/m2_med_h.mp4');
chk('avatarId 非法 -> 兜底 m2 视频', strip(out.pickFallbackM2) === 'assets/select/m2_med_h.mp4');
chk('selectAvatar 会调用 HUB.refresh（计数=1）', out.selectCallsRefresh === 1);
chk('selectAvatar 写入 selectedAvatar=f1', out.selected === 'f1');
chk('video error 兜底后 src 为 m2 视频', strip(out.errFallback) === 'assets/select/m2_med_h.mp4');
chk('video error 兜底后 poster 为 m2 webp', strip(out.errPoster) === 'assets/select/m2_med_h.webp');

const all = rawLog.split(String.fromCharCode(10)).filter(Boolean).concat(lines);
console.log(all.join(String.fromCharCode(10)));
const failed = all.filter(l => l.indexOf('FAIL') === 0 || l.indexOf('ERROR') === 0);
console.log(String.fromCharCode(10) + '==== ' + (failed.length ? failed.length + ' 项失败' : '全部通过') + ' ====');
process.exit(failed.length ? 1 : 0);
