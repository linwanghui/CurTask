import { _decorator, Component, director, Node, sys } from 'cc';
import { WZSJZ_UIManager } from './WZSJZ_UIManager';
import { WZSJZ_EventManager } from './WZSJZ_EventManager';
import { WZSJZ_Constant } from './WZSJZ_Constant';

const { ccclass, property } = _decorator;

@ccclass('WZSJZ_GameData')
export class WZSJZ_GameData extends Component {
    private static _instance: WZSJZ_GameData = null;
    private static _saveScheduled: boolean = false;
    public static get Instance(): WZSJZ_GameData {
        if (!this._instance) {
            this.ReadDate();
        }
        if (this._instance.node && !this._instance.node.parent) {
            director.addPersistRootNode(this._instance.node);
        }
        if (!this._saveScheduled && this._instance.node) {
            this._saveScheduled = true;
            this._instance.schedule(() => {
                WZSJZ_GameData.DateSave();
            }, 5);
        }
        return this._instance;
    }

    public static Maxversions: number = 0;//最高版本号
    public versions: number = 0;//版本号
    public Money: number = 100000;//钱
    /** 首页资源使用独立字段，避免继续占用含义不清晰的GameData数组下标。 */
    public PhysicalPower: number = WZSJZ_Constant.HomeResource.InitialPhysicalPower;
    public Diamond: number = WZSJZ_Constant.HomeResource.InitialDiamond;
    /** 招募功能尚未接入游戏时，先独立持久化持有数量。 */
    public RecruitCardCount: number = 0;
    /** 未满体力时，当前180秒恢复周期开始的Unix毫秒时间戳；满体力时为0。 */
    public PhysicalPowerRecoverTimestamp: number = 0;
    /** 七个下标分别表示本轮第1～7天是否已领取，值为0或1。 */
    public SignInClaimedDays: number[] = [0, 0, 0, 0, 0, 0, 0];
    /** 本轮挂机宝箱所属的本地自然日，格式YYYY-MM-DD。 */
    public HookRewardDate: string = "";
    /** 今日已经按顺序领取的宝箱数量。 */
    public HookClaimedCount: number = 0;
    /** 当前未领取宝箱开始计时的Unix毫秒时间戳。 */
    public HookChestStartTimestamp: number = 0;
    /** 已通关的最高关卡；0表示新玩家尚未通关第一关。 */
    public HighestClearedLevel: number = 0;
    /** 首页当前正在查看的关卡，开始游戏时也以此字段为准。 */
    public SelectedLevel: number = 1;



    public ChanggeMoney(num: number) {
        this.Money += num;
        WZSJZ_UIManager.Instance.SJZXD_Emit(WZSJZ_EventManager.货币变动, this.Money);
    }

    public GetPhysicalPowerSnapshot(nowTimestamp: number = Date.now()): {
        Current: number;
        Max: number;
        RemainingSeconds: number;
    } {
        this.RefreshPhysicalPower(nowTimestamp);
        const config = WZSJZ_Constant.HomeResource;
        if (this.PhysicalPower >= config.MaxPhysicalPower) {
            return { Current: this.PhysicalPower, Max: config.MaxPhysicalPower, RemainingSeconds: 0 };
        }
        const intervalMs = config.PhysicalPowerRecoveryIntervalSeconds * 1000;
        const elapsed = Math.max(0, nowTimestamp - this.PhysicalPowerRecoverTimestamp);
        return {
            Current: this.PhysicalPower,
            Max: config.MaxPhysicalPower,
            RemainingSeconds: Math.max(1, Math.ceil((intervalMs - elapsed) / 1000)),
        };
    }

    /** 按真实时间补发在线或离线期间恢复的体力。 */
    public RefreshPhysicalPower(nowTimestamp: number = Date.now()): boolean {
        const config = WZSJZ_Constant.HomeResource;
        this.NormalizeHomeResourceData(nowTimestamp);
        if (this.PhysicalPower >= config.MaxPhysicalPower) return false;
        const intervalMs = config.PhysicalPowerRecoveryIntervalSeconds * 1000;
        const elapsed = Math.max(0, nowTimestamp - this.PhysicalPowerRecoverTimestamp);
        const recovered = Math.floor(elapsed / intervalMs);
        if (recovered <= 0) return false;
        const previous = this.PhysicalPower;
        this.PhysicalPower = Math.min(config.MaxPhysicalPower, previous + recovered);
        if (this.PhysicalPower >= config.MaxPhysicalPower) {
            this.PhysicalPowerRecoverTimestamp = 0;
        } else {
            this.PhysicalPowerRecoverTimestamp += recovered * intervalMs;
        }
        WZSJZ_GameData.DateSave();
        WZSJZ_EventManager.EmitScene(
            WZSJZ_EventManager.体力变动,
            this.PhysicalPower,
            config.MaxPhysicalPower,
        );
        return this.PhysicalPower !== previous;
    }

