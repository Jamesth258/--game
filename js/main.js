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

function startGame() {
  // 初始化：有存档直接进游戏，否则显示创建界面
  if (!checkSavedCharacter()) {
    state = 'create'; // 新状态阻止 canvas 渲染游戏
    createScreen.removeAttribute('hidden');
    // Canvas 渲染一个暗色占位
    function renderCreateBg() {
      if (createScreen.hidden) return;
      ctx.fillStyle = '#111';
      ctx.fillRect(0, 0, W, H);
      requestAnimationFrame(renderCreateBg);
    }
    renderCreateBg();
  }
  setButtons(false); // 地图阶段禁用战斗指令
  render();
  if (typeof initDaily === 'function') initDaily(); // 启动每日奖励的在线时长累计定时器
}

// 登录等待画面：真实预加载资源驱动进度条，到 100% 后淡出进入游戏
function bootGame() {
  const overlay = document.getElementById('loading-screen');
  const fill = document.getElementById('loading-fill');
  const pct = document.getElementById('loading-pct');

  // 防御：DOM 元素缺失时直接进游戏
  if (!overlay || !fill || !pct) {
    console.warn('[bootGame] loading-screen DOM missing, skipping to game');
    startGame();
    return;
  }

  const total = LOADING_ASSETS.length;
  let loaded = 0;
  const startT = Date.now();
  const MIN_SHOW = 1100; // 最短展示时长，避免秒进

  console.log(`[bootGame] Starting preload of ${total} assets...`);

  function update() {
    const p = Math.min(100, Math.floor(loaded / total * 100));
    fill.style.width = p + '%';
    pct.textContent = p + '%';
    console.log(`[bootGame] Progress: ${loaded}/${total} = ${p}%`);
    if (loaded >= total) finish();
  }
  function finish() {
    fill.style.width = '100%';
    pct.textContent = '100%';
    console.log('[bootGame] All assets loaded, finishing...');
    const wait = Math.max(0, MIN_SHOW - (Date.now() - startT));
    setTimeout(() => {
      overlay.classList.add('fade-out');
      setTimeout(() => {
        overlay.hidden = true;
        startGame();
      }, 620);
    }, wait);
  }
  // 点击跳过（老玩家秒进）
  overlay.addEventListener('click', () => { if (loaded < total) { loaded = total; update(); } });

  // 逐个预加载
  LOADING_ASSETS.forEach((src, i) => {
    const img = new Image();
    img.onload = () => {
      loaded++;
      console.log(`[bootGame] ✓ [${i+1}/${total}] ${src.split('/').pop()}`);
      update();
    };
    img.onerror = () => {
      loaded++;
      console.warn("[bootGame] ✗ [" + (i+1) + "/" + total + "] " + src + " (404/failed)");
      update();
    };
    img.src = src;
  });

  // 兜底：若 6s 内仍有资源未回调（极端网络），强制结束
  setTimeout(() => {
    if (loaded < total) {
      console.warn('[bootGame] Timeout! Only ' + loaded + '/' + total + ' loaded, forcing finish');
      loaded = total;
      update();
    }
  }, 6000);

  // 保底：若 2s 后进度仍为 0%（可能全部 onerror 静默失败），强制推进
  setTimeout(() => {
    if (loaded === 0) {
      console.error('[bootGame] Zero progress after 2s! Forcing simulation');
      // 模拟进度到 100%
      let sim = 0;
      const simInterval = setInterval(() => {
        sim += Math.ceil(total / 15);
        if (sim >= total) { sim = total; clearInterval(simInterval); }
        loaded = sim;
        update();
      }, 80);
    }
  }, 2000);
}

bootGame();
