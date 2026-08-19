/* equip_db.js — 固定装备数据库（94 种）+ 套装 + 特效元数据
 * 设计目标：装备种类 80~100，越高级越带专属 BUFF/特效，玩家有长期收集与养成乐趣。
 * 命名参考《一剑霸天》（星河神剑/生灭天辰/天魔幡/演天珠…）与修仙惯例；
 * 特效范式参考爆款游戏：星铁/原神(暴击/增伤/穿透/套装)、了不起的飞剑(七杀反伤/紫薇血低暴击/武曲每回合累加)、
 * 热血江湖(减伤/复活甲/护盾)、放置类(吸血/每回合回血)。
 * 由 index.html 在 js/player.js 之前加载，genEquip/drawEquipFromDb 供 player.js 调用。
 * 注意：顶层 const/let 跨文件可直接引用（详见 PROJECT.md 坑点）。
 */

// 各部位在各品质下的“基础属性模板”（未乘境界缩放），makeItemFromDb 会再按境界放大
const EQUIP_TPL = {
  weapon: {
    0: { atk: 6,  spiAtk: 6 },
    1: { atk: 12, spiAtk: 10, hitRate: 0.05 },
    2: { atk: 20, spiAtk: 16, hitRate: 0.12 },
    3: { atk: 32, spiAtk: 26, hitRate: 0.22 },
    4: { atk: 50, spiAtk: 42, hitRate: 0.34 },
  },
  armor: {
    0: { def: 5,  maxHp: 45,  spiDef: 4 },
    1: { def: 10, maxHp: 90,  spiDef: 8 },
    2: { def: 18, maxHp: 160, spiDef: 14 },
    3: { def: 30, maxHp: 280, spiDef: 24 },
    4: { def: 50, maxHp: 480, spiDef: 40 },
  },
  accessory: {
    0: { maxMp: 35, spiAtk: 6,  eva: 0.03 },
    1: { maxMp: 70, spiAtk: 12, eva: 0.07, hitRate: 0.03 },
    2: { maxMp: 120, spiAtk: 20, eva: 0.12, hitRate: 0.07 },
    3: { maxMp: 200, spiAtk: 34, eva: 0.17, hitRate: 0.12 },
    4: { maxMp: 340, spiAtk: 56, eva: 0.22, hitRate: 0.16 },
  },
  boots: {
    0: { init: 5,  eva: 0.03 },
    1: { init: 10, eva: 0.08 },
    2: { init: 17, eva: 0.16 },
    3: { init: 28, eva: 0.27 },
    4: { init: 46, eva: 0.38 },
  },
};

// 特效类型说明（text 用于面板展示；v 的含义随类型而定，多为百分点或百分比）
const EFFECT_META = {
  crit:      { name: '锐利',     text: v => '暴击率 +' + v + '%' },
  critdmg:   { name: '会心',     text: v => '暴击伤害 +' + v + '%' },
  lifesteal: { name: '吸血',     text: v => '攻击吸血 ' + v + '%' },
  reflect:   { name: '反伤',     text: v => '受击反伤 ' + v + '%' },
  pierce:    { name: '破甲',     text: v => '无视防御 ' + v + '%' },
  dmgamp:    { name: '增伤',     text: v => '造成伤害 +' + v + '%' },
  reducedmg: { name: '护体',     text: v => '受到伤害 -' + v + '%' },
  shield:    { name: '罡气',     text: v => '开局获得 ' + v + '% 气血护盾' },
  regenhp:   { name: '生生',     text: v => '每回合回复 ' + v + '% 气血' },
  regenmp:   { name: '归元',     text: v => '每回合回复 ' + v + ' 灵力' },
  extra:     { name: '连动',     text: () => '每回合额外行动 1 次' },
  burn:      { name: '灼烧',     text: v => '攻击附加灼烧（' + v + '% 攻击/回合，持续2回合）' },
  lowhpcrit: { name: '濒锋',     text: v => '气血<30% 时暴击率 +' + v + '%' },
  lowhpdmg:  { name: '死战',     text: v => '气血<30% 时伤害 +' + v + '%' },
  stackcrit: { name: '积威',     text: v => '每回合暴击率 +' + v + '%（上限40%）' },
  revive:    { name: '涅槃',     text: v => '阵亡复活 1 次（回复 ' + v + '% 气血）' },
  accuracy:  { name: '精准',     text: v => '命中率 +' + v + '%' },
};

