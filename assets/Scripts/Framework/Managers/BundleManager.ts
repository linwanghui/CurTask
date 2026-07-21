import { AssetManager, Component, JsonAsset, Node, Prefab, Scene, SpriteFrame, Texture2D, _decorator, assetManager, director, find, instantiate } from "cc";
import PrefsManager from "./PrefsManager";
import { Constant } from "../Const/Constant";
import Banner from "../../Banner";
import { Panel, UIManager } from "./UIManager";
import { DataManager } from "./DataManager";
import { GameManager } from "../../GameManager";

const { ccclass, property } = _decorator;

@ccclass("BundleManager")
export class BundleManager extends Component {
    public static Instance: BundleManager = null;

    /*** Key: Bundle 名字   Value: Bundle */
    static BundleMap: Map<string, AssetManager.Bundle> = new Map<string, AssetManager.Bundle>();

    static LoadBundleDone: boolean = false;//加载本地包
    static AgreePolicy: boolean = false;//同意隐私协议

    onLoad() {
        BundleManager.Instance = this;
        BundleManager.LoadBundleDone = false;
        BundleManager.AgreePolicy = false;

        console.log("加载游戏数据...");
        this.LoadDataAndBundles();

        if (!PrefsManager.GetBool(Constant.Key.AgreePolicy) && !Banner.IS_ANDROID && !Banner.IS_HarmonyOSNext_GAME && !Banner.IS_BYTEDANCE_MINI_GAME && !Banner.IS_WECHAT_MINI_GAME && !Banner.IS_VIVO_MINI_GAME) {
            UIManager.ShowPanel(Panel.PrivacyPanel, [true, () => {
                BundleManager.AgreePolicy = true;
                this.SuccessCallback();
            }]);
        } else {
            BundleManager.AgreePolicy = true;
            this.SuccessCallback();
        }

        Banner.Instance.SetCityIsWhite();
    }

    //**加载需要的资源 */
    async LoadDataAndBundles() {
        const bundles = await DataManager.GetBundles();
        this.LoadBundles(bundles);
    }

    SuccessCallback() {
        if (BundleManager.LoadBundleDone && BundleManager.AgreePolicy) {
            console.log("所有资源加载完成，进入游戏场景");
            GameManager.GameData = DataManager.GetStartGameData();
            this.scheduleOnce(() => {
                director.loadScene(GameManager.StartScene);
            }, 1);
        }
    }

    LoadBundles(bundleNames: string[]) {
        const bundlePromises = bundleNames.map(name => {
            return new Promise((resolve, reject) => {
                assetManager.loadBundle(name, (err, bundle) => {
                    if (err) {
                        reject([name, err]);
                    } else {
                        resolve(bundle);
                    }
                });
            });
        });

        Promise.all(bundlePromises)
            .then((bundles: AssetManager.Bundle[]) => {
                for (let i = 0; i < bundles.length; i++) {
                    if (!BundleManager.BundleMap.has(bundles[i].name) || BundleManager.BundleMap.get(bundles[i].name) != bundles[i]) {
                        BundleManager.BundleMap.set(bundles[i].name, bundles[i]);
                        console.log(`加载本地 Bundle: ${bundles[i].name} 成功`);
                    }
                }

                BundleManager.LoadBundleDone = true;
                this.SuccessCallback();
            })
            .catch(error => {
                console.error(`加载本地 Bundle:${error[0]} 失败:[${error[1]}]`);
            });
    }

    public static LoadBundle(name: string, callback: Function = null) {
        if (!BundleManager.BundleMap.has(name)) {
            assetManager.loadBundle(name, (err, bundle) => {
                if (err) {
                    console.error(`加载 Bundle 包：${name} 失败。`);

                    UIManager.ShowTip("网络状态不佳，游戏载入失败!");
                    return;
                }
                else {
                    console.log(name + "分包加载成功！");
                    BundleManager.BundleMap.set(name, bundle);
                    callback && callback();
                }
            });
        } else {
            console.log("此分包已加载过，无需再次加载");
            callback && callback();
        }
    }

    /*** 加载 Bundle 包 */
    public static LoadBundles(bundleNames: string[], callback: Function = null, errCb: Function = null) {
        const Check = (index, max, cb) => { if (index >= max) cb && cb(); };

        let loadCount = 0;
        for (let i = 0; i < bundleNames.length; i++) {
            const name = bundleNames[i];
            if (!BundleManager.BundleMap.has(name)) {
                assetManager.loadBundle(name, (err, bundle) => {
                    if (err) {
                        console.error(`加载 Bundle 包：${name} 失败。`);
                        errCb && errCb();
                        return;
                    }
                    else {
                        console.log(name + "分包加载成功！");
                        BundleManager.BundleMap.set(name, bundle);
                        loadCount++;
                        Check(loadCount, bundleNames.length, callback);
                    }
                });
            } else {
                loadCount++;
                Check(loadCount, bundleNames.length, callback);
            }
        }
    }

