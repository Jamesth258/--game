/* daily.js — 每日奖励系统（每日签到 + 在线时长奖励）及钻石货币入口
 * 设计见 design/每日奖励系统设计.md
 * 加载顺序：须在 js/worldboss.js 之后（复用其 openSkillChest/openEquipChest/openStoneChest/openExpChest）、
 *           js/main.js 之前（main.js 末尾会调用 initDaily() 启动计时）。
 *
 * 设计要点（来自需求）：
 *   第一重 · 每日签到
 *     - 签到即送灵石 = 当前玩家「境界等级」× 100
 *     - 每月累计签到 3 次 → 功法抽奖宝箱 ×1
 *     - 每月累计签到 5 次 → 装备抽奖宝箱 ×1
 *     - 每月累计签到 7 次 → 商城钻石 ×1000
 *     - 每月累计签到 14 次 → 商城钻石 ×2000
 *     - 每月累计签到 20 次 → 装备抽奖宝箱 ×2 + 功法抽奖宝箱 ×2
 *   第二重 · 在线时长奖励（达成即自动发放，无需手动领取）
 *     - 当日在线满 5 分钟  → 10 钻石
 *     - 当日在线满 15 分钟 → 20 钻石
 *     - 当日在线满 30 分钟 → 装备抽奖宝箱 ×1
 *     - 当日在线满 60 分钟 → 经验宝箱 ×1 + 灵石宝箱 ×2 + 30 钻石（8/22 压被动收入：5→2）
 *   第三重 · 日常任务奖励（通关副本 / 挑战世界BOSS 即累计，达成即自动发放）
 *     - 每日通关副本关卡 10 个      → 500 灵石
 *     - 每日挑战世界BOSS 5 次       → 500 灵石
 *     - 每日挑战世界BOSS 10 次      → 50 钻石 + 灵石宝箱 ×1
 *     - 每日挑战世界BOSS 15 次      → 100 钻石 + 灵石宝箱 ×5
 *     - 每日挑战世界BOSS 20 次      → 经验宝箱 ×10
 *   钻石：专用于商城消费的货币（见 hub.js 商店「钻石专区」）。
 */

// ===== 工具 =====
function dailyTodayStr() {
  const d = new Date();
  const p = n => (n < 10 ? '0' + n : '' + n);
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
}
// 当前玩家「境界等级」：取修炼体系扁平小阶序号 +1
//   （开局炼气一重天 = 第 1 阶 → 等级 1 → 签到 100 灵石；满级宇宙国主 → 总阶数 → 数千灵石）
//   若想改用「大境界序号」(realmIndex+1)，只需把此处返回值改为 CULTIVATION.realmFromXp(player.xp).realmIndex + 1。
function realmLevel() {
  return (typeof CULTIVATION !== 'undefined') ? CULTIVATION.realmFromXp(player.xp).globalIndex + 1 : 1;
}
function dailyFmtDur(sec) {
  sec = Math.max(0, Math.floor(sec || 0));
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  if (h > 0) return h + '时' + m + '分';
  if (m > 0) return m + '分' + (s ? s + '秒' : '');
  return s + '秒';
}

