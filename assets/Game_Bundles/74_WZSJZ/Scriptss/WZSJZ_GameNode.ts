import {
    _decorator,
    Component,
    EventTouch,
    Label,
    Node,
    Sprite,
    SpriteFrame,
    Vec3,
} from 'cc';
import { WZSJZ_Cell } from './WZSJZ_Cell';
import { WZSJZ_Constant } from './WZSJZ_Constant';
import { WZSJZ_GameManager } from './WZSJZ_GameManager';
import { WZSJZ_Incident } from './WZSJZ_Incident';
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

    protected onEnable(): void {
        this.node.on(Node.EventType.TOUCH_START, this.OnTouchStart, this);
        this.node.on(Node.EventType.TOUCH_MOVE, this.OnTouchMove, this);
        this.node.on(Node.EventType.TOUCH_END, this.OnTouchEnd, this);
        this.node.on(Node.EventType.TOUCH_CANCEL, this.OnTouchEnd, this);
        this.SetUpgradeHint(false);
        this.RefreshView();
    }

    protected onDisable(): void {
        this.node.off(Node.EventType.TOUCH_START, this.OnTouchStart, this);
        this.node.off(Node.EventType.TOUCH_MOVE, this.OnTouchMove, this);
        this.node.off(Node.EventType.TOUCH_END, this.OnTouchEnd, this);
        this.node.off(Node.EventType.TOUCH_CANCEL, this.OnTouchEnd, this);
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

    /** 开始游戏后可直接读取该值进行每秒资源结算。 */
    public GetProductionPerSecond(): number {
        return WZSJZ_Constant.GetMaterialLevelConfig(this.Name, this.Level)
            ?.ProductionPerSecond || 0;
    }

    public GetMaxHealth(): number {
        return WZSJZ_Constant.GetMaterialLevelConfig(this.Name, this.Level)
            ?.MaxHealth || 0;
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

    private async RefreshMaterialSprite(): Promise<void> {
        const levelConfig = WZSJZ_Constant.GetMaterialLevelConfig(this.Name, this.Level);
        const imageNode = this.node.getChildByName("图像");
        const sprite = imageNode?.getComponent(Sprite);
        if (!levelConfig || !sprite) {
            console.warn(`[WZSJZ] ${this.Name} 缺少等级配置或“图像”Sprite。`);
            return;
        }

        const requestedLevel = this.Level;
        const spriteFrame = await WZSJZ_Incident.LoadSprite(levelConfig.SpritePath) as SpriteFrame;
        if (spriteFrame && this.node.isValid && this.Level === requestedLevel) {
            sprite.spriteFrame = spriteFrame;
        }
    }

    private OnTouchStart(event: EventTouch): void {
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
        if (!this._isDragging) {
            return;
        }

        this._isDragging = false;
        WZSJZ_GameManager.Instance?.EndDrag(this, event.getUILocation());
    }
}
