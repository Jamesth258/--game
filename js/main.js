/* main.js — 启动入口：存档恢复判定 + 首帧渲染
 * 由 index.html 拆分而来。加载顺序见 index.html 底部 <script> 列表，勿随意调整。
 * 注意：顶层 const/let 跨文件可直接引用，但不会挂到 window（详见 PROJECT.md 坑点 8.1）。
 */
// 检查是否有已存档（跳过创建）
function checkSavedCharacter() {
  try {
    const saved = JSON.parse(localStorage.getItem('wuxia_save'));
    if (saved && saved.name && saved.avatarImg) {
      player.name = saved.name;
      player.sect = saved.sect || '';
      player.avatarId = saved.avatarId || '';
      player.xp = saved.xp || 0;
      player.score = saved.score || 0;
      // 恢复 6 项属性与已分配点数
      player.con = saved.con || 10; player.str = saved.str || 10;
      player.sou = saved.sou || 10; player.spd = saved.spd || 10;
      player.com = saved.com || 10; player.des = saved.des || 10;
      player.spent = saved.spent || 0;
      // 恢复功法：过滤掉旧版/不存在的 id；装备槽同样过滤并截断至上限
      const _learned = (saved.learned && saved.learned.length) ? saved.learned.filter(id => typeof SKILLS_DB_MAP !== 'undefined' && SKILLS_DB_MAP[id]) : [];
      player.learned = _learned.length ? _learned : DEFAULT_LEARNED.slice();
      const _eq2 = (saved.equippedSkills && saved.equippedSkills.length) ? saved.equippedSkills.filter(id => typeof SKILLS_DB_MAP !== 'undefined' && SKILLS_DB_MAP[id] && player.learned.includes(id)) : [];
      player.equippedSkills = _eq2.length ? _eq2.slice(0, MAX_EQUIPPED) : DEFAULT_EQUIPPED.slice();
      player.lastSeen = saved.lastSeen || Date.now();
      // 恢复装备 / 背包 / 灵石（旧存档可能缺字段，补默认）
      const _eq = (saved.equipment && typeof saved.equipment === 'object') ? saved.equipment : {};
      player.equipment = { weapon: _eq.weapon || null, armor: _eq.armor || null, accessory: _eq.accessory || null, boots: _eq.boots || null };
      player.bag = Array.isArray(saved.bag) ? saved.bag : [];
      player.gold = (saved.gold != null) ? saved.gold : 50;
      // 恢复剧情副本进度（旧存档可能缺字段，补默认）
      player.storyCleared = (saved.storyCleared && typeof saved.storyCleared === 'object') ? saved.storyCleared : {};
      player.storyRewardClaimed = (saved.storyRewardClaimed && typeof saved.storyRewardClaimed === 'object') ? saved.storyRewardClaimed : {};
      player.storyLevelFirstClear = (saved.storyLevelFirstClear && typeof saved.storyLevelFirstClear === 'object') ? saved.storyLevelFirstClear : {};
      player.worldBoss = (saved.worldBoss && typeof saved.worldBoss === 'object') ? saved.worldBoss : null;
      player.diamond = (saved.diamond != null) ? saved.diamond : 0;
      player.daily = (saved.daily && typeof saved.daily === 'object') ? saved.daily : null;
      // 图鉴收集集合与里程碑档位（旧存档可能缺字段，补默认）
      player.equipCollected = Array.isArray(saved.equipCollected) ? saved.equipCollected : [];
      // 回溯图鉴：图鉴上线前已拥有的装备（在 bag / 已穿戴 equipment 中）也计入收集，避免老存档图鉴大量灰显为未收集
      if (typeof rebuildEquipCollected === 'function') rebuildEquipCollected();
      player.codexReward = (saved.codexReward && typeof saved.codexReward === 'object') ? saved.codexReward : { skill: 0, equip: 0 };
      player.skillPity = (typeof saved.skillPity === 'number') ? saved.skillPity : 0;
      const _all = CHARACTERS.male.concat(CHARACTERS.female);
      const _ch = _all.find(c => c.id === saved.avatarId);
      art.hero.src = _ch ? _ch.img : saved.avatarImg;
      art.hero.failed = false;
      recalcStats(player);
      // 图鉴奖励档位对齐：旧档已收集的部分不补发钻石，仅把「已发档位」预置为 floor(已收集数/10)
      if (player.codexReward) {
        player.codexReward.skill = Math.floor((player.learned || []).length / 10);
        player.codexReward.equip = Math.floor((player.equipCollected || []).length / 10);
      }
      // 离线挂机结算（按离开时长累加修为，并回满气血）
      const offlineGain = applyOfflineXp();
      player.hp = player.maxHp; player.mp = player.maxMp;
      // 立即同步主页境界/进度条（不等 initHub）
      if (window.syncRealmDOM) syncRealmDOM();
      createScreen.setAttribute('hidden', '');
      // 有存档 → 初始化并进入主页
      state = 'hub'; // 关键：进入主页必须把状态机切到 hub，否则底层 canvas 渲染循环会持续重绘地图/战斗帧（白耗算力）
      initHub();
      window.HUB.show();
      if (offlineGain > 0) openModal(`<h3 style="color:#D4A843">离线挂机结算</h3><p style="color:rgba(241,239,232,0.8)">离线期间自动修炼，获得修为 <b style="color:#639922">+${formatNum(offlineGain)}</b>（含挂机加成 ${Math.round(player.xpBonus * 100)}%）。</p><button class="btn-full" onclick="closeModal()" style="margin-top:14px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.12)">收下</button>`);
      return true;
    }
  } catch(e) {}
  return false;
}

