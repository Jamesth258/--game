/* player.js — 属性常量 + 功法表 + 挂机常量 + player 对象 + 派生属性计算
 * 由 index.html 拆分而来。加载顺序见 index.html 底部 <script> 列表，勿随意调整。
 * 注意：顶层 const/let 跨文件可直接引用，但不会挂到 window（详见 PROJECT.md 坑点 8.1）。
 */
// ---- 玩家（跨战斗保留，胜利后回血）----
// 6 项可自由加点属性（初值 10），由 recalcStats 推导全部战斗数值
const ATTR_KEYS = ['con', 'str', 'sou', 'spd', 'com', 'des'];
const ATTR_NAMES = { con: '体质', str: '力量', sou: '灵魂', spd: '速度', com: '悟性', des: '天命' };
const POINTS_PER_STAGE = 10;  // 每突破一小阶获得的可分配点数
const BASE_FREE_POINTS = 10;  // 开局即可分配的基础点数（出生即有，不用等突破）

// ===== 功法系统（装备至多 6 种，战斗中每回合点选施展）=====
// 全部功法数据在 js/skills-data.js 的 SKILLS_DB / SKILLS_DB_MAP（由 gen_skills.py 生成，130 种）。
// 普攻恒为物理（0 灵力）；功法分物理/精神/无三类，灵力消耗各由功法定（越阶越高）。
// 新角色初始赠送一套涵盖「攻/精/回灵/防御增益/回血/减益」的入门功法，保证开局即可体验多样机制。
const DEFAULT_LEARNED = ['at001', 'at022', 're015', 'bu008', 're004', 'de009', 'at002', 'bu016'];
const DEFAULT_EQUIPPED = ['at001', 'at022', 're015', 'bu008', 're004', 'de009']; // 至多 6
const MAX_EQUIPPED = 6;

// ===== 挂机修炼 =====
// 在线：停留在游戏画面（主页/地图/战斗）即按速率累加修为；离线：按离开时长结算（封顶 12 小时）
const ONLINE_XP_PER_SEC = 2;     // 在线每秒修为
const OFFLINE_XP_PER_SEC = 1;    // 离线每秒修为（约为在线一半）
const OFFLINE_CAP_SEC = 12 * 3600;
const HUB_TICK_MS = 1000;

// 加修为（fullHeal=true 时回满，用于离线结算/突破）
function gainXp(amount, fullHeal) {
  player.xp += amount;
  recalcStats(player);
  if (fullHeal) { player.hp = player.maxHp; player.mp = player.maxMp; }
  else { player.hp = Math.min(player.hp, player.maxHp); player.mp = Math.min(player.mp, player.maxMp); }
}

// 离线挂机结算：返回获得的修为（0 表示无）
function applyOfflineXp() {
  if (!player.lastSeen) return 0;
  const elapsed = Math.min(OFFLINE_CAP_SEC, Math.max(0, (Date.now() - player.lastSeen) / 1000));
  const gain = Math.floor(elapsed * OFFLINE_XP_PER_SEC * (1 + player.xpBonus));
  if (gain > 0) gainXp(gain, true);
  return gain;
}

// ===== 装备系统 =====
// 4 个装备部位：武器/护甲/法宝/战靴，每个部位主加不同派生属性
const EQUIP_SLOTS = {
  weapon:    { name: '武器', icon: '⚔', attrs: ['atk', 'spiAtk'] },
  armor:     { name: '护甲', icon: '🛡', attrs: ['def', 'spiDef', 'maxHp'] },
  accessory: { name: '法宝', icon: '☯', attrs: ['maxMp', 'spiAtk', 'eva'] },
  boots:     { name: '战靴', icon: '👢', attrs: ['init', 'eva'] },
};
const EQUIP_SLOT_KEYS = Object.keys(EQUIP_SLOTS);

// 品质（凡→灵→宝→仙→神）：mult 为属性放大系数，ea 为极品追加「连动」的概率
const RARITY = [
  { key: 'fan',  name: '凡品', color: '#9aa0a6', mult: 1.0, ea: 0.00 },
  { key: 'ling', name: '灵品', color: '#639922', mult: 1.5, ea: 0.05 },
  { key: 'bao',  name: '宝品', color: '#378ADD', mult: 2.2, ea: 0.12 },
  { key: 'xian', name: '仙品', color: '#9B6BCC', mult: 3.2, ea: 0.22 },
  { key: 'shen', name: '神品', color: '#D4A843', mult: 4.6, ea: 0.40 },
];

