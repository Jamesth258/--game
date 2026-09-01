/* hub.js — 游戏主页：菜单/战力/境界同步/属性与功法弹窗
 * 由 index.html 拆分而来。加载顺序见 index.html 底部 <script> 列表，勿随意调整。
 * 注意：顶层 const/let 跨文件可直接引用，但不会挂到 window（详见 PROJECT.md 坑点 8.1）。
 */
// ===== 游戏主页系统（人物居中 + 顶栏 + 底栏） =====

// 顶栏右侧图标按钮（从左到右）
const HUB_TOP_ITEMS = [
  { id: 'daily',  label: '每日奖励', icon: '<img class="hub-ico" src="assets/icons/icon_daily.png?v=8" alt="每日奖励">', action: 'modal_daily' },
  { id: 'shop',   label: '商店', icon: '<img class="hub-ico" src="assets/icons/icon_shop.png?v=8" alt="商店">', action: 'modal_shop' },
  { id: 'codex',  label: '图鉴', icon: '<img class="hub-ico" src="assets/icons/icon_codex.png?v=8" alt="图鉴">', action: 'modal_codex' },
  { id: 'worldboss', label: '世界BOSS', icon: '<img class="hub-ico" src="assets/icons/icon_worldboss.png?v=8" alt="世界BOSS">', action: 'go_worldboss' },
  { id: 'rank',   label: '排行榜', icon: '<img class="hub-ico" src="assets/icons/icon_rank.png?v=8" alt="排行榜">', action: 'go_rank' },
  { id: 'settings', label: '设置', icon: '<img class="hub-ico" src="assets/icons/icon_settings.png?v=8" alt="设置">', action: 'modal_settings' },
];

