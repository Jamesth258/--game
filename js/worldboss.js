/* worldboss.js — 世界BOSS 系统（每日 5 时段 · 100倍血 · 最高境界属性 · 累计伤害排名）
 * 加载顺序：须在 battle.js / hub.js 之后 <script src> 引入（提供 openWorldBossScreen 等全局函数）。
 * 设计要点（来自用户需求）：
 *  - 每天 5 个固定时段，每时段 1 只世界BOSS：
 *      ① 10:00–12:00  ② 13:00–15:00  ③ 15:00–17:00  ④ 18:00–20:00  ⑤ 20:00–23:00
 *  - BOSS 属性取游戏最高境界（宇宙国主）对应的代表性属性；血量再 ×100（难度拉满）。
 *  - 单场战斗最多 10 回合；同一时段每位玩家最多挑战 6 次；伤害累计。
 *  - 时段结束前 15 分钟截止（之后不可再挑战，可领奖）；按该时段累计伤害排名发奖：
 *      第 1 名：1 功法宝箱 + 1 装备宝箱
 *      第 2 名：1 装备宝箱
 *      第 3 名：1 功法宝箱
 *      其余参与玩家：5 灵石宝箱 + 5 经验宝箱
 *  - 单机离线版：跨玩家排名由「NPC 对手」（按日期+时段种子稳定生成）构成，
 *    对手强度随玩家战力浮动，保证这是一场真实可争的竞速。配好 CloudBase 后可换真实跨服榜。
 */
// ====== 时段定义 ======
const WB_SLOTS = [
  { idx: 1, name: '幽冥魔尊', subtitle: '晨曦之噬', start: [10, 0], end: [12, 0], cut: 15 },
  { idx: 2, name: '焚天炎帝', subtitle: '正午燎原', start: [13, 0], end: [15, 0], cut: 15 },
  { idx: 3, name: '九幽冥皇', subtitle: '午后阴潮', start: [15, 0], end: [17, 0], cut: 15 },
  { idx: 4, name: '血河神祖', subtitle: '暮色血战', start: [18, 0], end: [20, 0], cut: 15 },
  { idx: 5, name: '太虚帝尊', subtitle: '长夜降临', start: [20, 0], end: [23, 0], cut: 15 },
];
const WB_MAX_ATTEMPTS = 6;     // 每时段最多挑战次数
const WB_MAX_ROUNDS = 10;      // 单场最多回合数
const WB_RIVAL_COUNT = 8;      // 模拟对手数量

// ====== 时间辅助（支持测试注入）======
function wbNowMinutes() {
  if (typeof window !== 'undefined' && window.__WB_TEST_MINUTES != null) return window.__WB_TEST_MINUTES;
  const d = new Date(); return d.getHours() * 60 + d.getMinutes();
}
function wbTodayStr() {
  if (typeof window !== 'undefined' && window.__WB_TEST_DATE) return window.__WB_TEST_DATE;
  const d = new Date(); const p = n => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
}
function wbSlotState(slot) {
  const now = wbNowMinutes();
  const sm = slot.start[0] * 60 + slot.start[1];
  const em = slot.end[0] * 60 + slot.end[1];
  const cut = em - slot.cut;
  if (now < sm) return 'upcoming';     // 未开启
  if (now >= em) return 'ended';       // 已结束
  if (now >= cut) return 'locked';     // 截止后可领奖、不可再挑战
  return 'open';                        // 进行中、可挑战
}
function wbFmt(n) { return (typeof formatNum === 'function') ? formatNum(n) : Number(n).toLocaleString('zh-CN'); }

// ====== 每日数据初始化 ======
function ensureWorldBossDaily() {
  const today = wbTodayStr();
  if (!player.worldBoss || player.worldBoss.date !== today) {
    const slots = {};
    WB_SLOTS.forEach(s => { slots[s.idx] = { attempts: 0, dmg: 0, claimed: false, rank: null }; });
    player.worldBoss = { date: today, slots };
  }
  return player.worldBoss;
}

