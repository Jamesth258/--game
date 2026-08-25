/* battle.js — 地图节点 + 状态机 + 回合制战斗 + 输入 + Canvas 渲染
 * 由 index.html 拆分而来。加载顺序见 index.html 底部 <script> 列表，勿随意调整。
 * 注意：顶层 const/let 跨文件可直接引用，但不会挂到 window（详见 PROJECT.md 坑点 8.1）。
 */
// ---- 地图节点（已移除：map 模式无 UI 入口）----

// ---- 状态机 ----
let state = 'hub';          // 'hub' | 'battle' | 'win' | 'lose'
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

// ===== 立绘映射（梦幻西游风格：Q版SD精灵 + 光圈底座）=====
// 主角按 avatarId 区分；副本敌人按所属「卷」(volume 1~10) 区分；世界BOSS 按 slot idx 区分。
// Q版精灵（_q_后缀）为战斗专用，不覆盖 art.hero / art.enemy（主页/创建界面共享立绘）。
const HERO_SPRITES = {
  m1: 'assets/battle/hero_q_m1.png', m2: 'assets/battle/hero_q_m2.png', m3: 'assets/battle/hero_q_m3.png',
  f1: 'assets/battle/hero_q_f1.png', f2: 'assets/battle/hero_q_f2.png', f3: 'assets/battle/hero_q_f3.png',
};
const ENEMY_SPRITES = {
  1: 'assets/battle/enemy_q_v1.png', 2: 'assets/battle/enemy_q_v2.png', 3: 'assets/battle/enemy_q_v3.png',
  4: 'assets/battle/enemy_q_v4.png', 5: 'assets/battle/enemy_q_v5.png', 6: 'assets/battle/enemy_q_v6.png',
  7: 'assets/battle/enemy_q_v7.png', 8: 'assets/battle/enemy_q_v8.png', 9: 'assets/battle/enemy_q_v9.png',
  10: 'assets/battle/enemy_q_v10.png',
};
const BOSS_SPRITES = {
  1: 'assets/battle/boss_q_1.png', 2: 'assets/battle/boss_q_2.png', 3: 'assets/battle/boss_q_3.png',
  4: 'assets/battle/boss_q_4.png', 5: 'assets/battle/boss_q_5.png',
};

function makeEnemy(node) {
  const e = node.enemy;
  return {
    name: e.name, isEnemy: true,
    maxHp: e.hp, hp: e.hp, maxMp: 40, mp: 40,
    atk: e.atk, def: e.def, spd: e.spd,
    init: Math.round(10 + e.spd * 2), eva: 0.05, spiAtk: 0, spiDef: e.def, luck: 0,
    potions: 0, defending: false, extraActions: 0,
    buffs: [], debuffs: [], shield: null, stun: 0, poison: null,
    skill: { name: '敌袭', type: 'phys', mult: 1.8, cost: 10 },
    _x: 490, _y: 160,
  };
}

// 构建战斗指令栏：普攻 + 已装备功法（≤6）+ 道具
function buildSkillBar() {
  const skills = (player.equippedSkills || []).map(id => SKILLS_DB_MAP[id]).filter(s => s && s.kind !== 'passive');
  let html = '<button class="battle-cmd" data-act="attack">⚔️ 攻击</button>';
  skills.forEach(s => {
    html += `<button class="battle-cmd skill" data-act="skill" data-skill="${s.id}" data-cost="${s.cost}" title="${esc(s.desc)}"><span class="cmd-name">${esc(s.name)}</span><span class="cmd-cost">${s.cost}灵</span></button>`;
  });
  html += '<button class="battle-cmd item" data-act="item">🎒 道具</button>';
  cmdBar.innerHTML = html;
}

function startBattle(node, mode) {
  const isWB = mode === 'worldboss';
  const enemy = isWB ? makeWorldBoss(node._wb) : makeEnemy(node);
  // 根据场景切换战斗背景
  if (isWB) {
    const slot = WB_SLOTS.find(s => s.idx === node._wb) || WB_SLOTS[0];
    loadBattleBg(slot.bg);
  } else if (node && node._story && node._story.ch && typeof STORY_BY_CH !== 'undefined') {
    loadBattleBg((STORY_BY_CH[node._story.ch] || {}).bg);
  } else {
    loadBattleBg(null);
  }
  // 重置玩家本场战斗的临时状态（buff/debuff/护盾/僵直），避免跨场残留
  player.buffs = []; player.debuffs = []; player.shield = null; player.stun = 0; player.poison = null;
  // 聚合装备特效；若带「罡气」类特效则开局获得护盾
  const mods = (typeof computeEquipMods === 'function') ? computeEquipMods(player) : null;
  if (mods && mods.shieldPct > 0) player.shield = { pct: mods.shieldPct, dur: 999 };
  battle = {
    node, player, enemy,
    mode: mode || 'story',         // 'story' = 剧情副本；'worldboss' = 世界BOSS
    queue: [], turn: 0, roundCount: 0, playerDmg: 0, mods,
    _stackCrit: 0, _reviveUsed: false,
    msg: (isWB ? '世界BOSS · ' : '遭遇 ') + enemy.name + '！',
  };
  // 立绘（方案A）：按 avatarId / 卷 / BOSS 动态加载写实古风立绘，挂到 battle 上（不污染 art.hero / art.enemy）
  battle.heroSprite = loadImg(HERO_SPRITES[player.avatarId] || HERO_SPRITES.m1);
  let _enemySrc;
  if (isWB) {
    const _slot = WB_SLOTS.find(s => s.idx === node._wb) || WB_SLOTS[0];
    _enemySrc = BOSS_SPRITES[_slot.idx] || BOSS_SPRITES[1];
  } else if (node && node._story && node._story.ch && typeof STORY_BY_CH !== 'undefined') {
    const _vol = (STORY_BY_CH[node._story.ch] || {}).volume || 1;
    _enemySrc = ENEMY_SPRITES[_vol] || ENEMY_SPRITES[1];
  } else {
    _enemySrc = ENEMY_SPRITES[1];
  }
  battle.enemySprite = loadImg(_enemySrc);
  state = 'battle';
  toast = '';
  hideBattleReturnBtn(); // 新战斗开始 → 清掉残留的返回按钮
  buildSkillBar();
  // 提前锁定飘字坐标（锚定到新战斗画面精灵头顶附近）
  battle.player._x = 210; battle.player._y = 244;
  battle.enemy._x = 430; battle.enemy._y = 244;
  beginRound();
}

