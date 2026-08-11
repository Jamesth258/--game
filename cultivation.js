/* 修炼境界体系 — 数据 + 纯计算（无 DOM 依赖）
 * 用法：
 *   const r = CULTIVATION.realmFromXp(player.xp);
 *   r.label        -> "炼气境 第三重天"
 *   r.progress     -> 0~1，当前小阶的进度
 *   r.realmName / r.stageName
 *   r.nextLabel    -> 下一小阶名称（已到顶则为 null）
 *   CULTIVATION.recalc(player) -> 按 xp 刷新 maxHp/atk/def/maxMp 派生属性
 * 调整节奏：XP_PER_STAGE 越小升阶越快。
 */
const CULTIVATION = (function () {
  const CN = ['一', '二', '三', '四', '五', '六', '七', '八', '九'];
  const list = (name, ...stages) => ({ name, stages });
  const nine = name => list(name, ...CN.map(n => `第${n}重天`));   // 1~9 重天
  const nineJie = name => list(name, ...CN.map(n => `第${n}阶`));  // 1~9 阶
  const four = name => list(name, '前期', '中期', '后期', '圆满'); // 前期/中期/后期/圆满

  // 用户给定的完整境界阶梯（顺序即由低到高）
  const REALMS = [
    nine('炼气境'), nine('筑基境'), nine('真武境'), nine('化海境'),
    nine('金丹境'), nine('元婴境'), nine('出窍境'), nine('破虚境'),
    four('渡劫境'), four('超脱境'),
    four('人仙'), four('地仙'), four('天仙'), four('真仙'), four('金仙'), four('玄仙'), four('仙君'), four('仙帝'),
    list('圣境', '圣君', '圣主', '圣尊'),
    nine('虚神境'), nine('真神境'),
    list('神王境', '不朽神王', '永恒神王', '道祖神王'),
    nineJie('混沌境'),
    // 主宰：用户原话“初阶至高阶”，按常见四阶（初阶/中阶/高阶/巅峰）处理，如需调整告知我
    list('主宰', '初阶', '中阶', '高阶', '巅峰'),
    nine('宇宙神'),
    four('宇宙国主'),
  ];

  // 扁平化小阶列表（真正用于进度计算）
  const FLAT = [];
  REALMS.forEach((realm, ri) => {
    realm.stages.forEach(stage => {
      FLAT.push({ realmIndex: ri, realmName: realm.name, stageName: stage, label: realm.name + ' ' + stage });
    });
  });

  const XP_PER_STAGE = 50; // 每升一小阶所需修为

  function realmFromXp(xp) {
    const total = FLAT.length;
    let idx = Math.floor((xp || 0) / XP_PER_STAGE);
    if (idx < 0) idx = 0;
    if (idx >= total) idx = total - 1;
    const stage = FLAT[idx];
    const within = Math.min(1, ((xp || 0) - idx * XP_PER_STAGE) / XP_PER_STAGE);
    const next = idx + 1 < total ? FLAT[idx + 1] : null;
    return {
      globalIndex: idx,
      realmIndex: stage.realmIndex,
      realmName: stage.realmName,
      stageName: stage.stageName,
      label: stage.label,
      progress: within,
      nextLabel: next ? next.label : null,
      isMax: idx === total - 1,
    };
  }

  // 依据 xp 刷新派生属性（基础值 + 每小阶加成），让境界越高越强
  const BASE = { maxHp: 150, atk: 30, def: 12, maxMp: 60 };
  function recalc(p) {
    const idx = realmFromXp(p.xp).globalIndex;
    p.maxHp = BASE.maxHp + idx * 4;
    p.atk   = BASE.atk   + idx * 1;
    p.def   = BASE.def   + idx * 0.5;
    p.maxMp = BASE.maxMp + idx * 1;
    return p;
  }

  return {
    REALMS, FLAT, XP_PER_STAGE,
    TOTAL_STAGES: FLAT.length,
    MAX_LABEL: FLAT[FLAT.length - 1].label,
    BASE, realmFromXp, recalc,
  };
})();
