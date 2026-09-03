/* story.js — 剧情副本系统：卷/章/关目录 + 战斗入口 + 章节通关三选一奖励
 * 依赖（均脚本级全局，已在前序 <script> 加载）：player, STORY_CHAPTERS/STORY_VOLUMES/STORY_BY_CH,
 *   SKILLS_DB_MAP, RARITY, EQUIP_SLOTS, genEquip, startBattle, openModal/closeModal/esc, saveGame, HUB
 * 加载顺序见 index.html：story-data.js → battle.js → hub.js → create.js → story.js → main.js
 */
// ===== 剧情副本系统 =====
let _storyVol = 1;     // 当前查看的卷（1~10）
let _storyCh = 1;      // 最近挑战的章节（战斗结束返回用）
let _selSkill = null;  // 三选一当前选中的功法 id
let _selEquip = 0;     // 三选一当前选中的装备序号
let _rewardCh = 1;     // 当前三选一对应的章节号
let _rewardEquipItems = []; // 三选一装备卡片预生成的具体装备（含 entryId，用于「已拥有」判定）

function sTierColor(t) { return ({ 1: '#9aa0a6', 2: '#639922', 3: '#378ADD', 4: '#9B6BCC', 5: '#D4A843', 6: '#E87B7B', 7: '#E8D9A0' })[t] || '#9aa0a6'; }

// 章节解锁：第 1 章默开；其余需【前一章 10 关全通】且【境界等级达标】
// 设计：每突破升级一个境界等级，额外开放一个章节（境界等级取自 daily.js 的 realmLevel()：扁平小阶序号+1）
function storyChapterUnlocked(ch) {
  if (ch === 1) return true;
  const prevCleared = (player.storyCleared[ch - 1] || 0) >= 10;
  const realmOk = realmLevel() >= ch;          // 境界等级达到 ch 才允许挑战第 ch 章
  return prevCleared && realmOk;
}
// 锁定原因：用于禁用按钮文案
function storyChapterLockReason(ch) {
  if (ch === 1) return '';
  if ((player.storyCleared[ch - 1] || 0) < 10) return '先通第' + (ch - 1) + '章';
  if (realmLevel() < ch) return '需境界等级' + ch + '（当前' + realmLevel() + '）';
  return '';
}

// 按章节/关卡缩放敌方强度（以玩家当前属性为基准 × 章节难度系数，保证可战胜且随进度变难）
function makeStoryEnemy(ch, lv) {
  const data = STORY_BY_CH[ch];
  const isBoss = lv === 10;
  const D = 0.5 + ch * 0.05 + lv * 0.012;   // ch1≈0.56 → ch100≈5.62
  const p = player;
  const hp = Math.round((p.maxHp * 0.55 + 90) * D * (isBoss ? 1.7 : 1));
  const atk = Math.round((p.atk * 0.42 + 12) * D);
  const def = Math.round((p.def * 0.45 + 6) * D);
  const spd = Math.round(p.spd * 0.82 + ch * 0.22 + (isBoss ? 6 : 0));
  const mp = 40 + Math.floor(ch / 2);
  return {
    name: data.title + (isBoss ? '·守关boss' : '·第' + lv + '关'),
    isEnemy: true,
    maxHp: hp, hp: hp, maxMp: mp, mp: mp,
    atk, def, spd,
    init: Math.round(10 + spd * 2), eva: Math.min(0.2, 0.05 + ch * 0.001),
    spiAtk: Math.round(p.spiAtk * 0.4 * D), spiDef: Math.round((p.spiDef * 0.4 + 4) * D), luck: 0,
    potions: 0, defending: false, extraActions: 0,
    buffs: [], debuffs: [], shield: null, stun: 0,
    skill: { name: '敌袭', type: 'phys', mult: 1.7 + ch * 0.01, cost: 10 },
  };
}

// 进入某关战斗（复用 battle.js 的 startBattle，模式标记为 story）
function startStoryBattle(ch, lv) {
  _storyCh = ch;
  const enemy = makeStoryEnemy(ch, lv);
  const node = { id: -1, type: lv === 10 ? 'boss' : 'battle', cleared: false, enemy, _story: { ch, lv } };
  if (window.HUB) window.HUB.hide();
  closeModal();
  state = 'battle';
  startBattle(node, 'story');
}

