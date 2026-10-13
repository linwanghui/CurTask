import { _decorator, Button, EventTouch, Layout, Node, Sprite, Tween, tween, UIOpacity, UITransform, Vec3 } from 'cc';
import { ZRSJZ_Panel } from './ZRSJZ_Panel';
import { ZRSJZ_SnowPrayer, ZRSJZ_SNOW_PRAYER_PANEL } from '../Controller/ZRSJZ_SnowPrayer';
import { ZRSJZ_Game } from '../ZRSJZ_Game';
import { ZRSJZ_UIManager } from '../Manager/ZRSJZ_UIManager';
const { ccclass } = _decorator;
interface Stone { node: Node; home: Vec3; slot: Node; }

@ccclass('ZRSJZ_SnowPrayerPanel')
export class ZRSJZ_SnowPrayerPanel extends ZRSJZ_Panel {
    private _owner: ZRSJZ_SnowPrayer = null;
    private _stones: Stone[] = [];
    private _slots: Node[] = [];
    private _homes: Vec3[] = [];
    private _highlight: Node = null;
    private _drag: Stone = null;
    private _dragOriginSlot: Node = null;
    private _touchID = -1;
    private _offset = new Vec3();
    private _local = new Vec3();
    private _completing = false;
    private _version = 0;
    private _game: ZRSJZ_Game = null;
    private _wasPaused = false;
    public get CanClose(): boolean { return !this._completing; }

    protected onLoad(): void {
        this.Panel = this.node.getChildByName('Panel');
        const random = this.Panel.getChildByName('石块随机位置');
        const correct = this.Panel.getChildByName('底部')?.getChildByName('石块正确位置');
        random?.getComponent(Layout)?.updateLayout();
        correct?.getComponent(Layout)?.updateLayout();
        const layout = random?.getComponent(Layout);
        if (layout) layout.enabled = false;
        this._slots = correct?.children.filter(node => /^石块[1-4]$/.test(node.name)) ?? [];
        // 正确位置保留为不可见槽位，避免直接显示答案。
        for (const slot of this._slots) {
            const sprite = slot.getComponent(Sprite);
            if (sprite) sprite.enabled = false;
        }
        if (correct) correct.active = true;
        this._stones = (random?.children ?? []).filter(node => /^石块[1-4]$/.test(node.name))
            .map(node => ({ node, home: node.position.clone(), slot: null }));
        this._homes = this._stones.map(stone => stone.home.clone());
        this._highlight = this.Panel.getChildByName('高亮');
        if (this._highlight) this._highlight.active = false;
        for (const stone of this._stones) {
            stone.node.on(Node.EventType.TOUCH_START, (event: EventTouch) => this.StartDrag(stone, event), this);
            stone.node.on(Node.EventType.TOUCH_MOVE, (event: EventTouch) => this.MoveDrag(stone, event), this);
            stone.node.on(Node.EventType.TOUCH_END, (event: EventTouch) => this.EndDrag(stone, event, false), this);
            stone.node.on(Node.EventType.TOUCH_CANCEL, (event: EventTouch) => this.EndDrag(stone, event, true), this);
        }
        for (const button of [this.node.getChildByName('Mask'), this.Panel.getChildByName('关闭')]) {
            button?.on(Button.EventType.CLICK, this.Close, this);
        }
    }

    public Show(owner: ZRSJZ_SnowPrayer): void {
        if (!owner?.Available) { owner?.PanelClosed(); return; }
        this._owner = owner;
        ++this._version;
        this._completing = false;
        const homes = this._homes.map(position => position.clone());
        for (let i = homes.length - 1; i > 0; --i) {
            const j = Math.floor(Math.random() * (i + 1));
            [homes[i], homes[j]] = [homes[j], homes[i]];
        }
        // 即使随机碰巧等于原顺序，也至少交换一对。
        if (homes.length > 1 && homes.every((position, i) => Vec3.equals(position, this._homes[i]))) {
            [homes[0], homes[1]] = [homes[1], homes[0]];
        }
        this._stones.forEach((stone, i) => { stone.home = homes[i]; this.ReturnHome(stone); });
        if (this._highlight) {
            const opacity = this._highlight.getComponent(UIOpacity);
            if (opacity) Tween.stopAllByTarget(opacity);
            this._highlight.active = false;
        }
        this._game = ZRSJZ_Game.Instance;
        this._wasPaused = this._game?.GamePaused ?? false;
        if (this._game) this._game.GamePaused = true;
        super.Show();
    }

    private ReturnHome(stone: Stone): void {
        stone.slot = null;
        stone.node.setPosition(stone.home);
    }

