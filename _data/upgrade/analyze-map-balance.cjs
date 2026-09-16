const fs=require('fs'),path=require('path'),vm=require('vm');
const ts=require('../../extensions/cocos-mcp-server-main/node_modules/typescript');
const root=path.resolve(__dirname,'../..'),c={};
vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(root,'assets/Game_Bundles/73_ZRSJZ/Scripts/ZRSJZ_Constant.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{exports:c,require});
const p=c.ZRSJZ_PROP_CONFIG,attr=c.ZRSJZ_PROP_PROPERTY;
const modes=[...c.ZRSJZ_MAP_CONFIG].filter(([k])=>k!=='新手村').sort((a,b)=>a[1].Difficulty-b[1].Difficulty);
const wan=v=>(v/10000).toFixed(2),num=v=>Number(v.toFixed(3)),pct=v=>num(v*100)+'%';
const names=new Map();
function walk(dir){for(const d of fs.readdirSync(dir,{withFileTypes:true})){const f=path.join(dir,d.name);if(d.isDirectory())walk(f);else if(f.endsWith('.prefab.meta'))names.set(JSON.parse(fs.readFileSync(f)).uuid,f.slice(0,-5));}}
for(const b of ['73_ZRSJZ','73_ZRSJZ_DLC'])walk(path.join(root,'assets/Game_Bundles',b,'Prefabs'));
const placement={};
for(const map of ['城镇','沙漠','雪地']){
 const f=[...names.values()].find(f=>f.endsWith(path.sep+map+'.prefab')),a=JSON.parse(fs.readFileSync(f));const counts={};
 for(const v of a){if(v.__type__!=='cc.PrefabInfo'||!v.asset?.__uuid__)continue;const ref=names.get(v.asset.__uuid__);if(!ref)continue;const name=path.basename(ref,'.prefab');counts[name]=(counts[name]||0)+1;}
 placement[map]=counts;
}
const eqTypes=['枪','刀','头盔','防弹衣','背包'],eqWeight=[1,.1,.005,.0005,0,0];
const qualityOrder=['白色','绿色','蓝色','紫色','金色','红色'].map(k=>c.ZRSJZ_PROP_QUALITY[k]);
const value=n=>p.get(n).UnitPrice*(p.get(n).PropType==='弹药'?p.get(n).MaxCount:1);
function qualityMean(pool,q){let total=0,w=0;for(const n of pool){const item=p.get(n),weight=eqTypes.includes(item.PropType)?eqWeight[q]:1;total+=weight*value(n);w+=weight;}return w?total/w:0;}
function boxEV(map,box){
 const sum=box.Probability.reduce((a,b)=>a+b,0),rollEV=map.MapProp.reduce((v,pool,q)=>v+qualityMean(pool,q)*box.Probability[q]/sum,0);
 let total=(box.MinPropCount+box.MaxPropCount)/2*rollEV;
 for(const type of box.GuaranteedPropTypes||[]){let w=0,v=0;for(let q=0;q<4;q++){const pool=[...p.values()].filter(x=>x.PropType===type&&x.Quality===qualityOrder[q]);if(!pool.length)continue;const weight=box.Probability[q]*eqWeight[q];w+=weight;v+=weight*pool.reduce((s,x)=>s+value(x.Name),0)/pool.length;}if(w)total+=v/w;}
 return total;
}
const lines=[];const add=s=>lines.push(s),table=(head,rows)=>{add('|'+head.join('|')+'|');add('|'+head.map(()=>'---').join('|')+'|');for(const r of rows)add('|'+r.join('|')+'|');add('');};
add('# 真人三角洲：地图难度、收益与配装分析\n\n分析日期：2026-09-16。基于当前工作区脚本、地图预制体和最新百分比乘算规则；本报告不修改游戏配置。\n');
add('## 1. 口径与结论\n\n- 区分“搜刮后撤离”和“击败Boss后撤离”：后者才记录关卡通关并解锁下一关。\n- 玩家基准100生命、1500移速；伤害逐来源乘算，最终至少1点。本文基础配装估算不含强化、收藏、宠物、针剂、技能、治疗及作弊。\n- 箱子期望是掉落物按配置单价折算的毛价值，非保证收益、非净利润。含弹药每堆60发，含物品占格前的全部掉落；未扣子弹、针剂、死亡损失，未考虑背包容量、搜刮时间、房卡、广告锁和未到达区域。\n- 同地图两模式共用布局；预制体统计为静态嵌套实例数，未做逐帧实机通关，临时任务、空投及运行时启用条件另算。\n- 普通敌人无额外护甲减伤公式；盾牌兵主要通过高血量体现耐打。高等级弹药是百分比增伤，不是护甲穿透判定。\n');
table(['顺序/地图','战备门槛(万)','时限(分)','普通敌人数*','Boss','普通品质红权重','密码箱/Boss红权重','空投(秒)'],modes.map(([k,m])=>{const counts=placement[m.MapName];return[m.Difficulty+' '+k,wan(m.RequiredLoadoutValue),m.TimeLimitMinutes,['持枪小兵','持刀小兵','喷火兵','盾牌兵'].reduce((s,n)=>s+(counts[n]||0),0),Object.keys(counts).find(n=>/^Boss/.test(n)),m.MapBox.get('木箱').Probability[5]+'%',m.MapBox.get('密码箱').Probability[5]+'%',m.Paracargo.SpawnTimeSeconds]}));
add('*关卡难度1～6对应“小镇机密→沙漠机密→极北机密→小镇绝密→沙漠绝密→极北绝密”。红品质还可能是高级房卡/六级子弹，不全是可收藏大红物资。\n');
add('## 2. 地图布局与时间压力\n');
table(['地图','枪兵','刀兵','喷火','盾兵','常规搜索箱','医疗箱','Boss'],Object.entries(placement).map(([n,v])=>[n,...['持枪小兵','持刀小兵','喷火兵','盾牌兵'].map(k=>v[k]||0),['军备箱','小木箱','小纸箱','木箱','柜子','密码箱'].reduce((s,k)=>s+(v[k]||0),0),v.医疗箱,1]));
add('固定撤离倒计时10秒；受击打断撤离并有3秒恢复等待。限时18分钟逐步降至11分钟。Boss离战每秒恢复最大生命2%，远距离拖到脱战会抵消输出；不宜反复完全脱战磨血。新手教程单独保留至少1血，不适用普通地图生存结论。\n');
add('## 3. 普通敌人：血量 / 单次伤害\n');
table(['地图','持枪小兵','持刀小兵','喷火兵','盾牌兵'],modes.map(([k,m])=>[k,...[...m.MapEnemy.values()].map(e=>e.HP+' / '+e.Harm)]));
table(['地图','枪/刀/喷火/盾攻击冷却(秒)','枪/刀/喷火/盾追击速度'],modes.map(([k,m])=>[k,[...m.MapEnemy].map(([n,e])=>num(c.ZRSJZ_ENEMY_CONFIG.get(n).AttackInterval*e.AttackIntervalMultiplier)).join(' / '),[...m.MapEnemy].map(([n,e])=>num(c.ZRSJZ_ENEMY_CONFIG.get(n).ChaseSpeed*e.SpeedMultiplier)).join(' / ')]));
add('冷却是配置值，不等于每秒命中频率：动画时长、攻击距离、墙体、走位会影响命中。喷火为持续效果，伤害表中的45等数值是一次伤害判定，不应当作整段火焰总伤害。\n');
add('## 4. Boss数值\n');
table(['地图','Boss','生命','普攻伤害/冷却秒','技能','技能伤害/冷却秒','脱战每秒回血'],modes.map(([k,m])=>{const n=Object.keys(placement[m.MapName]).find(n=>/^Boss/.test(n)),b=c.ZRSJZ_BOSS_CONFIG.get(n),v=m.MapBoss.get(n),s=b.Skills[0];return[k,n,v.HP,num(b.NormalAttack.Damage*v.HarmMultiple)+' / '+num(b.NormalAttack.Cooldown*v.CooldownMultiplier),s.Name,num(s.Damage*v.HarmMultiple)+' / '+num(s.Cooldown*v.CooldownMultiplier),num(v.HP*.02)]}));
add('Boss伤害列为减伤前单次触发伤害。ConsumeAttackEvent中的单次触发标记赋值目前被注释；若动画含多个同名事件，同一动作可能多次伤害，不能把“伤害÷技能冷却”当实测DPS。\n');
add('## 5. 收获与概率\n\n普通/精英敌人掉落除随机物品外另有保底：持枪小兵额外枪、头盔、护甲各一件；其余普通敌人额外头盔、护甲各一件。常规箱中装备上限紫色四级，不掉背包。装备品质还额外降权：白1、绿0.1、蓝0.005、紫0.0005，因此保底多数为低级装备。\n');
table(['地图','木箱件数','木箱期望(万)','军备箱期望(万)','密码箱期望(万)','枪兵掉落期望(万)','Boss掉落期望(万)'],modes.map(([k,m])=>{const box=m.MapBox.get('木箱'),boss=Object.keys(placement[m.MapName]).find(n=>/^Boss/.test(n));return[k,box.MinPropCount+'～'+box.MaxPropCount,wan(boxEV(m,box)),wan(boxEV(m,m.MapBox.get('军备箱'))),wan(boxEV(m,m.MapBox.get('密码箱'))),wan(boxEV(m,m.MapEnemy.get('持枪小兵').Box)),wan(boxEV(m,m.MapBoss.get(boss).Box))]}));
table(['地图','专属红物资（配置单价/万）'],modes.map(([k,m])=>[k,m.ExclusiveRedProps.map(n=>n+' '+wan(p.get(n).UnitPrice)).join('；')]));
add('通用大红所有地图共享，因此低难图仍可能开出高价通用物品，专属物资不是该图全部大红池。特别行动奖励、空投、首通主线奖励应另计，不能与普通箱子均值混用。空投第一件保底红色物资需要视频解锁，其余为高价值物资/蓝紫装备，属于重要的广告收益通道。英雄碎片、宠物碎片在结算转入碎片存储，不计作可出售仓库物资；以上价值为配置折算口径。\n');
add('### 特别行动奖励（完成后，未含普通箱子）\n');
table(['地图','金币奖励/万','概率物资期望/万','合计期望/万'],modes.map(([k,m])=>{const s=c.ZRSJZ_SPECIAL_OPERATION_CONFIG.get(k),ev=s.PropAwards.reduce((sum,a)=>sum+p.get(a.PropName).UnitPrice*a.Count*a.Probability,0);return[k,wan(s.GoldReward),wan(ev),wan(s.GoldReward+ev)]}));
add('任务点实际任务类型可覆盖关卡默认类型；以上只按基础奖励表估算，概率物资独立判定，可能零件或多件。奖励并不严格随Difficulty单调，例如极北机密40万金币高于小镇绝密10万。\n');
add('## 6. 可购买武器的输出与成本\n\n以下使用一级弹、无其他增幅；持续DPS按弹夹÷射速时间加1.5秒换弹估算，不含首发动作、射偏、走位、断弹。霰弹每发实际生成3颗弹丸，列出仅1颗命中～全部命中的区间。\n');
table(['武器','价格/万','伤害/弹丸','射程','射速/分','弹夹','估算持续DPS'],[...p].filter(([n,v])=>v.PropType==='枪').map(([n,v])=>{const a=attr.get(n),d=a.伤害*a.弹夹/(a.弹夹*60/a.射速+1.5),pellets=c.ZRSJZ_WEAPONRY_TYPE.get('散弹枪').includes(n)?3:1;return[n,wan(v.UnitPrice),a.伤害,a.射程,a.射速,a.弹夹,pellets===3?num(d)+'～'+num(d*3):num(d)]}));
add('装备加价不保证输出更高：RK77单发25低于K50的26，其余核心枪械属性相同；W76伤害150低于ssv的200，但射程/弹夹更大。霰弹近身三弹全中爆发高，远距离弹丸散开时输出大幅下降。新增三把枪价格0且不在商店配置内，不能按免费可买计算。\n');
table(['子弹','单发价格','增伤','相对一级弹成本'],Array.from({length:6},(_,i)=>{const n=(i+1)+'级子弹';return[n,num(p.get(n).UnitPrice),attr.get(n).增伤+'%',num(p.get(n).UnitPrice/p.get('1级子弹').UnitPrice)+'倍']}));
add('六级弹仅比一级弹增加20%伤害，单发成本约333倍；若主要目标是赚钱，低级弹通常更划算。高级弹适用于追求更快击杀或战备价值，而非硬性破甲需求。\n');
add('## 7. 各地图建议配装与击杀/承伤估算\n\n建议是“单人、正常走位、能够购买”的起点，不是保证通关的最低硬门槛。前中期使用低级弹节省成本；针剂、强化、宠物可以明显降低难度。建议优先保证门槛、背包和能持续输出的武器，不必照搬助战礼包的昂贵弹药。\n');
const plans=[['CN8-突击步枪','二级头','二级甲','二级包',1],['DX9-冲锋枪','三级头','三级甲','三级包',1],['K50-轻机枪','四级头','四级甲','四级包',2],['K50-轻机枪','五级头','五级甲','五级包',2],['ssv-狙击枪','六级头','六级甲','六级包',2],['ssv-狙击枪','六级头','六级甲','六级包',2]];
const planRows=modes.map(([k,m],i)=>{const [gun,helmet,armor,bag,ammo]=plans[i],a=attr.get(gun),bullet=ammo+'级子弹',d=Math.round(a.伤害*(1+attr.get(bullet).增伤/100)),n=Object.keys(placement[m.MapName]).find(n=>/^Boss/.test(n)),hp=m.MapBoss.get(n).HP,shots=Math.ceil(hp/d),duration=(shots-1)*60/a.射速+Math.floor((shots-1)/a.弹夹)*1.5,rate=(1-attr.get(helmet).减伤/100)*(1-attr.get(armor).减伤/100),hit=Math.max(1,Math.round(m.MapEnemy.get('持枪小兵').Harm*rate)),cost=[gun,helmet,armor,bag].reduce((s,n)=>s+p.get(n).UnitPrice,0)+p.get(bullet).UnitPrice*360;return[k,gun+'；'+helmet+'/'+armor+'/'+bag+'；'+ammo+'级弹',wan(cost),cost>=m.RequiredLoadoutValue?'满足':'不足',pct(1-rate),hit,shots,num(duration),wan(shots*p.get(bullet).UnitPrice)]});
table(['地图','建议装备','含360发弹战备/万','门槛','护具合计减伤','枪兵实际每击','Boss命中弹数','理想Boss击杀秒*','Boss耗弹费/万'],planRows);
add('*Boss击杀秒按第一发已命中起计，仅按血量、弹伤、射速、换弹估算；实战移动、动画、瞄准、遮挡、脱战回血会延长。建议枪不必清空地图，优先击败Boss再撤离；缺资金可用K50挑战后两图，但输出窗口和弹药管理要求更高。\n');
add('### 按阶段的操作建议\n\n1. **小镇机密：入门。** 二级头甲配CN8即可作为常规起点，避免被刀兵包围；先学搜索和固定撤离。\n2. **沙漠机密：普通。** 刀兵12只、喷火/盾兵各4只，清角落与拉开距离比单纯换高价枪更重要；三级头甲、三级包较稳。\n3. **极北机密：中等。** Boss技能减伤前58.5伤害，四级头甲下约37点；应躲技能，四级包开始适合长线搜刮。\n4. **小镇绝密：中高。** 13分钟时限，敌人血量约入门图2.17倍；五级头甲、强化和补给提高容错，K50的性价比优于单看售价的RK77。\n5. **沙漠绝密：高。** 高血量盾兵与喷火区域使近身霰弹有风险；建议六级防具、长射程枪；六级包提升带出能力。\n6. **极北绝密：最高。** 11分钟、Boss4388血、技能单次99伤害；六级头甲仍受约49点技能伤害，连续两次后仅剩2血（以100基础生命计）。建议生命/防御强化、治疗或宠物支持，避开正面硬抗。\n\n防御针与攻击针是同一当前针剂槽，不能同时享受；满级防御强化20%可以与任一种针剂、宠物叠加。已有7～13级防具可显著降低伤害，但售价0且获取通路不完整，不作为新玩家常规必需品。\n');
add('## 8. 数值风险与调整优先级（分析建议，未改配置）\n\n1. **高难度风险与战备成本差距大。** 六级头甲包成本1850.5万，超过最高图700万门槛；死亡损失相对单箱收益很高。建议用实际撤离价值/死亡损失统计调平衡。\n2. **护具成长后期跨度显著。** 六级头甲合计减伤51%；十三级头甲合计87.75%；再叠防御强化、针剂和蜜蜂达到92.552%，100点仅扣7。高阶装备会使后期地图从走位考验变为数值碾压，获取周期应与地图成长匹配。\n3. **子弹经济不平滑。** 6级弹333倍单价只换20%伤害，没有破甲刚需；赚钱配装会倾向低级弹。\n4. **武器售价与性能非单调。** RK77比K50贵且伤害更低；高价狙击也不是所有指标更强，应明确射程/容量优势。\n5. **通用大红弱化地图特产分层。** 低难图也能获得高价通用红；专属物品价值未严格随Difficulty增长，例如极北机密的部分特产高于沙漠绝密。应比较整池期望和每格价值，不能只看特产标题。\n6. **高级装备常规掉落断层。** 普通箱子、空投装备最高紫色；五六级依赖购买/锻造等系统，新7～13级配置目前价格0且不在商店列表，需明确可获得性及战备估值。\n7. **Boss事件重复触发风险。** 普攻/技能单次事件锁赋值被注释，应结合Spine事件实际次数确认一次动作的伤害预算。\n8. **入场战备不是消耗门票。** 按身上装备/弹药/卡包实际存储价格累计，不含一般背包里随便塞入的物资；双人按双方合计。高价弹/房卡能抬高门槛却未必提高生存。\n');
add('## 9. 来源与复核\n\n- `assets/Game_Bundles/73_ZRSJZ/Scripts/ZRSJZ_Constant.ts`：地图敌人、Boss、掉落、价格、品质和战备门槛。\n- `Scripts/Controller/ZRSJZ_Player.ts`：100基础生命、伤害乘算、霰弹三弹丸、最低1伤害。\n- `Scripts/Controller/ZRSJZ_BossBase.ts`、`ZRSJZ_Boss.ts`：Boss伤害倍率、回血、动画事件。\n- `Scripts/Unit/ZRSJZ_Box.ts`、`Scripts/Panel/ZRSJZ_GoodsPanel.ts`：品质抽样、装备降权、保底、弹药每堆数量。\n- `Scripts/Unit/ZRSJZ_ParacargoBox.ts`：空投保底红和视频锁。\n- `Scripts/Service/ZRSJZ_LevelProgressService.ts`、`Scripts/Panel/ZRSJZ_SelectPanel.ts`、`Scripts/ZRSJZ_Game.ts`：解锁、准入、撤离。\n- 主包`Prefabs/Map/城镇.prefab`，DLC`Prefabs/Map/沙漠.prefab`、`雪地.prefab`：静态布局。\n- 同目录`analyze-map-balance.cjs`可重新提取生成本报告，`地图数值快照.json`保存核心计算输出。\n');
const out=path.join(__dirname,'地图难度与收益分析.md');fs.writeFileSync(out,lines.join('\n'));
fs.writeFileSync(path.join(__dirname,'地图数值快照.json'),JSON.stringify({placement,maps:modes.map(([k,m])=>({key:k,difficulty:m.Difficulty,required:m.RequiredLoadoutValue,boxEV:Object.fromEntries([...m.MapBox].map(([n,b])=>[n,boxEV(m,b)])),enemy:[...m.MapEnemy],boss:[...m.MapBoss]})),plans:planRows},null,2));
console.log('Report',out);console.log(JSON.stringify(modes.map(([k,m])=>({map:k,wood:wan(boxEV(m,m.MapBox.get('木箱'))),military:wan(boxEV(m,m.MapBox.get('军备箱'))),password:wan(boxEV(m,m.MapBox.get('密码箱')))})),null,2));console.log('plans',JSON.stringify(planRows));

module.exports={c,boxEV,modes};
