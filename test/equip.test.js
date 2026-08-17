/* 无头回归测试：装备系统重制（94 种固定装备 + 6 套装 + 16 类特效 + 战斗引擎接入）
 * 运行：node test/equip.test.js
 * 原理：把所有经典脚本拼成单作用域在 vm 里一次性执行（模拟浏览器多 <script> 共享词法作用域），
 *       全程用 DOM/canvas/localStorage 桩，不依赖真实浏览器。
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
    assert('initHub 后 window.HUB 存在', !!window.HUB);

    // 1) 装备表规模 80~100
    assert('装备表规模 80~100 (实际=' + EQUIP_DB.length + ')', EQUIP_DB.length >= 80 && EQUIP_DB.length <= 100);

    // 2) 每个 部位×品质 至少 1 件（保证宝箱/锻造任意槽位都能抽到）
    const SLOTS = ['weapon','armor','accessory','boots'];
    let allCells = true;
    SLOTS.forEach(s => { for (let r=0;r<5;r++){ if (!EQUIP_DB.some(e=>e.slot===s && e.rarity===r)) allCells = false; } });
    assert('4 部位 × 5 品质 每格都有装备', allCells);

    // 3) drawEquipFromDb 返回合法 item（含基础属性/特效/套装）
    const it = drawEquipFromDb('weapon', 2);
    assert('drawEquipFromDb 返回对象', !!it && typeof it === 'object');
    assert('返回 item 含 name/slot/rarityName', !!it.name && it.slot==='weapon' && !!it.rarityName);
    assert('返回 item 含 bonus 属性', it.bonus && Object.keys(it.bonus).length > 0);

    // 4) genEquip 已切换到数据库
    const g = genEquip('armor', 3);
    assert('genEquip 走数据库(有名字)', !!g.name && g.slot==='armor');

    // 5) computeEquipMods：单件特效聚合
    player.equipment = { weapon: makeItemFromDb(EQUIP_DB.find(e=>e.effect&&e.effect.type==='lifesteal'), 0) };
    let m = computeEquipMods(player);
    assert('吸血装备 → mods.lifesteal>0', m.lifesteal > 0);

    // 6) 套装：4 件诛仙 → 破甲+护盾；2 件 → 暴击
    const zx = EQUIP_DB.filter(e=>e.set==='zhuxian');
    const worn4 = {}; zx.forEach(e=>{ worn4[e.slot] = makeItemFromDb(e, 0); });
    player.equipment = worn4;
    const m4 = computeEquipMods(player);
    assert('诛仙4件 → 破甲(pierce)>0', m4.pierce > 0);
    assert('诛仙4件 → 护盾(shieldPct)>0', m4.shieldPct > 0);
    player.equipment = { weapon: worn4.weapon, armor: worn4.armor };
    const m2 = computeEquipMods(player);
    assert('诛仙2件 → 暴击(critRate)>0', m2.critRate > 0);

    // 7) 战斗：吸血真实回血
    player.equipment = { weapon: makeItemFromDb(EQUIP_DB.find(e=>e.effect&&e.effect.type==='lifesteal'&&e.rarity===2), 0) };
    recalcStats(player);
    player.atk = 200; player.maxHp = 1000; player.hp = 500; player._x = 0; player._y = 0; player.isEnemy = false;
    player.buffs = []; player.debuffs = []; player.shield = null;
    const enemy = { name:'试炼傀儡', isEnemy:true, hp:2000, maxHp:2000, atk:30, def:5, spiAtk:0, spiDef:5, eva:0, mp:40, maxMp:40, _x:1, _y:1, buffs:[], debuffs:[], shield:null };
    battle = { player, enemy, node:{enemy:{name:'试炼傀儡'}}, mode:'map', mods: computeEquipMods(player), _stackCrit:0, _reviveUsed:false };
    floats = [];
    const hp0 = player.hp;
    damage(player, enemy, 1.0, 'phys');
    assert('吸血：玩家攻击后血量上升', player.hp > hp0);

    // 8) 战斗：反伤把伤害弹回敌方
    enemy.atk = 200; player.def = 10; player.hp = 500; enemy.hp = 1000;
    battle.mods = { reflect: 0.5 };
    const eh0 = enemy.hp;
    damage(enemy, player, 1.0, 'phys');
    assert('反伤：敌方攻击后自身血量下降', enemy.hp < eh0);

    // 9) 战斗：涅槃复活
    player.hp = 0; battle.mods = { revive: 0.5 }; battle._reviveUsed = false;
    const r = checkEnd();
    assert('复活：checkEnd 返回 false(战斗继续)', r === false);
    assert('复活：玩家血量恢复 >0', player.hp > 0);
    assert('复活：标记已使用', battle._reviveUsed === true);

    // 10) 面板展示含特效文字
    const effIt = makeItemFromDb(EQUIP_DB.find(e=>e.effect), 0);
    assert('equipBonusText 含特效【】标记', equipBonusText(effIt).indexOf('【') !== -1);
    const setIt = makeItemFromDb(EQUIP_DB.find(e=>e.set), 0);
    assert('套装装备 equipBonusText 含套装标记', equipBonusText(setIt).indexOf('套装') !== -1);

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
console.log('\n==== 装备系统测试: ' + pass + ' 通过, ' + fail + ' 失败 ====');
process.exit(fail ? 1 : 0);
