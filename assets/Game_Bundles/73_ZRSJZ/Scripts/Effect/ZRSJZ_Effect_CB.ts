import { _decorator, Component, Node, sp, Vec3 } from 'cc';
import { ZRSJZ_Effect } from './ZRSJZ_Effect';
import { ZRSJZ_PoolManager } from '../Manager/ZRSJZ_PoolManager';
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_Effect_CB')
export class ZRSJZ_Effect_CB extends Component {

    @property({ displayName: "动画名称" })
    AniName: string = "";

    Skeleton: sp.Skeleton = null;

    private _isInit: boolean = false;
    Show(worldPos: Vec3, cb: Function = null) {
        if (!this._isInit) {
            this._isInit = true;
            this.Skeleton = this.node.getChildByName("Spine").getComponent(sp.Skeleton);
        }
        this.node.setWorldPosition(worldPos.clone());
        this.Skeleton.setAnimation(0, this.AniName, false);
        this.Skeleton.setCompleteListener(() => {
            cb && cb();
            ZRSJZ_PoolManager.Instance.PutNode(this.node);
        })
    }
}