// ====== BOSS 属性（最高境界基底 × 100 血）======
function bossBaseStats() {
  // 取游戏最高境界（宇宙国主，globalIndex = TOTAL_STAGES-1）的代表性属性作基底
  const idx = CULTIVATION.TOTAL_STAGES - 1;
  const con = 10, str = 10, sou = 10, spd = 10, com = 10, des = 10;
  return {
    maxHp: Math.round(100 + con * 20 + idx * 100),
    def:   Math.round(10 + con * 2 + idx * 2.5),
    atk:   Math.round(20 + str * 2 + idx * 8),
    maxMp: Math.round(100 + com * 20 + idx * 100),
    spiAtk:Math.round(20 + sou * 2 + idx * 10),
    spiDef:Math.round(10 + sou * 1 + idx * 2),
    init:  Math.round(10 + spd * 2 + idx * 2),
    eva:   Math.min(0.95, 0.10 + idx * 0.001 + spd * 0.001 + des * 0.001),
    spd,
  };
}
function makeWorldBoss(slotIdx) {
  const B = bossBaseStats();
  const slot = WB_SLOTS.find(s => s.idx === slotIdx) || WB_SLOTS[0];
  const hp = Math.round(B.maxHp * 100);   // 100 倍血量
  return {
    name: slot.name, isEnemy: true,
    maxHp: hp, hp: hp, maxMp: B.maxMp, mp: B.maxMp,
    // 攻击/精神攻击减半，保证玩家有 10 回合输出空间；防御/先攻/闪避维持满值（肉度拉满）
    atk: Math.round(B.atk * 0.5), def: B.def, spd: B.spd,
    init: B.init, eva: B.eva, spiAtk: Math.round(B.spiAtk * 0.5), spiDef: B.spiDef,
    luck: 0, potions: 0, defending: false, extraActions: 0,
    buffs: [], debuffs: [], shield: null, stun: 0,
    skill: { name: '灭世一击', type: 'phys', mult: 2.2, cost: 10 },
  };
}

