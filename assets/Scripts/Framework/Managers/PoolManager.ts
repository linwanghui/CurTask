import { instantiate, NodePool, Prefab, Vec3, Node, resources, AssetManager } from "cc";
import { BundleManager } from "./BundleManager";

export class PoolManager {
    private static PoolDict: any = {};
    private static PrefabDict: any = {};

    /*** 对象池中获取对应节点*/
    public static GetNode(path: string, parent: Node, position: Vec3 = Vec3.ZERO, worldPosition: Vec3 = null): Promise<Node> {
        const segments = path.split(`/`);
        let name = segments[segments.length - 1];

        const GetNodeFunc = (prefab): Node => {
            let node: Node = null;

            if (this.PoolDict.hasOwnProperty(name)) {
                //已有对应的对象池
                let pool = this.PoolDict[name];
                if (pool.size() > 0) {
                    node = pool.get();
                } else {
                    node = instantiate(prefab);
                }
            } else {
                //没有对应对象池，创建他！
                this.PoolDict[name] = new NodePool();
                node = instantiate(prefab);
            }

            node.active = true;
            node.setParent(parent);

            if (position) node.setPosition(position);
            if (worldPosition && node.parent) node.setWorldPosition(worldPosition);
            return node;
        }

        return new Promise((resolve, reject) => {
            if (!this.PrefabDict.hasOwnProperty(name)) {
                resources.load(path, (err: any, prefab: Prefab) => {
                    if (err) {
                        console.error(`Prefab 加载失败：${path}`);
                        reject && reject();
                        return;
                    }

                    this.PrefabDict[name] = prefab;
                    resolve && resolve(GetNodeFunc(prefab));
                })
            } else {
                resolve && resolve(GetNodeFunc(this.PrefabDict[name]));
            }
        });
    }

    /*** 对象池中获取对应节点*/
    public static async GetNodeByBundle(bundle: string, path: string, parent: Node, position: Vec3 = Vec3.ZERO, worldPosition: Vec3 = null): Promise<Node> {
        const segments = path.split('/');
        const name = segments[segments.length - 1];

        // 异步加载预制体
        if (!this.PrefabDict.hasOwnProperty(name)) {
            const bundleAsset = BundleManager.GetBundle(bundle);
            try {
                // 将回调式加载转换为 Promise
                const prefab = await new Promise<Prefab>((resolve, reject) => {
                    bundleAsset.load(path, (err: any, prefab: Prefab) => {
                        if (err) reject(`预制体加载失败：${path}`);
                        else resolve(prefab);
                    });
                });
                this.PrefabDict[name] = prefab;
            } catch (err) {
                console.error(err);
                return null;
            }
        }

        // 从对象池获取/创建节点
        let node: Node;
        if (this.PoolDict[name]?.size() > 0) {
            node = this.PoolDict[name].get();
        } else {
            if (!this.PoolDict[name]) this.PoolDict[name] = new NodePool();
            node = instantiate(this.PrefabDict[name]);
        }

        // 设置节点属性
        node.active = true;
        node.setParent(parent);
        if (position) node.setPosition(position);
        if (worldPosition && node.parent) node.setWorldPosition(worldPosition);

        return node;
    }

    /**
    * 根据预设从对象池中获取对应节点
    */
    public static GetNodeByPrefab(prefab: Prefab, parent: Node) {
        let name = prefab.name;
        this.PrefabDict[name] = prefab;
        let node = null;
        if (this.PoolDict.hasOwnProperty(name)) {
            //已有对应的对象池
            let pool = this.PoolDict[name];
            if (pool.size() > 0) {
                node = pool.get();
            } else {
                node = instantiate(prefab);
            }
        } else {
            //没有对应对象池，创建他！
            this.PoolDict[name] = new NodePool();
            node = instantiate(prefab);
        }

        node.parent = parent;
        node.position = Vec3.ZERO;
        node.active = true;

        return node;
    }

    /**
     * 将对应节点放回对象池中
     */
    public static PutNode(node: Node) {
        if (!node) return;
        node.removeFromParent();
        let name = node.name;
        let pool = null;
        if (this.PoolDict.hasOwnProperty(name)) {
            pool = this.PoolDict[name];
        } else {
            pool = new NodePool();
            this.PoolDict[name] = pool;
        }

        pool.put(node);
    }

    /**
     * 根据名称，清除对应对象池
     */
    public static ClearPool(name: string) {
        if (this.PoolDict.hasOwnProperty(name)) {
            let pool = this.PoolDict[name];
            pool.clear();
        }
    }

    /**
     * 向对象池里生成固定数量的 Node
     */
    public static GenerateNodesToPool(path: string, count: number) {
        const segments = path.split(`/`);
        let name = segments[segments.length - 1];

        resources.load(path, (err: any, prefab: Prefab) => {
            if (err) {
                console.error(`Prefab 加载失败：${path}`);
                return;
            }

            this.PrefabDict[name] = prefab;

            //已有对应的对象池
            if (this.PoolDict.hasOwnProperty(name)) {
                let pool = this.PoolDict[name];
                if (pool.size() < count) {
                    let length = count - pool.size();
                    for (let i = 0; i < length; i++)pool.put(instantiate(prefab));
                    console.log(`对象池已有：${name}    新添加数量：${length}`);
                }
            } else {
                this.PoolDict[name] = new NodePool();
                for (let i = 0; i < count; i++) this.PoolDict[name].put(instantiate(prefab));

                console.log(`对象池添加：${name}    添加数量：${count}`);
            }
        });
    }

}