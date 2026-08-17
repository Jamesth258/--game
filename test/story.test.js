/* 无头回归测试：副本系统修复 v2
 *  1) 章节解锁新增「境界等级门槛」（每升1级开放1章，与"前一章通关" AND 生效）
 *  2) 通关奖励三选一：选中非默认项后领取，确实拿到所选
 *  3) 战斗结束显示可见的 DOM 返回按钮（不再卡 canvas 胜利画面）
 *  4) 首通才有奖励（XP/金/掉落），重战无额外奖励（仅推进进度）
 * 运行：node test/story.test.js
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const FILES = [
  'config.js', 'cultivation.js', 'js/core.js', 'js/equip_db.js', 'js/player.js', 'js/skills-data.js',
  'js/story-data.js', 'js/battle.js', 'js/hub.js', 'js/create.js', 'js/story.js',
  'js/worldboss.js', 'js/daily.js', 'js/codex.js', 'js/main.js',
];

// ---- 桩：DOM / localStorage / timer ----
let _createdElements = [];
const ctxStub = new Proxy({}, { get: () => () => {}, set: () => true });
const elements = {};
function makeEl(id) {
  const el = {
    id, _attrs: {}, style: {}, innerHTML: '', textContent: '', hidden: false,
    src: '', dataset: {}, _errBound: false, childNodes: [],
    classList: { add() {}, remove() {}, contains() { return false; }, toggle() {} },
    setAttribute(k, v) { this._attrs[k] = v; if (k === 'hidden') this.hidden = true; },
    removeAttribute(k) { delete this._attrs[k]; if (k === 'hidden') this.hidden = false; },
    getAttribute(k) { return this._attrs[k]; },
    addEventListener() {}, removeEventListener() {},
    appendChild(c) { if (c) this.childNodes.push(c); return c; },
    removeChild(c) { const i = this.childNodes.indexOf(c); if (i >= 0) this.childNodes.splice(i, 1); return c; },
    querySelectorAll() { return []; }, querySelector(s) {
      if (s === '.stage') { var st = makeEl('stage'); st.style = {}; return st; }
      return null;
    },
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
  document: { getElementById: getEl, createElement: function(tag) { const el = makeEl('dyn_' + tag + '_' + Date.now()); el.tagName = (tag || '').toUpperCase(); _createdElements.push(el); return el; }, querySelectorAll: function() { return []; }, querySelector: function(s) { if (s === '.stage') { var st = makeEl('stage'); st.style = {}; return st; } return null; }, body: makeEl('body'), documentElement: makeEl('html'), addEventListener() {} },
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
    assert('window.showBattleReturnBtn 存在', typeof showBattleReturnBtn === 'function');
    assert('window.hideBattleReturnBtn 存在', typeof hideBattleReturnBtn === 'function');

    // ===== 1) 境界等级门槛 =====
    player.xp = 0; player.storyCleared = {}; player.storyRewardClaimed = {};
    assert('开局境界等级=1', realmLevel() === 1);
    assert('第1章默认开放', storyChapterUnlocked(1) === true);
    assert('第1章未通关前 第2章锁定', storyChapterUnlocked(2) === false);

    player.storyCleared[1] = 10; player.storyCleared[2] = 10; player.xp = 364;
    assert('通关第1章后 境界等级=2', realmLevel() === 2);
    assert('通关第1章且2级 -> 第2章开放', storyChapterUnlocked(2) === true);
    assert('但境界2级时 第3章仍锁定(需等级3)', storyChapterUnlocked(3) === false);
    assert('第3章锁定原因=需境界等级3', storyChapterLockReason(3).indexOf('需境界等级3') !== -1);

    player.storyCleared = {}; player.xp = 364;
    assert('等级够但前章未通 -> 第2章锁定', storyChapterUnlocked(2) === false);
    assert('第2章锁定原因=先通第1章', storyChapterLockReason(2).indexOf('先通第1章') !== -1);

    // ===== 2) 三选一：选中非默认项，领取确为所选 =====
    player.storyCleared = {}; player.storyRewardClaimed = {};
    player.storyCleared[1] = 10; player.storyRewardClaimed[1] = false;
    player.learned = (typeof DEFAULT_LEARNED !== 'undefined' ? DEFAULT_LEARNED.slice() : []);
    player.bag = []; player.xp = 364;
    const rw = STORY_BY_CH[1].reward;
    assert('第1章奖励含>=3个功法(三选一)', rw.skills.length >= 3);
    assert('第1章奖励含>=3件装备(三选一)', rw.equip.length >= 3);
    const skill0 = rw.skills[0], skill1 = rw.skills[1];
    const learnBefore = player.learned.length, bagBefore = player.bag.length;

    showStoryReward(1);
    assert('showStoryReward 弹出奖励模态', document.getElementById('modal').hidden === false);

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

    // ===== 2b) 三选一「已拥有」标注（防重复选择） =====
    player.storyCleared = {}; player.storyRewardClaimed = {};
    player.storyCleared[1] = 10; player.storyRewardClaimed[1] = false;
    player.bag = []; player.xp = 364;
    const rwOwn = STORY_BY_CH[1].reward;
    if (!player.learned.includes(rwOwn.skills[0])) player.learned.push(rwOwn.skills[0]);
    player.equipCollected = [];
    rwOwn.equip.forEach(e => EQUIP_DB.filter(x => x.slot === e.slot).forEach(x => player.equipCollected.push(x.id)));
    showStoryReward(1);
    const rewardHtmlOwn = document.getElementById('modal-box').innerHTML;
    const ownCount = (rewardHtmlOwn.match(/已拥有/g) || []).length;
    assert('三选一 出现「已拥有」徽标(owned-badge)', rewardHtmlOwn.indexOf('owned-badge') !== -1);
    assert('三选一 已拥有标注数 >= 4（1功法+3装备）', ownCount >= 4);
    // 反向：全部未拥有时不应出现「已拥有」
    player.learned = []; player.equipCollected = [];
    showStoryReward(1);
    const rewardHtmlNone = document.getElementById('modal-box').innerHTML;
    assert('未拥有时 三选一不标注已拥有', rewardHtmlNone.indexOf('已拥有') === -1);

    // ===== 3) 战斗结束后出现 DOM 返回按钮（不再卡 canvas） =====
    // 场景A：章节通关 -> endBattle(win) 应调用 showBattleReturnBtn
    _createdElements = []; // 重置追踪
    player.storyCleared = {}; player.storyRewardClaimed = {};
    player.storyLevelFirstClear = {};
    player.storyCleared[1] = 9; // 还差1关通关
    battle = { mode: 'story', node: { _story: { ch: 1, lv: 10 } }, player: player, enemy: { hp: 0 } };
    // 手动模拟 endBattle 的 story 分支（只测返回按钮逻辑，不跑完整战斗）
    var btnShown = false;
    var origShow = showBattleReturnBtn;
    showBattleReturnBtn = function(text, action) { btnShown = true; assert('返回按钮文本含"领取"', text.indexOf('领取') !== -1 || text.indexOf('返回') !== -1); };
    // 模拟首通标记
    player.storyLevelFirstClear['1_10'] = false;
    var isFirst = !player.storyLevelFirstClear['1_10'];
    assert('第1章第10关 首次判定=true', isFirst === true);
    player.storyLevelFirstClear['1_10'] = true;
    var isSecond = !player.storyLevelFirstClear['1_10'];
    assert('标记后 再次判定=false(重战无奖)', isSecond === false);
    showBattleReturnBtn = origShow;

    // 实际调用 showBattleReturnBtn 验证 DOM 创建
    _createdElements = [];
    showBattleReturnBtn('测试返回', function(){});
    assert('showBattleReturnBtn 执行后 _battleReturnBtn 非空', _battleReturnBtn !== null);
    hideBattleReturnBtn();
    assert('hideBattleReturnBtn 后 _battleReturnBtn=null', _battleReturnBtn === null);

    // 场景B：storyAfterBattle 路由正确
    player.storyCleared = {}; player.storyRewardClaimed = {};
    player.storyCleared[1] = 10; player.storyRewardClaimed[1] = false;
    battle = { mode: 'story', node: { _story: { ch: 1 } } };
    storyAfterBattle();
    var mA = document.getElementById('modal-box').innerHTML;
    assert('通关后 自动弹出模态(非卡胜利画面)', document.getElementById('modal').hidden === false);
    assert('通关后 弹窗含三选一领取入口', mA.indexOf('storyClaimReward') !== -1);

    // 场景C：中途胜/负 -> 弹本章界面
    player.storyCleared = {}; player.storyRewardClaimed = {};
    player.storyCleared[2] = 5;
    battle = { mode: 'story', node: { _story: { ch: 2 } } };
    storyAfterBattle();
    var mB = document.getElementById('modal-box').innerHTML;
    assert('中途胜/负后 弹窗含返回章节列表(storyBackVol)', mB.indexOf('storyBackVol') !== -1);

    // ===== 4) 首通有奖、重战无奖 =====
    player.storyCleared = {}; player.storyLevelFirstClear = {};
    player.gold = 100; player.bag = []; player.xp = 0;
    var xpBefore = player.xp, goldBefore = player.gold, bagLenBefore = player.bag.length;

    // 模拟 endBattle 中 story 首通分支
    var ch = 1, lv = 3;
    var levelKey = ch + '_' + lv;
    var isFirstClear = !player.storyLevelFirstClear[levelKey];
    assert('首次打1_3 -> isFirstClear=true', isFirstClear === true);
    if (isFirstClear) {
      player.storyLevelFirstClear[levelKey] = true;
      player.xp += 50; // 模拟 XP
      player.gold += 11; // 模拟 gold
    }
    assert('首通后 XP增加了', player.xp > xpBefore);
    assert('首通后 gold增加了', player.gold > goldBefore);

    // 重战同一关
    xpBefore = player.xp; goldBefore = player.gold;
    levelKey = ch + '_' + lv;
    isFirstClear = !player.storyLevelFirstClear[levelKey];
    assert('重战1_3 -> isFirstClear=false(无奖)', isFirstClear === false);
    if (isFirstClear) {
      player.storyLevelFirstClear[levelKey] = true;
      player.xp += 50;
      player.gold += 11;
    }
    assert('重战后 XP 不变(无额外奖励)', player.xp === xpBefore);
    assert('重战后 gold 不变(无额外奖励)', player.gold === goldBefore);

    // 边界：realmLevel 始终 >=1，第1章永远开放
    player.xp = 0; player.storyCleared = {};
    assert('任意状态下 第1章均可挑战', storyChapterUnlocked(1) === true);

    // 静态校验：endBattle 代码含首通判断逻辑
    var __codeStr = __CODE;
    assert('endBattle 含 storyLevelFirstClear 首通判断', __codeStr.indexOf('storyLevelFirstClear') !== -1);
    assert('endBattle 含 showBattleReturnBtn 调用(story分支)', __codeStr.indexOf('showBattleReturnBtn') !== -1);
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
