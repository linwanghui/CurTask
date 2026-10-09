import { _decorator, Canvas, Component, director, game as ccGame, input, Input, isValid, Node, Vec3 } from 'cc';
import { ZRSJZ_EventManager, ZRSJZ_MyEvent } from '../Manager/ZRSJZ_EventManager';
import { ZRSJZ_Game } from '../ZRSJZ_Game';
import { ZRSJZ_Player } from './ZRSJZ_Player';
import { ZRSJZ_EnemyBase } from './ZRSJZ_EnemyBase';
import { ZRSJZ_Box } from '../Unit/ZRSJZ_Box';
import { ZRSJZ_UIManager } from '../Manager/ZRSJZ_UIManager';
import { ZRSJZ_PANEL, ZRSJZ_TIER } from '../ZRSJZ_Constant';
import { ZRSJZ_GoodsPanel } from '../Panel/ZRSJZ_GoodsPanel';
import { ZRSJZ_PathFinder } from './ZRSJZ_PathFinder';
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_MapAutoShow')
export class ZRSJZ_MapAutoShow extends Component {

    @property({ type: Node, displayName: "自动展示模式玩家出现的位置" })
    Point: Node = null;

    @property({ type: Node, displayName: "自动展示模式箱子" })
    Box: Node = null;

    @property({ type: Node, displayName: "自动展示模式敌人" })
    Enemy: Node = null;

    @property({ type: Node, displayName: "寻敌路线（按子节点顺序）" })
    PlayerPoints: Node = null;

    @property({ displayName: '路线点到达距离', min: 20 })
    WaypointDistance = 45;

    @property({ displayName: '演示玩家编号（0/1）', min: 0, max: 1, step: 1 })
    PlayerIndex = 0;
    @property({ displayName: '开箱接近距离', min: 20 })
    BoxDistance = 220;
    @property({ displayName: '射击接近距离', min: 50 })
    AttackDistance = 450;
    @property({ displayName: '单阶段超时（秒）', min: 10 })
    StageTimeout = 120;

    private static _active: ZRSJZ_MapAutoShow = null;
    private _game: ZRSJZ_Game = null;
    private _player: ZRSJZ_Player = null;
    private _box: ZRSJZ_Box = null;
    private _enemy: ZRSJZ_EnemyBase = null;
    private _stage: 'idle' | 'box' | 'search' | 'collect' | 'route' | 'enemy' = 'idle';
    private _waypoints: Node[] = [];
    private _waypointIndex = 0;
    private _closingGoods: ZRSJZ_GoodsPanel = null;
    private _serial = 0;
    private _stageTime = 0;
    private _openedGoods = false;
    private _path: Vec3[] = [];
    private _repathTime = 0;
    private _inputRoots: Node[] = [];
    private _inputCanvas: HTMLCanvasElement = null;
    private readonly _onCanvasPointer = (event: Event) => {
        const rect = this._inputCanvas?.getBoundingClientRect();
        const point = (event as TouchEvent).changedTouches?.[0] ?? event as MouseEvent;
        // 预览器和网页可能在画布上覆盖 HTML 层；按画布范围判断点击。
        if (rect && point.clientX >= rect.left && point.clientX <= rect.right
            && point.clientY >= rect.top && point.clientY <= rect.bottom) this.Stop();
    };

    public get IsRunning(): boolean { return this._stage !== 'idle'; }
    public get Stage(): string { return this._stage; }

    protected onEnable(): void {
        ZRSJZ_EventManager.On(ZRSJZ_MyEvent.ZRSJZ_MAP_AUTO_SHOW, this.Begin, this);
    }

    protected onDisable(): void {
        ZRSJZ_EventManager.Off(ZRSJZ_MyEvent.ZRSJZ_MAP_AUTO_SHOW, this.Begin, this);
        this.Stop();
    }

