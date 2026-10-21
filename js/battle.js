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

// ===== 立绘映射（写实古风，图鉴与战斗共用同一批透明立绘）=====
// 21 张写实古风立绘（hero_m*/hero_f*/enemy_v*/boss_*）已通过 PIL 抠像为 RGBA 透明 PNG，存放于 assets/battle/。
//   图鉴(codex)直接展示原图；战斗画面复用同一批透明图——人物本体浮在战斗背景上，背景透出来。
// 主键按 avatarId 区分；副本敌人按所属「卷」(volume 1~10) 区分；世界BOSS 按 slot idx 区分。
// 这些立绘仅用于战斗画面，不覆盖 art.hero / art.enemy（主页/创建界面的共享立绘）。
const HERO_SPRITES = {
  m1: 'assets/battle/hero_m1.png?v=1', m2: 'assets/battle/hero_m2.png?v=1', m3: 'assets/battle/hero_m3.png?v=1',
  f1: 'assets/battle/hero_f1.png?v=1', f2: 'assets/battle/hero_f2.png?v=1', f3: 'assets/battle/hero_f3.png?v=1',
};
// [成仙化身] 解析战斗立绘/头像应显示的主角 id：selectedAvatar 命中 6 主角则用所选外形；
// 否则（选了敌人/BOSS 头像，或无所选）回退创建角色 avatarId，避免立绘 404 回退 m1 的错乱。
function resolveHeroDisplayId(selectedAvatar, avatarId) {
  const ids = (typeof window !== 'undefined' && window.HERO_MED_IDS) || ['m1', 'm2', 'm3', 'f1', 'f2', 'f3'];
  return ids.indexOf(selectedAvatar) >= 0 ? selectedAvatar : avatarId;
}
window.resolveHeroDisplayId = resolveHeroDisplayId;
const ENEMY_SPRITES = {
  1: 'assets/battle/enemy_v1.png?v=1', 2: 'assets/battle/enemy_v2.png?v=1', 3: 'assets/battle/enemy_v3.png?v=1',
  4: 'assets/battle/enemy_v4.png?v=1', 5: 'assets/battle/enemy_v5.png?v=1', 6: 'assets/battle/enemy_v6.png?v=1',
  7: 'assets/battle/enemy_v7.png?v=1', 8: 'assets/battle/enemy_v8.png?v=1', 9: 'assets/battle/enemy_v9.png?v=1',
  10: 'assets/battle/enemy_v10.png?v=1',
};
const BOSS_SPRITES = {
  1: 'assets/battle/boss_1.png?v=1', 2: 'assets/battle/boss_2.png?v=1', 3: 'assets/battle/boss_3.png?v=1',
  4: 'assets/battle/boss_4.png?v=1', 5: 'assets/battle/boss_5.png?v=1',
};

// ===== 战斗节奏（Pacing）——目标回合数驱动（2026-10-12 战斗节奏修复）=====
// 背景（问题根因）：敌人属性原按「玩家属性比例」线性缩放，完全没考虑玩家单回合实际输出，
//   而玩家输出被 装备/被动心法/暴击/先攻连动 层层放大 → 副本一回合秒、竞技场被对手一回合秒。
// 方案：敌人血量 = 玩家单回合期望输出 × 目标回合数；敌人攻击 = 让玩家在目标回合内承受预期压力。
//   这样无论玩家战力如何膨胀，战斗长度都稳定在设计值附近，功法/buff/被动才有登场空间。
const PACING_ROUNDS = { story: 4, arena: 6, worldboss: 10 };  // 各模式目标回合数（用户拍板）
const PACING_LINK_CAP = 3;        // 单回合出手次数封顶（2026-10-14 用户拍板：砍掉「先攻>=5倍出手4次」，至多 3 次）
// 2026-10-13 用户拍板：去掉敌人大招冷却（原设计 §8 为按脚本确定性施放、无冷却）。
//   常量保留为 0 以兼容 pacingEnemySkillSeq 的签名，运行时不再置位 / 递减 / 跳过。
const PACING_ULT_CD = { story: 0, arena: 0, worldboss: 0 };
const PACING_MAX_SINGLE = 0.60;   // 单发伤害上限（占玩家气血）：2026-10-13 用户拍板 0.34 -> 0.60，
                                  //   避免高倍率大招（寂灭星陨 mult 18）被钳到倍率形同虚设
const PACING_MIN_SINGLE = 0.22;   // 小技能最低输出（占「单发上限」的比例）：保证低倍率技能也能破防
const PACING_HP_FIT = { story: 1.10, arena: 1.00, worldboss: 1.50 };  // 血量校准：把实际回合数拉回目标值（2026-10-14 用户拍板「BOSS 再慢一点」：worldboss 1.30 -> 1.50）

// 连动次数：先攻比值 → 本回合出手次数（阶梯 >=2→2, >=3→3, >=4→4, >=5→4 封顶）
// beginRound 与 pacing 血量反推共用此函数，保证「敌人血量」永远按玩家实际出手次数反推。
function linkCountFromRatio(ratio) {
  let n = Math.floor(ratio);
  if (n < 1) n = 1;
  if (n > PACING_LINK_CAP) n = PACING_LINK_CAP;
  return n;
}

function pacingTargetRounds(mode) { return PACING_ROUNDS[mode] || 4; }

// 玩家单回合可出手次数（必须与 beginRound 的连动规则一致，否则血量反推会失准）
function pacingPlayerActions(enemyInit) {
  const pi = (typeof player !== 'undefined' && player && player.init) ? player.init : 1;
  const ei = Math.max(1, enemyInit || 1);
  const ratio = pi / ei;
  // 极品装备的 extraActions 会在封顶之外继续追加（beginRound: n += faster.extraActions）。
  // 血量反推若不计入，带连动装的玩家会把敌人血量按 1/2 ~ 1/3 的回合数打穿（2026-10-13 修复）。
  const extra = (pi >= ei && player && player.extraActions) ? player.extraActions : 0;
  return linkCountFromRatio(ratio) + extra;
}

// 玩家单击期望伤害（含平均功法倍率与暴击期望；不含防御扣减，由调用方扣）
// 主输出路线：按已装备功法的 phys/spirit 数量分布决定。
//   2026-10-12 校准：此前 perHit 取 max(物理线, 精神线)，而玩家实战只用一条路线，
//   导致估算偏高 → 敌人血量虚高、战斗比目标长一倍（竞技场实测 12.5 回合 vs 目标 6）。
function pacingPlayerHit() {
  let avgMult = 2.8;   // 兜底：全库主动功法倍率中位数
  let physCnt = 0, spirCnt = 0;
  if (typeof SKILLS_DB_MAP !== 'undefined' && typeof player !== 'undefined' && player && player.equippedSkills) {
    const list = player.equippedSkills.map(id => SKILLS_DB_MAP[id]).filter(s => s && s.mult);
    if (list.length) {
      avgMult = list.reduce((s, x) => s + (x.mult || 1), 0) / list.length;
      list.forEach(s => { if (s.type === 'spirit') spirCnt++; else physCnt++; });
    }
  }
  const critF = 1 + ((player && player.critRate) || 0) * Math.max(0, ((player && player.critDmg) || 1.5) - 1);
  return {
    atk: (player && player.atk) || 0, spiAtk: (player && player.spiAtk) || 0,
    avgMult: avgMult, critF: critF, useSpirit: spirCnt > physCnt,
  };
}

// 敌人血量：让玩家按目标回合数打完（已计入玩家连动次数）
function pacingEnemyHp(mode, enemyDef, enemySpiDef, enemyInit, enemyEva) {
  const h = pacingPlayerHit();
  const phys = Math.max(1, h.atk * h.avgMult * h.critF - (enemyDef || 0));
  const spir = Math.max(1, h.spiAtk * h.avgMult * h.critF - (enemySpiDef || 0));
  const perHit = h.useSpirit ? spir : phys;
  const actions = pacingPlayerActions(enemyInit);
  // 命中补偿动态化（2026-10-13）：实际命中率 = 玩家命中率 − 敌人闪避。
  // 原硬编码 0.82 在「玩家不堆命中 / 敌人高闪避」时会高估命中 → 敌人血量虚高 → 战斗被拉长一倍。
  const acc = Math.max(0.30, Math.min(1.0, ((player && player.hitRate) || 0.8) - (enemyEva || 0)));
  return Math.round(perHit * actions * pacingTargetRounds(mode) / acc * (PACING_HP_FIT[mode] || 1));
}

