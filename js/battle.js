/* battle.js — 地图节点 + 状态机 + 回合制战斗 + 输入 + Canvas 渲染
 * 由 index.html 拆分而来。加载顺序见 index.html 底部 <script> 列表，勿随意调整。
 * 注意：顶层 const/let 跨文件可直接引用，但不会挂到 window（详见 PROJECT.md 坑点 8.1）。
 */
// ---- 地图节点 ----
const nodes = [
  { id: 0, name: '清风镇',   x: 80,  y: 280, type: 'start',  cleared: true,  enemy: null },
  { id: 1, name: '黑松林',   x: 230, y: 210, type: 'battle', cleared: false, enemy: { name: '山贼头目', hp: 120, atk: 22, def: 9,  spd: 14 } },
  { id: 2, name: '断魂崖',   x: 390, y: 140, type: 'battle', cleared: false, enemy: { name: '血刀老祖', hp: 190, atk: 28, def: 11, spd: 20 } },
  { id: 3, name: '武林大会', x: 540, y: 70,  type: 'boss',   cleared: false, enemy: { name: '魔教教主', hp: 280, atk: 34, def: 15, spd: 22 } },
  { id: 4, name: '毒龙潭',   x: 590, y: 110, type: 'battle', cleared: false, enemy: { name: '毒龙尊者', hp: 350,  atk: 40,  def: 18, spd: 26 } },
  { id: 5, name: '幽冥谷',   x: 560, y: 180, type: 'boss',   cleared: false, enemy: { name: '幽冥谷主', hp: 520,  atk: 52,  def: 26, spd: 30 } },
  { id: 6, name: '落魂涧',   x: 610, y: 250, type: 'battle', cleared: false, enemy: { name: '噬魂魔将', hp: 600,  atk: 58,  def: 30, spd: 34 } },
  { id: 7, name: '血河渊',   x: 550, y: 310, type: 'boss',   cleared: false, enemy: { name: '血河神君', hp: 780,  atk: 70,  def: 38, spd: 40 } },
  { id: 8, name: '白骨岭',   x: 470, y: 280, type: 'battle', cleared: false, enemy: { name: '白骨夫人', hp: 850,  atk: 76,  def: 42, spd: 44 } },
  { id: 9, name: '剑冢',     x: 400, y: 220, type: 'boss',   cleared: false, enemy: { name: '剑魔独孤', hp: 1000, atk: 90,  def: 50, spd: 52 } },
  { id: 10, name: '焚天崖',  x: 500, y: 150, type: 'battle', cleared: false, enemy: { name: '焚天火尊', hp: 1080, atk: 96,  def: 54, spd: 56 } },
  { id: 11, name: '逍遥天',  x: 610, y: 80,  type: 'boss',   cleared: false, enemy: { name: '逍遥天主', hp: 1300, atk: 110, def: 62, spd: 60 } },
];
const unlocked = id => id === 0 || nodes[id - 1].cleared;

// ---- 状态机 ----
let state = 'map';          // 'map' | 'battle' | 'win' | 'lose' | 'clear'
let battle = null;
let floats = [];            // 飘字
let toast = '';             // 底部提示
let awaitingInput = false;
let _battleReturnBtn = null; // 战斗结束后的浮动返回按钮（DOM）

// 在 canvas 上方显示一个可见的 DOM 返回按钮（解决副本战斗结束后卡在胜利画面的核心问题）
function showBattleReturnBtn(text, action) {
  hideBattleReturnBtn(); // 先清旧的
  const btn = document.createElement('button');
  btn.textContent = text;
  btn.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-20px);z-index:999;' +
    'padding:12px 36px;font-size:16px;font-weight:700;color:#1a1a1a;background:#D4A843;border:none;' +
    'border-radius:8px;cursor:pointer;box-shadow:0 4px 16px rgba(0,0,0,0.4);' +
    'animation:btnPulse 1.5s ease-in-out infinite;';
  btn.onclick = function(e) { e.stopPropagation(); hideBattleReturnBtn(); action(); };
  const stage = document.querySelector('.stage');
  if (stage) { stage.style.position = 'relative'; stage.appendChild(btn); }
  _battleReturnBtn = btn;
}
function hideBattleReturnBtn() {
  if (_battleReturnBtn && _battleReturnBtn.parentNode) _battleReturnBtn.parentNode.removeChild(_battleReturnBtn);
  _battleReturnBtn = null;
}

