import { _decorator, Component, Node, sp, Texture2D } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('SkeletonManager')
export class SkeletonManager extends Component {

    private static _instance: SkeletonManager = null;
    public static get Instance(): SkeletonManager {
        if (this._instance == null) {
            this._instance = new SkeletonManager();
        }
        return this._instance;
    }


    //播放龙骨动画
    public static play_Animation(Skin: sp.Skeleton, Name: string, Loop: boolean = false, EndCallBack?: Function, TimeCallback?: Function, Time: number = 1) {
        if (!Skin) return;
        Skin.setAnimation(0, Name, Loop);
        if (EndCallBack) {
            Skin.setCompleteListener(() => {
                EndCallBack();
            })
        }
        if (TimeCallback) {
            SkeletonManager.Instance.scheduleOnce(() => {
                TimeCallback();
            }, Time)
        }
    }

    //换肤
    public static Skin_peeler(Skin: sp.Skeleton, Name: string) {
        Skin.setSkin(Name);
    }
    //切换贴图纹理(局部换肤)
    public static Change_Texture(Skin: sp.Skeleton, Name: string, texture: Texture2D) {
        Skin.setSlotTexture(Name, texture);
    }

}


