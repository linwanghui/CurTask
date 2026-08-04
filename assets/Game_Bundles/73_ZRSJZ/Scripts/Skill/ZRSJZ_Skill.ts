import { _decorator, Component, Node, sp, Vec3 } from 'cc';
import { ZRSJZ_PoolManager } from '../Manager/ZRSJZ_PoolManager';
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_Skill')
export class ZRSJZ_Skill extends Component {
    @property({ displayName: "动画名称" })
    AniName: string = "";

    Skeleton: sp.Skeleton = null;

    IsInit: boolean = false;
    Harm: number = 0;

    private _dirX: number = 0;
    private _dirY: number = 0;

    Init() {
        this.Skeleton = this.node.getChildByName("Spine").getComponent(sp.Skeleton);
        this.Skeleton.setEventListener((trackEntry, event) => {
            if (typeof event !== "number") {
                console.error(event.data.name);

                switch (event.data.name) {
                    case "gj":
                        this.Attack();
                        break;
                }
            }
        });
    }

    Show(worldPos: Vec3, dirX?: number, dirY?: number, harm: number = 10, cb: Function = null) {
        if (!this.IsInit) {
            this.IsInit = true;
            this.Init();
        }
        this.Harm = harm;
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

        this.Skeleton.setCompleteListener(() => {
            cb && cb();
            ZRSJZ_PoolManager.Instance.PutNode(this.node);
        })

        const angle = Math.atan2(this._dirY, this._dirX) * 180 / Math.PI;
        this.node.setWorldRotationFromEuler(0, 0, angle);
    }

    Attack() {

    }
}


