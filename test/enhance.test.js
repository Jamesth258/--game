/* 无头回归测试：装备强化系统（纯逻辑）
 *   - enhanceInfo：每个等级的成功率/材料消耗/掉档规则
 *   - enhanceResolve：roll 决定结果（success + 掉档）
 *   - enhanceMul：基础数值缩放倍率
 *   - +25 满级边界
 * 运行：node test/enhance.test.js
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
let code='';
for (const f of FILES) code += '\n;// '+f+'//\n' + fs.readFileSync(path.join(ROOT,f),'utf8');

code += `
;(function(){
  const results=[]; function assert(n,c){ results.push((c?'PASS':'FAIL')+' | '+n); }
  try {
    initHub();
    const expectRate=[1.0,0.7,0.4,0.2,0.05];
    const expectCost=[1,5,10,15,20];
    for (let cur=0; cur<25; cur++){
      const info=enhanceInfo(cur);
      const band=Math.floor(cur/5);
      assert('enhanceInfo cur='+cur+' 成功率', Math.abs(info.rate-expectRate[band])<1e-9);
      assert('enhanceInfo cur='+cur+' 材料阶='+band, info.tier===band);
      assert('enhanceInfo cur='+cur+' 消耗='+expectCost[cur%5], info.cost===expectCost[cur%5]);
      assert('enhanceInfo cur='+cur+' 掉档='+(band>=2), info.drop===(band>=2));
    }
    assert('+0 必成功→+1', enhanceResolve(0,0).success===true && enhanceResolve(0,0).newLevel===1);
    assert('+5(70%) 高roll失败不掉档→+5', (function(){const r=enhanceResolve(5,0.99); return r.success===false && r.newLevel===5;})());
    assert('+5 低roll成功→+6', enhanceResolve(5,0.0).newLevel===6);
    assert('+10(40%) 失败掉一档→+9', (function(){const r=enhanceResolve(10,0.99); return r.success===false && r.newLevel===9;})());
    assert('+11(40%) 失败掉一档→+10', (function(){const r=enhanceResolve(11,0.99); return r.success===false && r.newLevel===10;})());
    assert('+12(40%) 失败→+11', enhanceResolve(12,0.99).newLevel===11);
    assert('+24(5%) 成功→+25满级', enhanceResolve(24,0.0).newLevel===25);
    assert('+24 失败掉→+23', enhanceResolve(24,0.99).newLevel===23);
    assert('enhanceMul +10 = 1.8x', Math.abs(enhanceMul({enhance:10})-1.8)<1e-9);
    assert('enhanceMul +25 = 3.0x', Math.abs(enhanceMul({enhance:25})-3.0)<1e-9);
    assert('enhanceInfo +25 目标=26 (doEnhance 拦截满级)', enhanceInfo(25).target===26);
    // ---- 强化缩放范围：仅 7 个基础属性，命中/闪避/特效不放大 ----
    const _fake = { slot:'weapon', rarity:'__none__', bonus:{ atk:100, maxHp:50, spiAtk:30, hitRate:0.30, eva:0.10 } };
    const _b0 = resolvedEquipBonus(_fake);
    assert('resolvedEquipBonus 未强化原值(攻/命中)', Math.abs(_b0.atk-100)<1e-9 && Math.abs(_b0.hitRate-0.30)<1e-9);
    const _fake2 = { slot:'weapon', rarity:'__none__', enhance:10, bonus:{ atk:100, maxHp:50, spiAtk:30, hitRate:0.30, eva:0.10 } };
    const _b1 = resolvedEquipBonus(_fake2);
    assert('强化 +10：攻×1.8', Math.abs(_b1.atk-180)<1e-9);
    assert('强化 +10：气血×1.8', Math.abs(_b1.maxHp-90)<1e-9);
    assert('强化 +10：精攻×1.8', Math.abs(_b1.spiAtk-54)<1e-9);
    assert('强化 +10：命中不变(铁律不被突破)', Math.abs(_b1.hitRate-0.30)<1e-9);
    assert('强化 +10：闪避不变(铁律不被突破)', Math.abs(_b1.eva-0.10)<1e-9);
    const _fake3 = { slot:'weapon', rarity:'__none__', enhance:25, bonus:{ hitRate:0.50, eva:0.80 } };
    const _b2 = resolvedEquipBonus(_fake3);
    assert('强化 +25：命中超上限回落到 0.40（铁律守住）', Math.abs(_b2.hitRate-0.40)<1e-9);
    assert('强化 +25：闪避超上限回落到 0.50（铁律守住）', Math.abs(_b2.eva-0.50)<1e-9);
    // ---- 分解入口：从背包 tip 调 disenchantBag 得对应品阶材料 ----
    closeModal = function(){}; showBagModal = function(){};
    const _deq = { uid:'__dis__', slot:'weapon', rarity:'fan', bonus:{atk:10}, enhance:0 };
    player.bag.push(_deq);
    const _m0 = player.materials[0]||0, _lenB = player.bag.length;
    window.disenchantBag('__dis__');
    assert('disenchantBag：凡品装备分解→材料[0]+1', (player.materials[0]||0) === _m0+1);
    assert('disenchantBag：装备移出背包', player.bag.length === _lenB-1);
    const _deq2 = { uid:'__dis2__', slot:'armor', rarity:'shen', bonus:{def:10}, enhance:0 };
    player.bag.push(_deq2);
    const _m4 = player.materials[4]||0, _lenB2 = player.bag.length;
    window.disenchantBag('__dis2__');
    assert('disenchantBag：神品装备分解→材料[4]+1', (player.materials[4]||0) === _m4+1);
  } catch(e){ results.push('FAIL | 异常：'+(e&&e.stack?e.stack:e)); }
  globalThis.__RESULTS=results;
})();
`;

vm.runInContext(code, sandbox, {filename:'enhance-bundle.js'});
const results = sandbox.__RESULTS||[];
let fail=0; console.log('===== enhance.test =====');
for (const r of results){ if(r.startsWith('FAIL')) fail++; console.log(r); }
console.log('=====');
console.log(fail===0?('全部通过：'+results.length+' 项'):(fail+' 项失败 / 共 '+results.length+' 项'));
process.exit(fail===0?0:1);
