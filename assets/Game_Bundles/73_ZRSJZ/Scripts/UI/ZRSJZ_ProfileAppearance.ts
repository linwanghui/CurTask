import { Button, EventTouch, Node, Sprite, SpriteFrame, sp, isValid, UITransform } from 'cc';
import { BundleManager } from 'db://assets/Scripts/Framework/Managers/BundleManager';
import { ZRSJZ_UIManager } from '../Manager/ZRSJZ_UIManager';
import { ZRSJZ_AudioManager } from '../Manager/ZRSJZ_AudioManager';
import { ZRSJZ_GameData } from '../ZRSJZ_GameData';
import { ZRSJZ_PANEL } from '../ZRSJZ_Constant';
import { ZRSJZ_AvatarFrameFit } from './ZRSJZ_AvatarFrameFit';

/** 主包仅持有默认资源；DLC 外观通过就绪后的 bundle.load 获取。 */
export class ZRSJZ_ProfileAppearance {
    private avatar: Sprite;
    private frame: Sprite;
    private frameBaseY = 0;
    private spineFrameID = '';
    private title: Sprite;
    private titleWidth = 0;
    private titleHeight = 0;
    private spineNode: Node;
    private defaults: Array<{ sprite: Sprite; frame: SpriteFrame }>;
    private version = 0;
    private keys: Partial<Record<'avatar' | 'frame' | 'title', string>> = {};
    private ready = false;
    private disposed = false;
    private clicks: Array<{ node: Node; handler: (event: EventTouch) => void }> = [];