function makeEnemy(node) {
  const e = node.enemy;
  return {
    name: e.name, isEnemy: true,
    maxHp: e.hp, hp: e.hp, maxMp: 40, mp: 40,
    atk: e.atk, def: e.def, spd: e.spd,
    init: Math.round(10 + e.spd * 2), eva: 0.05, spiAtk: 0, spiDef: e.def, luck: 0,
    potions: 0, defending: false, extraActions: 0,
    buffs: [], debuffs: [], shield: null, stun: 0,
    skill: { name: '敌袭', type: 'phys', mult: 1.8, cost: 10 },
  };
}

// 构建战斗指令栏：普攻 + 已装备功法（≤6）+ 防御 + 道具
function buildSkillBar() {
  const skills = (player.equippedSkills || []).map(id => SKILLS_DB_MAP[id]).filter(Boolean);
  let html = '<button data-act="attack">攻击</button>';
  skills.forEach(s => {
    html += `<button data-act="skill" data-skill="${s.id}" data-cost="${s.cost}" title="${esc(s.desc)}">${esc(s.name)}<small style="opacity:.7"> ${s.cost}灵</small></button>`;
  });
  html += '<button data-act="defend">防御</button><button data-act="item">道具</button>';
  cmdBar.innerHTML = html;
}

function startBattle(node, mode) {
  const isWB = mode === 'worldboss';
  const enemy = isWB ? makeWorldBoss(node._wb) : makeEnemy(node);
  // 重置玩家本场战斗的临时状态（buff/debuff/护盾/僵直），避免跨场残留
  player.buffs = []; player.debuffs = []; player.shield = null; player.stun = 0;
  battle = {
    node, player, enemy,
    mode: mode || 'map',          // 'map' = 江湖节点；'story' = 剧情副本；'worldboss' = 世界BOSS
    queue: [], turn: 0, roundCount: 0, playerDmg: 0,
    msg: (isWB ? '世界BOSS · ' : '遭遇 ') + enemy.name + '！',
  };
  state = 'battle';
  toast = '';
  hideBattleReturnBtn(); // 新战斗开始 → 清掉残留的返回按钮
  buildSkillBar();
  beginRound();
}

// 状态乘区：buff 加成（amt 为比例，1 即 +0%）、debuff 削减（下限 0）
function buffMul(u, stat) { let m = 1; (u.buffs || []).forEach(b => { if (b.stat === stat) m += b.amt; }); return m; }
function debuffMul(u, stat) { let m = 1; (u.debuffs || []).forEach(b => { if (b.stat === stat) m -= b.amt; }); return Math.max(0, m); }
// 回合开始：衰减 buff/debuff/shield 持续时间（stun 在下面单独处理）
function tickDurations(u) {
  if (u.buffs) u.buffs = u.buffs.filter(b => (b.dur -= 1) > 0);
  if (u.debuffs) u.debuffs = u.debuffs.filter(b => (b.dur -= 1) > 0);
  if (u.shield && (u.shield.dur -= 1) <= 0) u.shield = null;
}

