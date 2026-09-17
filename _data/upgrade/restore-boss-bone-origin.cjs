const fs=require('fs'),{call}=require('./mcp.cjs');
const f='assets/Game_Bundles/73_ZRSJZ/Scripts/Controller/ZRSJZ_Boss.ts';
let s=fs.readFileSync(f,'utf8');
for(const name of ['普通攻击','死亡剪刀']){
 const pattern=new RegExp('(case "'+name+'":\\s*this\\._attack\\()this\\.node\\.worldPosition');
 if(!pattern.test(s))throw Error('Missing case '+name);
 s=s.replace(pattern,'$1this._getStartPos(this.FireBoneName)');
}
(async()=>{
 try{await call('assetAdvanced_asset_operations',{action:'save',url:'db://'+f,content:s});console.log('Saved via MCP');}
 catch(e){if(e.cause?.code!=='ECONNREFUSED')throw e;fs.writeFileSync(f,s);console.log('MCP offline; saved locally');}
})().catch(e=>{console.error(e);process.exitCode=1;});
