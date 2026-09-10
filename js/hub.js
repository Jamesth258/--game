/* hub.js — 游戏主页：菜单/战力/境界同步/属性与功法弹窗
 * 由 index.html 拆分而来。加载顺序见 index.html 底部 <script> 列表，勿随意调整。
 * 注意：顶层 const/let 跨文件可直接引用，但不会挂到 window（详见 PROJECT.md 坑点 8.1）。
 */
// ===== 游戏主页系统（人物居中 + 顶栏 + 底栏） =====

// 顶栏右侧图标按钮（从左到右）
const HUB_TOP_ITEMS = [
  { id: 'daily',  label: '每日奖励', icon: '<img class="hub-ico" src="assets/icons/icon_daily.png?v=12" alt="每日奖励">', action: 'modal_daily' },
  { id: 'shop',   label: '商店', icon: '<img class="hub-ico" src="assets/icons/icon_shop.png?v=12" alt="商店">', action: 'modal_shop' },
  { id: 'codex',  label: '图鉴', icon: '<img class="hub-ico" src="assets/icons/icon_codex.png?v=12" alt="图鉴">', action: 'modal_codex' },
  { id: 'worldboss', label: '世界BOSS', icon: '<img class="hub-ico" src="assets/icons/icon_worldboss.png?v=12" alt="世界BOSS">', action: 'go_worldboss' },
  { id: 'rank',   label: '排行榜', icon: '<img class="hub-ico" src="assets/icons/icon_rank.png?v=12" alt="排行榜">', action: 'go_rank' },
  { id: 'settings', label: '设置', icon: '<img class="hub-ico" src="assets/icons/icon_settings.png?v=12" alt="设置">', action: 'modal_settings' },
];

// 底栏主功能按钮（从左到右）
const HUB_BOTTOM_ITEMS = [
  { id: 'attr',   label: '属性', icon: '<img class="hub-ico" src="assets/icons/icon_attr.png?v=12" alt="属性">', action: 'modal_attr' },
  { id: 'equip',   label: '装备', icon: '<img class="hub-ico" src="assets/icons/icon_equip.png?v=12" alt="装备">', action: 'modal_equip' },
  { id: 'bag',    label: '背包', icon: '<img class="hub-ico" src="assets/icons/icon_bag.png?v=12" alt="背包">', action: 'modal_bag' },
  { id: 'skill',  label: '功法', icon: '<img class="hub-ico" src="assets/icons/icon_skill.png?v=12" alt="功法">', action: 'modal_skills' },
  { id: 'story',  label: '副本', icon: '<img class="hub-ico" src="assets/icons/icon_story.png?v=12" alt="副本">', action: 'go_story' },
];

function calcCombatPower(p) {
  return Math.floor(
    (p.maxHp * 1.2) + (p.atk * 15) + (p.def * 12) + (p.spd * 8) +
    (p.maxMp * 2) + (p.spiAtk * 10) + (p.init * 2)
  );
}

function formatNum(n) { return n.toLocaleString('zh-CN'); }

// 装备对比：关键派生属性之和（eva 按 *100 折算，命中率按 *100 折算），用于标"更优"
// 走 resolvedEquipBonus 回填，保证旧装备(缺 hitRate 字段)也能公平参与对比
function equipScore(item) {
  if (!item) return 0;
  const b = (typeof resolvedEquipBonus === 'function') ? resolvedEquipBonus(item) : (item.bonus || {});
  return (b.atk || 0) + (b.def || 0) + (b.maxHp || 0) + (b.maxMp || 0) +
         (b.spiAtk || 0) + (b.spiDef || 0) + (b.init || 0) +
         (b.eva || 0) * 100 + (b.hitRate || 0) * 100;
}
// a 是否优于 b（b 为空部位则视为更好）
function compareEquip(a, b) {
  if (!a) return false;
  if (!b) return true;
  return equipScore(a) > equipScore(b);
}
const SELL_PRICE = { fan: 125, ling: 500, bao: 2000, xian: 12500, shen: 50000 }; // 出售价（按品质，统一为商店价 25% 回收率）
const SHOP_PRICE = { fan: 500, ling: 2000, bao: 8000, xian: 50000, shen: 200000 }; // 商店价（按品质，重新平衡：神品≈中等玩家15天收入）
const SHOP_REFRESH_FREE = 10;        // 每日免费刷新次数（前 10 次免费）
const SHOP_REFRESH_PAID_MAX = 10;    // 每日灵石付费刷新上限（第 11~20 次）
const SHOP_REFRESH_PAID_COST = 500;  // 每次灵石付费刷新消耗的灵石

