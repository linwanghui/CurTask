import { _decorator, Component, Node, sp, Vec3 } from 'cc';
import { ZRSJZ_PoolManager } from '../Manager/ZRSJZ_PoolManager';
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_Effect')
export class ZRSJZ_Effect extends Component {
    @property({ displayName: "动画名称" })
    AniName: string = "";

    Skeleton: sp.Skeleton = null;

    private _isInit: boolean = false;

    private _dirX: number = 0;
    private _dirY: number = 0;
    Show(worldPos: Vec3, dirX: number, dirY: number) {
        if (!this._isInit) {
            this._isInit = true;
            this.Skeleton = this.node.getChildByName("Spine").getComponent(sp.Skeleton);
        }
        this.node.active = true;
        this.node.setWorldPosition(worldPos.clone());

        // 归一化方向，保证斜向移动和水平、垂直移动的速度一致。
        const directionLength = Math.sqrt(dirX * dirX + dirY * dirY);
        if (directionLength > 0) {
            this._dirX = dirX / directionLength;
            this._dirY = dirY / directionLength;
        } else {
            this._dirX = 0;
            this._dirY = 0;
        }

        this.Skeleton.setAnimation(0, this.AniName, false);

        this.Skeleton.setEndListener(() => {
            this.AniEnd();
        })

        const angle = Math.atan2(this._dirY, this._dirX) * 180 / Math.PI;
        this.node.setWorldRotationFromEuler(0, 0, angle);
    }

    AniEnd() {
        ZRSJZ_PoolManager.Instance.PutNode(this.node);
    }
}


