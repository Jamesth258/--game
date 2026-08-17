/* 无头回归测试：图鉴系统（收集统计 + 每满10个功法/装备奖励1000钻石）
 * 运行：node test/codex.test.js
 * 原理：与 crit_panel.test.js 一致 —— 全部经典脚本拼成单作用域在 vm 执行，DOM 桩捕获 openModal 写出的图鉴 HTML。
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const FILES = [
  'config.js', 'cultivation.js', 'js/core.js', 'js/equip_db.js', 'js/player.js',
  'js/skills-data.js', 'js/story-data.js', 'js/battle.js', 'js/hub.js', 'js/create.js',
  'js/story.js', 'js/worldboss.js', 'js/daily.js', 'js/codex.js', 'js/main.js',
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

let code = '';
for (const f of FILES) {
  code += '\n;// ===== ' + f + ' =====\n' + fs.readFileSync(path.join(ROOT, f), 'utf8');
}

code += `
;(function(){
  const results = [];
  function assert(name, cond){ results.push((cond?'PASS':'FAIL')+' | '+name); }
  try {
    initHub();
    openModal = function(html){ globalThis.__MODAL = html; };

    // 默认初始状态：8 个初始功法、装备收集空、钻石 0、档位 0
    player.learned = DEFAULT_LEARNED.slice();
    player.equipCollected = [];
    player.codexReward = { skill: 0, equip: 0 };
    player.diamond = 0;

    // ===== 1. 图鉴界面渲染 =====
    openCodex();
    const html = globalThis.__MODAL;
    assert('图鉴标题渲染', html.indexOf('图鉴') >= 0);
    assert('功法收集计数(8/130)', html.indexOf('功法收集 ' + player.learned.length + '/130') >= 0);
    assert('装备收集计数(0/94)', html.indexOf('装备收集 0/94') >= 0);
    assert('未收集项显示 ???', html.indexOf('❓ ???') >= 0);
    assert('已收集功法显示真名(玄霜剑诀 at001)', html.indexOf('玄霜剑诀') >= 0);
    assert('未收集功法显示 ??? 而非名字', html.indexOf('???') >= 0);
    assert('里程碑提示「再收集 2 个功法得 1000 钻」', html.indexOf('再收集 2 个功法得 1000 钻') >= 0);

    const startDiamond = player.diamond; // 0

    // ===== 2. 功法满 10 个 → 发 1000 钻 =====
    const newSkills = SKILLS_DB.filter(s => !player.learned.includes(s.id)).slice(0, 2);
    newSkills.forEach(s => player.learned.push(s.id));
    checkCodexReward();
    assert('功法满10 → 钻石 +1000', player.diamond === startDiamond + 1000);
    assert('功法档位 codexReward.skill = 1', player.codexReward.skill === 1);

    // ===== 3. 装备满 10 个 → 发 1000 钻 =====
    player.equipCollected = []; player.codexReward.equip = 0;
    EQUIP_DB.slice(0, 10).forEach(e => recordEquipCollected(makeItemFromDb(e, 0)));
    assert('装备满10 → 钻石 再 +1000', player.diamond === startDiamond + 2000);
    assert('装备档位 codexReward.equip = 1', player.codexReward.equip === 1);

    // ===== 4. 去重：重复记录同一装备不重复发钻/不重复计数 =====
    const lenBefore = player.equipCollected.length;
    const dBefore = player.diamond;
    recordEquipCollected({ entryId: EQUIP_DB[0].id }); // 已收集过
    assert('去重：equipCollected 长度不变', player.equipCollected.length === lenBefore);
    assert('去重：钻石不变', player.diamond === dBefore);

    // ===== 5. 连发多档：一次到 20 装备 → 发 2 档(2000钻) =====
    player.equipCollected = []; player.codexReward.equip = 0;
    EQUIP_DB.slice(0, 20).forEach(e => { if (!player.equipCollected.includes(e.id)) player.equipCollected.push(e.id); });
    checkCodexReward();
    assert('连发2档 → codexReward.equip = 2', player.codexReward.equip === 2);
    assert('连发2档 → 钻石 +2000(仅装备)', player.diamond === dBefore + 2000);

    // ===== 6. 初始 8 功法不误发（新角色不白送钻）=====
    player.learned = DEFAULT_LEARNED.slice();
    player.codexReward = { skill: 0, equip: 0 };
    player.equipCollected = [];
    player.diamond = 0;
    checkCodexReward();
    assert('初始8功法不误发钻石', player.diamond === 0 && player.codexReward.skill === 0);

    // ===== 7. 功法+装备独立计数互不串档 =====
    // 功法再加 2 个到 10 → 发 1000；装备另起 10 个 → 发 1000；两者各自独立
    const d2 = player.diamond; // 0
    SKILLS_DB.filter(s => !player.learned.includes(s.id)).slice(0, 2).forEach(s => player.learned.push(s.id));
    checkCodexReward(); // 功法→10 发1000
    EQUIP_DB.slice(0, 10).forEach(e => recordEquipCollected(makeItemFromDb(e, 0)));
    assert('功法装备独立：合计发 2000', player.diamond === d2 + 2000);
    assert('功法档位=1 装备档位=1', player.codexReward.skill === 1 && player.codexReward.equip === 1);

  } catch (e) {
    results.push('FAIL | 异常: ' + (e && e.stack ? e.stack : e));
  }
  globalThis.__RESULTS = results;
})();
`;

vm.runInContext(code, sandbox, { filename: 'codex-bundle.js' });

const results = sandbox.__RESULTS || [];
let fail = 0;
for (const r of results) { if (r.indexOf('FAIL') === 0) fail++; console.log(r); }
console.log('==== codex: ' + (results.length - fail) + '/' + results.length + ' PASS ====');
process.exit(fail ? 1 : 0);