    /*** 设置 Bundle 包 */
    public static SetBundle(name: string, cb: Function = null) {
        assetManager.loadBundle(name, (err, bundle) => {
            if (err) {
                console.error(`加载 Bundle 包：${name} 失败。`);
                return;
            }
            BundleManager.BundleMap.set(name, bundle);
            cb && cb();
        });
    }

    /*** 获取 Bundle 包 */
    public static GetBundle(bundle: string) {
        if (this.CheckBundleIsNull(bundle)) return;
        return this.BundleMap.get(bundle);
    }

    /*** 加载 Bundle 包内资源 */
    public static Load(bundle: string, path: string, type: any, cb: Function = () => { }) {
        if (this.CheckBundleIsNull(bundle)) return;
        this.BundleMap.get(bundle).load(path, type, (err: any, res: any) => {
            if (err) {
                console.error(err.message || err);
                cb(err, res);
                return;
            }

            cb && cb(null, res);
        })
    }

    public static LoadUI(bundle: string, path: string, cb?: Function, parent?: Node) {
        if (this.CheckBundleIsNull(bundle)) return;
        return new Promise((resolve, reject) => {
            this.Load(bundle, `Prefabs/UI/${path}`, Prefab, (err: any, prefab: Prefab) => {
                if (err) {
                    console.error(`加载 Bundle: ${bundle} Prefab 加载失败 Path: ${path}`);
                    reject && reject();
                    return;
                }

                let node: Node = instantiate(prefab);
                node.setPosition(0, 0, 0);
                if (!parent) {
                    parent = find("Canvas") as Node;
                }

                parent.addChild(node);
                cb && cb(null, node);
            });
        });
    }

    /*** 加载 Bundle 包内场景 */
    public static LoadScene(bundle: string, scene: string) {
        if (this.CheckBundleIsNull(bundle)) return;
        this.BundleMap.get(bundle).loadScene(scene, Scene, (err, scene) => {
            if (err) {
                console.error(`加载 Bundle: ${bundle} 场景失败: ${scene}`);
                return;
            }

            director.runScene(scene);
        });
    }

    /*** 加载 Bundle 包内预制体 */
    public static LoadPrefab(bundle: string, path: string) {
        if (this.CheckBundleIsNull(bundle)) return;
        return new Promise((resolve, reject) => {
            this.Load(bundle, `Prefabs/${path}`, Prefab, (err: any, prefab: Prefab) => {
                if (err) {
                    console.error(`加载 Bundle: ${bundle} Prefab 加载失败 Path: ${path}`);
                    reject && reject();
                    return;
                }

                resolve && resolve(prefab);
            });
        });
    }

    /*** 加载 Bundle 包内 SpriteFrame */
    public static LoadSpriteFrame(bundle: string, path: string) {
        if (this.CheckBundleIsNull(bundle)) return;
        return new Promise((resolve, reject) => {
            this.Load(bundle, `${path}/spriteFrame`, SpriteFrame, (err: any, spriteFrame: SpriteFrame) => {
                if (err) {
                    reject && reject();
                    return;
                }

                resolve && resolve(spriteFrame);
            });
        });
    }

    /*** 加载 Bundle 包内 JsonAsset */
    public static LoadJson(bundle: string, path: string) {
        if (this.CheckBundleIsNull(bundle)) return;
        return new Promise((resolve, reject) => {
            this.Load(bundle, `Data/${path}`, JsonAsset, (err: any, json: JsonAsset) => {
                if (err) {
                    console.error(`加载 Bundle: ${bundle} JsonAsset 加载失败 Path: ${path}`);
                    reject && reject();
                    return;
                }

                resolve && resolve(json);
            });
        });
    }

    /*** 加载 Bundle 包内 cc.Texture2D */
    public static LoadTexture(bundle: string, path: string) {
        if (this.CheckBundleIsNull(bundle)) return;
        return new Promise((resolve, reject) => {
            this.Load(bundle, `${path}`, Texture2D, (err: any, texture: Texture2D) => {
                if (err) {
                    console.error(`加载 Bundle: ${bundle} cc.Texture2D 加载失败 Path: ${path}`);
                    reject && reject();
                    return;
                }

                resolve && resolve(texture);
            });
        });
    }

    /*** 检查 Bunle 包是否为空 */
    private static CheckBundleIsNull(bundle: string): boolean {
        if (!this.BundleMap.has(bundle)) {
            console.error(`不存在此 Bundle ，请检查 Bundle 名称或者网络:`, bundle);
            return true;
        }
        return false;
    }

    public static GetEnumValues(enumType: any): string[] {
        const enumValues = Object.keys(enumType)
            .map(key => enumType[key])
            .filter(value => typeof value === 'string');

        return enumValues as string[];
    }
}