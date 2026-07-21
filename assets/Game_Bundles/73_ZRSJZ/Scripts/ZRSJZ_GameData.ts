import { sys } from "cc";
import { ZRSJZ_GridData, ZRSJZ_INVENTORY, ZRSJZ_PROP_CONFIG, ZRSJZ_PropData } from "./ZRSJZ_Constant";
import { ZRSJZ_Tools } from "./ZRSJZ_Tools";
import { ZRSJZ_PlayerSwitchButton } from "./UI/ZRSJZ_PlayerSwitchButton";

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
        this.WeaponryID[4] = this.AddPropByName("战术匕首");
    }

    public Gold: number = 0;
    public HaveRole: string[] = ["洛克", "安娜"];
    public CurRole: string[] = ["洛克", "安娜"];
    public HaveSkin: string[] = ["洛克", "安娜"];
    public CurSkin: string[] = ["洛克", "安娜"];
    public PropID: number = 0;//道具的唯一ID
    public PropData: { [ID: string]: ZRSJZ_PropData } = {};//道具数据
    public WeaponryID: string[] = ["", "", "", "", ""];//0--枪 、1--头盔、2--防弹衣、3--背包、4--刀

    ChangeGold(gold: number) {
        this.Gold += gold;
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
}


