// ===== 《逍遥仙》100 章剧情副本数据 =====
// 原创剧情，每章 10 关，通关领「功法三选一」+「装备三选一」。
// 加载顺序：须在 battle.js / hub.js 之前 <script src> 引入本文件（提供全局 STORY_CHAPTERS）。
// 字段说明：
//   ch           章节序号 1~100
//   volume       所属卷序号、volumeName 卷名
//   realmName    叙事境界（仅剧情氛围，对应 cultivation.js 境界）
//   tier/tierName 本章功法三选一对应的功法阶位（1黄~7帝）
//   rarity/rarityName 本章装备三选一对应的装备品质序号（0凡~4神）
//   levels       长度 10，每关胜利奖励经验；末位为 BOSS 关（经验×1.5）
//   reward.skills  3 个 SKILLS_DB id；玩家通关本章后三选一，写入 player.learned
//   reward.equip   3 个 {slot, rarity}；玩家三选一后由 genEquip(slot, rarity) 生成具体装备
const STORY_CHAPTERS = [
{
    "ch": 1,
    "volume": 1,
    "volumeName": "第一卷·初入仙途",
    "realmName": "炼气境",
    "tier": 1,
    "tierName": "黄阶",
    "rarity": 0,
    "rarityName": "凡品",
    "title": "荒村异变",
    "plot": "偏远山村夜现妖踪，少年偶获残缺古籍。",
    "levels": [28, 29, 31, 32, 34, 35, 36, 38, 39, 62],
    "reward": {
      "skills": ["de029", "bu036", "de043"],
      "equip": [
        { "slot": "armor", "rarity": 0 },
        { "slot": "accessory", "rarity": 0 },
        { "slot": "boots", "rarity": 0 },
      ]
    }
  },
{
    "ch": 2,
    "volume": 1,
    "volumeName": "第一卷·初入仙途",
    "realmName": "炼气境",
    "tier": 1,
    "tierName": "黄阶",
    "rarity": 0,
    "rarityName": "凡品",
    "title": "宗门试炼",
    "plot": "千里跋涉入宗门，资质平平只作记名弟子。",
    "levels": [36, 38, 40, 41, 43, 45, 47, 49, 50, 78],
    "reward": {
      "skills": ["bu057", "re064", "at071"],
      "equip": [
        { "slot": "accessory", "rarity": 0 },
        { "slot": "boots", "rarity": 0 },
        { "slot": "weapon", "rarity": 0 },
      ]
    }
  },
{
    "ch": 3,
    "volume": 1,
    "volumeName": "第一卷·初入仙途",
    "realmName": "炼气境",
    "tier": 1,
    "tierName": "黄阶",
    "rarity": 0,
    "rarityName": "凡品",
    "title": "灵圃旧事",
    "plot": "药园做杂役，遇隐世老者传吐纳之法。",
    "levels": [44, 46, 48, 51, 53, 55, 57, 59, 62, 96],
    "reward": {
      "skills": ["re085", "at092", "de099"],
      "equip": [
        { "slot": "boots", "rarity": 0 },
        { "slot": "weapon", "rarity": 0 },
        { "slot": "armor", "rarity": 0 },
      ]
    }
  },
{
    "ch": 4,
    "volume": 1,
    "volumeName": "第一卷·初入仙途",
    "realmName": "炼气境",
    "tier": 1,
    "tierName": "黄阶",
    "rarity": 0,
    "rarityName": "凡品",
    "title": "暗流涌动",
    "plot": "发觉管事以弟子血炼丹，暗中布局脱身。",
    "levels": [52, 55, 57, 60, 62, 65, 68, 70, 73, 113],
    "reward": {
      "skills": ["de113", "sp120", "bu127"],
      "equip": [
        { "slot": "weapon", "rarity": 0 },
        { "slot": "armor", "rarity": 0 },
        { "slot": "accessory", "rarity": 0 },
      ]
    }
  },
{
    "ch": 5,
    "volume": 1,
    "volumeName": "第一卷·初入仙途",
    "realmName": "炼气境",
    "tier": 1,
    "tierName": "黄阶",
    "rarity": 0,
    "rarityName": "凡品",
    "title": "月下奔逃",
    "plot": "携残经趁夜逃入深山，初次感应灵气入体。",
    "levels": [60, 63, 66, 69, 72, 75, 78, 81, 84, 131],
    "reward": {
      "skills": ["sp050", "bu078", "bu106"],
      "equip": [
        { "slot": "armor", "rarity": 0 },
        { "slot": "accessory", "rarity": 0 },
        { "slot": "boots", "rarity": 0 },
      ]
    }
  },
{
    "ch": 6,
    "volume": 1,
    "volumeName": "第一卷·初入仙途",
    "realmName": "炼气境",
    "tier": 1,
    "tierName": "黄阶",
    "rarity": 0,
    "rarityName": "凡品",
    "title": "寒潭洗髓",
    "plot": "误闯寒潭洗髓易筋，修为初有小成。",
    "levels": [68, 71, 75, 78, 82, 85, 88, 92, 95, 149],
    "reward": {
      "skills": ["de029", "bu036", "de043"],
      "equip": [
        { "slot": "accessory", "rarity": 0 },
        { "slot": "boots", "rarity": 0 },
        { "slot": "weapon", "rarity": 0 },
      ]
    }
  },
{
    "ch": 7,
    "volume": 1,
    "volumeName": "第一卷·初入仙途",
    "realmName": "炼气境",
    "tier": 1,
    "tierName": "黄阶",
    "rarity": 0,
    "rarityName": "凡品",
    "title": "追杀突围",
    "plot": "管事党羽追杀而至，以智谋全身而退。",
    "levels": [76, 80, 84, 87, 91, 95, 99, 103, 106, 165],
    "reward": {
      "skills": ["bu057", "re064", "at071"],
      "equip": [
        { "slot": "boots", "rarity": 0 },
        { "slot": "weapon", "rarity": 0 },
        { "slot": "armor", "rarity": 0 },
      ]
    }
  },
{
    "ch": 8,
    "volume": 1,
    "volumeName": "第一卷·初入仙途",
    "realmName": "炼气境",
    "tier": 1,
    "tierName": "黄阶",
    "rarity": 0,
    "rarityName": "凡品",
    "title": "宗门大比",
    "plot": "十年一度升仙令至，各路英豪云集。",
    "levels": [84, 88, 92, 97, 101, 105, 109, 113, 118, 183],
    "reward": {
      "skills": ["re085", "at092", "de099"],
      "equip": [
        { "slot": "weapon", "rarity": 0 },
        { "slot": "armor", "rarity": 0 },
        { "slot": "accessory", "rarity": 0 },
      ]
    }
  },
{
    "ch": 9,
    "volume": 1,
    "volumeName": "第一卷·初入仙途",
    "realmName": "炼气境",
    "tier": 1,
    "tierName": "黄阶",
    "rarity": 0,
    "rarityName": "凡品",
    "title": "一战成名",
    "plot": "擂台以弱胜强，连胜数场名动同门。",
    "levels": [92, 97, 101, 106, 110, 115, 120, 124, 129, 200],
    "reward": {
      "skills": ["de113", "sp120", "bu127"],
      "equip": [
        { "slot": "armor", "rarity": 0 },
        { "slot": "accessory", "rarity": 0 },
        { "slot": "boots", "rarity": 0 },
      ]
    }
  },
{
    "ch": 10,
    "volume": 1,
    "volumeName": "第一卷·初入仙途",
    "realmName": "炼气境",
    "tier": 1,
    "tierName": "黄阶",
    "rarity": 0,
    "rarityName": "凡品",
    "title": "踏上征途",
    "plot": "大赛后主动请缨下山游历，前路未卜。",
    "levels": [100, 105, 110, 115, 120, 125, 130, 135, 140, 218],
    "reward": {
      "skills": ["sp050", "bu078", "bu106"],
      "equip": [
        { "slot": "accessory", "rarity": 0 },
        { "slot": "boots", "rarity": 0 },
        { "slot": "weapon", "rarity": 0 },
      ]
    }
  },
{
    "ch": 11,
    "volume": 2,
    "volumeName": "第二卷·秘境试炼",
    "realmName": "筑基境",
    "tier": 1,
    "tierName": "黄阶",
    "rarity": 0,
    "rarityName": "凡品",
    "title": "古棺现世",
    "plot": "青铜巨棺横空现世，引动天地异象。",
    "levels": [108, 113, 119, 124, 130, 135, 140, 146, 151, 236],
    "reward": {
      "skills": ["de029", "bu036", "de043"],
      "equip": [
        { "slot": "boots", "rarity": 0 },
        { "slot": "weapon", "rarity": 0 },
        { "slot": "armor", "rarity": 0 },
      ]
    }
  },
{
    "ch": 12,
    "volume": 2,
    "volumeName": "第二卷·秘境试炼",
    "realmName": "筑基境",
    "tier": 1,
    "tierName": "黄阶",
    "rarity": 0,
    "rarityName": "凡品",
    "title": "荒原求生",
    "plot": "被卷入荒古禁地绝灵之地，挣扎求存。",
    "levels": [116, 122, 128, 133, 139, 145, 151, 157, 162, 252],
    "reward": {
      "skills": ["bu057", "re064", "at071"],
      "equip": [
        { "slot": "weapon", "rarity": 0 },
        { "slot": "armor", "rarity": 0 },
        { "slot": "accessory", "rarity": 0 },
      ]
    }
  },
{
    "ch": 13,
    "volume": 2,
    "volumeName": "第二卷·秘境试炼",
    "realmName": "筑基境",
    "tier": 1,
    "tierName": "黄阶",
    "rarity": 0,
    "rarityName": "凡品",
    "title": "绝境破局",
    "plot": "禁地中绝处逢生，寻得一线生机。",
    "levels": [124, 130, 136, 143, 149, 155, 161, 167, 174, 270],
    "reward": {
      "skills": ["re085", "at092", "de099"],
      "equip": [
        { "slot": "armor", "rarity": 0 },
        { "slot": "accessory", "rarity": 0 },
        { "slot": "boots", "rarity": 0 },
      ]
    }
  },
{
    "ch": 14,
    "volume": 2,
    "volumeName": "第二卷·秘境试炼",
    "realmName": "筑基境",
    "tier": 1,
    "tierName": "黄阶",
    "rarity": 0,
    "rarityName": "凡品",
    "title": "古纹奥秘",
    "plot": "初窥上古源纹之术，参悟天地法则一角。",
    "levels": [132, 139, 145, 152, 158, 165, 172, 178, 185, 287],
    "reward": {
      "skills": ["de113", "sp120", "bu127"],
      "equip": [
        { "slot": "accessory", "rarity": 0 },
        { "slot": "boots", "rarity": 0 },
        { "slot": "weapon", "rarity": 0 },
      ]
    }
  },
{
    "ch": 15,
    "volume": 2,
    "volumeName": "第二卷·秘境试炼",
    "realmName": "筑基境",
    "tier": 1,
    "tierName": "黄阶",
    "rarity": 0,
    "rarityName": "凡品",
    "title": "上古密文",
    "plot": "残碑记载上古灭世之战的零星片段。",
    "levels": [140, 147, 154, 161, 168, 175, 182, 189, 196, 305],
    "reward": {
      "skills": ["sp050", "bu078", "bu106"],
      "equip": [
        { "slot": "boots", "rarity": 0 },
        { "slot": "weapon", "rarity": 0 },
        { "slot": "armor", "rarity": 0 },
      ]
    }
  },
{
    "ch": 16,
    "volume": 2,
    "volumeName": "第二卷·秘境试炼",
    "realmName": "筑基境",
    "tier": 2,
    "tierName": "玄阶",
    "rarity": 1,
    "rarityName": "灵品",
    "title": "棺内争锋",
    "plot": "与同棺修士争夺机缘，生死一线。",
    "levels": [148, 155, 163, 170, 178, 185, 192, 200, 207, 323],
    "reward": {
      "skills": ["bu037", "re065", "de093"],
      "equip": [
        { "slot": "weapon", "rarity": 1 },
        { "slot": "armor", "rarity": 1 },
        { "slot": "accessory", "rarity": 1 },
      ]
    }
  },
{
    "ch": 17,
    "volume": 2,
    "volumeName": "第二卷·秘境试炼",
    "realmName": "筑基境",
    "tier": 2,
    "tierName": "玄阶",
    "rarity": 1,
    "rarityName": "灵品",
    "title": "筑基奠基",
    "plot": "于苦海之中种下金莲种子，奠定筑基根本。",
    "levels": [156, 164, 172, 179, 187, 195, 203, 211, 218, 339],
    "reward": {
      "skills": ["at121", "de023", "sp030"],
      "equip": [
        { "slot": "armor", "rarity": 1 },
        { "slot": "accessory", "rarity": 1 },
        { "slot": "boots", "rarity": 1 },
      ]
    }
  },
{
    "ch": 18,
    "volume": 2,
    "volumeName": "第二卷·秘境试炼",
    "realmName": "筑基境",
    "tier": 2,
    "tierName": "玄阶",
    "rarity": 1,
    "rarityName": "灵品",
    "title": "虚影显圣",
    "plot": "修炼有成惊现圣体虚影，四方震动。",
    "levels": [164, 172, 180, 189, 197, 205, 213, 221, 230, 357],
    "reward": {
      "skills": ["re044", "at051", "bu058"],
      "equip": [
        { "slot": "accessory", "rarity": 1 },
        { "slot": "boots", "rarity": 1 },
        { "slot": "weapon", "rarity": 1 },
      ]
    }
  },
{
    "ch": 19,
    "volume": 2,
    "volumeName": "第二卷·秘境试炼",
    "realmName": "筑基境",
    "tier": 2,
    "tierName": "玄阶",
    "rarity": 1,
    "rarityName": "灵品",
    "title": "破阵得宝",
    "plot": "闯入荒古遗留大阵，破阵获重宝。",
    "levels": [172, 181, 189, 198, 206, 215, 224, 232, 241, 374],
    "reward": {
      "skills": ["at072", "de079", "bu086"],
      "equip": [
        { "slot": "boots", "rarity": 1 },
        { "slot": "weapon", "rarity": 1 },
        { "slot": "armor", "rarity": 1 },
      ]
    }
  },
{
    "ch": 20,
    "volume": 2,
    "volumeName": "第二卷·秘境试炼",
    "realmName": "筑基境",
    "tier": 2,
    "tierName": "玄阶",
    "rarity": 1,
    "rarityName": "灵品",
    "title": "筑基大成",
    "plot": "渡过天劫归来，成功凝结筑基。",
    "levels": [180, 189, 198, 207, 216, 225, 234, 243, 252, 392],
    "reward": {
      "skills": ["sp100", "bu107", "re114"],
      "equip": [
        { "slot": "weapon", "rarity": 1 },
        { "slot": "armor", "rarity": 1 },
        { "slot": "accessory", "rarity": 1 },
      ]
    }
  },
{
    "ch": 21,
    "volume": 3,
    "volumeName": "第三卷·逆命修行",
    "realmName": "真武境",
    "tier": 2,
    "tierName": "玄阶",
    "rarity": 1,
    "rarityName": "灵品",
    "title": "化凡历练",
    "plot": "踏入凡尘历练心境，于红尘中修心。",
    "levels": [188, 197, 207, 216, 226, 235, 244, 254, 263, 410],
    "reward": {
      "skills": ["bu128", "bu037", "re065"],
      "equip": [
        { "slot": "armor", "rarity": 1 },
        { "slot": "accessory", "rarity": 1 },
        { "slot": "boots", "rarity": 1 },
      ]
    }
  },
{
    "ch": 22,
    "volume": 3,
    "volumeName": "第三卷·逆命修行",
    "realmName": "真武境",
    "tier": 2,
    "tierName": "玄阶",
    "rarity": 1,
    "rarityName": "灵品",
    "title": "遗骸之地",
    "plot": "上古战神遗骸藏无上传承。",
    "levels": [196, 206, 216, 225, 235, 245, 255, 265, 274, 426],
    "reward": {
      "skills": ["de093", "at121", "de023"],
      "equip": [
        { "slot": "accessory", "rarity": 1 },
        { "slot": "boots", "rarity": 1 },
        { "slot": "weapon", "rarity": 1 },
      ]
    }
  },
{
    "ch": 23,
    "volume": 3,
    "volumeName": "第三卷·逆命修行",
    "realmName": "真武境",
    "tier": 2,
    "tierName": "玄阶",
    "rarity": 1,
    "rarityName": "灵品",
    "title": "戮仙残篇",
    "plot": "得戮仙残篇，杀伐决断更甚从前。",
    "levels": [204, 214, 224, 235, 245, 255, 265, 275, 286, 444],
    "reward": {
      "skills": ["sp030", "re044", "at051"],
      "equip": [
        { "slot": "boots", "rarity": 1 },
        { "slot": "weapon", "rarity": 1 },
        { "slot": "armor", "rarity": 1 },
      ]
    }
  },
{
    "ch": 24,
    "volume": 3,
    "volumeName": "第三卷·逆命修行",
    "realmName": "真武境",
    "tier": 2,
    "tierName": "玄阶",
    "rarity": 1,
    "rarityName": "灵品",
    "title": "血祭之危",
    "plot": "误入血色祭坛，险死还生。",
    "levels": [212, 223, 233, 244, 254, 265, 276, 286, 297, 461],
    "reward": {
      "skills": ["bu058", "at072", "de079"],
      "equip": [
        { "slot": "weapon", "rarity": 1 },
        { "slot": "armor", "rarity": 1 },
        { "slot": "accessory", "rarity": 1 },
      ]
    }
  },
{
    "ch": 25,
    "volume": 3,
    "volumeName": "第三卷·逆命修行",
    "realmName": "真武境",
    "tier": 2,
    "tierName": "玄阶",
    "rarity": 1,
    "rarityName": "灵品",
    "title": "劫云逼近",
    "plot": "天劫将至，避入秘境暂缓。",
    "levels": [220, 231, 242, 253, 264, 275, 286, 297, 308, 479],
    "reward": {
      "skills": ["bu086", "sp100", "bu107"],
      "equip": [
        { "slot": "armor", "rarity": 1 },
        { "slot": "accessory", "rarity": 1 },
        { "slot": "boots", "rarity": 1 },
      ]
    }
  },
{
    "ch": 26,
    "volume": 3,
    "volumeName": "第三卷·逆命修行",
    "realmName": "真武境",
    "tier": 2,
    "tierName": "玄阶",
    "rarity": 1,
    "rarityName": "灵品",
    "title": "逆命之道",
    "plot": "踏上逆命修行之路，反夺天地造化。",
    "levels": [228, 239, 251, 262, 274, 285, 296, 308, 319, 497],
    "reward": {
      "skills": ["re114", "bu128", "bu037"],
      "equip": [
        { "slot": "accessory", "rarity": 1 },
        { "slot": "boots", "rarity": 1 },
        { "slot": "weapon", "rarity": 1 },
      ]
    }
  },
{
    "ch": 27,
    "volume": 3,
    "volumeName": "第三卷·逆命修行",
    "realmName": "真武境",
    "tier": 2,
    "tierName": "玄阶",
    "rarity": 1,
    "rarityName": "灵品",
    "title": "心魔入侵",
    "plot": "域外心魔侵扰识海，苦守灵台清明。",
    "levels": [236, 248, 260, 271, 283, 295, 307, 319, 330, 513],
    "reward": {
      "skills": ["re065", "de093", "at121"],
      "equip": [
        { "slot": "boots", "rarity": 1 },
        { "slot": "weapon", "rarity": 1 },
        { "slot": "armor", "rarity": 1 },
      ]
    }
  },
{
    "ch": 28,
    "volume": 3,
    "volumeName": "第三卷·逆命修行",
    "realmName": "真武境",
    "tier": 2,
    "tierName": "玄阶",
    "rarity": 1,
    "rarityName": "灵品",
    "title": "因果了结",
    "plot": "前世因果轮回显现，了却前尘恩怨。",
    "levels": [244, 256, 268, 281, 293, 305, 317, 329, 342, 531],
    "reward": {
      "skills": ["de023", "sp030", "re044"],
      "equip": [
        { "slot": "weapon", "rarity": 1 },
        { "slot": "armor", "rarity": 1 },
        { "slot": "accessory", "rarity": 1 },
      ]
    }
  },
{
    "ch": 29,
    "volume": 3,
    "volumeName": "第三卷·逆命修行",
    "realmName": "真武境",
    "tier": 2,
    "tierName": "玄阶",
    "rarity": 1,
    "rarityName": "灵品",
    "title": "念力成形",
    "plot": "神念凝实可御物千里，战力倍增。",
    "levels": [252, 265, 277, 290, 302, 315, 328, 340, 353, 548],
    "reward": {
      "skills": ["at051", "bu058", "at072"],
      "equip": [
        { "slot": "armor", "rarity": 1 },
        { "slot": "accessory", "rarity": 1 },
        { "slot": "boots", "rarity": 1 },
      ]
    }
  },
{
    "ch": 30,
    "volume": 3,
    "volumeName": "第三卷·逆命修行",
    "realmName": "真武境",
    "tier": 2,
    "tierName": "玄阶",
    "rarity": 1,
    "rarityName": "灵品",
    "title": "遗秘归藏",
    "plot": "上古遗秘尽收，真武境界小成。",
    "levels": [260, 273, 286, 299, 312, 325, 338, 351, 364, 566],
    "reward": {
      "skills": ["de079", "bu086", "sp100"],
      "equip": [
        { "slot": "accessory", "rarity": 1 },
        { "slot": "boots", "rarity": 1 },
        { "slot": "weapon", "rarity": 1 },
      ]
    }
  },
{
    "ch": 31,
    "volume": 4,
    "volumeName": "第四卷·焚炎觉醒",
    "realmName": "化海境",
    "tier": 3,
    "tierName": "地阶",
    "rarity": 1,
    "rarityName": "灵品",
    "title": "退婚羞辱",
    "plot": "遭世家退婚羞辱，立三年翻身之约。",
    "levels": [268, 281, 295, 308, 322, 335, 348, 362, 375, 584],
    "reward": {
      "skills": ["at122", "de129", "de003"],
      "equip": [
        { "slot": "boots", "rarity": 1 },
        { "slot": "weapon", "rarity": 1 },
        { "slot": "armor", "rarity": 1 },
      ]
    }
  },
{
    "ch": 32,
    "volume": 4,
    "volumeName": "第四卷·焚炎觉醒",
    "realmName": "化海境",
    "tier": 3,
    "tierName": "地阶",
    "rarity": 1,
    "rarityName": "灵品",
    "title": "残魂指引",
    "plot": "神秘残魂指路，传授炼药之术。",
    "levels": [276, 290, 304, 317, 331, 345, 359, 373, 386, 600],
    "reward": {
      "skills": ["re024", "at031", "at052"],
      "equip": [
        { "slot": "weapon", "rarity": 1 },
        { "slot": "armor", "rarity": 1 },
        { "slot": "accessory", "rarity": 1 },
      ]
    }
  },
{
    "ch": 33,
    "volume": 4,
    "volumeName": "第四卷·焚炎觉醒",
    "realmName": "化海境",
    "tier": 3,
    "tierName": "地阶",
    "rarity": 1,
    "rarityName": "灵品",
    "title": "戒中之秘",
    "plot": "纳灵戒内藏异火种子，等待觉醒时机。",
    "levels": [284, 298, 312, 327, 341, 355, 369, 383, 398, 618],
    "reward": {
      "skills": ["de059", "sp080", "bu087"],
      "equip": [
        { "slot": "armor", "rarity": 1 },
        { "slot": "accessory", "rarity": 1 },
        { "slot": "boots", "rarity": 1 },
      ]
    }
  },
{
    "ch": 34,
    "volume": 4,
    "volumeName": "第四卷·焚炎觉醒",
    "realmName": "化海境",
    "tier": 3,
    "tierName": "地阶",
    "rarity": 1,
    "rarityName": "灵品",
    "title": "异火苏醒",
    "plot": "体内异火初次苏醒，险被反噬吞噬。",
    "levels": [292, 307, 321, 336, 350, 365, 380, 394, 409, 635],
    "reward": {
      "skills": ["bu108", "re115", "sp010"],
      "equip": [
        { "slot": "accessory", "rarity": 1 },
        { "slot": "boots", "rarity": 1 },
        { "slot": "weapon", "rarity": 1 },
      ]
    }
  },
{
    "ch": 35,
    "volume": 4,
    "volumeName": "第四卷·焚炎觉醒",
    "realmName": "化海境",
    "tier": 3,
    "tierName": "地阶",
    "rarity": 1,
    "rarityName": "灵品",
    "title": "焚身淬体",
    "plot": "以异火淬炼肉身，筋骨坚如精铁。",
    "levels": [300, 315, 330, 345, 360, 375, 390, 405, 420, 653],
    "reward": {
      "skills": ["bu017", "bu038", "re045"],
      "equip": [
        { "slot": "boots", "rarity": 1 },
        { "slot": "weapon", "rarity": 1 },
        { "slot": "armor", "rarity": 1 },
      ]
    }
  },
{
    "ch": 36,
    "volume": 4,
    "volumeName": "第四卷·焚炎觉醒",
    "realmName": "化海境",
    "tier": 3,
    "tierName": "地阶",
    "rarity": 1,
    "rarityName": "灵品",
    "title": "丹道初成",
    "plot": "踏上炼药师之路，一鸣惊人。",
    "levels": [308, 323, 339, 354, 370, 385, 400, 416, 431, 671],
    "reward": {
      "skills": ["bu066", "de073", "re094"],
      "equip": [
        { "slot": "weapon", "rarity": 1 },
        { "slot": "armor", "rarity": 1 },
        { "slot": "accessory", "rarity": 1 },
      ]
    }
  },
{
    "ch": 37,
    "volume": 4,
    "volumeName": "第四卷·焚炎觉醒",
    "realmName": "化海境",
    "tier": 3,
    "tierName": "地阶",
    "rarity": 1,
    "rarityName": "灵品",
    "title": "族比扬威",
    "plot": "家族大比中以绝对实力碾压对手。",
    "levels": [316, 332, 348, 363, 379, 395, 411, 427, 442, 687],
    "reward": {
      "skills": ["at101", "at122", "de129"],
      "equip": [
        { "slot": "armor", "rarity": 1 },
        { "slot": "accessory", "rarity": 1 },
        { "slot": "boots", "rarity": 1 },
      ]
    }
  },
{
    "ch": 38,
    "volume": 4,
    "volumeName": "第四卷·焚炎觉醒",
    "realmName": "化海境",
    "tier": 3,
    "tierName": "地阶",
    "rarity": 2,
    "rarityName": "宝品",
    "title": "烈焰复仇",
    "plot": "以异火之力雪前耻，让轻视者付出代价。",
    "levels": [324, 340, 356, 373, 389, 405, 421, 437, 454, 705],
    "reward": {
      "skills": ["de003", "re024", "at031"],
      "equip": [
        { "slot": "accessory", "rarity": 2 },
        { "slot": "boots", "rarity": 2 },
        { "slot": "weapon", "rarity": 2 },
      ]
    }
  },
{
    "ch": 39,
    "volume": 4,
    "volumeName": "第四卷·焚炎觉醒",
    "realmName": "化海境",
    "tier": 3,
    "tierName": "地阶",
    "rarity": 2,
    "rarityName": "宝品",
    "title": "丹惊四座",
    "plot": "炼出极品丹药震惊四方，名动一时。",
    "levels": [332, 349, 365, 382, 398, 415, 432, 448, 465, 722],
    "reward": {
      "skills": ["at052", "de059", "sp080"],
      "equip": [
        { "slot": "boots", "rarity": 2 },
        { "slot": "weapon", "rarity": 2 },
        { "slot": "armor", "rarity": 2 },
      ]
    }
  },
{
    "ch": 40,
    "volume": 4,
    "volumeName": "第四卷·焚炎觉醒",
    "realmName": "化海境",
    "tier": 3,
    "tierName": "地阶",
    "rarity": 2,
    "rarityName": "宝品",
    "title": "化海初凝",
    "plot": "一剑震全场，化海境界初步凝成。",
    "levels": [340, 357, 374, 391, 408, 425, 442, 459, 476, 740],
    "reward": {
      "skills": ["bu087", "bu108", "re115"],
      "equip": [
        { "slot": "weapon", "rarity": 2 },
        { "slot": "armor", "rarity": 2 },
        { "slot": "accessory", "rarity": 2 },
      ]
    }
  },
{
    "ch": 41,
    "volume": 5,
    "volumeName": "第五卷·涅槃重生",
    "realmName": "金丹境",
    "tier": 3,
    "tierName": "地阶",
    "rarity": 2,
    "rarityName": "宝品",
    "title": "本源被夺",
    "plot": "先天本源被人强行剥夺，坠入绝境。",
    "levels": [348, 365, 383, 400, 418, 435, 452, 470, 487, 758],
    "reward": {
      "skills": ["sp010", "bu017", "bu038"],
      "equip": [
        { "slot": "armor", "rarity": 2 },
        { "slot": "accessory", "rarity": 2 },
        { "slot": "boots", "rarity": 2 },
      ]
    }
  },
{
    "ch": 42,
    "volume": 5,
    "volumeName": "第五卷·涅槃重生",
    "realmName": "金丹境",
    "tier": 3,
    "tierName": "地阶",
    "rarity": 2,
    "rarityName": "宝品",
    "title": "重塑根基",
    "plot": "以另类法门重铸己身，开辟新路。",
    "levels": [356, 374, 392, 409, 427, 445, 463, 481, 498, 774],
    "reward": {
      "skills": ["re045", "bu066", "de073"],
      "equip": [
        { "slot": "accessory", "rarity": 2 },
        { "slot": "boots", "rarity": 2 },
        { "slot": "weapon", "rarity": 2 },
      ]
    }
  },
{
    "ch": 43,
    "volume": 5,
    "volumeName": "第五卷·涅槃重生",
    "realmName": "金丹境",
    "tier": 3,
    "tierName": "地阶",
    "rarity": 2,
    "rarityName": "宝品",
    "title": "搬血极致",
    "plot": "进入搬血秘境将肉身淬炼到极限。",
    "levels": [364, 382, 400, 419, 437, 455, 473, 491, 510, 792],
    "reward": {
      "skills": ["re094", "at101", "at122"],
      "equip": [
        { "slot": "boots", "rarity": 2 },
        { "slot": "weapon", "rarity": 2 },
        { "slot": "armor", "rarity": 2 },
      ]
    }
  },
{
    "ch": 44,
    "volume": 5,
    "volumeName": "第五卷·涅槃重生",
    "realmName": "金丹境",
    "tier": 3,
    "tierName": "地阶",
    "rarity": 2,
    "rarityName": "宝品",
    "title": "虚界开启",
    "plot": "太虚战场开启，群雄逐鹿。",
    "levels": [372, 391, 409, 428, 446, 465, 484, 502, 521, 809],
    "reward": {
      "skills": ["de129", "de003", "re024"],
      "equip": [
        { "slot": "weapon", "rarity": 2 },
        { "slot": "armor", "rarity": 2 },
        { "slot": "accessory", "rarity": 2 },
      ]
    }
  },
{
    "ch": 45,
    "volume": 5,
    "volumeName": "第五卷·涅槃重生",
    "realmName": "金丹境",
    "tier": 3,
    "tierName": "地阶",
    "rarity": 2,
    "rarityName": "宝品",
    "title": "补天之术",
    "plot": "获得上古补天之术修复受损道基。",
    "levels": [380, 399, 418, 437, 456, 475, 494, 513, 532, 827],
    "reward": {
      "skills": ["at031", "at052", "de059"],
      "equip": [
        { "slot": "armor", "rarity": 2 },
        { "slot": "accessory", "rarity": 2 },
        { "slot": "boots", "rarity": 2 },
      ]
    }
  },
{
    "ch": 46,
    "volume": 5,
    "volumeName": "第五卷·涅槃重生",
    "realmName": "金丹境",
    "tier": 4,
    "tierName": "天阶",
    "rarity": 2,
    "rarityName": "宝品",
    "title": "群雄逐鹿",
    "plot": "天下群雄并起，乱世序幕拉开。",
    "levels": [388, 407, 427, 446, 466, 485, 504, 524, 543, 845],
    "reward": {
      "skills": ["at081", "bu088", "re095"],
      "equip": [
        { "slot": "accessory", "rarity": 2 },
        { "slot": "boots", "rarity": 2 },
        { "slot": "weapon", "rarity": 2 },
      ]
    }
  },
{
    "ch": 47,
    "volume": 5,
    "volumeName": "第五卷·涅槃重生",
    "realmName": "金丹境",
    "tier": 4,
    "tierName": "天阶",
    "rarity": 2,
    "rarityName": "宝品",
    "title": "凶巢试炼",
    "plot": "闯入凶巢九死一生，获得惊人机缘。",
    "levels": [396, 416, 436, 455, 475, 495, 515, 535, 554, 861],
    "reward": {
      "skills": ["de109", "bu116", "de123"],
      "equip": [
        { "slot": "boots", "rarity": 2 },
        { "slot": "weapon", "rarity": 2 },
        { "slot": "armor", "rarity": 2 },
      ]
    }
  },
{
    "ch": 48,
    "volume": 5,
    "volumeName": "第五卷·涅槃重生",
    "realmName": "金丹境",
    "tier": 4,
    "tierName": "天阶",
    "rarity": 2,
    "rarityName": "宝品",
    "title": "血脉觉醒",
    "plot": "远古真血觉醒，实力暴涨碾压同辈。",
    "levels": [404, 424, 444, 465, 485, 505, 525, 545, 566, 879],
    "reward": {
      "skills": ["bu018", "bu046", "re074"],
      "equip": [
        { "slot": "weapon", "rarity": 2 },
        { "slot": "armor", "rarity": 2 },
        { "slot": "accessory", "rarity": 2 },
      ]
    }
  },
{
    "ch": 49,
    "volume": 5,
    "volumeName": "第五卷·涅槃重生",
    "realmName": "金丹境",
    "tier": 4,
    "tierName": "天阶",
    "rarity": 2,
    "rarityName": "宝品",
    "title": "上界来使",
    "plot": "上界使者降临引发连锁风波。",
    "levels": [412, 433, 453, 474, 494, 515, 536, 556, 577, 896],
    "reward": {
      "skills": ["at102", "sp130", "at011"],
      "equip": [
        { "slot": "armor", "rarity": 2 },
        { "slot": "accessory", "rarity": 2 },
        { "slot": "boots", "rarity": 2 },
      ]
    }
  },
{
    "ch": 50,
    "volume": 5,
    "volumeName": "第五卷·涅槃重生",
    "realmName": "金丹境",
    "tier": 4,
    "tierName": "天阶",
    "rarity": 2,
    "rarityName": "宝品",
    "title": "金丹凝成",
    "plot": "浴火重生后金丹凝结大成。",
    "levels": [420, 441, 462, 483, 504, 525, 546, 567, 588, 914],
    "reward": {
      "skills": ["re025", "at032", "de039"],
      "equip": [
        { "slot": "accessory", "rarity": 2 },
        { "slot": "boots", "rarity": 2 },
        { "slot": "weapon", "rarity": 2 },
      ]
    }
  },
{
    "ch": 51,
    "volume": 6,
    "volumeName": "第六卷·纵横四海",
    "realmName": "元婴境",
    "tier": 4,
    "tierName": "天阶",
    "rarity": 2,
    "rarityName": "宝品",
    "title": "初临沧海",
    "plot": "初到浩瀚海域，弱肉强食是唯一法则。",
    "levels": [428, 449, 471, 492, 514, 535, 556, 578, 599, 932],
    "reward": {
      "skills": ["de053", "sp060", "bu067"],
      "equip": [
        { "slot": "boots", "rarity": 2 },
        { "slot": "weapon", "rarity": 2 },
        { "slot": "armor", "rarity": 2 },
      ]
    }
  },
{
    "ch": 52,
    "volume": 6,
    "volumeName": "第六卷·纵横四海",
    "realmName": "元婴境",
    "tier": 4,
    "tierName": "天阶",
    "rarity": 2,
    "rarityName": "宝品",
    "title": "血修之路",
    "plot": "踏上以战养战的血修之路。",
    "levels": [436, 458, 480, 501, 523, 545, 567, 589, 610, 948],
    "reward": {
      "skills": ["at081", "bu088", "re095"],
      "equip": [
        { "slot": "weapon", "rarity": 2 },
        { "slot": "armor", "rarity": 2 },
        { "slot": "accessory", "rarity": 2 },
      ]
    }
  },
{
    "ch": 53,
    "volume": 6,
    "volumeName": "第六卷·纵横四海",
    "realmName": "元婴境",
    "tier": 4,
    "tierName": "天阶",
    "rarity": 2,
    "rarityName": "宝品",
    "title": "镇域古印",
    "plot": "获得上古镇域古印，可镇压一方。",
    "levels": [444, 466, 488, 511, 533, 555, 577, 599, 622, 966],
    "reward": {
      "skills": ["de109", "bu116", "de123"],
      "equip": [
        { "slot": "armor", "rarity": 2 },
        { "slot": "accessory", "rarity": 2 },
        { "slot": "boots", "rarity": 2 },
      ]
    }
  },
{
    "ch": 54,
    "volume": 6,
    "volumeName": "第六卷·纵横四海",
    "realmName": "元婴境",
    "tier": 4,
    "tierName": "天阶",
    "rarity": 2,
    "rarityName": "宝品",
    "title": "颠倒阴阳",
    "plot": "领悟颠倒阴阳之术，可夺天地造化。",
    "levels": [452, 475, 497, 520, 542, 565, 588, 610, 633, 983],
    "reward": {
      "skills": ["bu018", "bu046", "re074"],
      "equip": [
        { "slot": "accessory", "rarity": 2 },
        { "slot": "boots", "rarity": 2 },
        { "slot": "weapon", "rarity": 2 },
      ]
    }
  },
{
    "ch": 55,
    "volume": 6,
    "volumeName": "第六卷·纵横四海",
    "realmName": "元婴境",
    "tier": 4,
    "tierName": "天阶",
    "rarity": 2,
    "rarityName": "宝品",
    "title": "妖族盟约",
    "plot": "与妖族订立盟约共御外敌。",
    "levels": [460, 483, 506, 529, 552, 575, 598, 621, 644, 1001],
    "reward": {
      "skills": ["at102", "sp130", "at011"],
      "equip": [
        { "slot": "boots", "rarity": 2 },
        { "slot": "weapon", "rarity": 2 },
        { "slot": "armor", "rarity": 2 },
      ]
    }
  },
{
    "ch": 56,
    "volume": 6,
    "volumeName": "第六卷·纵横四海",
    "realmName": "元婴境",
    "tier": 4,
    "tierName": "天阶",
    "rarity": 2,
    "rarityName": "宝品",
    "title": "海域争霸",
    "plot": "海域之内逐鹿争雄，谁主沉浮。",
    "levels": [468, 491, 515, 538, 562, 585, 608, 632, 655, 1019],
    "reward": {
      "skills": ["re025", "at032", "de039"],
      "equip": [
        { "slot": "weapon", "rarity": 2 },
        { "slot": "armor", "rarity": 2 },
        { "slot": "accessory", "rarity": 2 },
      ]
    }
  },
{
    "ch": 57,
    "volume": 6,
    "volumeName": "第六卷·纵横四海",
    "realmName": "元婴境",
    "tier": 4,
    "tierName": "天阶",
    "rarity": 2,
    "rarityName": "宝品",
    "title": "镜花幻阵",
    "plot": "陷入镜花水月幻阵辨真假虚实。",
    "levels": [476, 500, 524, 547, 571, 595, 619, 643, 666, 1035],
    "reward": {
      "skills": ["de053", "sp060", "bu067"],
      "equip": [
        { "slot": "armor", "rarity": 2 },
        { "slot": "accessory", "rarity": 2 },
        { "slot": "boots", "rarity": 2 },
      ]
    }
  },
{
    "ch": 58,
    "volume": 6,
    "volumeName": "第六卷·纵横四海",
    "realmName": "元婴境",
    "tier": 4,
    "tierName": "天阶",
    "rarity": 2,
    "rarityName": "宝品",
    "title": "惊天布局",
    "plot": "幕后黑手浮出水面，惊天布局显现。",
    "levels": [484, 508, 532, 557, 581, 605, 629, 653, 678, 1053],
    "reward": {
      "skills": ["at081", "bu088", "re095"],
      "equip": [
        { "slot": "accessory", "rarity": 2 },
        { "slot": "boots", "rarity": 2 },
        { "slot": "weapon", "rarity": 2 },
      ]
    }
  },
{
    "ch": 59,
    "volume": 6,
    "volumeName": "第六卷·纵横四海",
    "realmName": "元婴境",
    "tier": 4,
    "tierName": "天阶",
    "rarity": 2,
    "rarityName": "宝品",
    "title": "海域崩塌",
    "plot": "海域禁制崩塌，在混乱中寻得出路。",
    "levels": [492, 517, 541, 566, 590, 615, 640, 664, 689, 1070],
    "reward": {
      "skills": ["de109", "bu116", "de123"],
      "equip": [
        { "slot": "boots", "rarity": 2 },
        { "slot": "weapon", "rarity": 2 },
        { "slot": "armor", "rarity": 2 },
      ]
    }
  },
{
    "ch": 60,
    "volume": 6,
    "volumeName": "第六卷·纵横四海",
    "realmName": "元婴境",
    "tier": 4,
    "tierName": "天阶",
    "rarity": 3,
    "rarityName": "仙品",
    "title": "元婴大成",
    "plot": "封印一念之间元婴凝聚大成。",
    "levels": [500, 525, 550, 575, 600, 625, 650, 675, 700, 1088],
    "reward": {
      "skills": ["bu018", "bu046", "re074"],
      "equip": [
        { "slot": "weapon", "rarity": 3 },
        { "slot": "armor", "rarity": 3 },
        { "slot": "accessory", "rarity": 3 },
      ]
    }
  },
{
    "ch": 61,
    "volume": 7,
    "volumeName": "第七卷·虚实幻境",
    "realmName": "出窍境",
    "tier": 5,
    "tierName": "王阶",
    "rarity": 3,
    "rarityName": "仙品",
    "title": "两界之门",
    "plot": "虚实两界之门洞开，界限开始模糊。",
    "levels": [508, 533, 559, 584, 610, 635, 660, 686, 711, 1106],
    "reward": {
      "skills": ["bu026", "de033", "sp040"],
      "equip": [
        { "slot": "armor", "rarity": 3 },
        { "slot": "accessory", "rarity": 3 },
        { "slot": "boots", "rarity": 3 },
      ]
    }
  },
{
    "ch": 62,
    "volume": 7,
    "volumeName": "第七卷·虚实幻境",
    "realmName": "出窍境",
    "tier": 5,
    "tierName": "王阶",
    "rarity": 3,
    "rarityName": "仙品",
    "title": "忘我问道",
    "plot": "坐忘状态中参悟大道，物我两忘。",
    "levels": [516, 542, 568, 593, 619, 645, 671, 697, 722, 1122],
    "reward": {
      "skills": ["bu047", "re054", "at061"],
      "equip": [
        { "slot": "accessory", "rarity": 3 },
        { "slot": "boots", "rarity": 3 },
        { "slot": "weapon", "rarity": 3 },
      ]
    }
  },
{
    "ch": 63,
    "volume": 7,
    "volumeName": "第七卷·虚实幻境",
    "realmName": "出窍境",
    "tier": 5,
    "tierName": "王阶",
    "rarity": 3,
    "rarityName": "仙品",
    "title": "正邪难辨",
    "plot": "神佛妖邪四道势力交错难分正邪。",
    "levels": [524, 550, 576, 603, 629, 655, 681, 707, 734, 1140],
    "reward": {
      "skills": ["bu068", "re075", "at082"],
      "equip": [
        { "slot": "boots", "rarity": 3 },
        { "slot": "weapon", "rarity": 3 },
        { "slot": "armor", "rarity": 3 },
      ]
    }
  },
{
    "ch": 64,
    "volume": 7,
    "volumeName": "第七卷·虚实幻境",
    "realmName": "出窍境",
    "tier": 5,
    "tierName": "王阶",
    "rarity": 3,
    "rarityName": "仙品",
    "title": "纸人诡夜",
    "plot": "纸人夜行诡异事件频发，暗藏玄机。",
    "levels": [532, 559, 585, 612, 638, 665, 692, 718, 745, 1157],
    "reward": {
      "skills": ["de089", "bu096", "de103"],
      "equip": [
        { "slot": "weapon", "rarity": 3 },
        { "slot": "armor", "rarity": 3 },
        { "slot": "accessory", "rarity": 3 },
      ]
    }
  },
{
    "ch": 65,
    "volume": 7,
    "volumeName": "第七卷·虚实幻境",
    "realmName": "出窍境",
    "tier": 5,
    "tierName": "王阶",
    "rarity": 3,
    "rarityName": "仙品",
    "title": "道心之劫",
    "plot": "修道之心遭遇空前考验几近癫狂。",
    "levels": [540, 567, 594, 621, 648, 675, 702, 729, 756, 1175],
    "reward": {
      "skills": ["sp110", "bu117", "re124"],
      "equip": [
        { "slot": "armor", "rarity": 3 },
        { "slot": "accessory", "rarity": 3 },
        { "slot": "boots", "rarity": 3 },
      ]
    }
  },
{
    "ch": 66,
    "volume": 7,
    "volumeName": "第七卷·虚实幻境",
    "realmName": "出窍境",
    "tier": 5,
    "tierName": "王阶",
    "rarity": 3,
    "rarityName": "仙品",
    "title": "妄中求真",
    "plot": "于癫狂妄念中守住最后一丝清明。",
    "levels": [548, 575, 603, 630, 658, 685, 712, 740, 767, 1193],
    "reward": {
      "skills": ["re005", "at012", "de019"],
      "equip": [
        { "slot": "accessory", "rarity": 3 },
        { "slot": "boots", "rarity": 3 },
        { "slot": "weapon", "rarity": 3 },
      ]
    }
  },
{
    "ch": 67,
    "volume": 7,
    "volumeName": "第七卷·虚实幻境",
    "realmName": "出窍境",
    "tier": 5,
    "tierName": "王阶",
    "rarity": 3,
    "rarityName": "仙品",
    "title": "界面重叠",
    "plot": "两个世界重叠交错真假难分。",
    "levels": [556, 584, 612, 639, 667, 695, 723, 751, 778, 1209],
    "reward": {
      "skills": ["bu026", "de033", "sp040"],
      "equip": [
        { "slot": "boots", "rarity": 3 },
        { "slot": "weapon", "rarity": 3 },
        { "slot": "armor", "rarity": 3 },
      ]
    }
  },
{
    "ch": 68,
    "volume": 7,
    "volumeName": "第七卷·虚实幻境",
    "realmName": "出窍境",
    "tier": 5,
    "tierName": "王阶",
    "rarity": 3,
    "rarityName": "仙品",
    "title": "清醒一剑",
    "plot": "混沌中斩出唯一清醒的一剑。",
    "levels": [564, 592, 620, 649, 677, 705, 733, 761, 790, 1227],
    "reward": {
      "skills": ["bu047", "re054", "at061"],
      "equip": [
        { "slot": "weapon", "rarity": 3 },
        { "slot": "armor", "rarity": 3 },
        { "slot": "accessory", "rarity": 3 },
      ]
    }
  },
{
    "ch": 69,
    "volume": 7,
    "volumeName": "第七卷·虚实幻境",
    "realmName": "出窍境",
    "tier": 5,
    "tierName": "王阶",
    "rarity": 3,
    "rarityName": "仙品",
    "title": "诡道合一",
    "plot": "诸般诡道融会贯通自成一家。",
    "levels": [572, 601, 629, 658, 686, 715, 744, 772, 801, 1244],
    "reward": {
      "skills": ["bu068", "re075", "at082"],
      "equip": [
        { "slot": "armor", "rarity": 3 },
        { "slot": "accessory", "rarity": 3 },
        { "slot": "boots", "rarity": 3 },
      ]
    }
  },
{
    "ch": 70,
    "volume": 7,
    "volumeName": "第七卷·虚实幻境",
    "realmName": "出窍境",
    "tier": 5,
    "tierName": "王阶",
    "rarity": 3,
    "rarityName": "仙品",
    "title": "出窍可期",
    "plot": "历经磨难终见出窍曙光。",
    "levels": [580, 609, 638, 667, 696, 725, 754, 783, 812, 1262],
    "reward": {
      "skills": ["de089", "bu096", "de103"],
      "equip": [
        { "slot": "accessory", "rarity": 3 },
        { "slot": "boots", "rarity": 3 },
        { "slot": "weapon", "rarity": 3 },
      ]
    }
  },
{
    "ch": 71,
    "volume": 8,
    "volumeName": "第八卷·道心不灭",
    "realmName": "破虚境",
    "tier": 5,
    "tierName": "王阶",
    "rarity": 3,
    "rarityName": "仙品",
    "title": "六国烽烟",
    "plot": "六国烽烟四起乱世已至不可收拾。",
    "levels": [588, 617, 647, 676, 706, 735, 764, 794, 823, 1280],
    "reward": {
      "skills": ["sp110", "bu117", "re124"],
      "equip": [
        { "slot": "boots", "rarity": 3 },
        { "slot": "weapon", "rarity": 3 },
        { "slot": "armor", "rarity": 3 },
      ]
    }
  },
{
    "ch": 72,
    "volume": 8,
    "volumeName": "第八卷·道心不灭",
    "realmName": "破虚境",
    "tier": 5,
    "tierName": "王阶",
    "rarity": 3,
    "rarityName": "仙品",
    "title": "龙族秘辛",
    "plot": "龙族千年秘史曝光震动天下。",
    "levels": [596, 626, 656, 685, 715, 745, 775, 805, 834, 1296],
    "reward": {
      "skills": ["re005", "at012", "de019"],
      "equip": [
        { "slot": "weapon", "rarity": 3 },
        { "slot": "armor", "rarity": 3 },
        { "slot": "accessory", "rarity": 3 },
      ]
    }
  },
{
    "ch": 73,
    "volume": 8,
    "volumeName": "第八卷·道心不灭",
    "realmName": "破虚境",
    "tier": 5,
    "tierName": "王阶",
    "rarity": 3,
    "rarityName": "仙品",
    "title": "守世之誓",
    "plot": "立誓守护苍生不惜一切代价。",
    "levels": [604, 634, 664, 695, 725, 755, 785, 815, 846, 1314],
    "reward": {
      "skills": ["bu026", "de033", "sp040"],
      "equip": [
        { "slot": "armor", "rarity": 3 },
        { "slot": "accessory", "rarity": 3 },
        { "slot": "boots", "rarity": 3 },
      ]
    }
  },
{
    "ch": 74,
    "volume": 8,
    "volumeName": "第八卷·道心不灭",
    "realmName": "破虚境",
    "tier": 5,
    "tierName": "王阶",
    "rarity": 3,
    "rarityName": "仙品",
    "title": "赤心不染",
    "plot": "赤子之心不染尘埃，邪正自辨。",
    "levels": [612, 643, 673, 704, 734, 765, 796, 826, 857, 1331],
    "reward": {
      "skills": ["bu047", "re054", "at061"],
      "equip": [
        { "slot": "accessory", "rarity": 3 },
        { "slot": "boots", "rarity": 3 },
        { "slot": "weapon", "rarity": 3 },
      ]
    }
  },
{
    "ch": 75,
    "volume": 8,
    "volumeName": "第八卷·道心不灭",
    "realmName": "破虚境",
    "tier": 5,
    "tierName": "王阶",
    "rarity": 3,
    "rarityName": "仙品",
    "title": "众生取舍",
    "plot": "面对众生苦难做出生死抉择。",
    "levels": [620, 651, 682, 713, 744, 775, 806, 837, 868, 1349],
    "reward": {
      "skills": ["bu068", "re075", "at082"],
      "equip": [
        { "slot": "boots", "rarity": 3 },
        { "slot": "weapon", "rarity": 3 },
        { "slot": "armor", "rarity": 3 },
      ]
    }
  },
{
    "ch": 76,
    "volume": 8,
    "volumeName": "第八卷·道心不灭",
    "realmName": "破虚境",
    "tier": 6,
    "tierName": "皇阶",
    "rarity": 3,
    "rarityName": "仙品",
    "title": "朝堂暗斗",
    "plot": "朝堂之上权谋暗斗无声杀人。",
    "levels": [628, 659, 691, 722, 754, 785, 816, 848, 879, 1367],
    "reward": {
      "skills": ["bu076", "sp090", "bu097"],
      "equip": [
        { "slot": "weapon", "rarity": 3 },
        { "slot": "armor", "rarity": 3 },
        { "slot": "accessory", "rarity": 3 },
      ]
    }
  },
{
    "ch": 77,
    "volume": 8,
    "volumeName": "第八卷·道心不灭",
    "realmName": "破虚境",
    "tier": 6,
    "tierName": "皇阶",
    "rarity": 3,
    "rarityName": "仙品",
    "title": "妖界血战",
    "plot": "妖界战场血染山河惨烈至极。",
    "levels": [636, 668, 700, 731, 763, 795, 827, 859, 890, 1383],
    "reward": {
      "skills": ["re104", "bu118", "re125"],
      "equip": [
        { "slot": "armor", "rarity": 3 },
        { "slot": "accessory", "rarity": 3 },
        { "slot": "boots", "rarity": 3 },
      ]
    }
  },
{
    "ch": 78,
    "volume": 8,
    "volumeName": "第八卷·道心不灭",
    "realmName": "破虚境",
    "tier": 6,
    "tierName": "皇阶",
    "rarity": 3,
    "rarityName": "仙品",
    "title": "承继遗志",
    "plot": "承接先贤遗志继续未竟之路。",
    "levels": [644, 676, 708, 741, 773, 805, 837, 869, 902, 1401],
    "reward": {
      "skills": ["bu027", "re055", "de083"],
      "equip": [
        { "slot": "accessory", "rarity": 3 },
        { "slot": "boots", "rarity": 3 },
        { "slot": "weapon", "rarity": 3 },
      ]
    }
  },
{
    "ch": 79,
    "volume": 8,
    "volumeName": "第八卷·道心不灭",
    "realmName": "破虚境",
    "tier": 6,
    "tierName": "皇阶",
    "rarity": 3,
    "rarityName": "仙品",
    "title": "初心如一",
    "plot": "万般诱惑之下初心始终如一。",
    "levels": [652, 685, 717, 750, 782, 815, 848, 880, 913, 1418],
    "reward": {
      "skills": ["at111", "bu006", "de013"],
      "equip": [
        { "slot": "boots", "rarity": 3 },
        { "slot": "weapon", "rarity": 3 },
        { "slot": "armor", "rarity": 3 },
      ]
    }
  },
{
    "ch": 80,
    "volume": 8,
    "volumeName": "第八卷·道心不灭",
    "realmName": "破虚境",
    "tier": 6,
    "tierName": "皇阶",
    "rarity": 3,
    "rarityName": "仙品",
    "title": "破虚立威",
    "plot": "破虚境界确立威名震慑四方。",
    "levels": [660, 693, 726, 759, 792, 825, 858, 891, 924, 1436],
    "reward": {
      "skills": ["sp020", "re034", "at041"],
      "equip": [
        { "slot": "weapon", "rarity": 3 },
        { "slot": "armor", "rarity": 3 },
        { "slot": "accessory", "rarity": 3 },
      ]
    }
  },
{
    "ch": 81,
    "volume": 9,
    "volumeName": "第九卷·诸神黄昏",
    "realmName": "渡劫→超脱",
    "tier": 6,
    "tierName": "皇阶",
    "rarity": 3,
    "rarityName": "仙品",
    "title": "神像异变",
    "plot": "天下供奉的神像陆续苏醒生变。",
    "levels": [668, 701, 735, 768, 802, 835, 868, 902, 935, 1454],
    "reward": {
      "skills": ["bu048", "at062", "de069"],
      "equip": [
        { "slot": "armor", "rarity": 3 },
        { "slot": "accessory", "rarity": 3 },
        { "slot": "boots", "rarity": 3 },
      ]
    }
  },
{
    "ch": 82,
    "volume": 9,
    "volumeName": "第九卷·诸神黄昏",
    "realmName": "渡劫→超脱",
    "tier": 6,
    "tierName": "皇阶",
    "rarity": 4,
    "rarityName": "神品",
    "title": "仙门真相",
    "plot": "所谓仙门竟是漠视苍生的虚伪存在。",
    "levels": [676, 710, 744, 777, 811, 845, 879, 913, 946, 1470],
    "reward": {
      "skills": ["bu076", "sp090", "bu097"],
      "equip": [
        { "slot": "accessory", "rarity": 4 },
        { "slot": "boots", "rarity": 4 },
        { "slot": "weapon", "rarity": 4 },
      ]
    }
  },
{
    "ch": 83,
    "volume": 9,
    "volumeName": "第九卷·诸神黄昏",
    "realmName": "渡劫→超脱",
    "tier": 6,
    "tierName": "皇阶",
    "rarity": 4,
    "rarityName": "神品",
    "title": "弑神之兵",
    "plot": "铸造专属于弑神者的终极兵器。",
    "levels": [684, 718, 752, 787, 821, 855, 889, 923, 958, 1488],
    "reward": {
      "skills": ["re104", "bu118", "re125"],
      "equip": [
        { "slot": "boots", "rarity": 4 },
        { "slot": "weapon", "rarity": 4 },
        { "slot": "armor", "rarity": 4 },
      ]
    }
  },
{
    "ch": 84,
    "volume": 9,
    "volumeName": "第九卷·诸神黄昏",
    "realmName": "渡劫→超脱",
    "tier": 6,
    "tierName": "皇阶",
    "rarity": 4,
    "rarityName": "神品",
    "title": "新序开辟",
    "plot": "打破旧秩序建立全新规则。",
    "levels": [692, 727, 761, 796, 830, 865, 900, 934, 969, 1505],
    "reward": {
      "skills": ["bu027", "re055", "de083"],
      "equip": [
        { "slot": "weapon", "rarity": 4 },
        { "slot": "armor", "rarity": 4 },
        { "slot": "accessory", "rarity": 4 },
      ]
    }
  },
{
    "ch": 85,
    "volume": 9,
    "volumeName": "第九卷·诸神黄昏",
    "realmName": "渡劫→超脱",
    "tier": 6,
    "tierName": "皇阶",
    "rarity": 4,
    "rarityName": "神品",
    "title": "逆天改命",
    "plot": "以自身之力对抗既定命数。",
    "levels": [700, 735, 770, 805, 840, 875, 910, 945, 980, 1523],
    "reward": {
      "skills": ["at111", "bu006", "de013"],
      "equip": [
        { "slot": "armor", "rarity": 4 },
        { "slot": "accessory", "rarity": 4 },
        { "slot": "boots", "rarity": 4 },
      ]
    }
  },
{
    "ch": 86,
    "volume": 9,
    "volumeName": "第九卷·诸神黄昏",
    "realmName": "渡劫→超脱",
    "tier": 6,
    "tierName": "皇阶",
    "rarity": 4,
    "rarityName": "神品",
    "title": "神位之争",
    "plot": "各方势力争夺虚无缥缈的神位。",
    "levels": [708, 743, 779, 814, 850, 885, 920, 956, 991, 1541],
    "reward": {
      "skills": ["sp020", "re034", "at041"],
      "equip": [
        { "slot": "accessory", "rarity": 4 },
        { "slot": "boots", "rarity": 4 },
        { "slot": "weapon", "rarity": 4 },
      ]
    }
  },
{
    "ch": 87,
    "volume": 9,
    "volumeName": "第九卷·诸神黄昏",
    "realmName": "渡劫→超脱",
    "tier": 6,
    "tierName": "皇阶",
    "rarity": 4,
    "rarityName": "神品",
    "title": "天道崩解",
    "plot": "旧有天道体系开始全面崩塌。",
    "levels": [716, 752, 788, 823, 859, 895, 931, 967, 1002, 1557],
    "reward": {
      "skills": ["bu048", "at062", "de069"],
      "equip": [
        { "slot": "boots", "rarity": 4 },
        { "slot": "weapon", "rarity": 4 },
        { "slot": "armor", "rarity": 4 },
      ]
    }
  },
{
    "ch": 88,
    "volume": 9,
    "volumeName": "第九卷·诸神黄昏",
    "realmName": "渡劫→超脱",
    "tier": 6,
    "tierName": "皇阶",
    "rarity": 4,
    "rarityName": "神品",
    "title": "轮回重塑",
    "plot": "轮回之道被强行重铸改写规则。",
    "levels": [724, 760, 796, 833, 869, 905, 941, 977, 1014, 1575],
    "reward": {
      "skills": ["bu076", "sp090", "bu097"],
      "equip": [
        { "slot": "weapon", "rarity": 4 },
        { "slot": "armor", "rarity": 4 },
        { "slot": "accessory", "rarity": 4 },
      ]
    }
  },
{
    "ch": 89,
    "volume": 9,
    "volumeName": "第九卷·诸神黄昏",
    "realmName": "渡劫→超脱",
    "tier": 7,
    "tierName": "帝阶",
    "rarity": 4,
    "rarityName": "神品",
    "title": "超脱在即",
    "plot": "距离超脱凡俗仅一步之遥。",
    "levels": [732, 769, 805, 842, 878, 915, 952, 988, 1025, 1592],
    "reward": {
      "skills": ["at112", "de119", "bu126"],
      "equip": [
        { "slot": "armor", "rarity": 4 },
        { "slot": "accessory", "rarity": 4 },
        { "slot": "boots", "rarity": 4 },
      ]
    }
  },
{
    "ch": 90,
    "volume": 9,
    "volumeName": "第九卷·诸神黄昏",
    "realmName": "渡劫→超脱",
    "tier": 7,
    "tierName": "帝阶",
    "rarity": 4,
    "rarityName": "神品",
    "title": "封神立榜",
    "plot": "弑神之后自立新榜定规矩。",
    "levels": [740, 777, 814, 851, 888, 925, 962, 999, 1036, 1610],
    "reward": {
      "skills": ["bu007", "re014", "at021"],
      "equip": [
        { "slot": "accessory", "rarity": 4 },
        { "slot": "boots", "rarity": 4 },
        { "slot": "weapon", "rarity": 4 },
      ]
    }
  },
{
    "ch": 91,
    "volume": 10,
    "volumeName": "第十卷·登临绝巅",
    "realmName": "超脱→仙帝",
    "tier": 7,
    "tierName": "帝阶",
    "rarity": 4,
    "rarityName": "神品",
    "title": "天门洞开",
    "plot": "飞升天门终于洞开在眼前。",
    "levels": [748, 785, 823, 860, 898, 935, 972, 1010, 1047, 1628],
    "reward": {
      "skills": ["bu028", "re035", "at042"],
      "equip": [
        { "slot": "boots", "rarity": 4 },
        { "slot": "weapon", "rarity": 4 },
        { "slot": "armor", "rarity": 4 },
      ]
    }
  },
{
    "ch": 92,
    "volume": 10,
    "volumeName": "第十卷·登临绝巅",
    "realmName": "超脱→仙帝",
    "tier": 7,
    "tierName": "帝阶",
    "rarity": 4,
    "rarityName": "神品",
    "title": "天道倾覆",
    "plot": "原有天道秩序彻底倾覆瓦解。",
    "levels": [756, 794, 832, 869, 907, 945, 983, 1021, 1058, 1644],
    "reward": {
      "skills": ["de049", "bu056", "de063"],
      "equip": [
        { "slot": "weapon", "rarity": 4 },
        { "slot": "armor", "rarity": 4 },
        { "slot": "accessory", "rarity": 4 },
      ]
    }
  },
{
    "ch": 93,
    "volume": 10,
    "volumeName": "第十卷·登临绝巅",
    "realmName": "超脱→仙帝",
    "tier": 7,
    "tierName": "帝阶",
    "rarity": 4,
    "rarityName": "神品",
    "title": "以身入局",
    "plot": "将自己作为棋子投入天地棋局。",
    "levels": [764, 802, 840, 879, 917, 955, 993, 1031, 1070, 1662],
    "reward": {
      "skills": ["sp070", "bu077", "re084"],
      "equip": [
        { "slot": "armor", "rarity": 4 },
        { "slot": "accessory", "rarity": 4 },
        { "slot": "boots", "rarity": 4 },
      ]
    }
  },
{
    "ch": 94,
    "volume": 10,
    "volumeName": "第十卷·登临绝巅",
    "realmName": "超脱→仙帝",
    "tier": 7,
    "tierName": "帝阶",
    "rarity": 4,
    "rarityName": "神品",
    "title": "乾坤逆乱",
    "plot": "逆转乾坤夺取最后的天机。",
    "levels": [772, 811, 849, 888, 926, 965, 1004, 1042, 1081, 1679],
    "reward": {
      "skills": ["at091", "bu098", "re105"],
      "equip": [
        { "slot": "accessory", "rarity": 4 },
        { "slot": "boots", "rarity": 4 },
        { "slot": "weapon", "rarity": 4 },
      ]
    }
  },
{
    "ch": 95,
    "volume": 10,
    "volumeName": "第十卷·登临绝巅",
    "realmName": "超脱→仙帝",
    "tier": 7,
    "tierName": "帝阶",
    "rarity": 4,
    "rarityName": "神品",
    "title": "帝者遗册",
    "plot": "获得仙帝遗留的最终典籍。",
    "levels": [780, 819, 858, 897, 936, 975, 1014, 1053, 1092, 1697],
    "reward": {
      "skills": ["at112", "de119", "bu126"],
      "equip": [
        { "slot": "boots", "rarity": 4 },
        { "slot": "weapon", "rarity": 4 },
        { "slot": "armor", "rarity": 4 },
      ]
    }
  },
{
    "ch": 96,
    "volume": 10,
    "volumeName": "第十卷·登临绝巅",
    "realmName": "超脱→仙帝",
    "tier": 7,
    "tierName": "帝阶",
    "rarity": 4,
    "rarityName": "神品",
    "title": "万界哀鸣",
    "plot": "浩劫降临万界同悲哀鸿遍野。",
    "levels": [788, 827, 867, 906, 946, 985, 1024, 1064, 1103, 1715],
    "reward": {
      "skills": ["bu007", "re014", "at021"],
      "equip": [
        { "slot": "weapon", "rarity": 4 },
        { "slot": "armor", "rarity": 4 },
        { "slot": "accessory", "rarity": 4 },
      ]
    }
  },
{
    "ch": 97,
    "volume": 10,
    "volumeName": "第十卷·登临绝巅",
    "realmName": "超脱→仙帝",
    "tier": 7,
    "tierName": "帝阶",
    "rarity": 4,
    "rarityName": "神品",
    "title": "决战时刻",
    "plot": "决定万物命运的最后决战。",
    "levels": [796, 836, 876, 915, 955, 995, 1035, 1075, 1114, 1731],
    "reward": {
      "skills": ["bu028", "re035", "at042"],
      "equip": [
        { "slot": "armor", "rarity": 4 },
        { "slot": "accessory", "rarity": 4 },
        { "slot": "boots", "rarity": 4 },
      ]
    }
  },
{
    "ch": 98,
    "volume": 10,
    "volumeName": "第十卷·登临绝巅",
    "realmName": "超脱→仙帝",
    "tier": 7,
    "tierName": "帝阶",
    "rarity": 4,
    "rarityName": "神品",
    "title": "秩序重建",
    "plot": "战后重建全新天地秩序。",
    "levels": [804, 844, 884, 925, 965, 1005, 1045, 1085, 1126, 1749],
    "reward": {
      "skills": ["de049", "bu056", "de063"],
      "equip": [
        { "slot": "accessory", "rarity": 4 },
        { "slot": "boots", "rarity": 4 },
        { "slot": "weapon", "rarity": 4 },
      ]
    }
  },
{
    "ch": 99,
    "volume": 10,
    "volumeName": "第十卷·登临绝巅",
    "realmName": "超脱→仙帝",
    "tier": 7,
    "tierName": "帝阶",
    "rarity": 4,
    "rarityName": "神品",
    "title": "言出法随",
    "plot": "修至巅峰言出法随心念即现实。",
    "levels": [812, 853, 893, 934, 974, 1015, 1056, 1096, 1137, 1766],
    "reward": {
      "skills": ["sp070", "bu077", "re084"],
      "equip": [
        { "slot": "boots", "rarity": 4 },
        { "slot": "weapon", "rarity": 4 },
        { "slot": "armor", "rarity": 4 },
      ]
    }
  },
{
    "ch": 100,
    "volume": 10,
    "volumeName": "第十卷·登临绝巅",
    "realmName": "超脱→仙帝",
    "tier": 7,
    "tierName": "帝阶",
    "rarity": 4,
    "rarityName": "神品",
    "title": "逍遥永恒",
    "plot": "超脱一切束缚逍遥于天地之外。",
    "levels": [820, 861, 902, 943, 984, 1025, 1066, 1107, 1148, 1784],
    "reward": {
      "skills": ["at091", "bu098", "re105"],
      "equip": [
        { "slot": "weapon", "rarity": 4 },
        { "slot": "armor", "rarity": 4 },
        { "slot": "accessory", "rarity": 4 },
      ]
    }
  },
];