// 真实资源清单（驱动登录进度条）。onerror 也计数，缺失文件不会卡死进度。
const LOADING_ASSETS = [
  'assets/cover.png?v=10',
  // 战斗立绘
  'assets/battle/hero_m1.png','assets/battle/hero_m2.png','assets/battle/hero_m3.png',
  'assets/battle/hero_f1.png','assets/battle/hero_f2.png','assets/battle/hero_f3.png',
  'assets/battle/enemy_v1.png','assets/battle/enemy_v2.png','assets/battle/enemy_v3.png',
  'assets/battle/enemy_v4.png','assets/battle/enemy_v5.png','assets/battle/enemy_v6.png',
  'assets/battle/enemy_v7.png','assets/battle/enemy_v8.png','assets/battle/enemy_v9.png',
  'assets/battle/enemy_v10.png','assets/battle/boss_1.png','assets/battle/boss_2.png',
  'assets/battle/boss_3.png','assets/battle/boss_4.png','assets/battle/boss_5.png',
  // 战斗背景
  'assets/bg/bg_story_01_village_dawn.png','assets/bg/bg_story_02_forbidden_ruins.png',
  'assets/bg/bg_story_03_blood_altar.png','assets/bg/bg_story_04_volcano.png',
  'assets/bg/bg_story_05_nirvana_realm.png','assets/bg/bg_story_06_sea_battle.png',
  'assets/bg/bg_story_07_illusion.png','assets/bg/bg_story_08_chaos_war.png',
  'assets/bg/bg_story_09_godfall.png','assets/bg/bg_story_10_celestial_gate.png',
  'assets/bg/bg_boss_01_ghostrealm.png','assets/bg/bg_boss_02_magma.png',
  'assets/bg/bg_boss_03_abyss.png','assets/bg/bg_boss_04_bloodriver.png',
  'assets/bg/bg_boss_05_void.png',
  // 功能栏图标
  'assets/icons/icon_attr.png','assets/icons/icon_equip.png','assets/icons/icon_bag.png',
  'assets/icons/icon_skill.png','assets/icons/icon_story.png','assets/icons/icon_daily.png',
  'assets/icons/icon_shop.png','assets/icons/icon_codex.png','assets/icons/icon_worldboss.png',
  'assets/icons/icon_rank.png','assets/icons/icon_settings.png'
];

