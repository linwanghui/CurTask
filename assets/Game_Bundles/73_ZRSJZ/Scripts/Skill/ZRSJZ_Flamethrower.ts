import { ZRSJZ_FriendlyDamageService } from '../Service/ZRSJZ_FriendlyDamageService';
import { _decorator, Component, ERaycast2DType, Node, PhysicsSystem2D, Vec2 } from 'cc';
import { ZRSJZ_Skill } from './ZRSJZ_Skill';
import { ZRSJZ_TIER } from '../ZRSJZ_Constant';
import { ZRSJZ_Player } from '../Controller/ZRSJZ_Player';
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_Flamethrower')
export class ZRSJZ_Flamethrower extends ZRSJZ_Skill {

    Point1_0: Node = null;
    Point1_1: Node = null;
    Point2_0: Node = null;
    Point2_1: Node = null;

    Init(): void {
        super.Init();
        this.Point1_0 = this.node.getChildByName("Point1_0");
        this.Point1_1 = this.node.getChildByName("Point1_1");
        this.Point2_0 = this.node.getChildByName("Point2_0");
        this.Point2_1 = this.node.getChildByName("Point2_1");
    }

    Attack() {
        const results1 = PhysicsSystem2D.instance.raycast(new Vec2(this.Point1_0.worldPosition.x, this.Point1_0.worldPosition.y), new Vec2(this.Point1_1.worldPosition.x, this.Point1_1.worldPosition.y), ERaycast2DType.All, ZRSJZ_TIER.玩家,);
        const results2 = PhysicsSystem2D.instance.raycast(new Vec2(this.Point2_0.worldPosition.x, this.Point2_0.worldPosition.y), new Vec2(this.Point2_1.worldPosition.x, this.Point2_1.worldPosition.y), ERaycast2DType.All, ZRSJZ_TIER.玩家,);

        ZRSJZ_FriendlyDamageService.DamageNodes([...results1, ...results2].map(result => result.collider.node), this.Harm);
    }
}
