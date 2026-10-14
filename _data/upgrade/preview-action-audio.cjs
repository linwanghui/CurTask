const fs=require('fs');
const boot=fs.readFileSync(__dirname+'/preview-enhancement-v2.cjs','utf8');
eval(boot.slice(0,boot.indexOf("  console.log('open',"))+String.raw`
 await page.evaluate(async()=>{
  const get=n=>Array.from(System.entries()).map(([,m])=>m).find(m=>m[n])?.[n];
  window.t={get,Data:get('ZRSJZ_GameData'),UI:get('ZRSJZ_UIManager'),A:get('ZRSJZ_ActionService'),audio:get('ZRSJZ_AudioManager').Instance};
  t.UI.ZRSJZ_DLC=true;t.UI.Instance.CloseAllPanelsImmediately();t.Data.Instance.SoundMute=false;
  t.Data.Instance.CurModel='2p';cc.director.getScene().getComponentInChildren(get('ZRSJZ_Start')).ModelSwitch();
  t.Data.Instance.EquippedActions=['浪子踢球','奶龙笑','闪身步'];t.A.RefreshUnlocks();
  get('ZRSJZ_EventManager').Emit(get('ZRSJZ_MyEvent').ZRSJZ_LOADED_DLC);
  const clips=await get('ZRSJZ_Tools').LoadAudioClips('73_ZRSJZ_DLC','Audios');
  clips.forEach(c=>t.audio.AudioClipMaps.set(c.name+'_DLC',c));
 });
 await page.waitForFunction(()=>{
  const p=cc.director.getScene().getComponentsInChildren(t.get('ZRSJZ_PlayerMain')).filter(p=>p.enabledInHierarchy);
  return p.length===2&&p.every(p=>p.PlayerSkeleton.Skeleton?.findAnimation('奶龙笑'));
 },null,{timeout:30000});
 await page.waitForTimeout(2000);
 for(const [i,name]of [[0,'浪子踢球'],[1,'奶龙笑'],[2,'闪身步']]){
  await page.evaluate(i=>t.A.Play(i),i);await page.waitForTimeout(200);
  console.log(await page.evaluate(({i,name})=>{
   const check=(v,m)=>{if(!v)throw Error(m)};
   const sounds=Array.from(t.audio._actionSounds);check(sounds.length===1,'Home duplicated sound');
   const old=sounds[0];check(old.users===2,'Missing home participants');check(old.source.clip.name===name,'Wrong clip');
   check(old.source.playing,'AudioSource not playing');
   t.A.Play(i);const fresh=Array.from(t.audio._actionSounds)[0];check(fresh!==old,'Repeat continued old audio');
   const players=cc.director.getScene().getComponentsInChildren(t.get('ZRSJZ_PlayerMain')).filter(p=>p.enabledInHierarchy);
   players[0].PlayerSkeleton.StopAction();check(t.audio._actionSounds.size===1,'Stopping P1 stopped P2 audio');
   players[1].PlayerSkeleton.StopAction();check(t.audio._actionSounds.size===0,'Stopped action left audio playing');
   return {name,playing:true,sharedUsers:2,restart:true,cleanup:true};
  },{i,name}));
 }
 const relevant=errors.filter(e=>!e.includes('net::ERR_FAILED')&&!e.includes('联系方式QQ'));
 if(relevant.length)throw Error(relevant.join('\n'));
 console.log('PASS: actual DLC clips playing with actions, home sharing, restart and interruption cleanup');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
`);
