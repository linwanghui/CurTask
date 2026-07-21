import { _decorator, Component, CCBoolean, Enum, Node, tween, Sprite, rect, Texture2D, SpriteFrame, Vec3 } from 'cc';
const { ccclass, property } = _decorator;

export enum EasingType {
    //     /*** 平方曲线缓入函数。运动由慢到快。*/
    quadIn = `quadIn`,
    //     /*** 平方曲线缓出函数。运动由快到慢。*/
    quadOut = `quadOut`,
    //     /*** 平方曲线缓入缓出函数。运动由慢到快再到慢。*/
    quadInOut = `quadInOut`,
    //     /*** 立方曲线缓入函数。运动由慢到快。*/
    cubicIn = `cubicIn`,
    //     /*** 立方曲线缓出函数。运动由快到慢。*/
    cubicOut = `cubicOut`,
    //     /*** 立方曲线缓入缓出函数。运动由慢到快再到慢。*/
    cubicInOut = `cubicInOut`,
    //     /*** 四次方曲线缓入函数。运动由慢到快。*/
    quartIn = `quartIn`,
    //     /*** 四次方曲线缓出函数。运动由快到慢。*/
    quartOut = `quartOut`,
    //     /*** 四次方曲线缓入缓出函数。运动由慢到快再到慢。*/
    quartInOut = `quartInOut`,
    //     /*** 五次方曲线缓入函数。运动由慢到快。*/
    quintIn = `quintIn`,
    //     /*** 五次方曲线缓出函数。运动由快到慢。*/
    quintOut = `quintOut`,
    //     /*** 五次方曲线缓入缓出函数。运动由慢到快再到慢。*/
    quintInOut = `quintInOut`,
    //     /*** 正弦曲线缓入函数。运动由慢到快。*/
    sineIn = `sineIn`,
    //     /*** 正弦曲线缓出函数。运动由快到慢。*/
    sineOut = `sineOut`,
    //     /*** 正弦曲线缓入缓出函数。运动由慢到快再到慢。*/
    sineInOut = `sineInOut`,
    //     /*** 指数曲线缓入函数。运动由慢到快。*/
    expoIn = `expoIn`,
    //     /*** 指数曲线缓出函数。运动由快到慢。*/
    expoOut = `expoOut`,
    //     /*** 指数曲线缓入和缓出函数。运动由慢到很快再到慢。*/
    expoInOut = `expoInOut`,
    //     /*** 循环公式缓入函数。运动由慢到快。*/
    circIn = `circIn`,
    //     /*** 循环公式缓出函数。运动由快到慢。*/
    circOut = `circOut`,
    //     /*** 指数曲线缓入缓出函数。运动由慢到很快再到慢。*/
    circInOut = `circInOut`,
    //     /*** 弹簧回震效果的缓入函数。*/
    elasticIn = `elasticIn`,
    //     /*** 弹簧回震效果的缓出函数。*/
    elasticOut = `elasticOut`,
    //     /*** 弹簧回震效果的缓入缓出函数。*/
    elasticInOut = `elasticInOut`,
    //     /*** 回退效果的缓入函数。*/
    backIn = `backIn`,
    //     /*** 回退效果的缓出函数。*/
    backOut = `backOut`,
    //     /*** 回退效果的缓入缓出函数。*/
    backInOut = `backInOut`,
    //     /*** 弹跳效果的缓入函数。*/
    bounceIn = `bounceIn`,
    //     /*** 弹跳效果的缓出函数。*/
    bounceOut = `bounceOut`,
    //     /*** 弹跳效果的缓入缓出函数。*/
    bounceInOut = `bounceInOut`,
    //     /*** 平滑效果函数。*/
    smooth = `smooth`,
    //     /*** 渐褪效果函数。*/
    fade = `fade`,
}

@ccclass('TweenUtil')
export default class TweenUtil extends Component {
    @property(CCBoolean)
    DisplayMode: boolean = false;
    @property({ type: Enum(EasingType) })
    type: EasingType = EasingType.smooth;
    @property({ type: Node, visible() { return this.DisplayMode } })
    parent: Node | null = null;
    protected start(): void {
        if (this.DisplayMode && this.parent) this.GernerateDisplayItem();
    }
    GernerateDisplayItem() {
        // for (let i = 0; i < Object.keys(EasingType).length; i++) {
        //     let node = new Node(Object.keys(EasingType)[i]);
        //     let texture = new Texture2D();
        //     let spriteFrame = new SpriteFrame;
        //     texture.initWithData(new Uint8Array([0, 0, 0]), Texture2D.PixelFormat.RGB888, 1, 1);
        //     spriteFrame.texture = texture;
        //     spriteFrame.setRect(rect(0, 0, 100, 100));
        //     node.addComponent(Sprite).spriteFrame = spriteFrame;
        //     node.setParent(this.parent);
        //     node.scale = Vec3.ZERO;
        //     node.on(Node.EventType.TOUCH_START, () => { console.log(node.name) }, this);
        //     tween(node)
        //         .to(2, { scale: Vec3.ONE }, { easing: Object.keys(EasingType)[i] })
        //         .delay(2)
        //         .to(2, { scale: Vec3.ZERO }, { easing: Object.keys(EasingType)[i] })
        //         .delay(2)
        //         .union()
        //         .repeatForever()
        //         .start();

        // }
    }
}