    public TryConsumePhysicalPower(amount: number): boolean {
        const cost = Math.max(0, Math.floor(amount));
        const now = Date.now();
        this.RefreshPhysicalPower(now);
        if (cost <= 0 || this.PhysicalPower < cost) return false;
        const wasFull = this.PhysicalPower >= WZSJZ_Constant.HomeResource.MaxPhysicalPower;
        this.PhysicalPower -= cost;
        if (this.PhysicalPower >= WZSJZ_Constant.HomeResource.MaxPhysicalPower) {
            this.PhysicalPowerRecoverTimestamp = 0;
        } else if (wasFull || this.PhysicalPowerRecoverTimestamp <= 0) {
            this.PhysicalPowerRecoverTimestamp = now;
        }
        WZSJZ_GameData.DateSave();
        WZSJZ_EventManager.EmitScene(
            WZSJZ_EventManager.体力变动,
            this.PhysicalPower,
            WZSJZ_Constant.HomeResource.MaxPhysicalPower,
        );
        return true;
    }

    public AddPhysicalPower(amount: number): number {
        const add = Math.max(0, Math.floor(amount));
        const now = Date.now();
        this.RefreshPhysicalPower(now);
        const previous = this.PhysicalPower;
        // 奖励体力允许溢出上限；达到或超过上限后暂停自然恢复。
        this.PhysicalPower = previous + add;
        if (this.PhysicalPower >= WZSJZ_Constant.HomeResource.MaxPhysicalPower) {
            this.PhysicalPowerRecoverTimestamp = 0;
        } else if (this.PhysicalPowerRecoverTimestamp <= 0) {
            this.PhysicalPowerRecoverTimestamp = now;
        }
        const actualAdded = this.PhysicalPower - previous;
        if (actualAdded > 0) {
            WZSJZ_GameData.DateSave();
            WZSJZ_EventManager.EmitScene(
                WZSJZ_EventManager.体力变动,
                this.PhysicalPower,
                WZSJZ_Constant.HomeResource.MaxPhysicalPower,
            );
        }
        return actualAdded;
    }

    public AddDiamond(amount: number): number {
        const add = Math.max(0, Math.floor(amount));
        if (add <= 0) return 0;
        this.Diamond = Math.max(0, Math.floor(this.Diamond)) + add;
        WZSJZ_GameData.DateSave();
        WZSJZ_EventManager.EmitScene(WZSJZ_EventManager.钻石变动, this.Diamond);
        return add;
    }

    public GetLevelProgressSnapshot(): {
        SelectedLevel: number;
        HighestClearedLevel: number;
        HighestUnlockedLevel: number;
        MaximumPreviewLevel: number;
        IsSelectedLevelUnlocked: boolean;
        BossName: string;
        AnimationIndex: number;
    } {
        this.NormalizeLevelProgressData();
        const highestUnlockedLevel = this.HighestClearedLevel + 1;
        const maximumPreviewLevel = highestUnlockedLevel + 1;
        const cycle = WZSJZ_Constant.HomeLevel.BossCycle;
        const animationIndex = cycle.length > 0
            ? (this.SelectedLevel - 1) % cycle.length
            : 0;
        return {
            SelectedLevel: this.SelectedLevel,
            HighestClearedLevel: this.HighestClearedLevel,
            HighestUnlockedLevel: highestUnlockedLevel,
            MaximumPreviewLevel: maximumPreviewLevel,
            IsSelectedLevelUnlocked: this.SelectedLevel <= highestUnlockedLevel,
            BossName: cycle[animationIndex] || "",
            AnimationIndex: animationIndex,
        };
    }

    public IsLevelUnlocked(level: number): boolean {
        this.NormalizeLevelProgressData();
        const safeLevel = Math.max(1, Math.floor(level));
        return safeLevel <= this.HighestClearedLevel + 1;
    }