// 套装：每件跨 4 部位各一，集 2 件触发二件套、4 件触发四件套
const EQUIP_SETS = {
  zhuxian: { name: '诛仙', color: '#C0392B',
    two:   { critRate: 0.08, dmgAmp: 0.05 },
    four:  { pierce: 0.15, shieldPct: 0.20, critRate: 0.15 },
    desc:  '攻伐之道。2件：暴击+8%、增伤5%；4件：破甲15%、开局20%护盾、暴击+15%' },
  taiji:   { name: '太极', color: '#3B6D11',
    two:   { regenMp: 15, regenHp: 0.03 },
    four:  { extraActions: 1, shieldPct: 0.15 },
    desc:  '生生不息。2件：每回合回15灵、回3%气血；4件：连动1次、开局15%护盾' },
  xuanwu:  { name: '玄武', color: '#378ADD',
    two:   { reduceDmg: 0.08 },
    four:  { reflect: 0.15, regenHp: 0.05 },
    desc:  '龟息镇守。2件：减伤8%；4件：反伤15%、每回合回5%气血' },
  ziwei:   { name: '紫薇', color: '#9B6BCC',
    two:   { lowHpCrit: 0.25 },
    four:  { lowHpDmg: 0.20, dmgAmp: 0.10, critRate: 0.15 },
    desc:  '绝境锋芒。2件：血<30%暴击+25%；4件：血<30%增伤20%、增伤10%、暴击+15%' },
  qisha:   { name: '七杀', color: '#A32D2D',
    two:   { reflect: 0.10 },
    four:  { stackCrit: 0.05, dmgAmp: 0.10, critRate: 0.15 },
    desc:  '杀伐决断。2件：反伤10%；4件：每回合暴击+5%、增伤10%、暴击+15%' },
  tanlang: { name: '贪狼', color: '#D4A843',
    two:   { critDmg: 0.20 },
    four:  { lowHpDmg: 0.20, critDmg: 0.15, critRate: 0.15 },
    desc:  '贪婪凶星。2件：暴伤+20%；4件：血<30%增伤20%、暴伤+15%、暴击+15%' },
};

/* EQUIP_DB — 94 种固定装备
 * 字段：id, name, slot, rarity(0~4), effect(可选 {type,v}), set(可选 套装key), desc
 * 凡品(r0) 12 / 灵品(r1) 19 / 宝品(r2) 23 / 仙品(r3) 25 / 神品(r4) 27 = 106（含暴击流补充装备）
 */
