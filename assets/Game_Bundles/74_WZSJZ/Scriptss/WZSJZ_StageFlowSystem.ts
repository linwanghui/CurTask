import {
    _decorator,
    Component,
    director,
    Label,
    Node,
    tween,
    Tween,
    UITransform,
    Vec3,
    Widget,
} from 'cc';
import { WZSJZ_Boss } from './WZSJZ_Boss';
import { WZSJZ_CombatSystem } from './WZSJZ_CombatSystem';
import { WZSJZ_Constant } from './WZSJZ_Constant';
import { WZSJZ_Enemy } from './WZSJZ_Enemy';
import { WZSJZ_EventManager } from './WZSJZ_EventManager';
import { WZSJZ_GameData } from './WZSJZ_GameData';
import { WZSJZ_UIManager } from './WZSJZ_UIManager';
import { WZSJZ_Wall } from './WZSJZ_Wall';

const { ccclass } = _decorator;
type StageState = "preparation" | "spawning" | "combat" | "retreat" | "victory";

/** 单局回合状态机：备战、出怪、Boss倒计时、逃跑以及胜利结算。 */
@ccclass('WZSJZ_StageFlowSystem')
export class WZSJZ_StageFlowSystem extends Component {
    private _canvas: Node = null;
    private _preparationZone: Node = null;
    private _startButton: Node = null;
    private _countdownRoot: Node = null;
    private _countdownLabel: Label = null;
    private _skillBarWidget: Widget = null;
    private _skillBarPreparationBottom: number = 0;
    private _combatSystem: WZSJZ_CombatSystem = null;
    private _wall: WZSJZ_Wall = null;
    private _boss: WZSJZ_Boss = null;
    private _state: StageState = "preparation";
    private _round: number = 1;
    private _remainingTime: number = 0;
    private _flowToken: number = 0;
    private _currentCombatDuration: number = WZSJZ_Constant.StageFlow.CombatDuration;
    private _getAdditionalCombatDuration: (() => number) = null;
    private _preparationHomePosition: Vec3 = new Vec3();
    private _preparationOffscreenPosition: Vec3 = new Vec3();

    public get CanStartRound(): boolean {
        return this._state === "preparation";
    }

    public Configure(
        canvas: Node,
        preparationZone: Node,
        combatSystem: WZSJZ_CombatSystem,
        getAdditionalCombatDuration?: () => number,
    ): void {
        this._canvas = canvas;
        this._preparationZone = preparationZone;
        this._combatSystem = combatSystem;
        this._getAdditionalCombatDuration = getAdditionalCombatDuration || null;
        this._startButton = canvas?.getChildByName("开始游戏") || null;
        this._countdownRoot = canvas?.getChildByPath("数据栏/时间") || null;
        this._countdownLabel = this._countdownRoot
            ?.getChildByName("数量")
            ?.getComponent(Label) || null;
        this._skillBarWidget = canvas
            ?.getChildByName("技能栏")
            ?.getComponent(Widget) || null;
        this._skillBarPreparationBottom = this._skillBarWidget?.bottom || 0;
        if (preparationZone) {
            this._preparationHomePosition.set(preparationZone.position);
            this.CalculateOffscreenPosition();
        }
        this._countdownRoot && (this._countdownRoot.active = false);
        this.node.emit(WZSJZ_EventManager.战斗阶段变动, false);
        this.node.on(WZSJZ_EventManager.敌人死亡, this.OnEnemyDied, this);
        this.node.on(WZSJZ_EventManager.Boss逃跑, this.OnBossEscaped, this);
    }

    public StartRound(wall: WZSJZ_Wall): boolean {
        if (!this.CanStartRound || !wall?.IsAlive || !this._combatSystem) return false;
        this._wall = wall;
        this._state = "spawning";
        this._boss = null;
        this._remainingTime = 0;
        this._currentCombatDuration = WZSJZ_Constant.StageFlow.CombatDuration
            + Math.max(0, this._getAdditionalCombatDuration?.() || 0);
        this._flowToken++;
        const token = this._flowToken;
        if (this._startButton) this._startButton.active = false;
        if (this._countdownRoot) this._countdownRoot.active = false;
        this.node.emit(WZSJZ_EventManager.回合公告, "Boss来袭");
        this.node.emit(WZSJZ_EventManager.战斗阶段变动, true);
        this.TweenPreparation(false, () => {
            if (token === this._flowToken && this._state === "spawning") {
                void this.SpawnRound(token);
            }
        });
        this.TweenSkillBar(true);
        return true;
    }

    protected update(deltaTime: number): void {
        if (this._state !== "combat" || !this._boss?.IsAlive) return;
        this._remainingTime = Math.max(0, this._remainingTime - Math.max(0, deltaTime));
        this.RefreshCountdown();
        if (this._remainingTime <= 0) this.BeginBossRetreat();
    }