function beginRound() {
  // 世界BOSS：单场最多 WB_MAX_ROUNDS 回合，超出则按当前累计伤害结算
  if (battle.mode === 'worldboss') {
    battle.roundCount = (battle.roundCount || 0) + 1;
    if (battle.roundCount > WB_MAX_ROUNDS) { endWorldBossBattle(false); return; }
  }
  const p = battle.player, e = battle.enemy;
  // 每回合开始小幅回内力，清掉上一轮防御
  [p, e].forEach(u => { if (u.hp > 0) { u.mp = Math.min(u.maxMp, u.mp + 5); u.defending = false; } });
  // 衰减 buff/debuff/shield 持续时间
  [p, e].forEach(tickDurations);
  // 僵直（stun）：本回合无法行动，并递减
  const pStun = (p.stun || 0) > 0, eStun = (e.stun || 0) > 0;
  if (pStun) p.stun--;
  if (eStun) e.stun--;
  const alive = [p, e].filter(u => u.hp > 0 && !(u === p ? pStun : eStun));
  let queue = [];
  if (alive.length === 2) {
    // 先攻值多段：比值越高快者连动越多（2×→2次, 4×→3次, 6×→4次, 8×→5次, 10×→6次）
    // 极品装备 extraActions 额外追加本回合连动次数；增益·速度 buff 提升实际先攻
    const pInit = p.init * buffMul(p, 'init');
    const eInit = e.init * buffMul(e, 'init');
    const faster = pInit >= eInit ? p : e;
    const slower = faster === p ? e : p;
    const ratio = faster.init / Math.max(1, slower.init);
    let n = ratio >= 2 ? Math.floor(ratio / 2) + 1 : 1;
    n += (faster.extraActions || 0);
    for (let i = 0; i < n; i++) queue.push(faster);
    queue.push(slower);
  } else if (alive.length === 1) {
    queue = alive; // 一方被僵直，仅另一方行动
  } else {
    queue = []; // 双方均被僵直：跳过本回合
  }
  battle.queue = queue;
  battle.turn = 0;
  processTurn();
}

function processTurn() {
  if (checkEnd()) return;
  while (battle.turn < battle.queue.length && battle.queue[battle.turn].hp <= 0) battle.turn++;
  if (battle.turn >= battle.queue.length) { beginRound(); return; }

  const cur = battle.queue[battle.turn];
  cur.defending = false; // 防御只持续到自身下一回合

  if (cur.isEnemy) {
    awaitingInput = false;
    setButtons(false);
    battle.msg = cur.name + ' 的回合';
    setTimeout(() => enemyAct(cur), 650);
  } else {
    awaitingInput = true;
    battle.msg = '你的回合 — 选择指令';
    setButtons(true);
  }
}

function setButtons(on) {
  [...cmdBar.querySelectorAll('button')].forEach(b => {
    const act = b.dataset.act;
    let enabled = on;
    if (act === 'skill') {
      const c = +b.dataset.cost;
      if (player.mp < c) enabled = false; // 灵力不足置灰
    }
    if (act === 'item' && player.potions <= 0) enabled = false;
    b.disabled = !enabled;
    b.style.opacity = enabled ? '1' : '0.4';
  });
}

function damage(attacker, target, mult, type) {
  // 闪避判定：目标闪避率越高越易躲开
  if (target.eva && Math.random() < target.eva) {
    floats.push({ x: target._x, y: target._y, text: '闪避', color: '#9B6BCC', ttl: 60 });
    battle.msg = target.name + ' 身形一晃，闪开了攻击！';
    return 0;
  }
  // 物理攻击用 atk/def，精神攻击用 spiAtk/spiDef；增益/减益乘区实时生效
  const isSpirit = type === 'spirit';
  const atkStat = (isSpirit ? attacker.spiAtk : attacker.atk) * buffMul(attacker, isSpirit ? 'spiAtk' : 'atk');
  const defStat = (isSpirit ? target.spiDef : target.def) * debuffMul(target, isSpirit ? 'spiDef' : 'def');
  let base = atkStat * mult - defStat * 0.5;
  // 暴击：基础 15% + 增益·暴击 buff
  const critChance = 0.15 + Math.max(0, buffMul(attacker, 'crit') - 1);
  const crit = Math.random() < critChance;
  if (crit) base *= 1.5;
  if (target.defending) base *= 0.5;
  // 护体（shield）：按比例减伤
  if (target.shield && target.shield.pct) base *= (1 - target.shield.pct);
  base = Math.max(1, Math.round(base));
  target.hp = Math.max(0, target.hp - base);
  if (!attacker.isEnemy && battle) battle.playerDmg = (battle.playerDmg || 0) + base; // 世界BOSS 累计玩家伤害
  const col = crit ? '#A32D2D' : '#2C2C2A';
  const txt = (crit ? '暴击 ' : '') + '-' + base;
  floats.push({ x: target._x, y: target._y, text: txt, color: col, ttl: 60 });
  return base;
}