// ===== 初始化拆成两步 =====
// 首屏真正的耗时点是「读档解析 + 属性重算」和「首帧渲染」。
// 登录加载画面必须让这两步在遮罩仍然可见时执行 —— 否则玩家看到的
// 就是"遮罩撤掉之后"的裸奔卡顿，进度条形同虚设。
let _bootHasSave = false;

// 第一步：读档 + 属性重算（首屏最耗时的一步）
function initSave() {
  _bootHasSave = checkSavedCharacter();
}

// 第二步：界面挂载 + 首帧渲染
function initWorld() {
  if (!_bootHasSave) {
    state = 'create'; // 新状态阻止 canvas 渲染游戏
    createScreen.removeAttribute('hidden');
    // Canvas 渲染一个暗色占位
    (function renderCreateBg() {
      if (createScreen.hidden) return;
      ctx.fillStyle = '#111';
      ctx.fillRect(0, 0, W, H);
      requestAnimationFrame(renderCreateBg);
    })();
  }
  setButtons(false); // 地图阶段禁用战斗指令
  render();
}

// 同步入口：无加载画面 / DOM 缺失时走完整初始化（保持向后兼容）
function startGame() {
  initSave();
  initWorld();
  if (typeof initDaily === 'function') initDaily(); // 启动每日奖励的在线时长累计定时器
}

// ===== 登录等待画面：三段式加载 =====
// 阶段配额：美术资源 0→70%、读档 70→88%、世界初始化 88→100%。
// 每段都有最短展示时长，保证缓存命中时也有稳定节奏（合计约 5s）；
// 但绝不在真实工作完成前提前报 100% —— 进度条必须是可信的。
const BOOT_PHASE = {
  assets: { from: 0,  to: 70,  minMs: 3000, tip: '正在加载美术资源' },
  save:   { from: 70, to: 88,  minMs: 600,  tip: '正在读取角色存档' },
  world:  { from: 88, to: 100, minMs: 600,  tip: '正在初始化世界'   },
};