// 各属性在「凡品 / 0 阶」时的单件基准值，后续按品质与境界缩放
const EQUIP_BASE = { atk: 6, def: 5, maxHp: 45, maxMp: 35, spiAtk: 6, spiDef: 4, init: 5, eva: 0.02 };

// 部位命名素材（品质·词缀）
const _EQUIP_NAMES = {
  weapon:    ['寒铁剑', '青锋刃', '玄铁枪', '赤霄剑'],
  armor:     ['玄龟甲', '锁子铠', '霓裳衣', '玄武袍'],
  accessory: ['聚灵珠', '乾坤戒', '引魂幡', '太极符'],
  boots:     ['追风靴', '凌波履', '踏云靴', '神行靴'],
};

let _equipUid = 1;
function nextEquipUid() { return 'E' + Date.now().toString(36) + (_equipUid++); }

// 生成一件装备（slot：部位；rarityIdx：品质序号）
// 装备生成改为从固定数据库（equip_db.js）按 部位+品质 抽取，越高级越带特效
function genEquip(slot, rarityIdx) {
  return drawEquipFromDb(slot, rarityIdx);
}

// 品质随机（境界越高越容易出高品；宝箱/商店/战斗掉落共用）
function rollRarity() {
  const tier = (typeof CULTIVATION !== 'undefined') ? CULTIVATION.realmFromXp(player.xp).globalIndex : 0;
  const w = [
    Math.max(1, 60 - tier * 2),      // 凡
    30 + Math.min(tier, 20),         // 灵
    Math.min(15 + tier, 40),         // 宝
    Math.max(0, tier - 5) * 2,       // 仙
    Math.max(0, tier - 15),          // 神
  ];
  const sum = w.reduce((a, b) => a + b, 0);
  let r = Math.random() * sum;
  for (let i = 0; i < w.length; i++) { if ((r -= w[i]) <= 0) return i; }
  return 0;
}

// 装备加成文字（用于弹窗展示）
function equipBonusText(item) {
  const names = { atk: '攻', def: '防', maxHp: '气血', maxMp: '灵力', spiAtk: '精攻', spiDef: '精防', init: '先攻', eva: '闪避', hitRate: '命中' };
  const parts = [];
  const bonus = (typeof resolvedEquipBonus === 'function') ? resolvedEquipBonus(item) : (item.bonus || {});
  for (const k in bonus) {
    if (!bonus[k]) continue;
    parts.push((names[k] || k) + ((k === 'eva' || k === 'hitRate') ? '+' + Math.round(bonus[k] * 100) + '%' : '+' + bonus[k]));
  }
  if (item.extraActions) parts.push('连动+' + item.extraActions);
  const eff = equipEffectText(item);
  if (eff) parts.push('｜ ' + eff);
  return parts.join(' ');
}

// 新角色初始赠送一套凡品装备（自动穿戴，让装备系统开局即生效）
function applyStarterEquip() {
  const eq = {};
  EQUIP_SLOT_KEYS.forEach(s => { eq[s] = genEquip(s, 0); });
  player.equipment = eq;
  player.bag = [];
  player.gold = 50;
}

