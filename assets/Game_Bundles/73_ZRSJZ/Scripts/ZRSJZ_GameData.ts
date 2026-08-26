import { sys } from "cc";
import { ZRSJZ_INVENTORY, ZRSJZ_PropData, ZRSJZ_UpgradeFacilityName } from "./ZRSJZ_Constant";
import { ZRSJZ_GameDataDefaults } from "./Service/ZRSJZ_GameDataDefaults";

/**
 * 游戏存档数据容器。
 *
 * 本类只负责：
 * 1. 声明需要序列化的字段；
 * 2. 从本地存储读取/写入；
 * 3. 调用默认值初始化与存档迁移。
 *
 * 业务规则统一放在 Scripts/Service 下，禁止在此处继续添加玩法逻辑。
 */
export class ZRSJZ_GameData {
    private static readonly STORAGE_KEY = "ZRSJZ_GameData";
    private static _instance: ZRSJZ_GameData = null;

    public static get Instance(): ZRSJZ_GameData {
        if (!this._instance) this._instance = this.ReadData();
        return this._instance;
    }

    public static ReadData(): ZRSJZ_GameData {
        const json = sys.localStorage.getItem(this.STORAGE_KEY);
        if (!json) {
            this._instance = new ZRSJZ_GameData();
            ZRSJZ_GameDataDefaults.Initialize(this._instance);
            this.SaveData();
            return this._instance;
        }

        const savedData = JSON.parse(json);
        this._instance = Object.assign(new ZRSJZ_GameData(), savedData);
        if (ZRSJZ_GameDataDefaults.Migrate(this._instance, savedData)) this.SaveData();
        return this._instance;
    }

    public static SaveData(): void {
        if (!this._instance) return;
        sys.localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this._instance));
    }

    public MusicMute: boolean = false;
    public SoundMute: boolean = false;
    public IsTutorial: boolean = false;

    public Gold: number = 0;
    public FiringRangeLevel: number = 0;
    public FacilityLevel: Partial<Record<ZRSJZ_UpgradeFacilityName, number>> = {};

    public HaveRole: string[] = ["威蓝", "泠汐"];
    public CurRole: string[] = ["威蓝", "泠汐"];
    public HaveSkin: string[] = ["威蓝", "泠汐"];
    public CurSkin: string[] = ["威蓝", "泠汐"];

    public PropID: number = 0;
    public PropData: { [ID: string]: ZRSJZ_PropData } = {};
    public UnlockedWarehouses: ZRSJZ_INVENTORY[] = [ZRSJZ_INVENTORY.仓库_全部];
    public WarehouseStorageVersion: number = 1;
    public LoadoutStorageVersion: number = 1;

    /** 0=枪、1=头盔、2=防弹衣、3=背包、4=刀。 */
    public WeaponryID: string[] = ["", "", "", "", ""];
    public AmmoID: string[] = ["", "", "", "", ""];
    public RoomCard: string[] = ["", "", ""];

    /** 玩家2的随身配置；玩家1继续使用上面的旧字段以兼容已有存档和单人模式。 */
    public Player2WeaponryID: string[] = ["", "", "", "", ""];
    public Player2AmmoID: string[] = ["", "", "", "", "", ""];
    public Player2RoomCard: string[] = ["", "", ""];

    public SignInClaimedCount: number = 0;
    public SignInLastClaimDate: string = "";

    public HaveWeaponSkin: string[] = [];
    public CurWeaponSkin: { [weaponName: string]: string } = {};

    public CurMap: string = "新手村";
    public CurModel: string = "1p";

    //#region 任务
    public MainTaskComplete: string[] = [];//已完成的任务
    public CurMainTask: { TaskName: string, TaskTargetName: string, CurCount: number } = null;//正在进行的任务
    public NewMainTask: string = "";//新任务

    //#region 等级系统
    public Grade: number = 0;//等级
    public CurExp: number = 0;//当前经验
    public TotalGamePlayed: number = 0;//总战局
    public TotalTimePlayed: number = 0;//总时长
    public TotalEvacuation: number = 0;//总撤离次数
    public OptimumEvacuation: number = 0;//最佳撤离---带出价值最高

    //#region 收藏室
    public BoxroomPropLevel: { [propName: string]: number } = {};
    public BoxroomAttributeBonusBasisPoint: { [attributeName: string]: number } = {};

    public MysteryBoxTotalCost: number = 0;
    public MysteryBoxTotalValue: number = 0;
    public MysteryBoxOpenCount: number = 0;
    public MysteryBoxRedCount: number = 0;

    //#region BNS
    public BNS_Property: {
        木材: number;
        矿石: number;
        食物: number;
        宝石: number;
        电力: number;
        繁荣度: number;
    } = {
            木材: 0,
            矿石: 0,
            食物: 0,
            宝石: 0,
            电力: 0,
            繁荣度: 0,
        };

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
}