// 施展功法（player 的 SKILLS_DB 条目，含 effect）
function applySkill(actor, target, sk) {
  actor.mp -= sk.cost;
  const e = sk.effect || { kind: 'dmg', type: sk.type, mult: sk.mult };
  const floatAt = (u, text, color) => floats.push({ x: u._x, y: u._y, text, color, ttl: 60 });
  switch (e.kind) {
    case 'dmg': {
      let d;
      if (e.pierce) { // 穿透：无视部分护甲
        const atkStat = (e.type === 'spirit' ? actor.spiAtk : actor.atk) * buffMul(actor, e.type === 'spirit' ? 'spiAtk' : 'atk');
        const defStat = (e.type === 'spirit' ? target.spiDef : target.def) * 0.25;
        let base = atkStat * e.mult - defStat;
        if (Math.random() < 0.15) base *= 1.5;
        if (target.defending) base *= 0.5;
        d = Math.max(1, Math.round(base));
        target.hp = Math.max(0, target.hp - d);
        if (!actor.isEnemy && battle) battle.playerDmg = (battle.playerDmg || 0) + d; // 穿透伤害也累计
      } else {
        d = damage(actor, target, e.mult, e.type);
      }
      battle.msg = actor.name + ' 施展「' + sk.name + '」造成 ' + d + ' 伤害';
      if (e.lifesteal) { const h = Math.round(d * e.lifesteal); actor.hp = Math.min(actor.maxHp, actor.hp + h); floatAt(actor, '+' + h, '#3B6D11'); }
      break;
    }
    case 'heal_hp': {
      const amt = Math.round(actor.maxHp * (e.pct || 0)) + (e.flat || 0);
      actor.hp = Math.min(actor.maxHp, actor.hp + amt);
      floatAt(actor, '+' + amt, '#3B6D11');
      battle.msg = actor.name + ' 施展「' + sk.name + '」回复 ' + amt + ' 气血';
      break;
    }
    case 'heal_mp': {
      const amt = Math.round(actor.maxMp * (e.pct || 0)) + (e.flat || 0);
      actor.mp = Math.min(actor.maxMp, actor.mp + amt);
      floatAt(actor, '+' + amt + '灵', '#378ADD');
      battle.msg = actor.name + ' 施展「' + sk.name + '」回复 ' + amt + ' 灵力';
      break;
    }
    case 'shield': {
      actor.shield = { pct: e.pct, dur: e.dur };
      battle.msg = actor.name + ' 施展「' + sk.name + '」护体（减伤 ' + Math.round(e.pct * 100) + '%）';
      break;
    }
    case 'buff': {
      actor.buffs.push({ stat: e.stat, amt: e.amt, dur: e.dur });
      battle.msg = actor.name + ' 施展「' + sk.name + '」' + statCn(e.stat) + '提升';
      break;
    }
    case 'debuff': {
      target.debuffs.push({ stat: e.stat, amt: e.amt, dur: e.dur });
      battle.msg = actor.name + ' 施展「' + sk.name + '」削弱 ' + target.name;
      break;
    }
    case 'stun': {
      target.stun = (target.stun || 0) + e.dur;
      battle.msg = actor.name + ' 施展「' + sk.name + '」令 ' + target.name + ' 僵直';
      break;
    }
    case 'absorb': { // 化盾：按伤害比例转为护盾吸收
      actor.shield = { pct: 1, dur: e.dur, absorb: e.amt };
      battle.msg = actor.name + ' 施展「' + sk.name + '」凝盾';
      break;
    }
    case 'critup': {
      actor.buffs.push({ stat: 'crit', amt: e.amt, dur: e.dur });
      battle.msg = actor.name + ' 施展「' + sk.name + '」暴击提升';
      break;
    }
    default:
      battle.msg = actor.name + ' 施展「' + sk.name + '」（未知效果）';
  }
}

