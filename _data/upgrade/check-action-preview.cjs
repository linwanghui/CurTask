const fs = require('fs');
const boot = fs.readFileSync(__dirname + '/preview-enhancement-v2.cjs', 'utf8');
const prefix = boot.slice(0, boot.indexOf("  console.log('open',")).replace('await page.waitForTimeout(6000)', 'await page.waitForTimeout(15000)');
eval(prefix + String.raw`
  await page.evaluate(() => {
    const get = n => Array.from(System.entries()).map(([,m])=>m).find(m=>m[n])?.[n];
    window.t = { UI: get('ZRSJZ_UIManager'), Data: get('ZRSJZ_GameData'), skins: get('ZRSJZ_SKIN_CONFIG'), actions: get('ZRSJZ_ACTION_CONFIG') };
    t.UI.ZRSJZ_DLC = true;
    t.UI.Instance.CloseAllPanelsImmediately();
    t.UI.Instance.ShowPanel('73_ZRSJZ_DLC/Prefabs/Panel/动作弹窗');
  });
  await page.waitForFunction(() => {
    t.panel = t.UI.Instance.node.getComponentInChildren(cc.js.getClassByName('ZRSJZ_ActionPanel'));
    return !!t.panel;
  }, null, { timeout: 20000 });
  await page.evaluate(() => t.panel.Show());
  await page.waitForFunction(() => {
    return t.panel?.preview?.node.activeInHierarchy && t.panel.preview.getCurrent(0)?.animation?.name === t.actions[0].Animation;
  }, null, { timeout: 20000 }).catch(async error => {
    console.log('Preview diagnostics', await page.evaluate(() => ({panel:!!t.panel,selected:t.panel?.selected,active:t.panel?.node.activeInHierarchy,preview:!!t.panel?.preview,previewActive:t.panel?.preview?.node.activeInHierarchy,layer:t.panel?.preview?.node.layer,animation:t.panel?.preview?.getCurrent(0)?.animation?.name,version:t.panel?.previewVersion})), errors);
    throw error;
  });
  for (const config of await page.evaluate(()=>t.actions)) {
    await page.evaluate(name => { t.panel.selected = name; t.panel.Refresh(); }, config.Name);
    await page.waitForTimeout(1000);
    console.log(await page.evaluate(() => {
      const s = t.panel.preview, cam = t.UI.Instance.node.getComponentInChildren(cc.Camera);
      if (!(cam.visibility & s.node.layer)) throw Error('Preview culled by UI camera: ' + JSON.stringify({layer:s.node.layer,parent:s.node.parent.layer,camera:cam.visibility,cameraName:cam.node.name,source:t.panel.onLoad.toString()}));
      if (!s.node.activeInHierarchy || s.getCurrent(0)?.animation?.name !== t.actions.find(a=>a.Name===t.panel.selected).Animation) throw Error('Wrong preview animation: '+JSON.stringify({selected:t.panel.selected,actual:s.getCurrent(0)?.animation?.name,active:s.node.activeInHierarchy,rootActive:t.panel.node.activeInHierarchy,localActive:s.node.active,version:t.panel.previewVersion,skin:t.Data.Instance.CurSkin[0],hasAnimation:!!s.findAnimation(t.actions[0].Animation)}));
      return { action: t.panel.selected, layer: s.node.layer, camera: cam.visibility, skin: s._skeleton?.skin?.name };
    }));
  }
  await page.screenshot({path: __dirname + '/action-preview-fixed.png'});
  await page.evaluate(() => {
    t.panel.node.active = false;
    t.Data.Instance.CurSkin[0] = '泠汐';
    t.panel.Show();
  });
  await page.waitForTimeout(500);
  await page.evaluate(() => {
    const s = t.panel.preview;
    if (!s.node.activeInHierarchy || s._skeleton.skin.name !== t.skins.get('泠汐').Skin) throw Error('Reopen skin mismatch');
  });
  console.log('PASS: camera visibility, all action selections and reopen with player 1 skin');
  console.log('Runtime errors:', errors);
 } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode=1; });
`);
