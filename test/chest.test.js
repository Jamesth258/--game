/* 无头回归测试：宝箱概率系统
 *   A. 功法宝箱按 tier 加权（黄高帝低）+ 120 保底
 *   B. 概率详情页 openChestInfo 渲染当前境界概率表
 *   C. 装备宝箱来源差异化品质（bias 越高品质越高）
 * 运行：node test/chest.test.js
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
  Image: class { constructor() { this.onerror = null; this.complete = false; this.naturalWidth = 0; this.failed = false; } set src(v) { this._src = v; } get src() { return this._src; } },
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
    player.xp = 0;                 // 境界等级 1（tier0）
    player.learned = [];
    player.bag = [];
    player.equipCollected = [];
    player.codexReward = { skill: 0, equip: 0 };
    player.skillPity = 0;

    // ---- A. 功法宝箱 tier 加权：黄(1) 远多于 帝(7) ----
    const N = 6000; let c1 = 0, c7 = 0;
    for (let i = 0; i < N; i++) {
      player.learned = [];        // 每次视为独立宝箱（未拥有全开放）
      player.skillPity = 0;       // 屏蔽保底，测纯加权
      const s = openSkillChest();
      if (s.tier === 1) c1++;
      if (s.tier === 7) c7++;
    }
    assert('功法加权：黄阶次数 > 帝阶次数 (' + c1 + ' > ' + c7 + ')', c1 > c7);
    assert('功法加权：帝阶占比 < 10% (实际=' + (c7 / N * 100).toFixed(1) + '%)', c7 / N < 0.10);
    assert('功法加权：黄阶占比 > 30% (实际=' + (c1 / N * 100).toFixed(1) + '%)', c1 / N > 0.30);

    // ---- A. 保底：累计 120 次必出帝阶 ----
    player.learned = [];
    player.skillPity = SKILL_PITY_LIMIT - 1;     // 第 120 次
    const pitS = openSkillChest();
    assert('保底：第120次开出帝阶 (tier=' + pitS.tier + ')', pitS.tier === 7);
    assert('保底：触发后计数重置为 0 (实际=' + player.skillPity + ')', player.skillPity === 0);
    // 保底前的第 119 次不应强制（正常加权，可能非帝阶）
    player.learned = []; player.skillPity = SKILL_PITY_LIMIT - 2;
    const pre = openSkillChest();
    assert('保底：第119次为普通加权（非强制帝阶也合法，tier=' + pre.tier + '）', pre.tier >= 1 && pre.tier <= 7);

    // ---- C. 装备宝箱来源差异化：bias 越高品质越高 ----
    const d0 = equipChestQualityDist(0);
    const d2 = equipChestQualityDist(2);
    const sumChk = a => a.reduce((x, y) => x + y, 0);
    assert('装备概率分布和=1 (bias0=' + sumChk(d0).toFixed(3) + ')', Math.abs(sumChk(d0) - 1) < 1e-6);
    assert('装备 bias0：凡品占比=0', Math.abs(d0[0]) < 1e-9);
    assert('装备 bias0：神品占比=0', Math.abs(d0[4]) < 1e-9);
    assert('装备 bias2：神品占比>0 (实际=' + (d2[4] * 100).toFixed(1) + '%)', d2[4] > 0.2);
    // 抽样验证：bias2 平均品质 > bias0
    player.bag = [];
    function avgRarity(bias, n){ let s = 0; for (let i = 0; i < n; i++) { const it = openEquipChest(bias); s += RARITY.findIndex(r => r.key === it.rarity); } return s / n; }
    const m0 = avgRarity(0, 2000), m2 = avgRarity(2, 2000);
    assert('装备抽样：bias2 平均品质 > bias0 (m2=' + m2.toFixed(2) + ' > m0=' + m0.toFixed(2) + ')', m2 > m0 + 1);

    // ---- B. 概率详情页渲染 ----
    player.xp = 0;
    openChestInfo();
    const h = globalThis.__MODAL || '';
    assert('概率页：标题含「抽奖概率」', h.indexOf('抽奖概率') >= 0);
    assert('概率页：含装备品质表「神品」', h.indexOf('神品') >= 0);
    assert('概率页：含功法各阶「帝阶」', h.indexOf('帝阶') >= 0);
    assert('概率页：标注 120 保底', h.indexOf('120') >= 0);
    assert('概率页：标注世界BOSS加成', h.indexOf('世界BOSS') >= 0);

  } catch (e) {
    results.push('FAIL | 异常：' + (e && e.stack ? e.stack : e));
  }
  globalThis.__RESULTS = results;
})();
`;

vm.runInContext(code, sandbox, { filename: 'chest-bundle.js' });
const results = sandbox.__RESULTS || [];
let fail = 0;
console.log('===== chest.test =====');
for (const r of results) { if (r.startsWith('FAIL')) fail++; console.log(r); }
console.log('=====');
console.log(fail === 0 ? ('全部通过：' + results.length + ' 项') : (fail + ' 项失败 / 共 ' + results.length + ' 项'));
process.exit(fail === 0 ? 0 : 1);
