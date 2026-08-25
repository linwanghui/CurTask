import { _decorator, Color, Component, Graphics, Node, UITransform, Vec3 } from 'cc';
import { ZRSJZ_PoolManager } from '../Manager/ZRSJZ_PoolManager';
import { ZRSJZ_Bombing } from '../Skill/ZRSJZ_Bombing';
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_BombPlot')
export class ZRSJZ_BombPlot extends Component {
    @property({ displayName: "轰炸区半径", min: 1 })
    Radius: number = 3000;

    @property({ displayName: "轰炸前预警时间（秒）", min: 0 })
    WarningDuration: number = 5;

    @property({ displayName: "持续轰炸时间（秒）", min: 0.1 })
    BombingDuration: number = 25;

    @property({ displayName: "最短投弹间隔（秒）", min: 0.1 })
    MinBombInterval: number = 0.6;

    @property({ displayName: "最长投弹间隔（秒）", min: 0.1 })
    MaxBombInterval: number = 1.4;

    @property({ displayName: "单次轰炸伤害", min: 0 })
    BombDamage: number = 30;

    private _effectParent: Node = null;
    private _finishCallback: () => void = null;
    private _running: boolean = false;
    private _deployVersion: number = 0;
    private readonly _dropWorldPosition: Vec3 = new Vec3();

    public get IsRunning(): boolean {
        return this._running && this.node?.isValid && this.node.activeInHierarchy;
    }

    public get CenterWorldPosition(): Readonly<Vec3> {
        return this.node.worldPosition;
    }

    /**
     * 在地图可用范围内均匀随机一个中心点，并启动预警与轰炸。
     * 中心会尽量向内收缩 Radius，保证完整轰炸圆位于地图范围内。
     */
    public DeployRandom(gameMap: Node, effectParent: Node, onFinished: () => void = null): boolean {
        const mapTransform = gameMap?.getComponent(UITransform);
        if (!mapTransform || !effectParent?.isValid) {
            console.warn("[ZRSJZ_BombPlot] 地图或特效父节点无效，无法生成轰炸区");
            return false;
        }

        const bounds = mapTransform.getBoundingBoxToWorld();
        if (bounds.width <= 0 || bounds.height <= 0) return false;

        this.unscheduleAllCallbacks();
        const version = ++this._deployVersion;
        this._effectParent = effectParent;
        this._finishCallback = onFinished;
        this._running = true;

        const radius = Math.max(1, this.Radius);
        const insetX = Math.min(radius, bounds.width * 0.5);
        const insetY = Math.min(radius, bounds.height * 0.5);
        const availableWidth = Math.max(0, bounds.width - insetX * 2);
        const availableHeight = Math.max(0, bounds.height - insetY * 2);
        this.node.setWorldPosition(
            bounds.x + insetX + Math.random() * availableWidth,
            bounds.y + insetY + Math.random() * availableHeight,
            gameMap.worldPosition.z,
        );
        this.node.active = true;
        this.DrawRange();

        this.scheduleOnce(() => {
            if (version !== this._deployVersion || !this.IsRunning) return;
            this.BeginBombing(version);
        }, Math.max(0, this.WarningDuration));
        return true;
    }

    private BeginBombing(version: number): void {
        void this.DropBomb(version);
        this.scheduleOnce(() => {
            if (version === this._deployVersion) this.Finish();
        }, Math.max(0.1, this.BombingDuration));
    }

    /** 使用 sqrt(random) 取半径，使炸点在圆形面积内均匀分布，而不是挤在圆心。 */
    private async DropBomb(version: number): Promise<void> {
        if (version !== this._deployVersion || !this.IsRunning) return;

        const angle = Math.random() * Math.PI * 2;
        const distance = Math.sqrt(Math.random()) * Math.max(1, this.Radius);
        const center = this.node.worldPosition;
        this._dropWorldPosition.set(
            center.x + Math.cos(angle) * distance,
            center.y + Math.sin(angle) * distance,
            center.z,
        );

        const bombNode = await ZRSJZ_PoolManager.Instance.GetNode("Prefabs/Effect/轰炸");
        if (!bombNode) {
            console.error("[ZRSJZ_BombPlot] 加载轰炸预制体失败");
        } else if (version !== this._deployVersion || !this.IsRunning || !this._effectParent?.isValid) {
            ZRSJZ_PoolManager.Instance.PutNode(bombNode);
            return;
        } else {
            bombNode.active = false;
            bombNode.parent = this._effectParent;
            const bombing = bombNode.getComponent(ZRSJZ_Bombing);
            if (!bombing) {
                console.error("[ZRSJZ_BombPlot] 轰炸预制体缺少 ZRSJZ_Bombing 组件");
                ZRSJZ_PoolManager.Instance.PutNode(bombNode);
            } else {
                bombing.SkillDamage = Math.max(0, this.BombDamage);
                bombing.Show(this._dropWorldPosition);
            }
        }

        if (version !== this._deployVersion || !this.IsRunning) return;
        const minInterval = Math.max(0.1, Math.min(this.MinBombInterval, this.MaxBombInterval));
        const maxInterval = Math.max(minInterval, this.MinBombInterval, this.MaxBombInterval);
        this.scheduleOnce(() => void this.DropBomb(version),
            minInterval + Math.random() * (maxInterval - minInterval));
    }

    private DrawRange(): void {
        const graphics = this.getComponent(Graphics) ?? this.addComponent(Graphics);
        graphics.clear();
        graphics.lineWidth = 30;
        graphics.strokeColor = new Color(255, 45, 45, 210);
        graphics.fillColor = new Color(255, 35, 35, 35);
        graphics.circle(0, 0, Math.max(1, this.Radius));
        graphics.fill();
        graphics.stroke();
    }

    private Finish(): void {
        if (!this._running) return;
        this._running = false;
        ++this._deployVersion;
        this.unscheduleAllCallbacks();
        const callback = this._finishCallback;
        this._finishCallback = null;
        this._effectParent = null;
        callback?.();
        ZRSJZ_PoolManager.Instance.PutNode(this.node);
    }

}