// ===== 副本主页：卷标签 + 章节卡片 =====
function openStoryScreen() {
  // 若有已通关但未领奖励的章节 → 先弹三选一
  for (let c = 1; c <= 100; c++) {
    if ((player.storyCleared[c] || 0) >= 10 && !player.storyRewardClaimed[c]) { showStoryReward(c); return; }
  }
  state = 'hub';
  if (window.HUB) window.HUB.hide();
  const volTabs = STORY_VOLUMES.map(v =>
    `<button class="story-vol-tab ${v.vol === _storyVol ? 'on' : ''}" onclick="storySetVol(${v.vol})">${esc(v.name.split('·')[1] || v.name)}</button>`
  ).join('');
  const vol = STORY_VOLUMES[_storyVol - 1];
  const chapters = [];
  for (let c = vol.range[0]; c <= vol.range[1]; c++) {
    const d = STORY_BY_CH[c];
    const unlocked = storyChapterUnlocked(c);
    const cleared = player.storyCleared[c] || 0;
    const prog = cleared >= 10 ? '★ 通关' : (cleared > 0 ? '已通 ' + cleared + '/10' : '未通关');
    chapters.push(`<div class="bag-item">
      <div class="bag-info">
        <span class="equip-icon" style="color:${sTierColor(d.tier)}">${d.tierName[0]}</span>
        <span class="bag-name">第${c}章 · ${esc(d.title)}</span>
        <span class="equip-bonus">${esc(d.realmName)} · 功法${d.tierName} · 装备${d.rarityName} · ${prog}</span>
      </div>
      ${unlocked
        ? `<button class="equip-btn" onclick="storyEnterChapter(${c})">进入</button>`
        : `<button class="equip-btn" disabled style="background:rgba(255,255,255,0.06);color:rgba(241,239,232,0.3);cursor:default">${storyChapterLockReason(c)}</button>`}
    </div>`);
  }
  openModal(`
    <div class="hub-modal-title"><svg viewBox="0 0 24 24" fill="none" stroke="#D4A843" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>
    <h3 style="margin:0">剧情副本</h3></div>
    <p style="margin:2px 0 8px;font-size:12px;color:rgba(241,239,232,0.6)">每章 10 关，单关胜得经验；通关领 <b style="color:#D4A843">功法三选一 + 装备三选一</b>。</p>
    <div class="story-vol-tabs">${volTabs}</div>
    <div class="equip-sec-title">${esc(vol.name)}</div>
    <div class="bag-list">${chapters.join('')}</div>
    <button class="btn-full" onclick="storyClose()" style="margin-top:14px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.12)">返回主页</button>`);
}

function storySetVol(v) { _storyVol = v; openStoryScreen(); }
function storyEnterChapter(c) { if (storyChapterUnlocked(c)) openChapter(c); }
function storyClose() { returnToHub(); }
function storyBackVol() { openStoryScreen(); }

// ===== 章节详情：10 关 + 通关奖励预览 =====
function openChapter(ch) {
  const d = STORY_BY_CH[ch];
  const cleared = player.storyCleared[ch] || 0;
  const rows = [];
  for (let lv = 1; lv <= 10; lv++) {
    const isClear = cleared >= lv;
    const isNext = lv === cleared + 1;
    const canFight = isClear || isNext;
    const isBoss = lv === 10;
    let status, btn;
    if (isClear) { status = '✓ 已通关'; btn = `<button class="equip-btn" onclick="startStoryBattle(${ch},${lv})">重战</button>`; }
    else if (isNext) { status = isBoss ? '⚔ 守关BOSS' : '▶ 可挑战'; btn = `<button class="equip-btn" onclick="startStoryBattle(${ch},${lv})">挑战</button>`; }
    else { status = '🔒 未解锁'; btn = `<button class="equip-btn" disabled style="background:rgba(255,255,255,0.06);color:rgba(241,239,232,0.3);cursor:default">锁定</button>`; }
    rows.push(`<div class="bag-item">
      <div class="bag-info">
        <span class="equip-icon" style="color:${isBoss ? '#C0392B' : '#9B6BCC'}">${lv}</span>
        <span class="bag-name">第${lv}关 ${isBoss ? '（BOSS）' : ''}</span>
        <span class="equip-bonus">经验 +${d.levels[lv - 1]}${isClear ? ' · ' + status : ''}</span>
      </div>
      ${btn}
    </div>`);
  }
  const rw = d.reward;
  const skNames = rw.skills.map(id => SKILLS_DB_MAP[id]).filter(Boolean)
    .map(s => `<span style="color:${sTierColor(s.tier)}">${esc(s.name)}</span>`).join('、');
  const eqNames = rw.equip.map(e => `<span style="color:${RARITY[e.rarity].color}">${EQUIP_SLOTS[e.slot].name}·${RARITY[e.rarity].name}</span>`).join('、');
  openModal(`
    <div class="hub-modal-title"><svg viewBox="0 0 24 24" fill="none" stroke="#D4A843" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>
    <h3 style="margin:0">第${ch}章 · ${esc(d.title)}</h3></div>
    <p style="margin:2px 0;font-size:12px;color:rgba(241,239,232,0.7)">${esc(d.plot)}</p>
    <p style="margin:2px 0 8px;font-size:12px;color:rgba(241,239,232,0.55)">${esc(d.realmName)} · 功法${d.tierName} · 装备${d.rarityName} · 进度 ${cleared}/10 ${player.storyRewardClaimed[ch] ? '· 已领奖' : ''}</p>
    <div class="equip-sec-title">十关挑战</div>
    <div class="bag-list">${rows.join('')}</div>
    <div class="equip-sec-title">通关奖励（三选一）</div>
    <p style="margin:4px 0;font-size:12px;color:rgba(241,239,232,0.7)">功法：${skNames}<br>装备：${eqNames}</p>
    <button class="btn-full" onclick="storyBackVol()" style="margin-top:12px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.12)">返回章节列表</button>`);
}

