import { sys } from "cc";
import { ZRSJZ_GridData, ZRSJZ_INVENTORY, ZRSJZ_PROP_CONFIG, ZRSJZ_PropData } from "./ZRSJZ_Constant";
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
    }

    public MusicMute: boolean = false;//音乐静音
    public SoundMute: boolean = false;//音效静音

    public Gold: number = 0;
    public HaveRole: string[] = ["洛克", "安娜"];
    public CurRole: string[] = ["洛克", "安娜"];
    public HaveSkin: string[] = ["洛克", "安娜"];
    public CurSkin: string[] = ["洛克", "安娜"];
    public PropID: number = 0;//道具的唯一ID
    public PropData: { [ID: string]: ZRSJZ_PropData } = {};//道具数据
    public WeaponryID: string[] = ["", "", "", "", ""];//0--枪 、1--头盔、2--防弹衣、3--背包、4--刀
    public AmmoID: string[] = ["", "", "", "", "", ""];//备战弹药ID
    // public GameTempID: string[] = [];//战斗时的临时ID


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
        ZRSJZ_GameData.SaveData();
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
            if (this.PropData[key].CurInventory === ZRSJZ_INVENTORY.背包) {
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
    public ConsumeProp(propName: string, count: number = 1) {
        if (this.GetPropCountByName(propName) < count) {
            console.error("道具数量不足！");
            return;
        }
        for (const propID in this.PropData) {
            if (this.PropData[propID].Name === propName) {
                if (count < this.PropData[propID].CurCount) {
                    this.PropData[propID].CurCount -= count;
                    break;
                } else {
                    count -= this.PropData[propID].CurCount;
                    delete this.PropData[propID];
                }
            }
        }
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

    //收藏室数据
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
