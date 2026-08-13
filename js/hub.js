/* hub.js — 游戏主页：菜单/战力/境界同步/属性与功法弹窗
 * 由 index.html 拆分而来。加载顺序见 index.html 底部 <script> 列表，勿随意调整。
 * 注意：顶层 const/let 跨文件可直接引用，但不会挂到 window（详见 PROJECT.md 坑点 8.1）。
 */
// ===== 游戏主页系统（人物展示 + 菜单栏） =====
const HUB_MENU_ITEMS = [
  { id: 'attr',   label: '属性', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="7" r="4"/><path d="M5 21v-2a7 7 0 0114 0v2"/><path d="M16 11h4M18 9v4M3 15h4M5 13v4"/></svg>', action: 'modal_attr' },
  { id: 'equip',   label: '装备', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 2L4 7l8 5 8-5-8-5zM4 12l8 5 8-5M4 17l8 5 8-5"/></svg>', action: 'modal_coming' },
  { id: 'bag',    label: '背包', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="6" width="18" height="14" rx="2"/><path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"/><line x1="12" y1="11" x2="12" y2="15"/></svg>', action: 'modal_coming' },
  { id: 'skill',  label: '功法', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/><path d="M8 7h8M8 11h6"/></svg>', action: 'modal_skills' },
  { id: 'story',  label: '剧情', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/><circle cx="10" cy="8" r="1.5" fill="currentColor"/><circle cx="14" cy="12" r="1.5" fill="currentColor"/></svg>', action: 'go_map' },
  { id: 'shop',   label: '商店', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></svg>', action: 'modal_coming' },
  { id: 'event',  label: '活动', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/></svg>', action: 'modal_coming' },
  { id: 'daily',  label: '每日奖励', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="M9 16l2 2 4-4"/></svg>', action: 'modal_coming' },
  { id: 'rank',   label: '排行榜', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="8" r="5"/><path d="M8 21h8M12 13v8"/><path d="M7 4l2 2M17 4l-2 2"/></svg>', action: 'go_rank' },
  { id: 'arena',  label: '竞技场', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M14.5 17.5L3 6V3h3l11.5 11.5"/><path d="M13 19l6-6M17 15l4 4M3 3l18 18"/></svg>', action: 'modal_coming' },
];

function calcCombatPower(p) {
  return Math.floor(
    (p.maxHp * 1.2) + (p.atk * 15) + (p.def * 12) + (p.spd * 8) +
    (p.maxMp * 2) + (p.spiAtk * 10) + (p.init * 2)
  );
}

function formatNum(n) { return n.toLocaleString('zh-CN'); }

function initHub() {
  const hub = document.getElementById('hub-screen');
  const menuContainer = document.getElementById('hub-menu');
  const avatarEl = document.getElementById('hub-avatar');
  const nameEl = document.getElementById('hub-name');
  const powerEl = document.getElementById('hub-power-num');
  const charVideo = document.getElementById('hub-char-video');
  const charStatic = document.getElementById('hub-char-static');

  // 视频加载失败 → 回退静态立绘（只绑一次）
  if (!charVideo._errBound) {
    charVideo.addEventListener('error', () => {
      charVideo.setAttribute('hidden', '');
      charStatic.removeAttribute('hidden');
      charStatic.src = art.hero.src || '';
    });
    charVideo._errBound = true;
  }

  // 渲染菜单按钮
  menuContainer.innerHTML = HUB_MENU_ITEMS.map(item =>
    `<button class="hub-btn" data-hub="${item.id}" title="${item.label}">${item.icon}<span>${item.label}</span></button>`
  ).join('');

  // 绑定按钮事件
  menuContainer.querySelectorAll('.hub-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = HUB_MENU_ITEMS.find(i => i.id === btn.dataset.hub);
      if (!item) return;
      switch (item.action) {
        case 'go_map':
          hub.setAttribute('hidden', '');
          state = 'map';
          setButtons(false);
          render();
          break;
        case 'go_rank':
          if (window.Online && window.Online.showBoard) window.Online.showBoard();
          else openModal('<h3 style="color:#D4A843">排行榜</h3><p style="color:rgba(241,239,232,0.7)">联网功能尚未开启，完成腾讯云配置后即可查看全服排行榜。</p><button class="btn-full" onclick="closeModal()" style="margin-top:14px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.12)">关闭</button>');
          break;
        case 'modal_attr':
          showAttrModal();
          break;
        case 'modal_skills':
          showSkillsModal();
          break;
        default:
          openModal(`<h3 style="color:#D4A843">${item.label}</h3><p style="color:rgba(241,239,232,0.7)">「${item.label}」功能正在开发中，敬请期待！</p><button class="btn-full" onclick="closeModal()" style="margin-top:14px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.12)">关闭</button>`);
      }
    });
  });

  // ====== 全局：主页境界/进度条同步（弹窗和主页共用同一份数据） ======
  function syncRealmDOM() {
    // CULTIVATION 是 cultivation.js 里 const 声明的脚本级变量（非 window 属性），直接引用即可
    if (typeof CULTIVATION === 'undefined') { console.warn('[syncRealm] CULTIVATION not loaded yet'); return; }
    const r = CULTIVATION.realmFromXp(player.xp);
    const el = (id) => document.getElementById(id);
    const re = el('hub-realm'), xf = el('hub-xp-fill'), xr = el('hub-xp-realm'), xn = el('hub-xp-nums');
    console.log('[syncRealm]', r.label, 'progress:', Math.round((r.progress||0)*100) + '%', 'xp:', r.xpIntoStage + '/' + r.xpForStage);
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
    // 角色展示：优先用该角色的视频，没有则用静态立绘
    const _all = CHARACTERS.male.concat(CHARACTERS.female);
    const _cur = _all.find(c => c.id === player.avatarId);
    const videoSrc = _cur && _cur.video ? _cur.video : '';
    if (videoSrc) {
      charStatic.setAttribute('hidden', '');
      charVideo.removeAttribute('hidden');
      if (charVideo.getAttribute('src') !== videoSrc) {
        charVideo.setAttribute('src', videoSrc);
        charVideo.load();
      }
      charVideo.play().catch(() => {});
    } else {
      charVideo.setAttribute('hidden', '');
      charStatic.removeAttribute('hidden');
      charStatic.src = art.hero.src || '';
    }
  }

  // 挂机：在线停留即自动累加修为（主页/地图/战斗画面）
  if (!window._hubIdleStarted) {
    window._hubIdleStarted = true;
    let _saveTick = 0;
    setInterval(() => {
      if (state === 'hub' || state === 'map' || state === 'battle') {
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
        <tr><td style="padding:4px 6px;color:#9B6BCC;font-weight:500">💨 速度</td><td style="text-align:right;font-weight:600;color:#fff">${player.spd}</td><td style="padding:4px 6px;color:#9B6BCC;font-weight:500">⚡ 先攻值</td><td style="text-align:right;font-weight:600;color:#fff">${player.init}</td></tr>
        <tr><td style="padding:4px 6px;color:#9B6BCC;font-weight:500">🍀 闪避率</td><td style="text-align:right;font-weight:600;color:#fff">${pct(player.eva)}</td><td style="padding:4px 6px;color:#E8D9A0;font-weight:500">🍀 幸运值</td><td style="text-align:right;font-weight:600;color:#fff">${player.luck}</td></tr>
        <tr><td style="padding:4px 6px;color:#639922;font-weight:500">📈 挂机加成</td><td style="text-align:right;font-weight:600;color:#fff">${pct(player.xpBonus)}</td><td style="padding:4px 6px;color:#E87B7B;font-weight:700">⚡ 战力</td><td style="text-align:right;font-weight:700;color:#E87B7B">${fmt(calcCombatPower(player))}</td></tr>
      </table>
      <button class="btn-full" onclick="closeModal()" style="margin-top:16px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.12)">关闭</button>`);
  }

  // 功法弹窗
  function showSkillsModal() {
    refreshHub(); // 同步主页数据
    const rows = player.learned.map(id => {
      const sk = SKILLS[id];
      if (!sk) return '';
      const active = player.activeSkill === id;
      const typeTxt = sk.type === 'spirit' ? '精神' : '物理';
      const typeColor = sk.type === 'spirit' ? '#9B6BCC' : '#D4A843';
      return `<tr>
        <td style="padding:5px 6px;color:#D4A843;font-weight:500">${esc(sk.name)}${active ? ' <span style="color:#639922">·出战</span>' : ''}</td>
        <td style="padding:5px 6px;color:${typeColor}">${typeTxt}</td>
        <td style="padding:5px 6px;color:#185FA5">${sk.cost} 灵力</td>
        <td style="padding:5px 6px;color:#fff">×${sk.mult}</td>
        <td style="padding:5px 6px;text-align:right">${active ? '<span style="color:rgba(241,239,232,0.35)">使用中</span>' : `<button class="alloc-btn" onclick="setActiveSkill('${id}')">出战</button>`}</td>
      </tr>`;
    }).join('');
    openModal(`
      <div class="hub-modal-title"><svg viewBox="0 0 24 24" fill="none" stroke="#D4A843" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>
      <h3 style="margin:0">功法</h3></div>
      <p style="margin:4px 0;font-size:12px;color:rgba(241,239,232,0.55)">普攻恒为物理；功法分物理/精神两类，灵力消耗各由功法而定。战斗中「武功」释放当前出战功法。</p>
      <table style="width:100%;font-size:13px;border-collapse:collapse;margin-top:8px">
        <tr style="color:rgba(241,239,232,0.3);font-size:11px;text-transform:uppercase;letter-spacing:1px"><td style="padding:4px 6px">功法</td><td style="padding:4px">类型</td><td style="padding:4px">消耗</td><td style="padding:4px">倍率</td><td style="padding:4px;text-align:right">操作</td></tr>
        ${rows}
      </table>
      <button class="btn-full" onclick="closeModal()" style="margin-top:14px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.12)">关闭</button>`);
  }
  function setActiveSkill(id) {
    if (!player.learned.includes(id)) return;
    player.activeSkill = id;
    saveGame();
    showSkillsModal();
  }
  window.setActiveSkill = setActiveSkill;

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
  refreshHub();
}

window.GAME = { player, nodes }; // 暴露给 online.js 做云端存档/排行榜
