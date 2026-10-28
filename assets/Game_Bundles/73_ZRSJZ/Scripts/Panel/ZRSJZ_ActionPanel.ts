import { _decorator, Button, EventTouch, instantiate, isValid, Label, Layout, Node, sp, Sprite } from 'cc';
import { ZRSJZ_Panel } from './ZRSJZ_Panel';
import { ZRSJZ_ACTION_CONFIG, ZRSJZ_SKIN_CONFIG, ZRSJZ_WEAPONRY_TYPE } from '../ZRSJZ_Constant';
import { ZRSJZ_Tools } from '../ZRSJZ_Tools';
import { ZRSJZ_GameData } from '../ZRSJZ_GameData';
import { ZRSJZ_ActionService } from '../Service/ZRSJZ_ActionService';
import { ZRSJZ_UIManager } from '../Manager/ZRSJZ_UIManager';
import Banner from 'db://assets/Scripts/Banner';
const { ccclass } = _decorator;

@ccclass('ZRSJZ_ActionPanel')
export class ZRSJZ_ActionPanel extends ZRSJZ_Panel {
    private items = new Map<string, Node>();
    private selected = '';
    private preview: sp.Skeleton = null;
    private previewData: Promise<sp.SkeletonData> = null;
    private previewVersion = 0;
    private lastVideo = 0;
    protected onLoad(): void {
        this.Panel = this.node.getChildByName('Panel');
        this.preview = this.Panel.getChildByName('Spine')?.getComponent(sp.Skeleton) ?? null;
        // 弹窗相机只渲染自定义 UI 层，新建 Spine 默认的 UI_2D 层不可见。
        if (this.preview) this.preview.node.layer = this.Panel.layer;
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
        this.Panel.getChildByName('视频解锁')?.on(Button.EventType.CLICK, this.UnlockVideo, this);
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
        const config = ZRSJZ_ACTION_CONFIG.find(item => item.Name === this.selected);
        const video = this.Panel.getChildByName('视频解锁');
        const canUnlockWithVideo = !unlocked && config?.Unlock.Type === '视频解锁';
        if (video) {
            video.layer = this.Panel.layer;
            video.children.forEach(child => child.layer = this.Panel.layer);
            video.active = canUnlockWithVideo;
        }
        condition.active = !unlocked && !(video && canUnlockWithVideo);
        condition.getComponent(Label).string = config?.Unlock.Description ?? '';
        void this.RefreshPreview();
    }
    private async RefreshPreview(): Promise<void> {
        const preview = this.preview;
        if (!preview) return;
        const version = ++this.previewVersion;
        // 基础包不包含全部角色和动作，预览统一使用 DLC 的完整骨骼。
        preview.node.active = false;
        try {
            if (!this.previewData) {
                this.previewData = ZRSJZ_Tools.LoadSkeletonDataByBundle('73_ZRSJZ_DLC', 'Spine/玩家/1');
            }
            const skeletonData = await this.previewData;
            if (!isValid(this, true) || !isValid(preview, true) || version !== this.previewVersion) return;
            const skin = ZRSJZ_SKIN_CONFIG.get(ZRSJZ_GameData.Instance.CurSkin[0]);
            const config = ZRSJZ_ACTION_CONFIG.find(item => item.Name === this.selected);
            if (!skin || !config) return;
            if (preview.skeletonData !== skeletonData) preview.skeletonData = skeletonData;
            // 激活会触发 Spine 的初始化，必须在激活后设置皮肤和动画。
            preview.node.active = true;
            preview.clearTracks();
            preview.setSkin(skin.Skin);
            preview.setToSetupPose();
            if (!preview.findAnimation(config.Animation)) {
                preview.node.active = false;
                return;
            }
            preview.setAnimation(0, config.Animation, true);
            this.HidePreviewWeapons();
        } catch (error) {
            if (!isValid(this, true)) return;
            this.previewData = null;
            console.error('[动作] 预览加载失败', error);
        }
    }
    protected lateUpdate(): void { this.HidePreviewWeapons(); }
    private HidePreviewWeapons(): void {
        if (!this.preview?.node.active) return;
        this.preview.findSlot('dao')?.setAttachment(null);
        ZRSJZ_WEAPONRY_TYPE.forEach((_names, slot) => this.preview.findSlot(slot)?.setAttachment(null));
    }
    protected onDisable(): void {
        ++this.previewVersion;
        if (isValid(this.preview, true)) {
            this.preview.clearTracks();
            this.preview.node.active = false;
        }
    }
    private Equip(): void {
        const error = ZRSJZ_ActionService.Equip(this.selected);
        if (error) void ZRSJZ_UIManager.Instance.ShowTip(error);
        this.Refresh();
    }
    private UnlockVideo(): void {
        if (Date.now() - this.lastVideo < 1000 || !Banner.Instance) return;
        const reward = ZRSJZ_ActionService.CreateVideoReward(this.selected);
        if (!reward) return;
        this.lastVideo = Date.now();
        Banner.Instance.ShowVideoAd(() => {
            if (!reward()) return;
            if (isValid(this, true) && this.node.activeInHierarchy) this.Refresh();
        });
    }
    private Unequip(): void { ZRSJZ_ActionService.Unequip(this.selected); this.Refresh(); }
    private Close(): void { ZRSJZ_UIManager.Instance.HidePanel('73_ZRSJZ_DLC/Prefabs/Panel/动作弹窗'); }
}