// 敌人攻击：让玩家在目标回合内被消耗 pressure 比例的气血
//   defFactor：玩家防御的有效抵扣比例（保留堆防收益，避免动态难度把防御收益完全抵消）
function pacingEnemyAtk(mode, enemyMult, pressure, defFactor) {
  const maxHp = (player && player.maxHp) || 1000;
  const target = maxHp * (pressure == null ? 0.7 : pressure) / pacingTargetRounds(mode);
  // defFactor = 1.0：damage() 是「攻击×倍率 − 防御」全额抵扣，若只按部分防御反推，
  // 高防玩家的敌人攻击会被防御完全吃掉 → 敌人打不出伤害（2026-10-12 校准）。
  const effDef = ((player && player.def) || 0) * (defFactor == null ? 1.0 : defFactor);
  // 命中补偿：敌人命中率已大幅提高（1.05~1.40），玩家闪避上限恢复 100%，
  // 常规 build（闪避 30~60%）下实际命中约 0.70~0.90，取 0.80 作反推基准。
  const acc = 0.80;
  return Math.max(1, Math.round((target / acc + effDef) / Math.max(0.5, enemyMult || 1)));
}

// 按「大招冷却」规则推导目标回合内的技能倍率序列（供攻击力反推使用）
function pacingEnemySkillSeq(skills, rounds, ultCd) {
  const list = (skills || []).filter(s => s && s.mult);
  const ults = list.filter(s => s.ult);
  const norms = list.filter(s => !s.ult);
  // 增益·攻击（2026-10-13 校准）：AI 会在大招前叠 atk buff（狂刀诀 +80% / 血祭狂化 +100%），
  // 若不计入，「带 buff 的大招」实际伤害会是反推值的 1.8~2 倍 → 一击 87% 血秒杀。
  let atkBuff = 0;
  list.forEach(s => {
    const e = s.effect;
    if (e && e.kind === 'buff' && (e.stat === 'atk' || (e.stats && e.stats.indexOf('atk') >= 0))) {
      const amt = (e.amt != null ? e.amt : 0);
      if (amt > atkBuff) atkBuff = amt;
    }
  });
  const bf = 1 + atkBuff;          // 大招几乎总在 buff 生效时施放
  const bn = 1 + atkBuff * 0.5;    // 普通技能约一半时间带 buff
  const isDmg = s => { const e = s.effect; return !e || e.kind === 'dmg'; };   // 只有 dmg / 无 effect 才造成伤害
  const ultSkill = ults.length ? ults.reduce((a, b) => ((b.mult || 1) > (a.mult || 1) ? b : a)) : null;
  const um = ultSkill ? (ultSkill.mult || 1) * bf : 0;
  const ultSpirit = !!(ultSkill && ultSkill.type === 'spirit');
  let nm = 1, normSpirit = false;
  if (norms.length) {
    // 非伤害型技能（增益 / 减益 / 僵直 / 护盾）仍占用回合但不造成伤害 → 按「伤害型占比」折算期望倍率
    const dmgNorms = norms.filter(isDmg);
    const avg = dmgNorms.length ? dmgNorms.reduce((s, x) => s + (x.mult || 1), 0) / dmgNorms.length : 0;
    // 2026-10-13 修正：不再乘「伤害型占比」。技能池里若只有 1/4 是 dmg 技能，
    //   占比折算会把非大招回合的期望倍率压成真实值的 1/4，反推出的 atk 又被高倍率大招主导，
    //   实战表现为「非大招回合 atk*mult - def < 0，完全零输出」——用户反馈的「打不动我」。
    nm = avg * bn;
    const sp = norms.filter(s => s.type === 'spirit').length;
    normSpirit = sp > (norms.length - sp);
  }
  const seq = [];
  let cd = 0;
  for (let t = 1; t <= rounds; t++) {
    // 第 1 回合先铺垫（增益 / 减益），第 2 回合起才开大 —— 给玩家一个应对窗口。
    // 2026-10-14 修正：该假设只在「有大招冷却」时成立。冷却为 0 时 AI 评分（ult +8，
    //   第 1 回合 -4）仍让大招高于普攻，AI 每回合都会开大；若序列仍按「平均倍率」生成，
    //   反推算出的攻击力在实战中会打出 3~4 倍于预期的伤害（实测玩家 2~3 回合被秒）。
    const canUltNow = um && cd <= 0 && (ultCd > 0 ? t >= 2 : true);
    if (canUltNow) { seq.push({ m: um, spirit: ultSpirit }); cd = (ultCd == null ? 2 : ultCd); }
    else seq.push({ m: nm, spirit: normSpirit });
    cd--;
  }
  return { seq: seq, ultMult: um, ultSpirit: ultSpirit };
}

// 敌人攻击（2026-10-13 重写）：按「实际技能序列」二分求解攻击力，
//   使目标回合内的名义总伤害 = 玩家气血 × pressure ÷ 命中率。
// 为什么不能用平均倍率：damage() 是减法公式，低倍率技能常被玩家防御完全吃掉（下限 max(1,...)），
//   用平均值反推会把这部分算成有效伤害 → 实际总伤害远低于目标；
//   反之若按大招倍率反推则平时挠痒、开大必秒。逐发求和才能同时满足「有压力」和「不秒杀」。
function pacingEnemyAtkSeq(mode, skills, pressure, defFactor, enemyHitRate) {
  const maxHp = (player && player.maxHp) || 1000;
  const rounds = pacingTargetRounds(mode);
  // 2026-10-14：只按「伤害型技能」反推攻击力。回血/护盾/增益类技能不产生输出，
  //   若计入序列会把期望总伤害摊薄 -> 二分把 atk 顶高、敌人实际输出虚高。
  const _all = skills || [];
  const _dmg = _all.filter(function (s) { const e = s && s.effect; return !e || e.kind === 'dmg'; });
  const info = pacingEnemySkillSeq(_dmg.length ? _dmg : _all, rounds, PACING_ULT_CD[mode]);
  const df = (defFactor == null ? 1.0 : defFactor);
  const effDefP = ((player && player.def) || 0) * df;
  const effDefS = ((player && player.spiDef) || 0) * df;   // 精神系按 spiDef 抵扣（常远低于 def）
  const acc = Math.max(0.30, Math.min(1.0, (enemyHitRate || 1.2) - ((player && player.eva) || 0)));
  // pressure = 目标回合内「期望」打掉玩家气血的比例。除以 acc 是把期望还原成名义伤害，
  // 除以 1.08 是扣掉敌人平均暴击加成。名义值过大会让每发都撞上 singleCap 而失去技能差异。
  const targetTotal = maxHp * (pressure == null ? 0.7 : pressure) / acc / 1.08;
  // 单发上限（2026-10-13 修订）：必须钳制「每发的最终伤害」，绝不能钳制攻击力。
  //   旧实现用大招倍率反推 atk 上限（cap = f(maxHp) / ultMult）。但 damage() 是减法公式
  //   atk*mult - def，atk 一旦被压到「只够大招打出 34% 血」的水平，低倍率小技能
  //   （mult 0.4~1.6）乘上去连玩家防御都破不了 -> 实测满级档敌方大小技能伤害全为 0/1，
  //   敌人形同虚设（用户反馈「站着不动让对方打都掉不了血」的根因）。
  const singleCap = maxHp * PACING_MAX_SINGLE;
  // 攻击力硬上界：让「折算倍率最低的那一发」也刚好不超过单发上限。
  //   没有这个上界，二分在全部发数饱和后会一路把 atk 顶到 hi 初值（实测 20 万~80 万），
  //   实战表现是每一发都被截断成同一个 34%，大小技能毫无差别。
  let minM = 0;
  for (let j = 0; j < info.seq.length; j++) {
    const m = info.seq[j].m;
    if (m > 0 && (minM === 0 || m < minM)) minM = m;
  }
  const maxAtk = (singleCap + Math.max(effDefP, effDefS)) / Math.max(0.05, minM);
  // 攻击力下限：保证「倍率最低的伤害技能」也能破防并打出实质伤害。
  //   没有这个下限时，反推会被高倍率大招主导（中期实测 atk 被压到 478），
  //   低倍率小技能 atk*mult - def < 0 -> 非大招回合完全零输出。
  const atkFloor = (singleCap * PACING_MIN_SINGLE + Math.max(effDefP, effDefS)) / Math.max(0.05, minM);
  let lo = 1, hi = Math.min(maxAtk, Math.max(10000, effDefP * 20 + targetTotal * 4));
  if (hi <= lo) hi = lo + 1;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    let dmg = 0;
    for (let j = 0; j < info.seq.length; j++) {
      const raw = mid * info.seq[j].m - (info.seq[j].spirit ? effDefS : effDefP);
      dmg += Math.min(singleCap, Math.max(1, raw));   // 与 damage() 内的敌人单发上限同口径
    }
    if (dmg < targetTotal) lo = mid; else hi = mid;
  }
  let atk = (lo + hi) / 2;
  if (atk < atkFloor) atk = Math.min(atkFloor, maxAtk);
  return Math.max(1, Math.round(atk));
}

