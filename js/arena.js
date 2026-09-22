/* arena.js — 神魔竞技场系统
 * 加载顺序：须在 battle.js / hub.js 之后 <script src> 引入（提供 makeArenaEnemy / openArenaScreen 等全局函数）。
 * 设计要点（来自用户需求，详见 design/神魔竞技场_系统设计.md）：
 *  - 榜单固定 1000 席，全部由「虚拟玩家」占据（按名次种子确定性生成，刷新/重开不变）。
 *  - 真实玩家初始排名 = 第 1001 名（榜外）；击败榜上对手即夺取其名次（两人互换）。
 *  - 每日 10 次挑战；每次展示 5 名对手：1 名排在自己之后 + 4 名排在自己之前（距离 ~10~50）。
 *  - 每日 23:00 按名次自动结算钻石；离线安全（次日首次进入补结算前一天，不丢奖励）。
 *  - 虚拟玩家参照 6 种玩家形象 × 6 种流派，武器/装备/功法/出手脚本各异，保证攻击模式不同。
 */
const ARENA_SIZE = 1000;              // 榜单总席位数
const ARENA_MAX_ATTEMPTS = 10;        // 每日挑战次数
const ARENA_SETTLE_HOUR = 23;         // 每日结算时点（23:00）
const ARENA_FACTOR_LO = 0.75;         // 榜尾强度系数（相对玩家战力）
const ARENA_FACTOR_HI = 2.60;         // 榜首强度系数（相对玩家战力）

// ====== 时间辅助（支持测试注入）======
function arenaNowMinutes() {
  // [TEST HOOK] 仅测试桩注入，生产环境不触发
  if (typeof window !== 'undefined' && window.__ARENA_TEST_MINUTES != null) return window.__ARENA_TEST_MINUTES;
  const d = new Date(); return d.getHours() * 60 + d.getMinutes();
}
function arenaTodayStr() {
  // [TEST HOOK] 仅测试桩注入，生产环境不触发
  if (typeof window !== 'undefined' && window.__ARENA_TEST_DATE) return window.__ARENA_TEST_DATE;
  const d = new Date(); const p = n => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
}
function arenaPrevDate(dateStr) {
  const parts = String(dateStr).split('-').map(Number);
  const d = new Date(parts[0], (parts[1] || 1) - 1, parts[2] || 1);
  d.setDate(d.getDate() - 1);
  const p = n => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
}

// ====== 每日数据初始化（跨天只重置次数，不清名次）======
function ensureArenaDaily() {
  const today = arenaTodayStr();
  if (!player.arena || player.arena.date !== today) {
    const prev = player.arena || {};
    const keepRank = (typeof prev.rank === 'number' && prev.rank >= 1 && prev.rank <= ARENA_SIZE + 1) ? prev.rank : (ARENA_SIZE + 1);
    player.arena = {
      date: today,
      startDate: prev.startDate || today,        // 竞技场启用的首日（用于避免新手首日误补结算）
      attempts: ARENA_MAX_ATTEMPTS,
      rank: keepRank,                            // 初始榜外（第 1001 名）；名次跨天累计不清零
      settledDate: prev.settledDate || null,     // 已结算的「名次日」
      lastReward: prev.lastReward || null,
      lastSwap: prev.lastSwap || null,
      _lastOpp: null,
    };
  }
  return player.arena;
}

// ====== 排名钻石档位（用户给定，自上而下判断）======
function arenaTierDiamond(rank) {
  rank = Math.round(rank);
  if (!rank || rank < 1 || rank > ARENA_SIZE) return 0;
  if (rank === 1) return 500;
  if (rank === 2) return 450;
  if (rank === 3) return 400;
  if (rank <= 9)   return 350;   // 4~9
  if (rank <= 19)  return 300;   // 10~19
  if (rank <= 49)  return 250;   // 20~49
  if (rank <= 99)  return 200;   // 50~99
  if (rank <= 199) return 150;   // 100~199
  if (rank <= 499) return 100;   // 200~499
  return 50;                     // 500~1000
}

