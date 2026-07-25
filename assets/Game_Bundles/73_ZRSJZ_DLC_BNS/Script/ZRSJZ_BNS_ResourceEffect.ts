import { _decorator, Component, Node, Sprite, SpriteFrame, tween, UIOpacity, UITransform, Vec3 } from 'cc';
import { ZRSJZ_BNS_ResourceName } from './ZRSJZ_BNS_Constant';
import { ZRSJZ_BNS_Incident } from './ZRSJZ_BNS_Incident';
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_BNS_ResourceEffect')
export class ZRSJZ_BNS_ResourceEffect extends Component {
    private _finishCount: number = 0;
    private _itemCount: number = 0;
    private _onComplete: Function = null;

    public async Play(
        resourceName: ZRSJZ_BNS_ResourceName,
        startPosition: Vec3,
        targetPosition: Vec3,
        onComplete: Function = null,
    ): Promise<void> {
        const spriteFrame = await ZRSJZ_BNS_Incident.LoadDLCSprite(`Sprites/资源种类标/${resourceName}资源`) as SpriteFrame;
        if (!spriteFrame) {
            onComplete?.();
            this.node.destroy();
            return;
        }

        this._finishCount = 0;
        this._itemCount = this.GetRandomInt(8, 12);
        this._onComplete = onComplete;

        this.node.setPosition(startPosition);

        for (let i = 0; i < this._itemCount; i++) {
            this.CreateResourceItem(spriteFrame, targetPosition, i);
        }
    }

    private CreateResourceItem(spriteFrame: SpriteFrame, targetPosition: Vec3, index: number): void {
        const item = new Node(`资源_${index}`);
        item.layer = this.node.layer;
        item.parent = this.node.parent;

        const transform = item.addComponent(UITransform);
        transform.setContentSize(50, 50);

        const sprite = item.addComponent(Sprite);
        sprite.spriteFrame = spriteFrame;

        const opacity = item.addComponent(UIOpacity);
        opacity.opacity = 255;

        item.setPosition(this.node.position);
        item.setScale(0.4, 0.4, 1);

        const burstPosition = this.node.position.clone().add(new Vec3(
            this.GetRandomFloat(-90, 90),
            this.GetRandomFloat(25, 120),
            0,
        ));
        const delayTime = index * 0.025;
        const flyTime = this.GetRandomFloat(0.35, 0.55);

        tween(item)
            .delay(delayTime)
            .to(0.22, { position: burstPosition, scale: new Vec3(0.8, 0.8, 1) }, { easing: 'quadOut' })
            .to(flyTime, { position: targetPosition, scale: new Vec3(0.35, 0.35, 1) }, { easing: 'quadIn' })
            .call(() => {
                item.destroy();
                this.OnItemComplete();
            })
            .start();
    }

    private OnItemComplete(): void {
        this._finishCount++;
        if (this._finishCount < this._itemCount) return;

        this._onComplete?.();
        this.node.destroy();
    }

    private GetRandomInt(minCount: number, maxCount: number): number {
        return Math.floor(Math.random() * (maxCount - minCount + 1)) + minCount;
    }

    private GetRandomFloat(minCount: number, maxCount: number): number {
        return Math.random() * (maxCount - minCount) + minCount;
    }
}