function makeEnemy(node) {
  const e = node.enemy;
  return {
    name: e.name, isEnemy: true,
    maxHp: e.hp, hp: e.hp, maxMp: 40, mp: 40,
    atk: e.atk, def: e.def, spd: e.spd,
    init: Math.round(10 + e.spd * 2), eva: 0.05, spiAtk: 0, spiDef: e.def, luck: 0,
    potions: 0, defending: false, extraActions: 0,
    buffs: [], debuffs: [], shield: null, stun: 0, poison: null, dot: null, regen: null, deathWard: null,
    skill: { name: '敌袭', type: 'phys', mult: 1.8, cost: 10 },
    _x: 490, _y: 160,
  };
}

// 指令按钮古风图标（内联 SVG，stroke=currentColor 随按钮金色变化；全站不再用 emoji）
const CMD_ICONS = {
  // 普攻：交叉双刀（剑格 + 加粗刀柄）
  attack: '<span class="cmd-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round">'
        + '<path d="M4.4 3.2Q9.4 6.6 13.8 12.4"/><path d="M13.8 12.4 17.2 17" stroke-width="3.4"/>'
        + '<circle cx="18.8" cy="19.2" r="1.7" fill="currentColor" stroke="none"/>'
        + '<path d="M19.6 3.2Q14.6 6.6 10.2 12.4"/><path d="M10.2 12.4 6.8 17" stroke-width="3.4"/>'
        + '<circle cx="5.2" cy="19.2" r="1.7" fill="currentColor" stroke="none"/></svg></span>',
  // 道具：丹药葫芦（腰束金带）
  item:   '<span class="cmd-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.45" stroke-linejoin="round" stroke-linecap="round">'
        + '<path d="M12 2.9c-.86 0-1.52.6-1.52 1.36 0 .5.25.94.62 1.21-1.88.86-3.1 2.64-3.1 4.56 0 1.32.5 2.44 1.37 3.25-1.73 1.02-2.85 2.9-2.85 5.03 0 2.13 1.93 3.45 5.48 3.45s5.48-1.32 5.48-3.45c0-2.13-1.12-4.01-2.85-5.03.87-.81 1.37-1.93 1.37-3.25 0-1.92-1.22-3.7-3.1-4.56.37-.27.62-.71.62-1.21 0-.76-.66-1.36-1.52-1.36z"/>'
        + '<path d="M9.1 15.6h5.8"/></svg></span>',
  // 返回：回旋箭
  back:   '<span class="cmd-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">'
        + '<path d="M9.5 5.6 4.1 11l5.4 5.4"/><path d="M4.1 11h9.1a6.3 6.3 0 0 1 6.3 6.3v1.1"/></svg></span>'
};

// 构建战斗指令栏：普攻 + 已装备功法（≤6）+ 道具
function buildSkillBar() {
  const skills = (player.equippedSkills || []).map(id => SKILLS_DB_MAP[id]).filter(s => s && s.kind !== 'passive');
  let html = '<button class="battle-cmd attack" data-act="attack">' + CMD_ICONS.attack + '<span class="cmd-name">攻击</span></button>';
  skills.forEach(s => {
    const _used = (s.oncePerBattle && battle._usedOnce && battle._usedOnce[s.id]);
    html += `<button class="battle-cmd skill" data-act="skill" data-skill="${s.id}" data-cost="${skillMpCost(s)}"${_used ? ' disabled' : ''} title="${esc(s.desc)}"><span class="cmd-name">${esc(s.name)}</span><span class="cmd-cost">${skillMpCost(s)}灵</span>${_used ? '<span class=\'cmd-used\'>已用</span>' : ''}</button>`;
  });
  html += '<button class="battle-cmd item" data-act="item">' + CMD_ICONS.item + '<span class="cmd-name">道具</span></button>';
  cmdBar.innerHTML = html;
}

function startBattle(node, mode) {
  const isWB = mode === 'worldboss';
  const isArena = mode === 'arena';
  const enemy = isWB ? makeWorldBoss(node._wb) : (isArena ? makeArenaEnemy(node._arenaRank) : makeEnemy(node));
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
  player.buffs = []; player.debuffs = []; player.shield = null; player.stun = 0; player.poison = null; player.dot = null; player.regen = null; player.deathWard = null; player.silenceRecovery = 0; player.lowHpLifesteal = null; player.immuneNextHit = false;
  // 每场战斗满血满灵开局：battle.player 直接引用全局 player（非副本），
  // 上一场若阵亡 player.hp 会残留在 0，若不在此回满，下一场开场即被 checkEnd 判负，
  // 表现为「死亡后无法再挑战任何副本」（刷新页面从旧存档恢复满血才正常）。
  player.hp = player.maxHp; player.mp = player.maxMp;
  // 扫描已习得被动心法，收集带「战斗中触发」(trigger) 的运行时触发（低气血自我增益 / 低气血下次吸血）
  player.passiveTriggers = [];
  if (player.learned && typeof SKILLS_DB_MAP !== 'undefined') {
    for (const _id of player.learned) {
      const _sk = SKILLS_DB_MAP[_id];
      if (!_sk || _sk.kind !== 'passive' || !_sk.passive || !_sk.passive.trigger) continue;
      player.passiveTriggers.push(Object.assign({ sid: _id, name: _sk.name }, _sk.passive.trigger));
    }
  }
  // 开场被动效果：进入战斗后立即生效（碧落生肌法·每回合回血 / 破军·无相·四象·开场增益）
  // 仅在 startBattle 执行一次，天然满足「每场战斗只触发一次」。
  if (player.passiveTriggers && player.passiveTriggers.length) {
    player.passiveTriggers.forEach(t => {
      if (t.battleStartRegen) {
        player.regen = { pct: (t.pct != null ? t.pct : 0.03), dur: (t.dur || 5), name: (t.name || '生肌') };
      }
      if (t.battleStartBuff) {
        // 开场 push 在首轮 tickDurations 之前，故 dur+1 使实际持续 t.dur 回合
        player.buffs.push({ sid: t.sid, stat: t.stat, amt: (t.amt != null ? t.amt : 0), dur: (t.dur || 2) + 1 });
      }
      if (t.initBuffIfSlower) {
        // 千影灭世光：敌方先攻高于我方时，开场提升我方先攻（百分比），持续 dur 回合，每场限一次
        const _eInit = (typeof enemy !== 'undefined' && enemy) ? enemy.init : 0;
        if (_eInit > player.init) {
          player.buffs.push({ sid: t.sid, stat: 'init', amt: (t.amt != null ? t.amt : 0), dur: (t.dur || 3) + 1 });
        }
      }
    });
  }
  // 聚合装备特效；若带「罡气」类特效则开局获得护盾
  const mods = (typeof computeEquipMods === 'function') ? computeEquipMods(player) : null;
  if (mods && mods.shieldPct > 0) player.shield = { pct: mods.shieldPct, dur: 999 };
  // 被动·苍穹守元功：战斗开始形成「吸收池护盾」（气血上限百分比），优先抵扣伤害，耗尽才扣血
  // 必须放在装备护盾聚合之后，避免被装备护盾覆盖
  if (player.passiveTriggers && player.passiveTriggers.length) {
    player.passiveTriggers.forEach(t => {
      if (t.shieldOnStartPct) {
        const _sp = (t.shieldOnStartPct || 0.1);
        player.shield = player.shield || { pct: 0, dur: 999 };
        player.shield.value = Math.round(player.maxHp * _sp);
      }
    });
  }


  battle = {
    node, player, enemy,
    mode: mode || 'story',         // 'story' = 剧情副本；'worldboss' = 世界BOSS
    queue: [], turn: 0, roundCount: 0, playerDmg: 0, mods,
    _stackCrit: 0, _reviveUsed: false, _passiveLifestealUsed: false,
    _usedOnce: {},               // 每场战斗重置「限一次」功法（必须在对象字面量内初始化：battle 仍为 null 时解引用会抛 TypeError 导致无法进入战斗）
    msg: (isWB ? '世界BOSS · ' : '遭遇 ') + enemy.name + '！',
  };
  // 立绘（方案A）：按 avatarId / 卷 / BOSS 动态加载写实古风立绘，挂到 battle 上（不污染 art.hero / art.enemy）
  // [成仙化身] 若玩家已切换外形(selectedAvatar 命中 6 主角)，战斗立绘 + 头像同步用所选外形；
  // 否则回退到创建角色(avatarId)。selectedAvatar 若为敌人/BOSS 头像（无打坐立绘）则回退 avatarId，避免 404。
  const _heroDisplayId = resolveHeroDisplayId(player.selectedAvatar, player.avatarId);
  battle.heroSprite = loadImg(HERO_SPRITES[_heroDisplayId] || HERO_SPRITES.m1);
  // 头像 portrait（用于战斗 UI 卡片圆形小头像，与主页头像图鉴 assets/avatars/ 同步）
  const _pAv = (typeof AVATAR_MAP !== 'undefined' && AVATAR_MAP[_heroDisplayId]) || null;
  battle.heroAvatar = loadImg(_pAv ? _pAv.img : 'assets/avatars/avatar_m2.png');
  let _enemySrc;
  if (isWB) {
    const _slot = WB_SLOTS.find(s => s.idx === node._wb) || WB_SLOTS[0];
    _enemySrc = BOSS_SPRITES[_slot.idx] || BOSS_SPRITES[1];
  } else if (isArena) {
    _enemySrc = HERO_SPRITES[enemy.avatarId] || HERO_SPRITES.m1;
  } else if (node && node._story && node._story.ch && typeof STORY_BY_CH !== 'undefined') {
    const _vol = (STORY_BY_CH[node._story.ch] || {}).volume || 1;
    _enemySrc = ENEMY_SPRITES[_vol] || ENEMY_SPRITES[1];
  } else {
    _enemySrc = ENEMY_SPRITES[1];
  }
  battle.enemySprite = loadImg(_enemySrc);
  // 敌人头像 portrait（与头像图鉴同步）
  let _eAid;
  if (isWB) {
    const _slot2 = WB_SLOTS.find(s => s.idx === node._wb) || WB_SLOTS[0];
    _eAid = 'boss_' + (_slot2.idx || 1);
  } else if (isArena) {
    _eAid = enemy.avatarId;
  } else {
    const _vol2 = (node && node._story && typeof STORY_BY_CH !== 'undefined') ? ((STORY_BY_CH[node._story.ch] || {}).volume || 1) : 1;
    _eAid = 'enemy_v' + _vol2;
  }
  const _eAv = (typeof AVATAR_MAP !== 'undefined' && AVATAR_MAP[_eAid]) || null;
  battle.enemyAvatar = loadImg(_eAv ? _eAv.img : 'assets/avatars/avatar_enemy_v1.png');
  state = 'battle';
  document.body.classList.add('battle-mode');
  toast = '';
  hideBattleReturnBtn(); // 新战斗开始 → 清掉残留的返回按钮
  buildSkillBar();
  // 提前锁定飘字坐标（锚定到新战斗画面精灵头顶附近）
  battle.player._x = 210; battle.player._y = 244;
  battle.enemy._x = 430; battle.enemy._y = 244;
  beginRound();
  // 重启渲染循环（hub/create 时已停止空转）
  requestAnimationFrame(render);
}

