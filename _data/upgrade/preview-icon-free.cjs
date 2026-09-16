// Reuse the isolated preview boot and existing material/bonus checks.
const fs=require('fs');
let source=fs.readFileSync(__dirname+'/preview-enhancement-v2.cjs','utf8');
const checks=`
  console.log('aspect ratios',await page.evaluate(()=>{
   let checked=0;
   const check=n=>{const s=n.getComponent(cc.Sprite),u=n.getComponent('cc.UITransform'),r=s.spriteFrame.rect;
    if(!u||!r)throw Error('missing geometry '+n.parent.name+'/'+n.name+' '+JSON.stringify({ui:!!u,rect:r,components:n.components.map(c=>c.constructor.name)}));
    if(s.sizeMode!==cc.Sprite.SizeMode.TRIMMED||Math.abs(u.width/u.height-r.width/r.height)>1e-6||Math.abs(n.scale.x-n.scale.y)>1e-6)throw Error('stretched '+n.parent.name+'/'+n.name);
    checked++;
   };
   for(const c of t.C){const n=t.panel.route.get(c.ID);check(n.getChildByName('Icon'));check(n.getChildByName('GrayIcon'));t.panel.selected=c.ID;t.panel.Refresh();check(t.panel.node.getChildByPath('Panel/Desc/Icon'));}
   t.Data.Instance.EnhancementLevel=0;t.Data.Instance.EnhancementSpecials=[];t.Data.Instance.Gold=0;t.Data.Instance.PropData={};
   if(!t.U.Purchase('main_1'))throw Error('normal upgrade should need resources');
   t.UI.Instance.CloseAllPanelsImmediately();t.UI.Instance.ShowPanel('73_ZRSJZ/Prefabs/Panel/作弊界面');return{checked};
  }));
  await page.waitForTimeout(1800);
  console.log('cheat button',await page.evaluate(()=>{
   const panel=t.UI.Instance.node.getComponentsInChildren(cc.js.getClassByName('ZRSJZ_CheatingPanel'))[0];
   const n=panel?.node.getChildByPath('Panel/免费强化'),button=n?.getComponent(cc.Button);
   if(!button?.clickEvents.length)throw Error('free upgrade button missing binding');
   button.clickEvents[0].emit([{getCurrentTarget:()=>n}]);
   if(!t.U.FreeUpgradeEnabled)throw Error('button failed to enable free upgrades');
   t.UI.Instance.CloseAllPanelsImmediately();t.UI.Instance.ShowPanel('73_ZRSJZ_DLC/Prefabs/Panel/强化界面');return{enabled:t.U.FreeUpgradeEnabled};
  }));
  await page.waitForTimeout(1800);
  console.log('free UI purchase',await page.evaluate(()=>{
   const d=t.panel.node.getChildByPath('Panel/Desc');
   if(d.getChildByPath('Upgrade/Text').getComponent(cc.Label).string!=='免费强化')throw Error('missing free label');
   for(let i=0;i<2;i++){const a=d.getChildByPath('Material'+i+'/TaskAward'+i).getComponent(cc.js.getClassByName('ZRSJZ_TaskAward'));if(a.Count.string!=='0/0')throw Error('free material cost '+a.Count.string);}
   const before=JSON.stringify(t.Data.Instance.PropData);
   d.getChildByName('Upgrade').emit(cc.Button.EventType.CLICK);
   if(t.U.Level!==1||t.Data.Instance.Gold!==0||JSON.stringify(t.Data.Instance.PropData)!==before)throw Error('free UI purchase failed');
   t.panel.selected='main_2';t.panel.Refresh();
   return{level:t.U.Level,gold:t.Data.Instance.Gold,requirement:d.getChildByName('Requirement').getComponent(cc.Label).string};
  }));
  await page.screenshot({path:path.join(__dirname,'enhancement-icon-free.png')});
`;
source=source.replace("  console.log('totals',",checks+"  console.log('totals',");
source=source.replace('enhancement-v2-errors.json','enhancement-icon-free-errors.json');
eval(source);