// 状态乘区：buff 加成（amt 为比例，1 即 +0%）、debuff 削减（下限 0）
function buffMul(u, stat) { let m = 1; (u.buffs || []).forEach(b => { if (b.stat === stat) m += b.amt; }); return m; }
function debuffMul(u, stat) { let m = 1; (u.debuffs || []).forEach(b => { if (b.stat === stat) m -= b.amt; }); return Math.max(0, m); }

// 聚合玩家已穿戴装备 + 套装的战斗特效，返回统一的 mods 对象（battle.mods 使用）
// 注：recalcStats(player) 也算 critRate/critDmg/套装 面板值（player.js:195-216），
//   但本函数是战斗运行时的唯一真源。两处独立维护，改特效时须同步。
//   accuracy(精准)特效在 recalcStats 中已永久并入 player.hitRate（面板可见、受 100% 封顶），不在战斗内临时叠加。
function computeEquipMods(p) {
  const m = {
    critRate: 0, critDmg: 0, lifesteal: 0, reflect: 0, pierce: 0, dmgAmp: 0,
    reduceDmg: 0, shieldPct: 0, regenHp: 0, regenMp: 0, extraActions: 0,
    burn: 0, lowHpCrit: 0, lowHpDmg: 0, stackCrit: 0, revive: 0,
  };
  const worn = p.equipment || {};
  const setCount = {};
  for (const slot in worn) {
    const it = worn[slot];
    if (!it) continue;
    if (it.extraActions) m.extraActions += it.extraActions;
    for (const e of resolvedEquipEffects(it)) {
      const v = e.v || 0;
      switch (e.type) {
        case 'crit':      m.critRate  += v / 100; break;
        case 'critdmg':   m.critDmg   += v / 100; break;
        case 'lifesteal': m.lifesteal += v / 100; break;
        case 'reflect':   m.reflect   += v / 100; break;
        case 'pierce':    m.pierce    += v / 100; break;
        case 'dmgamp':    m.dmgAmp    += v / 100; break;
        case 'reducedmg': m.reduceDmg += v / 100; break;
        case 'shield':    m.shieldPct += v / 100; break;
        case 'regenhp':   m.regenHp   += v / 100; break;
        case 'regenmp':   m.regenMp   += v; break;
        case 'burn':      m.burn      += v / 100; break;
        case 'lowhpcrit': m.lowHpCrit += v / 100; break;
        case 'lowhpdmg':  m.lowHpDmg  += v / 100; break;
        case 'stackcrit': m.stackCrit += v / 100; break;
        case 'revive':    m.revive = Math.max(m.revive, v / 100); break;
      }
    }
    if (it.set) setCount[it.set] = (setCount[it.set] || 0) + 1;
  }
  // 套装加成（集 2 件触发二件套，4 件触发四件套）
  for (const s in setCount) {
    const def = (typeof EQUIP_SETS !== 'undefined') ? EQUIP_SETS[s] : null;
    if (!def) continue;
    const n = setCount[s];
    if (n >= 2 && def.two)   applySetMods(m, def.two);
    if (n >= 4 && def.four)  applySetMods(m, def.four);
  }
  // 被动心法·暴击率/暴伤：必须与 recalcStats(player) 面板同源。
  // 否则面板把 pasCrit 算进 100%，而战斗判定(aMods)只含装备+套装，
  // 会导致「面板满暴击、实战却不出暴击」；暴伤 pasCritDmg 同理。
  if (p.learned && typeof SKILLS_DB_MAP !== 'undefined') {
    for (const id of p.learned) {
      const sk = SKILLS_DB_MAP[id];
      if (!sk || sk.kind !== 'passive' || !sk.passive) continue;
      const pa = sk.passive;
      if (pa.pasCrit)    m.critRate  += pa.pasCrit;
      if (pa.pasCritDmg) m.critDmg   += pa.pasCritDmg;
    }
  }
  return m;
}
function applySetMods(m, eff) { if (!eff) return; for (const k in eff) m[k] = (m[k] || 0) + eff[k]; }
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
  // 装备特效：每回合回血/回蓝、积威累加暴击、灼烧结算
  const m = battle.mods;
  if (m) {
    if (m.regenHp && p.hp > 0) p.hp = Math.min(p.maxHp, p.hp + Math.round(p.maxHp * m.regenHp));
    if (m.regenMp && p.hp > 0) p.mp = Math.min(p.maxMp, p.mp + m.regenMp);
    if (m.stackCrit) battle._stackCrit = Math.min(0.40, (battle._stackCrit || 0) + m.stackCrit);
  }
  [p, e].forEach(u => {
    if (!u.debuffs) return;
    u.debuffs.forEach(d => {
      if (d.stat === 'burn') {
        const dmg = d.amt || 0;
        u.hp = Math.max(0, u.hp - dmg);
        floats.push({ x: u._x, y: u._y, text: '灼烧-' + dmg, color: '#E8743B', ttl: 60 });
      }
    });
  });
  // 中毒：每回合开始按 e.dmg 扣血，持续 e.dur 回合后清除
  [p, e].forEach(u => {
    if (!u.poison) return;
    const dmg = u.poison.dmg || 0;
    u.hp = Math.max(0, u.hp - dmg);
    floats.push({ x: u._x, y: u._y, text: '中毒-' + dmg, color: '#7FBF4D', ttl: 60 });
    if ((u.poison.dur -= 1) <= 0) u.poison = null;
  });
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
    if (act === 'item' && (player.items || []).reduce((s, x) => s + x.qty, 0) <= 0) enabled = false;
    b.disabled = !enabled;
    b.style.opacity = enabled ? '1' : '0.4';
  });
}