// 状态乘区：buff 加成（amt 为比例，1 即 +0%）、debuff 削减（下限 0）
function buffMul(u, stat) { let m = 1; (u.buffs || []).forEach(b => { if (b.stat === stat) m += b.amt; }); return m; }
function debuffMul(u, stat) { let m = 1; (u.debuffs || []).forEach(b => { if (b.stat === stat) m -= b.amt; }); return Math.max(0, m); }
function isImmune(u) { return (u.buffs || []).some(b => b.stat === 'invinc' || b.stat === 'debuffImmune'); }
// 施加减益；noStack 时若同名（同 stat）减益已存在则刷新而非叠加
function applyDebuff(target, d) {
  if (isImmune(target)) return; // 无敌：免疫一切不良效果
  if (d.noStack) {
    const ex = (target.debuffs || []).find(x => x.stat === d.stat && x.noStack);
    if (ex) { ex.amt = Math.max(ex.amt, d.amt); ex.dur = Math.max(ex.dur, d.dur); return; }
  }
  target.debuffs.push({ stat: d.stat, amt: d.amt, dur: d.dur, noStack: !!d.noStack });
}

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
  // 2026-10-13 用户拍板：已去掉敌人大招冷却，此处不再递减 _ultCd
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
  // 持续伤害（DoT）：每回合开始按血量上限百分比扣血，持续 e.dur 回合后清除
  [p, e].forEach(u => {
    if (!u.dot) return;
    const dmg = Math.round(u.maxHp * (u.dot.pct || 0));
    u.hp = Math.max(0, u.hp - dmg);
    floats.push({ x: u._x, y: u._y, text: (u.dot.name || '持续') + '-' + dmg, color: '#E8B23B', ttl: 60 });
    if ((u.dot.dur -= 1) <= 0) u.dot = null;
  });
  // 持续回血（HoT）：每回合开始按上限百分比回复，持续 e.dur 回合后清除（震雷疗伤术等）
  [p, e].forEach(u => {
    if (!u.regen) return;
    const h = Math.round(u.maxHp * (u.regen.pct || 0));
    if (u.hp > 0) u.hp = Math.min(u.maxHp, u.hp + h);
    floats.push({ x: u._x, y: u._y, text: (u.regen.name || '回春') + '+' + h, color: '#3B6D11', ttl: 60 });
    if ((u.regen.dur -= 1) <= 0) u.regen = null;
  });
  // 免死（deathWard）：持续 e.dur 回合，到期清除剩余次数（血影凝灵法等）
  [p, e].forEach(u => {
    if (u.deathWard && (u.deathWard.dur -= 1) <= 0) u.deathWard = null;
  });
  // 沉默（禁止恢复）：持续回合到期清除
  [p, e].forEach(u => { if (u.silenceRecovery > 0) u.silenceRecovery--; });
  // 被动心法·战斗中触发（低气血自我增益 / 低气血下次吸血）：每回合评估一次
  evaluatePassiveTriggers(p);
  evaluatePassiveTriggers(e);
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
    // 连动阶梯（2026-10-14 用户拍板修订）：先攻 >=2 倍 → 多出手 1 次；>=3 倍 → +2；>=4 倍 → +3（封顶）。
    // 原「>=5 倍 → +4」一档已取消：用户实测该档让战斗过快，出手至多 3 次。
    // 极品装备 extraActions 仍可在封顶之外追加，保留装备价值。
    let n = linkCountFromRatio(ratio);
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
      const c = +b.dataset.cost; const _sk = SKILLS_DB_MAP[b.dataset.skill]; if (_sk && _sk.oncePerBattle && battle._usedOnce && battle._usedOnce[_sk.id]) enabled = false; // 每场限一次已用
      if (player.mp < c) enabled = false; // 灵力不足置灰
    }
    if (act === 'item' && (player.items || []).reduce((s, x) => s + x.qty, 0) <= 0) enabled = false;
    b.disabled = !enabled;
    b.style.opacity = '';   // 置灰视觉统一交给 CSS（.battle-cmd:disabled），不再用内联透明度盖掉黑金样式
  });
}