function statCn(stat) {
  return ({ atk: '攻击', def: '防御', init: '速度', spiAtk: '精神攻击', spiDef: '精神防御', crit: '暴击' })[stat] || stat;
}

function applyAction(actor, target, act) {
  if (act === 'attack') {
    const d = damage(actor, target, 1.0);
    battle.msg = actor.name + ' 使出攻击，造成 ' + d + ' 伤害';
  } else if (act === 'skill') {
    // 敌方专用（玩家功法走 applySkill）
    const sk = actor.skill;
    actor.mp -= sk.cost;
    const d = damage(actor, target, sk.mult, sk.type);
    battle.msg = actor.name + ' 施展「' + sk.name + '」，造成 ' + d + ' 伤害';
  } else if (act === 'defend') {
    actor.defending = true;
    battle.msg = actor.name + ' 运功防御，下一击伤害减半';
  } else if (act === 'item') {
    if (actor.potions > 0) {
      actor.potions--;
      const heal = 50;
      actor.hp = Math.min(actor.maxHp, actor.hp + heal);
      floats.push({ x: actor._x, y: actor._y, text: '+' + heal, color: '#3B6D11', ttl: 60 });
      battle.msg = actor.name + ' 服用金疮药，恢复 ' + heal + ' 气血';
    }
  }
}

function enemyAct(enemy) {
  const act = (enemy.mp >= enemy.skill.cost && Math.random() < 0.5) ? 'skill' : 'attack';
  applyAction(enemy, battle.player, act);
  nextTurn();
}

function playerAct(act, skillId) {
  if (!awaitingInput) return;
  awaitingInput = false;
  setButtons(false);
  if (act === 'skill') {
    const sk = skillId ? SKILLS_DB_MAP[skillId] : null;
    if (sk && player.mp >= sk.cost) {
      applySkill(battle.player, battle.enemy, sk);
    } else {
      applyAction(battle.player, battle.enemy, 'attack'); // 灵力不足回退普攻
    }
  } else {
    applyAction(battle.player, battle.enemy, act);
  }
  nextTurn();
}

function nextTurn() {
  battle.turn++;
  setTimeout(processTurn, 500);
}

function checkEnd() {
  // 世界BOSS：击杀/阵亡/回合耗尽都视为「结算」（记录累计伤害，不触发地图/副本逻辑）
  if (battle.mode === 'worldboss') {
    if (battle.enemy.hp <= 0) { endWorldBossBattle(true); return true; }
    if (battle.player.hp <= 0) { endWorldBossBattle(false); return true; }
    return false;
  }
  if (battle.enemy.hp <= 0) {
    endBattle(true); return true;
  }
  if (battle.player.hp <= 0) {
    endBattle(false); return true;
  }
  return false;
}

