// gen_story.js — 生成《逍遥仙》100 章剧情副本数据 js/story-data.js
// 改编自 2024-2026 热门爆款仙侠小说（见 design/百章剧情与副本奖励设计.md 的"改编来源"）。
// 与现有系统对接：
//   · 功法三选一 → 取 SKILLS_DB（js/skills-data.js）对应阶位的 id（优先取 lockedUntil=dungeon/exchange 的"剧情副本获取"功法）
//   · 装备三选一 → {slot, rarity} 传给 player.js 的 genEquip(slot, rarityIdx) 生成具体装备
// 运行：node gen_story.js  （会在 js/ 下写出 story-data.js）

const fs = require('fs');
const path = require('path');

// 加载功法库（skills-data.js 末尾导出了 module.exports = SKILLS_DB）
const SKILLS_DB = require('./js/skills-data.js');

// ---------- 阶位 / 品质 中文名（与 gen_skills.py / player.js 保持一致）----------
const TIER_NAME = { 1: '黄阶', 2: '玄阶', 3: '地阶', 4: '天阶', 5: '王阶', 6: '皇阶', 7: '帝阶' };
const RARITY_NAME = ['凡品', '灵品', '宝品', '仙品', '神品']; // player.js RARITY 顺序
const EQUIP_SLOTS = ['weapon', 'armor', 'accessory', 'boots'];
const EQUIP_SLOT_CN = { weapon: '武器', armor: '护甲', accessory: '法宝', boots: '战靴' };

// ---------- 难度映射（章节 → 功法阶 / 装备品质）----------
// 功法 7 阶铺满 100 章；装备 5 品质铺满 100 章。均随章节递增，后期陡升。
function skillTier(ch) {
  if (ch <= 15) return 1;
  if (ch <= 30) return 2;
  if (ch <= 45) return 3;
  if (ch <= 60) return 4;
  if (ch <= 75) return 5;
  if (ch <= 88) return 6;
  return 7;
}
function equipRarity(ch) {
  if (ch <= 15) return 0; // 凡品（开局已是凡品，前期用于替换/补位）
  if (ch <= 37) return 1; // 灵品
  if (ch <= 59) return 2; // 宝品
  if (ch <= 81) return 3; // 仙品
  return 4;                // 神品
}

// 单关经验（胜利奖励）：随章节递增，章内第 10 关为 BOSS 关 ×1.5
function levelExp(ch, lv) {
  const base = 20 + ch * 8;              // ch1≈28，ch100≈820
  let e = Math.round(base * (1 + (lv - 1) * 0.05));
  if (lv === 10) e = Math.round(e * 1.5);
  return e;
}

// ---------- 三选一：功法 ----------
// 开局即赠送的入门功法（与 player.js DEFAULT_LEARNED 保持一致）；三选一排除它们，保证奖励有意义
const STARTER_SKILLS = ['at001', 'at022', 're015', 'bu008', 're004', 'de009', 'at002', 'bu016'];
const byTier = {};
SKILLS_DB.forEach(s => { (byTier[s.tier] = byTier[s.tier] || []).push(s); });
function pickSkills(chapter, tier) {
  const pool = byTier[tier] || [];
  if (!pool.length) return [];
  // 排除开局已拥有的入门功法；若排除后不足 3，再放宽（保底）
  let locked = pool.filter(s => s.lockedUntil && !STARTER_SKILLS.includes(s.id));
  let rest = pool.filter(s => !s.lockedUntil && !STARTER_SKILLS.includes(s.id));
  while (locked.length + rest.length < 3) {
    pool.filter(s => !STARTER_SKILLS.includes(s.id) && !locked.includes(s) && !rest.includes(s))
       .forEach(s => rest.push(s));
    break;
  }
  // 故事副本优先发放"剧情副本/兑换"渠道（lockedUntil）的功法，契合设定
  const ordered = locked.concat(rest);
  const start = (chapter * 3) % ordered.length;
  const out = [];
  for (let k = 0; k < 3 && ordered.length; k++) out.push(ordered[(start + k) % ordered.length].id);
  return out;
}

// ---------- 三选一：装备 ----------
function pickEquip(chapter, rarity) {
  const out = [];
  for (let k = 0; k < 3; k++) {
    out.push({ slot: EQUIP_SLOTS[(chapter + k) % 4], rarity });
  }
  return out;
}

