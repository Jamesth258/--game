/* 无头回归测试：属性面板新增「常驻暴击率 / 暴伤」展示
 * 运行：node test/crit_panel.test.js
 * 原理：同 equip.test.js —— 全部经典脚本拼成单作用域在 vm 执行，DOM 桩捕获 openModal 写出的面板 HTML。
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

    // 覆盖 openModal 以捕获属性面板 HTML
    openModal = function(html){ globalThis.__MODAL = html; };

    const empty = { weapon: null, armor: null, accessory: null, boots: null };
    const byId = id => EQUIP_DB.find(e => e.id === id);

    // A) 无装备：基础 15% 暴击 / 150% 暴伤
    player.equipment = empty;
    recalcStats(player);
    assert('无装备 暴击率=基础15%+等级×0.2%+天命×0.2% (实际=' + player.critRate + ')', Math.abs(player.critRate - (0.15 + (Number(player.level)||0)*0.002 + (Number(player.des)||0)*0.002)) < 1e-9);
    assert('无装备 暴伤倍率=1.5 (实际=' + player.critDmg + ')', Math.abs(player.critDmg - 1.5) < 1e-9);

    // B) 单件精准：寒铁剑(w1_1, 灵品武器模板命中+5% + accuracy 5%) → 命中率较无装备 +10%（命中率系统：装备精准永久进面板）
    player.equipment = empty; recalcStats(player); const baseHit = player.hitRate;
    player.equipment = { weapon: makeItemFromDb(byId('w1_1'), 0), armor: null, accessory: null, boots: null };
    recalcStats(player);
    assert('寒铁剑(模板5%+精准5%) → 命中率较无装备+10% (实际+' + (player.hitRate - baseHit).toFixed(3) + ')', Math.abs((player.hitRate - baseHit) - 0.10) < 1e-9);

    // C) 2 件诛仙：诛仙剑(w2_3 crit6%) + 诛仙佩(c2_3 crit5%) → 触发2件套 critRate+8% → 15+6+5+8=34%
    player.equipment = {
      weapon: makeItemFromDb(byId('w2_3'), 0),
      armor: null,
      accessory: makeItemFromDb(byId('c2_3'), 0),
      boots: null
    };
    recalcStats(player);
    assert('诛仙2件 → 暴击率=34%+等级/天命加成 (实际=' + player.critRate + ')', Math.abs(player.critRate - (0.34 + (Number(player.level)||0)*0.002 + (Number(player.des)||0)*0.002)) < 1e-9);

    // D) 2 件贪狼：贪狼刃(w4_2 critdmg45%) + 贪狼佩(c4_2 critdmg35%) → 2件套 critDmg+20% → 1.5+0.45+0.35+0.20=2.5
    player.equipment = {
      weapon: makeItemFromDb(byId('w4_2'), 0),
      armor: null,
      accessory: makeItemFromDb(byId('c4_2'), 0),
      boots: null
    };
    recalcStats(player);
    assert('贪狼2件 → 暴伤倍率=2.5 (250%) (实际=' + player.critDmg + ')', Math.abs(player.critDmg - 2.5) < 1e-9);

    // E) 条件触发不计入面板：紫薇2件(紫薇剑 lowhpcrit25% + 紫薇铃 crit8%) → 面板仅 23%（25% 为血<30%条件，不计入常驻）
    player.equipment = {
      weapon: makeItemFromDb(byId('w3_4'), 0),
      armor: null,
      accessory: makeItemFromDb(byId('c3_2'), 0),
      boots: null
    };
    recalcStats(player);
    assert('紫薇2件 → 面板暴击率=23%+等级/天命加成(条件lowHpCrit不计入) (实际=' + player.critRate + ')', Math.abs(player.critRate - (0.23 + (Number(player.level)||0)*0.002 + (Number(player.des)||0)*0.002)) < 1e-9);

    // F) 面板 HTML 含「暴击率 / 暴击伤害」标签并渲染数值
    player.equipment = { weapon: makeItemFromDb(byId('w1_1'), 0), armor: null, accessory: null, boots: null };
    recalcStats(player);
    window.showAttrModal();
    const html = globalThis.__MODAL || '';
    assert('属性面板含「暴击率」', html.indexOf('暴击率') !== -1);
    assert('属性面板含「暴击伤害」', html.indexOf('暴击伤害') !== -1);
    assert('面板渲染了暴击率数值(含%)', /暴击率<\\/td><td[^>]*>\\d+%/.test(html));

    // G) 被动心法暴击率/暴伤必须进入战斗 computeEquipMods（修复：面板满暴击、实战却不暴击）
    player.equipment = { weapon: null, armor: null, accessory: null, boots: null };
    recalcStats(player);
    player.learned = ['bu018']; // 碧落磐石术 被动暴击 +9%
    const mG1 = computeEquipMods(player);
    assert('被动心法 bu018 暴击率进入战斗 computeEquipMods (实际=' + mG1.critRate + ')', Math.abs(mG1.critRate - 0.09) < 1e-9);
    player.learned = ['bu006']; // 孤鸿破军式 被动暴伤 +30%
    const mG2 = computeEquipMods(player);
    assert('被动心法 bu006 暴伤进入战斗 computeEquipMods (实际=' + mG2.critDmg + ')', Math.abs(mG2.critDmg - 0.30) < 1e-9);
    player.learned = [];

  } catch (err) {
    results.push('FAIL | 异常: ' + (err && err.stack ? err.stack : err));
  }
  globalThis.__RESULTS = results;
})();
`;

vm.runInContext(code, sandbox, { filename: 'concat.js' });
const results = sandbox.__RESULTS || [];
let pass = 0, fail = 0;
results.forEach(r => { if (r.indexOf('PASS') === 0) pass++; else fail++; console.log(r); });
console.log('\n==== 暴击面板测试: ' + pass + ' 通过, ' + fail + ' 失败 ====');
process.exit(fail ? 1 : 0);
