  console.log('contact setup',await page.evaluate(()=>{
   window.assert=(ok,message)=>{if(!ok)throw Error(message);};
   window.game=getModule('ZRSJZ_Game').Instance;window.player=game.GetPlayer(0);
   window.config=getModule('ZRSJZ_ICE_BUTTERFLY_CONFIG');
   game.CurMap.node.getComponentsInChildren(cc.js.getClassByName('ZRSJZ_EnemyBase')).forEach(n=>n.node.active=false);
   const boxes=game.CurMap.node.getComponentsInChildren(cc.js.getClassByName('cc.BoxCollider2D'));
   window.ice=boxes.find(c=>c.node.name==='冰蝶');
   assert(!!ice,'Authored ice butterfly collider exists');
   const t=ice.node.getComponent(cc.js.getClassByName('cc.UITransform'));
   window.target=t.convertToWorldSpaceAR(new cc.Vec3(ice.offset.x,ice.offset.y,0));
   window.hp=player.CurHP;
   window.bodyType=player.RigidBody.type;
   player.node.setWorldPosition(target);
   player.RigidBody.syncPositionToPhysics?.();
   return {paused:game.GamePaused,finished:game.IsGameFinished,dead:player.IsDead,enabled:player.enabledInHierarchy,iceGroup:ice.group,playerGroup:player.Collider.group,contacts:player.RigidBody.enabledContactListener,iceEnabled:ice.enabled,iceActive:ice.node.activeInHierarchy,target:{x:target.x,y:target.y},iceBounds:ice.worldAABB,playerBounds:player.Collider.worldAABB};
  }));
  await page.waitForFunction(()=>player.IsFrozen,null,{timeout:10000}).catch(async e=>{
   console.log('contact diagnostic',await page.evaluate(()=>({position:player.node.worldPosition,target,playerBounds:player.Collider.worldAABB,iceBounds:ice.worldAABB,bodyType:player.RigidBody.type,offset:player.Collider.offset,beginFrozen:typeof player.BeginFrozen,remaining:player._freezeRemaining})));
   throw e;
  });
  await page.waitForFunction(()=>player._freezeEffect?.activeInHierarchy,{timeout:10000});
  console.log('freeze',await page.evaluate(()=>{
   assert(player.RigidBody.linearVelocity.length()<0.001,'Frozen player velocity zero');
   assert(!ice.node.activeInHierarchy,'Touched butterfly disappears immediately');
   assert(!player.IsSlide&&!player.IsSkill&&!player.IsSwitch&&!player.CanReload(),'Slide/skill/switch/reload locked');
   player.Move(1,0,1,0);player.Attack(true,0);player.Skill('医疗',1,0,1,0);
   assert(player._moveX===0&&!player._isFireing,'Movement and firing rejected');
   assert(cc.Vec3.distance(player._freezeEffect.worldPosition,player.node.worldPosition)<0.001,'Freeze effect at player position');
   const visual=player._freezeEffect.getChildByName('Spine');
   assert(Math.abs(visual.position.x+config.EffectCenter.x*visual.scale.x-player.Collider.offset.x)<0.001
    &&Math.abs(visual.position.y+config.EffectCenter.y*visual.scale.y-player.Collider.offset.y)<0.001,'Freeze artwork centered on player collider');
   const remaining=player._freezeRemaining;player.BeginFrozen();assert(player._freezeRemaining===remaining,'Overlapping contacts do not refresh freeze');
   game.GamePaused=true;window.remaining=player._freezeRemaining;window.pausedHP=player.CurHP;
   window.iceSpine=player._freezeEffect.getComponentInChildren(cc.js.getClassByName('sp.Skeleton'));
   assert(iceSpine.getCurrent(0).animation.name===config.AnimationName&&!iceSpine.getCurrent(0).loop,'bd plays once');
   const originalClear=player.ClearFrozen;
   player.ClearFrozen=function(){
    const spine=this._freezeEffect?.getComponentInChildren(cc.js.getClassByName('sp.Skeleton'));
    window.lastIceTrackTime=spine?.getCurrent(0)?.trackTime;
    window.lastIceAnimationComplete=spine?.getCurrent(0)?.isComplete();
    return originalClear.call(this);
   };
   return {animation:config.AnimationName,damage:config.Damage,interval:config.DamageInterval};
  }));
  await page.waitForTimeout(500);
  await page.evaluate(()=>{
   assert(player._freezeRemaining===remaining&&player.CurHP===pausedHP,'Pause stops freeze timer and damage');
   game.GamePaused=false;
  });
  await page.waitForFunction(()=>player.CurHP<hp,{timeout:3000});
  await page.screenshot({path:'_data/upgrade/ice-butterfly-freeze.png'});
  await page.waitForFunction(()=>iceSpine.findSlot('bingkuai1').color.a<=0.001,null,{timeout:3000});
  await page.evaluate(()=>{
   assert(player.IsFrozen&&player._freezeEffect,'Player stays frozen while bd continues after cube disappears');
   player.Move(1,0,1,0);assert(player._moveX===0,'Animation tail still blocks movement');
  });
  await page.waitForFunction(()=>!player.IsFrozen,null,{timeout:8000});
  console.log('thaw',await page.evaluate(()=>{
   assert(player.CurHP<hp&&!player._freezeEffect,'Damage applied and effect removed');
   assert(lastIceAnimationComplete&&lastIceTrackTime>=2.266,'Freeze ends only after full bd animation');
   assert(player.RigidBody.type===bodyType&&player._freezeBodyType===null,'Original body type restored');
   player.Move(1,0,1,0);assert(player._moveX===1,'Movement resumes after freeze');player.Move(0,0,0,0);
   assert(player.IsSkill&&player.IsSwitch,'Skills and switch restored');
   return {hpBefore:hp,hpAfter:player.CurHP};
  }));
  await page.waitForTimeout(300);
  await page.evaluate(()=>{
   assert(!player.IsFrozen,'Consumed butterfly cannot immediately refreeze the player');
   const next=game.CurMap.node.getComponentsInChildren(cc.js.getClassByName('cc.BoxCollider2D')).find(c=>c.node.name==='冰蝶'&&c.node.activeInHierarchy);
   assert(!!next,'Another authored butterfly is available');
   const area=next.node.getComponent(cc.js.getClassByName('cc.UITransform'));
   const position=area.convertToWorldSpaceAR(new cc.Vec3(next.offset.x,next.offset.y,0));
   position.y-=player.Collider.offset.y*player.node.worldScale.y;
   player.node.setWorldPosition(position);
  });
  await page.waitForFunction(()=>player.IsFrozen,{timeout:3000});
  await page.evaluate(()=>{
   const before=player.CurHP;
   player.UpdateFrozen(0.1);
   game.GamePaused=true;
   player.ClearFrozen();
   assert(!player.IsFrozen&&!player._freezeEffect&&player._freezeBodyType===null,'Explicit freeze cleanup restores state');
   assert(player.CurHP===before,'Cleanup adds no damage');
   game.GamePaused=false;
  });
  if(errors.length)throw Error(errors.join('\n'));
  console.log('PASS: actual butterfly overlap, one-time consumption, control lock, centered effect, periodic damage, pause, non-stacking, thaw, another butterfly and cleanup');
 }finally{fs.writeFileSync('_data/upgrade/ice-butterfly-preview-errors.json',JSON.stringify(errors,null,2));await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
