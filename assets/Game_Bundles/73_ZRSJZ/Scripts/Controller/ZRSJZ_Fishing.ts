import { _decorator, Button, Canvas, Component, game, instantiate, isValid, Node, Prefab, Sprite, sys, UITransform, Vec3, Widget } from 'cc';
import { ZRSJZ_Game } from '../ZRSJZ_Game';
import { ZRSJZ_FISHING_CONFIG, ZRSJZ_RollFishingRewards, ZRSJZ_MainTaskAwardConfig, ZRSJZ_PANEL } from '../ZRSJZ_Constant';
import { ZRSJZ_Tools } from '../ZRSJZ_Tools';
import { ZRSJZ_UIManager } from '../Manager/ZRSJZ_UIManager';
import { ZRSJZ_Player } from './ZRSJZ_Player';
import { ZRSJZ_FishingLine } from './ZRSJZ_FishingLine';
import { ZRSJZ_Joystick_Attack } from './ZRSJZ_Joystick_Attack';
import { ZRSJZ_FishingRound } from '../Service/ZRSJZ_FishingRound';
import { ZRSJZ_AccountService } from '../Service/ZRSJZ_AccountService';
import { ZRSJZ_GradeService } from '../Service/ZRSJZ_GradeService';

const { ccclass } = _decorator;
type FishingState = 'ready' | 'waiting' | 'pulling' | 'finishing';
interface FishingSession {
    player: ZRSJZ_Player;
    station: Node;
    attack: ZRSJZ_Joystick_Attack;
    ui: Node;
    cast: Node;
    reel: Node;
    progress: Node;
    green: Sprite;
    yellow: Sprite;
    pointer: Node;
    state: FishingState;
    round: ZRSJZ_FishingRound;
    elapsed: number;
    biteTime: number;
    animation: string;
    hp: number;
    rotation: import('cc').Quat;
    rewards: Promise<ZRSJZ_MainTaskAwardConfig[]>;
    line: ZRSJZ_FishingLine;
}

/** 城镇钓鱼协调器：复用每名玩家现有控制根节点，分开保存钓鱼状态。 */
@ccclass('ZRSJZ_Fishing')
export class ZRSJZ_Fishing extends Component {
    private _stations: Node[] = [];
    private _prefab: Prefab = null;
    private _ripplePrefab: Prefab = null;
    private _sessions: FishingSession[] = [];
    private _buttons = new Map<Node, () => void>();
    private _loading = false;

    protected start(): void {
        const visit = (node: Node): void => {
            if (node.name === '钓鱼台' && node.getChildByName('PlayerPoint')) this._stations.push(node);
            node.children.forEach(visit);
        };
        visit(this.node);
        this.LoadFishingResources();
    }

    private LoadFishingResources(): void {
        if (!this._stations.length || this._loading || this._prefab || !ZRSJZ_UIManager.ZRSJZ_DLC) return;
        this._loading = true;
        Promise.all([
            ZRSJZ_Tools.LoadPrefabByBundle('73_ZRSJZ_DLC', 'Prefabs/FishJoystick'),
            ZRSJZ_Tools.LoadPrefabByBundle('73_ZRSJZ_DLC', 'Prefabs/Unit/水波纹'),
        ]).then(([prefab, ripple]) => {
            if (!isValid(this, true)) return;
            this._prefab = prefab;
            this._ripplePrefab = ripple;
            this._loading = false;
        }).catch(error => {
            console.error('[钓鱼] DLC资源加载失败', error);
            if (isValid(this, true)) this.scheduleOnce(() => { this._loading = false; }, 3);
        });
    }

    private GetControls(): ZRSJZ_Joystick_Attack[] {
        const game = ZRSJZ_Game.Instance;
        return [game?.OnePlayerModel, game?.TwoPlayerModel]
            .filter(root => isValid(root, true) && root.activeInHierarchy)
            .flatMap(root => root.getComponentsInChildren(ZRSJZ_Joystick_Attack));
    }

    private FindStation(player: ZRSJZ_Player): Node {
        if (!player || player.IsDead || player.IsFishing) return null;
        let nearest: Node = null;
        let distance = ZRSJZ_FISHING_CONFIG.ApproachRadius;
        for (const station of this._stations) {
            if (!station.activeInHierarchy || this._sessions.some(session => session.station === station)) continue;
            const point = station.getChildByName('PlayerPoint');
            const next = Vec3.distance(player.node.worldPosition, point.worldPosition);
            if (next <= distance) { nearest = station; distance = next; }
        }
        return nearest;
    }

