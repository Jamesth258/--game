/* 无头回归测试：宝箱道具化（背包可存放、手动开启）
 * 运行：node test/chest_item.test.js
 * 原理：复用经典脚本单作用域 vm 执行，DOM 桩捕获 openModal 写出的 HTML。
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

const ctxStub = new Proxy({}, { get: () => () => {}, set: () => true });
const elements = {};
function makeEl(id) {
  return {
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
}
function getEl(id) { return elements[id] || (elements[id] = makeEl(id)); }

const localStore = {};
const sandbox = {
  console, Math, Date, JSON, Array, Object, String, Number, Boolean, Promise,
  parseInt, parseFloat, isNaN, isFinite,
  setTimeout: () => 0, clearTimeout: () => {}, setInterval: () => 0, clearInterval: () => {},
  requestAnimationFrame: () => 0,
  Image: class { constructor() { this.onerror = null; this.complete = false; this.naturalWidth = 0; } set src(v) { this._src = v; } get src() { return this._src; } },
  localStorage: { getItem: k => (k in localStore ? localStore[k] : null), setItem: (k, v) => { localStore[k] = String(v); }, removeItem: k => { delete localStore[k]; } },
  document: { getElementById: getEl, createElement: () => makeEl('dyn'), querySelectorAll: () => [], body: makeEl('body'), documentElement: makeEl('html'), addEventListener() {} },
  window: { addEventListener() {} },
};
sandbox.globalThis = sandbox;
vm.createContext(sandbox);

let code = '';
for (const f of FILES) code += '\n;// ===== ' + f + ' =====\n' + fs.readFileSync(path.join(ROOT, f), 'utf8');

code += `
;(function(){
  const results = [];
  function assert(name, cond){ results.push((cond?'PASS':'FAIL')+' | '+name); }
  try {
    initHub();
    openModal = function(html){ globalThis.__MODAL = html; };
    player.bag = [];
    player.equipCollected = [];
    player.learned = [];
    player.codexReward = { skill: 0, equip: 0 };
    player.diamond = 0;

    // 1. makeChestItem 字段
    const c = makeChestItem('equip', 2);
    assert('makeChestItem: type=chest', c.type === 'chest');
    assert('makeChestItem: chestKind=equip', c.chestKind === 'equip');
    assert('makeChestItem: bias=2', c.bias === 2);
    assert('makeChestItem: 极品后缀', c.name.indexOf('极品') >= 0);
    assert('makeChestItem: uid 唯一', makeChestItem('equip', 0).uid !== c.uid);
    assert('makeChestItem: skill 类', makeChestItem('skill', 0).chestKind === 'skill');

    // 2. openChestItem 装备宝箱 → 装备入 bag + 图鉴解锁，宝箱被移除
    player.bag = [ makeChestItem('equip', 0) ];
    const beforeCol = player.equipCollected.length;
    openChestItem(player.bag[0].uid);
    assert('开装备宝箱：宝箱移除、装备入 bag', player.bag.length === 1 && !!player.bag[0].entryId);
    assert('开装备宝箱：图鉴 equipCollected +1', player.equipCollected.length === beforeCol + 1);

    // 3. openChestItem 功法宝箱 → 功法入 learned
    player.bag = [ makeChestItem('skill', 0) ];
    player.learned = [];
    openChestItem(player.bag[0].uid);
    assert('开功法宝箱：功法入 learned', player.learned.length === 1);
    assert('开功法宝箱：宝箱移除', player.bag.filter(x => x.type === 'chest').length === 0);

    // 4. showBagModal 渲染宝箱区（开启按钮 + 标题）
    player.bag = [ makeChestItem('equip', 0), makeItemFromDb(EQUIP_DB[0], 0) ];
    player.bag[1].uid = 'eq_test_1';
    window.showBagModal();
    const h = globalThis.__MODAL;
    assert('背包含宝箱区标题「宝箱（1）」', h.indexOf('宝箱（1）') >= 0);
    assert('背包含「开启」按钮', h.indexOf('开启') >= 0);
    assert('背包含宝箱名「装备宝箱」', h.indexOf('装备宝箱') >= 0);
    assert('背包含装备区', h.indexOf('背包装备') >= 0);

    // 5. dailyGrant 改为发放宝箱道具（不再即时开奖）
    player.bag = [];
    const d = dailyGrant('equip', 0);
    assert('dailyGrant equip 描述含「装备宝箱」', d.indexOf('装备宝箱') >= 0);
    assert('dailyGrant equip 背包新增宝箱', player.bag.length === 1 && player.bag[0].type === 'chest' && player.bag[0].chestKind === 'equip');
    const d2 = dailyGrant('skill', 0);
    assert('dailyGrant skill 背包新增功法宝箱', player.bag.length === 2 && player.bag[1].chestKind === 'skill');

    // 6. 旧装备 item（无 type）在背包按装备处理，不被当宝箱
    player.bag = [ makeItemFromDb(EQUIP_DB[1], 0) ];
    player.bag[0].uid = 'old_eq';
    window.showBagModal();
    const h2 = globalThis.__MODAL;
    assert('旧装备按装备处理：显示在背包装备区', h2.indexOf('背包装备（') >= 0);
    assert('无宝箱时不开启按钮', h2.indexOf('开启') < 0);

  } catch (e) {
    results.push('FAIL | 异常: ' + (e && e.stack ? e.stack : e));
  }
  globalThis.__RESULTS = results;
})();
`;

vm.runInContext(code, sandbox, { filename: 'chest-item-bundle.js' });

const results = sandbox.__RESULTS || [];
let fail = 0;
for (const r of results) { if (r.indexOf('FAIL') === 0) fail++; console.log(r); }
console.log('==== chest_item: ' + (results.length - fail) + '/' + results.length + ' PASS ====');
process.exit(fail ? 1 : 0);
