const fs = require('fs');
const boot = fs.readFileSync(__dirname + '/preview-enhancement-v2.cjs', 'utf8');
const prefix = boot.slice(0, boot.indexOf("  console.log('open',")).replace('await page.waitForTimeout(6000)', 'await page.waitForTimeout(15000)');
eval(prefix + String.raw`
  await page.evaluate(() => {
    const get = n => Array.from(System.entries()).map(([,m])=>m).find(m=>m[n])?.[n];
    window.t = {UI:get('ZRSJZ_UIManager'),Data:get('ZRSJZ_GameData'),A:get('ZRSJZ_ActionService')};
    t.UI.ZRSJZ_DLC=true;
    t.UI.Instance.CloseAllPanelsImmediately();
    t.Data.Instance.UnlockedActions=['闪身步'];t.Data.Instance.EquippedActions=['闪身步'];
    t.UI.Instance.ShowPanel('73_ZRSJZ_DLC/Prefabs/Panel/动作弹窗');
  });
  await page.waitForFunction(()=>{
    t.p=t.UI.Instance.node.getComponentInChildren(cc.js.getClassByName('ZRSJZ_ActionPanel'));
    return !!t.p;
  });
  await page.evaluate(()=>{t.p.Show();t.p.selected='捧腹大笑';t.p.Refresh();});
  await page.waitForTimeout(1500);
  await page.evaluate(()=>{
    window.check=(v,m)=>{if(!v)throw Error(m)};
    const p=t.p.Panel;
    check(p.getChildByName('视频解锁').active,'Video button missing');
    check(!p.getChildByName('装备').active&&!p.getChildByName('卸下').active,'Locked action shows equipment controls');
    check(t.p.preview.getCurrent(0).animation.name==='奶龙笑','Preview animation mismatch');
    check(t.p.items.get('捧腹大笑').getChildByName('Icon').getComponent(cc.Sprite).spriteFrame,'Renamed icon missing');
    const bannerModule=Array.from(System.entries()).find(([,m])=>typeof m.default?.prototype?.ShowVideoAd==='function');
    check(bannerModule,'Banner module missing');
    t.banner=bannerModule[1].default.Instance;
    t.original=t.banner.ShowVideoAd;t.callbacks=[];
    t.banner.ShowVideoAd=callback=>t.callbacks.push(callback);
    p.getChildByName('视频解锁').emit('click');
    check(t.callbacks.length===1,'Button did not request rewarded video');
    check(!t.Data.Instance.UnlockedActions.includes('捧腹大笑'),'Unlocked before reward callback');
    t.p.lastVideo=0;p.getChildByName('视频解锁').emit('click');
    check(t.callbacks.length===2,'Cancelled video must allow retry');
    t.p.selected='浪子踢球';t.p.Refresh();
    t.callbacks[1]();t.callbacks[1]();t.callbacks[0]();
    check(t.Data.Instance.UnlockedActions.filter(n=>n==='捧腹大笑').length===1,'Duplicate unlock');
    check(!t.Data.Instance.UnlockedActions.includes('浪子踢球'),'Selection change unlocked wrong action');
    t.p.selected='捧腹大笑';t.p.Refresh();
    check(!p.getChildByName('视频解锁').active&&p.getChildByName('装备').active,'Success did not update controls');
    p.getChildByName('装备').emit('click');
    check(t.Data.Instance.EquippedActions.includes('捧腹大笑'),'Unlocked action cannot equip');
    t.p.node.active=false;t.p.Show();t.p.selected='捧腹大笑';t.p.Refresh();
    const saved=JSON.parse(cc.sys.localStorage.getItem('ZRSJZ_GameData'));
    check(saved.UnlockedActions.includes('捧腹大笑')&&saved.EquippedActions.includes('捧腹大笑'),'Unlock/equipment not persisted');
    t.banner.ShowVideoAd=t.original;
  });
  await page.waitForTimeout(600);
  await page.screenshot({path:__dirname+'/action-video-unlocked.png'});
  console.log('PASS: renamed icon/Spine, video button, no reward on cancellation, retry, callback selection binding, duplicate callbacks, equip and persistence');
  console.log('Runtime errors:',errors);
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
`);
