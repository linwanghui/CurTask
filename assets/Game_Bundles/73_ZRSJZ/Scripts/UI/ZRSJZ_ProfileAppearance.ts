import { Button, EventTouch, Node, Sprite, SpriteFrame, sp, UITransform, isValid } from 'cc';
import { BundleManager } from 'db://assets/Scripts/Framework/Managers/BundleManager';
import { ZRSJZ_UIManager } from '../Manager/ZRSJZ_UIManager';
import { ZRSJZ_AudioManager } from '../Manager/ZRSJZ_AudioManager';
import { ZRSJZ_GameData } from '../ZRSJZ_GameData';
import { ZRSJZ_PANEL } from '../ZRSJZ_Constant';

/** 主包仅持有默认资源；DLC 外观通过就绪后的 bundle.load 获取。 */
export class ZRSJZ_ProfileAppearance {
    private avatar: Sprite;
    private frame: Sprite;
    private title: Sprite;
    private spineNode: Node;
    private defaults: Array<{ sprite: Sprite; frame: SpriteFrame }>;
    private version = 0;
    private keys: Partial<Record<'avatar' | 'frame' | 'title', string>> = {};
    private ready = false;
    private disposed = false;
    private clicks: Array<{ node: Node; handler: (event: EventTouch) => void }> = [];

    constructor(private root: Node, avatarPanel = ZRSJZ_PANEL.头像框弹窗) {
        this.avatar = root.getChildByName('头像')?.getComponent(Sprite);
        this.frame = root.getChildByName('头像框Icon')?.getComponent(Sprite);
        this.title = root.getChildByName('称号')?.getComponent(Sprite);
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
                const panel = name === '称号' ? ZRSJZ_PANEL.头像框弹窗 : avatarPanel;
                if (panel !== ZRSJZ_PANEL.等级弹窗 && !ZRSJZ_UIManager.ZRSJZ_DLC) return;
                ZRSJZ_AudioManager.Instance?.PlaySound('点击');
                if (panel === ZRSJZ_PANEL.头像框弹窗) {
                    ZRSJZ_UIManager.Instance.ShowPanel(panel, name === '称号' ? 'title' : 'avatar');
                } else {
                    ZRSJZ_UIManager.Instance.ShowPanel(panel);
                }
            };
            node.on(Node.EventType.TOUCH_END, handler, this);
            this.clicks.push({ node, handler });
        }
        this.Reset();
    }
    private Reset(): void {
        if (this.disposed || !isValid(this.root, true)) return;
        for (const item of this.defaults) {
            if (!isValid(item.sprite, true) || !isValid(item.sprite.node, true)) continue;
            item.sprite.enabled = true;
            item.sprite.node.active = true;
            item.sprite.spriteFrame = item.frame;
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
                target.sizeMode = Sprite.SizeMode.CUSTOM;
                target.spriteFrame = asset;
                target.enabled = true;
                target.node.active = true;
                if (slot === 'frame' && isValid(this.spineNode, true)) {
                    this.spineNode.active = false;
                    const skeleton = this.spineNode.getComponent(sp.Skeleton);
                    if (skeleton) { skeleton.clearTracks(); skeleton.skeletonData = null; }
                }
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
                skeleton.enabled = true;
                skeleton.paused = false;
                const runtime = asset.getRuntimeData();
                const size = this.frame?.node.getComponent(UITransform);
                if (size && runtime?.width > 0 && runtime?.height > 0) {
                    const scale = Math.min(size.width / runtime.width, size.height / runtime.height);
                    this.spineNode.setScale(scale, scale, 1);
                }
                const animation = runtime?.animations?.find(item => item.name === 'animation') ?? runtime?.animations?.[0];
                if (animation) skeleton.setAnimation(0, animation.name, true);
                this.spineNode.active = true;
                if (this.frame) this.frame.node.active = false;
            });
        }
    }
}
