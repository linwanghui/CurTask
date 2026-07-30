import {
    _decorator,
    Component,
    isValid,
    Node,
    Sprite,
    SpriteFrame,
    sp,
    tween,
    Tween,
    UITransform,
    Vec3
} from 'cc';
import { ZRSJZ_UIManager } from '../../73_ZRSJZ/Scripts/Manager/ZRSJZ_UIManager';
import {
    ZRSJZ_GRID_TYPE,
    ZRSJZ_PROP_QUALITY
} from '../../73_ZRSJZ/Scripts/ZRSJZ_Constant';
import {
    ZRSJZ_MYSTERY_BOX_ITEM_POP_DURATION,
    ZRSJZ_MYSTERY_BOX_ITEM_POP_SCALE,
    ZRSJZ_MYSTERY_BOX_SEARCH_RADIUS,
    ZRSJZ_MYSTERY_BOX_SEARCH_ROUND_DURATION,
    ZRSJZ_MYSTERY_BOX_SPINE_EFFECT_ANI_NAME,
    ZRSJZ_MYSTERY_BOX_SPINE_EFFECT_SCALE
} from './ZRSJZ_MysteryBoxConstant';
const { ccclass } = _decorator;

@ccclass('ZRSJZ_MysteryBoxSmallBox')
export class ZRSJZ_MysteryBoxSmallBox extends Component {
    private _propName: string = "";
    private _quality: ZRSJZ_PROP_QUALITY = null;

    public async Init(
        propName: string,
        width: number,
        height: number,
        quality: ZRSJZ_PROP_QUALITY,
        gridType: ZRSJZ_GRID_TYPE,
        coverSpriteFrame: SpriteFrame
    ): Promise<void> {
        this._propName = propName;
        this._quality = quality;
        const displayWidth = Math.max(1, width * 0.97);
        const displayHeight = Math.max(1, height * 0.97);
        this.Resize(displayWidth, displayHeight);
        this.ResizeSpineEffect(displayWidth, displayHeight);

        const cover = this.node.getChildByName("遮挡");
        if (cover) {
            cover.active = true;
            const coverSprite = cover.getComponent(Sprite);
            if (coverSprite) {
                coverSprite.sizeMode = Sprite.SizeMode.CUSTOM;
                coverSprite.spriteFrame = coverSpriteFrame;
                cover.getComponent(UITransform)
                    ?.setContentSize(displayWidth, displayHeight);
            }
            const searchIcon = cover.getChildByName("搜索图标");
            if (searchIcon) searchIcon.active = false;
        }

        const [gridSpriteFrame, propSpriteFrame] = await Promise.all([
            ZRSJZ_UIManager.Instance.GetPropGridUI(`${quality}${gridType}`),
            ZRSJZ_UIManager.Instance.GetPropUI(propName),
        ]);
        if (!isValid(this.node) || this._propName !== propName) return;

        const gridSprite = this.node.getChildByName("底框")?.getComponent(Sprite);
        if (gridSprite) {
            gridSprite.sizeMode = Sprite.SizeMode.CUSTOM;
            gridSprite.spriteFrame = gridSpriteFrame;
            gridSprite.getComponent(UITransform)
                ?.setContentSize(displayWidth, displayHeight);
        }
        if (!propSpriteFrame) return;

        const propNode = this.node.getChildByName("道具图");
        const propSprite = propNode?.getComponent(Sprite);
        const propTransform = propNode?.getComponent(UITransform);
        if (!propSprite || !propTransform) return;

        propSprite.spriteFrame = propSpriteFrame;
        const sourceSize = propSpriteFrame.originalSize;
        const sourceWidth = Math.max(1, sourceSize.width);
        const sourceHeight = Math.max(1, sourceSize.height);
        const maxWidth = Math.max(1, displayWidth * 0.82);
        const maxHeight = Math.max(1, displayHeight * 0.82);
        const scale = Math.min(maxWidth / sourceWidth, maxHeight / sourceHeight);
        propTransform.setContentSize(sourceWidth * scale, sourceHeight * scale);
        propNode.setScale(Vec3.ZERO);
    }

