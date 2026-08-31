/* 登录加载流程仿真验证（真实定时器）
 *
 * 背景：test/*.test.js 的桩里 setTimeout / requestAnimationFrame 都是空实现
 *       （返回 0 且不回调），所以 bootGame() 在测试里根本不会推进，
 *       9/9 全绿并不能证明加载时序正确。本脚本用真实定时器跑完整流程。
 *
 * 验证目标：
 *   1. 进度条最终到 100%
 *   2. initSave / initWorld 必须发生在 overlay.hidden=true 之前
 *      （这是本次修复的核心：真实卡顿要被封面盖住）
 *   3. 缓存命中场景总时长约 5s
 *   4. 慢网场景下进度条不撒谎：不会在资源加载完之前报 100%
 *
 * 运行：node test/_boot_sim.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const FILES = [
  'config.js', 'cultivation.js', 'js/core.js', 'js/equip_db.js', 'js/player.js', 'js/skills-data.js',
  'js/story-data.js', 'js/battle.js', 'js/hub.js', 'js/create.js', 'js/story.js',
  'js/worldboss.js', 'js/daily.js', 'js/codex.js', 'js/main.js',
];

/* 校准：仿真把 rAF 实现成 setTimeout(16)，而 Node 定时器有固定开销
 * （实测本机约 29ms/次，即 1.8x 膨胀）。先测出膨胀倍数，
 * 才能把仿真测得的时长折算回真实浏览器（rAF ≈ 16.7ms/帧）。 */
function calibrate() {
  return new Promise(resolve => {
    let n = 0; const t0 = Date.now();
    function step() {
      n++;
      if (n < 90) return setTimeout(step, 16);
      const per = (Date.now() - t0) / n;
      resolve({ perTickMs: per, inflation: per / 16.67 });
    }
    setTimeout(step, 16);
  });
}

function buildSource() {
  return FILES.map(f => {
    let src = fs.readFileSync(path.join(ROOT, f), 'utf8');
    if (f === 'js/main.js') {
      // 去掉自动启动，改由本脚本在埋好探针后手动调用
      src = src.replace(/\nbootGame\(\);\s*$/, '\n');
    }
    return src;
  }).join('\n;\n') +
  // const 声明不会挂到 global（跨 script 共享的经典坑），显式导出以便断言
  '\n;\nglobalThis.__LOADING_ASSETS = (typeof LOADING_ASSETS !== "undefined") ? LOADING_ASSETS : [];\n';
}

