import {
    _decorator,
    Component,
    EventTouch,
    Label,
    Node,
    Sprite,
    SpriteFrame,
    sp,
    Vec3,
} from 'cc';
import { WZSJZ_Cell } from './WZSJZ_Cell';
import { WZSJZ_Constant } from './WZSJZ_Constant';
import { WZSJZ_CombatSystem } from './WZSJZ_CombatSystem';
import { WZSJZ_GameManager } from './WZSJZ_GameManager';
import { WZSJZ_Incident } from './WZSJZ_Incident';
import { WZSJZ_ShieldBrotherCombatSystem } from './WZSJZ_ShieldBrotherCombatSystem';
const { ccclass, property } = _decorator;

@ccclass('WZSJZ_GameNode')
export class WZSJZ_GameNode extends Component {
    @property({ displayName: "物资类型" })
    public Name: string = "";

    @property({ displayName: "等级", min: 1 })
    public Level: number = 1;

    @property({ displayName: "经验值", min: 0 })
    public Exp: number = 0;

    public CurrentCell: WZSJZ_Cell = null;
    private _dragStartWorldPosition: Vec3 = new Vec3();
    private _dragStartUIPosition: Vec3 = new Vec3();
    private _isDragging: boolean = false;
    private _attackCooldown: number = 0;
    private _combinationChildStates: Map<Node, boolean> = null;
    private _experienceReceiver: ((amount: number) => void) = null;
    private _isCombinationDisplay: boolean = false;

    public get IsDragging(): boolean {
        return this._isDragging;
    }

    protected onEnable(): void {
        this.node.on(Node.EventType.TOUCH_START, this.OnTouchStart, this);
        this.node.on(Node.EventType.TOUCH_MOVE, this.OnTouchMove, this);
        this.node.on(Node.EventType.TOUCH_END, this.OnTouchEnd, this);
        this.node.on(Node.EventType.TOUCH_CANCEL, this.OnTouchEnd, this);
        this.SetUpgradeHint(false);
        this.RefreshView();
        this.PlayInitialIdleAnimation();
    }

    protected onDestroy(): void {
        // 合成、回收等操作直接销毁“雷”时，也要同步清理它布置的地雷。
        if (this.Name === "雷") {
            WZSJZ_CombatSystem.Instance?.RemoveMinesByOwner(this);
        }
    }

    public Init(cell: WZSJZ_Cell, level: number = 1): void {
        this.CurrentCell = cell;
        this.Level = Math.max(1, level);
        this.Exp = 0;
        this.RefreshView();
    }

    public CanUpgrade(): boolean {
        const config = WZSJZ_Constant.GetMaterialConfig(this.Name);
        return !!config && this.Level < config.MaxLevel;
    }

    public Upgrade(): boolean {
        if (!this.CanUpgrade()) {
            return false;
        }
        this.Level++;
        this.Exp = 0;
        this.RefreshView();
        return true;
    }

    /** 名字单位获得经验；允许一次经验跨越多个等级。 */
    public AddExperience(amount: number): number {
        const safeAmount = Math.max(0, amount);
        if (safeAmount <= 0) {
            return 0;
        }
        if (this._experienceReceiver) {
            this._experienceReceiver(safeAmount);
            return 0;
        }

        const config = WZSJZ_Constant.GetMaterialConfig(this.Name);
        if (!config?.IsNameUnit || !this.CanUpgrade()) {
            return 0;
        }

        const oldLevel = this.Level;
        this.Exp += safeAmount;
        while (this.CanUpgrade()) {
            const requirement = WZSJZ_Constant.GetNameUnitExperienceRequirement(this.Level);
            if (requirement <= 0 || this.Exp < requirement) {
                break;
            }
            this.Exp -= requirement;
            this.Level++;
        }
        if (this.Level !== oldLevel) {
            this.RefreshView();
        }
        return this.Level - oldLevel;
    }

    public SetExperienceReceiver(receiver: ((amount: number) => void) | null): void {
        this._experienceReceiver = receiver;
    }

    public SetCombinationDisplay(isCombinationDisplay: boolean): void {
        this._isCombinationDisplay = isCombinationDisplay;
    }

    /** 投掷物发射时保存经验去向，组合体之后被拆开也能把击杀经验发回原文字。 */
    public CreateExperienceReceiver(): (amount: number) => void {
        if (this._experienceReceiver) {
            return this._experienceReceiver;
        }
        return (amount: number): void => {
            if (this.node?.isValid) {
                this.AddExperience(amount);
            }
        };
    }

    public SetDisplayLevel(level: number): void {
        const config = WZSJZ_Constant.GetMaterialConfig(this.Name);
        this.Level = Math.max(1, Math.min(Math.floor(level), config?.MaxLevel || level));
        this.RefreshView();
    }

    /** 组合时只隐藏子显示，不停用根节点，避免重复注册触摸监听。 */
    public SetCombinationHidden(hidden: boolean): void {
        if (hidden) {
            if (this._combinationChildStates) {
                return;
            }
            this._combinationChildStates = new Map<Node, boolean>();
            for (const child of this.node.children) {
                this._combinationChildStates.set(child, child.active);
                child.active = false;
            }
            return;
        }
        if (!this._combinationChildStates) {
            return;
        }
        for (const [child, wasActive] of this._combinationChildStates) {
            if (child?.isValid) {
                child.active = wasActive;
            }
        }
        this._combinationChildStates = null;
    }