    private TouchLocal(stone: Stone, event: EventTouch): Vec3 {
        const point = event.getUILocation();
        this._local.set(point.x, point.y, 0);
        stone.node.parent.getComponent(UITransform).convertToNodeSpaceAR(this._local, this._local);
        return this._local;
    }

    private StartDrag(stone: Stone, event: EventTouch): void {
        if (this._completing || this._drag || !this._owner?.Available) return;
        this._drag = stone;
        this._dragOriginSlot = stone.slot;
        this._touchID = event.getID();
        stone.slot = null;
        const point = this.TouchLocal(stone, event);
        this._offset.set(stone.node.position.x - point.x, stone.node.position.y - point.y, 0);
        stone.node.setSiblingIndex(stone.node.parent.children.length - 1);
        ZRSJZ_UIManager.Dragging = true;
        event.propagationStopped = true;
    }

    private MoveDrag(stone: Stone, event: EventTouch): void {
        if (this._drag !== stone || this._touchID !== event.getID()) return;
        const point = this.TouchLocal(stone, event);
        stone.node.setPosition(point.x + this._offset.x, point.y + this._offset.y, 0);
        event.propagationStopped = true;
    }

    private EndDrag(stone: Stone, event: EventTouch, cancelled: boolean): void {
        if (this._drag !== stone || this._touchID !== event.getID()) return;
        this.MoveDrag(stone, event);
        const originSlot = this._dragOriginSlot;
        this._drag = null;
        this._dragOriginSlot = null;
        this._touchID = -1;
        ZRSJZ_UIManager.Dragging = false;
        const point = event.getUILocation();
        let target: Node = null, distance = Number.POSITIVE_INFINITY;
        if (!cancelled) for (const slot of this._slots) {
            const area = slot.getComponent(UITransform);
            area.convertToNodeSpaceAR(new Vec3(point.x, point.y, 0), this._local);
            if (this._local.x < -area.width * area.anchorX || this._local.x > area.width * (1 - area.anchorX)
                || this._local.y < -area.height * area.anchorY || this._local.y > area.height * (1 - area.anchorY)) continue;
            const next = this._local.x * this._local.x + this._local.y * this._local.y;
            if (next < distance) { target = slot; distance = next; }
        }
        if (target) {
            const occupied = this._stones.find(other => other !== stone && other.slot === target);
            if (occupied) {
                if (originSlot) {
                    occupied.slot = originSlot;
                    occupied.node.setWorldPosition(originSlot.worldPosition);
                } else this.ReturnHome(occupied);
            }
            stone.slot = target;
            stone.node.setWorldPosition(target.worldPosition);
        } else this.ReturnHome(stone);
        this.CheckSolution();
    }

    private CheckSolution(): void {
        if (this._completing || this._stones.length !== 4 || this._slots.length !== 4
            || !this._stones.every(stone => stone.slot?.name === stone.node.name)) return;
        this._completing = true;
        const version = this._version;
        const finish = async (): Promise<void> => {
            if (version !== this._version || !this.node.activeInHierarchy) return;
            const success = await this._owner?.Complete();
            if (version !== this._version || !this.node.isValid) return;
            this._completing = false;
            if (success) this.Close();
            else {
                if (this._highlight) this._highlight.active = false;
                // 保留正确摆法；任意重新拖放即可重试发奖。
            }
        };
        if (!this._highlight) { void finish(); return; }
        this._highlight.active = true;
        const opacity = this._highlight.getComponent(UIOpacity) ?? this._highlight.addComponent(UIOpacity);
        opacity.opacity = 255;
        tween(opacity).repeat(3, tween().to(0.18, { opacity: 40 }).to(0.18, { opacity: 255 }))
            .call(() => { void finish(); }).start();
    }

    private Close(): void {
        if (!this.CanClose) return;
        ZRSJZ_UIManager.Instance.HidePanel(ZRSJZ_SNOW_PRAYER_PANEL);
    }

    protected update(): void {
        // 战局结束或地图销毁时，闪烁/加载中的面板也必须退出。
        if (this._owner && !this._owner.Available) {
            this._completing = false;
            this.Close();
        }
    }

    protected onDisable(): void {
        ++this._version;
        if (this._drag) ZRSJZ_UIManager.Dragging = false;
        this._drag = null;
        this._dragOriginSlot = null;
        this._touchID = -1;
        const opacity = this._highlight?.getComponent(UIOpacity);
        if (opacity) Tween.stopAllByTarget(opacity);
        this._owner?.PanelClosed();
        this._owner = null;
        if (this._game?.isValid && this._game === ZRSJZ_Game.Instance && !this._game.IsGameFinished) {
            this._game.GamePaused = this._wasPaused;
        }
        this._game = null;
        this._completing = false;
    }
}
