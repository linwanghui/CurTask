const fs=require('fs');
const boot=fs.readFileSync(__dirname+'/preview-enhancement-v2.cjs','utf8');
const prefix=boot.slice(0,boot.indexOf("  console.log('open',"));
eval(prefix+String.raw`
 await page.evaluate(()=>{
 const get=n=>Array.from(System.entries()).map(([,m])=>m).find(m=>m[n])?.[n];
 window.t={get,Data:get('ZRSJZ_GameData'),UI:get('ZRSJZ_UIManager')};
 t.UI.ZRSJZ_DLC=true;t.UI.Instance.CloseAllPanelsImmediately();
 t.get('ZRSJZ_InventoryService').GetBattleEntryError=()=>'';
 window.TileLayer=cc.js.getClassByName('cc.TiledLayer');window.originalNativeTileFill=TileLayer.prototype.fillIndicesBuffer;
 });
 const results=[];
 for(const [map,mode]of [['沙漠古迹_机密行动','1p'],['极北之地_机密行动','2p'],['沙漠古迹_机密行动','2p'],['极北之地_机密行动','1p']]){
 await page.evaluate(async({map,mode})=>{
 t.Data.Instance.CurMap=map;t.Data.Instance.CurModel=mode;
 const b=cc.assetManager.getBundle('73_ZRSJZ');
 const scene=await new Promise((r,j)=>b.loadScene('ZRSJZ_Game',(e,s)=>e?j(e):r(s)));
 cc.director.runSceneImmediate(scene);
 },{map,mode});
 await page.waitForFunction(({mode})=>{
 const g=t.get('ZRSJZ_Game').Instance;
 return g?.CurMap?.Map && g.Players.length===(mode==='2p'?2:1)&&g.Cameras.length===(mode==='2p'?2:1);
 },{mode},{timeout:60000});
 await page.waitForTimeout(1500);
 const result=await page.evaluate(async()=>{
 const g=t.get('ZRSJZ_Game').Instance;g.GamePaused=true;t.UI.Instance.CloseAllPanelsImmediately();
 if(TileLayer.prototype.fillIndicesBuffer!==window.originalNativeTileFill)throw Error('Native patch changed web runtime');
 const layers=g.CurMap.node.getComponentsInChildren(TileLayer),snapshots=[];
 const wait=ms=>new Promise(r=>setTimeout(r,ms));
 for(let step=0;step<4;step++){
 g.Players.forEach((p,i)=>{const points=g.CurMap.PlayerPoints;const target=points[(step+i)%points.length];p.node.setWorldPosition(target.worldPosition);});
 await wait(400);
 g.UpdateCombinedTileMapCulling();await wait(100);
 let batches=0,vertices=0;
 for(const layer of layers){
 if(!layer.node.activeInHierarchy)continue;
 if(!layer.enableCulling)throw Error('Culling disabled');
 for(const entry of layer.tiledDataArray){const rd=entry.renderData;if(!rd)continue;
 batches++;vertices+=rd.vertexCount;
 if(rd.vertexCount%4!==0)throw Error('Non-quad geometry');
 if(!Array.from(rd.chunk.vb).every(Number.isFinite))throw Error('Invalid vertex data');
 }
 }
 snapshots.push({batches,vertices});
 }
 if(!snapshots.some(s=>s.vertices>0))throw Error('No map geometry');
 return {map:g.CurMap.node.name,mode:t.Data.Instance.CurModel,layers:layers.length,snapshots};
 });results.push(result);console.log(JSON.stringify(result));
 }
 fs.writeFileSync(__dirname+'/native-tilemap-preview-checks.json',JSON.stringify({results,errors},null,2));
 const relevant=errors.filter(e=>/NativeTileMapFix|fillIndicesBuffer|updateCulling|updateViewPort|Cannot find module|SyntaxError/.test(e));
 if(relevant.length)throw Error(relevant.join('\n'));
 console.log('PASS: desert/snow single/split-screen load, camera movement, valid geometry, culling and web isolation');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
`);

