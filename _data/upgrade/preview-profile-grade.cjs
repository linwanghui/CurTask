const { chromium } = require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const path = require('path');
(async () => {
 const browser = await chromium.launch({ headless: true, executablePath: 'C:/Users/Administrator/AppData/Local/Google/Chrome/Bin/chrome.exe' });
 try {
 const context = await browser.newContext({ viewport: { width: 1560, height: 1000 } });
 await context.route('**/*', r => ['localhost', '127.0.0.1'].includes(new URL(r.request().url()).hostname) ? r.continue() : r.abort());
 const page = await context.newPage(), errors = [];
 page.on('pageerror', e => errors.push(e.message));
 page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.text().slice(0,300)); });
 await page.goto('http://localhost:7456', { waitUntil: 'domcontentloaded' });
 await page.waitForFunction(() => typeof cc !== 'undefined' && cc.director?.getScene(), { timeout: 45000 });
 await page.evaluate(async () => {
   const b = await new Promise((resolve,reject) => cc.assetManager.loadBundle('73_ZRSJZ', (e,b) => e ? reject(e) : resolve(b)));
   const s = await new Promise((resolve,reject) => b.loadScene('ZRSJZ_Start', (e,s) => e ? reject(e) : resolve(s)));
   cc.director.runSceneImmediate(s);
 });
 await page.waitForTimeout(15000);
 await page.waitForFunction(() => Array.from(System.entries()).some(([,m]) => m.ZRSJZ_UIManager?.Instance?.node?.isValid), null, { timeout: 45000 });
 await page.evaluate(() => {
   const get = name => {
     const candidates = Array.from(System.entries()).map(([,m]) => m[name]).filter(Boolean);
     return candidates.find(value => value.Instance?.node?.isValid) ?? candidates[0];
   };
   window.testProfile = { get, UI: get('ZRSJZ_UIManager'), Data: get('ZRSJZ_GameData') };
   const p = testProfile; p.UI.ZRSJZ_DLC = false; p.UI.Instance.CloseAllPanelsImmediately(); p.UI.Instance.ShowPanel('73_ZRSJZ/Prefabs/Panel/等级弹窗');
   const privacy = cc.js.getClassByName('PrivacyPanel'); if (privacy) for (const c of cc.director.getScene().getComponentsInChildren(privacy)) c.node.active = false;
 });
 await page.waitForFunction(() => testProfile.UI.Instance.node.getComponentsInChildren(cc.js.getClassByName('ZRSJZ_GradePanel')).some(p => p.node.activeInHierarchy));
 await page.waitForTimeout(1800);
 console.log('noDLC', await page.evaluate(() => {
   const t = testProfile; t.panel = t.UI.Instance.node.getComponentsInChildren(cc.js.getClassByName('ZRSJZ_GradePanel'))[0];
   t.root = t.panel.node.getChildByName('Panel'); t.selector = t.panel._selector; t.UI.ZRSJZ_DLC = false; t.panel.Refresh();
   if (t.root.getChildByName('外观页签').active || !t.root.getChildByName('作战信息').active || !t.root.getChildByName('Layout').active) throw Error('no-DLC state invalid');
   return { tabs: false, battleInfo: true, components: t.root.components.map(c=>c.constructor.name) };
 }));
 await page.screenshot({ path: path.join(__dirname, 'profile-grade-info.png') });
 await page.evaluate(async () => {
   const t = testProfile;
   const b = await new Promise((resolve,reject) => cc.assetManager.loadBundle('73_ZRSJZ_DLC', (e,b) => e ? reject(e) : resolve(b)));
   t.get('BundleManager').BundleMap.set('73_ZRSJZ_DLC', b);
   t.UI.ZRSJZ_DLC = true;
   t.Data.Instance.HaveRole = ['威蓝','泠汐','灼戈']; t.Data.Instance.HaveSkin = ['威蓝','泠汐','灼戈','夜喵'];
   t.selector.SelectTab('avatar');
 });
 await page.waitForTimeout(4000);
 if(process.env.PROFILE_VIDEO_ONLY==='1'){
   await page.evaluate(()=>{
     // Editor hot reload can retain multiple module generations; initialize the isolated fixture consistently.
     for(const [,m] of System.entries())if(m.ZRSJZ_UIManager)m.ZRSJZ_UIManager.ZRSJZ_DLC=true;
     testProfile.selector.SelectTab('frame');
   });
   await page.waitForTimeout(3000);
   console.log('videoFrames',await page.evaluate(()=>{
     const t=testProfile;
     for(const id of ['9','10']){
       const row=t.root.getChildByPath('外观列表/View/Content/'+id);
       const sprite=row?.getChildByName('视频角标')?.getComponent('cc.Sprite');
       if(!sprite?.spriteFrame||sprite.spriteFrame.name!=='视频角标白色'||!row.getChildByName('黑色遮罩')||row.getChildByName('锁'))throw Error('Video frame visual invalid '+JSON.stringify({id,tab:t.selector.tab,ready:t.selector.Ready(),children:row?.children.map(n=>n.name),image:sprite?.spriteFrame?.name}));
     }
     if(t.root.getChildByName('观看视频解锁'))throw Error('Text video button still exists');
     t.root.getChildByName('外观列表').getComponent('cc.ScrollView').scrollToBottom(0);
     return {ids:['9','10'],whiteVideoIcon:true,blackMask:true,noTextButton:true};
   }));
   await page.waitForTimeout(350);
   await page.screenshot({path:path.join(__dirname,'profile-grade-video-frames.png')});
   return;
 }
 console.log('avatars', await page.evaluate(() => {
   const t = testProfile, nodes = t.root.getChildByPath('外观列表/View/Content').children;
   if (nodes.length !== 9 || nodes.slice(0,4).some(n => n.position.y !== nodes[0].position.y) || nodes[4].position.y === nodes[0].position.y) throw Error('Avatar filtering/grid invalid');
   if (nodes.some(n => !n.getChildByName('图标').getComponent(cc.Sprite)?.spriteFrame)) throw Error('Avatar icon missing');
   nodes.find(n => n.name === '夜喵').emit(cc.Button.EventType.CLICK);
   if (t.Data.Instance.CurrentAvatar !== '夜喵') throw Error('Owned skin avatar not immediately applied');
   t.root.getChildByPath('外观列表/View/Content/黯祁').emit(cc.Button.EventType.CLICK);
   if (t.Data.Instance.CurrentAvatar !== '夜喵') throw Error('Locked avatar applied');
   if (/\n|\r/.test(t.root.getChildByName('解锁条件').getComponent(cc.Label).string)) throw Error('Hint has newline');
   return { count: nodes.length, columns: 4, applied: t.Data.Instance.CurrentAvatar, hiddenUnreleased: true };
 }));
 await page.waitForTimeout(1000);
 await page.screenshot({ path: path.join(__dirname, 'profile-grade-avatar.png') });
 await page.evaluate(() => testProfile.selector.SelectTab('frame'));
 await page.waitForTimeout(4000);
 console.log('frames', await page.evaluate(() => {
   const t = testProfile, nodes = t.root.getChildByPath('外观列表/View/Content').children;
   if (nodes.length !== 10 || nodes.slice(0,4).some(n => n.position.y !== nodes[0].position.y)) throw Error('Frame grid invalid');
   if (t.root.getChildByName('外观页签').position.y !== 24) throw Error('Tabs must be at Panel-local Y=24');
   const hint = t.root.getChildByName('解锁条件');
   if (hint.active || hint.getComponent(cc.Label).string !== '') throw Error('Owned item should not show hints');
   const lock = nodes.find(n => n.name === '2').getChildByName('锁');
   if (!lock?.getComponent(cc.Sprite)?.spriteFrame || lock.getComponent(cc.Label)) throw Error('Must use original lock sprite');
   for (const id of ['9','10']) {
     const row=nodes.find(n=>n.name===id);
     if(row.getChildByName('锁')||!row.getChildByName('黑色遮罩')||!row.getChildByName('视频角标')?.getComponent(cc.Sprite)?.spriteFrame)throw Error('Video frame must have white video icon and black mask');
   }
   if(t.root.getChildByName('观看视频解锁')?.active)throw Error('Extra video text button must not be shown');
   for (const n of nodes) { const icon = n.getChildByName('图标'); if (!icon.getComponent(cc.Sprite)?.spriteFrame && !icon.getComponent('sp.Skeleton')?.skeletonData) throw Error('Frame art missing '+n.name); }
   return { count: nodes.length, columns: 4, animated: nodes.filter(n=>n.getChildByName('图标').getComponent('sp.Skeleton')).length };
 }));
 await page.screenshot({ path: path.join(__dirname, 'profile-grade-frames.png') });
 await page.evaluate(()=>testProfile.root.getChildByName('外观列表').getComponent('cc.ScrollView').scrollToBottom(0));
 await page.waitForTimeout(350);
 await page.screenshot({ path: path.join(__dirname, 'profile-grade-video-frames.png') });
 await page.evaluate(() => testProfile.selector.SelectTab('title'));
 await page.waitForTimeout(2500);
 console.log('titles', await page.evaluate(() => {
   const t = testProfile, nodes = t.root.getChildByPath('外观列表/View/Content').children;
   if (nodes.some(n=>n.position.x!==0) || new Set(nodes.map(n=>n.position.y)).size !== nodes.length) throw Error('Titles not one per row');
   if (nodes.some(n=>!n.getChildByName('图标').getComponent(cc.Sprite)?.spriteFrame)) throw Error('Title art missing');
   t.root.getChildByPath('外观列表/View/Content/勇者').emit(cc.Button.EventType.CLICK);
   if (t.Data.Instance.EquippedTitle !== '勇者') throw Error('Title equip failed');
   return { count: nodes.length, columns: 1, equipped: t.Data.Instance.EquippedTitle };
 }));
 await page.screenshot({ path: path.join(__dirname, 'profile-grade-titles.png') });
 await page.evaluate(() => testProfile.UI.Instance.ShowPanel('73_ZRSJZ/Prefabs/Panel/作弊界面'));
 await page.waitForTimeout(1200);
 console.log('cheatUnlock', await page.evaluate(() => {
   const t=testProfile,c=t.UI.Instance.node.getComponentsInChildren(cc.js.getClassByName('ZRSJZ_CheatingPanel')).find(c=>c.node.activeInHierarchy);
   const button=c.node.getChildByPath('Panel/获得所有头像框和称号');
   if(!button)throw Error('Unlock button missing');
   const before=[t.Data.Instance.CurrentAvatarFrame,t.Data.Instance.EquippedTitle];
   const click=()=>c.OnButtonClick({getCurrentTarget:()=>button});click();click();
   if(t.Data.Instance.OwnedAvatarFrames.length!==10||t.Data.Instance.OwnedTitles.length!==6)throw Error('Unlock missing/duplicate');
   if(JSON.stringify(before)!==JSON.stringify([t.Data.Instance.CurrentAvatarFrame,t.Data.Instance.EquippedTitle]))throw Error('Cheat changed equipment');
   return {frames:10,titles:6,idempotent:true};
 }));
 await page.screenshot({path:path.join(__dirname,'profile-cheat-unlock.png')});
 await page.evaluate(()=>{testProfile.UI.Instance.HidePanel('73_ZRSJZ/Prefabs/Panel/作弊界面');testProfile.selector.SelectTab('info');});
 for(const id of ['6','7','8','9','10']){
   await page.evaluate(id=>{const t=testProfile;t.Data.Instance.CurrentAvatarFrame=id;t.get('ZRSJZ_EventManager').EmitPersist(t.get('ZRSJZ_MyEvent').ZRSJZ_PLAYER_INFO_CHANGE);},id);
   await page.waitForTimeout(1700);
   console.log('spineFit',await page.evaluate(id=>{
     const t=testProfile,home=cc.director.getScene().getComponentsInChildren(cc.js.getClassByName('ZRSJZ_GradeUI')).find(c=>c.node.activeInHierarchy);
     return [home.node,t.root].map(root=>{
       const avatar=root.getChildByName('头像'),frame=root.getChildByName('头像框Spine'),size=avatar.getComponent('cc.UITransform');
       const avatarSprite=avatar.getComponent(cc.Sprite),staticFrame=root.getChildByName('头像框Icon').getComponent(cc.Sprite);
       if(avatarSprite.sizeMode!==cc.Sprite.SizeMode.TRIMMED||staticFrame.sizeMode!==cc.Sprite.SizeMode.TRIMMED)throw Error('Profile sprites must stay TRIMMED');
       if(size.width!==avatarSprite.spriteFrame.rect.width||size.height!==avatarSprite.spriteFrame.rect.height)throw Error('Avatar size must match trimmed frame');
       const expected=t.get('ZRSJZ_AvatarFrameFit').Calculate(id,size.width*Math.abs(avatar.scale.x),size.height*Math.abs(avatar.scale.y));
       if(!frame.active||!frame.getComponent('sp.Skeleton')?.skeletonData||Math.abs(frame.scale.x-expected.scale)>0.001||frame.scale.x!==frame.scale.y)throw Error('Frame fit wrong '+id+' '+root.name);
       if(Math.abs(frame.position.x-avatar.position.x-expected.x)>0.01||Math.abs(frame.position.y-avatar.position.y-expected.y)>0.01)throw Error('Frame center wrong');
       return {id,root:root.name,avatarWidth:size.width,scale:frame.scale.x};
     });
   },id));
   await page.screenshot({path:path.join(__dirname,`profile-fit-${id}.png`)});
 }
 console.log('errors', JSON.stringify(errors));
 } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
