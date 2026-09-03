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
            const traceEnemyPrefab = Path.startsWith("Prefabs/单位/")
                || Path.includes("Boss_牢太");
            const bundle = BundleManager.GetBundle("74_WZSJZ");
            if (!bundle) {
                if (traceEnemyPrefab) {
                    console.error(`[WZSJZ][PrefabLoad] Bundle为空，无法加载：${Path}`);
                }
                reject(new Error("74_WZSJZ Bundle尚未加载完成"));
                return;
            }
            if (traceEnemyPrefab) {
                console.log(`[WZSJZ][PrefabLoad] 开始加载：${Path}，Bundle=${bundle.name}`);
            }
            bundle.load(Path, Prefab, (err, data) => {
                if (!err && data) {
                    if (traceEnemyPrefab) {
                        console.log(
                            `[WZSJZ][PrefabLoad] 精确路径加载成功：${Path}，`
                            + `资源名=${data.name}，节点名=${data.data?.name}`,
                        );
                    }
                    resolve(data);
                    return;
                }

                // 部分快游戏/RPK平台对单个中文资源路径的索引偶尔会查询失败，
                // 再从同目录资源表按预制体名称寻找一次。
                const separator = Path.lastIndexOf("/");
                if (separator <= 0 || separator >= Path.length - 1) {
                    console.error("没有找到预制体" + Path, err);
                    reject(err || new Error(`没有找到预制体${Path}`));
                    return;
                }
                const directory = Path.slice(0, separator);
                const prefabName = Path.slice(separator + 1);
                if (traceEnemyPrefab) {
                    console.warn(
                        `[WZSJZ][PrefabLoad] 精确路径失败，尝试目录回退：${Path}`,
                        err,
                    );
                }
                bundle.loadDir(directory, Prefab, (directoryError, prefabs) => {
                    const loadedPrefabs = (prefabs || []) as Prefab[];
                    const prefab = loadedPrefabs.find((item) =>
                        item?.name === prefabName || item?.data?.name === prefabName,
                    );
                    if (prefab) {
                        console.warn(
                            `[WZSJZ][PrefabLoad] 目录回退成功：${Path}，`
                            + `目录数量=${loadedPrefabs.length}`,
                        );
                        resolve(prefab);
                        return;
                    }
                    if (traceEnemyPrefab) {
                        console.error(
                            `[WZSJZ][PrefabLoad] 目录回退仍未找到：${Path}，`
                            + `目录数量=${loadedPrefabs.length}，`
                            + `已有资源=${loadedPrefabs.map((item) => item?.name).join(",")}`,
                            directoryError,
                        );
                    }
                    console.error("没有找到预制体" + Path, err || directoryError);
                    reject(err || directoryError || new Error(`没有找到预制体${Path}`));
                });
            });
        })
    }

}


