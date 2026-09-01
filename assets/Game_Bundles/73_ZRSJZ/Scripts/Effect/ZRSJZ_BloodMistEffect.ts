import { _decorator, Component, Node, sp, Vec3 } from 'cc';
import { ZRSJZ_Effect } from './ZRSJZ_Effect';
import { ZRSJZ_PoolManager } from '../Manager/ZRSJZ_PoolManager';
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_BloodMistEffect')
export class ZRSJZ_BloodMistEffect extends ZRSJZ_Effect {


    isInit: boolean = false;

    dirX: number = 0;
    dirY: number = 0;

    Show(worldPos: Vec3, dirX: number, dirY: number, cb: Function = null) {
        if (!this.isInit) {
            this.isInit = true;
            this.Skeleton = this.node.getChildByName("Spine").getComponent(sp.Skeleton);
        }
        this.node.active = true;
        this.node.setWorldPosition(worldPos.clone());

        // 归一化方向，保证斜向移动和水平、垂直移动的速度一致。
        const directionLength = Math.sqrt(dirX * dirX + dirY * dirY);
        if (directionLength > 0) {
            this.dirX = dirX / directionLength;
            this.dirY = dirY / directionLength;
        } else {
            this.dirX = 0;
            this.dirY = 0;
        }

        const ani = this.Skeleton.findAnimation("action");
        if (ani) {
            this.Skeleton.setAnimation(0, "action", false);
            this.Skeleton.setCompleteListener(() => {
                ZRSJZ_PoolManager.Instance.PutNode(this.node);
            })
        } else {
            console.error("没有动画：action");
            ZRSJZ_PoolManager.Instance.PutNode(this.node);
        }

        const angle = Math.atan2(this.dirY, this.dirX) * 180 / Math.PI;
        this.node.setWorldRotationFromEuler(0, 0, angle);
    }

}


