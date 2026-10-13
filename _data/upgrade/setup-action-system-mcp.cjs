const fs = require('fs'), crypto = require('crypto');
const { call } = require('./mcp.cjs');
const root = 'assets/Game_Bundles/73_ZRSJZ/Scripts/';
const sources = {
 'Service/ZRSJZ_ActionService.ts': `import { SpriteFrame } from 'cc';
import { ZRSJZ_ACTION_CONFIG, ZRSJZ_ACTION_MAX_EQUIPPED } from '../ZRSJZ_Constant';
import { ZRSJZ_GameData } from '../ZRSJZ_GameData';
import { ZRSJZ_Tools } from '../ZRSJZ_Tools';

/** 装备数组的顺序对应圆盘上、右、下、左；卸下后后续动作向前补位。 */
export class ZRSJZ_ActionService {
    private static icons = new Map<string, Promise<SpriteFrame>>();
    public static RefreshUnlocks(): void {
        const data = ZRSJZ_GameData.Instance;
        let changed = false;
        for (const config of ZRSJZ_ACTION_CONFIG) {
            const unlock = config.Unlock;
            if ((unlock.Type === 'default' || (unlock.Type === 'level' && data.Grade >= unlock.Level))
                && !data.UnlockedActions.includes(config.Name)) {
                data.UnlockedActions.push(config.Name); changed = true;
            }
        }
        if (changed) ZRSJZ_GameData.SaveData();
    }
    public static Equip(name: string): string {
        this.RefreshUnlocks();
        const data = ZRSJZ_GameData.Instance;
        if (!ZRSJZ_ACTION_CONFIG.some(item => item.Name === name)) return '动作不存在';
        if (!data.UnlockedActions.includes(name)) return '动作尚未解锁';
        if (data.EquippedActions.includes(name)) return '';
        if (data.EquippedActions.length >= ZRSJZ_ACTION_MAX_EQUIPPED) return '动作已满';
        data.EquippedActions.push(name);
        ZRSJZ_GameData.SaveData();
        return '';
    }
    public static Unequip(name: string): void {
        const data = ZRSJZ_GameData.Instance;
        data.EquippedActions = data.EquippedActions.filter(action => action !== name);
        ZRSJZ_GameData.SaveData();
    }
    public static Play(index: number): void {
        const data = ZRSJZ_GameData.Instance;
        const name = data.EquippedActions[index];
        if (name && data.UnlockedActions.includes(name)) console.log('[动作] 播放动画：' + name);
    }
    public static GetDirection(x: number, y: number): number {
        if (x * x + y * y < 24 * 24) return -1;
        return Math.abs(y) >= Math.abs(x) ? (y >= 0 ? 0 : 2) : (x >= 0 ? 1 : 3);
    }
    public static LoadIcon(name: string): Promise<SpriteFrame> {
        if (!this.icons.has(name)) {
            const request = ZRSJZ_Tools.LoadSpriteByBundle('73_ZRSJZ_DLC', 'Sprites/动作系统/动作/' + name)
                .catch(error => { this.icons.delete(name); throw error; });
            this.icons.set(name, request);
        }
        return this.icons.get(name);
    }
}
`,
 'Controller/ZRSJZ_ActionButton.ts': `import { _decorator, Component, director, EventTouch, input, Input, isValid, Node, Sprite, Tween, tween, UITransform, Vec3 } from 'cc';
import { ZRSJZ_GameData } from '../ZRSJZ_GameData';
import { ZRSJZ_ActionService } from '../Service/ZRSJZ_ActionService';
import { ZRSJZ_UIManager } from '../Manager/ZRSJZ_UIManager';
const { ccclass } = _decorator;

@ccclass('ZRSJZ_ActionButton')
export class ZRSJZ_ActionButton extends Component {
    private disc: Node = null;
    private pointer: Node = null;
    private custom: Node = null;
    private slots: Node[] = [];
    private opened = false;
    private animating = false;
    private pendingClose = false;
    private touchID = -1;
    private pressTime = 0;
    private holding = false;
    private dragging = false;
    private selected = -1;
    private point = new Vec3();
    private discScale = new Vec3(1, 1, 1);
    private discAngle = 0;
    private iconVersion = 0;
    private equipmentKey = '';
    private readonly longPressSeconds = 0.3;

    protected onLoad(): void {
        this.disc = this.node.getChildByName('动作圆盘');
        this.pointer = this.disc?.getChildByName('动作拖动');
        this.custom = this.node.getChildByName('自定义');
        if (!this.disc) return;
        this.discScale.set(this.disc.scale);
        this.discAngle = this.disc.angle;
        this.slots = [1, 2, 3, 4].map(i => this.disc.getChildByName('动作' + i));
        this.slots.forEach((slot, index) => slot?.on(Node.EventType.TOUCH_END, (event: EventTouch) => {
            event.propagationStopped = true;
            if (this.opened && !this.animating && !this.holding) this.Select(index);
        }, this));
        this.custom?.on(Node.EventType.TOUCH_END, (event: EventTouch) => {
            event.propagationStopped = true;
            if (!this.opened || this.animating || this.holding || !this.IsHome()) return;
            this.CloseDisc();
            ZRSJZ_UIManager.Instance.ShowPanel('73_ZRSJZ_DLC/Prefabs/Panel/动作弹窗');
        }, this);
        this.node.on(Node.EventType.TOUCH_START, this.StartPress, this);
        this.node.on(Node.EventType.TOUCH_MOVE, this.MovePress, this);
        this.node.on(Node.EventType.TOUCH_END, this.EndPress, this);
        // Cocos 会把范围外松手转换成节点 TOUCH_CANCEL，且节点可能吞掉全局事件。
        this.node.on(Node.EventType.TOUCH_CANCEL, this.EndOutsidePress, this);
        this.ResetDisc();
    }
    protected onEnable(): void {
        input.on(Input.EventType.TOUCH_START, this.OutsidePress, this);
        input.on(Input.EventType.TOUCH_MOVE, this.MovePress, this);
        input.on(Input.EventType.TOUCH_END, this.EndPress, this);
        input.on(Input.EventType.TOUCH_CANCEL, this.CancelPress, this);
        this.equipmentKey = '';
    }
    private IsHome(): boolean { return director.getScene()?.name === 'ZRSJZ_Start'; }
    private Contains(node: Node, event: EventTouch): boolean {
        if (!node?.activeInHierarchy) return false;
        const area = node.getComponent(UITransform);
        if (!area) return false;
        const p = event.getUILocation();
        const local = area.convertToNodeSpaceAR(new Vec3(p.x, p.y, 0));
        return local.x >= -area.width * area.anchorX && local.x <= area.width * (1 - area.anchorX)
            && local.y >= -area.height * area.anchorY && local.y <= area.height * (1 - area.anchorY);
    }
    private OutsidePress(event: EventTouch): void {
        if (this.opened && !this.animating && !this.holding && !this.Contains(this.node, event)
            && !this.Contains(this.disc, event) && !this.Contains(this.custom, event)) this.CloseDisc();
    }
    private StartPress(event: EventTouch): void {
        if (this.animating || this.holding || event.target !== this.node || !this.disc) return;
        event.propagationStopped = true;
        this.touchID = event.getID(); this.pressTime = 0; this.holding = true;
        this.dragging = false; this.selected = -1;
        this.ReadPoint(event);
    }
    private ReadPoint(event: EventTouch): void {
        const p = event.getUILocation();
        this.node.getComponent(UITransform).convertToNodeSpaceAR(new Vec3(p.x, p.y, 0), this.point);
    }
    private MovePress(event: EventTouch): void {
        if (!this.holding || event.getID() !== this.touchID) return;
        event.propagationStopped = true;
        this.ReadPoint(event);
        if (this.dragging && !this.animating) this.UpdateDirection();
    }
    private UpdateDirection(): void {
        const index = ZRSJZ_ActionService.GetDirection(this.point.x, this.point.y);
        this.selected = index;
        if (this.pointer) {
            this.pointer.active = index >= 0;
            // 预制体指示图默认朝上，仅允许上、右、下、左四个角度。
            if (index >= 0) this.pointer.angle = -90 * index;
        }
    }
    private EndPress(event: EventTouch): void {
        if (!this.holding || event.getID() !== this.touchID) return;
        event.propagationStopped = true;
        this.ReadPoint(event);
        const dragged = this.dragging;
        this.holding = false; this.touchID = -1;
        if (dragged) {
            if (this.animating) this.pendingClose = true;
            else { this.UpdateDirection(); this.Select(this.selected); }
        } else if (!this.animating) {
            if (this.opened) this.CloseDisc(); else this.OpenDisc();
        }
        this.dragging = false;
        if (this.pointer) this.pointer.active = false;
    }
    private EndOutsidePress(event: EventTouch): void {
        // 3.8.6 的 getEventCode 保留派发前的原始触摸类型，type 已被节点命中检测改写。
        if (event.getEventCode() === Input.EventType.TOUCH_END) this.EndPress(event);
        else this.CancelPress(event);
    }
    private CancelPress(event: EventTouch): void {
        if (!this.holding || event.getID() !== this.touchID) return;
        this.holding = false; this.dragging = false; this.touchID = -1;
        if (this.pointer) this.pointer.active = false;
        if (this.animating) this.pendingClose = true; else this.CloseDisc();
    }
    private Select(index: number): void {
        if (this.animating || !this.opened) return;
        if (index >= 0 && index < 4) ZRSJZ_ActionService.Play(index);
        this.CloseDisc();
    }
    private OpenDisc(): void {
        if (!this.disc || this.animating || this.opened) return;
        this.opened = true; this.animating = true; this.pendingClose = false;
        this.disc.active = true;
        this.disc.setScale(this.discScale.x * 0.05, this.discScale.y * 0.05, this.discScale.z);
        this.disc.angle = this.discAngle - 90;
        if (this.custom) this.custom.active = false;
        tween(this.disc).to(0.22, { scale: this.discScale.clone(), angle: this.discAngle }, { easing: 'quadOut' })
            .call(() => {
                this.animating = false;
                if (this.custom) this.custom.active = this.IsHome() && !this.dragging;
                if (this.pendingClose) this.CloseDisc();
                else if (this.dragging) this.UpdateDirection();
            }).start();
    }
    private CloseDisc(): void {
        if (!this.disc || !this.opened || this.animating) return;
        this.animating = true; this.pendingClose = false;
        if (this.custom) this.custom.active = false;
        if (this.pointer) this.pointer.active = false;
        tween(this.disc).to(0.18, {
            scale: new Vec3(this.discScale.x * 0.05, this.discScale.y * 0.05, this.discScale.z),
            angle: this.discAngle + 90,
        }, { easing: 'quadIn' }).call(() => this.ResetDisc()).start();
    }
    private ResetDisc(): void {
        this.opened = false; this.animating = false; this.pendingClose = false;
        if (this.disc) { Tween.stopAllByTarget(this.disc); this.disc.active = false; }
        if (this.pointer) this.pointer.active = false;
        if (this.custom) this.custom.active = false;
    }
    private RefreshIcons(): void {
        const names = ZRSJZ_GameData.Instance.EquippedActions;
        const key = JSON.stringify(names);
        if (key === this.equipmentKey) return;
        this.equipmentKey = key;
        const version = ++this.iconVersion;
        this.slots.forEach((slot, index) => {
            if (!slot) return;
            const sprite = (slot.getChildByName('Icon') ?? slot).getComponent(Sprite);
            if (!sprite) return;
            sprite.spriteFrame = null;
            const name = names[index];
            if (name) void ZRSJZ_ActionService.LoadIcon(name).then(frame => {
                if (isValid(this, true) && isValid(sprite, true) && version === this.iconVersion) sprite.spriteFrame = frame;
            }).catch(error => console.error('[动作] 图标加载失败', name, error));
        });
    }
    protected update(dt: number): void {
        if (!this.disc) return;
        this.RefreshIcons();
        if (this.holding && !this.dragging) {
            this.pressTime += dt;
            if (this.pressTime >= this.longPressSeconds) {
                this.dragging = true;
                if (this.custom) this.custom.active = false;
                this.OpenDisc();
                if (!this.animating) this.UpdateDirection();
            }
        }
    }
    protected onDisable(): void {
        input.off(Input.EventType.TOUCH_START, this.OutsidePress, this);
        input.off(Input.EventType.TOUCH_MOVE, this.MovePress, this);
        input.off(Input.EventType.TOUCH_END, this.EndPress, this);
        input.off(Input.EventType.TOUCH_CANCEL, this.CancelPress, this);
        this.holding = false; this.dragging = false; this.touchID = -1;
        ++this.iconVersion; this.equipmentKey = '';
        this.ResetDisc();
    }
}
`,
 'Panel/ZRSJZ_ActionPanel.ts': `import { _decorator, Button, EventTouch, instantiate, isValid, Label, Layout, Node, Sprite } from 'cc';
import { ZRSJZ_Panel } from './ZRSJZ_Panel';
import { ZRSJZ_ACTION_CONFIG } from '../ZRSJZ_Constant';
import { ZRSJZ_GameData } from '../ZRSJZ_GameData';
import { ZRSJZ_ActionService } from '../Service/ZRSJZ_ActionService';
import { ZRSJZ_UIManager } from '../Manager/ZRSJZ_UIManager';
const { ccclass } = _decorator;

@ccclass('ZRSJZ_ActionPanel')
export class ZRSJZ_ActionPanel extends ZRSJZ_Panel {
    private items = new Map<string, Node>();
    private selected = '';
    protected onLoad(): void {
        this.Panel = this.node.getChildByName('Panel');
        const content = this.Panel.getChildByName('所有动作')?.getChildByName('View')?.getChildByName('Content');
        const template = content?.getChildByName('动作Item');
        if (template) {
            template.active = false;
            for (const config of ZRSJZ_ACTION_CONFIG) {
                const item = instantiate(template);
                item.name = '动作Item_' + config.Name; item.parent = content; item.active = true;
                item.getChildByName('Name').getComponent(Label).string = config.Name;
                this.items.set(config.Name, item);
                item.on(Node.EventType.TOUCH_END, (event: EventTouch) => {
                    event.propagationStopped = true;
                    this.selected = config.Name; this.Refresh();
                }, this);
                const icon = item.getChildByName('Icon')?.getComponent(Sprite);
                if (icon) {
                    icon.spriteFrame = null;
                    void ZRSJZ_ActionService.LoadIcon(config.Name).then(frame => {
                        if (isValid(icon, true)) icon.spriteFrame = frame;
                    }).catch(error => console.error('[动作] 图标加载失败', config.Name, error));
                }
            }
            content.getComponent(Layout)?.updateLayout();
        }
        this.Panel.getChildByName('装备')?.on(Button.EventType.CLICK, this.Equip, this);
        this.Panel.getChildByName('卸下')?.on(Button.EventType.CLICK, this.Unequip, this);
        this.Panel.getChildByName('关闭')?.on(Button.EventType.CLICK, this.Close, this);
        this.node.getChildByName('Mask')?.on(Button.EventType.CLICK, this.Close, this);
    }
    public Show(): void {
        ZRSJZ_ActionService.RefreshUnlocks();
        this.selected = ZRSJZ_ACTION_CONFIG[0]?.Name ?? '';
        this.Refresh(); super.Show();
    }
    private Refresh(): void {
        const data = ZRSJZ_GameData.Instance;
        for (const [name, item] of this.items) {
            item.getChildByName('Checked').active = name === this.selected;
            item.getChildByName('Lock').active = !data.UnlockedActions.includes(name);
            const order = data.EquippedActions.indexOf(name);
            const equipped = item.getChildByName('已装备');
            equipped.active = order >= 0;
            equipped.getComponent(Label).string = '已装备 ' + (order + 1);
        }
        const unlocked = data.UnlockedActions.includes(this.selected);
        const equipped = data.EquippedActions.includes(this.selected);
        this.Panel.getChildByName('Name').getComponent(Label).string = this.selected;
        this.Panel.getChildByName('装备').active = unlocked && !equipped;
        this.Panel.getChildByName('卸下').active = equipped;
        const condition = this.Panel.getChildByName('解锁条件');
        condition.active = !unlocked;
        condition.getComponent(Label).string = ZRSJZ_ACTION_CONFIG.find(item => item.Name === this.selected)?.Unlock.Description ?? '';
    }
    private Equip(): void {
        const error = ZRSJZ_ActionService.Equip(this.selected);
        if (error) void ZRSJZ_UIManager.Instance.ShowTip(error);
        this.Refresh();
    }
    private Unequip(): void { ZRSJZ_ActionService.Unequip(this.selected); this.Refresh(); }
    private Close(): void { ZRSJZ_UIManager.Instance.HidePanel('73_ZRSJZ_DLC/Prefabs/Panel/动作弹窗'); }
}
`,
};

