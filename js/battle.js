/* battle.js — 地图节点 + 状态机 + 回合制战斗 + 输入 + Canvas 渲染
 * 由 index.html 拆分而来。加载顺序见 index.html 底部 <script> 列表，勿随意调整。
 * 注意：顶层 const/let 跨文件可直接引用，但不会挂到 window（详见 PROJECT.md 坑点 8.1）。
 */
// ---- 地图节点 ----
const nodes = [
  { id: 0, name: '清风镇',   x: 80,  y: 280, type: 'start',  cleared: true,  enemy: null },
  { id: 1, name: '黑松林',   x: 230, y: 210, type: 'battle', cleared: false, enemy: { name: '山贼头目', hp: 120, atk: 22, def: 9,  spd: 14 } },
  { id: 2, name: '断魂崖',   x: 390, y: 140, type: 'battle', cleared: false, enemy: { name: '血刀老祖', hp: 190, atk: 28, def: 11, spd: 20 } },
  { id: 3, name: '武林大会', x: 540, y: 70,  type: 'boss',   cleared: false, enemy: { name: '魔教教主', hp: 280, atk: 34, def: 15, spd: 22 } },
  { id: 4, name: '毒龙潭',   x: 590, y: 110, type: 'battle', cleared: false, enemy: { name: '毒龙尊者', hp: 350,  atk: 40,  def: 18, spd: 26 } },
  { id: 5, name: '幽冥谷',   x: 560, y: 180, type: 'boss',   cleared: false, enemy: { name: '幽冥谷主', hp: 520,  atk: 52,  def: 26, spd: 30 } },
  { id: 6, name: '落魂涧',   x: 610, y: 250, type: 'battle', cleared: false, enemy: { name: '噬魂魔将', hp: 600,  atk: 58,  def: 30, spd: 34 } },
  { id: 7, name: '血河渊',   x: 550, y: 310, type: 'boss',   cleared: false, enemy: { name: '血河神君', hp: 780,  atk: 70,  def: 38, spd: 40 } },
  { id: 8, name: '白骨岭',   x: 470, y: 280, type: 'battle', cleared: false, enemy: { name: '白骨夫人', hp: 850,  atk: 76,  def: 42, spd: 44 } },
  { id: 9, name: '剑冢',     x: 400, y: 220, type: 'boss',   cleared: false, enemy: { name: '剑魔独孤', hp: 1000, atk: 90,  def: 50, spd: 52 } },
  { id: 10, name: '焚天崖',  x: 500, y: 150, type: 'battle', cleared: false, enemy: { name: '焚天火尊', hp: 1080, atk: 96,  def: 54, spd: 56 } },
  { id: 11, name: '逍遥天',  x: 610, y: 80,  type: 'boss',   cleared: false, enemy: { name: '逍遥天主', hp: 1300, atk: 110, def: 62, spd: 60 } },
];
const unlocked = id => id === 0 || nodes[id - 1].cleared;

// ---- 状态机 ----
let state = 'map';          // 'map' | 'battle' | 'win' | 'lose' | 'clear'
let battle = null;
let floats = [];            // 飘字
let toast = '';             // 底部提示
let awaitingInput = false;

function makeEnemy(node) {
  const e = node.enemy;
  return {
    name: e.name, isEnemy: true,
    maxHp: e.hp, hp: e.hp, maxMp: 40, mp: 40,
    atk: e.atk, def: e.def, spd: e.spd,
    init: Math.round(10 + e.spd * 2), eva: 0.05, spiAtk: 0, spiDef: e.def, luck: 0,
    potions: 0, defending: false, extraActions: 0,
    skill: { name: '敌袭', type: 'phys', mult: 1.8, cost: 10 },
  };
}

function startBattle(node) {
  const enemy = makeEnemy(node);
  battle = {
    node, player, enemy,
    queue: [], turn: 0,
    msg: '遭遇 ' + enemy.name + '！',
  };
  state = 'battle';
  toast = '';
  beginRound();
}

