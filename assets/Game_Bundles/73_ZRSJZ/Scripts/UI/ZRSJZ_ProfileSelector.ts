import { assetManager, Button, Color, Graphics, Label, Mask, Node, ScrollView, Sprite, SpriteFrame, sp, UIOpacity, UITransform } from 'cc';
import { ZRSJZ_GameData } from '../ZRSJZ_GameData';
import { ZRSJZ_AVATAR_FRAME_UNLOCK, ZRSJZ_ROLE_CONFIG, ZRSJZ_SKIN_CONFIG, ZRSJZ_TITLE_CONFIG } from '../ZRSJZ_Constant';
import { ZRSJZ_UIManager } from '../Manager/ZRSJZ_UIManager';
import { ZRSJZ_AudioManager } from '../Manager/ZRSJZ_AudioManager';
import { ZRSJZ_EventManager, ZRSJZ_MyEvent } from '../Manager/ZRSJZ_EventManager';
import { ZRSJZ_AvatarFrameService } from '../Service/ZRSJZ_AvatarFrameService';
import { ZRSJZ_TitleService } from '../Service/ZRSJZ_TitleService';
import { ZRSJZ_TitleShine } from './ZRSJZ_TitleShine';
import Banner from 'db://assets/Scripts/Banner';

export type ZRSJZ_ProfileTab = 'info' | 'avatar' | 'frame' | 'title';

/** 主包只创建 UI；所有 DLC 图片和 Spine 均在就绪后按路径动态加载。 */
export class ZRSJZ_ProfileSelector {
    private tab: ZRSJZ_ProfileTab = 'info';
    private selected = '';
    private tabs: Node;
    private banner: Node;
    private list: Node;
    private content: Node;
    private hint: Label;
    private scroll: ScrollView;
    private version = 0;
    private signature = '';
    private lastVideo = 0;
    private disposed = false;
    private tabFrames: SpriteFrame[] = [];
    private cache = new Map<string, SpriteFrame | sp.SkeletonData>();

    constructor(private root: Node) {
        this.tabs = this.Make(root, '外观页签', 600, 62, 0, 24);
        ['信息', '头像', '头像框', '称号'].forEach((name, i) => {
            const node = this.Make(this.tabs, name, 130, 62, (i - 1.5) * 140, 0);
            node.addComponent(Sprite).sizeMode = Sprite.SizeMode.CUSTOM;
            this.Text(node, '文字', name, 120, 52, 0, 0, 29);
            this.Click(node, () => this.SelectTab((['info', 'avatar', 'frame', 'title'] as const)[i]));
        });
        this.banner = this.Make(root, '作战信息', 573, 33, 0, 40);
        this.banner.addComponent(Sprite).sizeMode = Sprite.SizeMode.CUSTOM;
        this.hint = this.Text(root, '解锁条件', '', 616, 38, 0, 112, 24);
        this.list = this.Make(root, '外观列表', 606, 365, 0, -222);
        const view = this.Make(this.list, 'View', 606, 365, 0, 0);
        view.addComponent(Mask).type = Mask.Type.GRAPHICS_RECT;
        this.content = this.Make(view, 'Content', 606, 365, 0, 182.5);
        this.content.getComponent(UITransform).setAnchorPoint(0.5, 1);
        this.scroll = this.list.addComponent(ScrollView);
        this.scroll.content = this.content;
        this.scroll.horizontal = false;
        this.scroll.vertical = true;
        this.scroll.cancelInnerEvents = true;
        this.tabs.active = false;
        this.list.active = false;
        void this.LoadBase();
    }