function endBattle(win) {
  awaitingInput = false;
  setButtons(false);
  if (win) {
    battle.node.cleared = true;
    const before = CULTIVATION.realmFromXp(player.xp).globalIndex;
    let dropMsg = '';
    let clearAll = false; // 江湖地图全通
    if (battle.mode === 'story') {
      const st = battle.node._story || {};
      const ch = st.ch, lv = st.lv;
      const levelKey = ch + '_' + lv;
      const isFirstClear = !player.storyLevelFirstClear[levelKey];
      // 进度推进：记录本章已通关的最高关卡（无论首通/重战都更新）
      const prev = player.storyCleared[ch] || 0;
      if (lv > prev) player.storyCleared[ch] = lv;
      if (isFirstClear) {
        player.storyLevelFirstClear[levelKey] = true;   // 标记首通
        // 经验奖励：仅首通获得
        gainXp(STORY_BY_CH[ch].levels[lv - 1], false);
        player.score = player.xp;
        player.gold = (player.gold || 0) + (10 + ch);
        // 小概率装备掉落（仅首通）
        if (Math.random() < 0.35) {
          const dslot = EQUIP_SLOT_KEYS[Math.floor(Math.random() * EQUIP_SLOT_KEYS.length)];
          const drop = genEquip(dslot, rollRarity());
          player.bag.push(drop);
          dropMsg = ' 拾得' + drop.name + '！';
        }
      } else {
        dropMsg = '（已通关，重战无额外奖励）';
      }
    } else {
      const gain = 100 * battle.node.id;            // 战绩分：按节点难度递增
      player.xp += gain;
      player.score = player.xp;                     // 战绩分=累计修为，排行榜可直接显示境界
      const goldGain = 20 + battle.node.id * 15;
      player.gold = (player.gold || 0) + goldGain;
      if (Math.random() < 0.4) {
        const dslot = EQUIP_SLOT_KEYS[Math.floor(Math.random() * EQUIP_SLOT_KEYS.length)];
        const drop = genEquip(dslot, rollRarity());
        player.bag.push(drop);
        dropMsg = ' 拾得' + drop.name + '！';
      }
      // 功法掉落：BOSS 高概率、普通战低概率；只掉未习得且非「待副本」锁定的功法
      const skillChance = battle.node.type === 'boss' ? 0.6 : 0.2;
      if (Math.random() < skillChance) {
        const pool = SKILLS_DB.filter(s => !player.learned.includes(s.id) && !s.lockedUntil);
        if (pool.length) {
          const ds = pool[Math.floor(Math.random() * pool.length)];
          player.learned.push(ds.id);
          dropMsg += ' 习得功法《' + ds.name + '》！';
        }
      }
      if (battle.node.id === nodes.length - 1) clearAll = true;
    }
    if (window.Online && window.Online.onProgress) window.Online.onProgress(player.score);
    const after = CULTIVATION.realmFromXp(player.xp);
    const oldMax = player.maxHp;
    recalcStats(player);                          // 境界提升 → 属性增强
    player.hp = Math.min(player.maxHp, (player.hp || 0) + (player.maxHp - oldMax) + 40); // 突破增益 + 胜利回血
    player.mp = player.maxMp;
    state = (battle.mode === 'story') ? 'win' : (clearAll ? 'clear' : 'win');
    const broke = after.globalIndex > before;
    const realmUp = after.realmIndex > CULTIVATION.FLAT[before].realmIndex;
    let toastMsg = clearAll ? '你击败了' + battle.node.enemy.name + '，江湖太平！' : '胜利！';
    if (broke) toastMsg = (realmUp ? '★ 突破大境界！晋升【' : '突破！晋升【') + after.label + '】';
    toast = toastMsg + dropMsg + (battle.mode === 'story' ? ' 点击继续。' : ' 点击地图继续。');
    saveGame();
    // 副本战斗结束：立即在 canvas 上方显示可见的「返回」按钮（不再依赖不可靠的 setTimeout + modal）
    if (battle.mode === 'story') {
      const isChapterClear = player.storyCleared[(battle.node._story || {}).ch] >= 10;
      showBattleReturnBtn(isChapterClear ? '领取通关奖励' : '返回副本', function() {
        if (typeof storyAfterBattle === 'function') storyAfterBattle();
      });
    }
  } else {
    state = 'lose';
    toast = battle.mode === 'story' ? '你倒下了…点击重新挑战。' : '你倒下了…点击地图重新挑战。';
    // 副本失败：也显示返回按钮
    if (battle.mode === 'story') {
      showBattleReturnBtn('返回副本', function() {
        if (typeof storyAfterBattle === 'function') storyAfterBattle();
      });
    }
  }
}

