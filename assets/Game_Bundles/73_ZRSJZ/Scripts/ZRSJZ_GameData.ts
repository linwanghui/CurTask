import { sys } from "cc";
import { GetFacilityBonusValue as GetConfiguredFacilityBonusValue, GetFiringRangeAttackBonusPercent, ZRSJZ_FACILITY_UPGRADE_CONFIG, ZRSJZ_GridData, ZRSJZ_INVENTORY, ZRSJZ_PROP_CONFIG, ZRSJZ_PropData, ZRSJZ_UpgradeFacilityName, ZRSJZ_WEAPON_SKIN } from "./ZRSJZ_Constant";
import { ZRSJZ_Tools } from "./ZRSJZ_Tools";
import { ZRSJZ_PlayerSwitchButton } from "./UI/ZRSJZ_PlayerSwitchButton";
import { ZRSJZ_EventManager, ZRSJZ_MyEvent } from "./Manager/ZRSJZ_EventManager";

export class ZRSJZ_GameData {

    private static _instance: ZRSJZ_GameData = null;
    public static get Instance(): ZRSJZ_GameData {
        if (this._instance == null) {
            this._instance = this.ReadData();
        }
        return this._instance;
    }

    public static ReadData(): ZRSJZ_GameData {
        const data = sys.localStorage.getItem("ZRSJZ_GameData");
        if (data) {
            this._instance = Object.assign(new ZRSJZ_GameData(), JSON.parse(data));
        } else {
            this._instance = new ZRSJZ_GameData();
            this._instance.Init();
        }
        return this._instance;
    }

    public static SaveData(): void {
        sys.localStorage.setItem("ZRSJZ_GameData", JSON.stringify(this._instance));
    }

    public Init() {
        // this.AddAllProp();
        const propId = this.AddPropByName("战术匕首");
        this.WeaponryID[4] = propId;
        this.MovePropToInventory(propId, ZRSJZ_INVENTORY.武器_刀, 1, 0, 0);
        this.CurMap = "五号小镇_机密行动";
    }

    public MusicMute: boolean = false;//音乐静音
    public SoundMute: boolean = false;//音效静音

    public Gold: number = 0;
    public FiringRangeLevel: number = 0;
    public FacilityLevel: Partial<Record<ZRSJZ_UpgradeFacilityName, number>> = {};
    public HaveRole: string[] = ["威蓝", "小温"];
    public CurRole: string[] = ["威蓝", "小温"];
    public HaveSkin: string[] = ["威蓝", "小温"];
    public CurSkin: string[] = ["威蓝", "小温"];
    public PropID: number = 0;//道具的唯一ID
    public PropData: { [ID: string]: ZRSJZ_PropData } = {};//道具数据
    public WeaponryID: string[] = ["", "", "", "", ""];//0--枪 、1--头盔、2--防弹衣、3--背包、4--刀
    public AmmoID: string[] = ["", "", "", "", "", ""];//备战弹药ID
    public RoomCard: string[] = ["", "", ""];//当前装备的房卡
    /** 七日签到已经领取的奖励数量，达到 7 后签到永久结束。 */
    public SignInClaimedCount: number = 0;
    /** 上次领取签到奖励的本地日期（YYYY-MM-DD）。 */
    public SignInLastClaimDate: string = "";
    /** 已购买的非默认武器皮肤；每把武器的首个皮肤始终视为拥有。 */
    public HaveWeaponSkin: string[] = [];
    /** 每把武器当前使用的皮肤。 */
    public CurWeaponSkin: { [weaponName: string]: string } = {};
    // public GameTempID: string[] = [];//战斗时的临时ID
    public CurMap: string = "五号小镇_机密行动";//当前地图

    //#region 签到
    public GetSignInClaimedCount(): number {
        return Math.max(0, Math.min(7, Math.floor(this.SignInClaimedCount ?? 0)));
    }

    public IsSignInCompleted(): boolean {
        return this.GetSignInClaimedCount() >= 7;
    }

    public CanClaimSignInReward(): boolean {
        return !this.IsSignInCompleted()
            && this.SignInLastClaimDate !== this.GetLocalDateKey();
    }

