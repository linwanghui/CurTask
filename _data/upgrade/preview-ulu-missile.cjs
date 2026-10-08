const { chromium } = require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async () => {
    const browser = await chromium.launch({ headless: true, executablePath: 'C:/Users/Administrator/AppData/Local/Google/Chrome/Bin/chrome.exe' });
    try {
        const page = await browser.newPage({ viewport: { width: 1560, height: 900 } });
        const errors = [];
        page.on('pageerror', e => errors.push(e.message));
        await page.goto('http://localhost:7456', { waitUntil: 'domcontentloaded' });
        await page.waitForFunction(() => typeof cc !== 'undefined' && cc.director.getScene(), { timeout: 45000 });
        const result = await page.evaluate(async () => {
            const load = name => new Promise((resolve, reject) => cc.assetManager.loadBundle(name, (e, b) => e ? reject(e) : resolve(b)));
            await load('73_ZRSJZ');
            const bundle = await load('73_ZRSJZ_DLC');
            const prefab = await new Promise((resolve, reject) => bundle.load('Prefabs/Effect/技能_乌鲁', cc.Prefab, (e, p) => e ? reject(e) : resolve(p)));
            const instance = cc.instantiate(prefab);
            const mapLayer = 1 << cc.Layers.nameToLayer('Map');
            if (instance.layer !== mapLayer || instance.children.some(n => n.layer !== mapLayer)) throw Error('Prefab must default to Map layer');
            const parent = new cc.Node('UluSmokeTest');
            cc.director.getScene().addChild(parent);
            parent.setPosition(100, 80, 0); parent.setScale(1.3, 0.8, 1); parent.setRotationFromEuler(0, 0, 25);
            parent.addChild(instance);
            const missile = instance.getComponent('ZRSJZ_UluMissile');
            if (!missile || !missile.Missile || !missile.Explosion) throw Error('Prefab script/Spine reference missing');
            let hits = 0;
            const target = new cc.Vec3(600, 100, 0);
            missile.RecycleToPool = false;
            missile.Show(new cc.Vec3(100, 100), new cc.Vec3(1, 0), target, p => {
                hits++;
                if (cc.Vec3.distance(p, target) > 0.001) throw Error('Impact position mismatch');
            });
            missile.update(0.1);
            if (cc.Vec3.distance(instance.worldPosition, new cc.Vec3(170, 100)) > 0.001) throw Error('World launch mismatch under parent transform');
            missile.update(5);
            if (hits !== 1 || missile.Explosion.animation !== 'eff' || missile.Explosion.loop) throw Error('Explosion state incorrect');
            if (cc.Vec3.distance(instance.worldPosition, target) > 0.001) throw Error('Final world position mismatch');
            await new Promise(resolve => setTimeout(resolve, 2200));
            const destroyed = !cc.isValid(instance);
            parent.destroy();
            if (!destroyed) throw Error('Spine completion failed to clean up missile');
            return { registered: true, references: true, transformedParent: true, hits, animationCompleted: destroyed };
        });
        if (errors.some(e => /UluMissile|技能_乌鲁/.test(e))) throw Error(errors.join('\n'));
        console.log(JSON.stringify({ result, pageErrors: errors }, null, 2));
        if (process.argv.includes('--role')) {
            await page.evaluate(async () => {
                const bundle = cc.assetManager.getBundle('73_ZRSJZ');
                const scene = await new Promise((resolve, reject) => bundle.loadScene('ZRSJZ_Start', (e, s) => e ? reject(e) : resolve(s)));
                cc.director.runSceneImmediate(scene);
            });
            await page.waitForTimeout(5000);
            await page.evaluate(() => {
                const get = name => Array.from(System.entries()).map(([, m]) => m).find(m => m[name])?.[name];
                const UI = get('ZRSJZ_UIManager');
                UI.ZRSJZ_DLC = true;
                UI.Instance.CloseAllPanelsImmediately();
                UI.Instance.ShowPanel('73_ZRSJZ/Prefabs/Panel/角色界面');
                window.uluRoleTest = { UI, launches: [], impacts: [] };
            });
            await page.waitForFunction(() => {
                const t = window.uluRoleTest;
                t.panel = t.UI.Instance.node.getComponentsInChildren(cc.js.getClassByName('ZRSJZ_RolePanel'))[0];
                t.skin = t.panel?.Skeleton;
                return t.skin?.HasFullAppearance && t.panel._initialized;
            }, { timeout: 30000 });
            await page.waitForTimeout(3000);
            await page.evaluate(() => {
                const t = window.uluRoleTest;
                const get = name => Array.from(System.entries()).map(([, m]) => m).find(m => m[name])?.[name];
                t.skinChanges = [];
                // 模拟首次特效资源慢加载，四个事件必须等资源就绪再开始。
                t.loadCalls = 0;
                const loadSkill = t.skin.LoadUluSkill;
                t.skin.LoadUluSkill = function() {
                    t.loadCalls++;
                    const loaded = loadSkill.call(this);
                    return t.loadCalls === 1 ? new Promise((resolve, reject) => {
                        loaded.then(prefab => setTimeout(() => resolve(prefab), 1600), reject);
                    }) : loaded;
                };
                const setSkin = t.skin.SetSkin;
                t.skin.SetSkin = function(name) { const r = setSkin.call(this, name); t.skinChanges.push({ requested: name, actual: this.SkinName, dlc: t.UI.ZRSJZ_DLC, ready: this._dlcSkeletonReady }); return r; };
                const privacy = cc.js.getClassByName('PrivacyPanel');
                if (privacy) for (const p of cc.director.getScene().getComponentsInChildren(privacy)) p.node.active = false;
                const launch = t.skin.LaunchPreviewMissile;
                t.skin.LaunchPreviewMissile = function(name) {
                    const before = new Set(this._previewEffects);
                    const bone = this.Skeleton.findBone(name);
                    const start = cc.Vec3.transformMat4(new cc.Vec3(), new cc.Vec3(bone.worldX, bone.worldY), this.node.worldMatrix);
                    const target = this.UluLuluSkillPoint.getChildByName(name).worldPosition.clone();
                    launch.call(this, name);
                    const effect = Array.from(this._previewEffects).find(n => !before.has(n));
                    if (!effect) throw Error('No missile for ' + name);
                    const missile = effect.getComponent('ZRSJZ_UluMissile');
                    if (cc.Vec3.distance(missile._start, start) > 0.001 || cc.Vec3.distance(missile._target, target) > 0.001) throw Error('Bone/target mismatch ' + name);
                    if (effect.layer !== this.node.layer || effect.children.some(n => n.layer !== this.node.layer)) throw Error('Preview layer mismatch');
                    missile._onExplode = p => { t.impacts.push(name); if (cc.Vec3.distance(p, target) > 0.001) throw Error('Wrong landing ' + name); };
                    t.launches.push(name);
                };
                t.panel.ShowRoleDesc('沧戈');
            });
            await page.waitForTimeout(1200);
            await page.evaluate(() => {
                if (window.uluRoleTest.launches.length) throw Error('Entrance fired before skill resource was ready');
            });
            await page.waitForTimeout(1900);
            await page.screenshot({ path: '_data/upgrade/ulu-role-flight.png' });
            await page.waitForTimeout(3200);
            console.log('role state', await page.evaluate(() => {
                const t = window.uluRoleTest;
                const get = name => Array.from(System.entries()).map(([, m]) => m).find(m => m[name])?.[name];
                return { skin: t.skin.SkinName, animation: t.skin.AniName, current: t.skin.Skeleton.getCurrent(0)?.animation?.name,
                    config: get('ZRSJZ_SKIN_CONFIG').get('沧戈'), launches: t.launches, hasAnimation: !!t.skin.Skeleton.findAnimation('cc_乌鲁'),
                    loaded: !!t.skin._uluSkillPrefab, active: t.skin.node.activeInHierarchy, changes: t.skinChanges };
            }));
            console.log('role entrance', await page.evaluate(() => {
                const t = window.uluRoleTest;
                if (t.launches.join(',') !== 'p3,p1,p4,p2') throw Error('Missing/duplicate animation events: ' + t.launches);
                if (t.impacts.length !== 4) throw Error('Missing explosions: ' + t.impacts);
                const lingering = Array.from(t.skin._previewEffects).filter(n => cc.isValid(n, true)).length;
                if (lingering) throw Error('Lingering completed effects');
                t.skin.SetSkin('狩荒');
                return { launches: t.launches, impacts: t.impacts, lingering };
            }));
            await page.waitForTimeout(1400);
            console.log('switch cleanup', await page.evaluate(() => {
                const t = window.uluRoleTest;
                if (!t.skin._previewEffects.size) throw Error('Second skin did not fire');
                const effects = Array.from(t.skin._previewEffects);
                t.skin.SetSkin('威蓝');
                if (t.skin._previewEffects.size || t.skin._pendingMissiles.length || effects.some(n => cc.isValid(n, true))) throw Error('Skin switch cleanup failed');
                t.skin.SetSkin('煌罡');
                return { cleaned: effects.length };
            }));
            await page.waitForTimeout(1400);
            console.log('close cleanup', await page.evaluate(() => {
                const t = window.uluRoleTest, effects = Array.from(t.skin._previewEffects);
                if (!effects.length) throw Error('Third skin did not fire');
                t.panel.node.active = false;
                if (t.skin._previewEffects.size || t.skin._pendingMissiles.length || effects.some(n => cc.isValid(n, true))) throw Error('Close cleanup failed');
                return { cleaned: effects.length };
            }));
            console.log('role page errors', JSON.stringify(errors));
            if (errors.length) throw Error(errors.join('\n'));
        }
    } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
