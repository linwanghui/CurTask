import { _decorator, Button, Color, EventTouch, find, instantiate, Label, Layout, Node, RichText, ScrollView, sp, Sprite, SpriteFrame, UIOpacity } from 'cc';
import { ZRSJZ_Panel } from '../../../73_ZRSJZ/Scripts/Panel/ZRSJZ_Panel';
import { ZRSJZ_GameData } from '../../../73_ZRSJZ/Scripts/ZRSJZ_GameData';
import { ZRSJZ_PANEL, ZRSJZ_AVATAR_FRAME_UNLOCK, ZRSJZ_TITLE_CONFIG } from '../../../73_ZRSJZ/Scripts/ZRSJZ_Constant';
import { ZRSJZ_TitleService } from '../../../73_ZRSJZ/Scripts/Service/ZRSJZ_TitleService';
import { ZRSJZ_TitleShine } from '../../../73_ZRSJZ/Scripts/UI/ZRSJZ_TitleShine';
import { ZRSJZ_UIManager } from '../../../73_ZRSJZ/Scripts/Manager/ZRSJZ_UIManager';
import { ZRSJZ_EventManager, ZRSJZ_MyEvent } from '../../../73_ZRSJZ/Scripts/Manager/ZRSJZ_EventManager';
import { BundleManager } from 'db://assets/Scripts/Framework/Managers/BundleManager';
import { ZRSJZ_AudioManager } from '../../../73_ZRSJZ/Scripts/Manager/ZRSJZ_AudioManager';
import { ZRSJZ_AvatarFrameService } from '../../../73_ZRSJZ/Scripts/Service/ZRSJZ_AvatarFrameService';
import Banner from 'db://assets/Scripts/Banner';
const { ccclass } = _decorator;

