import { _decorator, Component, Node, UITransform, Vec3 } from 'cc';
import { ZRSJZ_PoolManager } from '../Manager/ZRSJZ_PoolManager';
import { ZRSJZ_Bombing } from '../Skill/ZRSJZ_Bombing';
import { ZRSJZ_AudioManager } from '../Manager/ZRSJZ_AudioManager';
const { ccclass, property } = _decorator;

export interface ZRSJZ_BombPlotDropOptions {
    DropRadius?: number;
    MinBombInterval?: number;
    MaxBombInterval?: number;
    GetDropCenter?: () => Readonly<Vec3> | null;
}

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
    private _currentBombingDuration: number = 0;
    private _currentDropRadius: number = 0;
    private _currentMinBombInterval: number = 0;
    private _currentMaxBombInterval: number = 0;
    private _getDropCenter: (() => Readonly<Vec3> | null) = null;
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
        this._currentBombingDuration = Math.max(0.1, this.BombingDuration);
        this.SetDropOptions();

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

        this.scheduleOnce(() => {
            if (version !== this._deployVersion || !this.IsRunning) return;
            this.BeginBombing(version);
        }, Math.max(0, this.WarningDuration));
        return true;
    }

    /** 在指定世界坐标生成轰炸区；特别行动用它将圆心精确放到接取玩家脚下。 */
    public DeployAtWorldPosition(
        worldPosition: Readonly<Vec3>,
        gameMap: Node,
        effectParent: Node,
        bombingDuration: number,
        onFinished: () => void = null,
        dropOptions: Readonly<ZRSJZ_BombPlotDropOptions> = null,
    ): boolean {
        const mapTransform = gameMap?.getComponent(UITransform);
        if (!mapTransform || !effectParent?.isValid || !worldPosition) return false;

        this.unscheduleAllCallbacks();
        const version = ++this._deployVersion;
        this._effectParent = effectParent;
        this._finishCallback = onFinished;
        this._running = true;
        this._currentBombingDuration = Math.max(0.1, bombingDuration);
        this.SetDropOptions(dropOptions);
        this.node.setWorldPosition(worldPosition.x, worldPosition.y, gameMap.worldPosition.z);
        this.node.active = true;
        ZRSJZ_AudioManager.Instance.PlaySound("轰炸机");
        this.scheduleOnce(() => {
            if (version !== this._deployVersion || !this.IsRunning) return;
            this.BeginBombing(version);
        }, Math.max(0, this.WarningDuration));
        return true;
    }

    /** 立即删除当前轰炸区，不执行自然结束回调。 */
    public Cancel(): void {
        if (!this.node?.isValid) return;
        this._running = false;
        ++this._deployVersion;
        this.unscheduleAllCallbacks();
        this._finishCallback = null;
        this._effectParent = null;
        this._getDropCenter = null;
        ZRSJZ_PoolManager.Instance.PutNode(this.node);
    }

    private BeginBombing(version: number): void {
        void this.DropBomb(version);
        this.scheduleOnce(() => {
            if (version === this._deployVersion) this.Finish();
        }, Math.max(0.1, this._currentBombingDuration || this.BombingDuration));
    }

    /** 使用 sqrt(random) 取半径，使炸点在圆形面积内均匀分布，而不是挤在圆心。 */
    private async DropBomb(version: number): Promise<void> {
        if (version !== this._deployVersion || !this.IsRunning) return;

        const angle = Math.random() * Math.PI * 2;
        const distance = Math.sqrt(Math.random()) * this._currentDropRadius;
        const center = this._getDropCenter?.() ?? this.node.worldPosition;
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
        this.scheduleOnce(() => void this.DropBomb(version),
            this._currentMinBombInterval
            + Math.random() * (this._currentMaxBombInterval - this._currentMinBombInterval));
    }

    private SetDropOptions(options: Readonly<ZRSJZ_BombPlotDropOptions> = null): void {
        this._currentDropRadius = Math.max(1, options?.DropRadius ?? this.Radius);
        this._currentMinBombInterval = Math.max(
            0.1,
            Math.min(
                options?.MinBombInterval ?? this.MinBombInterval,
                options?.MaxBombInterval ?? this.MaxBombInterval,
            ),
        );
        this._currentMaxBombInterval = Math.max(
            this._currentMinBombInterval,
            options?.MinBombInterval ?? this.MinBombInterval,
            options?.MaxBombInterval ?? this.MaxBombInterval,
        );
        this._getDropCenter = options?.GetDropCenter ?? null;
    }

    private Finish(): void {
        if (!this._running) return;
        this._running = false;
        ++this._deployVersion;
        this.unscheduleAllCallbacks();
        const callback = this._finishCallback;
        this._finishCallback = null;
        this._effectParent = null;
        this._getDropCenter = null;
        callback?.();
        ZRSJZ_PoolManager.Instance.PutNode(this.node);
    }

}

