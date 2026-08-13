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

// ===== 功法表（普攻恒为物理，功法分物理/精神两类，灵力消耗各由功法定）=====
const SKILLS = {
  xuanfeng: { id: 'xuanfeng', name: '旋风剑法', type: 'phys',   mult: 1.8, cost: 12, desc: '物理怒斩，重创单体' },
  xuanyin:  { id: 'xuanyin',  name: '玄阴指',   type: 'spirit', mult: 1.6, cost: 15, desc: '灵魂冲击，无视部分护甲' },
};

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

const player = {
  name: '少年侠客', isEnemy: false,
  con: 10, str: 10, sou: 10, spd: 10, com: 10, des: 10, // 6 基础属性
  spent: 0,                                                  // 已分配点数
  extraActions: 0,                                           // 极品装备附加的本回合连动次数
  xpBonus: 0,                                                // 挂机经验加成（比例）
  learned: ['xuanfeng', 'xuanyin'],                          // 已习得功法
  activeSkill: 'xuanfeng',                                   // 出战功法
  lastSeen: Date.now(),                                      // 离线时间戳（挂机结算）
  maxHp: 0, hp: 0, maxMp: 0, mp: 0, atk: 0, def: 0, spd: 0,
  spiAtk: 0, spiDef: 0, eva: 0, init: 0, luck: 0,
  potions: 3, defending: false, sect: '', score: 0, xp: 0,
};

// 由 6 基础属性 + 境界推导出全部战斗数值
function recalcStats(p) {
  const idx = (typeof CULTIVATION !== 'undefined' ? CULTIVATION.realmFromXp(p.xp) : { globalIndex: 0 }).globalIndex;
  p.maxHp  = Math.round(100 + p.con * 20 + idx * 100);
  p.def    = Math.round(10 + p.con * 2 + idx * 2.5);
  p.atk    = Math.round(20 + p.str * 2 + idx * 8);
  p.maxMp  = Math.round(100 + p.com * 20 + idx * 100);    // 灵力上限
  p.spiAtk = Math.round(20 + p.sou * 2 + idx * 10);       // 精神攻击
  p.spiDef = Math.round(10 + p.sou * 1 + idx * 2);        // 精神防御
  p.spd    = p.spd;                                        // 速度（战斗速度=属性值）
  p.init   = Math.round(10 + p.spd * 2 + idx * 2);        // 先攻值
  p.eva    = Math.min(0.95, 0.10 + idx * 0.001 + p.spd * 0.001 + p.des * 0.001); // 闪避率
  p.luck   = p.des;                                        // 幸运值
  p.xpBonus = (p.com + p.des) * 0.002;                     // 挂机经验加成 = 悟性×0.2% + 天命×0.2%（每点属性各 0.2%）
  return p;
}

recalcStats(player); // 初始化派生属性（xp=0 → 炼气境 第一重天）
player.hp = player.maxHp; player.mp = player.maxMp;