    /** 领取下一天的签到奖励，成功时返回 0～6 的奖励索引。 */
    public ClaimSignInReward(): number {
        if (!this.CanClaimSignInReward()) return -1;

        const dayIndex = this.GetSignInClaimedCount();
        this.SignInClaimedCount = dayIndex + 1;
        this.SignInLastClaimDate = this.GetLocalDateKey();
        ZRSJZ_GameData.SaveData();
        return dayIndex;
    }

    private GetLocalDateKey(): string {
        const now = new Date();
        const year = now.getFullYear();
        const month = `${now.getMonth() + 1}`.padStart(2, "0");
        const day = `${now.getDate()}`.padStart(2, "0");
        return `${year}-${month}-${day}`;
    }

    ChangeGold(gold: number) {
        this.Gold += gold;
        ZRSJZ_EventManager.EmitPersist(ZRSJZ_MyEvent.ZRSJZ_CURRENCY_CHANGE);
        ZRSJZ_GameData.SaveData();
    }

    AddSkin(role: string, skin: string) {
        this.HaveSkin.push(skin);
        if (role === skin) {
            this.HaveRole.push(role);
            this.SetCurSkin(role, skin);//只有解锁该角色之后才能设置皮肤
        } else {
            ZRSJZ_GameData.SaveData();
        }
    }

    SetCurSkin(role: string, skin: string) {
        const roleIndex = ZRSJZ_PlayerSwitchButton.CurPlayer == "1p" ? 0 : 1;
        this.CurRole[roleIndex] = role;
        this.CurSkin[roleIndex] = skin;
        ZRSJZ_GameData.SaveData();
    }

    public AddPropByName(propName: string, count: number = 1): string {
        const propData = ZRSJZ_PROP_CONFIG.get(propName);
        const propID = this.GetPropID();
        this.PropData[propID] = new ZRSJZ_PropData();
        this.PropData[propID].InstanceID = propID;
        this.PropData[propID].Name = propName;
        this.PropData[propID].PropType = propData.PropType;
        this.PropData[propID].CurInventory = ZRSJZ_Tools.GetInventoryByPropType(propData.PropType);
        this.PropData[propID].UnitPrice = propData.UnitPrice;
        this.PropData[propID].MaxCount = propData.MaxCount;
        this.PropData[propID].CurCount = count;
        this.PropData[propID].Width = Number(propData.GridType[2]);
        this.PropData[propID].Height = Number(propData.GridType[0]);
        this.PropData[propID].GridData = [];
        const gridData1 = new ZRSJZ_GridData()
        gridData1.IsRotate = false;
        gridData1.GridX = -1;
        gridData1.GridY = -1;
        this.PropData[propID].GridData.push(gridData1);

        const gridData2 = new ZRSJZ_GridData()
        gridData2.IsRotate = false;
        gridData2.GridX = -1;
        gridData2.GridY = -1;
        this.PropData[propID].GridData.push(gridData2);
        ZRSJZ_GameData.SaveData();
        return propID;
    }

    public RemovePropID(propID: string) {
        if (this.PropData.hasOwnProperty(propID)) {
            delete this.PropData[propID];
            this.RefreshRoomCardIDs();
            ZRSJZ_EventManager.EmitPersist(ZRSJZ_MyEvent.ZRSJZ_INVENTORY_CHANGE);
            ZRSJZ_GameData.SaveData();
        }
    }

    public SetWeaponry(weaponryIndex: number, weaponryID: string) {
        this.WeaponryID[weaponryIndex] = weaponryID;
        ZRSJZ_GameData.SaveData();
    }

    public SetAmmoID(ammoID: string[]) {
        this.AmmoID = ammoID.slice(0, 6);
        while (this.AmmoID.length < 6) this.AmmoID.push("");
        ZRSJZ_GameData.SaveData();
    }

    public HasWeaponSkin(weaponName: string, skinName: string): boolean {
        const skins = ZRSJZ_WEAPON_SKIN.get(weaponName);
        if (!skins?.some(skin => skin.Name === skinName)) return false;
        return skinName === skins[0].Name || (this.HaveWeaponSkin ?? []).includes(skinName);
    }

