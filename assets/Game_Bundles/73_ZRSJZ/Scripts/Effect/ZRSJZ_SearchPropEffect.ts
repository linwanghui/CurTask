import {
    _decorator,
    Component,
    isValid,
    Node,
    sp,
    Sprite,
    SpriteFrame,
    tween,
    Tween,
    UIOpacity,
    UITransform,
    Vec3,
} from 'cc';
import { BundleManager } from 'db://assets/Scripts/Framework/Managers/BundleManager';
import {
    ZRSJZ_GRID_INTERVAL,
    ZRSJZ_GRID_SIZE,
    ZRSJZ_PROP_CONFIG,
    ZRSJZ_PROP_QUALITY,
} from '../ZRSJZ_Constant';
import { ZRSJZ_AudioManager } from '../Manager/ZRSJZ_AudioManager';

const { ccclass } = _decorator;

@ccclass('ZRSJZ_SearchPropEffect')
export class ZRSJZ_SearchPropEffect extends Component {
    private static readonly _spriteCache: Map<string, SpriteFrame> = new Map();
    private static _skeletonData: sp.SkeletonData = null;

    private _cover: Node = null;
    private _searchIcon: Node = null;
    private _qualityEffect: Node = null;
    private _target: Node = null;
    private _targetIcon: Node = null;
    private readonly _targetIconScale: Vec3 = new Vec3();
    private _playVersion: number = 0;
    private readonly _pendingFinishes: Set<() => void> = new Set();

    protected onLoad(): void {
        this.EnsureNodes();
    }

    protected onDisable(): void {
        this._playVersion++;
        this.StopTweens();
        this.ResolvePending();
        this.RestoreTarget();
    }

    public async Play(
        target: Node,
        propName: string,
        baseDuration: number = 0.6,
    ): Promise<void> {
        const version = ++this._playVersion;
        this.EnsureNodes();
        this.StopTweens();
        this.ResolvePending();
        this.RestoreTarget();
        this._target = target;
        if (!target?.isValid) {
            return;
        }
        this._targetIcon = target.getChildByName("Icon");
        if (this._targetIcon?.isValid) {
            this._targetIconScale.set(this._targetIcon.scale);
        }

        const propConfig = ZRSJZ_PROP_CONFIG.get(propName);
        const quality = propConfig?.Quality ?? ZRSJZ_PROP_QUALITY.白色;
        const gridName = propConfig?.GridType?.replace("_", "x") ?? "1x1";
        const targetTransform = target.getComponent(UITransform);
        const width = Math.max(1, targetTransform?.width ?? 132);
        const height = Math.max(1, targetTransform?.height ?? 132);
        this.Resize(width, height);

        const targetOpacity = target.getComponent(UIOpacity) ?? target.addComponent(UIOpacity);
        targetOpacity.opacity = 0;

        const [coverSprite, searchSprite, skeletonData] = await Promise.all([
            this.LoadSprite(`Sprites/开箱/${gridName}/spriteFrame`),
            this.LoadSprite("Sprites/开箱/搜索图标/spriteFrame"),
            this.LoadSkeletonData(),
        ]);
        if (version !== this._playVersion || !isValid(this.node) || !target.isValid) {
            return;
        }

        this._cover.getComponent(Sprite).spriteFrame = coverSprite;
        this._searchIcon.getComponent(Sprite).spriteFrame = searchSprite;
        const skeleton = this._qualityEffect.getComponent(sp.Skeleton);
        if (skeletonData && skeleton) {
            skeleton.skeletonData = skeletonData;
        }

        this._cover.active = true;
        this._searchIcon.active = true;
        this._qualityEffect.active = false;

        const duration = this.GetRevealDuration(quality, baseDuration);
        await this.PlaySearchCircle(duration, width, height);
        if (version !== this._playVersion || !target.isValid) {
            return;
        }

        this._cover.active = false;
        // 搜索完成、真实道具刚出现时再播放音效；若退出界面导致搜索取消，
        // 上方的版本检查会直接返回，不会在返回主页时误播。
        this.PlayRevealSound(quality);
        targetOpacity.opacity = 255;
        await Promise.all([
            this.PlayTargetPop(),
            this.PlayQualityEffect(quality),
        ]);
        if (version === this._playVersion) {
            this._target = null;
            this._targetIcon = null;
        }
    }