    public Begin(): void {
        if (this.IsRunning) return;
        const game = ZRSJZ_Game.Instance;
        const player = game?.GetPlayer(this.PlayerIndex);
        const box = isValid(this.Box, true) ? this.Box.getComponent(ZRSJZ_Box) ?? this.Box.getComponentInChildren(ZRSJZ_Box) : null;
        const enemy = isValid(this.Enemy, true) ? this.Enemy.getComponent(ZRSJZ_EnemyBase) ?? this.Enemy.getComponentInChildren(ZRSJZ_EnemyBase) : null;
        if (!isValid(game, true) || game.IsGameFinished || game.GamePaused || !isValid(player, true) || player.IsDead
            || !isValid(this.Point, true) || !isValid(box, true) || !isValid(enemy, true) || enemy.IsDead) {
            console.warn('[地图自动展示] Point、Box、Enemy 或玩家状态无效');
            return;
        }
        if (box.RequiresRewardVideo() || (box.RequiresPassword() && !box.IsPasswordUnlocked())) {
            console.warn('[地图自动展示] 请配置无需广告或密码解锁的箱子');
            return;
        }
        ZRSJZ_MapAutoShow._active?.Stop();
        ZRSJZ_MapAutoShow._active = this;
        this._game = game; this._player = player; this._box = box; this._enemy = enemy;
        this._serial++;
        this._waypoints = isValid(this.PlayerPoints, true)
            ? (this.PlayerPoints.children.length ? this.PlayerPoints.children.slice() : [this.PlayerPoints]) : [];
        this._waypointIndex = 0;
        this._closingGoods = null;
        player.StopAutoShowInput();
        player.node.setWorldPosition(this.Point.worldPosition);
        const body = player.RigidBody?.impl as { syncPositionToPhysics?: () => void };
        body?.syncPositionToPhysics?.();
        this.SetStage('box');
        input.on(Input.EventType.TOUCH_START, this.OnUserInput, this);
        input.on(Input.EventType.MOUSE_DOWN, this.OnUserInput, this);
        // Canvas 捕获阶段先于弹窗的 BlockInputEvents，确保 UI 点击也能中止。
        this._inputRoots = director.getScene()?.getComponentsInChildren(Canvas).map(c => c.node) ?? [];
        for (const root of this._inputRoots) {
            root.on(Node.EventType.TOUCH_START, this.OnUserInput, this, true);
            root.on(Node.EventType.MOUSE_DOWN, this.OnUserInput, this, true);
        }
        // Web 画布原生捕获先于引擎 UI 分发，覆盖被 UI 吞掉的点击。
        const canvas = ccGame.canvas;
        if (typeof canvas?.ownerDocument?.addEventListener === 'function') {
            this._inputCanvas = canvas;
            canvas.ownerDocument.addEventListener('pointerdown', this._onCanvasPointer, true);
            canvas.ownerDocument.addEventListener('mousedown', this._onCanvasPointer, true);
            canvas.ownerDocument.addEventListener('touchstart', this._onCanvasPointer, true);
        }
    }

    private OnUserInput(): void { this.Stop(); }

    public Stop(): void {
        const wasRunning = this.IsRunning;
        this._serial++;
        this._stage = 'idle';
        this._path.length = 0;
        this._waypoints = [];
        this._waypointIndex = 0;
        this._closingGoods = null;
        input.off(Input.EventType.TOUCH_START, this.OnUserInput, this);
        input.off(Input.EventType.MOUSE_DOWN, this.OnUserInput, this);
        for (const root of this._inputRoots) {
            if (!isValid(root, true)) continue;
            root.off(Node.EventType.TOUCH_START, this.OnUserInput, this, true);
            root.off(Node.EventType.MOUSE_DOWN, this.OnUserInput, this, true);
        }
        this._inputRoots = [];
        this._inputCanvas?.ownerDocument?.removeEventListener('pointerdown', this._onCanvasPointer, true);
        this._inputCanvas?.ownerDocument?.removeEventListener('mousedown', this._onCanvasPointer, true);
        this._inputCanvas?.ownerDocument?.removeEventListener('touchstart', this._onCanvasPointer, true);
        this._inputCanvas = null;
        if (wasRunning && isValid(this._player, true)) this._player.StopAutoShowInput();
        if (this._openedGoods) ZRSJZ_UIManager.Instance?.HidePlayerPanel(ZRSJZ_PANEL.物资弹窗, this.PlayerIndex);
        this._openedGoods = false;
        if (wasRunning && isValid(this._box, true)) this._box.EndSearch(this.PlayerIndex);
        if (ZRSJZ_MapAutoShow._active === this) ZRSJZ_MapAutoShow._active = null;
    }

    private SetStage(stage: typeof this._stage): void {
        this._stage = stage; this._stageTime = 0;
        this._path.length = 0; this._repathTime = 0;
    }

    private IsCurrent(serial = this._serial): boolean {
        return serial === this._serial && this.IsRunning && isValid(this, true) && this.enabledInHierarchy
            && isValid(this._game, true) && ZRSJZ_Game.Instance === this._game && !this._game.IsGameFinished
            && isValid(this._player, true) && this._player.node.activeInHierarchy && !this._player.IsDead;
    }

