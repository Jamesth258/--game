/* create.js — 角色创建流程：名字/性别/形象三步
 * 由 index.html 拆分而来。加载顺序见 index.html 底部 <script> 列表，勿随意调整。
 * 注意：顶层 const/let 跨文件可直接引用，但不会挂到 window（详见 PROJECT.md 坑点 8.1）。
 */
// ===== 角色创建系统 =====
const CHARACTERS = {
  male: [
    { id: 'm1', name: '铁骨武者',   img: 'assets/select/m1_warrior.png?v=2', desc: '强壮刚毅，体修入道' },
    { id: 'm2', name: '少年侠客',   img: 'assets/select/m2_young.png?v=2',  desc: '年轻俊朗，天赋异禀', video: 'assets/char/char_m2.mp4?v=2' },
    { id: 'm3', name: '道骨仙风',   img: 'assets/select/m3_daoist.png?v=2', desc: '中年大叔，道法深厚' },
  ],
  female: [
    { id: 'f1', name: '灵气萝莉',   img: 'assets/select/f1_loli.png?v=2',   desc: '可爱灵动，根骨奇佳' },
    { id: 'f2', name: '绝代佳人',   img: 'assets/select/f2_hot.png?v=2',    desc: '性感热辣，魅惑众生' },
    { id: 'f3', name: '温婉御姐',   img: 'assets/select/f3_mature.png?v=2', desc: '成熟丰满，气质出众' },
  ],
};

const createScreen = document.getElementById('create-screen');
const nameInput = document.getElementById('char-name');
const nameErr = document.getElementById('name-err');
const charGrid = document.getElementById('char-grid');
let createData = { name: '', gender: '', avatar: null };

// 名字校验：仅汉字或字母
function isValidName(s) { return /^[\u4e00-\u9fa5a-zA-Z]+$/.test(s); }

// 步骤切换
function goToStep(n) {
  document.querySelectorAll('.create-step').forEach((el, i) => el.classList.toggle('active', i === n));
  document.querySelectorAll('.step-dot').forEach((el, i) => {
    el.classList.toggle('active', i === n);
    el.classList.toggle('done', i < n);
  });
}

// Step 1: 名字
nameInput.addEventListener('input', () => {
  const v = nameInput.value.trim();
  if (v.length === 0) { nameErr.textContent = ''; document.getElementById('name-next').disabled = true; return; }
  if (!isValidName(v)) { nameErr.textContent = '⚠ 名字只能包含汉字或字母，不能有数字或符号'; document.getElementById('name-next').disabled = true; return; }
  if (v.length < 2) { nameErr.textContent = ''; document.getElementById('name-next').disabled = true; return; }
  nameErr.textContent = '';
  createData.name = v;
  document.getElementById('name-next').disabled = false;
});
document.getElementById('name-next').addEventListener('click', () => { if (createData.name) goToStep(1); });

// Step 2: 性别
document.querySelectorAll('.gender-card').forEach(card => {
  card.addEventListener('click', () => {
    document.querySelectorAll('.gender-card').forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');
    createData.gender = card.dataset.g;
    document.getElementById('gender-next').disabled = false;

    // 预加载对应形象图到 grid
    renderAvatarGrid(createData.gender);
  });
});
document.getElementById('gender-back').addEventListener('click', () => goToStep(0));
document.getElementById('gender-next').addEventListener('click', () => { if (createData.gender) goToStep(2); });

// Step 3: 形象渲染与选择
function renderAvatarGrid(gender) {
  const list = CHARACTERS[gender] || [];
  charGrid.innerHTML = list.map(c =>
    `<div class="char-card" data-id="${c.id}">
      <img src="${c.img}" alt="${c.name}" loading="lazy"${c.pos ? ` style="object-position:${c.pos}"` : ''}>
      <div class="char-name">${c.name}</div>
    </div>`
  ).join('');

  // 绑定选择事件
  charGrid.querySelectorAll('.char-card').forEach(card => {
    card.addEventListener('click', () => {
      charGrid.querySelectorAll('.char-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      createData.avatar = list.find(c => c.id === card.dataset.id);
      document.getElementById('avatar-confirm').disabled = false;

      // 选中的形象也作为战斗立绘
      if (createData.avatar) {
        art.hero.src = createData.avatar.img;
        art.hero.failed = false;
      }
    });
  });
}
document.getElementById('avatar-back').addEventListener('click', () => goToStep(1));

// 确认创建 → 进入游戏
document.getElementById('avatar-confirm').addEventListener('click', () => {
  if (!createData.avatar) return;
  player.name = createData.name;
  player.sect = createData.avatar.desc; // 用形象描述作为初始门派/定位
  player.avatarId = createData.avatar.id;
  // 立绘已在选择时设置 (art.hero.src)
  recalcStats(player);
  player.hp = player.maxHp; player.mp = player.maxMp;

  // 隐藏创建界面，显示主页
  createScreen.setAttribute('hidden', '');
  initHub();
  window.HUB.show(); // 进入主页（而非直接进地图）

  saveGame(); // 存入 localStorage（下次打开不再重复创建）
});