const player = {
  name: '少年侠客', isEnemy: false,
  con: 10, str: 10, sou: 10, spd: 10, com: 10, des: 10, // 6 基础属性
  spent: 0,                                                  // 已分配点数
  extraActions: 0,                                           // 极品装备附加的本回合连动次数（recalcStats 重算）
  xpBonus: 0,                                                // 挂机经验加成（比例）
  learned: DEFAULT_LEARNED.slice(),                         // 已习得功法（SKILLS_DB id 数组）
  equippedSkills: DEFAULT_EQUIPPED.slice(),                // 已装备功法（≤6，战斗中每回合点选）
  equipCollected: [],                                      // 已获得装备的 EQUIP_DB id 集合（图鉴收集，去重，不因出售/更换移除）
  codexReward: { skill: 0, equip: 0 },                     // 图鉴里程碑已发放档位（每满10个功法/装备发1000钻）
  skillPity: 0,                                            // 功法宝箱保底计数：累计开启次数，满 120 必出帝阶，抽到皇/帝重置
  storyCleared: {},                                         // 剧情副本进度：ch -> 已通关关卡数(0~10)
  storyRewardClaimed: {},                                   // 已领取章节通关奖励的章节号集合
  storyLevelFirstClear: {},                                  // 各关首通标记：'ch_lv' -> true（重战不再发奖励）
  worldBoss: null,                                          // 世界BOSS进度：{date, slots:{idx->{attempts,dmg,claimed,rank}}}
  daily: null,                                              // 每日奖励进度：{date, month, signedToday, monthSignCount, monthClaimed, onlineSecToday, onlineClaimed}
  diamond: 0,                                               // 钻石：专用于商城消费的货币（签到/在线奖励产出）
  lastSeen: Date.now(),                                      // 离线时间戳（挂机结算）
  maxHp: 0, hp: 0, maxMp: 0, mp: 0, atk: 0, def: 0, spd: 0,
  spiAtk: 0, spiDef: 0, eva: 0, init: 0, luck: 0,
  critRate: 0.15, critDmg: 1.5,                                // 常驻暴击率 / 暴伤倍率（属性面板展示用）
  hitRate: 0.25,                                              // 命中率（基础25%+等级*0.5%+悟性*0.2%+装备加成，上限100%）
  potions: 3, defending: false, sect: '', score: 0, xp: 0,
  equipment: { weapon: null, armor: null, accessory: null, boots: null }, // 已穿戴装备（部位→item）
  bag: [], gold: 50, diamond: 0,                            // 背包 + 灵石（装备/商店货币） + 钻石（商城消费货币）
};

