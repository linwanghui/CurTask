import { _decorator, Component, Node, Vec3 } from 'cc';
import { ZRSJZ_Skill } from './ZRSJZ_Skill';
import { ZRSJZ_PoolManager } from '../Manager/ZRSJZ_PoolManager';
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_Shield')
export class ZRSJZ_Shield extends ZRSJZ_Skill {
    Show(worldPos: Vec3, dirX?: number, dirY?: number, harm: number = 10, cb: Function = null) {
        if (!this.IsInit) {
            this.IsInit = true;
            this.Init();
        }
        this.node.active = true;
        this.node.setWorldPosition(worldPos.clone());

        this.Skeleton.setAnimation(0, this.AniName, true);
        this.scheduleOnce(() => {
            cb && cb();
            ZRSJZ_PoolManager.Instance.PutNode(this.node);
        }, 6);
    }

}


