import { _decorator, Component, RichText, tween, Tween, UIOpacity, v3, Vec3 } from 'cc';
const { ccclass, property } = _decorator;

import { ColorHex } from "../Const/Constant";
import { PoolManager } from '../Managers/PoolManager';

@ccclass('FloatingText')
export class FloatingText extends Component {
    richText: RichText | null = null!;
    Show(content: string, colorType: ColorHex, isBold: boolean = false, delay: number = 0.35, type: number = 1) {
        this.node.setScale(Vec3.ONE);
        let str = `<color=${colorType}>${content}</c>`;
        if (isBold) str = `<b>${str}</b>`;

        this.richText = this.node.getChildByName(`RichText`).getComponent(RichText);
        this.richText.string = str;
        if (this.richText.node.getComponent(UIOpacity)) this.richText.node.getComponent(UIOpacity).opacity = 255;
        else this.richText.node.addComponent(UIOpacity);

        Tween.stopAllByTarget(this.node);
        Tween.stopAllByTarget(this.richText.node);

        switch (type) {
            case 1:
                this.ShowTween1(delay);
                break;
            case 2:
                this.ShowTween2(delay);
                break;
            default:
                this.ShowTween1(delay);
                break;
        }
    }
    ShowTween1(delay: number) {
        this.node.setScale(Vec3.ZERO);
        tween(this.node)
            .to(0.2, { scale: Vec3.ONE }, { easing: `backOut` })
            .delay(delay)
            .call(() => tween(this.richText.node.getComponent(UIOpacity)).to(0.25, { opacity: 100 }).start())
            .to(0.25, { position: v3(this.node.position.x, this.node.position.y + 150) })
            .call(() => PoolManager.PutNode(this.node))
            .start();
    }
    ShowTween2(delay: number) {
        tween(this.richText.node.getComponent(UIOpacity)).delay(delay).to(0.25, { opacity: 0 }).start();
        tween(this.node).delay(delay).to(0.25, { position: v3(0, 250) }).call(() => { PoolManager.PutNode(this.node); }).start();
    }
}