import { ZRSJZ_Vortex } from './ZRSJZ_Vortex';
import { ZRSJZ_Prayer } from './ZRSJZ_Prayer';
import { ZRSJZ_LaserTraps } from './ZRSJZ_LaserTraps';
import { ZRSJZ_Swamp } from './ZRSJZ_Swamp';
import { ZRSJZ_Fishing } from './ZRSJZ_Fishing';
import { _decorator, Component, instantiate, Node, Prefab } from 'cc';
import { ZRSJZ_UIManager } from '../Manager/ZRSJZ_UIManager';
import { BundleManager } from 'db://assets/Scripts/Framework/Managers/BundleManager';
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_Map')
export class ZRSJZ_Map extends Component {

    @property({ type: Node, tooltip: "单位节点" })
    Unit: Node = null;

    @property(Node)
    OilPoints: Node = null;

    Map: Node = null;
    PlayerPoints: Node[] = [];
    BulletParent: Node = null;


    Init() {
        if (this.node.name === '沙漠' && !this.getComponent(ZRSJZ_Prayer)) this.addComponent(ZRSJZ_Prayer);
        if (this.node.name === '沙漠' && !this.getComponent(ZRSJZ_Vortex)) this.addComponent(ZRSJZ_Vortex);
        if (this.node.name === '城镇' && !this.getComponent(ZRSJZ_Fishing)) this.addComponent(ZRSJZ_Fishing);
        if (this.node.name === '城镇' && !this.getComponent(ZRSJZ_Swamp)) this.addComponent(ZRSJZ_Swamp);
        if (this.node.name === '城镇' && !this.getComponent(ZRSJZ_LaserTraps)) this.addComponent(ZRSJZ_LaserTraps);
        this.Map = this.node.getChildByName("Map");
        this.node.getChildByName("PlayerPoints").children.forEach(child => {
            this.PlayerPoints.push(child);
        });
        this.BulletParent = this.node.getChildByName("Bullet");
        if (ZRSJZ_UIManager.ZRSJZ_DLC && this.OilPoints) {
            BundleManager.GetBundle("73_ZRSJZ_DLC").load("Prefabs/Unit/油桶", Prefab, (err: any, prefab: Prefab) => {
                if (err) {
                    console.error(`加载 Bundle: 73_ZRSJZ_DLC Prefab 加载失败 Path: Prefabs/Unit/油桶`);
                } else {
                    this.OilPoints.children.forEach(child => {
                        let oil = instantiate(prefab);
                        oil.parent = this.Unit;
                        oil.setWorldPosition(child.worldPosition.clone());
                    });
                }
            });
        }
    }

    protected update(dt: number): void {
        this.Unit.children.sort((a, b) => b.y - a.y);
        this.Unit.children.forEach((child, index) => {
            child.setSiblingIndex(index);
        });
    }

}