// 由 6 基础属性 + 境界 + 装备 推导出全部战斗数值
function recalcStats(p) {
  const idx = (typeof CULTIVATION !== 'undefined' ? CULTIVATION.realmFromXp(p.xp) : { globalIndex: 0 }).globalIndex;
  let maxHp  = Math.round(100 + p.con * 20 + idx * 100);
  let def    = Math.round(10 + p.con * 2 + idx * 2.5);
  let atk    = Math.round(20 + p.str * 2 + idx * 8);
  let maxMp  = Math.round(100 + p.com * 20 + idx * 100);    // 灵力上限
  let spiAtk = Math.round(20 + p.sou * 2 + idx * 10);       // 精神攻击
  let spiDef = Math.round(10 + p.sou * 1 + idx * 2);        // 精神防御
  let spd    = p.spd;                                        // 速度（战斗速度=属性值）
  let init   = Math.round(10 + p.spd * 2 + idx * 2);        // 先攻值
  let eva    = 0.10 + idx * 0.001 + p.spd * 0.001 + p.des * 0.001; // 闪避率（基础）
  let hitR   = 0.25 + idx * 0.005 + p.com * 0.002;               // 命中率：基础25%+等级*0.5%+悟性*0.2%
  let extraActions = 0;

  // 装备加成：叠加到派生属性；extraActions 注入战斗连动 hook（battle.js beginRound 读取）
  const eq = p.equipment || {};
  const _hasResolve = (typeof resolvedEquipBonus === 'function');
  for (const slot of EQUIP_SLOT_KEYS) {
    const it = eq[slot];
    if (!it) continue;
    const bonus = _hasResolve ? resolvedEquipBonus(it) : (it.bonus || {});
    if (!it.bonus && Object.keys(bonus).length === 0) continue;
    if (bonus.atk)    atk    += bonus.atk;
    if (bonus.def)    def    += bonus.def;
    if (bonus.maxHp)  maxHp  += bonus.maxHp;
    if (bonus.maxMp)  maxMp  += bonus.maxMp;
    if (bonus.spiAtk) spiAtk += bonus.spiAtk;
    if (bonus.spiDef) spiDef += bonus.spiDef;
    if (bonus.init)   init   += bonus.init;
    if (bonus.eva)    eva    += bonus.eva;
    if (bonus.hitRate) hitR  += bonus.hitRate;  // 模板命中率（永久，进面板；旧装备通过 resolvedEquipBonus 回填）
    for (const _ef of resolvedEquipEffects(it)) { if (_ef.type === 'accuracy') hitR += (_ef.v || 0) / 100; } // 精准特效（永久，进面板；单件+命中受 100% 总封顶，单装备至多+40%）
    if (it.extraActions) extraActions += it.extraActions;
  }

  // 被动心法：习得即永久加成（不进 equippedSkills、不作为战斗点选技能）
  // 被动功法存于 player.learned（与主动功法同库），此处遍历累加其 pas* 属性到派生数值
  let pasCR = 0, pasCD = 0; // 暴击率/暴伤累加，待下方 cr/cd 段合并（面板展示用）
  if (typeof SKILLS_DB_MAP !== 'undefined') {
    const _learned = p.learned || [];
    for (const id of _learned) {
      const sk = SKILLS_DB_MAP[id];
      if (!sk || sk.kind !== 'passive' || !sk.passive) continue;
      const pa = sk.passive;
      if (pa.pasAtk)    atk    += pa.pasAtk;        // 攻击
      if (pa.pasSpiAtk) spiAtk += pa.pasSpiAtk;     // 精神攻击
      if (pa.pasDef)    def    += pa.pasDef;        // 防御
      if (pa.pasInit)   init   += pa.pasInit;       // 先攻
      if (pa.pasHp)     maxHp  += pa.pasHp;         // 生命上限
      if (pa.pasMp)     maxMp  += pa.pasMp;         // 灵力上限
      if (pa.pasHit)    hitR   += pa.pasHit;        // 命中率（永久，进面板，随命中率封顶100%）
      if (pa.pasCrit)   pasCR  += pa.pasCrit;       // 暴击率（合并至 cr）
      if (pa.pasCritDmg) pasCD  += pa.pasCritDmg;   // 暴击伤害（合并至 cd，无封顶）
    }
  }

  p.maxHp = maxHp;
  p.def = def;
  p.atk = atk;
  p.maxMp = maxMp;
  p.spiAtk = spiAtk;
  p.spiDef = spiDef;
  p.spd = spd;
  p.init = Math.round(init);
  p.eva = Math.min(1.0, eva);                      // 闪避率上限100%（与命中率一致）
  p.hitRate = Math.min(1.0, hitR);                      // 命中率上限100%
  p.extraActions = extraActions;
  p.luck = p.des;                                        // 幸运值
  p.xpBonus = (p.com + p.des) * 0.002;                     // 挂机经验加成 = 悟性×0.2% + 天命×0.2%（每点属性各 0.2%）

  // 常驻暴击率 / 暴伤倍率（供属性面板展示）
  // 基础 = 15% + 等级×0.2% + 天命×0.2%（属性点来源，与命中率同源但比例更低）
  // 仅统计「常驻」来源：基础 + 装备锐利·会心 + 套装常驻项（含 4 件套 +15% 暴击）
  // 战斗内「条件触发」的（濒锋·血<30%、积威·每回合累加、功法暴击buff）不计入面板常驻值
  let cr = 0.15 + (p.level || 0) * 0.002 + (p.des || 0) * 0.002, cd = 1.5;
  const _eq2 = p.equipment || {};
  const _setCnt = {};
  for (const slot of EQUIP_SLOT_KEYS) {
    const it = _eq2[slot];
    if (!it) continue;
    for (const _ef of resolvedEquipEffects(it)) {
      if (_ef.type === 'crit')    cr += (_ef.v || 0) / 100;
      if (_ef.type === 'critdmg') cd += (_ef.v || 0) / 100;
    }
    if (it.set) _setCnt[it.set] = (_setCnt[it.set] || 0) + 1;
  }
  if (typeof EQUIP_SETS !== 'undefined') {
    for (const s in _setCnt) {
      const def = EQUIP_SETS[s]; if (!def) continue;
      const n = _setCnt[s];
      if (n >= 2 && def.two)   { if (def.two.critRate) cr += def.two.critRate; if (def.two.critDmg) cd += def.two.critDmg; }
      if (n >= 4 && def.four)  { if (def.four.critRate) cr += def.four.critRate; if (def.four.critDmg) cd += def.four.critDmg; }
    }
  }
  cr += pasCR;   // 被动心法·暴击率（习得即加成）
  cd += pasCD;   // 被动心法·暴击伤害（习得即加成，无封顶）
  p.critRate = Math.min(1.0, cr);    // 暴击率上限 100%（与命中/闪避一致）
  p.critDmg = cd;                    // 暴击伤害倍率（面板展示时 ×100% 即总倍率）
  return p;
}

recalcStats(player); // 初始化派生属性（xp=0 → 炼气境 第一重天）
player.hp = player.maxHp; player.mp = player.maxMp;