    /** 只显示对应尺寸的开箱占位图，用于尚未搜索到的物资。 */
    public async ShowPlaceholder(propName: string): Promise<void> {
        const version = ++this._playVersion;
        this.EnsureNodes();
        this.StopTweens();
        this.ResolvePending();
        this.RestoreTarget();

        const propConfig = ZRSJZ_PROP_CONFIG.get(propName);
        const gridType = propConfig?.GridType ?? "1_1";
        const gridName = gridType.replace("_", "x");
        const [height, width] = gridType.split("_").map(Number);
        this.Resize(
            width * ZRSJZ_GRID_SIZE
            + Math.max(0, width - 1) * ZRSJZ_GRID_INTERVAL,
            height * ZRSJZ_GRID_SIZE
            + Math.max(0, height - 1) * ZRSJZ_GRID_INTERVAL,
        );

        const coverSprite = await this.LoadSprite(
            `Sprites/开箱/${gridName}/spriteFrame`,
        );
        if (version !== this._playVersion || !isValid(this.node)) {
            return;
        }

        this._cover.getComponent(Sprite).spriteFrame = coverSprite;
        this._cover.active = true;
        this._searchIcon.active = false;
        this._qualityEffect.active = false;
    }

    private EnsureNodes(): void {
        if (this._cover?.isValid) {
            return;
        }

        const rootTransform = this.node.getComponent(UITransform)
            ?? this.node.addComponent(UITransform);
        rootTransform.setAnchorPoint(0, 1);

        this._cover = new Node("遮挡");
        this._cover.layer = this.node.layer;
        this.node.addChild(this._cover);
        this._cover.addComponent(UITransform).setAnchorPoint(0, 1);
        this._cover.addComponent(Sprite).sizeMode = Sprite.SizeMode.CUSTOM;

        this._searchIcon = new Node("搜索图标");
        this._searchIcon.layer = this.node.layer;
        this._cover.addChild(this._searchIcon);
        this._searchIcon.addComponent(UITransform).setContentSize(56, 56);
        this._searchIcon.addComponent(Sprite).sizeMode = Sprite.SizeMode.CUSTOM;

        this._qualityEffect = new Node("品质特效");
        this._qualityEffect.layer = this.node.layer;
        this.node.addChild(this._qualityEffect);
        this._qualityEffect.addComponent(UITransform).setContentSize(132, 132);
        this._qualityEffect.addComponent(sp.Skeleton);
        this._qualityEffect.active = false;
    }

    private Resize(width: number, height: number): void {
        this.node.getComponent(UITransform)?.setContentSize(width, height);
        this._cover.getComponent(UITransform)?.setContentSize(width, height);
        this._qualityEffect.setPosition(width * 0.5, -height * 0.5, 0);
        const effectTransform = this._qualityEffect.getComponent(UITransform);
        const effectWidth = Math.max(1, effectTransform?.width ?? 132);
        const effectHeight = Math.max(1, effectTransform?.height ?? 132);
        this._qualityEffect.setScale(
            width / effectWidth * 0.5,
            height / effectHeight * 0.5,
            1,
        );
    }

    private PlaySearchCircle(duration: number, width: number, height: number): Promise<void> {
        const radius = Math.min(width, height) * 0.17;
        const roundDuration = 0.67;
        const roundCount = Math.max(1, duration / roundDuration);
        const stepCount = Math.max(12, Math.ceil(roundCount * 12));
        const centerX = width * 0.5;
        const centerY = -height * 0.5;
        this._searchIcon.setPosition(centerX + radius, centerY, 0);

        return this.CreateTrackedPromise(finish => {
            const searchTween = tween(this._searchIcon);
            for (let index = 1; index <= stepCount; index++) {
                const angle = Math.PI * 2 * roundCount * index / stepCount;
                searchTween.to(duration / stepCount, {
                    position: new Vec3(
                        centerX + Math.cos(angle) * radius,
                        centerY + Math.sin(angle) * radius,
                        0,
                    ),
                });
            }
            searchTween.call(() => {
                this._searchIcon.active = false;
                this._searchIcon.setPosition(centerX, centerY, 0);
                finish();
            }).start();
        });
    }

    private PlayTargetPop(): Promise<void> {
        const target = this._targetIcon;
        if (!target?.isValid) {
            return Promise.resolve();
        }
        const popScale = this._targetIconScale.clone().multiplyScalar(1.16);
        popScale.z = this._targetIconScale.z;
        target.setScale(Vec3.ZERO);
        return this.CreateTrackedPromise(finish => {
            tween(target)
                .to(0.14, { scale: popScale }, { easing: "backOut" })
                .to(0.08, { scale: this._targetIconScale }, { easing: "quadOut" })
                .call(finish)
                .start();
        });
    }

    private PlayQualityEffect(quality: ZRSJZ_PROP_QUALITY): Promise<void> {
        if (
            quality !== ZRSJZ_PROP_QUALITY.金色
            && quality !== ZRSJZ_PROP_QUALITY.红色
        ) {
            return Promise.resolve();
        }

        const skeleton = this._qualityEffect.getComponent(sp.Skeleton);
        if (!skeleton?.skeletonData) {
            return Promise.resolve();
        }

        this._qualityEffect.active = true;
        return this.CreateTrackedPromise(finish => {
            skeleton.setCompleteListener(() => {
                skeleton.setCompleteListener(() => { });
                this._qualityEffect.active = false;
                finish();
            });
            skeleton.setAnimation(0, "animation", false);
        });
    }