function damage(attacker, target, mult, type) {
  // 启动攻击冲刺动画（纯视觉，不阻塞战斗逻辑）
  const isP = !attacker.isEnemy;
  battle._anim = { phase: 'lunge', progress: 0, attacker: isP ? 'player' : 'enemy', target: isP ? 'enemy' : 'player', dist: 52 };

  // 命中判定：实际命中率 = 攻击方命中率 − 目标闪避率
  const attackerHR = (attacker.hitRate || 0.80) * buffMul(attacker, 'hit') * debuffMul(attacker, 'hit');
  const targetEva = target.eva || 0;
  // 装备命中率已永久并入 player.hitRate（recalcStats 处理）；此处仅叠加功法临时命中率buff
  const accBuff = (battle._tempHitRateBuff || 0); // 功法临时命中率buff（单次生效，攻击后消费）
  const effectiveHR = Math.min(2.0, attackerHR + accBuff);   // 命中率上限 200%（2026-10-21 用户拍板：150%→200%，可彻底对冲对手 100% 闪避）
  const actualHitRate = effectiveHR - targetEva;
  let hitChance;
  if (actualHitRate >= 0.5) {
    hitChance = Math.min(2.0, actualHitRate);       // 上限 200%（2026-10-21 用户拍板：150%→200%）
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
  let defStat = (isSpirit ? target.spiDef : target.def) * debuffMul(target, isSpirit ? 'spiDef' : 'def') * buffMul(target, isSpirit ? 'spiDef' : 'def');
  if (aMods && aMods.pierce) defStat *= (1 - aMods.pierce); // 破甲：无视部分防御
  let base = atkStat * mult - defStat; // 满额防御，不做 0.5 折算（穿透差异才明显）
  // 暴击：基础 15% + 等级×0.2% + 天命×0.2% + 增益·暴击 buff + 装备暴击率 + 濒锋(血<30%) + 积威(每回合累加，上限40%)
  let baseCrit = 0.15;
  if (typeof CULTIVATION !== 'undefined') {
    const _ax = attacker.isEnemy ? null : (typeof player !== 'undefined' && player.xp != null ? player.xp : null);
    if (_ax != null) baseCrit += (CULTIVATION.realmFromXp(_ax).globalIndex + 1) * 0.002;
  }
  if (attacker.des)   baseCrit += attacker.des * 0.002;
  let critDebuffAmt = 0; (attacker.debuffs || []).forEach(b => { if (b.stat === 'crit') critDebuffAmt += b.amt; });
  let critChance = baseCrit + Math.max(0, buffMul(attacker, 'crit') - 1) - critDebuffAmt;
  if (aMods) {
    critChance += aMods.critRate;
    if (aMods.lowHpCrit && attacker.hp / attacker.maxHp < 0.3) critChance += aMods.lowHpCrit;
  }
  // 被动心法·暴击率（pasCrit）：2026-10-12 修复——此前战斗内暴击判定不读被动功法，
  // 导致「暴击率 +X%」类被动（残血焚血术/黄泉电光决/离火玄甲诀/残血湮灭指等）实战不生效。
  if (!attacker.isEnemy && typeof player !== 'undefined' && player && player.pasCritTotal) {
    critChance += player.pasCritTotal;
  }
  if (battle._stackCrit) critChance += battle._stackCrit;
  const crit = Math.random() < Math.min(1.0, critChance);
  // 2026-10-12 修复：末尾追加「被动心法·暴击伤害（pasCritDmg）」，使「暴击伤害 +X%」类被动实战生效
  let critMul = 1.5 + (aMods ? aMods.critDmg : 0) + Math.max(0, buffMul(attacker, 'critdmg') - 1)
              + ((!attacker.isEnemy && typeof player !== 'undefined' && player && player.pasCritDmgTotal) ? player.pasCritDmgTotal : 0);
  if (crit) base *= critMul;
  if (target.defending) base *= 0.5;
  // 增伤（装备）/ 死战（血<30%）
  if (aMods) {
    if (aMods.dmgAmp) base *= (1 + aMods.dmgAmp);
    if (aMods.lowHpDmg && attacker.hp / attacker.maxHp < 0.3) base *= (1 + aMods.lowHpDmg);
  }
  // 玩家受击：护体减伤（装备）+ 护盾
  if (tMods && tMods.reduceDmg) base *= (1 - tMods.reduceDmg);
  // 被动·功法减伤 buff（如九幽玄甲诀：进入战斗后前 N 回合减伤），按受击方 buff 累加
  let _buffReduce = 0;
  (target.buffs || []).forEach(b => { if (b.stat === 'reduceDmg') _buffReduce += (b.amt || 0); });
  if (_buffReduce > 0) base *= (1 - Math.min(0.9, _buffReduce));
  if (target.shield && target.shield.pct) base *= (1 - target.shield.pct);


  base = Math.max(1, Math.round(base));
  // 敌人单发伤害上限（2026-10-13）：高倍率大招不能一击秒杀玩家。
  //   只钳制「最终伤害」；钳制攻击力会让低倍率技能在减法公式下归零（见 pacingEnemyAtkSeq 注释）。
  if (attacker.isEnemy && !target.isEnemy) {
    const _ecap = (target.maxHp || 1000) * PACING_MAX_SINGLE;
    if (base > _ecap) base = _ecap;
  }
  // 吸收池护盾（苍穹守元功）：在最小伤害下限之后，优先抵扣实际伤害，耗尽才扣血
  if (target.shield && target.shield.value != null && target.shield.value > 0 && base > 0) {
    const _absorbed = Math.min(target.shield.value, base);
    target.shield.value -= _absorbed;
    base -= _absorbed;
    if (target.shield.value <= 0) {
      target.shield.value = 0;
      if (!target.shield.pct) target.shield = null; // 护盾耗尽且无减伤 → 移除
    }
    if (_absorbed > 0) floats.push({ x: target._x, y: target._y, text: '护盾-' + _absorbed, color: '#5DCAA5', ttl: 60 });
  }
  // 反弹（功法反弹buff）：将敌方来犯伤害按比率弹回攻击者（先于无敌判定，确保反弹照常生效）
  let reflectPct = 0;
  (target.buffs || []).forEach(b => { if (b.stat === 'reflect') reflectPct += b.amt; });
  if (reflectPct > 0 && base > 0) {
    const r = Math.round(base * Math.min(1, reflectPct));
    attacker.hp = Math.max(0, attacker.hp - r);
    floats.push({ x: attacker._x, y: attacker._y, text: '反弹-' + r, color: '#A32D2D', ttl: 60 });
  }
  // 无敌：我方免疫一切伤害（反弹仍照常生效）
  const invinc = (target.buffs || []).some(b => b.stat === 'invinc');
  if (invinc) {
    floats.push({ x: target._x, y: target._y, text: '无敌', color: '#FFD86B', ttl: 60 });
    base = 0;
  }
  // 被动·罡风不灭身：免疫下一次受到的伤害（低血触发，每场限一次）
  if (base > 0 && target.immuneNextHit) {
    target.immuneNextHit = false;
    floats.push({ x: target._x, y: target._y, text: '凝罡护体', color: '#FFD86B', ttl: 60 });
    battle.msg = target.name + ' 凝罡护体，免疫了这次伤害！';
    base = 0;
  }
  if (base > 0) target.hp = Math.max(0, target.hp - base);
  tryLowHpLifesteal(attacker, base);
  if (base > 0 && !attacker.isEnemy && battle) battle.playerDmg = (battle.playerDmg || 0) + base; // 世界BOSS 累计玩家伤害
  const col = crit ? '#A32D2D' : '#2C2C2A';
  const txt = (crit ? '暴击 ' : '') + '-' + base;
  if (base > 0) floats.push({ x: target._x, y: target._y, text: txt, color: col, ttl: 60 });
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
  // 免疫不良状态（invinc / debuffImmune）时应免疫，与 applyDebuff / dot / stun / poison 同口径
  if (aMods && aMods.burn && base > 0 && !isImmune(target)) {
    target.debuffs.push({ stat: 'burn', amt: Math.round(attacker.atk * aMods.burn), dur: 2 });
  }
  return base;
}

// 施展功法（player 的 SKILLS_DB 条目，含 effect）
function applySkill(actor, target, sk) {
  actor.mp -= skillMpCost(sk);
  // 功法临时命中率buff（仅对玩家生效，下次攻击时消耗）
  if (!actor.isEnemy && sk.buffHitRate && battle) {
    battle._tempHitRateBuff = sk.buffHitRate;
  }
  const e = sk.effect || { kind: 'dmg', type: sk.type, mult: sk.mult };
  const floatAt = (u, text, color) => floats.push({ x: u._x, y: u._y, text, color, ttl: 60 });
  switch (e.kind) {
    case 'dmg': {
      let d;
      if (e.pierce) { // 穿透：无视部分防御（比例由 effect.piercePct 决定，缺省 0.75）
        const atkStat = (e.type === 'spirit' ? actor.spiAtk : actor.atk) * buffMul(actor, e.type === 'spirit' ? 'spiAtk' : 'atk');
        const piercePct = (e.piercePct != null) ? e.piercePct : 0.75; // 数据驱动；缺省沿用原硬编码 75%
        const defStat = (e.type === 'spirit' ? target.spiDef : target.def) * (1 - piercePct);
        let base = atkStat * e.mult - defStat;
        // 暴击：与普通攻击(damage)同源——基础15% + 等级/天命 + 装备/被动暴击率 + 积威 + 濒锋
        let pBase = 0.15;
        if (actor.level) pBase += actor.level * 0.002;
        if (actor.des)   pBase += actor.des * 0.002;
        const pMods = (!actor.isEnemy && battle && battle.mods) ? battle.mods : null;
        let pCrit = pBase + Math.max(0, buffMul(actor, 'crit') - 1) - (actor.debuffs || []).reduce((s, b) => s + (b.stat === 'crit' ? b.amt : 0), 0);
        if (pMods) {
          pCrit += pMods.critRate;
          if (battle._stackCrit) pCrit += battle._stackCrit;
          if (pMods.lowHpCrit && actor.hp / actor.maxHp < 0.3) pCrit += pMods.lowHpCrit;
        }
        const crit = Math.random() < Math.min(1.0, pCrit);
        let pMul = 1.5 + (pMods ? pMods.critDmg : 0) + Math.max(0, buffMul(actor, 'critdmg') - 1);
        if (crit) base *= pMul;
        if (target.defending) base *= 0.5;
        d = Math.max(1, Math.round(base));
        target.hp = Math.max(0, target.hp - d);
        tryLowHpLifesteal(actor, d);
        if (!actor.isEnemy && battle) battle.playerDmg = (battle.playerDmg || 0) + d; // 穿透伤害也累计
        const col = crit ? '#A32D2D' : '#2C2C2A';
        const txt = (crit ? '暴击 ' : '') + '-' + d;
        floatAt(target, txt, col);
      } else {
        d = damage(actor, target, e.mult, e.type);
      }
      battle.msg = actor.name + ' 施展「' + sk.name + '」造成 ' + d + ' 伤害';
      if (e.lifesteal) { const h = Math.round(d * e.lifesteal); actor.hp = Math.min(actor.maxHp, actor.hp + h); floatAt(actor, '+' + h, '#3B6D11'); }
      if (e.debuff) { applyDebuff(target, e.debuff); battle.msg += '，并削弱 ' + target.name + ' 的 ' + statCn(e.debuff.stat); }
      if (e.selfHpLoss) { const loss = Math.round(actor.maxHp * e.selfHpLoss); actor.hp = Math.max(1, actor.hp - loss); floatAt(actor, '-' + loss, '#B23B3B'); }
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
      const bstats = e.stats || [e.stat];
      const bamts = e.amts || [e.amt];
      const maxS = (e.maxStacks != null) ? e.maxStacks : 99;
      const perStack = bstats.length;
      // 至多叠加 maxS 次：超出则移除最早的一整层（按 sk.id 分组）
      let owned = actor.buffs.filter(b => b.sid === sk.id).length;
      while (owned >= maxS * perStack) {
        const idx = actor.buffs.findIndex(b => b.sid === sk.id);
        if (idx < 0) break;
        actor.buffs.splice(idx, 1); owned--;
      }
      bstats.forEach((st, i) => actor.buffs.push({ sid: sk.id, stat: st, amt: (bamts[i] != null ? bamts[i] : e.amt), dur: e.dur }));
      const bcn = st => (st === 'atk' ? '物理攻击' : st === 'spiAtk' ? '精神攻击' : st === 'init' ? '先攻' : st === 'def' ? '物理防御' : st === 'spiDef' ? '精神防御' : statCn(st));
      battle.msg = actor.name + ' 施展「' + sk.name + '」' + bstats.map(bcn).join('、') + '提升';
      break;
    }
    case 'debuff': {
      const dstats = (e.stats && e.stats.length) ? e.stats : (e.stat ? [e.stat] : []);
      dstats.forEach(st => applyDebuff(target, { stat: st, amt: e.amt, dur: e.dur, noStack: e.noStack }));
      if (e.dot && !isImmune(target)) target.dot = { pct: e.dot.pct, dur: e.dot.dur, name: e.dot.name || '持续' };
      const dcn = st => (st === 'atk' ? '物理攻击' : st === 'spiAtk' ? '精神攻击' : st === 'def' ? '物理防御' : st === 'spiDef' ? '精神防御' : statCn(st));
      let msg = actor.name + ' 施展「' + sk.name + '」'; if (dstats.length) msg += '削弱 ' + target.name + ' 的 ' + dstats.map(dcn).join('与'); if (e.dot) msg += (dstats.length ? '，并令其陷入' : '令 ' + target.name + ' 陷入') + (e.dot.name || '持续') + '（持续伤害）'; battle.msg = msg;
      break;
    }
    case 'critTrade': {
      // 自身暴击提升 + 削弱敌方暴击（不可叠加：同 id 刷新）
      actor.buffs = actor.buffs.filter(b => !(b.sid === sk.id && b.stat === 'crit'));
      actor.buffs.push({ sid: sk.id, stat: 'crit', amt: e.selfAmt, dur: e.dur });
      applyDebuff(target, { stat: 'crit', amt: e.enemyAmt, dur: e.dur, noStack: !!e.noStack });
      battle.msg = actor.name + ' 施展「' + sk.name + '」暴击提升，并削弱 ' + target.name + ' 的暴击';
      break;
    }
    case 'invinc_reflect': {
      // 反弹：下一回合敌方伤害全额弹回（buff stat:'reflect', amt 1.0）
      actor.buffs.push({ sid: sk.id, stat: 'reflect', amt: 1.0, dur: e.dur || 2 });
      // 无敌+免疫不良：我方 2 回合内免伤免控
      actor.buffs.push({ sid: sk.id, stat: 'invinc', amt: 1, dur: e.dur || 2 });
      battle._usedOnce[sk.id] = true; // 每场战斗只限一次
      battle.msg = actor.name + ' 施展「' + sk.name + '」化无相劫，反弹来犯、自身无敌！';
      break;
    }
    case 'stun': {
      if (isImmune(target)) { battle.msg = actor.name + ' 施展「' + sk.name + '」但 ' + target.name + ' 免疫不良效果，无效'; break; }
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
      if (isImmune(target)) { battle.msg = actor.name + ' 施展「' + sk.name + '」但 ' + target.name + ' 免疫不良效果，无效'; break; }
      target.poison = { dmg: e.dmg, dur: e.dur }; // 每回合开始扣 e.dmg 点血，持续 e.dur 回合
      battle.msg = actor.name + ' 施展「' + sk.name + '」令 ' + target.name + ' 中毒';
      break;
    }
    case 'regen': { // 持续回血（HoT）+ 可选减伤护盾（震雷疗伤术）
      actor.regen = { pct: e.pct, dur: e.dur, name: e.name || '回春' };
      let _msg = actor.name + ' 施展「' + sk.name + '」每回合回复自身 ' + Math.round((e.pct || 0) * 100) + '% 气血（' + e.dur + '回合）';
      if (e.shieldPct) { actor.shield = { pct: e.shieldPct, dur: (e.shieldDur || 1) }; _msg += '，并使下一回合受到的伤害减少 ' + Math.round(e.shieldPct * 100) + '%'; }
      battle.msg = _msg;
      break;
    }
    case 'deathward': { // 自损气血 + 授予免死（保留1点气血，可多次，持续N回合）（血影凝灵法）
      if (e.selfHpLoss) { const _loss = Math.round(actor.maxHp * e.selfHpLoss); actor.hp = Math.max(1, actor.hp - _loss); floatAt(actor, '-' + _loss, '#B23B3B'); }
      actor.deathWard = { charges: (e.charges != null ? e.charges : 1), dur: (e.dur != null ? e.dur : 6) };
      battle.msg = actor.name + ' 施展「' + sk.name + '」凝灵护体，获得 ' + actor.deathWard.charges + ' 次免死（持续 ' + actor.deathWard.dur + ' 回合）';
      break;
    }
    case 'silence_mp': { // 抽干敌方灵力 + 禁止敌方使用恢复类功法（星陨禁典）
      if (isImmune(target)) { battle.msg = actor.name + ' 施展「' + sk.name + '」但 ' + target.name + ' 免疫不良效果，无效'; break; }
      const _drain = Math.round(target.maxMp * (e.mpPct != null ? e.mpPct : 0.4));
      target.mp = Math.max(0, target.mp - _drain);
      floatAt(target, '-' + _drain + '灵', '#378ADD');
      target.silenceRecovery = (e.silenceDur != null ? e.silenceDur : 2);
      battle.msg = actor.name + ' 施展「' + sk.name + '」抽干敌方 ' + _drain + ' 灵力，并禁其恢复（' + target.silenceRecovery + '回合）';
      break;
    }
    default:
      battle.msg = actor.name + ' 施展「' + sk.name + '」（未知效果）';
  }
}

function statCn(stat) {
  return ({ atk: '攻击', def: '防御', init: '速度', spiAtk: '精神攻击', spiDef: '精神防御', crit: '暴击', hit: '命中', critdmg: '暴击伤害' })[stat] || stat;
}

function applyAction(actor, target, act) {
  if (act === 'attack') {
    const d = damage(actor, target, 1.0);
    battle.msg = actor.name + ' 使出攻击，造成 ' + d + ' 伤害';
  } else if (act === 'skill') {
    // 敌方专用（玩家功法走 applySkill）
    const sk = actor.skill;
    actor.mp -= skillMpCost(sk);
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
  let html = '<button class="battle-cmd back" data-act="cancelitem">' + CMD_ICONS.back + '<span class="cmd-name">返回</span></button>';
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

// ====== 敌人情境智能（2026-10-13 用户拍板：把「照固定脚本念台词」换成「按战场状态决策」）======
// 三类敌人（副本 / 竞技场 / 世界BOSS）共用同一套决策。
// 每只敌人有性格 _ai：
//   brute   莽夫：偏爱高倍率输出，残血就开大，正面硬刚
//   cunning 阴毒：偏爱减益 / 僵直 / 中毒，先削弱再收割
//   steady  稳健：先自保（护盾 / 回血 / 增益），血线安全才输出
// 评分制：所有「当前可用」的技能各自打分，取最高分施放；全部不可用才普攻。
// 原 _script 保留为兜底顺序（AI 无解时回退），不再是主要驱动。
function enemySkillKind(sk) {
  const e = sk.effect || null;
  if (!e) return 'dmg';
  if (e.kind === 'heal_hp' || e.kind === 'heal_mp' || e.kind === 'regen') return 'heal';
  if (e.kind === 'shield') return 'shield';
  if (e.kind === 'buff') return 'buff';
  if (e.kind === 'debuff') return 'debuff';
  if (e.kind === 'stun') return 'stun';
  if (e.kind === 'poison') return 'poison';
  return 'dmg';
}

function enemySkillScore(enemy, p, sk, turn) {
  const kind = enemySkillKind(sk);
  const mult = sk.mult || 1;
  const myHp = enemy.hp / Math.max(1, enemy.maxHp);
  const tHp = p.hp / Math.max(1, p.maxHp);
  const ai = enemy._ai || 'brute';
  let s = 0;
  if (kind === 'dmg') {
    s = mult;                                    // 倍率越高越想放
    if (mult >= 4) s += (ai === 'brute' ? 3 : 0.5);
    if (sk.ult) s += 8;                          // 大招是主要伤害来源：冷却好了优先放
    if (myHp < 0.4) s += 4;                      // 自己残血 → 拼命开大
    if (tHp < 0.25) s += 4;                      // 对手残血 → 追击收割
    if (p.shield) s += 2;                        // 对手开盾 → 用高伤硬砸
    if (p.defending) s -= 1.5;                   // 对手防御姿态（伤害减半）→ 性价比下降
    if (sk.ult) {
      // 先叠攻击增益再开大（2026-10-13）：pacing 反推假定大招是在增益下施放的，
      // 若敌人裸放大招，实际伤害只有反推值的一半 → 战斗毫无压力。
      const hasAtkBuff = (enemy.skills || []).some(x => x.effect && x.effect.kind === 'buff'
        && (x.effect.stat === 'atk' || (x.effect.stats && x.effect.stats.indexOf('atk') >= 0)));
      const buffOn = (enemy.buffs || []).some(b => b.stat === 'atk');
      if (hasAtkBuff && !buffOn) s -= 12;
      if (turn <= 1) s -= 4;                     // 第 1 回合先铺垫（与 pacing 序列假设一致）
    }
  } else if (kind === 'heal') {
    s = myHp < 0.4 ? 7 : (myHp < 0.7 ? 2 : -3);
    if (ai === 'steady') s += 1.5;
  } else if (kind === 'shield') {
    s = myHp < 0.65 ? 4 : 0.5;
    if (ai === 'steady') s += 2;
    if (enemy.shield) s -= 6;                    // 已有护盾不重复开
  } else if (kind === 'buff') {
    s = turn <= 2 ? 4 : 1.5;                     // 开局铺增益最划算
    if (ai === 'steady') s += 1.5;
    const bst = sk.effect.stat || (sk.effect.stats && sk.effect.stats[0]);
    if (bst === 'atk') s += 5;                              // 先把攻击叠起来再开大（无冷却，随时可开大）
    if (bst && (enemy.buffs || []).some(b => b.stat === bst)) s -= 4;   // 已生效不重复（否则会挤掉大招）
  } else if (kind === 'debuff') {
    s = turn <= 3 ? 2.0 : 0.8;                   // 开局铺减益
    if (ai === 'cunning') s += 2.5;
    const dst = sk.effect.stat || (sk.effect.stats && sk.effect.stats[0]);
    if (dst && (p.debuffs || []).some(b => b.stat === dst)) s -= 4;     // 已生效不重复
  } else if (kind === 'stun') {
    s = (p.stun || 0) > 0 ? -5 : 2.0;              // 对手已被控 → 不浪费
    if (ai === 'cunning') s += 2;
    if (tHp < 0.3) s += 1.5;                     // 控住再收割
  } else if (kind === 'poison') {
    s = p.poison ? -4 : 1.8;                       // 已在中毒 → 不重复
    if (ai === 'cunning') s += 2.5;
  }
  if (enemy._lastSkill === sk.name) s -= 3;      // 避免整场重复同一招
  return s;
}

function pickEnemySkill(enemy, p) {
  if (!enemy.skills || !enemy.skills.length) return null;
  const turn = (enemy._turn || 0) + 1;
  let best = null, bestScore = -Infinity;
  enemy.skills.forEach(sk => {
    if (enemy.mp < skillMpCost(sk)) return;                       // 内力不足
    if (enemy.silenceRecovery > 0 && enemySkillKind(sk) === 'heal') return;  // 被沉默禁恢复
    const sc = enemySkillScore(enemy, p, sk, turn);
    if (sc > bestScore) { bestScore = sc; best = sk; }
  });
  return best;
}

function enemyAct(enemy) {
  const p = battle.player;
  enemy._turn = (enemy._turn || 0) + 1;
  if (enemy.skills && enemy.skills.length) {
    const sk = pickEnemySkill(enemy, p);
    if (sk) { enemy._lastSkill = sk.name; applySkill(enemy, p, sk); nextTurn(); return; }
    // 无可用技能（内力不足 / 全被判负分）→ 回退 _script 兜底顺序
    const name = (enemy._script && enemy._script[enemy._turn - 1]) || null;
    const fb = name ? enemy.skills.find(s => s.name === name) : null;
    const _recovery = fb && fb.effect && (fb.effect.kind === 'heal_hp' || fb.effect.kind === 'heal_mp' || fb.effect.kind === 'regen');
    if (fb && enemy.mp >= skillMpCost(fb) && !(enemy.silenceRecovery > 0 && _recovery)) {
      enemy._lastSkill = fb.name; applySkill(enemy, p, fb); nextTurn(); return;
    }
  }
  // 最底层兜底：单技能 / 普攻（普通剧情敌人维持原 50% 概率）
  if (enemy.skill && enemy.mp >= skillMpCost(enemy.skill) && Math.random() < 0.5) applyAction(enemy, p, 'skill');
  else applyAction(enemy, p, 'attack');
  nextTurn();
}

function playerAct(act, skillId) {
  if (!awaitingInput) return;
  awaitingInput = false;
  setButtons(false);
  if (act === 'skill') {
    const sk = skillId ? SKILLS_DB_MAP[skillId] : null;
    if (sk && player.mp >= skillMpCost(sk) && !(sk.oncePerBattle && battle._usedOnce && battle._usedOnce[sk.id])) {
      battle._usedOnce[sk.id] = true; // 每场战斗只限一次
      applySkill(battle.player, battle.enemy, sk);
    } else {
      if (sk && sk.oncePerBattle && battle._usedOnce && battle._usedOnce[sk.id]) battle.msg = sk.name + ' 本场已用过';
      applyAction(battle.player, battle.enemy, 'attack'); // 不可用（已用过/灵力不足）回退普攻
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

// 免死（技能授予）：玩家受到致死伤害时保留 1 点气血，消耗 1 次；次数/持续回合耗尽后失效
function tryPlayerDeathWard() {
  const u = battle.player;
  if (u.deathWard && u.deathWard.charges > 0) {
    u.deathWard.charges--;
    u.hp = 1;
    floats.push({ x: u._x, y: u._y, text: '免死!', color: '#D4A843', ttl: 90 });
    battle.msg = '「免死」触发，保留 1 点气血！';
    if (u.deathWard.charges <= 0) u.deathWard = null;
    return true;
  }
  return false;
}

// 被动心法·战斗中触发：低气血自我增益（持续N回合，可重复授予） / 低气血下次吸血（每场限一次）
function evaluatePassiveTriggers(u) {
  if (!u.passiveTriggers || !u.passiveTriggers.length) return;
  u.passiveTriggers.forEach(t => {
    if (t.lifestealNext) { // 逆鳞固本诀：低血下次吸血，每场限一次
      if (battle._passiveLifestealUsed) return;
      if (u.hp > 0 && u.hp < u.maxHp * (t.hpBelow || 0.7) && !u.lowHpLifesteal) {
        u.lowHpLifesteal = t.lifestealNext;
        battle.msg = u.name + ' 血气翻涌，下一击吸取 ' + Math.round(t.lifestealNext * 100) + '% 气血！';
      }
      return;
    }
    if (t.healHpPct) { // 星潢续命篇：气血首次低于阈值，立刻恢复，每场限一次
      if (t.fired) return;
      if (u.hp > 0 && u.hp < u.maxHp * (t.hpBelow || 0.65)) {
        const h = Math.round(u.maxHp * (t.healHpPct || 0.25));
        u.hp = Math.min(u.maxHp, u.hp + h);
        floats.push({ x: u._x, y: u._y, text: '续命+' + h, color: '#3B6D11', ttl: 60 });
        battle.msg = u.name + ' 气血告急，星潢续命恢复 ' + h + ' 气血！';
        t.fired = true;
      }
      return;
    }
    if (t.healMpPct) { // 乾元汇灵录：灵力首次低于阈值，立刻恢复，每场限一次
      if (t.fired) return;
      if (u.mp != null && u.hp > 0 && u.mp < u.maxMp * (t.mpBelow || 0.20)) {
        const m = Math.round(u.maxMp * (t.healMpPct || 0.25));
        u.mp = Math.min(u.maxMp, u.mp + m);
        floats.push({ x: u._x, y: u._y, text: '汇灵+' + m, color: '#378ADD', ttl: 60 });
        battle.msg = u.name + ' 灵力告急，乾元汇灵恢复 ' + m + ' 灵力！';
        t.fired = true;
      }
      return;
    }
    if (t.defBuffAtHp) { // 不灭金钟罩：气血低于阈值，物理/精神防御+amt%，每场限一次
      if (t.fired) return;
      if (u.hp > 0 && u.hp < u.maxHp * (t.hpBelow || 0.35)) {
        u.buffs.push({ sid: t.sid, stat: 'def', amt: t.defBuffAtHp, dur: 99 });
        u.buffs.push({ sid: t.sid, stat: 'spiDef', amt: t.defBuffAtHp, dur: 99 });
        floats.push({ x: u._x, y: u._y, text: '金钟+80%双防', color: '#FFD86B', ttl: 60 });
        battle.msg = u.name + ' 气血告危，不灭金钟罩护体，物理/精神防御 +' + Math.round(t.defBuffAtHp * 100) + '%！';
        t.fired = true;
      }
      return;
    }
    if (t.immuneNext) { // 罡风不灭身：气血低于阈值，免疫下一次受到的伤害，每场限一次
      if (t.fired) return;
      if (u.hp > 0 && u.hp < u.maxHp * (t.hpBelow || 0.20)) {
        u.immuneNextHit = true;
        floats.push({ x: u._x, y: u._y, text: (t.name || '罡风') + '护体', color: '#FFD86B', ttl: 60 });
        battle.msg = u.name + ' 气血告危，' + (t.name || '罡风不灭身') + ' 凝罡，免疫下一次伤害！';
        t.fired = true;
      }
      return;
    }
    if (t.enemyHpDrainPct) { // 残血湮灭指：气血低于阈值，立刻扣除敌方 40% 气血，每场限一次
      if (t.fired) return;
      if (u.hp > 0 && u.hp < u.maxHp * (t.hpBelow || 0.20)) {
        const foe = battle.enemy;
        const d = Math.round(foe.hp * (t.enemyHpDrainPct || 0.4));
        foe.hp = Math.max(0, foe.hp - d);
        floats.push({ x: foe._x, y: foe._y, text: '湮灭-' + d, color: '#B23AC9', ttl: 60 });
        battle.msg = u.name + ' 气血告危，残血湮灭指湮灭敌方 ' + d + ' 气血！';
        t.fired = true;
        if (foe.hp <= 0) checkEnd();
      }
      return;
    }
    if (t.stats) { // 九天血怒法 / 踏星护体神功：低血自我增益
      if (u.hp > 0 && u.hp < u.maxHp * (t.hpBelow || 0.5)) {
        const has = (u.buffs || []).some(b => b.sid === t.sid);
        if (!has) {
          t.stats.forEach(st => u.buffs.push({ sid: t.sid, stat: st, amt: (t.amt != null ? t.amt : 0), dur: (t.dur || 3) }));
          battle.msg = u.name + ' 触发「' + (t.name || '血怒') + '」，' + t.stats.map(statCn).join('与') + '提升！';
        }
      }
    }
  });
}
// 低气血下次吸血（逆鳞固本诀）：玩家造成伤害时触发一次，吸血后本场不再触发
function tryLowHpLifesteal(attacker, dmg) {
  if (attacker.isEnemy || !attacker.lowHpLifesteal || dmg <= 0) return;
  if (battle._passiveLifestealUsed) { attacker.lowHpLifesteal = null; return; }
  const h = Math.round(dmg * attacker.lowHpLifesteal);
  attacker.hp = Math.min(attacker.maxHp, attacker.hp + h);
  floats.push({ x: attacker._x, y: attacker._y, text: '吸血+' + h, color: '#3B6D11', ttl: 60 });
  battle.msg += '（血怒吸血 ' + h + '）';
  attacker.lowHpLifesteal = null;
  battle._passiveLifestealUsed = true;
}

function checkEnd() {
  // 世界BOSS：击杀/阵亡/回合耗尽都视为「结算」（记录累计伤害，不触发地图/副本逻辑）
  if (battle.mode === 'worldboss') {
    if (battle.enemy.hp <= 0) { endWorldBossBattle(true); return true; }
    if (battle.player.hp <= 0) { if (tryPlayerDeathWard()) return false; endWorldBossBattle(false); return true; }
    return false;
  }
  if (battle.mode === 'arena') {
    if (battle.enemy.hp <= 0) { endArenaBattle(true); return true; }
    if (battle.player.hp <= 0) { if (tryPlayerDeathWard()) return false; endArenaBattle(false); return true; }
    return false;
  }
  if (battle.enemy.hp <= 0) {
    endBattle(true); return true;
  }
  if (battle.player.hp <= 0) {
    // 免死（技能授予）：优先于装备「涅槃」触发
    if (tryPlayerDeathWard()) return false;
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
  // 注意：不在此处移除 battle-mode！移除后 .wrap 会从 1180px 缩回 680px，
  // 导致胜利/失败画面瞬间变小留白。改为在真正回到主页的各出口点统一移除。
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
    // 阵亡后满血满灵复活（游戏无永久死亡惩罚），避免返回副本/主页后 HUD 仍显示 0 血，
    // 同时与开局满血逻辑一致，确保可立即重新挑战。
    player.hp = player.maxHp; player.mp = player.maxMp;
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
    } else if (battle && battle.mode === 'arena') {
      openArenaResult();
    } else if (window.HUB) { window.HUB.refresh(); window.HUB.show(); }
    else { document.body.classList.remove('battle-mode'); state = 'hub'; toast = ''; }
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

  // 头像 40x40（圆形裁剪，使用头像图鉴 portrait 而非全身立绘）
  const avatarSize = 40;
  const ax = x + 6, ay = y + 5;
  const img = isPlayer
    ? ((battle && battle.heroAvatar && ready(battle.heroAvatar)) ? battle.heroAvatar : art.hero)
    : ((battle && battle.enemyAvatar && ready(battle.enemyAvatar)) ? battle.enemyAvatar : art.enemy);
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

// ===== 经典回合制战斗画面（通用 RPG 表现）=====
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

  // ---- 3. 精灵选择与尺寸（写实风抠像立绘，放大到画面主体级）----
  const heroImg = (battle.heroSprite && ready(battle.heroSprite)) ? battle.heroSprite
                : (ready(art.hero) ? art.hero : null);
  const enemyImg = (battle.enemySprite && ready(battle.enemySprite)) ? battle.enemySprite
                  : (ready(art.enemy) ? art.enemy : null);
  // 写实风立绘尺寸（比 Q 版大 ~130%，占画面主要视觉焦点）
  const spW = 120, spH = 168;

  // 地面站位坐标（我方左前、敌方右前，大尺寸精灵需拉开间距）
  const pBaseX = gCx - 130, pBaseY = gCy + 8;
  const eBaseX = gCx + 130, eBaseY = gCy + 8;

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

  // ---- 4. 绘制双方精灵（写实风抠像 + 光圈底座）----
  function drawBattleSprite(img, cx, cy, lungX, bobY, isHero) {
    const sx = cx + lungX;
    const sy = cy + bobY;
    // ★ 光圈底座（通用 RPG 表现：脚下圆形发光平台）
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
      // 等比 cover 裁剪：无论原图比例（3:4 / 2:3 等）都不变形，超出部分裁掉（透明边无害）
      const iw = img.width, ih = img.height;
      const sc = Math.max(spW / iw, spH / ih);
      const dw = iw * sc, dh = ih * sc;
      ctx.drawImage(img, sx - dw / 2, sy - dh, dw, dh);
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
    const barW = 72, barH = 6, barX = x - barW / 2, barY = topY - 12;
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
    ctx.font = 'bold 15px STKaiti, KaiTi, 楷体, sans-serif';
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

// 高分屏/大屏清晰化：逻辑坐标恒为 640×360（所有绘制代码不用改），
// 只把 canvas 的像素缓冲按「实际 CSS 宽度 × DPR」放大，再用 setTransform 等比映射回去。
// 战斗画布放大到 1180px 后，若缓冲仍是 640×360，文字会被拉伸发虚。
function syncCanvasResolution() {
  if (!canvas || typeof canvas.width !== 'number' || typeof ctx.setTransform !== 'function') return 1;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const rect = typeof canvas.getBoundingClientRect === 'function' ? canvas.getBoundingClientRect() : null;
  const cssW = (rect && rect.width) || W;
  const wantW = Math.max(W, Math.round(cssW * dpr));
  const wantH = Math.round(wantW * H / W);
  if (Math.abs(canvas.width - wantW) > 1 || Math.abs(canvas.height - wantH) > 1) {
    canvas.width = wantW;
    canvas.height = wantH;
  }
  return canvas.width / W;
}

let _lastRenderState;
function render() {
  // 主页/创建界面是 DOM 层，不需要画布持续重绘；停止 rAF，把算力让给视频解码
  if (state === 'hub' || state === 'create') { return; }
  const _s = syncCanvasResolution();
  ctx.setTransform(_s, 0, 0, _s, 0, 0);
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
