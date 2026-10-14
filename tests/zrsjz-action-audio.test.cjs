const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const ts=require('../extensions/cocos-mcp-server-main/node_modules/typescript');
const file='assets/Game_Bundles/73_ZRSJZ/Scripts/Manager/ZRSJZ_AudioManager.ts';
const tree=ts.createSourceFile(file,fs.readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true);
const cls=tree.statements.find(n=>ts.isClassDeclaration(n));
const names=['_actionSounds','PlayActionSound','EndActionSound'];
const js=ts.transpileModule(`class Manager {${cls.members.filter(n=>names.includes(n.name?.getText(tree))).map(n=>n.getText(tree)).join('\n')}};Manager;`,{compilerOptions:{target:ts.ScriptTarget.ES2020}}).outputText;
const data={SoundMute:false},nodes=[];
class Node {
 constructor(name){this.name=name;this.isValid=true;nodes.push(this);}
 addComponent(){return this.source={node:this,isValid:true,plays:0,stops:0,play(){this.plays++;},stop(){this.stops++;}};}
 once(e,fn){this.ended=fn;}
 destroy(){this.isValid=false;this.source.isValid=false;}
}
const Manager=vm.runInNewContext(js,{Node,AudioSource:{EventType:{ENDED:'ended'}},isValid:x=>x?.isValid,ZRSJZ_GameData:{Instance:data}});
const m=new Manager();m.node={addChild(){}};m.AudioClipMaps=new Map();
for(const name of ['闪身步','浪子踢球','奶龙笑']){
 assert.ok(fs.existsSync(`assets/Game_Bundles/73_ZRSJZ_DLC/Audios/${name}.mp3`));
 m.AudioClipMaps.set(name+'_DLC',{name});
}
const a=m.PlayActionSound('闪身步',true),b=m.PlayActionSound('闪身步',true);
assert.equal(nodes.length,1);a();a();assert.equal(nodes[0].source.stops,0);b();assert.equal(nodes[0].source.stops,1);
const c=m.PlayActionSound('浪子踢球'),d=m.PlayActionSound('浪子踢球');assert.equal(nodes.length,3);
c();assert.equal(nodes[2].source.stops,0);d();
const old=m.PlayActionSound('奶龙笑');nodes[3].ended();
const current=m.PlayActionSound('奶龙笑');old();assert.equal(nodes[4].source.stops,0);current();
data.SoundMute=true;m.PlayActionSound('闪身步')();assert.equal(nodes.length,5);
data.SoundMute=false;m.PlayActionSound('missing')();assert.equal(nodes.length,5);
assert.equal(m._actionSounds.size,0);
console.log('PASS: three DLC clips, shared home playback, independent player audio, natural end, stale stop handles, mute and missing clip');
