import { _decorator, Color, EventTouch, find, instantiate, Label, Layout, Node, RichText, ScrollView, sp, Sprite, SpriteFrame, UIOpacity } from 'cc';
import { ZRSJZ_Panel } from '../../../73_ZRSJZ/Scripts/Panel/ZRSJZ_Panel';
import { ZRSJZ_GameData } from '../../../73_ZRSJZ/Scripts/ZRSJZ_GameData';
import { ZRSJZ_PANEL } from '../../../73_ZRSJZ/Scripts/ZRSJZ_Constant';
import { ZRSJZ_UIManager } from '../../../73_ZRSJZ/Scripts/Manager/ZRSJZ_UIManager';
import { ZRSJZ_EventManager, ZRSJZ_MyEvent } from '../../../73_ZRSJZ/Scripts/Manager/ZRSJZ_EventManager';
import { BundleManager } from 'db://assets/Scripts/Framework/Managers/BundleManager';
import { ZRSJZ_AudioManager } from '../../../73_ZRSJZ/Scripts/Manager/ZRSJZ_AudioManager';
import { ZRSJZ_PetService } from '../../../73_ZRSJZ/Scripts/Service/ZRSJZ_PetService';
const { ccclass } = _decorator;

@ccclass('ZRSJZ_AvatarFramePanel')
export class ZRSJZ_AvatarFramePanel extends ZRSJZ_Panel {
    private readonly avatars = ['威蓝', '泠汐', '凌魇', '夜喵', '黯祁', '鸦暝', '鸢铠', '霁锋', '赤骁', '绯朔', '狩荒', '煌罡', '烬猎', '灼戈', '浅燎', '沧戈', '星栗', '弑岚'];
    private readonly frames = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];
    /** 后续头像框的解锁来源在这里配置。 */
    private readonly frameUnlock: Record<string, { text: string; keyword?: string; pet?: string; skin?: string }> = {
        '6': { text: '解锁宠物皮肤\n深渊魔龙获得', keyword: '深渊魔龙', pet: '星核幼龙', skin: '深渊魔龙' },
    };
    private tab: 'avatar' | 'frame' = 'avatar';
    private selected = '';
    private request = 0;
    private avatarSprites = new Map<string, SpriteFrame>();
    private frameSprites = new Map<string, SpriteFrame>();
    private frameSpines = new Map<string, sp.SkeletonData>();

    protected onLoad(): void {
        for (const name of ['Mask', '关闭', '头像', '头像框', '使用']) {
            const node = name === 'Mask' ? find(name, this.node) : find(`Panel/${name}`, this.node);
            node?.on(Node.EventType.TOUCH_END, this.OnClick, this);
        }
    }

    public Show(): void {
        super.Show();
        this.tab = 'avatar';
        this.selected = ZRSJZ_GameData.Instance.CurrentAvatar || '威蓝';
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
        const data = ZRSJZ_GameData.Instance;
        const isAvatar = this.tab === 'avatar';
        const title = find('Panel/Name', this.node)?.getComponent(Label);
        if (title) title.string = isAvatar ? '修改头像' : '修改头像框';
        for (const name of ['头像', '头像框']) {
            const tab = find(`Panel/${name}`, this.node);
            if (tab) tab.getChildByName('Checked').active = (name === '头像') === isAvatar;
        }
        const avatarDivider = find('Panel/头像-分割线', this.node);
        const frameDivider = find('Panel/头像框-分割线', this.node);
        if (avatarDivider) avatarDivider.active = isAvatar;
        if (frameDivider) frameDivider.active = !isAvatar;
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
        if (data.OwnedAvatarFrames?.includes(name)) return true;
        const unlock = this.frameUnlock[name];
        return !!unlock?.pet && !!unlock.skin && ZRSJZ_PetService.CheckPetSkin(unlock.pet, unlock.skin);
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
        const condition = this.tab === 'avatar'
            ? { text: `解锁角色\n${this.selected}获得`, keyword: this.selected }
            : this.frameUnlock[this.selected] ?? { text: '获得对应头像框\n即可解锁', keyword: '头像框' };
        const richText = node.getComponent(RichText) ?? node.addComponent(RichText);
        richText.fontColor = Color.WHITE;
        richText.string = `<outline color=#20242B width=2>${ZRSJZ_AvatarFramePanel.HighlightKeyword(condition.text, condition.keyword)}</outline>`;
    }

    private OnClick(event: EventTouch): void {
        const name = event.getCurrentTarget().name;
        ZRSJZ_AudioManager.Instance.PlaySound('点击');
        if (name === '关闭' || name === 'Mask') { ZRSJZ_UIManager.Instance.HidePanel(ZRSJZ_PANEL.头像框弹窗); return; }
        if (name === '头像' || name === '头像框') {
            this.tab = name === '头像' ? 'avatar' : 'frame';
            this.selected = this.tab === 'avatar' ? ZRSJZ_GameData.Instance.CurrentAvatar : ZRSJZ_GameData.Instance.CurrentAvatarFrame;
            this.Refresh();
            this.ScrollToTop();
            return;
        }
        if (name !== '使用') return;
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
    }
}