function replaceOnce(source, before, after) {
 if (source.split(before).length !== 2) throw Error('Anchor not unique: ' + before);
 return source.replace(before, after);
}
function compress(uuid) {
 const h = uuid.replace(/-/g, ''), c = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
 let r = h.slice(0, 5);
 for (let i = 5; i < 32; i += 3) { const n = parseInt(h.slice(i, i + 3), 16); r += c[n >> 6] + c[n & 63]; }
 return r;
}
async function save(path, content) {
 const result = await call('assetAdvanced_asset_operations', { action: fs.existsSync(path) ? 'save' : 'create', url: 'db://' + path, content });
 if (fs.readFileSync(path, 'utf8') !== content) throw Error('MCP save mismatch: ' + path);
 console.log('MCP saved: ' + path);
 return result;
}
async function attach(prefabPath, script) {
 const a = JSON.parse(fs.readFileSync(prefabPath, 'utf8'));
 const type = compress(JSON.parse(fs.readFileSync(root + script + '.meta', 'utf8')).uuid);
 const nodeID = a[0].data.__id__;
 if (!a.some(n => n.__type__ === type)) {
  const index = a.length;
  a.push({ __type__: type, _name: '', _objFlags: 0, __editorExtras__: {}, node: { __id__: nodeID }, _enabled: true,
   __prefab: { __id__: index + 1 }, _id: '' });
  a.push({ __type__: 'cc.CompPrefabInfo', fileId: crypto.randomBytes(12).toString('base64') });
  a[nodeID]._components.push({ __id__: index });
 }
 if (prefabPath.endsWith('动作弹窗.prefab')) {
  for (const n of a) if (n.__type__ === 'cc.Button') n.clickEvents = [];
  const pathNode = a.find(n => n.__type__ === 'cc.Node' && n._name === 'Path');
  if (pathNode) pathNode._active = false;
  // 模板上复制来的路径脚本不再执行旧界面回调。
  for (const n of a) if (n.Path === '增强针界面') n._enabled = false;
  const layout = a.find(n => n.__type__ === 'cc.Layout');
  if (layout) { layout._spacingY = 46; layout._paddingTop = 35; }
 }
 if (prefabPath.endsWith('动作按钮.prefab')) {
  a.find(n => n.__type__ === 'cc.Node' && n._name === '动作圆盘')._active = false;
  a.find(n => n.__type__ === 'cc.Node' && n._name === '动作拖动')._active = false;
  a.find(n => n.__type__ === 'cc.Node' && n._name === '自定义')._active = false;
 }
 await save(prefabPath, JSON.stringify(a, null, 2));
 console.log(await call('prefab_prefab_browse', { action: 'validate', prefabPath: 'db://' + prefabPath }));
}