    protected update(dt: number): void {
        const game = ZRSJZ_Game.Instance;
        if (!game) return;
        this.LoadFishingResources();
        for (const session of this._sessions.slice()) {
            if (!isValid(session.player, true) || !session.player.node.activeInHierarchy
                || session.player.IsDead || game.IsGameFinished || session.player.CurHP < session.hp
                || !session.attack.node.parent?.activeInHierarchy || !session.station.activeInHierarchy) {
                this.Exit(session);
                continue;
            }
            this.FitControls(session);
            const track = session.player.PlayerSkeleton.Skeleton.getCurrent(0);
            if (track) track.timeScale = game.GamePaused ? 0 : 1;
            if (!game.GamePaused) this.UpdateSession(session, dt);
        }
        for (const attack of this.GetControls()) {
            const button = attack.node.getChildByName('Fish');
            if (!button) continue;
            if (!this._buttons.has(button)) {
                const callback = () => this.Enter(attack);
                button.on(Button.EventType.CLICK, callback, this);
                this._buttons.set(button, callback);
            }
            const player = game.GetPlayer(attack.PlayerIndex);
            button.active = ZRSJZ_UIManager.ZRSJZ_DLC && !!this._ripplePrefab && !!this._prefab && !game.GamePaused && !game.IsGameFinished && !!this.FindStation(player);
        }
    }

    private Enter(attack: ZRSJZ_Joystick_Attack): void {
        const game = ZRSJZ_Game.Instance;
        if (!ZRSJZ_UIManager.ZRSJZ_DLC || !this._prefab || !this._ripplePrefab || this._loading || game.GamePaused || game.IsGameFinished) return;
        const player = game.GetPlayer(attack.PlayerIndex);
        const station = this.FindStation(player);
        if (!station) return;
        const point = station.getChildByName('PlayerPoint');
        const ui = instantiate(this._prefab);
        ui.active = false;
        ui.parent = attack.node.parent;
        const setLayer = (node: Node): void => { node.layer = attack.node.layer; node.children.forEach(setLayer); };
        setLayer(ui);
        const progress = ui.getChildByName('钓鱼进度');
        const session: FishingSession = {
            player, station, attack, ui, progress,
            cast: ui.getChildByName('抛竿'), reel: ui.getChildByName('收杆'),
            green: progress?.getChildByName('绿色进度')?.getComponent(Sprite),
            yellow: progress?.getChildByName('黄色进度')?.getComponent(Sprite),
            pointer: progress?.getChildByName('指针'), state: 'ready', round: null,
            elapsed: 0, biteTime: 0, animation: '', hp: player.CurHP, rotation: player.node.worldRotation.clone(), rewards: null, line: null,
        };
        if (!session.cast || !session.reel || !session.green || !session.yellow || !session.pointer
            || !ui.getChildByName('放弃') || !player.BeginFishing(point)) {
            ui.destroy();
            void ZRSJZ_UIManager.Instance.ShowTip('钓鱼资源尚未准备好');
            return;
        }
        const area = station.getChildByName('鱼出现的区域');
        if (area?.getComponent(UITransform) && player.PlayerSkeleton.Skeleton.findBone('dy')) {
            const lineNode = new Node('鱼线_玩家' + (player.PlayerIndex + 1));
            lineNode.active = false;
            lineNode.layer = ui.layer;
            lineNode.parent = ui;
            lineNode.setSiblingIndex(0);
            session.line = lineNode.addComponent(ZRSJZ_FishingLine);
            const ripple = instantiate(this._ripplePrefab);
            ripple.active = false;
            ripple.parent = this.node;
            const setWorldLayer = (node: Node): void => { node.layer = station.layer; node.children.forEach(setWorldLayer); };
            setWorldLayer(ripple);
            session.line.Init(player, area, ripple);
        }
        this._sessions.push(session);
        session.cast.on(Button.EventType.CLICK, () => this.Cast(session), this);
        // Button.CLICK 每次点击只触发一次；不监听长按和 TOUCH_START。
        session.reel.on(Button.EventType.CLICK, () => {
            if (session.state === 'pulling' && !game.GamePaused) {
                session.round.Pull();
                session.line?.Pull();
                this.PlayAnimation(session, 'dy3', true);
                this.RenderProgress(session);
            }
        }, this);
        ui.getChildByName('放弃').on(Button.EventType.CLICK, () => this.Exit(session), this);
        attack.ResetFishingInput();
        attack.node.active = false;
        this.FitControls(session);
        ui.active = true;
        session.cast.active = true;
        session.reel.active = false;
        progress.active = false;
        this.PlayAnimation(session, 'dy2', true);
    }

