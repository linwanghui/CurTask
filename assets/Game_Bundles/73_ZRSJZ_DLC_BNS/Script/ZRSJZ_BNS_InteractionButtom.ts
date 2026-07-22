import { _decorator, Component, Node } from 'cc';
import { ZRSJZ_BNS_EventManager, ZRSJZ_BNS_MyEvent } from './ZRSJZ_BNS_EventManager';
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_BNS_InteractionButtom')
export class ZRSJZ_BNS_InteractionButtom extends Component {
    private InteractionNode: Node = null;
    private InteractionNodes: Node[] = [];

    start() {
        ZRSJZ_BNS_EventManager.On(ZRSJZ_BNS_MyEvent.进入交互对象范围, this.Show, this);
        ZRSJZ_BNS_EventManager.On(ZRSJZ_BNS_MyEvent.离开交互对象范围, this.Exit, this);
        this.node.active = false;
    }

    Show(node: Node) {
        if (!this.InteractionNodes.includes(node)) {
            this.InteractionNodes.push(node);
        }

        // 保持原有行为：最后进入范围的对象作为当前交互目标。
        this.node.active = true;
        this.InteractionNode = node;
    }

    Exit(node: Node) {
        const index = this.InteractionNodes.indexOf(node);
        if (index !== -1) {
            this.InteractionNodes.splice(index, 1);
        }

        // 当前目标离开后，切换到仍在范围内的最后一个对象。
        if (this.InteractionNode === node) {
            this.InteractionNode = this.InteractionNodes.length > 0
                ? this.InteractionNodes[this.InteractionNodes.length - 1]
                : null;
        }

        // 只有范围内已经没有任何交互对象时才隐藏按钮。
        this.node.active = this.InteractionNodes.length > 0;
    }

    OnClick() {
        if (this.InteractionNode) {
            ZRSJZ_BNS_EventManager.Emit(ZRSJZ_BNS_MyEvent.交互被按下, this.InteractionNode);
        }
    }
}


