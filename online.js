// 在线层（渐进增强）：账号 + 云端存档 + 排行榜。
// 依赖：assets/vendor/tcb.js（全局 tcb）、config.js（window.CLOUDBASE_ENV）。
// 若未配置环境 ID 或 SDK 未加载，本文件直接 return，游戏保持纯单机。
(function () {
  const ENV = window.CLOUDBASE_ENV;
  const root = document.getElementById('online-root');
  const Online = window.Online = { ready: false, uid: null, char: null };

  if (!ENV || typeof tcb === 'undefined') return; // 离线模式：什么都不做

  // ---------- UI 骨架 ----------
  root.innerHTML = `
    <div class="topbar" id="ob-top">
      <span id="ob-status">连接中…</span>
      <span class="ob-actions">
        <button id="ob-board" disabled>排行榜</button>
        <button id="ob-char" disabled>我的角色</button>
      </span>
    </div>
    <div class="modal" id="ob-modal" hidden>
      <div class="modal-box" id="ob-modal-box"></div>
    </div>`;
  const statusEl = document.getElementById('ob-status');
  const boardBtn = document.getElementById('ob-board');
  const charBtn = document.getElementById('ob-char');
  const modal = document.getElementById('ob-modal');
  const modalBox = document.getElementById('ob-modal-box');

  const openModal = html => { modalBox.innerHTML = html; modal.hidden = false; };
  const closeModal = () => { modal.hidden = true; modalBox.innerHTML = ''; };
  modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // ---------- CloudBase ----------
  const app = tcb.init({ env: ENV });
  const db = app.database();
  const COL = 'characters';

  async function uidOf() {
    const auth = app.auth();
    try { const u = await auth.getUserInfo(); if (u && u.uid) return u.uid; } catch (e) {}
    try { const s = await auth.getLoginState(); if (s && s.uid) return s.uid; } catch (e) {}
    if (auth.currentUser && auth.currentUser.uid) return auth.currentUser.uid;
    return null;
  }
  const loadChar = uid => db.collection(COL).doc(uid).get().then(r => (r.data && r.data[0]) || null);
  const saveChar = char => db.collection(COL).doc(Online.uid).set(char);

  function applyChar(char) {
    Online.char = char;
    const g = window.GAME;
    if (g && g.player) {
      g.player.name = char.name;
      g.player.sect = char.sect;
      g.player.score = char.score || 0;
    }
    statusEl.textContent = '已登录：' + char.name + '（' + char.sect + '）';
  }

  function showCreate() {
    const sects = ['少林', '武当', '峨眉', '华山', '丐帮', '明教'];
    openModal(`
      <h3>创建你的侠客</h3>
      <label>侠客名<input id="ob-name" maxlength="8" placeholder="起个名号"></label>
      <label>门派<select id="ob-sect">${sects.map(s => `<option>${s}</option>`).join('')}</select></label>
      <button id="ob-create">踏入江湖</button>`);
    document.getElementById('ob-create').onclick = () => {
      const name = (document.getElementById('ob-name').value || '').trim() || '无名侠客';
      const sect = document.getElementById('ob-sect').value;
      const char = { name, sect, score: 0, createdAt: Date.now() };
      saveChar(char)
        .then(() => { applyChar(char); closeModal(); boardBtn.disabled = false; charBtn.disabled = false; })
        .catch(e => { statusEl.textContent = '创建失败（单机模式）'; console.warn('[online]', e); });
    };
  }

  // 对外接口：战斗胜利后由游戏调用，上报累计分数
  Online.onProgress = function (score) {
    if (!Online.uid || !Online.char) return;
    Online.char.score = score;
    saveChar({ name: Online.char.name, sect: Online.char.sect, score, updatedAt: Date.now() })
      .catch(e => console.warn('[online] 存档失败', e));
  };

  // 排行榜
  boardBtn.onclick = () => {
    db.collection(COL).orderBy('score', 'desc').limit(50).get().then(r => {
      const list = (r.data || []).filter(d => d.score > 0).slice(0, 50);
      openModal(`<h3>江湖排行榜</h3>` + (list.length
        ? `<ol class="board">${list.map(d => `<li><b>${esc(d.name)}</b> · ${esc(d.sect || '')} — ${d.score}</li>`).join('')}</ol>`
        : `<p>暂无战绩，快去扬名立万！</p>`) + `<button id="ob-close">关闭</button>`);
      document.getElementById('ob-close').onclick = closeModal;
    }).catch(e => openModal(`<p>排行榜加载失败：${(e && e.message) || e}</p><button id="ob-close">关闭</button>`));
  };
  charBtn.onclick = () => {
    if (!Online.char) return;
    openModal(`<h3>我的侠客</h3><p>名号：${esc(Online.char.name)}</p><p>门派：${esc(Online.char.sect)}</p><p>战绩分：${Online.char.score || 0}</p><button id="ob-close">关闭</button>`);
    document.getElementById('ob-close').onclick = closeModal;
  };

  // ---------- 启动 ----------
  app.auth().signInAnonymously()
    .then(() => uidOf())
    .then(uid => { Online.uid = uid; return loadChar(uid); })
    .then(char => {
      if (char) { applyChar(char); boardBtn.disabled = false; charBtn.disabled = false; }
      else { showCreate(); }
    })
    .catch(e => { statusEl.textContent = '联网失败（单机模式）'; console.warn('[online]', e); });
})();