function damage(attacker, target, mult, type) {
  // 启动攻击冲刺动画（纯视觉，不阻塞战斗逻辑）
  const isP = !attacker.isEnemy;
  battle._anim = { phase: 'lunge', progress: 0, attacker: isP ? 'player' : 'enemy', target: isP ? 'enemy' : 'player', dist: 52 };

  // 命中判定：实际命中率 = 攻击方命中率 − 目标闪避率
  const attackerHR = attacker.hitRate || 0.80;
  const targetEva = target.eva || 0;
  // 装备命中率已永久并入 player.hitRate（recalcStats 处理）；此处仅叠加功法临时命中率buff
  const accBuff = (battle._tempHitRateBuff || 0); // 功法临时命中率buff（单次生效，攻击后消费）
  const effectiveHR = Math.min(1.0, attackerHR + accBuff);
  const actualHitRate = effectiveHR - targetEva;
  let hitChance;
  if (actualHitRate >= 0.5) {
    hitChance = Math.min(0.95, actualHitRate);       // 高命中率时上限95%（保留一点随机性）
  } else if (actualHitRate > 0) {
    hitChance = actualHitRate;                         // 正常区间
  } else {
    hitChance = Math.max(0.125, 1 + actualHitRate);   // 负值时约8次命中1次（floor~12.5%）
  }
  if (Math.random() > hitChance) {
    floats.push({ x: target._x, y: target._y, text: '未命中', color: '#888888', ttl: 60 });
    battle.msg = attacker.name + ' 的攻击落空了！';
    if (battle && battle._tempHitRateBuff) { delete battle._tempHitRateBuff; } // 消耗临时命中率buff
    return 0;
  }
  if (battle && battle._tempHitRateBuff) { delete battle._tempHitRateBuff; } // 命中后也消耗（单次生效）
  // 物理攻击用 atk/def，精神攻击用 spiAtk/spiDef；增益/减益乘区实时生效
  const isSpirit = type === 'spirit';
  const aMods = (!attacker.isEnemy && battle && battle.mods) ? battle.mods : null; // 攻击者=玩家时的装备特效
  const tMods = (!target.isEnemy && battle && battle.mods)  ? battle.mods : null; // 受击者=玩家时的装备特效
  const atkStat = (isSpirit ? attacker.spiAtk : attacker.atk) * buffMul(attacker, isSpirit ? 'spiAtk' : 'atk');
  let defStat = (isSpirit ? target.spiDef : target.def) * debuffMul(target, isSpirit ? 'spiDef' : 'def');
  if (aMods && aMods.pierce) defStat *= (1 - aMods.pierce); // 破甲：无视部分防御
  let base = atkStat * mult - defStat * 0.5;
  // 暴击：基础 15% + 等级×0.2% + 天命×0.2% + 增益·暴击 buff + 装备暴击率 + 濒锋(血<30%) + 积威(每回合累加，上限40%)
  let baseCrit = 0.15;
  if (attacker.level) baseCrit += attacker.level * 0.002;
  if (attacker.des)   baseCrit += attacker.des * 0.002;
  let critChance = baseCrit + Math.max(0, buffMul(attacker, 'crit') - 1);
  if (aMods) {
    critChance += aMods.critRate;
    if (aMods.lowHpCrit && attacker.hp / attacker.maxHp < 0.3) critChance += aMods.lowHpCrit;
    if (battle._stackCrit) critChance += battle._stackCrit;
  }
  const crit = Math.random() < Math.min(1.0, critChance);
  let critMul = 1.5 + (aMods ? aMods.critDmg : 0); // 会心：装备暴伤加成
  if (crit) base *= critMul;
  if (target.defending) base *= 0.5;
  // 增伤（装备）/ 死战（血<30%）
  if (aMods) {
    if (aMods.dmgAmp) base *= (1 + aMods.dmgAmp);
    if (aMods.lowHpDmg && attacker.hp / attacker.maxHp < 0.3) base *= (1 + aMods.lowHpDmg);
  }
  // 玩家受击：护体减伤（装备）+ 护盾
  if (tMods && tMods.reduceDmg) base *= (1 - tMods.reduceDmg);
  if (target.shield && target.shield.pct) base *= (1 - target.shield.pct);
  base = Math.max(1, Math.round(base));
  target.hp = Math.max(0, target.hp - base);
  if (!attacker.isEnemy && battle) battle.playerDmg = (battle.playerDmg || 0) + base; // 世界BOSS 累计玩家伤害
  const col = crit ? '#A32D2D' : '#2C2C2A';
  const txt = (crit ? '暴击 ' : '') + '-' + base;
  floats.push({ x: target._x, y: target._y, text: txt, color: col, ttl: 60 });
  // 吸血（玩家攻击触发）
  if (aMods && aMods.lifesteal && base > 0) {
    const h = Math.round(base * aMods.lifesteal);
    attacker.hp = Math.min(attacker.maxHp, attacker.hp + h);
    floats.push({ x: attacker._x, y: attacker._y, text: '+' + h, color: '#3B6D11', ttl: 60 });
  }
  // 反伤（玩家受击触发，把伤害按比率弹回给攻击者）
  if (tMods && tMods.reflect && base > 0) {
    const r = Math.round(base * tMods.reflect);
    attacker.hp = Math.max(0, attacker.hp - r);
    floats.push({ x: attacker._x, y: attacker._y, text: '反伤-' + r, color: '#A32D2D', ttl: 60 });
  }
  // 灼烧（玩家攻击附带，持续 2 回合按比例掉血）
  if (aMods && aMods.burn && base > 0) {
    target.debuffs.push({ stat: 'burn', amt: Math.round(attacker.atk * aMods.burn), dur: 2 });
  }
  return base;
}

