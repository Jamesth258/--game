/* codex.js — 图鉴系统：收集统计 + 里程碑奖励
 * 加载顺序：index.html 在 js/daily.js 之后加载（EQUIP_DB/SKILLS_DB/RARITY/EQUIP_SLOTS 等已就绪）。
 * 功法收集直接读 player.learned（SKILLS_DB id 数组，已习得即收集）；
 * 装备收集读 player.equipCollected（EQUIP_DB id 去重集合，由各「获得装备」入口经 recordEquipCollected 写入）。
 * 人物立绘展示：写实古风 RGBA 透明立绘（assets/battle/ 下 hero_m / enemy_v / boss_ 系列），纯展示无收集机制；与战斗画面共用同一批透明图。
 * 里程碑：每收集满 10 个功法 / 10 个装备，奖励 1000 钻石（可连发多档）。
 */

// 记录一件已获得装备进图鉴收集集合（按 EQUIP_DB id 去重，出售/更换不移除）
function recordEquipCollected(item) {
  if (!item || !item.entryId) return;
  if (!player.equipCollected) player.equipCollected = [];
  if (!player.equipCollected.includes(item.entryId)) {
    player.equipCollected.push(item.entryId);
  }
  checkCodexReward();
}

// 当前已拥有的装备 entryId 集合：图鉴记录(equipCollected，含已售出) + 背包 + 已穿戴。
// 用「实时」集合而非仅依赖 equipCollected，避免「获得后未回溯/当次购买未记录」时漏标。
function ownedEquipSet() {
  const s = new Set(player.equipCollected || []);
  (player.bag || []).forEach(it => { if (it && it.entryId) s.add(it.entryId); });
  if (player.equipment && typeof player.equipment === 'object') {
    ['weapon', 'armor', 'accessory', 'boots'].forEach(k => { const it = player.equipment[k]; if (it && it.entryId) s.add(it.entryId); });
  }
  return s;
}

// 是否已拥有：供商店 / 副本三选一界面标注「（已拥有）」，防重复购买 / 重复选择
function isEquipOwned(entryId) {
  return entryId != null && ownedEquipSet().has(entryId);
}
function isSkillOwned(id) {
  return !!(player.learned && id != null && player.learned.includes(id));
}

// 图鉴里程碑奖励：每收集满 10 个功法 / 10 个装备，奖励 1000 钻石（可连发多档）
function checkCodexReward() {
  if (!player.codexReward) player.codexReward = { skill: 0, equip: 0 };
  const skillCount = (player.learned || []).length;
  while (skillCount >= (player.codexReward.skill + 1) * 10) {
    player.codexReward.skill++;
    grantCodexDiamond('功法', player.codexReward.skill * 10);
  }
  const equipCount = (player.equipCollected || []).length;
  while (equipCount >= (player.codexReward.equip + 1) * 10) {
    player.codexReward.equip++;
    grantCodexDiamond('装备', player.codexReward.equip * 10);
  }
}

function grantCodexDiamond(kind, count) {
  player.diamond = (player.diamond || 0) + 1000;
  if (window.showToast) window.showToast('图鉴 · 收集' + kind + '达 ' + count + ' 个，奖励 1000 钻石！');
  if (typeof saveGame === 'function') saveGame();
}