    public static AvatarNames(): string[] {
        // 被注释/移除的配置不再展示，即使 DLC 目录里仍有这些图片。
        return Array.from(ZRSJZ_SKIN_CONFIG.keys()).filter(name =>
            Array.from(ZRSJZ_ROLE_CONFIG.values()).some(role => role.Skin.includes(name)));
    }
    public static OwnsAvatar(name: string): boolean {
        const data = ZRSJZ_GameData.Instance;
        return this.AvatarNames().includes(name) && (ZRSJZ_ROLE_CONFIG.has(name)
            ? !!data.HaveRole?.includes(name) : !!data.HaveSkin?.includes(name));
    }
    private Ready(): boolean { return ZRSJZ_UIManager.ZRSJZ_DLC && !!assetManager.getBundle('73_ZRSJZ_DLC'); }
    public SelectTab(tab: ZRSJZ_ProfileTab = 'info'): void {
        this.tab = this.Ready() ? tab : 'info';
        const data = ZRSJZ_GameData.Instance;
        this.selected = this.tab === 'avatar' ? data.CurrentAvatar || '威蓝'
            : this.tab === 'frame' ? data.CurrentAvatarFrame || '1' : ZRSJZ_TitleService.GetEquipped();
        this.signature = '';
        this.Refresh();
        this.scroll.scrollToTop(0);
    }
    public Refresh(): void {
        if (this.disposed || !this.root.isValid) return;
        const ready = this.Ready();
        if (!ready) this.tab = 'info';
        this.tabs.active = ready;
        this.banner.active = !ready;
        this.root.getChildByName('Layout').active = this.tab === 'info';
        this.list.active = ready && this.tab !== 'info';
        this.tabs.children.forEach((node, i) => {
            const selected = (['info', 'avatar', 'frame', 'title'] as const)[i] === this.tab;
            node.getComponent(Sprite).spriteFrame = this.tabFrames[selected ? 1 : 0] ?? null;
            node.getChildByName('文字').getComponent(Label).color = selected ? new Color(143, 82, 0) : new Color(84, 87, 89);
        });
        this.hint.node.active = this.list.active;
        if (!this.list.active) { ++this.version; this.signature = ''; return; }
        ZRSJZ_AvatarFrameService.SyncUnlocks();
        ZRSJZ_TitleService.SyncUnlocks();
        this.UpdateHint();
        const d = ZRSJZ_GameData.Instance;
        const signature = JSON.stringify([this.tab, this.selected, d.CurrentAvatar, d.CurrentAvatarFrame, d.EquippedTitle,
            d.HaveRole, d.HaveSkin, d.OwnedTitles, d.OwnedAvatarFrames]);
        if (signature === this.signature) return;
        this.signature = signature;
        this.BuildRows();
    }
    private Owned(name: string): boolean {
        return this.tab === 'avatar' ? ZRSJZ_ProfileSelector.OwnsAvatar(name)
            : this.tab === 'frame' ? ZRSJZ_AvatarFrameService.IsOwned(name) : ZRSJZ_TitleService.IsOwned(name);
    }
    private UpdateHint(): void {
        const owned = this.Owned(this.selected);
        let text = '';
        if (!owned && this.tab === 'title') text = ZRSJZ_TitleService.GetUnlockHint(this.selected);
        if (!owned && this.tab === 'frame') text = ZRSJZ_AVATAR_FRAME_UNLOCK[this.selected]?.text ?? '获得对应头像框即可解锁';
        if (!owned && this.tab === 'avatar') text = `解锁${ZRSJZ_ROLE_CONFIG.has(this.selected) ? '角色' : '皮肤'}${this.selected}获得`;
        this.hint.string = text.replace(/[\r\n]+/g, '');
        this.hint.node.active = !owned && !!this.hint.string;
    }
    private Pick(name: string): void {
        if (!this.Ready()) return;
        this.selected = name;
        if (this.Owned(name)) {
            const data = ZRSJZ_GameData.Instance;
            if (this.tab === 'title') ZRSJZ_TitleService.Equip(name);
            else {
                if (this.tab === 'avatar') data.CurrentAvatar = name;
                else data.CurrentAvatarFrame = name;
                ZRSJZ_GameData.SaveData();
                ZRSJZ_EventManager.EmitPersist(ZRSJZ_MyEvent.ZRSJZ_PLAYER_INFO_CHANGE);
            }
        }
        this.Refresh();
        if (this.tab === 'frame' && !this.Owned(name) && ZRSJZ_AVATAR_FRAME_UNLOCK[name]?.video) this.UnlockVideo();
    }
    private UnlockVideo(): void {
        if (!this.Ready() || this.tab !== 'frame' || Date.now() - this.lastVideo < 1000) return;
        const id = this.selected;
        const reward = ZRSJZ_AvatarFrameService.CreateVideoReward(id);
        if (!reward) return;
        this.lastVideo = Date.now();
        Banner.Instance.ShowVideoAd(() => {
            if (!reward()) return;
            ZRSJZ_GameData.Instance.CurrentAvatarFrame = id;
            ZRSJZ_GameData.SaveData();
            ZRSJZ_EventManager.EmitPersist(ZRSJZ_MyEvent.ZRSJZ_PLAYER_INFO_CHANGE);
            if (!this.disposed && this.root.isValid && this.root.activeInHierarchy) this.Refresh();
        });
    }
    private BuildRows(): void {
        const request = ++this.version;
        for (const child of this.content.children.slice()) { child.removeFromParent(); child.destroy(); }
        const title = this.tab === 'title';
        const names = title ? ZRSJZ_TITLE_CONFIG.map(item => item.name)
            : this.tab === 'avatar' ? ZRSJZ_ProfileSelector.AvatarNames() : Object.keys(ZRSJZ_AVATAR_FRAME_UNLOCK);
        const columns = title ? 1 : 4, width = title ? 592 : 141, height = title ? 112 : 141, gap = 10;
        this.content.getComponent(UITransform).height = Math.max(365, Math.ceil(names.length / columns) * (height + gap) + 10);
        names.forEach((name, index) => {
            const row = this.Make(this.content, name, width, height,
                title ? 0 : (index % columns - 1.5) * (width + gap), -5 - height / 2 - Math.floor(index / columns) * (height + gap));
            const owned = this.Owned(name);
            if (!title) {
                row.addComponent(UIOpacity).opacity = owned ? 255 : 190;
                if (this.tab === 'frame') this.Decoration(row, '底图', 'Sprites/头像框/4ac70f75b1c1bf0e1652b98e858834d7', width, height, 0, 0, request);
            } else {
                const g = row.addComponent(Graphics);
                g.fillColor = new Color(238, 243, 244); g.strokeColor = name === this.selected ? new Color(255, 189, 0) : new Color(167, 177, 180);
                g.lineWidth = name === this.selected ? 5 : 2;
                g.roundRect(-width / 2 + 3, -height / 2 + 3, width - 6, height - 6, 18); g.fill(); g.stroke();
            }
            const icon = this.Make(row, '图标', title ? 330 : 129, title ? 84 : 129, 0, 0);
            const animated = this.tab === 'frame' && Number(name) >= 6;
            const path = this.tab === 'avatar' ? 'Sprites/头像框/头像/' + name
                : this.tab === 'frame' ? animated ? `Sprites/头像框/头像框/Spine/${name}/1` : 'Sprites/头像框/头像框/Icon/' + name
                : 'Sprites/称号弹窗/称号/' + (name === '不败战神' ? '\u007f' + name : name);
            void this.LoadVisual(path, animated).then(asset => {
                if (!asset || request !== this.version || !icon.isValid || !this.Ready() || !this.root.activeInHierarchy) return;
                if (animated) {
                    const skeleton = icon.addComponent(sp.Skeleton);
                    skeleton.skeletonData = asset as sp.SkeletonData;
                    const runtime = skeleton.skeletonData.getRuntimeData();
                    const scale = Math.min(129 / Math.max(1, runtime.width), 129 / Math.max(1, runtime.height));
                    icon.setScale(scale, scale, 1);
                    const animation = runtime.animations.find(a => a.name === 'animation') ?? runtime.animations[0];
                    if (animation) skeleton.setAnimation(0, animation.name, true);
                } else {
                    const sprite = icon.addComponent(Sprite);
                    sprite.sizeMode = Sprite.SizeMode.TRIMMED; sprite.spriteFrame = asset as SpriteFrame;
                    const rect = sprite.spriteFrame.rect;
                    const scale = Math.min((title ? 330 : 129) / Math.max(1, rect.width), (title ? 84 : 129) / Math.max(1, rect.height));
                    icon.setScale(scale, scale, 1);
                    if (title) icon.addComponent(ZRSJZ_TitleShine);
                }
            }).catch(error => console.warn('[玩家信息] 外观资源加载失败', path, error));
            if (!title && name === this.selected)
                this.Decoration(row, '选中框', 'Sprites/头像框/选中框', width, height, 0, 0, request);
            if (!owned) {
                if (this.tab === 'frame' && ZRSJZ_AVATAR_FRAME_UNLOCK[name]?.video) {
                    // 原锁图片把黑色遮罩和锁合在一起；视频框单独保留遮罩，再覆盖白色视频标识。
                    const mask = this.Make(row, '黑色遮罩', width, height, 0, 0).addComponent(Graphics);
                    mask.fillColor = new Color(0, 0, 0, 160);
                    mask.roundRect(-width / 2, -height / 2, width, height, 18); mask.fill();
                    this.Decoration(row, '视频角标', 'Sprites/UI/视频角标白色', 52, 52, 0, 0, request, '73_ZRSJZ');
                } else {
                    this.Decoration(row, '锁', title ? 'Sprites/称号弹窗/锁' : 'Sprites/头像框/锁',
                        title ? 48 : width, title ? 48 : height, title ? width / 2 - 28 : 0, title ? height / 2 - 26 : 0, request);
                }
            } else if (title) {
                const d = ZRSJZ_GameData.Instance;
                if (name === (title ? d.EquippedTitle : this.tab === 'avatar' ? d.CurrentAvatar : d.CurrentAvatarFrame))
                    this.Text(row, '使用中', '使用中', width - 10, 27, 0, -height / 2 + 19, 20);
            }
            this.Click(row, () => this.Pick(name));
        });
    }
    private Decoration(parent: Node, name: string, path: string, w: number, h: number, x: number, y: number, request: number, bundleName = '73_ZRSJZ_DLC'): void {
        const node = this.Make(parent, name, w, h, x, y);
        const sprite = node.addComponent(Sprite);
        sprite.sizeMode = Sprite.SizeMode.CUSTOM;
        void this.LoadVisual(path, false, bundleName).then(asset => {
            if (!asset || request !== this.version || !node.isValid || !this.Ready() || !this.root.activeInHierarchy) return;
            sprite.spriteFrame = asset as SpriteFrame;
            if (name === '视频角标') {
                sprite.sizeMode = Sprite.SizeMode.TRIMMED;
                const rect = sprite.spriteFrame.rect, scale = Math.min(w / Math.max(1, rect.width), h / Math.max(1, rect.height));
                node.setScale(scale, scale, 1);
            }
        }).catch(error => console.warn('[玩家信息] 状态图片加载失败', path, error));
    }
    private async LoadVisual(path: string, animated: boolean, bundleName = '73_ZRSJZ_DLC'): Promise<SpriteFrame | sp.SkeletonData> {
        const key = bundleName + '/' + path;
        if (this.cache.has(key)) return this.cache.get(key);
        const bundle = assetManager.getBundle(bundleName);
        if (!this.Ready() || !bundle) return null;
        const asset = await new Promise<SpriteFrame | sp.SkeletonData>((resolve, reject) => {
            if (animated) bundle.load(path, sp.SkeletonData, (e, a) => e ? reject(e) : resolve(a));
            else bundle.load(path + '/spriteFrame', SpriteFrame, (e, a) => e ? reject(e) : resolve(a));
        });
        if (!this.disposed) this.cache.set(key, asset);
        return asset;
    }
    private async LoadBase(): Promise<void> {
        const bundle = assetManager.getBundle('73_ZRSJZ');
        if (!bundle) return;
        try {
            const frames = await Promise.all(['页签', '页签选中', '作战信息', '信息分割线'].map(name => new Promise<SpriteFrame>((resolve, reject) =>
                bundle.load(`Sprites/等级系统/${name}/spriteFrame`, SpriteFrame, (e, a) => e ? reject(e) : resolve(a)))));
            if (this.disposed || !this.root.isValid) return;
            this.tabFrames = frames;
            this.banner.getComponent(Sprite).spriteFrame = frames[2];
            const stats = this.root.getChildByName('Layout');
            for (let i = 0; i < 3; i++) {
                const line = this.Make(stats, '信息分割线' + i, 574, 4, 0, 90 - i * 90).addComponent(Sprite);
                line.sizeMode = Sprite.SizeMode.CUSTOM; line.spriteFrame = frames[3];
            }
            this.Refresh();
        } catch (e) { console.warn('[玩家信息] 页签资源加载失败', e); }
    }
    private Make(parent: Node, name: string, width: number, height: number, x: number, y: number): Node {
        const node = new Node(name); node.layer = parent.layer; parent.addChild(node);
        node.addComponent(UITransform).setContentSize(width, height); node.setPosition(x, y, 0); return node;
    }
    private Text(parent: Node, name: string, value: string, w: number, h: number, x: number, y: number, size: number): Label {
        const label = this.Make(parent, name, w, h, x, y).addComponent(Label);
        label.font = this.root.getChildByName('Tip')?.getComponent(Label)?.font ?? null;
        label.string = value; label.fontSize = size; label.lineHeight = size + 2;
        label.color = new Color(68, 72, 77); label.horizontalAlign = Label.HorizontalAlign.CENTER;
        label.verticalAlign = Label.VerticalAlign.CENTER; label.overflow = Label.Overflow.SHRINK; label.enableWrapText = false;
        label.node.getComponent(UITransform).setContentSize(w, h);
        if (name === '锁' || name === '使用中') {
            label.color = Color.WHITE; label.enableOutline = true; label.outlineColor = new Color(45, 50, 55); label.outlineWidth = 2;
        }
        return label;
    }
    private Click(node: Node, action: () => void): void {
        const button = node.addComponent(Button); button.transition = Button.Transition.SCALE; button.zoomScale = 0.95;
        node.on(Button.EventType.CLICK, () => { ZRSJZ_AudioManager.Instance?.PlaySound('点击'); action(); });
    }
    public Suspend(): void { ++this.version; this.signature = ''; }
    public Dispose(): void { this.disposed = true; ++this.version; this.cache.clear(); }
}