// ====== NPC 对手（按 日期+时段 种子稳定生成，强度随玩家战力浮动）======
function wbHash(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function wbRng(seed) { let a = seed >>> 0; return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const WB_RIVAL_NAMES = ['剑无极', '血手人屠', '玄阴老怪', '凌霄子', '噬魂尊者', '九天玄女', '断情崖主', '幽冥鬼帝', '焚寂真人', '太虚散人', '沧海一笑', '墨尘'];
function wbRivals(slot) {
  ensureWorldBossDaily();
  const seed = wbHash(wbTodayStr() + '#' + slot.idx);
  const rng = wbRng(seed);
  // 以玩家「潜在总伤害」（6 次挑战估算）为基准，对手在其 0.45~1.95 倍间浮动 —— 一场真实可争的竞速
  const refRun = (player.atk || 1) * 3.0 * 14;
  const refTotal = refRun * WB_MAX_ATTEMPTS;
  const rivals = [];
  for (let i = 0; i < WB_RIVAL_COUNT; i++) {
    const nm = WB_RIVAL_NAMES[Math.floor(rng() * WB_RIVAL_NAMES.length)];
    const dmg = Math.round(refTotal * (0.45 + rng() * 1.5));
    rivals.push({ name: '【' + nm + '】', dmg, you: false });
  }
  return rivals;
}
// 合并玩家自身，返回 {rank, list(降序)}
function wbBoard(slot) {
  const rivals = wbRivals(slot);
  const sd = player.worldBoss.slots[slot.idx];
  const me = { name: player.name + '（你）', dmg: sd.dmg || 0, you: true };
  const all = rivals.concat([me]).sort((a, b) => b.dmg - a.dmg);
  const rank = all.findIndex(r => r.you) + 1;
  return { rank, list: all };
}

// ====== 宝箱 ======
function openSkillChest() {
  const pool = SKILLS_DB.filter(s => !player.learned.includes(s.id));
  const s = pool.length ? pool[Math.floor(Math.random() * pool.length)] : SKILLS_DB[Math.floor(Math.random() * SKILLS_DB.length)];
  if (!player.learned.includes(s.id)) player.learned.push(s.id);
  checkCodexReward();
  return s;
}
function openEquipChest() {
  const slot = EQUIP_SLOT_KEYS[Math.floor(Math.random() * EQUIP_SLOT_KEYS.length)];
  const r = Math.min(RARITY.length - 1, rollRarity() + 1);   // 宝箱品质略高于常规锻造
  const it = genEquip(slot, r);
  player.bag.push(it);
  recordEquipCollected(it);
  return it;
}
function openStoneChest() { const g = 200 + Math.floor(Math.random() * 600); player.gold = (player.gold || 0) + g; return g; }
function openExpChest() { const x = 2000 + Math.floor(Math.random() * 8000); gainXp(x, false); return x; }

// ====== 界面：列表 ======
function openWorldBossScreen() {
  ensureWorldBossDaily();
  const stTxt = { open: '<b style="color:#639922">进行中</b>', locked: '<b style="color:#D4A843">已截止·可领奖</b>', ended: '<b style="color:rgba(241,239,232,.5)">已结束</b>', upcoming: '<b style="color:#378ADD">未开启</b>' };
  let html = `<div class="hub-modal-title"><svg viewBox="0 0 24 24" fill="none" stroke="#E87B7B" stroke-width="2"><path d="M3 21h18M5 21V8l7-5 7 5v13M9 21v-6h6v6"/></svg><h3 style="margin:0">世界BOSS</h3></div>`;
  html += `<p style="font-size:12px;color:rgba(241,239,232,0.7);margin:4px 0 10px">每日 5 个时段，每时段 1 只世界BOSS（<b style="color:#E87B7B">100倍气血·最高境界属性</b>）。单场最多 10 回合、每时段最多挑战 ${WB_MAX_ATTEMPTS} 次，比拼累计伤害。时段结束前 15 分钟截止，按累计伤害排名发奖。</p>`;
  WB_SLOTS.forEach(slot => {
    const st = wbSlotState(slot);
    const sd = player.worldBoss.slots[slot.idx];
    const remain = Math.max(0, WB_MAX_ATTEMPTS - sd.attempts);
    const timeTxt = slot.start[0] + ':00–' + slot.end[0] + ':00';
    let btn = '';
    if (st === 'open' && remain > 0) btn = `<button class="equip-btn" onclick="startWorldBossBattle(${slot.idx})">挑战（剩${remain}次）</button>`;
    else if (st === 'open') btn = `<span style="color:rgba(241,239,232,.4);font-size:12px">今日次数已用完</span>`;
    else if (st === 'locked' || st === 'ended') {
      if (sd.dmg > 0 && !sd.claimed) btn = `<button class="equip-btn" onclick="openWorldBossClaim(${slot.idx})">领取奖励</button>`;
      else if (sd.claimed) btn = `<span style="color:#639922;font-size:12px">已领取（第${sd.rank}名）</span>`;
      else btn = `<span style="color:rgba(241,239,232,.4);font-size:12px">未参与</span>`;
    } else btn = `<span style="color:rgba(241,239,232,.4);font-size:12px">${timeTxt} 开放</span>`;
    html += `<div class="bag-item" style="align-items:center">
      <div class="bag-info">
        <span class="bag-name" style="color:#E87B7B">${esc(slot.name)} · ${esc(slot.subtitle)}</span>
        <span class="equip-bonus">${timeTxt} ｜ ${stTxt[st]} ｜ 累计 ${wbFmt(sd.dmg)} ｜ 剩 ${remain} 次</span>
      </div>${btn}</div>`;
  });
  html += `<button class="btn-full" onclick="returnToHub()" style="margin-top:14px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.12)">返回主页</button>`;
  openModal(html);
}

// ====== 挑战入口 ======
function startWorldBossBattle(slotIdx) {
  ensureWorldBossDaily();
  const slot = WB_SLOTS.find(s => s.idx === slotIdx); if (!slot) return;
  if (wbSlotState(slot) !== 'open') { openWorldBossScreen(); return; }
  const sd = player.worldBoss.slots[slotIdx];
  if (sd.attempts >= WB_MAX_ATTEMPTS) { openWorldBossScreen(); return; }
  sd.attempts += 1;
  saveGame();
  closeModal();
  if (window.HUB) window.HUB.hide();
  startBattle({ id: -2, _wb: slotIdx }, 'worldboss');
}

// ====== 单场结算后结果界面 ======
function openWorldBossResult(slotIdx) {
  ensureWorldBossDaily();
  const slot = WB_SLOTS.find(s => s.idx === slotIdx); if (!slot) return;
  const sd = player.worldBoss.slots[slotIdx];
  const st = wbSlotState(slot);
  const remain = Math.max(0, WB_MAX_ATTEMPTS - sd.attempts);
  const board = wbBoard(slot);
  let html = `<div class="hub-modal-title"><svg viewBox="0 0 24 24" fill="none" stroke="#E87B7B" stroke-width="2"><path d="M3 21h18M5 21V8l7-5 7 5v13M9 21v-6h6v6"/></svg><h3 style="margin:0">世界BOSS · ${esc(slot.name)}</h3></div>`;
  html += `<p style="margin:4px 0">本时段累计伤害：<b style="color:#E87B7B">${wbFmt(sd.dmg)}</b> ｜ 剩余挑战：<b>${remain}</b> 次</p>`;
  html += `<p style="margin:2px 0;font-size:12px;color:rgba(241,239,232,0.7)">当前预估排名：<b style="color:#D4A843">第 ${board.rank} 名</b>（时段截止后确定最终名次）</p>`;
  html += `<div class="equip-sec-title">实时伤害榜</div><div class="bag-list">` +
    board.list.slice(0, 8).map((r, i) => `<div class="bag-item"><div class="bag-info"><span class="bag-name" style="${r.you ? 'color:#639922;font-weight:700' : ''}">${i + 1}. ${esc(r.name)}</span><span class="equip-bonus">${wbFmt(r.dmg)} 伤害</span></div></div>`).join('') +
    `</div>`;
  let act = '';
  if (st === 'open' && remain > 0) act = `<button class="equip-btn" onclick="startWorldBossBattle(${slotIdx})">继续挑战</button>`;
  else if (st === 'open') act = `<span style="color:rgba(241,239,232,.4);font-size:12px">次数已用完，等截止领奖</span>`;
  else if ((st === 'locked' || st === 'ended') && sd.dmg > 0 && !sd.claimed) act = `<button class="equip-btn" onclick="openWorldBossClaim(${slotIdx})">领取奖励</button>`;
  else if (sd.claimed) act = `<span style="color:#639922;font-size:12px">已领取（第${sd.rank}名）</span>`;
  html += `<div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap">${act}<button class="equip-btn" onclick="openWorldBossScreen()">返回列表</button><button class="equip-btn" onclick="returnToHub()">返回主页</button></div>`;
  openModal(html);
}

// ====== 领奖（截止后）======
function openWorldBossClaim(slotIdx) {
  ensureWorldBossDaily();
  const slot = WB_SLOTS.find(s => s.idx === slotIdx); if (!slot) return;
  const sd = player.worldBoss.slots[slotIdx];
  if (sd.claimed || sd.dmg <= 0) { openWorldBossResult(slotIdx); return; }
  const board = wbBoard(slot);
  const rank = board.rank;
  sd.rank = rank; sd.claimed = true;
  // 按名次发奖
  const results = [];
  if (rank === 1) { results.push(['功法', openSkillChest()]); results.push(['装备', openEquipChest()]); }
  else if (rank === 2) { results.push(['装备', openEquipChest()]); }
  else if (rank === 3) { results.push(['功法', openSkillChest()]); }
  else { for (let i = 0; i < 5; i++) results.push(['灵石', openStoneChest()]); for (let i = 0; i < 5; i++) results.push(['经验', openExpChest()]); }
  saveGame();
  let html = `<div class="hub-modal-title"><svg viewBox="0 0 24 24" fill="none" stroke="#D4A843" stroke-width="2"><path d="M3 21h18M5 21V8l7-5 7 5v13M9 21v-6h6v6"/></svg><h3 style="margin:0">世界BOSS 领奖</h3></div>`;
  html += `<p style="margin:4px 0">你在「${esc(slot.name)}」时段获得 <b style="color:#D4A843">第 ${rank} 名</b>（累计伤害 ${wbFmt(sd.dmg)}）</p>`;
  const rewardDesc = r => {
    if (r[0] === '功法') return '习得《' + r[1].name + '》';
    if (r[0] === '装备') return r[1].name + '（' + r[1].rarityName + '）';
    if (r[0] === '灵石') return '+' + wbFmt(r[1]) + ' 灵石';
    if (r[0] === '经验') return '+' + wbFmt(r[1]) + ' 修为';
    return '';
  };
  html += `<div class="bag-list">` + results.map(r => `<div class="bag-item"><div class="bag-info"><span class="bag-name" style="color:#D4A843">${r[0]}宝箱</span><span class="equip-bonus">${rewardDesc(r)}</span></div></div>`).join('') + `</div>`;
  html += `<button class="btn-full" onclick="returnToHub()" style="margin-top:14px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.12)">返回主页</button>`;
  openModal(html);
}

window.openWorldBossScreen = openWorldBossScreen;
window.startWorldBossBattle = startWorldBossBattle;
window.openWorldBossClaim = openWorldBossClaim;