function initHub() {
  const hub = document.getElementById('hub-screen');
  const floatIconContainer = document.getElementById('hub-float-icons');
  // 初始化头像系统（兼容旧存档）
  if (typeof initAvatarSystem === 'function') initAvatarSystem();

  // 头像点击 → 打开头像选择弹窗
  const avatarWrap = document.querySelector('.hub-avatar-wrap');
  if (avatarWrap) {
    avatarWrap.style.cursor = 'pointer';
    avatarWrap.addEventListener('click', (e) => {
      e.stopPropagation();
      if (typeof showAvatarModal === 'function') showAvatarModal();
    });
    // 恢复 pointer-events（CSS 设了 none）
    avatarWrap.style.pointerEvents = 'auto';
  }
  const powerEl = document.getElementById('hub-power-num');
  const charVideo = document.getElementById('hub-char-video');

  // 统一悬浮菜单栏：底栏主功能(5) + 顶栏功能(6) = 11个图标一行
  // 排列顺序：属性/装备/背包/功法/副本 | 每日奖励/商店/图鉴/世界BOSS/排行榜/设置
  const ALL_HUB_ITEMS = [...HUB_BOTTOM_ITEMS, ...HUB_TOP_ITEMS];

  floatIconContainer.innerHTML = ALL_HUB_ITEMS.map(item =>
    `<button class="hub-float-btn" data-hub="${item.id}" title="${item.label}">${item.icon}<h3 style="margin:0">${item.label}</h3></button>`
  ).join('');

  // 统一事件绑定（全部 11 个图标在悬浮栏内）
  floatIconContainer.querySelectorAll('[data-hub]').forEach(btn => {
      btn.addEventListener('click', () => {
        const item = ALL_HUB_ITEMS.find(i => i.id === btn.dataset.hub);
        if (!item) return;
        handleHubAction(item);
      });
    });

  // 统一动作分发
  function handleHubAction(item) {
    switch (item.action) {
      case 'go_story':      openStoryScreen(); break;
      case 'go_worldboss': openWorldBossScreen(); break;
      case 'go_rank':
        if (window.Online && window.Online.showBoard) window.Online.showBoard();
        else openModal('<div class="hub-modal-title"><h3 style="margin:0">排行榜</h3></div><p style="color:rgba(241,239,232,0.7)">联网功能尚未开启，完成腾讯云配置后即可查看全服排行榜。</p><button class="btn-full" onclick="returnToHub()" style="margin-top:14px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.12)">返回主页</button></div>');
        break;
      case 'modal_attr':    showAttrModal(); break;
      case 'modal_skills':  showSkillsModal(); break;
      case 'modal_equip':   showEquipModal(); break;
      case 'modal_bag':     showBagModal(); break;
      case 'modal_shop':    showShopModal(); break;
      case 'modal_daily':   openDailyRewardScreen(); break;
      case 'modal_codex':   openCodex(); break;
      case 'modal_chestinfo':openChestInfo(); break;
      case 'modal_settings':showSettingsModal(); break;
      default:
        openModal(`<div class="hub-modal-title"><h3 style="margin:0">${item.label}</h3></div><p style="color:rgba(241,239,232,0.7)">「${item.label}」功能正在开发中，敬请期待！</p><button class="btn-full" onclick="returnToHub()" style="margin-top:14px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.12)">返回主页</button></div>`);
    }
  }

  // 设置弹窗（含抽奖概率入口）
  function showSettingsModal() {
    refreshHub();
    const r = CULTIVATION.realmFromXp(player.xp);
    openModal(`<div class="scroll-panel"><div class="scroll-rod"></div><div class="scroll-silk"></div><div class="scroll-painting"></div><div class="scroll-paper"><div class="scroll-inner">
            <svg viewBox="0 0 24 24" fill="none" stroke="#D4A843" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06A1.65 1.65 0 0015 18.96a1.65 1.65 0 00-1.82.33V19a2 2 0 01-2.82 0v-.08A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82-.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.6 15a1.65 1.65 0 00-.33-1.82V13a2 2 0 012.82 0v.08A1.65 1.65 0 0010.6 13a1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 13v2z"/></svg><h3 style="margin:0">设置</h3></div>
      <p style="color:rgba(241,239,232,0.7)"><b>${esc(player.name)}</b> · <b>${esc(r.label)}</b></p>

      <div style="display:flex;flex-direction:column;gap:10px">
        <button class="btn-full" onclick="openChestInfo()">
          <span style="font-size:14px;font-weight:600">📊 抽奖概率</span><br>
          <span style="font-size:11px;color:rgba(232,220,192,0.5)">查看功法/装备宝箱各品质掉落概率与保底机制</span>
        </button>

        <button class="btn-full" onclick="openModal('<h3 style=color:#D4A843>清空存档</h3><p style=color:rgba(241,239,232,0.7)>确定要清空存档重新开始吗？所有进度将丢失！</p><button class=btn-full onclick=localStorage.removeItem(&apos;wuxia_save&apos;);location.reload(); style=margin-top:14px;background:rgba(232,123,123,0.15);border:1px solid rgba(232,123,123,0.4)>确认清空</button><button class=btn-full onclick=closeModal() style=margin-top:14px>取消</button>')">
          <span style="font-size:14px;font-weight:600;color:#E87B7B">🗑️ 清空存档</span><br>
          <span style="font-size:11px;color:rgba(232,220,192,0.5)">删除所有游戏数据，重新创建角色（不可恢复）</span>
        </button>

        <div class="bg-info-card">
          <div class="lbl">游戏信息</div>
          <div class="val">
            版本：v1.3.0<br>
            存档：浏览器本地存储<br>
            灵石：<b>${formatNum(player.gold)}</b> · 钻石：<b style="color:#7db8ff">${player.diamond || 0}</b><br>
            战力：<b style="color:#e87b7b">${formatNum(calcCombatPower(player))}</b>
          </div>
        </div>
      </div>

      <button class="btn-full" onclick="returnToHub()" style="margin-top:14px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.12)">返回主页</button>`);
  }
  window.showSettingsModal = showSettingsModal;

  // ====== 全局：主页境界/进度条同步（弹窗和主页共用同一份数据） ======
  function syncRealmDOM() {
    // CULTIVATION 是 cultivation.js 里 const 声明的脚本级变量（非 window 属性），直接引用即可
    if (typeof CULTIVATION === 'undefined') { console.warn('[syncRealm] CULTIVATION not loaded yet'); return; }
    const r = CULTIVATION.realmFromXp(player.xp);
    const el = (id) => document.getElementById(id);
    const re = el('hub-realm'), xf = el('hub-xp-fill'), xr = el('hub-xp-realm'), xn = el('hub-xp-nums');
    // [syncRealm] debug removed in production
    if (re) re.textContent = r.label || '凡人';
    if (xf) xf.style.width = Math.round((r.progress || 0) * 100) + '%';
    if (xr) xr.textContent = (r.label || '凡人').split(' ')[0]; // 只取"筑基境"不含重天
    if (xn) xn.textContent = formatNum(r.xpIntoStage) + '/' + formatNum(r.xpForStage);
  }

  // 更新主页数据
  function refreshHub() {
    // 玩家名字已隐藏（用户要求不显示）
    powerEl.textContent = formatNum(calcCombatPower(player));
    // 头像：使用头像系统（默认当前角色，可切换）
    if (typeof refreshHubAvatar === 'function') refreshHubAvatar();
    syncRealmDOM();
    // 角色展示：B+C 融合 —— 当前所选角色「打坐修炼」横版动画（视频，失败自动回退静图 poster）
    const _aid = player.avatarId || 'm2';
    const _vid = 'assets/select/' + _aid + '_med_h.mp4?v=23';
    const _png = 'assets/select/' + _aid + '_med_h.png?v=23';
    if (charVideo.dataset.src !== _vid) {
      charVideo.dataset.src = _vid;
      charVideo.poster = _png;
      charVideo.src = _vid;
      charVideo.load();
      const _pp = charVideo.play();
      if (_pp && _pp.catch) _pp.catch(() => {});
    }
  }

  // 挂机：在线停留即自动累加修为（主页/地图/战斗画面）
  if (!window._hubIdleStarted) {
    window._hubIdleStarted = true;
    let _saveTick = 0;
    setInterval(() => {
      if (state === 'hub' || state === 'battle') {  /* map mode removed */
        gainXp(ONLINE_XP_PER_SEC * (1 + player.xpBonus), false);
        powerEl.textContent = formatNum(calcCombatPower(player));
        syncRealmDOM(); // 每秒同步境界+进度条
      }
      player.lastSeen = Date.now();
      if (++_saveTick % 5 === 0) saveGame(); // 每 5 秒落盘一次
    }, HUB_TICK_MS);
  }

  // 属性弹窗 A 鎏金玄铁 · 黑金磨砂写实仙侠风 · 一屏紧凑 · 详细属性保持原排版
  function showAttrModal() {
    refreshHub(); // 先同步主页境界/进度条/战力，保证与弹窗一致
    const r = CULTIVATION.realmFromXp(player.xp);
    const earned = BASE_FREE_POINTS + r.globalIndex * POINTS_PER_STAGE;
    const free = earned - player.spent;
    const pct = v => Math.round(v * 100) + '%';
    const fmt = n => formatNum(n);
    // 6大属性（3行×2列紧凑网格）
    const mainRow = k => `
      <div class="attr-cell-a">
        <div class="attr-l-a"><span class="nm">${ATTR_NAMES[k]}</span><span class="val">${player[k]}</span></div>
        <div class="attr-btns-a">
          <button onclick="allocAttr('${k}',-1)" ${player[k] <= 10 ? 'disabled' : ''}>−</button>
          <button onclick="allocAttr('${k}',1)" ${free <= 0 ? 'disabled' : ''}>+</button>
        </div>
      </div>`;
    // 经验条
    const xpPct = Math.round(r.progress * 100);
    const xpHtml = `
      <div class="xp-bar-a">
        <div class="xp-info-a"><span class="rlm">${esc(r.label)}</span><span class="num">${fmt(r.xpIntoStage)} / ${fmt(r.xpForStage)}（${xpPct}%）</span></div>
        <div class="xp-track-a"><div class="xp-fill-a" style="width:${xpPct}%"></div></div>
      </div>`;
    // 详细属性（保持原始 cell 网格排版：图标+名称+数值，auto-fill 自然流式）
    const dCell = (ic, lab, val, isPower) => `<div class="detail-cell-a${isPower ? ' power' : ''}"><span class="dc-icon">${ic}</span><span class="dc-lab">${lab}</span><span class="dc-val">${val}</span></div>`;
    const derived = [
      dCell('❤', '生命上限', fmt(player.maxHp)),
      dCell('✦', '灵力上限', fmt(player.maxMp)),
      dCell('⚔', '物理攻击', fmt(player.atk)),
      dCell('☯', '精神攻击', fmt(player.spiAtk)),
      dCell('🛡', '物理防御', fmt(player.def)),
      dCell('🛡', '精神防御', fmt(player.spiDef)),
      dCell('🎯', '命中率', pct(player.hitRate)),
      dCell('⚡', '先攻值', fmt(player.init)),
      dCell('🍀', '闪避率', pct(player.eva)),
      dCell('🍀', '幸运值', fmt(player.luck)),
      dCell('🎯', '暴击率', pct(player.critRate)),
      dCell('💥', '暴击伤害', Math.round(player.critDmg * 100) + '%'),
      dCell('📈', '挂机加成', pct(player.xpBonus)),
      dCell('⚡', '战力', fmt(calcCombatPower(player)), true),
    ].join('');
    openModal(`
      <div class="attr-panel-a">
        <div class="p-title-a">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 2L4 7l8 5 8-5-8-5zM4 12l8 5 8-5M4 17l8 5 8-5" stroke="#c9972f" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
          <h3 style="margin:0">角色属性</h3>
        </div>
        ${xpHtml}
        <div class="sec-head-a">— 可分配点数 —</div>
        <div class="free-info-a">基础 ${BASE_FREE_POINTS} · 每阶 +${POINTS_PER_STAGE}（剩余 <b>${free}</b>）</div>
        <div class="attr-grid-a">${ATTR_KEYS.map(mainRow).join('')}</div>
        <div class="div-line-a"></div>
        <div class="sec-head-a">— 详细属性 —</div>
        <div class="detail-grid-a">${derived}</div>
        <button class="btn-back-a" onclick="returnToHub()">返回主页</button>
      </div>`, 'attr-modal');
  }

  // 功法弹窗：最多装备 6 种，战斗中每回合点选；下方为已习得功法库（点选装备/卸下）
  function tierColor(t) { return ({ 1: '#9aa0a6', 2: '#639922', 3: '#378ADD', 4: '#9B6BCC', 5: '#D4A843', 6: '#E87B7B', 7: '#E8D9A0' })[t] || '#9aa0a6'; }

  // 功法库筛选/排序状态（模块级，renderSkillLib 读取 DOM 下拉后更新）
  let _skillFilterTier = 0, _skillSortBy = 'tier';
  const SKILL_TIER_OPTS = [['0', '全部品阶'], ['1', '黄阶'], ['2', '玄阶'], ['3', '地阶'], ['4', '天阶'], ['5', '王阶'], ['6', '皇阶'], ['7', '帝阶']]
    .map(([v, t]) => `<option value="${v}">${t}</option>`).join('');

  // 单条功法行：主动=装备/已装备按钮；被动=显示【被动】自动加成（无装备按钮）
  function skillRowHtml(s, isEquipped, equipped) {
    const on = isEquipped(s.id);
    const isPassive = s.kind === 'passive';
    let right;
    if (isPassive) {
      right = '<span style="color:#5a3d7a;font-size:12px;white-space:nowrap">【被动】自动加成</span>';
    } else if (on) {
      right = '<span style="color:#2a6048;font-size:12px;white-space:nowrap">已装备</span>';
    } else {
      const full = equipped.length >= MAX_EQUIPPED;
      right = `<button class="equip-btn" ${full ? 'disabled' : ''} onclick="equipSkill('${s.id}')">装备</button>`;
    }
    return `<div class="bag-item"><div class="bag-info">
      <span class="equip-icon" style="color:${tierColor(s.tier)}">${s.tierName[0]}</span>
      <span class="bag-name">${esc(s.name)}</span>
      <span class="equip-bonus">${esc(s.schoolCn)} · ${s.cost}灵 · ${esc(s.desc)}</span></div>
      ${right}</div>`;
  }

  // 渲染已习得功法库：分主动型 / 被动型两栏，支持品阶筛选 + 品阶/类型排序
  function renderSkillLib() {
    const tf = document.getElementById('skillTierFilter');
    const sb = document.getElementById('skillSortBy');
    if (tf) _skillFilterTier = parseInt(tf.value, 10) || 0;
    if (sb) _skillSortBy = sb.value || 'tier';
    const learned = player.learned || [];
    let list = learned.map(id => SKILLS_DB_MAP[id]).filter(Boolean);
    if (_skillFilterTier) list = list.filter(s => s.tier === _skillFilterTier);
    if (_skillSortBy === 'tier') list.sort((a, b) => a.tier - b.tier || a.id.localeCompare(b.id));
    else list.sort((a, b) => a.school.localeCompare(b.school) || a.tier - b.tier);
    const equipped = player.equippedSkills || [];
    const isEquipped = id => equipped.includes(id);
    const act = list.filter(s => s.kind !== 'passive');
    const pas = list.filter(s => s.kind === 'passive');
    const actHtml = act.length ? act.map(s => skillRowHtml(s, isEquipped, equipped)).join('')
      : '<div style="opacity:.55;padding:8px;font-size:12px;color:#5c5042">该筛选下暂无主动功法</div>';
    const pasHtml = pas.length ? pas.map(s => skillRowHtml(s, isEquipped, equipped)).join('')
      : '<div style="opacity:.55;padding:8px;font-size:12px;color:#5c5042">该筛选下暂无被动心法</div>';
    const box = document.getElementById('skillLibBox');
    if (box) box.innerHTML = `
      <div class="equip-sec-title">主动型功法（${act.length}）</div>
      <div class="bag-list">${actHtml}</div>
      <div class="equip-sec-title">被动型心法（${pas.length}）· 习得即永久加成</div>
      <div class="bag-list">${pasHtml}</div>`;
  }
  window.renderSkillLib = renderSkillLib;

  function showSkillsModal() {
    refreshHub(); // 同步主页数据
    const equipped = player.equippedSkills || [];
    const learned = player.learned || [];
    const isEquipped = id => equipped.includes(id);
    // 已装备槽位（固定 6 格）
    const slotHtml = Array.from({ length: MAX_EQUIPPED }).map((_, i) => {
      const id = equipped[i];
      if (id && SKILLS_DB_MAP[id]) {
        const s = SKILLS_DB_MAP[id];
        return `<div class="bag-item"><div class="bag-info">
          <span class="equip-icon" style="color:${tierColor(s.tier)}">${s.tierName[0]}</span>
          <span class="bag-name">${esc(s.name)}</span>
          <span class="equip-bonus">${esc(s.schoolCn)} · ${s.cost}灵</span></div>
          <button class="equip-btn danger" onclick="unequipSkill('${id}')">卸下</button></div>`;
      }
      return `<div class="equip-slot" style="opacity:.5;text-align:center;color:#5c5042;display:flex;align-items:center;justify-content:center">空槽位 ${i + 1}</div>`;
    }).join('');
    // 已习得功法库：由 renderSkillLib() 动态渲染（分主动/被动两栏 + 品阶筛选/排序）

    openModal(`<div class="scroll-panel"><div class="scroll-rod"></div><div class="scroll-silk"></div><div class="scroll-painting"></div><div class="scroll-paper"><div class="scroll-inner">
            <svg viewBox="0 0 24 24" fill="none"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg><h3 style="margin:0">功法</h3></div>
      <p style="color:rgba(241,239,232,0.7);margin:0 0 10px">最多同时装备 <b>${MAX_EQUIPPED}</b> 种功法；战斗中每回合自行点选施展。普攻恒为物理（0 灵力）。</p>
      <div class="equip-sec-title">已装备（${equipped.length}/${MAX_EQUIPPED}）</div>
      <div class="bag-list">${slotHtml}</div>
      <hr>
      <div style="display:flex;gap:10px;margin:6px 0;flex-wrap:wrap">
        <label>品阶 <select id="skillTierFilter" onchange="renderSkillLib()">${SKILL_TIER_OPTS}</select></label>
        <label>排序 <select id="skillSortBy" onchange="renderSkillLib()"><option value="tier">按品阶</option><option value="school">按类型</option></select></label>
      </div>
      <div id="skillLibBox"></div>
      <button class="btn-full" onclick="returnToHub()" style="margin-top:14px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.12)">返回主页</button>`);
    renderSkillLib();
  }

  // 装备/卸下功法（≤6）
  function equipSkill(id) {
    if (!player.learned.includes(id)) return;
    if ((player.equippedSkills || []).includes(id)) return;
    if ((player.equippedSkills || []).length >= MAX_EQUIPPED) return;
    player.equippedSkills = player.equippedSkills || [];
    player.equippedSkills.push(id);
    saveGame(); refreshHub(); showSkillsModal();
  }
  function unequipSkill(id) {
    if (!player.equippedSkills) return;
    player.equippedSkills = player.equippedSkills.filter(x => x !== id);
    saveGame(); refreshHub(); showSkillsModal();
  }
  window.equipSkill = equipSkill;
  window.unequipSkill = unequipSkill;

  window.showSkillsModal = showSkillsModal;
  // 装备弹窗（穿戴 / 卸下 / 背包）
  // ===== 物品图标（SVG，按类型/部位/品质/名称绘制）=====
  //   type: equip|chest|pill
  //   ref:  equip→slot(weapon/armor/accessory/boots), chest→kind(skill/equip/exp/stone), pill→kind(hp/mp)
  //   rc:   品质描边色
  //   name: 物品名称（可选，用于区分武器子类：剑/刀/枪/戟）
  function invIconSVG(type, ref, rc, name) {
    const wrap = inner => `<svg viewBox="0 0 48 48" class="ii" preserveAspectRatio="xMidYMid meet">${inner}</svg>`;
    const c = rc || '#9a7b3f';
    // ── 武器：按名称后缀区分子类 ──
    if (type === 'equip' && ref === 'weapon') {
      const wt = (name || '').includes('刀') ? 'dao'
        : (name || '').includes('枪') ? 'qiang'
        : (name || '').includes('戟') ? 'ji' : 'jian';
      if (wt === 'jian') return wrap(
        // ── 剑：直刃双锋，优雅修长 ──
        `<defs>
          <linearGradient id="jBlade" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#e8eef5"/><stop offset="50%" stop-color="#c5d1de"/><stop offset="100%" stop-color="#9aabbe"/></linearGradient>
          <linearGradient id="jHilt" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#8b6914"/><stop offset="100%" stop-color="#5a4309"/></linearGradient>
          <linearGradient id="jGold" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#f0c75a"/><stop offset="100%" stop-color="#c9972f"/></linearGradient>
        </defs>
        <!-- 剑身 -->
        <path d="M23.5 3 L25.5 3 L26 24 L24 27 L22 24 Z" fill="url(#jBlade)" stroke="${c}" stroke-width="0.8"/>
        <path d="M24 4 L24 25" stroke="#fff" stroke-width="0.5" opacity="0.5"/>
        <!-- 护手 -->
        <rect x="17" y="25" width="14" height="2.5" rx="1" fill="url(#jGold)" stroke="${c}" stroke-width="0.6"/>
        <rect x="18.5" y="24" width="11" height="1" rx="0.5" fill="#fff3d0" opacity="0.4"/>
        <!-- 剑柄 -->
        <rect x="22.5" y="27.5" width="3" height="9" rx="1" fill="url(#jHilt)" stroke="${c}" stroke-width="0.6"/>
        <line x1="23" y1="29.5" x2="25" y2="29.5" stroke="#c79a5e" stroke-width="0.6"/>
        <line x1="23" y1="32" x2="25" y2="32" stroke="#c79a5e" stroke-width="0.6"/>
        <line x1="23" y1="34.5" x2="25" y2="34.5" stroke="#c79a5e" stroke-width="0.6"/>
        <!-- 剑首 -->
        <ellipse cx="24" cy="38" rx="2.8" ry="2" fill="url(#jGold)" stroke="${c}" stroke-width="0.6"/>
        <ellipse cx="24" cy="37.5" rx="1.8" ry="1" fill="#fff3d0" opacity="0.35"/>`);
      if (wt === 'dao') return wrap(
        // ── 刀：弧形单刃，刚猛厚重 ──
        `<defs>
          <linearGradient id="dBlade" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#f0ebe3"/><stop offset="40%" stop-color="#d4c9b8"/><stop offset="100%" stop-color="#a89a85"/></linearGradient>
          <linearGradient id="dHilt" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#6b4423"/><stop offset="100%" stop-color="#3d2612"/></linearGradient>
          <linearGradient id="dGold" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#e6b86a"/><stop offset="100%" stop-color="#b8893d"/></linearGradient>
        </defs>
        <!-- 刀身（弧形） -->
        <path d="M20 4 Q28 6 30 16 Q31 22 28 26 L19 25 Q17 20 16 14 Q15 8 20 4 Z" fill="url(#dBlade)" stroke="${c}" stroke-width="0.8"/>
        <!-- 刃线 -->
        <path d="M21 5.5 Q27.5 7.5 29 16 Q29.8 21 27.5 24.5" stroke="#fff" stroke-width="0.6" fill="none" opacity="0.45"/>
        <!-- 刀背 -->
        <path d="M19 5 Q16 10 16 14 Q16.5 19 19 24.5" stroke="#8a7a65" stroke-width="1" fill="none"/>
        <!-- 刀镡(圆盘) -->
        <circle cx="22" cy="26" r="3.5" fill="url(#dGold)" stroke="${c}" stroke-width="0.6"/>
        <circle cx="22" cy="25.6" r="2.2" fill="#fff3d0" opacity="0.3"/>
        <!-- 刀柄 -->
        <rect x="20.8" y="29" width="2.4" height="8" rx="1" fill="url(#dHilt)" stroke="${c}" stroke-width="0.6"/>
        <line x1="21.2" y1="31" x2="22.8" y2="31" stroke="#a67c4a" stroke-width="0.5"/>
        <line x1="21.2" y1="33.5" x2="22.8" y2="33.5" stroke="#a67c4a" stroke-width="0.5"/>
        <!-- 环首 -->
        <circle cx="22" cy="38.5" r="2.2" fill="none" stroke="url(#dGold)" stroke-width="1.2"/>`);
      if (wt === 'qiang') return wrap(
        // ── 枪：长杆直刺，红缨飘扬 ──
        `<defs>
          <linearGradient qShaft x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#c4956a"/><stop offset="50%" stop-color="#8b633a"/><stop offset="100%" stop-color="#6b4725"/></linearGradient>
          <linearGradient qHead x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#e8eef5"/><stop offset="100%" stop-color="#8a9aae"/></linearGradient>
        </defs>
        <!-- 枪杆 -->
        <rect x="23" y="12" width="2" height="33" rx="0.5" fill="url(#qShaft)" stroke="${c}" stroke-width="0.5"/>
        <!-- 枪头（菱形） -->
        <path d="M24 2 L28 13 L24 11 L20 13 Z" fill="url(#qHead)" stroke="${c}" stroke-width="0.8"/>
        <path d="M24 3 L26.5 12 L24 10.5 L21.5 12 Z" stroke="#fff" stroke-width="0.4" fill="none" opacity="0.5"/>
        <!-- 枪缨（红色） -->
        <path d="M21 13 Q19 16 20 19 Q22 17 23 14" fill="#c43c3c" opacity="0.85"/>
        <path d="M27 13 Q29 16 28 19 Q26 17 25 14" fill="#c43c3c" opacity="0.85"/>
        <path d="M22 13 Q21 15 21.5 17.5" stroke="#e86b6b" stroke-width="0.5" fill="none" opacity="0.6"/>
        <path d="M26 13 Q27 15 26.5 17.5" stroke="#e86b6b" stroke-width="0.5" fill="none" opacity="0.6"/>`);
      if (wt === 'ji') return wrap(
        // ── 戟：月牙侧刃+直锋，威武双刃 ──
        `<defs>
          <linearGradient jShaft x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#9a7b55"/><stop offset="100%" stop-color="#5c462d"/></linearGradient>
          <linearGradient jSteel x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#dde4ed"/><stop offset="60%" stop-color="#a8b8cc"/><stop offset="100%" stop-color="#7a8a9e"/></linearGradient>
          <linearGradient jGold x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#f0c75a"/><stop offset="100%" stop-color="#b8893d"/></linearGradient>
        </defs>
        <!-- 戟杆 -->
        <rect x="23" y="14" width="2" height="31" rx="0.5" fill="url(#jShaft)" stroke="${c}" stroke-width="0.5"/>
        <!-- 直刃（类似短剑） -->
        <path d="M24 2 L26.5 14 L24 16 L21.5 14 Z" fill="url(#jSteel)" stroke="${c}" stroke-width="0.8"/>
        <path d="M24 3 L25.5 13 L24 14.5 L22.5 13 Z" stroke="#fff" stroke-width="0.4" fill="none" opacity="0.4"/>
        <!-- 月牙刃（侧边弯刀） -->
        <path d="M26.5 9 Q34 11 33 16 Q32 19 27 17 Q28 14 26.5 12 Z" fill="url(#jSteel)" stroke="${c}" stroke-width="0.8"/>
        <!-- 月牙内弧高光 -->
        <path d="M27.5 10.5 Q32 12 31.5 15.5 Q31 17 28 16" stroke="#fff" stroke-width="0.4" fill="none" opacity="0.35"/>
        <!-- 装饰箍 -->
        <rect x="21.5" y="14.5" width="5" height="2" rx="0.5" fill="url(#jGold)" stroke="${c}" stroke-width="0.5"/>`);
    }
    if (type === 'equip') {
      if (ref === 'armor') return wrap(
        // ── 甲：护心镜战甲 ──
        `<defs>
          <linearGradient aBody x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#c8d0dc"/><stop offset="50%" stop-color="#9aa8bc"/><stop offset="100%" stop-color="#6a7a8e"/></linearGradient>
          <linearGradient aMirror x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#f0c75a"/><stop offset="100%" stop-color="#c9972f"/></linearGradient>
        </defs>
        <path d="M14 13 H34 L37 19 V32 Q37 41 24 44 Q11 41 11 32 V19 Z" fill="url(#aBody)" stroke="${c}" stroke-width="1"/>
        <!-- 中缝 -->
        <path d="M24 13 V43" stroke="#7a8a9e" stroke-width="1.2"/>
        <!-- 护心镜 -->
        <circle cx="24" cy="23" r="4" fill="url(#aMirror)" stroke="${c}" stroke-width="0.8"/>
        <circle cx="23.5" cy="22.5" r="2.5" fill="#fff3d0" opacity="0.35"/>
        <!-- 肩甲 -->
        <path d="M11 17 Q8 15 10 12 Q14 13 14 15" fill="#8a98aa" stroke="${c}" stroke-width="0.8"/>
        <path d="M37 17 Q40 15 38 12 Q34 13 34 15" fill="#8a98aa" stroke="${c}" stroke-width="0.8"/>`);
      if (ref === 'accessory') return wrap(
        // ── 饰：玉佩流苏 ──
        `<defs>
          <linearGradient rJade x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#5edab8"/><stop offset="50%" stop-color="#2aaf8a"/><stop offset="100%" stop-color="#1a8065"/></linearGradient>
          <linearGradient rGold x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#f0c75a"/><stop offset="100%" stop-color="#c9972f"/></linearGradient>
        </defs>
        <!-- 玉佩主体 -->
        <path d="M24 7 C31 7 36 13 36 20 C36 28 30 35 24 39 C18 35 12 28 12 20 C12 13 17 7 24 7 Z" fill="url(#rJade)" stroke="${c}" stroke-width="1.2"/>
        <!-- 内圈光泽 -->
        <path d="M24 10 C29 10 33 15 33 20 C33 26 29 32 24 35 C19 32 15 26 15 20 C15 15 19 10 24 10 Z" stroke="#a0f0d8" stroke-width="0.6" fill="none" opacity="0.4"/>
        <!-- 玉孔 -->
        <circle cx="24" cy="19" r="2.5" fill="#0d3328" stroke="${c}" stroke-width="0.6"/>
        <!-- 流苏 -->
        <line x1="24" y1="38" x2="24" y2="44" stroke="url(#rGold)" stroke-width="1"/>
        <circle cx="24" cy="44.5" r="1.2" fill="#f0c75a"/>`);
      if (ref === 'boots') return wrap(
        // ── 靴：武靴云纹 ──
        `<defs>
          <linearGradient bLeather x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#b8845c"/><stop offset="50%" stop-color="#8b633a"/><stop offset="100%" stop-color="#5c3f22"/></linearGradient>
          <linearGradient bSole x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#4a3218"/><stop offset="100%" stop-color="#2a1a0c"/></linearGradient>
        </defs>
        <!-- 靴筒 -->
        <path d="M17 7 H29 V24 L33 28 V33 H15 V28 L19 24 Z" fill="url(#bLeather)" stroke="${c}" stroke-width="1"/>
        <!-- 靴面装饰线 -->
        <path d="M19 10 H27 M19 14 H27 M19 18 H24" stroke="#d4a87a" stroke-width="0.8" stroke-linecap="round"/>
        <!-- 靴底 -->
        <path d="M14 33 H34 V37 Q34 39 30 40 H18 Q14 39 14 37 Z" fill="url(#bSole)" stroke="${c}" stroke-width="0.8"/>
        <!-- 云纹装饰 -->
        <path d="M21 26 Q24 24 27 26" stroke="#d4a87a" stroke-width="0.8" fill="none" stroke-linecap="round"/>`);
      return wrap(`<rect x="14" y="14" width="20" height="20" rx="3" fill="${c}"/>`);
    }
    if (type === 'chest') {
      if (ref === 'skill') return wrap(
        // ── 功法箱：竹简卷轴 ──
        `<defs>
          <linearGradient sRoll x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#f5ecd6"/><stop offset="100%" stop-color="#dccfa8"/></linearGradient>
          <linearGradient sBind x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#9a6a33"/><stop offset="100%" stop-color="#7a5025"/></linearGradient>
        </defs>
        <rect x="13" y="10" width="22" height="28" rx="2" fill="url(#sRoll)" stroke="${c}" stroke-width="1"/>
        <!-- 卷轴轴头 -->
        <rect x="11" y="8" width="26" height="4" rx="2" fill="url(#sBind)" stroke="${c}" stroke-width="0.8"/>
        <rect x="11" y="36" width="26" height="4" rx="2" fill="url(#sBind)" stroke="${c}" stroke-width="0.8"/>
        <!-- 文字纹路 -->
        <path d="M17 16 H31 M17 21 H31 M17 26 H28" stroke="#9a7b3f" stroke-width="1.2" stroke-linecap="round"/>
        <!-- 印章 -->
        <rect x="26" y="29" width="6" height="4" rx="1" fill="#c43c3c" opacity="0.75"/>`);
      if (ref === 'equip') return wrap(
        // ── 装备箱：兵器匣 ──
        `<defs>
          <linearGradient eBox x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#8b5a2a"/><stop offset="100%" stop-color="#5c3a18"/></linearGradient>
          <linearGradient eLid x1="0" y1="0" x2="1" x2="0"><stop offset="0%" stop-color="#c49a5c"/><stop offset="100%" stop-color="#9a6a33"/></linearGradient>
        </defs>
        <rect x="10" y="22" width="28" height="16" rx="2" fill="url(#eBox)" stroke="${c}" stroke-width="1"/>
        <!-- 匣盖（微开） -->
        <path d="M10 22 Q24 10 38 22 Z" fill="url(#eLid)" stroke="${c}" stroke-width="1"/>
        <rect x="10" y="20" width="28" height="3" rx="1" fill="${c}"/>
        <!-- 匣上交叉剑纹 -->
        <line x1="18" y1="17" x2="30" y2="17" stroke="${c}" stroke-width="1.5" stroke-linecap="round"/>
        <line x1="24" y1="13" x2="24" y2="21" stroke="${c}" stroke-width="1.5" stroke-linecap="round"/>
        <!-- 锁扣 -->
        <rect x="21.5" y="18" width="5" height="5" rx="1" fill="${c}"/>`);
      if (ref === 'exp') return wrap(
        // ── 经验星：璀璨星光 ──
        `<defs>
          <radialGradient xStar><stop offset="0%" stop-color="#fff7e0"/><stop offset="40%" stop-color="${c}"/><stop offset="100%" stop-color="#8a6a28"/></radialGradient>
        </defs>
        <path d="M24 4 L28 18 L42 18 L31 27 L35 42 L24 33 L13 42 L17 27 L6 18 L20 18 Z" fill="url(#xStar)" stroke="#fff3d0" stroke-width="0.8"/>
        <!-- 星芒 -->
        <g stroke="#fff" stroke-width="0.6" opacity="0.5" stroke-linecap="round">
          <line x1="24" y1="1" x2="24" y2="4"/><line x1="24" y1="44" x2="24" y2="41"/>
          <line x1="1" y1="24" x2="4" y2="24"/><line x1="44" y1="24" x2="41" y2="24"/>
          <line x1="8" y1="8" x2="10" y2="10"/><line x1="40" y1="40" x2="38" y2="38"/>
          <line x1="40" y1="8" x2="38" y2="10"/><line x1="8" y1="40" x2="10" y2="38"/>
        </g>`);
      if (ref === 'stone') return wrap(
        // ── 灵石：温润灵韵 ──
        `<defs>
          <linearGradient stTop x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#f0d068"/><stop offset="100%" stop-color="#c49a2e"/></linearGradient>
          <radialGradient stGlow><stop offset="0%" stop-color="#fff7e0" stop-opacity="0.6"/><stop offset="100%" stop-color="#f0d068" stop-opacity="0"/></radialGradient>
        </defs>
        <ellipse cx="24" cy="34" rx="13" ry="5" fill="#a07a20" opacity="0.3"/>
        <ellipse cx="24" cy="30" rx="13" ry="5" fill="#c49a2e"/>
        <ellipse cx="24" cy="26" rx="13" ry="5" fill="#ddb84a"/>
        <ellipse cx="24" cy="22" rx="13" ry="5" fill="url(#stTop)"/>
        <!-- 光晕 -->
        <ellipse cx="24" cy="22" rx="9" ry="3" fill="url(#stGlow)"/>
        <!-- 灵字 -->
        <text x="24" y="25" font-size="9" font-weight="700" text-anchor="middle" fill="#7a5f1e" font-family="'KaiTi','STKaiti',serif">灵</text>`);
      return wrap(`<rect x="12" y="12" width="24" height="24" rx="4" fill="${c}"/>`);
    }
    if (type === 'pill') {
      const col = ref === 'hp' ? '#d9534f' : '#3a78c2';
      const colLight = ref === 'hp' ? '#e88a85' : '#7aaddd';
      const colDark = ref === 'hp' ? '#a32d2a' : '#255a94';
      return wrap(
        // ── 丹药：玉瓶丹药 ──
        `<defs>
          <linearGradient pGlass x1="0" y1="0" x2="1" x2="0"><stop offset="0%" stop-color="${colLight}" stop-opacity="0.5"/><stop offset="50%" stop-color="#fff" stop-opacity="0.25"/><stop offset="100%" stop-color="${colLight}" stop-opacity="0.5"/></linearGradient>
          <linearGradient pLiquid x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${col}"/><stop offset="100%" stop-color="${colDark}</stop></linearGradient>
          <linearGradient pCork x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#caa15a"/><stop offset="100%" stop-color="#9a7a3a"/></linearGradient>
        </defs>
        <!-- 瓶塞 -->
        <rect x="20.5" y="4" width="7" height="5" rx="1.5" fill="url(#pCork)" stroke="${c}" stroke-width="0.6"/>
        <!-- 瓶身 -->
        <path d="M19 9 H29 V21 Q29 35 24 40 Q19 35 19 21 Z" fill="url(#pLiquid)" stroke="${c}" stroke-width="0.8"/>
        <!-- 玻璃高光 -->
        <path d="M20.5 10.5 H27.5 V20 Q27.5 32 24 36 Q20.5 32 20.5 20 Z" fill="url(#pGlass)"/>
        <!-- 标记符号 -->
        ${ref === 'hp'
          ? '<path d="M24 16 V28 M19 22 H29" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/>'
          : '<path d="M24 16 V28 M21 22 H27" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/>'}`);
    }
    return wrap(`<rect x="14" y="14" width="20" height="20" rx="3" fill="${c}"/>`);
  }

  // ===== 悬浮提示系统（小格子物品栏）=====
  function invBuildTip(kind, key) {
    if (kind === 'equip') {
      const it = (player.bag || []).find(x => x.uid === key); if (!it) return '';
      const bonus = equipBonusText(it), eff = equipEffectText(it), sell = SELL_PRICE[it.rarity] || 8;
      return `<div class="tt-name" style="color:${it.rarityColor}">${esc(it.name)}</div>
        <div class="tt-meta">${it.rarityName} · ${EQUIP_SLOTS[it.slot].name}</div>
        <div class="tt-stat">${esc(bonus)}${eff ? '<br>' + esc(eff) : ''}</div>
        <div class="tt-acts">
          <button class="tt-btn go" onclick="invAct(function(){equipItem('${it.uid}')})">装备</button>
          <button class="tt-btn sell" onclick="invAct(function(){sellItem('${it.uid}')})">出售 ${sell}</button>
        </div>`;
    }
    if (kind === 'equipped') {
      const it = player.equipment[key]; if (!it) return '';
      const bonus = equipBonusText(it), eff = equipEffectText(it);
      return `<div class="tt-name" style="color:${it.rarityColor}">${esc(it.name)}</div>
        <div class="tt-meta">已穿戴 · ${it.rarityName} · ${EQUIP_SLOTS[it.slot].name}</div>
        <div class="tt-stat">${esc(bonus)}${eff ? '<br>' + esc(eff) : ''}</div>
        <div class="tt-acts"><button class="tt-btn off" onclick="invAct(function(){unequipSlot('${key}')})">卸下</button></div>`;
    }
    if (kind === 'chest') {
      const it = (player.bag || []).find(x => x.uid === key); if (!it) return '';
      const rc = it.rarityColor || '#9a7b3f';
      return `<div class="tt-name" style="color:${rc}">${esc(it.name)}</div>
        <div class="tt-meta">宝箱 · 点击开启</div>
        <div class="tt-stat">${esc(it.desc || '')}</div>
        <div class="tt-acts"><button class="tt-btn go" onclick="invAct(function(){openChestItem('${it.uid}')})">开启</button></div>`;
    }
    if (kind === 'pill') {
      const db = ITEM_DB[key]; if (!db) return '';
      const isHp = db.kind === 'hp', col = isHp ? '#d9534f' : '#3a78c2';
      const amt = Math.round((isHp ? player.maxHp : player.maxMp) * db.pct);
      return `<div class="tt-name" style="color:${col}">${esc(db.name)}</div>
        <div class="tt-meta">丹药 · ${db.tierName} · ${isHp ? '恢复气血' : '恢复灵力'}</div>
        <div class="tt-stat">单次恢复 <b>${amt}</b>（${Math.round(db.pct * 100)}%）<br>战斗中点击使用</div>`;
    }
    return '';
  }
  let _invTipTimer = null;
  function invShowTip(e, kind, key) {
    const el = document.getElementById('item-tip'); if (!el) return;
    el.innerHTML = invBuildTip(kind, key);
    if (!el.innerHTML) return;
    el.style.display = 'block';
    const r = e.currentTarget.getBoundingClientRect();
    const tw = el.offsetWidth, th = el.offsetHeight;
    let left = r.right + 10;
    if (left + tw > window.innerWidth - 8) left = r.left - tw - 10;
    if (left < 8) left = 8;
    let top = r.top + r.height / 2 - th / 2;
    top = Math.max(8, Math.min(top, window.innerHeight - th - 8));
    el.style.left = left + 'px'; el.style.top = top + 'px';
    clearTimeout(_invTipTimer);
  }
  function invHideTip() {
    _invTipTimer = setTimeout(() => { const el = document.getElementById('item-tip'); if (el) el.style.display = 'none'; }, 160);
  }
  function invAct(fn) {
    const el = document.getElementById('item-tip'); if (el) el.style.display = 'none';
    if (typeof fn === 'function') fn();
  }
  function invInitTip() {
    if (document.getElementById('item-tip')) return;
    const el = document.createElement('div');
    el.id = 'item-tip';
    el.addEventListener('mouseenter', () => clearTimeout(_invTipTimer));
    el.addEventListener('mouseleave', invHideTip);
    document.body.appendChild(el);
  }
  window.invShowTip = invShowTip; window.invHideTip = invHideTip; window.invAct = invAct;

  function showEquipModal() {
    refreshHub(); // 同步主页战力
    const gold = player.gold || 0;
    invInitTip();

    // 已穿戴：固定 4 个部位，每部位一格（空槽位显部位名）
    const slotCell = slot => {
      const def = EQUIP_SLOTS[slot];
      const it = player.equipment[slot];
      if (it) {
        return `<div class="inv2-cell" style="--rc:${it.rarityColor}" onmouseenter="invShowTip(event,'equipped','${slot}')" onmouseleave="invHideTip()">
          <div class="tile">${invIconSVG('equip', slot, it.rarityColor, it.name)}</div>
          <span class="nm" style="color:${it.rarityColor}">${esc(it.name)}</span>
        </div>`;
      }
      return `<div class="inv2-cell empty" onmouseenter="invHideTip()">
        <div class="tile" style="opacity:.35">${invIconSVG('equip', slot, '#9a7b3f')}</div>
        <span class="nm">${def.name}</span>
      </div>`;
    };

    // 背包装备：合并相同物品（部位+名称+品质），数量角标；悬浮出操作
    const bagEquips = (player.bag || []).filter(it => it && it.type !== 'chest');
    const eqGroups = [];
    const seen = new Map();
    bagEquips.forEach(it => {
      const k = it.slot + '|' + it.name + '|' + it.rarity;
      if (!seen.has(k)) { seen.set(k, eqGroups.length); eqGroups.push([it]); }
      else eqGroups[seen.get(k)].push(it);
    });
    const bagCells = eqGroups.length ? eqGroups.map(g => {
      const rep = g[0], qty = g.length;
      const equipped = player.equipment[rep.slot];
      const better = compareEquip(rep, equipped);
      return `<div class="inv2-cell" style="--rc:${rep.rarityColor}" onmouseenter="invShowTip(event,'equip','${rep.uid}')" onmouseleave="invHideTip()">
        ${qty > 1 ? `<span class="qty">${qty}</span>` : ''}
        ${better ? '<span class="better">▲</span>' : ''}
        <div class="tile">${invIconSVG('equip', rep.slot, rep.rarityColor, rep.name)}</div>
          <span class="nm" style="color:${rep.rarityColor}">${esc(rep.name)}</span>
        </div>`;
    }).join('')
      : `<div class="empty-tip">背包无装备 — 击败江湖敌人可掉落装备宝箱，或去商店购买。</div>`;

    openModal(`
      <div class="hub-modal-title"><svg viewBox="0 0 24 24" fill="none"><path d="M12 2L4 7l8 5 8-5-8-5zM4 12l8 5 8-5M4 17l8 5 8-5"/></svg>
      <h3 style="margin:0">装备</h3></div>
      <p style="color:rgba(241,239,232,0.7)">灵石 <b>${gold}</b> · 战力 <b style="color:#e87b7b">${formatNum(calcCombatPower(player))}</b></p>
      <div class="equip-sec-title">已穿戴</div>
      <div class="inv2-grid">${EQUIP_SLOT_KEYS.map(slotCell).join('')}</div>
      <hr>
      <div class="equip-sec-title">背包装备（${bagEquips.length}）</div>
      <div class="inv2-grid">${bagCells}</div>
      <button class="btn-full" onclick="returnToHub()" style="margin-top:14px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.12)">返回主页</button>`);
  }

  // 穿戴：从背包取出装备到对应部位，旧装备退回背包
  function equipItem(uid) {
    const i = player.bag.findIndex(it => it.uid === uid);
    if (i < 0) return;
    const item = player.bag[i];
    player.bag.splice(i, 1);
    const prev = player.equipment[item.slot];
    player.equipment[item.slot] = item;
    if (prev) player.bag.push(prev);
    recalcStats(player);
    player.hp = Math.min(player.hp, player.maxHp);
    saveGame();
    refreshHub();
    showEquipModal();
  }
  // 卸下：部位装备退回背包
  function unequipSlot(slot) {
    const it = player.equipment[slot];
    if (!it) return;
    player.equipment[slot] = null;
    player.bag.push(it);
    recalcStats(player);
    player.hp = Math.min(player.hp, player.maxHp);
    saveGame();
    refreshHub();
    showEquipModal();
  }
  window.equipItem = equipItem;
  window.unequipSlot = unequipSlot;
  window.showEquipModal = showEquipModal;
  window.showBagModal = showBagModal;

  // 背包弹窗：宝箱 > 丹药 > 装备 三段小格子，悬浮出详情/操作
  function showBagModal() {
    refreshHub();
    invInitTip();
    const gold = player.gold || 0;
    const bag = player.bag || [];
    const chests = bag.filter(it => it && it.type === 'chest');
    const equips = bag.filter(it => it && it.type !== 'chest');
    const pills = (player.items || []).filter(x => x.qty > 0);
    const groupBy = (arr, keyFn) => {
      const m = new Map();
      arr.forEach(it => { const k = keyFn(it); if (!m.has(k)) m.set(k, []); m.get(k).push(it); });
      return [...m.values()];
    };
    const eqGroups = groupBy(equips, it => it.slot + '|' + it.name + '|' + it.rarity);
    const chGroups = groupBy(chests, it => it.name + '|' + (it.rarity || ''));

    const eqCells = eqGroups.length ? eqGroups.map(g => {
      const rep = g[0], qty = g.length;
      const better = compareEquip(rep, player.equipment[rep.slot]);
      return `<div class="inv2-cell" style="--rc:${rep.rarityColor}" onmouseenter="invShowTip(event,'equip','${rep.uid}')" onmouseleave="invHideTip()">
        ${qty > 1 ? `<span class="qty">${qty}</span>` : ''}
        ${better ? '<span class="better">▲</span>' : ''}
        <div class="tile">${invIconSVG('equip', rep.slot, rep.rarityColor, rep.name)}</div>
          <span class="nm" style="color:${rep.rarityColor}">${esc(rep.name)}</span>
      </div>`;
    }).join('') : `<div class="empty-tip">暂无背包装备 — 击败江湖敌人可掉落宝箱，或去商店购买。</div>`;

    const chCells = chGroups.length ? chGroups.map(g => {
      const rep = g[0], qty = g.length;
      const rc = rep.rarityColor || '#9a7b3f';
      return `<div class="inv2-cell" style="--rc:${rc}" onmouseenter="invShowTip(event,'chest','${rep.uid}')" onmouseleave="invHideTip()">
        ${qty > 1 ? `<span class="qty">${qty}</span>` : ''}
        <div class="tile">${invIconSVG('chest', rep.chestKind, rc)}</div>
        <span class="nm" style="color:${rc}">${esc(rep.name)}</span>
      </div>`;
    }).join('') : `<div class="empty-tip">暂无宝箱 — 挑战世界BOSS、每日签到或商城可获宝箱。</div>`;

    const pillCells = pills.length ? pills.map(x => {
      const db = ITEM_DB[x.tid]; if (!db) return '';
      const isHp = db.kind === 'hp', col = isHp ? '#d9534f' : '#3a78c2';
      return `<div class="inv2-cell" style="--rc:${col}" onmouseenter="invShowTip(event,'pill','${x.tid}')" onmouseleave="invHideTip()">
        <span class="qty">${x.qty}</span>
        <div class="tile">${invIconSVG('pill', db.kind, col)}</div>
        <span class="nm" style="color:${col}">${esc(db.name)}</span>
      </div>`;
    }).join('') : `<div class="empty-tip">暂无丹药 — 可在商店「丹药专区」购买。</div>`;

    const pillTotal = pills.reduce((s, x) => s + x.qty, 0);
    openModal(`
      <div class="hub-modal-title"><svg viewBox="0 0 24 24" fill="none"><rect x="3" y="6" width="18" height="14" rx="2"/><path d="M8 6V4a2 0 012-2h4a2 0 012 2v2"/></svg>
      <h3 style="margin:0">背包</h3></div>
      <p style="color:rgba(241,239,232,0.7)">灵石 <b>${gold}</b> · 装备 <b>${equips.length}</b> · 宝箱 <b>${chests.length}</b> · 丹药 <b>${pillTotal}</b></p>
      <div class="equip-sec-title">宝箱（${chests.length}）</div>
      <div class="inv2-grid">${chCells}</div>
      <div class="equip-sec-title">丹药（${pillTotal}）</div>
      <div class="inv2-grid">${pillCells}</div>
      <div class="equip-sec-title">背包装备（${equips.length}）</div>
      <div class="inv2-grid">${eqCells}</div>
      <button class="btn-full" onclick="returnToHub()" style="margin-top:14px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.12)">返回主页</button>`);
  }

  // 商店弹窗：4 部位各一件随机在售装备，灵石足够可购买；不足则禁用
  //   不再每次打开自动刷新，改为手动刷新按钮（每天前 10 次免费，第 11~20 次每次消耗 500 灵石）
  let shopStock = [];
  function showShopModal() {
    refreshHub();
    renderShopModal();
  }
  function renderShopModal() {
    const gold = player.gold || 0;
    ensureDaily(); // 确保 daily 对象存在（用于刷新计数）
    const d = player.daily || {};
    const shopRefreshedToday = d.shopRefreshCount || 0;
    // 若尚无库存（首次打开或跨天后内存清空），先补一份库存（不计入刷新次数，仅保证不空白店）
    if (!shopStock || shopStock.length === 0) { shopStock = EQUIP_SLOT_KEYS.map(slot => genEquip(slot, rollRarity())); }
    // 钻石专区购买按钮（钻石不足则禁用）—— 统一短宽度
    const diamondBuyBtn = (type, price) => {
      const can = (player.diamond || 0) >= price;
      return can
        ? `<button class="equip-btn diamond-buy-btn" onclick="buyDiamondChest('${type}')">${price}钻</button>`
        : `<button class="equip-btn diamond-buy-btn" disabled style="background:rgba(255,255,255,0.06);color:rgba(241,239,232,0.3);cursor:default">${price}钻</button>`;
    };
    // 丹药商品（合并到灵石专区）
    const pillRows = ITEM_SHOP_ORDER.map(tid => {
      const it = ITEM_DB[tid];
      const can = gold >= it.price;
      const kindCn = it.kind === 'hp' ? '回血' : '回蓝';
      const btn = can
        ? `<button class="equip-btn diamond-buy-btn" onclick="buyItem('${tid}')">${it.price}灵</button>`
        : `<button class="equip-btn diamond-buy-btn" disabled style="background:rgba(255,255,255,0.06);color:rgba(241,239,232,0.3);cursor:default">${it.price}灵</button>`;
      return `<div class="bag-item">
        <div class="bag-info">
          <span class="bag-name" style="color:${it.kind === 'hp' ? '#3B6D11' : '#378ADD'}">${esc(it.name)}</span>
          <span class="equip-bonus">${it.tierName}·${kindCn}${Math.round(it.pct * 100)}%</span>
        </div>
        ${btn}
      </div>`;
    }).join('');
    const rows = shopStock.map(it => {
      const price = SHOP_PRICE[it.rarity] || 500;
      const can = gold >= price;
      const owned = isEquipOwned(it.entryId);
      const nameHtml = `<span class="bag-name" style="color:${it.rarityColor}">${esc(it.name)}</span>` +
        (owned ? ` <span class="owned-badge">已拥有</span>` : '');
      const btn = owned
        ? `<button class="equip-btn" disabled style="background:rgba(255,255,255,0.06);color:rgba(241,239,232,0.3);cursor:default">已拥有</button>`
        : (can
          ? `<button class="equip-btn" onclick="buyShopItem('${it.uid}')">购买·${price}灵石</button>`
          : `<button class="equip-btn" disabled style="background:rgba(255,255,255,0.06);color:rgba(241,239,232,0.3);cursor:default">${price}灵石</button>`);
      return `<div class="bag-item">
        <div class="bag-info">
          <span class="equip-icon">${EQUIP_SLOTS[it.slot].icon}</span>
          ${nameHtml}
          <span class="equip-bonus">${esc(equipBonusText(it))}${equipEffectText(it) ? esc(' · ' + equipEffectText(it)) : ''}</span>
        </div>
        ${btn}
      </div>`;
    }).join('');
    const shopRefreshTotal = SHOP_REFRESH_FREE + SHOP_REFRESH_PAID_MAX;
    let refreshBtn;
    if (shopRefreshedToday < SHOP_REFRESH_FREE) {
      const left = SHOP_REFRESH_FREE - shopRefreshedToday;
      refreshBtn = `<button class="equip-btn" onclick="doRefreshShop()" style="background:#2a6fd9;white-space:nowrap">🔄 刷新（免费·剩${left}次）</button>`;
    } else if (shopRefreshedToday < shopRefreshTotal) {
      const left = shopRefreshTotal - shopRefreshedToday;
      const can = (player.gold || 0) >= SHOP_REFRESH_PAID_COST;
      refreshBtn = can
        ? `<button class="equip-btn" onclick="doRefreshShop()" style="background:#2a6fd9;white-space:nowrap">🔄 灵石刷新（${SHOP_REFRESH_PAID_COST}·剩${left}次）</button>`
        : `<button class="equip-btn" disabled style="background:rgba(255,255,255,0.06);color:rgba(241,239,232,0.3);cursor:default">灵石刷新（需${SHOP_REFRESH_PAID_COST}·剩${left}次）</button>`;
    } else {
      refreshBtn = `<span style="font-size:11px;color:rgba(241,239,232,0.35);padding:4px 10px;border:1px dashed rgba(255,255,255,0.15);border-radius:6px">今日刷新次数已用完（${shopRefreshTotal}/${shopRefreshTotal}）</span>`;
    }
    openModal(`
      <div class="hub-modal-title"><svg viewBox="0 0 24 24" fill="none" stroke="#D4A843" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></svg>
      <h3 style="margin:0">商店</h3></div>
      <p style="color:rgba(241,239,232,0.7)">灵石 <b>${gold}</b> ｜ 钻石 <b style="color:#7db8ff">${player.diamond || 0}</b></p>
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
        <div class="bg-sec" style="margin:0">灵石专区（灵石消费）</div>
        ${refreshBtn}
      </div>
      <div class="bag-list">${rows}${pillRows}</div>
      <hr>
      <div class="equip-sec-title">钻石专区（钻石消费）</div>
      <div class="bag-list">
        <div class="bag-item"><div class="bag-info"><span class="bag-name">功法抽奖宝箱</span><span class="equip-bonus">随机习得未拥有功法</span></div>${diamondBuyBtn('skill', 200)}</div>
        <div class="bag-item"><div class="bag-info"><span class="bag-name">装备抽奖宝箱</span><span class="equip-bonus">随机品质装备</span></div>${diamondBuyBtn('equip', 200)}</div>
        <div class="bag-item"><div class="bag-info"><span class="bag-name">灵石宝箱</span><span class="equip-bonus">+200~800 灵石</span></div>${diamondBuyBtn('stone', 50)}</div>
        <div class="bag-item"><div class="bag-info"><span class="bag-name">经验宝箱</span><span class="equip-bonus">+2000~10000 修为</span></div>${diamondBuyBtn('exp', 50)}</div>
      </div>
      <button class="btn-full" onclick="showBagModal()" style="margin-top:14px">背包 / 出售</button>
      <button class="btn-full" onclick="returnToHub()" style="margin-top:14px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.12)">返回主页</button>`);
  }
  // 刷新商店库存：每天前 10 次免费；第 11~20 次每次消耗 SHOP_REFRESH_PAID_COST 灵石；共 20 次/天
  // 必须挂到 window：onclick="doRefreshShop()" 在浏览器中查全局作用域
  window.doRefreshShop = function() {
    ensureDaily();
    const d = player.daily || {};
    const count = d.shopRefreshCount || 0;
    const total = SHOP_REFRESH_FREE + SHOP_REFRESH_PAID_MAX;
    if (count < SHOP_REFRESH_FREE) {
      // 免费刷新
      d.shopRefreshCount = count + 1;
      shopStock = EQUIP_SLOT_KEYS.map(slot => genEquip(slot, rollRarity()));
      saveGame();
      renderShopModal();
    } else if (count < total) {
      // 灵石付费刷新（灵石不足则提示，且不消耗次数）
      if ((player.gold || 0) < SHOP_REFRESH_PAID_COST) {
        showToast('灵石不足，无法刷新（需 ' + SHOP_REFRESH_PAID_COST + ' 灵石）');
        return;
      }
      player.gold -= SHOP_REFRESH_PAID_COST;
      d.shopRefreshCount = count + 1;
      shopStock = EQUIP_SLOT_KEYS.map(slot => genEquip(slot, rollRarity()));
      saveGame();
      renderShopModal();
    }
    // 已达上限（20 次/天）：静默返回（按钮此时已置灰）
  }

  // 出售：背包装备按品质换灵石
  function sellItem(uid) {
    const i = player.bag.findIndex(it => it.uid === uid);
    if (i < 0) return;
    const it = player.bag[i];
    const sell = SELL_PRICE[it.rarity] || 8;
    player.bag.splice(i, 1);
    player.gold = (player.gold || 0) + sell;
    saveGame();
    refreshHub();
    showBagModal();
  }

  // 购买：商店装备进背包（灵石足够）
  function buyShopItem(uid) {
    const it = shopStock.find(x => x.uid === uid);
    if (!it) return;
    const price = SHOP_PRICE[it.rarity] || 500;
    if ((player.gold || 0) < price) { showShopModal(); return; }
    player.gold -= price;
    player.bag.push(it);
    if (typeof recordEquipCollected === 'function') recordEquipCollected(it); // 购买即记为已拥有（商店标注 / 图鉴）
    shopStock = shopStock.filter(x => x.uid !== uid);
    saveGame();
    refreshHub();
    showShopModal();
  }
  window.showBagModal = showBagModal;
  window.showShopModal = showShopModal;
  window.sellItem = sellItem;
  window.buyShopItem = buyShopItem;

  // 商店「丹药专区」：用灵石购买消耗品，进背包
  function buyItem(tid) {
    const it = ITEM_DB[tid];
    if (!it) return;
    if ((player.gold || 0) < it.price) { showShopModal(); return; }
    player.gold -= it.price;
    addItem(tid, 1);
    saveGame();
    refreshHub();
    showShopModal();
  }
  window.buyItem = buyItem;

  // 钻石专区：用钻石兑换抽奖宝箱（钻石为商城专属货币，由每日奖励产出）
  const DIAMOND_CHEST_PRICE = { skill: 200, equip: 200, stone: 50, exp: 50 };
  function buyDiamondChest(type) {
    const price = DIAMOND_CHEST_PRICE[type];
    if (price == null) return;
    if ((player.diamond || 0) < price) { showShopModal(); return; }
    player.diamond -= price;
    player.bag.push(makeChestItem(type, 0));   // type: skill/equip/stone/exp → 入背包，玩家手动开启
    saveGame();
    refreshHub();
    showShopModal();
  }
  window.buyDiamondChest = buyDiamondChest;

  // 兼容旧存档：若玩家仍持有旧版功法 id（xuanfeng/xuanyin），迁移为默认入门功法
  function migrateLegacySkills() {
    const legacy = ['xuanfeng', 'xuanyin'];
    if (player.learned && player.learned.some(id => legacy.includes(id))) {
      player.learned = DEFAULT_LEARNED.slice();
      player.equippedSkills = DEFAULT_EQUIPPED.slice();
      saveGame();
    }
  }
  migrateLegacySkills();

  // 加点（弹窗内按钮回调，挂在 window 上供 onclick 调用）
  function allocAttr(k, d) {
    const free = BASE_FREE_POINTS + CULTIVATION.realmFromXp(player.xp).globalIndex * POINTS_PER_STAGE - player.spent;
    if (d > 0) {
      if (free <= 0) return;
      player[k] += 1; player.spent += 1;
    } else {
      if (player[k] <= 10) return; // 不能低于初始值
      player[k] -= 1; player.spent -= 1;
    }
    recalcStats(player);
    refreshHub();
    saveGame();
    showAttrModal(); // 重渲染
  }
  window.allocAttr = allocAttr;

  // 暴露刷新接口
  window.HUB = { refresh: refreshHub, show: () => { hub.removeAttribute('hidden'); refreshHub(); }, hide: () => hub.setAttribute('hidden', '') };
  window.showAttrModal = showAttrModal; // 暴露：外部（测试/返回主页后重开属性）可直接调用
  refreshHub();
}

window.GAME = { player }; // 暴露给 online.js 做云端存档/排行榜（nodes 已随地图模式移除）
