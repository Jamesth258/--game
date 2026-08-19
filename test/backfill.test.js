/* 无头回归测试：动态回填铁律（PROJECT.md §8.9）
 * 运行：node test/backfill.test.js
 * 原理：同 crit_panel.test.js —— 全部经典脚本拼成单作用域在 vm 执行，DOM 桩捕获面板 HTML。
 *
 * 守护目标（用户铁律：改任何模板/DB 细节，旧存档对象必须回填，不能只改新获取内容）：
 *  A) 装备：旧存档的装备是把"模板值冻结进 bonus"后序列化进 localStorage 的。
 *     改模板后，旧装备 bonus 里没有新字段 → 必须 resolvedEquipBonus 从当前模板回填。
 *     （曾踩的致命坑：item.rarity 是字符串 'shen'，而 EQUIP_TPL[slot] 按数字 0~4 索引，
 *      若直接 EQUIP_TPL[slot][item.rarity] 永远 undefined，回填失效 —— 本测试即防此回归。）
 *  B) 功法：存档里存的是 SKILLS_DB 的 id 数组，每次战斗实时查 SKILLS_DB_MAP[id]，
 *     天然拿到最新字段（如 buffHitRate），无需回填。本测试守护"旧习得功法 id 仍能取到 buffHitRate"。
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

  // 模拟旧存档装备：字符串 rarity、bonus 由"当年模板"冻结（故意不含 hitRate）、仅带 id/slot/effect
  function oldEq(id, slot, rarity, bonus, effect){
    return { id: id, slot: slot, rarity: rarity, bonus: bonus || {}, effect: effect || null };
  }

  try {
    initHub();

    const empty = { weapon: null, armor: null, accessory: null, boots: null };

    // ---------- A) 装备动态回填（铁律核心）----------
    // A0) resolvedEquipBonus 必须存在（回填机制未退化成直读 bonus）
    assert('resolvedEquipBonus 函数已定义', typeof resolvedEquipBonus === 'function');

    // A1) 旧神武器（七杀剑，bonus 无 hitRate）→ 回填出模板命中率 0.34，且保留旧 atk
    const wOld = oldEq('w4_1', 'weapon', 'shen', { atk: 509, spiAtk: 428 }, { type: 'accuracy', v: 6 });
    const wb = resolvedEquipBonus(wOld);
    assert('旧神武器 回填 hitRate=0.34 (实际=' + wb.hitRate + ')', Math.abs((wb.hitRate||0) - 0.34) < 1e-9);
    assert('旧神武器 保留旧 atk=509 (实际=' + wb.atk + ')', wb.atk === 509);

    // A2) 旧神饰品（天魔离光尺，bonus 无 hitRate）→ 回填 0.16
    const aOld = oldEq('c4_3', 'accessory', 'shen', { maxMp: 340, spiAtk: 56, eva: 0.09 }, { type: 'accuracy', v: 18 });
    const ab = resolvedEquipBonus(aOld);
    assert('旧神饰品 回填 hitRate=0.16 (实际=' + ab.hitRate + ')', Math.abs((ab.hitRate||0) - 0.16) < 1e-9);

    // A3) 显示：旧装备卡文字含「命中+34%」/「命中+16%」（直接走 equipBonusText，背包/装备卡同路径）
    assert('旧神武器 显示含「命中+34%」', equipBonusText(wOld).indexOf('命中+34%') !== -1);
    assert('旧神饰品 显示含「命中+16%」', equipBonusText(aOld).indexOf('命中+16%') !== -1);

    // A4) 计算：旧神武器装上后，面板命中率较无装备 +0.40（模板34% + 精准特效6%）
    player.equipment = empty; recalcStats(player); const baseHit = player.hitRate;
    player.equipment = { weapon: wOld, armor: null, accessory: null, boots: null };
    recalcStats(player);
    assert('旧神武器 面板命中率较无装备+0.40 (实际+' + (player.hitRate - baseHit).toFixed(3) + ')', Math.abs((player.hitRate - baseHit) - 0.40) < 1e-9);

    // A5) 计算：旧神饰品 +0.34（模板16% + 精准特效18%）
    player.equipment = empty; recalcStats(player); const baseHit2 = player.hitRate;
    player.equipment = { weapon: null, armor: null, accessory: aOld, boots: null };
    recalcStats(player);
    assert('旧神饰品 面板命中率较无装备+0.34 (实际+' + (player.hitRate - baseHit2).toFixed(3) + ')', Math.abs((player.hitRate - baseHit2) - 0.34) < 1e-9);

    // A6) 凡品武器/饰品模板本无 hitRate → 回填后也不应凭空多出 hitRate 键（回填只补模板现有字段）
    const fwOld = oldEq('w1_0', 'weapon', 'fan', { atk: 6, spiAtk: 6 });
    assert('旧凡武器 回填后无 hitRate 键（模板本无）', !('hitRate' in resolvedEquipBonus(fwOld)));
    const faOld = oldEq('c1_0', 'accessory', 'fan', { maxMp: 35, spiAtk: 6, eva: 0.02 });
    assert('旧凡饰品 回填后无 hitRate 键（模板本无）', !('hitRate' in resolvedEquipBonus(faOld)));

    // A7) 缺失的「通用字段」也回填：删掉 spiAtk 的旧神武器 → 回填出 spiAtk=42
    const wStrip = oldEq('w4_1', 'weapon', 'shen', { atk: 509 }, { type: 'accuracy', v: 6 });
    assert('旧神武器 缺失 spiAtk → 回填 42 (实际=' + resolvedEquipBonus(wStrip).spiAtk + ')', resolvedEquipBonus(wStrip).spiAtk === 42);

    // ---------- B) 功法实时查表（无需回填，但须守护旧习得功法拿到最新字段）----------
    const total = Object.keys(SKILLS_DB_MAP).length;
    assert('SKILLS_DB_MAP 已加载 (' + total + ' 功法)', total > 0);
    const buffSkills = Object.values(SKILLS_DB_MAP).filter(s => s.buffHitRate && s.buffHitRate > 0);
    assert('带 buffHitRate 的功法 >= 8 (实际=' + buffSkills.length + ')', buffSkills.length >= 8);
    // 模拟旧存档：player.learned 只存 id，战斗实时查 SKILLS_DB_MAP[id] → 必能取到 buffHitRate
    let allResolve = true;
    buffSkills.forEach(s => { const sk = SKILLS_DB_MAP[s.id]; if (!sk || !(sk.buffHitRate > 0)) allResolve = false; });
    assert('旧习得功法(仅存id) 经 SKILLS_DB_MAP 实时取到 buffHitRate', allResolve);

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
console.log('\n==== 动态回填回归测试: ' + pass + ' 通过, ' + fail + ' 失败 ====');
process.exit(fail ? 1 : 0);