@ccclass('ZRSJZ_AvatarFramePanel')
export class ZRSJZ_AvatarFramePanel extends ZRSJZ_Panel {
    private readonly avatars = ['威蓝', '泠汐', '凌魇', '夜喵', '黯祁', '鸦暝', '鸢铠', '霁锋', '赤骁', '绯朔', '狩荒', '煌罡', '烬猎', '灼戈', '浅燎', '沧戈', '星栗', '弑岚'];
    private readonly frames = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];
    private readonly frameUnlock = ZRSJZ_AVATAR_FRAME_UNLOCK;
    private lastVideoClick = 0;
    private tab: 'avatar' | 'frame' | 'title' = 'avatar';
    private selected = '';
    private request = 0;
    private avatarSprites = new Map<string, SpriteFrame>();
    private frameSprites = new Map<string, SpriteFrame>();
    private frameSpines = new Map<string, sp.SkeletonData>();

    protected onLoad(): void {
        const videoButton = find('Panel/观看视频', this.node)?.getComponent(Button);
        if (videoButton) videoButton.clickEvents = [];
        for (const name of ['Mask', '关闭', '头像', '头像框', '称号', '使用', '观看视频']) {
            const node = name === 'Mask' ? find(name, this.node) : find(`Panel/${name}`, this.node);
            node?.on(Node.EventType.TOUCH_END, this.OnClick, this);
        }
        for (const item of ZRSJZ_TITLE_CONFIG) {
            const row = find(`Panel/称号列表/Content/${item.name}`, this.node);
            const icon = row?.getChildByName('图标');
            if (icon && !icon.getComponent(ZRSJZ_TitleShine)) icon.addComponent(ZRSJZ_TitleShine);
            row?.on(Node.EventType.TOUCH_END, () => {
                ZRSJZ_AudioManager.Instance.PlaySound('点击');
                this.selected = item.name;
                this.Refresh();
            }, this);
        }
        const preview = find('Panel/当前称号', this.node);
        if (preview && !preview.getComponent(ZRSJZ_TitleShine)) preview.addComponent(ZRSJZ_TitleShine);
    }

    public Show(tab: 'avatar' | 'frame' | 'title' = 'avatar'): void {
        ZRSJZ_AvatarFrameService.SyncUnlocks();
        super.Show();
        this.tab = ['avatar', 'frame', 'title'].includes(tab) ? tab : 'avatar';
        this.SelectEquipped();
        this.Refresh();
        this.ScrollToTop();
        void this.LoadSprites();
    }

    protected onDisable(): void { ++this.request; }

    private async LoadSprites(): Promise<void> {
        const request = ++this.request;
        try {
            const [avatars, frames, spineResults] = await Promise.all([
                this.LoadDirectory('Sprites/头像框/头像'),
                this.LoadDirectory('Sprites/头像框/头像框/Icon'),
                Promise.allSettled(this.frames.slice(5).map(id => this.LoadSpine(id))),
            ]);
            if (request !== this.request || !this.node.isValid) return;
            this.avatarSprites = new Map(avatars.map(item => [item.name, item]));
            this.frameSprites = new Map(frames.map(item => [item.name, item]));
            this.frameSpines.clear();
            spineResults.forEach((result, index) => {
                if (result.status === 'fulfilled') this.frameSpines.set(this.frames[index + 5], result.value);
                else console.warn(`[ZRSJZ_AvatarFramePanel] 头像框 ${this.frames[index + 5]} Spine 加载失败`, result.reason);
            });
            this.Refresh();
            this.ScrollToTop();
        } catch (error) { console.error('[ZRSJZ_AvatarFramePanel] 加载头像资源失败', error); }
    }

    private LoadDirectory(path: string): Promise<SpriteFrame[]> {
        return new Promise((resolve, reject) => {
            const bundle = BundleManager.GetBundle('73_ZRSJZ_DLC');
            if (!bundle) { reject(new Error('DLC 尚未加载')); return; }
            bundle.loadDir(path, SpriteFrame, (error, frames) => error ? reject(error) : resolve(frames));
        });
    }

    private LoadSpine(id: string): Promise<sp.SkeletonData> {
        return new Promise((resolve, reject) => {
            const bundle = BundleManager.GetBundle('73_ZRSJZ_DLC');
            if (!bundle) { reject(new Error('DLC 尚未加载')); return; }
            bundle.load(`Sprites/头像框/头像框/Spine/${id}/1`, sp.SkeletonData,
                (error, data) => error || !data ? reject(error ?? new Error(`缺少头像框 ${id}`)) : resolve(data));
        });
    }

    private Refresh(): void {
        ZRSJZ_AvatarFrameService.SyncUnlocks();
        const data = ZRSJZ_GameData.Instance;
        const isAvatar = this.tab === 'avatar';
        const title = find('Panel/Name', this.node)?.getComponent(Label);
        if (title) title.string = '修改信息';
        for (const [name, key] of [['头像', 'avatar'], ['头像框', 'frame'], ['称号', 'title']]) {
            const tab = find(`Panel/${name}`, this.node);
            if (tab) tab.getChildByName('Checked').active = this.tab === key;
            const divider = find(`Panel/${name}-分割线`, this.node);
            if (divider) divider.active = this.tab === key;
        }
        find('Panel/Items', this.node).active = this.tab !== 'title';
        find('Panel/称号列表', this.node).active = this.tab === 'title';
        const titleName = this.tab === 'title' ? this.selected : ZRSJZ_TitleService.GetEquipped();
        const titleIcon = find(`Panel/称号列表/Content/${titleName}/图标`, this.node)?.getComponent(Sprite);
        const titlePreview = find('Panel/当前称号', this.node)?.getComponent(Sprite);
        if (titlePreview) titlePreview.spriteFrame = titleIcon?.spriteFrame ?? null;
        if (this.tab === 'title') { this.RefreshTitles(); return; }
        const content = find('Panel/Items/View/Content', this.node);
        const avatarTemplate = content?.getChildByName('头像Item');
        const frameTemplate = content?.getChildByName('头像框Item');
        if (!content || !avatarTemplate || !frameTemplate) return;
        for (const child of [...content.children]) {
            if (child === avatarTemplate || child === frameTemplate) continue;
            child.removeFromParent();
            child.destroy();
        }
        avatarTemplate.active = isAvatar;
        frameTemplate.active = !isAvatar;
        const template = isAvatar ? avatarTemplate : frameTemplate;
        const names = isAvatar ? this.avatars : this.frames;
        names.forEach((name, index) => {
            const node = index === 0 ? template : instantiate(template);
            if (index !== 0) node.setParent(content);
            if (index !== 0) node.name = name;
            node.active = true;
            if (isAvatar) {
                const sprite = node.getComponent(Sprite);
                if (sprite) sprite.spriteFrame = this.avatarSprites.get(name) ?? null;
            } else this.SetFrameVisual(node, name);
            const selected = node.getChildByName('选中框');
            if (selected) selected.active = name === this.selected;
            const owned = this.IsOwned(name, isAvatar);
            const lock = node.getChildByName('锁');
            if (lock) lock.active = !owned;
            const opacity = node.getComponent(UIOpacity) ?? node.addComponent(UIOpacity);
            opacity.opacity = owned ? 255 : 190;
            node.off(Node.EventType.TOUCH_END);
            node.on(Node.EventType.TOUCH_END, () => {
                ZRSJZ_AudioManager.Instance.PlaySound('点击');
                this.selected = name;
                this.Refresh();
            });
        });
        content.getComponent(Layout)?.updateLayout();
        const selectedOwned = this.IsOwned(this.selected, isAvatar);
        const equipped = (isAvatar ? data.CurrentAvatar : data.CurrentAvatarFrame) === this.selected;
        find('Panel/使用', this.node).active = selectedOwned && !equipped;
        find('Panel/使用中', this.node).active = selectedOwned && equipped;
        const video = find('Panel/观看视频', this.node);
        if (video) video.active = !isAvatar && !selectedOwned && !!this.frameUnlock[this.selected]?.video;
        const tip = find('Panel/Tip', this.node)?.getComponent(Label);
        if (tip) tip.string = '';
        this.RefreshUnlockCondition(selectedOwned);
        const avatar = find('Panel/当前头像', this.node)?.getComponent(Sprite);
        if (avatar) avatar.spriteFrame = this.avatarSprites.get(isAvatar ? this.selected : data.CurrentAvatar) ?? null;
        const frameNode = find('Panel/当前头像框', this.node);
        if (frameNode) this.SetFrameVisual(frameNode, isAvatar ? data.CurrentAvatarFrame : this.selected);
    }

    private IsOwned(name: string, isAvatar: boolean): boolean {
        const data = ZRSJZ_GameData.Instance;
        if (isAvatar) return data.HaveRole?.includes(name) ?? false;
        return ZRSJZ_AvatarFrameService.IsOwned(name);
    }

    private SelectEquipped(): void {
        const data = ZRSJZ_GameData.Instance;
        this.selected = this.tab === 'title' ? ZRSJZ_TitleService.GetEquipped()
            : this.tab === 'avatar' ? data.CurrentAvatar || '威蓝' : data.CurrentAvatarFrame || '1';
    }

    private RefreshTitles(): void {
        const equipped = ZRSJZ_TitleService.GetEquipped();
        for (const item of ZRSJZ_TITLE_CONFIG) {
            const row = find(`Panel/称号列表/Content/${item.name}`, this.node);
            if (!row) continue;
            row.getChildByName('锁').active = !ZRSJZ_TitleService.IsOwned(item.name);
            row.getChildByName('选中框').active = this.selected === item.name;
            row.getChildByName('已穿戴').active = equipped === item.name;
        }
        const owned = ZRSJZ_TitleService.IsOwned(this.selected);
        find('Panel/使用', this.node).active = owned && equipped !== this.selected;
        find('Panel/使用中', this.node).active = owned && equipped === this.selected;
        find('Panel/观看视频', this.node).active = false;
        this.RefreshUnlockCondition(owned);
        const data = ZRSJZ_GameData.Instance;
        const avatar = find('Panel/当前头像', this.node)?.getComponent(Sprite);
        if (avatar) avatar.spriteFrame = this.avatarSprites.get(data.CurrentAvatar || '威蓝') ?? avatar.spriteFrame;
        const frame = find('Panel/当前头像框', this.node);
        if (frame) this.SetFrameVisual(frame, data.CurrentAvatarFrame || '1');
    }

    private SetFrameVisual(node: Node, id: string): void {
        const animated = this.frameSpines.get(id);
        const iconNode = node.getChildByName('Icon') ?? node;
        const spineNode = node.getChildByName('Spine') ?? node;
        const icon = iconNode.getComponent(Sprite) ?? iconNode.addComponent(Sprite);
        const skeleton = spineNode.getComponent(sp.Skeleton) ?? (animated ? spineNode.addComponent(sp.Skeleton) : null);
        if (iconNode !== node) iconNode.active = !animated;
        else icon.enabled = !animated;
        if (spineNode !== node) spineNode.active = !!animated;
        if (animated && skeleton) {
            skeleton.enabled = true;
            if (skeleton.skeletonData !== animated) skeleton.skeletonData = animated;
            skeleton.paused = false;
            skeleton.loop = true;
            skeleton.setAnimation(0, 'animation', true);
        } else if (skeleton) skeleton.enabled = false;
        if (!animated) icon.spriteFrame = this.frameSprites.get(id) ?? null;
    }

    /** 在富文本里突出关键词；普通文本会被转义，避免资源配置插入标记。 */
    public static HighlightKeyword(text: string, keyword: string, color: string = '#37C5FF'): string {
        const escape = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        if (!keyword) return escape(text);
        return text.split(keyword).map(escape).join(`<color=${color}>${escape(keyword)}</color>`);
    }

    private RefreshUnlockCondition(owned: boolean): void {
        const node = find('Panel/解锁条件', this.node);
        if (!node) return;
        node.active = !owned;
        if (owned) return;
        const condition = this.tab === 'title'
            ? ZRSJZ_TITLE_CONFIG.find(item => item.name === this.selected)?.unlockCondition
            : this.tab === 'avatar'
            ? { text: `解锁角色\n${this.selected}获得`, keyword: this.selected }
            : this.frameUnlock[this.selected] ?? { text: '获得对应头像框\n即可解锁', keyword: '头像框' };
        if (!condition) return;
        const richText = node.getComponent(RichText) ?? node.addComponent(RichText);
        richText.fontColor = Color.WHITE;
        richText.string = `<outline color=#20242B width=2>${ZRSJZ_AvatarFramePanel.HighlightKeyword(condition.text, condition.keyword)}</outline>`;
    }

    private OnClick(event: EventTouch): void {
        const name = event.getCurrentTarget().name;
        ZRSJZ_AudioManager.Instance.PlaySound('点击');
        if (name === '关闭' || name === 'Mask') { ZRSJZ_UIManager.Instance.HidePanel(ZRSJZ_PANEL.头像框弹窗); return; }
        if (name === '头像' || name === '头像框' || name === '称号') {
            this.tab = name === '称号' ? 'title' : name === '头像' ? 'avatar' : 'frame';
            this.SelectEquipped();
            this.Refresh();
            this.ScrollToTop();
            return;
        }
        if (name === '观看视频') {
            if (this.tab !== 'frame' || Date.now() - this.lastVideoClick < 1000) return;
            const reward = ZRSJZ_AvatarFrameService.CreateVideoReward(this.selected);
            if (!reward) return;
            this.lastVideoClick = Date.now();
            Banner.Instance.ShowVideoAd(() => {
                if (reward()) ZRSJZ_UIManager.Instance?.ShowTip('头像框已解锁');
                if (this.isValid && this.node.activeInHierarchy) this.Refresh();
            });
            return;
        }
        if (name !== '使用') return;
        if (this.tab === 'title') {
            if (ZRSJZ_TitleService.IsOwned(this.selected)) ZRSJZ_TitleService.Equip(this.selected);
            this.Refresh();
            return;
        }
        const data = ZRSJZ_GameData.Instance;
        if (this.tab === 'avatar') {
            if (!this.IsOwned(this.selected, true)) return;
            data.CurrentAvatar = this.selected;
        } else {
            if (!this.IsOwned(this.selected, false)) return;
            data.CurrentAvatarFrame = this.selected;
        }
        ZRSJZ_GameData.SaveData();
        ZRSJZ_EventManager.EmitPersist(ZRSJZ_MyEvent.ZRSJZ_PLAYER_INFO_CHANGE);
        this.Refresh();
    }

    private ScrollToTop(): void {
        find('Panel/Items', this.node)?.getComponent(ScrollView)?.scrollToTop(0);
        find('Panel/称号列表', this.node)?.getComponent(ScrollView)?.scrollToTop(0);
    }
}
