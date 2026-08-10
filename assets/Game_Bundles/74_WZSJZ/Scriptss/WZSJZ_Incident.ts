import { _decorator, Component, Node, Prefab, SpriteFrame, Texture2D } from 'cc';
import { BundleManager } from '../../../Scripts/Framework/Managers/BundleManager';
const { ccclass, property } = _decorator;

@ccclass('WZSJZ_Incident')
export class WZSJZ_Incident extends Component {
    public static LoadSprite(Path: string) {
        return new Promise((resolve, reject) => {
            BundleManager.GetBundle("74_WZSJZ").load(Path + "/spriteFrame", SpriteFrame, (err, data) => {
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
            BundleManager.GetBundle("74_WZSJZ").load(Path + "/texture", Texture2D, (err, data) => {
                if (err) {
                    console.log("没有找到图片" + Path);
                    return;
                }
                resolve && resolve(data);
            })
        })
    }

    public static Loadprefab(Path: string): Promise<Prefab> {
        return new Promise<Prefab>((resolve, reject) => {
            BundleManager.GetBundle("74_WZSJZ").load(Path, Prefab, (err, data) => {
                if (err) {
                    console.error("没有找到预制体" + Path, err);
                    reject(err);
                    return;
                }
                resolve(data);
            })
        })
    }

}


