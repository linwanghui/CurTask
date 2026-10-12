import { _decorator, Button, Component, instantiate, isValid, Node, sp, UIOpacity, Vec3 } from 'cc';
import { ZRSJZ_Game } from '../ZRSJZ_Game';
import { ZRSJZ_UIManager } from '../Manager/ZRSJZ_UIManager';
import { ZRSJZ_MAP_CONFIG, ZRSJZ_PRAYER_BOX_CONFIG, ZRSJZ_PRAYER_CONFIG } from '../ZRSJZ_Constant';
import { ZRSJZ_GameData } from '../ZRSJZ_GameData';
import { ZRSJZ_Tools } from '../ZRSJZ_Tools';
import { ZRSJZ_Box } from '../Unit/ZRSJZ_Box';
import { ZRSJZ_ParacargoBox } from '../Unit/ZRSJZ_ParacargoBox';
import { ZRSJZ_Joystick_Attack } from './ZRSJZ_Joystick_Attack';
import { ZRSJZ_Player } from './ZRSJZ_Player';

const { ccclass } = _decorator;
interface PrayerFire { direction: string; node: Node; spine: sp.Skeleton; lit: boolean; extinguishing: boolean; }
interface PrayerHint { direction: string; node: Node; opacity: UIOpacity; }

/** 沙漠本局共享祈祷谜题，双人分别操作同一组篝火。 */
@ccclass('ZRSJZ_Prayer')
export class ZRSJZ_Prayer extends Component {
    private _prayer: Node = null;
    private _point: Node = null;
    private _fires: PrayerFire[] = [];
    private _hints: PrayerHint[] = [];
    private _required = new Set<string>();
    private _completed = false;
    private _completing = false;
    private _rewardBox: Node = null;
    private _elapsed = 0;
    private _buttons = new Map<Node, () => void>();

    protected start(): void {
        let camp: Node = null;
        const visit = (node: Node): void => {
            if (node.name === '祈祷' && node.getChildByName('祈祷点')) this._prayer = node;
            if (node.name === '篝火') camp = node;
            node.children.forEach(visit);
        };
        visit(this.node);
        if (!camp || !this._prayer) return;
        this._point = this._prayer.getChildByName('祈祷点');
        for (const direction of ZRSJZ_PRAYER_CONFIG.Directions) {
            const node = camp.getChildByName(direction);
            const spine = node?.getChildByName('Spine')?.getComponent(sp.Skeleton);
            const checked = this._prayer.getChildByName(direction)?.getChildByName('Checked');
            if (!node || !spine || !checked) continue;
            this._fires.push({ direction, node, spine, lit: false, extinguishing: false });
            spine.node.active = false;
            this._hints.push({ direction, node: checked, opacity: checked.getComponent(UIOpacity) ?? checked.addComponent(UIOpacity) });
        }
        const directions = this._fires.map(fire => fire.direction);
        for (let i = directions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [directions[i], directions[j]] = [directions[j], directions[i]];
        }
        const max = Math.min(directions.length, ZRSJZ_PRAYER_CONFIG.MaxRequired);
        const min = Math.min(max, Math.max(1, ZRSJZ_PRAYER_CONFIG.MinRequired));
        const count = min + Math.floor(Math.random() * (max - min + 1));
        directions.slice(0, count).forEach(direction => this._required.add(direction));
        this.UpdateHints();
    }

    private GetControls(): ZRSJZ_Joystick_Attack[] {
        const game = ZRSJZ_Game.Instance;
        return [game?.OnePlayerModel, game?.TwoPlayerModel]
            .filter(root => isValid(root, true) && root.activeInHierarchy)
            .flatMap(root => root.getComponentsInChildren(ZRSJZ_Joystick_Attack));
    }

    private CanInteract(player: ZRSJZ_Player): boolean {
        const game = ZRSJZ_Game.Instance;
        return !!game && !game.GamePaused && !game.IsGameFinished && !this._completed && !this._completing
            && isValid(this._prayer, true) && this._prayer.activeInHierarchy
            && isValid(player, true) && player.node.activeInHierarchy && !player.IsDead && !player.IsFishing;
    }

