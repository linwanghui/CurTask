import { assetManager, isValid, Node, sp, Sprite, SpriteFrame, UITransform } from 'cc';
import { ZRSJZ_SKIN_CONFIG } from '../ZRSJZ_Constant';
import { ZRSJZ_AvatarFrameFit } from './ZRSJZ_AvatarFrameFit';

/** 与 Start 主页一致：头像、头像框Icon、头像框Spine 各自独立，同父节点叠放。 */
export class ZRSJZ_RankingAvatar {
    private static sprites = new Map<string, Promise<SpriteFrame>>();
    private static animations = new Map<string, Promise<sp.SkeletonData>>();
    private readonly avatar: Sprite;
    private readonly icon: Sprite;
    private readonly spine: sp.Skeleton;
    private readonly scale: number;
    private readonly iconY: number;
    private version = 0;
    private avatarKey = '';
    private frameKey = '';
    private disposed = false;

    constructor(private row: Node) {
        this.avatar = row.getChildByName('头像').getComponent(Sprite);
        this.icon = row.getChildByName('头像框Icon').getComponent(Sprite);
        this.spine = row.getChildByName('头像框Spine').getComponent(sp.Skeleton);
        const avatar = this.avatar.node;
        this.scale = avatar.getComponent(UITransform).width * Math.abs(avatar.scale.x) / 142;
        this.iconY = avatar.position.y;
        avatar.on(Node.EventType.SIZE_CHANGED, this.Refit, this);
        avatar.on(Node.EventType.TRANSFORM_CHANGED, this.Refit, this);
    }
    private Current(version: number): boolean {
        return !this.disposed && version === this.version && isValid(this.row) && this.row.activeInHierarchy;
    }
    private Refit(): void {
        if (this.disposed || !isValid(this.spine) || !this.spine.node.active || !this.spine.skeletonData) return;
        ZRSJZ_AvatarFrameFit.AroundAvatar(this.spine, this.frameKey, this.avatar.node);
    }
    private LoadSprite(path: string): Promise<SpriteFrame> {
        let pending = ZRSJZ_RankingAvatar.sprites.get(path);
        if (!pending) {
            pending = new Promise((resolve, reject) => {
                const bundle = assetManager.getBundle('73_ZRSJZ_DLC');
                if (!bundle) { reject(new Error('头像资源包尚未就绪')); return; }
                bundle.load(path + '/spriteFrame', SpriteFrame, (error, data) => error ? reject(error) : resolve(data));
            });
            ZRSJZ_RankingAvatar.sprites.set(path, pending);
            pending.catch(() => ZRSJZ_RankingAvatar.sprites.delete(path));
        }
        return pending;
    }
    public Show(avatarName: string, frameID: string): void {
        if (this.disposed) return;
        const avatar = ZRSJZ_SKIN_CONFIG.has(avatarName) ? avatarName : '威蓝';
        const frame = /^[1-9]$|^10$/.test(frameID || '') ? frameID : '1';
        if (avatar === this.avatarKey && frame === this.frameKey && this.avatar.enabled
            && (this.icon.node.active || this.spine.node.active)) { this.Refit(); return; }
        const version = ++this.version;
        this.avatarKey = avatar; this.frameKey = frame;
        this.avatar.enabled = false;
        const placeholder = this.avatar.node.getChildByName('占位');
        if (placeholder) placeholder.active = true;
        this.icon.node.active = false;
        this.spine.node.active = false;
        this.spine.clearTracks(); this.spine.skeletonData = null;
        void this.LoadSprite('Sprites/头像框/头像/' + avatar).then(asset => {
            if (!this.Current(version)) return;
            this.avatar.sizeMode = Sprite.SizeMode.TRIMMED;
            this.avatar.spriteFrame = asset;
            this.avatar.node.setScale(this.scale, this.scale, 1);
            this.avatar.enabled = true;
            if (placeholder) placeholder.active = false;
            this.Refit();
        }).catch(error => { if (this.Current(version)) this.avatarKey = ''; console.warn('[排行榜] 头像加载失败', error); });
        if (Number(frame) < 6) {
            void this.LoadSprite('Sprites/头像框/头像框/Icon/' + frame).then(asset => {
                if (!this.Current(version)) return;
                this.icon.sizeMode = Sprite.SizeMode.TRIMMED;
                this.icon.spriteFrame = asset;
                this.icon.node.setScale(this.scale, this.scale, 1);
                this.icon.node.setPosition(this.avatar.node.position.x, this.iconY + (frame === '4' || frame === '5' ? 10 * this.scale : 0));
                this.icon.enabled = true; this.icon.node.active = true;
            }).catch(error => { if (this.Current(version)) this.frameKey = ''; console.warn('[排行榜] 静态头像框加载失败', error); });
            return;
        }
        let pending = ZRSJZ_RankingAvatar.animations.get(frame);
        if (!pending) {
            pending = new Promise((resolve, reject) => {
                const bundle = assetManager.getBundle('73_ZRSJZ_DLC');
                if (!bundle) { reject(new Error('头像框资源包尚未就绪')); return; }
                bundle.load('Sprites/头像框/头像框/Spine/' + frame + '/1', sp.SkeletonData, (error, data) => error ? reject(error) : resolve(data));
            });
            ZRSJZ_RankingAvatar.animations.set(frame, pending);
            pending.catch(() => ZRSJZ_RankingAvatar.animations.delete(frame));
        }
        void pending.then(asset => {
            if (!this.Current(version)) return;
            this.spine.skeletonData = asset;
            this.spine.enabled = true; this.spine.paused = false;
            this.spine.node.active = true;
            this.Refit();
            const runtime = asset.getRuntimeData();
            const animation = runtime.animations.find(a => a.name === 'animation') || runtime.animations[0];
            if (animation) this.spine.setAnimation(0, animation.name, true);
        }).catch(error => { if (this.Current(version)) this.frameKey = ''; console.warn('[排行榜] 动态头像框加载失败', error); });
    }
    public Suspend(): void {
        ++this.version; this.avatarKey = ''; this.frameKey = '';
        if (!isValid(this.spine)) return;
        this.spine.clearTracks(); this.spine.skeletonData = null;
        this.spine.node.active = false;
        if (isValid(this.icon)) this.icon.node.active = false;
    }
    public Dispose(): void {
        this.Suspend(); this.disposed = true;
        if (!isValid(this.avatar)) return;
        this.avatar.node.off(Node.EventType.SIZE_CHANGED, this.Refit, this);
        this.avatar.node.off(Node.EventType.TRANSFORM_CHANGED, this.Refit, this);
    }
}