    public BeginExternalDrag(event: EventTouch): void {
        this.BeginDragging(event);
    }

    public MoveExternalDrag(event: EventTouch): void {
        this.MoveDragging(event);
    }

    public EndExternalDrag(event: EventTouch): void {
        this.EndDragging(event);
    }

    /** 开始游戏后可直接读取该值进行每秒资源结算。 */
    public GetProductionPerSecond(): number {
        return WZSJZ_Constant.GetMaterialLevelConfig(this.Name, this.Level)
            ?.ProductionPerSecond || 0;
    }

    public GetMaxHealth(): number {
        return WZSJZ_Constant.GetMaterialLevelConfig(this.Name, this.Level)
            ?.MaxHealth || 0;
    }

    protected update(deltaTime: number): void {
        if (this.Name === "枪") {
            WZSJZ_CombatSystem.Instance?.UpdateGun(this, deltaTime);
        } else if (this.Name === "刀") {
            WZSJZ_CombatSystem.Instance?.UpdateKnife(this, deltaTime);
        } else if (this.Name === "炮") {
            WZSJZ_CombatSystem.Instance?.UpdateCannon(this, deltaTime);
        } else if (this.Name === "雷") {
            WZSJZ_CombatSystem.Instance?.UpdateMineLayer(this, deltaTime);
        } else if (this.Name === "盾哥") {
            WZSJZ_ShieldBrotherCombatSystem.Instance?.UpdateShieldBrother(this, deltaTime);
        }
    }

    public ReduceAttackCooldown(deltaTime: number): void {
        this._attackCooldown = Math.max(0, this._attackCooldown - deltaTime);
    }

    public IsAttackReady(): boolean {
        return this._attackCooldown <= 0;
    }

    public StartAttackCooldown(interval: number): void {
        this._attackCooldown = Math.max(0, interval);
    }

    public ResetAttackCooldown(): void {
        this._attackCooldown = 0;
    }

    public SetUpgradeHint(active: boolean): void {
        const hint = this.node.getChildByName("可升级提示");
        if (hint) {
            hint.active = active;
        }
    }

    public RefreshView(): void {
        const levelNode = this.node.getChildByName(`${this.Name}等级`);
        const label = levelNode ? levelNode.getComponentInChildren(Label) : this.node.getComponentInChildren(Label);
        if (label) {
            label.string = this.Level.toString();
        }
        this.RefreshMaterialSprite();
    }

    /** 攻击单位在开战前也保持待机表现；是否攻击仍由战斗系统控制。 */
    private PlayInitialIdleAnimation(): void {
        const levelConfig = WZSJZ_Constant.GetMaterialLevelConfig(this.Name, this.Level);
        const materialConfig = WZSJZ_Constant.GetMaterialConfig(this.Name);
        if (!levelConfig?.AttackDamage && !materialConfig?.IsNameUnit) {
            return;
        }
        this.node.getChildByName("图像")
            ?.getComponent(sp.Skeleton)
            ?.setAnimation(0, "daiji", true);
    }

    private async RefreshMaterialSprite(): Promise<void> {
        const levelConfig = WZSJZ_Constant.GetMaterialLevelConfig(this.Name, this.Level);
        const imageNode = this.node.getChildByName("图像");
        const sprite = imageNode?.getComponent(Sprite);
        if (!levelConfig) {
            console.warn(`[WZSJZ] ${this.Name} 缺少等级配置或“图像”Sprite。`);
            return;
        }
        // Spine表现的战斗物资不需要按等级替换SpriteFrame。
        if (!sprite || !levelConfig.SpritePath) {
            return;
        }

        const requestedLevel = this.Level;
        const spriteFrame = await WZSJZ_Incident.LoadSprite(levelConfig.SpritePath) as SpriteFrame;
        if (spriteFrame && this.node.isValid && this.Level === requestedLevel) {
            sprite.spriteFrame = spriteFrame;
        }
    }

    private OnTouchStart(event: EventTouch): void {
        if (this._isCombinationDisplay) {
            return;
        }
        this.BeginDragging(event);
    }

    private BeginDragging(event: EventTouch): void {
        const manager = WZSJZ_GameManager.Instance;
        if (!manager
            || !this.CurrentCell
            || !this.CurrentCell.IsUnlocked
            || !manager.CanBeginDrag(this)) {
            return;
        }

        this._isDragging = true;
        this._dragStartWorldPosition.set(this.node.worldPosition);
        const start = event.getUILocation();
        this._dragStartUIPosition.set(start.x, start.y, 0);
        this.node.setSiblingIndex(this.node.parent.children.length - 1);
        manager.BeginDrag(this);
    }

    private OnTouchMove(event: EventTouch): void {
        this.MoveDragging(event);
    }

    private MoveDragging(event: EventTouch): void {
        if (!this._isDragging) {
            return;
        }

        const current = event.getUILocation();
        this.node.setWorldPosition(
            this._dragStartWorldPosition.x + current.x - this._dragStartUIPosition.x,
            this._dragStartWorldPosition.y + current.y - this._dragStartUIPosition.y,
            this._dragStartWorldPosition.z
        );
    }

    private OnTouchEnd(event: EventTouch): void {
        this.EndDragging(event);
    }

    private EndDragging(event: EventTouch): void {
        if (!this._isDragging) {
            return;
        }

        this._isDragging = false;
        WZSJZ_GameManager.Instance?.EndDrag(this, event.getUILocation());
    }
}
