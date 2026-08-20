# -*- coding: utf-8 -*-
# 生成《逍遥仙》功法数据库 js/skills-data.js
# 名称改编自《一剑霸天》（永夜星河/番茄小说）武学词根 + 武侠通用词根，规避抄袭。
# 斗模型沿用现有 battle.js 的 damage()：物理用 atk/def(×0.5)，精神用 spiAtk/spiDef(×0.5)，暴击15%×1.5。
import json, math

# ---------- 词根（改编标注来源 = 防抄袭证据） ----------
# 取自《一剑霸天》的武学名词，已做字眼改编（如 北苍→玄霜、飞血→残血、神灭→寂灭）
SIGNATURE = {
    '玄霜': '改编自《一剑霸天》北苍剑术（原分《虚影》主速/《雷火》主威/《山海》主防三卷）',
    '残血': '改编自《一剑霸天》飞血剑术',
    '落雪': '改编自《一剑霸天》飘雪剑术',
    '混元': '改编自《一剑霸天》混元剑诀',
    '裂岳': '改编自《一剑霸天》破山剑术',
    '千影': '改编自《一剑霸天》千叶幻身',
    '寂灭': '改编自《一剑霸天》禁术·神灭',
    '摄魂': '改编自《一剑霸天》天赋神通·威慑',
    '惊鸿': '改编自《一剑霸天》北苍剑术·虚影卷二式「弄影」',
    '星陨': '改编自《一剑霸天》秘技·星月流光',
    '不灭': '改编自《一剑霸天》不灭秘术',
    '湮空': '改编自《一剑霸天》涅空杀',
    '焚天': '改编自《一剑霸天》灭世神光 / 原始之焰',
    '星潢': '改编自《一剑霸天》星辰磨盘（星河→星潢）',
    '寒光': '改编自《一剑霸天》一剑寒光十九州',
    '孤鸿': '改编自《一剑霸天》一剑飘飞',
    '血影': '改编自《一剑霸天》血影魔神',
    '幽冥': '改编自《一剑霸天》暗天魔狱',
    '九幽': '改编自《一剑霸天》黄泉空间',
    '剑意': '改编自《一剑霸天》剑意九重（→九霄）',
    '炎东': '改编自《一剑霸天》焱东河（焱→炎，避同名）',
    '太初': '改编自《一剑霸天》原始之焰',
    '赤炎': '改编自《一剑霸天》苍炎 / 黑炎',
    '寒渊': '改编自《一剑霸天》冰河（→寒渊）',
    '紫霄': '改编自《一剑霸天》雷霆（→紫霄神雷）',
    '玄黄': '改编自《一剑霸天》山海卷（防御向）',
}

# 通用武侠词根（原创，无原著对应）
GENERIC_ROOTS = [
    '太虚','青莲','乾元','坤元','两仪','四象','八卦','周天','北斗','南明',
    '离火','坎水','巽风','震雷','艮山','兑泽','混沌','鸿蒙','苍穹','凌霄',
    '血河','流光','罡风','冰魄','残阳','碧落','黄泉','九天','无相','轮回',
    '天罡','地煞','破军','贪狼','紫微','玄武','朱雀','青龙','白虎','玄龟',
    '惊雷','寒霜','烈阳','清风','明月','长风','断空','碎虚','踏星','吞日',
    '逆鳞','焚海','裂空','镇魂','绝影','破晓','问天','听雪','御剑','擒龙',
]

# ---------- 各类型后缀（决定功法"长相"） ----------
SUFFIX = {
    'attack_phys': ['剑诀','剑式','拳罡','刀决','戟法','枪芒','掌印','指法'],
    'attack_spirit': ['神识','咒','魂印','真言','念力','灵爆','心剑','幻音'],
    'defense': ['护体神功','玄甲诀','不灭身','金钟罩','龟息术','罡气','护身符','守元功'],
    'recover_hp': ['回春诀','疗伤术','生肌法','续命篇','长春功','养血录','复元诀','甘露术'],
    'recover_mp': ['聚灵诀','回蓝术','养神篇','凝灵法','汇灵录','补天诀','灵泉术','醒神咒'],
    'buff_atk': ['破军式','贪狼诀','狂战罡','焚血术','杀伐印','罡风诀','战意篇','血怒法'],
    'buff_spd': ['神行诀','疾影术','踏风篇','流光法','电光决','惊鸿步','追星录','风身咒'],
    'buff_def': ['玄黄诀','磐石术','镇岳篇','铁壁法','山岳录','不动印','金刚咒','守元诀'],
    'debuff': ['摄魂咒','乱神术','蚀骨诀','封脉印','断筋法','迷魂篇','衰神录','弱元咒'],
    'special': ['禁典','无相劫','湮灭指','轮回印','逆乱诀','灭世光','天魔身','混沌劫'],
}