// ---------- 10 卷剧情（改编自热门小说，名称/情节均为二次创作，规避抄袭）----------
// realmName 为叙事用境界（与 cultivation.js 早期境界对应，仅作剧情氛围）
const VOLUMES = [
  {
    name: '第一卷·凡尘问道', inspiredBy: '《凡人修仙传》', realmName: '炼气境',
    titles: ['山村惊变', '七玄入门', '药园杂役', '墨师之祸', '夜遁深山', '灵泉洗髓', '同门相残', '升仙令下', '擂台扬名', '别山历练'],
    plots: [
      '太平村夜起妖风，少年拾得半卷残经。',
      '考入门派，资质平庸只得当记名弟子。',
      '药园杂役中遇神秘老者，授吐纳根基。',
      '察觉墨师以弟子炼药，暗布杀局。',
      '携残经夜遁深山，初感灵气入体。',
      '误入灵泉洗髓易筋，修为小成。',
      '墨师党羽追杀，以智破局全身而退。',
      '宗门十年升仙大会令下，风云聚。',
      '擂台以弱胜强，连败嫡传名动七玄。',
      '大会夺魁却择下山，卷终留悬念。',
    ],
  },
  {
    name: '第二卷·九龙渡厄', inspiredBy: '《遮天》', realmName: '筑基境',
    titles: ['九龙拉棺', '北斗荒原', '禁地求生', '源术初探', '古碑残字', '同棺之争', '苦海种金', '圣体虚影', '荒古遗阵', '渡厄归来'],
    plots: [
      '九具龙尸拉青铜棺，现于星空。',
      '少年被渡至北斗荒古禁地。',
      '禁地绝灵，挣扎求生觅出路。',
      '初探源术，辨古纹窥大道。',
      '残碑古字记载上古灭世之秘。',
      '同棺修士相残，夺机缘。',
      '苦海种金，奠基修行根本。',
      '圣体虚影显，惊动四方。',
      '踏入荒古遗阵，破阵得宝。',
      '渡厄归来，境界破筑基。',
    ],
  },
  {
    name: '第三卷·古神遗秘', inspiredBy: '《仙逆》', realmName: '真武境',
    titles: ['化凡修心', '古神之地', '戮仙残诀', '血色祭坛', '天劫将至', '逆修一脉', '域外心魔', '因果轮回', '神念化形', '遗秘归藏'],
    plots: [
      '入古神之地，化凡修心清净。',
      '古神遗骸藏无上机缘。',
      '得戮仙残诀，杀伐决断。',
      '血色祭坛献祭，险死还生。',
      '天劫将至，避劫于秘境。',
      '逆修一脉，反夺天地造化。',
      '域外心魔侵神，守灵台。',
      '因果轮回现，了前尘。',
      '神念化形，可御物千里。',
      '遗秘归藏，真武小成。',
    ],
  },
  {
    name: '第四卷·异火重燃', inspiredBy: '《斗破苍穹》', realmName: '化海境',
    titles: ['退婚之辱', '残魂指路', '纳灵之戒', '异火初现', '焚天炼体', '炼药师路', '宗族大比', '火噬强敌', '丹成惊四座', '一剑立威'],
    plots: [
      '退婚之辱，立三年之约。',
      '神秘残魂指路，授炼药。',
      '纳灵之戒藏异火种子。',
      '异火初现，险为火噬。',
      '焚天炼体，筋骨如钢。',
      '踏上炼药师之路。',
      '宗族大比，一鸣惊人。',
      '火噬强敌，洗前耻。',
      '丹成惊四座，名动一方。',
      '一剑立威，化海初成。',
    ],
  },
  {
    name: '第五卷·至尊骨血', inspiredBy: '《完美世界》', realmName: '金丹境',
    titles: ['至尊骨殇', '重铸己身', '搬血秘境', '虚神界开', '补天遗术', '群雄并起', '凶巢试炼', '真血觉醒', '上界来客', '骨血重光'],
    plots: [
      '至尊骨被夺，坠入绝境。',
      '重铸己身，另辟蹊径。',
      '搬血秘境，淬体极致。',
      '虚神界开，群英争锋。',
      '得补天遗术，续道基。',
      '群雄并起，乱世将启。',
      '凶巢试炼，九死一生。',
      '真血觉醒，威压同辈。',
      '上界来客，引动风波。',
      '骨血重光，金丹凝成。',
    ],
  },
  {
    name: '第六卷·山海封天', inspiredBy: '《我欲封天》', realmName: '元婴境',
    titles: ['山海初临', '血仙之路', '封天古印', '逆乱阴阳', '妖族盟约', '域内争雄', '镜花水月', '夺天之谋', '山海崩塌', '封天一念'],
    plots: [
      '初临山海界，弱肉强食。',
      '走血仙之路，以战养战。',
      '得封天古印，镇一方。',
      '逆乱阴阳，夺造化。',
      '与妖族立盟约，共御外。',
      '域内争雄，逐鹿山海。',
      '镜花水月，辨虚妄。',
      '夺天之谋，布局深远。',
      '山海崩塌，逃出生天。',
      '封天一念，元婴成。',
    ],
  },
  {
    name: '第七卷·诡道双生', inspiredBy: '《道诡异仙》', realmName: '出窍境',
    titles: ['虚实之门', '坐忘问道', '神佛妖邪', '纸人夜行', '诡修之劫', '妄心炼真', '双界交错', '癫狂一剑', '诡道归一', '清醒归来'],
    plots: [
      '虚实之门开，两界交错。',
      '坐忘问道，忘我忘物。',
      '神佛妖邪难辨，诡道起。',
      '纸人夜行，诡域横生。',
      '诡修之劫，几近癫狂。',
      '妄心炼真，守一丝清明。',
      '双界重叠，难分真幻。',
      '癫狂中斩出清醒一剑。',
      '诡道归一，神通自成。',
      '清醒归来，出窍可期。',
    ],
  },
  {
    name: '第八卷·赤心巡天', inspiredBy: '《赤心巡天》', realmName: '破虚境',
    titles: ['六国烽烟', '龙族秘史', '巡天之誓', '赤心不昧', '众生取舍', '朝堂诡局', '妖界战场', '神道余烬', '守心如一', '巡天终章'],
    plots: [
      '六国烽烟起，乱世将至。',
      '龙族秘史现，惊天下。',
      '立巡天之誓，守苍生。',
      '赤心不昧，邪正难分。',
      '众生取舍，道义两难。',
      '朝堂诡局，谋算无声。',
      '妖界战场，血染山河。',
      '神道余烬，承遗志。',
      '守心如一，不为所动。',
      '巡天终章，破虚立。',
    ],
  },
  {
    name: '第九卷·神道崩塌', inspiredBy: '《择日飞升》', realmName: '渡劫→超脱',
    titles: ['神像苏醒', '仙门虚伪', '弑神之刃', '新序初立', '逆天改命', '香火之争', '神道崩塌', '轮回重铸', '超脱在望', '弑神封榜'],
    plots: [
      '天下神像苏醒，香火乱。',
      '仙门虚伪，漠视苍生。',
      '铸弑神之刃，逆天行。',
      '新序初立，破旧制。',
      '逆天改命，抗命数。',
      '香火之争，神位易主。',
      '神道崩塌，天地失序。',
      '轮回重铸，续生机。',
      '超脱在望，劫将至。',
      '弑神封榜，立新规。',
    ],
  },
  {
    name: '第十卷·逆天封神', inspiredBy: '《长生》+原创终局', realmName: '超脱→仙帝',
    titles: ['飞升在即', '天道倾覆', '以身为棋', '逆乱乾坤', '仙帝遗册', '万界同悲', '封天之战', '重立秩序', '我即天道', '逍遥封神'],
    plots: [
      '飞升在即，天门开。',
      '天道倾覆，秩序崩。',
      '以身为棋，入局中。',
      '逆乱乾坤，夺天机。',
      '得仙帝遗册，窥终途。',
      '万界同悲，劫火燎原。',
      '封天之战，决生死。',
      '重立秩序，定乾坤。',
      '我即天道，言出法随。',
      '逍遥封神，卷终。',
    ],
  },
];