// ===== 配置 =====
const DAILY_SIGN_MILESTONES = [
  { count: 3,  desc: '功法抽奖宝箱 ×1',                 kind: 'skill' },
  { count: 5,  desc: '装备抽奖宝箱 ×1',                 kind: 'equip' },
  { count: 7,  desc: '商城钻石 ×1000',                   kind: 'diamond', amount: 1000 },
  { count: 14, desc: '商城钻石 ×2000',                   kind: 'diamond', amount: 2000 },
  { count: 20, desc: '装备抽奖宝箱 ×2 + 功法抽奖宝箱 ×2', kind: 'double' },
];
const DAILY_ONLINE_MILESTONES = [
  { min: 5,  desc: '10 钻石',                                 kind: 'diamond', amount: 10 },
  { min: 15, desc: '20 钻石',                                 kind: 'diamond', amount: 20 },
  { min: 30, desc: '装备抽奖宝箱 ×1',                         kind: 'equip' },
  { min: 60, desc: '经验宝箱 ×1 + 灵石宝箱 ×2 + 30 钻石',      kind: 'mixed' },
];
// 第三重 · 日常任务奖励里程碑
//   metric: 'story' = 当日通关副本关卡数；'boss' = 当日挑战世界BOSS次数
//   rewards: 奖励清单（gold/diamond/stone/exp/skill/equip，宝箱以道具入背包手动开启）
const DAILY_TASK_MILESTONES = [
  { metric: 'story', count: 10, desc: '500 灵石',             rewards: [{ kind: 'gold', amount: 500 }] },
  { metric: 'boss',  count: 5,  desc: '500 灵石',             rewards: [{ kind: 'gold', amount: 500 }] },
  { metric: 'boss',  count: 10, desc: '50 钻石 + 灵石宝箱 ×1',  rewards: [{ kind: 'diamond', amount: 50 }, { kind: 'stone', count: 1 }] },
  { metric: 'boss',  count: 15, desc: '100 钻石 + 灵石宝箱 ×5', rewards: [{ kind: 'diamond', amount: 100 }, { kind: 'stone', count: 5 }] },
  { metric: 'boss',  count: 20, desc: '经验宝箱 ×10',          rewards: [{ kind: 'exp', count: 10 }] },
];

// ===== 数据初始化与每日/每月重置 =====
function ensureDaily() {
  const today = dailyTodayStr();
  const month = today.slice(0, 7);
  let d = player.daily;
  if (!d || typeof d !== 'object') {
    d = { date: today, month, signedToday: false, monthSignCount: 0, monthClaimed: {}, onlineSecToday: 0, onlineClaimed: {}, storyClearToday: 0, bossChalToday: 0, taskClaimed: {}, shopRefreshCount: 0 };
    player.daily = d;
    return d;
  }
  if (d.date !== today) {
    // 跨天：重置「当日」状态；若同时跨月，一并重置「当月」状态
    d.date = today;
    d.signedToday = false;
    d.onlineSecToday = 0;
    d.onlineClaimed = {};
    d.storyClearToday = 0;
    d.bossChalToday = 0;
    d.taskClaimed = {};
    d.shopRefreshCount = 0; // 商店每日免费刷新次数跨天归零（8/22 修复：此前遗漏导致次日按钮永久置灰）
    if (d.month !== month) { d.month = month; d.monthSignCount = 0; d.monthClaimed = {}; }
  } else if (d.month !== month) {
    // 同日跨月（极少，仅 23:59→00:00 边界）：仅重置当月
    d.month = month; d.monthSignCount = 0; d.monthClaimed = {};
  }
  // 兼容旧存档：补齐第三重日常任务所需字段（缺失则默认）
  if (typeof d.storyClearToday !== 'number') d.storyClearToday = 0;
  if (typeof d.bossChalToday !== 'number') d.bossChalToday = 0;
  if (!d.taskClaimed || typeof d.taskClaimed !== 'object') d.taskClaimed = {};
  return d;
}

// 发放一份奖励，返回可读描述（用于弹窗/提示）。随机奖励以「宝箱道具」存入背包，玩家手动开启（diamond 直接发放）。
function dailyGrant(kind, amount) {
  if (kind === 'skill')   { player.bag.push(makeChestItem('skill', 0)); return '功法宝箱 ×1'; }
  if (kind === 'equip')   { player.bag.push(makeChestItem('equip', 0)); return '装备宝箱 ×1'; }
  if (kind === 'diamond') { player.diamond = (player.diamond || 0) + (amount || 0); return '+' + (amount || 0) + ' 钻石'; }
  if (kind === 'double')  { player.bag.push(makeChestItem('skill', 0)); player.bag.push(makeChestItem('skill', 0)); player.bag.push(makeChestItem('equip', 0)); player.bag.push(makeChestItem('equip', 0)); return '功法宝箱 ×2 + 装备宝箱 ×2'; }
  if (kind === 'mixed')   {
    player.bag.push(makeChestItem('exp', 0));
    for (let i = 0; i < 2; i++) player.bag.push(makeChestItem('stone', 0));
    player.diamond = (player.diamond || 0) + 30;
    return '经验宝箱 ×1、灵石宝箱 ×2、钻石 +30';
  }
  return '';
}

