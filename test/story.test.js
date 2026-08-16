/* 无头回归测试：副本系统三处修复
 *  1) 章节解锁新增「境界等级门槛」（每升1级开放1章，与"前一章通关" AND 生效）
 *  2) 通关奖励三选一：选中非默认项后领取，确实拿到所选（验证选择机制可用，不再静默默认）
 *  3) 战斗胜利/失败后自动弹出结算界面（含返回入口），不再卡在 canvas 胜利画面
 * 运行：node test/story.test.js
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const FILES = [
  'config.js', 'cultivation.js', 'js/core.js', 'js/player.js', 'js/skills-data.js',
  'js/story-data.js', 'js/battle.js', 'js/hub.js', 'js/create.js', 'js/story.js',
  'js/worldboss.js', 'js/daily.js', 'js/main.js',
];

const ctxStub = new Proxy({}, { get: () => () => {}, set: () => true });
const elements = {};
function makeEl(id) {
  const el = {
    id, _attrs: {}, style: {}, innerHTML: '', textContent: '', hidden: false,
    src: '', dataset: {}, _errBound: false,
    classList: { add() {}, remove() {}, contains() { return false; }, toggle() {} },
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
    assert('window.openStoryScreen 存在', typeof openStoryScreen === 'function');
    assert('window.storyAfterBattle 存在', typeof storyAfterBattle === 'function');
    assert('window.realmLevel 存在(daily.js)', typeof realmLevel === 'function');

    // ===== 1) 境界等级门槛 =====
    player.xp = 0; player.storyCleared = {}; player.storyRewardClaimed = {};
    assert('开局境界等级=1', realmLevel() === 1);
    assert('第1章默认开放', storyChapterUnlocked(1) === true);
    assert('第1章未通关前 第2章锁定', storyChapterUnlocked(2) === false);

    // 模拟"通关第1章 + 获得364修为(升到2级)"
    player.storyCleared[1] = 10; player.storyCleared[2] = 10; player.xp = 364;
    assert('通关第1章后 境界等级=2', realmLevel() === 2);
    assert('通关第1章且2级 → 第2章开放', storyChapterUnlocked(2) === true);
    assert('但境界2级时 第3章仍锁定(需等级3)', storyChapterUnlocked(3) === false);
    assert('第3章锁定原因=需境界等级3', storyChapterLockReason(3).indexOf('需境界等级3') !== -1);

    // 前一章没通关时，即使等级够也锁
    player.storyCleared = {}; player.xp = 364; // 等级2，但第1章未通
    assert('等级够但前章未通 → 第2章锁定', storyChapterUnlocked(2) === false);
    assert('第2章锁定原因=先通第1章', storyChapterLockReason(2).indexOf('先通第1章') !== -1);

    // ===== 2) 三选一：选中非默认项，领取确为所选 =====
    player.storyCleared = {}; player.storyRewardClaimed = {};
    player.storyCleared[1] = 10; player.storyRewardClaimed[1] = false;
    player.learned = (typeof DEFAULT_LEARNED !== 'undefined' ? DEFAULT_LEARNED.slice() : []);
    player.bag = []; player.xp = 364;
    const rw = STORY_BY_CH[1].reward;
    assert('第1章奖励含≥3个功法(三选一)', rw.skills.length >= 3);
    assert('第1章奖励含≥3件装备(三选一)', rw.equip.length >= 3);
    const skill0 = rw.skills[0], skill1 = rw.skills[1];
    const learnBefore = player.learned.length, bagBefore = player.bag.length;

    showStoryReward(1);
    assert('showStoryReward 弹出奖励模态', document.getElementById('modal').hidden === false);
    // 选中第2个功法 + 第2件装备（非默认）
    storySelReward('skill', skill1);
    storySelReward('equip', 1);
    assert('_selSkill 已更新为 skill1', _selSkill === skill1);
    assert('_selEquip 已更新为 1', _selEquip === 1);

    storyClaimReward(1);
    assert('领取后 功法库含所选 skill1(非默认skill0)', player.learned.indexOf(skill1) !== -1);
    assert('领取后 未误发默认 skill0(若不同)', skill0 === skill1 || player.learned.indexOf(skill0) === -1);
    assert('领取后 装备进入背包(bag+1)', player.bag.length === bagBefore + 1);
    assert('领取后 标记已领 storyRewardClaimed[1]=true', player.storyRewardClaimed[1] === true);
    assert('领取后 learned 仅+1(只发所选功法)', player.learned.length === learnBefore + 1);

    // ===== 3) 战斗结束自动弹结算界面(返回入口) =====
    // 场景A：章节通关 → 弹三选一奖励（含确认/暂不选，不再卡 canvas）
    player.storyCleared = {}; player.storyRewardClaimed = {};
    player.storyCleared[1] = 10; player.storyRewardClaimed[1] = false;
    battle = { mode: 'story', node: { _story: { ch: 1 } } };
    storyAfterBattle();
    const mA = document.getElementById('modal-box').innerHTML;
    assert('通关后 自动弹出模态(非卡胜利画面)', document.getElementById('modal').hidden === false);
    assert('通关后 弹窗含三选一领取入口', mA.indexOf('storyClaimReward') !== -1);

    // 场景B：章节未通关(中途胜利/失败) → 弹本章界面(含返回章节列表)
    player.storyCleared = {}; player.storyRewardClaimed = {};
    player.storyCleared[2] = 5; // 第2章只通了5关
    battle = { mode: 'story', node: { _story: { ch: 2 } } };
    storyAfterBattle();
    const mB = document.getElementById('modal-box').innerHTML;
    assert('中途胜/负后 弹窗含返回章节列表(storyBackVol)', mB.indexOf('storyBackVol') !== -1);

    // 边界：realmLevel 始终 >=1，第1章永远开放
    player.xp = 0; player.storyCleared = {};
    assert('任意状态下 第1章均可挑战', storyChapterUnlocked(1) === true);
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
console.log('\n==== ' + (failed.length ? failed.length + ' 项失败' : '全部通过 (' + out.split('\n').length + ' 项)') + ' ====');
process.exit(failed.length ? 1 : 0);