// ====== 界面 ======
function openCodex() {
  const totalSkills = SKILLS_DB.length;
  const gotSkills = (player.learned || []).length;
  const totalEquips = EQUIP_DB.length;
  const gotEquips = (player.equipCollected || []).length;
  const skillPct = totalSkills ? Math.round(gotSkills / totalSkills * 100) : 0;
  const equipPct = totalEquips ? Math.round(gotEquips / totalEquips * 100) : 0;
  const skillLeft = Math.max(0, Math.ceil(gotSkills / 10) * 10 - gotSkills);
  const equipLeft = Math.max(0, Math.ceil(gotEquips / 10) * 10 - gotEquips);

  let html = '<div class="hub-modal-title"><svg viewBox="0 0 24 24" fill="none" stroke="#D4A843" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg><h3 style="margin:0">图鉴</h3></div>';
  html += '<p style="font-size:12px;color:rgba(241,239,232,0.7);margin:4px 0 12px">收集功法与装备可解锁里程碑奖励：每满 <b style="color:#D4A843">10</b> 个奖励 <b style="color:#378ADD">1000 钻石</b>（功法、装备分别计数）。</p>';

  // 功法区
  html += sectionHeader('功法', gotSkills, totalSkills, skillPct, skillLeft, '个功法得 1000 钻', '#C0392B');
  html += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:6px">' +
    SKILLS_DB.map(s => {
      const got = (player.learned || []).includes(s.id);
      return codexCard(got, s.name, s.tierName + '·' + s.schoolCn, s.desc, '#C0392B');
    }).join('') + '</div>';

  // 装备区
  html += sectionHeader('装备', gotEquips, totalEquips, equipPct, equipLeft, '个装备得 1000 钻', '#378ADD');
  html += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:6px">' +
    EQUIP_DB.map(e => {
      const got = (player.equipCollected || []).includes(e.id);
      const rar = RARITY[e.rarity];
      const slotName = EQUIP_SLOTS[e.slot] ? EQUIP_SLOTS[e.slot].name : '';
      let eff = '';
      if (e.effect && EFFECT_META[e.effect.type]) eff = EFFECT_META[e.effect.type].name;
      if (e.effect2 && EFFECT_META[e.effect2.type]) eff += (eff ? '+' : '') + EFFECT_META[e.effect2.type].name;
      if (!eff && e.set && EQUIP_SETS[e.set]) eff = EQUIP_SETS[e.set].name + '套装';
      return codexCard(got, e.name, (rar ? rar.name : '') + '·' + slotName, eff, rar ? rar.color : '#888');
    }).join('') + '</div>';

  // 人物立绘区（写实古风，纯展示）
  const CHAR_GALLERY = [
    // 主角
    { id: 'hero_m1', name: '铁骨武者', desc: '健壮男性武者，赤膊劲装', cat: '主角' },
    { id: 'hero_m2', name: '少年侠客', desc: '英俊剑客，蓝白轻甲', cat: '主角' },
    { id: 'hero_m3', name: '道骨仙风', desc: '白发长须老道', cat: '主角' },
    { id: 'hero_f1', name: '灵气萝莉', desc: '双丸子头少女', cat: '主角' },
    { id: 'hero_f2', name: '绝代佳人', desc: '紫衣华服佳人', cat: '主角' },
    { id: 'hero_f3', name: '温婉御姐', desc: '蓝白古裙成熟女性', cat: '主角' },
    // 副本敌人（按卷）
    { id: 'enemy_v1',  name: '山贼',     desc: '卷1·粗壮土匪', cat: '副本敌人' },
    { id: 'enemy_v2',  name: '怨灵',     desc: '卷2·飘浮鬼魂', cat: '副本敌人' },
    { id: 'enemy_v3',  name: '血祭僵尸', desc: '卷3·暗红骷髅', cat: '副本敌人' },
    { id: 'enemy_v4',  name: '炎魔',     desc: '卷4·火焰恶魔', cat: '副本敌人' },
    { id: 'enemy_v5',  name: '金甲卫士', desc: '卷5·金色铠甲守卫', cat: '副本敌人' },
    { id: 'enemy_v6',  name: '海怪',     desc: '卷6·深海怪物', cat: '副本敌人' },
    { id: 'enemy_v7',  name: '纸傀',     desc: '卷7·诡异纸人偶', cat: '副本敌人' },
    { id: 'enemy_v8',  name: '魔将',     desc: '卷8·魔界将军', cat: '副本敌人' },
    { id: 'enemy_v9',  name: '堕神',     desc: '卷9·堕落天使', cat: '副本敌人' },
    { id: 'enemy_v10', name: '天兵',     desc: '卷10·天界士兵', cat: '副本敌人' },
    // 世界BOSS
    { id: 'boss_1', name: '幽冥魔尊', desc: '冥界之主', cat: '世界BOSS' },
    { id: 'boss_2', name: '焚天炎帝', desc: '火焰之主', cat: '世界BOSS' },
    { id: 'boss_3', name: '九幽冥皇', desc: '九幽地狱之皇', cat: '世界BOSS' },
    { id: 'boss_4', name: '血河神祖', desc: '血海之祖', cat: '世界BOSS' },
    { id: 'boss_5', name: '太虚帝尊', desc: '太虚之主', cat: '世界BOSS' },
  ];
  html += '<div style="margin:18px 0 6px;display:flex;align-items:center;justify-content:space-between">' +
      '<div class="equip-sec-title" style="margin:0;color:#9B59B6">📜 人物立绘</div>' +
      '<div style="font-size:12px;color:rgba(241,239,232,0.5)">' + CHAR_GALLERY.length + ' 张 · 写实古风原图</div>' +
    '</div>';
  // 按分类分组显示
  let curCat = '';
  CHAR_GALLERY.forEach(ch => {
    if (ch.cat !== curCat) {
      curCat = ch.cat;
      html += '<div style="font-size:11px;color:rgba(241,239,232,0.45);margin:10px 0 4px;text-transform:uppercase;letter-spacing:1px">' + esc(curCat) + '</div>';
    }
    html += '<div style="display:inline-block;border:1px solid rgba(155,89,182,0.35);background:rgba(255,255,255,0.03);border-radius:10px;padding:6px;width:100px;text-align:center;vertical-align:top;margin:4px 4px 4px 0">' +
      '<img src="assets/battle/' + ch.id + '.png" alt="' + esc(ch.name) + '" style="width:88px;height:124px;object-fit:contain;border-radius:6px;margin-bottom:4px" onerror="this.style.display=\'none\'"/>' +
      '<div style="font-weight:600;font-size:11.5px;color:#E8D5F0">' + esc(ch.name) + '</div>' +
      '<div style="font-size:10px;color:rgba(241,239,232,0.5);margin-top:1px;line-height:1.25">' + esc(ch.desc) + '</div>' +
      '</div>';
  });

  html += '<button class="btn-full" onclick="returnToHub()" style="margin-top:16px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.12)">返回主页</button>';
  openModal(html);
}