// 世界BOSS 结算：累计伤害 → 写入该时段 → 弹结果界面（不发经验/不掉落，奖励走排名）
function endWorldBossBattle(killed) {
  awaitingInput = false;
  setButtons(false);
  const slot = battle.node._wb;
  const dmg = battle.playerDmg || 0;
  ensureWorldBossDaily();
  const slotData = player.worldBoss.slots[slot];
  slotData.dmg = (slotData.dmg || 0) + dmg;
  saveGame();
  state = 'win';
  toast = (killed ? '★ 你斩杀了世界BOSS！' : '挑战结束 — ') + '本场造成 ' + dmg + ' 伤害（累计 ' + slotData.dmg + '）。点击查看排行。';
  openWorldBossResult(slot);
}

// ---- 输入（事件委托：指令栏按钮每场战斗动态重建）----
cmdBar.addEventListener('click', e => {
  const b = e.target.closest('button');
  if (!b || b.disabled) return;
  playerAct(b.dataset.act, b.dataset.skill);
});

canvas.addEventListener('click', e => {
  const r = canvas.getBoundingClientRect();
  const x = (e.clientX - r.left) * (W / r.width);
  const y = (e.clientY - r.top) * (H / r.height);
  if (state === 'map') {
    for (const n of nodes) {
      if (Math.hypot(x - n.x, y - n.y) < 26 && unlocked(n.id)) {
        if (n.type === 'start') { toast = '清风镇 — 休整之地，点击前方地点出发。'; }
        else startBattle(n);
        return;
      }
    }
    // 点击空白区域 → 返回主页
    if (window.HUB) { window.HUB.show(); }
  } else if (state === 'win' || state === 'lose' || state === 'clear') {
    // 战斗结束 → 剧情副本返回副本界面，世界BOSS 弹排行，江湖战斗返回主页
    if (battle && battle.mode === 'story') {
      storyAfterBattle();   // 抽到 story.js：章节通关弹三选一，否则回本章
    } else if (battle && battle.mode === 'worldboss') {
      openWorldBossResult(battle.node._wb);
    } else if (window.HUB) { window.HUB.refresh(); window.HUB.show(); }
    else { state = 'map'; toast = ''; }
  }
});

// ---- 渲染 ----
function drawPlaceholder(x, y, w, h, label, tint) {
  ctx.fillStyle = '#D3D1C7';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = '#888780';
  ctx.setLineDash([5, 4]);
  ctx.strokeRect(x, y, w, h);
  ctx.setLineDash([]);
  ctx.fillStyle = '#5F5E5A';
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(label, x + w / 2, y + h / 2);
}

function bar(x, y, w, ratio, color) {
  ctx.fillStyle = '#fff';
  ctx.fillRect(x, y, w, 8);
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w * Math.max(0, ratio), 8);
  ctx.strokeStyle = '#B4B2A9';
  ctx.strokeRect(x, y, w, 8);
}

function drawMap() {
  // 路径
  ctx.strokeStyle = '#B4B2A9';
  ctx.lineWidth = 2;
  for (let i = 1; i < nodes.length; i++) {
    ctx.beginPath();
    ctx.moveTo(nodes[i - 1].x, nodes[i - 1].y);
    ctx.lineTo(nodes[i].x, nodes[i].y);
    ctx.stroke();
  }
  // 节点
  for (const n of nodes) {
    const on = unlocked(n.id);
    ctx.beginPath();
    ctx.arc(n.x, n.y, 18, 0, Math.PI * 2);
    ctx.fillStyle = n.cleared ? '#97C459' : (on ? '#85B7EB' : '#D3D1C7');
    ctx.fill();
    ctx.strokeStyle = n.type === 'boss' ? '#C0392B' : '#5F5E5A';
    ctx.lineWidth = n.type === 'boss' ? 3 : 1;
    ctx.stroke();
    ctx.fillStyle = '#2C2C2A';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(n.name, n.x, n.y + 34);
    if (n.cleared) { ctx.fillStyle = '#3B6D11'; ctx.fillText('✓', n.x, n.y + 4); }
  }
  ctx.fillStyle = '#2C2C2A';
  ctx.font = '13px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('江湖地图 · ' + CULTIVATION.realmFromXp(player.xp).label + ' — 点击蓝色地点启程（空白处返回主页）', 20, 30);
}

