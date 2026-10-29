import { instantiate, isValid, Label, Node, Sprite, SpriteFrame, UITransform } from 'cc';
import { ZRSJZ_Element } from '../Service/ZRSJZ_ElementCombat';
import { ZRSJZ_UIManager } from '../Manager/ZRSJZ_UIManager';
import { ZRSJZ_Tools } from '../ZRSJZ_Tools';

type DebuffSlot = { icon: Node; num: Node; sprite: Sprite; label: Label;
    element: ZRSJZ_Element | null; version: number; visible: boolean; loading: boolean };

/** 复用敌人预制体的 DebuffIcon/DebuffNum；额外状态克隆同样的样式并排展示。 */
export class ZRSJZ_DebuffDisplay {
    private static readonly frames = new Map<ZRSJZ_Element, SpriteFrame>();
    private static readonly requests = new Map<ZRSJZ_Element, Promise<SpriteFrame>>();
    private readonly slots: DebuffSlot[] = [];
    private iconTemplate: Node = null;
    private numTemplate: Node = null;
    private gap = 100;

    constructor(private readonly root: Node) {
        this.iconTemplate = root.getChildByName('DebuffIcon');
        this.numTemplate = root.getChildByName('DebuffNum');
        // 兼容旧版动态文字节点，界面统一使用新增的两个预制体节点。
        const old = root.getChildByName('元素状态');
        if (old) old.active = false;
        if (this.iconTemplate) this.iconTemplate.active = false;
        if (this.numTemplate) this.numTemplate.active = false;
        if (!this.iconTemplate?.getComponent(Sprite) || !this.numTemplate?.getComponent(Label)) return;
        const size = this.iconTemplate.getComponent(UITransform)?.width ?? 41;
        const scale = Math.max(Math.abs(this.iconTemplate.scale.x), Math.abs(this.numTemplate.scale.x));
        this.gap = Math.max(100, size + 100) * scale;
        this.AddSlot(this.iconTemplate, this.numTemplate);
    }

    private AddSlot(icon: Node, num: Node): void {
        this.slots.push({ icon, num, sprite: icon.getComponent(Sprite), label: num.getComponent(Label),
            element: null, version: 0, visible: false, loading: false });
        icon.active = num.active = false;
    }
    private EnsureSlots(count: number): void {
        if (!this.slots.length) return;
        while (this.slots.length < count) {
            const index = this.slots.length;
            const icon = instantiate(this.iconTemplate), num = instantiate(this.numTemplate);
            icon.name = 'DebuffIcon_' + index; num.name = 'DebuffNum_' + index;
            icon.parent = this.iconTemplate.parent; num.parent = this.numTemplate.parent;
            const iconPos = this.iconTemplate.position.clone(), numPos = this.numTemplate.position.clone();
            iconPos.x += this.gap * index; numPos.x += this.gap * index;
            icon.setPosition(iconPos); num.setPosition(numPos);
            this.AddSlot(icon, num);
        }
    }
    private HideSlot(slot: DebuffSlot): void {
        if (slot.visible || slot.loading) slot.version++;
        slot.visible = slot.loading = false; slot.element = null;
        if (isValid(slot.icon)) slot.icon.active = false;
        if (isValid(slot.num)) slot.num.active = false;
        if (isValid(slot.label)) slot.label.string = '';
    }
    public Hide(): void { for (const slot of this.slots) this.HideSlot(slot); }

    public Update(state: any): void {
        if (!ZRSJZ_UIManager.ZRSJZ_DLC || !isValid(this.root) || !this.root.activeInHierarchy || !state) {
            this.Hide(); return;
        }
        const count = (value: number): number => Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
        const cold = count(state.cold), fire = count(state.fire), poison = count(state.poison);
        const entries: { element: ZRSJZ_Element; text: string }[] = [];
        if (cold || state.frozen || state.resist) entries.push({ element: '冰',
            text: state.frozen ? '冻结' : state.resist ? '抗性 x' + cold : 'x' + cold });
        if (fire) entries.push({ element: '火', text: 'x' + fire });
        if (poison) entries.push({ element: '毒', text: 'x' + poison });
        this.EnsureSlots(entries.length);
        for (let i = 0; i < this.slots.length; i++) {
            const slot = this.slots[i], entry = entries[i];
            if (!entry) { this.HideSlot(slot); continue; }
            slot.label.string = entry.text;
            if (slot.element === entry.element && slot.visible) continue;
            if (slot.element === entry.element && slot.loading) continue;
            slot.element = entry.element; slot.visible = false; slot.loading = true;
            slot.icon.active = slot.num.active = false;
            const version = ++slot.version;
            void ZRSJZ_DebuffDisplay.LoadFrame(entry.element).then(frame => {
                if (version !== slot.version || !isValid(this.root) || !this.root.activeInHierarchy
                    || !isValid(slot.sprite) || !isValid(slot.label) || !ZRSJZ_UIManager.ZRSJZ_DLC) return;
                slot.loading = false; slot.visible = true; slot.sprite.spriteFrame = frame;
                slot.icon.active = slot.num.active = true;
            }).catch(error => {
                if (version !== slot.version) return;
                slot.loading = false;
                console.warn('[元素减益图标] 加载失败', entry.element, error);
            });
        }
    }
    private static LoadFrame(element: ZRSJZ_Element): Promise<SpriteFrame> {
        const frame = this.frames.get(element);
        if (frame && isValid(frame)) return Promise.resolve(frame);
        const pending = this.requests.get(element);
        if (pending) return pending;
        const request = ZRSJZ_Tools.LoadSpriteByBundle('73_ZRSJZ_DLC', 'Sprites/铸枪界面/三元素枪/' + element + 'buff')
            .then(loaded => { this.frames.set(element, loaded); this.requests.delete(element); return loaded; },
                error => { this.requests.delete(element); throw error; });
        this.requests.set(element, request);
        return request;
    }
}