// ====== 每日 23:00 结算（幂等；离线补结算前一天）======
function checkArenaSettlement() {
  ensureArenaDaily();
  const today = arenaTodayStr();
  const nowMin = arenaNowMinutes();
  let payDay = null;
  if (nowMin >= ARENA_SETTLE_HOUR * 60) {
    payDay = today;                                            // 已过 23:00 → 结算今天
  } else {
    const y = arenaPrevDate(today);                            // 未到 23:00 → 补结算昨天（须确实启用过）
    if (player.arena.startDate && player.arena.startDate <= y) payDay = y;
  }
  if (!payDay || payDay === player.arena.settledDate) return;
  if (player.arena.rank <= ARENA_SIZE) {
    const amt = arenaTierDiamond(player.arena.rank);
    if (amt > 0) {
      if (typeof dailyGrant === 'function') dailyGrant('diamond', amt);
      player.arena.lastReward = { date: payDay, rank: player.arena.rank, amt: amt };
      if (typeof showToast === 'function') showToast('竞技场结算：第 ' + player.arena.rank + ' 名，+' + amt + ' 钻石');
    }
  }
  player.arena.settledDate = payDay;
  if (typeof saveGame === 'function') saveGame();
}

// ====== 虚拟玩家：六形象 × 六流派（名次种子确定性生成）======
const ARENA_AVATARS = ['m1', 'm2', 'm3', 'f1', 'f2', 'f3'];   // 与 create.js / avatars.js 一致
const ARENA_SCHOOLS = [
  { key: 'sword',  cn: '剑修', weapon: '青锋剑' },
  { key: 'blade',  cn: '刀客', weapon: '雁翎刀' },
  { key: 'spear',  cn: '枪神', weapon: '寒铁枪' },
  { key: 'fist',   cn: '拳师', weapon: '赤手'   },
  { key: 'magic',  cn: '法修', weapon: '拂尘'   },
  { key: 'poison', cn: '毒修', weapon: '毒蒺藜' },
];
const ARENA_SURNAMES = ['叶', '萧', '慕容', '百里', '南宫', '司空', '上官', '独孤', '东方', '西门', '轩辕', '欧阳'];
const ARENA_GIVEN   = ['惊鸿', '无尘', '破军', '听雪', '凌霄', '寒山', '问天', '逐月', '御风', '苍冥', '孤鸿', '未名'];