// 施展功法（player 的 SKILLS_DB 条目，含 effect）
function applySkill(actor, target, sk) {
  actor.mp -= sk.cost;
  // 功法临时命中率buff（仅对玩家生效，下次攻击时消耗）
  if (!actor.isEnemy && sk.buffHitRate && battle) {
    battle._tempHitRateBuff = sk.buffHitRate;
  }
  const e = sk.effect || { kind: 'dmg', type: sk.type, mult: sk.mult };
  const floatAt = (u, text, color) => floats.push({ x: u._x, y: u._y, text, color, ttl: 60 });
  switch (e.kind) {
    case 'dmg': {
      let d;
      if (e.pierce) { // 穿透：无视部分护甲
        const atkStat = (e.type === 'spirit' ? actor.spiAtk : actor.atk) * buffMul(actor, e.type === 'spirit' ? 'spiAtk' : 'atk');
        const defStat = (e.type === 'spirit' ? target.spiDef : target.def) * 0.25;
        let base = atkStat * e.mult - defStat;
        // 暴击：与普通攻击(damage)同源——基础15% + 等级/天命 + 装备/被动暴击率 + 积威 + 濒锋
        let pBase = 0.15;
        if (actor.level) pBase += actor.level * 0.002;
        if (actor.des)   pBase += actor.des * 0.002;
        const pMods = (!actor.isEnemy && battle && battle.mods) ? battle.mods : null;
        let pCrit = pBase + Math.max(0, buffMul(actor, 'crit') - 1);
        if (pMods) {
          pCrit += pMods.critRate;
          if (battle._stackCrit) pCrit += battle._stackCrit;
          if (pMods.lowHpCrit && actor.hp / actor.maxHp < 0.3) pCrit += pMods.lowHpCrit;
        }
        const crit = Math.random() < Math.min(1.0, pCrit);
        let pMul = 1.5 + (pMods ? pMods.critDmg : 0);
        if (crit) base *= pMul;
        if (target.defending) base *= 0.5;
        d = Math.max(1, Math.round(base));
        target.hp = Math.max(0, target.hp - d);
        if (!actor.isEnemy && battle) battle.playerDmg = (battle.playerDmg || 0) + d; // 穿透伤害也累计
        const col = crit ? '#A32D2D' : '#2C2C2A';
        const txt = (crit ? '暴击 ' : '') + '-' + d;
        floatAt(target, txt, col);
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
    case 'poison': {
      target.poison = { dmg: e.dmg, dur: e.dur }; // 每回合开始扣 e.dmg 点血，持续 e.dur 回合
      battle.msg = actor.name + ' 施展「' + sk.name + '」令 ' + target.name + ' 中毒';
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
  } else if (act === 'item') {
    // 战斗中点击「道具」→ 弹出背包可用丹药选择面板（玩家专用）
    if (!actor.isEnemy) openBattleItemPanel();
  }
}

// 战斗内「道具」面板：列出背包可用丹药，点选即使用；用完/取消回复指令栏
function openBattleItemPanel() {
  const inv = (player.items || []).filter(x => x.qty > 0);
  if (inv.length === 0) { battle.msg = '背包中没有可用丹药'; return; }
  let html = '<button class="battle-cmd back" data-act="cancelitem">↩ 返回</button>';
  inv.forEach(x => {
    const it = ITEM_DB[x.tid];
    const label = it.name + '·' + it.tierName + '（' + (it.kind === 'hp' ? '回血' : '回蓝') + Math.round(it.pct * 100) + '%×' + x.qty + '）';
    html += `<button class="battle-cmd pill" data-act="useitem" data-tid="${x.tid}" title="${it.name}">${esc(label)}</button>`;
  });
  cmdBar.innerHTML = html;
  setButtons(true);
}

// 使用指定丹药（战斗内）；使用后重建指令栏（不可再次行动，交给 nextTurn）
function battleUseItem(tid) {
  const res = useItem(tid);
  if (!res) { openBattleItemPanel(); return; }
  const it = ITEM_DB[tid];
  const tag = res.kind === 'hp' ? '+ ' + res.amount + ' 气血' : '+ ' + res.amount + ' 灵力';
  floats.push({ x: battle.player._x, y: battle.player._y, text: tag, color: res.kind === 'hp' ? '#3B6D11' : '#378ADD', ttl: 60 });
  battle.msg = battle.player.name + ' 服用「' + it.name + '」' + tag;
  saveGame();
  awaitingInput = false;
  setButtons(false);
  nextTurn();
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
    // 装备特效「涅槃」：阵亡复活 1 次
    if (battle.mods && battle.mods.revive > 0 && !battle._reviveUsed) {
      battle._reviveUsed = true;
      battle.player.hp = Math.round(battle.player.maxHp * battle.mods.revive);
      battle.player.shield = { pct: 0.2, dur: 999 };
      floats.push({ x: battle.player._x, y: battle.player._y, text: '涅槃复活!', color: '#D4A843', ttl: 90 });
      battle.msg = '装备特效触发：涅槃复活，重回战场！';
      return false;
    }
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
        // 小概率装备掉落（仅首通）→ 装备宝箱入背包，开启时再结算
        if (Math.random() < 0.35) {
          player.bag.push(makeChestItem('equip', 0));
          dropMsg = ' 拾得装备宝箱！';
        }
      } else {
        dropMsg = '（已通关，重战无额外奖励）';
      }
      if (typeof dailyRecordStoryClear === 'function') dailyRecordStoryClear();
    }
    if (window.Online && window.Online.onProgress) window.Online.onProgress(player.score);
    const after = CULTIVATION.realmFromXp(player.xp);
    const oldMax = player.maxHp;
    recalcStats(player);                          // 境界提升 → 属性增强
    player.hp = Math.min(player.maxHp, (player.hp || 0) + (player.maxHp - oldMax) + 40); // 突破增益 + 胜利回血
    player.mp = player.maxMp;
    state = 'win';
    const broke = after.globalIndex > before;
    const realmUp = after.realmIndex > CULTIVATION.FLAT[before].realmIndex;
    let toastMsg = '胜利！';
    if (broke) toastMsg = (realmUp ? '★ 突破大境界！晋升【' : '突破！晋升【') + after.label + '】';
    toast = toastMsg + dropMsg + ' 点击继续。';
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
    toast = battle.mode === 'story' ? '你倒下了…点击重新挑战。' : '你倒下了…点击重新挑战。';
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
  const act = b.dataset.act;
  if (act === 'useitem') { battleUseItem(b.dataset.tid); return; }
  if (act === 'cancelitem') { buildSkillBar(); setButtons(true); return; }
  playerAct(act, b.dataset.skill);
});

