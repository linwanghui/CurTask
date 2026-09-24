import { _decorator, Component, isValid, Label, Node, UITransform, Vec3 } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_Guidance')
export class ZRSJZ_Guidance extends Component {

    @property(Node)
    TipNode: Node = null;

    @property(Label)
    TipLabel: Label = null;

    /** 指导区域可保持 inactive；只读取编辑器配置，不显示模板本身。 */
    public get IsConfigured(): boolean {
        return isValid(this.node, true) && !!this.node.getComponent(UITransform)
            && isValid(this.TipNode, true) && isValid(this.TipLabel, true);
    }

    /** 将区域四角转换到遮罩父节点坐标，兼容界面缩放和非中心锚点。 */
    public GetMaskBounds(parent: UITransform): { position: Vec3, width: number, height: number } {
        const source = this.node.getComponent(UITransform);
        const left = -source.anchorX * source.width;
        const bottom = -source.anchorY * source.height;
        const corners = [new Vec3(left, bottom), new Vec3(left + source.width, bottom),
            new Vec3(left, bottom + source.height), new Vec3(left + source.width, bottom + source.height)]
            .map(point => parent.convertToNodeSpaceAR(source.convertToWorldSpaceAR(point)));
        const minX = Math.min(...corners.map(p => p.x)), maxX = Math.max(...corners.map(p => p.x));
        const minY = Math.min(...corners.map(p => p.y)), maxY = Math.max(...corners.map(p => p.y));
        return { position: new Vec3((minX + maxX) / 2, (minY + maxY) / 2),
            width: maxX - minX, height: maxY - minY };
    }

    public GetTipPosition(parent: UITransform): Vec3 {
        return parent.convertToNodeSpaceAR(this.TipNode.worldPosition);
    }
}


