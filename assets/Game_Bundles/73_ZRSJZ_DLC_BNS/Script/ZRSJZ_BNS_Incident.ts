import { _decorator, Component, Node, Prefab, SpriteFrame, Texture2D } from 'cc';
import { BundleManager } from '../../../Scripts/Framework/Managers/BundleManager';
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_BNS_Incident')
export class ZRSJZ_BNS_Incident extends Component {
    public static LoadSprite(Path: string) {
        return new Promise((resolve, reject) => {
            BundleManager.GetBundle("73_ZRSJZ_DLC_BNS").load(Path + "/spriteFrame", SpriteFrame, (err, data) => {
                if (err) {
                    console.log("没有找到图片" + Path);
                    return;
                }
                resolve && resolve(data);
            })
        })
    }
    public static LoadDLCSprite(Path: string) {
        return new Promise((resolve, reject) => {
            BundleManager.GetBundle("73_ZRSJZ_DLC_BNS").load(Path + "/spriteFrame", SpriteFrame, (err, data) => {
                if (err) {
                    console.log("没有找到图片" + Path);
                    return;
                }
                resolve && resolve(data);
            })
        })
    }
    public static LoadTexture2D(Path: string) {
        return new Promise((resolve, reject) => {
            BundleManager.GetBundle("73_ZRSJZ_DLC_BNS").load(Path + "/texture", Texture2D, (err, data) => {
                if (err) {
                    console.log("没有找到图片" + Path);
                    return;
                }
                resolve && resolve(data);
            })
        })
    }

    public static Loadprefab(Path: string) {
        return new Promise((resolve, reject) => {
            BundleManager.GetBundle("73_ZRSJZ_DLC_BNS").load(Path, Prefab, (err, data) => {
                if (err) {
                    console.log("没有找到预制体" + Path);
                    return;
                }
                resolve && resolve(data);
            })
        })
    }

}