// ===== 章节通关三选一奖励 =====
function showStoryReward(ch) {
  const rw = STORY_BY_CH[ch].reward;
  _rewardCh = ch;
  _selSkill = rw.skills[0];
  _selEquip = 0;
  _rewardEquipItems = rw.equip.map(e => genEquip(e.slot, e.rarity)); // 预生成具体装备（含 entryId，供「已拥有」判定与展示真名）
  const skillCards = rw.skills.map(id => {
    const s = SKILLS_DB_MAP[id]; if (!s) return '';
    const owned = isSkillOwned(id);
    return `<div class="reward-card" data-kind="skill" data-id="${id}" onclick="storySelReward('skill','${id}')">
      <div style="color:${sTierColor(s.tier)};font-weight:700">${s.tierName}·${esc(s.name)}${owned ? ' <span class="owned-badge">已拥有</span>' : ''}</div>
      <div style="font-size:11px;color:rgba(241,239,232,0.6)">${esc(s.schoolCn)} · ${s.cost}灵</div>
      <div style="font-size:11px;color:rgba(241,239,232,0.5)">${esc(s.desc)}</div>
      <span class="reward-tag" style="display:none">已选</span>
    </div>`;
  }).join('');
  const eqCards = rw.equip.map((e, i) => {
    const it = _rewardEquipItems[i];
    const r = RARITY[e.rarity], slot = EQUIP_SLOTS[e.slot];
    const owned = isEquipOwned(it.entryId);
    return `<div class="reward-card" data-kind="equip" data-i="${i}" onclick="storySelReward('equip',${i})">
      <div style="color:${r.color};font-weight:700">${r.name}·${slot.name}${owned ? ' <span class="owned-badge">已拥有</span>' : ''}</div>
      <div style="font-size:12px;color:${it.rarityColor}">${esc(it.name)}</div>
      <div style="font-size:11px;color:rgba(241,239,232,0.5)">${esc(equipBonusText(it))}</div>
      <span class="reward-tag" style="display:none">已选</span>
    </div>`;
  }).join('');
  openModal(`
    <div class="hub-modal-title"><svg viewBox="0 0 24 24" fill="none" stroke="#D4A843" stroke-width="2"><path d="M12 2l3 7 7 .5-5.5 4.5 2 7L12 17l-6.5 4 2-7L2 9.5 9 9z"/></svg>
    <h3 style="margin:0">第${ch}章通关 · 奖励三选一</h3></div>
    <p style="margin:2px 0 8px;font-size:12px;color:rgba(241,239,232,0.7)">点击卡片选择功法与装备（默认选中第一项），下方实时显示已选，确认后领取。</p>
    <div class="equip-sec-title">功法（选 1）</div>
    <div class="reward-grid" id="reward-skills">${skillCards}</div>
    <div class="equip-sec-title">装备（选 1）</div>
    <div class="reward-grid" id="reward-equips">${eqCards}</div>
    <p id="reward-pick" style="margin:10px 0 0;font-size:13px;color:rgba(241,239,232,0.9)">已选：功法 <b style="color:#D4A843">—</b> ＋ 装备 <b style="color:#D4A843">—</b></p>
    <button class="btn-full" onclick="storyClaimReward(${ch})" style="margin-top:14px;background:#D4A843;color:#1a1a1a;font-weight:700;border:none">确认领取</button>
    <button class="btn-full" onclick="storySkipReward(${ch})" style="margin-top:8px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.12)">暂不选（回本章再领）</button>`);
  setTimeout(() => { highlightReward('skill', rw.skills[0]); highlightReward('equip', 0); updateRewardPick(); }, 0);
}