function beginRound() {
  // 每回合开始小幅回内力，清掉上一轮防御
  [battle.player, battle.enemy].forEach(u => {
    if (u.hp > 0) { u.mp = Math.min(u.maxMp, u.mp + 5); u.defending = false; }
  });
  const p = battle.player, e = battle.enemy;
  const alive = [p, e].filter(u => u.hp > 0);
  let queue = [];
  if (alive.length === 2) {
    // 先攻值多段：比值越高快者连动越多（2×→2次, 4×→3次, 6×→4次, 8×→5次, 10×→6次）
    // 极品装备 extraActions 额外追加本回合连动次数
    const faster = p.init >= e.init ? p : e;
    const slower = faster === p ? e : p;
    const ratio = faster.init / Math.max(1, slower.init);
    let n = ratio >= 2 ? Math.floor(ratio / 2) + 1 : 1;
    n += (faster.extraActions || 0);
    for (let i = 0; i < n; i++) queue.push(faster);
    queue.push(slower);
  } else {
    queue = alive;
  }
  battle.queue = queue;
  battle.turn = 0;
  processTurn();
}

function processTurn() {
  if (checkEnd()) return;
  while (battle.turn < battle.queue.length && battle.queue[battle.turn].hp <= 0) battle.turn++;
  if (battle.turn >= battle.queue.length) { beginRound(); return; }

  const cur = battle.queue[battle.turn];
  cur.defending = false; // 防御只持续到自身下一回合

  if (cur.isEnemy) {
    awaitingInput = false;
    setButtons(false);
    battle.msg = cur.name + ' 的回合';
    setTimeout(() => enemyAct(cur), 650);
  } else {
    awaitingInput = true;
    battle.msg = '你的回合 — 选择指令';
    setButtons(true);
  }
}

function setButtons(on) {
  buttons.forEach(b => {
    const act = b.dataset.act;
    let enabled = on;
    if (act === 'skill' && player.mp < SKILLS[player.activeSkill].cost) enabled = false;
    if (act === 'item' && player.potions <= 0) enabled = false;
    b.disabled = !enabled;
  });
}

function damage(attacker, target, mult, type) {
  // 闪避判定：目标闪避率越高越易躲开
  if (target.eva && Math.random() < target.eva) {
    floats.push({ x: target._x, y: target._y, text: '闪避', color: '#9B6BCC', ttl: 60 });
    battle.msg = target.name + ' 身形一晃，闪开了攻击！';
    return 0;
  }
  // 物理攻击用 atk/def，精神攻击用 spiAtk/spiDef（两者都扣同一生命值）
  const atkStat = type === 'spirit' ? attacker.spiAtk : attacker.atk;
  const defStat = type === 'spirit' ? target.spiDef : target.def;
  let base = atkStat * mult - defStat * 0.5;
  let crit = Math.random() < 0.15;
  if (crit) base *= 1.5;
  if (target.defending) base *= 0.5;
  base = Math.max(1, Math.round(base));
  target.hp = Math.max(0, target.hp - base);
  const col = crit ? '#A32D2D' : '#2C2C2A';
  const txt = (crit ? '暴击 ' : '') + '-' + base;
  floats.push({ x: target._x, y: target._y, text: txt, color: col, ttl: 60 });
  return base;
}

function applyAction(actor, target, act) {
  if (act === 'attack') {
    const d = damage(actor, target, 1.0);
    battle.msg = actor.name + ' 使出攻击，造成 ' + d + ' 伤害';
  } else if (act === 'skill') {
    const sk = actor.isEnemy ? actor.skill : SKILLS[actor.activeSkill];
    actor.mp -= sk.cost;
    const d = damage(actor, target, sk.mult, sk.type);
    battle.msg = actor.name + ' 施展「' + sk.name + '」，造成 ' + d + ' 伤害';
  } else if (act === 'defend') {
    actor.defending = true;
    battle.msg = actor.name + ' 运功防御，下一击伤害减半';
  } else if (act === 'item') {
    if (actor.potions > 0) {
      actor.potions--;
      const heal = 50;
      actor.hp = Math.min(actor.maxHp, actor.hp + heal);
      floats.push({ x: actor._x, y: actor._y, text: '+' + heal, color: '#3B6D11', ttl: 60 });
      battle.msg = actor.name + ' 服用金疮药，恢复 ' + heal + ' 气血';
    }
  }
}

function enemyAct(enemy) {
  const act = (enemy.mp >= enemy.skill.cost && Math.random() < 0.5) ? 'skill' : 'attack';
  applyAction(enemy, battle.player, act);
  nextTurn();
}

function playerAct(act) {
  if (!awaitingInput) return;
  awaitingInput = false;
  setButtons(false);
  applyAction(battle.player, battle.enemy, act);
  nextTurn();
}

function nextTurn() {
  battle.turn++;
  setTimeout(processTurn, 500);
}

function checkEnd() {
  if (battle.enemy.hp <= 0) {
    endBattle(true); return true;
  }
  if (battle.player.hp <= 0) {
    endBattle(false); return true;
  }
  return false;
}

