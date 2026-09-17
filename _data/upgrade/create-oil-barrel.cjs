const fs=require('fs'),crypto=require('crypto'),{call}=require('./mcp.cjs');
const core='assets/Game_Bundles/73_ZRSJZ',dlc='assets/Game_Bundles/73_ZRSJZ_DLC';
async function save(file,content){await call('assetAdvanced_asset_operations',{action:'save',url:'db://'+file,content});console.log('saved',file);}
async function edit(path,fn){const file=core+'/Scripts/'+path;const source=fs.readFileSync(file,'utf8');const result=fn(source);if(source===result)throw Error('Edit missing '+file);await save(file,"import { ZRSJZ_DestructibleService } from '../Service/ZRSJZ_DestructibleService';\n"+result);}
function replace(s,a,b){if(!s.includes(a))throw Error('Missing '+a);return s.replace(a,b);}
(async()=>{
 for(const path of ['Service/ZRSJZ_DestructibleService.ts','Unit/ZRSJZ_OilBarrel.ts'])await save(core+'/Scripts/'+path,fs.readFileSync(core+'/Scripts/'+path,'utf8'));
 await edit('Controller/ZRSJZ_Bullet.ts',s=>replace(s,'        // console.error(otherCollider.node.name);',`        if (ZRSJZ_DestructibleService.HitNode(otherCollider.node, this._harm)) {
            this._isRemove = true;
            this.scheduleOnce(() => this.Recycle());
            return;
        }
        // console.error(otherCollider.node.name);`));
 await edit('Controller/ZRSJZ_Player.ts',s=>replace(s,'        targetPosition.x += Math.sign(this.PlayerSkeleton.AttackX) * 150;','        targetPosition.x += Math.sign(this.PlayerSkeleton.AttackX) * 150;\n        ZRSJZ_DestructibleService.HitArea(targetPosition, skillRange, finalDamage);'));
 await edit('Controller/ZRSJZ_Enemy.ts',s=>replace(s,'        Coop.SendArea(this.node.worldPosition, range, this.AttackDamage);','        ZRSJZ_DestructibleService.HitArea(this.node.worldPosition, range, this.AttackDamage);\n        Coop.SendArea(this.node.worldPosition, range, this.AttackDamage);'));
 await edit('Controller/ZRSJZ_Boss.ts',s=>replace(s,'        Coop.SendArea(startPos, damageRange, damage * this.DamageMultiplier);','        ZRSJZ_DestructibleService.HitArea(startPos, damageRange, damage * this.DamageMultiplier);\n        Coop.SendArea(startPos, damageRange, damage * this.DamageMultiplier);'));
 await edit('Skill/ZRSJZ_Bomb.ts',s=>replace(s,'    Attack() {','    Attack() {\n        ZRSJZ_DestructibleService.HitArea(this.node.worldPosition, this.SkillRange, this.Harm);'));
 await edit('Skill/ZRSJZ_Laser.ts',s=>replace(s.replaceAll('ERaycast2DType.All, ZRSJZ_TIER.敌人,','ERaycast2DType.All, ZRSJZ_TIER.敌人 | ZRSJZ_TIER.地形,'),'        results.forEach(result => {','        results.forEach(result => {\n            ZRSJZ_DestructibleService.HitNode(result.collider.node, this.Harm);'));
 await edit('Skill/ZRSJZ_Flamethrower.ts',s=>replace(s.replaceAll('ERaycast2DType.All, ZRSJZ_TIER.玩家,','ERaycast2DType.All, ZRSJZ_TIER.玩家 | ZRSJZ_TIER.地形,'),'        ZRSJZ_FriendlyDamageService.DamageNodes(', '        [...results1, ...results2].forEach(result => ZRSJZ_DestructibleService.HitNode(result.collider.node, this.Harm));\n        ZRSJZ_FriendlyDamageService.DamageNodes('));
 // 从现有组件序列化结构生成预制体，图片和 Spine 直接绑定。
 const box=JSON.parse(fs.readFileSync(core+'/Prefabs/Unit/箱子/小纸箱.prefab','utf8'));
 const hit=JSON.parse(fs.readFileSync(core+'/Prefabs/Effect/HitEffect.prefab','utf8'));
 const asset=dlc+'/Sprites/新增局内/油桶/';
 const frame=JSON.parse(fs.readFileSync(asset+'油桶.png.meta','utf8')).subMetas.f9941;
 const spine=JSON.parse(fs.readFileSync(asset+'油桶爆炸/lrsc572.json.meta','utf8')).uuid;
 const uuid=JSON.parse(fs.readFileSync(core+'/Scripts/Unit/ZRSJZ_OilBarrel.ts.meta','utf8')).uuid;
 function compress(uuid){const hex=uuid.replace(/-/g,'');let r=hex.slice(0,5);const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';for(let i=5;i<32;i+=3){const n=parseInt(hex.slice(i,i+3),16);r+=alphabet[n>>6]+alphabet[n&63];}return r;}
 const clone=o=>JSON.parse(JSON.stringify(o));const a=[clone(box[0])];a[0]._name='油桶';
 function node(name,parent){const n=clone(box[1]);n._name=name;n._parent=parent===null?null:{__id__:parent};n._children=[];n._components=[];n._lpos={__type__:'cc.Vec3',x:0,y:0,z:0};n._prefab=null;const id=a.push(n)-1;if(parent!==null)a[parent]._children.push({__id__:id});return id;}
 function comp(type,id){const template=[...box,...hit].find(c=>c.__type__===type);const c=template?clone(template):{__type__:type,_name:'',_objFlags:0,__editorExtras__:{},_enabled:true,_id:''};c.node={__id__:id};c.__prefab=null;const idx=a.push(c)-1;a[id]._components.push({__id__:idx});return [c,idx];}
 const root=node('油桶',null),visual=node('油桶图片',root),fx=node('爆炸特效',root);a[fx]._active=false;
 const [ui]=comp('cc.UITransform',root);ui._contentSize={__type__:'cc.Size',width:92,height:157};ui._anchorPoint={__type__:'cc.Vec2',x:.5,y:.5};
 const [vui]=comp('cc.UITransform',visual);vui._contentSize=clone(ui._contentSize);vui._anchorPoint=clone(ui._anchorPoint);
 const [sprite]=comp('cc.Sprite',visual);sprite._spriteFrame={__uuid__:frame.uuid,__expectedType__:'cc.SpriteFrame'};sprite._sizeMode=1;sprite._isTrimmedMode=true;
 const [body]=comp('cc.RigidBody2D',root);body._type=0;body._group=1;body._gravityScale=0;
 const [collider]=comp('cc.BoxCollider2D',root);collider._group=1;collider._sensor=true;collider._offset={__type__:'cc.Vec2',x:0,y:0};collider._size={__type__:'cc.Size',width:92,height:157};collider._density=1;collider._friction=.2;collider._restitution=0;
 comp('cc.UITransform',fx);
 const [sk,skid]=comp('sp.Skeleton',fx);sk._skeletonData={__uuid__:spine,__expectedType__:'sp.SkeletonData'};sk.defaultAnimation='';sk.loop=false;
 const [script]=comp(compress(uuid),root);script.ExplosionRadius=500;script.ExplosionDamage=100;script.BarrelVisual={__id__:visual};script.Explosion={__id__:skid};
 for(const id of [root,visual,fx])a[id]._prefab={__id__:a.push({__type__:'cc.PrefabInfo',root:{__id__:root},asset:{__id__:0},fileId:crypto.randomBytes(12).toString('base64'),instance:null,targetOverrides:null})-1};
 for(const c of a.slice())if(c.node&&c.__prefab===null)c.__prefab={__id__:a.push({__type__:'cc.CompPrefabInfo',fileId:crypto.randomBytes(12).toString('base64')})-1};
 await call('assetAdvanced_asset_operations',{action:'create',url:'db://'+dlc+'/Prefabs/Unit/油桶.prefab',content:JSON.stringify(a,null,2),overwrite:false});
 console.log('Created 油桶.prefab',uuid);
})().catch(e=>{console.error(e);process.exitCode=1;});
