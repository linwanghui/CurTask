const fs=require('fs');
const core='assets/Game_Bundles/73_ZRSJZ/Scripts/',dlc='assets/Game_Bundles/73_ZRSJZ_DLC/Scripts/';
const changed=[];
function edit(p,fn){let s=fs.readFileSync(p,'utf8').replace(/\r\n/g,'\n');if(!(p.endsWith('/ZRSJZ_GameData.ts')&&s.includes('readonly Versions = 10')))s=fn(s);fs.writeFileSync(p,s);changed.push(p)}
function rep(s,a,b){if(!s.includes(a))throw Error('Missing '+a);return s.replace(a,b)}
edit(core+'ZRSJZ_GameData.ts',s=>rep(rep(s,'readonly Versions = 9','readonly Versions = 10'),'    public PetFragments:',`    public RoleFragments: number = 0;//账号共享角色碎片
    public RoleFragmentClaimDate: string = "";
    public RoleFragmentClaimCount: number = 0;
    public PetFragments:`));
edit(core+'Service/ZRSJZ_GameDataDefaults.ts',s=>rep(s,'        [7, [',`        [9, [
            { Key: "RoleFragments", DefaultVaule: 0 },
            { Key: "RoleFragmentClaimDate", DefaultVaule: "" },
            { Key: "RoleFragmentClaimCount", DefaultVaule: 0 },
        ]],
        [7, [`));