function endBattle(win) {
  awaitingInput = false;
  setButtons(false);
  if (win) {
    battle.node.cleared = true;
    const before = CULTIVATION.realmFromXp(player.xp).globalIndex;
    const gain = 100 * battle.node.id;            // 战绩分：按节点难度递增
    player.xp += gain;
    player.score = player.xp;                     // 战绩分=累计修为，排行榜可直接显示境界
    // 灵石奖励（锻造货币）+ 装备掉落
    const goldGain = 20 + battle.node.id * 15;
    player.gold = (player.gold || 0) + goldGain;
    let dropMsg = '';
    if (Math.random() < 0.4) {
      const dslot = EQUIP_SLOT_KEYS[Math.floor(Math.random() * EQUIP_SLOT_KEYS.length)];
      const drop = genEquip(dslot, rollRarity());
      player.bag.push(drop);
      dropMsg = ' 拾得' + drop.name + '！';
    }
    if (window.Online && window.Online.onProgress) window.Online.onProgress(player.score);
    const after = CULTIVATION.realmFromXp(player.xp);
    const oldMax = player.maxHp;
    recalcStats(player);                          // 境界提升 → 属性增强
    player.hp = Math.min(player.maxHp, (player.hp || 0) + (player.maxHp - oldMax) + 40); // 突破增益 + 胜利回血
    player.mp = player.maxMp;
    state = (battle.node.id === nodes.length - 1) ? 'clear' : 'win';
    const broke = after.globalIndex > before;
    const realmUp = after.realmIndex > CULTIVATION.FLAT[before].realmIndex;
    let toastMsg = battle.node.id === nodes.length - 1
      ? '你击败了' + battle.node.enemy.name + '，江湖太平！'
      : '胜利！';
    if (broke) toastMsg = (realmUp ? '★ 突破大境界！晋升【' : '突破！晋升【') + after.label + '】';
    toast = toastMsg + dropMsg + ' 点击地图继续。';
    saveGame();
  } else {
    state = 'lose';
    toast = '你倒下了…点击地图重新挑战。';
  }
}

// ---- 输入 ----
buttons.forEach(b => b.addEventListener('click', () => playerAct(b.dataset.act)));

canvas.addEventListener('click', e => {
  const r = canvas.getBoundingClientRect();
  const x = (e.clientX - r.left) * (W / r.width);
  const y = (e.clientY - r.top) * (H / r.height);
  if (state === 'map') {
    for (const n of nodes) {
      if (Math.hypot(x - n.x, y - n.y) < 26 && unlocked(n.id)) {
        if (n.type === 'start') { toast = '清风镇 — 休整之地，点击前方地点出发。'; }
        else startBattle(n);
        return;
      }
    }
    // 点击空白区域 → 返回主页
    if (window.HUB) { window.HUB.show(); }
  } else if (state === 'win' || state === 'lose' || state === 'clear') {
    // 战斗结束 → 返回主页
    if (window.HUB) { window.HUB.refresh(); window.HUB.show(); }
    else { state = 'map'; toast = ''; }
  }
});

// ---- 渲染 ----
function drawPlaceholder(x, y, w, h, label, tint) {
  ctx.fillStyle = '#D3D1C7';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = '#888780';
  ctx.setLineDash([5, 4]);
  ctx.strokeRect(x, y, w, h);
  ctx.setLineDash([]);
  ctx.fillStyle = '#5F5E5A';
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(label, x + w / 2, y + h / 2);
}

function bar(x, y, w, ratio, color) {
  ctx.fillStyle = '#fff';
  ctx.fillRect(x, y, w, 8);
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w * Math.max(0, ratio), 8);
  ctx.strokeStyle = '#B4B2A9';
  ctx.strokeRect(x, y, w, 8);
}