function runScenario(name, assetLatencyMs, expectMin, expectMax, opts) {
  opts = opts || {};
  // 场景开关：模拟后台标签页 —— rAF 被浏览器暂停，完全不回调
  const rafEnabled = opts.rafEnabled !== false;
  return new Promise(resolve => {
    const events = [];
    const t0 = Date.now();
    const at = () => Date.now() - t0;
    const rec = (what) => events.push({ t: at(), what });
    // 统计真实发出的图片请求（用于抓"预加载被整段删掉"这类回归）
    let imgCreated = 0;
    const imgSrcSet = new Set();

    // ---- canvas / 元素桩 ----
    const ctxStub = new Proxy({}, { get: () => () => {}, set: () => true });
    const elements = {};
    function makeEl(id) {
      const el = {
        id, _attrs: {}, style: {}, innerHTML: '', textContent: '', hidden: false,
        src: '', dataset: {},
        classList: {
          _s: new Set(),
          add(c) { this._s.add(c); }, remove(c) { this._s.delete(c); },
          contains(c) { return this._s.has(c); },
          toggle(c, force) { const on = force === undefined ? !this._s.has(c) : !!force; on ? this._s.add(c) : this._s.delete(c); return on; },
        },
        setAttribute(k, v) { this._attrs[k] = v; if (k === 'hidden') this.hidden = true; },
        removeAttribute(k) { delete this._attrs[k]; if (k === 'hidden') this.hidden = false; },
        getAttribute(k) { return this._attrs[k]; },
        addEventListener() {}, removeEventListener() {}, appendChild() {}, remove() {},
        querySelectorAll() { return []; }, querySelector() { return null; },
        load() {}, play() { return Promise.resolve(); },
        getContext() { return ctxStub; },
        getBoundingClientRect() { return { left: 0, top: 0, width: 640, height: 360 }; },
        width: 640, height: 360, naturalWidth: 0, complete: false, onerror: null,
      };
      return el;
    }

    const sandbox = {
      console,
      setTimeout, clearTimeout, setInterval, clearInterval,
      // 真实 rAF：16ms 一帧（rafEnabled=false 时模拟后台标签页被暂停，永不回调）
      requestAnimationFrame: rafEnabled ? (cb) => setTimeout(() => cb(Date.now()), 16) : () => 0,
      cancelAnimationFrame: (id) => clearTimeout(id),
      // 图片桩：按 assetLatencyMs 延迟回调，模拟缓存命中 / 慢网
      Image: class {
        constructor() { this.onerror = null; this.onload = null; this.complete = false; imgCreated++; }
        set src(v) {
          this._src = v;
          imgSrcSet.add(v);
          setTimeout(() => {
            this.complete = true;
            if (typeof this.onload === 'function') this.onload();
          }, assetLatencyMs);
        }
        get src() { return this._src; }
      },
      document: {
        getElementById: (id) => elements[id] || (elements[id] = makeEl(id)),
        createElement: (tag) => {
          const el = makeEl(tag);
          if (tag === 'video') {
            // 视频桩：设 src 后按 assetLatencyMs 延迟触发 onloadeddata（模拟首帧就绪）
            let _vsrc = '';
            Object.defineProperty(el, 'src', {
              configurable: true,
              get() { return _vsrc; },
              set(v) { _vsrc = v; imgSrcSet.add(v); setTimeout(() => { if (typeof el.onloadeddata === 'function') el.onloadeddata(); }, assetLatencyMs); },
            });
          }
          return el;
        },
        querySelector: () => null,
        querySelectorAll: () => [],
        addEventListener() {}, removeEventListener() {},
        body: makeEl('body'),
      },
      localStorage: {
        _d: {},
        getItem(k) { return Object.prototype.hasOwnProperty.call(this._d, k) ? this._d[k] : null; },
        setItem(k, v) { this._d[k] = String(v); },
        removeItem(k) { delete this._d[k]; },
        clear() { this._d = {}; },
      },
      alert() {}, confirm() { return true; },
      addEventListener() {}, removeEventListener() {},
      location: { href: 'http://localhost/', reload() {}, search: '', hash: '' },
      navigator: { userAgent: 'node-sim' },
      performance: { now: () => Date.now() },
      fetch: () => Promise.resolve({ ok: false, json: () => Promise.resolve({}) }),
    };
    sandbox.window = sandbox;
    sandbox.globalThis = sandbox;
    vm.createContext(sandbox);

    // 加载全部脚本
    vm.runInContext(buildSource(), sandbox, { filename: 'bundle.js' });

    // ---- 埋探针：initSave 通过 checkSavedCharacter 观测，initWorld 通过 render 观测 ----
    const origCSC = sandbox.checkSavedCharacter;
    sandbox.checkSavedCharacter = function () {
      rec('initSave:START');
      const r = origCSC.apply(this, arguments);
      rec('initSave:END');
      return r;
    };
    const origRender = sandbox.render;
    sandbox.render = function () {
      if (!events.some(e => e.what === 'initWorld:START')) rec('initWorld:START');
      return origRender.apply(this, arguments);
    };

    // ---- 预取 loading 元素（桩是懒创建的，先实例化才能装探针）----
    const overlay = sandbox.document.getElementById('loading-screen');
    sandbox.document.getElementById('loading-fill');
    sandbox.document.getElementById('loading-pct');
    sandbox.document.getElementById('loading-tip');
    sandbox.document.getElementById('loading-hint');

    // ---- 监听遮罩何时真正隐藏 ----
    let overlayHiddenAt = -1;
    Object.defineProperty(overlay, 'hidden', {
      configurable: true,
      get() { return this._hidden; },
      set(v) { this._hidden = v; if (v === true && overlayHiddenAt < 0) { overlayHiddenAt = at(); rec('overlay:HIDDEN'); } },
    });

    // ---- 启动 ----
    rec('boot:START');
    sandbox.bootGame();

    // ---- 等待完成（最多 25s）----
    const poll = setInterval(() => {
      if (elements['loading-screen'] && elements['loading-screen'].hidden === true) {
        clearInterval(poll);
        const total = at();
        const pctTxt = elements['loading-pct'] ? elements['loading-pct'].textContent : '(n/a)';
        resolve({ name, total, events, pctTxt, assetLatencyMs, expectMin, expectMax,
                  imgCreated, imgRequested: imgSrcSet.size,
                  assetTotal: (sandbox.__LOADING_ASSETS || []).length });
      } else if (at() > 25000) {
        clearInterval(poll);
        resolve({ name, total: at(), events, pctTxt: '(timeout)',
                  pctWidth: elements['loading-fill'] && elements['loading-fill'].style.width,
                  assetLatencyMs, expectMin, expectMax, timedOut: true });
      }
    }, 50);
  });
}