    private GetRevealDuration(
        quality: ZRSJZ_PROP_QUALITY,
        baseDuration: number,
    ): number {
        const base = Math.max(0.2, baseDuration);
        switch (quality) {
            case ZRSJZ_PROP_QUALITY.绿色: return base * 1.2;
            case ZRSJZ_PROP_QUALITY.蓝色: return base * 1.5;
            case ZRSJZ_PROP_QUALITY.紫色: return base * 2;
            case ZRSJZ_PROP_QUALITY.金色: return base * 2.6;
            case ZRSJZ_PROP_QUALITY.红色: return base * 3.2;
            default: return base;
        }
    }


    /** 道具正式显现时，根据品质播放对应的开箱音效。 */
    private PlayRevealSound(quality: ZRSJZ_PROP_QUALITY): void {
        ZRSJZ_AudioManager.Instance?.PlaySound("开宝箱");
        switch (quality) {
            case ZRSJZ_PROP_QUALITY.红色:
                if (Math.random() < 0.8) ZRSJZ_AudioManager.Instance?.PlaySoleSound("哇金色传说");
                break;
            case ZRSJZ_PROP_QUALITY.金色:
                if (Math.random() < 0.5) ZRSJZ_AudioManager.Instance?.PlaySoleSound("一般");
                break;
            case ZRSJZ_PROP_QUALITY.紫色:
                if (Math.random() < 0.2) ZRSJZ_AudioManager.Instance?.PlaySoleSound("一般");
                break;
            default:
                // 白、绿、蓝品质统一使用普通开出音效。
                if (Math.random() < 0.3) ZRSJZ_AudioManager.Instance?.PlaySoleSound("难过");
                break;
        }
    }

    private LoadSprite(path: string): Promise<SpriteFrame> {
        const cached = ZRSJZ_SearchPropEffect._spriteCache.get(path);
        if (cached) {
            return Promise.resolve(cached);
        }
        return new Promise(resolve => {
            BundleManager.GetBundle("73_ZRSJZ").load(
                path,
                SpriteFrame,
                (error: Error, spriteFrame: SpriteFrame) => {
                    if (error) {
                        console.error(`[ZRSJZ_SearchPropEffect] 加载图片失败: ${path}`, error);
                        resolve(null);
                        return;
                    }
                    ZRSJZ_SearchPropEffect._spriteCache.set(path, spriteFrame);
                    resolve(spriteFrame);
                },
            );
        });
    }

    private LoadSkeletonData(): Promise<sp.SkeletonData> {
        if (ZRSJZ_SearchPropEffect._skeletonData) {
            return Promise.resolve(ZRSJZ_SearchPropEffect._skeletonData);
        }
        return new Promise(resolve => {
            BundleManager.GetBundle("73_ZRSJZ").load(
                "Sprites/开箱/特效/1",
                sp.SkeletonData,
                (error: Error, data: sp.SkeletonData) => {
                    if (error) {
                        console.error("[ZRSJZ_SearchPropEffect] 加载品质特效失败", error);
                        resolve(null);
                        return;
                    }
                    ZRSJZ_SearchPropEffect._skeletonData = data;
                    resolve(data);
                },
            );
        });
    }

    private StopTweens(): void {
        if (this._searchIcon) Tween.stopAllByTarget(this._searchIcon);
        if (this._targetIcon) Tween.stopAllByTarget(this._targetIcon);
        const skeleton = this._qualityEffect?.getComponent(sp.Skeleton);
        if (skeleton) {
            skeleton.setCompleteListener(() => { });
            skeleton.clearTracks();
        }
        if (this._qualityEffect) {
            this._qualityEffect.active = false;
        }
    }

    private CreateTrackedPromise(
        start: (finish: () => void) => void,
    ): Promise<void> {
        return new Promise(resolve => {
            let completed = false;
            const finish = (): void => {
                if (completed) {
                    return;
                }
                completed = true;
                this._pendingFinishes.delete(finish);
                resolve();
            };
            this._pendingFinishes.add(finish);
            start(finish);
        });
    }

    private ResolvePending(): void {
        const finishes = Array.from(this._pendingFinishes);
        this._pendingFinishes.clear();
        finishes.forEach(finish => finish());
    }

    private RestoreTarget(): void {
        if (!this._target?.isValid) {
            this._target = null;
            return;
        }
        const opacity = this._target.getComponent(UIOpacity);
        if (opacity) opacity.opacity = 255;
        if (this._targetIcon?.isValid) {
            this._targetIcon.setScale(this._targetIconScale);
        }
        this._target = null;
        this._targetIcon = null;
    }
}