    public AddWeaponSkin(weaponName: string, skinName: string): boolean {
        if (!ZRSJZ_WEAPON_SKIN.get(weaponName)?.some(skin => skin.Name === skinName)) return false;
        if (!this.HaveWeaponSkin) this.HaveWeaponSkin = [];
        if (!this.HaveWeaponSkin.includes(skinName)) {
            this.HaveWeaponSkin.push(skinName);
            ZRSJZ_GameData.SaveData();
        }
        return true;
    }

    public GetWeaponSkin(weaponName: string): string {
        const skins = ZRSJZ_WEAPON_SKIN.get(weaponName);
        if (!skins?.length) return weaponName;

        const currentSkin = this.CurWeaponSkin?.[weaponName];
        return currentSkin && this.HasWeaponSkin(weaponName, currentSkin)
            ? currentSkin
            : skins[0].Name;
    }

    public SetWeaponSkin(weaponName: string, skinName: string): boolean {
        if (!this.HasWeaponSkin(weaponName, skinName)) return false;
        if (!this.CurWeaponSkin) this.CurWeaponSkin = {};
        if (this.GetWeaponSkin(weaponName) === skinName) return true;

        this.CurWeaponSkin[weaponName] = skinName;
        ZRSJZ_GameData.SaveData();
        const equippedGunName = this.PropData?.[this.WeaponryID?.[0]]?.Name;
        if (equippedGunName === weaponName) {
            ZRSJZ_EventManager.EmitPersist(ZRSJZ_MyEvent.ZRSJZ_SHOW_EQUIPMENT, weaponName);
        }
        return true;
    }


    public ChangePropGridPos(propID: string, index: number, x: number, y: number) {
        if (!this.PropData.hasOwnProperty(propID)) return;
        this.PropData[propID].GridData[index].GridX = x;
        this.PropData[propID].GridData[index].GridY = y;
        ZRSJZ_GameData.SaveData();
    }

    public MovePropToInventory(propID: string, inventory: ZRSJZ_INVENTORY, gridIndex: number, x: number, y: number) {
        const propData = this.PropData[propID];
        if (!propData) return;

        propData.CurInventory = inventory;
        for (const gridData of propData.GridData) {
            gridData.GridX = -1;
            gridData.GridY = -1;
        }
        propData.GridData[gridIndex].GridX = x;
        propData.GridData[gridIndex].GridY = y;
        if (this.WeaponryID.includes(propID)) {

        }
        this.RefreshRoomCardIDs();
        ZRSJZ_EventManager.EmitPersist(ZRSJZ_MyEvent.ZRSJZ_INVENTORY_CHANGE);
        ZRSJZ_GameData.SaveData();
    }


    public GetEquippedRoomCardID(roomCardName: string): string {
        if (!roomCardName) return "";

        return Object.keys(this.PropData).find(propID => {
            const propData = this.PropData[propID];
            return propData?.Name === roomCardName
                && (propData.PropType === "房卡" || propData.PropType === "门禁卡")
                && propData.CurInventory === ZRSJZ_INVENTORY.卡包;
        }) ?? "";
    }

    public HasEquippedRoomCard(roomCardName: string): boolean {
        return this.GetEquippedRoomCardID(roomCardName) !== "";
    }

    public ConsumeEquippedRoomCard(roomCardName: string): boolean {
        const roomCardID = this.GetEquippedRoomCardID(roomCardName);
        if (!roomCardID) return false;

        ZRSJZ_EventManager.EmitPersist(ZRSJZ_MyEvent.ZRSJZ_SELL_PROP, roomCardID);
        delete this.PropData[roomCardID];
        this.RefreshRoomCardIDs();
        ZRSJZ_EventManager.EmitPersist(ZRSJZ_MyEvent.ZRSJZ_INVENTORY_CHANGE);
        ZRSJZ_GameData.SaveData();
        return true;
    }

    private RefreshRoomCardIDs(): void {
        const roomCardNames = ["低级房卡", "中级房卡", "高级房卡"];
        this.RoomCard = roomCardNames.map(roomCardName =>
            this.GetEquippedRoomCardID(roomCardName)
        );
    }