const EQUIP_DB = [
  // ===================== 凡品 r0（12，纯属性，入门过渡） =====================
  { id: 'w0_1', name: '锈铁剑',   slot: 'weapon',    rarity: 0 },
  { id: 'w0_2', name: '青木剑',   slot: 'weapon',    rarity: 0 },
  { id: 'w0_3', name: '断水刀',   slot: 'weapon',    rarity: 0 },
  { id: 'a0_1', name: '粗布衣',   slot: 'armor',     rarity: 0 },
  { id: 'a0_2', name: '皮甲',     slot: 'armor',     rarity: 0 },
  { id: 'a0_3', name: '铁叶甲',   slot: 'armor',     rarity: 0 },
  { id: 'c0_1', name: '铜铃',     slot: 'accessory', rarity: 0 },
  { id: 'c0_2', name: '木珠',     slot: 'accessory', rarity: 0 },
  { id: 'c0_3', name: '布囊',     slot: 'accessory', rarity: 0 },
  { id: 'b0_1', name: '草鞋',     slot: 'boots',     rarity: 0 },
  { id: 'b0_2', name: '布靴',     slot: 'boots',     rarity: 0 },
  { id: 'b0_3', name: '麻履',     slot: 'boots',     rarity: 0 },

  // ===================== 灵品 r1（16，单条小特效） =====================
  { id: 'w1_1', name: '寒铁剑',   slot: 'weapon',    rarity: 1, effect: { type: 'accuracy', v: 5 } },
  { id: 'w1_2', name: '青锋刃',   slot: 'weapon',    rarity: 1, effect: { type: 'dmgamp', v: 4 } },
  { id: 'w1_3', name: '玄铁枪',   slot: 'weapon',    rarity: 1, effect: { type: 'accuracy', v: 6 } },
  { id: 'w1_4', name: '赤霄剑',   slot: 'weapon',    rarity: 1, effect: { type: 'dmgamp', v: 5 } },
  { id: 'a1_1', name: '玄龟甲',   slot: 'armor',     rarity: 1, effect: { type: 'reducedmg', v: 4 } },
  { id: 'a1_2', name: '锁子铠',   slot: 'armor',     rarity: 1, effect: { type: 'regenhp', v: 2 } },
  { id: 'a1_3', name: '霓裳衣',   slot: 'armor',     rarity: 1, effect: { type: 'reducedmg', v: 5 } },
  { id: 'a1_4', name: '玄武袍',   slot: 'armor',     rarity: 1, effect: { type: 'regenhp', v: 3 } },
  { id: 'c1_1', name: '聚灵珠',   slot: 'accessory', rarity: 1, effect: { type: 'regenmp', v: 10 } },
  { id: 'c1_2', name: '乾坤戒',   slot: 'accessory', rarity: 1, effect: { type: 'accuracy', v: 4 } },
  { id: 'c1_3', name: '引魂幡',   slot: 'accessory', rarity: 1, effect: { type: 'regenmp', v: 12 } },
  { id: 'c1_4', name: '太极符',   slot: 'accessory', rarity: 1, effect: { type: 'reducedmg', v: 4 } },
  { id: 'b1_1', name: '追风靴',   slot: 'boots',     rarity: 1, effect: { type: 'crit', v: 3 } },
  { id: 'b1_2', name: '凌波履',   slot: 'boots',     rarity: 1, effect: { type: 'dmgamp', v: 4 } },
  { id: 'b1_3', name: '踏云靴',   slot: 'boots',     rarity: 1, effect: { type: 'regenhp', v: 2 } },
  { id: 'b1_4', name: '神行靴',   slot: 'boots',     rarity: 1, effect: { type: 'crit', v: 4 } },

  // ===================== 宝品 r2（20，中等特效 + 2 套） =====================
  { id: 'w2_1', name: '赤血刀',   slot: 'weapon',    rarity: 2, effect: { type: 'lifesteal', v: 6 } },
  { id: 'w2_2', name: '破军戟',   slot: 'weapon',    rarity: 2, effect: { type: 'accuracy', v: 10 } },
  { id: 'w2_3', name: '诛仙剑',   slot: 'weapon',    rarity: 2, set: 'zhuxian', effect: { type: 'crit', v: 6 } },
  { id: 'w2_4', name: '太极剑',   slot: 'weapon',    rarity: 2, set: 'taiji',   effect: { type: 'dmgamp', v: 8 } },
  { id: 'w2_5', name: '流光剑',   slot: 'weapon',    rarity: 2, effect: { type: 'lifesteal', v: 8 } },
  { id: 'a2_1', name: '玄铁铠',   slot: 'armor',     rarity: 2, effect: { type: 'reflect', v: 8 } },
  { id: 'a2_2', name: '金钟甲',   slot: 'armor',     rarity: 2, effect: { type: 'shield', v: 10 } },
  { id: 'a2_3', name: '诛仙甲',   slot: 'armor',     rarity: 2, set: 'zhuxian', effect: { type: 'reducedmg', v: 8 } },
  { id: 'a2_4', name: '太极袍',   slot: 'armor',     rarity: 2, set: 'taiji',   effect: { type: 'regenhp', v: 3 } },
  { id: 'a2_5', name: '镇岳甲',   slot: 'armor',     rarity: 2, effect: { type: 'reflect', v: 10 } },
  { id: 'c2_1', name: '血魂珠',   slot: 'accessory', rarity: 2, effect: { type: 'lifesteal', v: 6 } },
  { id: 'c2_2', name: '回春铃',   slot: 'accessory', rarity: 2, effect: { type: 'regenmp', v: 18 } },
  { id: 'c2_3', name: '诛仙佩',   slot: 'accessory', rarity: 2, set: 'zhuxian', effect: { type: 'crit', v: 5 } },
  { id: 'c2_4', name: '太极印',   slot: 'accessory', rarity: 2, set: 'taiji',   effect: { type: 'regenmp', v: 20 } },
  { id: 'c2_5', name: '噬魂符',   slot: 'accessory', rarity: 2, effect: { type: 'accuracy', v: 8 } },
  { id: 'b2_1', name: '疾影靴',   slot: 'boots',     rarity: 2, effect: { type: 'extra', v: 1 } },
  { id: 'b2_2', name: '追星履',   slot: 'boots',     rarity: 2, effect: { type: 'crit', v: 6 } },
  { id: 'b2_3', name: '诛仙靴',   slot: 'boots',     rarity: 2, set: 'zhuxian', effect: { type: 'dmgamp', v: 6 } },
  { id: 'b2_4', name: '太极履',   slot: 'boots',     rarity: 2, set: 'taiji',   effect: { type: 'regenhp', v: 3 } },
  { id: 'b2_5', name: '踏雪靴',   slot: 'boots',     rarity: 2, effect: { type: 'burn', v: 8 } },

  // ===================== 仙品 r3（22，强特效 + 2 套） =====================
  { id: 'w3_1', name: '焚天剑',   slot: 'weapon',    rarity: 3, effect: { type: 'accuracy', v: 15 } },
  { id: 'w3_2', name: '裂空刃',   slot: 'weapon',    rarity: 3, effect: { type: 'critdmg', v: 30 } },
  { id: 'w3_3', name: '玄武剑',   slot: 'weapon',    rarity: 3, set: 'xuanwu', effect: { type: 'lifesteal', v: 8 } },
  { id: 'w3_4', name: '紫薇剑',   slot: 'weapon',    rarity: 3, set: 'ziwei',  effect: { type: 'lowhpcrit', v: 25 } },
  { id: 'w3_5', name: '星河神剑', slot: 'weapon',    rarity: 3, effect: { type: 'dmgamp', v: 12 } },
  { id: 'w3_6', name: '生灭战刀', slot: 'weapon',    rarity: 3, effect: { type: 'burn', v: 12 } },
  { id: 'a3_1', name: '玄武甲',   slot: 'armor',     rarity: 3, set: 'xuanwu', effect: { type: 'reducedmg', v: 10 } },
  { id: 'a3_2', name: '紫薇袍',   slot: 'armor',     rarity: 3, set: 'ziwei',  effect: { type: 'regenhp', v: 4 } },
  { id: 'a3_3', name: '九霄甲',   slot: 'armor',     rarity: 3, effect: { type: 'reflect', v: 12 } },
  { id: 'a3_4', name: '天罡铠',   slot: 'armor',     rarity: 3, effect: { type: 'shield', v: 15 } },
  { id: 'a3_5', name: '玄龟神甲', slot: 'armor',     rarity: 3, effect: { type: 'reducedmg', v: 12 } },
  { id: 'c3_1', name: '玄武珠',   slot: 'accessory', rarity: 3, set: 'xuanwu', effect: { type: 'regenmp', v: 25 } },
  { id: 'c3_2', name: '紫薇铃',   slot: 'accessory', rarity: 3, set: 'ziwei',  effect: { type: 'crit', v: 8 } },
  { id: 'c3_3', name: '演天珠',   slot: 'accessory', rarity: 3, effect: { type: 'accuracy', v: 12 } },
  { id: 'c3_4', name: '生灭天辰', slot: 'accessory', rarity: 3, effect: { type: 'critdmg', v: 30 } },
  { id: 'c3_5', name: '七窍珠',   slot: 'accessory', rarity: 3, effect: { type: 'regenmp', v: 28 } },
  { id: 'c3_6', name: '天魔舍利', slot: 'accessory', rarity: 3, effect: { type: 'lowhpcrit', v: 20 } },
  { id: 'b3_1', name: '玄武靴',   slot: 'boots',     rarity: 3, set: 'xuanwu', effect: { type: 'regenhp', v: 4 } },
  { id: 'b3_2', name: '紫薇履',   slot: 'boots',     rarity: 3, set: 'ziwei',  effect: { type: 'dmgamp', v: 10 } },
  { id: 'b3_3', name: '流云靴',   slot: 'boots',     rarity: 3, effect: { type: 'crit', v: 8 } },
  { id: 'b3_4', name: '罡风履',   slot: 'boots',     rarity: 3, effect: { type: 'extra', v: 1 } },
  { id: 'b3_5', name: '踏虚靴',   slot: 'boots',     rarity: 3, effect: { type: 'burn', v: 10 } },

  // ===================== 神品 r4（24，顶级特效 + 2 套） =====================
  { id: 'w4_1', name: '七杀剑',   slot: 'weapon',    rarity: 4, set: 'qisha',  effect: { type: 'accuracy', v: 6 } },
  { id: 'w4_2', name: '贪狼刃',   slot: 'weapon',    rarity: 4, set: 'tanlang', effect: { type: 'critdmg', v: 45 } },
  { id: 'w4_3', name: '大荒戟',   slot: 'weapon',    rarity: 4, effect: { type: 'lifesteal', v: 12 } },
  { id: 'w4_4', name: '斩天刀',   slot: 'weapon',    rarity: 4, effect: { type: 'accuracy', v: 6 } },
  { id: 'w4_5', name: '轩辕剑',   slot: 'weapon',    rarity: 4, effect: { type: 'critdmg', v: 50 } },
  { id: 'w4_6', name: '灭世刃',   slot: 'weapon',    rarity: 4, effect: { type: 'burn', v: 18 } },
  { id: 'a4_1', name: '七杀甲',   slot: 'armor',     rarity: 4, set: 'qisha',  effect: { type: 'reducedmg', v: 14 } },
  { id: 'a4_2', name: '贪狼铠',   slot: 'armor',     rarity: 4, set: 'tanlang', effect: { type: 'reflect', v: 14 } },
  { id: 'a4_3', name: '不灭金身', slot: 'armor',     rarity: 4, effect: { type: 'shield', v: 20 } },
  { id: 'a4_4', name: '混沌甲',   slot: 'armor',     rarity: 4, effect: { type: 'reducedmg', v: 16 } },
  { id: 'a4_5', name: '九转玄甲', slot: 'armor',     rarity: 4, effect: { type: 'regenhp', v: 6 } },
  { id: 'a4_6', name: '万钧铠',   slot: 'armor',     rarity: 4, effect: { type: 'reflect', v: 16 } },
  { id: 'c4_1', name: '七杀珠',   slot: 'accessory', rarity: 4, set: 'qisha',  effect: { type: 'crit', v: 12 } },
  { id: 'c4_2', name: '贪狼佩',   slot: 'accessory', rarity: 4, set: 'tanlang', effect: { type: 'critdmg', v: 35 } },
  { id: 'c4_3', name: '天魔离光尺', slot: 'accessory', rarity: 4, effect: { type: 'accuracy', v: 18 } },
  { id: 'c4_4', name: '大自在天魔幡', slot: 'accessory', rarity: 4, effect: { type: 'lifesteal', v: 12 } },
  { id: 'c4_5', name: '浑天魔鉴', slot: 'accessory', rarity: 4, effect: { type: 'lowhpdmg', v: 25 } },
  { id: 'c4_6', name: '九华界',   slot: 'accessory', rarity: 4, effect: { type: 'regenmp', v: 40 } },
  { id: 'b4_1', name: '七杀靴',   slot: 'boots',     rarity: 4, set: 'qisha',  effect: { type: 'extra', v: 1 } },
  { id: 'b4_2', name: '贪狼履',   slot: 'boots',     rarity: 4, set: 'tanlang', effect: { type: 'dmgamp', v: 15 } },
  { id: 'b4_3', name: '踏天靴',   slot: 'boots',     rarity: 4, effect: { type: 'stackcrit', v: 5 } },
  { id: 'b4_4', name: '无量履',   slot: 'boots',     rarity: 4, effect: { type: 'regenhp', v: 6 } },
  { id: 'b4_5', name: '神行太保靴', slot: 'boots',   rarity: 4, effect: { type: 'critdmg', v: 40 } },
  { id: 'b4_6', name: '涅槃履',   slot: 'boots',     rarity: 4, effect: { type: 'revive', v: 50 } },

  // ===================== 暴击流补充装备（单件暴击率 ≤20%） =====================
  { id: 'w1_5', name: '寒星剑',   slot: 'weapon',    rarity: 1, effect: { type: 'crit', v: 5 } },
  { id: 'c1_5', name: '锐金铃',   slot: 'accessory', rarity: 1, effect: { type: 'crit', v: 4 } },
  { id: 'b1_5', name: '疾风靴',   slot: 'boots',     rarity: 1, effect: { type: 'crit', v: 5 } },
  { id: 'w2_6', name: '裂云刀',   slot: 'weapon',    rarity: 2, effect: { type: 'crit', v: 9 } },
  { id: 'c2_6', name: '寒芒戒',   slot: 'accessory', rarity: 2, effect: { type: 'crit', v: 7 } },
  { id: 'b2_6', name: '凌风靴',   slot: 'boots',     rarity: 2, effect: { type: 'crit', v: 9 } },
  { id: 'w3_7', name: '碎星刃',   slot: 'weapon',    rarity: 3, effect: { type: 'crit', v: 14 } },
  { id: 'c3_7', name: '离火珠',   slot: 'accessory', rarity: 3, effect: { type: 'crit', v: 11 } },
  { id: 'b3_6', name: '踏星靴',   slot: 'boots',     rarity: 3, effect: { type: 'crit', v: 13 } },
  { id: 'w4_7', name: '弑神枪',   slot: 'weapon',    rarity: 4, effect: { type: 'crit', v: 20 } },
  { id: 'c4_7', name: '戮仙环',   slot: 'accessory', rarity: 4, effect: { type: 'crit', v: 16 } },
  { id: 'b4_7', name: '太虚靴',   slot: 'boots',     rarity: 4, effect: { type: 'crit', v: 18 } },
];

