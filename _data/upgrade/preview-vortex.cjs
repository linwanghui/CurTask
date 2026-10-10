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
      Data.Instance.CurMap = '沙漠古迹_机密行动'; Data.Instance.CurModel = '1p';
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
      return game?.CurMap && game.Players.length;
    }, null, { timeout: 45000 });
    await page.waitForTimeout(1000);
    await page.waitForFunction(() => {
      const game = getModule('ZRSJZ_Game').Instance;
      const vortex = game?.CurMap?.getComponent(cc.js.getClassByName('ZRSJZ_Vortex'));
      return vortex?._points.length > 0 && vortex._vortices.length === vortex._points.length;
    }, null, { timeout: 20000 });
    console.log('vortex checks', await page.evaluate(() => {
      window.game = getModule('ZRSJZ_Game').Instance;
      window.vortex = game.CurMap.getComponent(cc.js.getClassByName('ZRSJZ_Vortex'));
      window.player = game.GetPlayer(0);
      window.assert = (ok, message) => { if (!ok) throw Error(message); };
      game.CurMap.node.getComponentsInChildren(cc.js.getClassByName('ZRSJZ_EnemyBase')).forEach(enemy => enemy.node.active = false);
      game.GamePaused = false;
      window.at = (index, x = 0, y = 0) => {
        const node = vortex._vortices[index], circle = node.getComponent(cc.js.getClassByName('cc.CircleCollider2D'));
        return node.getComponent(cc.js.getClassByName('cc.UITransform')).convertToWorldSpaceAR(new cc.Vec3(circle.offset.x + x, circle.offset.y + y));
      };
      const config = getModule('ZRSJZ_VORTEX_CONFIG');
      for (let i = 0; i < vortex._points.length; i++) {
        const node = vortex._vortices[i], point = vortex._points[i];
        assert(node.parent === point && node.position.length() < 0.01, 'Vortex must match authored point');
        const near = at(i, 40), force = vortex.GetPull(near).clone(), center = at(i);
        assert(force.x * (center.x - near.x) + force.y * (center.y - near.y) > 0, 'Pull must point toward actual circle center');
        assert(force.length() <= config.PullSpeed + 0.001, 'Pull must remain mild');
        assert(vortex.GetPull(at(i, 81)).length() === 0, 'Outside scaled radius must not pull');
        assert(vortex.GetPull(center).length() < 0.001, 'At center pull must be zero');
      }
      player.node.setWorldPosition(at(0, 35));
      player._moveX = 0; player._moveY = 0; player._moveRadius = 1;
      player.update(1 / 60);
      assert(player.RigidBody.linearVelocity.x < 0, 'Idle player must receive physical pull');
      const idleVelocity = player.RigidBody.linearVelocity.x;
      player._moveX = 1;
      player.update(1 / 60);
      assert(player.RigidBody.linearVelocity.x > 0, 'Player must retain ability to move out');
      const base = player.CurSpeed / 60;
      assert(base - player.RigidBody.linearVelocity.x <= base * config.MaxMoveSpeedRatio + 0.001, 'Pull must respect movement strength cap');
      const savedSpeed = player.CurSpeed;
      player.CurSpeed = 30; player.update(1 / 60);
      assert(player.RigidBody.linearVelocity.x > 0, 'Even a slow player must be able to leave');
      player.CurSpeed = savedSpeed;
      game.GamePaused = true; player.update(1 / 60); vortex.update(0);
      assert(player.RigidBody.linearVelocity.length() === 0 && vortex.GetPull(at(0, 35)).length() === 0, 'Pause must stop all pull');
      game.GamePaused = false;
      player.IsFishing = true; player.update(1 / 60);
      assert(player.RigidBody.linearVelocity.length() === 0, 'Locked fishing state must not be displaced');
      player.IsFishing = false;
      const position = vortex._points[1].position.clone();
      vortex._points[1].setWorldPosition(vortex._points[0].worldPosition);
      assert(vortex.GetPull(at(0, 35)).length() <= config.PullSpeed + 0.001, 'Overlapping vortices must not stack');
      vortex._points[1].setPosition(position);
      getModule('ZRSJZ_UIManager').ZRSJZ_DLC = false; vortex.update(0);
      assert(vortex.GetPull(at(0, 35)).length() === 0 && vortex._vortices.every(n => !n.active), 'DLC disable must remove pull');
      getModule('ZRSJZ_UIManager').ZRSJZ_DLC = true; vortex.update(0);
      assert(vortex._vortices.length === vortex._points.length, 'DLC toggle must not duplicate instances');
      vortex.enabled = false;
      assert(vortex.GetPull(at(0, 35)).length() === 0, 'Disabled controller must remove pull');
      vortex.enabled = true;
      player.node.setWorldPosition(at(0, 35));
      player._moveX = 0; player._moveY = 0;
      window.startDistance = cc.Vec3.distance(player.node.worldPosition, at(0));
      window.initialHP = player.CurHP;
      return { count: vortex._vortices.length, idleVelocity, pullSpeed: config.PullSpeed, initialDistance: startDistance };
    }));
    await page.waitForTimeout(600);
    console.log('vortex physics', await page.evaluate(() => {
      const distance = cc.Vec3.distance(player.node.worldPosition, at(0));
      assert(distance < startDistance, 'Real physics frames must draw idle player toward center');
      assert(player.CurHP === initialHP, 'Vortex must not damage player');
      player._moveX = 1;
      return { startDistance, afterPull: distance };
    }));
    await page.waitForTimeout(1000);
    await page.evaluate(() => {
      assert(vortex.GetPull(player.node.worldPosition).length() === 0, 'Outward movement must leave vortex radius');
      game.GamePaused = true; vortex.update(0);
    });
    await page.screenshot({path:'_data/upgrade/vortex-preview.png'});
    await page.evaluate(async () => {
      const core = cc.assetManager.getBundle('73_ZRSJZ');
      const scene = await new Promise((resolve,reject) => core.loadScene('ZRSJZ_Start',(e,s) => e ? reject(e) : resolve(s)));
      cc.director.runSceneImmediate(scene);
    });
    await page.waitForTimeout(500);
    fs.writeFileSync('_data/upgrade/vortex-preview-errors.json',JSON.stringify(errors,null,2));
    if (errors.some(error => /[漩涡]|ZRSJZ_Vortex|TypeError|Uncaught/.test(error))) throw Error('Vortex runtime error');
    console.log('PASS: authored vortex loading, scaled radius, inward mild force, actual physics pull, player escapes, slow-speed cap, pause, fishing lock, no damage, no overlap stacking, DLC and exit cleanup');
  } finally {await browser.close();}
})().catch(e => {console.error(e);process.exitCode=1;});