    constructor(private root: Node, avatarPanel = ZRSJZ_PANEL.等级弹窗,
        selectTab?: (tab: 'avatar' | 'frame' | 'title') => void) {
        this.avatar = root.getChildByName('头像')?.getComponent(Sprite);
        this.frame = root.getChildByName('头像框Icon')?.getComponent(Sprite);
        this.frameBaseY = this.frame?.node.position.y ?? 0;
        this.title = root.getChildByName('称号')?.getComponent(Sprite);
        const titleTransform = this.title?.node.getComponent(UITransform);
        if (titleTransform) {
            this.titleWidth = titleTransform.width * Math.abs(this.title.node.scale.x);
            this.titleHeight = titleTransform.height * Math.abs(this.title.node.scale.y);
        }
        this.spineNode = root.getChildByName('头像框Spine');
        this.defaults = [this.avatar, this.frame, this.title].filter(Boolean)
            .map(sprite => ({ sprite, frame: sprite.spriteFrame }));
        for (const name of ['头像', '头像框Icon', '头像框Spine', '称号']) {
            const node = root.getChildByName(name);
            if (!node) continue;
            const button = node.getComponent(Button);
            if (button) button.clickEvents = [];
            const handler = (event: EventTouch) => {
                event.propagationStopped = true;
                const tab = name === '称号' ? 'title' : name === '头像' ? 'avatar' : 'frame';
                if (selectTab) {
                    if (ZRSJZ_UIManager.ZRSJZ_DLC) { ZRSJZ_AudioManager.Instance?.PlaySound('点击'); selectTab(tab); }
                    return;
                }
                const panel = avatarPanel;
                if (panel !== ZRSJZ_PANEL.等级弹窗 && !ZRSJZ_UIManager.ZRSJZ_DLC) return;
                ZRSJZ_AudioManager.Instance?.PlaySound('点击');
                if (panel === ZRSJZ_PANEL.头像框弹窗) {
                    ZRSJZ_UIManager.Instance.ShowPanel(panel, tab);
                } else {
                    ZRSJZ_UIManager.Instance.ShowPanel(panel, name === '称号' ? 'title' : 'info');
                }
            };
            node.on(Node.EventType.TOUCH_END, handler, this);
            this.clicks.push({ node, handler });
        }
        this.Reset();
        this.avatar?.node.on(Node.EventType.SIZE_CHANGED, this.RefitSpine, this);
        this.avatar?.node.on(Node.EventType.TRANSFORM_CHANGED, this.RefitSpine, this);
    }
    private RefitSpine(): void {
        if (this.disposed || !this.spineFrameID || !isValid(this.spineNode, true) || !this.spineNode.active) return;
        const skeleton = this.spineNode.getComponent(sp.Skeleton);
        if (skeleton?.skeletonData) ZRSJZ_AvatarFrameFit.AroundAvatar(skeleton, this.spineFrameID, this.avatar?.node);
    }
    private RefitTitle(): void {
        if (!isValid(this.title?.node, true) || !this.title.spriteFrame) return;
        const rect = this.title.spriteFrame.rect;
        if (rect.width <= 0 || rect.height <= 0 || this.titleWidth <= 0 || this.titleHeight <= 0) return;
        // 保留图片裁剪后的原始尺寸，只通过等比缩放适配编辑器配置的显示范围。
        const scale = Math.min(this.titleWidth / rect.width, this.titleHeight / rect.height);
        this.title.node.setScale(scale, scale, this.title.node.scale.z);
    }
    private Reset(): void {
        if (this.disposed || !isValid(this.root, true)) return;
        this.spineFrameID = '';
        for (const item of this.defaults) {
            if (!isValid(item.sprite, true) || !isValid(item.sprite.node, true)) continue;
            item.sprite.enabled = true;
            item.sprite.node.active = true;
            item.sprite.sizeMode = Sprite.SizeMode.TRIMMED;
            item.sprite.spriteFrame = item.frame;
        }
        this.RefitTitle();
        if (isValid(this.frame?.node, true)) {
            const node = this.frame.node;
            node.setPosition(node.position.x, this.frameBaseY, node.position.z);
        }
        if (isValid(this.spineNode, true)) {
            this.spineNode.active = false;
            const skeleton = this.spineNode.getComponent(sp.Skeleton);
            if (isValid(skeleton, true)) { skeleton.clearTracks(); skeleton.skeletonData = null; }
        }
    }
    public Suspend(): void { ++this.version; this.keys = {}; this.ready = false; this.Reset(); }
    public Dispose(): void {
        if (this.disposed) return;
        this.disposed = true;
        // 销毁时只失效请求、解除监听，不再重置可能已销毁的子节点。
        ++this.version;
        this.keys = {};
        if (isValid(this.avatar?.node, true)) {
            this.avatar.node.off(Node.EventType.SIZE_CHANGED, this.RefitSpine, this);
            this.avatar.node.off(Node.EventType.TRANSFORM_CHANGED, this.RefitSpine, this);
        }
        for (const { node, handler } of this.clicks) if (isValid(node, true)) node.off(Node.EventType.TOUCH_END, handler, this);
        this.clicks = [];
        this.defaults = [];
        this.avatar = this.frame = this.title = null;
        this.spineNode = this.root = null;
    }
    public Refresh(): void {
        if (this.disposed || !isValid(this.root, true)) return;
        const data = ZRSJZ_GameData.Instance;
        const ready = ZRSJZ_UIManager.ZRSJZ_DLC;
        const avatar = data.CurrentAvatar || '威蓝', frame = data.CurrentAvatarFrame || '1', title = data.EquippedTitle || '勇者';
        if (ready !== this.ready) {
            ++this.version;
            this.keys = {};
            this.ready = ready;
            if (!ready) this.Reset();
        }
        if (!ready) return;
        this.RefitSpine();
        if (this.keys.avatar === avatar && this.keys.frame === frame && this.keys.title === title) return;
        const bundle = BundleManager.GetBundle('73_ZRSJZ_DLC');
        if (!bundle) return;
        const version = this.version;
        const current = (slot: 'avatar' | 'frame' | 'title', value: string) => version === this.version && isValid(this.root, true)
            && this.root.activeInHierarchy && ZRSJZ_UIManager.ZRSJZ_DLC
            && this.keys[slot] === value
            && (slot === 'avatar' ? ZRSJZ_GameData.Instance.CurrentAvatar || '威蓝'
                : slot === 'frame' ? ZRSJZ_GameData.Instance.CurrentAvatarFrame || '1'
                : ZRSJZ_GameData.Instance.EquippedTitle || '勇者') === value;
        const sprite = (slot: 'avatar' | 'frame' | 'title', value: string, target: Sprite, path: string) => {
            if (!target || this.keys[slot] === value) return;
            this.keys[slot] = value;
            bundle.load(path + '/spriteFrame', SpriteFrame, (error, asset) => {
                if (!current(slot, value) || !isValid(target, true) || !isValid(target.node, true)) return;
                if (error || !asset) { delete this.keys[slot]; return; }
                target.sizeMode = Sprite.SizeMode.TRIMMED;
                target.spriteFrame = asset;
                if (slot === 'title') this.RefitTitle();
                target.enabled = true;
                target.node.active = true;
                if (slot === 'frame') {
                    // 最后两个静态头像框仅上移，不改变尺寸；切换其他框时恢复基准，避免累加。
                    target.node.setPosition(target.node.position.x, this.frameBaseY + (value === '4' || value === '5' ? 10 : 0), target.node.position.z);
                }
                if (slot === 'frame' && isValid(this.spineNode, true)) {
                    this.spineFrameID = '';
                    this.spineNode.active = false;
                    const skeleton = this.spineNode.getComponent(sp.Skeleton);
                    if (skeleton) { skeleton.clearTracks(); skeleton.skeletonData = null; }
                }
                if (slot === 'avatar') this.RefitSpine();
            });
        };
        sprite('avatar', avatar, this.avatar, 'Sprites/头像框/头像/' + avatar);
        sprite('title', title, this.title, 'Sprites/称号弹窗/称号/' + (title === '不败战神' ? '\u007f' + title : title));
        if (Number(frame) < 6) sprite('frame', frame, this.frame, 'Sprites/头像框/头像框/Icon/' + frame);
        else if (this.spineNode && this.keys.frame !== frame) {
            this.keys.frame = frame;
            bundle.load('Sprites/头像框/头像框/Spine/' + frame + '/1', sp.SkeletonData, (error, asset) => {
                if (!current('frame', frame) || !isValid(this.spineNode, true)) return;
                if (error || !asset) { delete this.keys.frame; return; }
                const oldSprite = this.spineNode.getComponent(Sprite);
                if (oldSprite) oldSprite.enabled = false;
                const skeleton = this.spineNode.getComponent(sp.Skeleton) ?? this.spineNode.addComponent(sp.Skeleton);
                skeleton.skeletonData = asset;
                this.spineFrameID = frame;
                skeleton.enabled = true;
                skeleton.paused = false;
                const runtime = asset.getRuntimeData();
                ZRSJZ_AvatarFrameFit.AroundAvatar(skeleton, frame, this.avatar?.node);
                const animation = runtime?.animations?.find(item => item.name === 'animation') ?? runtime?.animations?.[0];
                if (animation) skeleton.setAnimation(0, animation.name, true);
                this.spineNode.active = true;
                if (this.frame) this.frame.node.active = false;
            });
        }
    }
}