    /** 首页翻页使用；最多只允许查看当前进度之后的一关锁定预览。 */
    public SelectLevel(level: number): boolean {
        this.NormalizeLevelProgressData();
        const maximumPreviewLevel = this.HighestClearedLevel + 2;
        const nextLevel = Math.max(1, Math.min(Math.floor(level), maximumPreviewLevel));
        if (nextLevel === this.SelectedLevel) return false;
        this.SelectedLevel = nextLevel;
        WZSJZ_GameData.DateSave();
        WZSJZ_EventManager.EmitScene(
            WZSJZ_EventManager.关卡进度变动,
            this.GetLevelProgressSnapshot(),
        );
        return true;
    }

    /** 结算时调用：只能通关当前已解锁关卡，并自动开放下一关。 */
    public CompleteLevel(level: number): boolean {
        this.NormalizeLevelProgressData();
        const completedLevel = Math.max(1, Math.floor(level));
        if (completedLevel > this.HighestClearedLevel + 1
            || completedLevel <= this.HighestClearedLevel) {
            return false;
        }
        this.HighestClearedLevel = completedLevel;
        WZSJZ_GameData.DateSave();
        WZSJZ_EventManager.EmitScene(
            WZSJZ_EventManager.关卡进度变动,
            this.GetLevelProgressSnapshot(),
        );
        return true;
    }

    /** 使用钻石购买招募卡，并以一次存档提交两项资源变动。 */
    public TryBuyRecruitCards(price: number, amount: number): boolean {
        const cost = Math.max(0, Math.floor(price));
        const add = Math.max(0, Math.floor(amount));
        if (cost <= 0 || add <= 0 || this.Diamond < cost) return false;
        this.Diamond -= cost;
        this.RecruitCardCount += add;
        WZSJZ_GameData.DateSave();
        WZSJZ_EventManager.EmitScene(WZSJZ_EventManager.钻石变动, this.Diamond);
        WZSJZ_EventManager.EmitScene(
            WZSJZ_EventManager.招募卡变动,
            this.RecruitCardCount,
        );
        return true;
    }

    /** 钥匙沿用GameData[0]存储，购买时与钻石一起原子保存。 */
    public TryBuyKeys(price: number, amount: number): boolean {
        const cost = Math.max(0, Math.floor(price));
        const add = Math.max(0, Math.floor(amount));
        if (cost <= 0 || add <= 0 || this.Diamond < cost) return false;
        if (!Array.isArray(this.GameData)) this.GameData = [];
        const current = Number.isFinite(this.GameData[0])
            ? Math.max(0, Math.floor(this.GameData[0]))
            : 0;
        this.Diamond -= cost;
        this.GameData[0] = current + add;
        WZSJZ_GameData.DateSave();
        WZSJZ_EventManager.EmitScene(WZSJZ_EventManager.钻石变动, this.Diamond);
        WZSJZ_EventManager.EmitScene(WZSJZ_EventManager.钥匙变动, this.GameData[0]);
        return true;
    }

    public GetHookSnapshot(nowTimestamp: number = Date.now()): {
        Claimed: boolean[];
        CurrentIndex: number;
        CurrentLevel: number;
        Reward: number;
        Progress: number;
        RemainingSeconds: number;
        CanClaim: boolean;
        AllClaimed: boolean;
    } {
        this.RefreshHookDate(nowTimestamp);
        const rewards = WZSJZ_Constant.Hook.DiamondRewards;
        const allClaimed = this.HookClaimedCount >= rewards.length;
        const currentIndex = allClaimed
            ? Math.max(0, rewards.length - 1)
            : this.HookClaimedCount;
        const durationMs = WZSJZ_Constant.Hook.ChestDurationSeconds * 1000;
        const elapsedMs = allClaimed
            ? durationMs
            : Math.max(0, nowTimestamp - this.HookChestStartTimestamp);
        const progress = durationMs > 0
            ? Math.max(0, Math.min(1, elapsedMs / durationMs))
            : 1;
        return {
            Claimed: rewards.map((_, index) => index < this.HookClaimedCount),
            CurrentIndex: currentIndex,
            CurrentLevel: currentIndex + 1,
            Reward: rewards[currentIndex] || 0,
            Progress: progress,
            RemainingSeconds: allClaimed
                ? 0
                : Math.max(0, Math.ceil((durationMs - elapsedMs) / 1000)),
            CanClaim: !allClaimed && elapsedMs >= durationMs,
            AllClaimed: allClaimed,
        };
    }