SCHOOLS = list(SUFFIX.keys())
SCHOOL_CN = {
    'attack_phys': '攻击·物理', 'attack_spirit': '攻击·精神', 'defense': '防御·护体',
    'recover_hp': '恢复·气血', 'recover_mp': '恢复·灵力', 'buff_atk': '增益·攻击',
    'buff_spd': '增益·速度', 'buff_def': '增益·防御', 'debuff': '减益·敌方',
    'special': '特殊·复合',
}

# ---------- 阶位 → 数值框架（含 rationale） ----------
# 单场战斗假设 8~15 回合；玩家 maxMp 随境界增长。
# 越厉害(阶越高) 灵力消耗越高 → cost 单调递增；攻击 mult 单调递增。
TIER_NAME = {1:'黄阶',2:'玄阶',3:'地阶',4:'天阶',5:'王阶',6:'皇阶',7:'帝阶'}
COST_BASE = {1:8, 2:16, 3:24, 4:34, 5:50, 6:72, 7:100}
MULT     = {1:1.3, 2:1.7, 3:2.1, 4:2.6, 5:3.2, 6:3.9, 7:4.6}
SHIELD   = {1:0.15, 2:0.22, 3:0.30, 4:0.40, 5:0.50, 6:0.60, 7:0.70}
HEAL     = {1:0.10, 2:0.16, 3:0.22, 4:0.30, 5:0.40, 6:0.52, 7:0.65}
BUFF     = {1:0.15, 2:0.22, 3:0.30, 4:0.40, 5:0.55, 6:0.75, 7:1.00}

# 各类型灵力消耗偏移：攻击/特殊更贵，恢复/增益略便宜；但都随阶位上升
SCHOOL_COST_OFF = {
    'attack_phys':0,'attack_spirit':2,'defense':2,'recover_hp':-2,'recover_mp':-3,
    'buff_atk':-1,'buff_spd':-1,'buff_def':-1,'debuff':0,'special':4,
}

# 获取渠道（越多越好）：剧情副本/BOSS掉落/商城/活动/境界突破/宗门/签到/成就/残卷合成/论剑台
CHANNELS = ['dungeon','boss','shop','event','levelup','sect','signin','achievement','exchange','arena']
# 阶位倾向：高阶偏向稀有渠道
CH_TIER = {
    1:['shop','levelup','signin','dungeon'],
    2:['shop','dungeon','sect','levelup'],
    3:['dungeon','sect','arena','exchange'],
    4:['boss','arena','exchange','sect'],
    5:['boss','event','achievement','arena'],
    6:['boss','event','achievement','exchange'],
    7:['boss','event','achievement'],
}

SPECIAL_KINDS = ['lifesteal','pierce','truedmg','stun','absorb','critup']

roots = list(SIGNATURE.keys()) + GENERIC_ROOTS