canvas.addEventListener('click', e => {
  const r = canvas.getBoundingClientRect();
  const x = (e.clientX - r.left) * (W / r.width);
  const y = (e.clientY - r.top) * (H / r.height);
  if (state === 'win' || state === 'lose') {
    // 战斗结束 → 剧情副本返回副本界面，世界BOSS 弹排行，江湖战斗返回主页
    if (battle && battle.mode === 'story') {
      storyAfterBattle();   // 抽到 story.js：章节通关弹三选一，否则回本章
    } else if (battle && battle.mode === 'worldboss') {
      openWorldBossResult(battle.node._wb);
    } else if (window.HUB) { window.HUB.refresh(); window.HUB.show(); }
    else { state = 'hub'; toast = ''; }
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


function drawRoundedRect(x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function drawBattlePortrait(x, y, size, img, label, tint) {
  const r = size / 2;
  // 外圈光环
  ctx.beginPath();
  ctx.arc(x, y, r + 4, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x, y, r + 2, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(212,168,67,0.5)';
  ctx.lineWidth = 2;
  ctx.stroke();
  // 头像裁剪区
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.clip();
  if (ready(img)) {
    ctx.drawImage(img, x - r, y - r, size, size);
  } else {
    ctx.fillStyle = tint || '#D3D1C7';
    ctx.fillRect(x - r, y - r, size, size);
    ctx.fillStyle = '#5F5E5A';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x, y);
  }
  ctx.restore();
}

function drawStatBar(x, y, w, ratio, color1, color2, label) {
  const h = 10;
  ratio = Math.max(0, Math.min(1, ratio));
  // 背景槽
  drawRoundedRect(x, y, w, h, h / 2);
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fill();
  // 填充
  if (ratio > 0) {
    const grad = ctx.createLinearGradient(x, y, x + w, y);
    grad.addColorStop(0, color1);
    grad.addColorStop(1, color2);
    ctx.fillStyle = grad;
    drawRoundedRect(x, y, w * ratio, h, h / 2);
    ctx.fill();
  }
  // 边框
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 1;
  drawRoundedRect(x, y, w, h, h / 2);
  ctx.stroke();
  // 文字
  if (label) {
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x + w / 2, y + h / 2 + 0.5);
  }
}

// 方案B：横向角色信息卡片（头像在左，名字+境界+血蓝条在右）
function drawActorCard(x, y, w, h, actor, isPlayer) {
  // 卡片背景
  drawRoundedRect(x, y, w, h, 8);
  ctx.fillStyle = 'rgba(26,26,30,0.82)';
  ctx.fill();
  ctx.strokeStyle = isPlayer ? 'rgba(212,168,67,0.45)' : 'rgba(232,123,123,0.45)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // 头像 40x40（圆形裁剪）
  const avatarSize = 40;
  const ax = x + 6, ay = y + 5;
  const img = isPlayer
    ? ((battle && battle.heroSprite && ready(battle.heroSprite)) ? battle.heroSprite : art.hero)
    : ((battle && battle.enemySprite && ready(battle.enemySprite)) ? battle.enemySprite : art.enemy);
  ctx.save();
  ctx.beginPath();
  ctx.arc(ax + avatarSize / 2, ay + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
  ctx.clip();
  if (ready(img)) {
    ctx.drawImage(img, ax, ay, avatarSize, avatarSize);
  } else {
    ctx.fillStyle = '#D3D1C7';
    ctx.fillRect(ax, ay, avatarSize, avatarSize);
    ctx.fillStyle = '#5F5E5A';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(isPlayer ? '我' : '敌', ax + avatarSize / 2, ay + avatarSize / 2);
  }
  ctx.restore();
  // 头像边框
  ctx.strokeStyle = isPlayer ? 'rgba(212,168,67,0.7)' : 'rgba(232,123,123,0.7)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(ax + avatarSize / 2, ay + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
  ctx.stroke();

  // 文字区
  const tx = x + 54;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#F1EFE8';
  ctx.font = 'bold 12px sans-serif';
  ctx.fillText(actor.name, tx, y + 6);
  ctx.fillStyle = 'rgba(241,239,232,0.6)';
  ctx.font = '10px sans-serif';
  const sub = isPlayer ? CULTIVATION.realmFromXp(actor.xp).label : '敌方';
  ctx.fillText(sub, tx, y + 21);
  // 血蓝条
  const barW = w - 62;
  drawStatBar(tx, y + 34, barW, actor.hp / actor.maxHp, isPlayer ? '#7FBF4D' : '#D35A5A', isPlayer ? '#4A8A2A' : '#8A2323', actor.hp + '/' + actor.maxHp);
  drawStatBar(tx, y + 46, barW, actor.mp / actor.maxMp, '#5A9BD3', '#2E5F8A', actor.mp + '/' + actor.maxMp);
}

function drawAvatarGlow(x, y, r, color) {
  ctx.save();
  ctx.shadowBlur = 18;
  ctx.shadowColor = color;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.15;
  ctx.fill();
  ctx.restore();
}

// ===== 梦幻西游风格战斗画面 =====
// 核心范式：小型站姿精灵站在透视地面上，头顶悬浮血条，脚下名字标签
// 与旧方案差异：不再是大头立绘+角落卡片，而是"角色在战场中"

function drawBattle() {
  // ---- 1. 背景层（全幅）----
  if (ready(art.bg)) {
    ctx.drawImage(art.bg, 0, 0, W, H);
  } else {
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#C8D4E0');
    grad.addColorStop(0.6, '#D8C8B8');
    grad.addColorStop(1, '#BFB8A8');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
  }

  const p = battle.player, e = battle.enemy;

  // ---- 2. 透视地面（椭圆战场平台）----
  const gCx = W / 2, gCy = H * 0.70, gRx = 236, gRy = 44;
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(gCx, gCy, gRx, gRy, 0, 0, Math.PI * 2);
  const gGrad = ctx.createRadialGradient(gCx, gCy - 12, 0, gCx, gCy, gRx);
  gGrad.addColorStop(0, 'rgba(20,18,15,0.22)');
  gGrad.addColorStop(0.7, 'rgba(20,18,15,0.14)');
  gGrad.addColorStop(1, 'rgba(20,18,15,0.06)');
  ctx.fillStyle = gGrad;
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.07)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();

  // ---- 3. 精灵选择与尺寸（Q版SD小人，比写实立绘小约55%）----
  const heroImg = (battle.heroSprite && ready(battle.heroSprite)) ? battle.heroSprite
                : (ready(art.hero) ? art.hero : null);
  const enemyImg = (battle.enemySprite && ready(battle.enemySprite)) ? battle.enemySprite
                  : (ready(art.enemy) ? art.enemy : null);
  // Q版站姿精灵尺寸（类似梦幻西游的"棋子"大小）
  const spW = 52, spH = 72;

  // 地面站位坐标（我方左前、敌方右前，在椭圆范围内）
  const pBaseX = gCx - 110, pBaseY = gCy + 2;
  const eBaseX = gCx + 110, eBaseY = gCy + 2;

  // 呼吸浮动（相位错开，幅度 2px）
  const _bt = Date.now() / 580;
  const pBob = Math.sin(_bt) * 2;
  const eBob = Math.sin(_bt + 1.5) * 2;

  // 攻击冲刺动画偏移
  let pLungeX = 0, eLungeX = 0;
  let hitFlash = 0; // 0=无 1=目标闪白
  if (battle._anim) {
    const a = battle._anim;
    if (a.phase === 'lunge') {
      a.progress = Math.min(1, a.progress + 0.12); // ~8帧完成冲刺
      if (a.attacker === 'player') pLungeX = a.dist * easeOutQuad(a.progress);
      else eLungeX = -a.dist * easeOutQuad(a.progress);
      if (a.progress >= 1) { a.phase = 'hit'; a.frame = 0; }
    } else if (a.phase === 'hit') {
      a.frame = (a.frame || 0) + 1;
      hitFlash = 1;
      if (a.frame > 4) { a.phase = 'return'; a.progress = 0; }
    } else if (a.phase === 'return') {
      a.progress = Math.min(1, a.progress + 0.15); // ~7帧返回
      if (a.attacker === 'player') pLungeX = a.dist * (1 - easeOutQuad(a.progress));
      else eLungeX = -a.dist * (1 - easeOutQuad(a.progress));
      if (a.progress >= 1) { battle._anim = null; }
    }
  }

  // ---- 4. 绘制双方精灵（Q版 + 光圈底座）----
  function drawBattleSprite(img, cx, cy, lungX, bobY, isHero) {
    const sx = cx + lungX;
    const sy = cy + bobY;
    // ★ 光圈底座（梦幻西游标志性元素：脚下圆形发光平台）
    const pedR = spW * 0.48; // 底座半径
    const pedY = cy + 3;     // 底座中心 Y（略低于脚底）
    ctx.save();
    // 外层光晕
    const pedGlow = ctx.createRadialGradient(sx, pedY, 0, sx, pedY, pedR * 1.4);
    if (isHero) {
      pedGlow.addColorStop(0, 'rgba(212,200,80,0.35)');
      pedGlow.addColorStop(0.5, 'rgba(212,180,50,0.18)');
      pedGlow.addColorStop(1, 'rgba(212,168,67,0)');
    } else {
      pedGlow.addColorStop(0, 'rgba(220,60,60,0.30)');
      pedGlow.addColorStop(0.5, 'rgba(180,40,40,0.15)');
      pedGlow.addColorStop(1, 'rgba(160,30,30,0)');
    }
    ctx.fillStyle = pedGlow;
    ctx.beginPath();
    ctx.ellipse(sx, pedY, pedR * 1.4, pedR * 0.42, 0, 0, Math.PI * 2);
    ctx.fill();
    // 底座本体（椭圆环）
    ctx.beginPath();
    ctx.ellipse(sx, pedY, pedR, pedR * 0.32, 0, 0, Math.PI * 2);
    const pedBody = ctx.createLinearGradient(sx - pedR, pedY, sx + pedR, pedY);
    if (isHero) {
      pedBody.addColorStop(0, 'rgba(255,230,120,0.55)');
      pedBody.addColorStop(0.5, 'rgba(212,188,67,0.45)');
      pedBody.addColorStop(1, 'rgba(180,155,40,0.35)');
    } else {
      pedBody.addColorStop(0, 'rgba(255,100,100,0.45)');
      pedBody.addColorStop(0.5, 'rgba(200,55,55,0.38)');
      pedBody.addColorStop(1, 'rgba(160,35,35,0.28)');
    }
    ctx.fillStyle = pedBody;
    ctx.fill();
    ctx.strokeStyle = isHero ? 'rgba(255,240,150,0.5)' : 'rgba(255,120,120,0.4)';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.restore();
    // 精灵本体（画在底座之上）
    if (img) {
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.25)';
      ctx.shadowBlur = 8;
      ctx.drawImage(img, sx - spW / 2, sy - spH, spW, spH);
      ctx.restore();
    } else {
      drawPlaceholder(sx - spW / 2, sy - spH, spW, spH, isHero ? '我方' : '敌方', '#B8B4AA');
    }
    return { x: sx, y: sy, top: sy - spH, bottom: sy };
  }

  const heroPos = drawBattleSprite(heroImg, pBaseX, pBaseY, pLungeX, pBob, true);
  const enemyPos = drawBattleSprite(enemyImg, eBaseX, eBaseY, eLungeX, eBob, false);

  // 受击闪白
  if (hitFlash) {
    const target = battle._anim && battle._anim.target === 'enemy' ? enemyPos : heroPos;
    ctx.save();
    ctx.globalAlpha = 0.45;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(target.x - spW / 2, target.top, spW, spH);
    ctx.restore();
  }

  // ---- 5. 头顶悬浮血条 ----
  function drawOverheadBar(x, topY, actor, isPlayer) {
    const barW = 58, barH = 5, barX = x - barW / 2, barY = topY - 10;
    const ratio = Math.max(0, Math.min(1, actor.hp / actor.maxHp));
    // 背景
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    drawRoundedRect(barX, barY, barW, barH, 2);
    ctx.fill();
    // 填充（红渐变；低血量变橙色警示）
    if (ratio > 0) {
      const c1 = ratio < 0.25 ? '#E8603B' : (isPlayer ? '#D94E4E' : '#E04545');
      const c2 = ratio < 0.25 ? '#C03A18' : (isPlayer ? '#A33030' : '#B82828');
      const fg = ctx.createLinearGradient(barX, barY, barX + barW, barY);
      fg.addColorStop(0, c1);
      fg.addColorStop(1, c2);
      ctx.fillStyle = fg;
      drawRoundedRect(barX, barY, barW * ratio, barH, 2);
      ctx.fill();
    }
    // 边框
    ctx.strokeStyle = 'rgba(255,255,255,0.20)';
    ctx.lineWidth = 0.5;
    drawRoundedRect(barX, barY, barW, barH, 2);
    ctx.stroke();
  }
  drawOverheadBar(heroPos.x, heroPos.top, p, true);
  drawOverheadBar(enemyPos.x, enemyPos.top, e, false);

  // ---- 6. 脚下名字标签 ----
  function drawNameLabel(x, bottomY, name, isPlayer) {
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    // 文字描边（保证在任何背景上可读）
    ctx.strokeStyle = isPlayer ? 'rgba(0,0,0,0.65)' : 'rgba(0,0,0,0.70)';
    ctx.lineWidth = 3;
    ctx.strokeText(name, x, bottomY + 4);
    ctx.fillStyle = isPlayer ? '#7BF44E' : '#FF7B7B';
    ctx.fillText(name, x, bottomY + 4);
  }
  drawNameLabel(heroPos.x, heroPos.bottom, p.name, true);
  drawNameLabel(enemyPos.x, enemyPos.bottom, e.name, false);

  // ---- 7. 顶部精简信息卡（名字+境界+详细血蓝条）----
  drawActorCard(6, 5, 200, 44, p, true);
  drawActorCard(W - 206, 5, 200, 44, e, false);

  // ---- 8. 飘字 ----
  floats.forEach(f => {
    ctx.globalAlpha = Math.max(0, f.ttl / 60);
    ctx.fillStyle = f.color;
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,0.55)';
    ctx.shadowBlur = 4;
    ctx.fillText(f.text, f.x, f.y - (60 - f.ttl) * 0.55);
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  });
  floats = floats.filter(f => --f.ttl > 0);

  // ---- 9. 底部行动信息栏 ----
  const itemCount = (p.items || []).reduce((s, x) => s + x.qty, 0);
  const infoText = battle.msg + '　(丹药:' + itemCount + ')';
  ctx.font = '13px sans-serif';
  const textWidth = ctx.measureText(infoText).width;
  const padX = 18;
  const by = H - 34;
  const bw = textWidth + padX * 2;
  const bh = 26;
  const bx = (W - bw) / 2;
  drawRoundedRect(bx, by, bw, bh, bh / 2);
  ctx.fillStyle = 'rgba(26,26,30,0.84)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = '#F1EFE8';
  ctx.font = '13px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(infoText, W / 2, by + bh / 2);
}

// 缓动函数：二次方缓出（冲刺/返回用）
function easeOutQuad(t) { return t * (2 - t); }

function drawOverlay(text) {
  ctx.fillStyle = 'rgba(44,44,42,0.55)';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#fff';
  ctx.font = '16px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(text, W / 2, H / 2);
}

let _lastRenderState;
function render() {
  // 主页/创建界面是 DOM 层，不需要画布持续重绘；跳过 60fps 空转，把算力让给视频解码
  if (state === 'hub' || state === 'create') { requestAnimationFrame(render); return; }
  ctx.clearRect(0, 0, W, H);
  if (state === 'create') {
    ctx.fillStyle = '#111'; ctx.fillRect(0, 0, W, H);
  } else if (state === 'battle') {
    drawBattle();
  } else if (state === 'win') {
    drawBattle(); drawOverlay('胜 利');
  } else if (state === 'lose') {
    drawBattle(); drawOverlay('败 北');
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
