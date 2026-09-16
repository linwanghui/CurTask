const fs=require('fs'),{call}=require('./mcp.cjs');const root='assets/Game_Bundles/73_ZRSJZ/Scripts/Controller/';
const edits=[];let file=root+'ZRSJZ_PlayerSkeleton.ts',s=fs.readFileSync(file,'utf8');
s=s.replace('        return ZRSJZ_InventoryService.GetWeaponryIDs(this.CurPlayerIndex);',`        // 外观刷新只应用当前持有的武器，避免先显示刀后被枪覆盖。
        const ids = [...ZRSJZ_InventoryService.GetWeaponryIDs(this.CurPlayerIndex)];
        ids[this.IsKnife ? 0 : 4] = "";
        return ids;`);edits.push([file,s]);
file=root+'ZRSJZ_Joystick_Attack.ts';s=fs.readFileSync(file,'utf8');const at=s.indexOf('    //装备切换');if(at<0)throw Error('marker missing');
s=s.slice(0,at)+`    // 装备栏操作只刷新当前武器，不改变玩家主动选择的枪/刀状态。
    ShowEquipment(equipmentName: string, isEquipment: boolean = true, playerIndex?: number) {
        if (playerIndex !== undefined && playerIndex !== this.PlayerIndex) return;
        let equipmentIndex = -1;
        ZRSJZ_WEAPONRY_TYPE.forEach(names => {
            if (names.includes(equipmentName)) equipmentIndex = 0;
        });
        if (ZRSJZ_KNIFE.includes(equipmentName)) equipmentIndex = 1;
        if (equipmentIndex < 0) return;

        if (!this.HasWeapon(this._curWeaponIndex)) {
            // 当前武器已卸下，统一回退以同步按钮、动画和攻击状态。
            this.RefreshWeaponSwitchState();
        } else if (isEquipment && equipmentIndex === this._curWeaponIndex) {
            // 同类型替换只更新枪口、弹匣或刀名称。
            this.SwitchWeapon(false, this._curWeaponIndex);
        }
    }
}
`;edits.push([file,s]);
fs.writeFileSync(__dirname+'/weapon-state-staged.json',JSON.stringify(edits));
if(!process.argv.includes('--stage'))(async()=>{for(const [file,content]of edits)await call('assetAdvanced_asset_operations',{action:'save',url:'db://'+file,content});console.log('MCP saved weapon state fixes');})().catch(e=>{console.error(e);process.exitCode=1});