    protected update(dt: number): void {
        if (!this.IsRunning) return;
        if (!this.IsCurrent()) { this.Stop(); return; }
        if (this._game.GamePaused) return;
        this._stageTime += dt;
        if (this._stageTime > this.StageTimeout) { this.Stop(); return; }
        if (this._stage === 'box') {
            if (!isValid(this._box, true)) { this.Stop(); return; }
            if (!this.MoveTowards(this._box.node.worldPosition, this.BoxDistance, dt)) return;
            if (!this._box.TryBeginSearch(this.PlayerIndex)) { this.Stop(); return; }
            this.SetStage('search');
            this._openedGoods = true;
            ZRSJZ_UIManager.Instance.ShowPlayerPanel(ZRSJZ_PANEL.物资弹窗, this.PlayerIndex, this._box, this.PlayerIndex);
        } else if (this._stage === 'search') {
            if (!isValid(this._box, true)) { this.Stop(); return; }
            const panel = director.getScene()?.getComponentsInChildren(ZRSJZ_GoodsPanel)
                .find(p => p.IsShowingBox(this._box, this.PlayerIndex));
            if (panel?.IsBoxSearchComplete(this._box, this.PlayerIndex)) {
                this.SetStage('collect');
                void this.Collect(panel, this._serial);
            }
        } else if (this._stage === 'route') {
            // 物资弹窗完全关闭后再开始走路线，不因敌人靠近而跳过路线点。
            if (isValid(this._closingGoods, true) && this._closingGoods.IsShowingBox(this._box, this.PlayerIndex)) return;
            this._closingGoods = null;
            if (this._waypointIndex >= this._waypoints.length) { this.SetStage('enemy'); return; }
            const point = this._waypoints[this._waypointIndex];
            if (!isValid(point, true)) { this.Stop(); return; }
            if (this.MoveTowards(point.worldPosition, this.WaypointDistance, dt)) {
                this._waypointIndex++;
                this.SetStage(this._waypointIndex < this._waypoints.length ? 'route' : 'enemy');
            }
        } else if (this._stage === 'enemy') {
            if (!isValid(this._enemy, true) || !this._enemy.node.activeInHierarchy || this._enemy.IsDead) { this.Stop(); return; }
            this._player.AutoShowTarget = this._enemy.node;
            this._player.TargetEnemy = this._enemy.node;
            const distance = this._player.WeaponType === '刀' ? 150 : this.AttackDistance;
            const arrived = this.MoveTowards(this._enemy.node.worldPosition, distance, dt);
            this._player.Attack(arrived, this.PlayerIndex);
        }
    }

    private async Collect(panel: ZRSJZ_GoodsPanel, serial: number): Promise<void> {
        try {
            const success = await panel.CollectForAutoShow(this._box, this.PlayerIndex, () => this.IsCurrent(serial));
            if (!this.IsCurrent(serial)) return;
            if (!success) { this.Stop(); return; }
            ZRSJZ_UIManager.Instance.HidePlayerPanel(ZRSJZ_PANEL.物资弹窗, this.PlayerIndex);
            this._openedGoods = false;
            this._box.EndSearch(this.PlayerIndex);
            this._closingGoods = panel;
            this.SetStage('route');
        } catch (error) {
            console.error('[地图自动展示] 拾取失败', error);
            if (this.IsCurrent(serial)) this.Stop();
        }
    }

    private MoveTowards(target: Vec3, arrivalDistance: number, dt: number): boolean {
        const pos = this._player.node.worldPosition;
        const radius = Math.max(10, (this._player.Collider?.radius ?? 30) * Math.abs(this._player.node.worldScale.x));
        const offsetY = (this._player.Collider?.offset.y ?? 0) * this._player.node.worldScale.y;
        const direct = ZRSJZ_PathFinder.HasDirectPath(pos, target, ZRSJZ_TIER.地形, radius, offsetY, 1);
        if (Math.hypot(target.x - pos.x, target.y - pos.y) <= Math.max(20, arrivalDistance) && direct) {
            this._player.Move(0, 0, 0, this.PlayerIndex);
            return true;
        }
        this._repathTime -= dt;
        let destination = target;
        if (!direct) {
            if (this._repathTime <= 0) {
                this._repathTime = 0.5;
                this._path = ZRSJZ_PathFinder.FindPath(pos, target, {
                    GridSize: 60, AgentRadius: radius, AgentOffsetY: offsetY, RaycastRadiusScale: 1,
                    ObstacleMask: ZRSJZ_TIER.地形, MaxSearchNodes: 3000, PreciseObstacles: true,
                });
            }
            while (this._path.length && Vec3.distance(pos, this._path[0]) < 25) this._path.shift();
            if (!this._path.length) { this._player.Move(0, 0, 0, this.PlayerIndex); return false; }
            destination = this._path[0];
        }
        const direction = new Vec3(destination.x - pos.x, destination.y - pos.y, 0).normalize();
        this._player.Move(direction.x, direction.y, 1, this.PlayerIndex);
        return false;
    }

}