function sectionHeader(title, got, total, pct, left, rewardTxt, color) {
  return '<div style="margin:14px 0 6px;display:flex;align-items:center;justify-content:space-between">' +
      '<div class="equip-sec-title" style="margin:0">' + title + '收集 ' + got + '/' + total + '</div>' +
      '<div style="font-size:12px;color:rgba(241,239,232,0.6)">' + (left > 0 ? ('再收集 ' + left + ' ' + rewardTxt) : '已达里程碑') + '</div>' +
    '</div>' +
    '<div style="height:6px;background:rgba(255,255,255,0.08);border-radius:3px;overflow:hidden;margin-bottom:8px">' +
      '<div style="height:100%;width:' + pct + '%;background:' + color + ';border-radius:3px"></div></div>';
}

function codexCard(got, name, sub, desc, color) {
  if (got) {
    return '<div style="border:1px solid ' + (color || 'rgba(212,168,67,0.5)') + ';background:rgba(255,255,255,0.04);border-radius:8px;padding:6px 8px">' +
      '<div style="font-weight:600;color:#fff;font-size:13px">' + esc(name) + '</div>' +
      '<div style="font-size:11px;color:' + (color || 'rgba(241,239,232,0.7)') + '">' + esc(sub) + '</div>' +
      (desc ? '<div style="font-size:10px;color:rgba(241,239,232,0.5);margin-top:2px;line-height:1.3">' + esc(desc) + '</div>' : '') +
      '</div>';
  }
  return '<div style="border:1px dashed rgba(255,255,255,0.12);background:rgba(0,0,0,0.18);border-radius:8px;padding:6px 8px;opacity:0.6">' +
    '<div style="font-weight:600;font-size:13px">❓ ???</div>' +
    '<div style="font-size:11px;color:rgba(241,239,232,0.45)">未收集</div></div>';
}

window.openCodex = openCodex;
window.recordEquipCollected = recordEquipCollected;
window.checkCodexReward = checkCodexReward;
window.isEquipOwned = isEquipOwned;
window.isSkillOwned = isSkillOwned;

// 重建装备图鉴收集集合：把背包(bag)与已穿戴(equipment)中带 entryId 的装备并入 equipCollected（去重）。
// 用于图鉴功能上线前的旧存档回溯——老玩家历史已拥有的装备在 bag/equipment 里但从未写入 equipCollected，
// 导致图鉴大量灰显为未收集；同时兜底「任何获得装备的入口漏调 recordEquipCollected」的隐患（只要装备进背包/身上即解锁）。
// 关键修复：图鉴上线前的装备实体没有 entryId 字段，无法与 EQUIP_DB 对应，故先按「名称+部位」回填 entryId，
// 再记入 equipCollected，否则商店「已拥有」标注与图鉴收集都会失效。
function rebuildEquipCollected() {
  if (!player.equipCollected) player.equipCollected = [];
  // 名称+部位 → EQUIP_DB id（同名跨部位时 slot 作为区分键）
  const nameSlotToId = {};
  if (Array.isArray(EQUIP_DB)) EQUIP_DB.forEach(e => { if (e && e.name) nameSlotToId[e.name + '|' + e.slot] = e.id; });
  let dirty = false;
  const add = (it) => {
    if (!it || typeof it !== 'object') return;
    // 缺 entryId 的老装备：按 名称+部位 反查 EQUIP_DB 补回
    if (it.entryId == null && it.name && it.slot && nameSlotToId[it.name + '|' + it.slot]) {
      it.entryId = nameSlotToId[it.name + '|' + it.slot];
      dirty = true;
    }
    if (it.entryId != null && !player.equipCollected.includes(it.entryId)) {
      player.equipCollected.push(it.entryId);
    }
  };
  if (Array.isArray(player.bag)) player.bag.forEach(add);
  if (player.equipment && typeof player.equipment === 'object') {
    ['weapon', 'armor', 'accessory', 'boots'].forEach(s => add(player.equipment[s]));
  }
  // 回填了 entryId 则落盘，避免下次加载又变回无 entryId
  if (dirty && typeof saveGame === 'function') { try { saveGame(); } catch (e) {} }
}
window.rebuildEquipCollected = rebuildEquipCollected;
