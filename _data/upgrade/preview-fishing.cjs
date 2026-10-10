const { chromium } = require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs = require('fs');
(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: 'C:/Users/Administrator/AppData/Local/Google/Chrome/Bin/chrome.exe' });
  try {
    const page = await browser.newPage({ viewport: { width: 1560, height: 720 } });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', message => { if (message.type() === 'error') { errors.push(message.text()); console.log('preview error', message.text().slice(0, 400)); } });
    await page.route('**/*', route => ['localhost', '127.0.0.1'].includes(new URL(route.request().url()).hostname) ? route.continue() : route.abort());
    await page.goto('http://localhost:7456', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.cc && cc.assetManager, { timeout: 30000 });
    await page.waitForTimeout(8000);
    // 仅独立、临时浏览器上下文：完成游戏的正常启动流程和画布适配；外部请求仍全部拦截。
    await page.mouse.click(1010,615);
    await page.waitForTimeout(10000);
    console.log('initial', await page.evaluate(() => ({ scene: cc.director.getScene()?.name, modules: typeof System })));
    await page.evaluate(async () => {
      const core = await new Promise((resolve, reject) => cc.assetManager.loadBundle('73_ZRSJZ', (e, b) => e ? reject(e) : resolve(b)));
      const scene = await new Promise((resolve, reject) => core.loadScene('ZRSJZ_Start', (e, s) => e ? reject(e) : resolve(s)));
      cc.director.runSceneImmediate(scene);
      await new Promise((resolve, reject) => cc.assetManager.loadBundle('73_ZRSJZ_DLC', (e, b) => e ? reject(e) : resolve(b)));
    });
    await page.waitForTimeout(6000);
    console.log('start', await page.evaluate(() => {
      const mods = Array.from(System.entries()).map(([, m]) => m);
      window.getModule = name => mods.find(m => m[name])?.[name];
      const Data = getModule('ZRSJZ_GameData'), UI = getModule('ZRSJZ_UIManager');
      UI.ZRSJZ_DLC = true; UI.Instance.CloseAllPanelsImmediately();
      Data.Instance.CurMap = '五号小镇_机密行动'; Data.Instance.CurModel = '1p';
      const inv=getModule('ZRSJZ_InventoryService');
      inv.SetWeaponry(0,inv.AddPropByName('AK12-突击步枪'),0);
      inv.SetWeaponry(4,inv.AddPropByName('魔刀'),0);
      // 本测试验证钓鱼；独立新存档的战备门槛另有测试覆盖。
      getModule('ZRSJZ_InventoryService').GetBattleEntryError = () => '';
      return { data: !!Data.Instance, ui: !!UI.Instance, Game: !!getModule('ZRSJZ_Game') };
    }));
    // 进入独立预览，不写用户存档；仅本浏览器上下文的城镇对局。
    await page.evaluate(async () => {
      const core = cc.assetManager.getBundle('73_ZRSJZ');
      const scene = await new Promise((resolve, reject) => core.loadScene('ZRSJZ_Game', (e, s) => e ? reject(e) : resolve(s)));
      cc.director.runSceneImmediate(scene);
    });
    await page.waitForFunction(() => {
      const game = cc.director.getScene()?.getComponentInChildren(cc.js.getClassByName('ZRSJZ_Game'));
      return game?.CurMap && game.Players.length && game.OnePlayerModel?.activeInHierarchy;
    }, null, { timeout: 45000 });
    await page.waitForTimeout(2000);
    await page.waitForFunction(() => {
      const game = cc.director.getScene()?.getComponentInChildren(cc.js.getClassByName('ZRSJZ_Game'));
      return !!game?.CurMap?.getComponent(cc.js.getClassByName('ZRSJZ_Fishing'))?._prefab;
    }, null, { timeout: 20000 });
    console.log('game', await page.evaluate(() => {
      window.game = cc.director.getScene().getComponentInChildren(cc.js.getClassByName('ZRSJZ_Game'));
      return { scene: cc.director.getScene().name, game: !!game, map: game?.CurMap?.node.name, players: game?.Players?.length,
        fishing: !!game?.CurMap?.getComponent(cc.js.getClassByName('ZRSJZ_Fishing')) };
    }));
    await page.evaluate(() => {
      const assert = (ok, message) => { if (!ok) throw new Error(message); };
      const player = game.GetPlayer(0);
      window.bodyTypeBefore = player.RigidBody.type;
      window.weaponIDsBefore = JSON.stringify(getModule('ZRSJZ_InventoryService').GetWeaponryIDs(0));
      // 隔离战斗敌人，检查完整钓鱼交互，不影响正在运行的编辑器或其他会话。
      game.CurMap.node.getComponentsInChildren(cc.js.getClassByName('ZRSJZ_EnemyBase')).forEach(enemy => enemy.node.active = false);
      game.GamePaused = false;
      window.fishing = game.CurMap.getComponent(cc.js.getClassByName('ZRSJZ_Fishing'));
      const station = fishing._stations[0];
      const point = station.getChildByName('PlayerPoint');
      player.node.setWorldPosition(point.worldPosition.x + 800, point.worldPosition.y, point.worldPosition.z);
      fishing.update(0);
      const attack = fishing.GetControls()[0];
      window.fishButton = attack.node.getChildByName('Fish');
      assert(!fishButton.active, 'Fish must hide outside approach radius');
      player.node.setWorldPosition(point.worldPosition.x + 100, point.worldPosition.y, point.worldPosition.z);
      fishing.update(0);
      const UI=getModule('ZRSJZ_UIManager');UI.ZRSJZ_DLC=false;fishing.update(0);
      assert(!fishButton.active,'Fish must hide without DLC readiness');UI.ZRSJZ_DLC=true;fishing.update(0);
      assert(fishButton.active, 'Fish must appear close to station: '+JSON.stringify({prefab:!!fishing._prefab,station:station.activeInHierarchy,dead:player.IsDead,paused:game.GamePaused,finished:game.IsGameFinished,distance:cc.Vec3.distance(player.node.worldPosition,point.worldPosition)}));
      fishButton.emit(cc.Button.EventType.CLICK);
      assert(player.IsFishing, 'Fish click must enter fishing');
      window.session = fishing._sessions[0];
      assert(session && session.ui.active && !attack.node.active, 'fishing control must replace attack joystick');
      assert(cc.Vec3.distance(player.node.worldPosition, point.worldPosition) < 0.01, 'player must teleport to PlayerPoint');
      assert(Math.abs(player.node.worldRotation.w-point.worldRotation.w)<0.0001,'player must match PlayerPoint rotation');
      assert(player.PlayerSkeleton.Facing===(point.worldScale.x<0?-1:1),'player must match PlayerPoint facing');
      assert(!session.progress.active, 'progress must be hidden before bite');
      assert(['dy1','dy2','dy3','dy4'].every(name=>player.PlayerSkeleton.Skeleton.findAnimation(name)), 'all four animations must exist');
      session.cast.emit(cc.Button.EventType.CLICK);
      assert(session.state === 'waiting' && session.biteTime >= 1 && session.biteTime <= 3, 'cast must start random 1-3 second wait');
      fishing.UpdateSession(session, session.biteTime);
      assert(session.state === 'pulling' && session.progress.active && session.reel.active, 'bite must show progress and reel');
      const old = session.round.Pointer;
      session.reel.emit(cc.Button.EventType.CLICK);
      assert(session.round.Pointer < old, 'reel click must pull left');
      assert(session.pointer.eulerAngles.z !== 0, 'pointer must rotate along the arc');
      const greenUI=session.green.getComponent(cc.js.getClassByName('cc.UITransform'));
      const x=(session.round.Pointer-0.5)*greenUI.width,h=greenUI.height,r=((greenUI.width/2)**2+h*h)/(2*h);
      const expectedY=session.green.node.position.y+h/2-r+Math.sqrt(r*r-x*x)-7;
      assert(Math.abs(session.pointer.position.y-expectedY)<0.001,'pointer must sit 7px lower on the arc');
      const frozen = session.round.Progress;
      game.GamePaused = true;
      fishing.update(0.5);
      assert(session.round.Progress === frozen, 'pause must freeze round');
      game.GamePaused = false;
      for (let i=0; i<2000 && session.state==='pulling';i++) fishing.UpdateSession(session,1/120);
      assert(session.round.Result === 'escaped' && session.yellow.fillRange === 0, 'no clicks must cause escape');
      fishing.UpdateSession(session, 5);
      assert(session.state === 'ready' && session.cast.active, 'escape must allow recast');
      session.cast.emit(cc.Button.EventType.CLICK);
      fishing.UpdateSession(session, session.biteTime);
      window.rewardsBefore = Object.keys(getModule('ZRSJZ_GameData').Instance.PropData);
      let clicks=0;
      for(let i=0;i<5000 && session.state==='pulling';i++) {
        if(session.round.Pointer >= session.round.WindowStart+session.round.WindowWidth-0.001) {
          session.reel.emit(cc.Button.EventType.CLICK); clicks++;
        }
        fishing.UpdateSession(session,1/120);
      }
      assert(session.round.Result==='success' && session.yellow.fillRange===1,'click control must catch fish at 100%');
      assert(clicks>1,'success must require repeated clicks');
      fishing.UpdateSession(session,999);
      assert(session.state==='finishing','elapsed time must not finish reward animation early');
      game.GamePaused=true;fishing.update(0);
      window.finishingTrackTime=session.player.PlayerSkeleton.Skeleton.getCurrent(0).trackTime;
    });
    await page.waitForTimeout(500);
    await page.evaluate(()=>{
      const UI=getModule('ZRSJZ_UIManager');
      const popup=UI.Instance.node.getComponentsInChildren(cc.js.getClassByName('ZRSJZ_GetAwardPanel')).find(p=>p.node.activeInHierarchy);
      if(popup)throw Error('reward popup must wait for actual dy4 completion');
      if(session.player.PlayerSkeleton.Skeleton.getCurrent(0).trackTime!==finishingTrackTime)throw Error('pause must freeze finish animation');
      game.GamePaused=false;
    });
    await page.waitForTimeout(5000);
    console.log('fishing', await page.evaluate(() => {
      const Data = getModule('ZRSJZ_GameData'), UI = getModule('ZRSJZ_UIManager');
      const awarded = Object.keys(Data.Instance.PropData).filter(id=>!rewardsBefore.includes(id)).map(id=>Data.Instance.PropData[id].Name);
      const popup = UI.Instance.node.getComponentsInChildren(cc.js.getClassByName('ZRSJZ_GetAwardPanel')).find(panel=>panel.node.activeInHierarchy);
      if(!awarded.length || !popup?._displayOnly)throw Error('success must grant item and show display-only reward popup');
      const count = Object.keys(Data.Instance.PropData).length;
      popup.OnButtonClick({getCurrentTarget:()=>({name:'Mask'})});
      if(Object.keys(Data.Instance.PropData).length!==count)throw Error('closing reward popup must not duplicate grant');
      session.ui.getChildByName('放弃').emit(cc.Button.EventType.CLICK);
      if(session.player.IsFishing || !session.attack.node.active || fishing._sessions.length)throw Error('exit must restore attack controls');
      if(session.player.RigidBody.type!==bodyTypeBefore)throw Error('exit must restore original rigid body type');
      if(JSON.stringify(getModule('ZRSJZ_InventoryService').GetWeaponryIDs(0))!==weaponIDsBefore)throw Error('fishing must preserve equipment IDs');
      const rod=session.player.PlayerSkeleton.Skeleton.findSlot('4_三合一螺纹钢');
      if(rod?.getAttachment())throw Error('exit must hide rod');
      if(session.line?.node.activeInHierarchy)throw Error('exit must remove fishing line');
      const bone=session.player.PlayerSkeleton.Skeleton.findBone('bone13');
      if(Math.abs(bone.rotation-bone.data.rotation)>0.001)throw Error('exit must reset residual fishing bone rotation');
      return {awarded, pointerRotation:session.pointer?.eulerAngles.z, restored:!session.player.IsFishing};
    }));
    await page.evaluate(async () => {
      const player=game.GetPlayer(0),inv=getModule('ZRSJZ_InventoryService'),Data=getModule('ZRSJZ_GameData');
      for(const type of ['枪','刀']) {
        player.SwitchWeapon(type,0);
        await new Promise(r=>setTimeout(r,100));
        const point=fishing._stations[0].getChildByName('PlayerPoint');player.node.setWorldPosition(point.worldPosition);
        fishing.update(0);fishButton.emit(cc.Button.EventType.CLICK);
        const s=fishing._sessions[0];if(!s)throw Error('must reenter fishing with '+type);
        s.cast.emit(cc.Button.EventType.CLICK);fishing.UpdateSession(s,s.biteTime);
        await new Promise(r=>setTimeout(r,250));
        s.ui.getChildByName('放弃').emit(cc.Button.EventType.CLICK);
        await new Promise(r=>setTimeout(r,150));
        const spine=player.PlayerSkeleton.Skeleton;
        const slotIndex=type==='枪'?0:4,name=Data.Instance.PropData[inv.GetWeaponryIDs(0)[slotIndex]].Name;
        let slotName='dao';if(type==='枪')getModule('ZRSJZ_WEAPONRY_TYPE').forEach((names,slot)=>{if(names.includes(name))slotName=slot;});
        if(spine.findSlot(slotName)?.getAttachment()?.name!==(type==='枪'?slotName:name))throw Error('exit must restore '+type+' attachment '+name);
        if(player.PlayerSkeleton.IsKnife!==(type==='刀'))throw Error('exit must restore held weapon stance');
        if(spine.getCurrent(0)?.animation?.name!==(type==='枪'?'daiji_q':'daiji_dao1'))throw Error('exit must restore normal idle animation');
        const bone=spine.findBone('bone13');if(Math.abs(bone.rotation-bone.data.rotation)>0.001)throw Error('fishing pose must not persist after exit');
        if(cc.isValid(s.line._ripple,true))throw Error('exit must remove DLC ripple instance');
      }
    });
    await page.screenshot({path:__dirname+'/fishing-weapon-preview.png'});
    await page.evaluate(() => {
      game.GamePaused=false;fishing.update(0);fishButton.emit(cc.Button.EventType.CLICK);
      const active=fishing._sessions[0];active.cast.emit(cc.Button.EventType.CLICK);
      window.fixedZone=active.round.WindowStart;
      const p=active.player.node.worldPosition.clone();active.player.node.setWorldPosition(p.x+30,p.y+20,p.z);
      active.player.RigidBody.linearVelocity=new cc.Vec2(100,100);
    });
    await page.waitForTimeout(3200);
    await page.evaluate(() => {
      game.GamePaused=true;
      // 测试专用：隐藏独立新浏览器上下文的启动遮罩，不修改隐私设置或触发同意。
      const privacy=cc.js.getClassByName('PrivacyPanel');
      if(privacy)cc.director.getScene().getComponentsInChildren(privacy).forEach(panel=>panel.node.active=false);
      const player=game.GetPlayer(0), spine=player.PlayerSkeleton.Skeleton;
      const s=fishing._sessions[0],point=s.station.getChildByName('PlayerPoint');
      const distance=cc.Vec3.distance(player.node.worldPosition,point.worldPosition);
      if(distance>0.01)throw Error('player must remain at PlayerPoint across physics frames: '+distance);
      if(s.round.WindowStart!==fixedZone||s.round.WindowStart+s.round.WindowWidth>0.5)throw Error('green zone must stay fixed in left half');
      if(s.green.fillStart!==fixedZone)throw Error('rendered green zone must stay fixed');
      if(!s.line?.node.activeInHierarchy)throw Error('fishing line must be created from authored fish area');
      const line=s.line;
      line.Draw();
      if(!line._ripple?.activeInHierarchy)throw Error('DLC ripple must show landing point');
      if(line._rippleSpine.getCurrent(0)?.animation?.name!=='2')throw Error('ripple must play pulling animation 2');
      if(line._graphics.lineWidth!==4)throw Error('line width must be doubled to 4');
      if(cc.Vec3.distance(line._end,line._ripple.worldPosition)>0.001)throw Error('line end must exactly match ripple root position');
      line.SetState('waiting',1);line.Draw();
      if(line._rippleSpine.getCurrent(0)?.animation?.name!=='1')throw Error('ripple must play idle animation 1');
      line.SetState('pulling',1);line.Draw();
      s.line.Draw();
      const bone=spine.findBone('bone13'),expected=cc.Vec3.transformMat4(new cc.Vec3(),new cc.Vec3(bone.worldX,bone.worldY,0),spine.node.worldMatrix);
      if(cc.Vec3.distance(expected,s.line._start)>0.001)throw Error('line must start at current bone13 world position');
      const area=s.station.getChildByName('鱼出现的区域').getComponent(cc.js.getClassByName('cc.UITransform'));
      const end=area.convertToNodeSpaceAR(s.line._end);
      if(end.x < -area.anchorX*area.width || end.x > (1-area.anchorX)*area.width || end.y < -area.anchorY*area.height || end.y > (1-area.anchorY)*area.height)throw Error('fish point must stay inside authored area');
      const before=s.line._end.clone();s.line.Pull();s.line.Draw();
      if(cc.Vec3.distance(before,s.line._end)<0.01)throw Error('reel must displace water endpoint');
      if(!spine.findSlot('4_三合一螺纹钢')?.getAttachment())throw Error('fishing must show rod');
      if(spine.findSlot('dao')?.getAttachment())throw Error('fishing must hide knife');
      const types=getModule('ZRSJZ_WEAPONRY_TYPE');
      types.forEach((_,name)=>{if(spine.findSlot(name)?.getAttachment())throw Error('fishing must hide gun '+name);});
    });
    const click=await page.evaluate(()=>{
      const s=fishing._sessions[0],canvas=s.ui.parent.parent.getComponent(cc.js.getClassByName('cc.Canvas'));
      const rect=cc.game.canvas.getBoundingClientRect(),screen=canvas.cameraComponent.worldToScreen(s.reel.worldPosition);
      const x=rect.left+screen.x/cc.game.canvas.width*rect.width,y=rect.bottom-screen.y/cc.game.canvas.height*rect.height;
      if(x<0||x>window.innerWidth||y<0||y>window.innerHeight)throw Error('reel button is offscreen');
      const oldPull=s.round.Pull.bind(s.round);window.clickCount=0;s.round.Pull=()=>{window.clickCount++;oldPull();};
      game.GamePaused=false;return {x,y};
    });
    await page.mouse.click(click.x,click.y);
    await page.waitForTimeout(100);
    await page.evaluate(()=>{if(window.clickCount!==1)throw Error('real click must pull exactly once: '+window.clickCount);});
    await page.mouse.down();
    await page.waitForTimeout(400);
    await page.evaluate(()=>{if(window.clickCount!==1)throw Error('holding reel must not repeat pulls');});
    await page.mouse.up();
    await page.waitForTimeout(100);
    await page.evaluate(()=>{game.GamePaused=true;if(window.clickCount!==2)throw Error('release completes one more click: '+window.clickCount);});
    await page.screenshot({path:__dirname+'/fishing-preview.png'});
    console.log('PASS: DLC controls, ripple animation 1/2, exact endpoints, doubled line width, fish area bounds, gun/knife restoration');
    fs.writeFileSync(__dirname + '/fishing-preview-errors.json', JSON.stringify(errors));
    console.log('errors', errors);
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