// 底栏主功能按钮（从左到右）
const HUB_BOTTOM_ITEMS = [
  { id: 'attr',   label: '属性', icon: '<img class="hub-ico" src="assets/icons/icon_attr.png?v=8" alt="属性">', action: 'modal_attr' },
  { id: 'equip',   label: '装备', icon: '<img class="hub-ico" src="assets/icons/icon_equip.png?v=8" alt="装备">', action: 'modal_equip' },
  { id: 'bag',    label: '背包', icon: '<img class="hub-ico" src="assets/icons/icon_bag.png?v=8" alt="背包">', action: 'modal_bag' },
  { id: 'skill',  label: '功法', icon: '<img class="hub-ico" src="assets/icons/icon_skill.png?v=8" alt="功法">', action: 'modal_skills' },
  { id: 'story',  label: '副本', icon: '<img class="hub-ico" src="assets/icons/icon_story.png?v=8" alt="副本">', action: 'go_story' },
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
  const topIconContainer = document.getElementById('hub-top-icons');
  const bottomIconContainer = document.getElementById('hub-bottom-icons');
  const avatarEl = document.getElementById('hub-avatar');
  const nameEl = document.getElementById('hub-name');
  const powerEl = document.getElementById('hub-power-num');
  const charVideo = document.getElementById('hub-char-video');

  // 渲染顶部图标按钮
  topIconContainer.innerHTML = HUB_TOP_ITEMS.map(item =>
    `<button class="hub-top-btn" data-hub="${item.id}" title="${item.label}">${item.icon}<span>${item.label}</span></button>`
  ).join('');

  // 渲染底部主功能按钮
  bottomIconContainer.innerHTML = HUB_BOTTOM_ITEMS.map(item =>
    `<button class="hub-bottom-btn" data-hub="${item.id}" title="${item.label}">${item.icon}<span>${item.label}</span></button>`
  ).join('');

  // 统一事件绑定（顶栏 + 底栏）
  const allItems = [...HUB_TOP_ITEMS, ...HUB_BOTTOM_ITEMS];
  [topIconContainer, bottomIconContainer].forEach(container => {
    container.querySelectorAll('[data-hub]').forEach(btn => {
      btn.addEventListener('click', () => {
        const item = allItems.find(i => i.id === btn.dataset.hub);
        if (!item) return;
        handleHubAction(item);
      });
    });
  });

  // 统一动作分发
  function handleHubAction(item) {
    switch (item.action) {
      case 'go_story':      openStoryScreen(); break;
      case 'go_worldboss': openWorldBossScreen(); break;
      case 'go_rank':
        if (window.Online && window.Online.showBoard) window.Online.showBoard();
        else openModal('<h3 style="color:#D4A843">排行榜</h3><p style="color:rgba(241,239,232,0.7)">联网功能尚未开启，完成腾讯云配置后即可查看全服排行榜。</p><button class="btn-full" onclick="returnToHub()" style="margin-top:14px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.12)">返回主页</button>');
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
        openModal(`<h3 style="color:#D4A843">${item.label}</h3><p style="color:rgba(241,239,232,0.7)">「${item.label}」功能正在开发中，敬请期待！</p><button class="btn-full" onclick="returnToHub()" style="margin-top:14px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.12)">返回主页</button>`);
    }
  }

  // 设置弹窗（含抽奖概率入口）
  function showSettingsModal() {
    refreshHub();
    const r = CULTIVATION.realmFromXp(player.xp);
    openModal(`
      <div class="hub-modal-title"><svg viewBox="0 0 24 24" fill="none" stroke="#D4A843" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06A1.65 1.65 0 0015 18.96a1.65 1.65 0 00-1.82.33V19a2 2 0 01-2.82 0v-.08A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82-.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.6 15a1.65 1.65 0 00-.33-1.82V13a2 2 0 012.82 0v.08A1.65 1.65 0 0010.6 13a1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 13v2z"/></svg>
      <h3 style="margin:0">设置</h3></div>
      <p style="margin:2px 0 10px;font-size:12px;color:rgba(241,239,232,0.6)"><b style="color:#fff">${esc(player.name)}</b> · <b style="color:#D4A843">${esc(r.label)}</b></p>

      <div style="display:flex;flex-direction:column;gap:10px">
        <button class="btn-full" onclick="openChestInfo()" style="background:rgba(212,168,67,0.08);border:1px solid rgba(212,168,67,0.25);text-align:left;padding:12px 14px">
          <span style="font-size:14px;font-weight:600">📊 抽奖概率</span><br>
          <span style="font-size:11px;color:rgba(241,239,232,0.5)">查看功法/装备宝箱各品质掉落概率与保底机制</span>
        </button>

        <button class="btn-full" onclick="openModal('<h3 style=color:#D4A843>清空存档</h3><p style=color:rgba(241,239,232,0.7)>确定要清空存档重新开始吗？所有进度将丢失！</p><button class=btn-full onclick=localStorage.removeItem(&apos;wuxia_save&apos;);location.reload(); style=margin-top:14px;background:rgba(232,123,123,0.15);border:1px solid rgba(232,123,123,0.4)>确认清空</button><button class=btn-full onclick=closeModal() style=margin-top:14px>取消</button')" style="background:rgba(232,123,123,0.08);border:1px solid rgba(232,123,123,0.25);text-align:left;padding:12px 14px">
          <span style="font-size:14px;font-weight:600;color:#E87B7B">🗑️ 清空存档</span><br>
          <span style="font-size:11px;color:rgba(241,239,232,0.5)">删除所有游戏数据，重新创建角色（不可恢复）</span>
        </button>

        <div style="padding:10px 12px;background:rgba(255,255,255,0.03);border-radius:8px;border:0.5px solid rgba(255,255,255,0.08)">
          <div style="font-size:11px;color:rgba(241,239,232,0.45);margin-bottom:6px">游戏信息</div>
          <div style="font-size:12px;color:rgba(241,239,232,0.7);line-height:1.7">
            版本：v1.3.0<br>
            存档：浏览器本地存储<br>
            灵石：<b style="color:#D4A843">${formatNum(player.gold)}</b> · 钻石：<b style="color:#378ADD">${player.diamond || 0}</b><br>
            战力：<b style="color:#E87B7B">${formatNum(calcCombatPower(player))}</b>
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
    nameEl.textContent = player.name || '逍遥仙';
    powerEl.textContent = formatNum(calcCombatPower(player));
    avatarEl.src = 'assets/select/avatar_head.png?v=1';
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

  // 属性弹窗（含自由加点 + 经验进度条）
  function showAttrModal() {
    refreshHub(); // 先同步主页境界/进度条/战力，保证与弹窗一致
    const r = CULTIVATION.realmFromXp(player.xp);
    const earned = BASE_FREE_POINTS + r.globalIndex * POINTS_PER_STAGE;
    const free = earned - player.spent;
    const pct = v => Math.round(v * 100) + '%';
    const fmt = n => formatNum(n);
    // 紧凑加减按钮
    const btn = (k, d, disabled) =>
      `<button class="alloc-btn" onclick="allocAttr('${k}',${d})" ${disabled ? 'disabled' : ''}>${d > 0 ? '+' : '−'}</button>`;
    const attrRow = k => `
      <tr>
        <td style="padding:6px 6px;color:#D4A843;font-weight:600;font-size:13px;white-space:nowrap">${ATTR_NAMES[k]}</td>
        <td style="text-align:center;color:#fff;font-weight:700;font-size:14px;min-width:36px">${player[k]}</td>
        <td style="text-align:right;white-space:nowrap;padding-left:8px">
          ${btn(k, -1, player[k] <= 10)} ${btn(k, 1, free <= 0)}
        </td>
      </tr>`;
    // 经验进度条
    const xpPct = Math.round(r.progress * 100);
    const xpBarHtml = `
      <div class="xp-bar-wrap">
        <div class="xp-bar-info">
          <span class="cur-realm">${esc(r.label)}</span>
          <span class="xp-nums">${fmt(r.xpIntoStage)} / ${fmt(r.xpForStage)} (${xpPct}%)</span>
        </div>
        <div class="xp-bar-track"><div class="xp-bar-fill" style="width:${xpPct}%"></div></div>
      </div>`;
    openModal(`
      <div class="hub-modal-title"><svg viewBox="0 0 24 24" fill="none" stroke="#D4A843" stroke-width="2"><circle cx="12" cy="7" r="4"/><path d="M5 21v-2a7 7 0 0114 0v2"/></svg>
      <h3 style="margin:0">角色属性</h3></div>
      <p style="margin:2px 0"><b style="color:#fff">${esc(player.name)}</b> · <b style="color:#D4A843">${esc(r.label)}</b></p>
      ${xpBarHtml}
      <p style="margin:6px 0 2px;color:#D4A843;font-size:13px">可分配点数：<b style="font-size:15px">${free}</b><span style="color:rgba(241,239,232,0.45);font-size:11px;margin-left:6px">（开局基础 ${BASE_FREE_POINTS} 点，每阶 +${POINTS_PER_STAGE}）</span></p>
      <table style="width:100%;font-size:13px;border-collapse:collapse;margin-top:8px">
        <tr style="color:rgba(241,239,232,0.35);font-size:11px;text-transform:uppercase;letter-spacing:1px">
          <td style="padding:4px 6px">属性</td><td style="padding:4px;text-align:center">数值</td><td style="padding:4px;text-align:right">加点</td>
        </tr>
        ${ATTR_KEYS.map(attrRow).join('')}
      </table>
      <hr>
      <table style="width:100%;font-size:13px;border-collapse:collapse">
        <tr><td style="padding:4px 6px;color:#E87B7B;font-weight:500">❤ 生命上限</td><td style="text-align:right;font-weight:600;color:#fff">${player.maxHp}</td><td style="padding:4px 6px;color:#185FA5;font-weight:500">✦ 灵力上限</td><td style="text-align:right;font-weight:600;color:#fff">${player.maxMp}</td></tr>
        <tr><td style="padding:4px 6px;color:#D4A843;font-weight:500">⚔ 物理攻击</td><td style="text-align:right;font-weight:600;color:#fff">${player.atk}</td><td style="padding:4px 6px;color:#9B6BCC;font-weight:500">☯ 精神攻击</td><td style="text-align:right;font-weight:600;color:#fff">${player.spiAtk}</td></tr>
        <tr><td style="padding:4px 6px;color:#639922;font-weight:500">🛡 物理防御</td><td style="text-align:right;font-weight:600;color:#fff">${player.def}</td><td style="padding:4px 6px;color:#639922;font-weight:500">🛡 精神防御</td><td style="text-align:right;font-weight:600;color:#fff">${player.spiDef}</td></tr>
        <tr><td style="padding:4px 6px;color:#378ADD;font-weight:500">🎯 命中率</td><td style="text-align:right;font-weight:600;color:#fff">${pct(player.hitRate)}</td><td style="padding:4px 6px;color:#9B6BCC;font-weight:500">⚡ 先攻值</td><td style="text-align:right;font-weight:600;color:#fff">${player.init}</td></tr>
        <tr><td style="padding:4px 6px;color:#9B6BCC;font-weight:500">🍀 闪避率</td><td style="text-align:right;font-weight:600;color:#fff">${pct(player.eva)}</td><td style="padding:4px 6px;color:#E8D9A0;font-weight:500">🍀 幸运值</td><td style="text-align:right;font-weight:600;color:#fff">${player.luck}</td></tr>
        <tr><td style="padding:4px 6px;color:#FF6B6B;font-weight:500">🎯 暴击率</td><td style="text-align:right;font-weight:600;color:#fff">${pct(player.critRate)}</td><td style="padding:4px 6px;color:#FFB347;font-weight:500">💥 暴击伤害</td><td style="text-align:right;font-weight:600;color:#fff">${Math.round(player.critDmg * 100)}%</td></tr>
        <tr><td style="padding:4px 6px;color:#639922;font-weight:500">📈 挂机加成</td><td style="text-align:right;font-weight:600;color:#fff">${pct(player.xpBonus)}</td><td style="padding:4px 6px;color:#E87B7B;font-weight:700">⚡ 战力</td><td style="text-align:right;font-weight:700;color:#E87B7B">${fmt(calcCombatPower(player))}</td></tr>
      </table>
      <p style="margin:6px 0 0;font-size:10px;color:rgba(241,239,232,0.4)">命中率=基础25%+等级×0.5%+悟性×0.2%+装备加成。单件装备命中率加成至多+40%，总命中率上限100%。战斗实际命中=自身命中率−对方闪避率；负值时约8次命中1次。暴击率=基础15%+等级×0.2%+天命×0.2%+装备暴击+套装（集齐4件套额外+15%），上限100%；暴伤无封顶。暴击率/暴伤为常驻值（装备+套装），功法/残血可临时提升。</p>
      <button class="btn-full" onclick="returnToHub()" style="margin-top:16px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.12)">返回主页</button>`);
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
      right = '<span style="color:#9B6BCC;font-size:12px;white-space:nowrap">【被动】自动加成</span>';
    } else if (on) {
      right = '<span style="color:#639922;font-size:12px;white-space:nowrap">已装备</span>';
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
      : '<div style="opacity:.5;padding:8px;font-size:12px">该筛选下暂无主动功法</div>';
    const pasHtml = pas.length ? pas.map(s => skillRowHtml(s, isEquipped, equipped)).join('')
      : '<div style="opacity:.5;padding:8px;font-size:12px">该筛选下暂无被动心法</div>';
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
      return `<div class="equip-slot" style="opacity:.45;text-align:center;color:rgba(241,239,232,.4);display:flex;align-items:center;justify-content:center">空槽位 ${i + 1}</div>`;
    }).join('');
    // 已习得功法库：由 renderSkillLib() 动态渲染（分主动/被动两栏 + 品阶筛选/排序）

    openModal(`
      <div class="hub-modal-title"><svg viewBox="0 0 24 24" fill="none" stroke="#D4A843" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>
      <h3 style="margin:0">功法</h3></div>
      <p style="margin:4px 0;font-size:12px;color:rgba(241,239,232,0.6)">最多同时装备 <b style="color:#D4A843">${MAX_EQUIPPED}</b> 种功法；战斗中每回合自行点选施展。普攻恒为物理（0 灵力）。</p>
      <div class="equip-sec-title">已装备（${equipped.length}/${MAX_EQUIPPED}）</div>
      <div class="bag-list">${slotHtml}</div>
      <hr>
      <div style="display:flex;gap:10px;margin:6px 0;flex-wrap:wrap">
        <label style="font-size:12px;color:rgba(241,239,232,.7)">品阶 <select id="skillTierFilter" onchange="renderSkillLib()">${SKILL_TIER_OPTS}</select></label>
        <label style="font-size:12px;color:rgba(241,239,232,.7)">排序 <select id="skillSortBy" onchange="renderSkillLib()"><option value="tier">按品阶</option><option value="school">按类型</option></select></label>
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
  function showEquipModal() {
    refreshHub(); // 同步主页战力
    const gold = player.gold || 0;

    // 已穿戴的部位卡
    const slotCard = slot => {
      const def = EQUIP_SLOTS[slot];
      const it = player.equipment[slot];
      const body = it
        ? `<div class="equip-name" style="color:${it.rarityColor}">${esc(it.name)}</div>
           <div class="equip-bonus">${esc(equipBonusText(it))}${equipEffectText(it) ? esc(' · ' + equipEffectText(it)) : ''}</div>
           <button class="equip-btn danger" onclick="unequipSlot('${slot}')">卸下</button>`
        : `<div class="equip-name" style="color:rgba(241,239,232,0.4)">未装备</div>`;
      return `<div class="equip-slot">
        <div class="equip-slot-head"><span class="equip-icon">${def.icon}</span>${def.name}</div>
        ${body}
      </div>`;
    };

    // 背包列表（仅装备，宝箱不可在此装备）
    const bagEquips = (player.bag || []).filter(it => it && it.type !== 'chest');
    const bagHtml = bagEquips.length
      ? bagEquips.map(it => `<div class="bag-item">
          <div class="bag-info"><span class="equip-icon">${EQUIP_SLOTS[it.slot].icon}</span>
            <span class="bag-name" style="color:${it.rarityColor}">${esc(it.name)}</span>
            <span class="equip-bonus">${esc(equipBonusText(it))}${equipEffectText(it) ? esc(' · ' + equipEffectText(it)) : ''}</span></div>
          <button class="equip-btn" onclick="equipItem('${it.uid}')">装备</button>
        </div>`).join('')
      : `<p style="color:rgba(241,239,232,0.4);font-size:12px;margin:6px 0">背包为空 — 击败江湖敌人可掉落装备宝箱。</p>`;

    openModal(`
      <div class="hub-modal-title"><svg viewBox="0 0 24 24" fill="none" stroke="#D4A843" stroke-width="2"><path d="M12 2L4 7l8 5 8-5-8-5zM4 12l8 5 8-5M4 17l8 5 8-5"/></svg>
      <h3 style="margin:0">装备</h3></div>
      <p style="margin:2px 0 10px;font-size:12px;color:rgba(241,239,232,0.6)">灵石 <b style="color:#D4A843">${gold}</b> · 战力 <b style="color:#E87B7B">${formatNum(calcCombatPower(player))}</b></p>
      <div class="equip-slots">${EQUIP_SLOT_KEYS.map(slotCard).join('')}</div>
      <hr>
      <div class="equip-sec-title">背包（${player.bag.length}）</div>
      <div class="bag-list">${bagHtml}</div>
      <button class="btn-full" onclick="returnToHub()" style="margin-top:16px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.12)">返回主页</button>`);
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

  // 背包弹窗：列出全部装备，可装备 / 出售，并对比已穿戴部位标"更优"
  function showBagModal() {
    refreshHub();
    const gold = player.gold || 0;
    const chests = (player.bag || []).filter(it => it && it.type === 'chest');
    const equips = (player.bag || []).filter(it => !it || it.type !== 'chest');
    const chestHtml = chests.map(it => `<div class="bag-item">
        <div class="bag-info">
          <span class="bag-name" style="color:#D4A843">${esc(it.icon || '🎁')} ${esc(it.name)}</span>
          <span class="equip-bonus">${esc(it.desc || '')}</span>
        </div>
        <button class="equip-btn" onclick="openChestItem('${it.uid}')">开启</button>
      </div>`).join('');
    const list = equips.length
      ? equips.map(it => {
          const equipped = player.equipment[it.slot];
          const better = compareEquip(it, equipped);
          const sell = SELL_PRICE[it.rarity] || 8;
          return `<div class="bag-item">
            <div class="bag-info">
              <span class="equip-icon">${EQUIP_SLOTS[it.slot].icon}</span>
              <span class="bag-name" style="color:${it.rarityColor}">${esc(it.name)}</span>
              <span class="equip-bonus">${esc(equipBonusText(it))}${better ? ' <b style="color:#639922">▲更优</b>' : ''}${equipEffectText(it) ? esc(' · ' + equipEffectText(it)) : ''}</span>
            </div>
            <div style="display:flex;gap:6px;flex-shrink:0">
              <button class="equip-btn" onclick="equipItem('${it.uid}')">装备</button>
              <button class="equip-btn danger" onclick="sellItem('${it.uid}')">出售·${sell}</button>
            </div>
          </div>`;
        }).join('')
      : `<p style="color:rgba(241,239,232,0.4);font-size:12px;margin:6px 0">暂无背包装备 — 击败江湖敌人可掉落宝箱，或去商店购买。</p>`;
    const pills = (player.items || []).filter(x => x.qty > 0);
    const pillHtml = pills.length
      ? pills.map(x => `<div class="bag-item">
          <div class="bag-info">
            <span class="bag-name" style="color:${ITEM_DB[x.tid].kind === 'hp' ? '#3B6D11' : '#378ADD'}">${ITEM_DB[x.tid].name}</span>
            <span class="equip-bonus">${ITEM_DB[x.tid].tierName}·${ITEM_DB[x.tid].kind === 'hp' ? '回血' : '回蓝'}${ITEM_DB[x.tid].pct * 100}% × ${x.qty}</span>
          </div>
        </div>`).join('')
      : `<p style="color:rgba(241,239,232,0.4);font-size:12px;margin:6px 0">暂无丹药 — 可在商店「丹药专区」购买。</p>`;
    const chestSection = chests.length
      ? `<div class="equip-sec-title">宝箱（${chests.length}）· 点击开启</div><div class="bag-list">${chestHtml}</div><hr>`
      : '';
    openModal(`
      <div class="hub-modal-title"><svg viewBox="0 0 24 24" fill="none" stroke="#D4A843" stroke-width="2"><rect x="3" y="6" width="18" height="14" rx="2"/><path d="M8 6V4a2 0 012-2h4a2 0 012 2v2"/></svg>
      <h3 style="margin:0">背包</h3></div>
      <p style="margin:2px 0 10px;font-size:12px;color:rgba(241,239,232,0.6)">灵石 <b style="color:#D4A843">${gold}</b> · 装备 <b style="color:#fff">${equips.length}</b> · 宝箱 <b style="color:#D4A843">${chests.length}</b> · 丹药 <b style="color:#fff">${pills.reduce((s, x) => s + x.qty, 0)}</b></p>
      ${chestSection}
      <div class="equip-sec-title">丹药（${pills.reduce((s, x) => s + x.qty, 0)}）</div>
      <div class="bag-list">${pillHtml}</div>
      <div class="equip-sec-title">背包装备（${equips.length}）</div>
      <div class="bag-list">${list}</div>
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
      <p style="margin:2px 0 10px;font-size:12px;color:rgba(241,239,232,0.6)">灵石 <b style="color:#D4A843">${gold}</b> ｜ 钻石 <b style="color:#378ADD">${player.diamond || 0}</b></p>
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
        <div class="equip-sec-title" style="margin:0">灵石专区（灵石消费）</div>
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
      <button class="btn-full" onclick="showBagModal()" style="margin-top:14px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.12)">背包 / 出售</button>
      <button class="btn-full" onclick="returnToHub()" style="margin-top:8px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.12)">返回主页</button>`);
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