    public ClaimHookReward(nowTimestamp: number = Date.now()): {
        Success: boolean;
        Amount?: number;
        Level?: number;
        AllClaimed?: boolean;
    } {
        const snapshot = this.GetHookSnapshot(nowTimestamp);
        if (!snapshot.CanClaim) return { Success: false, AllClaimed: snapshot.AllClaimed };
        const amount = snapshot.Reward;
        const level = snapshot.CurrentLevel;
        this.HookClaimedCount++;
        // 下一档严格从领取这一刻开始计时，不能用上一档溢出的离线时间。
        this.HookChestStartTimestamp = this.HookClaimedCount
            < WZSJZ_Constant.Hook.DiamondRewards.length
            ? nowTimestamp
            : 0;
        this.AddDiamond(amount);
        const nextSnapshot = this.GetHookSnapshot(nowTimestamp);
        WZSJZ_EventManager.EmitScene(WZSJZ_EventManager.挂机宝箱变动, nextSnapshot);
        return {
            Success: true,
            Amount: amount,
            Level: level,
            AllClaimed: nextSnapshot.AllClaimed,
        };
    }

    public GetSignInSnapshot(now: Date = new Date()): {
        ClaimedDays: boolean[];
        TodayIndex: number;
        CanClaimToday: boolean;
    } {
        this.RefreshSignInDate(now);
        const firstUnclaimed = this.SignInClaimedDays.findIndex((value) => value !== 1);
        const claimedCount = firstUnclaimed >= 0
            ? firstUnclaimed
            : this.SignInClaimedDays.length;
        const canClaim = this.TimeDate[3] === 1 && firstUnclaimed >= 0;
        let todayIndex = canClaim ? firstUnclaimed : Math.max(0, claimedCount - 1);
        todayIndex = Math.min(
            WZSJZ_Constant.SignIn.Rewards.length - 1,
            Math.max(0, todayIndex),
        );
        return {
            ClaimedDays: this.SignInClaimedDays.map((value) => value === 1),
            TodayIndex: todayIndex,
            CanClaimToday: canClaim,
        };
    }

    public ClaimSignInReward(): {
        Success: boolean;
        DayIndex?: number;
        RewardType?: "diamond" | "physical_power";
        Amount?: number;
    } {
        const snapshot = this.GetSignInSnapshot();
        if (!snapshot.CanClaimToday) return { Success: false };
        const dayIndex = snapshot.TodayIndex;
        const reward = WZSJZ_Constant.SignIn.Rewards[dayIndex];
        if (!reward) return { Success: false };
        this.SignInClaimedDays[dayIndex] = 1;
        this.TimeDate[3] = 0;
        if (reward.Type === "diamond") this.AddDiamond(reward.Amount);
        else this.AddPhysicalPower(reward.Amount);
        // AddDiamond/AddPhysicalPower会保存一次，这里再次保存确保签到标记与奖励原子落盘。
        WZSJZ_GameData.DateSave();
        return {
            Success: true,
            DayIndex: dayIndex,
            RewardType: reward.Type,
            Amount: reward.Amount,
        };
    }



    public GameData: number[] = [3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];//0.钥匙数量
    public TimeDate: number[] = [2023, 11, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];//0年1月2日3是否可以签到