// 通用奖励发放器：按 rewards 清单逐个发放，返回可读描述（用于弹窗/提示）。
//   rewards 元素：{ kind:'gold', amount } | { kind:'diamond', amount } | { kind:'stone'|'exp'|'skill'|'equip', count }
function dailyGrantRewards(rewards) {
  const descs = [];
  (rewards || []).forEach(r => {
    if (r.kind === 'gold')         { player.gold = (player.gold || 0) + (r.amount || 0); descs.push('+' + (r.amount || 0) + ' 灵石'); }
    else if (r.kind === 'diamond') { player.diamond = (player.diamond || 0) + (r.amount || 0); descs.push('+' + (r.amount || 0) + ' 钻石'); }
    else if (r.kind === 'stone')   { for (let i = 0; i < (r.count || 1); i++) player.bag.push(makeChestItem('stone', 0)); descs.push('灵石宝箱 ×' + (r.count || 1)); }
    else if (r.kind === 'exp')     { for (let i = 0; i < (r.count || 1); i++) player.bag.push(makeChestItem('exp', 0)); descs.push('经验宝箱 ×' + (r.count || 1)); }
    else if (r.kind === 'skill')   { for (let i = 0; i < (r.count || 1); i++) player.bag.push(makeChestItem('skill', 0)); descs.push('功法宝箱 ×' + (r.count || 1)); }
    else if (r.kind === 'equip')   { for (let i = 0; i < (r.count || 1); i++) player.bag.push(makeChestItem('equip', 0)); descs.push('装备宝箱 ×' + (r.count || 1)); }
  });
  return descs.join(' + ');
}

// ===== 第一重：每日签到 =====
function dailySignIn() {
  ensureDaily();
  const d = player.daily;
  if (d.signedToday) { openDailyRewardScreen(); return; }
  const lvl = realmLevel();
  const stones = 100 * lvl;
  player.gold = (player.gold || 0) + stones;        // 签到即送灵石 = 境界等级 ×100
  d.signedToday = true;
  d.monthSignCount = (d.monthSignCount || 0) + 1;   // 本月累计 +1
  const items = [['今日签到', '+' + stones + ' 灵石（境界等级 ' + lvl + ' ×100）']];
  // 月度里程碑：达到次数且尚未领取 → 自动发放
  DAILY_SIGN_MILESTONES.forEach(m => {
    if (d.monthSignCount >= m.count && !d.monthClaimed[m.count]) {
      d.monthClaimed[m.count] = true;
      const got = dailyGrant(m.kind, m.amount);
      items.push(['月度 · 签到 ' + m.count + ' 次', m.desc + (got ? '（' + got + '）' : '')]);
    }
  });
  saveGame();
  // 结果弹窗
  let html = `<div class="hub-modal-title"><svg viewBox="0 0 24 24" fill="none" stroke="#D4A843" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="M9 16l2 2 4-4"/></svg><h3 style="margin:0">签到成功</h3></div>`;
  html += `<p style="margin:4px 0;font-size:13px;color:rgba(241,239,232,0.75)">本月已累计签到 <b style="color:#D4A843">${d.monthSignCount}</b> 次</p>`;
  html += `<div class="bag-list">` + items.map(it =>
    `<div class="bag-item"><div class="bag-info"><span class="bag-name" style="color:#639922">${esc(it[0])}</span><span class="equip-bonus">${esc(it[1])}</span></div></div>`
  ).join('') + `</div>`;
  html += `<button class="btn-full" onclick="openDailyRewardScreen()" style="margin-top:14px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.12)">返回每日奖励</button>`;
  html += `<button class="btn-full" onclick="returnToHub()" style="margin-top:8px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.12)">返回主页</button>`;
  openModal(html);
}

