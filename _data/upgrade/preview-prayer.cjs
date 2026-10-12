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
      return game?.CurMap?.getComponent(cc.js.getClassByName('ZRSJZ_Prayer'))?._fires.length === 4;
    }, null, { timeout: 20000 });
    console.log('prayer setup', await page.evaluate(() => {
      window.game = getModule('ZRSJZ_Game').Instance;
      window.prayer = game.CurMap.getComponent(cc.js.getClassByName('ZRSJZ_Prayer'));
      window.player = game.GetPlayer(0);
      game.CurMap.node.getComponentsInChildren(cc.js.getClassByName('ZRSJZ_EnemyBase')).forEach(enemy => enemy.node.active = false);
      game.GamePaused = false;
      window.attack = prayer.GetControls().find(a => a.PlayerIndex === 0);
      window.press = name => attack.node.getChildByName(name).emit(cc.Button.EventType.CLICK);
      window.nearFire = direction => {
        const fire = prayer._fires.find(f => f.direction === direction), position = fire.node.worldPosition;
        player.node.setWorldPosition(position.x + 190, position.y, position.z);
        prayer.update(0);
        return fire;
      };
      window.nearPrayer = () => {
        const point = prayer._point.worldPosition;
        player.node.setWorldPosition(point.x + 180, point.y, point.z);
        prayer.update(0);
      };
      window.assert = (ok, message) => { if (!ok) throw Error(message); };
      assert(prayer._required.size >= 1 && prayer._required.size <= 4, 'Must randomize one to four unique targets');
      assert(prayer._fires.every(f => !f.lit && !f.spine.node.active), 'Every match begins with all fires extinguished');
      const randomized = [...prayer._required];
      prayer._required = new Set(['左上', '右下']);
      prayer._elapsed = 0; prayer.update(0);
      assert(prayer._hints.filter(h => h.node.active).length === 2, 'Only required unlit directions must blink');
      const hint = prayer._hints.find(h => h.direction === '左上');
      const opacity = hint.opacity.opacity; prayer.update(0.5);
      assert(hint.opacity.opacity !== opacity, 'Required unchecked hint must flash');
      game.GamePaused = true; const pausedOpacity = hint.opacity.opacity; prayer.update(0.5);
      assert(hint.opacity.opacity === pausedOpacity, 'Pause must freeze hint blinking');
      press('点亮'); assert(prayer._fires.every(f => !f.lit), 'Paused clicks must not light fires');
      game.GamePaused = false;
      const fire = nearFire('左上');
      assert(attack.node.getChildByName('点亮').active && !attack.node.getChildByName('熄灭').active, 'Unlit fire must show light button only');
      return { map: game.CurMap.node.name, randomTargets: randomized, fires: prayer._fires.map(f => f.direction) };
    }));
    await page.waitForTimeout(500);
    const click = await page.evaluate(() => {
      const button = attack.node.getChildByName('点亮');
      let parent = attack.node, canvas;
      while (parent && !canvas) { canvas = parent.getComponent(cc.js.getClassByName('cc.Canvas')); parent = parent.parent; }
      const screen = canvas.cameraComponent.worldToScreen(button.worldPosition), rect = cc.game.canvas.getBoundingClientRect();
      const x = rect.left + screen.x / cc.game.canvas.width * rect.width, y = rect.bottom - screen.y / cc.game.canvas.height * rect.height;
      assert(x >= 0 && x < window.innerWidth && y >= 0 && y < window.innerHeight, 'Light button must be onscreen');
      return { x, y };
    });
    await page.mouse.click(click.x, click.y);
    await page.evaluate(() => {
      const fire = prayer._fires.find(f => f.direction === '左上');
      assert(fire.lit && fire.spine.getCurrent(0)?.animation?.name === 'in', 'Real light click must play in animation');
      prayer.update(0);
      assert(!attack.node.getChildByName('点亮').active && attack.node.getChildByName('熄灭').active, 'Lit fire must show extinguish button');
      const hint = prayer._hints.find(h => h.direction === fire.direction);
      assert(hint.node.active && hint.opacity.opacity === 255, 'Lit direction must show solid Checked');
    });
    await page.waitForFunction(() => prayer._fires[0].spine.getCurrent(0)?.animation?.name === 'loop', null, { timeout: 5000 });
    await page.evaluate(() => {
      game.GamePaused = true; prayer.update(0);
      window.pausedTrackTime = prayer._fires[0].spine.getCurrent(0).trackTime;
    });
    await page.waitForTimeout(250);
    await page.evaluate(() => {
      assert(prayer._fires[0].spine.getCurrent(0).trackTime === pausedTrackTime, 'Pause must freeze fire animation');
      game.GamePaused = false;
      press('熄灭');
      const fire = prayer._fires.find(f => f.direction === '左上');
      assert(!fire.lit && fire.spine.getCurrent(0)?.animation?.name === 'out', 'Extinguish must play out');
      press('点亮');
      nearPrayer();
      assert(attack.node.getChildByName('祈祷').active, 'Prayer button must show at prayer point');
      press('祈祷');
      assert(!prayer._completed && prayer._prayer.active, 'Missing direction must fail');
      assert(!prayer._rewardBox, 'Failed prayer must not spawn reward box');
      assert(prayer._fires.every(f => !f.lit), 'Failed prayer must extinguish every fire');
      assert(prayer._required.size === 2, 'Failure must preserve this match target');
    });
    await page.waitForFunction(() => prayer._fires.every(f => !f.extinguishing), null, { timeout: 5000 });
    await page.evaluate(() => {
      assert(prayer._fires.every(f => !f.spine.node.active), 'Out animation must finish before hiding flame');
      for (const direction of ['左上', '右下', '右上']) { nearFire(direction); press('点亮'); }
      const wrong = prayer._hints.find(h => h.direction === '右上');
      assert(wrong.node.active && wrong.opacity.opacity === 255, 'Extra lit direction must also show Checked');
      nearPrayer(); press('祈祷');
      assert(!prayer._completed && prayer._fires.every(f => !f.lit), 'Extra lit direction must fail and clear fires');
      for (const direction of ['左上', '右下']) { nearFire(direction); press('点亮'); }
      nearPrayer();
    });
    await page.waitForTimeout(600);
    await page.screenshot({ path: '_data/upgrade/prayer-preview.png' });
    await page.evaluate(() => {
      press('祈祷');
      press('祈祷');
      assert(prayer._completing, 'Loading must lock repeat prayer requests');
    });
    await page.waitForFunction(() => prayer._completed && prayer._rewardBox, null, { timeout: 15000 });
    await page.waitForTimeout(400);
    console.log('prayer success', await page.evaluate(async () => {
      assert(prayer._completed && !prayer._prayer.active, 'Exact target match must hide entire prayer node');
      assert(['点亮', '熄灭', '祈祷'].every(name => !attack.node.getChildByName(name).active), 'Solved puzzle must hide interaction buttons');
      nearFire('右上'); press('点亮');
      assert(!prayer._fires.find(f => f.direction === '右上').lit, 'Completed puzzle cannot accept more actions');
      const node = prayer._rewardBox, Box = getModule('ZRSJZ_Box'), box = node.getComponent(Box);
      const config = getModule('ZRSJZ_PRAYER_BOX_CONFIG'), Map = getModule('ZRSJZ_MAP_CONFIG');
      const mapConfig = Map.get(getModule('ZRSJZ_GameData').Instance.CurMap);
      const props = getModule('ZRSJZ_PROP_CONFIG'), qualities = getModule('ZRSJZ_PROP_QUALITY');
      assert(node.parent === game.CurMap.Unit && node.activeInHierarchy, 'Reward box must be visible under map Unit');
      assert(cc.Vec3.distance(node.worldPosition, prayer._point.worldPosition) < 0.01, 'Reward box must spawn at prayer point');
      assert(box.BoxName === '沙漠_祈祷箱' && box.ThemeIconSF.length === 2 && box.ThemeCheckedSF.length === 2, 'Reward box must retain authored visuals');
      assert(box.LootProps.length >= mapConfig.Paracargo.MinPropCount && box.LootProps.length <= mapConfig.Paracargo.MaxPropCount, 'Reward amount must match current airdrop difficulty');
      assert(props.get(box.LootProps[0])?.Quality === qualities.红色, 'Reward must guarantee a permitted red item');
      assert(game.CurMap.Unit.children.filter(child => child.name === config.BoxName).length === 1, 'Repeated prayer clicks must only create one reward box');
      const Generator = getModule('ZRSJZ_ParacargoBox');
      const originalRandom = Math.random;
      try {
        for (let seed = 1; seed <= 100; seed++) {
          const seeded = () => { let state = seed; return () => ((state = (state * 1664525 + 1013904223) >>> 0) / 4294967296); };
          Math.random = seeded(); const air = Generator.GenerateHighValueLoot(mapConfig.Paracargo, mapConfig);
          Math.random = seeded(); const prayerLoot = Generator.GenerateHighValueLoot({...mapConfig.Paracargo, ...config.LootOverrides}, mapConfig);
          assert(JSON.stringify(air) === JSON.stringify(prayerLoot), 'Prayer drop rates must match airdrop algorithm exactly');
          assert(prayerLoot.every(name => { const p = props.get(name); return p.PropType === '物品' ? [qualities.金色, qualities.红色].includes(p.Quality) : [qualities.蓝色, qualities.紫色].includes(p.Quality); }), 'Airdrop tier must exclude low-value loot and over-tier equipment');
        }
      } finally { Math.random = originalRandom; }
      const loot = [...box.LootProps];
      assert(box.Open() && box.IsOpened(), 'Prayer box must open normally');
      assert(box.Icon.spriteFrame === box.ThemeIconSF[1], 'Opened prayer box must use authored opened picture');
      assert(box.TryBeginSearch(0) && !box.TryBeginSearch(1), 'Prayer box search must retain exclusive access');
      assert(box.TakeNextLootProp() === loot[0], 'First loot must be searchable');
      box.EndSearch(0);
      assert(box.TryBeginSearch(1) && box.TakeNextLootProp() === loot[1], 'Closing and resuming search must not reroll loot');
      box.EndSearch(1);
      await box.GetBoxInventory();
      return { completed: prayer._completed, hidden: !prayer._prayer.active, rewardBox: box.BoxName, loot, inventory: box.InventoryID };
    }));
    await page.screenshot({ path: '_data/upgrade/prayer-box-preview.png' });
    await page.evaluate(async () => {
      const core = cc.assetManager.getBundle('73_ZRSJZ');
      const scene = await new Promise((resolve, reject) => core.loadScene('ZRSJZ_Start', (e, s) => e ? reject(e) : resolve(s)));
      cc.director.runSceneImmediate(scene);
    });
    await page.waitForTimeout(500);
    fs.writeFileSync('_data/upgrade/prayer-preview-errors.json', JSON.stringify(errors, null, 2));
    if (errors.some(error => /ZRSJZ_Prayer|setListener|TypeError|Uncaught/.test(error))) throw Error('Prayer runtime error');
    console.log('PASS: prayer gameplay, single reward chest at altar, exact airdrop drop-rate parity across 100 seeds, normal opening/search, exclusive shared inventory and exit cleanup');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