def make_effect(school, tier, idx):
    if school == 'attack_phys':
        return {'kind':'dmg','type':'phys','mult': MULT[tier]}
    if school == 'attack_spirit':
        return {'kind':'dmg','type':'spirit','mult': round(MULT[tier]*0.95,2)}
    if school == 'defense':
        return {'kind':'shield','pct': SHIELD[tier], 'dur': 2 if tier<4 else 3}
    if school == 'recover_hp':
        return {'kind':'heal_hp','pct': HEAL[tier], 'flat': 20*tier}
    if school == 'recover_mp':
        return {'kind':'heal_mp','pct': round(HEAL[tier]*0.8,2), 'flat': 10*tier}
    if school == 'buff_atk':
        return {'kind':'buff','stat':'atk','amt': BUFF[tier], 'dur': 2 if tier<5 else 3}
    if school == 'buff_spd':
        return {'kind':'buff','stat':'init','amt': BUFF[tier], 'dur': 2 if tier<5 else 3}
    if school == 'buff_def':
        return {'kind':'buff','stat':'def','amt': BUFF[tier], 'dur': 2 if tier<5 else 3}
    if school == 'debuff':
        return {'kind':'debuff','stat':'atk','amt': round(BUFF[tier]*0.8,2), 'dur': 2}
    # special
    k = SPECIAL_KINDS[idx % len(SPECIAL_KINDS)]
    if k == 'lifesteal':
        return {'kind':'dmg','type':'phys','mult': MULT[tier], 'lifesteal': 0.3}
    if k == 'pierce':
        return {'kind':'dmg','type':'phys','mult': round(MULT[tier]*0.95,3), 'pierce': True}
    if k == 'truedmg':
        return {'kind':'truedmg','flat': 60 + tier*40}
    if k == 'stun':
        return {'kind':'stun','dur': 1 if tier<5 else 2}
    if k == 'absorb':
        return {'kind':'absorb','flat': 80 + tier*60, 'dur': 2}
    if k == 'critup':
        return {'kind':'critup','amt': 0.25 + tier*0.05, 'dur': 2}
    return {'kind':'dmg','type':'phys','mult': MULT[tier]}

def desc_of(school, tier, eff):
    t = TIER_NAME[tier]
    if eff['kind']=='dmg':
        base = f"造成约 {eff['mult']}倍{'物理' if eff['type']=='phys' else '精神'}伤害"
        if eff.get('lifesteal'): base += f"，吸取 {int(eff['lifesteal']*100)}% 伤害为气血"
        if eff.get('pierce'): base += "，无视敌方护甲"
        return f"【{t}】{base}。"
    if eff['kind']=='truedmg':
        return f"【{t}】无视防御造成 {eff['flat']} 点真实伤害。"
    if eff['kind']=='shield':
        return f"【{t}】运功护体，{eff['dur']} 回合内受到伤害降低 {int(eff['pct']*100)}%。"
    if eff['kind']=='heal_hp':
        return f"【{t}】回复自身 {int(eff['pct']*100)}% 气血（约 +{eff['flat']}）。"
    if eff['kind']=='heal_mp':
        return f"【{t}】回复自身 {int(eff['pct']*100)}% 灵力（约 +{eff['flat']}）。"
    if eff['kind']=='buff':
        st = {'atk':'攻击','init':'速度','def':'防御'}[eff['stat']]
        return f"【{t}】{eff['dur']} 回合内{st}提升 {int(eff['amt']*100)}%。"
    if eff['kind']=='debuff':
        return f"【{t}】{eff['dur']} 回合内敌方攻击降低 {int(eff['amt']*100)}%。"
    if eff['kind']=='stun':
        return f"【{t}】使敌方陷入僵直 {eff['dur']} 回合，无法行动。"
    if eff['kind']=='absorb':
        return f"【{t}】凝护盾吸收 {eff['flat']} 点伤害，持续 {eff['dur']} 回合。"
    if eff['kind']=='critup':
        return f"【{t}】{eff['dur']} 回合内暴击率提升 {int(eff['amt']*100)}%。"
    return f"【{t}】特殊效果。"