// 卷总览（便于 UI 直接渲染目录）
const STORY_VOLUMES = [
  {
    "vol": 1,
    "name": "第一卷·初入仙途",
    "realmName": "炼气境",
    "range": [1, 10]
  },
  {
    "vol": 2,
    "name": "第二卷·秘境试炼",
    "realmName": "筑基境",
    "range": [11, 20]
  },
  {
    "vol": 3,
    "name": "第三卷·逆命修行",
    "realmName": "真武境",
    "range": [21, 30]
  },
  {
    "vol": 4,
    "name": "第四卷·焚炎觉醒",
    "realmName": "化海境",
    "range": [31, 40]
  },
  {
    "vol": 5,
    "name": "第五卷·涅槃重生",
    "realmName": "金丹境",
    "range": [41, 50]
  },
  {
    "vol": 6,
    "name": "第六卷·纵横四海",
    "realmName": "元婴境",
    "range": [51, 60]
  },
  {
    "vol": 7,
    "name": "第七卷·虚实幻境",
    "realmName": "出窍境",
    "range": [61, 70]
  },
  {
    "vol": 8,
    "name": "第八卷·道心不灭",
    "realmName": "破虚境",
    "range": [71, 80]
  },
  {
    "vol": 9,
    "name": "第九卷·诸神黄昏",
    "realmName": "渡劫→超脱",
    "range": [81, 90]
  },
  {
    "vol": 10,
    "name": "第十卷·登临绝巅",
    "realmName": "超脱→仙帝",
    "range": [91, 100]
  }
];

// 查表：ch -> chapter 对象
const STORY_BY_CH = (function () { var m = {}; for (var i = 0; i < STORY_CHAPTERS.length; i++) m[STORY_CHAPTERS[i].ch] = STORY_CHAPTERS[i]; return m; })();
if (typeof module !== "undefined") module.exports = { STORY_CHAPTERS, STORY_VOLUMES, STORY_BY_CH };