    public GetInventoryTotalValue(inventories: readonly ZRSJZ_INVENTORY[]): number {
        const inventorySet = new Set(inventories);
        return Object.values(this.PropData).reduce((totalValue, propData) => {
            if (!inventorySet.has(propData.CurInventory)) return totalValue;
            return totalValue + propData.UnitPrice * propData.CurCount;
        }, 0);
    }

    public RemoveInventoryRows(inventory: ZRSJZ_INVENTORY, removedRows: number[]) {
        if (removedRows.length === 0) return;

        const gridIndex = inventory === ZRSJZ_INVENTORY.仓库_全部 ? 0 : 1;
        for (const propID in this.PropData) {
            const propData = this.PropData[propID];
            if (inventory !== ZRSJZ_INVENTORY.仓库_全部 && propData.CurInventory !== inventory) {
                continue;
            }

            const gridData = propData.GridData[gridIndex];
            if (!gridData || gridData.GridY < 0) {
                continue;
            }

            const moveUpRowCount = removedRows.filter(row => row < gridData.GridY).length;
            gridData.GridY -= moveUpRowCount;
        }

        ZRSJZ_GameData.SaveData();
    }

    public ReloadPropData() {
        for (const key in this.PropData) {
            if (
                this.PropData[key].CurInventory === ZRSJZ_INVENTORY.背包
                || this.PropData[key].CurInventory === ZRSJZ_INVENTORY.物资
            ) {
                delete this.PropData[key];
            }
        }
        ZRSJZ_GameData.SaveData();
    }

    //获取道具数量
    public GetPropCountByName(propName: string): number {
        let propCount: number = 0;
        for (const propID in this.PropData) {
            if (this.PropData[propID].Name === propName) {
                propCount += this.PropData[propID].CurCount;
            }
        }
        return propCount;
    }

    //消耗道具
    public ConsumeProp(propName: string, count: number = 1): boolean {
        if (this.GetPropCountByName(propName) < count) {
            console.error("道具数量不足！");
            return false;
        }
        for (const propID in this.PropData) {
            if (this.PropData[propID].Name === propName) {
                if (count < this.PropData[propID].CurCount) {
                    this.PropData[propID].CurCount -= count;
                    count = 0;
                    break;
                } else {
                    count -= this.PropData[propID].CurCount;
                    // 先通知库存清理格子，再删除道具数据。
                    ZRSJZ_EventManager.EmitPersist(ZRSJZ_MyEvent.ZRSJZ_SELL_PROP, propID);
                    delete this.PropData[propID];
                }
            }
        }
        ZRSJZ_EventManager.EmitPersist(ZRSJZ_MyEvent.ZRSJZ_INVENTORY_CHANGE);
        ZRSJZ_GameData.SaveData();
        return count === 0;
    }

    public GetFiringRangeLevel(): number {
        return this.GetFacilityLevel("靶场");
    }

    public SetFiringRangeLevel(level: number): void {
        this.SetFacilityLevel("靶场", level);
    }

    public GetFacilityLevel(facilityName: ZRSJZ_UpgradeFacilityName): number {
        const maxLevel = ZRSJZ_FACILITY_UPGRADE_CONFIG[facilityName].Levels.length;
        const savedLevel = this.FacilityLevel?.[facilityName]
            ?? (facilityName === "靶场" ? this.FiringRangeLevel : 0)
            ?? 0;
        return Math.max(0, Math.min(maxLevel, Math.floor(savedLevel)));
    }

    public SetFacilityLevel(facilityName: ZRSJZ_UpgradeFacilityName, level: number): void {
        if (!Number.isFinite(level)) return;

        const newLevel = Math.max(
            0,
            Math.min(ZRSJZ_FACILITY_UPGRADE_CONFIG[facilityName].Levels.length, Math.floor(level)),
        );
        if (this.GetFacilityLevel(facilityName) === newLevel) return;

        if (!this.FacilityLevel) this.FacilityLevel = {};
        this.FacilityLevel[facilityName] = newLevel;
        // 保留旧字段，使之前版本的靶场存档仍可双向兼容。
        if (facilityName === "靶场") this.FiringRangeLevel = newLevel;
        ZRSJZ_GameData.SaveData();
    }