    public static DateSave() {
        const data = WZSJZ_GameData.Instance;
        const json = JSON.stringify({
            versions: data.versions,
            Money: data.Money,
            PhysicalPower: data.PhysicalPower,
            Diamond: data.Diamond,
            RecruitCardCount: data.RecruitCardCount,
            PhysicalPowerRecoverTimestamp: data.PhysicalPowerRecoverTimestamp,
            SignInClaimedDays: data.SignInClaimedDays,
            HookRewardDate: data.HookRewardDate,
            HookClaimedCount: data.HookClaimedCount,
            HookChestStartTimestamp: data.HookChestStartTimestamp,
            HighestClearedLevel: data.HighestClearedLevel,
            SelectedLevel: data.SelectedLevel,
            GameData: data.GameData,
            TimeDate: data.TimeDate,
        });
        sys.localStorage.setItem("WZSJZ_DATA", json);
        console.log("游戏存档");
    }
    public static ReadDate() {
        let name = sys.localStorage.getItem("WZSJZ_DATA");
        const dataNode = new Node("WZSJZ_GameData");
        WZSJZ_GameData._instance = dataNode.addComponent(WZSJZ_GameData);
        let needsHomeResourceSave = false;
        if (name != "" && name != null) {
            console.log("读取存档");
            const savedData = JSON.parse(name);
            needsHomeResourceSave = !Object.prototype.hasOwnProperty.call(savedData, "PhysicalPower")
                || !Object.prototype.hasOwnProperty.call(savedData, "Diamond")
                || !Object.prototype.hasOwnProperty.call(savedData, "RecruitCardCount")
                || !Object.prototype.hasOwnProperty.call(
                    savedData,
                    "PhysicalPowerRecoverTimestamp",
                )
                || !Object.prototype.hasOwnProperty.call(savedData, "SignInClaimedDays");
            needsHomeResourceSave = needsHomeResourceSave
                || !Object.prototype.hasOwnProperty.call(savedData, "HookRewardDate")
                || !Object.prototype.hasOwnProperty.call(savedData, "HookClaimedCount")
                || !Object.prototype.hasOwnProperty.call(savedData, "HookChestStartTimestamp");
            needsHomeResourceSave = needsHomeResourceSave
                || !Object.prototype.hasOwnProperty.call(savedData, "HighestClearedLevel")
                || !Object.prototype.hasOwnProperty.call(savedData, "SelectedLevel");
            Object.assign(WZSJZ_GameData._instance, savedData);
            WZSJZ_GameData.Instance.DataUp();//判断存档版本升级
        } else {
            console.log("新建存档");
            needsHomeResourceSave = true;
        }
        WZSJZ_GameData._instance.NormalizeHomeResourceData(Date.now());
        WZSJZ_GameData._instance.NormalizeLevelProgressData();
        WZSJZ_GameData._instance.RefreshSignInDate(new Date());
        WZSJZ_GameData._instance.RefreshHookDate(Date.now());
        // 老存档缺少首页资源字段时，立即补齐并写回，而不是等下次自动保存。
        if (needsHomeResourceSave) WZSJZ_GameData.DateSave();
    }

    private NormalizeHomeResourceData(nowTimestamp: number): void {
        const config = WZSJZ_Constant.HomeResource;
        if (!Number.isFinite(this.PhysicalPower)) {
            this.PhysicalPower = config.InitialPhysicalPower;
        }
        if (!Number.isFinite(this.Diamond)) this.Diamond = config.InitialDiamond;
        if (!Number.isFinite(this.RecruitCardCount)) this.RecruitCardCount = 0;
        this.PhysicalPower = Math.max(0, Math.floor(this.PhysicalPower));
        this.Diamond = Math.max(0, Math.floor(this.Diamond));
        this.RecruitCardCount = Math.max(0, Math.floor(this.RecruitCardCount));
        if (!Array.isArray(this.GameData)) this.GameData = [];
        this.GameData[0] = Number.isFinite(this.GameData[0])
            ? Math.max(0, Math.floor(this.GameData[0]))
            : 0;
        if (!Array.isArray(this.SignInClaimedDays)) this.SignInClaimedDays = [];
        this.SignInClaimedDays = WZSJZ_Constant.SignIn.Rewards.map(
            (_, index) => this.SignInClaimedDays[index] === 1 ? 1 : 0,
        );
        if (typeof this.HookRewardDate !== "string") this.HookRewardDate = "";
        if (!Number.isFinite(this.HookClaimedCount)) this.HookClaimedCount = 0;
        if (!Number.isFinite(this.HookChestStartTimestamp)) this.HookChestStartTimestamp = 0;
        this.HookClaimedCount = Math.max(
            0,
            Math.min(
                WZSJZ_Constant.Hook.DiamondRewards.length,
                Math.floor(this.HookClaimedCount),
            ),
        );
        if (this.PhysicalPower >= config.MaxPhysicalPower) {
            this.PhysicalPowerRecoverTimestamp = 0;
        } else if (!Number.isFinite(this.PhysicalPowerRecoverTimestamp)
            || this.PhysicalPowerRecoverTimestamp <= 0
            || this.PhysicalPowerRecoverTimestamp > nowTimestamp) {
            this.PhysicalPowerRecoverTimestamp = nowTimestamp;
        }
    }

