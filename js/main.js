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
      player.worldBoss = (saved.worldBoss && typeof saved.worldBoss === 'object') ? saved.worldBoss : null;
      const _all = CHARACTERS.male.concat(CHARACTERS.female);
      const _ch = _all.find(c => c.id === saved.avatarId);
      art.hero.src = _ch ? _ch.img : saved.avatarImg;
      art.hero.failed = false;
      recalcStats(player);
      // 离线挂机结算（按离开时长累加修为，并回满气血）
      const offlineGain = applyOfflineXp();
      player.hp = player.maxHp; player.mp = player.maxMp;
      // 立即同步主页境界/进度条（不等 initHub）
      if (window.syncRealmDOM) syncRealmDOM();
      createScreen.setAttribute('hidden', '');
      // 有存档 → 初始化并进入主页
      initHub();
      window.HUB.show();
      if (offlineGain > 0) openModal(`<h3 style="color:#D4A843">离线挂机结算</h3><p style="color:rgba(241,239,232,0.8)">离线期间自动修炼，获得修为 <b style="color:#639922">+${formatNum(offlineGain)}</b>（含挂机加成 ${Math.round(player.xpBonus * 100)}%）。</p><button class="btn-full" onclick="closeModal()" style="margin-top:14px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.12)">收下</button>`);
      return true;
    }
  } catch(e) {}
  return false;
}

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
