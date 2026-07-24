import { _decorator, Component, director, instantiate, Node, NodePool, Prefab, resources, Vec3 } from "cc";
import { ZRSJZ_Tools } from "../ZRSJZ_Tools";

const { ccclass } = _decorator;

@ccclass("ZRSJZ_PoolManager")
export class ZRSJZ_PoolManager extends Component {
    private static _instance: ZRSJZ_PoolManager | null = null;
    private readonly _poolMap: Map<string, NodePool> = new Map<string, NodePool>();
    private readonly _prefabMap: Map<string, Prefab> = new Map<string, Prefab>();

    public static get Instance(): ZRSJZ_PoolManager {
        if (!ZRSJZ_PoolManager._instance) {
            const node = new Node("ZRSJZ_PoolManager");
            ZRSJZ_PoolManager._instance = node.addComponent(ZRSJZ_PoolManager);
            director.addPersistRootNode(node);
            ZRSJZ_PoolManager._instance.Preload("Prefabs/UI/ShopItem", 20);
            ZRSJZ_PoolManager._instance.Preload("Prefabs/UI/PropGrid", 20);
            ZRSJZ_PoolManager._instance.Preload("Prefabs/UI/PropSF", 1);
            ZRSJZ_PoolManager._instance.Preload("Prefabs/UI/SkinItem", 5);
            ZRSJZ_PoolManager._instance.Preload("Prefabs/UI/货币特效", 2);
            ZRSJZ_PoolManager._instance.Preload("Prefabs/Unit/PlayerBullet", 20);
            ZRSJZ_PoolManager._instance.Preload("Prefabs/UI/Tip", 10);
        }
        return ZRSJZ_PoolManager._instance;
    }

    public async GetNode(path: string): Promise<Node> {
        const key = this.GetPoolKey(path);
        const prefab = await this.GetPrefab(path);
        if (!prefab) return null;
        const node = this.GetOrCreateNode(key, prefab);
        return node;
    }

    public PutNode(node: Node): void {
        if (!node || !node.isValid) return;
        const key = this.GetPoolKey(node.name);
        const pool = this.GetOrCreatePool(key);
        node.removeFromParent();
        node.active = false;
        pool.put(node);
    }

    public async Preload(path: string, count: number): Promise<void> {
        if (count <= 0) return;

        const key = this.GetPoolKey(path);
        const prefab = await this.GetPrefab(path);
        if (!prefab) return;

        const pool = this.GetOrCreatePool(key);
        while (pool.size() < count) {
            pool.put(instantiate(prefab));
        }
    }

    public ClearPool(pathOrName: string): void {
        const key = this.GetPoolKey(pathOrName);
        const pool = this._poolMap.get(key);
        if (pool) {
            pool.clear();
        }
        this._poolMap.delete(key);
        this._prefabMap.delete(key);
    }

    public ClearAll(): void {
        this._poolMap.forEach(pool => pool.clear());
        this._poolMap.clear();
        this._prefabMap.clear();
    }

    private GetOrCreateNode(key: string, prefab: Prefab): Node {
        const pool = this.GetOrCreatePool(key);
        return pool.size() > 0 ? pool.get() : instantiate(prefab);
    }

    private GetOrCreatePool(key: string): NodePool {
        if (!this._poolMap.has(key)) {
            this._poolMap.set(key, new NodePool());
        }
        return this._poolMap.get(key);
    }

    private async GetPrefab(path: string): Promise<Prefab | null> {
        const key = this.GetPoolKey(path);
        if (this._prefabMap.has(key)) {
            return this._prefabMap.get(key);
        }

        return await ZRSJZ_Tools.LoadPrefab(path);
    }

    private GetPoolKey(pathOrName: string): string {
        if (!pathOrName) return "";
        return pathOrName.split("/").pop() || pathOrName;
    }
}