# ---------- 生成 130 条（>120） ----------
entries = []
used = set()
i = 0
target = 130
while len(entries) < target:
    school = SCHOOLS[i % len(SCHOOLS)]
    root = roots[(i*3) % len(roots)]
    suf = SUFFIX[school][(i // 10) % len(SUFFIX[school])]
    name = root + suf
    if name in used:
        i += 1
        continue
    used.add(name)
    tier = (i % 7) + 1
    cost = max(5, COST_BASE[tier] + SCHOOL_COST_OFF[school])
    eff = make_effect(school, tier, i)
    # 攻击类带 mult 字段；其余用 effect 描述
    mult = eff.get('mult') if eff['kind'] in ('dmg',) else None
    typ = eff.get('type') if eff['kind']=='dmg' else ('phys' if school=='attack_phys' else ('spirit' if school=='attack_spirit' else 'none'))
    src = SIGNATURE.get(root, '原创（武侠通用词根，无原著对应）')
    ch_pool = CH_TIER[tier]
    ch = ch_pool[(i // 7) % len(ch_pool)]
    sk = {
        'id': f"{school[:2]}{len(entries)+1:03d}",
        'name': name,
        'school': school,
        'schoolCn': SCHOOL_CN[school],
        'type': typ,
        'tier': tier,
        'tierName': TIER_NAME[tier],
        'cost': cost,
        'mult': mult,
        'effect': eff,
        'acquire': ch,
        'lockedUntil': (ch if ch in ('dungeon', 'exchange') else None),
        'desc': desc_of(school, tier, eff),
        'source': src,
    }
    entries.append(sk)
    i += 1

# ---------- 写出 JS ----------
def js_val(v):
    if v is None: return 'null'
    if isinstance(v, bool): return 'true' if v else 'false'
    if isinstance(v, str): return json.dumps(v, ensure_ascii=False)
    if isinstance(v, float): return repr(round(v, 3))
    return repr(v)

lines = []
lines.append('// ===== 《逍遥仙》功法数据库（由 gen_skills.py 生成，共 %d 种）=====' % len(entries))
lines.append('// 名称改编自《一剑霸天》（永夜星河/番茄小说）武学词根 + 武侠通用词根，规避抄袭。')
lines.append('// 加载顺序：须在 battle.js / hub.js 之前 <script src> 引入本文件（提供全局 SKILLS_DB）。')
lines.append('// 字段说明：')
lines.append('//   id        唯一标识（攻击类可写入 player.equippedSkills）')
lines.append('//   school    类型：attack_phys/attack_spirit/defense/recover_hp/recover_mp/buff_atk/buff_spd/buff_def/debuff/special')
lines.append('//   type      物理(phys)/精神(spirit)/无(none) —— 仅 attack 类有意义')
lines.append('//   tier      1~7 阶（黄/玄/地/天/王/皇/帝），阶越高 cost 越高、效果越强')
lines.append('//   cost      灵力消耗（= MP），越高阶越高')
lines.append('//   mult      攻击类倍率（沿用 battle.damage 的 atk*mult - def*0.5 公式）')
lines.append('//   effect    效果对象（shield/heal/buff/debuff/dmg/truedmg/stun/absorb/critup/lifesteal/pierce）')
lines.append('//   acquire   获取渠道：dungeon/boss/shop/event/levelup/sect/signin/achievement/exchange/arena')
lines.append('//   source    名称改编溯源（防抄袭证据）')
lines.append('const SKILLS_DB = [')
for sk in entries:
    eff = sk.pop('effect')
    parts = []
    for k in ['id','name','school','schoolCn','type','tier','tierName','cost','mult','acquire','lockedUntil','desc','source']:
        parts.append(f"{k}: {js_val(sk[k])}")
    parts.append("effect: " + json.dumps(eff, ensure_ascii=False))
    lines.append('  { ' + ', '.join(parts) + ' },')

lines.append('];')
# 查表：id -> skill 对象，供 battle/hub 直接 SKILLS_DB_MAP[id] 取用
lines.append('var SKILLS_DB_MAP = (function(){ var m = {}; for (var i=0;i<SKILLS_DB.length;i++){ m[SKILLS_DB[i].id] = SKILLS_DB[i]; } return m; })();')
lines.append('if (typeof module !== "undefined") module.exports = SKILLS_DB;')

out = '\n'.join(lines) + '\n'
with open('js/skills-data.js', 'w', encoding='utf-8') as f:
    f.write(out)

# ---------- 统计 ----------
from collections import Counter
sc = Counter(e['school'] for e in entries)
tc = Counter(e['tier'] for e in entries)
ac = Counter(e['acquire'] for e in entries)
print('总数:', len(entries))
print('按类型:', dict(sc))
print('按阶位:', {TIER_NAME[k]:v for k,v in sorted(tc.items())})
print('按渠道:', dict(ac))
# 校验 cost 随 tier 严格单调（相邻阶位 base 差距>=8，覆盖 -3~+4 偏移跨度）
tier_min = {}
for e in entries: tier_min[e['tier']] = min(tier_min.get(e['tier'], 1e9), e['cost'])
tier_max = {}
for e in entries: tier_max[e['tier']] = max(tier_max.get(e['tier'], -1), e['cost'])
inv = [t for t in range(2,8) if tier_min[t] <= tier_max[t-1]]
print('cost 阶位倒置(应为空):', inv)
print('样例(前3):')
for e in entries[:3]:
    print(' ', e['name'], e['schoolCn'], 'T'+str(e['tier']), 'cost='+str(e['cost']), e['acquire'])
