const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const ts=require('../extensions/cocos-mcp-server-main/node_modules/typescript');
function load(file,imports={}){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync('assets/Game_Bundles/73_ZRSJZ/Scripts/'+file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{exports,console,require:n=>{assert.ok(n in imports,n);return imports[n];}});return exports;}
const constants=load('ZRSJZ_Constant.ts'),data={AchievementClaimed:[],PetData:{},Gold:0},batches=[],mails=[];
let saves=0;
const service=load('Service/ZRSJZ_AchievementService.ts',{
 '../ZRSJZ_Constant':constants,
 '../ZRSJZ_GameData':{ZRSJZ_GameData:{Instance:data,SaveData(){saves++;}}},
 './ZRSJZ_AccountService':{ZRSJZ_AccountService:{ChangeGold(n){data.Gold+=n;}}},
 '../Manager/ZRSJZ_UIManager':{ZRSJZ_UIManager:{Instance:{ReceivePropAwards(a){batches.push(a);return Promise.resolve();}}}},
 './ZRSJZ_MailService':{ZRSJZ_MailService:{AddMail(t,a){mails.push(a);}}},
 '../ZRSJZ_NumberFormat':load('ZRSJZ_NumberFormat.ts'),
 './ZRSJZ_TitleService':{ZRSJZ_TitleService:{SyncUnlocks(){}}},
 './ZRSJZ_AvatarFrameService':{ZRSJZ_AvatarFrameService:{SyncUnlocks(){}}},
 './ZRSJZ_BattlePassService':{ZRSJZ_BattlePassService:{Record(){}}}
}).ZRSJZ_AchievementService;
assert.equal(service.ClaimAll(),0);
assert.equal(service.ClaimMilestone(20),false);
service.DebugCompleteAll();
assert.equal(service.GetCompletedCount(),service.Items.length);
assert.equal(service.GetCompletionPercent(),100);
assert.equal(data.Gold,0);assert.equal(batches.length,0);assert.equal(data.AchievementClaimed.length,0);
assert.equal(Object.keys(data.PetData).length,0);
assert.ok(service.HasClaimableRewards());
const last=service.Items.at(-1);assert.equal(last.rewards[0].name,'霜月狼');
for(const item of [...service.Items,...constants.ZRSJZ_ACHIEVEMENT_MILESTONE_CONFIG]){
 assert(item.rewards.length>0);
 for(const reward of item.rewards){
  if(reward.type==='道具'){assert(constants.ZRSJZ_PROP_CONFIG.has(reward.name));assert(Number.isSafeInteger(reward.count)&&reward.count>0);}
  else if(reward.type==='头像框')assert(reward.id);
  else if(reward.type==='称号')assert(reward.name);
  else assert.fail('unknown achievement reward type');
 }
}
assert.equal(service.Claim(service.Items[0].id),true);
const claimed=data.AchievementClaimed.slice();service.DebugCompleteAll();
assert.equal(JSON.stringify(data.AchievementClaimed),JSON.stringify(claimed));
const result=service.ClaimAllRewards();assert.equal(result.count,service.Items.length-1);
assert.equal(batches.length,2);assert.equal(mails.length,0);
assert.equal(batches[1].find(r=>r.PropName==='霜月狼').Count,1);
for(const name of ['英雄碎片','宠物碎片']){
 const expected=service.Items.slice(1).flatMap(item=>item.rewards).filter(r=>r.type==='道具'&&r.name===name).reduce((sum,r)=>sum+r.count,0);
 assert.equal(batches[1].find(r=>r.PropName===name).Count,expected,'claim all uses current reward configuration');
}
const gold=data.Gold;assert.equal(service.ClaimAll(),0);assert.equal(service.Claim(last.id),false);
assert.equal(batches.length,2);assert.equal(data.Gold,gold);assert.equal(gold,0);
assert.equal(service.ClaimMilestone(37),false);
for(const milestone of constants.ZRSJZ_ACHIEVEMENT_MILESTONE_CONFIG){assert.equal(service.ClaimMilestone(milestone.percent),true);assert.equal(service.ClaimMilestone(milestone.percent),false);}
assert(data.OwnedAvatarFrames.includes('7'));assert(data.OwnedAvatarFrames.includes('8'));assert.ok(saves>0);
const prefab=JSON.parse(fs.readFileSync('assets/Game_Bundles/'+constants.ZRSJZ_PANEL.作弊界面+'.prefab','utf8'));
const button=prefab.find(n=>n.__type__==='cc.Node'&&n._name==='完成全部成就');assert.ok(button);
const component=button._components.map(r=>prefab[r.__id__]).find(c=>c.__type__==='cc.Button');
assert.ok(component.clickEvents.some(e=>prefab[e.__id__]._handler==='OnButtonClick'||prefab[e.__id__].handler==='OnButtonClick'));
const achievementPrefab=JSON.parse(fs.readFileSync('assets/Game_Bundles/73_ZRSJZ_DLC/Prefabs/Panel/成就界面.prefab','utf8'));
const localIds=achievementPrefab.filter(o=>o.fileId).map(o=>o.fileId);assert.equal(new Set(localIds).size,localIds.length);
const art=new Map();function scan(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const path=dir+'/'+e.name;if(e.isDirectory())scan(path);else if(e.name.endsWith('.png.meta')){const meta=Object.values(JSON.parse(fs.readFileSync(path)).subMetas).find(m=>m.importer==='sprite-frame');if(meta)art.set(e.name.slice(0,-9),meta.uuid);}}}scan('assets/Game_Bundles/73_ZRSJZ/Sprites/Prop');
for(const item of service.Items){const row=achievementPrefab.find(n=>n.__type__==='cc.Node'&&n._name==='成就-'+item.id),children=row._children.map(r=>achievementPrefab[r.__id__]);const component=(name,type)=>children.find(n=>n._name===name)._components.map(r=>achievementPrefab[r.__id__]).find(c=>c.__type__===type);const reward=item.rewards[0];assert.equal(component('奖励数值','cc.Label')._string,reward.name+'×'+reward.count,item.id);assert.equal(component('奖励图标','cc.Sprite')._spriteFrame.__uuid__,art.get(reward.name),item.id+' persisted sprite');}
console.log('PASS: single non-cash rewards, increasing tiers, fragment batches, idempotent claims, unique prefab IDs, all 22 persisted icons and labels');
