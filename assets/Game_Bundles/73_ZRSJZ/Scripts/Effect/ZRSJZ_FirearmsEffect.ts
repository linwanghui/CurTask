import { _decorator, sp, Vec3 } from 'cc';
import { ZRSJZ_Effect } from './ZRSJZ_Effect';
import { ZRSJZ_PoolManager } from '../Manager/ZRSJZ_PoolManager';
const { ccclass } = _decorator;

@ccclass('ZRSJZ_FirearmsEffect')
export class ZRSJZ_FirearmsEffect extends ZRSJZ_Effect {
    private static readonly AnimationName = "skill1_hit";

    isInit: boolean = false;

    dirX: number = 0;
    dirY: number = 0;

    Show(worldPos: Vec3, dirX: number, dirY: number, cb: Function = null) {
        // 对象池中的节点可能跨场景复用；缓存的组件失效时重新获取。
        if (!this.isInit || !this.Skeleton?.isValid) {
            this.isInit = true;
            this.Skeleton = this.node.getChildByName("Spine")?.getComponent(sp.Skeleton) ?? null;
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

        this.Skeleton.setAnimation(0, ZRSJZ_FirearmsEffect.AnimationName, false);

        this.Skeleton.setCompleteListener(() => {
            cb && cb();
            ZRSJZ_PoolManager.Instance.PutNode(this.node);
        });

        const angle = Math.atan2(this.dirY, this.dirX) * 180 / Math.PI;
        this.node.setWorldRotationFromEuler(0, 0, angle);
    }
}