    public Reveal(duration: number): Promise<void> {
        const cover = this.node.getChildByName("遮挡");
        const searchIcon = cover?.getChildByName("搜索图标");
        if (!cover || !searchIcon) return Promise.resolve();

        cover.active = true;
        searchIcon.active = true;
        Tween.stopAllByTarget(searchIcon);

        const radius = ZRSJZ_MYSTERY_BOX_SEARCH_RADIUS;
        const roundCount = duration / ZRSJZ_MYSTERY_BOX_SEARCH_ROUND_DURATION;
        const stepCount = Math.max(1, Math.ceil(roundCount * 12));
        searchIcon.setPosition(radius, 0);

        return new Promise(resolve => {
            const searchTween = tween(searchIcon);
            for (let index = 1; index <= stepCount; index++) {
                const angle = Math.PI * 2 * roundCount * index / stepCount;
                searchTween.to(duration / stepCount, {
                    position: new Vec3(
                        Math.cos(angle) * radius,
                        Math.sin(angle) * radius,
                        0
                    )
                });
            }
            searchTween
                .call(() => {
                    cover.active = false;
                    searchIcon.setPosition(0, 0);
                    this.PlayPropRevealEffect().then(resolve);
                })
                .start();
        });
    }

    private PlayPropRevealEffect(): Promise<void> {
        const propNode = this.node.getChildByName("道具图");
        if (!propNode) return Promise.resolve();

        Tween.stopAllByTarget(propNode);
        propNode.setScale(Vec3.ZERO);
        this.PlayQualitySpineEffect();

        const popScale = new Vec3(
            ZRSJZ_MYSTERY_BOX_ITEM_POP_SCALE,
            ZRSJZ_MYSTERY_BOX_ITEM_POP_SCALE,
            1
        );
        return new Promise(resolve => {
            tween(propNode)
                .to(
                    ZRSJZ_MYSTERY_BOX_ITEM_POP_DURATION * 0.62,
                    { scale: popScale },
                    { easing: "backOut" }
                )
                .to(
                    ZRSJZ_MYSTERY_BOX_ITEM_POP_DURATION * 0.38,
                    { scale: Vec3.ONE },
                    { easing: "quadOut" }
                )
                .call(() => resolve())
                .start();
        });
    }

    private ResizeSpineEffect(width: number, height: number): void {
        const effectNode = this.node.getChildByName("特效");
        if (!effectNode) return;

        effectNode.active = false;
        const effectSize = effectNode.getComponent(UITransform);
        const sourceWidth = Math.max(1, effectSize?.width ?? 132);
        const sourceHeight = Math.max(1, effectSize?.height ?? 132);
        effectNode.setScale(
            width / sourceWidth * ZRSJZ_MYSTERY_BOX_SPINE_EFFECT_SCALE,
            height / sourceHeight * ZRSJZ_MYSTERY_BOX_SPINE_EFFECT_SCALE,
            1
        );
    }

    private PlayQualitySpineEffect(): void {
        if (
            this._quality !== ZRSJZ_PROP_QUALITY.金色
            && this._quality !== ZRSJZ_PROP_QUALITY.红色
        ) {
            return;
        }

        const effectNode = this.node.getChildByName("特效");
        const skeleton = effectNode?.getComponent(sp.Skeleton);
        if (!effectNode || !skeleton) return;

        effectNode.active = true;
        skeleton.setCompleteListener(() => {
            effectNode.active = false;
            skeleton.setCompleteListener(() => {});
        });
        skeleton.setAnimation(
            0,
            ZRSJZ_MYSTERY_BOX_SPINE_EFFECT_ANI_NAME,
            false
        );
    }

    private Resize(width: number, height: number): void {
        this.node.getComponent(UITransform)?.setContentSize(width, height);
        for (const childName of ["底框", "遮挡"]) {
            this.node.getChildByName(childName)
                ?.getComponent(UITransform)
                ?.setContentSize(width, height);
        }
    }

}