// ===== 第二重：在线时长累计（由 initDaily 的定时器每秒调用）=====
// sec：本次累计的秒数。每跨过一个未领取的里程碑即自动发放。返回本次新达成的奖励描述数组。
function dailyTickSeconds(sec) {
  if (typeof state !== 'undefined' && state === 'create') return [];  // 创建角色界面不计在线
  ensureDaily();
  const d = player.daily;
  d.onlineSecToday = (d.onlineSecToday || 0) + sec;
  const newly = [];
  DAILY_ONLINE_MILESTONES.forEach(m => {
    if (d.onlineSecToday >= m.min * 60 && !d.onlineClaimed[m.min]) {
      d.onlineClaimed[m.min] = true;
      const got = dailyGrant(m.kind, m.amount);
      newly.push(m.desc + (got ? '（' + got + '）' : ''));
    }
  });
  if (newly.length) {
    saveGame();
    if (typeof showToast === 'function') showToast('在线奖励达成：' + newly.join('，'));
  }
  return newly;
}

// 启动在线计时（须在游戏初始化后调用；浏览器中每秒累计 1 秒）
function initDaily() {
  if (window._dailyStarted) return;
  window._dailyStarted = true;
  setInterval(() => { try { dailyTickSeconds(1); } catch (e) {} }, 1000);
}

// ===== 第三重：日常任务埋点（由副本胜利 / 世界BOSS开战 调用）=====
// 检查某 metric 下所有未领取且已达标的里程碑，自动发放并记录
function dailyCheckTaskClaims(metric, count) {
  const d = player.daily;
  const newly = [];
  DAILY_TASK_MILESTONES.forEach(m => {
    if (m.metric !== metric) return;
    const key = metric + m.count;
    if (count >= m.count && !d.taskClaimed[key]) {
      d.taskClaimed[key] = true;
      const got = dailyGrantRewards(m.rewards);
      newly.push(m.desc + (got ? '（' + got + '）' : ''));
    }
  });
  return newly;
}
// 玩家通关一个副本关卡时调用（每次副本胜利 +1）
function dailyRecordStoryClear() {
  ensureDaily();
  const d = player.daily;
  d.storyClearToday = (d.storyClearToday || 0) + 1;
  const newly = dailyCheckTaskClaims('story', d.storyClearToday);
  if (newly.length) {
    saveGame();
    if (typeof showToast === 'function') showToast('日常任务达成：' + newly.join('，'));
  }
  return newly;
}
// 玩家挑战一次世界BOSS时调用（每次开战 +1）
function dailyRecordBossChallenge() {
  ensureDaily();
  const d = player.daily;
  d.bossChalToday = (d.bossChalToday || 0) + 1;
  const newly = dailyCheckTaskClaims('boss', d.bossChalToday);
  if (newly.length) {
    saveGame();
    if (typeof showToast === 'function') showToast('日常任务达成：' + newly.join('，'));
  }
  return newly;
}

