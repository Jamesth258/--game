/* 修炼境界体系 — 数据 + 纯计算（无 DOM 依赖）
 * 用法：
 *   const r = CULTIVATION.realmFromXp(player.xp);
 *   r.label        -> "炼气境 第三重天"
 *   r.progress     -> 0~1，当前小阶的进度
 *   r.realmName / r.stageName
 *   r.nextLabel    -> 下一小阶名称（已到顶则为 null）
 * 经验曲线：每升一小阶所需修为随境界递增（见 STAGE_XP_*），后期突破越来越难。
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

  // 每升一小阶所需修为：随境界序号 i（0 起）递增，让后期突破越来越难。
  //   req(i) = BASE + STEP·i + QUAD·i²    （线性增长 + 二次加速）
  // 调参：BASE 抬高整体门槛；STEP 控制线性斜率；QUAD 控制后期陡峭程度。
  // 设计目标（挂机节奏）：在线 2/s、离线 1/s 封顶 12h/天。
  //   满级总修为≈3724万 → 肝帝(在线8h/天)≈1.01年、重度(在线2h)≈1.77年、休闲(在线1h)≈2.02年、纯离线≈2.36年。
  //   即"至少玩一年才到顶"，且越往后单阶越久（第1阶≈2分钟，末阶≈5600分钟在线）。
  const STAGE_XP_BASE = 200;  // 第 1 小阶所需修为（≈2分钟在线，前期即有"修炼感"）
  const STAGE_XP_STEP = 20;   // 每升一阶线性 +20
  const STAGE_XP_QUAD = 24;   // 二次项，越往后越陡（主导后期拉长）
  function stageXpReq(i) {
    return Math.round(STAGE_XP_BASE + STAGE_XP_STEP * i + STAGE_XP_QUAD * i * i);
  }
  // 预计算累计阈值：CUM[i] = 进入第 i 小阶需要累计的总修为
  const CUM = [0];
  for (let i = 1; i <= FLAT.length; i++) CUM[i] = CUM[i - 1] + stageXpReq(i - 1);

  function realmFromXp(xp) {
    const total = FLAT.length;
    xp = xp || 0;
    // 二分查找最大 idx 使 CUM[idx] <= xp
    let lo = 0, hi = total - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (CUM[mid] <= xp) lo = mid; else hi = mid - 1;
    }
    const idx = lo;
    const req = stageXpReq(idx);
    const into = xp - CUM[idx];           // 当前小阶已攒修为
    const within = Math.min(1, req > 0 ? into / req : 1);
    const stage = FLAT[idx];
    const next = idx + 1 < total ? FLAT[idx + 1] : null;
    return {
      globalIndex: idx,
      realmIndex: stage.realmIndex,
      realmName: stage.realmName,
      stageName: stage.stageName,
      label: stage.label,
      progress: within,
      xpIntoStage: into,
      xpForStage: req,
      totalXp: xp,
      nextLabel: next ? next.label : null,
      isMax: idx === total - 1,
    };
  }

  return {
    REALMS, FLAT,
    STAGE_XP_BASE, STAGE_XP_STEP, STAGE_XP_QUAD,
    stageXpReq, cumXp: i => CUM[i],
    TOTAL_STAGES: FLAT.length,
    MAX_LABEL: FLAT[FLAT.length - 1].label,
    realmFromXp,
  };
})();