function drawMap() {
  // 路径
  ctx.strokeStyle = '#B4B2A9';
  ctx.lineWidth = 2;
  for (let i = 1; i < nodes.length; i++) {
    ctx.beginPath();
    ctx.moveTo(nodes[i - 1].x, nodes[i - 1].y);
    ctx.lineTo(nodes[i].x, nodes[i].y);
    ctx.stroke();
  }
  // 节点
  for (const n of nodes) {
    const on = unlocked(n.id);
    ctx.beginPath();
    ctx.arc(n.x, n.y, 18, 0, Math.PI * 2);
    ctx.fillStyle = n.cleared ? '#97C459' : (on ? '#85B7EB' : '#D3D1C7');
    ctx.fill();
    ctx.strokeStyle = n.type === 'boss' ? '#C0392B' : '#5F5E5A';
    ctx.lineWidth = n.type === 'boss' ? 3 : 1;
    ctx.stroke();
    ctx.fillStyle = '#2C2C2A';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(n.name, n.x, n.y + 34);
    if (n.cleared) { ctx.fillStyle = '#3B6D11'; ctx.fillText('✓', n.x, n.y + 4); }
  }
  ctx.fillStyle = '#2C2C2A';
  ctx.font = '13px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('江湖地图 · ' + CULTIVATION.realmFromXp(player.xp).label + ' — 点击蓝色地点启程（空白处返回主页）', 20, 30);
}

function drawBattle() {
  // 背景
  if (ready(art.bg)) {
    ctx.drawImage(art.bg, 0, 0, W, H);
  } else {
    ctx.fillStyle = '#E9E4D8';
    ctx.fillRect(0, 0, W, H);
  }
  const p = battle.player, e = battle.enemy;
  p._x = 150; p._y = 200;
  e._x = 490; e._y = 160;

  // 敌方
  if (ready(art.enemy)) ctx.drawImage(art.enemy, e._x - 50, e._y - 70, 100, 140);
  else drawPlaceholder(e._x - 50, e._y - 70, 100, 140, '即梦·敌方立绘', '#D3D1C7');
  // 我方
  if (ready(art.hero)) ctx.drawImage(art.hero, p._x - 50, p._y - 70, 100, 140);
  else drawPlaceholder(p._x - 50, p._y - 70, 100, 140, '即梦·我方立绘', '#D3D1C7');

  // 血条/内力条
  ctx.textAlign = 'left';
  ctx.fillStyle = '#2C2C2A'; ctx.font = '12px sans-serif';
  ctx.fillText(p.name + '　' + CULTIVATION.realmFromXp(p.xp).label, p._x - 50, p._y - 80);
  bar(p._x - 50, p._y - 74, 100, p.hp / p.maxHp, '#639922');
  bar(p._x - 50, p._y - 64, 100, p.mp / p.maxMp, '#378ADD');

  ctx.textAlign = 'right';
  ctx.fillStyle = '#2C2C2A';
  ctx.fillText(e.name, e._x + 50, e._y - 80);
  bar(e._x - 50, e._y - 74, 100, e.hp / e.maxHp, '#A32D2D');
  bar(e._x - 50, e._y - 64, 100, e.mp / e.maxMp, '#378ADD');

  // 飘字
  floats.forEach(f => {
    ctx.globalAlpha = Math.max(0, f.ttl / 60);
    ctx.fillStyle = f.color;
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(f.text, f.x, f.y - (60 - f.ttl) * 0.5);
    ctx.globalAlpha = 1;
  });
  floats = floats.filter(f => --f.ttl > 0);

  // 底部信息
  ctx.fillStyle = 'rgba(241,239,232,0.92)';
  ctx.fillRect(0, H - 30, W, 30);
  ctx.fillStyle = '#2C2C2A';
  ctx.font = '13px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(battle.msg + '　(丹药:' + p.potions + ')', 12, H - 10);
}

function drawOverlay(text) {
  ctx.fillStyle = 'rgba(44,44,42,0.55)';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#fff';
  ctx.font = '16px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(text, W / 2, H / 2);
}

function render() {
  // 主页/创建界面是 DOM 层，不需要画布持续重绘；跳过 60fps 空转，把算力让给视频解码
  if (state === 'hub' || state === 'create') { requestAnimationFrame(render); return; }
  ctx.clearRect(0, 0, W, H);
  if (state === 'create') {
    ctx.fillStyle = '#111'; ctx.fillRect(0, 0, W, H);
  } else if (state === 'map') {
    drawMap();
  } else if (state === 'battle') {
    drawBattle();
  } else if (state === 'win') {
    drawBattle(); drawOverlay('胜 利');
  } else if (state === 'lose') {
    drawBattle(); drawOverlay('败 北');
  } else if (state === 'clear') {
    drawBattle(); drawOverlay('江 湖 太 平');
  }
  if (toast) {
    ctx.fillStyle = 'rgba(241,239,232,0.95)';
    ctx.fillRect(0, H - 24, W, 24);
    ctx.fillStyle = '#2C2C2A';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(toast, W / 2, H - 8);
  }
  requestAnimationFrame(render);
}
