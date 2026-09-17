const fs=require('fs'),vm=require('vm'),assert=require('assert'),ts=require('../../extensions/cocos-mcp-server-main/node_modules/typescript');
const edits=JSON.parse(fs.readFileSync(__dirname+'/weapon-state-staged.json','utf8'));
function method(part,name,ctx){const [file,staged]=edits.find(([f])=>f.includes(part));const s=process.argv.includes('--live')?fs.readFileSync(file,'utf8'):staged;const ast=ts.createSourceFile(file,s,ts.ScriptTarget.Latest,true),cls=ast.statements.find(ts.isClassDeclaration),m=cls.members.find(n=>n.name?.getText(ast)===name);return vm.runInNewContext(ts.transpileModule('(function('+m.parameters.map(n=>n.getText(ast)).join(',')+')'+m.body.getText(ast)+')',{compilerOptions:{target:ts.ScriptTarget.ES2020}}).outputText,ctx)}
const ctx={ZRSJZ_WEAPONRY_TYPE:new Map([['步枪',['测试枪']]]),ZRSJZ_KNIFE:['测试刀']};const calls=[];let has=[true,true];
const j={PlayerIndex:0,_curWeaponIndex:0,HasWeapon:i=>has[i],SwitchWeapon:(tip,i)=>calls.push(i),RefreshWeaponSwitchState:()=>calls.push('fallback')};
const show=method('Joystick','ShowEquipment',ctx);
for(const current of [0,1]){j._curWeaponIndex=current;for(const [name,index]of [['测试枪',0],['测试刀',1]]){
 calls.length=0;show.call(j,name,true,0);assert.deepEqual(calls,index===current?[current]:[]);assert.equal(j._curWeaponIndex,current);
 calls.length=0;show.call(j,name,false,0);assert.deepEqual(calls,[],'unloading inactive slot must not switch');
 }has[current]=false;calls.length=0;show.call(j,current?'测试刀':'测试枪',false,0);assert.deepEqual(calls,['fallback']);has=[true,true];}
calls.length=0;show.call(j,'测试刀',true,1);assert.equal(calls.length,0);
const ids=['gun','helmet','armor','bag','knife'];const filtered=method('PlayerSkeleton','GetEquippedWeaponryIDs',{ZRSJZ_InventoryService:{GetWeaponryIDs:()=>ids}});
assert.deepEqual(Array.from(filtered.call({CurPlayerIndex:0,IsKnife:false})),['gun','helmet','armor','bag','']);assert.deepEqual(Array.from(filtered.call({CurPlayerIndex:0,IsKnife:true})),['','helmet','armor','bag','knife']);assert.equal(ids[0],'gun');assert.equal(ids[4],'knife');
console.log('PASS: equip/replace preserves gun/knife selection, inactive removal unchanged, current removal fallback, player isolation, appearance follows held type without mutating loadout.');