function judge(r) {
  const fails = [];
  const has = (w) => r.events.some(e => e.what === w);
  const tOf = (w) => { const e = r.events.find(x => x.what === w); return e ? e.t : -1; };

  if (r.timedOut) fails.push('未在 25s 内完成（超时）');
  if (r.pctTxt !== '100%') fails.push('进度条未到 100%，实际=' + r.pctTxt);

  const tSave = tOf('initSave:START');
  const tWorld = tOf('initWorld:START');
  const tHidden = tOf('overlay:HIDDEN');

  if (tSave < 0) fails.push('initSave 未执行');
  if (tWorld < 0) fails.push('initWorld 未执行');
  if (tHidden < 0) fails.push('遮罩未隐藏');
  // 核心断言：真实初始化必须在遮罩消失之前完成
  if (tSave >= 0 && tHidden >= 0 && tSave > tHidden) fails.push('initSave 发生在遮罩隐藏之后（卡顿未被盖住）');
  if (tWorld >= 0 && tHidden >= 0 && tWorld > tHidden) fails.push('initWorld 发生在遮罩隐藏之后（首帧渲染未被盖住）');

  if (!r.timedOut && r.total < r.expectMin) fails.push('总时长过短 ' + r.total + 'ms < ' + r.expectMin + 'ms');
  if (!r.timedOut && r.total > r.expectMax) fails.push('总时长过长 ' + r.total + 'ms > ' + r.expectMax + 'ms');

  // 预加载完整性：必须真的把资源清单里的图都请求出去，
  // 否则"加载画面"只是空转，进游戏后照样卡（曾因重构漏掉整段预加载）
  if (r.assetTotal > 0) {
    if (r.imgRequested < r.assetTotal) {
      fails.push('预加载不完整：只请求了 ' + r.imgRequested + '/' + r.assetTotal + ' 个资源');
    }
  }

  return { fails, tSave, tWorld, tHidden };
}

let INFL = 1;   // 由校准得出（Node 定时器相对浏览器 rAF 的膨胀倍数）

(async () => {
  console.log('===== 登录加载流程仿真 =====\n');

  const cal = await calibrate();
  INFL = cal.inflation;
  console.log('定时器校准: ' + cal.perTickMs.toFixed(1) + 'ms/tick，相对浏览器 rAF(16.7ms) 膨胀 ' +
              INFL.toFixed(2) + 'x\n');

  // 场景 A：资源全部缓存命中（latency 2ms）→ 期望靠最短时长撑到约 5s
  const a = await runScenario('A 缓存命中', 2, 4500, 9000);
  const ja = judge(a);
  printScenario(a, ja);

  // 场景 B：慢网（每个资源 900ms 才回调）→ 进度条必须等真实加载，不能提前报 100%
  const b = await runScenario('B 慢网 900ms/资源', 900, 4500, 20000);
  const jb = judge(b);
  printScenario(b, jb);

  // 场景 C：后台标签页（rAF 被浏览器暂停，永不回调）
  // 验证 raf() 的定时器兜底仍能驱动流程，不会永久卡在加载画面
  const c = await runScenario('C 后台标签页(rAF 暂停)', 2, 4500, 20000, { rafEnabled: false });
  const jc = judge(c);
  printScenario(c, jc);

  // 场景 D：大资源慢网（每资源 4000ms 才回调，模拟 8MB 主页立绘在慢网下真实下载慢）。
  // 关键验证：真实加载(≈4000ms)慢于保底节奏(3000ms)时，进度条必须等真实加载完成，
  // 不能靠 3s 保底就跳 100%（这正是修复 creep 假完成的靶子）。期望总时长 > 保底的 5.2s。
  const d = await runScenario('D 大资源慢网 4000ms', 4000, 5500, 12000);
  const jd = judge(d);
  printScenario(d, jd);

  const allFails = [...ja.fails, ...jb.fails, ...jc.fails, ...jd.fails];
  console.log('\n===== 汇总 =====');
  if (allFails.length === 0) {
    console.log('全部通过：进度条 100% 收尾，且真实初始化全程在遮罩下完成。');
  } else {
    console.log('存在失败项：');
    allFails.forEach(f => console.log('  ✗ ' + f));
  }
  process.exit(allFails.length ? 1 : 0);
})();

function printScenario(r, j) {
  console.log('── 场景 ' + r.name + ' ──');
  console.log('  资源延迟      : ' + r.assetLatencyMs + 'ms/张');
  // 各阶段均按墙钟时间推进（帧率只影响顺滑度），故仿真时长≈浏览器真实时长
  console.log('  总时长        : ' + r.total + 'ms  (期望 ' + r.expectMin + '~' + r.expectMax +
              'ms；设计 ≈5.2s，墙钟计时故基本不失真)');
  console.log('  最终百分比    : ' + r.pctTxt);
  console.log('  资源预加载    : ' + r.imgRequested + '/' + r.assetTotal + ' 已请求' +
              (r.imgRequested >= r.assetTotal ? '  ✓' : '  ✗ 预加载不完整'));
  console.log('  事件时序      :');
  r.events.forEach(e => console.log('    ' + String(e.t).padStart(6) + 'ms  ' + e.what));
  if (j.fails.length) {
    console.log('  ✗ 失败: ' + j.fails.join(' | '));
  } else {
    console.log('  ✓ 通过（初始化 t=' + j.tSave + '/' + j.tWorld + 'ms 均早于遮罩隐藏 t=' + j.tHidden + 'ms）');
  }
  console.log('');
}
