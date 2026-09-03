/* avatars.js — 头像系统：全角色头像库 + 选择弹窗 + 解锁逻辑
 * 21个角色：6主角 + 10副本敌人 + 5世界BOSS
 * 解锁规则：主角默认解锁 / 敌人通关对应卷解锁 / BOSS击败解锁
 */

// ====== 头像数据库（全游戏角色） ======
const AVATAR_DB = [
  // ── 主角（6个，创建角色时默认解锁当前角色） ──
  { id: 'm1',   name: '铁骨武者', cat: 'hero',   gender: 'male',
    desc: '强壮刚毅，体修入道', img: 'assets/avatars/avatar_m1.png' },
  { id: 'm2',   name: '少年侠客', cat: 'hero',   gender: 'male',
    desc: '年轻俊朗，天赋异禀', img: 'assets/avatars/avatar_m2.png' },
  { id: 'm3',   name: '道骨仙风', cat: 'hero',   gender: 'male',
    desc: '中年大叔，道法深厚', img: 'assets/avatars/avatar_m3.png' },
  { id: 'f1',   name: '灵气萝莉', cat: 'hero',   gender: 'female',
    desc: '可爱灵动，根骨奇佳', img: 'assets/avatars/avatar_f1.png' },
  { id: 'f2',   name: '绝代佳人', cat: 'hero',   gender: 'female',
    desc: '性感热辣，魅惑众生', img: 'assets/avatars/avatar_f2.png' },
  { id: 'f3',   name: '温婉御姐', cat: 'hero',   gender: 'female',
    desc: '成熟丰满，气质出众', img: 'assets/avatars/avatar_f3.png' },

  // ── 副本敌人（10个，通关对应卷即解锁） ──
  { id: 'enemy_v1',  name: '山贼',     cat: 'enemy',  volume: 1,
    desc: '粗壮凶悍的土匪', img: 'assets/avatars/avatar_enemy_v1.png' },
  { id: 'enemy_v2',  name: '怨灵',     cat: 'enemy',  volume: 2,
    desc: '半透明飘浮鬼魂', img: 'assets/avatars/avatar_enemy_v2.png' },
  { id: 'enemy_v3',  name: '血祭僵尸', cat: 'enemy',  volume: 3,
    desc: '暗红血肉腐尸', img: 'assets/avatars/avatar_enemy_v3.png' },
  { id: 'enemy_v4',  name: '炎魔',     cat: 'enemy',  volume: 4,
    desc: '全身燃烧烈焰', img: 'assets/avatars/avatar_enemy_v4.png' },
  { id: 'enemy_v5',  name: '金甲卫士', cat: 'enemy',  volume: 5,
    desc: '金色铠甲守卫', img: 'assets/avatars/avatar_enemy_v5.png' },
  { id: 'enemy_v6',  name: '海怪',     cat: 'enemy',  volume: 6,
    desc: '深海巨型水妖', img: 'assets/avatars/avatar_enemy_v6.png' },
  { id: 'enemy_v7',  name: '纸傀',     cat: 'enemy',  volume: 7,
    desc: '诡异纸扎人偶', img: 'assets/avatars/avatar_enemy_v7.png' },
  { id: 'enemy_v8',  name: '魔将',     cat: 'enemy',  volume: 8,
    desc: '魔界黑色将军', img: 'assets/avatars/avatar_enemy_v8.png' },
  { id: 'enemy_v9',  name: '堕神',     cat: 'enemy',  volume: 9,
    desc: '堕落黑翼邪神', img: 'assets/avatars/avatar_enemy_v9.png' },
  { id: 'enemy_v10', name: '天兵',     cat: 'enemy',  volume: 10,
    desc: '金白神圣士兵', img: 'assets/avatars/avatar_enemy_v10.png' },

  // ── 世界BOSS（5个，击败后解锁） ──
  { id: 'boss_1', name: '幽冥魔尊', cat: 'boss', bossIdx: 1,
    desc: '冥界之主', img: 'assets/avatars/avatar_boss_1.png' },
  { id: 'boss_2', name: '焚天炎帝', cat: 'boss', bossIdx: 2,
    desc: '火焰之主', img: 'assets/avatars/avatar_boss_2.png' },
  { id: 'boss_3', name: '九幽冥皇', cat: 'boss', bossIdx: 3,
    desc: '九幽地狱之皇', img: 'assets/avatars/avatar_boss_3.png' },
  { id: 'boss_4', name: '血河神祖', cat: 'boss', bossIdx: 4,
    desc: '血海之祖', img: 'assets/avatars/avatar_boss_4.png' },
  { id: 'boss_5', name: '太虚帝尊', cat: 'boss', bossIdx: 5,
    desc: '太虚之主', img: 'assets/avatars/avatar_boss_5.png' },
];

// 按 ID 索引的查找表
const AVATAR_MAP = {};
AVATAR_DB.forEach(a => { AVATAR_MAP[a.id] = a; });

// ====== 头像系统核心函数 ======