    private async SpawnRound(token: number): Promise<void> {
        const ready = await this._combatSystem.PrepareStageEnemyPrefabs();
        if (!ready || token !== this._flowToken || this._state !== "spawning") {
            if (!ready) this.AbortToPreparation("敌人资源加载失败");
            return;
        }
        const progress = WZSJZ_GameData.Instance.GetLevelProgressSnapshot();
        const campaignMultiplier = WZSJZ_Constant.GetCampaignAttributeMultiplier(
            progress.SelectedLevel,
        );
        for (let index = 0; index < WZSJZ_Constant.StageFlow.NormalEnemyCount; index++) {
            if (token !== this._flowToken || this._state !== "spawning") return;
            this._combatSystem.SpawnStageNormalEnemy(campaignMultiplier);
            if (index + 1 < WZSJZ_Constant.StageFlow.NormalEnemyCount) {
                await this.Delay(WZSJZ_Constant.StageFlow.NormalEnemySpawnInterval);
            }
        }
        await this.Delay(WZSJZ_Constant.StageFlow.BossSpawnDelay);
        if (token !== this._flowToken || this._state !== "spawning") return;
        // 关卡循环与单局Boss升级均为线性加成，避免无限关卡下出现复利爆炸。
        const bossMultiplier = campaignMultiplier
            + WZSJZ_Constant.GetBossRoundAttributeMultiplier(this._round)
            - 1;
        const boss = await this._combatSystem.SpawnStageBoss(
            progress.BossName,
            bossMultiplier,
        );
        if (!boss || token !== this._flowToken || this._state !== "spawning") {
            if (!boss) this.AbortToPreparation("Boss资源加载失败");
            return;
        }
        this._boss = boss;
        this._remainingTime = this._currentCombatDuration;
        this._state = "combat";
        if (this._countdownRoot) this._countdownRoot.active = true;
        this.RefreshCountdown();
    }

    private BeginBossRetreat(): void {
        if (this._state !== "combat" || !this._boss?.IsAlive) return;
        this._state = "retreat";
        this._remainingTime = 0;
        this.RefreshCountdown();
        if (!this._boss.BeginRetreat()) this.AbortToPreparation();
    }

    private OnEnemyDied = (enemy: WZSJZ_Enemy): void => {
        if (enemy !== this._boss
            || (this._state !== "combat" && this._state !== "retreat")) return;
        this._state = "victory";
        this._flowToken++;
        this.node.emit(WZSJZ_EventManager.战斗阶段变动, false);
        this._combatSystem.ClearStageEnemies(enemy);
        if (this._countdownRoot) this._countdownRoot.active = false;
        WZSJZ_GameData.Instance.CompleteLevel(WZSJZ_GameData.Instance.SelectedLevel);
        WZSJZ_UIManager.Instance.ShowText("关卡通过");
        this.scheduleOnce(() => director.loadScene("WZSJZ_Start"),
            WZSJZ_Constant.StageFlow.VictoryReturnDelay);
    };

    private OnBossEscaped = (boss: WZSJZ_Enemy): void => {
        if (boss !== this._boss || this._state !== "retreat") return;
        this._flowToken++;
        this._boss = null;
        this._combatSystem.ClearStageEnemies(boss);
        this._round++;
        this.node.emit(WZSJZ_EventManager.回合公告, "Boss暂退");
        this.ReturnToPreparation();
    };

    private ReturnToPreparation(): void {
        this._state = "preparation";
        this.node.emit(WZSJZ_EventManager.战斗阶段变动, false);
        if (this._countdownRoot) this._countdownRoot.active = false;
        this.TweenSkillBar(false);
        this.TweenPreparation(true, () => {
            if (this._state === "preparation" && this._startButton) {
                this._startButton.active = true;
            }
        });
    }

    private AbortToPreparation(message: string = ""): void {
        this._flowToken++;
        this._combatSystem?.ClearStageEnemies();
        this._boss = null;
        if (message) WZSJZ_UIManager.Instance.ShowText(message);
        this.ReturnToPreparation();
    }

    private TweenPreparation(show: boolean, completed?: () => void): void {
        if (!this._preparationZone?.isValid) {
            completed?.();
            return;
        }
        Tween.stopAllByTarget(this._preparationZone);
        tween(this._preparationZone)
            .to(
                WZSJZ_Constant.StageFlow.PreparationTweenDuration,
                { position: show
                    ? this._preparationHomePosition.clone()
                    : this._preparationOffscreenPosition.clone() },
                { easing: show ? "backOut" : "quadIn" },
            )
            .call(() => completed?.())
            .start();
    }

    private TweenSkillBar(combatPosition: boolean): void {
        const widget = this._skillBarWidget;
        if (!widget?.node?.isValid) return;
        Tween.stopAllByTarget(widget);
        tween(widget)
            .to(
                WZSJZ_Constant.StageFlow.PreparationTweenDuration,
                { bottom: combatPosition
                    ? WZSJZ_Constant.StageFlow.SkillBarCombatBottom
                    : this._skillBarPreparationBottom },
                {
                    easing: combatPosition ? "quadOut" : "backOut",
                    onUpdate: () => widget.updateAlignment(),
                },
            )
            .call(() => widget.updateAlignment())
            .start();
    }

    private CalculateOffscreenPosition(): void {
        this._preparationOffscreenPosition.set(this._preparationHomePosition);
        const canvasTransform = this._canvas?.getComponent(UITransform);
        const preparationTransform = this._preparationZone?.getComponent(UITransform);
        if (!canvasTransform || !preparationTransform) {
            this._preparationOffscreenPosition.y -= 500;
            return;
        }
        const canvasBottom = -canvasTransform.contentSize.height
            * canvasTransform.anchorPoint.y;
        const preparationTopOffset = preparationTransform.contentSize.height
            * (1 - preparationTransform.anchorPoint.y);
        this._preparationOffscreenPosition.y = canvasBottom
            - preparationTopOffset
            - WZSJZ_Constant.StageFlow.PreparationOffscreenMargin;
    }

    private RefreshCountdown(): void {
        if (!this._countdownLabel) return;
        const seconds = Math.max(0, Math.ceil(this._remainingTime));
        const minutes = Math.floor(seconds / 60);
        this._countdownLabel.string
            = `${minutes.toString().padStart(2, "0")}:${(seconds % 60)
                .toString().padStart(2, "0")}`;
    }

    private Delay(seconds: number): Promise<void> {
        return new Promise((resolve) => this.scheduleOnce(resolve, Math.max(0, seconds)));
    }
}