// 由数据库条目生成一个可穿戴 item（按当前境界缩放基础属性）
function makeItemFromDb(entry, tier) {
  const r = RARITY[entry.rarity];
  const def = EQUIP_SLOTS[entry.slot];
  const scale = 1 + (tier || 0) * 0.18;
  const base = EQUIP_TPL[entry.slot][entry.rarity];
  const bonus = {};
  for (const k in base) {
    let v = Math.round(base[k] * scale);
    if (k === 'eva' || k === 'hitRate') v = Math.round(base[k] * 100) / 100; // 命中/闪避为百分比，不随境界放大（避免高境界单件闪避/命中率爆表；单件上限由 resolvedEquipBonus 夹断）
    bonus[k] = v;
  }
  const item = {
    uid: nextEquipUid(), slot: entry.slot, slotName: def.name,
    rarity: r.key, rarityName: r.name, rarityColor: r.color,
    bonus, extraActions: 0, name: entry.name,
    effect: entry.effect ? { type: entry.effect.type, v: entry.effect.v } : null,
    set: entry.set || null, setId: entry.id, entryId: entry.id,
  };
  if (entry.effect && entry.effect.type === 'extra') item.extraActions = entry.effect.v || 1;
  return item;
}

// 按 部位+品质 随机抽取一件（供 genEquip / 宝箱 / 商店 调用）
function drawEquipFromDb(slot, rarityIdx) {
  const pool = EQUIP_DB.filter(e => e.slot === slot && e.rarity === rarityIdx);
  if (!pool.length) { // 兜底：该格无数据则退到凡品同部位
    const fb = EQUIP_DB.filter(e => e.slot === slot && e.rarity === 0);
    return makeItemFromDb(fb[Math.floor(Math.random() * fb.length)], 0);
  }
  const pick = pool[Math.floor(Math.random() * pool.length)];
  const tier = (typeof CULTIVATION !== 'undefined') ? CULTIVATION.realmFromXp(player.xp).globalIndex : 0;
  return makeItemFromDb(pick, tier);
}

