// ===== 《逍遥仙》100 章剧情副本数据（由 gen_story.js 生成）=====
// 改编自 2024-2026 热门爆款仙侠小说（见 design/百章剧情与副本奖励设计.md）。
// 加载顺序：须在 battle.js / hub.js 之前 <script src> 引入本文件（提供全局 STORY_CHAPTERS）。
// 字段说明：
//   ch           章节序号 1~100
//   volume       所属卷序号、volumeName 卷名、inspiredBy 改编来源
//   realmName    叙事境界（仅剧情氛围，对应 cultivation.js 早期境界）
//   tier/tierName 本章功法三选一对应的功法阶位（1黄~7帝）
//   rarity/rarityName 本章装备三选一对应的装备品质序号（0凡~4神，对应 player.js RARITY）
//   levels       长度 10，每关胜利奖励经验；末位为 BOSS 关（经验×1.5）
//   reward.skills  3 个 SKILLS_DB id；玩家通关本章后三选一，写入 player.learned
//   reward.equip   3 个 {slot, rarity}；玩家三选一后由 genEquip(slot, rarity) 生成具体装备
const STORY_CHAPTERS = [
  {
    "ch": 1,
    "volume": 1,
    "volumeName": "第一卷·凡尘问道",
    "inspiredBy": "《凡人修仙传》",
    "realmName": "炼气境",
    "tier": 1,
    "tierName": "黄阶",
    "rarity": 0,
    "rarityName": "凡品",
    "title": "山村惊变",
    "plot": "太平村夜起妖风，少年拾得半卷残经。",
    "levels": [
      28,
      29,
      31,
      32,
      34,
      35,
      36,
      38,
      39,
      62
    ],
    "reward": {
      "skills": [
        "de029",
        "bu036",
        "de043"
      ],
      "equip": [
        {
          "slot": "armor",
          "rarity": 0
        },
        {
          "slot": "accessory",
          "rarity": 0
        },
        {
          "slot": "boots",
          "rarity": 0
        }
      ]
    }
  },
  {
    "ch": 2,
    "volume": 1,
    "volumeName": "第一卷·凡尘问道",
    "inspiredBy": "《凡人修仙传》",
    "realmName": "炼气境",
    "tier": 1,
    "tierName": "黄阶",
    "rarity": 0,
    "rarityName": "凡品",
    "title": "七玄入门",
    "plot": "考入门派，资质平庸只得当记名弟子。",
    "levels": [
      36,
      38,
      40,
      41,
      43,
      45,
      47,
      49,
      50,
      78
    ],
    "reward": {
      "skills": [
        "bu057",
        "re064",
        "at071"
      ],
      "equip": [
        {
          "slot": "accessory",
          "rarity": 0
        },
        {
          "slot": "boots",
          "rarity": 0
        },
        {
          "slot": "weapon",
          "rarity": 0
        }
      ]
    }
  },
  {
    "ch": 3,
    "volume": 1,
    "volumeName": "第一卷·凡尘问道",
    "inspiredBy": "《凡人修仙传》",
    "realmName": "炼气境",
    "tier": 1,
    "tierName": "黄阶",
    "rarity": 0,
    "rarityName": "凡品",
    "title": "药园杂役",
    "plot": "药园杂役中遇神秘老者，授吐纳根基。",
    "levels": [
      44,
      46,
      48,
      51,
      53,
      55,
      57,
      59,
      62,
      96
    ],
    "reward": {
      "skills": [
        "re085",
        "at092",
        "de099"
      ],
      "equip": [
        {
          "slot": "boots",
          "rarity": 0
        },
        {
          "slot": "weapon",
          "rarity": 0
        },
        {
          "slot": "armor",
          "rarity": 0
        }
      ]
    }
  },
  {
    "ch": 4,
    "volume": 1,
    "volumeName": "第一卷·凡尘问道",
    "inspiredBy": "《凡人修仙传》",
    "realmName": "炼气境",
    "tier": 1,
    "tierName": "黄阶",
    "rarity": 0,
    "rarityName": "凡品",
    "title": "墨师之祸",
    "plot": "察觉墨师以弟子炼药，暗布杀局。",
    "levels": [
      52,
      55,
      57,
      60,
      62,
      65,
      68,
      70,
      73,
      113
    ],
    "reward": {
      "skills": [
        "de113",
        "sp120",
        "bu127"
      ],
      "equip": [
        {
          "slot": "weapon",
          "rarity": 0
        },
        {
          "slot": "armor",
          "rarity": 0
        },
        {
          "slot": "accessory",
          "rarity": 0
        }
      ]
    }
  },
  {
    "ch": 5,
    "volume": 1,
    "volumeName": "第一卷·凡尘问道",
    "inspiredBy": "《凡人修仙传》",
    "realmName": "炼气境",
    "tier": 1,
    "tierName": "黄阶",
    "rarity": 0,
    "rarityName": "凡品",
    "title": "夜遁深山",
    "plot": "携残经夜遁深山，初感灵气入体。",
    "levels": [
      60,
      63,
      66,
      69,
      72,
      75,
      78,
      81,
      84,
      131
    ],
    "reward": {
      "skills": [
        "sp050",
        "bu078",
        "bu106"
      ],
      "equip": [
        {
          "slot": "armor",
          "rarity": 0
        },
        {
          "slot": "accessory",
          "rarity": 0
        },
        {
          "slot": "boots",
          "rarity": 0
        }
      ]
    }
  },
  {
    "ch": 6,
    "volume": 1,
    "volumeName": "第一卷·凡尘问道",
    "inspiredBy": "《凡人修仙传》",
    "realmName": "炼气境",
    "tier": 1,
    "tierName": "黄阶",
    "rarity": 0,
    "rarityName": "凡品",
    "title": "灵泉洗髓",
    "plot": "误入灵泉洗髓易筋，修为小成。",
    "levels": [
      68,
      71,
      75,
      78,
      82,
      85,
      88,
      92,
      95,
      149
    ],
    "reward": {
      "skills": [
        "de029",
        "bu036",
        "de043"
      ],
      "equip": [
        {
          "slot": "accessory",
          "rarity": 0
        },
        {
          "slot": "boots",
          "rarity": 0
        },
        {
          "slot": "weapon",
          "rarity": 0
        }
      ]
    }
  },
  {
    "ch": 7,
    "volume": 1,
    "volumeName": "第一卷·凡尘问道",
    "inspiredBy": "《凡人修仙传》",
    "realmName": "炼气境",
    "tier": 1,
    "tierName": "黄阶",
    "rarity": 0,
    "rarityName": "凡品",
    "title": "同门相残",
    "plot": "墨师党羽追杀，以智破局全身而退。",
    "levels": [
      76,
      80,
      84,
      87,
      91,
      95,
      99,
      103,
      106,
      165
    ],
    "reward": {
      "skills": [
        "bu057",
        "re064",
        "at071"
      ],
      "equip": [
        {
          "slot": "boots",
          "rarity": 0
        },
        {
          "slot": "weapon",
          "rarity": 0
        },
        {
          "slot": "armor",
          "rarity": 0
        }
      ]
    }
  },
  {
    "ch": 8,
    "volume": 1,
    "volumeName": "第一卷·凡尘问道",
    "inspiredBy": "《凡人修仙传》",
    "realmName": "炼气境",
    "tier": 1,
    "tierName": "黄阶",
    "rarity": 0,
    "rarityName": "凡品",
    "title": "升仙令下",
    "plot": "宗门十年升仙大会令下，风云聚。",
    "levels": [
      84,
      88,
      92,
      97,
      101,
      105,
      109,
      113,
      118,
      183
    ],
    "reward": {
      "skills": [
        "re085",
        "at092",
        "de099"
      ],
      "equip": [
        {
          "slot": "weapon",
          "rarity": 0
        },
        {
          "slot": "armor",
          "rarity": 0
        },
        {
          "slot": "accessory",
          "rarity": 0
        }
      ]
    }
  },
  {
    "ch": 9,
    "volume": 1,
    "volumeName": "第一卷·凡尘问道",
    "inspiredBy": "《凡人修仙传》",
    "realmName": "炼气境",
    "tier": 1,
    "tierName": "黄阶",
    "rarity": 0,
    "rarityName": "凡品",
    "title": "擂台扬名",
    "plot": "擂台以弱胜强，连败嫡传名动七玄。",
    "levels": [
      92,
      97,
      101,
      106,
      110,
      115,
      120,
      124,
      129,
      200
    ],
    "reward": {
      "skills": [
        "de113",
        "sp120",
        "bu127"
      ],
      "equip": [
        {
          "slot": "armor",
          "rarity": 0
        },
        {
          "slot": "accessory",
          "rarity": 0
        },
        {
          "slot": "boots",
          "rarity": 0
        }
      ]
    }
  },
  {
    "ch": 10,
    "volume": 1,
    "volumeName": "第一卷·凡尘问道",
    "inspiredBy": "《凡人修仙传》",
    "realmName": "炼气境",
    "tier": 1,
    "tierName": "黄阶",
    "rarity": 0,
    "rarityName": "凡品",
    "title": "别山历练",
    "plot": "大会夺魁却择下山，卷终留悬念。",
    "levels": [
      100,
      105,
      110,
      115,
      120,
      125,
      130,
      135,
      140,
      218
    ],
    "reward": {
      "skills": [
        "sp050",
        "bu078",
        "bu106"
      ],
      "equip": [
        {
          "slot": "accessory",
          "rarity": 0
        },
        {
          "slot": "boots",
          "rarity": 0
        },
        {
          "slot": "weapon",
          "rarity": 0
        }
      ]
    }
  },
  {
    "ch": 11,
    "volume": 2,
    "volumeName": "第二卷·九龙渡厄",
    "inspiredBy": "《遮天》",
    "realmName": "筑基境",
    "tier": 1,
    "tierName": "黄阶",
    "rarity": 0,
    "rarityName": "凡品",
    "title": "九龙拉棺",
    "plot": "九具龙尸拉青铜棺，现于星空。",
    "levels": [
      108,
      113,
      119,
      124,
      130,
      135,
      140,
      146,
      151,
      236
    ],
    "reward": {
      "skills": [
        "de029",
        "bu036",
        "de043"
      ],
      "equip": [
        {
          "slot": "boots",
          "rarity": 0
        },
        {
          "slot": "weapon",
          "rarity": 0
        },
        {
          "slot": "armor",
          "rarity": 0
        }
      ]
    }
  },
  {
    "ch": 12,
    "volume": 2,
    "volumeName": "第二卷·九龙渡厄",
    "inspiredBy": "《遮天》",
    "realmName": "筑基境",
    "tier": 1,
    "tierName": "黄阶",
    "rarity": 0,
    "rarityName": "凡品",
    "title": "北斗荒原",
    "plot": "少年被渡至北斗荒古禁地。",
    "levels": [
      116,
      122,
      128,
      133,
      139,
      145,
      151,
      157,
      162,
      252
    ],
    "reward": {
      "skills": [
        "bu057",
        "re064",
        "at071"
      ],
      "equip": [
        {
          "slot": "weapon",
          "rarity": 0
        },
        {
          "slot": "armor",
          "rarity": 0
        },
        {
          "slot": "accessory",
          "rarity": 0
        }
      ]
    }
  },
  {
    "ch": 13,
    "volume": 2,
    "volumeName": "第二卷·九龙渡厄",
    "inspiredBy": "《遮天》",
    "realmName": "筑基境",
    "tier": 1,
    "tierName": "黄阶",
    "rarity": 0,
    "rarityName": "凡品",
    "title": "禁地求生",
    "plot": "禁地绝灵，挣扎求生觅出路。",
    "levels": [
      124,
      130,
      136,
      143,
      149,
      155,
      161,
      167,
      174,
      270
    ],
    "reward": {
      "skills": [
        "re085",
        "at092",
        "de099"
      ],
      "equip": [
        {
          "slot": "armor",
          "rarity": 0
        },
        {
          "slot": "accessory",
          "rarity": 0
        },
        {
          "slot": "boots",
          "rarity": 0
        }
      ]
    }
  },
  {
    "ch": 14,
    "volume": 2,
    "volumeName": "第二卷·九龙渡厄",
    "inspiredBy": "《遮天》",
    "realmName": "筑基境",
    "tier": 1,
    "tierName": "黄阶",
    "rarity": 0,
    "rarityName": "凡品",
    "title": "源术初探",
    "plot": "初探源术，辨古纹窥大道。",
    "levels": [
      132,
      139,
      145,
      152,
      158,
      165,
      172,
      178,
      185,
      287
    ],
    "reward": {
      "skills": [
        "de113",
        "sp120",
        "bu127"
      ],
      "equip": [
        {
          "slot": "accessory",
          "rarity": 0
        },
        {
          "slot": "boots",
          "rarity": 0
        },
        {
          "slot": "weapon",
          "rarity": 0
        }
      ]
    }
  },
  {
    "ch": 15,
    "volume": 2,
    "volumeName": "第二卷·九龙渡厄",
    "inspiredBy": "《遮天》",
    "realmName": "筑基境",
    "tier": 1,
    "tierName": "黄阶",
    "rarity": 0,
    "rarityName": "凡品",
    "title": "古碑残字",
    "plot": "残碑古字记载上古灭世之秘。",
    "levels": [
      140,
      147,
      154,
      161,
      168,
      175,
      182,
      189,
      196,
      305
    ],
    "reward": {
      "skills": [
        "sp050",
        "bu078",
        "bu106"
      ],
      "equip": [
        {
          "slot": "boots",
          "rarity": 0
        },
        {
          "slot": "weapon",
          "rarity": 0
        },
        {
          "slot": "armor",
          "rarity": 0
        }
      ]
    }
  },
  {
    "ch": 16,
    "volume": 2,
    "volumeName": "第二卷·九龙渡厄",
    "inspiredBy": "《遮天》",
    "realmName": "筑基境",
    "tier": 2,
    "tierName": "玄阶",
    "rarity": 1,
    "rarityName": "灵品",
    "title": "同棺之争",
    "plot": "同棺修士相残，夺机缘。",
    "levels": [
      148,
      155,
      163,
      170,
      178,
      185,
      192,
      200,
      207,
      323
    ],
    "reward": {
      "skills": [
        "bu037",
        "re065",
        "de093"
      ],
      "equip": [
        {
          "slot": "weapon",
          "rarity": 1
        },
        {
          "slot": "armor",
          "rarity": 1
        },
        {
          "slot": "accessory",
          "rarity": 1
        }
      ]
    }
  },
  {
    "ch": 17,
    "volume": 2,
    "volumeName": "第二卷·九龙渡厄",
    "inspiredBy": "《遮天》",
    "realmName": "筑基境",
    "tier": 2,
    "tierName": "玄阶",
    "rarity": 1,
    "rarityName": "灵品",
    "title": "苦海种金",
    "plot": "苦海种金，奠基修行根本。",
    "levels": [
      156,
      164,
      172,
      179,
      187,
      195,
      203,
      211,
      218,
      339
    ],
    "reward": {
      "skills": [
        "at121",
        "de023",
        "sp030"
      ],
      "equip": [
        {
          "slot": "armor",
          "rarity": 1
        },
        {
          "slot": "accessory",
          "rarity": 1
        },
        {
          "slot": "boots",
          "rarity": 1
        }
      ]
    }
  },
  {
    "ch": 18,
    "volume": 2,
    "volumeName": "第二卷·九龙渡厄",
    "inspiredBy": "《遮天》",
    "realmName": "筑基境",
    "tier": 2,
    "tierName": "玄阶",
    "rarity": 1,
    "rarityName": "灵品",
    "title": "圣体虚影",
    "plot": "圣体虚影显，惊动四方。",
    "levels": [
      164,
      172,
      180,
      189,
      197,
      205,
      213,
      221,
      230,
      357
    ],
    "reward": {
      "skills": [
        "re044",
        "at051",
        "bu058"
      ],
      "equip": [
        {
          "slot": "accessory",
          "rarity": 1
        },
        {
          "slot": "boots",
          "rarity": 1
        },
        {
          "slot": "weapon",
          "rarity": 1
        }
      ]
    }
  },
  {
    "ch": 19,
    "volume": 2,
    "volumeName": "第二卷·九龙渡厄",
    "inspiredBy": "《遮天》",
    "realmName": "筑基境",
    "tier": 2,
    "tierName": "玄阶",
    "rarity": 1,
    "rarityName": "灵品",
    "title": "荒古遗阵",
    "plot": "踏入荒古遗阵，破阵得宝。",
    "levels": [
      172,
      181,
      189,
      198,
      206,
      215,
      224,
      232,
      241,
      374
    ],
    "reward": {
      "skills": [
        "at072",
        "de079",
        "bu086"
      ],
      "equip": [
        {
          "slot": "boots",
          "rarity": 1
        },
        {
          "slot": "weapon",
          "rarity": 1
        },
        {
          "slot": "armor",
          "rarity": 1
        }
      ]
    }
  },
  {
    "ch": 20,
    "volume": 2,
    "volumeName": "第二卷·九龙渡厄",
    "inspiredBy": "《遮天》",
    "realmName": "筑基境",
    "tier": 2,
    "tierName": "玄阶",
    "rarity": 1,
    "rarityName": "灵品",
    "title": "渡厄归来",
    "plot": "渡厄归来，境界破筑基。",
    "levels": [
      180,
      189,
      198,
      207,
      216,
      225,
      234,
      243,
      252,
      392
    ],
    "reward": {
      "skills": [
        "sp100",
        "bu107",
        "re114"
      ],
      "equip": [
        {
          "slot": "weapon",
          "rarity": 1
        },
        {
          "slot": "armor",
          "rarity": 1
        },
        {
          "slot": "accessory",
          "rarity": 1
        }
      ]
    }
  },
  {
    "ch": 21,
    "volume": 3,
    "volumeName": "第三卷·古神遗秘",
    "inspiredBy": "《仙逆》",
    "realmName": "真武境",
    "tier": 2,
    "tierName": "玄阶",
    "rarity": 1,
    "rarityName": "灵品",
    "title": "化凡修心",
    "plot": "入古神之地，化凡修心清净。",
    "levels": [
      188,
      197,
      207,
      216,
      226,
      235,
      244,
      254,
      263,
      410
    ],
    "reward": {
      "skills": [
        "bu128",
        "bu037",
        "re065"
      ],
      "equip": [
        {
          "slot": "armor",
          "rarity": 1
        },
        {
          "slot": "accessory",
          "rarity": 1
        },
        {
          "slot": "boots",
          "rarity": 1
        }
      ]
    }
  },
  {
    "ch": 22,
    "volume": 3,
    "volumeName": "第三卷·古神遗秘",
    "inspiredBy": "《仙逆》",
    "realmName": "真武境",
    "tier": 2,
    "tierName": "玄阶",
    "rarity": 1,
    "rarityName": "灵品",
    "title": "古神之地",
    "plot": "古神遗骸藏无上机缘。",
    "levels": [
      196,
      206,
      216,
      225,
      235,
      245,
      255,
      265,
      274,
      426
    ],
    "reward": {
      "skills": [
        "de093",
        "at121",
        "de023"
      ],
      "equip": [
        {
          "slot": "accessory",
          "rarity": 1
        },
        {
          "slot": "boots",
          "rarity": 1
        },
        {
          "slot": "weapon",
          "rarity": 1
        }
      ]
    }
  },
  {
    "ch": 23,
    "volume": 3,
    "volumeName": "第三卷·古神遗秘",
    "inspiredBy": "《仙逆》",
    "realmName": "真武境",
    "tier": 2,
    "tierName": "玄阶",
    "rarity": 1,
    "rarityName": "灵品",
    "title": "戮仙残诀",
    "plot": "得戮仙残诀，杀伐决断。",
    "levels": [
      204,
      214,
      224,
      235,
      245,
      255,
      265,
      275,
      286,
      444
    ],
    "reward": {
      "skills": [
        "sp030",
        "re044",
        "at051"
      ],
      "equip": [
        {
          "slot": "boots",
          "rarity": 1
        },
        {
          "slot": "weapon",
          "rarity": 1
        },
        {
          "slot": "armor",
          "rarity": 1
        }
      ]
    }
  },
  {
    "ch": 24,
    "volume": 3,
    "volumeName": "第三卷·古神遗秘",
    "inspiredBy": "《仙逆》",
    "realmName": "真武境",
    "tier": 2,
    "tierName": "玄阶",
    "rarity": 1,
    "rarityName": "灵品",
    "title": "血色祭坛",
    "plot": "血色祭坛献祭，险死还生。",
    "levels": [
      212,
      223,
      233,
      244,
      254,
      265,
      276,
      286,
      297,
      461
    ],
    "reward": {
      "skills": [
        "bu058",
        "at072",
        "de079"
      ],
      "equip": [
        {
          "slot": "weapon",
          "rarity": 1
        },
        {
          "slot": "armor",
          "rarity": 1
        },
        {
          "slot": "accessory",
          "rarity": 1
        }
      ]
    }
  },
  {
    "ch": 25,
    "volume": 3,
    "volumeName": "第三卷·古神遗秘",
    "inspiredBy": "《仙逆》",
    "realmName": "真武境",
    "tier": 2,
    "tierName": "玄阶",
    "rarity": 1,
    "rarityName": "灵品",
    "title": "天劫将至",
    "plot": "天劫将至，避劫于秘境。",
    "levels": [
      220,
      231,
      242,
      253,
      264,
      275,
      286,
      297,
      308,
      479
    ],
    "reward": {
      "skills": [
        "bu086",
        "sp100",
        "bu107"
      ],
      "equip": [
        {
          "slot": "armor",
          "rarity": 1
        },
        {
          "slot": "accessory",
          "rarity": 1
        },
        {
          "slot": "boots",
          "rarity": 1
        }
      ]
    }
  },
  {
    "ch": 26,
    "volume": 3,
    "volumeName": "第三卷·古神遗秘",
    "inspiredBy": "《仙逆》",
    "realmName": "真武境",
    "tier": 2,
    "tierName": "玄阶",
    "rarity": 1,
    "rarityName": "灵品",
    "title": "逆修一脉",
    "plot": "逆修一脉，反夺天地造化。",
    "levels": [
      228,
      239,
      251,
      262,
      274,
      285,
      296,
      308,
      319,
      497
    ],
    "reward": {
      "skills": [
        "re114",
        "bu128",
        "bu037"
      ],
      "equip": [
        {
          "slot": "accessory",
          "rarity": 1
        },
        {
          "slot": "boots",
          "rarity": 1
        },
        {
          "slot": "weapon",
          "rarity": 1
        }
      ]
    }
  },
  {
    "ch": 27,
    "volume": 3,
    "volumeName": "第三卷·古神遗秘",
    "inspiredBy": "《仙逆》",
    "realmName": "真武境",
    "tier": 2,
    "tierName": "玄阶",
    "rarity": 1,
    "rarityName": "灵品",
    "title": "域外心魔",
    "plot": "域外心魔侵神，守灵台。",
    "levels": [
      236,
      248,
      260,
      271,
      283,
      295,
      307,
      319,
      330,
      513
    ],
    "reward": {
      "skills": [
        "re065",
        "de093",
        "at121"
      ],
      "equip": [
        {
          "slot": "boots",
          "rarity": 1
        },
        {
          "slot": "weapon",
          "rarity": 1
        },
        {
          "slot": "armor",
          "rarity": 1
        }
      ]
    }
  },
  {
    "ch": 28,
    "volume": 3,
    "volumeName": "第三卷·古神遗秘",
    "inspiredBy": "《仙逆》",
    "realmName": "真武境",
    "tier": 2,
    "tierName": "玄阶",
    "rarity": 1,
    "rarityName": "灵品",
    "title": "因果轮回",
    "plot": "因果轮回现，了前尘。",
    "levels": [
      244,
      256,
      268,
      281,
      293,
      305,
      317,
      329,
      342,
      531
    ],
    "reward": {
      "skills": [
        "de023",
        "sp030",
        "re044"
      ],
      "equip": [
        {
          "slot": "weapon",
          "rarity": 1
        },
        {
          "slot": "armor",
          "rarity": 1
        },
        {
          "slot": "accessory",
          "rarity": 1
        }
      ]
    }
  },
  {
    "ch": 29,
    "volume": 3,
    "volumeName": "第三卷·古神遗秘",
    "inspiredBy": "《仙逆》",
    "realmName": "真武境",
    "tier": 2,
    "tierName": "玄阶",
    "rarity": 1,
    "rarityName": "灵品",
    "title": "神念化形",
    "plot": "神念化形，可御物千里。",
    "levels": [
      252,
      265,
      277,
      290,
      302,
      315,
      328,
      340,
      353,
      548
    ],
    "reward": {
      "skills": [
        "at051",
        "bu058",
        "at072"
      ],
      "equip": [
        {
          "slot": "armor",
          "rarity": 1
        },
        {
          "slot": "accessory",
          "rarity": 1
        },
        {
          "slot": "boots",
          "rarity": 1
        }
      ]
    }
  },
  {
    "ch": 30,
    "volume": 3,
    "volumeName": "第三卷·古神遗秘",
    "inspiredBy": "《仙逆》",
    "realmName": "真武境",
    "tier": 2,
    "tierName": "玄阶",
    "rarity": 1,
    "rarityName": "灵品",
    "title": "遗秘归藏",
    "plot": "遗秘归藏，真武小成。",
    "levels": [
      260,
      273,
      286,
      299,
      312,
      325,
      338,
      351,
      364,
      566
    ],
    "reward": {
      "skills": [
        "de079",
        "bu086",
        "sp100"
      ],
      "equip": [
        {
          "slot": "accessory",
          "rarity": 1
        },
        {
          "slot": "boots",
          "rarity": 1
        },
        {
          "slot": "weapon",
          "rarity": 1
        }
      ]
    }
  },
  {
    "ch": 31,
    "volume": 4,
    "volumeName": "第四卷·异火重燃",
    "inspiredBy": "《斗破苍穹》",
    "realmName": "化海境",
    "tier": 3,
    "tierName": "地阶",
    "rarity": 1,
    "rarityName": "灵品",
    "title": "退婚之辱",
    "plot": "退婚之辱，立三年之约。",
    "levels": [
      268,
      281,
      295,
      308,
      322,
      335,
      348,
      362,
      375,
      584
    ],
    "reward": {
      "skills": [
        "at122",
        "de129",
        "de003"
      ],
      "equip": [
        {
          "slot": "boots",
          "rarity": 1
        },
        {
          "slot": "weapon",
          "rarity": 1
        },
        {
          "slot": "armor",
          "rarity": 1
        }
      ]
    }
  },
  {
    "ch": 32,
    "volume": 4,
    "volumeName": "第四卷·异火重燃",
    "inspiredBy": "《斗破苍穹》",
    "realmName": "化海境",
    "tier": 3,
    "tierName": "地阶",
    "rarity": 1,
    "rarityName": "灵品",
    "title": "残魂指路",
    "plot": "神秘残魂指路，授炼药。",
    "levels": [
      276,
      290,
      304,
      317,
      331,
      345,
      359,
      373,
      386,
      600
    ],
    "reward": {
      "skills": [
        "re024",
        "at031",
        "at052"
      ],
      "equip": [
        {
          "slot": "weapon",
          "rarity": 1
        },
        {
          "slot": "armor",
          "rarity": 1
        },
        {
          "slot": "accessory",
          "rarity": 1
        }
      ]
    }
  },
  {
    "ch": 33,
    "volume": 4,
    "volumeName": "第四卷·异火重燃",
    "inspiredBy": "《斗破苍穹》",
    "realmName": "化海境",
    "tier": 3,
    "tierName": "地阶",
    "rarity": 1,
    "rarityName": "灵品",
    "title": "纳灵之戒",
    "plot": "纳灵之戒藏异火种子。",
    "levels": [
      284,
      298,
      312,
      327,
      341,
      355,
      369,
      383,
      398,
      618
    ],
    "reward": {
      "skills": [
        "de059",
        "sp080",
        "bu087"
      ],
      "equip": [
        {
          "slot": "armor",
          "rarity": 1
        },
        {
          "slot": "accessory",
          "rarity": 1
        },
        {
          "slot": "boots",
          "rarity": 1
        }
      ]
    }
  },
  {
    "ch": 34,
    "volume": 4,
    "volumeName": "第四卷·异火重燃",
    "inspiredBy": "《斗破苍穹》",
    "realmName": "化海境",
    "tier": 3,
    "tierName": "地阶",
    "rarity": 1,
    "rarityName": "灵品",
    "title": "异火初现",
    "plot": "异火初现，险为火噬。",
    "levels": [
      292,
      307,
      321,
      336,
      350,
      365,
      380,
      394,
      409,
      635
    ],
    "reward": {
      "skills": [
        "bu108",
        "re115",
        "sp010"
      ],
      "equip": [
        {
          "slot": "accessory",
          "rarity": 1
        },
        {
          "slot": "boots",
          "rarity": 1
        },
        {
          "slot": "weapon",
          "rarity": 1
        }
      ]
    }
  },
  {
    "ch": 35,
    "volume": 4,
    "volumeName": "第四卷·异火重燃",
    "inspiredBy": "《斗破苍穹》",
    "realmName": "化海境",
    "tier": 3,
    "tierName": "地阶",
    "rarity": 1,
    "rarityName": "灵品",
    "title": "焚天炼体",
    "plot": "焚天炼体，筋骨如钢。",
    "levels": [
      300,
      315,
      330,
      345,
      360,
      375,
      390,
      405,
      420,
      653
    ],
    "reward": {
      "skills": [
        "bu017",
        "bu038",
        "re045"
      ],
      "equip": [
        {
          "slot": "boots",
          "rarity": 1
        },
        {
          "slot": "weapon",
          "rarity": 1
        },
        {
          "slot": "armor",
          "rarity": 1
        }
      ]
    }
  },
  {
    "ch": 36,
    "volume": 4,
    "volumeName": "第四卷·异火重燃",
    "inspiredBy": "《斗破苍穹》",
    "realmName": "化海境",
    "tier": 3,
    "tierName": "地阶",
    "rarity": 1,
    "rarityName": "灵品",
    "title": "炼药师路",
    "plot": "踏上炼药师之路。",
    "levels": [
      308,
      323,
      339,
      354,
      370,
      385,
      400,
      416,
      431,
      671
    ],
    "reward": {
      "skills": [
        "bu066",
        "de073",
        "re094"
      ],
      "equip": [
        {
          "slot": "weapon",
          "rarity": 1
        },
        {
          "slot": "armor",
          "rarity": 1
        },
        {
          "slot": "accessory",
          "rarity": 1
        }
      ]
    }
  },
  {
    "ch": 37,
    "volume": 4,
    "volumeName": "第四卷·异火重燃",
    "inspiredBy": "《斗破苍穹》",
    "realmName": "化海境",
    "tier": 3,
    "tierName": "地阶",
    "rarity": 1,
    "rarityName": "灵品",
    "title": "宗族大比",
    "plot": "宗族大比，一鸣惊人。",
    "levels": [
      316,
      332,
      348,
      363,
      379,
      395,
      411,
      427,
      442,
      687
    ],
    "reward": {
      "skills": [
        "at101",
        "at122",
        "de129"
      ],
      "equip": [
        {
          "slot": "armor",
          "rarity": 1
        },
        {
          "slot": "accessory",
          "rarity": 1
        },
        {
          "slot": "boots",
          "rarity": 1
        }
      ]
    }
  },
  {
    "ch": 38,
    "volume": 4,
    "volumeName": "第四卷·异火重燃",
    "inspiredBy": "《斗破苍穹》",
    "realmName": "化海境",
    "tier": 3,
    "tierName": "地阶",
    "rarity": 2,
    "rarityName": "宝品",
    "title": "火噬强敌",
    "plot": "火噬强敌，洗前耻。",
    "levels": [
      324,
      340,
      356,
      373,
      389,
      405,
      421,
      437,
      454,
      705
    ],
    "reward": {
      "skills": [
        "de003",
        "re024",
        "at031"
      ],
      "equip": [
        {
          "slot": "accessory",
          "rarity": 2
        },
        {
          "slot": "boots",
          "rarity": 2
        },
        {
          "slot": "weapon",
          "rarity": 2
        }
      ]
    }
  },
  {
    "ch": 39,
    "volume": 4,
    "volumeName": "第四卷·异火重燃",
    "inspiredBy": "《斗破苍穹》",
    "realmName": "化海境",
    "tier": 3,
    "tierName": "地阶",
    "rarity": 2,
    "rarityName": "宝品",
    "title": "丹成惊四座",
    "plot": "丹成惊四座，名动一方。",
    "levels": [
      332,
      349,
      365,
      382,
      398,
      415,
      432,
      448,
      465,
      722
    ],
    "reward": {
      "skills": [
        "at052",
        "de059",
        "sp080"
      ],
      "equip": [
        {
          "slot": "boots",
          "rarity": 2
        },
        {
          "slot": "weapon",
          "rarity": 2
        },
        {
          "slot": "armor",
          "rarity": 2
        }
      ]
    }
  },
  {
    "ch": 40,
    "volume": 4,
    "volumeName": "第四卷·异火重燃",
    "inspiredBy": "《斗破苍穹》",
    "realmName": "化海境",
    "tier": 3,
    "tierName": "地阶",
    "rarity": 2,
    "rarityName": "宝品",
    "title": "一剑立威",
    "plot": "一剑立威，化海初成。",
    "levels": [
      340,
      357,
      374,
      391,
      408,
      425,
      442,
      459,
      476,
      740
    ],
    "reward": {
      "skills": [
        "bu087",
        "bu108",
        "re115"
      ],
      "equip": [
        {
          "slot": "weapon",
          "rarity": 2
        },
        {
          "slot": "armor",
          "rarity": 2
        },
        {
          "slot": "accessory",
          "rarity": 2
        }
      ]
    }
  },
  {
    "ch": 41,
    "volume": 5,
    "volumeName": "第五卷·至尊骨血",
    "inspiredBy": "《完美世界》",
    "realmName": "金丹境",
    "tier": 3,
    "tierName": "地阶",
    "rarity": 2,
    "rarityName": "宝品",
    "title": "至尊骨殇",
    "plot": "至尊骨被夺，坠入绝境。",
    "levels": [
      348,
      365,
      383,
      400,
      418,
      435,
      452,
      470,
      487,
      758
    ],
    "reward": {
      "skills": [
        "sp010",
        "bu017",
        "bu038"
      ],
      "equip": [
        {
          "slot": "armor",
          "rarity": 2
        },
        {
          "slot": "accessory",
          "rarity": 2
        },
        {
          "slot": "boots",
          "rarity": 2
        }
      ]
    }
  },
  {
    "ch": 42,
    "volume": 5,
    "volumeName": "第五卷·至尊骨血",
    "inspiredBy": "《完美世界》",
    "realmName": "金丹境",
    "tier": 3,
    "tierName": "地阶",
    "rarity": 2,
    "rarityName": "宝品",
    "title": "重铸己身",
    "plot": "重铸己身，另辟蹊径。",
    "levels": [
      356,
      374,
      392,
      409,
      427,
      445,
      463,
      481,
      498,
      774
    ],
    "reward": {
      "skills": [
        "re045",
        "bu066",
        "de073"
      ],
      "equip": [
        {
          "slot": "accessory",
          "rarity": 2
        },
        {
          "slot": "boots",
          "rarity": 2
        },
        {
          "slot": "weapon",
          "rarity": 2
        }
      ]
    }
  },
  {
    "ch": 43,
    "volume": 5,
    "volumeName": "第五卷·至尊骨血",
    "inspiredBy": "《完美世界》",
    "realmName": "金丹境",
    "tier": 3,
    "tierName": "地阶",
    "rarity": 2,
    "rarityName": "宝品",
    "title": "搬血秘境",
    "plot": "搬血秘境，淬体极致。",
    "levels": [
      364,
      382,
      400,
      419,
      437,
      455,
      473,
      491,
      510,
      792
    ],
    "reward": {
      "skills": [
        "re094",
        "at101",
        "at122"
      ],
      "equip": [
        {
          "slot": "boots",
          "rarity": 2
        },
        {
          "slot": "weapon",
          "rarity": 2
        },
        {
          "slot": "armor",
          "rarity": 2
        }
      ]
    }
  },
  {
    "ch": 44,
    "volume": 5,
    "volumeName": "第五卷·至尊骨血",
    "inspiredBy": "《完美世界》",
    "realmName": "金丹境",
    "tier": 3,
    "tierName": "地阶",
    "rarity": 2,
    "rarityName": "宝品",
    "title": "虚神界开",
    "plot": "虚神界开，群英争锋。",
    "levels": [
      372,
      391,
      409,
      428,
      446,
      465,
      484,
      502,
      521,
      809
    ],
    "reward": {
      "skills": [
        "de129",
        "de003",
        "re024"
      ],
      "equip": [
        {
          "slot": "weapon",
          "rarity": 2
        },
        {
          "slot": "armor",
          "rarity": 2
        },
        {
          "slot": "accessory",
          "rarity": 2
        }
      ]
    }
  },
  {
    "ch": 45,
    "volume": 5,
    "volumeName": "第五卷·至尊骨血",
    "inspiredBy": "《完美世界》",
    "realmName": "金丹境",
    "tier": 3,
    "tierName": "地阶",
    "rarity": 2,
    "rarityName": "宝品",
    "title": "补天遗术",
    "plot": "得补天遗术，续道基。",
    "levels": [
      380,
      399,
      418,
      437,
      456,
      475,
      494,
      513,
      532,
      827
    ],
    "reward": {
      "skills": [
        "at031",
        "at052",
        "de059"
      ],
      "equip": [
        {
          "slot": "armor",
          "rarity": 2
        },
        {
          "slot": "accessory",
          "rarity": 2
        },
        {
          "slot": "boots",
          "rarity": 2
        }
      ]
    }
  },
  {
    "ch": 46,
    "volume": 5,
    "volumeName": "第五卷·至尊骨血",
    "inspiredBy": "《完美世界》",
    "realmName": "金丹境",
    "tier": 4,
    "tierName": "天阶",
    "rarity": 2,
    "rarityName": "宝品",
    "title": "群雄并起",
    "plot": "群雄并起，乱世将启。",
    "levels": [
      388,
      407,
      427,
      446,
      466,
      485,
      504,
      524,
      543,
      845
    ],
    "reward": {
      "skills": [
        "at081",
        "bu088",
        "re095"
      ],
      "equip": [
        {
          "slot": "accessory",
          "rarity": 2
        },
        {
          "slot": "boots",
          "rarity": 2
        },
        {
          "slot": "weapon",
          "rarity": 2
        }
      ]
    }
  },
  {
    "ch": 47,
    "volume": 5,
    "volumeName": "第五卷·至尊骨血",
    "inspiredBy": "《完美世界》",
    "realmName": "金丹境",
    "tier": 4,
    "tierName": "天阶",
    "rarity": 2,
    "rarityName": "宝品",
    "title": "凶巢试炼",
    "plot": "凶巢试炼，九死一生。",
    "levels": [
      396,
      416,
      436,
      455,
      475,
      495,
      515,
      535,
      554,
      861
    ],
    "reward": {
      "skills": [
        "de109",
        "bu116",
        "de123"
      ],
      "equip": [
        {
          "slot": "boots",
          "rarity": 2
        },
        {
          "slot": "weapon",
          "rarity": 2
        },
        {
          "slot": "armor",
          "rarity": 2
        }
      ]
    }
  },
  {
    "ch": 48,
    "volume": 5,
    "volumeName": "第五卷·至尊骨血",
    "inspiredBy": "《完美世界》",
    "realmName": "金丹境",
    "tier": 4,
    "tierName": "天阶",
    "rarity": 2,
    "rarityName": "宝品",
    "title": "真血觉醒",
    "plot": "真血觉醒，威压同辈。",
    "levels": [
      404,
      424,
      444,
      465,
      485,
      505,
      525,
      545,
      566,
      879
    ],
    "reward": {
      "skills": [
        "bu018",
        "bu046",
        "re074"
      ],
      "equip": [
        {
          "slot": "weapon",
          "rarity": 2
        },
        {
          "slot": "armor",
          "rarity": 2
        },
        {
          "slot": "accessory",
          "rarity": 2
        }
      ]
    }
  },
  {
    "ch": 49,
    "volume": 5,
    "volumeName": "第五卷·至尊骨血",
    "inspiredBy": "《完美世界》",
    "realmName": "金丹境",
    "tier": 4,
    "tierName": "天阶",
    "rarity": 2,
    "rarityName": "宝品",
    "title": "上界来客",
    "plot": "上界来客，引动风波。",
    "levels": [
      412,
      433,
      453,
      474,
      494,
      515,
      536,
      556,
      577,
      896
    ],
    "reward": {
      "skills": [
        "at102",
        "sp130",
        "at011"
      ],
      "equip": [
        {
          "slot": "armor",
          "rarity": 2
        },
        {
          "slot": "accessory",
          "rarity": 2
        },
        {
          "slot": "boots",
          "rarity": 2
        }
      ]
    }
  },
  {
    "ch": 50,
    "volume": 5,
    "volumeName": "第五卷·至尊骨血",
    "inspiredBy": "《完美世界》",
    "realmName": "金丹境",
    "tier": 4,
    "tierName": "天阶",
    "rarity": 2,
    "rarityName": "宝品",
    "title": "骨血重光",
    "plot": "骨血重光，金丹凝成。",
    "levels": [
      420,
      441,
      462,
      483,
      504,
      525,
      546,
      567,
      588,
      914
    ],
    "reward": {
      "skills": [
        "re025",
        "at032",
        "de039"
      ],
      "equip": [
        {
          "slot": "accessory",
          "rarity": 2
        },
        {
          "slot": "boots",
          "rarity": 2
        },
        {
          "slot": "weapon",
          "rarity": 2
        }
      ]
    }
  },
  {
    "ch": 51,
    "volume": 6,
    "volumeName": "第六卷·山海封天",
    "inspiredBy": "《我欲封天》",
    "realmName": "元婴境",
    "tier": 4,
    "tierName": "天阶",
    "rarity": 2,
    "rarityName": "宝品",
    "title": "山海初临",
    "plot": "初临山海界，弱肉强食。",
    "levels": [
      428,
      449,
      471,
      492,
      514,
      535,
      556,
      578,
      599,
      932
    ],
    "reward": {
      "skills": [
        "de053",
        "sp060",
        "bu067"
      ],
      "equip": [
        {
          "slot": "boots",
          "rarity": 2
        },
        {
          "slot": "weapon",
          "rarity": 2
        },
        {
          "slot": "armor",
          "rarity": 2
        }
      ]
    }
  },
  {
    "ch": 52,
    "volume": 6,
    "volumeName": "第六卷·山海封天",
    "inspiredBy": "《我欲封天》",
    "realmName": "元婴境",
    "tier": 4,
    "tierName": "天阶",
    "rarity": 2,
    "rarityName": "宝品",
    "title": "血仙之路",
    "plot": "走血仙之路，以战养战。",
    "levels": [
      436,
      458,
      480,
      501,
      523,
      545,
      567,
      589,
      610,
      948
    ],
    "reward": {
      "skills": [
        "at081",
        "bu088",
        "re095"
      ],
      "equip": [
        {
          "slot": "weapon",
          "rarity": 2
        },
        {
          "slot": "armor",
          "rarity": 2
        },
        {
          "slot": "accessory",
          "rarity": 2
        }
      ]
    }
  },
  {
    "ch": 53,
    "volume": 6,
    "volumeName": "第六卷·山海封天",
    "inspiredBy": "《我欲封天》",
    "realmName": "元婴境",
    "tier": 4,
    "tierName": "天阶",
    "rarity": 2,
    "rarityName": "宝品",
    "title": "封天古印",
    "plot": "得封天古印，镇一方。",
    "levels": [
      444,
      466,
      488,
      511,
      533,
      555,
      577,
      599,
      622,
      966
    ],
    "reward": {
      "skills": [
        "de109",
        "bu116",
        "de123"
      ],
      "equip": [
        {
          "slot": "armor",
          "rarity": 2
        },
        {
          "slot": "accessory",
          "rarity": 2
        },
        {
          "slot": "boots",
          "rarity": 2
        }
      ]
    }
  },
  {
    "ch": 54,
    "volume": 6,
    "volumeName": "第六卷·山海封天",
    "inspiredBy": "《我欲封天》",
    "realmName": "元婴境",
    "tier": 4,
    "tierName": "天阶",
    "rarity": 2,
    "rarityName": "宝品",
    "title": "逆乱阴阳",
    "plot": "逆乱阴阳，夺造化。",
    "levels": [
      452,
      475,
      497,
      520,
      542,
      565,
      588,
      610,
      633,
      983
    ],
    "reward": {
      "skills": [
        "bu018",
        "bu046",
        "re074"
      ],
      "equip": [
        {
          "slot": "accessory",
          "rarity": 2
        },
        {
          "slot": "boots",
          "rarity": 2
        },
        {
          "slot": "weapon",
          "rarity": 2
        }
      ]
    }
  },
  {
    "ch": 55,
    "volume": 6,
    "volumeName": "第六卷·山海封天",
    "inspiredBy": "《我欲封天》",
    "realmName": "元婴境",
    "tier": 4,
    "tierName": "天阶",
    "rarity": 2,
    "rarityName": "宝品",
    "title": "妖族盟约",
    "plot": "与妖族立盟约，共御外。",
    "levels": [
      460,
      483,
      506,
      529,
      552,
      575,
      598,
      621,
      644,
      1001
    ],
    "reward": {
      "skills": [
        "at102",
        "sp130",
        "at011"
      ],
      "equip": [
        {
          "slot": "boots",
          "rarity": 2
        },
        {
          "slot": "weapon",
          "rarity": 2
        },
        {
          "slot": "armor",
          "rarity": 2
        }
      ]
    }
  },
  {
    "ch": 56,
    "volume": 6,
    "volumeName": "第六卷·山海封天",
    "inspiredBy": "《我欲封天》",
    "realmName": "元婴境",
    "tier": 4,
    "tierName": "天阶",
    "rarity": 2,
    "rarityName": "宝品",
    "title": "域内争雄",
    "plot": "域内争雄，逐鹿山海。",
    "levels": [
      468,
      491,
      515,
      538,
      562,
      585,
      608,
      632,
      655,
      1019
    ],
    "reward": {
      "skills": [
        "re025",
        "at032",
        "de039"
      ],
      "equip": [
        {
          "slot": "weapon",
          "rarity": 2
        },
        {
          "slot": "armor",
          "rarity": 2
        },
        {
          "slot": "accessory",
          "rarity": 2
        }
      ]
    }
  },
  {
    "ch": 57,
    "volume": 6,
    "volumeName": "第六卷·山海封天",
    "inspiredBy": "《我欲封天》",
    "realmName": "元婴境",
    "tier": 4,
    "tierName": "天阶",
    "rarity": 2,
    "rarityName": "宝品",
    "title": "镜花水月",
    "plot": "镜花水月，辨虚妄。",
    "levels": [
      476,
      500,
      524,
      547,
      571,
      595,
      619,
      643,
      666,
      1035
    ],
    "reward": {
      "skills": [
        "de053",
        "sp060",
        "bu067"
      ],
      "equip": [
        {
          "slot": "armor",
          "rarity": 2
        },
        {
          "slot": "accessory",
          "rarity": 2
        },
        {
          "slot": "boots",
          "rarity": 2
        }
      ]
    }
  },
  {
    "ch": 58,
    "volume": 6,
    "volumeName": "第六卷·山海封天",
    "inspiredBy": "《我欲封天》",
    "realmName": "元婴境",
    "tier": 4,
    "tierName": "天阶",
    "rarity": 2,
    "rarityName": "宝品",
    "title": "夺天之谋",
    "plot": "夺天之谋，布局深远。",
    "levels": [
      484,
      508,
      532,
      557,
      581,
      605,
      629,
      653,
      678,
      1053
    ],
    "reward": {
      "skills": [
        "at081",
        "bu088",
        "re095"
      ],
      "equip": [
        {
          "slot": "accessory",
          "rarity": 2
        },
        {
          "slot": "boots",
          "rarity": 2
        },
        {
          "slot": "weapon",
          "rarity": 2
        }
      ]
    }
  },
  {
    "ch": 59,
    "volume": 6,
    "volumeName": "第六卷·山海封天",
    "inspiredBy": "《我欲封天》",
    "realmName": "元婴境",
    "tier": 4,
    "tierName": "天阶",
    "rarity": 2,
    "rarityName": "宝品",
    "title": "山海崩塌",
    "plot": "山海崩塌，逃出生天。",
    "levels": [
      492,
      517,
      541,
      566,
      590,
      615,
      640,
      664,
      689,
      1070
    ],
    "reward": {
      "skills": [
        "de109",
        "bu116",
        "de123"
      ],
      "equip": [
        {
          "slot": "boots",
          "rarity": 2
        },
        {
          "slot": "weapon",
          "rarity": 2
        },
        {
          "slot": "armor",
          "rarity": 2
        }
      ]
    }
  },
  {
    "ch": 60,
    "volume": 6,
    "volumeName": "第六卷·山海封天",
    "inspiredBy": "《我欲封天》",
    "realmName": "元婴境",
    "tier": 4,
    "tierName": "天阶",
    "rarity": 3,
    "rarityName": "仙品",
    "title": "封天一念",
    "plot": "封天一念，元婴成。",
    "levels": [
      500,
      525,
      550,
      575,
      600,
      625,
      650,
      675,
      700,
      1088
    ],
    "reward": {
      "skills": [
        "bu018",
        "bu046",
        "re074"
      ],
      "equip": [
        {
          "slot": "weapon",
          "rarity": 3
        },
        {
          "slot": "armor",
          "rarity": 3
        },
        {
          "slot": "accessory",
          "rarity": 3
        }
      ]
    }
  },
  {
    "ch": 61,
    "volume": 7,
    "volumeName": "第七卷·诡道双生",
    "inspiredBy": "《道诡异仙》",
    "realmName": "出窍境",
    "tier": 5,
    "tierName": "王阶",
    "rarity": 3,
    "rarityName": "仙品",
    "title": "虚实之门",
    "plot": "虚实之门开，两界交错。",
    "levels": [
      508,
      533,
      559,
      584,
      610,
      635,
      660,
      686,
      711,
      1106
    ],
    "reward": {
      "skills": [
        "bu026",
        "de033",
        "sp040"
      ],
      "equip": [
        {
          "slot": "armor",
          "rarity": 3
        },
        {
          "slot": "accessory",
          "rarity": 3
        },
        {
          "slot": "boots",
          "rarity": 3
        }
      ]
    }
  },
  {
    "ch": 62,
    "volume": 7,
    "volumeName": "第七卷·诡道双生",
    "inspiredBy": "《道诡异仙》",
    "realmName": "出窍境",
    "tier": 5,
    "tierName": "王阶",
    "rarity": 3,
    "rarityName": "仙品",
    "title": "坐忘问道",
    "plot": "坐忘问道，忘我忘物。",
    "levels": [
      516,
      542,
      568,
      593,
      619,
      645,
      671,
      697,
      722,
      1122
    ],
    "reward": {
      "skills": [
        "bu047",
        "re054",
        "at061"
      ],
      "equip": [
        {
          "slot": "accessory",
          "rarity": 3
        },
        {
          "slot": "boots",
          "rarity": 3
        },
        {
          "slot": "weapon",
          "rarity": 3
        }
      ]
    }
  },
  {
    "ch": 63,
    "volume": 7,
    "volumeName": "第七卷·诡道双生",
    "inspiredBy": "《道诡异仙》",
    "realmName": "出窍境",
    "tier": 5,
    "tierName": "王阶",
    "rarity": 3,
    "rarityName": "仙品",
    "title": "神佛妖邪",
    "plot": "神佛妖邪难辨，诡道起。",
    "levels": [
      524,
      550,
      576,
      603,
      629,
      655,
      681,
      707,
      734,
      1140
    ],
    "reward": {
      "skills": [
        "bu068",
        "re075",
        "at082"
      ],
      "equip": [
        {
          "slot": "boots",
          "rarity": 3
        },
        {
          "slot": "weapon",
          "rarity": 3
        },
        {
          "slot": "armor",
          "rarity": 3
        }
      ]
    }
  },
  {
    "ch": 64,
    "volume": 7,
    "volumeName": "第七卷·诡道双生",
    "inspiredBy": "《道诡异仙》",
    "realmName": "出窍境",
    "tier": 5,
    "tierName": "王阶",
    "rarity": 3,
    "rarityName": "仙品",
    "title": "纸人夜行",
    "plot": "纸人夜行，诡域横生。",
    "levels": [
      532,
      559,
      585,
      612,
      638,
      665,
      692,
      718,
      745,
      1157
    ],
    "reward": {
      "skills": [
        "de089",
        "bu096",
        "de103"
      ],
      "equip": [
        {
          "slot": "weapon",
          "rarity": 3
        },
        {
          "slot": "armor",
          "rarity": 3
        },
        {
          "slot": "accessory",
          "rarity": 3
        }
      ]
    }
  },
  {
    "ch": 65,
    "volume": 7,
    "volumeName": "第七卷·诡道双生",
    "inspiredBy": "《道诡异仙》",
    "realmName": "出窍境",
    "tier": 5,
    "tierName": "王阶",
    "rarity": 3,
    "rarityName": "仙品",
    "title": "诡修之劫",
    "plot": "诡修之劫，几近癫狂。",
    "levels": [
      540,
      567,
      594,
      621,
      648,
      675,
      702,
      729,
      756,
      1175
    ],
    "reward": {
      "skills": [
        "sp110",
        "bu117",
        "re124"
      ],
      "equip": [
        {
          "slot": "armor",
          "rarity": 3
        },
        {
          "slot": "accessory",
          "rarity": 3
        },
        {
          "slot": "boots",
          "rarity": 3
        }
      ]
    }
  },
  {
    "ch": 66,
    "volume": 7,
    "volumeName": "第七卷·诡道双生",
    "inspiredBy": "《道诡异仙》",
    "realmName": "出窍境",
    "tier": 5,
    "tierName": "王阶",
    "rarity": 3,
    "rarityName": "仙品",
    "title": "妄心炼真",
    "plot": "妄心炼真，守一丝清明。",
    "levels": [
      548,
      575,
      603,
      630,
      658,
      685,
      712,
      740,
      767,
      1193
    ],
    "reward": {
      "skills": [
        "re005",
        "at012",
        "de019"
      ],
      "equip": [
        {
          "slot": "accessory",
          "rarity": 3
        },
        {
          "slot": "boots",
          "rarity": 3
        },
        {
          "slot": "weapon",
          "rarity": 3
        }
      ]
    }
  },
  {
    "ch": 67,
    "volume": 7,
    "volumeName": "第七卷·诡道双生",
    "inspiredBy": "《道诡异仙》",
    "realmName": "出窍境",
    "tier": 5,
    "tierName": "王阶",
    "rarity": 3,
    "rarityName": "仙品",
    "title": "双界交错",
    "plot": "双界重叠，难分真幻。",
    "levels": [
      556,
      584,
      612,
      639,
      667,
      695,
      723,
      751,
      778,
      1209
    ],
    "reward": {
      "skills": [
        "bu026",
        "de033",
        "sp040"
      ],
      "equip": [
        {
          "slot": "boots",
          "rarity": 3
        },
        {
          "slot": "weapon",
          "rarity": 3
        },
        {
          "slot": "armor",
          "rarity": 3
        }
      ]
    }
  },
  {
    "ch": 68,
    "volume": 7,
    "volumeName": "第七卷·诡道双生",
    "inspiredBy": "《道诡异仙》",
    "realmName": "出窍境",
    "tier": 5,
    "tierName": "王阶",
    "rarity": 3,
    "rarityName": "仙品",
    "title": "癫狂一剑",
    "plot": "癫狂中斩出清醒一剑。",
    "levels": [
      564,
      592,
      620,
      649,
      677,
      705,
      733,
      761,
      790,
      1227
    ],
    "reward": {
      "skills": [
        "bu047",
        "re054",
        "at061"
      ],
      "equip": [
        {
          "slot": "weapon",
          "rarity": 3
        },
        {
          "slot": "armor",
          "rarity": 3
        },
        {
          "slot": "accessory",
          "rarity": 3
        }
      ]
    }
  },
  {
    "ch": 69,
    "volume": 7,
    "volumeName": "第七卷·诡道双生",
    "inspiredBy": "《道诡异仙》",
    "realmName": "出窍境",
    "tier": 5,
    "tierName": "王阶",
    "rarity": 3,
    "rarityName": "仙品",
    "title": "诡道归一",
    "plot": "诡道归一，神通自成。",
    "levels": [
      572,
      601,
      629,
      658,
      686,
      715,
      744,
      772,
      801,
      1244
    ],
    "reward": {
      "skills": [
        "bu068",
        "re075",
        "at082"
      ],
      "equip": [
        {
          "slot": "armor",
          "rarity": 3
        },
        {
          "slot": "accessory",
          "rarity": 3
        },
        {
          "slot": "boots",
          "rarity": 3
        }
      ]
    }
  },
  {
    "ch": 70,
    "volume": 7,
    "volumeName": "第七卷·诡道双生",
    "inspiredBy": "《道诡异仙》",
    "realmName": "出窍境",
    "tier": 5,
    "tierName": "王阶",
    "rarity": 3,
    "rarityName": "仙品",
    "title": "清醒归来",
    "plot": "清醒归来，出窍可期。",
    "levels": [
      580,
      609,
      638,
      667,
      696,
      725,
      754,
      783,
      812,
      1262
    ],
    "reward": {
      "skills": [
        "de089",
        "bu096",
        "de103"
      ],
      "equip": [
        {
          "slot": "accessory",
          "rarity": 3
        },
        {
          "slot": "boots",
          "rarity": 3
        },
        {
          "slot": "weapon",
          "rarity": 3
        }
      ]
    }
  },
  {
    "ch": 71,
    "volume": 8,
    "volumeName": "第八卷·赤心巡天",
    "inspiredBy": "《赤心巡天》",
    "realmName": "破虚境",
    "tier": 5,
    "tierName": "王阶",
    "rarity": 3,
    "rarityName": "仙品",
    "title": "六国烽烟",
    "plot": "六国烽烟起，乱世将至。",
    "levels": [
      588,
      617,
      647,
      676,
      706,
      735,
      764,
      794,
      823,
      1280
    ],
    "reward": {
      "skills": [
        "sp110",
        "bu117",
        "re124"
      ],
      "equip": [
        {
          "slot": "boots",
          "rarity": 3
        },
        {
          "slot": "weapon",
          "rarity": 3
        },
        {
          "slot": "armor",
          "rarity": 3
        }
      ]
    }
  },
  {
    "ch": 72,
    "volume": 8,
    "volumeName": "第八卷·赤心巡天",
    "inspiredBy": "《赤心巡天》",
    "realmName": "破虚境",
    "tier": 5,
    "tierName": "王阶",
    "rarity": 3,
    "rarityName": "仙品",
    "title": "龙族秘史",
    "plot": "龙族秘史现，惊天下。",
    "levels": [
      596,
      626,
      656,
      685,
      715,
      745,
      775,
      805,
      834,
      1296
    ],
    "reward": {
      "skills": [
        "re005",
        "at012",
        "de019"
      ],
      "equip": [
        {
          "slot": "weapon",
          "rarity": 3
        },
        {
          "slot": "armor",
          "rarity": 3
        },
        {
          "slot": "accessory",
          "rarity": 3
        }
      ]
    }
  },
  {
    "ch": 73,
    "volume": 8,
    "volumeName": "第八卷·赤心巡天",
    "inspiredBy": "《赤心巡天》",
    "realmName": "破虚境",
    "tier": 5,
    "tierName": "王阶",
    "rarity": 3,
    "rarityName": "仙品",
    "title": "巡天之誓",
    "plot": "立巡天之誓，守苍生。",
    "levels": [
      604,
      634,
      664,
      695,
      725,
      755,
      785,
      815,
      846,
      1314
    ],
    "reward": {
      "skills": [
        "bu026",
        "de033",
        "sp040"
      ],
      "equip": [
        {
          "slot": "armor",
          "rarity": 3
        },
        {
          "slot": "accessory",
          "rarity": 3
        },
        {
          "slot": "boots",
          "rarity": 3
        }
      ]
    }
  },
  {
    "ch": 74,
    "volume": 8,
    "volumeName": "第八卷·赤心巡天",
    "inspiredBy": "《赤心巡天》",
    "realmName": "破虚境",
    "tier": 5,
    "tierName": "王阶",
    "rarity": 3,
    "rarityName": "仙品",
    "title": "赤心不昧",
    "plot": "赤心不昧，邪正难分。",
    "levels": [
      612,
      643,
      673,
      704,
      734,
      765,
      796,
      826,
      857,
      1331
    ],
    "reward": {
      "skills": [
        "bu047",
        "re054",
        "at061"
      ],
      "equip": [
        {
          "slot": "accessory",
          "rarity": 3
        },
        {
          "slot": "boots",
          "rarity": 3
        },
        {
          "slot": "weapon",
          "rarity": 3
        }
      ]
    }
  },
  {
    "ch": 75,
    "volume": 8,
    "volumeName": "第八卷·赤心巡天",
    "inspiredBy": "《赤心巡天》",
    "realmName": "破虚境",
    "tier": 5,
    "tierName": "王阶",
    "rarity": 3,
    "rarityName": "仙品",
    "title": "众生取舍",
    "plot": "众生取舍，道义两难。",
    "levels": [
      620,
      651,
      682,
      713,
      744,
      775,
      806,
      837,
      868,
      1349
    ],
    "reward": {
      "skills": [
        "bu068",
        "re075",
        "at082"
      ],
      "equip": [
        {
          "slot": "boots",
          "rarity": 3
        },
        {
          "slot": "weapon",
          "rarity": 3
        },
        {
          "slot": "armor",
          "rarity": 3
        }
      ]
    }
  },
  {
    "ch": 76,
    "volume": 8,
    "volumeName": "第八卷·赤心巡天",
    "inspiredBy": "《赤心巡天》",
    "realmName": "破虚境",
    "tier": 6,
    "tierName": "皇阶",
    "rarity": 3,
    "rarityName": "仙品",
    "title": "朝堂诡局",
    "plot": "朝堂诡局，谋算无声。",
    "levels": [
      628,
      659,
      691,
      722,
      754,
      785,
      816,
      848,
      879,
      1367
    ],
    "reward": {
      "skills": [
        "bu076",
        "sp090",
        "bu097"
      ],
      "equip": [
        {
          "slot": "weapon",
          "rarity": 3
        },
        {
          "slot": "armor",
          "rarity": 3
        },
        {
          "slot": "accessory",
          "rarity": 3
        }
      ]
    }
  },
  {
    "ch": 77,
    "volume": 8,
    "volumeName": "第八卷·赤心巡天",
    "inspiredBy": "《赤心巡天》",
    "realmName": "破虚境",
    "tier": 6,
    "tierName": "皇阶",
    "rarity": 3,
    "rarityName": "仙品",
    "title": "妖界战场",
    "plot": "妖界战场，血染山河。",
    "levels": [
      636,
      668,
      700,
      731,
      763,
      795,
      827,
      859,
      890,
      1383
    ],
    "reward": {
      "skills": [
        "re104",
        "bu118",
        "re125"
      ],
      "equip": [
        {
          "slot": "armor",
          "rarity": 3
        },
        {
          "slot": "accessory",
          "rarity": 3
        },
        {
          "slot": "boots",
          "rarity": 3
        }
      ]
    }
  },
  {
    "ch": 78,
    "volume": 8,
    "volumeName": "第八卷·赤心巡天",
    "inspiredBy": "《赤心巡天》",
    "realmName": "破虚境",
    "tier": 6,
    "tierName": "皇阶",
    "rarity": 3,
    "rarityName": "仙品",
    "title": "神道余烬",
    "plot": "神道余烬，承遗志。",
    "levels": [
      644,
      676,
      708,
      741,
      773,
      805,
      837,
      869,
      902,
      1401
    ],
    "reward": {
      "skills": [
        "bu027",
        "re055",
        "de083"
      ],
      "equip": [
        {
          "slot": "accessory",
          "rarity": 3
        },
        {
          "slot": "boots",
          "rarity": 3
        },
        {
          "slot": "weapon",
          "rarity": 3
        }
      ]
    }
  },
  {
    "ch": 79,
    "volume": 8,
    "volumeName": "第八卷·赤心巡天",
    "inspiredBy": "《赤心巡天》",
    "realmName": "破虚境",
    "tier": 6,
    "tierName": "皇阶",
    "rarity": 3,
    "rarityName": "仙品",
    "title": "守心如一",
    "plot": "守心如一，不为所动。",
    "levels": [
      652,
      685,
      717,
      750,
      782,
      815,
      848,
      880,
      913,
      1418
    ],
    "reward": {
      "skills": [
        "at111",
        "bu006",
        "de013"
      ],
      "equip": [
        {
          "slot": "boots",
          "rarity": 3
        },
        {
          "slot": "weapon",
          "rarity": 3
        },
        {
          "slot": "armor",
          "rarity": 3
        }
      ]
    }
  },
  {
    "ch": 80,
    "volume": 8,
    "volumeName": "第八卷·赤心巡天",
    "inspiredBy": "《赤心巡天》",
    "realmName": "破虚境",
    "tier": 6,
    "tierName": "皇阶",
    "rarity": 3,
    "rarityName": "仙品",
    "title": "巡天终章",
    "plot": "巡天终章，破虚立。",
    "levels": [
      660,
      693,
      726,
      759,
      792,
      825,
      858,
      891,
      924,
      1436
    ],
    "reward": {
      "skills": [
        "sp020",
        "re034",
        "at041"
      ],
      "equip": [
        {
          "slot": "weapon",
          "rarity": 3
        },
        {
          "slot": "armor",
          "rarity": 3
        },
        {
          "slot": "accessory",
          "rarity": 3
        }
      ]
    }
  },
  {
    "ch": 81,
    "volume": 9,
    "volumeName": "第九卷·神道崩塌",
    "inspiredBy": "《择日飞升》",
    "realmName": "渡劫→超脱",
    "tier": 6,
    "tierName": "皇阶",
    "rarity": 3,
    "rarityName": "仙品",
    "title": "神像苏醒",
    "plot": "天下神像苏醒，香火乱。",
    "levels": [
      668,
      701,
      735,
      768,
      802,
      835,
      868,
      902,
      935,
      1454
    ],
    "reward": {
      "skills": [
        "bu048",
        "at062",
        "de069"
      ],
      "equip": [
        {
          "slot": "armor",
          "rarity": 3
        },
        {
          "slot": "accessory",
          "rarity": 3
        },
        {
          "slot": "boots",
          "rarity": 3
        }
      ]
    }
  },
  {
    "ch": 82,
    "volume": 9,
    "volumeName": "第九卷·神道崩塌",
    "inspiredBy": "《择日飞升》",
    "realmName": "渡劫→超脱",
    "tier": 6,
    "tierName": "皇阶",
    "rarity": 4,
    "rarityName": "神品",
    "title": "仙门虚伪",
    "plot": "仙门虚伪，漠视苍生。",
    "levels": [
      676,
      710,
      744,
      777,
      811,
      845,
      879,
      913,
      946,
      1470
    ],
    "reward": {
      "skills": [
        "bu076",
        "sp090",
        "bu097"
      ],
      "equip": [
        {
          "slot": "accessory",
          "rarity": 4
        },
        {
          "slot": "boots",
          "rarity": 4
        },
        {
          "slot": "weapon",
          "rarity": 4
        }
      ]
    }
  },
  {
    "ch": 83,
    "volume": 9,
    "volumeName": "第九卷·神道崩塌",
    "inspiredBy": "《择日飞升》",
    "realmName": "渡劫→超脱",
    "tier": 6,
    "tierName": "皇阶",
    "rarity": 4,
    "rarityName": "神品",
    "title": "弑神之刃",
    "plot": "铸弑神之刃，逆天行。",
    "levels": [
      684,
      718,
      752,
      787,
      821,
      855,
      889,
      923,
      958,
      1488
    ],
    "reward": {
      "skills": [
        "re104",
        "bu118",
        "re125"
      ],
      "equip": [
        {
          "slot": "boots",
          "rarity": 4
        },
        {
          "slot": "weapon",
          "rarity": 4
        },
        {
          "slot": "armor",
          "rarity": 4
        }
      ]
    }
  },
  {
    "ch": 84,
    "volume": 9,
    "volumeName": "第九卷·神道崩塌",
    "inspiredBy": "《择日飞升》",
    "realmName": "渡劫→超脱",
    "tier": 6,
    "tierName": "皇阶",
    "rarity": 4,
    "rarityName": "神品",
    "title": "新序初立",
    "plot": "新序初立，破旧制。",
    "levels": [
      692,
      727,
      761,
      796,
      830,
      865,
      900,
      934,
      969,
      1505
    ],
    "reward": {
      "skills": [
        "bu027",
        "re055",
        "de083"
      ],
      "equip": [
        {
          "slot": "weapon",
          "rarity": 4
        },
        {
          "slot": "armor",
          "rarity": 4
        },
        {
          "slot": "accessory",
          "rarity": 4
        }
      ]
    }
  },
  {
    "ch": 85,
    "volume": 9,
    "volumeName": "第九卷·神道崩塌",
    "inspiredBy": "《择日飞升》",
    "realmName": "渡劫→超脱",
    "tier": 6,
    "tierName": "皇阶",
    "rarity": 4,
    "rarityName": "神品",
    "title": "逆天改命",
    "plot": "逆天改命，抗命数。",
    "levels": [
      700,
      735,
      770,
      805,
      840,
      875,
      910,
      945,
      980,
      1523
    ],
    "reward": {
      "skills": [
        "at111",
        "bu006",
        "de013"
      ],
      "equip": [
        {
          "slot": "armor",
          "rarity": 4
        },
        {
          "slot": "accessory",
          "rarity": 4
        },
        {
          "slot": "boots",
          "rarity": 4
        }
      ]
    }
  },
  {
    "ch": 86,
    "volume": 9,
    "volumeName": "第九卷·神道崩塌",
    "inspiredBy": "《择日飞升》",
    "realmName": "渡劫→超脱",
    "tier": 6,
    "tierName": "皇阶",
    "rarity": 4,
    "rarityName": "神品",
    "title": "香火之争",
    "plot": "香火之争，神位易主。",
    "levels": [
      708,
      743,
      779,
      814,
      850,
      885,
      920,
      956,
      991,
      1541
    ],
    "reward": {
      "skills": [
        "sp020",
        "re034",
        "at041"
      ],
      "equip": [
        {
          "slot": "accessory",
          "rarity": 4
        },
        {
          "slot": "boots",
          "rarity": 4
        },
        {
          "slot": "weapon",
          "rarity": 4
        }
      ]
    }
  },
  {
    "ch": 87,
    "volume": 9,
    "volumeName": "第九卷·神道崩塌",
    "inspiredBy": "《择日飞升》",
    "realmName": "渡劫→超脱",
    "tier": 6,
    "tierName": "皇阶",
    "rarity": 4,
    "rarityName": "神品",
    "title": "神道崩塌",
    "plot": "神道崩塌，天地失序。",
    "levels": [
      716,
      752,
      788,
      823,
      859,
      895,
      931,
      967,
      1002,
      1557
    ],
    "reward": {
      "skills": [
        "bu048",
        "at062",
        "de069"
      ],
      "equip": [
        {
          "slot": "boots",
          "rarity": 4
        },
        {
          "slot": "weapon",
          "rarity": 4
        },
        {
          "slot": "armor",
          "rarity": 4
        }
      ]
    }
  },
  {
    "ch": 88,
    "volume": 9,
    "volumeName": "第九卷·神道崩塌",
    "inspiredBy": "《择日飞升》",
    "realmName": "渡劫→超脱",
    "tier": 6,
    "tierName": "皇阶",
    "rarity": 4,
    "rarityName": "神品",
    "title": "轮回重铸",
    "plot": "轮回重铸，续生机。",
    "levels": [
      724,
      760,
      796,
      833,
      869,
      905,
      941,
      977,
      1014,
      1575
    ],
    "reward": {
      "skills": [
        "bu076",
        "sp090",
        "bu097"
      ],
      "equip": [
        {
          "slot": "weapon",
          "rarity": 4
        },
        {
          "slot": "armor",
          "rarity": 4
        },
        {
          "slot": "accessory",
          "rarity": 4
        }
      ]
    }
  },
  {
    "ch": 89,
    "volume": 9,
    "volumeName": "第九卷·神道崩塌",
    "inspiredBy": "《择日飞升》",
    "realmName": "渡劫→超脱",
    "tier": 7,
    "tierName": "帝阶",
    "rarity": 4,
    "rarityName": "神品",
    "title": "超脱在望",
    "plot": "超脱在望，劫将至。",
    "levels": [
      732,
      769,
      805,
      842,
      878,
      915,
      952,
      988,
      1025,
      1592
    ],
    "reward": {
      "skills": [
        "at112",
        "de119",
        "bu126"
      ],
      "equip": [
        {
          "slot": "armor",
          "rarity": 4
        },
        {
          "slot": "accessory",
          "rarity": 4
        },
        {
          "slot": "boots",
          "rarity": 4
        }
      ]
    }
  },
  {
    "ch": 90,
    "volume": 9,
    "volumeName": "第九卷·神道崩塌",
    "inspiredBy": "《择日飞升》",
    "realmName": "渡劫→超脱",
    "tier": 7,
    "tierName": "帝阶",
    "rarity": 4,
    "rarityName": "神品",
    "title": "弑神封榜",
    "plot": "弑神封榜，立新规。",
    "levels": [
      740,
      777,
      814,
      851,
      888,
      925,
      962,
      999,
      1036,
      1610
    ],
    "reward": {
      "skills": [
        "bu007",
        "re014",
        "at021"
      ],
      "equip": [
        {
          "slot": "accessory",
          "rarity": 4
        },
        {
          "slot": "boots",
          "rarity": 4
        },
        {
          "slot": "weapon",
          "rarity": 4
        }
      ]
    }
  },
  {
    "ch": 91,
    "volume": 10,
    "volumeName": "第十卷·逆天封神",
    "inspiredBy": "《长生》+原创终局",
    "realmName": "超脱→仙帝",
    "tier": 7,
    "tierName": "帝阶",
    "rarity": 4,
    "rarityName": "神品",
    "title": "飞升在即",
    "plot": "飞升在即，天门开。",
    "levels": [
      748,
      785,
      823,
      860,
      898,
      935,
      972,
      1010,
      1047,
      1628
    ],
    "reward": {
      "skills": [
        "bu028",
        "re035",
        "at042"
      ],
      "equip": [
        {
          "slot": "boots",
          "rarity": 4
        },
        {
          "slot": "weapon",
          "rarity": 4
        },
        {
          "slot": "armor",
          "rarity": 4
        }
      ]
    }
  },
  {
    "ch": 92,
    "volume": 10,
    "volumeName": "第十卷·逆天封神",
    "inspiredBy": "《长生》+原创终局",
    "realmName": "超脱→仙帝",
    "tier": 7,
    "tierName": "帝阶",
    "rarity": 4,
    "rarityName": "神品",
    "title": "天道倾覆",
    "plot": "天道倾覆，秩序崩。",
    "levels": [
      756,
      794,
      832,
      869,
      907,
      945,
      983,
      1021,
      1058,
      1644
    ],
    "reward": {
      "skills": [
        "de049",
        "bu056",
        "de063"
      ],
      "equip": [
        {
          "slot": "weapon",
          "rarity": 4
        },
        {
          "slot": "armor",
          "rarity": 4
        },
        {
          "slot": "accessory",
          "rarity": 4
        }
      ]
    }
  },
  {
    "ch": 93,
    "volume": 10,
    "volumeName": "第十卷·逆天封神",
    "inspiredBy": "《长生》+原创终局",
    "realmName": "超脱→仙帝",
    "tier": 7,
    "tierName": "帝阶",
    "rarity": 4,
    "rarityName": "神品",
    "title": "以身为棋",
    "plot": "以身为棋，入局中。",
    "levels": [
      764,
      802,
      840,
      879,
      917,
      955,
      993,
      1031,
      1070,
      1662
    ],
    "reward": {
      "skills": [
        "sp070",
        "bu077",
        "re084"
      ],
      "equip": [
        {
          "slot": "armor",
          "rarity": 4
        },
        {
          "slot": "accessory",
          "rarity": 4
        },
        {
          "slot": "boots",
          "rarity": 4
        }
      ]
    }
  },
  {
    "ch": 94,
    "volume": 10,
    "volumeName": "第十卷·逆天封神",
    "inspiredBy": "《长生》+原创终局",
    "realmName": "超脱→仙帝",
    "tier": 7,
    "tierName": "帝阶",
    "rarity": 4,
    "rarityName": "神品",
    "title": "逆乱乾坤",
    "plot": "逆乱乾坤，夺天机。",
    "levels": [
      772,
      811,
      849,
      888,
      926,
      965,
      1004,
      1042,
      1081,
      1679
    ],
    "reward": {
      "skills": [
        "at091",
        "bu098",
        "re105"
      ],
      "equip": [
        {
          "slot": "accessory",
          "rarity": 4
        },
        {
          "slot": "boots",
          "rarity": 4
        },
        {
          "slot": "weapon",
          "rarity": 4
        }
      ]
    }
  },
  {
    "ch": 95,
    "volume": 10,
    "volumeName": "第十卷·逆天封神",
    "inspiredBy": "《长生》+原创终局",
    "realmName": "超脱→仙帝",
    "tier": 7,
    "tierName": "帝阶",
    "rarity": 4,
    "rarityName": "神品",
    "title": "仙帝遗册",
    "plot": "得仙帝遗册，窥终途。",
    "levels": [
      780,
      819,
      858,
      897,
      936,
      975,
      1014,
      1053,
      1092,
      1697
    ],
    "reward": {
      "skills": [
        "at112",
        "de119",
        "bu126"
      ],
      "equip": [
        {
          "slot": "boots",
          "rarity": 4
        },
        {
          "slot": "weapon",
          "rarity": 4
        },
        {
          "slot": "armor",
          "rarity": 4
        }
      ]
    }
  },
  {
    "ch": 96,
    "volume": 10,
    "volumeName": "第十卷·逆天封神",
    "inspiredBy": "《长生》+原创终局",
    "realmName": "超脱→仙帝",
    "tier": 7,
    "tierName": "帝阶",
    "rarity": 4,
    "rarityName": "神品",
    "title": "万界同悲",
    "plot": "万界同悲，劫火燎原。",
    "levels": [
      788,
      827,
      867,
      906,
      946,
      985,
      1024,
      1064,
      1103,
      1715
    ],
    "reward": {
      "skills": [
        "bu007",
        "re014",
        "at021"
      ],
      "equip": [
        {
          "slot": "weapon",
          "rarity": 4
        },
        {
          "slot": "armor",
          "rarity": 4
        },
        {
          "slot": "accessory",
          "rarity": 4
        }
      ]
    }
  },
  {
    "ch": 97,
    "volume": 10,
    "volumeName": "第十卷·逆天封神",
    "inspiredBy": "《长生》+原创终局",
    "realmName": "超脱→仙帝",
    "tier": 7,
    "tierName": "帝阶",
    "rarity": 4,
    "rarityName": "神品",
    "title": "封天之战",
    "plot": "封天之战，决生死。",
    "levels": [
      796,
      836,
      876,
      915,
      955,
      995,
      1035,
      1075,
      1114,
      1731
    ],
    "reward": {
      "skills": [
        "bu028",
        "re035",
        "at042"
      ],
      "equip": [
        {
          "slot": "armor",
          "rarity": 4
        },
        {
          "slot": "accessory",
          "rarity": 4
        },
        {
          "slot": "boots",
          "rarity": 4
        }
      ]
    }
  },
  {
    "ch": 98,
    "volume": 10,
    "volumeName": "第十卷·逆天封神",
    "inspiredBy": "《长生》+原创终局",
    "realmName": "超脱→仙帝",
    "tier": 7,
    "tierName": "帝阶",
    "rarity": 4,
    "rarityName": "神品",
    "title": "重立秩序",
    "plot": "重立秩序，定乾坤。",
    "levels": [
      804,
      844,
      884,
      925,
      965,
      1005,
      1045,
      1085,
      1126,
      1749
    ],
    "reward": {
      "skills": [
        "de049",
        "bu056",
        "de063"
      ],
      "equip": [
        {
          "slot": "accessory",
          "rarity": 4
        },
        {
          "slot": "boots",
          "rarity": 4
        },
        {
          "slot": "weapon",
          "rarity": 4
        }
      ]
    }
  },
  {
    "ch": 99,
    "volume": 10,
    "volumeName": "第十卷·逆天封神",
    "inspiredBy": "《长生》+原创终局",
    "realmName": "超脱→仙帝",
    "tier": 7,
    "tierName": "帝阶",
    "rarity": 4,
    "rarityName": "神品",
    "title": "我即天道",
    "plot": "我即天道，言出法随。",
    "levels": [
      812,
      853,
      893,
      934,
      974,
      1015,
      1056,
      1096,
      1137,
      1766
    ],
    "reward": {
      "skills": [
        "sp070",
        "bu077",
        "re084"
      ],
      "equip": [
        {
          "slot": "boots",
          "rarity": 4
        },
        {
          "slot": "weapon",
          "rarity": 4
        },
        {
          "slot": "armor",
          "rarity": 4
        }
      ]
    }
  },
  {
    "ch": 100,
    "volume": 10,
    "volumeName": "第十卷·逆天封神",
    "inspiredBy": "《长生》+原创终局",
    "realmName": "超脱→仙帝",
    "tier": 7,
    "tierName": "帝阶",
    "rarity": 4,
    "rarityName": "神品",
    "title": "逍遥封神",
    "plot": "逍遥封神，卷终。",
    "levels": [
      820,
      861,
      902,
      943,
      984,
      1025,
      1066,
      1107,
      1148,
      1784
    ],
    "reward": {
      "skills": [
        "at091",
        "bu098",
        "re105"
      ],
      "equip": [
        {
          "slot": "weapon",
          "rarity": 4
        },
        {
          "slot": "armor",
          "rarity": 4
        },
        {
          "slot": "accessory",
          "rarity": 4
        }
      ]
    }
  }
];