edit(core+'ZRSJZ_Constant.ts',s=>{
 s=rep(s,'    宠物碎片弹窗 =', '    角色碎片弹窗 = "73_ZRSJZ/Prefabs/Panel/角色碎片弹窗",\n    宠物碎片弹窗 =');
 const prop=s.split('\n').find(l=>l.includes('["宠物碎片", { Name:'));
 s=rep(s,prop,prop+'\n'+prop.replaceAll('宠物碎片','角色碎片'));
 const desc=s.split('\n').find(l=>l.includes('["宠物碎片", "用于'));
 s=rep(s,desc,desc+'\n'+desc.replaceAll('宠物','角色'));
 const start=s.indexOf('export interface ZRSJZ_SkinConfig');
 const end=s.indexOf('//玩家动画',start);
 if(start<0||end<0)throw Error('skin config not found');
 let part=s.slice(start,end).replace('UnlockType: "金币" | "视频"','UnlockType: "角色碎片"');
 part=part.replace(/UnlockType: "(?:金币|视频)", UnlockPrice: \d+/g,'UnlockType: "角色碎片", UnlockPrice: 20');
 for(const name of ['威蓝','泠汐','灼戈','沧戈','霁锋','浅燎'])part=part.replace(new RegExp('(Name: "'+name+'"[^\n]*?UnlockPrice: )20'),'$150');
 return s.slice(0,start)+part+s.slice(end);
});
edit(core+'Service/ZRSJZ_FragmentService.ts',s=>{
 s=rep(s,'export class ZRSJZ_FragmentService {',`export type ZRSJZ_FragmentKind = '宠物碎片' | '角色碎片';
export class ZRSJZ_FragmentService {
    public static IsFragment(name: string): name is ZRSJZ_FragmentKind {
        return name === '宠物碎片' || name === '角色碎片';
    }

    /** 结算调用时可合并保存，保证道具移除和余额入账一起落盘。 */
    public static Credit(kind: ZRSJZ_FragmentKind, count: number, save = true): boolean {
        if (!Number.isSafeInteger(count) || count <= 0 || !Number.isSafeInteger(this.GetCount(kind) + count)) return false;
        const key = kind === '角色碎片' ? 'RoleFragments' : 'PetFragments';
        ZRSJZ_GameData.Instance[key] = this.GetCount(kind) + count;
        if (save) {
            ZRSJZ_GameData.SaveData();
            ZRSJZ_EventManager.EmitPersist(ZRSJZ_MyEvent.ZRSJZ_CURRENCY_CHANGE);
        }
        return true;
    }`);
 s=rep(s,'GetCount(): number','GetCount(kind: ZRSJZ_FragmentKind = \'宠物碎片\'): number');
 s=rep(s,'const count = ZRSJZ_GameData.Instance.PetFragments;',"const count = ZRSJZ_GameData.Instance[kind === '角色碎片' ? 'RoleFragments' : 'PetFragments'];");
 s=rep(s,'GetRemaining(): number','GetRemaining(kind: ZRSJZ_FragmentKind = \'宠物碎片\'): number');
 s=rep(s,'        const now = new Date();',`        const dateKey = kind === '角色碎片' ? 'RoleFragmentClaimDate' : 'PetFragmentClaimDate';
        const countKey = kind === '角色碎片' ? 'RoleFragmentClaimCount' : 'PetFragmentClaimCount';
        const now = new Date();`);
 s=s.replaceAll('data.PetFragmentClaimDate','data[dateKey]').replaceAll('data.PetFragmentClaimCount','data[countKey]');
 s=rep(s,'count: number = ZRSJZ_FragmentService.RewardCount)',"count: number = ZRSJZ_FragmentService.RewardCount, kind: ZRSJZ_FragmentKind = '宠物碎片')");
 s=s.replaceAll('this.GetRemaining()','this.GetRemaining(kind)');
 s=rep(s,'            data.PetFragments = this.GetCount() + count;',`            const countKey = kind === '角色碎片' ? 'RoleFragmentClaimCount' : 'PetFragmentClaimCount';
            if (!this.Credit(kind, count, false)) return '碎片数量无效';`);
 return s;
});
edit(core+'Service/ZRSJZ_AccountService.ts',s=>{
 s='import { ZRSJZ_FragmentService } from "./ZRSJZ_FragmentService";\n'+s;
 s=rep(s,'{ ZRSJZ_WEAPON_SKIN }','{ ZRSJZ_WEAPON_SKIN, ZRSJZ_ROLE_CONFIG, ZRSJZ_SKIN_CONFIG }');
 s=rep(s,'    public static AddSkin(',`    public static UnlockSkinWithFragments(role: string, skin: string): string {
        const data = ZRSJZ_GameData.Instance;
        const config = ZRSJZ_SKIN_CONFIG.get(skin);
        if (!ZRSJZ_ROLE_CONFIG.get(role)?.Skin.includes(skin) || !config) return "角色或皮肤无效";
        if (data.HaveSkin.includes(skin)) return "已经解锁";
        if (skin !== role && !data.HaveRole.includes(role)) return "请先解锁该角色";
        const price = config.UnlockPrice;
        if (config.UnlockType !== "角色碎片" || !Number.isSafeInteger(price) || price <= 0) return "解锁配置无效";
        const balance = ZRSJZ_FragmentService.GetCount('角色碎片');
        if (balance < price) return "角色碎片不足";
        data.RoleFragments = balance - price;
        // AddSkin 同步保存余额和所有权；不经异步广告回调，避免切换角色或连点重复扣款。
        this.AddSkin(role, skin);
        ZRSJZ_EventManager.EmitPersist(ZRSJZ_MyEvent.ZRSJZ_CURRENCY_CHANGE);
        return "";
    }

    public static AddSkin(`);
 s=rep(s,'        data.HaveSkin.push(skin);','        if (!data.HaveSkin.includes(skin)) data.HaveSkin.push(skin);');
 return rep(s,'            data.HaveRole.push(role);','            if (!data.HaveRole.includes(role)) data.HaveRole.push(role);');
});
edit(core+'Panel/ZRSJZ_RolePanel.ts',s=>{
 s='import { ZRSJZ_FragmentService } from "../Service/ZRSJZ_FragmentService";\n'+s;
 s=s.replace('EventHandler, EventTouch','Button, EventHandler, EventTouch').replace('import Banner from \'db://assets/Scripts/Banner\';\n','');
 s=rep(s,'    protected onLoad(): void {',`    private _fragmentEventNode: Node = null;
    private _fragmentGlow: Node = null;

    private RefreshFragments(): void {
        const count = find("Panel/角色碎片/Num", this.node)?.getComponent(Label);
        if (count) count.string = String(ZRSJZ_FragmentService.GetCount('角色碎片'));
        const remaining = ZRSJZ_FragmentService.GetRemaining('角色碎片');
        const label = find("Panel/免费获取角色碎片/剩余次数", this.node)?.getComponent(Label);
        if (label) label.string = '剩余次数：' + remaining;
        const dot = find("Panel/免费获取角色碎片/红点", this.node);
        if (dot) dot.active = remaining > 0;
        this.ShowButton();
    }

    private OpenFragments(): void {
        if (ZRSJZ_FragmentService.GetRemaining('角色碎片') <= 0) {
            ZRSJZ_UIManager.Instance.ShowTip("今日免费次数已用完");
            return;
        }
        ZRSJZ_UIManager.Instance.ShowPanel(ZRSJZ_PANEL.角色碎片弹窗);
    }

    protected update(dt: number): void {
        if (this._fragmentGlow) this._fragmentGlow.angle = (this._fragmentGlow.angle - dt * 45) % 360;
    }

    protected onLoad(): void {
        const free = find("Panel/免费获取角色碎片", this.node);
        if (free) {
            const button = free.getComponent(Button) ?? free.addComponent(Button);
            button.clickEvents = [];
            free.on(Button.EventType.CLICK, this.OpenFragments, this);
        }
        this._fragmentGlow = find("Panel/免费获取角色碎片/碎片背光", this.node);`);
 s=rep(s,'        if (this._initialized) this.SelectInitialRole();\n    }\n\n    protected onDisable',`        if (this._initialized) this.SelectInitialRole();
        this._fragmentEventNode = ZRSJZ_UIManager.Instance?.node;
        this._fragmentEventNode?.on(ZRSJZ_MyEvent.ZRSJZ_CURRENCY_CHANGE, this.RefreshFragments, this);
        this.RefreshFragments();
        this.schedule(this.RefreshFragments, 1);
    }

    protected onDisable`);
 s=rep(s,'    protected onDisable(): void {',`    protected onDisable(): void {
        this.unschedule(this.RefreshFragments);
        this._fragmentEventNode?.off(ZRSJZ_MyEvent.ZRSJZ_CURRENCY_CHANGE, this.RefreshFragments, this);
        this._fragmentEventNode = null;`);
 const begin=s.indexOf('            case "金币购买":'),end=s.indexOf('            case "上场":',begin);
 s=s.slice(0,begin)+`            case "金币购买":
            case "视频获取":
                if (!this._curRoleData) return;
                const error = ZRSJZ_AccountService.UnlockSkinWithFragments(this._curRoleData.Name, this._curRoleData.Skin[this._curRoleSkinIndex]);
                ZRSJZ_UIManager.Instance.ShowTip(error || "解锁成功");
                this.RefreshFragments();
                break;
`+s.slice(end);
 s=s.replace(/this.VideoButton.active = .*;/,'this.VideoButton.active = false;');
 s=s.replace('skinConfig?.UnlockType == "金币"','skinConfig?.UnlockType == "角色碎片"');
 return rep(s,'this.GoldPrice.string = skinConfig.UnlockPrice.toString();','this.GoldPrice.string = `${skinConfig.UnlockPrice} 解锁`;');
});
edit(dlc+'Panel/ZRSJZ_PetPanel.ts',s=>rep(s,'    protected onLoad(): void {',`    private _fragmentGlow: Node = null;
    protected update(dt: number): void {
        if (this._fragmentGlow) this._fragmentGlow.angle = (this._fragmentGlow.angle - dt * 45) % 360;
    }

    protected onLoad(): void {
        this._fragmentGlow = find("Panel/免费获取宠物碎片/碎片背光", this.node);`));
