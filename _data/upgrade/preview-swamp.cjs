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
      UI.ZRSJZ_DLC = false; UI.Instance.CloseAllPanelsImmediately();
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
      return game?.CurMap && game.Players.length;
    }, null, { timeout: 45000 });
    await page.waitForTimeout(1000);
    await page.evaluate(() => {
      window.game = getModule('ZRSJZ_Game').Instance;
      window.swamps = game.CurMap.getComponent(cc.js.getClassByName('ZRSJZ_Swamp'));
      if (!swamps || swamps._points.length !== 3) throw Error('Town must have three authored swamp points');
      if (swamps._swamps.length !== 0) throw Error('Must not load DLC swamps before readiness');
      game.CurMap.node.getComponentsInChildren(cc.js.getClassByName('ZRSJZ_EnemyBase')).forEach(enemy => enemy.node.active = false);
      game.GamePaused = true;
      getModule('ZRSJZ_UIManager').ZRSJZ_DLC = true;
    });
    await page.waitForFunction(() => swamps._swamps.length === 3, null, { timeout: 20000 });
    console.log('swamp runtime', await page.evaluate(() => {
      const assert = (ok, message) => { if (!ok) throw Error(message); };
      const player = game.GetPlayer(0), config = getModule('ZRSJZ_SWAMP_CONFIG');
      const areaAt = (index, x = 0, y = 0) => {
        const node = swamps._swamps[index], circle = node.getComponent(cc.js.getClassByName('cc.CircleCollider2D'));
        return node.getComponent(cc.js.getClassByName('cc.UITransform')).convertToWorldSpaceAR(new cc.Vec3(circle.offset.x + x, circle.offset.y + y));
      };
      for (let i = 0; i < 3; i++) {
        const node = swamps._swamps[i], point = swamps._points[i];
        assert(node.parent === point && node.position.length() < 0.01, 'DLC swamp must align with authored point: ' + JSON.stringify({position: node.position, parent: node.parent?.name, point: point.name}));
        assert(Math.abs(node.worldScale.x - (i + 1)) < 0.001, 'Swamp must inherit authored scaling');
        assert(swamps.Contains(areaAt(i, 180.7)), 'Scaled circle inside boundary must count');
        assert(!swamps.Contains(areaAt(i, 181)), 'Scaled circle outside boundary must not count');
      }
      player.node.setWorldPosition(areaAt(0));
      swamps.update(0);
      assert(player.SwampSpeedMultiplier === 0.5, 'Swamp must halve movement');
      const initialHP = player.CurHP;
      swamps.update(4);
      assert(player.CurHP === initialHP, 'Pause must prevent periodic damage');
      game.GamePaused = false;
      swamps.update(0.5);
      assert(player.CurHP === initialHP, 'Damage should start after one second');
      swamps.update(0.5);
      assert(player.CurHP < initialHP && initialHP - player.CurHP <= 5, 'One second should apply small damage via BeHit');
      const health = player.CurHP;
      const savedBaseSpeed = player.CurSpeed;
      player._moveX = 1; player._moveY = 0; player._moveRadius = 1;
      player.update(0.1);
      assert(Math.abs(player.RigidBody.linearVelocity.x - player.CurSpeed * 0.05) < 0.01, 'Actual movement must be half speed');
      player.CurSpeed += 100;
      player.update(0.1);
      assert(Math.abs(player.RigidBody.linearVelocity.x - player.CurSpeed * 0.05) < 0.01, 'Speed buffs must still be halved');
      const secondPos = swamps._points[1].position.clone();
      swamps._points[1].setWorldPosition(swamps._points[0].worldPosition);
      swamps.update(1);
      assert(health - player.CurHP > 0 && health - player.CurHP <= 5, 'Overlap must not double damage');
      assert(player.SwampSpeedMultiplier === 0.5, 'Overlap must not stack slowdown');
      swamps._points[1].setPosition(secondPos);
      player.node.setWorldPosition(areaAt(0, 500));
      swamps.update(0);
      assert(player.SwampSpeedMultiplier === 1, 'Exit must restore movement');
      player.update(0.1);
      assert(Math.abs(player.RigidBody.linearVelocity.x - player.CurSpeed * 0.1) < 0.01, 'Exit must preserve speed bonuses');
      const outsideHP = player.CurHP;
      swamps.update(2);
      assert(player.CurHP === outsideHP, 'Outside area must not take damage');
      player.node.setWorldPosition(areaAt(2));
      swamps.update(0.5);
      getModule('ZRSJZ_UIManager').ZRSJZ_DLC = false;
      swamps.update(2);
      assert(player.SwampSpeedMultiplier === 1 && player.CurHP === outsideHP, 'DLC disable must clear effects');
      getModule('ZRSJZ_UIManager').ZRSJZ_DLC = true;
      swamps.update(0);
      assert(swamps._swamps.length === 3, 'DLC toggle must not duplicate prefabs');
      swamps.enabled = false;
      assert(player.SwampSpeedMultiplier === 1, 'Disabled controller must clean slowdown');
      swamps.enabled = true;
      swamps.update(0);
      player.CurSpeed = savedBaseSpeed;
      player._moveX = 0; player._moveY = 0;
      game.GamePaused = true;
      return { count: swamps._swamps.length, scales: swamps._swamps.map(n => n.worldScale.x), initialHP, HPAfterDamage: outsideHP, speedMultiplier: player.SwampSpeedMultiplier };
    }));
    await page.screenshot({ path: '_data/upgrade/swamp-preview.png' });
    fs.writeFileSync('_data/upgrade/swamp-preview-errors.json', JSON.stringify(errors, null, 2));
    if (errors.some(error => error.includes('[沼泽]'))) throw Error('Swamp resource error');
    console.log('PASS: late DLC loading, three authored transforms, scaled range boundaries, actual half speed, periodic damage, overlap, pause, exit, DLC toggles and cleanup');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