    private NormalizeLevelProgressData(): void {
        this.HighestClearedLevel = Number.isFinite(this.HighestClearedLevel)
            ? Math.max(0, Math.floor(this.HighestClearedLevel))
            : 0;
        this.SelectedLevel = Number.isFinite(this.SelectedLevel)
            ? Math.max(1, Math.floor(this.SelectedLevel))
            : 1;
        this.SelectedLevel = Math.min(
            this.SelectedLevel,
            this.HighestClearedLevel + 2,
        );
    }

    private RefreshSignInDate(now: Date): void {
        if (!Array.isArray(this.TimeDate)) this.TimeDate = [];
        const year = now.getFullYear();
        const month = now.getMonth() + 1;
        const date = now.getDate();
        let changed = false;
        if (year !== this.TimeDate[0] || month !== this.TimeDate[1]
            || date !== this.TimeDate[2]) {
            this.TimeDate[0] = year;
            this.TimeDate[1] = month;
            this.TimeDate[2] = date;
            this.TimeDate[3] = 1;
            changed = true;
        }
        // 第七天领取后保持全已领取；直到第八天首次刷新才开启新一轮第一天。
        if (this.TimeDate[3] === 1
            && this.SignInClaimedDays.length === WZSJZ_Constant.SignIn.Rewards.length
            && this.SignInClaimedDays.indexOf(0) < 0) {
            for (let index = 0; index < this.SignInClaimedDays.length; index++) {
                this.SignInClaimedDays[index] = 0;
            }
            changed = true;
        }
        if (changed) WZSJZ_GameData.DateSave();
    }

    /** 跨本地自然日时清空领取状态；第一档从发现新日期的时刻开始计时。 */
    private RefreshHookDate(nowTimestamp: number): void {
        const now = new Date(nowTimestamp);
        const dateKey = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
        let changed = false;
        if (this.HookRewardDate !== dateKey) {
            this.HookRewardDate = dateKey;
            this.HookClaimedCount = 0;
            this.HookChestStartTimestamp = nowTimestamp;
            changed = true;
        } else if (this.HookClaimedCount < WZSJZ_Constant.Hook.DiamondRewards.length
            && (this.HookChestStartTimestamp <= 0
                || this.HookChestStartTimestamp > nowTimestamp)) {
            this.HookChestStartTimestamp = nowTimestamp;
            changed = true;
        } else if (this.HookClaimedCount >= WZSJZ_Constant.Hook.DiamondRewards.length
            && this.HookChestStartTimestamp !== 0) {
            this.HookChestStartTimestamp = 0;
            changed = true;
        }
        if (changed) {
            WZSJZ_GameData.DateSave();
            WZSJZ_EventManager.EmitScene(
                WZSJZ_EventManager.挂机宝箱变动,
                this.GetHookSnapshotWithoutRefresh(nowTimestamp),
            );
        }
    }

    /** RefreshHookDate内部广播使用，避免再次进入日期刷新。 */
    private GetHookSnapshotWithoutRefresh(nowTimestamp: number): any {
        const rewards = WZSJZ_Constant.Hook.DiamondRewards;
        const allClaimed = this.HookClaimedCount >= rewards.length;
        const currentIndex = allClaimed ? rewards.length - 1 : this.HookClaimedCount;
        const durationMs = WZSJZ_Constant.Hook.ChestDurationSeconds * 1000;
        const elapsedMs = allClaimed
            ? durationMs
            : Math.max(0, nowTimestamp - this.HookChestStartTimestamp);
        return {
            Claimed: rewards.map((_, index) => index < this.HookClaimedCount),
            CurrentIndex: currentIndex,
            CurrentLevel: currentIndex + 1,
            Reward: rewards[currentIndex] || 0,
            Progress: Math.max(0, Math.min(1, elapsedMs / durationMs)),
            RemainingSeconds: allClaimed
                ? 0
                : Math.max(0, Math.ceil((durationMs - elapsedMs) / 1000)),
            CanClaim: !allClaimed && elapsedMs >= durationMs,
            AllClaimed: allClaimed,
        };
    }

    //存档版本升级
    DataUp() {
        if (this.versions == WZSJZ_GameData.Maxversions) {
            return;
        }
        switch (this.versions) {
            case 1:

                break;
        }
        console.log("存档版本已升级！");
        WZSJZ_GameData.DateSave();
        if (this.versions < WZSJZ_GameData.Maxversions) {
            this.DataUp();
        }
    }
}