    /** 使用实际 UI 相机的可见宽度，避免 Canvas 的自适应尺寸把按钮推到屏幕外。 */
    private FitControls(session: FishingSession): void {
        let canvasNode = session.ui.parent;
        while (canvasNode && !canvasNode.getComponent(Canvas)) canvasNode = canvasNode.parent;
        const canvas = canvasNode?.getComponent(Canvas);
        const camera = canvas?.cameraComponent;
        const canvasUI = canvasNode?.getComponent(UITransform);
        const parentUI = session.ui.parent?.getComponent(UITransform);
        const ui = session.ui.getComponent(UITransform);
        if (!camera?.camera || !canvasUI || !parentUI || !ui || canvasUI.width <= 0 || canvasUI.height <= 0) return;
        const canvasWidth = canvasUI.width * Math.abs(canvasNode.worldScale.x);
        const canvasHeight = canvasUI.height * Math.abs(canvasNode.worldScale.y);
        const left = canvasNode.worldPosition.x - canvasUI.anchorX * canvasWidth;
        const bottom = canvasNode.worldPosition.y - canvasUI.anchorY * canvasHeight;
        const centerX = (parentUI.node.worldPosition.x + (0.5 - parentUI.anchorX) * parentUI.width * parentUI.node.worldScale.x - left) / canvasWidth;
        const centerY = (parentUI.node.worldPosition.y + (0.5 - parentUI.anchorY) * parentUI.height * parentUI.node.worldScale.y - bottom) / canvasHeight;
        const origin = new Vec3(camera.node.worldPosition.x, camera.node.worldPosition.y, session.ui.worldPosition.z);
        const screen = camera.worldToScreen(origin);
        const horizontal = camera.worldToScreen(new Vec3(origin.x + 1, origin.y, origin.z));
        const vertical = camera.worldToScreen(new Vec3(origin.x, origin.y + 1, origin.z));
        const pixelScaleX = Math.abs(horizontal.x - screen.x);
        const pixelScaleY = Math.abs(vertical.y - screen.y);
        if (pixelScaleX < 0.000001 || pixelScaleY < 0.000001) return;
        let pixelLeft = 0, pixelRight = camera.camera.width;
        let pixelBottom = 0, pixelTop = camera.camera.height;
        // Web 预览会居中裁切超宽画布，只使用用户实际看得到的区域。
        if (sys.isBrowser && game.canvas?.getBoundingClientRect) {
            const rect = game.canvas.getBoundingClientRect();
            const container = game.canvas.parentElement?.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
                const left = Math.max(0, rect.left, container?.left ?? rect.left);
                const right = Math.min(window.innerWidth, rect.right, container?.right ?? rect.right);
                const top = Math.max(0, rect.top, container?.top ?? rect.top);
                const bottom = Math.min(window.innerHeight, rect.bottom, container?.bottom ?? rect.bottom);
                pixelLeft = (left - rect.left) / rect.width * camera.camera.width;
                pixelRight = (right - rect.left) / rect.width * camera.camera.width;
                pixelBottom = (rect.bottom - bottom) / rect.height * camera.camera.height;
                pixelTop = (rect.bottom - top) / rect.height * camera.camera.height;
            }
        }
        const visibleWidth = (pixelRight - pixelLeft) / pixelScaleX;
        const visibleHeight = (pixelTop - pixelBottom) / pixelScaleY;
        const visibleCenterX = origin.x + ((pixelLeft + pixelRight) / 2 - screen.x) / pixelScaleX;
        const visibleCenterY = origin.y + ((pixelBottom + pixelTop) / 2 - screen.y) / pixelScaleY;
        const width = visibleWidth * parentUI.width * Math.abs(parentUI.node.worldScale.x) / canvasWidth;
        const height = visibleHeight * parentUI.height * Math.abs(parentUI.node.worldScale.y) / canvasHeight;
        const widget = session.ui.getComponent(Widget);
        if (widget) widget.enabled = false;
        session.ui.setScale(session.attack.node.scale);
        ui.setContentSize(width / Math.abs(session.ui.worldScale.x), height / Math.abs(session.ui.worldScale.y));
        session.ui.setWorldPosition(visibleCenterX + (centerX - 0.5) * visibleWidth,
            visibleCenterY + (centerY - 0.5) * visibleHeight, session.attack.node.worldPosition.z);
        for (const child of session.ui.children) {
            const childWidget = child.getComponent(Widget);
            const childUI = child.getComponent(UITransform);
            if (!childWidget || !childUI) continue;
            // updateAlignment 会连带重算父 Widget，把裁切后的宽度覆盖回 Canvas 宽度。
            childWidget.enabled = false;
            const w = ui.width, h = ui.height;
            const cw = childUI.width * Math.abs(child.scale.x), ch = childUI.height * Math.abs(child.scale.y);
            let x = child.position.x, y = child.position.y;
            if (childWidget.isAlignRight) x = (1 - ui.anchorX) * w - childWidget.right - (1 - childUI.anchorX) * cw;
            else if (childWidget.isAlignLeft) x = -ui.anchorX * w + childWidget.left + childUI.anchorX * cw;
            else if (childWidget.isAlignHorizontalCenter) x = (0.5 - ui.anchorX) * w + childWidget.horizontalCenter + (childUI.anchorX - 0.5) * cw;
            if (childWidget.isAlignTop) y = (1 - ui.anchorY) * h - childWidget.top - (1 - childUI.anchorY) * ch;
            else if (childWidget.isAlignBottom) y = -ui.anchorY * h + childWidget.bottom + childUI.anchorY * ch;
            else if (childWidget.isAlignVerticalCenter) y = (0.5 - ui.anchorY) * h + childWidget.verticalCenter + (childUI.anchorY - 0.5) * ch;
            child.setPosition(x, y, child.position.z);
        }
    }

    private Cast(session: FishingSession): void {
        if (session.state !== 'ready' || ZRSJZ_Game.Instance.GamePaused) return;
        session.state = 'waiting';
        session.elapsed = 0;
        session.biteTime = 1 + Math.random() * 2;
        session.round = new ZRSJZ_FishingRound();
        session.rewards = null;
        session.line?.Cast();
        session.line?.SetState(session.state, 0);
        session.cast.active = false;
        session.reel.active = false;
        session.progress.active = false;
        this.PlayAnimation(session, 'dy1', false);
    }

    private UpdateSession(session: FishingSession, dt: number): void {
        if (!Number.isFinite(dt) || dt <= 0) return;
        session.elapsed += dt;
        const castDurationForLine = session.player.PlayerSkeleton.Skeleton.findAnimation('dy1')?.duration || 0.5;
        session.line?.SetState(session.state, session.elapsed / castDurationForLine);
        if (session.state === 'waiting') {
            const castDuration = session.player.PlayerSkeleton.Skeleton.findAnimation('dy1')?.duration ?? 0;
            if (session.elapsed >= session.biteTime) {
                session.state = 'pulling';
                session.line?.SetState(session.state, 1);
                session.progress.active = true;
                session.reel.active = true;
                this.PlayAnimation(session, 'dy3', true);
                this.RenderProgress(session);
            } else if (session.elapsed >= castDuration) this.PlayAnimation(session, 'dy2', true);
        } else if (session.state === 'pulling') {
            session.round.Update(dt);
            this.RenderProgress(session);
            if (session.round.Result !== 'playing') {
                session.state = 'finishing';
                session.line?.SetState(session.state, 1);
                session.elapsed = 0;
                session.reel.active = false;
                this.PlayAnimation(session, 'dy4', false);
                if (session.round.Result === 'success') session.rewards = this.GrantReward(session.round.WindowWidth).catch(error => {
                    console.error('[钓鱼] 发放奖励失败', error);
                    void ZRSJZ_UIManager.Instance.ShowTip('钓鱼奖励发放失败，请检查奖励配置');
                    return [];
                });
                else void ZRSJZ_UIManager.Instance.ShowTip('鱼脱钩了，再试一次吧');
            }
        } else if (session.state === 'finishing') {
            const duration = session.player.PlayerSkeleton.Skeleton.findAnimation('dy4')?.duration ?? 0.5;
            const track = session.player.PlayerSkeleton.Skeleton.getCurrent(0);
            const completed = session.round.Result === 'success'
                ? track?.animation?.name === 'dy4' && track.isComplete()
                : session.elapsed >= duration;
            if (completed) {
                // 以实际 Spine 播放完成为准，暂停或低帧率不会提前弹出奖励。
                if (session.rewards) void this.ShowReward(session.rewards).catch(error => console.error('[钓鱼] 奖励弹窗失败', error));
                session.rewards = null;
                session.state = 'ready';
                session.line?.SetState(session.state, 1);
                session.progress.active = false;
                session.cast.active = true;
                this.PlayAnimation(session, 'dy2', true);
            }
        }
    }

    private PlayAnimation(session: FishingSession, animation: string, loop: boolean): void {
        if (session.animation === animation) return;
        session.animation = animation;
        session.player.PlayerSkeleton.PlayAni(animation, loop);
    }

    private RenderProgress(session: FishingSession): void {
        const round = session.round;
        session.green.type = Sprite.Type.FILLED;
        session.green.fillType = Sprite.FillType.HORIZONTAL;
        session.green.fillStart = round.WindowStart;
        session.green.fillRange = round.WindowWidth;
        session.yellow.type = Sprite.Type.FILLED;
        session.yellow.fillType = Sprite.FillType.HORIZONTAL;
        session.yellow.fillStart = 0;
        session.yellow.fillRange = round.Progress;
        // 按弧形贴图宽高求圆心；指针位置与绿色水平填充区域使用同一归一化坐标。
        const ui = session.green.getComponent(UITransform);
        const half = ui.width / 2;
        const height = ui.height;
        const radius = (half * half + height * height) / (2 * height);
        const x = (round.Pointer - 0.5) * ui.width;
        const angle = Math.asin(x / radius);
        const y = height / 2 - radius + Math.sqrt(radius * radius - x * x);
        session.pointer.setPosition(session.green.node.position.x + x, session.green.node.position.y + y + ZRSJZ_FISHING_CONFIG.PointerOffsetY, 0);
        session.pointer.setRotationFromEuler(0, 0, -angle * 180 / Math.PI);
    }

    private async GrantReward(width: number): Promise<ZRSJZ_MainTaskAwardConfig[]> {
        const awards = ZRSJZ_RollFishingRewards(width);
        // 成功当场发放，弹窗只展示，关闭弹窗不会再发一次。
        const props: { PropName: string; Count: number }[] = [];
        for (const award of awards) {
            if (award.TaskAwardName === '钞票') ZRSJZ_AccountService.ChangeGold(award.TaskAwardCount);
            else if (award.TaskAwardName === '经验') ZRSJZ_GradeService.AddExperience(award.TaskAwardCount);
            else props.push({ PropName: award.TaskAwardName, Count: award.TaskAwardCount });
        }
        if (props.length) await ZRSJZ_UIManager.Instance.ReceivePropAwards(props);
        return awards;
    }

    private async ShowReward(rewards: Promise<ZRSJZ_MainTaskAwardConfig[]>): Promise<void> {
        const awards = await rewards;
        if (awards.length && isValid(this, true) && !ZRSJZ_Game.Instance?.IsGameFinished) {
            await ZRSJZ_UIManager.Instance.ShowPanel(ZRSJZ_PANEL.获取奖励弹窗, { Awards: awards, DisplayOnly: true });
        }
    }

    private Exit(session: FishingSession): void {
        const index = this._sessions.indexOf(session);
        if (index < 0) return;
        this._sessions.splice(index, 1);
        if (isValid(session.ui, true)) session.ui.destroy();
        if (isValid(session.line, true)) session.line.node.destroy();
        if (isValid(session.player, true)) {
            session.player.node.setWorldRotation(session.rotation);
            session.player.EndFishing();
        }
        if (isValid(session.attack, true)) session.attack.node.active = true;
    }

    protected onDisable(): void {
        this._sessions.slice().forEach(session => this.Exit(session));
        this._buttons.forEach((callback, button) => {
            if (isValid(button, true)) { button.off(Button.EventType.CLICK, callback, this); button.active = false; }
        });
        this._buttons.clear();
    }
}
