/* 无头回归测试：每日奖励系统（签到 + 在线时长奖励 + 钻石货币 + 商店钻石消费）
 * 运行：node test/daily.test.js
 * 原理：把所有经典脚本拼成单作用域在 vm 里一次性执行（模拟浏览器多 <script> 共享词法作用域），
 *       全程用 DOM/canvas/localStorage 桩，不依赖真实浏览器。
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
    // 初始化主页（建立 HUB、window.* 回调、商店函数等）
    initHub();
    assert('initHub 后 window.HUB 存在', !!window.HUB);
    assert('每日奖励菜单已接入 modal_daily', HUB_TOP_ITEMS.find(i=>i.id==='daily').action === 'modal_daily');
    assert('window.openDailyRewardScreen 存在', typeof openDailyRewardScreen === 'function');
    assert('window.buyDiamondChest 存在', typeof window.buyDiamondChest === 'function');

    // 基准：清空每日进度与货币，避免旧数据干扰
    player.daily = { date: dailyTodayStr(), month: dailyTodayStr().slice(0,7), signedToday:false, monthSignCount:0, monthClaimed:{}, onlineSecToday:0, onlineClaimed:{}, storyClearToday:0, bossChalToday:0, taskClaimed:{} };
    player.diamond = 0; player.gold = 0; player.learned = DEFAULT_LEARNED.slice(); player.bag = [];
    const lvl0 = realmLevel();
    assert('境界等级>=1（开局=1）', lvl0 >= 1);

    // ---- 第一重：每日签到 ----
    dailySignIn();
    assert('签到后 signedToday=true', player.daily.signedToday === true);
    assert('签到灵石=100×境界等级', player.gold === 100 * lvl0);
    assert('签到后 本月次数=1', player.daily.monthSignCount === 1);

    const g1 = player.gold;
    dailySignIn(); // 重复签到（同天）→ 不应重复发
    assert('重复签到不重复发灵石', player.gold === g1 && player.daily.monthSignCount === 1);

    // 模拟连续签到到满 20 次（每日手动置 signedToday=false 表示次日）
    function signNext(){ player.daily.signedToday = false; dailySignIn(); }
    signNext(); // 2
    signNext(); // 3 → 功法宝箱
    const learnedAt3 = player.learned.length;
    assert('签到满3次 已领里程碑3', player.daily.monthClaimed[3] === true);
    assert('签到满3次 功法宝箱入背包', player.bag.filter(it => it && it.type === 'chest' && it.chestKind === 'skill').length === 1);

    signNext(); // 4
    signNext(); // 5 → 装备宝箱
    assert('签到满5次 已领里程碑5', player.daily.monthClaimed[5] === true);
    const bagAt5 = player.bag.length;
    assert('签到满5次 装备宝箱入背包', player.bag.filter(it => it && it.type === 'chest' && it.chestKind === 'equip').length === 1);

    signNext(); // 6
    signNext(); // 7 → +1000 钻石
    assert('签到满7次 已领里程碑7', player.daily.monthClaimed[7] === true);
    assert('签到满7次 +1000钻石', player.diamond === 1000);

    for (let i=8;i<=14;i++) signNext(); // 14 → +2000 钻石
    assert('签到满14次 已领里程碑14', player.daily.monthClaimed[14] === true);
    assert('签到满14次 累计钻石=3000', player.diamond === 3000);

    const bagBefore20 = player.bag.length;
    const learnedBefore20 = player.learned.length;
    for (let i=15;i<=20;i++) signNext(); // 20 → 装备×2 + 功法×2
    assert('签到满20次 已领里程碑20', player.daily.monthClaimed[20] === true);
    assert('签到满20次 宝箱×4入背包(2功法+2装备)', player.bag.length === bagBefore20 + 4);
    assert('签到满20次 功法未因宝箱即时增加(learned=初始)', player.learned.length === DEFAULT_LEARNED.length);
    assert('签到满20次 本月次数=20', player.daily.monthSignCount === 20);

    // ---- 第二重：在线时长奖励 ----
    state = 'hub'; // 在线计时只在非创建态累计
    player.daily.onlineSecToday = 0; player.daily.onlineClaimed = {};
    player.diamond = 0; player.bag = []; player.gold = 0;
    const bagOB = player.bag.length;
    dailyTickSeconds(5 * 60);  // 5 分钟 → 10 钻石
    assert('在线5分钟 +10钻石', player.diamond === 10 && player.daily.onlineClaimed[5] === true);
    dailyTickSeconds(10 * 60); // 累计 15 分钟 → +20 钻石
    assert('在线15分钟 +20钻石(累计30)', player.diamond === 30 && player.daily.onlineClaimed[15] === true);
    dailyTickSeconds(15 * 60); // 累计 30 分钟 → 装备宝箱
    assert('在线30分钟 装备宝箱(bag+1)', player.bag.length === bagOB + 1 && player.daily.onlineClaimed[30] === true);
    dailyTickSeconds(30 * 60); // 累计 60 分钟 → 经验+灵石×5+30钻石
    assert('在线60分钟 累计钻石=60', player.diamond === 60 && player.daily.onlineClaimed[60] === true);
    // 已达成的里程碑不会重复发放
    const d60 = player.diamond;
    dailyTickSeconds(10 * 60);
    assert('在线奖励不重复发放', player.diamond === d60);

    // ---- 第三重：日常任务奖励 ----
    player.daily.storyClearToday = 0; player.daily.bossChalToday = 0; player.daily.taskClaimed = {};
    player.gold = 0; player.diamond = 0; player.bag = [];
    // 副本：通关 10 次 → 500 灵石
    for (let i = 0; i < 10; i++) dailyRecordStoryClear();
    assert('副本通关10次 storyClearToday=10', player.daily.storyClearToday === 10);
    assert('副本通关10次 领500灵石', player.gold === 500 && player.daily.taskClaimed['story10'] === true);
    // BOSS：5→500灵石；10→50钻+灵石宝箱×1；15→100钻+灵石宝箱×5；20→经验宝箱×10
    for (let i = 0; i < 20; i++) dailyRecordBossChallenge();
    assert('BOSS挑战20次 bossChalToday=20', player.daily.bossChalToday === 20);
    assert('BOSS挑战5次 领500灵石(累计1000)', player.gold === 1000 && player.daily.taskClaimed['boss5'] === true);
    assert('BOSS挑战10次 已领boss10(50钻+灵石宝箱×1)', player.daily.taskClaimed['boss10'] === true);
    assert('BOSS挑战15次 领100钻(累计150)', player.diamond === 150 && player.daily.taskClaimed['boss15'] === true);
    assert('BOSS挑战15次 灵石宝箱累计×6', player.bag.filter(it => it && it.type === 'chest' && it.chestKind === 'stone').length === 6);
    assert('BOSS挑战20次 经验宝箱×10', player.bag.filter(it => it && it.type === 'chest' && it.chestKind === 'exp').length === 10 && player.daily.taskClaimed['boss20'] === true);
    // 不重复发放
    const gB = player.gold, dB = player.diamond, bB = player.bag.length;
    dailyRecordBossChallenge(); dailyRecordStoryClear();
    assert('第三重奖励不重复发放', player.gold === gB && player.diamond === dB && player.bag.length === bB);

    // ---- 每日/每月重置 ----
    player.daily.date = '2000-01-01';
    player.daily.signedToday = true; player.daily.onlineSecToday = 999; player.daily.onlineClaimed = { 5: true };
    ensureDaily();
    assert('跨天重置 signedToday=false', player.daily.signedToday === false);
    assert('跨天重置 onlineSecToday=0', player.daily.onlineSecToday === 0);
    assert('跨天重置 storyClearToday=0', player.daily.storyClearToday === 0);
    assert('跨天重置 taskClaimed 清空', Object.keys(player.daily.taskClaimed || {}).length === 0);
    assert('跨天同月 保留 monthSignCount=20', player.daily.monthSignCount === 20);
    player.daily.month = '2000-01';
    ensureDaily();
    assert('跨月重置 monthSignCount=0', player.daily.monthSignCount === 0);
    assert('跨月重置 monthClaimed 清空', Object.keys(player.daily.monthClaimed).length === 0);

    // ---- 界面渲染 ----
    openDailyRewardScreen();
    const sc = document.getElementById('modal-box').innerHTML;
    assert('每日奖励界面含 返回主页(returnToHub)', sc.indexOf('returnToHub') !== -1);
    assert('每日奖励界面含 每日签到', sc.indexOf('每日签到') !== -1);
    assert('每日奖励界面含 在线时长', sc.indexOf('在线时长') !== -1);
    assert('每日奖励界面含 第三重日常任务', sc.indexOf('第三重') !== -1);

    // ---- 商店钻石消费 ----
    player.diamond = 1000; const bagS = player.bag.length; const learnS = player.learned.length;
    window.buyDiamondChest('equip');
    assert('钻石购买装备宝箱 扣200钻', player.diamond === 800);
    assert('钻石购买装备宝箱 进背包', player.bag.length === bagS + 1);
    window.buyDiamondChest('skill');
    assert('钻石购买功法宝箱 扣200钻(累计600)', player.diamond === 600);
    assert('钻石购买功法宝箱 入背包', player.bag.length === bagS + 2);
    player.diamond = 0; const d0 = player.diamond;
    window.buyDiamondChest('skill'); // 余额不足 → 不扣费
    assert('钻石不足时不扣费', player.diamond === d0);

    // ---- 存档持久化 ----
    player.diamond = 1234; player.daily.monthSignCount = 7; saveGame();
    const raw = JSON.parse(localStorage.getItem('wuxia_save'));
    assert('存档含 diamond 字段', typeof raw.diamond === 'number' && raw.diamond === 1234);
    assert('存档含 daily 字段', raw.daily && typeof raw.daily === 'object' && raw.daily.monthSignCount === 7);
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
