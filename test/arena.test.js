/* 无头回归测试：神魔竞技场系统（js/arena.js）
 *  1) 每日数据初始化：初始榜外第 1001 名、10 次挑战、跨天只重置次数不清名次
 *  2) 排名钻石档位表（用户给定 10 档）逐档校验
 *  3) 虚拟玩家确定性（同名次两次生成完全一致）+ 六形象六流派差异化
 *  4) 对手池 5 名：常规 1 后 + 4 前；榜外/榜首/榜尾边界降级
 *  5) 挑战消耗次数、胜则夺取名次（互换）
 *  6) 每日 23:00 结算发钻、幂等、榜外不发、跨天补结算
 * 运行：node test/arena.test.js
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const FILES = [
  'config.js', 'cultivation.js', 'js/core.js', 'js/equip_db.js', 'js/player.js', 'js/skills-data.js',
  'js/story-data.js', 'js/battle.js', 'js/hub.js', 'js/create.js', 'js/story.js',
  'js/worldboss.js', 'js/arena.js', 'js/daily.js', 'js/codex.js', 'js/main.js',
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
    const _hubHtml = document.getElementById("hub-float-icons").innerHTML || "";
    assert("主页菜单渲染含「神魔竞技场」", _hubHtml.indexOf("神魔竞技场") !== -1);
    assert("主页菜单渲染含 icon_arena.png", _hubHtml.indexOf("icon_arena.png") !== -1);
    assert("主页菜单图标数=12(data-hub)", (_hubHtml.match(/data-hub=/g) || []).length === 12);
    const TODAY = '2026-09-22';
    window.__ARENA_TEST_DATE = TODAY;
    window.__ARENA_TEST_MINUTES = 10 * 60;   // 默认 10:00（未到结算点）

    // ===== 0) 全局函数存在 =====
    assert('openArenaScreen 存在', typeof openArenaScreen === 'function');
    assert('makeArenaEnemy 存在(battle.js 依赖)', typeof makeArenaEnemy === 'function');
    assert('arenaTierDiamond 存在', typeof arenaTierDiamond === 'function');
    assert('ensureArenaDaily 存在', typeof ensureArenaDaily === 'function');
    assert('checkArenaSettlement 存在', typeof checkArenaSettlement === 'function');
    assert('startArenaBattle 存在', typeof startArenaBattle === 'function');
    assert('endArenaBattle 存在', typeof endArenaBattle === 'function');
    assert('window.openArenaScreen 已挂载', typeof window.openArenaScreen === 'function');

    // ===== 1) 每日初始化 =====
    player.arena = null;
    const A = ensureArenaDaily();
    assert('初始名次=第1001名(榜外)', A.rank === 1001);
    assert('初始挑战次数=10', A.attempts === 10);
    assert('记录启用首日 startDate', A.startDate === TODAY);
    assert('初始 settledDate=null', A.settledDate === null);
    // 跨天：只重置次数，保留名次
    player.arena = { date: '2026-09-21', startDate: '2026-09-21', attempts: 3, rank: 260, settledDate: '2026-09-21', lastReward: null, lastSwap: null };
    const B = ensureArenaDaily();
    assert('跨天重置次数为10', B.attempts === 10);
    assert('跨天保留名次(260)', B.rank === 260);
    assert('跨天保留 settledDate', B.settledDate === '2026-09-21');

    // ===== 2) 钻石档位表 =====
    const tierCases = [[1,500],[2,450],[3,400],[4,350],[9,350],[10,300],[19,300],[20,250],[49,250],
                       [50,200],[99,200],[100,150],[199,150],[200,100],[499,100],[500,50],[1000,50],[1001,0],[0,0]];
    let tierOK = true, tierBad = '';
    tierCases.forEach(function(c){ const got = arenaTierDiamond(c[0]); if (got !== c[1]) { tierOK = false; tierBad += ' rank'+c[0]+'->'+got+'(期望'+c[1]+')'; } });
    assert('钻石档位表全部正确' + tierBad, tierOK);

    // ===== 3) 虚拟玩家确定性 + 差异化 =====
    const v1 = arenaVirtual(327), v2 = arenaVirtual(327);
    assert('同名次两次生成 名字一致', v1.name === v2.name);
    assert('同名次两次生成 属性一致', v1.maxHp === v2.maxHp && v1.atk === v2.atk);
    assert('同名次两次生成 形象一致', v1.avatarId === v2.avatarId);
    assert('虚拟玩家 rank 正确', v1.rank === 327);
    assert('虚拟玩家 有立绘avatarId', ['m1','m2','m3','f1','f2','f3'].indexOf(v1.avatarId) !== -1);
    assert('虚拟玩家 有流派与武器', !!v1.schoolCn && !!v1.weapon);
    assert('虚拟玩家 有功法组合', v1.skills && v1.skills.length > 0);
    assert('虚拟玩家 出手脚本=10回合', v1._script && v1._script.length === 10);
    // 脚本引用的技能名必须都在 skills 里（否则会退化为普攻）
    let scriptOK = true;
    for (let i = 0; i < v1._script.length; i++) { if (!v1.skills.some(s => s.name === v1._script[i])) scriptOK = false; }
    assert('出手脚本技能名均存在于技能表', scriptOK);
    // 形象/流派/名字 差异化
    const avSet = {}, scSet = {}, nmSet = {};
    for (let r = 1; r <= 60; r++) { const v = arenaVirtual(r); avSet[v.avatarId] = 1; scSet[v.school] = 1; nmSet[v.name] = 1; }
    assert('六形象均有分布(>1种)', Object.keys(avSet).length > 1);
    assert('六流派均有分布(>1种)', Object.keys(scSet).length > 1);
    assert('名字不单一(>10种)', Object.keys(nmSet).length > 10);

    // ===== 4) 对手池 =====
    player.arena = { date: TODAY, startDate: TODAY, attempts: 10, rank: 300, settledDate: TODAY, lastReward: null, lastSwap: null };
    const opp = arenaOpponents();
    assert('常规 对手数=5', opp.length === 5);
    const behind = opp.filter(o => o.rank > 300).length;
    const ahead  = opp.filter(o => o.rank < 300).length;
    assert('常规 恰好1名在自己之后', behind === 1);
    assert('常规 恰好4名在自己之前', ahead === 4);
    assert('常规 无自己(不自挑战)', opp.every(o => o.rank !== 300));
    assert('常规 对手名次均在榜内1..1000', opp.every(o => o.rank >= 1 && o.rank <= 1000));
    // 榜外：全为榜尾 951~1000
    player.arena.rank = 1001;
    const oppOff = arenaOpponents();
    assert('榜外 对手数=5', oppOff.length === 5);
    assert('榜外 全为榜尾(951..1000)', oppOff.every(o => o.rank >= 951 && o.rank <= 1000));
    // 榜首：全在其后
    player.arena.rank = 1;
    const oppTop = arenaOpponents();
    assert('榜首 对手数=5', oppTop.length === 5);
    assert('榜首 全在自己之后(rank>1)', oppTop.every(o => o.rank > 1));
    // 榜尾 rank=1000：无"之后"，全在前
    player.arena.rank = 1000;
    const oppBot = arenaOpponents();
    assert('榜尾 对手数=5', oppBot.length === 5);
    assert('榜尾 全在自己之前(rank<1000)', oppBot.every(o => o.rank < 1000));

    // ===== 5) 挑战消耗次数 + 夺取名次 =====
    player.arena = { date: TODAY, startDate: TODAY, attempts: 10, rank: 1001, settledDate: TODAY, lastReward: null, lastSwap: null };
    player.maxHp = 1000; player.atk = 200; player.def = 100; player.maxMp = 500; player.spiAtk = 200; player.spiDef = 100; player.init = 50; player.eva = 0.1;
    startArenaBattle(980);
    assert('挑战后 次数 10->9', player.arena.attempts === 9);
    assert('挑战后 记录 _lastOpp=980', player.arena._lastOpp === 980);
    assert('挑战后 battle.mode===arena', typeof battle === 'object' && battle && battle.mode === 'arena');
    assert('挑战后 敌方 rank=980', battle && battle.enemy && battle.enemy.rank === 980);
    // 胜利 → 夺取名次（榜外1001 → 980）
    endArenaBattle(true);
    assert('胜利后 夺取对手名次(rank=980)', player.arena.rank === 980);
    assert('胜利后 state=win', state === 'win');
    // 失败 → 名次不变
    player.arena.rank = 500; player.arena._lastOpp = 460;
    endArenaBattle(false);
    assert('失败后 名次不变(500)', player.arena.rank === 500);

    // ===== 6) 23:00 结算 =====
    // 已到 23:00，榜内 rank=250 → +100 钻石
    window.__ARENA_TEST_DATE = TODAY; window.__ARENA_TEST_MINUTES = 23 * 60 + 5;
    player.arena = { date: TODAY, startDate: '2026-09-01', attempts: 10, rank: 250, settledDate: null, lastReward: null, lastSwap: null };
    player.diamond = 0;
    checkArenaSettlement();
    assert('23:00结算 rank250 -> +100钻石', player.diamond === 100);
    assert('结算后 settledDate=今天', player.arena.settledDate === TODAY);
    checkArenaSettlement();
    assert('重复结算不再发钻(幂等)', player.diamond === 100);
    // 榜外不发
    player.arena = { date: TODAY, startDate: '2026-09-01', attempts: 10, rank: 1001, settledDate: null, lastReward: null, lastSwap: null };
    player.diamond = 0;
    checkArenaSettlement();
    assert('榜外结算不发钻', player.diamond === 0);
    assert('榜外结算仍标记 settledDate', player.arena.settledDate === TODAY);
    // 新手首日(未到23:00) 不误补结算
    player.arena = { date: TODAY, startDate: TODAY, attempts: 10, rank: 50, settledDate: null, lastReward: null, lastSwap: null };
    player.diamond = 0; window.__ARENA_TEST_MINUTES = 10 * 60;
    checkArenaSettlement();
    assert('新手首日未到结算点 不发钻', player.diamond === 0);
    // 次日早上 补结算前一天
    window.__ARENA_TEST_DATE = '2026-09-23'; window.__ARENA_TEST_MINUTES = 9 * 60;
    player.arena = { date: '2026-09-23', startDate: '2026-09-01', attempts: 10, rank: 50, settledDate: '2026-09-21', lastReward: null, lastSwap: null };
    player.diamond = 0;
    checkArenaSettlement();
    assert('次日早上补结算前一天 rank50 -> +200钻石', player.diamond === 200);
    assert('补结算后 settledDate=昨天', player.arena.settledDate === '2026-09-22');

    // ===== 7) battle.js 静态校验 =====
    var __c = __CODE;
    assert('battle.js 含 arena 分支', __c.indexOf("mode === 'arena'") !== -1);
    assert('battle.js 引用 makeArenaEnemy', __c.indexOf('makeArenaEnemy') !== -1);
    assert('battle.js 含 endArenaBattle 调用', __c.indexOf('endArenaBattle') !== -1);
    assert('hub.js 含 go_arena 分发', __c.indexOf('go_arena') !== -1);
    assert('core.js 存档白名单含 arena', __c.indexOf('arena: player.arena') !== -1);
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
