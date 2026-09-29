/* 无头回归测试：商店横版列表 + 强化材料商品
 *   - 灵石专区装备行改为横版列表（.bag-item.shop-row），不再用竖版 .shop-cell
 *   - 三类行（装备/材料/丹药）按钮同款：.equip-btn.diamond-buy-btn
 *   - 新增 3 阶材料商品：淬铁砂 500 / 灵髓晶 2000 / 宝纹玉 10000 灵石
 *   - buyMaterial：扣灵石、materials[tier]+1、不进背包；灵石不足不动账
 * 运行：node test/shop.test.js
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.join(__dirname, '..');
const FILES = ['config.js','cultivation.js','js/core.js','js/equip_db.js','js/player.js','js/skills-data.js','js/story-data.js','js/battle.js','js/hub.js','js/create.js','js/story.js','js/worldboss.js','js/daily.js','js/codex.js','js/main.js'];
const ctxStub = new Proxy({}, { get: () => () => {}, set: () => true });
const elements = {};
function makeEl(id){ return { id,_attrs:{},style:{},innerHTML:'',textContent:'',hidden:false,src:'',dataset:{},_errBound:false,classList:{add(){},remove(){},contains(){return false;}},setAttribute(k,v){this._attrs[k]=v;if(k==='hidden')this.hidden=true;},removeAttribute(k){delete this._attrs[k];if(k==='hidden')this.hidden=false;},getAttribute(k){return this._attrs[k];},addEventListener(){},removeEventListener(){},appendChild(){},querySelectorAll(){return [];},querySelector(){return null;},load(){},play(){return Promise.resolve();},getContext(){return ctxStub;},getBoundingClientRect(){return {left:0,top:0,width:640,height:360};},width:640,height:360,naturalWidth:0,complete:false,onerror:null }; }
function getEl(id){ return elements[id]||(elements[id]=makeEl(id)); }
const localStore = {};
const sandbox = { console,Math,Date,JSON,Array,Object,String,Number,Boolean,Promise,parseInt,parseFloat,isNaN,isFinite,setTimeout:()=>0,clearTimeout:()=>{},setInterval:()=>0,clearInterval:()=>{},requestAnimationFrame:()=>0, Image: class { constructor(){this.onerror=null;this.complete=false;this.naturalWidth=0;this.failed=false;} set src(v){this._src=v;} get src(){return this._src;} }, localStorage:{getItem:k=>(k in localStore?localStore[k]:null),setItem:(k,v)=>{localStore[k]=String(v);},removeItem:k=>{delete localStore[k];}}, document:{getElementById:getEl,createElement:()=>makeEl('dyn'),querySelectorAll:()=>[],querySelector:()=>null,body:makeEl('body'),documentElement:makeEl('html'),addEventListener(){}}, window:{addEventListener(){} } };
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
const NL = String.fromCharCode(10);
let code='';
for (const f of FILES) code += NL + ';// ' + f + '//' + NL + fs.readFileSync(path.join(ROOT,f),'utf8');

code += [
";(function(){",
"  const results=[]; function assert(n,c){ results.push((c?'PASS':'FAIL')+' | '+n); }",
"  try {",
"    initHub();",
"    refreshHub = function(){};",
"    let SHOP_HTML = '';",
"    openModal = function(html){ SHOP_HTML = String(html); };",
"    player.gold = 100000; player.materials = [0,0,0,0,0];",
"    window.showShopModal();",
"    // ---- 1. 装备行：横版列表，不再有竖版格子 ----",
"    assert('装备行已改横版列表（无 .shop-cell）', SHOP_HTML.indexOf('shop-cell') < 0);",
"    assert('装备行用 .bag-item.shop-row', SHOP_HTML.indexOf('class=\"bag-item shop-row\"') >= 0);",
"    assert('无残留竖版 CSS 类 shop-buy', SHOP_HTML.indexOf('shop-buy') < 0);",
"    const rowsCnt = SHOP_HTML.split('class=\"bag-item shop-row\"').length - 1;",
"    assert('横版行总数 = 装备4 + 材料3 + 丹药8 + 钻石4 = 19（实际 '+rowsCnt+'）', rowsCnt === 19);",
"    // ---- 2. 三类行按钮同款 ----",
"    const btnCnt = SHOP_HTML.split('equip-btn diamond-buy-btn').length - 1;",
"    assert('行内购买按钮统一 .equip-btn.diamond-buy-btn = 19（实际 '+btnCnt+'）', btnCnt === 19);",
"    assert('价格后缀统一为「灵」（无「灵石」按钮文案）', SHOP_HTML.indexOf('灵石</button>') < 0);",
"    // ---- 3. 材料商品三阶上架、价格正确 ----",
"    assert('材料分组标题「强化材料」存在', SHOP_HTML.indexOf('强化材料') >= 0);",
"    assert('淬铁砂 已上架', SHOP_HTML.indexOf('淬铁砂') >= 0);",
"    assert('灵髓晶 已上架', SHOP_HTML.indexOf('灵髓晶') >= 0);",
"    assert('宝纹玉 已上架', SHOP_HTML.indexOf('宝纹玉') >= 0);",
"    assert('淬铁砂 售价 500 灵', SHOP_HTML.indexOf('>500灵<') >= 0);",
"    assert('灵髓晶 售价 2000 灵', SHOP_HTML.indexOf('>2000灵<') >= 0);",
"    assert('宝纹玉 售价 10000 灵', SHOP_HTML.indexOf('>10000灵<') >= 0);",
"    assert('未上架仙灵露（高阶不给直接买）', SHOP_HTML.indexOf('仙灵露') < 0);",
"    assert('未上架神源髓（高阶不给直接买）', SHOP_HTML.indexOf('神源髓') < 0);",
"    assert('材料图标为 SVG 晶石（按品阶着色 #9aa0a6）', SHOP_HTML.indexOf('#9aa0a6') >= 0 && SHOP_HTML.indexOf('<svg viewBox=\"0 0 48 48\" class=\"ii\"') >= 0);",
"    assert('材料行显示持有数量', SHOP_HTML.indexOf('强化材料 · 持有 ×0') >= 0);",
"    // ---- 4. buyMaterial 行为 ----",
"    assert('window.buyMaterial 已挂载（onclick 可用）', typeof window.buyMaterial === 'function');",
"    const bagLen0 = player.bag.length, gold0 = player.gold;",
"    window.buyMaterial(0);",
"    assert('buyMaterial(凡品)：灵石 -500', player.gold === gold0 - 500);",
"    assert('buyMaterial(凡品)：materials[0] = 1', player.materials[0] === 1);",
"    assert('buyMaterial：材料不进背包', player.bag.length === bagLen0);",
"    window.buyMaterial(2);",
"    assert('buyMaterial(宝品)：灵石 -10000', player.gold === gold0 - 500 - 10000);",
"    assert('buyMaterial(宝品)：materials[2] = 1', player.materials[2] === 1);",
"    // 重渲染后持有数同步",
"    assert('重渲染后持有数刷新为 ×1', SHOP_HTML.indexOf('强化材料 · 持有 ×1') >= 0);",
"    // ---- 5. 灵石不足：不可购买、不动账 ----",
"    player.gold = 10;",
"    const gPoor = player.gold, m1 = player.materials[1];",
"    window.buyMaterial(1);",
"    assert('灵石不足：不扣灵石', player.gold === gPoor);",
"    assert('灵石不足：不加材料', player.materials[1] === m1);",
"    assert('灵石不足：按钮禁用（disabled）', SHOP_HTML.indexOf('10000灵</button>') >= 0 || SHOP_HTML.indexOf('disabled') >= 0);",
"    // ---- 6. 非上架阶位不可购买 ----",
"    player.gold = 99999999;",
"    const m3 = player.materials[3];",
"    window.buyMaterial(3);",
"    assert('未上架阶位(tier3)不可购买', player.materials[3] === m3);",
"  } catch(e){ results.push('FAIL | 异常：'+(e&&e.stack?e.stack:e)); }",
"  globalThis.__RESULTS=results;",
"})();"
].join(NL);

vm.runInContext(code, sandbox, {filename:'shop-bundle.js'});
const results = sandbox.__RESULTS||[];
let fail=0; console.log('===== shop.test =====');
for (const r of results){ if(r.startsWith('FAIL')) fail++; console.log(r); }
console.log('=====');
// ---- CSS 级联回归守护：作用域规则不得残留 80px（会压制基础 .diamond-buy-btn 的 88px）----
try {
  const spCss = fs.readFileSync(path.join(ROOT,'css/scroll-panel.css'),'utf8');
  const stCss = fs.readFileSync(path.join(ROOT,'css/style.css'),'utf8');
  const OLD = /diamond-buy-btn\s*\{[^}]*flex:0 0 80px !important; width:80px !important/s;
  if (OLD.test(spCss)) { fail++; console.log('FAIL | scroll-panel.css 仍存在 .diamond-buy-btn 80px 作用域规则（会压制 88px）'); }
  else { console.log('PASS | scroll-panel.css 作用域规则已对齐 88px'); }
  if (/diamond-buy-btn\s*\{[^}]*width:\s*88px !important/.test(stCss)) { console.log('PASS | style.css 基础 .diamond-buy-btn = 88px'); }
  else { fail++; console.log('FAIL | style.css 基础 .diamond-buy-btn 缺少 88px'); }
} catch(e){ fail++; console.log('FAIL | 读取 CSS 异常：'+(e&&e.stack?e.stack:e)); }
console.log(fail===0?('全部通过：'+results.length+' 项 + CSS 守护'):(fail+' 项失败 / 共 '+results.length+' 项'));
process.exit(fail===0?0:1);