let popup=fs.readFileSync(dlc+'Panel/ZRSJZ_FragmentPanel.ts','utf8').replaceAll("../../../73_ZRSJZ/Scripts/Panel/","./").replaceAll('../../../73_ZRSJZ/Scripts/','../').replaceAll('ZRSJZ_FragmentPanel','ZRSJZ_RoleFragmentPanel').replaceAll('宠物碎片','角色碎片').replaceAll('GetRemaining()','GetRemaining(\'角色碎片\')').replaceAll('CreateVideoReward()','CreateVideoReward(ZRSJZ_FragmentService.RewardCount, \'角色碎片\')');
fs.writeFileSync(core+'Panel/ZRSJZ_RoleFragmentPanel.ts',popup);changed.push(core+'Panel/ZRSJZ_RoleFragmentPanel.ts');
edit(core+'Manager/ZRSJZ_UIManager.ts',s=>{
 s='import { ZRSJZ_FragmentService } from "../Service/ZRSJZ_FragmentService";\n'+s;
 s=rep(s,'            const maxCount = Math.max(1, Math.floor(Number(propConfig.MaxCount) || 1));',`            if (ZRSJZ_FragmentService.IsFragment(propName)) {
                if (!ZRSJZ_FragmentService.Credit(propName, totalCount)) invalidAwards.push({ PropName: propName, Count: totalCount });
                continue;
            }
            const maxCount = Math.max(1, Math.floor(Number(propConfig.MaxCount) || 1));`);
 s=rep(s,'        let receivedFragments = 0;','        let receivedFragments = 0;\n        let receivedRoleFragments = 0;');
 s=rep(s,'if (propData.Name === "宠物碎片") {','if (ZRSJZ_FragmentService.IsFragment(propData.Name)) {');
 s=rep(s,'                    receivedFragments += propData.CurCount;',`                    if (propData.Name === "角色碎片") receivedRoleFragments += propData.CurCount;
                    else receivedFragments += propData.CurCount;`);
 s=rep(s,'        if (receivedFragments > 0) {\n            const current = ZRSJZ_GameData.Instance.PetFragments;\n            ZRSJZ_GameData.Instance.PetFragments = (Number.isSafeInteger(current) && current >= 0 ? current : 0) + receivedFragments;',`        if (receivedFragments > 0 || receivedRoleFragments > 0) {
            ZRSJZ_FragmentService.Credit('宠物碎片', receivedFragments, false);
            ZRSJZ_FragmentService.Credit('角色碎片', receivedRoleFragments, false);`);
 return s;
});
edit(dlc+'Panel/ZRSJZ_MysteryBoxPanel.ts',s=>rep(s,' && prop.Name !== "宠物碎片"','').replaceAll('所有的道具已经放入仓库中','道具已存入仓库，碎片已计入余额'));
fs.writeFileSync('_data/upgrade/fragment-changed.json',JSON.stringify(changed,null,2));
console.log(changed);