function arenaHash(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function arenaRng(seed) { let a = seed >>> 0; return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

// 名次 → 强度系数：榜尾≈0.75×玩家战力，榜首≈2.6×（略凹，越靠前越陡）
function arenaRankFactor(rank) {
  const t = (ARENA_SIZE - rank) / (ARENA_SIZE - 1);            // rank=1000 → 0；rank=1 → 1
  const tt = Math.max(0, Math.min(1, t));
  return ARENA_FACTOR_LO + (ARENA_FACTOR_HI - ARENA_FACTOR_LO) * Math.pow(tt, 1.15);
}

// 六流派各一套 skills + 10 回合固定出手脚本（effect 复用战斗引擎 applySkill 结构）
function buildArenaSkills(schoolIdx, atk, spi) {
  const r = Math.round;
  if (schoolIdx === 0) { // 剑修 — 均衡迅捷
    return {
      skills: [
        { name: '剑气斩', type: 'phys', mult: 2.2, cost: 10 },
        { name: '御剑护盾', type: 'phys', mult: 0.3, cost: 10, effect: { kind: 'shield', pct: 0.30, dur: 2 } },
        { name: '破锋式', type: 'phys', mult: 0.8, cost: 10, effect: { kind: 'debuff', stat: 'def', amt: 0.35, dur: 3 } },
        { name: '万剑归宗', type: 'phys', mult: 6, cost: 20, effect: { kind: 'dmg', type: 'phys', mult: 6 }, ult: true },
      ],
      script: ['剑气斩','万剑归宗','剑气斩','破锋式','万剑归宗','剑气斩','御剑护盾','万剑归宗','剑气斩','万剑归宗'],
    };
  }
  if (schoolIdx === 1) { // 刀客 — 爆发吸血
    return {
      skills: [
        { name: '蓄力斩', type: 'phys', mult: 1.2, cost: 10 },
        { name: '血刃回锋', type: 'phys', mult: 1.0, cost: 12, effect: { kind: 'dmg', type: 'phys', mult: 1.0, lifesteal: 1.2 } },
        { name: '狂刀诀', type: 'phys', mult: 0.4, cost: 8, effect: { kind: 'buff', stat: 'atk', amt: 0.8, dur: 3 } },
        { name: '裂天斩', type: 'phys', mult: 11, cost: 22, effect: { kind: 'dmg', type: 'phys', mult: 11, lifesteal: 0.4 }, ult: true },
      ],
      script: ['狂刀诀','蓄力斩','裂天斩','裂天斩','血刃回锋','裂天斩','蓄力斩','裂天斩','血刃回锋','裂天斩'],
    };
  }
  if (schoolIdx === 2) { // 枪神 — 强攻破甲
    return {
      skills: [
        { name: '寒星突刺', type: 'phys', mult: 2.6, cost: 10 },
        { name: '破军枪', type: 'phys', mult: 1.0, cost: 10, effect: { kind: 'debuff', stat: 'def', amt: 0.4, dur: 3 } },
        { name: '游龙连刺', type: 'phys', mult: 3.2, cost: 14 },
        { name: '擎天一击', type: 'phys', mult: 9.5, cost: 20, effect: { kind: 'dmg', type: 'phys', mult: 9.5 }, ult: true },
      ],
      script: ['寒星突刺','擎天一击','游龙连刺','破军枪','擎天一击','寒星突刺','游龙连刺','擎天一击','破军枪','擎天一击'],
    };
  }
  if (schoolIdx === 3) { // 拳师 — 刚体硬控
    return {
      skills: [
        { name: '崩山拳', type: 'phys', mult: 2.8, cost: 12 },
        { name: '金刚体', type: 'phys', mult: 0.2, cost: 8, effect: { kind: 'buff', stat: 'def', amt: 1.0, dur: 3 } },
        { name: '震岳击', type: 'phys', mult: 1.2, cost: 12, effect: { kind: 'stun', dur: 2 } },
        { name: '八荒破', type: 'phys', mult: 8.5, cost: 20, effect: { kind: 'dmg', type: 'phys', mult: 8.5 }, ult: true },
      ],
      script: ['金刚体','崩山拳','震岳击','八荒破','崩山拳','八荒破','震岳击','八荒破','崩山拳','八荒破'],
    };
  }
  if (schoolIdx === 4) { // 法修 — 法术控场 + 灼烧
    return {
      skills: [
        { name: '雷引术', type: 'spirit', mult: 2.4, cost: 12 },
        { name: '玄冰封', type: 'spirit', mult: 0.9, cost: 12, effect: { kind: 'stun', dur: 2 } },
        { name: '灼魂咒', type: 'spirit', mult: 0.7, cost: 10, effect: { kind: 'debuff', stat: 'burn', amt: r(spi * 1.8), dur: 5 } },
        { name: '九霄雷罚', type: 'spirit', mult: 9, cost: 22, effect: { kind: 'dmg', type: 'spirit', mult: 9 }, ult: true },
      ],
      script: ['灼魂咒','雷引术','玄冰封','九霄雷罚','雷引术','九霄雷罚','雷引术','九霄雷罚','玄冰封','九霄雷罚'],
    };
  }
  // 5 毒修 — 蚀骨中毒 + 减益消耗
  return {
    skills: [
      { name: '蚀骨毒', type: 'spirit', mult: 0.8, cost: 10, effect: { kind: 'poison', dmg: r(spi * 2.0), dur: 5 } },
      { name: '蛊惑术', type: 'spirit', mult: 0.6, cost: 10, effect: { kind: 'debuff', stat: 'atk', amt: 0.4, dur: 3 } },
      { name: '万毒噬', type: 'spirit', mult: 1.6, cost: 12 },
      { name: '毒煞归宗', type: 'spirit', mult: 7, cost: 20, effect: { kind: 'dmg', type: 'spirit', mult: 7, lifesteal: 0.5 }, ult: true },
    ],
    script: ['蚀骨毒','蛊惑术','万毒噬','毒煞归宗','万毒噬','毒煞归宗','蚀骨毒','毒煞归宗','蛊惑术','毒煞归宗'],
  };
}

// 确定性生成某个名次的虚拟玩家（属性以玩家当前战力为基准 × 名次系数 × 种子抖动）
function arenaVirtual(rank) {
  rank = Math.max(1, Math.min(ARENA_SIZE, Math.round(rank) || 1));
  const seed = arenaHash('arena#' + rank);
  const rng = arenaRng(seed);
  const avatarId = ARENA_AVATARS[seed % ARENA_AVATARS.length];
  const schoolIdx = Math.floor(seed / 6) % ARENA_SCHOOLS.length;
  const school = ARENA_SCHOOLS[schoolIdx];
  const name = ARENA_SURNAMES[Math.floor(rng() * ARENA_SURNAMES.length)] + ARENA_GIVEN[Math.floor(rng() * ARENA_GIVEN.length)] + '·' + school.cn;
  const f = arenaRankFactor(rank);
  const P = player || {};
  const jit = () => 0.90 + rng() * 0.20;
  const maxHp  = Math.round((P.maxHp  || 1200) * f * jit());
  const maxMp  = Math.round((P.maxMp  || 600)  * f * jit());
  const atk    = Math.round((P.atk    || 120)  * f * jit());
  const spiAtk = Math.round((P.spiAtk || 120)  * f * jit());
  const def    = Math.round((P.def    || 60)   * f * jit());
  const spiDef = Math.round((P.spiDef || 60)   * f * jit());
  const init   = Math.round((P.init   || 60)   * f * (0.9 + rng() * 0.2));
  const spd    = Math.round((P.spd    || 20)   * (0.9 + rng() * 0.2));
  const eva    = Math.min(0.6, ((P.eva || 0.1) + 0.02) * (0.8 + rng() * 0.4));
  const built = buildArenaSkills(schoolIdx, atk, spiAtk);
  const ult = built.skills.find(s => s.ult) || built.skills[0];
  return {
    name: name, isEnemy: true, avatarId: avatarId, school: school.key, schoolCn: school.cn, weapon: school.weapon,
    rank: rank,
    maxHp: maxHp, hp: maxHp, maxMp: maxMp, mp: maxMp,
    atk: atk, def: def, spd: spd, init: init, eva: eva, spiAtk: spiAtk, spiDef: spiDef,
    luck: 0, potions: 0, defending: false, extraActions: 0,
    buffs: [], debuffs: [], shield: null, stun: 0, poison: null,
    skills: built.skills, skill: ult, _script: built.script, _turn: 0,
    _x: 490, _y: 160,
  };
}
// battle.js 按此函数名构造竞技场敌人
function makeArenaEnemy(rank) { return arenaVirtual(rank); }

// ====== 挑战对手池（5 名：1 后 + 4 前；榜外/榜首/榜尾边界降级）======
function arenaOpponents() {
  ensureArenaDaily();
  const my = player.arena.rank;
  const ranks = []; const used = {};
  const add = r => {
    r = Math.max(1, Math.min(ARENA_SIZE, Math.round(r)));
    if (r === my || used[r]) return false;
    used[r] = 1; ranks.push(r); return true;
  };
  const addAhead = () => {                 // 更靠前（名次数字更小），距 10~50
    for (let i = 0; i < 200; i++) { if (add(my - (10 + Math.floor(Math.random() * 41)))) return; }
    for (let d = 1; d <= 80; d++) { if (add(my - d)) return; }
  };
  const addBehind = () => {                // 更靠后（名次数字更大），距 10~50
    for (let i = 0; i < 200; i++) { if (add(my + (10 + Math.floor(Math.random() * 41)))) return; }
    for (let d = 1; d <= 80; d++) { if (add(my + d)) return; }
  };
  const addTail = () => {                  // 榜外专用：榜尾 951~1000
    for (let i = 0; i < 200; i++) { if (add(951 + Math.floor(Math.random() * 50))) return; }
  };
  if (my > ARENA_SIZE)            { for (let i = 0; i < 5; i++) addTail(); }     // 榜外：全榜尾
  else if (my === 1)              { for (let i = 0; i < 5; i++) addBehind(); }   // 已登顶：全在其后
  else if (my >= ARENA_SIZE)      { for (let i = 0; i < 5; i++) addAhead(); }    // 榜尾：无"之后"，全在前
  else                            { for (let i = 0; i < 4; i++) addAhead(); addBehind(); } // 常规：4 前 + 1 后
  let guard = 0;                                                                  // 极端边界兜底补满 5
  while (ranks.length < 5 && guard++ < 800) add(1 + Math.floor(Math.random() * ARENA_SIZE));
  return ranks.map(r => arenaVirtual(r));
}

// ====== 挑战入口 ======
function startArenaBattle(rank) {
  ensureArenaDaily();
  checkArenaSettlement();
  rank = Math.round(rank);
  if (!(rank >= 1 && rank <= ARENA_SIZE)) { openArenaScreen(); return; }
  if (player.arena.attempts <= 0) {
    if (typeof showToast === 'function') showToast('今日挑战次数已用完，明日 0 点重置');
    openArenaScreen(); return;
  }
  player.arena.attempts -= 1;
  player.arena._lastOpp = rank;
  if (typeof saveGame === 'function') saveGame();
  closeModal();
  if (window.HUB) window.HUB.hide();
  startBattle({ id: -3, _arenaRank: rank }, 'arena');
}

// 单场结算：胜则夺取对手名次（互换）；负仅扣次数，名次不变
function endArenaBattle(win) {
  awaitingInput = false;
  if (typeof setButtons === 'function') setButtons(false);
  ensureArenaDaily();
  const oppRank = player.arena._lastOpp;
  const oldRank = player.arena.rank;
  let msg;
  if (win && oppRank) {
    player.arena.rank = oppRank;
    player.arena.lastSwap = { from: oldRank, to: oppRank, date: arenaTodayStr() };
    msg = '★ 胜！夺取第 ' + oppRank + ' 名（原第 ' + (oldRank > ARENA_SIZE ? '榜外' : oldRank) + ' 名）';
  } else {
    msg = '败北……名次不变（挑战次数 -1）';
  }
  player.arena._lastOpp = null;
  if (typeof saveGame === 'function') saveGame();
  state = win ? 'win' : 'lose';
  toast = msg;
  openArenaResult(win, oppRank);
}

// ====== 界面 ======
function arenaBoardPreview() {
  ensureArenaDaily();
  const my = player.arena.rank;
  const onBoard = my <= ARENA_SIZE;
  let rows = '';
  for (let r = 1; r <= 10; r++) {
    const v = arenaVirtual(r);
    const me = onBoard && my === r;
    rows += `<div class="bag-item" style="padding:5px 8px"><div class="bag-info">`
      + `<span class="bag-name" style="${me ? 'color:#639922;font-weight:700' : ''}">${r}. ${esc(me ? (player.name + '（你）') : v.name)}</span>`
      + `<span class="equip-bonus">${esc(v.schoolCn)}</span></div></div>`;
  }
  let html = `<div class="equip-sec-title">竞技榜 · 前十</div><div class="bag-list">${rows}</div>`;
  if (onBoard && my > 10) {
    const mv = arenaVirtual(my);
    html += `<div class="bag-item" style="padding:5px 8px;margin-top:4px"><div class="bag-info">`
      + `<span class="bag-name" style="color:#639922;font-weight:700">${my}. ${esc(player.name)}（你）</span>`
      + `<span class="equip-bonus">${esc(mv.schoolCn)} · 当前排名</span></div></div>`;
  }
  return html;
}

function openArenaScreen() {
  ensureArenaDaily();
  checkArenaSettlement();
  const my = player.arena.rank;
  const onBoard = my <= ARENA_SIZE;
  const remain = player.arena.attempts;
  const tier = onBoard ? arenaTierDiamond(my) : 0;
  let html = `<div class="hub-modal-title"><img src="assets/icons/icon_arena.png?v=12" style="width:22px;height:22px;vertical-align:-4px;margin-right:6px" alt=""><h3 style="margin:0">神魔竞技场</h3></div>`;
  html += `<p style="font-size:12px;color:rgba(241,239,232,.7);margin:4px 0 8px">1000 名虚拟高手占据榜单前 1000 席，击败对手即可夺取其名次。每日 ${ARENA_MAX_ATTEMPTS} 次挑战，每天 <b style="color:#D4A843">${ARENA_SETTLE_HOUR}:00</b> 按名次自动结算钻石。</p>`;
  html += `<div class="bag-item" style="align-items:center"><div class="bag-info">`
    + `<span class="bag-name" style="color:#D4A843">我的名次：${onBoard ? ('第 ' + my + ' 名') : '榜外（第 1001）'}</span>`
    + `<span class="equip-bonus">剩余挑战 ${remain}/${ARENA_MAX_ATTEMPTS} 次 ｜ 今日结算档位：${tier > 0 ? (tier + ' 钻石') : '未上榜（无奖励）'}</span></div></div>`;

  if (remain <= 0) {
    html += `<div class="equip-sec-title">挑战次数已用完</div>`
      + `<p style="font-size:12px;color:rgba(241,239,232,.6);margin:4px 0">今日 ${ARENA_MAX_ATTEMPTS} 次挑战已用完，明日 0 点重置。${ARENA_SETTLE_HOUR}:00 后按当前名次结算钻石。</p>`;
  } else {
    const opps = arenaOpponents();
    const hint = onBoard
      ? (my === 1 ? '你已登顶 · 对手皆在你之后' : '1 名在你之后 · 4 名在你之前')
      : '你尚在榜外 · 全为榜尾对手';
    html += `<div class="equip-sec-title">可挑战对手（${opps.length}）　<span style="font-size:11px;color:rgba(241,239,232,.55);font-weight:400">${hint}</span></div><div class="bag-list">`;
    opps.forEach(o => {
      const av = (typeof AVATAR_MAP !== 'undefined' && AVATAR_MAP[o.avatarId]) ? AVATAR_MAP[o.avatarId].img : '';
      const dir = onBoard ? (o.rank > my ? '在你之后' : '在你之前') : '榜尾';
      html += `<div class="bag-item" style="align-items:center">`
        + `<img src="${av}" style="width:34px;height:34px;border-radius:8px;margin-right:8px;border:1px solid rgba(212,168,67,.35);object-fit:cover" alt="">`
        + `<div class="bag-info"><span class="bag-name">第 ${o.rank} 名 · ${esc(o.name)}</span>`
        + `<span class="equip-bonus">${esc(o.schoolCn)} · ${esc(o.weapon)} ｜ ${dir}</span></div>`
        + `<button class="equip-btn" onclick="startArenaBattle(${o.rank})">挑战</button></div>`;
    });
    html += `</div>`;
  }
  html += arenaBoardPreview();
  html += `<button class="btn-full" onclick="returnToHub()" style="margin-top:14px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.12)">返回主页</button>`;
  openModal(html);
}

function openArenaResult(win, oppRank) {
  ensureArenaDaily();
  const my = player.arena.rank;
  const onBoard = my <= ARENA_SIZE;
  const remain = player.arena.attempts;
  let html = `<div class="hub-modal-title"><img src="assets/icons/icon_arena.png?v=12" style="width:22px;height:22px;vertical-align:-4px;margin-right:6px" alt=""><h3 style="margin:0">神魔竞技场 · 战果</h3></div>`;
  if (win) html += `<p style="margin:6px 0;font-size:15px;font-weight:700;color:#D4A843">★ 胜利！你已夺取第 ${my} 名</p>`;
  else     html += `<p style="margin:6px 0;font-size:15px;font-weight:700;color:#E87B7B">败北 — 名次不变，再战可期</p>`;
  html += `<p style="margin:2px 0;font-size:12px;color:rgba(241,239,232,.7)">当前名次：<b style="color:#D4A843">${onBoard ? ('第 ' + my + ' 名') : '榜外（第 1001）'}</b> ｜ 剩余挑战：<b>${remain}</b> 次</p>`;
  html += `<p style="margin:2px 0;font-size:12px;color:rgba(241,239,232,.6)">今日 ${ARENA_SETTLE_HOUR}:00 结算档位：<b style="color:#D4A843">${onBoard ? (arenaTierDiamond(my) + ' 钻石') : '未上榜（无奖励）'}</b></p>`;
  let btns = '';
  if (remain > 0) btns += `<button class="equip-btn" onclick="openArenaScreen()">继续挑战</button>`;
  btns += `<button class="equip-btn" onclick="openArenaScreen()">返回榜单</button>`;
  btns += `<button class="equip-btn" onclick="returnToHub()">返回主页</button>`;
  html += `<div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap">${btns}</div>`;
  openModal(html);
}

// ====== 自动结算心跳（仅挂一次；在线跨过 23:00 时自动发放）======
(function arenaAutoTick() {
  try {
    if (typeof window !== 'undefined' && typeof setInterval === 'function' && !window.__ARENA_TICK) {
      window.__ARENA_TICK = setInterval(function () {
        try { if (typeof player !== 'undefined' && player && player.arena) checkArenaSettlement(); } catch (e) {}
      }, 60000);
    }
  } catch (e) {}
})();

window.makeArenaEnemy = makeArenaEnemy;
window.ensureArenaDaily = ensureArenaDaily;
window.checkArenaSettlement = checkArenaSettlement;
window.arenaTierDiamond = arenaTierDiamond;
window.arenaVirtual = arenaVirtual;
window.arenaOpponents = arenaOpponents;
window.startArenaBattle = startArenaBattle;
window.endArenaBattle = endArenaBattle;
window.openArenaScreen = openArenaScreen;
window.openArenaResult = openArenaResult;
