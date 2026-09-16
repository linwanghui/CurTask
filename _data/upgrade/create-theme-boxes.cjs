const fs=require('fs'),{call}=require('./mcp.cjs');
const core='assets/Game_Bundles/73_ZRSJZ',dlc='assets/Game_Bundles/73_ZRSJZ_DLC';
const source=JSON.parse(fs.readFileSync(core+'/Prefabs/Unit/箱子/小纸箱.prefab','utf8'));
(async()=>{const created=[];for(const theme of ['沙漠','雪地']){
 const dir=dlc+'/Sprites/新增局内/'+theme+'箱子';
 for(const image of fs.readdirSync(dir).filter(f=>f.endsWith('.png')&&!/打开|描边/.test(f))){
  const name=image.slice(0,-4),target=dlc+'/Prefabs/Unit/箱子/'+theme+'_'+name+'.prefab';
  if(fs.existsSync(target))throw Error('Refusing to overwrite '+target);
  const frames=['','打开','描边','打开描边'].map(s=>JSON.parse(fs.readFileSync(dir+'/'+name+s+'.png.meta','utf8')).subMetas.f9941);
  const data=JSON.parse(JSON.stringify(source));data[0]._name=data[1]._name=theme+'_'+name;
  data[1]._lpos={__type__:'cc.Vec3',x:0,y:0,z:0};
  const closed=frames[0].userData;
  // 使用原画布保留四张图片的相对位置，避免开盖和描边因裁切边界变化而跳动。
  for(const [nodeIndex,transformIndex,spriteIndex,frameIndex]of [[2,3,5,0],[8,9,11,2]]){
   data[nodeIndex]._lpos={__type__:'cc.Vec3',x:-closed.offsetX,y:closed.height/2-closed.offsetY,z:0};
   data[transformIndex]._contentSize={__type__:'cc.Size',width:frames[frameIndex].userData.rawWidth,height:frames[frameIndex].userData.rawHeight};
   data[spriteIndex]._spriteFrame={__uuid__:frames[frameIndex].uuid,__expectedType__:'cc.SpriteFrame'};
   data[spriteIndex]._sizeMode=2;data[spriteIndex]._isTrimmedMode=false;
  }
  data[14]._contentSize={__type__:'cc.Size',width:closed.width,height:closed.height};
  data[14]._anchorPoint={__type__:'cc.Vec2',x:.5,y:0};
  data[18]._offset={__type__:'cc.Vec2',x:0,y:Math.min(60,closed.height*.2)};
  data[18]._radius=Math.max(111.5,closed.width*.5);
  data[20].ThemeIconSF=frames.slice(0,2).map(f=>({__uuid__:f.uuid,__expectedType__:'cc.SpriteFrame'}));
  data[20].ThemeCheckedSF=frames.slice(2).map(f=>({__uuid__:f.uuid,__expectedType__:'cc.SpriteFrame'}));
  await call('assetAdvanced_asset_operations',{action:'create',url:'db://'+target,content:JSON.stringify(data,null,2),overwrite:false});
  created.push(target);console.log('created',theme+'_'+name);
 }
}fs.writeFileSync(__dirname+'/theme-boxes-manifest.json',JSON.stringify(created,null,2));})().catch(e=>{console.error(e);process.exitCode=1});