    public GetFacilityBonusValue(facilityName: ZRSJZ_UpgradeFacilityName): number {
        return GetConfiguredFacilityBonusValue(facilityName, this.GetFacilityLevel(facilityName));
    }

    public GetFiringRangeAttackBonusRate(): number {
        return GetFiringRangeAttackBonusPercent(this.GetFiringRangeLevel()) / 100;
    }

    public GetResearchMaxHPBonus(): number {
        return this.GetFacilityBonusValue("研究所");
    }

    public GetGymMoveSpeedBonusRate(): number {
        return this.GetFacilityBonusValue("健身") / 100;
    }

    public GetPropID(): string {
        this.PropID++;
        ZRSJZ_GameData.SaveData();
        return `ZRSJZ_PropID_${this.PropID}`;
    }

    public AddAllProp() {
        for (let propID of ZRSJZ_PROP_CONFIG.keys()) {
            ZRSJZ_GameData.Instance.AddPropByName(propID);
        }
    }

    public AddAllAmmo(count: number) {
        const ammoNames: string[] = ["1级子弹", "2级子弹", "3级子弹", "4级子弹", "5级子弹", "6级子弹"];
        ammoNames.forEach(name => {
            ZRSJZ_GameData.Instance.AddPropByName(name, count);
        })
    }

    //#region 收藏室数据
    public BoxroomPropLevel: { [propName: string]: number } = {};
    public BoxroomAttributeBonusBasisPoint: { [attributeName: string]: number } = {};

    public GetBoxroomPropLevel(propName: string): number {
        return Math.max(0, Math.min(3, Math.floor(this.BoxroomPropLevel?.[propName] ?? 0)));
    }

    public SetBoxroomPropLevel(propName: string, level: number): void {
        if (!propName || !Number.isFinite(level)) return;

        const newLevel = Math.max(0, Math.min(3, Math.floor(level)));
        if (!this.BoxroomPropLevel) this.BoxroomPropLevel = {};
        if (this.GetBoxroomPropLevel(propName) === newLevel) return;

        if (newLevel === 0) {
            delete this.BoxroomPropLevel[propName];
        } else {
            this.BoxroomPropLevel[propName] = newLevel;
        }
        ZRSJZ_GameData.SaveData();
    }

    public SetBoxroomAttributeBonusBasisPoints(
        bonusBasisPoints: { [attributeName: string]: number }
    ): void {
        const safeBonus: { [attributeName: string]: number } = {};
        for (const attributeName in bonusBasisPoints) {
            const value = bonusBasisPoints[attributeName];
            safeBonus[attributeName] = Number.isFinite(value)
                ? Math.max(0, Math.floor(value))
                : 0;
        }

        if (JSON.stringify(this.BoxroomAttributeBonusBasisPoint ?? {}) === JSON.stringify(safeBonus)) {
            return;
        }
        this.BoxroomAttributeBonusBasisPoint = safeBonus;
        ZRSJZ_GameData.SaveData();
    }

    /**
     * 返回收藏室提供的属性增幅比例，例如 5.00% 返回 0.05。
     */
    public GetBoxroomAttributeBonusRate(attributeName: string): number {
        const basisPoint = this.BoxroomAttributeBonusBasisPoint?.[attributeName] ?? 0;
        return Math.max(0, Math.floor(basisPoint)) / 10000;
    }

    /**
     * 根据传入的基础属性返回收藏室额外增加的实际数值，不修改游戏属性。
     */
    public GetBoxroomAttributeIncrease(attributeName: string, baseValue: number): number {
        if (!Number.isFinite(baseValue)) return 0;
        return baseValue * this.GetBoxroomAttributeBonusRate(attributeName);
    }

    /** 靶场与收藏室共同提供的枪械伤害总加成比例。 */
    public GetTotalGunDamageBonusRate(): number {
        return this.GetFiringRangeAttackBonusRate()
            + this.GetBoxroomAttributeBonusRate("枪械伤害");
    }

    /** 靶场与收藏室共同提供的近战伤害总加成比例。 */
    public GetTotalMeleeDamageBonusRate(): number {
        return this.GetFiringRangeAttackBonusRate()
            + this.GetBoxroomAttributeBonusRate("近战伤害");
    }

