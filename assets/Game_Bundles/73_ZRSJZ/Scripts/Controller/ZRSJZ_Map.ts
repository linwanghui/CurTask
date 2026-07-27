import { _decorator, Component, Node } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_Map')
export class ZRSJZ_Map extends Component {

    @property({ type: Node, tooltip: "单位节点" })
    Unit: Node = null;

    Map: Node = null;
    PlayerPoints: Node[] = [];
    BulletParent: Node = null;


    Init() {
        this.Map = this.node.getChildByName("Map");
        this.node.getChildByName("PlayerPoints").children.forEach(child => {
            this.PlayerPoints.push(child);
        });
        this.BulletParent = this.node.getChildByName("Bullet");
    }

    protected update(dt: number): void {
        this.Unit.children.sort((a, b) => b.y - a.y);
        this.Unit.children.forEach((child, index) => {
            child.setSiblingIndex(index);
        });
    }

}


