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
      window.lasers = game.CurMap.getComponent(cc.js.getClassByName('ZRSJZ_LaserTraps'));
      if (!lasers || lasers._points.length < 2) throw Error('Town must have authored laser points');
      if (lasers._traps.length) throw Error('Must not load traps before DLC readiness');
      game.CurMap.node.getComponentsInChildren(cc.js.getClassByName('ZRSJZ_EnemyBase')).forEach(enemy => enemy.node.active = false);
      game.CurMap.getComponent(cc.js.getClassByName('ZRSJZ_Swamp')).enabled = false;
      game.GamePaused = true;
      getModule('ZRSJZ_UIManager').ZRSJZ_DLC = true;
    });
    await page.waitForFunction(() => lasers._traps.length === lasers._points.length && lasers._traps[0].getComponent(cc.js.getClassByName('ZRSJZ_LaserTrap'))._spine, null, { timeout: 20000 });
    await page.evaluate(() => {
      window.trap = lasers._traps[0].getComponent(cc.js.getClassByName('ZRSJZ_LaserTrap'));
      window.player = game.GetPlayer(0);
      window.toArea = (x = 0, y = 0) => trap._area.convertToWorldSpaceAR(new cc.Vec3(x + trap._trigger.offset.x, y + trap._trigger.offset.y));
      for (let i = 0; i < lasers._points.length; i++) {
        const node = lasers._traps[i], point = lasers._points[i];
        if (node.parent !== point || node.position.length() > 0.01) throw Error('Laser must align with authored point');
      }
      player.node.setWorldPosition(toArea());
      if (!trap.Contains(player)) throw Error('Rotated trigger must include player collider');
      player.node.setWorldPosition(toArea(0, 200));
      if (trap.Contains(player)) throw Error('Rotated trigger must exclude outside player');
      const scale = lasers._points[0].scale.clone(), rotation = lasers._points[0].rotation.clone();
      lasers._points[0].setScale(2, 2, 1); lasers._points[0].setRotationFromEuler(0, 0, 90);
      player.node.setWorldPosition(toArea());
      if (!trap.Contains(player)) throw Error('Scaled rotated point must contain player');
      player.node.setWorldPosition(toArea(0, 300));
      if (trap.Contains(player)) throw Error('Scaled rotated point must exclude outside player');
      lasers._points[0].setScale(scale); lasers._points[0].setRotation(rotation);
      player.node.setWorldPosition(toArea());
      window.initialHP = player.CurHP;
      const originalHit = player.BeHit.bind(player);
      window.hits = [];
      player.BeHit = damage => { hits.push({ damage, time: performance.now() }); originalHit(damage); };
      game.GamePaused = false;
      trap.update(0);
      if (trap._spine.getCurrent(0).animation.name !== 'animation2') throw Error('Trigger must play attack animation2');
      if (player.CurHP !== initialHP) throw Error('Trigger must not apply damage before gj event');
      game.GamePaused = true; trap.update(0);
      window.pausedTrack = trap._spine.getCurrent(0).trackTime;
    });
    await page.waitForTimeout(650);
    await page.evaluate(() => {
      if (player.CurHP !== initialHP || trap._spine.getCurrent(0).trackTime !== pausedTrack) throw Error('Pause must freeze attack and damage');
      game.GamePaused = false; trap.update(0);
    });
    await page.waitForTimeout(150);
    await page.evaluate(() => { player.node.setWorldPosition(toArea(0, 300)); });
    await page.waitForFunction(() => trap._hitDelivered, null, { timeout: 3000 });
    await page.evaluate(() => { if (player.CurHP !== initialHP || hits.length) throw Error('Escaping before gj must avoid damage'); });
    await page.waitForFunction(() => !trap._firing, null, { timeout: 3000 });
    await page.evaluate(() => {
      game.GamePaused = true; trap.update(0);
      if (trap._spine.getCurrent(0).animation.name !== 'daiji') throw Error('Completed attack must return idle');
      if (trap._cooldown <= 0) throw Error('Cooldown must remain after animation completion');
      player.node.setWorldPosition(toArea());
      game.GamePaused = false;
      trap.update(0);
      if (trap._firing) throw Error('Must not fire again before interval');
      // 时间推进仍走真实逻辑；本轮Spine事件自然触发，不手工伪造gj。
      trap.update(2);
    });
    await page.waitForFunction(() => hits.length === 1, null, { timeout: 3000 }).catch(async error => {
      console.log('hit diagnostics', await page.evaluate(() => ({ hits, inside: trap.Contains(player), position: player.node.worldPosition, center: toArea(), firing: trap._firing, delivered: trap._hitDelivered, cooldown: trap._cooldown, track: trap._spine.getCurrent(0)?.animation?.name, trackTime: trap._spine.getCurrent(0)?.trackTime, trackScale: trap._spine.getCurrent(0)?.timeScale, spineScale: trap._spine.timeScale, serial: trap._serial, paused: game.GamePaused, hp: player.CurHP })));
      throw error;
    });
    await page.evaluate(() => {
      if (player.CurHP >= initialHP || hits[0].damage !== getModule('ZRSJZ_LASER_TRAP_CONFIG').Damage) throw Error('Actual gj must apply configured damage');
    });
    await page.waitForTimeout(700);
    await page.evaluate(() => { if (hits.length !== 1) throw Error('One gj shot must hit once only'); });
    await page.waitForFunction(() => hits.length === 2, null, { timeout: 4000 });
    console.log('laser runtime', await page.evaluate(() => {
      if (hits[1].time - hits[0].time < 1850) throw Error('Consecutive attacks must honor two-second interval');
      game.GamePaused = true; trap.update(0);
      getModule('ZRSJZ_UIManager').ZRSJZ_DLC = false; lasers.update(0);
      if (lasers._traps.some(n => n.active)) throw Error('DLC disable must hide traps');
      const hp = player.CurHP; trap.update(5);
      if (player.CurHP !== hp) throw Error('DLC disabled must not deal damage');
      getModule('ZRSJZ_UIManager').ZRSJZ_DLC = true; lasers.update(0);
      if (lasers._traps.length !== lasers._points.length) throw Error('DLC toggle must not duplicate traps');
      return { traps: lasers._traps.length, initialHP, HPAfter: hp, damage: hits[0].damage, hitIntervalMs: Math.round(hits[1].time - hits[0].time), event: 'gj' };
    }));
    await page.screenshot({ path: '_data/upgrade/laser-preview.png' });
    // 回归退出时的组件销毁顺序：先销毁一个Spine，再销毁对应节点。
    await page.evaluate(() => {
      lasers._traps[1].getComponent(cc.js.getClassByName('sp.Skeleton')).destroy();
    });
    await page.waitForTimeout(200);
    await page.evaluate(() => { lasers._traps[1].destroy(); });
    await page.waitForTimeout(200);
    await page.evaluate(async () => {
      const core = cc.assetManager.getBundle('73_ZRSJZ');
      const scene = await new Promise((resolve, reject) => core.loadScene('ZRSJZ_Start', (e, s) => e ? reject(e) : resolve(s)));
      cc.director.runSceneImmediate(scene);
    });
    await page.waitForTimeout(1000);
    await page.evaluate(() => {
      if (cc.director.getScene().name !== 'ZRSJZ_Start' || cc.isValid(trap, true)) throw Error('Exit must destroy old laser trap');
    });
    fs.writeFileSync('_data/upgrade/laser-preview-errors.json', JSON.stringify(errors, null, 2));
    if (errors.some(error => /\[激光\]|setListener|ZRSJZ_LaserTrap|Uncaught|TypeError/.test(error))) throw Error('Laser runtime or destruction error');
    console.log('PASS: laser attack regression, Spine-first destruction and exiting game without setListener errors');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
