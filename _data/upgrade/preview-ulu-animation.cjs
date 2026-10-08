const fs = require('fs');
const boot = fs.readFileSync(__dirname + '/preview-enhancement-v2.cjs', 'utf8');
const boss = fs.readFileSync(__dirname + '/preview-boss-motion.cjs', 'utf8');
const prefix = boot.slice(0, boot.indexOf("  console.log('open',")).replace(
  'await page.waitForTimeout(18000);await page.mouse.click(1010,615);await page.waitForTimeout(10000);',
  "await page.waitForFunction(() => typeof cc !== 'undefined' && cc.director.getScene(), null, { timeout: 45000 });",
);
const launch = boss.slice(boss.indexOf("  console.log('launch',"), boss.indexOf("  console.log('runtime',"));
eval(prefix + "page.on('console', m => { if (m.type() === 'error') console.log('runtime', m.text()); });\n" + launch + String.raw`
  console.log('ulu animation', await page.evaluate(async () => {
    const wait = ms => new Promise(r => setTimeout(r, ms));
    const until = async (test, label) => { for (let i = 0; i < 400; i++) { if (test()) return; await wait(25); } throw Error('Timeout: ' + label + ' ' + JSON.stringify(window.uluDiag?.())); };
    const game = t.get('ZRSJZ_Game').Instance, player = game.Players[0], sk = player.PlayerSkeleton;
    const Skill = cc.js.getClassByName('ZRSJZ_UluSkill'), Missile = cc.js.getClassByName('ZRSJZ_UluMissile');
    t.UI.ZRSJZ_DLC = true;
    sk.LoadDLCSkeleton();
    await until(() => sk.HasFullAppearance, 'DLC skeleton');
    sk.SetSkin('沧戈');
    const enemies = game.node.scene.getComponentsInChildren(cc.js.getClassByName('ZRSJZ_EnemyBase')).filter(e => !e.IsDead && e.node.activeInHierarchy);
    if (enemies.length < 2) throw Error('No targets');
    enemies.forEach(e => {
      e.enabled = false; e.StopMoving(); e._health = 10000;
      const body = e.getComponent(cc.js.getClassByName('cc.RigidBody2D')); if (body) body.enabled = false;
      e.getComponentsInChildren(cc.js.getClassByName('cc.Collider2D')).forEach(c => c.enabled = false);
    });
    // 测试目标脱离地图区块裁剪；仍使用真实敌人组件和世界坐标。
    for (const enemy of enemies.slice(0, 2)) { game.node.addChild(enemy.node); enemy.node.active = true; }
    t.UI.Instance.CloseAllPanelsImmediately();
    game.GamePaused = false;
    game.UnlimitedFirepower = true;
    player._isStop = false;
    player.CurHP = 1000;
    player.BeHit = () => {};
    player.FindTarget = () => {};
    player.TargetEnemy = enemies[0].node;
    const origin = player.node.worldPosition.clone();
    enemies[0].node.setWorldPosition(origin.x + 1000, origin.y, origin.z);
    player.Move(1, 0, 1, player.PlayerIndex);
    player.Attack(true, player.PlayerIndex);
    await until(() => player._gunAttackAnimationActive, 'firing');
    let shotsDuringSkill = 0, mode = 'death', lastName = '', launches = [], trackChecks = 0, targetDiagnostics = [];
    window.uluDiag = () => ({ mode, names: launches.map(x => x.name), trackChecks, shotsDuringSkill, paused: game.GamePaused,
      hp: player.CurHP, loading: player._uluCastLoading, playing: sk.IsUluSkillPlaying, pending: sk._pendingUluEvents,
      tracks: [0, 1, 2].map(i => { const e = sk.Skeleton.getCurrent(i); return e && { name: e.animation.name, time: e.trackTime }; }) });
    const fire = player.FireReservedGunBullet;
    player.FireReservedGunBullet = function() { if (sk.IsUluSkillPlaying) shotsDuringSkill++; return fire.call(this); };
    const play = sk.PlayUluSkill;
    const trackSnapshot = i => { const e = sk.Skeleton.getCurrent(i); return e && { name: e.animation.name, time: e.trackTime, scale: e.timeScale }; };
    sk.PlayUluSkill = function(launch, canContinue, paused) {
      const move = trackSnapshot(0), gun = trackSnapshot(1);
      const result = play.call(this, (name, start, direction) => {
        lastName = name;
        // 在事件分发前设置移动位置，避免敌人原有物理/动画系统下一帧回写测试位置。
        if (mode === 'death' && name === 'p1') {
          const p = enemies[0].node.worldPosition.clone();
          enemies[0].node.setWorldPosition(p.x + 150, p.y + 100, p.z);
        }
        launch(name, start, direction);
      }, canContinue, paused);
      if (JSON.stringify(move) !== JSON.stringify(trackSnapshot(0)) || JSON.stringify(gun) !== JSON.stringify(trackSnapshot(1))) throw Error('Skill replaced move/fire tracks');
      if (!this.Skeleton.getCurrent(2) || this.Skeleton.getCurrent(2).animation.name !== '技能_乌鲁') throw Error('Skill track missing');
      trackChecks++;
      return result;
    };
    const originalLaunch = Skill.prototype.Launch;
    Skill.prototype.Launch = function(start, direction, target) {
      const bone = sk.Skeleton.findBone(lastName);
      const expected = cc.Vec3.transformMat4(new cc.Vec3(), new cc.Vec3(bone.worldX, bone.worldY), sk.node.worldMatrix);
      if (cc.Vec3.distance(start, expected) > 0.001) throw Error('Wrong launch bone world position');
      originalLaunch.call(this, start, direction, target);
      targetDiagnostics.push({ name: lastName, position: enemies[0].node.worldPosition.clone(), target: target.clone(),
        active: enemies[0].node.activeInHierarchy, valid: cc.isValid(enemies[0], true), dead: enemies[0].IsDead,
        sameTarget: player.TargetEnemy === enemies[0].node });
      launches.push({ name: lastName, target: target.clone(), effect: this.node });
      if (this.getComponent(Missile)._movementSpeedMultiplier !== 2) throw Error('Battle missile not 2x');
      if (mode === 'death') {
        if (launches.length === 2) { enemies[0]._state = t.get('ZRSJZ_ENEMY_STATE').DEAD; enemies[0].node.setWorldPosition(target.x + 9000, target.y, target.z); }
      } else if (mode === 'destroy' && launches.length === 1) { enemies[1].node.destroy(); player.TargetEnemy = null; }
    };
    player.Skill('乌鲁', 0, 0, 0, player.PlayerIndex);
    await until(() => launches.length === 4 && !sk.IsUluSkillPlaying, 'four missiles and skill cleanup');
    if (launches.map(x => x.name).join(',') !== 'p3,p1,p4,p2') throw Error('Wrong event order or count');
    if (cc.Vec3.distance(launches[0].target, launches[1].target) < 50) throw Error('Live target not tracked: ' + JSON.stringify(targetDiagnostics));
    if (launches.slice(2).some(x => cc.Vec3.distance(x.target, launches[1].target) > 0.001)) throw Error('Dead target fallback changed');
    if (!shotsDuringSkill || !player._isFireing) throw Error('Shooting interrupted');
    const moved = cc.Vec3.distance(player.node.worldPosition, origin);
    if (moved < 1 || sk.Skeleton.getCurrent(0)?.animation.name !== 'zl_q') throw Error('Movement interrupted');
    const json = sk.Skeleton.skeletonData.skeletonJson;
    if (Object.keys(json.animations['技能_乌鲁'].slots).some(n => sk.Skeleton.findSlot(n).getAttachment())) throw Error('Cannon attachments left behind');
    const firstOrder = launches.map(x => x.name);
    player.Attack(false, player.PlayerIndex);
    player.Move(0, 0, 0, player.PlayerIndex);
    mode = 'destroy'; launches = [];
    player.TargetEnemy = enemies[1].node;
    player.Skill('乌鲁', 0, 0, 0, player.PlayerIndex);
    await until(() => launches.length === 4 && !sk.IsUluSkillPlaying, 'destroyed target fallback');
    if (launches.some(x => cc.Vec3.distance(x.target, launches[0].target) > 0.001)) throw Error('Destroyed target fallback changed');
    Skill.prototype.Launch = originalLaunch;
    sk.PlayUluSkill = play;

    // 比较同一路径：战斗半秒的位置等于普通导弹一秒的位置。
    const prefab = await Skill.LoadPrefab(), parent = game.CurMap.BulletParent;
    const make = () => { const n = cc.instantiate(prefab); parent.addChild(n); return n.getComponent(Missile); };
    const normal = make(), fast = make();
    const start = origin.clone(), target = new cc.Vec3(origin.x + 1400, origin.y + 50);
    normal.RecycleToPool = false;
    normal.Show(start, new cc.Vec3(-1, 0), target);
    fast.getComponent(Skill).Launch(start, new cc.Vec3(-1, 0), target);
    for (const dt of [0.02, 0.05, 0.1, 0.2]) {
      normal.update(dt * 2); fast.update(dt);
      if (cc.Vec3.distance(normal.node.worldPosition, fast.node.worldPosition) > 0.001) throw Error('2x path/time mismatch');
    }
    if (normal._movementSpeedMultiplier !== 1) throw Error('Preview speed changed');
    normal.node.destroy(); fast.node.destroy();

    // 暂停只停技能轨道；恢复后按原事件继续，取消不清空移动或射击轨道。
    let resumedEvents = 0;
    sk.PlayUluSkill(() => resumedEvents++, () => true, () => game.GamePaused);
    game.GamePaused = true;
    sk.update();
    const skillTime = sk.Skeleton.getCurrent(2).trackTime;
    await wait(250);
    if (resumedEvents || sk.Skeleton.getCurrent(2).trackTime !== skillTime) throw Error('Paused skill advanced');
    game.GamePaused = false;
    await until(() => resumedEvents === 4 && !sk.IsUluSkillPlaying, 'resume events');
    sk.PlayUluSkill(() => {}, () => true, () => false);
    const moveTrack = trackSnapshot(0), gunTrack = trackSnapshot(1);
    player.CancelUluSkill();
    if (sk.Skeleton.getCurrent(2) || JSON.stringify(moveTrack) !== JSON.stringify(trackSnapshot(0)) || JSON.stringify(gunTrack) !== JSON.stringify(trackSnapshot(1))) throw Error('Cancel touched other tracks');
    await wait(1800);
    if (parent.getComponentsInChildren(Skill).length) throw Error('Missiles did not clean up');
    game.GamePaused = true;
    return { events: firstOrder, trackChecks, shotsDuringSkill, moved, deadTargetFallback: true, destroyedTargetFallback: true,
      twoTimesSpeed: true, previewSpeedUnchanged: true, pauseResume: true, cleanup: true };
  }));
  console.log('errors', errors);
  fs.writeFileSync(path.join(__dirname, 'ulu-animation-errors.json'), JSON.stringify(errors, null, 2));
  if (errors.some(e => /ZRSJZ_Ulu|乌鲁.*失败|技能_乌鲁|Cannot read|TypeError/.test(e))) throw Error(errors.join('\n'));
 } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
`);
