/* 无头回归测试：验证「世界BOSS 打完能返回主页」+ 各菜单「返回主页」按钮已接入
 * 运行：node test/return_to_hub.test.js
 * 原理：把所有经典脚本拼成单作用域在 vm 里一次性执行（模拟浏览器多 <script> 共享词法作用域），
 *       全程用 DOM/canvas/localStorage 桩，不依赖真实浏览器。
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const FILES = [
  'config.js', 'cultivation.js', 'js/core.js', 'js/player.js', 'js/skills-data.js',
  'js/story-data.js', 'js/battle.js', 'js/hub.js', 'js/create.js', 'js/story.js',
  'js/worldboss.js', 'js/main.js',
];

// ---- DOM / canvas 桩 ----
const ctxStub = new Proxy({}, { get: () => () => {}, set: () => true });
const elements = {};
function makeEl(id) {
  const el = {
    id, _attrs: {}, style: {}, innerHTML: '', textContent: '', hidden: false,
    src: '', dataset: {}, _errBound: false,
    classList: { add() {}, remove() {}, contains() { return false; } },
    setAttribute(k, v) { this._attrs[k] = v; if (k === 'hidden') this.hidden = true; },
    removeAttribute(k) { delete this._attrs[k]; if (k === 'hidden') this.hidden = false; },
    getAttribute(k) { return this._attrs[k]; },
    addEventListener() {}, removeEventListener() {}, appendChild() {},
    querySelectorAll() { return []; }, querySelector() { return null; },
    load() {}, play() { return Promise.resolve(); },
    getContext() { return ctxStub; },
    getBoundingClientRect() { return { left: 0, top: 0, width: 640, height: 360 }; },
    width: 640, height: 360, naturalWidth: 0, complete: false, onerror: null,
  };
  return el;
}
function getEl(id) { return elements[id] || (elements[id] = makeEl(id)); }

const localStore = {};
const sandbox = {
  console, Math, Date, JSON, Array, Object, String, Number, Boolean, Promise,
  parseInt, parseFloat, isNaN, isFinite,
  setTimeout: () => 0, clearTimeout: () => {},
  setInterval: () => 0, clearInterval: () => {},
  requestAnimationFrame: () => 0,
  Image: class { constructor() { this.onerror = null; this.complete = false; this.naturalWidth = 0; this.failed = false; } set src(v) { this._src = v; } get src() { return this._src; } },
  localStorage: {
    getItem: k => (k in localStore ? localStore[k] : null),
    setItem: (k, v) => { localStore[k] = String(v); },
    removeItem: k => { delete localStore[k]; },
  },
  document: { getElementById: getEl, createElement: () => makeEl('dyn'), querySelectorAll: () => [], body: makeEl('body'), documentElement: makeEl('html'), addEventListener() {} },
  window: { addEventListener() {} },
};
sandbox.globalThis = sandbox;
vm.createContext(sandbox);

// ---- 拼接全部脚本（单次执行 = 共享词法作用域）----
let code = '';
for (const f of FILES) {
  code += '\n;// ===== ' + f + ' =====\n' + fs.readFileSync(path.join(ROOT, f), 'utf8');
}

// ---- 追加测试（同一作用域，可直接读 state/battle/player 等词法变量）----
code += `
;(function(){
  const results = [];
  function assert(name, cond){ results.push((cond?'PASS':'FAIL')+' | '+name); }
  try {
    // 1) 手动初始化主页（无存档走创建流程，HUB 未自动建，这里显式建）
    initHub();
    assert('initHub 后 window.HUB 存在', !!window.HUB);
    assert('初始 state 为 create/hub', state === 'create' || state === 'hub');

    // 2) 列表界面：应包含「返回主页」按钮（onclick=returnToHub）
    openWorldBossScreen();
    assert('世界BOSS列表含 返回主页(returnToHub)', document.getElementById('modal-box').innerHTML.indexOf('returnToHub') !== -1);
    returnToHub();
    assert('从列表 returnToHub 后 主页可见(hidden=false)', document.getElementById('hub-screen').hidden === false);
    assert('从列表 returnToHub 后 state=hub', state === 'hub');

    // 3) 开打世界BOSS：HUB 应被隐藏
    window.__WB_TEST_MINUTES = 11 * 60;      // 11:00 → slot1(10-12) 处于 open
    window.__WB_TEST_DATE = '2026-08-16';
    if (typeof recalcStats === 'function') recalcStats(player);
    startWorldBossBattle(1);
    assert('开打后 HUB 被隐藏(hidden=true)', document.getElementById('hub-screen').hidden === true);
    assert('开打后 battle 存在且为 worldboss', !!battle && battle.mode === 'worldboss');
    assert('开打后 挑战次数+1', player.worldBoss.slots[1].attempts === 1);

    // 4) 模拟战斗结算（击杀）：state=win，但 HUB 仍被隐藏（即修复前的卡死态）
    endWorldBossBattle(true);
    assert('结算后 state=win', state === 'win');
    assert('结算后 结果界面含 返回主页(returnToHub)', document.getElementById('modal-box').innerHTML.indexOf('returnToHub') !== -1);
    assert('结算后 HUB 仍隐藏(修复前此处卡死)', document.getElementById('hub-screen').hidden === true);

    // 5) 关键修复：点「返回主页」后，主页重新可见、state 复位、战斗态清空
    returnToHub();
    assert('返回主页后 主页重新可见(hidden=false)', document.getElementById('hub-screen').hidden === false);
    assert('返回主页后 state=hub', state === 'hub');
    assert('返回主页后 battle 已清空', battle === null);

    // 6) 领奖界面也应含 返回主页（走 locked 分支需改时间，这里直接验证函数存在且按钮串含 returnToHub）
    window.__WB_TEST_MINUTES = 12 * 60;      // 12:00 → slot1 已 ended
    openWorldBossClaim(1);                    // dmg>0 未领 → 发奖并弹领奖框
    assert('领奖界面含 返回主页(returnToHub)', document.getElementById('modal-box').innerHTML.indexOf('returnToHub') !== -1);
    returnToHub();
    assert('领奖后 返回主页 主页可见', document.getElementById('hub-screen').hidden === false);

    // 7) 静态校验：hub 各菜单(属性/功法/装备/背包/商店/排行榜/开发中)与世界BOSS/副本按钮均已接入 返回主页
    const n = (__CODE.split('onclick="returnToHub()"').length - 1);
    assert('各菜单按钮已接入 返回主页(returnToHub)，计数>=10 (实际=' + n + ')', n >= 10);
  } catch (e) {
    results.push('ERROR | ' + (e && e.stack ? e.stack : e));
  }
  window.__TEST = results.join('\\n');
})();
`;

sandbox.__CODE = code;
vm.runInContext(code, sandbox, { filename: 'concat.js' });

const out = sandbox.window.__TEST || '(no output)';
console.log(out);
const failed = out.split('\n').filter(l => l.startsWith('FAIL') || l.startsWith('ERROR'));
console.log('\n==== ' + (failed.length ? failed.length + ' 项失败' : '全部通过') + ' ====');
process.exit(failed.length ? 1 : 0);
