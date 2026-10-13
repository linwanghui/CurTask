import { _decorator, Button, CircleCollider2D, Component, instantiate, isValid, Node, UITransform, Vec3 } from 'cc';
import { ZRSJZ_Game } from '../ZRSJZ_Game';
import { ZRSJZ_GameData } from '../ZRSJZ_GameData';
import { ZRSJZ_MAP_CONFIG } from '../ZRSJZ_Constant';
import { ZRSJZ_UIManager } from '../Manager/ZRSJZ_UIManager';
import { ZRSJZ_Tools } from '../ZRSJZ_Tools';
import { ZRSJZ_Box } from '../Unit/ZRSJZ_Box';
import { ZRSJZ_ParacargoBox } from '../Unit/ZRSJZ_ParacargoBox';
import { ZRSJZ_Joystick_Attack } from './ZRSJZ_Joystick_Attack';
const { ccclass } = _decorator;
export const ZRSJZ_SNOW_PRAYER_PANEL = '73_ZRSJZ_DLC/Prefabs/Panel/雪地玩法弹窗';

/** 状态属于本局地图实例；成功后永久关闭本局祈祷入口。 */
@ccclass('ZRSJZ_SnowPrayer')
export class ZRSJZ_SnowPrayer extends Component {
    private _range: Node = null;
    private _rewardPoint: Node = null;
    private _completed = false;
    private _rewardLoading = false;
    private _panelOpen = false;
    private _opening = false;
    private _buttons = new Map<Node, () => void>();
    private _local = new Vec3();

    protected start(): void {
        const visit = (node: Node): void => {
            if (node.name === '石像祈祷范围') this._range = node;
            node.children.forEach(visit);
        };
        visit(this.node);
        this._rewardPoint = this._range?.getChildByName('奖励下发地点');
    }

    public get Available(): boolean {
        const game = ZRSJZ_Game.Instance;
        return isValid(this, true) && this.enabledInHierarchy && !this._completed
            && !!game && game.CurMap?.node === this.node && !game.IsGameFinished && ZRSJZ_UIManager.ZRSJZ_DLC;
    }

    private CanPray(index: number): boolean {
        const game = ZRSJZ_Game.Instance;
        const player = game?.GetPlayer(index);
        const circle = this._range?.getComponent(CircleCollider2D);
        const area = this._range?.getComponent(UITransform);
        if (!this.Available || game.GamePaused || this._panelOpen || this._opening || this._rewardLoading
            || !player?.node?.activeInHierarchy || player.IsDead || player.IsFishing || player.IsFrozen
            || !this._range?.activeInHierarchy || !circle?.enabled || !area) return false;
        area.convertToNodeSpaceAR(player.node.worldPosition, this._local);
        const x = this._local.x - circle.offset.x, y = this._local.y - circle.offset.y;
        return x * x + y * y <= circle.radius * circle.radius;
    }

    private async Pray(index: number): Promise<void> {
        if (!this.CanPray(index) || ZRSJZ_UIManager.Dragging) return;
        this._opening = true;
        this.UpdateButtons();
        try {
            await ZRSJZ_Tools.LoadPrefabByBundle('73_ZRSJZ_DLC', 'Prefabs/Panel/雪地玩法弹窗');
            this._opening = false;
            if (!this.CanPray(index)) return;
            this._panelOpen = true;
            ZRSJZ_UIManager.Instance.ShowPanel(ZRSJZ_SNOW_PRAYER_PANEL, this);
        } catch (error) {
            console.error('[雪地祈祷] 弹窗加载失败', error);
            if (this.Available) void ZRSJZ_UIManager.Instance.ShowTip('玩法弹窗加载失败，请再次祈祷');
        } finally {
            this._opening = false;
            if (isValid(this, true)) this.UpdateButtons();
        }
    }

    public PanelClosed(): void { this._panelOpen = false; }

    /** 发奖成功才消耗祈祷；失败可重试，异步回调不能把奖励发到下一局。 */
    public async Complete(): Promise<boolean> {
        if (!this.Available || this._rewardLoading || !this._rewardPoint?.isValid) return false;
        this._rewardLoading = true;
        const game = ZRSJZ_Game.Instance, map = game.CurMap;
        const config = ZRSJZ_MAP_CONFIG.get(ZRSJZ_GameData.Instance.CurMap);
        let reward: Node = null;
        try {
            if (!config?.Paracargo || !map.Unit?.isValid) throw new Error('缺少空投奖励配置');
            const prefab = await ZRSJZ_Tools.LoadPrefabByBundle('73_ZRSJZ_DLC', 'Prefabs/Unit/箱子/解密宝箱');
            if (!this.Available || game !== ZRSJZ_Game.Instance || game.CurMap !== map || !map.Unit.isValid) return false;
            reward = instantiate(prefab);
            reward.active = false;
            reward.parent = map.Unit;
            const layer = (node: Node): void => { node.layer = this._range.layer; node.children.forEach(layer); };
            layer(reward);
            reward.setWorldPosition(this._rewardPoint.worldPosition);
            const box = reward.getComponent(ZRSJZ_Box);
            if (!box) throw new Error('解密宝箱缺少箱子组件');
            box.IsInit = false;
            box.ConfigureFixedLoot(ZRSJZ_ParacargoBox.GenerateHighValueLoot(config.Paracargo, config));
            if (!box.LootProps.length) throw new Error('解密宝箱奖励为空');
            reward.active = true;
            this._completed = true;
            this._range.active = false;
            void ZRSJZ_UIManager.Instance.ShowTip('解谜成功，解密宝箱已出现');
            return true;
        } catch (error) {
            if (isValid(reward, true)) reward.destroy();
            console.error('[雪地祈祷] 奖励生成失败', error);
            if (this.Available) void ZRSJZ_UIManager.Instance.ShowTip('奖励加载失败，请重试');
            return false;
        } finally {
            this._rewardLoading = false;
            if (isValid(this, true)) this.UpdateButtons();
        }
    }

    private UpdateButtons(): void {
        const game = ZRSJZ_Game.Instance;
        const roots = [game?.OnePlayerModel, game?.TwoPlayerModel];
        for (const root of roots) {
            if (!root?.isValid) continue;
            for (const attack of root.getComponentsInChildren(ZRSJZ_Joystick_Attack)) {
                const button = attack.node.getChildByName('祈祷');
                if (!button) continue;
                if (!this._buttons.has(button)) {
                    const callback = () => { void this.Pray(attack.PlayerIndex); };
                    button.on(Button.EventType.CLICK, callback, this);
                    this._buttons.set(button, callback);
                }
                button.active = root.activeInHierarchy && attack.node.activeInHierarchy && this.CanPray(attack.PlayerIndex);
            }
        }
    }
    protected update(): void { this.UpdateButtons(); }
    protected onDisable(): void {
        ZRSJZ_UIManager.Instance?.HidePanel(ZRSJZ_SNOW_PRAYER_PANEL);
        for (const button of this._buttons.keys()) if (button.isValid) button.active = false;
    }
    protected onDestroy(): void {
        for (const [button, callback] of this._buttons) if (button.isValid) {
            button.off(Button.EventType.CLICK, callback, this);
            button.active = false;
        }
        this._buttons.clear();
    }
}
