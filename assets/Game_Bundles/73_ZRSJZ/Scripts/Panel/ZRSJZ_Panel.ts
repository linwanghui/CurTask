import { _decorator, Component, easing, find, Node, Tween, tween, UIOpacity, UITransform, v3, Vec3 } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_Panel')
export class ZRSJZ_Panel extends Component {

    Panel: Node = null;
    /** -1 表示全局弹窗，0/1 表示分屏中所属玩家。 */
    public PlayerIndex: number = -1;

    Show(...args: any[]) {
        if (!this.Panel) this.Panel = find("Panel", this.node);
        Tween.stopAllByTarget(this.Panel);
        this.Panel.scale = v3(0, 0, 0);
        this.node.active = true;
        tween(this.Panel)
            .to(0.3, { scale: this.GetPanelScale() }, { easing: 'backOut' })
            .call(() => {
                if (args.length > 0) args[0]();
            })
            .start();
    }

    Hide(...args: any[]) {
        const Mask: Node | null = find("Panel/Mask", this.node);
        Tween.stopAllByTarget(this.Panel);
        tween(this.Panel)
            .to(0, { scale: v3(0, 0, 0) }, { easing: 'backOut' })
            .call(() => {
                if (args.length > 0) args[0]();
                this.node.active = false;
            })
            .start();
    }

    GetPanelScale(): Vec3 {
        if (!this.Panel) this.Panel = find("Panel", this.node);

        const panelTransform = this.Panel?.getComponent(UITransform);
        const containerTransform = this.node.parent?.getComponent(UITransform)
            ?? this.node.getComponent(UITransform);
        if (!panelTransform || !containerTransform) return Vec3.ONE.clone();

        const panelWidth = panelTransform.contentSize.width;
        const panelHeight = panelTransform.contentSize.height;
        const containerWidth = containerTransform.contentSize.width;
        const containerHeight = containerTransform.contentSize.height;
        if (
            panelWidth <= 0 || panelHeight <= 0
            || containerWidth <= 0 || containerHeight <= 0
        ) {
            return Vec3.ONE.clone();
        }

        // 等比缩小到当前弹窗容器内。全屏模式通常保持 1，分屏模式下
        // 则会根据玩家 UI 容器的实际宽高自动缩小，避免内容越界。
        const scale = Math.min(
            1,
            containerWidth / panelWidth,
            containerHeight / panelHeight,
        );
        return v3(scale, scale, 1);
    }

}