// ===== 界面：每日奖励总览 =====
function openDailyRewardScreen() {
  ensureDaily();
  const d = player.daily;
  const lvl = realmLevel();
  const stones = 100 * lvl;
  const realmLabel = (typeof CULTIVATION !== 'undefined') ? CULTIVATION.realmFromXp(player.xp).label : '凡人';

  const signRows = DAILY_SIGN_MILESTONES.map(m => {
    const done = !!d.monthClaimed[m.count];
    const reached = d.monthSignCount >= m.count;
    const cls = done ? 'color:#639922' : (reached ? 'color:#D4A843' : 'color:rgba(241,239,232,0.45)');
    const tag = done ? '已领取' : (reached ? '已达成' : '未达成');
    return `<div class="bag-item"><div class="bag-info">
      <span class="bag-name" style="${cls}">每月签到 ${m.count} 次</span>
      <span class="equip-bonus">${esc(m.desc)} · <b style="${cls}">${tag}</b></span></div></div>`;
  }).join('');

  const onlineRows = DAILY_ONLINE_MILESTONES.map(m => {
    const done = !!d.onlineClaimed[m.min];
    const reached = d.onlineSecToday >= m.min * 60;
    const cls = done ? 'color:#639922' : (reached ? 'color:#D4A843' : 'color:rgba(241,239,232,0.45)');
    const tag = done ? '已领取' : (reached ? '已达成' : '未达成');
    return `<div class="bag-item"><div class="bag-info">
      <span class="bag-name" style="${cls}">在线满 ${m.min} 分钟</span>
      <span class="equip-bonus">${esc(m.desc)} · <b style="${cls}">${tag}</b></span></div></div>`;
  }).join('');

  const signBtn = d.signedToday
    ? `<button class="equip-btn" disabled style="background:rgba(255,255,255,0.06);color:rgba(241,239,232,0.3);cursor:default">今日已签到</button>`
    : `<button class="equip-btn" onclick="dailySignIn()">签到领 ${stones} 灵石</button>`;

  let html = `<div class="hub-modal-title"><svg viewBox="0 0 24 24" fill="none" stroke="#D4A843" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="M9 16l2 2 4-4"/></svg><h3 style="margin:0">每日奖励</h3></div>`;
  html += `<p style="margin:2px 0 10px;font-size:12px;color:rgba(241,239,232,0.7)">灵石 <b style="color:#D4A843">${player.gold || 0}</b> ｜ 钻石 <b style="color:#378ADD">${player.diamond || 0}</b> ｜ 当前境界 <b style="color:#D4A843">${esc(realmLabel)}</b>（等级 ${lvl}）｜ 今日在线 <b>${dailyFmtDur(d.onlineSecToday)}</b></p>`;

  html += `<div class="equip-sec-title">第一重 · 每日签到</div>`;
  html += `<div class="bag-item" style="align-items:center"><div class="bag-info"><span class="bag-name">今日签到</span><span class="equip-bonus">送灵石 = 境界等级(${lvl}) × 100 = <b style="color:#D4A843">${stones}</b></span></div>${signBtn}</div>`;
  html += `<p style="margin:6px 0 2px;font-size:12px;color:rgba(241,239,232,0.6)">本月已签到 <b style="color:#D4A843">${d.monthSignCount}</b> 次 · 月度里程碑：</p>`;
  html += `<div class="bag-list">${signRows}</div>`;

  html += `<div class="equip-sec-title" style="margin-top:12px">第二重 · 在线时长奖励（达成即自动发放）</div>`;
  html += `<div class="bag-list">${onlineRows}</div>`;
  html += `<p style="margin:6px 0 0;font-size:11px;color:rgba(241,239,232,0.4)">在线奖励在达成时长后自动发放到账，无需手动领取；次日 0 点重置。</p>`;

  // 第三重 · 日常任务奖励
  const storyTasks = DAILY_TASK_MILESTONES.filter(m => m.metric === 'story');
  const bossTasks = DAILY_TASK_MILESTONES.filter(m => m.metric === 'boss');
  const taskRow = (m, cur) => {
    const done = !!d.taskClaimed[m.metric + m.count];
    const reached = cur >= m.count;
    const cls = done ? 'color:#639922' : (reached ? 'color:#D4A843' : 'color:rgba(241,239,232,0.45)');
    const tag = done ? '已领取' : (reached ? '已达成' : '未达成');
    const label = m.metric === 'story' ? ('每日通关副本 ' + cur + '/' + m.count) : ('今日挑战世界BOSS ' + cur + '/' + m.count);
    return `<div class="bag-item"><div class="bag-info">
      <span class="bag-name" style="${cls}">${label}</span>
      <span class="equip-bonus">${esc(m.desc)} · <b style="${cls}">${tag}</b></span></div></div>`;
  };
  html += `<div class="equip-sec-title" style="margin-top:12px">第三重 · 日常任务奖励（达成即自动发放）</div>`;
  html += `<div class="bag-list">` + storyTasks.map(m => taskRow(m, d.storyClearToday || 0)).join('') + bossTasks.map(m => taskRow(m, d.bossChalToday || 0)).join('') + `</div>`;
  html += `<p style="margin:6px 0 0;font-size:11px;color:rgba(241,239,232,0.4)">通关副本 / 挑战世界BOSS 即累计进度，达成后奖励自动发放；次日 0 点重置。</p>`;

  html += `<button class="btn-full" onclick="returnToHub()" style="margin-top:14px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.12)">返回主页</button>`;
  openModal(html);
}

window.openDailyRewardScreen = openDailyRewardScreen;
window.dailySignIn = dailySignIn;
window.dailyRecordStoryClear = dailyRecordStoryClear;
window.dailyRecordBossChallenge = dailyRecordBossChallenge;