// 获取装备的有效加成（已保存bonus + 当前模板回填缺失字段）
// 解决：改模板后旧装备(已序列化进localStorage)缺少新增属性的问题
// 注意：item.rarity 存的是字符串 key（'shen'/'ling'…），而 EQUIP_TPL[slot] 按数字 0~4 索引，
//       必须先按 RARITY 映射回数字索引再查模板，否则旧装备永远查不到模板、回填失效。
function resolvedEquipBonus(item) {
  const ri = (typeof RARITY !== 'undefined') ? RARITY.findIndex(r => r.key === item.rarity) : -1;
  const tpl = (ri >= 0 && EQUIP_TPL[item.slot]) ? EQUIP_TPL[item.slot][ri] : null;
  const bonus = Object.assign({}, item.bonus || {});
  if (tpl) {
    for (const k in tpl) {
      if (!(k in bonus)) bonus[k] = tpl[k]; // 缺失字段用模板原始值回填
    }
  }
  // 单件装备命中率/闪避率硬上限（用户铁律：闪避单件至多+50%、命中单件至多+40%）
  // 同时保护旧存档中曾被境界缩放放大的异常值（如 eva=0.98 的靴子），无需重掉装备即生效
  if (bonus.hitRate > 0.40) bonus.hitRate = 0.40;
  if (bonus.eva > 0.50) bonus.eva = 0.50;
  return bonus;
}

// 装备特效文字（用于面板展示）
function equipEffectText(item) {
  const parts = [];
  if (item.effect && EFFECT_META[item.effect.type]) {
    const m = EFFECT_META[item.effect.type];
    parts.push('【' + m.name + '】' + m.text(item.effect.v));
  }
  if (item.set && EQUIP_SETS[item.set]) {
    parts.push('【' + EQUIP_SETS[item.set].name + '套装】');
  }
  return parts.join(' ');
}