(async () => {
 let constant = fs.readFileSync(root + 'ZRSJZ_Constant.ts', 'utf8');
 if (!constant.includes('export const ZRSJZ_ACTION_CONFIG')) constant += '\n' + 
`/** 名称必须与 DLC/Sprites/动作系统/动作 中的图片名一致。 */
export interface ZRSJZ_ActionConfig {
    Name: string;
    Unlock: { Type: 'default' | 'level' | 'manual'; Level?: number; Description: string };
}
export const ZRSJZ_ACTION_MAX_EQUIPPED = 4;
export const ZRSJZ_ACTION_CONFIG: ZRSJZ_ActionConfig[] = [
    { Name: '浪子踢球', Unlock: { Type: 'default', Description: '默认解锁' } },
    { Name: '狗熊哆嗦毛', Unlock: { Type: 'default', Description: '默认解锁' } },
    { Name: '闪身步', Unlock: { Type: 'default', Description: '默认解锁' } },
];
`;
 await save(root + 'ZRSJZ_Constant.ts', constant);
 let data = fs.readFileSync(root + 'ZRSJZ_GameData.ts', 'utf8');
 data = replaceOnce(data, 'public static readonly Versions = 29;//当前版本：渔获丰收活动存档', 'public static readonly Versions = 30;//当前版本：动作系统，保留旧存档逐级迁移');
 data = replaceOnce(data, '    public Gold: number = 0;', '    /** 当前解锁动作和按圆盘顺序装备的动作（最多4个）。 */\n    public UnlockedActions: string[] = [];\n    public EquippedActions: string[] = [];\n\n    public Gold: number = 0;');
 await save(root + 'ZRSJZ_GameData.ts', data);
 let defaults = fs.readFileSync(root + 'Service/ZRSJZ_GameDataDefaults.ts', 'utf8');
 defaults = replaceOnce(defaults, '    ZRSJZ_AMMO_MAX_COUNT,', '    ZRSJZ_AMMO_MAX_COUNT,\n    ZRSJZ_ACTION_CONFIG,\n    ZRSJZ_ACTION_MAX_EQUIPPED,');
 defaults = replaceOnce(defaults, '        data.Gold = 100000;', "        data.UnlockedActions = ZRSJZ_ACTION_CONFIG.filter(item => item.Unlock.Type === 'default').map(item => item.Name);\n        data.EquippedActions = data.UnlockedActions.slice(0, ZRSJZ_ACTION_MAX_EQUIPPED);\n        data.Gold = 100000;");
 defaults = replaceOnce(defaults, '        const loadData = () => {', `        const loadData = () => {
            if (data.Versions === 29) {
                const names = new Set(ZRSJZ_ACTION_CONFIG.map(item => item.Name));
                const defaults = ZRSJZ_ACTION_CONFIG.filter(item => item.Unlock.Type === 'default').map(item => item.Name);
                const owned = Array.isArray(savedData.UnlockedActions) ? savedData.UnlockedActions : defaults;
                data.UnlockedActions = Array.from(new Set<string>([...owned.filter(name => names.has(name)), ...defaults]));
                const equipped = Array.isArray(savedData.EquippedActions) ? savedData.EquippedActions : defaults;
                data.EquippedActions = Array.from(new Set<string>(equipped.filter(name => data.UnlockedActions.includes(name))))
                    .slice(0, ZRSJZ_ACTION_MAX_EQUIPPED);
            }`);
 await save(root + 'Service/ZRSJZ_GameDataDefaults.ts', defaults);
 for (const [path, content] of Object.entries(sources)) await save(root + path, content);
 let start = fs.readFileSync(root + 'ZRSJZ_Start.ts', 'utf8');
 start = "import { ZRSJZ_ActionButton } from './Controller/ZRSJZ_ActionButton';\nimport { ZRSJZ_ActionService } from './Service/ZRSJZ_ActionService';\nimport { ZRSJZ_Tools } from './ZRSJZ_Tools';\n" + start;
 start = replaceOnce(start, '    protected onEnable(): void {', `    protected onEnable(): void {
        ZRSJZ_EventManager.OnPersist(ZRSJZ_MyEvent.ZRSJZ_LOADED_DLC, this.EnsureActionButton, this);
        void this.EnsureActionButton();`);
 start = replaceOnce(start, '    protected onDisable(): void {', `    protected onDisable(): void {
        ZRSJZ_EventManager.OffPersist(ZRSJZ_MyEvent.ZRSJZ_LOADED_DLC, this.EnsureActionButton, this);`);
 start = replaceOnce(start, '    protected update(dt: number): void {', `    private _actionButtonLoading = false;
    private _actionButton: Node = null;
    private _actionRetryTime = 0;
    private async EnsureActionButton(): Promise<void> {
        if (!ZRSJZ_UIManager.ZRSJZ_DLC || this._actionButtonLoading || isValid(this._actionButton, true)) return;
        const visit = (node: Node): Node => {
            if (node.name === '动作_主页') return node;
            for (const child of node.children) { const found = visit(child); if (found) return found; }
            return null;
        };
        // 控制脚本节点与 Canvas 是兄弟节点，挂载点位于 Canvas/UI 中。
        const holder = visit(this.UIPanel ?? director.getScene() ?? this.node);
        if (!holder) return;
        this._actionButtonLoading = true;
        try {
            const prefab = await ZRSJZ_Tools.LoadPrefabByBundle('73_ZRSJZ_DLC', 'Prefabs/动作按钮');
            if (!isValid(this, true) || !this.node.activeInHierarchy || !isValid(holder, true)) return;
            ZRSJZ_ActionService.RefreshUnlocks();
            const button = instantiate(prefab);
            button.parent = holder; button.setPosition(0, 0, 0);
            const setLayer = (node: Node): void => { node.layer = holder.layer; node.children.forEach(setLayer); };
            setLayer(button);
            if (!button.getComponent(ZRSJZ_ActionButton)) button.addComponent(ZRSJZ_ActionButton);
            this._actionButton = button;
        } catch (error) { console.error('[动作] 按钮加载失败', error); }
        finally { this._actionButtonLoading = false; }
    }

    protected update(dt: number): void {
        this._actionRetryTime += dt;
        if (this._actionRetryTime >= 1) { this._actionRetryTime = 0; void this.EnsureActionButton(); }`);
 await save(root + 'ZRSJZ_Start.ts', start);
 await attach('assets/Game_Bundles/73_ZRSJZ_DLC/Prefabs/动作按钮.prefab', 'Controller/ZRSJZ_ActionButton.ts');
 await attach('assets/Game_Bundles/73_ZRSJZ_DLC/Prefabs/Panel/动作弹窗.prefab', 'Panel/ZRSJZ_ActionPanel.ts');
 console.log(await call('debug_debug_console', { action: 'get_logs', limit: 20, filter: 'error' }));
})().catch(error => { console.error(error); process.exitCode = 1; });