    private FindFire(player: ZRSJZ_Player): PrayerFire {
        if (!this.CanInteract(player)) return null;
        let nearest: PrayerFire = null;
        let distance = ZRSJZ_PRAYER_CONFIG.FireRadius;
        for (const fire of this._fires) {
            if (!isValid(fire.node, true) || !fire.node.activeInHierarchy) continue;
            const next = Vec3.distance(player.node.worldPosition, fire.node.worldPosition);
            if (next <= distance) { nearest = fire; distance = next; }
        }
        return nearest;
    }

    private CanPray(player: ZRSJZ_Player): boolean {
        return this.CanInteract(player) && isValid(this._point, true) && this._point.activeInHierarchy
            && Vec3.distance(player.node.worldPosition, this._point.worldPosition) <= ZRSJZ_PRAYER_CONFIG.PrayRadius;
    }

    private SetFire(fire: PrayerFire, lit: boolean): void {
        if (fire.lit === lit || !isValid(fire.spine, true)) return;
        fire.lit = lit;
        fire.extinguishing = !lit;
        fire.spine.node.active = true;
        fire.spine.timeScale = ZRSJZ_Game.Instance?.GamePaused ? 0 : 1;
        if (lit) {
            fire.spine.setAnimation(0, ZRSJZ_PRAYER_CONFIG.LightAnimation, false);
            fire.spine.addAnimation(0, ZRSJZ_PRAYER_CONFIG.BurnAnimation, true, 0);
        } else fire.spine.setAnimation(0, ZRSJZ_PRAYER_CONFIG.ExtinguishAnimation, false);
        this.UpdateHints();
    }

    private Act(attack: ZRSJZ_Joystick_Attack, action: string): void {
        if (ZRSJZ_UIManager.Dragging) return;
        const player = ZRSJZ_Game.Instance?.GetPlayer(attack.PlayerIndex);
        if (action === '祈祷') {
            if (!this.CanPray(player)) return;
            const matches = this._required.size > 0 && this._fires.every(fire => fire.lit === this._required.has(fire.direction));
            if (matches) {
                void this.CompletePrayer();
            } else {
                this._fires.forEach(fire => this.SetFire(fire, false));
                void ZRSJZ_UIManager.Instance.ShowTip('祈祷失败，所有篝火已熄灭');
            }
        } else {
            const fire = this.FindFire(player);
            if (fire) this.SetFire(fire, action === '点亮');
        }
        this.UpdateButtons();
    }