function storySelReward(kind, val) {
  if (kind === 'skill') _selSkill = val; else _selEquip = val;
  highlightReward(kind, val);
  updateRewardPick();
}
function highlightReward(kind, val) {
  const grid = document.getElementById(kind === 'skill' ? 'reward-skills' : 'reward-equips');
  if (!grid) return;
  grid.querySelectorAll('.reward-card').forEach(c => {
    const match = kind === 'skill' ? c.dataset.id === val : (+c.dataset.i === +val);
    c.classList.toggle('reward-sel', match);
    const tag = c.querySelector('.reward-tag');
    if (tag) tag.style.display = match ? 'inline-block' : 'none';
  });
}
// 实时回显已选功法/装备名称
function updateRewardPick() {
  const el = document.getElementById('reward-pick');
  if (!el) return;
  const rw = STORY_BY_CH[_rewardCh] && STORY_BY_CH[_rewardCh].reward;
  const sk = SKILLS_DB_MAP[_selSkill];
  const eq = rw && rw.equip[_selEquip];
  const it = rw && _rewardEquipItems[_selEquip];
  const skName = sk ? sk.name : (_selSkill || '—');
  const eqName = it ? it.name : (eq ? (RARITY[eq.rarity].name + '·' + EQUIP_SLOTS[eq.slot].name) : (_selEquip || '—'));
  el.innerHTML = '已选：功法 <b style="color:#D4A843">' + esc(skName) + '</b> ＋ 装备 <b style="color:#D4A843">' + esc(eqName) + '</b>';
}

function storyClaimReward(ch) {
  const rw = STORY_BY_CH[ch].reward;
  const sid = _selSkill || rw.skills[0];
  if (!player.learned.includes(sid)) player.learned.push(sid);   // 功法入功法库
  checkCodexReward();
  const eq = rw.equip[_selEquip] || rw.equip[0];
  const eqItem = _rewardEquipItems[_selEquip] || genEquip(eq.slot, eq.rarity);
  player.bag.push(eqItem);                                       // 装备入背包
  recordEquipCollected(eqItem);
  player.storyRewardClaimed[ch] = true;
  saveGame();
  const sName = SKILLS_DB_MAP[sid] ? SKILLS_DB_MAP[sid].name : sid;
  const r = RARITY[eq.rarity], slot = EQUIP_SLOTS[eq.slot];
  openModal(`<h3 style="color:#D4A843">领取成功</h3>
    <p style="color:rgba(241,239,232,0.8)">功法《${esc(sName)}》已入功法库。<br>获得装备 ${esc(r.name)}·${esc(slot.name)}，已入背包。</p>
    <button class="btn-full" onclick="openChapter(${ch})" style="margin-top:14px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.12)">返回本章</button>`);
}
function storySkipReward(ch) { openChapter(ch); }   // 不标记已领，下次进入本章仍会提示

// 战斗结束（胜/负）后的路由：章节通关→弹三选一；否则回到本章继续/重战。供 battle.js 自动调用，确保有返回出口
function storyAfterBattle() {
  const ch = (battle && battle.node && battle.node._story) ? battle.node._story.ch : 1;
  // 头像解锁：通关对应卷的章节时解锁该卷敌人头像
  if (typeof checkStoryUnlock === 'function') checkStoryUnlock(ch);
  if (player.storyCleared[ch] >= 10) openStoryScreen();   // 章节通关 → 触发三选一奖励
  else if (window.openChapter) openChapter(ch);          // 否则继续下一关 / 失败重战
  else openStoryScreen();
}

// 暴露给 onclick（HTML 内联）与 battle.js（脚本级直接调用亦可）
window.openStoryScreen = openStoryScreen;
window.openChapter = openChapter;
window.storySetVol = storySetVol;
window.storyEnterChapter = storyEnterChapter;
window.storyClose = storyClose;
window.storyBackVol = storyBackVol;
window.storySelReward = storySelReward;
window.storyClaimReward = storyClaimReward;
window.storySkipReward = storySkipReward;
window.startStoryBattle = startStoryBattle;
window.storyAfterBattle = storyAfterBattle;