// ---------- 组装 100 章 ----------
const chapters = [];
let ch = 0;
VOLUMES.forEach((vol, vi) => {
  for (let i = 0; i < 10; i++) {
    ch++;
    const tier = skillTier(ch);
    const rarity = equipRarity(ch);
    const levels = [];
    for (let lv = 1; lv <= 10; lv++) levels.push(levelExp(ch, lv));
    const chapter = {
      ch,
      volume: vi + 1,
      volumeName: vol.name,
      inspiredBy: vol.inspiredBy,
      realmName: vol.realmName,
      tier,
      tierName: TIER_NAME[tier],
      rarity,
      rarityName: RARITY_NAME[rarity],
      title: vol.titles[i],
      plot: vol.plots[i],
      levels,                       // 长度 10，每关胜利经验（末位为 BOSS 关）
      reward: {
        skills: pickSkills(ch, tier),   // 3 个 SKILLS_DB id（玩家三选一）
        equip: pickEquip(ch, rarity),   // 3 个 {slot, rarity}（玩家三选一 → genEquip 生成）
      },
    };
    chapters.push(chapter);
  }
});

// ---------- 写出 js/story-data.js ----------
const lines = [];
lines.push('// ===== 《逍遥仙》100 章剧情副本数据（由 gen_story.js 生成）=====');
lines.push('// 改编自 2024-2026 热门爆款仙侠小说（见 design/百章剧情与副本奖励设计.md）。');
lines.push('// 加载顺序：须在 battle.js / hub.js 之前 <script src> 引入本文件（提供全局 STORY_CHAPTERS）。');
lines.push('// 字段说明：');
lines.push('//   ch           章节序号 1~100');
lines.push('//   volume       所属卷序号、volumeName 卷名、inspiredBy 改编来源');
lines.push('//   realmName    叙事境界（仅剧情氛围，对应 cultivation.js 早期境界）');
lines.push('//   tier/tierName 本章功法三选一对应的功法阶位（1黄~7帝）');
lines.push('//   rarity/rarityName 本章装备三选一对应的装备品质序号（0凡~4神，对应 player.js RARITY）');
lines.push('//   levels       长度 10，每关胜利奖励经验；末位为 BOSS 关（经验×1.5）');
lines.push('//   reward.skills  3 个 SKILLS_DB id；玩家通关本章后三选一，写入 player.learned');
lines.push('//   reward.equip   3 个 {slot, rarity}；玩家三选一后由 genEquip(slot, rarity) 生成具体装备');
lines.push('const STORY_CHAPTERS = ' + JSON.stringify(chapters, null, 2) + ';');
lines.push('');
lines.push('// 卷总览（便于 UI 直接渲染目录）');
lines.push('const STORY_VOLUMES = ' + JSON.stringify(VOLUMES.map((v, i) => ({
  vol: i + 1, name: v.name, inspiredBy: v.inspiredBy, realmName: v.realmName,
  range: [i * 10 + 1, i * 10 + 10],
})), null, 2) + ';');
lines.push('');
lines.push('// 查表：ch -> chapter 对象');
lines.push('const STORY_BY_CH = (function () { var m = {}; for (var i = 0; i < STORY_CHAPTERS.length; i++) m[STORY_CHAPTERS[i].ch] = STORY_CHAPTERS[i]; return m; })();');
lines.push('if (typeof module !== "undefined") module.exports = { STORY_CHAPTERS, STORY_VOLUMES, STORY_BY_CH };');