function drawBattle() {
  // 背景
  if (ready(art.bg)) {
    ctx.drawImage(art.bg, 0, 0, W, H);
  } else {
    ctx.fillStyle = '#E9E4D8';
    ctx.fillRect(0, 0, W, H);
  }
  const p = battle.player, e = battle.enemy;
  p._x = 150; p._y = 200;
  e._x = 490; e._y = 160;

  // 敌方
  if (ready(art.enemy)) ctx.drawImage(art.enemy, e._x - 50, e._y - 70, 100, 140);
  else drawPlaceholder(e._x - 50, e._y - 70, 100, 140, '即梦·敌方立绘', '#D3D1C7');
  // 我方
  if (ready(art.hero)) ctx.drawImage(art.hero, p._x - 50, p._y - 70, 100, 140);
  else drawPlaceholder(p._x - 50, p._y - 70, 100, 140, '即梦·我方立绘', '#D3D1C7');

  // 血条/内力条
  ctx.textAlign = 'left';
  ctx.fillStyle = '#2C2C2A'; ctx.font = '12px sans-serif';
  ctx.fillText(p.name + '　' + CULTIVATION.realmFromXp(p.xp).label, p._x - 50, p._y - 80);
  bar(p._x - 50, p._y - 74, 100, p.hp / p.maxHp, '#639922');
  bar(p._x - 50, p._y - 64, 100, p.mp / p.maxMp, '#378ADD');

  ctx.textAlign = 'right';
  ctx.fillStyle = '#2C2C2A';
  ctx.fillText(e.name, e._x + 50, e._y - 80);
  bar(e._x - 50, e._y - 74, 100, e.hp / e.maxHp, '#A32D2D');
  bar(e._x - 50, e._y - 64, 100, e.mp / e.maxMp, '#378ADD');

  // 飘字
  floats.forEach(f => {
    ctx.globalAlpha = Math.max(0, f.ttl / 60);
    ctx.fillStyle = f.color;
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(f.text, f.x, f.y - (60 - f.ttl) * 0.5);
    ctx.globalAlpha = 1;
  });
  floats = floats.filter(f => --f.ttl > 0);

  // 底部信息
  ctx.fillStyle = 'rgba(241,239,232,0.92)';
  ctx.fillRect(0, H - 30, W, 30);
  ctx.fillStyle = '#2C2C2A';
  ctx.font = '13px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(battle.msg + '　(丹药:' + p.potions + ')', 12, H - 10);
}

function drawOverlay(text) {
  ctx.fillStyle = 'rgba(44,44,42,0.55)';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#fff';
  ctx.font = '16px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(text, W / 2, H / 2);
}

function render() {
  // 主页/创建界面是 DOM 层，不需要画布持续重绘；跳过 60fps 空转，把算力让给视频解码
  if (state === 'hub' || state === 'create') { requestAnimationFrame(render); return; }
  ctx.clearRect(0, 0, W, H);
  if (state === 'create') {
    ctx.fillStyle = '#111'; ctx.fillRect(0, 0, W, H);
  } else if (state === 'map') {
    drawMap();
  } else if (state === 'battle') {
    drawBattle();
  } else if (state === 'win') {
    drawBattle(); drawOverlay('胜 利');
  } else if (state === 'lose') {
    drawBattle(); drawOverlay('败 北');
  } else if (state === 'clear') {
    drawBattle(); drawOverlay('江 湖 太 平');
  }
  if (toast) {
    ctx.fillStyle = 'rgba(241,239,232,0.95)';
    ctx.fillRect(0, H - 24, W, 24);
    ctx.fillStyle = '#2C2C2A';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(toast, W / 2, H - 8);
  }
  requestAnimationFrame(render);
}

// 暴露给外部（测试/故事模块）
window.showBattleReturnBtn = showBattleReturnBtn;
window.hideBattleReturnBtn = hideBattleReturnBtn;