    /** 先生成奖励箱再完成祈祷；加载失败保留本局点亮状态以便重试。 */
    private async CompletePrayer(): Promise<void> {
        if (this._completed || this._completing || isValid(this._rewardBox, true)) return;
        this._completing = true;
        this.UpdateButtons();
        const game = ZRSJZ_Game.Instance;
        const map = game?.CurMap;
        const mapConfig = ZRSJZ_MAP_CONFIG.get(ZRSJZ_GameData.Instance.CurMap);
        const position = this._point.worldPosition.clone();
        let node: Node = null;
        try {
            if (!mapConfig?.Paracargo || !isValid(map?.Unit, true)) throw new Error('缺少地图空投配置或箱子父节点');
            const prefab = await ZRSJZ_Tools.LoadPrefabByBundle('73_ZRSJZ_DLC', ZRSJZ_PRAYER_BOX_CONFIG.PrefabPath);
            if (!isValid(this, true) || !this.enabledInHierarchy || game !== ZRSJZ_Game.Instance
                || game.IsGameFinished || !isValid(map.Unit, true)) return;
            node = instantiate(prefab);
            node.active = false;
            const box = node.getComponent(ZRSJZ_Box);
            if (!box) throw new Error('祈祷箱预制体缺少ZRSJZ_Box组件');
            node.parent = map.Unit;
            const layer = (child: Node): void => { child.layer = this._point.layer; child.children.forEach(layer); };
            layer(node);
            node.setWorldPosition(position.x + ZRSJZ_PRAYER_BOX_CONFIG.SpawnOffset.x,
                position.y + ZRSJZ_PRAYER_BOX_CONFIG.SpawnOffset.y, position.z);
            box.BoxName = ZRSJZ_PRAYER_BOX_CONFIG.BoxName;
            box.IsInit = false;
            const lootConfig = { ...mapConfig.Paracargo, ...ZRSJZ_PRAYER_BOX_CONFIG.LootOverrides };
            box.ConfigureFixedLoot(ZRSJZ_ParacargoBox.GenerateHighValueLoot(lootConfig, mapConfig));
            if (!box.LootProps.length) throw new Error('祈祷箱没有可用物资');
            this._rewardBox = node;
            node.active = true;
            this._completed = true;
            this._prayer.active = false;
            void ZRSJZ_UIManager.Instance.ShowTip('祈祷成功，奖励箱已出现');
        } catch (error) {
            if (isValid(node, true)) node.destroy();
            console.error('[祈祷] 奖励箱生成失败', error);
            if (isValid(this, true) && game === ZRSJZ_Game.Instance && !game.IsGameFinished) {
                void ZRSJZ_UIManager.Instance.ShowTip('奖励箱加载失败，请再次祈祷');
            }
        } finally {
            this._completing = false;
            if (isValid(this, true)) this.UpdateButtons();
        }
    }

    private UpdateHints(): void {
        const period = Math.max(0.1, ZRSJZ_PRAYER_CONFIG.BlinkPeriod);
        for (const hint of this._hints) {
            if (!isValid(hint.node, true)) continue;
            const lit = this._fires.find(fire => fire.direction === hint.direction)?.lit;
            hint.node.active = !!lit || this._required.has(hint.direction);
            hint.opacity.opacity = lit ? 255 : Math.round(80 + 175 * (Math.cos(this._elapsed * Math.PI * 2 / period) + 1) / 2);
        }
    }

    private UpdateButtons(): void {
        for (const attack of this.GetControls()) {
            const player = ZRSJZ_Game.Instance?.GetPlayer(attack.PlayerIndex);
            const fire = this.FindFire(player);
            for (const action of ['点亮', '熄灭', '祈祷']) {
                const button = attack.node.getChildByName(action);
                if (!button) continue;
                if (!this._buttons.has(button)) {
                    const callback = () => this.Act(attack, action);
                    button.on(Button.EventType.CLICK, callback, this);
                    this._buttons.set(button, callback);
                }
                button.active = attack.node.activeInHierarchy && (action === '祈祷' ? this.CanPray(player)
                    : !!fire && (action === '点亮' ? !fire.lit : fire.lit));
            }
        }
    }

    protected update(dt: number): void {
        const game = ZRSJZ_Game.Instance;
        if (!game) return;
        const paused = game.GamePaused || game.IsGameFinished;
        if (!paused) this._elapsed += dt;
        for (const fire of this._fires) {
            if (!isValid(fire.spine, true)) continue;
            fire.spine.timeScale = paused ? 0 : 1;
            if (!paused && fire.extinguishing && fire.spine.getCurrent(0)?.isComplete()) {
                fire.extinguishing = false;
                fire.spine.node.active = false;
            }
        }
        this.UpdateHints();
        this.UpdateButtons();
    }

    protected onDisable(): void {
        for (const button of this._buttons.keys()) { if (isValid(button, true)) button.active = false; }
    }

    protected onDestroy(): void {
        // 按钮属于控制UI，退出地图时解除跨节点监听；篝火Spine随地图自行释放。
        for (const [button, callback] of this._buttons) {
            if (!isValid(button, true)) continue;
            button.off(Button.EventType.CLICK, callback, this);
            button.active = false;
        }
        this._buttons.clear();
    }
}