    //盲盒数据
    public MysteryBoxTotalCost: number = 0;
    public MysteryBoxTotalValue: number = 0;
    public MysteryBoxOpenCount: number = 0;
    public MysteryBoxRedCount: number = 0;

    public RecordMysteryBoxOpen(cost: number, value: number, redCount: number): void {
        this.MysteryBoxTotalCost = Math.max(
            0,
            Math.floor((this.MysteryBoxTotalCost ?? 0) + Math.max(0, cost))
        );
        this.MysteryBoxTotalValue = Math.max(
            0,
            Math.floor((this.MysteryBoxTotalValue ?? 0) + Math.max(0, value))
        );
        this.MysteryBoxOpenCount = Math.max(0, Math.floor((this.MysteryBoxOpenCount ?? 0) + 1));
        this.MysteryBoxRedCount = Math.max(
            0,
            Math.floor((this.MysteryBoxRedCount ?? 0) + Math.max(0, redCount))
        );
        ZRSJZ_GameData.SaveData();
    }


    //DLC存档数据
    public BNS_Property: { 木材: number, 矿石: number, 食物: number, 宝石: number, 电力: number, 繁荣度: number } =
        { 木材: 0, 矿石: 0, 食物: 0, 宝石: 0, 电力: 0, 繁荣度: 0 };

    /**
     * DLC 在运行时注入资源变化回调，基础包不直接依赖 DLC 脚本。
     * 静态字段不会进入存档 JSON。
     */
    public static BNS_PropertyChangeCallback:
        ((propertyName: keyof ZRSJZ_GameData["BNS_Property"], value: number) => void) | null = null;
    public static BNS_BuildingChangeCallback:
        ((buildingName: string, level: number) => void) | null = null;

    public GetBNSProperty(propertyName: keyof ZRSJZ_GameData["BNS_Property"]): number {
        // 兼容添加“宝石”字段之前生成的旧存档。
        return this.BNS_Property[propertyName] ?? 0;
    }

    public SetBNSProperty(
        propertyName: keyof ZRSJZ_GameData["BNS_Property"],
        value: number
    ): void {
        if (!Number.isFinite(value)) return;

        const newValue = Math.max(0, Math.floor(value));
        if (this.GetBNSProperty(propertyName) === newValue) return;

        this.BNS_Property[propertyName] = newValue;
        ZRSJZ_GameData.SaveData();
        ZRSJZ_GameData.BNS_PropertyChangeCallback?.(propertyName, newValue);
    }

    public ChangeBNSProperty(
        propertyName: keyof ZRSJZ_GameData["BNS_Property"],
        changeValue: number
    ): void {
        this.SetBNSProperty(propertyName, this.GetBNSProperty(propertyName) + changeValue);
    }

    public BNS_Building: { name: string, Level: number }[] = [
        { name: "主基地", Level: 1 },
        { name: "仓库", Level: 0 },
        { name: "伐木场", Level: 0 },
        { name: "医疗部", Level: 0 },
        { name: "发电厂", Level: 0 },
        { name: "矿场", Level: 0 },
        { name: "科研所", Level: 0 },
        { name: "防御塔", Level: 0 },
        { name: "果园", Level: 0 },
    ];

    public GetBNSBuildingLevel(buildingName: string): number {
        return this.BNS_Building.find(building => building.name === buildingName)?.Level ?? 0;
    }

    public SetBNSBuildingLevel(buildingName: string, level: number): void {
        if (!Number.isFinite(level)) return;

        const newLevel = Math.max(0, Math.floor(level));
        let building = this.BNS_Building.find(buildingData => buildingData.name === buildingName);
        if (!building) {
            building = { name: buildingName, Level: 0 };
            this.BNS_Building.push(building);
        }
        if (building.Level === newLevel) return;

        building.Level = newLevel;
        ZRSJZ_GameData.SaveData();
        ZRSJZ_GameData.BNS_BuildingChangeCallback?.(buildingName, newLevel);
    }

    public ChangeBNSBuildingLevel(buildingName: string, changeValue: number): void {
        this.SetBNSBuildingLevel(buildingName, this.GetBNSBuildingLevel(buildingName) + changeValue);
    }

}