// 初始化玩家头像数据（兼容旧存档）
function initAvatarSystem() {
  if (!player.selectedAvatar) {
    // 默认使用当前角色头像
    player.selectedAvatar = player.avatarId || 'm2';
  }
  if (!player.unlockedAvatars || !Array.isArray(player.unlockedAvatars)) {
    // 默认解锁当前选择的主角
    player.unlockedAvatars = [player.avatarId || 'm2'];
  }
  // 确保当前选中头像在已解锁列表中
  if (!player.unlockedAvatars.includes(player.selectedAvatar)) {
    player.selectedAvatar = player.unlockedAvatars[0] || 'm2';
  }
}

// 获取当前选中的头像数据
function getCurrentAvatar() {
  return AVATAR_MAP[player.selectedAvatar] || AVATAR_MAP['m2'];
}

// 检查某个头像是否已解锁
function isAvatarUnlocked(avatarId) {
  return (player.unlockedAvatars || []).includes(avatarId);
}

// 解锁一个头像
function unlockAvatar(avatarId) {
  if (!avatarId || isAvatarUnlocked(avatarId)) return false;
  if (!AVATAR_MAP[avatarId]) return false;
  player.unlockedAvatars.push(avatarId);
  saveGame();
  return true;
}

// 切换头像
function selectAvatar(avatarId) {
  if (!isAvatarUnlocked(avatarId)) return false;
  player.selectedAvatar = avatarId;
  saveGame();
  refreshHubAvatar();
  return true;
}

// 刷新主页头像显示
function refreshHubAvatar() {
  const avatarEl = document.getElementById('hub-avatar');
  if (!avatarEl) return;
  const av = getCurrentAvatar();
  avatarEl.src = av.img + '?v=1';
  avatarEl.alt = av.name;
}

// ====== 解锁钩子（在战斗胜利时调用） ======

// 副本通关解锁对应卷的敌人头像
function checkStoryUnlock(chapterNum) {
  // chapterNum 1-100 → volume = ceil(chapterNum / 10)
  const volume = Math.ceil(chapterNum / 10);
  const enemyAvatar = 'enemy_v' + volume;
  if (AVATAR_MAP[enemyAvatar] && !isAvatarUnlocked(enemyAvatar)) {
    unlockAvatar(enemyAvatar);
    console.log('[Avatar] 解锁头像:', AVATAR_MAP[enemyAvatar].name);
  }
}

// 世界BOSS击败解锁
function checkBossUnlock(bossIdx) {
  const bossAvatar = 'boss_' + bossIdx;
  if (AVATAR_MAP[bossAvatar] && !isAvatarUnlocked(bossAvatar)) {
    unlockAvatar(bossAvatar);
    console.log('[Avatar] 解锁头像:', AVATAR_MAP[bossAvatar].name);
  }
}

// ====== 头像选择弹窗 ======
function showAvatarModal() {
  refreshHubAvatar();

  const cats = [
    { key: 'hero',  label: '✦ 主角' },
    { key: 'enemy', label: '⚔ 副本对手' },
    { key: 'boss',  label: '👑 世界BOSS' },
  ];

  const avHtml = AVATAR_DB.map(a => {
    const unlocked = isAvatarUnlocked(a.id);
    const selected = player.selectedAvatar === a.id;
    return `
      <div class="avatar-grid-item ${selected ? 'avatar-selected' : ''} ${!unlocked ? 'avatar-locked' : ''}"
           data-avatar-id="${a.id}"
           onclick="${unlocked ? 'selectAvatar(\'' + a.id + '\');showAvatarModal()' : ''}">
        <div class="avatar-img-wrap">
          <img class="avatar-thumb" src="${a.img}?v=1" alt="${a.name}" onerror="this.style.opacity=0.2">
          ${!unlocked ? '<div class="avatar-lock-overlay">🔒</div>' : ''}
          ${selected ? '<div class="avatar-check-mark">✓</div>' : ''}
        </div>
        <div class="avatar-name">${esc(a.name)}</div>
        <div class="avatar-desc">${esc(a.desc)}</div>
      </div>`;
  }).join('');

  openModal(`
    <div style="text-align:center">
      <h3 style="margin:0 0 4px;color:#D4A843">🎭 头像图鉴</h3>
      <p style="margin:0 0 12px;font-size:12px;color:rgba(241,239,232,0.5)">
        已解锁 ${player.unlockedAvatars.length} / ${AVATAR_DB.length} · 击败对手解锁对应头像
      </p>
    </div>
    <div class="avatar-grid">${avHtml}</div>
    <button class="btn-full" onclick="returnToHub()" style="margin-top:14px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.12)">返回主页</button>
  `);
}

// 暴露全局接口
window.showAvatarModal = showAvatarModal;
window.selectAvatar = selectAvatar;
window.checkStoryUnlock = checkStoryUnlock;
window.checkBossUnlock = checkBossUnlock;
window.refreshHubAvatar = refreshHubAvatar;
window.AVATAR_DB = AVATAR_DB;
window.AVATAR_MAP = AVATAR_MAP;