// 卷总览（便于 UI 直接渲染目录）
const STORY_VOLUMES = [
  {
    "vol": 1,
    "name": "第一卷·凡尘问道",
    "inspiredBy": "《凡人修仙传》",
    "realmName": "炼气境",
    "range": [
      1,
      10
    ]
  },
  {
    "vol": 2,
    "name": "第二卷·九龙渡厄",
    "inspiredBy": "《遮天》",
    "realmName": "筑基境",
    "range": [
      11,
      20
    ]
  },
  {
    "vol": 3,
    "name": "第三卷·古神遗秘",
    "inspiredBy": "《仙逆》",
    "realmName": "真武境",
    "range": [
      21,
      30
    ]
  },
  {
    "vol": 4,
    "name": "第四卷·异火重燃",
    "inspiredBy": "《斗破苍穹》",
    "realmName": "化海境",
    "range": [
      31,
      40
    ]
  },
  {
    "vol": 5,
    "name": "第五卷·至尊骨血",
    "inspiredBy": "《完美世界》",
    "realmName": "金丹境",
    "range": [
      41,
      50
    ]
  },
  {
    "vol": 6,
    "name": "第六卷·山海封天",
    "inspiredBy": "《我欲封天》",
    "realmName": "元婴境",
    "range": [
      51,
      60
    ]
  },
  {
    "vol": 7,
    "name": "第七卷·诡道双生",
    "inspiredBy": "《道诡异仙》",
    "realmName": "出窍境",
    "range": [
      61,
      70
    ]
  },
  {
    "vol": 8,
    "name": "第八卷·赤心巡天",
    "inspiredBy": "《赤心巡天》",
    "realmName": "破虚境",
    "range": [
      71,
      80
    ]
  },
  {
    "vol": 9,
    "name": "第九卷·神道崩塌",
    "inspiredBy": "《择日飞升》",
    "realmName": "渡劫→超脱",
    "range": [
      81,
      90
    ]
  },
  {
    "vol": 10,
    "name": "第十卷·逆天封神",
    "inspiredBy": "《长生》+原创终局",
    "realmName": "超脱→仙帝",
    "range": [
      91,
      100
    ]
  }
];

// 查表：ch -> chapter 对象
const STORY_BY_CH = (function () { var m = {}; for (var i = 0; i < STORY_CHAPTERS.length; i++) m[STORY_CHAPTERS[i].ch] = STORY_CHAPTERS[i]; return m; })();
if (typeof module !== "undefined") module.exports = { STORY_CHAPTERS, STORY_VOLUMES, STORY_BY_CH };