const outPath = path.join(__dirname, 'js', 'story-data.js');
fs.writeFileSync(outPath, lines.join('\n') + '\n', 'utf-8');

// ---------- 统计校验 ----------
const fromDb = new Set(SKILLS_DB.map(s => s.id));
let badSkill = 0, totalLevels = 0, totalExp = 0;
chapters.forEach(c => {
  totalLevels += c.levels.length;
  c.levels.forEach(e => totalExp += e);
  c.reward.skills.forEach(id => { if (!fromDb.has(id)) badSkill++; });
});
console.log('章节总数:', chapters.length);
console.log('战斗关卡总数:', totalLevels);
console.log('经验奖励合计:', totalExp);
console.log('三选一功法引用非法 id 数(应为0):', badSkill);
// 各阶位覆盖章节数
const tierCov = {};
chapters.forEach(c => { tierCov[c.tierName] = (tierCov[c.tierName] || 0) + 1; });
console.log('功法阶位覆盖:', tierCov);
const rarCov = {};
chapters.forEach(c => { rarCov[c.rarityName] = (rarCov[c.rarityName] || 0) + 1; });
console.log('装备品质覆盖:', rarCov);
// 展示首章样例
console.log('样例 第1章:', JSON.stringify(chapters[0], null, 2).slice(0, 600));