function bootGame() {
  const overlay = document.getElementById('loading-screen');
  const fill    = document.getElementById('loading-fill');
  const pct     = document.getElementById('loading-pct');
  const tipEl   = document.getElementById('loading-tip');
  const hintEl  = document.getElementById('loading-hint');

  // 防御：DOM 元素缺失时直接进游戏（旧版 HTML / 测试桩）
  if (!overlay || !fill || !pct) {
    console.warn('[bootGame] loading-screen DOM missing, skipping to game');
    startGame();
    return;
  }

  const total = LOADING_ASSETS.length;
  let loaded = 0;
  let skipped = false;   // 点击只加速"等待节奏"，不会跳过真实工作
  let shown = 0;

  function paint(p) {
    if (!(p > shown)) p = shown;   // 进度只增不减，顺带挡住 NaN
    shown = Math.min(100, p);
    fill.style.width = shown.toFixed(1) + '%';
    pct.textContent = Math.floor(shown) + '%';
  }
  function setTip(t) { if (tipEl) tipEl.textContent = t; }
  function setBusy(on) { fill.classList.toggle('busy', !!on); }

  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const phaseMs = k => (skipped ? 0 : BOOT_PHASE[k].minMs);

  // 等一帧。rAF 在后台标签页会被节流甚至暂停，必须配定时器兜底，
  // 否则玩家切走标签页再切回来，加载画面会永久卡住不进游戏。
  function raf() {
    return new Promise(resolve => {
      let fired = false, fallback = 0;
      const fire = () => {
        if (fired) return;
        fired = true;
        clearTimeout(fallback);   // 清掉兜底定时器，避免上百次循环后堆积
        resolve();
      };
      requestAnimationFrame(fire);
      fallback = setTimeout(fire, 60);
    });
  }

  // 阶段1：美术资源预加载。
  // 取「真实加载比例」与「时间保底节奏」的较小者：
  // 既不会没加载完就假装 100%，也不会因缓存命中而一闪而过。
  // 进度按墙钟时间计算，因此帧率高低只影响顺滑度，不影响阶段总时长。
  async function phaseAssets() {
    const t0 = Date.now();
    const p = BOOT_PHASE.assets;

    // 逐个预加载美术资源（这才是加载画面存在的意义：进游戏前把图都拉进缓存）
    LOADING_ASSETS.forEach(src => {
      const img = new Image();
      img.onload  = () => { loaded++; };
      img.onerror = () => { loaded++; console.warn('[bootGame] 资源失败: ' + src); };
      img.src = src;
    });

    // 硬兜底：极端网络下 6s 仍未回调则强制放行
    const hard = setTimeout(() => { if (loaded < total) loaded = total; }, 6000);

    for (;;) {
      const el    = Date.now() - t0;
      const ms    = phaseMs('assets');
      const real  = total ? loaded / total : 1;
      const paced = ms > 0 ? Math.min(1, el / ms) : 1;
      // 超出保底窗口后若真实加载仍卡住，1.5s 内缓慢补齐，避免进度条假死
      const creep = ms > 0 ? Math.max(0, Math.min(1, (el - ms) / 1500)) : Math.min(1, el / 800);
      const eff   = paced < 1 ? Math.min(real, paced) : Math.max(real, creep);

      paint(p.from + eff * (p.to - p.from));
      if (eff >= 1) { paint(p.to); break; }
      await raf();
    }
    clearTimeout(hard);
  }

  async function animate(from, to, ms) {
    const t0 = Date.now();
    for (;;) {
      const r = ms <= 0 ? 1 : Math.min(1, (Date.now() - t0) / ms);
      paint(from + (to - from) * r);
      if (r >= 1) { paint(to); return; }
      await raf();
    }
  }

  // 阶段2/3：真实的初始化工作（同步阻塞）。
  // 这正是原先"遮罩撤掉后裸奔卡顿"的元凶，现在全程盖在封面下进行。
  async function phaseWork(key, work) {
    const p = BOOT_PHASE[key];
    setTip(p.tip + '…');
    await raf(); await raf();   // 双帧：确保阶段文案已上屏，再进入阻塞工作
    setBusy(true);

    const t0 = Date.now();
    try { work(); } catch (e) { console.error('[bootGame] phase "' + key + '" failed:', e); }
    setBusy(false);

    // 补足最短展示时长，并把进度条平滑推到该阶段终点
    await animate(p.from, p.to, Math.max(phaseMs(key) - (Date.now() - t0), 260));
  }

  // 100% 之后：等玩家点击或短暂停留，再淡出
  function waitClick(el) {
    return new Promise(resolve => {
      const h = () => { el.removeEventListener('click', h); resolve(); };
      el.addEventListener('click', h);
    });
  }

  let bootDone = false;
  function enterGameNow() {
    if (bootDone) return;
    bootDone = true;
    try { initSave(); initWorld(); } catch (e) { console.error('[bootGame] forced init failed:', e); }
    overlay.hidden = true;
    if (typeof initDaily === 'function') initDaily();
  }

  async function run() {
    setTip(BOOT_PHASE.assets.tip + '…');
    await phaseAssets();

    await phaseWork('save', initSave);    // 解析存档 + 属性重算
    await phaseWork('world', initWorld);  // 界面挂载 + 首帧渲染

    // 真实工作已全部完成，此时才允许报 100% 并淡出
    paint(100);
    setTip('即将进入江湖');
    if (hintEl) hintEl.hidden = false;

    await Promise.race([sleep(420), waitClick(overlay)]);

    overlay.classList.add('fade-out');
    await sleep(620);
    bootDone = true;
    overlay.hidden = true;

    // 每日计时器：等真正进入游戏后再启动，加载期间不跑
    if (typeof initDaily === 'function') initDaily();
  }

  // 总看门狗：任何环节卡死（含 rAF 被节流）也能保证进得去游戏
  setTimeout(() => {
    if (!bootDone) {
      console.warn('[bootGame] Watchdog fired after 12s — forcing entry');
      enterGameNow();
    }
  }, 12000);

  // 点击：进度过半后可跳过等待节奏（真实工作不会跳过，否则又会看到卡顿）
  overlay.addEventListener('click', () => {
    if (!skipped && shown >= 50) skipped = true;
  });

  run();
}

bootGame();
