const { chromium } = require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: 'C:/Users/Administrator/AppData/Local/Google/Chrome/Bin/chrome.exe' });
  try {
    const page = await browser.newPage({ viewport: { width: 1560, height: 720 } });
    const errors = [];
    page.on('pageerror', error => { errors.push(error.message); console.error('runtime', error.message); });
    await page.goto('http://localhost:7456', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => typeof cc !== 'undefined' && cc.director.getScene(), null, { timeout: 45000 });
    await page.evaluate(async () => {
      const bundle = await new Promise((resolve, reject) => cc.assetManager.loadBundle('73_ZRSJZ', (e,b) => e ? reject(e) : resolve(b)));
      const scene = await new Promise((resolve, reject) => bundle.loadScene('ZRSJZ_Start', (e,s) => e ? reject(e) : resolve(s)));
      cc.director.runSceneImmediate(scene);
    });
    await page.waitForTimeout(5000);
    await page.evaluate(() => {
      const get = name => Array.from(System.entries()).map(([,m]) => m).find(m => m[name])?.[name];
      const UI = get('ZRSJZ_UIManager');
      UI.ZRSJZ_DLC = true;
      UI.Instance.CloseAllPanelsImmediately();
      UI.Instance.ShowPanel('73_ZRSJZ/Prefabs/Panel/角色界面');
      window.lunaTest = { UI, launches: 0, effects: [] };
    });
    await page.waitForFunction(() => {
      const t = window.lunaTest;
      t.panel = t.UI.Instance.node.getComponentsInChildren(cc.js.getClassByName('ZRSJZ_RolePanel'))[0];
      t.skin = t.panel?.Skeleton;
      return t.skin && t.panel._initialized;
    }, null, { timeout: 30000 }).catch(async error => {
      console.log('panel diagnostic', await page.evaluate(() => {
        const t = window.lunaTest;
        return { scene: cc.director.getScene()?.name, panel: !!t.panel, initialized: t.panel?._initialized,
          skin: !!t.skin, active: t.panel?.node.activeInHierarchy, children: t.UI.Instance.node.children.map(n => n.name) };
      }));
      throw error;
    });
    await page.evaluate(async () => {
      const t = window.lunaTest;
      t.UI.ZRSJZ_DLC = true;
      await new Promise((resolve, reject) => cc.assetManager.loadBundle('73_ZRSJZ_DLC', (e,b) => e ? reject(e) : resolve(b)));
      t.skin.LoadDLCSkeleton();
    });
    await page.waitForFunction(() => window.lunaTest.skin.HasFullAppearance, null, { timeout: 30000 });
    await page.evaluate(() => {
      const t = window.lunaTest;
      if (!t.skin.LunaEffectPoint) throw Error('Missing role release point');
      const privacy = cc.js.getClassByName('PrivacyPanel');
      if (privacy) for (const p of cc.director.getScene().getComponentsInChildren(privacy)) p.node.active = false;
      const launch = t.skin.LaunchLunaEffect;
      t.skin.LaunchLunaEffect = function() {
        launch.call(this);
        const effect = Array.from(this._previewEffects).find(n => n.name === '出场特效_露娜');
        if (!effect) throw Error('fy did not instantiate effect');
        if (cc.Vec3.distance(effect.worldPosition, this.LunaEffectPoint.worldPosition) > 0.001) throw Error('Release position mismatch');
        if (effect.layer !== this.node.layer || effect.children.some(n => n.layer !== this.node.layer)) throw Error('UI layer mismatch');
        if (effect.getChildByName('Spine').getComponent('sp.Skeleton').loop) throw Error('Effect should play once');
        const skeleton = effect.getChildByName('Spine').getComponent('sp.Skeleton');
        if (skeleton.skeletonData._uuid !== '5ea18a09-56dd-4b87-900f-3f2ecca73ded' || skeleton.animation !== 'action') throw Error('Wrong Luna Spine or animation');
        if (this.Skeleton.getCurrent(0).trackTime > 0.1) throw Error('Effect is not synchronized with entrance start');
        t.launches++;
        t.effects.push(effect);
      };
      t.panel.ShowRoleDesc('浅燎');
    });
    await page.waitForFunction(() => window.lunaTest.launches === 1, null, { timeout: 15000 }).catch(async error => {
      console.log('diagnostic', await page.evaluate(() => {
        const t = window.lunaTest;
        return { skin: t.skin.SkinName, active: t.skin.node.activeInHierarchy, dlc: t.UI.ZRSJZ_DLC, ready: t.skin.HasFullAppearance,
          loaded: !!t.skin._lunaEffectPrefab, animation: t.skin.Skeleton.getCurrent(0)?.animation?.name,
          hasEntrance: !!t.skin.Skeleton.findAnimation('cc_露娜'), launches: t.launches, method: String(t.skin.BindEntranceEvents) };
      }), errors);
      throw error;
    });
    await page.waitForTimeout(350);
    await page.screenshot({ path: '_data/upgrade/luna-role-preview.png' });
    await page.waitForTimeout(2300);
    console.log('completion', await page.evaluate(() => {
      const t = window.lunaTest;
      if (t.effects.some(n => cc.isValid(n, true))) throw Error('Completed effect not destroyed');
      if (t.skin._previewEffects.size) throw Error('Effect registry not cleared');
      t.skin.SetSkin('鸢铠');
      return { launches: t.launches, cleanup: true };
    }));
    await page.waitForFunction(() => window.lunaTest.launches === 2, null, { timeout: 10000 }).catch(async error => {
      console.log(await page.evaluate(() => { const t = window.lunaTest; return { skin: t.skin.SkinName, active: t.skin.node.activeInHierarchy, dlc: t.UI.ZRSJZ_DLC, launches: t.launches, animation: t.skin.Skeleton.getCurrent(0)?.animation.name }; }));
      throw error;
    });
    console.log('switch', await page.evaluate(() => {
      const t = window.lunaTest, effect = t.effects[1];
      t.skin.SetSkin('威蓝');
      if (cc.isValid(effect, true) || t.skin._previewEffects.size || t.skin._pendingFengYi) throw Error('Switch cleanup failed');
      t.skin.SetSkin('凌魇');
      return { cleanup: true };
    }));
    await page.waitForFunction(() => window.lunaTest.launches === 3, null, { timeout: 10000 });
    console.log('close', await page.evaluate(() => {
      const t = window.lunaTest, effect = t.effects[2];
      t.panel.node.active = false;
      if (cc.isValid(effect, true) || t.skin._previewEffects.size || t.skin._pendingFengYi) throw Error('Close cleanup failed');
      return { launches: t.launches, cleanup: true };
    }));
    console.log('stale load', await page.evaluate(async () => {
      const t = window.lunaTest;
      t.panel.node.active = true;
      t.skin.SetSkin('威蓝');
      const original = t.skin.LoadLunaEffect;
      let release;
      t.skin.LoadLunaEffect = () => new Promise(resolve => { release = resolve; });
      const before = t.launches;
      t.skin.SetSkin('浅燎');
      if (t.launches !== before || t.skin.Skeleton.getCurrent(0).animation.name !== 'daiji_q') throw Error('Entrance started before resource ready');
      t.skin.SetSkin('威蓝');
      release(t.skin._lunaEffectPrefab);
      await new Promise(resolve => setTimeout(resolve, 100));
      t.skin.LoadLunaEffect = original;
      if (t.launches !== before || t.skin._previewEffects.size) throw Error('Stale resource load played after skin switch');
      return { waitingForResource: true, staleLoadCancelled: true };
    }));
    console.log('pageErrors', JSON.stringify(errors));
    if (errors.length) throw Error(errors.join('\n'));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
